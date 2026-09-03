/* ==========================================================================
   Jan Motor Showroom - script.js
   Central data layer (localStorage "database") + shared UI logic.

   IMPORTANT SECURITY NOTE:
   This project is a FRONTEND-ONLY DEMO. The "admin login" below simply
   checks a hard-coded email/password in JavaScript and flags the session
   with localStorage. This is NOT secure - anyone can open dev tools and
   set the flag manually, or read the source. Before going live, this
   must be replaced with a real backend (server-side auth, hashed
   passwords, sessions/JWT, HTTPS, etc). The code is structured so the
   functions below (login(), logout(), isLoggedIn()) are the only place
   that needs to change to plug in a real API.
   ========================================================================== */

/* --------------------------------------------------------------------
   STORAGE KEYS
   -------------------------------------------------------------------- */
const STORAGE_KEYS = {
  CARS: "dealership_cars",
  SALES: "dealership_sales",
  REPAIRS: "dealership_repairs",
  AUTH: "dealership_admin_logged_in",
  THEME: "dealership_theme",
  SEEDED: "dealership_seeded_v2"
};

/* Demo admin credentials (frontend-only demo — see security note above) */
const DEMO_ADMIN = {
  email: "admin@janmotorshowroom.com",
  password: "admin123"
};

/* --------------------------------------------------------------------
   GENERIC STORAGE HELPERS
   -------------------------------------------------------------------- */
function readStore(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`Failed to read ${key} from localStorage`, err);
    return [];
  }
}

function writeStore(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error(`Failed to write ${key} to localStorage`, err);
    showToast("Storage error: could not save data (storage may be full).", "error");
    return false;
  }
}

function generateId(list) {
  if (!list.length) return 1;
  return Math.max(...list.map((item) => item.id)) + 1;
}

/* --------------------------------------------------------------------
   CAR CRUD FUNCTIONS
   -------------------------------------------------------------------- */
function getCars() {
  /* Cars are always returned newest-first (by actual creation timestamp)
     so every page that lists cars — home, browse, admin — automatically
     shows the most recently added car at the top with no extra wiring. */
  return sortCarsByNewest(readStore(STORAGE_KEYS.CARS));
}

function getCarById(id) {
  const numericId = Number(id);
  return getCars().find((car) => car.id === numericId) || null;
}

/* Returns a NEW array of cars sorted newest-first by their actual creation
   timestamp (dateAdded). Used everywhere cars are listed so newly added
   cars automatically surface at the top without any manual reordering. */
function sortCarsByNewest(cars) {
  return [...cars].sort((a, b) => {
    const dateA = a.dateAdded ? new Date(a.dateAdded).getTime() : a.id;
    const dateB = b.dateAdded ? new Date(b.dateAdded).getTime() : b.id;
    return dateB - dateA;
  });
}

function addCar(carData) {
  const cars = getCars();
  const newCar = {
    id: generateId(cars),
    title: carData.title,
    brand: carData.brand,
    model: carData.model,
    year: Number(carData.year),
    price: Number(carData.price),
    mileage: Number(carData.mileage),
    color: carData.color || "",
    fuel: carData.fuel,
    transmission: carData.transmission,
    engine: carData.engine || "",
    location: carData.location,
    description: carData.description || "",
    status: carData.status || "available",
    images: carData.images && carData.images.length ? carData.images : [DEFAULT_CAR_IMAGE],
    /* Real creation timestamp — used to sort newest-first. Seeding may pass
       an explicit value to stagger demo data; normal usage always gets "now". */
    dateAdded: carData.dateAdded || new Date().toISOString()
  };
  cars.push(newCar);
  writeStore(STORAGE_KEYS.CARS, cars);
  return newCar;
}

function updateCar(id, updates) {
  const cars = getCars();
  const index = cars.findIndex((car) => car.id === Number(id));
  if (index === -1) return null;
  cars[index] = { ...cars[index], ...updates };
  writeStore(STORAGE_KEYS.CARS, cars);
  return cars[index];
}

function deleteCar(id) {
  let cars = getCars();
  cars = cars.filter((car) => car.id !== Number(id));
  writeStore(STORAGE_KEYS.CARS, cars);
  /* Clean up related sales / repairs referencing this car */
  const sales = getSales().filter((s) => s.carId !== Number(id));
  writeStore(STORAGE_KEYS.SALES, sales);
  const repairs = getRepairs().filter((r) => r.carId !== Number(id));
  writeStore(STORAGE_KEYS.REPAIRS, repairs);
}

