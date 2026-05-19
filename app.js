/**
 * Le Trésor de Misfah — Main App
 * Handles: Products display, search, categories, cart, orders → Google Sheets
 */

// ─── STATE ────────────────────────────────────────────────────────
let allProducts    = [];
let filteredProducts = [];
let activeCategory = 'all';
let searchQuery    = '';
let cart           = JSON.parse(localStorage.getItem('ltm_cart') || '[]');
let currentProduct = null;

// ─── DOM REFS ─────────────────────────────────────────────────────
const grid          = document.getElementById('products-grid');
const searchInput   = document.getElementById('search-input');
const searchBtn     = document.getElementById('search-btn');
const searchBar     = document.getElementById('search-results-bar');
const searchText    = document.getElementById('search-results-text');
const clearSearch   = document.getElementById('clear-search');
const noResults     = document.getElementById('no-results');
const sectionTitle  = document.getElementById('section-title');
const sectionSub    = document.getElementById('section-subtitle');
const categoryList  = document.getElementById('category-list');

const hamburgerBtn  = document.getElementById('hamburger-btn');
const drawer        = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const drawerClose   = document.getElementById('drawer-close');

const modalOverlay  = document.getElementById('modal-overlay');
const modalClose    = document.getElementById('modal-close');
const orderForm     = document.getElementById('order-form');
const modalProductInfo = document.getElementById('modal-product-info');
const orderSuccess  = document.getElementById('order-success');
const submitBtn     = document.getElementById('submit-order-btn');
const submitLabel   = document.getElementById('submit-label');

const cartBtn       = document.getElementById('cart-btn');
const cartPanel     = document.getElementById('cart-panel');
const cartClose     = document.getElementById('cart-close');
const cartCount     = document.getElementById('cart-count');
const cartItems     = document.getElementById('cart-items');
const cartEmpty     = document.getElementById('cart-empty');
const cartFooter    = document.getElementById('cart-footer');
const cartTotalEl   = document.getElementById('cart-total-price');
const cartCheckout  = document.getElementById('cart-checkout');

const successClose  = document.getElementById('success-close');

// ─── SPARKLES ────────────────────────────────────────────────────
function createSparkles() {
  const bg = document.getElementById('sparkle-bg');
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.style.cssText = `
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      --dur:${2 + Math.random()*4}s;
      --delay:${Math.random()*5}s;
      width:${2 + Math.random()*3}px;
      height:${2 + Math.random()*3}px;
    `;
    bg.appendChild(s);
  }
}

// ─── FETCH PRODUCTS ───────────────────────────────────────────────
async function loadProducts() {
  if (CONFIG.DEMO_MODE) {
    allProducts = DEMO_PRODUCTS;
    buildCategories();
    renderProducts(allProducts);
    return;
  }
  try {
    const res  = await fetch(CONFIG.PRODUCTS_CSV_URL);
    const text = await res.text();
    allProducts = parseCSV(text);
    buildCategories();
    renderProducts(allProducts);
  } catch (e) {
    console.warn('Google Sheets fetch failed, using demo data.', e);
    allProducts = DEMO_PRODUCTS;
    buildCategories();
    renderProducts(allProducts);
  }
}

// ─── CSV PARSER ───────────────────────────────────────────────────
function parseCSV(text) {
  const rows = text.trim().split('\n').slice(1); // skip header
  return rows.map((row, i) => {
    const cols = row.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    return {
      id:          cols[0] || String(i + 1),
      name:        cols[1] || 'Product',
      category:    cols[2] || 'General',
      price:       cols[3] || '0.00',
      currency:    cols[4] || CONFIG.DEFAULT_CURRENCY,
      description: cols[5] || '',
      image:       cols[6] || '',
      badge:       cols[7] || '',
      stock:       cols[8] || 'In Stock',
    };
  }).filter(p => p.name);
}

