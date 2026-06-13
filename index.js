


const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTaeB87dNAhoHbuLnfV1IUFgLSaUG33gVYY4TVwH8gPB2HFZJR9zYtX9tt0B0yHyHdTP2jTip8fsH0G/pub?output=csv";


const WHATSAPP_NUMBER  = "+254 747 028153";
const INSTAGRAM_HANDLE = "@priest._downtown";


let PRODUCTS      = [];
let cart          = [];
let currentFilter = 'All';
let currentSort   = 'default';
let prevPage      = 'shop';
let qty           = 1;


function parseCSV(raw) {
  
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  return lines.slice(1).map((line, i) => {
    
    const cols = [];
    let cur = '', inQ = false;
    for (let ci = 0; ci < line.length; ci++) {
      const ch = line[ci];
      if (ch === '"') {
        if (inQ && line[ci + 1] === '"') { cur += '"'; ci++; } 
        else { inQ = !inQ; }
      } else if (ch === ',' && !inQ) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());

    
    const clean = cols.map(c => c.replace(/^"+|"+$/g, '').trim());

    const img = clean[2] || '';
    
    const imageUrl = /^https?:\/\/.+/.test(img) ? img : '';

return {
  id: Number(cols[0]),
  name: cols[1],
  price: Number(cols[2]),
  category: cols[3],
  image: cols[4]
};
  }).filter(p => p.name && p.name !== 'Item' || p.price);
}


async function loadProducts() {
  if (!SHEET_CSV_URL || SHEET_CSV_URL === 'PASTE_YOUR_CSV_URL_HERE') {
    useFallback(); return;
  }
  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    PRODUCTS = parseCSV(text);
    if (!PRODUCTS.length) { useFallback(); return; }
    initUI();
  } catch (e) {
    console.warn('Sheet load failed, using fallback data:', e);
    useFallback();
  }
}

function useFallback() {
  PRODUCTS = [
    { id:1, name:'The Linen Shirt',       price:2500, image:'', category:'Tops' },
    { id:2, name:'Wide-Leg Trouser',      price:3800, image:'', category:'Bottoms' },
    { id:3, name:'Overshirt Jacket',      price:5200, image:'', category:'Outerwear' },
    { id:4, name:'Ribbed Tank Top',       price:1500, image:'', category:'Tops' },
    { id:5, name:'Chino Pant',            price:3200, image:'', category:'Bottoms' },
    { id:6, name:'Crewneck Sweater',      price:4400, image:'', category:'Tops' },
    { id:7, name:'Technical Rain Jacket', price:7500, image:'', category:'Outerwear' },
    { id:8, name:'Linen Shorts',          price:2200, image:'', category:'Bottoms' },
  ];
  initUI();
}


function initUI() {
  const countEl = document.getElementById('hero-count');
  if (countEl) countEl.textContent = PRODUCTS.length;

  

  buildCategories();
  observeCategoryReveal();
  renderFeatured();
  buildFilterTabs();
  renderShop();
  injectCheckoutModal();
}

function observeCategoryReveal() {
  const cards = document.querySelectorAll('#cat-grid .cat-card');
  if (!cards.length || !window.IntersectionObserver) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    });
  }, {
    threshold: 0.18,
    rootMargin: '0px 0px -10% 0px'
  });

  cards.forEach(card => observer.observe(card));
}


function fmt(amount) {
  return 'Ksh ' + Number(amount).toLocaleString('en-KE');
}

function getSizeOptions(category) {
  if (category === 'Shoes') {
    return ['6','7','8','9','10'];
  }
  return ['XS','S','M','L','XL'];
}

