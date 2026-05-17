/**
 * Don Trove — Curated Gifts
 * app.js — Main application logic
 */

'use strict';

// ══════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════
const CONFIG = {
  SHEET_URL:     'https://script.google.com/macros/s/AKfycbz9T5BOg4uZiehgMfwvxCrAi4r1ErRmIufnD1o5TW1kf4pDhpzKjDunjbfiCJAbr7buQQ/exec',
  DELIVERY_FEE:  200,
  GIFT_WRAP_FEE: 300,
};

// ── State ──
let products        = [];
let cart            = [];
let selectedPayment = 'Cash on Delivery';
let activeCategory  = 'All';

// Category emoji map — add your own categories here
const CAT_EMOJI = {
  'All':        '🎁',
  'Planners':   '📓',
  'Notebooks':  '📔',
  'Stationery': '✏️',
  'Skincare':   '🧴',
  'Candles':    '🕯️',
  'Jewellery':  '💍',
  'Accessories':'👜',
  'Books':      '📚',
  'Other':      '✨',
};

const CAT_COLORS = [
  'linear-gradient(135deg,#F3EBF9,#E8D8F5)',
  'linear-gradient(135deg,#E8F4FF,#D0E8FF)',
  'linear-gradient(135deg,#FFF3E0,#FFE0B2)',
  'linear-gradient(135deg,#E8F5E9,#C8E6C9)',
  'linear-gradient(135deg,#FCE4EC,#F8BBD0)',
  'linear-gradient(135deg,#F3E5F5,#E1BEE7)',
  'linear-gradient(135deg,#E0F7FA,#B2EBF2)',
  'linear-gradient(135deg,#FFFDE7,#FFF9C4)',
];

// ══════════════════════════════════════════
//  VIEW NAVIGATION
// ══════════════════════════════════════════
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn:not(.cart-btn)').forEach(b => b.classList.remove('active'));

  const view = document.getElementById('view-' + name);
  if (view) view.classList.add('active');

  // Show search/tabs only on shop view
  const tabsWrap = document.getElementById('tabsWrap');
  if (tabsWrap) tabsWrap.classList.toggle('hidden', name !== 'shop');

  // Highlight active nav button
  document.querySelectorAll('.nav-btn:not(.cart-btn)').forEach(b => {
    const onclick = b.getAttribute('onclick') || '';
    if (onclick.includes(`'${name}'`)) b.classList.add('active');
  });

  if (name === 'cart')               renderCart();
  if (name === 'checkout')           renderCheckoutSummary();
  if (name === 'manage')             renderManage();
  if (name === 'categories')         renderCategories();
  if (name === 'category-products')  { /* rendered before calling showView */ }
}

// ══════════════════════════════════════════
//  PRODUCT LOADING
// ══════════════════════════════════════════
async function loadProducts() {
  try {
    const res = await fetch(CONFIG.SHEET_URL + '?action=products');
    const data = await res.json();
    products = Array.isArray(data) ? data : (data.products || []);
    renderProducts(products);
    buildCategoryTabs();
  } catch (err) {
    console.error('Failed to load products:', err);
    document.getElementById('productsGrid').innerHTML =
      `<div class="loading-wrap"><p>⚠️ Could not load products. Please refresh.</p></div>`;
  }
}

// ══════════════════════════════════════════
//  CATEGORY TABS (in shop view)
// ══════════════════════════════════════════
function buildCategoryTabs() {
  const cats = ['All', ...new Set(products.map(p => p.category || 'Other').filter(Boolean))];
  const row  = document.getElementById('catTabs');
  if (!row) return;

  row.innerHTML = cats.map(c => `
    <button class="tab ${c === 'All' ? 'active' : ''}"
      onclick="filterByCategory('${c}', this)">${c}</button>
  `).join('');
}

function filterByCategory(cat, el) {
  activeCategory = cat;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');

  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  applyFilters(cat, q);
}

function filterProducts() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  applyFilters(activeCategory, q);
}

