/**
 * Don Trove — app.js
 * Multi-image carousel | Color swatches | Size selector with per-size pricing
 * Size & colour selection moved to cart view
 */

const CONFIG = {
  SHEET_URL:    "https://script.google.com/macros/s/AKfycbzEBnEeK8tf2a-gfEIpC6brmFC4hKLodlmTRJI9K8TR6zH4z4zBDI_cfdi8NJsxySL9HA/exec",
  DELIVERY_FEE: 200,
  GIFT_WRAP:    300,
};

// ── Named colour palette ──────────────────────────────────────────────────────
const COLOUR_MAP = {
  "rose":         "#C9697E",
  "light pink":   "#F9C6D4",
  "blush pink":   "#F5A8BC",
  "dusty rose":   "#E8A4B8",
  "hot pink":     "#F06090",
  "pink":         "#F5A8BC",
  "light red":    "#F4A0A0",
  "coral":        "#F2836B",
  "red":          "#E05555",
  "berry":        "#9B2A4A",
  "light blue":   "#B3D9F2",
  "sky blue":     "#7EC8E3",
  "periwinkle":   "#A8B8F0",
  "navy":         "#3A5A8C",
  "blue":         "#7EC8E3",
  "light green":  "#B5E8D5",
  "mint green":   "#B5E8D5",
  "mint":         "#B5E8D5",
  "sage green":   "#A8D8B9",
  "sage":         "#A8D8B9",
  "pistachio":    "#C8E8C0",
  "green":        "#6DBE8C",
  "lilac":        "#D4B8F0",
  "lavender":     "#C2A8E8",
  "purple":       "#9B72CF",
  "violet":       "#B090E0",
  "peach":        "#FBCBA8",
  "butter":       "#FAE8A0",
  "yellow":       "#F5DC6A",
  "ivory":        "#F8F0E8",
  "white":        "#F8F8F8",
  "black":        "#2C2C2C",
  "grey":         "#C0B8B8",
  "gray":         "#C0B8B8",
  "beige":        "#F0DEC8",
  "brown":        "#A07858",
  "gold":         "#E8C870",
  "champagne":    "#F5E6C8",
  "multi":        "__MULTI__",
};

let allProducts     = [];
let cart            = [];
let activeCategory  = "All";
let giftWrap        = false;
let selectedPayment = "Cash on Delivery";

const carouselState = {};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  renderCart();
  updateCartBadge();

  document.addEventListener("click", (e) => {
    const btn = document.getElementById("hamburgerBtn");
    const dd  = document.getElementById("catDropdown");
    if (dd && btn && !btn.contains(e.target) && !dd.contains(e.target)) {
      dd.classList.remove("open");
    }
  });
});

function toggleCatMenu() {
  document.getElementById("catDropdown")?.classList.toggle("open");
}

// ── Load Products ─────────────────────────────────────────────────────────────
async function loadProducts() {
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><p>Loading beautiful gifts…</p></div>`;

  try {
    const res  = await fetch(`${CONFIG.SHEET_URL}?t=${Date.now()}`);
    const data = await res.json();
    allProducts = Array.isArray(data) ? data : (data.products || []);

    if (allProducts.length === 0) {
      grid.innerHTML = `<p style="text-align:center;color:var(--muted);padding:60px 20px;grid-column:1/-1;">No products found.</p>`;
      return;
    }

    buildCategoryTabs();
    renderProducts();
  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div class="loading-wrap" style="grid-column:1/-1">
        <p style="color:#c0392b;margin-bottom:16px;">⚠️ Could not load products.<br/><small>${err.message}</small></p>
        <button class="checkout-btn" style="width:auto;padding:10px 28px;" onclick="loadProducts()">Try Again</button>
      </div>`;
  }
}

// ── Category Tabs ─────────────────────────────────────────────────────────────
function buildCategoryTabs() {
  const cats    = ["All", ...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const tabsRow = document.getElementById("catTabs");
  tabsRow.innerHTML = "";

  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "tab" + (cat === activeCategory ? " active" : "");
    btn.textContent = cat;
    btn.onclick = () => {
      activeCategory = cat;
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("catDropdown")?.classList.remove("open");
      showView("shop");
      renderProducts();
    };
    tabsRow.appendChild(btn);
  });
}