function productCardHTML(p) {
  const samecat  = PRODUCTS.filter(x => x.category === p.category && x.image).slice(0, 4);
  const gridImgs = samecat.length >= 2
    ? samecat.map(x => `<img src="${x.image}" alt="${x.name}" loading="lazy">`).join('')
    : null;

  const singleImg  = p.image ? `<img class="img-single" src="${p.image}" alt="${p.name}" loading="lazy">` : '';
  const gridLayer  = gridImgs ? `<div class="img-grid">${gridImgs}</div>` : '';
  const placeholder = !p.image ? `<div class="pcard-placeholder">${p.name[0]}</div>` : '';

  return `
    <div class="pcard" onclick="showDetail(${p.id})">
      <div class="pcard-img">
        ${placeholder}
        ${singleImg}
        ${gridLayer}
        <button class="wish-btn" onclick="event.stopPropagation();this.classList.toggle('active')" title="Wishlist">♡</button>
      </div>
      <div class="pcard-info">
        <div class="pcard-name">${p.name}</div>
        <div class="pcard-cat">${p.category}</div>
        <div class="pcard-price">
          <span class="price-now">${fmt(p.price)}</span>
        </div>
      </div>
    </div>`;
}


function renderFeatured() {
  const el = document.getElementById('featured-grid');
  if (el) el.innerHTML = PRODUCTS.slice(0, 4).map(productCardHTML).join('');
}


function buildCategories() {
  const cats  = [...new Set(PRODUCTS.map(p => p.category))];
  const byCat = {};
  cats.forEach(c => { byCat[c] = PRODUCTS.filter(p => p.category === c); });
  const bg = ['#d6cfc2','#c9bfb0','#e2dbd0','#d0c8bc','#c0b3a3','#b8b0a3'];

  const html = cats.map((cat, i) => {
    // Prefer an image from the same category. If none exist, fall back to
    // the first item in the category or any product with an image.
    const sourceItems = byCat[cat]?.filter(item => item.image) || [];
    const sample = sourceItems.length ? sourceItems[0] : (byCat[cat] && byCat[cat][0]) || PRODUCTS.find(p => p.image);
    const imgHTML = sample?.image
      ? `<img src="${sample.image}" alt="${cat}">`
      : `<div class="cat-card-bg" style="background:${bg[i % bg.length]}">${cat[0]}</div>`;
    return `
      <div class="cat-card" onclick="filterShop('${cat}')">
        ${imgHTML}
        <div class="cat-label">
          <h3>${cat}</h3>
          <p>${byCat[cat].length} piece${byCat[cat].length !== 1 ? 's' : ''}</p>
        </div>
      </div>`;
  }).join('');

  const el = document.getElementById('cat-grid');
  if (el) el.innerHTML = html || '<p style="padding:40px;color:var(--muted)">No categories found.</p>';
}


function buildFilterTabs() {
  const cats = [...new Set(PRODUCTS.map(p => p.category))];
  const tabs = document.getElementById('filter-tabs');
  if (!tabs) return;
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className  = 'ftab';
    btn.textContent = c;
    btn.onclick    = () => applyFilter(c, btn);
    tabs.appendChild(btn);
  });
}

function getFiltered() {
  let p = currentFilter === 'All' ? [...PRODUCTS] : PRODUCTS.filter(x => x.category === currentFilter);
  if (currentSort === 'price-asc')  p.sort((a, b) => a.price - b.price);
  if (currentSort === 'price-desc') p.sort((a, b) => b.price - a.price);
  if (currentSort === 'name')       p.sort((a, b) => a.name.localeCompare(b.name));
  return p;
}

function renderShop() {
  const products = getFiltered();
  const grid = document.getElementById('shop-grid');
  const count = document.getElementById('shop-count');
  if (grid)  grid.innerHTML  = products.map(productCardHTML).join('');
  if (count) count.textContent =
    `Showing ${products.length} item${products.length !== 1 ? 's' : ''}${currentFilter !== 'All' ? ' in ' + currentFilter : ''}`;
}

function applyFilter(cat, btn) {
  currentFilter = cat;
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderShop();
}

function filterShop(cat) {
  currentFilter = cat;
  showPage('shop');
  document.querySelectorAll('.ftab').forEach(t => {
    t.classList.toggle('active', t.textContent === cat);
  });
  renderShop();
}

function applySort(val) { currentSort = val; renderShop(); }