function markAsSold(id) {
  return updateCar(id, { status: "sold" });
}

function markAsAvailable(id) {
  return updateCar(id, { status: "available" });
}

function markAsRepair(id) {
  return updateCar(id, { status: "repair" });
}

/* --------------------------------------------------------------------
   SALES CRUD FUNCTIONS
   -------------------------------------------------------------------- */
function getSales() {
  return readStore(STORAGE_KEYS.SALES);
}

function addSale(saleData) {
  const sales = getSales();
  const newSale = {
    id: generateId(sales),
    carId: Number(saleData.carId),
    customerName: saleData.customerName,
    price: Number(saleData.price),
    saleDate: saleData.saleDate || new Date().toISOString().split("T")[0],
    paymentStatus: saleData.paymentStatus || "paid"
  };
  sales.push(newSale);
  writeStore(STORAGE_KEYS.SALES, sales);
  /* Selling a car automatically flips its status to sold */
  markAsSold(newSale.carId);
  return newSale;
}

function updateSale(id, updates) {
  const sales = getSales();
  const index = sales.findIndex((s) => s.id === Number(id));
  if (index === -1) return null;
  sales[index] = { ...sales[index], ...updates };
  writeStore(STORAGE_KEYS.SALES, sales);
  return sales[index];
}

function deleteSale(id) {
  const sales = getSales().filter((s) => s.id !== Number(id));
  writeStore(STORAGE_KEYS.SALES, sales);
}

/* --------------------------------------------------------------------
   REPAIR CRUD FUNCTIONS
   -------------------------------------------------------------------- */
function getRepairs() {
  return readStore(STORAGE_KEYS.REPAIRS);
}

function addRepair(repairData) {
  const repairs = getRepairs();
  const newRepair = {
    id: generateId(repairs),
    carId: Number(repairData.carId),
    repairType: repairData.repairType,
    description: repairData.description || "",
    cost: Number(repairData.cost) || 0,
    startDate: repairData.startDate || new Date().toISOString().split("T")[0],
    completionDate: repairData.completionDate || "",
    status: repairData.status || "pending"
  };
  repairs.push(newRepair);
  writeStore(STORAGE_KEYS.REPAIRS, repairs);
  /* Sending a car for repair flips its status */
  markAsRepair(newRepair.carId);
  return newRepair;
}

function updateRepair(id, updates) {
  const repairs = getRepairs();
  const index = repairs.findIndex((r) => r.id === Number(id));
  if (index === -1) return null;
  repairs[index] = { ...repairs[index], ...updates };
  writeStore(STORAGE_KEYS.REPAIRS, repairs);
  /* If repair marked completed, put car back to available automatically */
  if (updates.status === "completed") {
    markAsAvailable(repairs[index].carId);
  }
  return repairs[index];
}

function deleteRepair(id) {
  const repairs = getRepairs().filter((r) => r.id !== Number(id));
  writeStore(STORAGE_KEYS.REPAIRS, repairs);
}

/* --------------------------------------------------------------------
   STATISTICS
   -------------------------------------------------------------------- */
function calculateStatistics() {
  const cars = getCars();
  const sales = getSales();
  const totalCars = cars.length;
  const availableCars = cars.filter((c) => c.status === "available").length;
  const soldCars = cars.filter((c) => c.status === "sold").length;
  const repairCars = cars.filter((c) => c.status === "repair").length;
  const totalSales = sales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  return { totalCars, availableCars, soldCars, repairCars, totalSales };
}

/* --------------------------------------------------------------------
   AUTH (DEMO ONLY — see security note at top of file)
   -------------------------------------------------------------------- */
function login(email, password) {
  if (email === DEMO_ADMIN.email && password === DEMO_ADMIN.password) {
    localStorage.setItem(STORAGE_KEYS.AUTH, "true");
    return true;
  }
  return false;
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.AUTH);
}

function isLoggedIn() {
  return localStorage.getItem(STORAGE_KEYS.AUTH) === "true";
}

/* Call at the top of every admin-only page */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

/* --------------------------------------------------------------------
   THEME (DARK / LIGHT MODE)
   -------------------------------------------------------------------- */