// ── Get Filtered List ─────────────────────────────────────────────────────────
function getFiltered() {
  const query = (document.getElementById("searchInput")?.value || "").toLowerCase();
  return allProducts.filter(p => {
    const matchCat    = activeCategory === "All" || p.category === activeCategory;
    const matchSearch = !query ||
      (p.name || "").toLowerCase().includes(query) ||
      (p.description || "").toLowerCase().includes(query);
    return matchCat && matchSearch;
  });
}

// ── Render Products ───────────────────────────────────────────────────────────
function renderProducts() {
  const filtered = getFiltered();
  const grid     = document.getElementById("productsGrid");

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="text-align:center;color:var(--muted);padding:60px 20px;grid-column:1/-1;font-style:italic;">No gifts match your search.</p>`;
    return;
  }

  const backBar = activeCategory !== "All" ? `
    <div style="grid-column:1/-1;margin-bottom:8px;">
      <button class="back-btn" onclick="activeCategory='All';document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));document.querySelector('.tab')?.classList.add('active');renderProducts();">← Back to All</button>
    </div>` : "";

  grid.innerHTML = backBar + filtered.map((p, i) => {
    // ── Images ──
    const images = (p.images && p.images.length > 0)
      ? p.images
      : (p.imageUrl ? p.imageUrl.split(',').map(u => u.trim()).filter(Boolean) : []);
    const carKey = `prod-${i}`;
    carouselState[carKey] = 0;
    const hasMany = images.length > 1;

    // First 3 products load eagerly (above the fold), rest lazy
    const slides = images.map((url, si) => {
      const eager = i < 3 && si === 0;
      return `<img
        src="${escHtml(url)}"
        alt="${escHtml(p.name)} ${si + 1}"
        class="carousel-slide${si === 0 ? ' active' : ''}"
        loading="${eager ? 'eager' : 'lazy'}"
        fetchpriority="${eager ? 'high' : 'auto'}"
        decoding="async"
        onerror="this.style.display='none'"
      />`;
    }).join("");

    const arrows = hasMany ? `
      <button class="carousel-arrow carousel-prev" onclick="event.stopPropagation();moveSlide('${carKey}',-1)">&#8249;</button>
      <button class="carousel-arrow carousel-next" onclick="event.stopPropagation();moveSlide('${carKey}',1)">&#8250;</button>` : "";

    const dots = hasMany ? `
      <div class="carousel-dots">
        ${images.map((_, di) => `
          <span class="carousel-dot${di === 0 ? ' active' : ''}"
            onclick="event.stopPropagation();goToSlide('${carKey}',${di})"></span>
        `).join("")}
      </div>` : "";

    const startPrice = (p.sizes && p.sizes.length > 0) ? p.sizes[0].price : p.price;

    return `
      <div class="product-card" style="animation-delay:${i * 0.06}s">
        <div class="product-img-wrap" id="${carKey}">
          ${images.length > 0 ? slides : `<div class="product-img-placeholder">🎁</div>`}
          ${arrows}
          ${dots}
        </div>
        <div class="product-body">
          ${p.category ? `<div class="product-category-tag">${escHtml(p.category)}</div>` : ""}
          <div class="product-name">${escHtml(p.name)}</div>
          ${p.description ? `<div class="product-desc">${escHtml(p.description)}</div>` : ""}
          <div class="product-footer">
            <span class="product-price">PKR ${Number(startPrice).toLocaleString()}</span>
            <button class="add-btn" onclick="addToCart(${i}, this)">+ Add to Cart</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

// ── Colour Utilities ──────────────────────────────────────────────────────────
function resolveColour(raw) {
  const trimmed = raw.trim();
  const key     = trimmed.toLowerCase();
  if (COLOUR_MAP[key]) {
    const hex = COLOUR_MAP[key];
    return { hex, name: trimmed, isMulti: hex === "__MULTI__" };
  }
  return { hex: trimmed, name: trimmed, isMulti: false };
}

// ── Carousel Controls ─────────────────────────────────────────────────────────
function moveSlide(carKey, delta) {
  const wrap = document.getElementById(carKey);
  if (!wrap) return;
  const slides = wrap.querySelectorAll(".carousel-slide");
  const dots   = wrap.querySelectorAll(".carousel-dot");
  if (!slides.length) return;

  let cur = carouselState[carKey] || 0;
  slides[cur].classList.remove("active");
  if (dots[cur]) dots[cur].classList.remove("active");
  cur = (cur + delta + slides.length) % slides.length;
  carouselState[carKey] = cur;
  slides[cur].classList.add("active");
  if (dots[cur]) dots[cur].classList.add("active");
}

function goToSlide(carKey, index) {
  const wrap = document.getElementById(carKey);
  if (!wrap) return;
  const slides = wrap.querySelectorAll(".carousel-slide");
  const dots   = wrap.querySelectorAll(".carousel-dot");
  if (!slides.length) return;

  const cur = carouselState[carKey] || 0;
  slides[cur].classList.remove("active");
  if (dots[cur]) dots[cur].classList.remove("active");
  carouselState[carKey] = index;
  slides[index].classList.add("active");
  if (dots[index]) dots[index].classList.add("active");
}

// ── Search ────────────────────────────────────────────────────────────────────
function filterProducts() { renderProducts(); }

// ── Add to Cart ───────────────────────────────────────────────────────────────
function addToCart(gridIndex, btn) {
  const filtered = getFiltered();
  const product  = filtered[gridIndex];
  if (!product) return;

  const hasSizes  = product.sizes && product.sizes.length > 0;
  const price     = hasSizes ? product.sizes[0].price : product.price;
  const sizeLabel = hasSizes ? product.sizes[0].label : null;

  const cartKey = `${product.name}|${Date.now()}`;
  cart.push({
    ...product,
    price,
    sizeLabel,
    chosenColor: null,
    qty: 1,
    _cartKey: cartKey,
  });

  updateCartBadge();
  showToast(`🎁 "${product.name}" added — pick size & colour in cart`);
  showView("cart");

  if (btn) {
    const orig = btn.textContent;
    btn.textContent = "✓ Added";
    btn.style.background = "linear-gradient(135deg,#1A7A4A,#27ae60)";
    setTimeout(() => { btn.textContent = orig; btn.style.background = ""; }, 1200);
  }
}

// ── Cart Badge ────────────────────────────────────────────────────────────────
function updateCartBadge() {
  const count = cart.reduce((a, b) => a + b.qty, 0);
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  badge.textContent = count;
  badge.classList.toggle("show", count > 0);
}

// ── Render Cart ───────────────────────────────────────────────────────────────
function renderCart() {
  const list = document.getElementById("cartItemsList");
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="cart-empty">
        <span class="empty-icon">🛍️</span>
        <p>Your cart is empty.</p>
        <button class="checkout-btn" style="width:auto;padding:10px 28px;margin-top:16px;" onclick="showView('shop')">Browse Gifts</button>
      </div>`;
    document.getElementById("proceedBtn").disabled = true;
    updateSummary();
    return;
  }

  list.innerHTML = cart.map((item, i) => {

    const hasSizes = item.sizes && item.sizes.length > 0;
    const sizesHtml = hasSizes ? `
      <div class="size-row" style="margin:10px 0 4px;">
        <span class="size-label">SIZE:</span>
        ${item.sizes.map((s, si) => {
          const isActive = item.sizeLabel === s.label;
          return `<button
            class="size-btn${isActive ? ' size-btn-active' : ''}"
            onclick="cartSelectSize(${i}, ${si})"
          >${escHtml(s.label)}</button>`;
        }).join("")}
      </div>` : "";

    const colorStr = item.colors || item.color || "";
    const colours  = colorStr
      ? String(colorStr).split(",").map(c => c.trim()).filter(Boolean).map(resolveColour)
      : [];

    const colorHtml = colours.length ? `
      <div class="color-picker" style="margin:6px 0 10px;">
        <div class="color-picker-label">COLOUR:</div>
        <div class="color-swatches" id="cart-swatches-${i}">
          ${colours.map(c => {
            const isSelected = item.chosenColor === c.name;
            if (c.isMulti) {
              return `<span class="color-swatch swatch-multi${isSelected ? ' selected' : ''}" title="Multi" onclick="cartSelectColor(${i}, 'Multi', this)"></span>`;
            }
            return `<span
              class="color-swatch${isSelected ? ' selected' : ''}"
              style="background:${escHtml(c.hex)};"
              title="${escHtml(c.name)}"
              onclick="cartSelectColor(${i}, '${escHtml(c.name)}', this)"
            ></span>`;
          }).join("")}
        </div>
      </div>` : "";

    const needsAttention = (item.sizes && item.sizes.length > 1 && !item.sizeLabel) ||
                           (colours.length > 0 && !item.chosenColor);

    return `
    <div class="cart-item" style="flex-wrap:wrap;align-items:flex-start;${needsAttention ? 'border-color:rgba(224,104,120,0.35);' : ''}">
      <div class="cart-item-img" style="flex-shrink:0;">
        ${item.imageUrl
          // FIX 2: added loading="lazy" decoding="async" to cart image
          ? `<img src="${escHtml(item.imageUrl)}" alt="${escHtml(item.name)}" loading="lazy" decoding="async" onerror="this.style.display='none'">`
          : "🎁"}
      </div>
      <div class="cart-item-info" style="flex:1;min-width:160px;">
        <div class="cart-item-name">${escHtml(item.name)}</div>
        <div class="cart-item-price">PKR ${Number(item.price).toLocaleString()} each</div>
        ${sizesHtml}
        ${colorHtml}
        ${needsAttention ? `<div style="font-size:0.75rem;color:var(--royal);margin-bottom:6px;">✦ Please select your options above</div>` : ""}
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty(${i}, -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${i}, 1)">+</button>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-weight:700;color:var(--royal);margin-bottom:8px;">PKR ${(Number(item.price) * item.qty).toLocaleString()}</div>
        <button class="remove-btn" onclick="removeFromCart(${i})">✕ Remove</button>
      </div>
    </div>`;
  }).join("");

  document.getElementById("proceedBtn").disabled = false;
  updateSummary();
}