function showDetail(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;

  const imgHTML = p.image
    ? `<img src="${p.image}" alt="${p.name}">`
    : `<div style="font-family:var(--font-d);font-size:100px;color:rgba(0,0,0,.1)">${p.name[0]}</div>`;

  const thumbsHTML = [p.image, p.image, p.image].map((img, i) => `
    <div class="thumb ${i === 0 ? 'active' : ''}" onclick="selectThumb(this)">
      ${img ? `<img src="${img}" alt="">` : p.name[0]}
    </div>`).join('');

  const sizes = getSizeOptions(p.category).map((s, i) =>
    `<button class="size-btn ${i === 0 ? 'active' : ''}" onclick="selectSize(this)">${s}</button>`
  ).join('');

  document.getElementById('detail-content').innerHTML = `
    <button class="back-btn" onclick="goBack()">← Back</button>
    <div class="detail-layout">
      <div class="detail-gallery">
        <div class="thumb-list">${thumbsHTML}</div>
        <div class="main-img" id="main-img">${imgHTML}</div>
      </div>
      <div class="detail-info">
        <div class="detail-brand">priestDownTown</div>
        <h1 class="detail-name">${p.name}</h1>
        <div class="detail-rating">
          <span class="stars">★★★★★</span>
          <span>5.0 (42 reviews)</span>
        </div>
        <div class="detail-price">${fmt(p.price)}</div>

        <div class="d-section">
          <div class="d-label">Size</div>
          <div class="size-grid">${sizes}</div>
        </div>

        <div class="d-section">
          <div class="d-label">Quantity</div>
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="changeQty(-1)">−</button>
            <span class="qty-num" id="qty-num">1</span>
            <button class="qty-btn" onclick="changeQty(1)">+</button>
          </div>
        </div>

        <button class="atc-btn" onclick="addToCart(${p.id})">Add to Bag →</button>

        <div class="detail-desc">
          <p>${p.name} — ${p.category}. A considered piece built for everyday wear.</p>
          <ul class="d-features">
            <li>Category: ${p.category}</li>
            <li>Price: ${fmt(p.price)}</li>
            <li>Free delivery within Nairobi</li>
            <li>DM us to confirm your order</li>
          </ul>
        </div>
      </div>
    </div>`;

  showPage('detail');
  window.scrollTo(0, 0);
}

function selectThumb(el) {
  document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

function selectSize(btn) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function changeQty(d) {
  qty = Math.max(1, qty + d);
  const el = document.getElementById('qty-num');
  if (el) el.textContent = qty;
}


function addToCart(id) {
  const p = PRODUCTS.find(x => x.id === id);
  const sizeBtn = document.querySelector('.size-btn.active');
  const size    = sizeBtn ? sizeBtn.textContent : 'M';
  const existing = cart.find(i => i.id === id && i.size === size);
  if (existing) existing.qty += qty;
  else cart.push({ ...p, size, qty });
  qty = 1;
  const el = document.getElementById('qty-num');
  if (el) el.textContent = 1;
  updateCartUI();
  showToast(`${p.name} added to bag`);
}

function removeFromCart(idx) { cart.splice(idx, 1); updateCartUI(); }

function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('cart-count').textContent = cart.reduce((s, i) => s + i.qty, 0);
  const body = document.getElementById('cart-body');
  const foot = document.getElementById('cart-foot');

  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty"><span style="font-size:40px;opacity:.2">🛍️</span><span>Your bag is empty</span></div>`;
    foot.style.display = 'none';
  } else {
    body.innerHTML = cart.map((item, idx) => `
      <div class="cart-item">
        <div class="cart-item-img">${item.image ? `<img src="${item.image}" alt="">` : ''}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">Size: ${item.size} · Qty: ${item.qty}</div>
          <div class="cart-item-bottom">
            <span class="cart-item-price">${fmt(item.price * item.qty)}</span>
            <button class="remove-btn" onclick="removeFromCart(${idx})">Remove</button>
          </div>
        </div>
      </div>`).join('');
    foot.style.display = 'block';
    document.getElementById('cart-total').textContent = fmt(total);
  }
}

function toggleCart() {
  document.getElementById('cart-overlay').classList.toggle('open');
  document.getElementById('cart-drawer').classList.toggle('open');
}