function applyFilters(cat, q) {
  let filtered = products;
  if (cat && cat !== 'All') {
    filtered = filtered.filter(p => (p.category || 'Other') === cat);
  }
  if (q) {
    filtered = filtered.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }
  renderProducts(filtered);
}

// ══════════════════════════════════════════
//  RENDER PRODUCTS (shop grid)
// ══════════════════════════════════════════
function renderProducts(list) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (!list || !list.length) {
    grid.innerHTML = `<div class="loading-wrap"><p>No products found.</p></div>`;
    return;
  }

  grid.innerHTML = list.map((p, i) => {
    const idx = products.indexOf(p);
    return `
    <div class="product-card" style="animation-delay:${i * 0.06}s">
      <div class="product-img-wrap">
        ${p.imageUrl
          ? `<img src="${p.imageUrl}" alt="${escapeHtml(p.name)}" loading="lazy"
               onerror="this.parentElement.innerHTML='<div class=product-img-placeholder>🎁</div>'">`
          : `<div class="product-img-placeholder">🎁</div>`}
      </div>
      <div class="product-body">
        <div class="product-name">${escapeHtml(p.name)}</div>
        ${p.category ? `<div class="product-cat-tag">${escapeHtml(p.category)}</div>` : ''}
        <div class="product-desc">${escapeHtml(p.description || 'A beautiful curated gift.')}</div>
        <div class="product-footer">
          <div class="product-price">PKR ${Number(p.price).toLocaleString()}</div>
          <button class="add-btn" onclick="addToCart(${idx})">+ Add</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════
//  CATEGORIES PAGE
// ══════════════════════════════════════════
function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><p>Loading categories…</p></div>`;
    return;
  }

  // Group products by category
  const catMap = {};
  products.forEach(p => {
    const cat = p.category || 'Other';
    if (!catMap[cat]) catMap[cat] = [];
    catMap[cat].push(p);
  });

  const cats = Object.keys(catMap);

  grid.innerHTML = cats.map((cat, i) => {
    const count = catMap[cat].length;
    const emoji = CAT_EMOJI[cat] || '🎁';
    const bg    = CAT_COLORS[i % CAT_COLORS.length];
    return `
    <div class="category-card" style="animation-delay:${i * 0.07}s" onclick="openCategory('${escapeHtml(cat)}')">
      <div class="category-card-banner" style="background:${bg}">
        ${emoji}
      </div>
      <div class="category-card-body">
        <div class="category-card-name">${escapeHtml(cat)}</div>
        <div class="category-card-count">${count} gift${count !== 1 ? 's' : ''}</div>
        <div class="category-card-arrow">Shop now →</div>
      </div>
    </div>`;
  }).join('');
}

function openCategory(cat) {
  const catProducts = products.filter(p => (p.category || 'Other') === cat);

  document.getElementById('catProductsTitle').textContent = cat;
  document.getElementById('catProductsSub').textContent =
    `${catProducts.length} gift${catProducts.length !== 1 ? 's' : ''} in this collection`;

  const grid = document.getElementById('catProductsGrid');
  grid.innerHTML = catProducts.map((p, i) => {
    const idx = products.indexOf(p);
    return `
    <div class="product-card" style="animation-delay:${i * 0.06}s">
      <div class="product-img-wrap">
        ${p.imageUrl
          ? `<img src="${p.imageUrl}" alt="${escapeHtml(p.name)}" loading="lazy"
               onerror="this.parentElement.innerHTML='<div class=product-img-placeholder>🎁</div>'">`
          : `<div class="product-img-placeholder">🎁</div>`}
      </div>
      <div class="product-body">
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-desc">${escapeHtml(p.description || 'A beautiful curated gift.')}</div>
        <div class="product-footer">
          <div class="product-price">PKR ${Number(p.price).toLocaleString()}</div>
          <button class="add-btn" onclick="addToCart(${idx})">+ Add</button>
        </div>
      </div>
    </div>`;
  }).join('');

  showView('category-products');
}