// ── Cart Size & Colour Selectors ──────────────────────────────────────────────
function cartSelectSize(cartIdx, sizeIdx) {
  const item = cart[cartIdx];
  if (!item || !item.sizes) return;
  item.sizeLabel = item.sizes[sizeIdx].label;
  item.price     = item.sizes[sizeIdx].price;
  renderCart();
}

function cartSelectColor(cartIdx, colorName, el) {
  cart[cartIdx].chosenColor = colorName;
  const wrap = document.getElementById(`cart-swatches-${cartIdx}`);
  if (wrap) wrap.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("selected"));
  el.classList.add("selected");
}

function changeQty(index, delta) {
  cart[index].qty = Math.max(1, cart[index].qty + delta);
  renderCart();
  updateCartBadge();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
  updateCartBadge();
}

// ── Order Summary ─────────────────────────────────────────────────────────────
function updateSummary() {
  const subtotal = cart.reduce((a, b) => a + Number(b.price) * b.qty, 0);
  const wrapFee  = giftWrap ? CONFIG.GIFT_WRAP : 0;
  const total    = subtotal + CONFIG.DELIVERY_FEE + wrapFee;

  const el = id => document.getElementById(id);
  if (el("summSubtotal")) el("summSubtotal").textContent = `PKR ${subtotal.toLocaleString()}`;
  if (el("summDelivery"))  el("summDelivery").textContent  = `PKR ${CONFIG.DELIVERY_FEE}`;
  if (el("summTotal"))     el("summTotal").textContent     = `PKR ${total.toLocaleString()}`;
  if (el("co-subtotal"))   el("co-subtotal").textContent   = `PKR ${subtotal.toLocaleString()}`;
  if (el("co-wrap"))       el("co-wrap").textContent       = wrapFee ? `PKR ${wrapFee}` : "—";
  if (el("co-total"))      el("co-total").textContent      = `PKR ${total.toLocaleString()}`;

  const coList = el("checkoutItemsList");
  if (coList) {
    coList.innerHTML = cart.map(item => `
      <div class="checkout-item-row">
        <div>
          <div class="checkout-item-name">
            ${escHtml(item.name)}
            ${item.sizeLabel ? `<span style="font-size:0.72rem;color:var(--muted);margin-left:4px;">(${escHtml(item.sizeLabel)})</span>` : ""}
            ${item.chosenColor ? `<span style="font-size:0.72rem;color:var(--muted);margin-left:2px;">${escHtml(item.chosenColor)}</span>` : ""}
          </div>
          <div class="checkout-item-qty">×${item.qty}</div>
        </div>
        <div class="checkout-item-price">PKR ${(Number(item.price) * item.qty).toLocaleString()}</div>
      </div>
    `).join("");
  }
}

