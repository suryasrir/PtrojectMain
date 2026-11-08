/* =========================================================
   SHAURYA — shared site shell
   Header, footer, logo system, cart, forms, reveals, transitions.
   ========================================================= */
(function () {
  const CFG = window.SHAURYA_CONFIG || {};
  const D = window.SHAURYA_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Safe storage ---------- */
  const store = {
    get(k, fallback) {
      try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; }
      catch (e) { return false; }
    }
  };

  /* ---------- Customer accounts (demo: stored in this browser) ----------
     Passwords are salted + SHA-256 hashed before storage. Real accounts need a
     server; this keeps the full flow working until one exists. */
  async function hash(str) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0; return "w" + h;
  }
  const auth = {
    user() {
      const s = store.get("shaurya.session", null);
      if (!s) return null;
      return store.get("shaurya.users", []).find(u => u.email === s.email) || null;
    },
    async register({ name, email, phone, password }) {
      email = String(email).trim().toLowerCase();
      const users = store.get("shaurya.users", []);
      if (users.some(u => u.email === email)) throw new Error("An account with this email already exists.");
      if (String(password).length < 8) throw new Error("Password must be at least 8 characters.");
      const salt = Math.random().toString(36).slice(2);
      users.push({ name, email, phone, salt, hash: await hash(salt + password), created: new Date().toISOString(), addresses: [] });
      store.set("shaurya.users", users);
      store.set("shaurya.session", { email });
      return auth.user();
    },
    async login(email, password) {
      email = String(email).trim().toLowerCase();
      const u = store.get("shaurya.users", []).find(x => x.email === email);
      if (!u || u.hash !== await hash(u.salt + password)) throw new Error("Email or password is incorrect.");
      store.set("shaurya.session", { email });
      return u;
    },
    update(patch) {
      const s = auth.user(); if (!s) return;
      const users = store.get("shaurya.users", []).map(u => u.email === s.email ? { ...u, ...patch } : u);
      store.set("shaurya.users", users);
    },
    logout() { try { localStorage.removeItem("shaurya.session"); } catch (e) {} }
  };

  /* ---------- Asset store (IndexedDB) for admin-uploaded 3D models ---------- */
  const assets = (() => {
    let dbp;
    const db = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open("shaurya-assets", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("files");
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
    const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction("files", mode); const q = fn(t.objectStore("files")); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
    return {
      put: (k, blob) => tx("readwrite", s => s.put(blob, k)),
      get: k => tx("readonly", s => s.get(k)).catch(() => null),
      del: k => tx("readwrite", s => s.delete(k)),
      keys: () => tx("readonly", s => s.getAllKeys()).catch(() => [])
    };
  })();

  const inr = n => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = (p = "") => p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

  /* ---------- Logo system ----------
     The S emblem: a warrior's shield silhouette framed like a palace
     jharokha arch, holding an S drawn as two counter-curved blade strokes.
     A three-point crest references royal insignia without religious symbols. */
  function emblem(opts = {}) {
    const c = opts.color || "currentColor";
    const id = "eg" + Math.random().toString(36).slice(2, 7);
    const fill = opts.gradient
      ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9d3a0"/><stop offset=".45" stop-color="#b08d57"/><stop offset="1" stop-color="#6e542f"/></linearGradient></defs>`
      : "";
    const s = opts.gradient ? `url(#${id})` : c;
    return `<svg class="emblem ${opts.cls || ""}" viewBox="0 0 64 72" aria-hidden="true">${fill}
      <path d="M32 9 L52 16 V38 C52 51 43 60 32 66 C21 60 12 51 12 38 V16 Z" fill="none" stroke="${s}" stroke-width="1.6"/>
      <path d="M32 13.5 L48.5 19.3 V38 C48.5 49 41 56.6 32 61.8 C23 56.6 15.5 49 15.5 38 V19.3 Z" fill="none" stroke="${s}" stroke-width=".7" opacity=".7"/>
      <path d="M26 7.5 L28.6 3 L32 6 L35.4 3 L38 7.5" fill="none" stroke="${s}" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M40.5 25.5 C38 21.2 26.5 21 25.8 28 C25.2 34.6 38.9 33.8 38.6 41.5 C38.3 48.6 26.6 48.5 23.4 43.6" fill="none" stroke="${s}" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M41.2 25 L44 22.4 M23 44.3 L20.2 46.8" stroke="${s}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M32 53.5 l1.6 2.2 -1.6 2.2 -1.6 -2.2z" fill="${s}"/>
    </svg>`;
  }
  function wordmark(opts = {}) {
    // Custom wordmark: Cormorant caps with a cut A crossbar and wide tracking.
    const c = opts.color || "currentColor";
    return `<svg class="wm ${opts.cls || ""}" viewBox="0 0 300 34" aria-label="SHAURYA" role="img">
      <text x="150" y="27" text-anchor="middle" font-family="Cormorant Garamond, serif" font-weight="600" font-size="31" letter-spacing="13" fill="${c}">SHAURYA</text>
    </svg>`;
  }

  /* ---------- Product illustrations (static fallbacks & thumbnails) ---------- */
  function beltSVG(p, o = {}) {
    const L = D.LEATHER, M = D.METAL;
    const lk = o.leather || (p.leather && p.leather[0]) || "black";
    const strap = lk === "reverso" ? "#141210" : (L[lk] ? L[lk].hex : "#141210");
    const under = lk === "reverso" ? "#3b2414" : shade(strap, -10);
    const metal = (M[o.metal || p.metal] || M.silver).hex;
    const id = "b" + Math.random().toString(36).slice(2, 7);
    const w = { classic: 26, heritage: 32, urban: 34, reverso: 29, signature: 31, personal: 30 }[p.id] || 30;
    let buckle;
    if (p.id === "urban") buckle = `<rect x="120" y="${60 - w / 2 - 5}" width="64" height="${w + 10}" rx="4" fill="url(#m${id})"/><path d="M130 ${60 - w / 2} v${w} M136 ${60 - w / 2} v${w}" stroke="#0006"/>`;
    else if (p.id === "signature" || p.id === "personal") buckle = `<rect x="118" y="${60 - w / 2 - 8}" width="70" height="${w + 16}" rx="10" fill="url(#m${id})"/><text x="153" y="${66}" font-family="Cormorant Garamond,serif" font-size="18" text-anchor="middle" fill="#0007">${p.id === "personal" ? esc(o.text || "AK") : "S"}</text>`;
    else if (p.id === "heritage") buckle = `<path d="M124 ${60 - w / 2 - 8} q30 -12 60 0 v${w + 16} q-30 12 -60 0z" fill="none" stroke="url(#m${id})" stroke-width="7"/>`;
    else buckle = `<rect x="128" y="${60 - w / 2 - 5}" width="46" height="${w + 10}" rx="${p.id === "classic" ? 3 : 6}" fill="none" stroke="url(#m${id})" stroke-width="5"/><rect x="128" y="58.5" width="40" height="3" rx="1.5" fill="url(#m${id})"/>`;
    return `<svg viewBox="0 0 320 120" aria-hidden="true">
      <defs>
        <linearGradient id="l${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(strap, 14)}"/><stop offset=".5" stop-color="${strap}"/><stop offset="1" stop-color="${shade(strap, -12)}"/></linearGradient>
        <linearGradient id="m${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(metal, 30)}"/><stop offset=".5" stop-color="${metal}"/><stop offset="1" stop-color="${shade(metal, -35)}"/></linearGradient>
      </defs>
      <rect x="10" y="${60 - w / 2 + 4}" width="140" height="${w}" rx="3" fill="${under}"/>
      <rect x="10" y="${60 - w / 2}" width="${p.id === "urban" ? 290 : 296}" height="${w}" rx="${p.id === "urban" ? 2 : w / 2}" fill="url(#l${id})"/>
      ${p.id === "heritage" || p.id === "signature" ? `<path d="M14 ${60 - w / 2 + 4} H296 M14 ${60 + w / 2 - 4} H296" stroke="${p.id === "heritage" ? "#c9a46a" : "#0009"}" stroke-dasharray="4 3" stroke-width="1"/>` : ""}
      ${p.id === "urban" ? "" : [210, 232, 254].map(x => `<circle cx="${x}" cy="60" r="2.6" fill="#000a"/>`).join("")}
      ${buckle}
    </svg>`;
  }
  function walletSVG(p, o = {}) {
    const lk = o.leather || (p.leather && p.leather[0]) || "black";
    const c = (D.LEATHER[lk] || D.LEATHER.black).hex;
    const tall = p.id === "long";
    const slim = p.id === "slim";
    const W = tall ? 220 : slim ? 130 : 150, H = tall ? 110 : slim ? 92 : 120;
    const x = (300 - W) / 2, y = (160 - H) / 2;
    return `<svg viewBox="0 0 300 160" aria-hidden="true">
      <rect x="${x}" y="${y}" width="${W}" height="${H}" rx="${slim ? 8 : 6}" fill="${c}"/>
      <rect x="${x + 6}" y="${y + 6}" width="${W - 12}" height="${H - 12}" rx="4" fill="none" stroke="#ffffff22" stroke-dasharray="3 3"/>
      ${slim ? `<path d="M${x + 6} ${y + 34} H${x + W - 6} M${x + 6} ${y + 50} H${x + W - 6}" stroke="#0006"/>` : ""}
      ${tall ? `<circle cx="${x + W - 16}" cy="${y + H / 2}" r="5" fill="#b08d57"/>` : ""}
      <text x="150" y="${y + H / 2 + 6}" font-family="Cormorant Garamond,serif" font-size="18" text-anchor="middle" fill="#b08d57aa">${p.personal ? esc(o.text || "S") : "S"}</text>
    </svg>`;
  }
  function giftSVG() {
    return `<svg viewBox="0 0 300 200" aria-hidden="true">
      <rect x="70" y="70" width="160" height="100" fill="#141210" stroke="#b08d5755"/>
      <rect x="62" y="56" width="176" height="28" fill="#1b1713" stroke="#b08d5788"/>
      <rect x="144" y="56" width="12" height="114" fill="#b08d57"/>
      <path d="M150 56 c-30 -30 -50 -6 -20 0 M150 56 c30 -30 50 -6 20 0" fill="none" stroke="#d8bd85" stroke-width="5"/>
    </svg>`;
  }
  function thumbFor(p, o) {
    if (p.image) return `<img src="${p.image}" alt="" style="width:100%;height:100%;object-fit:contain">`;
    if (p.category === "belts") return beltSVG(p, o);
    if (p.category === "wallets") return walletSVG(p, o);
    return giftSVG(p, o);
  }
  function shade(hex, amt) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.max(0, Math.min(255, v + Math.round(2.55 * amt)));
    return "#" + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, "0")).join("");
  }

  /* ---------- Shell ---------- */
  const NAV = [
    ["collection.html", "Belts"],
    ["studio.html", "Personalise"],
    ["leather.html", "Leather"],
    ["gifting.html", "Gifting"],
    ["magnetic.html", "Magnetic"],
    ["invest.html", "Investors"]
  ];
  const ICON = {
    search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M3 8h18M3 16h18"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'
  };

  function renderShell() {
    const here = location.pathname.split("/").pop() || "index.html";
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `<div class="wrap">
      <a class="brand-lockup" href="index.html" aria-label="SHAURYA home">${emblem({ gradient: true })}${wordmark({ color: "#f2ebdf" })}</a>
      <nav class="nav" aria-label="Primary">${NAV.map(([h, t]) => `<a href="${h}" ${h === here ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
      <div class="header-actions">
        <a class="icon-btn" href="shop.html" aria-label="Search the shop">${ICON.search}</a>
        <a class="icon-btn" href="account.html" aria-label="Your account">${ICON.user}</a>
        <button class="icon-btn" data-cart-open aria-label="Open bag">${ICON.bag}<span class="cart-count" data-n="0">0</span></button>
        <button class="icon-btn menu-btn" data-menu aria-label="Open menu">${ICON.menu}</button>
      </div></div>`;
    document.body.prepend(header);

    const mobile = document.createElement("div");
    mobile.className = "mobile-nav";
    mobile.setAttribute("aria-hidden", "true");
    mobile.innerHTML = `<button class="icon-btn close" data-menu-close aria-label="Close menu">${ICON.close}</button>
      ${[["index.html", "Home"], ...NAV, ["shop.html", "Shop all"], ["brand.html", "Brand"], ["support.html", "Support"], ["account.html", "Account"], ["cart.html", "Bag & checkout"]].map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}
      <p class="deva gold" style="margin-top:32px;font-size:28px">शौर्य</p>`;
    document.body.append(mobile);

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `<div class="wrap">
      <div class="footer-grid">
        <div class="stack">
          <a class="brand-lockup" href="index.html">${emblem({ gradient: true })}${wordmark({ color: "#f2ebdf" })}</a>
          <p class="muted small" style="max-width:34ch">शौर्य — courage, valour, strength. Indian roots. Modern craftsmanship. Individual identity.</p>
          <p class="eyebrow">Courage in every detail.</p>
        </div>
        <div><h4>Shop</h4>
          <a href="collection.html">Signature belts</a><a href="studio.html">Personalisation studio</a>
          <a href="leather.html">Leather wallets</a><a href="gifting.html">Gifting</a><a href="shop.html">Shop all</a></div>
        <div><h4>House</h4>
          <a href="index.html#story">Our story</a><a href="magnetic.html">Magnetic belt (concept)</a>
          <a href="invest.html">Investors</a><a href="brand.html">Brand identity</a></div>
        <div><h4>Help</h4>
          <a href="support.html#contact">Contact</a><a href="support.html#shipping">Shipping</a>
          <a href="support.html#returns">Returns & refunds</a><a href="support.html#sizes">Size guide</a><a href="account.html">Your account</a><a href="admin.html">Admin</a></div>
      </div>
      <div class="footer-base"><span>© ${new Date().getFullYear()} SHAURYA. Designed in India.</span><span>Prices in INR, inclusive of GST.</span></div>
    </div>`;
    document.body.append(footer);

    const veil = document.createElement("div");
    veil.className = "veil";
    veil.innerHTML = emblem({ gradient: true });
    document.body.append(veil);

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.append(toast);

    // Cart drawer
    const drawer = document.createElement("aside");
    drawer.className = "drawer";
    drawer.setAttribute("aria-label", "Shopping bag");
    drawer.innerHTML = `<div class="drawer-head"><span class="eyebrow">Your bag</span><button class="icon-btn" data-cart-close aria-label="Close bag">${ICON.close}</button></div>
      <div class="drawer-body" data-cart-lines></div>
      <div class="drawer-foot stack"><div class="row" style="justify-content:space-between"><span class="label">Subtotal</span><span class="price" data-cart-total>₹0</span></div>
      <a class="btn btn--solid btn--block" href="cart.html#checkout">Checkout</a></div>`;
    const scrim = document.createElement("div");
    scrim.className = "drawer-scrim";
    document.body.append(drawer, scrim);

    // Interactions
    const onScroll = () => header.classList.toggle("is-solid", scrollY > 30);
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    $("[data-menu]").addEventListener("click", () => { mobile.classList.add("is-open"); mobile.setAttribute("aria-hidden", "false"); });
    $("[data-menu-close]").addEventListener("click", () => { mobile.classList.remove("is-open"); mobile.setAttribute("aria-hidden", "true"); });
    $("[data-cart-open]").addEventListener("click", openCart);
    $("[data-cart-close]").addEventListener("click", closeCart);
    scrim.addEventListener("click", closeCart);
    addEventListener("keydown", e => { if (e.key === "Escape") { closeCart(); mobile.classList.remove("is-open"); } });
  }

  /* ---------- Cart ---------- */
  const CART_KEY = "shaurya.cart";
  const cart = {
    items() { return store.get(CART_KEY, []); },
    save(items) { store.set(CART_KEY, items); renderCart(); document.dispatchEvent(new CustomEvent("cart:change")); },
    add(item) {
      const items = cart.items();
      const key = JSON.stringify([item.id, item.options || {}]);
      const existing = !item.unique && items.find(i => JSON.stringify([i.id, i.options || {}]) === key);
      if (existing) existing.qty += item.qty || 1;
      else items.push({ line: uid("L"), qty: 1, ...item });
      cart.save(items);
    },
    setQty(line, qty) {
      let items = cart.items();
      items = items.map(i => i.line === line ? { ...i, qty } : i).filter(i => i.qty > 0);
      cart.save(items);
    },
    clear() { cart.save([]); },
    total() { return cart.items().reduce((s, i) => s + i.price * i.qty, 0); },
    count() { return cart.items().reduce((s, i) => s + i.qty, 0); }
  };
  function optionText(o = {}) {
    const L = D.LEATHER, M = D.METAL;
    const parts = [];
    if (o.leather) parts.push(L[o.leather] ? L[o.leather].name : o.leather);
    if (o.metal) parts.push(M[o.metal] ? M[o.metal].name : o.metal);
    if (o.size) parts.push("Waist " + o.size + '"');
    if (o.text) parts.push("“" + o.text + "”");
    if (o.packaging) parts.push(o.packaging);
    if (o.occasion) parts.push(o.occasion);
    if (o.design) parts.push("Custom design " + o.design);
    return parts.join(" · ");
  }
  function renderCart() {
    const n = cart.count();
    $$(".cart-count").forEach(el => { el.textContent = n; el.dataset.n = n; });
    const lines = $("[data-cart-lines]");
    if (!lines) return;
    const items = cart.items();
    lines.innerHTML = items.length ? items.map(i => {
      const p = D.byId[i.id] || { category: "gifts" };
      return `<div class="line-item">
        <div class="thumb">${thumbFor(p, i.options || {})}</div>
        <div><div style="font-weight:600;font-size:14px">${esc(i.name)}</div><div class="muted small">${esc(optionText(i.options))}</div>
          <div class="qty" style="margin-top:8px"><button data-q="${i.line}" data-d="-1" aria-label="Decrease">−</button><span>${i.qty}</span><button data-q="${i.line}" data-d="1" aria-label="Increase">+</button></div></div>
        <div class="small">${inr(i.price * i.qty)}</div></div>`;
    }).join("") : `<p class="muted" style="padding:40px 0">Your bag is empty.</p><a class="link" href="shop.html">Explore the collection</a>`;
    $("[data-cart-total]").textContent = inr(cart.total());
    $$("[data-q]", lines).forEach(b => b.addEventListener("click", () => {
      const it = cart.items().find(i => i.line === b.dataset.q);
      if (it) cart.setQty(it.line, it.qty + Number(b.dataset.d));
    }));
  }
  function openCart() { renderCart(); $(".drawer").classList.add("is-open"); $(".drawer-scrim").classList.add("is-open"); }
  function closeCart() { const d = $(".drawer"); if (!d) return; d.classList.remove("is-open"); $(".drawer-scrim").classList.remove("is-open"); }

  let toastTimer;
  function toast(html, ms = 3200) {
    const t = $(".toast");
    t.innerHTML = html;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-on"), ms);
  }
  function addToCart(item, { buyNow = false } = {}) {
    cart.add(item);
    if (buyNow) { location.href = "cart.html#checkout"; return; }
    toast(`Added — ${esc(item.name)} <a href="#" data-open-bag>View bag</a>`);
    const a = $("[data-open-bag]");
    if (a) a.addEventListener("click", e => { e.preventDefault(); openCart(); });
  }

  /* ---------- Forms ----------
     Without a configured endpoint, submissions are kept on this device
     (demo mode). With CFG.formEndpoint they are POSTed as multipart. */
  async function submitForm(type, data, files = []) {
    const record = { id: uid(type.slice(0, 3).toUpperCase() + "-"), type, at: new Date().toISOString(), ...data };
    if (CFG.formEndpoint) {
      const fd = new FormData();
      fd.append("_type", type);
      Object.entries(record).forEach(([k, v]) => fd.append(k, typeof v === "object" ? JSON.stringify(v) : v));
      files.forEach(f => fd.append("attachment", f, f.name));
      const res = await fetch(CFG.formEndpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Submission failed (" + res.status + ")");
      return { ...record, remote: true };
    }
    const all = store.get("shaurya.submissions", []);
    all.push(record);
    store.set("shaurya.submissions", all.slice(-100));
    return { ...record, remote: false };
  }
  function bindForm(form, type, opts = {}) {
    const status = form.querySelector(".form-status");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const data = {};
      for (const [k, v] of fd.entries()) {
        if (v instanceof File) continue;
        data[k] = data[k] ? [].concat(data[k], v) : v;
      }
      const btn = form.querySelector("[type=submit]");
      btn && (btn.disabled = true);
      try {
        const extra = opts.extra ? opts.extra() : {};
        const r = await submitForm(type, { ...data, ...extra }, opts.files ? opts.files() : []);
        if (status) {
          status.style.color = "";
          status.textContent = (opts.success || "Thank you — we will be in touch.") + " Reference: " + r.id + (r.remote ? "" : " (demo mode: saved on this device only)");
        }
        form.reset();
        opts.after && opts.after(r);
      } catch (err) {
        if (status) { status.style.color = "var(--danger)"; status.textContent = err.message; }
      } finally { btn && (btn.disabled = false); }
    });
  }

  /* ---------- Reveal & split ---------- */
  function initReveal() {
    $$("[data-split]").forEach(el => {
      const lines = el.innerHTML.split(/<br\s*\/?>/i);
      el.innerHTML = lines.map((l, i) => `<span class="split-line"><span style="--d:${0.1 + i * 0.12}s">${l}</span></span>`).join("");
      el.setAttribute("data-reveal", "fade");
    });
    observeReveal(document);
  }
  let revealIO;
  function observeReveal(root) {
    if (!revealIO) revealIO = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); revealIO.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    $$("[data-reveal]:not(.is-in)", root).forEach(el => revealIO.observe(el));
  }

  /* ---------- Page transitions ---------- */
  function initTransitions() {
    requestAnimationFrame(() => document.body.classList.add("is-loaded"));
    addEventListener("pageshow", e => { if (e.persisted) document.body.classList.remove("is-leaving"); });
    document.addEventListener("click", e => {
      const a = e.target.closest("a[href]");
      if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || /^https?:/.test(href)) return;
      const url = new URL(href, location.href);
      if (url.pathname === location.pathname) return; // hash-only nav on same page
      e.preventDefault();
      document.body.classList.add("is-leaving");
      setTimeout(() => { location.href = url.href; }, 320);
    });
  }

  /* ---------- Motion layer ----------
     Scroll progress line, magnetic buttons, card tilt and parallax.
     All skipped for reduced-motion users; hover effects only on fine pointers. */
  function initMotion() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    document.body.append(bar);
    const para = $$("[data-parallax]");
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
        para.forEach(el => {
          const r = el.getBoundingClientRect();
          const k = (r.top + r.height / 2 - innerHeight / 2) * Number(el.dataset.parallax || 0.1);
          el.style.transform = `translate3d(0, ${-k}px, 0)`;
        });
        ticking = false;
      });
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    if (!matchMedia("(pointer: fine)").matches) return;
    document.addEventListener("pointermove", e => {
      const b = e.target.closest(".btn--solid, .btn");
      if (b && !b.disabled) {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.12}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
        b.dataset.mag = "1";
      }
      $$("[data-mag]").forEach(x => { if (x !== b) { x.style.transform = ""; delete x.dataset.mag; } });
      const c = e.target.closest(".product-card");
      if (c) {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
        c.dataset.tilt = "1";
      }
      $$("[data-tilt]").forEach(x => { if (x !== c) { x.style.transform = ""; delete x.dataset.tilt; } });
    }, { passive: true });
  }

  /* ---------- Option button groups ---------- */
  function pressGroup(container, onChange) {
    container.addEventListener("click", e => {
      const b = e.target.closest("[aria-pressed]");
      if (!b || !container.contains(b)) return;
      $$("[aria-pressed]", container).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      onChange && onChange(b.dataset.value, b);
    });
  }

  window.SH = { $, $$, store, inr, esc, uid, emblem, wordmark, beltSVG, walletSVG, giftSVG, thumbFor, shade, cart, addToCart, openCart, toast, submitForm, bindForm, pressGroup, optionText, observeReveal, auth, assets, hash };

  document.addEventListener("DOMContentLoaded", () => {
    renderShell();
    renderCart();
    initReveal();
    initTransitions();
    initMotion();
  });
})();