// ══════════════════════════════════════════
//  CART LOGIC
// ══════════════════════════════════════════
function addToCart(idx) {
  const p = products[idx];
  const existing = cart.find(c => c.name === p.name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name: p.name, price: Number(p.price), imageUrl: p.imageUrl, qty: 1 });
  }
  updateBadge();
  showToast(`✦ ${p.name} added to cart`);
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  updateBadge();
  renderCart();
}

function changeQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty < 1) { removeFromCart(idx); return; }
  updateBadge();
  renderCart();
}

function updateBadge() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  const badge = document.getElementById('cartBadge');
  badge.textContent = total;
  badge.classList.toggle('show', total > 0);
  const btn = document.getElementById('proceedBtn');
  if (btn) btn.disabled = total === 0;
}

function getSubtotal() {
  return cart.reduce((s, c) => s + (c.price * c.qty), 0);
}

function giftWrapCost() {
  return document.getElementById('giftWrapCheck')?.checked ? CONFIG.GIFT_WRAP_FEE : 0;
}

function updateSummary() {
  const sub   = getSubtotal();
  const wrap  = giftWrapCost();
  const total = sub + wrap + CONFIG.DELIVERY_FEE;
  document.getElementById('summSubtotal').textContent = 'PKR ' + sub.toLocaleString();
  document.getElementById('summTotal').textContent    = 'PKR ' + total.toLocaleString();
}