document.addEventListener("change", e => {
  if (e.target.id === "giftWrapCheck") { giftWrap = e.target.checked; updateSummary(); }
});

// ── Checkout ──────────────────────────────────────────────────────────────────
function proceedToCheckout() {
  if (cart.length === 0) return;
  updateSummary();
  showView("checkout");
}

function selectPayment(el, method) {
  selectedPayment = method;
  document.querySelectorAll(".payment-opt").forEach(o => o.classList.remove("selected"));
  el.classList.add("selected");
}

async function placeOrder() {
  const val = id => (document.getElementById(id)?.value || "").trim();
  const senderName = val("senderName"), phone = val("phone"),
        recipientName = val("recipientName"), address = val("address"),
        deliveryDate = val("deliveryDate");

  if (!senderName || !phone || !recipientName || !address || !deliveryDate) {
    showToast("⚠️ Please fill in all required fields", true); return;
  }

  const btn = document.getElementById("placeOrderBtn");
  btn.disabled = true; btn.textContent = "Placing Order…";

  const subtotal = cart.reduce((a, b) => a + Number(b.price) * b.qty, 0);
  const wrapFee  = giftWrap ? CONFIG.GIFT_WRAP : 0;
  const total    = subtotal + CONFIG.DELIVERY_FEE + wrapFee;
  const orderRef = "DT-" + Date.now();

  const payload = {
    orderRef, dateTime: new Date().toLocaleString(),
    senderName, phone, email: val("email"),
    recipientName, address, deliveryDate,
    occasion: val("occasion"), giftMessage: val("giftMessage"),
    items: cart.map(c =>
      `${c.name}${c.sizeLabel ? ` [${c.sizeLabel}]` : ""}${c.chosenColor ? ` (${c.chosenColor})` : ""} x${c.qty} @ PKR ${c.price}`
    ).join(", "),
    subtotal, giftWrap: wrapFee, deliveryFee: CONFIG.DELIVERY_FEE,
    total, paymentMethod: selectedPayment,
  };

  try {
    await fetch(CONFIG.SHEET_URL, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    document.getElementById("successRef").textContent = orderRef;
    cart = []; giftWrap = false;
    updateCartBadge();
    showView("success");
  } catch (err) {
    showToast("⚠️ Something went wrong. Please try again.", true);
    btn.disabled = false; btn.textContent = "✦ Confirm & Place Order";
  }
}

// ── View Switching ────────────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${name}`)?.classList.add("active");
  document.querySelectorAll(".nav-btn:not(.cart-btn)").forEach(b => {
    b.classList.toggle("active", b.textContent.trim().toLowerCase().startsWith(name));
  });
  if (name === "cart") renderCart();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetAll() {
  cart = []; giftWrap = false;
  document.getElementById("giftWrapCheck").checked = false;
  selectedPayment = "Cash on Delivery";
  document.querySelectorAll(".payment-opt").forEach((o, i) => o.classList.toggle("selected", i === 0));
  ["senderName","phone","email","recipientName","address","deliveryDate","occasion","giftMessage"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  updateCartBadge(); renderCart(); showView("shop");
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.style.borderLeftColor = isError ? "#c0392b" : "var(--gold-light)";
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
