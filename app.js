/**
 * Don Trove — Curated Gifts
 * app.js — Main application logic
 *
 * Depends on: Google Apps Script web app (SHEET_URL)
 * Sheet columns: Name | Price | Description | Image URL | Active (YES/NO)
 */

'use strict';

// ══════════════════════════════════════════
//  CONFIG — update SHEET_URL with your own
//  Google Apps Script deployment URL
// ══════════════════════════════════════════
const CONFIG = {
  SHEET_URL:    'https://script.google.com/macros/s/AKfycbz9T5BOg4uZiehgMfwvxCrAi4r1ErRmIufnD1o5TW1kf4pDhpzKjDunjbfiCJAbr7buQQ/exec',
  DELIVERY_FEE: 200,
  GIFT_WRAP_FEE: 300,
};

// ── State ──
let products = [];
let cart = [];
let selectedPayment = 'Cash on Delivery';

// ══════════════════════════════════════════
//  VIEW NAVIGATION
// ══════════════════════════════════════════
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn:not(.cart-btn)').forEach(b => b.classList.remove('active'));

  document.getElementById('view-' + name).classList.add('active');

  const tab = document.querySelector(`.tab[data-view="${name}"]`);
  if (tab) tab.classList.add('active');

  if (name === 'cart')     renderCart();
  if (name === 'checkout') renderCheckoutSummary();
  if (name === 'manage')   renderManage();
}

// ══════════════════════════════════════════
//  PRODUCT LOADING
// ══════════════════════════════════════════
async function loadProducts() {
  try {
    const res = await fetch(CONFIG.SHEET_URL);
    products = await res.json();
    renderProducts();
  } catch (err) {
    console.error('Failed to load products:', err);
    document.getElementById('productsGrid').innerHTML =
      `<div class="loading-wrap"><p>⚠️ Could not load products. Please refresh.</p></div>`;
  }
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');

  if (!products.length) {
    grid.innerHTML = `<div class="loading-wrap"><p>No products available yet.</p></div>`;
    return;
  }

  grid.innerHTML = products.map((p, i) => `
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
          <button class="add-btn" onclick="addToCart(${i})">+ Add</button>
        </div>
      </div>
    </div>
  `).join('');
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
  if (cart[idx].qty < 1) {
    removeFromCart(idx);
    return;
  }
  updateBadge();
  renderCart();
}

function updateBadge() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  const badge = document.getElementById('cartBadge');
  badge.textContent = total;
  badge.classList.toggle('show', total > 0);
  document.getElementById('proceedBtn').disabled = total === 0;
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
          <button class="qty-btn" onclick="changeQty(${i}, -1)" aria-label="Decrease quantity">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${i}, 1)" aria-label="Increase quantity">+</button>
          <span style="margin-left:6px;font-weight:600;font-size:.9rem;color:var(--royal)">
            PKR ${(item.price * item.qty).toLocaleString()}
          </span>
        </div>
      </div>
      <button class="remove-btn" onclick="removeFromCart(${i})" title="Remove item" aria-label="Remove ${escapeHtml(item.name)}">🗑</button>
    </div>
  `).join('');

  updateSummary();
}

function proceedToCheckout() {
  if (!cart.length) return;

  document.getElementById('checkoutTab').style.display = 'block';
  showView('checkout');

  // Set minimum delivery date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('deliveryDate').min = today;
}

function renderCheckoutSummary() {
  const list = document.getElementById('checkoutItemsList');

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
  const fields = {
    senderName:    document.getElementById('senderName').value.trim(),
    phone:         document.getElementById('phone').value.trim(),
    email:         document.getElementById('email').value.trim(),
    recipientName: document.getElementById('recipientName').value.trim(),
    address:       document.getElementById('address').value.trim(),
    deliveryDate:  document.getElementById('deliveryDate').value,
    occasion:      document.getElementById('occasion').value,
    giftMessage:   document.getElementById('giftMessage').value.trim(),
  };

  // Validation
  if (!fields.senderName || !fields.phone || !fields.recipientName || !fields.address) {
    showToast('⚠️ Please fill in all required fields');
    return;
  }

  const btn = document.getElementById('placeOrderBtn');
  btn.disabled    = true;
  btn.textContent = 'Placing order…';

  const sub      = getSubtotal();
  const wrap     = giftWrapCost();
  const total    = sub + wrap + CONFIG.DELIVERY_FEE;
  const orderRef = 'DT-' + Date.now().toString().slice(-6);
  const dateTime = new Date().toLocaleString('en-PK');
  const itemsSummary = cart.map(c => `${c.name} x${c.qty}`).join(', ');

  const payload = {
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
    // Apps Script POST — response may be blocked by CORS; order still goes through
    await fetch(CONFIG.SHEET_URL, {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
  } catch (err) {
    // Silent catch: CORS on Apps Script no-cors requests is expected
    console.warn('POST response not readable (CORS). Order should still be recorded.', err);
  }

  document.getElementById('successRef').textContent = orderRef;
  document.getElementById('checkoutTab').style.display = 'none';
  showView('success');
}

// ══════════════════════════════════════════
//  RESET
// ══════════════════════════════════════════
function resetAll() {
  cart = [];
  updateBadge();

  const wrap = document.getElementById('giftWrapCheck');
  if (wrap) wrap.checked = false;

  const textFields = ['senderName', 'phone', 'email', 'recipientName', 'address', 'deliveryDate', 'giftMessage'];
  textFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const occasion = document.getElementById('occasion');
  if (occasion) occasion.value = '';

  document.querySelectorAll('.payment-opt').forEach((o, i) => {
    o.classList.toggle('selected', i === 0);
  });
  selectedPayment = 'Cash on Delivery';

  // Reset place order button
  const btn = document.getElementById('placeOrderBtn');
  if (btn) {
    btn.disabled    = false;
    btn.textContent = '✦ Confirm & Place Order';
  }

  showView('shop');
}

// ══════════════════════════════════════════
//  MANAGE / ADMIN VIEW
// ══════════════════════════════════════════
function renderManage() {
  const list = document.getElementById('manageList');

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
        <div class="manage-prod-price">PKR ${Number(p.price).toLocaleString()}</div>
      </div>
      <span class="manage-badge badge-active">Active</span>
    </div>
  `).join('');
}

// ══════════════════════════════════════════
//  TOAST NOTIFICATIONS
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ══════════════════════════════════════════
//  SECRET ADMIN ACCESS
//  Navigate to: index.html#manage-dt-admin
// ══════════════════════════════════════════
if (location.hash === '#manage-dt-admin') {
  window.addEventListener('load', () => showView('manage'));
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
loadProducts();