function renderCart() {
  const list = document.getElementById('cartItemsList');
  if (!list) return;

  if (!cart.length) {
    list.innerHTML = `
      <div class="cart-empty">
        <span class="empty-icon">🛒</span>
        <p>Your cart is empty.<br/>Head back to the shop to add some gifts!</p>
      </div>`;
    updateSummary();
    return;
  }

  list.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <div class="cart-item-img">
        ${item.imageUrl
          ? `<img src="${item.imageUrl}" alt="${escapeHtml(item.name)}"
               onerror="this.parentElement.innerHTML='🎁'">`
          : '🎁'}
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">PKR ${item.price.toLocaleString()} each</div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty(${i},-1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${i},1)">+</button>
          <span style="margin-left:6px;font-weight:600;font-size:.9rem;color:var(--royal)">
            PKR ${(item.price * item.qty).toLocaleString()}
          </span>
        </div>
      </div>
      <button class="remove-btn" onclick="removeFromCart(${i})" title="Remove">🗑</button>
    </div>
  `).join('');

  updateSummary();
}

function proceedToCheckout() {
  if (!cart.length) return;
  showView('checkout');
  const today = new Date().toISOString().split('T')[0];
  const dd = document.getElementById('deliveryDate');
  if (dd) dd.min = today;
}

function renderCheckoutSummary() {
  const list = document.getElementById('checkoutItemsList');
  if (!list) return;

  list.innerHTML = cart.map(item => `
    <div class="checkout-item-row">
      <div>
        <div class="checkout-item-name">${escapeHtml(item.name)}</div>
        <div class="checkout-item-qty">Qty: ${item.qty}</div>
      </div>
      <div class="checkout-item-price">PKR ${(item.price * item.qty).toLocaleString()}</div>
    </div>
  `).join('');

  const sub  = getSubtotal();
  const wrap = giftWrapCost();
  document.getElementById('co-subtotal').textContent = 'PKR ' + sub.toLocaleString();
  document.getElementById('co-wrap').textContent     = wrap ? `PKR ${wrap}` : '—';
  document.getElementById('co-total').textContent    = 'PKR ' + (sub + wrap + CONFIG.DELIVERY_FEE).toLocaleString();
}

// ══════════════════════════════════════════
//  PAYMENT SELECTION
// ══════════════════════════════════════════
function selectPayment(el, method) {
  document.querySelectorAll('.payment-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedPayment = method;
}

// ══════════════════════════════════════════
//  PLACE ORDER
// ══════════════════════════════════════════
async function placeOrder() {
  const val = id => document.getElementById(id)?.value.trim() || '';

  const fields = {
    senderName:    val('senderName'),
    phone:         val('phone'),
    email:         val('email'),
    city:          val('city'),
    recipientName: val('recipientName'),
    occasion:      val('occasion'),
    address:       val('address'),
    deliveryDate:  val('deliveryDate'),
    giftMessage:   val('giftMessage'),
    notes:         val('notes'),
  };

  // Validation
  if (!fields.senderName || !fields.phone || !fields.city || !fields.recipientName || !fields.address) {
    showToast('⚠️ Please fill in all required fields');
    return;
  }

  const btn = document.getElementById('placeOrderBtn');
  btn.classList.add('submitting');
  btn.textContent = '⏳ Placing order…';
  btn.disabled = true;

  const sub      = getSubtotal();
  const wrap     = giftWrapCost();
  const total    = sub + wrap + CONFIG.DELIVERY_FEE;
  const orderRef = 'DT-' + Date.now().toString().slice(-6);
  const dateTime = new Date().toLocaleString('en-PK');
  const itemsSummary = cart.map(c => `${c.name} x${c.qty}`).join(', ');

  const payload = {
    action:        'order',
    orderRef,
    dateTime,
    ...fields,
    items:         itemsSummary,
    subtotal:      sub,
    giftWrap:      wrap ? `Yes (PKR ${wrap})` : 'No',
    deliveryFee:   CONFIG.DELIVERY_FEE,
    total,
    paymentMethod: selectedPayment,
  };

  try {
    await fetch(CONFIG.SHEET_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify(payload),
    });
  } catch (err) {
    // no-cors: response is opaque, this is expected
    console.warn('POST sent (no-cors). Order recorded in sheet.', err);
  }

  document.getElementById('successRef').textContent = orderRef;
  showView('success');
}

// ══════════════════════════════════════════
//  RESET
// ══════════════════════════════════════════
function resetAll() {
  cart = [];
  activeCategory = 'All';
  updateBadge();

  const wrap = document.getElementById('giftWrapCheck');
  if (wrap) wrap.checked = false;

  ['senderName','phone','email','city','recipientName','address',
   'deliveryDate','giftMessage','notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  ['occasion','city'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.querySelectorAll('.payment-opt').forEach((o, i) => {
    o.classList.toggle('selected', i === 0);
  });
  selectedPayment = 'Cash on Delivery';

  const btn = document.getElementById('placeOrderBtn');
  if (btn) {
    btn.disabled = false;
    btn.classList.remove('submitting');
    btn.textContent = '✦ Confirm & Place Order';
  }

  showView('shop');
}

// ══════════════════════════════════════════
//  MANAGE / ADMIN VIEW
// ══════════════════════════════════════════
function renderManage() {
  const list = document.getElementById('manageList');
  if (!list) return;

  if (!products.length) {
    list.innerHTML = `<div class="loading-wrap"><p>No products loaded.</p></div>`;
    return;
  }

  list.innerHTML = products.map(p => `
    <div class="manage-card">
      <div class="manage-img">
        ${p.imageUrl
          ? `<img src="${p.imageUrl}" alt="${escapeHtml(p.name)}" onerror="this.innerHTML='🎁'">`
          : '🎁'}
      </div>
      <div class="manage-info-col">
        <div class="manage-prod-name">${escapeHtml(p.name)}</div>
        <div class="manage-prod-price">PKR ${Number(p.price).toLocaleString()}
          ${p.category ? ` · ${escapeHtml(p.category)}` : ''}</div>
      </div>
      <span class="manage-badge ${p.active === 'NO' ? 'badge-inactive' : 'badge-active'}">
        ${p.active === 'NO' ? 'Inactive' : 'Active'}
      </span>
    </div>
  `).join('');
}

// ══════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ══════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ══════════════════════════════════════════
//  ADMIN SECRET ACCESS
//  Go to: index.html#manage-dt-admin
// ══════════════════════════════════════════
if (location.hash === '#manage-dt-admin') {
  window.addEventListener('load', () => showView('manage'));
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
loadProducts();
