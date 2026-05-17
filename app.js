// ── CONFIG ───────────────────────────────────────────────────────────────────
const SHEET_PRODUCTS_URL = "https://opensheet.elk.sh/1l1pIsSdVIbbu0AEEEJvDhlhinA4nGimT-ZSBGX0oLbY/Products";
const SHEET_ORDERS_URL   = "https://script.google.com/macros/s/AKfycbyrTW1uuvTQL4HPw-RYpdg7uupPgpGQNR8tDN0lnPvwKiZRn74UwmRAWUtS5oYhgixR-w/exec";

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
const MOCK_PRODUCTS = [
  { id: "1", name: "Digital Planner",   category: "PLANNER",     description: "Black planners – stay organised in style", price: 1500, imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80",  featured: true  },
  { id: "2", name: "Textured Notebook", category: "NOTEBOOK",    description: "Aesthetic teal texture cover",              price: 2000, imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80",  featured: true  },
  { id: "3", name: "Printed Journal",   category: "NOTEBOOK",    description: "Vibrant printed style with gold rings",     price: 3000, imageUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80",  featured: true  },
  { id: "4", name: "Luxury Gift Box",   category: "GIFT SET",    description: "Curated box for the ones you love",        price: 4500, imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&q=80",  featured: false },
  { id: "5", name: "Washi Tape Set",    category: "STATIONERY",  description: "Pastel floral patterns, 8-piece set",      price: 800,  imageUrl: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600&q=80",  featured: false },
  { id: "6", name: "Leather Pen Case",  category: "ACCESSORIES", description: "Slim genuine leather pen holder",         price: 1200, imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&q=80",  featured: true  },
];

// ── STATE ─────────────────────────────────────────────────────────────────────
let products    = [];
let cart        = [];
let activeFilter = "ALL";
let searchQuery  = "";
let lbProducts   = [];   // products currently visible (for lightbox navigation)
let lbIndex      = 0;    // current lightbox index
let carouselIdx  = 0;

// ── UTILS ─────────────────────────────────────────────────────────────────────
const fmt = n => `PKR ${Number(n).toLocaleString("en-PK")}`;
const $ = id => document.getElementById(id);

// ── TOAST ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

// ── CART ──────────────────────────────────────────────────────────────────────
function addToCart(product) {
  const ex = cart.find(i => i.id === product.id);
  if (ex) ex.qty++;
  else cart.push({ ...product, qty: 1 });
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
  const badge  = $("cartBadge");
  const count  = cartCount();
  const items  = $("drawerItems");
  const foot   = $("drawerFoot");
  const total  = $("cartTotalAmt");

  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-flex" : "none";
  total.textContent = fmt(cartTotal());

  if (cart.length === 0) {
    items.innerHTML = `<div class="empty-cart"><span style="font-size:2.5rem">🎁</span>Your cart is empty<br><small>Add something lovely</small></div>`;
    foot.style.display = "none";
  } else {
    items.innerHTML = cart.map(i => `
      <div class="cart-item">
        <img class="ci-img" src="${i.imageUrl}" alt="${i.name}" />
        <div class="ci-info">
          <div class="ci-name">${i.name} × ${i.qty}</div>
          <div class="ci-price">${fmt(i.price * i.qty)}</div>
        </div>
        <button class="ci-remove" onclick="removeFromCart('${i.id}')">✕</button>
      </div>`).join("");
    foot.style.display = "block";
  }
}

// ── PRODUCT CARD HTML ─────────────────────────────────────────────────────────
function cardHTML(p, idx) {
  return `
    <div class="product-card">
      <div class="product-img-wrap" onclick="openLightbox(${idx})">
        <img class="product-img" src="${p.imageUrl}" alt="${p.name}" loading="lazy" />
        <span class="zoom-hint">⛶ VIEW</span>
      </div>
      <div class="product-body">
        <span class="product-category">${p.category}</span>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description}</div>
        <div class="product-footer">
          <span class="product-price">${fmt(p.price)}</span>
          <button class="add-btn" onclick="addToCart(${JSON.stringify(p).replace(/"/g, '&quot;')})">+ ADD</button>
        </div>
      </div>
    </div>`;
}

// ── RENDER GRID ───────────────────────────────────────────────────────────────
function getFiltered() {
  const q = searchQuery.toLowerCase();
  return products.filter(p => {
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    const matchFilter = activeFilter === "ALL" || p.category === activeFilter;
    return matchSearch && matchFilter;
  });
}

function renderGrid() {
  const filtered = getFiltered();
  lbProducts = filtered;

  // Active filter bar
  const bar  = $("activeFilterBar");
  const pill = $("activeFilterPill");
  if (activeFilter !== "ALL") {
    pill.textContent = activeFilter;
    bar.style.display = "flex";
  } else {
    bar.style.display = "none";
  }

  // Grid
  const grid = $("productGrid");
  grid.innerHTML = filtered.map((p, i) => cardHTML(p, i)).join("");
}

// ── CATEGORIES SIDEBAR ────────────────────────────────────────────────────────
function renderCategories() {
  const cats = ["ALL", ...new Set(products.map(p => p.category))];
  const list = $("catList");
  list.innerHTML = cats.map(c => {
    const count = c === "ALL" ? products.length : products.filter(p => p.category === c).length;
    const label = c === "ALL" ? "All Products" : c;
    return `
      <div class="cat-item ${activeFilter === c ? "active" : ""}" onclick="selectCategory('${c}')">
        <span>${label}</span>
        <span class="cat-item-count">${count}</span>
      </div>`;
  }).join("");
}

function selectCategory(cat) {
  activeFilter = cat;
  renderGrid();
  renderCategories();
  closeMenu();
}

// ── CAROUSEL ──────────────────────────────────────────────────────────────────
function renderCarousel() {
  const featured = products.filter(p => p.featured);
  const section  = $("carouselSection");

  if (featured.length === 0) { section.style.display = "none"; return; }
  section.style.display = "block";

  const track = $("carouselTrack");
  track.innerHTML = featured.map((p, i) => `
    <div class="carousel-slide">${cardHTML(p, i)}</div>`).join("");

  updateCarouselPos();
  updateCarouselBtns(featured.length);
}

function getVisibleSlides() {
  const w = window.innerWidth;
  if (w <= 580) return 1;
  if (w <= 900) return 2;
  return 3;
}

function updateCarouselPos() {
  const track    = $("carouselTrack");
  const outer    = $("carouselOuter");
  const visible  = getVisibleSlides();
  const slideW   = outer.offsetWidth / visible;
  track.style.transform = `translateX(-${carouselIdx * slideW}px)`;
}

function updateCarouselBtns(total) {
  const visible = getVisibleSlides();
  const max     = Math.max(0, total - visible);
  $("carouselPrev").style.display = carouselIdx > 0   ? "flex" : "none";
  $("carouselNext").style.display = carouselIdx < max ? "flex" : "none";
}

// ── LIGHTBOX ──────────────────────────────────────────────────────────────────
function openLightbox(idx) {
  lbIndex = idx;
  renderLightbox();
  $("lightbox").classList.add("active");
}

function closeLightbox() {
  $("lightbox").classList.remove("active");
}

function renderLightbox() {
  const p = lbProducts[lbIndex];
  if (!p) return;
  $("lbImg").src   = p.imageUrl;
  $("lbImg").alt   = p.name;
  $("lbName").textContent  = p.name;
  $("lbPrice").textContent = fmt(p.price);
  $("lbAdd").onclick = () => { addToCart(p); closeLightbox(); };
}

function lbNavigate(dir) {
  lbIndex = (lbIndex + dir + lbProducts.length) % lbProducts.length;
  renderLightbox();
}

// ── CART DRAWER ───────────────────────────────────────────────────────────────
function openCart() {
  $("cartDrawer").classList.add("active");
  $("drawerOverlay").classList.add("active");
}

function closeCart() {
  $("cartDrawer").classList.remove("active");
  $("drawerOverlay").classList.remove("active");
}

// ── CATEGORY MENU ─────────────────────────────────────────────────────────────
function openMenu() {
  $("catSidebar").classList.add("active");
  $("catOverlay").classList.add("active");
  $("hamburgerBtn").classList.add("open");
}

function closeMenu() {
  $("catSidebar").classList.remove("active");
  $("catOverlay").classList.remove("active");
  $("hamburgerBtn").classList.remove("open");
}

// ── ORDER MODAL ───────────────────────────────────────────────────────────────
function openCheckout() {
  closeCart();
  // Populate summary
  const summary = $("orderSummary");
  const rows = cart.map(i => `<div class="os-row"><span>${i.name} × ${i.qty}</span><span>${fmt(i.price * i.qty)}</span></div>`).join("");
  summary.innerHTML = `<strong>Order Summary</strong>${rows}<div class="os-total"><span>Total</span><span>${fmt(cartTotal())}</span></div>`;
  $("fTotal").value = fmt(cartTotal());
  // Clear fields
  ["fName","fPhone","fCity","fAddress","fNotes"].forEach(id => $(id).value = "");
  $("modalOverlay").classList.add("active");
}

function closeCheckout() {
  $("modalOverlay").classList.remove("active");
}

async function submitOrder() {
  const name    = $("fName").value.trim();
  const phone   = $("fPhone").value.trim();
  const city    = $("fCity").value.trim();
  const address = $("fAddress").value.trim();
  const notes   = $("fNotes").value.trim();

  if (!name || !phone || !city || !address) return;

  const btn = $("submitBtn");
  btn.disabled = true;
  btn.textContent = "Placing Order…";

  const payload = {
    timestamp: new Date().toISOString(),
    name, phone, city, address, notes,
    items: cart.map(i => `${i.name} x${i.qty}`).join(", "),
    total: cartTotal(),
  };

  try {
    await fetch(SHEET_ORDERS_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
  } catch (_) { /* no-cors swallows the response — order still goes through */ }

  btn.disabled = false;
  btn.textContent = "Place Order →";
  closeCheckout();
  cart = [];
  renderCart();
  showToast(`Thank you ${name}! Your order has been placed 🎁`);
}

// ── LOAD PRODUCTS ─────────────────────────────────────────────────────────────
async function loadProducts() {
  try {
    const res  = await fetch(SHEET_PRODUCTS_URL);
    if (!res.ok) throw new Error();
    const data = await res.json();
    products   = data.map(r => ({ ...r, price: Number(r.price), featured: r.featured === "TRUE" || r.featured === true }));
  } catch {
    products = MOCK_PRODUCTS;
  }
  $("loadingMsg").style.display = "none";
  renderGrid();
  renderCategories();
  renderCarousel();
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  // Hamburger
  $("hamburgerBtn").addEventListener("click", () => {
    $("catSidebar").classList.contains("active") ? closeMenu() : openMenu();
  });
  $("catOverlay").addEventListener("click", closeMenu);
  $("catClose").addEventListener("click", closeMenu);

  // Cart
  $("cartBtn").addEventListener("click", openCart);
  $("drawerOverlay").addEventListener("click", closeCart);
  $("drawerClose").addEventListener("click", closeCart);
  $("checkoutBtn").addEventListener("click", openCheckout);

  // Lightbox
  $("lbClose").addEventListener("click", closeLightbox);
  $("lbPrev").addEventListener("click", () => lbNavigate(-1));
  $("lbNext").addEventListener("click", () => lbNavigate(1));
  $("lightbox").addEventListener("click", e => { if (e.target === $("lightbox")) closeLightbox(); });

  // Order modal
  $("submitBtn").addEventListener("click", submitOrder);
  $("modalCancel").addEventListener("click", closeCheckout);
  $("modalOverlay").addEventListener("click", e => { if (e.target === $("modalOverlay")) closeCheckout(); });

  // Search
  $("searchInput").addEventListener("input", e => {
    searchQuery = e.target.value;
    renderGrid();
  });

  // Clear filter
  $("clearFilterBtn").addEventListener("click", () => {
    activeFilter = "ALL";
    renderGrid();
    renderCategories();
  });

  // Carousel buttons
  $("carouselPrev").addEventListener("click", () => {
    carouselIdx = Math.max(0, carouselIdx - 1);
    updateCarouselPos();
    updateCarouselBtns(products.filter(p => p.featured).length);
  });
  $("carouselNext").addEventListener("click", () => {
    const max = Math.max(0, products.filter(p => p.featured).length - getVisibleSlides());
    carouselIdx = Math.min(max, carouselIdx + 1);
    updateCarouselPos();
    updateCarouselBtns(products.filter(p => p.featured).length);
  });

  // Keyboard navigation for lightbox
  document.addEventListener("keydown", e => {
    if (!$("lightbox").classList.contains("active")) return;
    if (e.key === "Escape")      closeLightbox();
    if (e.key === "ArrowRight")  lbNavigate(1);
    if (e.key === "ArrowLeft")   lbNavigate(-1);
  });

  // Resize: recalculate carousel
  window.addEventListener("resize", () => {
    updateCarouselPos();
    updateCarouselBtns(products.filter(p => p.featured).length);
  });

  // Boot
  loadProducts();
});
