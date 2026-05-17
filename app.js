// ── CONFIG ───────────────────────────────────────────────────────────────────
const SHEET_PRODUCTS_URL =
  "https://opensheet.elk.sh/1l1pIsSdVIbbu0AEEEJvDhlhinA4nGimT-ZSBGX0oLbY/Products";

const SHEET_ORDERS_URL =
  "https://script.google.com/macros/s/AKfycbz6M3K2dTjWGDCqTCtrYAZkXtQf8H_gIGGwFVJ7CWNrRDxf2Le8fe3otawbdzSu_Qfa3w/exec";

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "Digital Planner",
    category: "PLANNER",
    description: "Black planners – stay organised in style",
    price: 1500,
    imageUrl:
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80",
    featured: true,
  },
  {
    id: "2",
    name: "Textured Notebook",
    category: "NOTEBOOK",
    description: "Aesthetic teal texture cover",
    price: 2000,
    imageUrl:
      "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80",
    featured: true,
  },
  {
    id: "3",
    name: "Printed Journal",
    category: "NOTEBOOK",
    description: "Vibrant printed style with gold rings",
    price: 3000,
    imageUrl:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80",
    featured: true,
  },
];

// ── STATE ─────────────────────────────────────────────────────────────────────
let products = [];
let cart = [];
let activeFilter = "ALL";
let searchQuery = "";
let lbProducts = [];
let lbIndex = 0;
let carouselIdx = 0;

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmt = n => `PKR ${Number(n).toLocaleString("en-PK")}`;
const $ = id => document.getElementById(id);

function safeImage(url) {
  return (
    url ||
    "https://via.placeholder.com/600x400/f5f0fb/4b1d8e?text=No+Image"
  );
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
let toastTimer;

function showToast(msg) {
  const t = $("toast");

  t.textContent = msg;
  t.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    t.classList.remove("show");
  }, 2400);
}

// ── CART ──────────────────────────────────────────────────────────────────────
function addToCart(product) {
  const existing = cart.find(i => i.id === product.id);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  renderCart();

  showToast(`${product.name} added to cart ✓`);
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  renderCart();
}

function cartTotal() {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

function cartCount() {
  return cart.reduce((s, i) => s + i.qty, 0);
}

function renderCart() {
  const badge = $("cartBadge");
  const items = $("drawerItems");
  const total = $("cartTotalAmt");
  const foot = $("drawerFoot");

  badge.textContent = cartCount();
  total.textContent = fmt(cartTotal());

  if (cart.length === 0) {
    items.innerHTML = `
      <div class="empty-cart">
        <span style="font-size:2.5rem">🎁</span>
        Your cart is empty
      </div>
    `;

    foot.style.display = "none";
    return;
  }

  foot.style.display = "block";

  items.innerHTML = cart.map(i => `
    <div class="cart-item">
      <img class="ci-img" src="${safeImage(i.imageUrl)}" />

      <div class="ci-info">
        <div class="ci-name">${i.name} × ${i.qty}</div>
        <div class="ci-price">${fmt(i.price * i.qty)}</div>
      </div>

      <button class="ci-remove" onclick="removeFromCart('${i.id}')">
        ✕
      </button>
    </div>
  `).join("");
}

// ── PRODUCT CARD ──────────────────────────────────────────────────────────────
function cardHTML(p, idx) {
  return `
    <div class="product-card">

      <div class="product-img-wrap" onclick="openLightbox(${idx})">

        <img
          class="product-img"
          src="${safeImage(p.imageUrl)}"
          alt="${p.name}"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/600x400/f5f0fb/4b1d8e?text=Image+Missing'"
        />

        <span class="zoom-hint">⛶ VIEW</span>

      </div>

      <div class="product-body">

        <span class="product-category">${p.category}</span>

        <div class="product-name">${p.name}</div>

        <div class="product-desc">${p.description}</div>

        <div class="product-footer">

          <span class="product-price">${fmt(p.price)}</span>

          <button
            class="add-btn"
            onclick='addToCart(${JSON.stringify(p)})'
          >
            + ADD
          </button>

        </div>

      </div>

    </div>
  `;
}

// ── FILTERING ─────────────────────────────────────────────────────────────────
function getFiltered() {
  const q = searchQuery.toLowerCase();

  return products.filter(p => {
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q);

    const matchFilter =
      activeFilter === "ALL" ||
      p.category === activeFilter;

    return matchSearch && matchFilter;
  });
}

// ── GRID ──────────────────────────────────────────────────────────────────────
function renderGrid() {
  const filtered = getFiltered();

  lbProducts = filtered;

  $("productGrid").innerHTML =
    filtered.map((p, i) => cardHTML(p, i)).join("");
}

// ── CATEGORIES ────────────────────────────────────────────────────────────────
function renderCategories() {
  const cats = [
    "ALL",
    ...new Set(products.map(p => p.category))
  ];

  $("catList").innerHTML = cats.map(c => `
    <div
      class="cat-item ${activeFilter === c ? "active" : ""}"
      onclick="selectCategory('${c}')"
    >
      <span>${c}</span>
    </div>
  `).join("");
}

function selectCategory(cat) {
  activeFilter = cat;
  renderGrid();
  renderCategories();
}

// ── CAROUSEL ──────────────────────────────────────────────────────────────────
function renderCarousel() {
  const featured = products.filter(p => p.featured);

  if (featured.length === 0) return;

  $("carouselTrack").innerHTML =
    featured.map((p, i) => `
      <div class="carousel-slide">
        ${cardHTML(p, i)}
      </div>
    `).join("");
}

// ── LIGHTBOX ──────────────────────────────────────────────────────────────────
function openLightbox(idx) {
  lbIndex = idx;

  const p = lbProducts[idx];

  if (!p) return;

  $("lbImg").src = safeImage(p.imageUrl);
  $("lbName").textContent = p.name;
  $("lbPrice").textContent = fmt(p.price);

  $("lightbox").classList.add("active");
}

function closeLightbox() {
  $("lightbox").classList.remove("active");
}

// ── LOAD PRODUCTS ─────────────────────────────────────────────────────────────
async function loadProducts() {
  try {
    const res = await fetch(SHEET_PRODUCTS_URL);

    if (!res.ok) {
      throw new Error("Failed to fetch sheet");
    }

    const data = await res.json();

    products = data
      .filter(r => Object.keys(r).length > 0)
      .map((r, index) => ({
        id:
          r.id ||
          String(index + 1),

        name:
          r.name ||
          r.title ||
          "Unnamed Product",

        category:
          r.category ||
          "GENERAL",

        description:
          r.description ||
          r.desc ||
          "No description available",

        price:
          Number(r.price) || 0,

        imageUrl:
          r.imageUrl ||
          r.image ||
          r.img ||
          "",

        featured:
          r.featured === "TRUE" ||
          r.featured === true ||
          r.featured === "true"
      }));

    // REMOVE BROKEN EMPTY PRODUCTS
    products = products.filter(p =>
      p.name &&
      p.price >= 0
    );

  } catch (err) {

    console.error(err);

    products = MOCK_PRODUCTS;
  }

  $("loadingMsg").style.display = "none";

  renderGrid();
  renderCategories();
  renderCarousel();
  renderCart();
}

// ── EVENTS ────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  // SEARCH
  $("searchInput").addEventListener("input", e => {
    searchQuery = e.target.value;
    renderGrid();
  });

  // LIGHTBOX CLOSE
  $("lbClose").addEventListener("click", closeLightbox);

  // LOAD
  loadProducts();
});
