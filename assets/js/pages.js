/* =========================================================
   SHAURYA — page behaviours (selected by <body data-page="...">)
   ========================================================= */
(function () {
  const { $, $$, inr, esc, store, addToCart, pressGroup, bindForm, toast } = window.SH;
  const D = window.SHAURYA_DATA;
  const has3D = window.SH3D && SH3D.hasWebGL;

  /* ---------- Shared: static fallback inside a stage ---------- */
  function fallback(stageEl, html) {
    let f = stageEl.querySelector(".fallback");
    if (!f) { f = document.createElement("div"); f.className = "fallback"; stageEl.append(f); }
    f.innerHTML = html;
  }

  /* ---------- Shared: admin-uploaded GLB models ----------
     If a .glb was uploaded for a product in admin.html, it replaces the
     procedural model in the viewer. */
  let gltfP;
  function gltfLoader() {
    return gltfP || (gltfP = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/three@0.149.0/examples/js/loaders/GLTFLoader.js";
      s.onload = () => res(new THREE.GLTFLoader()); s.onerror = rej;
      document.head.append(s);
    }));
  }
  async function customModel(id) {
    if (!has3D) return null;
    const blob = await SH.assets.get("model:" + id);
    if (!blob) return null;
    try {
      const loader = await gltfLoader();
      const gltf = await new Promise((res, rej) => loader.parse(blob instanceof ArrayBuffer ? blob : null, "", res, rej));
      const g = gltf.scene;
      const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      g.position.sub(c);
      const wrap = new THREE.Group(); wrap.add(g); wrap.scale.setScalar(2.6 / Math.max(size.x, size.y, size.z, 1e-3));
      return wrap;
    } catch (e) { console.warn("Custom model failed to load", e); return null; }
  }

  /* ---------- Shared: product option panel ---------- */
  function optionPanel(el, p, o = {}) {
    const state = { leather: (p.leather || [])[0], size: o.noSize ? null : "34", text: "" };
    const swatches = (p.leather || []).map((k, i) => {
      const L = D.LEATHER[k];
      return `<button class="swatch" style="--c:${L.hex}" data-value="${k}" aria-pressed="${i === 0}" aria-label="${L.name}" title="${L.name}"></button>`;
    }).join("");
    el.innerHTML = `<div class="stack">
      <span class="eyebrow">${p.no ? (p.category === "belts" ? "Belt " : "Wallet ") + p.no : "Gift"}</span>
      <h2 class="h2">${esc(p.name)}</h2>
      <p class="gold italic" style="font-family:var(--serif);font-size:22px;margin-top:6px">${esc(p.line)}</p>
      <p class="muted">${esc(p.desc)}</p>
      <div class="price">${p.from ? "From " : ""}${inr(p.price)}<small>incl. GST</small></div>
      ${p.leather && p.leather.length ? `<div class="field"><span class="label">Colour — <span data-cname>${D.LEATHER[state.leather].name}</span></span><div class="swatches" data-sw>${swatches}</div></div>` : ""}
      ${state.size ? `<div class="field"><span class="label">Waist size (inches)</span><div class="chips" data-sizes>${D.SIZES.map(s => `<button class="chip" data-value="${s}" aria-pressed="${s === "34"}">${s}</button>`).join("")}</div><a class="link" style="align-self:flex-start" href="support.html#sizes">Size guide</a></div>` : ""}
      ${p.personal ? `<div class="field"><label for="pt-${p.id}">${p.category === "belts" ? "Engraving text" : "Initials (up to 3)"}</label><input class="input" id="pt-${p.id}" maxlength="${p.category === "belts" ? 18 : 3}" placeholder="${p.category === "belts" ? "e.g. ARJUN" : "e.g. AK"}" data-text></div>
        <p class="form-note">The preview approximates the finished piece. All personalisation is reviewed before production.</p>` : ""}
      ${p.stock <= 0 ? `<p class="status bad">Out of stock</p>` : p.stock <= 5 ? `<p class="status warn">Only ${p.stock} left</p>` : ""}
      <div class="row"><button class="btn btn--solid" data-add ${p.stock <= 0 ? "disabled" : ""}>Add to bag</button><button class="btn" data-buy ${p.stock <= 0 ? "disabled" : ""}>Buy now</button></div>
      ${p.specs ? `<ul class="spec-list">${p.specs.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
    </div>`;
    const sw = $("[data-sw]", el);
    sw && pressGroup(sw, v => { state.leather = v; $("[data-cname]", el).textContent = D.LEATHER[v].name; o.onLeather && o.onLeather(v); });
    const sz = $("[data-sizes]", el);
    sz && pressGroup(sz, v => (state.size = v));
    const tx = $("[data-text]", el);
    tx && tx.addEventListener("input", () => { state.text = tx.value.trim().toUpperCase(); o.onText && o.onText(state.text); });
    const go = buyNow => {
      if (p.personal && !state.text) { tx.focus(); toast("Please enter your personalisation text."); return; }
      const options = {};
      if (state.leather) options.leather = state.leather;
      if (state.size) options.size = state.size;
      if (state.text) options.text = state.text;
      if (p.metal) options.metal = p.metal;
      addToCart({ id: p.id, name: p.name, price: p.price, options }, { buyNow });
    };
    $("[data-add]", el).addEventListener("click", () => go(false));
    $("[data-buy]", el).addEventListener("click", () => go(true));
    return state;
  }

  /* ======================= HOME ======================= */
  function home() {
    // Hero
    const heroEl = $("#hero-stage");
    fallback(heroEl, SH.beltSVG(D.belts[4]));
    if (has3D) {
      const hero = SH3D.stage(heroEl, { dist: 4.4, pitch: 0.45, yaw: -0.4, speed: 0.16, interactive: false, shadowY: -0.3, hint: false });
      hero.whenReady(() => {
        const b = SHM.belt("signature"); hero.add(b.group);
        // Cinematic entrance: belt rises and turns into place, camera pulls back
        b.group.position.y = -0.6; b.group.scale.setScalar(0.7); hero.dist = 2.6;
        SH3D.tween(0, 1, 2.6, k => { b.group.position.y = -0.6 * (1 - k); b.group.scale.setScalar(0.7 + 0.3 * k); b.group.rotation.y = (1 - k) * -2.2; }, SH3D.ease.out);
      });
      hero.onFrame.push(() => {
        const k = Math.min(1.5, scrollY / innerHeight);
        hero.tDist = 4.4 + k * 1.6; hero.tPitch = 0.45 + k * 0.35;
        hero.tTarget.x = innerWidth > 900 ? -0.9 : 0; hero.tTarget.y = innerWidth > 900 ? 0 : -0.35;
      });
    }

    // Six belts
    const bEl = $("#belts-stage");
    let current = "classic";
    const panel = $("#belt-panel");
    const showPanel = id => {
      const p = D.byId[id];
      panel.innerHTML = `<span class="eyebrow">Belt ${p.no} · ${p.style}</span><h3 class="h2" style="margin-top:14px">${p.name}</h3>
        <p class="muted" style="margin:14px 0 22px">${esc(p.desc)}</p>
        <div class="row" style="justify-content:space-between"><span class="price">${inr(p.price)}</span><a class="link" href="collection.html#${p.id}">View in 3D showroom</a></div>`;
    };
    const list = $("#belt-list");
    list.innerHTML = D.belts.map((p, i) => `<button class="pick" data-value="${p.id}" aria-pressed="${i === 0}"><span class="n">${p.no}</span><span class="t">${p.name.replace("SHAURYA ", "")}</span><span class="p">${inr(p.price)}</span></button>`).join("");
    showPanel(current);
    fallback(bEl, SH.beltSVG(D.byId.classic));
    let bStage, cache = {};
    if (has3D) {
      bStage = SH3D.stage(bEl, { dist: 4.6, pitch: 0.4, speed: 0.3, shadowY: -0.28 });
      SH3D.controls(bStage, { views: ["front", "side", "top"] });
      bStage.whenReady(() => show("classic"));
    }
    function show(id) {
      current = id; showPanel(id);
      if (!bStage) return fallback(bEl, SH.beltSVG(D.byId[id]));
      Object.values(cache).forEach(b => (b.group.visible = false));
      if (!cache[id]) { cache[id] = SHM.belt(id); bStage.add(cache[id].group); }
      cache[id].group.visible = true;
    }
    pressGroup(list, show);

    // Studio teaser
    const sEl = $("#studio-stage");
    fallback(sEl, SH.beltSVG(D.byId.personal, { text: "A K" }));
    if (has3D) {
      const st = SH3D.stage(sEl, { dist: 1.5, pitch: 0.12, yaw: 0, autoRotate: false, minDist: 0.7, maxDist: 4, shadow: false });
      SH3D.controls(st, { views: ["front", "three"] });
      let pb;
      st.whenReady(() => { pb = SHM.belt("personal", { text: "A K" }); st.add(pb.group); });
      st.onFrame.push(() => { if (pb) st.tTarget.copy(pb.buckleWorld()); });
      const inp = $("#teaser-text");
      inp.addEventListener("input", () => pb && pb.engraver.set({ text: inp.value.toUpperCase() || " ", progress: 1 }));
      $("#teaser-engrave").addEventListener("click", () => { if (!pb) return; pb.engraver.set({ text: inp.value.toUpperCase() || "A K", progress: 0 }); pb.engraver.animate(2.2); });
    }

    // Wallet
    const wEl = $("#wallet-stage");
    fallback(wEl, SH.walletSVG(D.wallets[0]));
    if (has3D) {
      const ws = SH3D.stage(wEl, { dist: 4.2, pitch: 0.1, yaw: 0.35, speed: 0.15, shadowY: -0.7 });
      let w;
      SH3D.controls(ws, { views: ["front", "back"], extra: [{ id: "open", label: "Open / close", onClick: () => w && SH3D.tween(w.open, w.open > 0.5 ? 0 : 1, 1.4, k => w.setOpen(k)) }] });
      ws.whenReady(() => { w = SHM.wallet("bifold", { leather: "#3b2414" }); ws.add(w.group); });
      new IntersectionObserver((es, io) => es.forEach(e => { if (e.isIntersecting && w) { SH3D.tween(0, 1, 1.8, k => w.setOpen(k)); io.disconnect(); } }), { threshold: 0.6 }).observe(wEl);
    }
    $("#wallet-cards").innerHTML = D.wallets.map(cardHTML).join("");

    // Gift
    const gEl = $("#gift-stage");
    fallback(gEl, SH.giftSVG());
    if (has3D) {
      const gs = SH3D.stage(gEl, { dist: 5.2, pitch: 0.55, yaw: 0.5, speed: 0.12, shadowY: -0.32 });
      let g;
      SH3D.controls(gs, { views: ["front", "top"], extra: [{ id: "o", label: "Open box", onClick: () => g && SH3D.tween(g.open, g.open > 0.5 ? 0 : 1, 2.2, k => g.setOpen(k)) }] });
      gs.whenReady(() => { g = SHM.giftBox({ contents: ["belt", "wallet", "keychain"] }); gs.add(g.group); });
    }

    // Magnetic teaser loop
    const mEl = $("#mag-stage");
    if (has3D) {
      const ms = SH3D.stage(mEl, { dist: 4, pitch: 0.2, yaw: 0, autoRotate: false, shadow: false, interactive: true });
      SH3D.controls(ms, { views: ["front", "side"] });
      let m;
      ms.whenReady(() => { m = SHM.magneticClosure(); ms.add(m.group); });
      ms.onFrame.push((dt, t) => {
        if (!m) return;
        const c = t % 6;
        m.sep = c < 1 ? 1.1 : c < 2.2 ? 1.1 * (1 - SH3D.ease.back((c - 1) / 1.2)) : c < 5 ? 0 : 1.1 * SH3D.ease.inOut(c - 5);
        m.sep = Math.max(0, m.sep); m.apply();
      });
    } else fallback(mEl, '<p class="muted center">3D preview unavailable on this device.</p>');

    bindForm($("#newsletter"), "newsletter", { success: "You're on the list." });
  }

  function cardHTML(p) {
    return `<a class="card product-card" href="${D.pageFor(p)}" data-reveal>
      <div class="thumb">${SH.thumbFor(p, {})}</div>
      <div class="meta"><div><h3>${esc(p.name)}</h3><div class="muted small">${esc(p.line)}</div></div><span>${p.from ? "From " : ""}${inr(p.price)}</span></div></a>`;
  }

  /* ======================= BELT SHOWROOM ======================= */
  function collection() {
    const el = $("#stage"), list = $("#list"), panel = $("#panel");
    list.innerHTML = D.belts.map(p => `<button class="pick" data-value="${p.id}" aria-pressed="false"><span class="n">${p.no}</span><span class="t">${p.name.replace("SHAURYA ", "")}</span><span class="p">${inr(p.price)}</span></button>`).join("");
    let st, cache = {}, cur, custom = null;
    if (has3D) {
      st = SH3D.stage(el, { dist: 4.6, pitch: 0.38, speed: 0.28, shadowY: -0.28, minDist: 1.2 });
      SH3D.controls(st, {
        views: ["front", "side", "back", "top"],
        extra: [
          { id: "buckle", label: "Buckle close-up", onClick: () => { const b = cache[cur]; st.view("front"); setTimeout(() => st.focus(b.buckleWorld(), 1.4), 300); } },
          { id: "reset", label: "Reset", onClick: () => { st.reset(); st.view("three"); } },
          { id: "rev", label: "Reverse belt", onClick: () => cache.reverso && cache.reverso.reverse() }
        ]
      });
    }
    const revBtn = () => $("[data-extra=rev]", el);
    function select(id) {
      if (!D.byId[id] || D.byId[id].category !== "belts") id = "classic";
      cur = id;
      $$(".pick", list).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === id)));
      const p = D.byId[id];
      optionPanel(panel, p, {
        onLeather: k => cache[id] && k !== "reverso" && cache[id].setLeather(D.LEATHER[k].hex),
        onText: t => cache[id] && cache[id].engraver && cache[id].engraver.set({ text: t || " ", progress: 1 })
      });
      if (id === "reverso") panel.querySelector(".stack").insertAdjacentHTML("beforeend", `<p class="notice"><strong>How it reverses:</strong> the buckle sits on a swivel clamp. Rotate the frame half a turn, turn the strap, and the brown face comes outside. Press “Reverse belt” on the viewer to watch it.</p>`);
      if (id === "personal") panel.querySelector(".stack").insertAdjacentHTML("beforeend", `<button class="btn btn--ghost" data-engrave>Preview engraving</button><a class="link" href="studio.html">Open the full personalisation studio</a>`);
      const eb = $("[data-engrave]", panel);
      eb && eb.addEventListener("click", () => { const b = cache.personal; if (!b) return; st.view("front"); st.focus(b.buckleWorld(), 1.3); b.engraver.set({ progress: 0 }); b.engraver.animate(2.4); });
      if (!st) return fallback(el, SH.beltSVG(p));
      st.whenReady(() => {
        Object.values(cache).forEach(b => (b.group.visible = false));
        if (custom) { st.pivot.remove(custom); custom = null; }
        if (!SHM.BELTS[id]) { // admin-added belt without its own geometry: base it on Classic
          const lk = (p.leather || ["black"])[0];
          const hex = D.LEATHER[lk] && D.LEATHER[lk].hex.startsWith("#") ? D.LEATHER[lk].hex : "#141210";
          cache[id] = cache[id] || SHM.belt("classic", { leather: hex });
          if (!cache[id].group.parent) st.add(cache[id].group);
        }
        if (!cache[id]) { cache[id] = SHM.belt(id, id === "personal" ? { text: "YOUR NAME" } : {}); st.add(cache[id].group); }
        cache[id].group.visible = true;
        st.reset();
        revBtn() && (revBtn().style.display = id === "reverso" ? "" : "none");
        customModel(id).then(g => { if (g && cur === id) { cache[id].group.visible = false; custom = g; st.add(g); } });
      });
      history.replaceState(null, "", "#" + id);
    }
    pressGroup(list, select);
    select(location.hash.slice(1) || "classic");
    addEventListener("hashchange", () => select(location.hash.slice(1)));
  }

  /* ======================= LEATHER ======================= */
  function leather() {
    const el = $("#stage"), list = $("#list"), panel = $("#panel");
    list.innerHTML = D.wallets.map(p => `<button class="pick" data-value="${p.id}" aria-pressed="false"><span class="n">${p.no}</span><span class="t">${p.name}</span><span class="p">${inr(p.price)}</span></button>`).join("");
    let st, cur, model;
    if (has3D) {
      st = SH3D.stage(el, { dist: 4, pitch: 0.1, speed: 0.2, shadowY: -0.75, minDist: 0.8 });
      SH3D.controls(st, {
        views: ["front", "back", "side"],
        extra: [
          { id: "open", label: "Open / close", onClick: () => model && SH3D.tween(model.open, model.open > 0.5 ? 0 : 1, 1.4, k => model.setOpen(k)) },
          { id: "tex", label: "Texture close-up", onClick: () => { st.view("front"); st.focus(new THREE.Vector3(0.2, 0.1, 0), 1.0); } },
          { id: "reset", label: "Reset", onClick: () => st.reset() }
        ]
      });
    }
    function build(id, hex, mono) {
      if (!st) return fallback(el, SH.walletSVG(D.byId[id], { text: mono }));
      st.whenReady(() => {
        st.clear();
        const kind = ["bifold", "slim", "long"].includes(id) ? id : "bifold";
        model = SHM.wallet(kind, { leather: hex, monogram: mono });
        st.add(model.group);
        SH3D.tween(0, 1, 1.4, k => model.setOpen(k));
        customModel(id).then(g => { if (g && cur === id) { st.clear(); model = null; st.add(g); } });
      });
    }
    function select(id) {
      if (!D.byId[id] || D.byId[id].category !== "wallets") id = "bifold";
      cur = id;
      $$(".pick", list).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === id)));
      const p = D.byId[id];
      let hex = D.LEATHER[p.leather[0]].hex, mono = id === "personalised-wallet" ? "AK" : "";
      optionPanel(panel, p, {
        noSize: true,
        onLeather: k => { hex = D.LEATHER[k].hex; build(id, hex, mono); },
        onText: t => { mono = t; model && model.setMonogram ? (model.setOpen(0), model.setMonogram(t)) : build(id, hex, mono); }
      });
      panel.querySelector(".price").insertAdjacentHTML("afterend", `<p class="muted small">Dimensions: ${p.dims}</p>`);
      build(id, hex, mono);
      history.replaceState(null, "", "#" + id);
    }
    pressGroup(list, select);
    select(location.hash.slice(1) || "bifold");
  }

  /* ======================= GIFTING ======================= */
  function gifting() {
    const el = $("#stage");
    let st, box;
    const form = $("#gift-form");
    const sel = { product: "trio", packaging: "signature", occasion: "birthday" };
    $("#gift-products").innerHTML = D.gifts.map((p, i) => `<button class="pick" data-value="${p.id}" aria-pressed="${i === 2}"><span class="n">0${i + 1}</span><span class="t">${p.name}</span><span class="p">${p.from ? "from " : ""}${inr(p.price)}</span></button>`).join("");
    $("#packaging").innerHTML = D.PACKAGING.map((x, i) => `<button class="chip" data-value="${x.id}" aria-pressed="${i === 0}">${x.name}${x.price ? " +" + inr(x.price) : ""}</button>`).join("");
    $("#occasion").innerHTML = Object.entries(D.OCCASIONS).map(([k, v], i) => `<button class="chip" data-value="${k}" aria-pressed="${i === 0}">${v}</button>`).join("");
    if (has3D) {
      st = SH3D.stage(el, { dist: 5.2, pitch: 0.6, yaw: 0.4, speed: 0.12, shadowY: -0.32 });
      SH3D.controls(st, { views: ["front", "top"], extra: [{ id: "o", label: "Open / close", onClick: () => box && SH3D.tween(box.open, box.open > 0.5 ? 0 : 1, 2.4, k => box.setOpen(k)) }] });
    } else fallback(el, SH.giftSVG());
    function build() {
      const p = D.byId[sel.product];
      $("#gift-info").innerHTML = `<h3 class="h3">${p.name}</h3><p class="muted">${esc(p.desc)}</p><p class="price">${p.from ? "From " : ""}${inr(p.price)}</p>`;
      $("#gift-personal").style.display = p.personal ? "" : "none";
      if (!st) return;
      st.whenReady(() => {
        st.clear();
        box = SHM.giftBox({ style: sel.packaging, contents: p.contents, personal: p.personal });
        st.add(box.group);
        setTimeout(() => SH3D.tween(0, 1, 2.6, k => box.setOpen(k)), 500);
      });
    }
    pressGroup($("#gift-products"), v => { sel.product = v; build(); });
    pressGroup($("#packaging"), v => { sel.packaging = v; build(); });
    pressGroup($("#occasion"), v => (sel.occasion = v));
    const h = location.hash.slice(1);
    if (D.byId[h] && D.byId[h].category === "gifts") { sel.product = h; $$("#gift-products .pick").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === h))); }
    build();
    form.addEventListener("submit", e => {
      e.preventDefault();
      const p = D.byId[sel.product], pk = D.PACKAGING.find(x => x.id === sel.packaging);
      const text = form.engrave.value.trim().toUpperCase();
      if (p.personal && !text) { form.engrave.focus(); return toast("Please add the engraving text."); }
      addToCart({
        id: p.id, name: p.name, price: p.price + pk.price, unique: true,
        options: { packaging: pk.name, occasion: D.OCCASIONS[sel.occasion], text: text || undefined, message: form.message.value.trim() || undefined }
      }, { buyNow: e.submitter && e.submitter.dataset.buy != null });
    });
  }

  /* ======================= MAGNETIC ======================= */
  function magnetic() {
    const COLORS = { black: "#141210", brown: "#3b2414", tan: "#8a5530", navy: "#161c2a", oxblood: "#4a1418" };
    const lEl = $("#loop-stage"), cEl = $("#closure-stage");
    if (!has3D) { fallback(lEl, '<p class="muted center">3D preview unavailable.</p>'); fallback(cEl, '<p class="muted center">3D preview unavailable.</p>'); return; }
    const ls = SH3D.stage(lEl, { dist: 4.4, pitch: 0.4, speed: 0.25, shadowY: -0.25 });
    SH3D.controls(ls, { views: ["front", "side", "back"] });
    let loop;
    ls.whenReady(() => { loop = SHM.magneticLoop(); ls.add(loop); });
    $("#mag-colors").innerHTML = Object.entries(COLORS).map(([k, v], i) => `<button class="swatch" style="--c:${v}" data-value="${k}" aria-pressed="${i === 0}" title="${k}"></button>`).join("");

    const cs = SH3D.stage(cEl, { dist: 4.2, pitch: 0.15, yaw: 0, autoRotate: false, shadow: false, views: { rear: [Math.PI, 0.1] } });
    let m, busy = false;
    cs.whenReady(() => { m = SHM.magneticClosure(); cs.add(m.group); });
    pressGroup($("#mag-colors"), k => { loop && loop.userData.setLeather(COLORS[k]); m && m.setLeather(COLORS[k]); });
    const run = async (fn) => { if (busy || !m) return; busy = true; await fn(); busy = false; };
    SH3D.controls(cs, {
      views: ["front", "side", "back"],
      extra: [
        { id: "join", label: "Join ends", onClick: () => run(async () => { m.explode = 0; m.xray = 0; m.sep = 1.1; m.apply(); await SH3D.tween(1.1, 0, 1.6, v => { m.sep = Math.max(0, v); m.apply(); }, SH3D.ease.back); }) },
        { id: "apart", label: "Separate", onClick: () => run(() => SH3D.tween(m.sep, 1.1, 1.2, v => { m.sep = v; m.apply(); })) },
        { id: "xray", label: "X-ray", onClick: () => run(() => SH3D.tween(m.xray, m.xray > 0.5 ? 0 : 1, 0.8, v => { m.xray = v; m.apply(); })) },
        { id: "explode", label: "Exploded view", onClick: () => run(() => SH3D.tween(m.explode, m.explode > 0.5 ? 0 : 1, 1.6, v => { m.explode = v; m.apply(); })) }
      ]
    });
    bindForm($("#early-form"), "early-access", { success: "You're registered for early access." });
  }

  /* ======================= STUDIO ======================= */
  function studio() {
    const MODELS = { personal: "Personal plate", signature: "Signature plaque", urban: "Urban track" };
    const COLORS = { black: "#141210", brown: "#3b2414", tan: "#8a5530", oxblood: "#4a1418", navy: "#161c2a", matte: "#1c1c1d" };
    const MATERIALS = { smooth: "Smooth full-grain", croc: "Croc-embossed", pebble: "Pebble grain", saffiano: "Saffiano", matte: "Matte" };
    const FINISH = { silver: "Silver", matteblack: "Matte black", gold: "Gold", gunmetal: "Gunmetal" };
    const FONTS = { roman: "Roman capitals", serif: "Classic italic", sans: "Modern sans", script: "Script", deva: "देवनागरी" };
    const STYLES = { deep: "Deep engrave", laser: "Fine laser etch", relief: "Raised relief", outline: "Outline" };
    const def = { model: "personal", color: "black", material: "smooth", finish: "silver", text: "", font: "roman", style: "deep", notes: "", logo: null, logoName: "" };
    let d = { ...def };
    let logoFile = null;

    const chips = (id, map, key) => {
      const el = $(id);
      el.innerHTML = Object.entries(map).map(([k, v]) => `<button class="chip" data-value="${k}" aria-pressed="${d[key] === k}">${v}</button>`).join("");
      pressGroup(el, v => { d[key] = v; update(key); });
    };
    const swatchesHTML = () => {
      const el = $("#s-color");
      el.innerHTML = Object.entries(COLORS).map(([k, v]) => `<button class="swatch" style="--c:${v}" data-value="${k}" aria-pressed="${d.color === k}" title="${k}"></button>`).join("");
    };
    function renderControls() {
      chips("#s-model", MODELS, "model"); swatchesHTML(); chips("#s-material", MATERIALS, "material");
      chips("#s-finish", FINISH, "finish"); chips("#s-font", FONTS, "font"); chips("#s-style", STYLES, "style");
      $("#s-text").value = d.text; $("#s-notes").value = d.notes;
      $("#s-logo-name").textContent = d.logoName || "No file chosen";
    }
    pressGroup($("#s-color"), v => { d.color = v; update("color"); });

    const el = $("#stage");
    let st, belt, logoImg = null;
    if (has3D) {
      st = SH3D.stage(el, { dist: 1.4, pitch: 0.1, yaw: 0, autoRotate: false, shadow: false, minDist: 0.6, maxDist: 6 });
      SH3D.controls(st, { views: ["front", "three", "side"], extra: [{ id: "full", label: "Full belt", onClick: () => { st.focus(new THREE.Vector3(), 4.6); follow = false; } }, { id: "close", label: "Buckle", onClick: () => { follow = true; st.tDist = 1.4; st.view("front"); } }, { id: "eng", label: "Engrave", onClick: () => belt && belt.engraver && (belt.engraver.set({ progress: 0 }), belt.engraver.animate(2.4)) }] });
    } else fallback(el, SH.beltSVG(D.byId.personal));
    let follow = true;
    st && st.onFrame.push(() => { if (belt && follow) st.tTarget.copy(belt.buckleWorld()); });

    function rebuild() {
      if (!st) return fallback(el, SH.beltSVG(D.byId.personal, { text: d.text }));
      st.whenReady(() => {
        st.clear();
        belt = SHM.belt(d.model, { leather: COLORS[d.color], kind: d.material, metal: d.finish });
        st.add(belt.group);
        applyEngraving();
      });
    }
    function applyEngraving() {
      if (!belt || !belt.engraver) return;
      const hasContent = d.text || logoImg;
      belt.engraver.set({ text: d.text, font: d.font, style: d.style, image: logoImg, emblem: !hasContent, border: true, progress: 1 });
    }
    function update(key) {
      if (["model", "color", "material", "finish"].includes(key)) rebuild();
      else applyEngraving();
      summary();
    }
    function summary() {
      $("#s-summary").innerHTML = `${MODELS[d.model]} · ${MATERIALS[d.material]} · ${d.color} leather · ${FINISH[d.finish]} buckle${d.text ? ` · “${esc(d.text)}” in ${FONTS[d.font]} (${STYLES[d.style]})` : ""}${d.logoName ? " · logo: " + esc(d.logoName) : ""}`;
      $("#s-price").textContent = inr(price());
    }
    const price = () => D.byId[d.model === "personal" ? "personal" : d.model].price + (d.text ? 0 : 0) + (logoImg ? 500 : 0);

    $("#s-text").addEventListener("input", e => { d.text = e.target.value.toUpperCase().slice(0, 18); update("text"); });
    $("#s-notes").addEventListener("input", e => (d.notes = e.target.value));
    const fileIn = $("#s-logo");
    $("#s-drop").addEventListener("click", () => fileIn.click());
    $("#s-drop").addEventListener("dragover", e => e.preventDefault());
    $("#s-drop").addEventListener("drop", e => { e.preventDefault(); e.dataTransfer.files[0] && loadLogo(e.dataTransfer.files[0]); });
    fileIn.addEventListener("change", () => fileIn.files[0] && loadLogo(fileIn.files[0]));
    $("#s-logo-clear").addEventListener("click", () => { logoImg = null; logoFile = null; d.logo = null; d.logoName = ""; fileIn.value = ""; $("#s-logo-name").textContent = "No file chosen"; update("logo"); });
    function loadLogo(f) {
      const ok = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
      if (!ok.includes(f.type) && !/\.(ai|eps|pdf)$/i.test(f.name)) return toast("Please upload PNG, JPG, WebP, SVG, AI, EPS or PDF.");
      if (f.size > 10 * 1024 * 1024) return toast("Files up to 10 MB, please.");
      logoFile = f; d.logoName = f.name; $("#s-logo-name").textContent = f.name;
      if (!ok.includes(f.type)) { toast("Vector file attached for our team. Preview shows text only."); summary(); return; }
      const img = new Image();
      img.onload = () => {
        logoImg = img;
        // keep a small preview copy for saved designs
        const c = document.createElement("canvas"), s = 200 / Math.max(img.width, img.height);
        c.width = Math.max(1, img.width * s); c.height = Math.max(1, img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        d.logo = c.toDataURL("image/png");
        update("logo");
      };
      img.src = URL.createObjectURL(f);
    }

    // Save / load
    const KEY = "shaurya.designs";
    function renderSaved() {
      const list = store.get(KEY, []);
      $("#s-saved").innerHTML = list.length ? list.map(x => `<div class="saved-item"><span>${esc(x.id)} — ${esc(x.text || "emblem")} · ${esc(MODELS[x.model])}</span><span class="row"><button class="btn btn--sm btn--ghost" data-load="${x.id}">Load</button><button class="btn btn--sm btn--ghost" data-del="${x.id}">Delete</button></span></div>`).join("") : '<p class="muted small">No saved designs yet.</p>';
    }
    $("#s-saved").addEventListener("click", e => {
      const l = e.target.dataset.load, del = e.target.dataset.del;
      const list = store.get(KEY, []);
      if (del) { store.set(KEY, list.filter(x => x.id !== del)); renderSaved(); }
      if (l) {
        const x = list.find(x => x.id === l); if (!x) return;
        d = { ...def, ...x };
        logoImg = null;
        if (x.logo) { const im = new Image(); im.onload = () => { logoImg = im; applyEngraving(); }; im.src = x.logo; }
        renderControls(); rebuild(); summary();
        toast("Design " + x.id + " loaded");
      }
    });
    const save = () => {
      const list = store.get(KEY, []);
      const u = SH.auth.user();
      const prev = list.find(x => x.id === d.id);
      const rec = { ...d, id: d.id || SH.uid("D-"), savedAt: new Date().toISOString(), owner: u ? u.email : (prev && prev.owner) || null, review: (prev && prev.review) || "pending" };
      d.id = rec.id;
      const i = list.findIndex(x => x.id === rec.id);
      i >= 0 ? (list[i] = rec) : list.push(rec);
      if (!store.set(KEY, list)) { toast("Could not save — storage full or blocked."); return null; }
      renderSaved(); return rec;
    };
    $("#s-save").addEventListener("click", () => { const r = save(); r && toast("Design saved as " + r.id); });
    $("#s-reset").addEventListener("click", () => { d = { ...def }; logoImg = null; logoFile = null; renderControls(); rebuild(); summary(); });
    $("#s-order").addEventListener("click", () => {
      if (!$("#s-ack").checked) { $("#s-ack").focus(); return toast("Please confirm you've read the preview note."); }
      if (!d.text && !logoFile) return toast("Add a name, initials or a logo first.");
      const r = save(); if (!r) return;
      addToCart({ id: "personal", name: "Custom SHAURYA " + MODELS[d.model], price: price(), unique: true, options: { leather: d.color, metal: d.finish, text: d.text || undefined, design: r.id, size: $("#s-size").value } });
      SH.submitForm("custom-order", { design: r.id, ...d, logo: undefined }, logoFile ? [logoFile] : []).catch(() => {});
    });
    bindForm($("#quote-form"), "quotation", {
      success: "Quotation request received.",
      extra: () => { const r = save(); return { design: r && r.id, spec: $("#s-summary").textContent }; },
      files: () => logoFile ? [logoFile] : []
    });

    renderControls(); rebuild(); summary(); renderSaved();
    const fromHash = location.hash.slice(1);
    if (fromHash) { const b = $(`#s-saved [data-load="${CSS.escape(fromHash)}"]`); b && b.click(); }
  }

  /* ======================= INVEST ======================= */
  function invest() {
    // Product carousel using real 3D assets
    const el = $("#stage");
    if (has3D) {
      const st = SH3D.stage(el, { dist: 4.6, pitch: 0.38, speed: 0.3, shadowY: -0.3 });
      const items = ["classic", "heritage", "urban", "reverso", "signature", "personal", "w:bifold", "mag"];
      let i = 0;
      const show = () => st.whenReady(() => {
        st.clear();
        const k = items[i];
        $("#stage-label").textContent = k === "mag" ? "Magnetic belt — concept" : k.startsWith("w:") ? "Classic Bifold" : D.byId[k].name;
        if (k === "mag") st.add(SHM.magneticLoop());
        else if (k.startsWith("w:")) { const w = SHM.wallet("bifold"); w.setOpen(1); st.add(w.group); }
        else st.add(SHM.belt(k).group);
      });
      SH3D.controls(st, { views: ["front", "side"], extra: [{ id: "prev", label: "‹ Prev", onClick: () => { i = (i + items.length - 1) % items.length; show(); } }, { id: "next", label: "Next ›", onClick: () => { i = (i + 1) % items.length; show(); } }] });
      show();
    } else fallback(el, SH.beltSVG(D.belts[0]));

    // Funding placeholders (editable, stored on this device)
    const FKEY = "shaurya.funding";
    const lines = ["Manufacturing equipment", "Raw materials", "Product development", "Marketing", "Packaging", "Distribution", "Working capital"];
    const colors = ["#d8bd85", "#b08d57", "#7d6238", "#a9abae", "#6b4428", "#e6dccb", "#4a4c51"];
    const saved = store.get(FKEY, {});
    $("#fund-rows").innerHTML = lines.map((l, i) => `<div class="field"><label for="f${i}"><span style="display:inline-block;width:10px;height:10px;background:${colors[i]};margin-right:8px"></span>${l} (₹)</label><input class="input" id="f${i}" data-fund="${l}" inputmode="numeric" placeholder="To be confirmed" value="${saved[l] || ""}"></div>`).join("");
    const fundUpdate = () => {
      const vals = $$("[data-fund]").map(x => Math.max(0, Number(x.value.replace(/[^\d.]/g, "")) || 0));
      const total = vals.reduce((a, b) => a + b, 0);
      $("#fund-total").textContent = total ? inr(total) : "To be confirmed";
      $("#alloc").innerHTML = vals.map((v, i) => `<span style="width:${total ? (v / total) * 100 : 0}%;background:${colors[i]}" title="${lines[i]}"></span>`).join("");
      const obj = {}; $$("[data-fund]").forEach(x => (obj[x.dataset.fund] = x.value)); store.set(FKEY, obj);
    };
    $("#fund-rows").addEventListener("input", fundUpdate); fundUpdate();

    // Projection calculator — every number comes from the user's assumptions
    const calc = () => {
      const g = id => Number($(id).value) || 0;
      const price = g("#c-price"), cost = g("#c-cost"), units = g("#c-units"), mkt = g("#c-mkt"), ops = g("#c-ops");
      const ready = price && units;
      const rev = price * units, gp = (price - cost) * units, net = gp - mkt - ops;
      const out = (id, v) => ($(id).textContent = ready ? v : "—");
      out("#o-margin", price ? (((price - cost) / price) * 100).toFixed(1) + "%" : "—");
      out("#o-rev", inr(rev)); out("#o-gp", inr(gp)); out("#o-net", inr(net));
      out("#o-annual", inr(net * 12));
    };
    $("#calc").addEventListener("input", calc); calc();

    bindForm($("#investor-form"), "investor-enquiry", { success: "Thank you. Our founding team will contact you." });
  }

  /* ======================= SHOP ======================= */
  function shop() {
    const q = $("#q"), cat = $("#cat"), sort = $("#sort"), max = $("#max");
    const params = new URLSearchParams(location.search);
    if (params.get("q")) q.value = params.get("q");
    const render = () => {
      const term = q.value.trim().toLowerCase();
      let items = D.all.filter(p => (cat.value === "all" || p.category === cat.value) && (!term || (p.name + " " + p.desc + " " + (p.line || "")).toLowerCase().includes(term)) && p.price <= Number(max.value));
      if (sort.value === "low") items.sort((a, b) => a.price - b.price);
      if (sort.value === "high") items.sort((a, b) => b.price - a.price);
      $("#max-v").textContent = inr(max.value);
      $("#count").textContent = items.length + " products";
      $("#grid").innerHTML = items.map(p => cardHTML(p).replace("data-reveal", "")).join("") || '<p class="muted">No products match. Try a different search.</p>';
    };
    [q, cat, sort, max].forEach(x => x.addEventListener("input", render));
    render();
    q.focus();
  }

  /* ======================= CART / CHECKOUT ======================= */
  function cartPage() {
    const CFG = window.SHAURYA_CONFIG;
    const form = $("#checkout-form");
    const user = SH.auth.user();
    if (user) {
      const f = n => form.elements.namedItem(n);
      f("name").value = user.name || ""; f("email").value = user.email; f("phone").value = user.phone || "";
      const a = user.address || {};
      ["address", "city", "state", "pincode"].forEach(k => a[k] && (f(k).value = a[k]));
      $("#account-note").innerHTML = `Signed in as <strong>${esc(user.email)}</strong>. This order will appear in <a class="link" href="account.html" style="font-size:inherit;letter-spacing:0;text-transform:none">your account</a>.`;
    } else $("#account-note").innerHTML = `<a class="link" href="account.html" style="font-size:inherit;letter-spacing:0;text-transform:none">Sign in or create an account</a> to track orders — or continue as a guest.`;
    function totals() {
      const sub = SH.cart.total();
      const express = form.shipping.value === "express";
      const ship = !sub ? 0 : express ? CFG.shipping.express : sub >= CFG.shipping.freeAbove ? 0 : CFG.shipping.standard;
      return { sub, ship, total: sub + ship };
    }
    function render() {
      const items = SH.cart.items();
      $("#lines").innerHTML = items.length ? items.map(i => `<div class="line-item"><div class="thumb">${SH.thumbFor(D.byId[i.id] || { category: "gifts" }, i.options || {})}</div>
        <div><div style="font-weight:600">${esc(i.name)} × ${i.qty}</div><div class="muted small">${esc(SH.optionText(i.options))}</div>${i.options && i.options.message ? `<div class="muted small">Message: “${esc(i.options.message)}”</div>` : ""}</div><div>${inr(i.price * i.qty)}</div></div>`).join("")
        : '<p class="muted">Your bag is empty. <a class="link" href="shop.html">Shop the collection</a></p>';
      const t = totals();
      $("#s-sub").textContent = inr(t.sub); $("#s-ship").textContent = t.ship ? inr(t.ship) : "Free"; $("#s-total").textContent = inr(t.total);
      $("#pay-btn").disabled = !items.length;
    }
    document.addEventListener("cart:change", render);
    form.addEventListener("change", render);
    $("#pin").addEventListener("input", e => {
      const v = e.target.value;
      $("#pin-note").textContent = /^[1-9]\d{5}$/.test(v) ? "Delivers in 3–6 working days (standard) · 1–3 (express, metro cities)." : "";
    });
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const t = totals();
      const order = {
        id: "SH" + Date.now().toString().slice(-8), at: new Date().toISOString(), items: SH.cart.items(), ...t,
        customer: Object.fromEntries([...new FormData(form).entries()]), status: "Paid (test mode)"
      };
      order.customer.email = String(order.customer.email).trim().toLowerCase();
      if (user) SH.auth.update({ phone: order.customer.phone, address: { address: order.customer.address, city: order.customer.city, state: order.customer.state, pincode: order.customer.pincode } });
      const done = ref => {
        order.payment = ref;
        const all = store.get("shaurya.orders", []); all.unshift(order); store.set("shaurya.orders", all);
        // decrement stock
        const ov = store.get("shaurya.catalog", {}); ov.edits = ov.edits || {};
        order.items.forEach(i => { const p = D.byId[i.id]; if (p) ov.edits[i.id] = { ...(ov.edits[i.id] || {}), stock: Math.max(0, (p.stock ?? 25) - i.qty) }; });
        store.set("shaurya.catalog", ov);
        SH.submitForm("order", { order: JSON.stringify(order) }).catch(() => {});
        SH.cart.clear();
        showConfirm(order);
      };
      if (CFG.razorpayKeyId && window.Razorpay) {
        new window.Razorpay({
          key: CFG.razorpayKeyId, amount: t.total * 100, currency: "INR", name: "SHAURYA", description: "Order " + order.id,
          prefill: { name: order.customer.name, email: order.customer.email, contact: order.customer.phone },
          theme: { color: "#b08d57" }, handler: r => done(r.razorpay_payment_id)
        }).open();
      } else {
        $("#test-pay").hidden = false;
        $("#test-pay").scrollIntoView({ behavior: "smooth", block: "center" });
        $("#test-pay-go").onclick = () => done("TEST-" + SH.uid());
      }
    });
    function showConfirm(o) {
      $("#checkout").hidden = true;
      const c = $("#confirm"); c.hidden = false;
      c.innerHTML = `<div class="card card-pad stack center" style="max-width:640px;margin:0 auto">${SH.emblem({ gradient: true, cls: "" }).replace('class="emblem ', 'style="width:70px;margin:0 auto" class="emblem ')}
        <span class="eyebrow">Order confirmed</span><h2 class="h2">Thank you, ${esc(o.customer.name.split(" ")[0])}.</h2>
        <p class="muted">Order <strong>${o.id}</strong> · ${inr(o.total)} · ${esc(o.status)}</p>
        <p class="muted small">A confirmation will be emailed to ${esc(o.customer.email)} once email notifications are connected. Personalised items are reviewed by our craft team before production.</p>
        <a class="btn" href="shop.html">Continue shopping</a></div>`;
      scrollTo({ top: 0 }); renderOrders();
    }
    function renderOrders() {
      const all = store.get("shaurya.orders", []);
      $("#orders").innerHTML = all.length ? all.map(o => `<div class="saved-item"><span><strong>${o.id}</strong> · ${new Date(o.at).toLocaleDateString("en-IN")} · ${o.items.length} item(s)</span><span>${inr(o.total)} · ${esc(o.status)}</span></div>`).join("") : '<p class="muted small">No orders on this device yet.</p>';
    }
    if (CFG.razorpayKeyId) { const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; document.head.append(s); }
    $("#pay-mode").textContent = CFG.razorpayKeyId ? "Razorpay (test key)" : "Simulated test payment — no real charge";
    render(); renderOrders();
  }

  /* ======================= ACCOUNT ======================= */
  function account() {
    const root = $("#account");
    const render = () => { const u = SH.auth.user(); u ? dash(u) : authForms(); };
    const statusCls = s => /deliver|approved|paid/i.test(s) ? "ok" : /cancel|reject|change/i.test(s) ? "bad" : "warn";

    function authForms() {
      root.innerHTML = `<div class="grid-2" style="align-items:start">
        <form class="card card-pad stack" id="login"><h2 class="h3">Sign in</h2>
          <div class="field"><label for="l-email">Email</label><input class="input" id="l-email" name="email" type="email" required autocomplete="email"></div>
          <div class="field"><label for="l-pass">Password</label><input class="input" id="l-pass" name="password" type="password" required autocomplete="current-password"></div>
          <button class="btn btn--solid" type="submit">Sign in</button><p class="form-status"></p></form>
        <form class="card card-pad stack" id="register"><h2 class="h3">Create an account</h2>
          <div class="field"><label for="r-name">Full name</label><input class="input" id="r-name" name="name" required autocomplete="name"></div>
          <div class="field"><label for="r-email">Email</label><input class="input" id="r-email" name="email" type="email" required autocomplete="email"></div>
          <div class="field"><label for="r-phone">Mobile</label><input class="input" id="r-phone" name="phone" type="tel" autocomplete="tel"></div>
          <div class="field"><label for="r-pass">Password (8+ characters)</label><input class="input" id="r-pass" name="password" type="password" minlength="8" required autocomplete="new-password"></div>
          <button class="btn" type="submit">Create account</button><p class="form-status"></p></form></div>`;
      const handle = (form, fn) => form.addEventListener("submit", async e => {
        e.preventDefault();
        const st = $(".form-status", form);
        try { await fn(Object.fromEntries(new FormData(form))); render(); }
        catch (err) { st.style.color = "var(--danger)"; st.textContent = err.message; }
      });
      handle($("#login"), d => SH.auth.login(d.email, d.password));
      handle($("#register"), d => SH.auth.register(d));
    }

    function dash(u) {
      const orders = store.get("shaurya.orders", []).filter(o => o.customer && o.customer.email === u.email);
      const designs = store.get("shaurya.designs", []).filter(x => !x.owner || x.owner === u.email);
      root.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:24px">
          <h2 class="h2">Namaste, ${esc((u.name || "").split(" ")[0] || "there")}.</h2><button class="btn btn--ghost btn--sm" id="logout">Sign out</button></div>
        <div class="kpis"><div><span class="label">Orders</span><div class="v">${orders.length}</div></div><div><span class="label">Saved designs</span><div class="v">${designs.length}</div></div>
          <div><span class="label">Artwork files</span><div class="v">${designs.filter(d => d.logoName).length}</div></div><div><span class="label">Member since</span><div class="v" style="font-size:22px">${new Date(u.created).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</div></div></div>
        <div class="tabs" role="tablist">${["Orders", "Saved designs", "Artwork", "Profile"].map((t, i) => `<button class="tab" role="tab" data-tab="${i}" aria-selected="${i === 0}">${t}</button>`).join("")}</div>
        <div data-panel="0">${orders.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>${orders.map(o => `<tr><td><strong>${o.id}</strong></td><td>${new Date(o.at).toLocaleDateString("en-IN")}</td><td>${o.items.map(i => esc(i.name) + " × " + i.qty).join("<br>")}</td><td>${inr(o.total)}</td><td><span class="status ${statusCls(o.status)}">${esc(o.status)}</span></td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">No orders yet. <a class="link" href="shop.html">Start shopping</a></p>'}</div>
        <div data-panel="1" hidden>${designs.length ? `<div class="saved">${designs.map(x => `<div class="saved-item"><span><strong>${esc(x.id)}</strong> · ${esc(x.text || "Emblem")} · ${esc(x.model)} · ${esc(x.finish)}</span><span class="row"><span class="status ${statusCls(x.review || "pending")}">${esc(x.review || "pending review")}</span><a class="btn btn--sm btn--ghost" href="studio.html#${esc(x.id)}">Open in studio</a></span></div>`).join("")}</div>` : '<p class="muted">No saved designs. <a class="link" href="studio.html">Open the studio</a></p>'}</div>
        <div data-panel="2" hidden>${designs.filter(d => d.logo || d.logoName).map(x => `<div class="saved-item"><span class="row">${x.logo ? `<img src="${x.logo}" alt="" style="width:56px;height:56px;object-fit:contain;background:#fff;padding:4px">` : ""}<span>${esc(x.logoName || "artwork")} — design ${esc(x.id)}</span></span><span class="status ${statusCls(x.review || "pending")}">${esc(x.review || "pending review")}</span></div>`).join("") || '<p class="muted">No artwork uploaded.</p>'}</div>
        <form data-panel="3" hidden class="form-grid" id="profile" style="max-width:720px">
          <div class="field"><label for="p-name">Full name</label><input class="input" id="p-name" name="name" value="${esc(u.name || "")}"></div>
          <div class="field"><label for="p-phone">Mobile</label><input class="input" id="p-phone" name="phone" value="${esc(u.phone || "")}"></div>
          <div class="field full"><label for="p-addr">Address</label><input class="input" id="p-addr" name="address" value="${esc((u.address || {}).address || "")}"></div>
          <div class="field"><label for="p-city">City</label><input class="input" id="p-city" name="city" value="${esc((u.address || {}).city || "")}"></div>
          <div class="field"><label for="p-pin">PIN code</label><input class="input" id="p-pin" name="pincode" value="${esc((u.address || {}).pincode || "")}"></div>
          <div class="full"><button class="btn btn--solid" type="submit">Save profile</button></div></form>`;
      $("#logout").addEventListener("click", () => { SH.auth.logout(); render(); });
      $$(".tab", root).forEach(t => t.addEventListener("click", () => {
        $$(".tab", root).forEach(x => x.setAttribute("aria-selected", String(x === t)));
        $$("[data-panel]", root).forEach(p => (p.hidden = p.dataset.panel !== t.dataset.tab));
      }));
      $("#profile").addEventListener("submit", e => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        SH.auth.update({ name: d.name, phone: d.phone, address: { ...(u.address || {}), address: d.address, city: d.city, pincode: d.pincode } });
        toast("Profile saved");
      });
    }
    render();
  }

  /* ======================= SUPPORT ======================= */
  function support() { bindForm($("#contact-form"), "contact", { success: "Message received. We reply within one working day." }); }

  /* ======================= BRAND ======================= */
  function brand() {
    $$("[data-emblem]").forEach(el => (el.innerHTML = SH.emblem({ gradient: el.dataset.emblem !== "mono", color: el.dataset.color })));
    $$("[data-wordmark]").forEach(el => (el.innerHTML = SH.wordmark({ color: el.dataset.color || "#f2ebdf" })));
  }

  const PAGES = { home, collection, leather, gifting, magnetic, studio, invest, shop, cart: cartPage, support, brand, account };
  document.addEventListener("DOMContentLoaded", () => {
    const fn = PAGES[document.body.dataset.page];
    fn && fn();
    SH.observeReveal(document);
  });
})();