function applyStoredTheme() {
  const theme = localStorage.getItem(STORAGE_KEYS.THEME) || "light";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeToggleIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(STORAGE_KEYS.THEME, next);
  updateThemeToggleIcon(next);
}

function updateThemeToggleIcon(theme) {
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.textContent = theme === "dark" ? "☀️" : "🌙";
    btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  });
}

/* --------------------------------------------------------------------
   TOAST / MESSAGE NOTIFICATIONS
   -------------------------------------------------------------------- */
function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* --------------------------------------------------------------------
   MOBILE NAVIGATION
   -------------------------------------------------------------------- */
function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-links");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("nav-links-open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.classList.toggle("nav-toggle-active", isOpen);
  });

  /* Close menu when a link is clicked (mobile) */
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("nav-links-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.classList.remove("nav-toggle-active");
    });
  });
}

/* --------------------------------------------------------------------
   ADMIN SIDEBAR (MOBILE)
   -------------------------------------------------------------------- */
function initAdminSidebar() {
  const toggle = document.querySelector(".sidebar-toggle");
  const sidebar = document.querySelector(".admin-sidebar");
  const overlay = document.querySelector(".sidebar-overlay");
  if (!toggle || !sidebar) return;

  const closeSidebar = () => {
    sidebar.classList.remove("admin-sidebar-open");
    if (overlay) overlay.classList.remove("sidebar-overlay-visible");
  };

  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("admin-sidebar-open");
    if (overlay) overlay.classList.toggle("sidebar-overlay-visible");
  });

  if (overlay) overlay.addEventListener("click", closeSidebar);
}

/* --------------------------------------------------------------------
   NAVBAR AUTH-AWARE LOGIN/ADMIN BUTTON
   -------------------------------------------------------------------- */
function initAuthAwareNav() {
  const authBtn = document.querySelector(".nav-auth-btn");
  if (!authBtn) return;
  if (isLoggedIn()) {
    authBtn.textContent = "Admin Dashboard";
    authBtn.href = "dashboard.html";
  } else {
    authBtn.textContent = "Login / Admin";
    authBtn.href = "login.html";
  }
}

/* --------------------------------------------------------------------
   FORMATTING HELPERS
   -------------------------------------------------------------------- */
function formatPrice(value) {
  return "$" + Number(value).toLocaleString("en-US");
}

