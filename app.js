/* ═══════════════════════════════════════════════════
   DON TROVE — app.js
   ═══════════════════════════════════════════════════

   CONFIG — update these two URLs to your own:
   ─────────────────────────────────────────────────
   SHEET_PRODUCTS_URL : opensheet.elk.sh proxy to your
                        Google Sheet "Products" tab
   SHEET_ORDERS_URL   : your Google Apps Script
                        web-app deployment URL
   ═══════════════════════════════════════════════════ */
const SHEET_PRODUCTS_URL =
"https://opensheet.elk.sh/1l1pIsSdVIbbu0AEEEJvDhlhinA4nGimT-ZSBGX0oLbY /Products";

const SHEET_ORDERS_URL =
"https://script.google.com/macros/s/AKfycbxy4v35wLYYitBtuI_gRJR-IS2Dt2NB3q0SAkK-n8SSeB8S-OUhL3_qvwbyTqnPKr16ag/exec";

/* ── Fallback products (shown if Sheet fails) ───── */
const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "Digital Planner",
    category: "PLANNER",
    description: "Black planners – stay organised in style",
    price: 1500,
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80",
    featured: true,
  },
  {
    id: "2",
    name: "Textured Notebook",
    category: "NOTEBOOK",
    description: "Aesthetic teal texture cover",
    price: 2000,
    imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80",
    featured: true,
  },
  {
    id: "3",
    name: "Printed Journal",
    category: "NOTEBOOK",
    description: "Vibrant printed style with gold rings",
    price: 3000,
    imageUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80",
    featured: true,
  },
];

/* ── State ──────────────────────────────────────── */
let products       = [];
let cart           = [];
let activeFilter   = "ALL";
let searchQuery    = "";
let lbProducts     = [];
let lbIndex        = 0;
let carouselIdx    = 0;
let carouselFeatured = [];

/* ── Helpers ────────────────────────────────────── */
const fmt = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;
const $   = (id) => document.getElementById(id);

function safeImage(url) {
  return url || "https://via.placeholder.com/600x400/fce8ee/e8708a?text=No+Image";
}

/* ── Toast ──────────────────────────────────────── */
let toastTimer;

function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ═══════════════════════════════════════════════════
   CART
   ═══════════════════════════════════════════════════ */