// ─── CATEGORIES ───────────────────────────────────────────────────
function buildCategories() {
  const cats = ['all', ...new Set(allProducts.map(p => p.category))];
  categoryList.innerHTML = cats.map(cat => `
    <li>
      <a href="#" data-category="${cat}" class="${cat === activeCategory ? 'active' : ''}">
        ${cat === 'all' ? '✦ All Products' : '◆ ' + cat}
      </a>
    </li>
  `).join('');
  categoryList.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      setCategory(a.dataset.category);
      closeDrawer();
    });
  });
}

function setCategory(cat) {
  activeCategory = cat;
  buildCategories();
  applyFilters();
  sectionTitle.textContent = cat === 'all' ? 'Our Collection' : cat;
  sectionSub.textContent   = cat === 'all' ? 'Handpicked for you' : `Explore our ${cat} range`;
}

// ─── SEARCH ───────────────────────────────────────────────────────
function doSearch() {
  searchQuery = searchInput.value.trim().toLowerCase();
  applyFilters();
  if (searchQuery) {
    searchBar.style.display = 'flex';
    searchText.textContent  = `${filteredProducts.length} result${filteredProducts.length !== 1 ? 's' : ''} for "${searchInput.value.trim()}"`;
  } else {
    searchBar.style.display = 'none';
  }
}

function clearSearchFn() {
  searchInput.value = '';
  searchQuery = '';
  searchBar.style.display = 'none';
  applyFilters();
}

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
clearSearch.addEventListener('click', clearSearchFn);

// debounce live search
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(doSearch, 300);
});

// ─── FILTER & RENDER ─────────────────────────────────────────────
function applyFilters() {
  filteredProducts = allProducts.filter(p => {
    const inCat    = activeCategory === 'all' || p.category === activeCategory;
    const inSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery) ||
      p.category.toLowerCase().includes(searchQuery);
    return inCat && inSearch;
  });
  renderProducts(filteredProducts);
}

function renderProducts(products) {
  if (!products.length) {
    grid.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }
  noResults.style.display = 'none';
  grid.innerHTML = products.map((p, i) => `
    <article class="product-card" data-id="${p.id}" style="animation-delay:${i * 0.07}s">
      <div class="product-img-wrap">
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}" loading="lazy" />`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--pink-blush);font-size:3rem;">✦</div>`
        }
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
      </div>
      <div class="product-info">
        <p class="product-category">${p.category}</p>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <div class="product-footer">
          <span class="product-price">${p.currency || CONFIG.DEFAULT_CURRENCY} ${parseFloat(p.price).toFixed(2)}</span>
          <button class="add-to-cart-btn" data-id="${p.id}">+ Add to Cart</button>
        </div>
      </div>
    </article>
  `).join('');

  // Card click → order modal
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('add-to-cart-btn')) return;
      const p = allProducts.find(x => x.id === card.dataset.id);
      if (p) openOrderModal(p);
    });
  });

  // Add to cart buttons
  grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const p = allProducts.find(x => x.id === btn.dataset.id);
      if (p) addToCart(p);
    });
  });
}

// ─── ORDER MODAL ─────────────────────────────────────────────────
function openOrderModal(product) {
  currentProduct = product;
  orderForm.style.display = 'block';
  orderSuccess.style.display = 'none';
  orderForm.reset();
  document.getElementById('order-qty').value = 1;
  modalProductInfo.innerHTML = `
    ${product.image ? `<img src="${product.image}" alt="${product.name}" />` : ''}
    <div class="info-text">
      <div class="name">${product.name}</div>
      <div class="price">${product.currency || CONFIG.DEFAULT_CURRENCY} ${parseFloat(product.price).toFixed(2)}</div>
    </div>
  `;
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeOrderModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  currentProduct = null;
}

modalClose.addEventListener('click', closeOrderModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeOrderModal(); });
successClose.addEventListener('click', () => { closeOrderModal(); });

// ─── SUBMIT ORDER → GOOGLE SHEETS ────────────────────────────────
orderForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name    = document.getElementById('order-name').value.trim();
  const phone   = document.getElementById('order-phone').value.trim();
  const address = document.getElementById('order-address').value.trim();
  if (!name || !phone || !address) { showToast('Please fill in all required fields.'); return; }

  submitBtn.disabled = true;
  submitLabel.textContent = '⏳ Placing Order…';

  const orderData = {
    timestamp:   new Date().toISOString(),
    productId:   currentProduct.id,
    productName: currentProduct.name,
    category:    currentProduct.category,
    price:       currentProduct.price,
    currency:    currentProduct.currency || CONFIG.DEFAULT_CURRENCY,
    quantity:    document.getElementById('order-qty').value,
    name,
    phone,
    email:       document.getElementById('order-email').value.trim(),
    address,
    notes:       document.getElementById('order-notes').value.trim(),
  };

  try {
    if (!CONFIG.DEMO_MODE) {
      await fetch(CONFIG.ORDERS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
    } else {
      // Demo: just simulate a delay
      await new Promise(r => setTimeout(r, 800));
      console.log('📦 Demo order (not sent to Sheets):', orderData);
    }
    orderForm.style.display = 'none';
    orderSuccess.style.display = 'block';
  } catch (err) {
    console.error(err);
    showToast('Order failed. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitLabel.textContent = '✦ Confirm Order';
  }
});

// ─── CART ────────────────────────────────────────────────────────
function addToCart(product) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  saveCart();
  updateCartUI();
  showToast(`✦ ${product.name} added to cart!`);
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('ltm_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const total = cart.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  cartCount.textContent = count;
  cartCount.classList.toggle('visible', count > 0);

  if (!cart.length) {
    cartItems.innerHTML = '';
    cartEmpty.style.display = 'flex';
    cartFooter.style.display = 'none';
    return;
  }
  cartEmpty.style.display = 'none';
  cartFooter.style.display = 'block';
  cartTotalEl.textContent = `${CONFIG.DEFAULT_CURRENCY} ${total.toFixed(2)}`;

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      ${item.image ? `<img src="${item.image}" alt="${item.name}" />` : ''}
      <div class="cart-item-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-price">${item.currency || CONFIG.DEFAULT_CURRENCY} ${(parseFloat(item.price) * item.qty).toFixed(2)} (×${item.qty})</div>
      </div>
      <button class="cart-item-remove" data-id="${item.id}">✕</button>
    </div>
  `).join('');

  cartItems.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
  });
}