function injectCheckoutModal() {
  
  const modal = document.createElement('div');
  modal.id = 'checkout-modal';
  modal.innerHTML = `
    <div class="co-overlay" onclick="closeCheckout()"></div>
    <div class="co-box">
      <button class="co-close" onclick="closeCheckout()">✖</button>
      <div class="co-icon">🛍️</div>
      <h2 class="co-title">Ready to Order?</h2>
      <p class="co-sub">We handle orders via WhatsApp or Instagram DM.<br>Send us your cart summary and we'll sort you out!</p>
      <div class="co-summary" id="co-summary"></div>
      <div class="co-actions">
        <a class="co-btn co-wa" id="co-wa-link" href="#" target="_blank" rel="noopener">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          WhatsApp Us
        </a>
        <a class="co-btn co-ig" id="co-ig-link" href="https://instagram.com/${INSTAGRAM_HANDLE}" target="_blank" rel="noopener">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          Instagram DM
        </a>
      </div>
      <p class="co-note">We'll confirm availability &amp; delivery details with you directly.</p>
    </div>`;
  document.body.appendChild(modal);

  
  const style = document.createElement('style');
  style.textContent = `
    #checkout-modal { display:none; position:fixed; inset:0; z-index:500; align-items:center; justify-content:center; }
    #checkout-modal.open { display:flex; }
    .co-overlay { position:absolute; inset:0; background:rgba(14,14,14,.55); }
    .co-box { position:relative; background:#f8f6f1; width:90%; max-width:440px; padding:44px 36px 36px; text-align:center; z-index:1; }
    .co-close { position:absolute; top:16px; right:18px; background:none; border:none; font-size:18px; cursor:pointer; color:#7a7368; }
    .co-close:hover { color:#0e0e0e; }
    .co-icon { font-size:40px; margin-bottom:16px; }
    .co-title { font-family:'Cormorant Garamond',Georgia,serif; font-size:28px; font-weight:400; margin-bottom:10px; }
    .co-sub { font-size:14px; color:#7a7368; line-height:1.7; margin-bottom:24px; }
    .co-summary { background:#ede9e0; padding:14px 18px; margin-bottom:24px; text-align:left; font-size:13px; line-height:1.9; max-height:160px; overflow-y:auto; }
    .co-summary-item { display:flex; justify-content:space-between; }
    .co-summary-total { display:flex; justify-content:space-between; font-weight:600; border-top:1px solid #c8bfae; margin-top:8px; padding-top:8px; }
    .co-actions { display:flex; gap:12px; margin-bottom:20px; }
    .co-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:13px 10px; font-size:13px; letter-spacing:.06em; text-decoration:none; font-weight:500; transition:opacity .2s; }
    .co-btn:hover { opacity:.85; }
    .co-wa { background:#25D366; color:#fff; }
    .co-ig { background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045); color:#fff; }
    .co-note { font-size:12px; color:#7a7368; line-height:1.6; }
  `;
  document.head.appendChild(style);

  
  const checkoutBtn = document.querySelector('.checkout-btn');
  if (checkoutBtn) checkoutBtn.onclick = openCheckout;
}

function openCheckout() {
  if (!cart.length) return;

  
  const lines = cart.map(i => `${i.name} (${i.size} × ${i.qty})`);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  
  const summaryHTML = cart.map(i => `
    <div class="co-summary-item">
      <span>${i.name} × ${i.qty} (${i.size})</span>
      <span>${fmt(i.price * i.qty)}</span>
    </div>`).join('') +
    `<div class="co-summary-total"><span>Total</span><span>${fmt(total)}</span></div>`;
  document.getElementById('co-summary').innerHTML = summaryHTML;

  
  const msg = encodeURIComponent(
    `Hi priestDownTown! I'd like to order:\n` +
    lines.map(l => `• ${l}`).join('\n') +
    `\n\nTotal: ${fmt(total)}`
  );
  document.getElementById('co-wa-link').href =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;

  document.getElementById('checkout-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkout-modal').classList.remove('open');
  document.body.style.overflow = '';
}


function showPage(name) {
  if (name !== 'detail') prevPage = name;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  window.scrollTo(0, 0);
}

function goBack() { showPage(prevPage); }


function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}


loadProducts();