function formatMileage(value) {
  return Number(value).toLocaleString("en-US") + " mi";
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function statusBadgeClass(status) {
  switch (status) {
    case "available":
      return "badge badge-available";
    case "sold":
      return "badge badge-sold";
    case "repair":
      return "badge badge-repair";
    default:
      return "badge";
  }
}

/* --------------------------------------------------------------------
   CAR CARD RENDERING (shared by home + cars pages)
   -------------------------------------------------------------------- */
function createCarCard(car) {
  /* Photo count is always derived live from the images array — never hard-coded */
  const photoCount = Array.isArray(car.images) ? car.images.length : 0;

  const card = document.createElement("article");
  card.className = "car-card";
  card.innerHTML = `
    <div class="car-card-image-wrap">
      <img src="${car.images[0]}" alt="${car.brand} ${car.model}" class="car-card-image" loading="lazy">
      <span class="${statusBadgeClass(car.status)}">${capitalize(car.status)}</span>
      ${photoCount > 0 ? `<span class="photo-count-badge">📷 ${photoCount} Photo${photoCount === 1 ? "" : "s"}</span>` : ""}
    </div>
    <div class="car-card-body">
      <h3 class="car-card-title">${car.brand} ${car.model}</h3>
      <p class="car-card-year">${car.year}</p>
      <p class="car-card-price">${formatPrice(car.price)}</p>
      <ul class="car-card-meta">
        <li>📍 ${car.location}</li>
        <li>🛣️ ${formatMileage(car.mileage)}</li>
        ${car.fuel ? `<li>⛽ ${car.fuel}</li>` : ""}
        ${car.transmission ? `<li>⚙️ ${car.transmission}</li>` : ""}
      </ul>
      <a href="car-details.html?id=${car.id}" class="btn btn-primary btn-block">View Details</a>
    </div>
  `;
  return card;
}

function renderCarGrid(container, cars) {
  container.innerHTML = "";
  if (!cars.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state-icon">🚗</p>
        <p>No cars match your search.</p>
      </div>
    `;
    return;
  }
  const fragment = document.createDocumentFragment();
  cars.forEach((car) => fragment.appendChild(createCarCard(car)));
  container.appendChild(fragment);
}

/* --------------------------------------------------------------------
   DEFAULT / PLACEHOLDER IMAGE
   -------------------------------------------------------------------- */
const DEFAULT_CAR_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#e2e8f0"/>
      <text x="50%" y="50%" font-family="sans-serif" font-size="24" fill="#94a3b8"
        text-anchor="middle" dominant-baseline="middle">No Image Available</text>
    </svg>
  `);

/* --------------------------------------------------------------------
   DEMO DATA SEEDING (runs once)
   Uses real vehicle photography (Unsplash) instead of illustrated
   placeholders so the showroom feels like a genuine dealership.
   -------------------------------------------------------------------- */
function unsplashImg(photoId) {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1000&q=80`;
}

function seedDemoData() {
  /* If an older demo dataset (illustrated placeholders) exists from a
     previous version of the site, clear it out so the new realistic
     photos and branding fully replace it rather than mixing with it. */
  if (!localStorage.getItem(STORAGE_KEYS.SEEDED)) {
    writeStore(STORAGE_KEYS.CARS, []);
    writeStore(STORAGE_KEYS.SALES, []);
    writeStore(STORAGE_KEYS.REPAIRS, []);
  } else {
    return;
  }

  const demoCars = [
    {
      title: "Toyota Corolla XLI",
      brand: "Toyota",
      model: "Corolla",
      year: 2022,
      price: 18500,
      mileage: 24500,
      color: "White",
      fuel: "Petrol",
      transmission: "Automatic",
      engine: "1.8L I4",
      location: "Kabul, Afghanistan",
      description: "Clean and well maintained vehicle with full service history. Excellent fuel economy and reliability, perfect for daily commuting.",
      status: "available",
      images: [unsplashImg("1494905998402-395d579af36f"), unsplashImg("1600661653561-629509216228"), unsplashImg("1503376780353-7e6692767b70")],
      daysAgo: 0
    },
    {
      title: "Toyota Camry SE",
      brand: "Toyota",
      model: "Camry",
      year: 2021,
      price: 22900,
      mileage: 29800,
      color: "Grey",
      fuel: "Petrol",
      transmission: "Automatic",
      engine: "2.5L I4",
      location: "Kabul, Afghanistan",
      description: "Refined mid-size sedan with a smooth ride, spacious cabin, and a strong reputation for long-term reliability.",
      status: "available",
      images: [unsplashImg("1502877338535-766e1452684a"), unsplashImg("1592840331746-2ee9f5c60a10"), unsplashImg("1549317661-bd32c8ce0db2")],
      daysAgo: 1
    },
    {
      title: "Honda Civic Sport",
      brand: "Honda",
      model: "Civic",
      year: 2021,
      price: 20900,
      mileage: 31200,
      color: "Red",
      fuel: "Petrol",
      transmission: "Automatic",
      engine: "1.5L Turbo",
      location: "Herat, Afghanistan",
      description: "Sporty and fun to drive, with a turbocharged engine, sharp handling, and a modern infotainment system.",
      status: "available",
      images: [unsplashImg("1568605114967-8130f3a36994"), unsplashImg("1511919884226-fd3cad34687c"), unsplashImg("1503376780353-7e6692767b70")],
      daysAgo: 2
    },
    {
      title: "Honda Accord Touring",
      brand: "Honda",
      model: "Accord",
      year: 2022,
      price: 25900,
      mileage: 19700,
      color: "Black",
      fuel: "Petrol",
      transmission: "Automatic",
      engine: "1.5L Turbo",
      location: "Kabul, Afghanistan",
      description: "Top-trim Accord with a premium interior, driver-assist safety features, and confident highway manners.",
      status: "available",
      images: [unsplashImg("1600661653561-629509216228"), unsplashImg("1494905998402-395d579af36f"), unsplashImg("1592840331746-2ee9f5c60a10")],
      daysAgo: 3
    },
    {
      title: "BMW 3 Series 330i",
      brand: "BMW",
      model: "3 Series",
      year: 2020,
      price: 29900,
      mileage: 33400,
      color: "Black",
      fuel: "Petrol",
      transmission: "Automatic",
      engine: "2.0L Turbo I4",
      location: "Kabul, Afghanistan",
      description: "Luxury sports sedan with a premium interior, sharp handling, and advanced tech features throughout.",
      status: "sold",
      images: [unsplashImg("1583121274602-3e2820c69888"), unsplashImg("1614026480418-bbef0290cceb"), unsplashImg("1533473359331-0135ef1b58bf")],
      daysAgo: 4
    },
    {
      title: "Mercedes-Benz C-Class",
      brand: "Mercedes-Benz",
      model: "C-Class",
      year: 2021,
      price: 33500,
      mileage: 26100,
      color: "Silver",
      fuel: "Petrol",
      transmission: "Automatic",
      engine: "2.0L Turbo I4",
      location: "Herat, Afghanistan",
      description: "Elegant luxury sedan with cutting-edge safety tech, refined ride comfort, and a beautifully finished cabin.",
      status: "available",
      images: [unsplashImg("1614026480418-bbef0290cceb"), unsplashImg("1583121274602-3e2820c69888"), unsplashImg("1580273916550-e323be2ae537")],
      daysAgo: 5
    },
    {
      title: "Hyundai Elantra SEL",
      brand: "Hyundai",
      model: "Elantra",
      year: 2023,
      price: 19800,
      mileage: 12300,
      color: "Silver",
      fuel: "Petrol",
      transmission: "Automatic",
      engine: "2.0L I4",
      location: "Kandahar, Afghanistan",
      description: "Nearly new with warranty remaining. Sleek design, generous tech package, and excellent safety ratings.",
      status: "available",
      images: [unsplashImg("1541899481282-d53bffe3c35d"), unsplashImg("1620891549027-942fdc95d3f5"), unsplashImg("1503376780353-7e6692767b70")],
      daysAgo: 6
    },
    {
      title: "Kia Sportage EX",
      brand: "Kia",
      model: "Sportage",
      year: 2021,
      price: 24500,
      mileage: 28700,
      color: "Grey",
      fuel: "Petrol",
      transmission: "Automatic",
      engine: "2.4L I4",
      location: "Herat, Afghanistan",
      description: "Spacious compact SUV with modern features, a comfortable ride, and flexible cargo space.",
      status: "repair",
      images: [unsplashImg("1605559424843-9e4c228bf1c2"), unsplashImg("1620891549027-942fdc95d3f5"), unsplashImg("1461632830798-3adb3034e4c8")],
      daysAgo: 7
    },
    {
      title: "Toyota Land Cruiser",
      brand: "Toyota",
      model: "Land Cruiser",
      year: 2019,
      price: 47500,
      mileage: 58900,
      color: "Black",
      fuel: "Diesel",
      transmission: "Automatic",
      engine: "4.5L V8 Diesel",
      location: "Kabul, Afghanistan",
      description: "Legendary off-road capability paired with premium comfort. Recently serviced and ready for any terrain.",
      status: "sold",
      images: [unsplashImg("1605559424843-9e4c228bf1c2"), unsplashImg("1461632830798-3adb3034e4c8"), unsplashImg("1580273916550-e323be2ae537")],
      daysAgo: 8
    },
    {
      title: "Ford F-150 XLT",
      brand: "Ford",
      model: "F-150",
      year: 2020,
      price: 32900,
      mileage: 45230,
      color: "Blue",
      fuel: "Petrol",
      transmission: "Automatic",
      engine: "3.5L V6 EcoBoost",
      location: "Mazar-i-Sharif, Afghanistan",
      description: "Powerful and capable pickup truck, great for work or towing. Well cared for with new tires.",
      status: "available",
      images: [unsplashImg("1549317661-bd32c8ce0db2"), unsplashImg("1461632830798-3adb3034e4c8"), unsplashImg("1605559424843-9e4c228bf1c2")],
      daysAgo: 9
    },
    {
      title: "Nissan Altima SV",
      brand: "Nissan",
      model: "Altima",
      year: 2020,
      price: 17200,
      mileage: 39800,
      color: "White",
      fuel: "Petrol",
      transmission: "CVT",
      engine: "2.5L I4",
      location: "Kabul, Afghanistan",
      description: "Comfortable mid-size sedan with a smooth CVT transmission and great highway mileage.",
      status: "available",
      images: [unsplashImg("1494905998402-395d579af36f"), unsplashImg("1502877338535-766e1452684a"), unsplashImg("1600661653561-629509216228")],
      daysAgo: 10
    },
    {
      title: "Chevrolet Camaro SS",
      brand: "Chevrolet",
      model: "Camaro",
      year: 2018,
      price: 34900,
      mileage: 41200,
      color: "Yellow",
      fuel: "Petrol",
      transmission: "Manual",
      engine: "6.2L V8",
      location: "Mazar-i-Sharif, Afghanistan",
      description: "Muscle car with serious performance — V8 power, manual transmission, and thrilling road presence.",
      status: "available",
      images: [unsplashImg("1533473359331-0135ef1b58bf"), unsplashImg("1568605114967-8130f3a36994"), unsplashImg("1511919884226-fd3cad34687c")],
      daysAgo: 11
    },
    {
      title: "Suzuki Swift GL",
      brand: "Suzuki",
      model: "Swift",
      year: 2019,
      price: 11900,
      mileage: 52300,
      color: "Blue",
      fuel: "Petrol",
      transmission: "Manual",
      engine: "1.2L I4",
      location: "Kandahar, Afghanistan",
      description: "Compact, economical, and easy to park — a great first car or dependable city runabout.",
      status: "available",
      images: [unsplashImg("1541899481282-d53bffe3c35d"), unsplashImg("1503376780353-7e6692767b70"), unsplashImg("1592840331746-2ee9f5c60a10")],
      daysAgo: 12
    },
    {
      title: "Toyota Hilux Double Cab",
      brand: "Toyota",
      model: "Hilux",
      year: 2022,
      price: 31200,
      mileage: 18700,
      color: "White",
      fuel: "Diesel",
      transmission: "Manual",
      engine: "2.8L Diesel",
      location: "Kabul, Afghanistan",
      description: "Rugged, dependable pickup truck built to handle tough jobs and rough roads with ease.",
      status: "repair",
      images: [unsplashImg("1549317661-bd32c8ce0db2"), unsplashImg("1605559424843-9e4c228bf1c2"), unsplashImg("1461632830798-3adb3034e4c8")],
      daysAgo: 13
    }
  ];

  /* Stagger creation timestamps (oldest = highest daysAgo) so the
     newest-first sort has a realistic, verifiable order out of the box. */
  const now = Date.now();
  const createdCars = demoCars.map((car) => {
    const { daysAgo, ...carFields } = car;
    return addCar({
      ...carFields,
      dateAdded: new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString()
    });
  });

  /* Seed a couple of demo sales for the sold cars */
  const soldCars = createdCars.filter((c) => c.status === "sold");
  soldCars.forEach((car, index) => {
    const sales = getSales();
    sales.push({
      id: generateId(sales),
      carId: car.id,
      customerName: index === 0 ? "Ahmad Rahimi" : "Sara Karimi",
      price: car.price,
      saleDate: "2026-08-" + (10 + index),
      paymentStatus: "paid"
    });
    writeStore(STORAGE_KEYS.SALES, sales);
  });

  /* Seed a couple of demo repairs for the "repair" status cars */
  const repairCars = createdCars.filter((c) => c.status === "repair");
  repairCars.forEach((car, index) => {
    const repairs = getRepairs();
    repairs.push({
      id: generateId(repairs),
      carId: car.id,
      repairType: index === 0 ? "Engine Service" : "Body Work",
      description: index === 0 ? "Full engine diagnostic and oil system service." : "Repainting and dent repair on rear panel.",
      cost: index === 0 ? 450 : 620,
      startDate: "2026-08-2" + index,
      completionDate: "",
      status: "in-repair"
    });
    writeStore(STORAGE_KEYS.REPAIRS, repairs);
  });

  localStorage.setItem(STORAGE_KEYS.SEEDED, "true");
}

/* --------------------------------------------------------------------
   INITIALIZATION — runs on every page
   -------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  seedDemoData();
  applyStoredTheme();
  initMobileNav();
  initAdminSidebar();
  initAuthAwareNav();

  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.addEventListener("click", toggleTheme);
  });

  /* Update footer year automatically wherever present */
  document.querySelectorAll(".current-year").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
});