cartBtn.addEventListener('click', () => {
  cartPanel.classList.add('open');
  drawerOverlay.classList.add('visible');
});
cartClose.addEventListener('click', () => {
  cartPanel.classList.remove('open');
  drawerOverlay.classList.remove('visible');
});

// Cart checkout → open order modal with cart summary
cartCheckout.addEventListener('click', () => {
  cartPanel.classList.remove('open');
  // Create a "cart order" pseudo-product
  const cartSummary = {
    id: 'CART',
    name: `Cart (${cart.reduce((s,i) => s+i.qty,0)} items)`,
    category: 'Multiple',
    price: cart.reduce((s,i) => s + parseFloat(i.price)*i.qty, 0).toFixed(2),
    currency: CONFIG.DEFAULT_CURRENCY,
    description: cart.map(i => `${i.name} ×${i.qty}`).join(', '),
    image: cart[0]?.image || '',
  };
  openOrderModal(cartSummary);
});

// ─── DRAWER ──────────────────────────────────────────────────────
function openDrawer() {
  drawer.classList.add('open');
  hamburgerBtn.classList.add('open');
  drawerOverlay.classList.add('visible');
}
function closeDrawer() {
  drawer.classList.remove('open');
  hamburgerBtn.classList.remove('open');
  if (!cartPanel.classList.contains('open')) {
    drawerOverlay.classList.remove('visible');
  }
}
hamburgerBtn.addEventListener('click', openDrawer);
drawerClose.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', () => {
  closeDrawer();
  cartPanel.classList.remove('open');
  drawerOverlay.classList.remove('visible');
});

// ─── TOAST ───────────────────────────────────────────────────────
let toastEl = null;
function showToast(msg) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

// ─── INIT ─────────────────────────────────────────────────────────
createSparkles();
updateCartUI();
loadProducts();
