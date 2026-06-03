/**
 * script.js
 * TobbIe Gadget — Stage 4: Full interactive prototype
 *
 * Features:
 * - Dynamically seeds 100+ products (follows img/nameofgadget.jpeg convention)
 * - Search (debounced), filter (brand, condition, price), sort, and paginated rendering (load more)
 * - Quick-view modal (accessible)
 * - Mobile-friendly slide-up cart persisted in localStorage
 * - Brand sliders (prev/next), testimonials carousel
 * - Sticky CTA + Floating FAB integration (prefilled WhatsApp messages)
 * - Accessibility: ARIA updates, keyboard handling, focus management
 *
 * HOW TO USE:
 * - Save this file as script.js and ensure index.html references it with <script src="script.js" defer></script>
 * - Ensure style.css is loaded (we provided it in Stage 3)
 * - Put product images in the `img/` folder named like: `17promax.jpeg`, `asus.jpeg`, `pixel8.jpeg`, etc.
 * - If any image is missing, the script falls back to `img/placeholder.jpeg`.
 *
 * Author: Senior full-stack & UX (prototype)
 * Date: 2025
 */

/* eslint-disable no-console */
(() => {
  'use strict';

  /* ---------------------------
     CONFIGURATION & CONSTANTS
     --------------------------- */
  const STORE_NAME = 'TobbIe Gadget'; // as confirmed
  const WA_NUMBER = '+2347034774672'; // confirmed WhatsApp number (international format)
  const LOCALSTORAGE_CART_KEY = 'tobbie_cart_v1'; // cart storage key
  const PRODUCTS_TO_SEED = 110; // seed ~110 products (100+ requirement)
  const PAGE_SIZE = 12; // items per "load more" page
  const IMAGE_PLACEHOLDER = 'img/placeholder.jpeg'; // fallback image

  /* ---------------------------
     Utility helpers
     --------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function formatCurrencyNGN(value) {
    try {
      // Use Intl if available for nicer formatting
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
    } catch (e) {
      return `₦${Number(value).toLocaleString()}`;
    }
  }

  function uid(prefix = '') {
    return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
  }

  /* ---------------------------
     Product generation (seed)
     --------------------------- */
  // Brands and templates — we will combine names to generate many entries
  const BRANDS = [
    { key: 'iPhone', labels: ['iPhone 17 Pro Max', 'iPhone 17', 'iPhone 16 Pro', 'iPhone 16', 'iPhone X'] },
    { key: 'Samsung', labels: ['Galaxy S23', 'Galaxy S22', 'Galaxy S21', 'Galaxy Z Fold4', 'Galaxy A54'] },
    { key: 'Pixel', labels: ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7a', 'Pixel 7'] },
    { key: 'ASUS', labels: ['ROG Phone 8', 'Zenfone 10'] },
    { key: 'Huawei', labels: ['P60 Pro', 'Mate 50'] },
    { key: 'Redmi', labels: ['Note 12', 'Note 11'] },
    { key: 'Vivo', labels: ['X100 Pro', 'V30'] },
    { key: 'Nokia', labels: ['G42', 'XR20'] },
    { key: 'Honor', labels: ['Magic V2', 'Honor 90'] },
    { key: 'Rog', labels: ['ROG Phone 7'] }, // alternate naming
    { key: 'Google', labels: ['Pixel Tablet'] },
    { key: 'Xbox', labels: ['Xbox Series X', 'Xbox Series S'] },
    { key: 'Nintendo', labels: ['Nintendo Switch'] },
    { key: 'PlayStation', labels: ['PS5', 'PS4'] },
    { key: 'PSP', labels: ['PSP Vita', 'PSP'] },
    { key: 'Laptop', labels: ['Legion 5', 'MacBook Pro', 'Dell XPS 13', 'Asus ZenBook'] },
    { key: 'Tablet', labels: ['iPad Air', 'Samsung Tab S8'] },
    { key: 'Watch', labels: ['Galaxy Watch 5', 'iWatch Series 9', 'Honor Watch 4'] }
  ];

  // helpful lists for properties
  const RAM_OPTIONS = ['4GB', '6GB', '8GB', '12GB', '16GB', '24GB'];
  const STORAGE_OPTIONS = ['64GB', '128GB', '256GB', '512GB', '1TB'];
  const CONDITIONS = ['new', 'used'];

  // Price generator helper (rough ranges per category)
  function priceRangeForBrand(brand) {
    const low = (() => {
      if (/iphone|pixel|asus|rog|macbook|playstation|xbox|ps5/i.test(brand)) return 150000; // phones & consoles
      if (/laptop|macbook|legion|dell|asus/i.test(brand)) return 180000;
      if (/ipad|tablet|watch/i.test(brand)) return 80000;
      if (/nintendo|psp|xbox/i.test(brand)) return 90000;
      return 50000;
    })();
    const high = low + 2400000 + Math.floor(Math.random() * 800000);
    return { low, high };
  }

  // Build PRODUCTS array programmatically (seeding 110 items)
  const PRODUCTS = (() => {
    const list = [];
    let count = 0;
    // loop while less than target
    let brandIndex = 0;
    while (list.length < PRODUCTS_TO_SEED) {
      const brandObj = BRANDS[brandIndex % BRANDS.length];
      const model = brandObj.labels[count % Math.max(1, brandObj.labels.length)];
      const brandKey = brandObj.key;
      const prRange = priceRangeForBrand(brandKey.toLowerCase());
      // random price within range but discrete
      const base = Math.round((prRange.low + Math.random() * (prRange.high - prRange.low)) / 1000) * 1000;
      // variant details
      const ram = RAM_OPTIONS[Math.floor(Math.random() * RAM_OPTIONS.length)];
      const storage = STORAGE_OPTIONS[Math.floor(Math.random() * STORAGE_OPTIONS.length)];
      const cond = Math.random() > 0.35 ? 'new' : 'used';
      const id = uid('p_');
      // build image name guess — attempt to derive a likely filename using brand and model tokens
      const imgName = generateImageName(model, brandKey, storage);
      const category = deriveCategoryFromModel(model, brandKey);

      list.push({
        id,
        brand: brandKey,
        name: `${model} ${storage}${ram ? ' • ' + ram : ''}`,
        priceValue: base,
        price: formatCurrencyNGN(base),
        ram,
        storage,
        condition: cond,
        category,
        img: `img/${imgName}.jpeg`
      });

      // advance pointers
      count += 1;
      brandIndex += 1;
    }
    return list;
  })();

  // Helper: produce friendly image filename token from model + brand
  function generateImageName(model, brand) {
    // sanitize to lower-case letters and numbers separated by hyphens
    const tokens = (brand + ' ' + model).toLowerCase().replace(/[^a-z0-9 ]+/g, '').split(/\s+/);
    // prefer shorter composite name (join up to 3 tokens)
    const candidate = tokens.slice(0, 3).join('');
    // fallback candidate: brand only
    return candidate || brand.toLowerCase();
  }

  // Helper: derive broad category
  function deriveCategoryFromModel(model, brand) {
    const m = model.toLowerCase();
    if (/ipad|tablet/i.test(m) || /tablet/i.test(brand)) return 'tablet';
    if (/watch|iwatch|galaxy watch|honor watch/i.test(m) || /watch/i.test(brand)) return 'watch';
    if (/ps5|ps4|playstation|xbox|nintendo|psp/i.test(m) || /playstation|xbox|nintendo|psp/i.test(brand)) return 'console';
    if (/macbook|laptop|legion|dell|xps|zenbook/i.test(m) || /laptop/i.test(brand)) return 'laptop';
    return 'phone';
  }

  /* ---------------------------
     APP STATE
     --------------------------- */
  const state = {
    allProducts: PRODUCTS.slice(), // seeded array
    filteredProducts: [], // current filtered results
    page: 0, // current page index for pagination
    pageSize: PAGE_SIZE,
    filters: {
      q: '',
      brand: '',
      condition: '',
      maxPrice: Number.MAX_SAFE_INTEGER,
      sort: 'newest' // or 'price-desc', 'price-asc'
    },
    cart: loadCartFromStorage()
  };

  /* ---------------------------
     STORAGE helpers for cart
     --------------------------- */
  function loadCartFromStorage() {
    try {
      const raw = localStorage.getItem(LOCALSTORAGE_CART_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse cart from localStorage', e);
      return [];
    }
  }

  function saveCartToStorage() {
    try {
      localStorage.setItem(LOCALSTORAGE_CART_KEY, JSON.stringify(state.cart));
    } catch (e) {
      console.warn('Failed to save cart', e);
    }
  }

  /* ---------------------------
     UI RENDERING: PRODUCTS
     --------------------------- */

  // Template for a product card — returns element (article)
  function createProductCard(product) {
    const article = document.createElement('article');
    article.className = 'product-card';
    article.setAttribute('role', 'article');
    article.setAttribute('data-product-id', product.id);
    article.innerHTML = `
      <div class="img-wrap" aria-hidden="true">
        <img src="${escapeHtml(product.img)}" alt="${escapeHtml(product.name)}" loading="lazy">
      </div>
      <div class="product-meta">
        <h4 id="p-${product.id}-name">${escapeHtml(product.name)}</h4>
        <div class="specs">${escapeHtml(product.ram)} • ${escapeHtml(product.storage)} • ${escapeHtml(product.condition)}</div>
        <div class="price">${escapeHtml(product.price)}</div>
        <div class="product-actions">
          <button class="btn primary btn-chat" data-product-id="${product.id}">💬 Reserve</button>
          <button class="btn ghost btn-quickview" data-product-id="${product.id}">Quick view</button>
        </div>
      </div>
    `;
    // attach image error handler to fallback
    const imgEl = article.querySelector('img');
    imgEl.addEventListener('error', () => {
      imgEl.src = IMAGE_PLACEHOLDER;
    });
    // attach button handlers
    article.querySelector('.btn-chat').addEventListener('click', () => {
      openWhatsAppForProduct(product);
    });
    article.querySelector('.btn-quickview').addEventListener('click', () => {
      openModal(product);
    });

    return article;
  }

  // escape for safety when injecting into innerHTML
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // Render a page of products into #products-grid
  function renderProducts(resetPage = false) {
    const grid = $('#products-grid');
    if (!grid) return;
    if (resetPage) state.page = 0;
    const start = state.page * state.pageSize;
    const end = start + state.pageSize;
    const paged = state.filteredProducts.slice(start, end);

    // If first page and no products, show empty state
    if (state.page === 0) grid.innerHTML = '';

    // If no more items to append, and it's empty, show empty copy
    if (paged.length === 0 && state.page === 0) {
      grid.innerHTML = `<div class="center text-muted">No products found. Try different filters or clear search.</div>`;
      updateLoadMoreVisibility();
      return;
    }

    // Append product cards for this page
    const frag = document.createDocumentFragment();
    paged.forEach(prod => {
      frag.appendChild(createProductCard(prod));
    });
    grid.appendChild(frag);

    // increment page after rendering
    state.page += 1;
    updateLoadMoreVisibility();
  }

  function updateLoadMoreVisibility() {
    const btn = $('#load-more');
    if (!btn) return;
    const rendered = state.page * state.pageSize;
    if (rendered >= state.filteredProducts.length) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'inline-flex';
    }
  }

  /* ---------------------------
     FILTER / SEARCH / SORT logic
     --------------------------- */

  function applyFiltersAndSort() {
    const q = (state.filters.q || '').trim().toLowerCase();
    const brandFilter = (state.filters.brand || '').toLowerCase();
    const condFilter = (state.filters.condition || '').toLowerCase();
    const maxPrice = Number(state.filters.maxPrice) || Number.MAX_SAFE_INTEGER;
    const sort = state.filters.sort || 'newest';

    // Filter stage
    const results = state.allProducts.filter(p => {
      // price filter
      if (Number(p.priceValue) > maxPrice) return false;
      // brand filter
      if (brandFilter && p.brand.toLowerCase() !== brandFilter) return false;
      // condition filter
      if (condFilter && p.condition.toLowerCase() !== condFilter) return false;
      // search query: match name, brand, storage, ram
      if (q) {
        const hay = `${p.brand} ${p.name} ${p.storage} ${p.ram} ${p.category} ${p.condition}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // Sort stage
    results.sort((a, b) => {
      if (sort === 'price-asc') return a.priceValue - b.priceValue;
      if (sort === 'price-desc') return b.priceValue - a.priceValue;
      // newest = random-ish order seeded by id creation time — but we'll keep stable by price desc fallback
      // For prototype, keep seeded order: we seeded array earlier
      return 0;
    });

    state.filteredProducts = results;
    // reset page and render
    renderProducts(true);
  }

  /* ---------------------------
     SEARCH & FILTER UI BINDINGS
     --------------------------- */

  function wireFilterControls() {
    const qInput = $('#search-input');
    const brandSelect = $('#filter-brand');
    const condSelect = $('#filter-condition');
    const priceRange = $('#price-range');
    const priceValue = $('#price-value');
    const sortSelect = $('#sort-order');
    const loadMoreBtn = $('#load-more');

    if (!qInput || !brandSelect || !condSelect || !priceRange || !priceValue || !sortSelect || !loadMoreBtn) {
      console.warn('Some filter controls missing from DOM');
      return;
    }

    // Debounced search input
    const debounced = debounce((e) => {
      state.filters.q = qInput.value;
      state.page = 0;
      applyFiltersAndSort();
      announceLive(`Showing results for "${state.filters.q}"`);
    }, 300);

    qInput.addEventListener('input', debounced);

    brandSelect.addEventListener('change', () => {
      state.filters.brand = brandSelect.value;
      state.page = 0;
      applyFiltersAndSort();
    });

    condSelect.addEventListener('change', () => {
      state.filters.condition = condSelect.value;
      state.page = 0;
      applyFiltersAndSort();
    });

    // Price range: update label & filter
    priceRange.addEventListener('input', () => {
      const val = Number(priceRange.value);
      state.filters.maxPrice = val;
      priceValue.textContent = `Max ${formatCurrencyNGN(val)}`;
    });
    priceRange.addEventListener('change', () => {
      state.page = 0;
      applyFiltersAndSort();
    });

    sortSelect.addEventListener('change', () => {
      state.filters.sort = sortSelect.value;
      state.page = 0;
      applyFiltersAndSort();
    });

    // Load more
    loadMoreBtn.addEventListener('click', () => {
      renderProducts(false);
    });

    // initial price label setup (use the max value)
    priceValue.textContent = `Max ${formatCurrencyNGN(Number(priceRange.value))}`;
  }

  /* ---------------------------
     BRAND SLIDER WIRING
     --------------------------- */
  function wireBrandSliders() {
    const sliders = $$('[data-slider]');
    sliders.forEach(track => {
      // find prev/next within parent brand-slider
      const parent = track.closest('.brand-slider') || track.parentElement;
      const prevBtn = parent.querySelector('[data-slider-prev]');
      const nextBtn = parent.querySelector('[data-slider-next]');

      // Prev click: scroll left by track width
      if (prevBtn) prevBtn.addEventListener('click', () => {
        track.scrollBy({ left: -track.clientWidth * 0.6, behavior: 'smooth' });
      });
      if (nextBtn) nextBtn.addEventListener('click', () => {
        track.scrollBy({ left: track.clientWidth * 0.6, behavior: 'smooth' });
      });

      // optionally: enable arrow key controls when focused
      track.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowLeft') track.scrollBy({ left: -160, behavior: 'smooth' });
        if (ev.key === 'ArrowRight') track.scrollBy({ left: 160, behavior: 'smooth' });
      });
    });
  }

  /* ---------------------------
     MODAL (quick view)
     --------------------------- */
  const modal = $('#product-modal');
  const modalImage = $('#modal-image');
  const modalTitle = $('#modal-title');
  const modalSpecs = $('#modal-specs');
  const modalPrice = $('#modal-price');
  const modalChatBtn = $('#modal-chat');
  const modalAddCartBtn = $('#modal-addcart');
  const modalCloseBtn = modal ? modal.querySelector('.modal-close') : null;

  // Keep track of last focused element to restore focus after closing modal
  let lastFocusedElementBeforeModal = null;

  function openModal(product) {
    if (!modal) return;
    lastFocusedElementBeforeModal = document.activeElement;

    // populate modal content
    modalImage.src = product.img || IMAGE_PLACEHOLDER;
    modalImage.alt = product.name;
    modalTitle.textContent = product.name;
    modalSpecs.textContent = `${product.ram} • ${product.storage} • ${product.condition} • ${product.category}`;
    modalPrice.textContent = product.price;

    // attach chat button handler (prefill)
    modalChatBtn.onclick = () => {
      openWhatsAppForProduct(product);
    };

    modalAddCartBtn.onclick = () => {
      addToCart(product.id, 1);
      openCartPanel(); // show cart after adding
    };

    // show modal
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('active');
    trapFocus(modal);
    // set initial focus to close button
    if (modalCloseBtn) modalCloseBtn.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('active');
    releaseFocusTrap(modal);
    if (lastFocusedElementBeforeModal) lastFocusedElementBeforeModal.focus();
  }

  // click outside to close
  function modalOutsideClickHandler(e) {
    if (e.target === modal) {
      closeModal();
    }
  }

  // key handlers (ESC to close)
  function modalKeyHandler(e) {
    if (e.key === 'Escape') {
      if (modal && modal.getAttribute('aria-hidden') === 'false') closeModal();
    }
  }

  // focus trap minimal
  let previousActiveElement = null;
  function trapFocus(container) {
    previousActiveElement = document.activeElement;
    const focusable = getFocusableElements(container);
    if (focusable.length) focusable[0].focus();

    container.addEventListener('keydown', handleTrapTab);
  }

  function releaseFocusTrap(container) {
    container.removeEventListener('keydown', handleTrapTab);
    previousActiveElement = null;
  }

  function handleTrapTab(e) {
    if (e.key !== 'Tab') return;
    const container = modal;
    const focusable = getFocusableElements(container);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function getFocusableElements(container) {
    const sel = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(sel)).filter(el => el.offsetParent !== null);
  }

  /* ---------------------------
     CART (mobile slide-up panel)
     --------------------------- */
  const cartPanel = $('#cart-panel');
  const cartItemsContainer = $('#cart-items');
  const cartTotalEl = $('#cart-total');
  const cartSendBtn = $('#cart-send');
  const cartClearBtn = $('#cart-clear');
  const cartCloseBtn = $('#cart-close');

  function openCartPanel() {
    if (!cartPanel) return;
    cartPanel.setAttribute('aria-hidden', 'false');
    cartPanel.classList.add('open');
    trapFocus(cartPanel);
  }

  function closeCartPanel() {
    if (!cartPanel) return;
    cartPanel.setAttribute('aria-hidden', 'true');
    cartPanel.classList.remove('open');
    releaseFocusTrap(cartPanel);
  }

  function addToCart(productId, qty = 1) {
    const prod = state.allProducts.find(p => p.id === productId);
    if (!prod) return;
    const existing = state.cart.find(i => i.productId === productId);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, 99);
    } else {
      state.cart.push({ productId, qty });
    }
    saveCartToStorage();
    renderCart();
    announceLive(`${prod.name} added to cart`);
  }

  function removeFromCart(productId) {
    const idx = state.cart.findIndex(i => i.productId === productId);
    if (idx !== -1) {
      const prod = state.allProducts.find(p => p.id === productId);
      state.cart.splice(idx, 1);
      saveCartToStorage();
      renderCart();
      announceLive(`${prod ? prod.name : 'Item'} removed from cart`);
    }
  }

  function updateCartQty(productId, qty) {
    const item = state.cart.find(i => i.productId === productId);
    if (!item) return;
    item.qty = clamp(qty, 1, 99);
    saveCartToStorage();
    renderCart();
  }

  function clearCart() {
    state.cart = [];
    saveCartToStorage();
    renderCart();
  }

  function getCartTotalValue() {
    let sum = 0;
    for (const it of state.cart) {
      const p = state.allProducts.find(x => x.id === it.productId);
      if (p) sum += (p.priceValue || 0) * (it.qty || 1);
    }
    return sum;
  }

  // Render cart items
  function renderCart() {
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = '';
    if (!state.cart.length) {
      cartItemsContainer.innerHTML = `<p class="text-muted">Your cart is empty.</p>`;
      cartTotalEl.textContent = formatCurrencyNGN(0);
      return;
    }
    const frag = document.createDocumentFragment();
    state.cart.forEach(item => {
      const p = state.allProducts.find(x => x.id === item.productId);
      if (!p) return;
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.innerHTML = `
        <img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.name)}" loading="lazy">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.name)}</div>
            <div style="font-weight:900">${escapeHtml(formatCurrencyNGN(p.priceValue))}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
            <label class="small" style="display:inline-flex;align-items:center;gap:6px">Qty:
              <input type="number" min="1" max="99" value="${item.qty}" data-cart-id="${p.id}" style="width:60px;padding:6px;border-radius:8px;border:1px solid rgba(16,24,40,0.06);"/>
            </label>
            <button class="btn small ghost" data-cart-remove="${p.id}">Remove</button>
          </div>
        </div>
      `;
      // image error fallback
      const imgEl = el.querySelector('img');
      imgEl.addEventListener('error', () => { imgEl.src = IMAGE_PLACEHOLDER; });
      frag.appendChild(el);
    });
    cartItemsContainer.appendChild(frag);

    // attach quantity and remove handlers
    $$('#cart-items input[type="number"]').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const pid = inp.getAttribute('data-cart-id');
        const val = Number(inp.value) || 1;
        updateCartQty(pid, val);
      });
    });
    $$('#cart-items [data-cart-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pid = btn.getAttribute('data-cart-remove');
        removeFromCart(pid);
      });
    });

    cartTotalEl.textContent = formatCurrencyNGN(getCartTotalValue());
  }

  // Build WhatsApp message for a single product
  function messageForProduct(product) {
    const msg = `Hi ${STORE_NAME},%0AI am interested in *${product.name}* (%20NGN%20${product.price.replace(/₦/g,'')}).%0AProduct ID: ${product.id}%0ACondition: ${product.condition}%0APlease let me know availability and pickup/delivery options.`;
    // encodeURIComponent would double-encode %0A if included; we already used %0A. For simpler approach use encodeURIComponent full message:
    const plain = `Hi ${STORE_NAME},\nI am interested in ${product.name} (${product.price}).\nProduct ID: ${product.id}\nCondition: ${product.condition}\nPlease let me know availability and pickup/delivery options.`;
    return `https://wa.me/${WA_NUMBER.replace(/^\+/, '')}?text=${encodeURIComponent(plain)}`;
  }

  // Build WhatsApp message for cart
  function messageForCart() {
    if (!state.cart.length) return `https://wa.me/${WA_NUMBER.replace(/^\+/, '')}?text=${encodeURIComponent(`Hi ${STORE_NAME},%0AI would like to inquire about items in my cart.`)}`;
    let lines = [`Hi ${STORE_NAME},`, `I would like to order/reserve the following items:`];
    state.cart.forEach((it, idx) => {
      const p = state.allProducts.find(x => x.id === it.productId);
      if (!p) return;
      lines.push(`${idx + 1}. ${p.name} — ${p.price} × ${it.qty}`);
    });
    lines.push(`Total: ${formatCurrencyNGN(getCartTotalValue())}`);
    lines.push(`Please confirm availability and pickup/delivery instructions.`);
    return `https://wa.me/${WA_NUMBER.replace(/^\+/, '')}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  // Open WhatsApp for a single product
  function openWhatsAppForProduct(product) {
    const url = messageForProduct(product);
    window.open(url, '_blank', 'noopener');
  }

  // Open WhatsApp for cart
  function openWhatsAppForCart() {
    const url = messageForCart();
    window.open(url, '_blank', 'noopener');
  }

  /* ---------------------------
     TESTIMONIALS CAROUSEL (simple)
     --------------------------- */
  function wireTestimonials() {
    const list = $$('.testimonial');
    if (!list.length) return;
    // Show 1 at a time on small screens — but for simplicity we leave stacking behavior.
    // Optionally implement auto-rotate
    let idx = 0;
    const rotate = () => {
      list.forEach((el, i) => {
        el.style.opacity = i === idx ? '1' : '0.2';
        el.style.transform = i === idx ? 'translateY(0)' : 'translateY(6px)';
      });
      idx = (idx + 1) % list.length;
    };
    setInterval(rotate, 6000);
  }

  /* ---------------------------
     BASIC ACCESSIBILITY & LIVE ANNOUNCE
     --------------------------- */
  let liveRegion;
  function ensureLiveRegion() {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }
  }
  function announceLive(text) {
    ensureLiveRegion();
    liveRegion.textContent = text;
  }

  /* ---------------------------
     Misc helpers and event wireups
     --------------------------- */

  // Quick way to open the cart (wired to some buttons)
  function wireCartButtons() {
    // Send and clear handlers
    if (cartSendBtn) cartSendBtn.addEventListener('click', () => {
      openWhatsAppForCart();
    });
    if (cartClearBtn) cartClearBtn.addEventListener('click', () => {
      if (!confirm('Clear cart?')) return;
      clearCart();
    });
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCartPanel);

    // also wire global "open cart" buttons (example: header icon if present)
    // we check for any element with data-open-cart
    const openButtons = $$('[data-open-cart]');
    openButtons.forEach(b => b.addEventListener('click', openCartPanel));
  }

  /* ---------------------------
     MOBILE NAV TOGGLE
     --------------------------- */
  function wireMobileNavToggle() {
    const toggle = $('.mobile-toggle');
    const nav = $('#main-nav');
    const headerCtas = document.querySelector('.header-ctas');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('active');
      if (headerCtas) headerCtas.classList.toggle('active');
    });
  }

  /* ---------------------------
     Bind modal events globally
     --------------------------- */
  function wireModalHandlers() {
    if (!modal) return;
    document.addEventListener('click', modalOutsideClickHandler);
    document.addEventListener('keydown', modalKeyHandler);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  }

  /* ---------------------------
     Live reveal using IntersectionObserver (subtle)
     --------------------------- */
  function wireRevealOnScroll() {
    try {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            en.target.style.opacity = 1;
            en.target.style.transform = 'translateY(0)';
            observer.unobserve(en.target);
          }
        });
      }, { threshold: 0.12 });

      $$('section, .product-card, .testimonial').forEach(el => {
        el.style.opacity = 0;
        el.style.transform = 'translateY(18px)';
        el.style.transition = 'opacity 560ms ease, transform 560ms ease';
        observer.observe(el);
      });
    } catch (e) {
      // fallback: do nothing
    }
  }

  /* ---------------------------
     Search suggestions (optional micro UX)
     --------------------------- */
  function wireSearchSuggestions() {
    // For prototype, not implementing full typed suggestions list to keep code small.
    // Could be added in next iteration.
  }

  /* ---------------------------
     INITIALIZE BRAND SELECT options (from seeded products)
     --------------------------- */
  function populateBrandSelect() {
    const brandSelect = $('#filter-brand');
    if (!brandSelect) return;
    // get unique brand names from products
    const brands = Array.from(new Set(state.allProducts.map(p => p.brand))).sort();
    // preserve the default first option, then append
    brands.forEach(b => {
      // skip empty or already existing option
      if ([...brandSelect.options].some(opt => opt.value === b)) return;
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      brandSelect.appendChild(opt);
    });
  }

  /* ---------------------------
     Initialize the brand sliders with images from products
     --------------------------- */
  function populateBrandSliders() {
    const brandContainers = document.querySelectorAll('.brand-block');
    if (!brandContainers.length) return;
    // map products by brand
    const byBrand = {};
    state.allProducts.forEach(p => {
      if (!byBrand[p.brand]) byBrand[p.brand] = [];
      byBrand[p.brand].push(p);
    });

    brandContainers.forEach(container => {
      const label = container.querySelector('.brand-title');
      const track = container.querySelector('[data-slider]');
      if (!label || !track) return;
      const brandText = label.textContent || '';
      // find best matching brand key
      const brandKey = Object.keys(byBrand).find(k => brandText.toLowerCase().includes(k.toLowerCase())) || Object.keys(byBrand)[0];
      const items = byBrand[brandKey] || [];
      // clear track
      track.innerHTML = '';
      // add slides (limit to 12)
      items.slice(0, 12).forEach(p => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.setAttribute('role', 'group');
        slide.setAttribute('aria-label', p.name);
        slide.innerHTML = `<img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.name)}" loading="lazy">`;
        const img = slide.querySelector('img');
        img.addEventListener('error', () => { img.src = IMAGE_PLACEHOLDER; });
        // click slide -> quick view
        slide.addEventListener('click', () => openModal(p));
        track.appendChild(slide);
      });
    });
  }

  /* ---------------------------
     Fill initial products grid (applies filters then render first page)
     --------------------------- */
  function bootRender() {
    // initial filter settings defaults
    state.filters.maxPrice = Number($('#price-range') ? $('#price-range').value : Number.MAX_SAFE_INTEGER) || Number.MAX_SAFE_INTEGER;
    state.filteredProducts = state.allProducts.slice(); // start with full set
    // sort default: newest - maintain seeded order
    renderProducts(true);
  }

  /* ---------------------------
     Image fallback helper for the whole page (in case of many missing)
     --------------------------- */
  function ensurePlaceholders() {
    // attach onerror to all current img elements to fallback
    document.querySelectorAll('img').forEach(img => {
      img.addEventListener('error', () => {
        if (img.src && !img.dataset.failed) {
          img.dataset.failed = '1';
          img.src = IMAGE_PLACEHOLDER;
        }
      });
    });
  }

  /* ---------------------------
     Keyboard shortcuts (accessibility)
     --------------------------- */
  function wireGlobalShortcuts() {
    document.addEventListener('keydown', (ev) => {
      // open cart with 'c' and close with 'Escape' handled elsewhere
      if (ev.key === 'c' || ev.key === 'C') {
        // toggle cart
        if (cartPanel && cartPanel.classList.contains('open')) closeCartPanel();
        else openCartPanel();
      }
    });
  }

  /* ---------------------------
     On DOM ready, wire everything
     --------------------------- */
  function init() {
    // announce bootstrap
    console.info(`${STORE_NAME} prototype initializing — ${state.allProducts.length} products seeded.`);

    // populate brand select and sliders
    populateBrandSelect();
    populateBrandSliders();

    // wire UI controls
    wireFilterControls();
    wireBrandSliders();
    wireModalHandlers();
    wireCartButtons();
    wireMobileNavToggle();
    wireTestimonials();
    wireRevealOnScroll();
    wireGlobalShortcuts();

    // initial render
    bootRender();

    // cart render from persisted state
    renderCart();

    // ensure images fallback
    ensurePlaceholders();

    // wire "quickview" and "reserve" events for sample fallback cards already in HTML
    // (these will be replaced by renderProducts with fresh elements)
    document.addEventListener('click', (e) => {
      // quick view fallback
      if (e.target.matches('.btn-quickview')) {
        const pid = e.target.getAttribute('data-product-id');
        const p = state.allProducts.find(x => x.id === pid);
        if (p) openModal(p);
      }
      if (e.target.matches('.btn-chat')) {
        const pid = e.target.getAttribute('data-product-id');
        const p = state.allProducts.find(x => x.id === pid);
        if (p) openWhatsAppForProduct(p);
      }
    });

    // ensure load more button wired (in case not done earlier)
    const loadMoreBtn = $('#load-more');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => renderProducts(false));

    // wire sticky CTA and FAB behavior (pulse already in CSS)
    const fab = document.querySelector('.fab-wa');
    if (fab) {
      fab.addEventListener('click', (e) => {
        // allow native navigation to WhatsApp link
        announceLive('Opening WhatsApp chat');
      });
    }

    // handle modal click outside
    if (modal) modal.addEventListener('click', modalOutsideClickHandler);

    // initial accessibility announcement
    announceLive(`${state.filteredProducts.length} products loaded.`);
  }

  // Kick off when DOM is ready
  document.addEventListener('DOMContentLoaded', init);

  /* ---------------------------
     Expose some helpers to window for debugging (dev only)
     --------------------------- */
  window.Tobbie = {
    state,
    PRODUCTS,
    formatCurrencyNGN,
    addToCart,
    removeFromCart,
    openCartPanel,
    closeCartPanel,
    openModal,
    closeModal,
    renderProducts,
    applyFiltersAndSort,
    clearCart
  };

})();