function addToCart(product) {
  const existing = cart.find((i) => i.id === product.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  renderCart();
  showToast(`${product.name} added to cart ✓`);
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  renderCart();
}

function cartTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function cartCount() {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

function renderCart() {
  const badge = $("cartBadge");
  const items = $("drawerItems");
  const total = $("cartTotalAmt");
  const foot  = $("drawerFoot");
  const count = cartCount();

  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-flex" : "none";
  total.textContent = fmt(cartTotal());

  if (cart.length === 0) {
    items.innerHTML = `
      <div class="empty-cart">
        <span style="font-size:2.5rem;display:block;margin-bottom:14px">🎁</span>
        Your cart is empty
      </div>`;
    foot.style.display = "none";
    return;
  }

  foot.style.display = "block";
  items.innerHTML = cart
    .map(
      (i) => `
      <div class="cart-item">
        <img class="ci-img" src="${safeImage(i.imageUrl)}" alt="${i.name}"/>
        <div class="ci-info">
          <div class="ci-name">${i.name} × ${i.qty}</div>
          <div class="ci-price">${fmt(i.price * i.qty)}</div>
        </div>
        <button class="ci-remove" onclick="removeFromCart('${i.id}')">✕</button>
      </div>`
    )
    .join("");
}

/* ═══════════════════════════════════════════════════
   DRAWER / SIDEBAR / MODAL — open & close
   ═══════════════════════════════════════════════════ */

function openCart() {
  $("cartDrawer").classList.add("active");
  $("drawerOverlay").classList.add("active");
}

function closeCart() {
  $("cartDrawer").classList.remove("active");
  $("drawerOverlay").classList.remove("active");
}

function openSidebar() {
  $("catSidebar").classList.add("active");
  $("catOverlay").classList.add("active");
}

function closeSidebar() {
  $("catSidebar").classList.remove("active");
  $("catOverlay").classList.remove("active");
}

/* ═══════════════════════════════════════════════════
   PRODUCT GRID
   ═══════════════════════════════════════════════════ */

function cardHTML(p, idx) {
  return `
    <div class="product-card">
      <div class="product-img-wrap" onclick="openLightbox(${idx})">
        <img
          class="product-img"
          src="${safeImage(p.imageUrl)}"
          alt="${p.name}"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/600x400/fce8ee/e8708a?text=Missing'"
        />
        <span class="zoom-hint">⛶ VIEW</span>
      </div>
      <div class="product-body">
        <span class="product-category">${p.category}</span>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description}</div>
        <div class="product-footer">
          <span class="product-price">${fmt(p.price)}</span>
          <button class="add-btn" onclick='addToCart(${JSON.stringify(p)})'>+ ADD</button>
        </div>
      </div>
    </div>`;
}

function getFiltered() {
  const q = searchQuery.toLowerCase();
  return products.filter((p) => {
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q);
    const matchFilter = activeFilter === "ALL" || p.category === activeFilter;
    return matchSearch && matchFilter;
  });
}

function renderGrid() {
  const filtered = getFiltered();
  lbProducts = filtered;

  // Active filter pill
  if (activeFilter !== "ALL") {
    $("activeFilterBar").style.display = "flex";
    $("activeFilterPill").textContent = activeFilter;
  } else {
    $("activeFilterBar").style.display = "none";
  }

  $("productGrid").innerHTML =
    filtered.length === 0
      ? `<div class="empty-state"><span>🔍</span>No products found</div>`
      : filtered.map((p, i) => cardHTML(p, i)).join("");
}

/* ═══════════════════════════════════════════════════
   CATEGORY SIDEBAR
   ═══════════════════════════════════════════════════ */

function renderCategories() {
  const cats = ["ALL", ...new Set(products.map((p) => p.category))];
  $("catList").innerHTML = cats
    .map(
      (c) => `
      <div class="cat-item ${activeFilter === c ? "active" : ""}"
           onclick="selectCategory('${c}')">
        <span>${c}</span>
      </div>`
    )
    .join("");
}

function selectCategory(cat) {
  activeFilter = cat;
  renderGrid();
  renderCategories();
  closeSidebar();
}

/* ═══════════════════════════════════════════════════
   FEATURED CAROUSEL
   ═══════════════════════════════════════════════════ */

function renderCarousel() {
  carouselFeatured = products.filter((p) => p.featured);

  if (!carouselFeatured.length) {
    $("carouselSection").style.display = "none";
    return;
  }

  $("carouselSection").style.display = "block";
  $("carouselTrack").innerHTML = carouselFeatured
    .map(
      (p, i) => `
      <div class="carousel-slide">
        <div class="product-card">
          <div class="product-img-wrap" onclick="openCarouselLightbox(${i})">
            <img class="product-img" src="${safeImage(p.imageUrl)}" alt="${p.name}" loading="lazy"/>
            <span class="zoom-hint">⛶ VIEW</span>
          </div>
          <div class="product-body">
            <span class="product-category">${p.category}</span>
            <div class="product-name">${p.name}</div>
            <div class="product-desc">${p.description}</div>
            <div class="product-footer">
              <span class="product-price">${fmt(p.price)}</span>
              <button class="add-btn" onclick='addToCart(${JSON.stringify(p)})'>+ ADD</button>
            </div>
          </div>
        </div>
      </div>`
    )
    .join("");

  carouselIdx = 0;
  moveCarousel(0);
}

function openCarouselLightbox(idx) {
  lbProducts = carouselFeatured;
  openLightbox(idx);
}

function moveCarousel(dir) {
  const track  = $("carouselTrack");
  const slides = track.querySelectorAll(".carousel-slide");
  if (!slides.length) return;

  const visible = window.innerWidth < 600 ? 1 : 3;
  const max     = Math.max(0, slides.length - visible);
  carouselIdx   = Math.max(0, Math.min(carouselIdx + dir, max));
  const slideW  = slides[0].offsetWidth + 20;
  track.style.transform = `translateX(-${carouselIdx * slideW}px)`;
}

/* ═══════════════════════════════════════════════════
   LIGHTBOX
   ═══════════════════════════════════════════════════ */

function openLightbox(idx) {
  lbIndex = idx;
  showLbProduct();
  $("lightbox").classList.add("active");
  document.body.style.overflow = "hidden";
}

function showLbProduct() {
  const p = lbProducts[lbIndex];
  if (!p) return;
  $("lbImg").src          = safeImage(p.imageUrl);
  $("lbName").textContent = p.name;
  $("lbPrice").textContent = fmt(p.price);
  $("lbAdd").onclick = () => {
    addToCart(p);
    closeLightbox();
    openCart();
  };
}

function closeLightbox() {
  $("lightbox").classList.remove("active");
  document.body.style.overflow = "";
}

/* ═══════════════════════════════════════════════════
   ORDER MODAL
   ═══════════════════════════════════════════════════ */

function openModal() {
  const total = cartTotal();
  $("fTotal").value = fmt(total);
  $("orderSummary").innerHTML =
    cart
      .map((i) => `<div>• ${i.name} × ${i.qty} — ${fmt(i.price * i.qty)}</div>`)
      .join("") +
    `<div style="margin-top:8px;font-weight:700;border-top:1px solid rgba(232,112,138,.2);padding-top:8px;">
       Total: ${fmt(total)}
     </div>`;
  $("modalOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  $("modalOverlay").classList.remove("active");
  document.body.style.overflow = "";
}

async function submitOrder() {
  const name    = $("fName").value.trim();
  const phone   = $("fPhone").value.trim();
  const city    = $("fCity").value.trim();
  const address = $("fAddress").value.trim();

  if (!name || !phone || !city || !address) {
    showToast("Please fill in all required fields");
    return;
  }

  const orderRef = "DT-" + Date.now().toString(36).toUpperCase();
  const payload  = {
    action:        "order",
    orderRef,
    dateTime:      new Date().toLocaleString("en-PK"),
    senderName:    name,
    phone,
    city,
    address,
    notes:         $("fNotes").value.trim(),
    items:         cart.map((i) => `${i.name} x${i.qty}`).join(", "),
    subtotal:      cartTotal(),
    deliveryFee:   200,
    total:         cartTotal() + 200,
    paymentMethod: "COD",
  };

  $("submitBtn").textContent = "Placing order…";
  $("submitBtn").disabled    = true;

  try {
    await fetch(SHEET_ORDERS_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    cart = [];
    renderCart();
    closeModal();
    closeCart();
    showToast(`Order ${orderRef} placed! 🎉`);
  } catch {
    showToast("Order saved — check your sheet manually.");
  } finally {
    $("submitBtn").textContent = "Place Order →";
    $("submitBtn").disabled    = false;
  }
}

/* ═══════════════════════════════════════════════════
   LOAD PRODUCTS FROM GOOGLE SHEETS
   ═══════════════════════════════════════════════════ */

async function loadProducts() {
  try {
    const res = await fetch(SHEET_PRODUCTS_URL);
    if (!res.ok) throw new Error("Sheet fetch failed");

    const data = await res.json();
    products = data
      .filter((r) => Object.keys(r).length > 0)
      .map((r, i) => ({
        id:          r.id || String(i + 1),
        name:        r.name || r.title || "Unnamed Product",
        category:    (r.category || "GENERAL").toUpperCase(),
        description: r.description || r.desc || "No description available",
        price:       Number(r.price) || 0,
        imageUrl:    r.imageUrl || r.image || r.img || "",
        featured:
          r.featured === "TRUE" ||
          r.featured === true  ||
          r.featured === "true",
      }))
      .filter((p) => p.name && p.price >= 0);

  } catch {
    // Fallback to mock data if Sheet is unreachable
    products = MOCK_PRODUCTS;
  }

  $("loadingMsg").style.display = "none";
  renderGrid();
  renderCategories();
  renderCarousel();
  renderCart();
}

/* ═══════════════════════════════════════════════════
   EVENT LISTENERS
   ═══════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {

  // Search
  $("searchInput").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderGrid();
  });

  // Cart drawer
  $("cartBtn").addEventListener("click", openCart);
  $("drawerClose").addEventListener("click", closeCart);
  $("drawerOverlay").addEventListener("click", closeCart);

  // Category sidebar
  $("hamburgerBtn").addEventListener("click", openSidebar);
  $("catClose").addEventListener("click", closeSidebar);
  $("catOverlay").addEventListener("click", closeSidebar);

  // Lightbox
  $("lbClose").addEventListener("click", closeLightbox);
  $("lbPrev").addEventListener("click", () => {
    if (lbIndex > 0) { lbIndex--; showLbProduct(); }
  });
  $("lbNext").addEventListener("click", () => {
    if (lbIndex < lbProducts.length - 1) { lbIndex++; showLbProduct(); }
  });
  $("lightbox").addEventListener("click", (e) => {
    if (e.target === $("lightbox")) closeLightbox();
  });

  // Carousel
  $("carouselPrev").addEventListener("click", () => moveCarousel(-1));
  $("carouselNext").addEventListener("click", () => moveCarousel(1));

  // Filter clear
  $("clearFilterBtn").addEventListener("click", () => selectCategory("ALL"));

  // Checkout & order modal
  $("checkoutBtn").addEventListener("click", () => { closeCart(); openModal(); });
  $("submitBtn").addEventListener("click", submitOrder);
  $("modalCancel").addEventListener("click", closeModal);
  $("modalOverlay").addEventListener("click", (e) => {
    if (e.target === $("modalOverlay")) closeModal();
  });

  // Escape key closes any open panel
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLightbox();
      closeCart();
      closeSidebar();
      closeModal();
    }
  });

  // Boot
  loadProducts();
});
