/* =========================================================
   SHAURYA — Admin dashboard (demo mode, this browser's data)
   Products, stock, prices, images & 3D models, orders, designs,
   artwork review, enquiries, investors, early access, analytics.
   ========================================================= */
(function () {
  const { $, $$, inr, esc, store, toast, assets } = window.SH;
  const D = window.SHAURYA_DATA;
  const CFG = window.SHAURYA_CONFIG;
  const ORDER_STATUSES = ["Paid (test mode)", "Processing", "In production", "Shipped", "Delivered", "Cancelled", "Refunded"];
  const REVIEW = ["pending", "approved", "changes requested", "rejected"];
  const ENQ_STATUS = ["new", "in progress", "replied", "closed"];

  const subs = () => store.get("shaurya.submissions", []);
  const setSubs = v => store.set("shaurya.submissions", v);
  const catalog = () => Object.assign({ edits: {}, added: [] }, store.get("shaurya.catalog", {}));
  const setCatalog = v => store.set("shaurya.catalog", v);
  const statusCls = s => /deliver|approved|replied|closed|paid/i.test(s) ? "ok" : /cancel|reject|refund|change/i.test(s) ? "bad" : "warn";

  function csv(rows, name) {
    if (!rows.length) return toast("Nothing to export");
    const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
    const cell = v => `"${String(typeof v === "object" && v !== null ? JSON.stringify(v) : v ?? "").replace(/"/g, '""')}"`;
    const text = [keys.join(","), ...rows.map(r => keys.map(k => cell(r[k])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = `shaurya-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }
  const select = (opts, val, attrs) => `<select class="select" ${attrs}>${opts.map(o => `<option ${o === val ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;

  /* ---------- Gate ---------- */
  function gate() {
    const root = $("#admin");
    let ok = false;
    try { ok = sessionStorage.getItem("shaurya.admin") === "1"; } catch (e) {}
    if (ok) return dashboard();
    root.innerHTML = `<form class="card card-pad stack" id="gate" style="max-width:440px">
      <h2 class="h3">Admin sign-in</h2>
      <div class="field"><label for="pc">Passcode</label><input class="input" id="pc" type="password" required autocomplete="current-password"></div>
      <button class="btn btn--solid" type="submit">Enter dashboard</button>
      <p class="form-note">Default passcode is set in assets/js/config.js (adminPasscode).</p><p class="form-status"></p></form>`;
    $("#gate").addEventListener("submit", e => {
      e.preventDefault();
      if ($("#pc").value === CFG.adminPasscode) { try { sessionStorage.setItem("shaurya.admin", "1"); } catch (er) {} dashboard(); }
      else { const s = $(".form-status"); s.style.color = "var(--danger)"; s.textContent = "Incorrect passcode."; }
    });
  }

  /* ---------- Dashboard ---------- */
  const TABS = [["overview", "Overview"], ["products", "Products"], ["orders", "Orders"], ["designs", "Designs & artwork"], ["enquiries", "Enquiries"], ["investors", "Investors"], ["early", "Early access"]];
  let current = "overview";

  function dashboard() {
    const root = $("#admin");
    root.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:12px"><h2 class="h2">Dashboard</h2><button class="btn btn--ghost btn--sm" id="signout">Sign out</button></div>
      <div class="tabs" role="tablist">${TABS.map(([k, t]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${k === current}">${t}</button>`).join("")}</div>
      <div id="panel"></div>`;
    $("#signout").addEventListener("click", () => { try { sessionStorage.removeItem("shaurya.admin"); } catch (e) {} gate(); });
    $$(".tab").forEach(t => t.addEventListener("click", () => { current = t.dataset.tab; $$(".tab").forEach(x => x.setAttribute("aria-selected", String(x === t))); show(); }));
    show();
  }
  function show() { ({ overview, products, orders, designs, enquiries, investors, early })[current](); }

  /* ---------- Overview / analytics ---------- */
  function overview() {
    const os = store.get("shaurya.orders", []).filter(o => !/cancel|refund/i.test(o.status));
    const rev = os.reduce((s, o) => s + o.total, 0);
    const units = {};
    os.forEach(o => o.items.forEach(i => (units[i.name] = (units[i.name] || 0) + i.qty)));
    const top = Object.entries(units).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxU = Math.max(1, ...top.map(x => x[1]));
    const byDay = {};
    os.forEach(o => { const d = o.at.slice(0, 10); byDay[d] = (byDay[d] || 0) + o.total; });
    const days = Object.entries(byDay).sort().slice(-14);
    const maxD = Math.max(1, ...days.map(x => x[1]));
    const s = subs();
    const count = t => s.filter(x => x.type === t).length;
    const lowStock = D.full.filter(p => p.stock <= 5);
    $("#panel").innerHTML = `<p class="form-note" style="margin-bottom:16px">Figures below are calculated from orders placed on this device in test mode — not real sales.</p>
      <div class="kpis"><div><span class="label">Orders</span><div class="v">${os.length}</div></div><div><span class="label">Revenue (test)</span><div class="v">${inr(rev)}</div></div>
        <div><span class="label">Avg. order</span><div class="v">${inr(os.length ? rev / os.length : 0)}</div></div><div><span class="label">Units sold</span><div class="v">${Object.values(units).reduce((a, b) => a + b, 0)}</div></div></div>
      <div class="grid-2" style="align-items:start">
        <div class="card card-pad"><h3 class="h3" style="margin-bottom:16px">Units by product</h3>${top.map(([n, u]) => `<div class="hbar"><span>${esc(n)}</span><div class="track"><div class="fill" style="width:${(u / maxU) * 100}%"></div></div><span>${u}</span></div>`).join("") || '<p class="muted small">No orders yet.</p>'}</div>
        <div class="card card-pad"><h3 class="h3" style="margin-bottom:16px">Revenue by day</h3>${days.map(([d, v]) => `<div class="hbar"><span>${d}</span><div class="track"><div class="fill" style="width:${(v / maxD) * 100}%"></div></div><span>${inr(v)}</span></div>`).join("") || '<p class="muted small">No orders yet.</p>'}</div>
      </div>
      <div class="kpis" style="margin-top:28px"><div><span class="label">Enquiries</span><div class="v">${count("contact") + count("quotation")}</div></div><div><span class="label">Investor enquiries</span><div class="v">${count("investor-enquiry")}</div></div>
        <div><span class="label">Early access</span><div class="v">${count("early-access")}</div></div><div><span class="label">Newsletter</span><div class="v">${count("newsletter")}</div></div></div>
      <div class="card card-pad"><h3 class="h3" style="margin-bottom:12px">Low stock</h3>${lowStock.map(p => `<div class="saved-item"><span>${esc(p.name)}</span><span class="status ${p.stock <= 0 ? "bad" : "warn"}">${p.stock} left</span></div>`).join("") || '<p class="muted small">All products above 5 units.</p>'}</div>`;
  }

  /* ---------- Products ---------- */
  function products() {
    const keys = await3D();
    $("#panel").innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:16px"><p class="muted small">Edits apply across the site on this device. Prices in ₹ incl. GST.</p>
        <span class="row"><button class="btn btn--sm btn--ghost" id="exp">Export CSV</button><button class="btn btn--sm btn--ghost" id="reset-cat">Reset to defaults</button></span></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Image</th><th>3D model (.glb)</th><th>Visible</th></tr></thead><tbody>
      ${D.full.map(p => `<tr data-id="${esc(p.id)}">
        <td><input class="input" data-f="name" value="${esc(p.name)}"><div class="small muted" style="margin-top:4px">${esc(p.id)}${p.custom ? ' · <button class="link" data-del style="background:none;border:0;padding:0;font-size:10px">delete</button>' : ""}</div></td>
        <td>${esc(p.category)}</td>
        <td><input class="input" data-f="price" type="number" min="0" value="${p.price}" style="width:110px"></td>
        <td><input class="input" data-f="stock" type="number" min="0" value="${p.stock}" style="width:90px"></td>
        <td>${p.image ? `<img src="${p.image}" alt="" style="width:48px;height:48px;object-fit:contain;background:#222">` : ""}<label class="btn btn--sm btn--ghost" style="margin-top:4px">Upload<input type="file" accept="image/png,image/jpeg,image/webp" data-img hidden></label>${p.image ? '<button class="btn btn--sm btn--ghost" data-img-clear>Remove</button>' : ""}</td>
        <td><span class="small muted" data-glb-state>…</span><br><label class="btn btn--sm btn--ghost" style="margin-top:4px">Upload<input type="file" accept=".glb,model/gltf-binary" data-glb hidden></label><button class="btn btn--sm btn--ghost" data-glb-clear>Remove</button></td>
        <td><input type="checkbox" data-f="visible" ${p.hidden ? "" : "checked"} style="accent-color:var(--gold)"></td></tr>`).join("")}
      </tbody></table></div>
      <form class="card card-pad" id="add" style="margin-top:32px"><h3 class="h3" style="margin-bottom:16px">Add a product</h3>
        <div class="form-grid">
          <div class="field"><label for="a-name">Name</label><input class="input" id="a-name" name="name" required></div>
          <div class="field"><label for="a-cat">Category</label><select class="select" id="a-cat" name="category"><option value="belts">Belts</option><option value="wallets">Wallets</option><option value="gifts">Gifts</option></select></div>
          <div class="field"><label for="a-price">Price (₹)</label><input class="input" id="a-price" name="price" type="number" min="0" required></div>
          <div class="field"><label for="a-stock">Stock</label><input class="input" id="a-stock" name="stock" type="number" min="0" value="10"></div>
          <div class="field"><label for="a-line">Tagline</label><input class="input" id="a-line" name="line"></div>
          <div class="field"><label for="a-leather">Leather colours</label><select class="select" id="a-leather" name="leather" multiple size="4">${Object.entries(D.LEATHER).filter(([k]) => k !== "reverso").map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("")}</select></div>
          <div class="field full"><label for="a-desc">Description</label><textarea class="textarea" id="a-desc" name="desc"></textarea></div>
          <div class="field full"><label for="a-specs">Specifications (one per line)</label><textarea class="textarea" id="a-specs" name="specs"></textarea></div>
          <div class="full"><button class="btn btn--solid" type="submit">Add product</button></div></div></form>`;

    keys.then(ks => $$("[data-glb-state]").forEach(s => { s.textContent = ks.includes("model:" + s.closest("tr").dataset.id) ? "Custom model active" : "Built-in model"; }));
    const edit = (id, patch) => { const c = catalog(); c.edits[id] = { ...(c.edits[id] || {}), ...patch }; setCatalog(c); };
    $("#panel").onchange = async e => {
      const tr = e.target.closest("tr[data-id]"); if (!tr) return;
      const id = tr.dataset.id, f = e.target.dataset.f;
      if (f === "price" || f === "stock") edit(id, { [f]: Math.max(0, Number(e.target.value) || 0) });
      else if (f === "name") edit(id, { name: e.target.value.trim() });
      else if (f === "visible") edit(id, { hidden: !e.target.checked });
      else if (e.target.matches("[data-img]")) {
        const file = e.target.files[0]; if (!file) return;
        if (file.size > 8e6) return toast("Image too large (max 8 MB).");
        edit(id, { image: await downscale(file, 640) });
        toast("Image saved"); return products();
      } else if (e.target.matches("[data-glb]")) {
        const file = e.target.files[0]; if (!file) return;
        if (!/\.glb$/i.test(file.name)) return toast("Please upload a binary .glb file.");
        if (file.size > 25e6) return toast("Model too large (max 25 MB). Optimise it in Blender first.");
        await assets.put("model:" + id, await file.arrayBuffer());
        toast("3D model saved — it now replaces the built-in model"); return products();
      } else return;
      toast("Saved");
    };
    $("#panel").onclick = async e => {
      const tr = e.target.closest("tr[data-id]");
      if (!tr) return;
      if (e.target.matches("[data-img-clear]")) { const c = catalog(); if (c.edits[tr.dataset.id]) delete c.edits[tr.dataset.id].image; setCatalog(c); products(); }
      if (e.target.matches("[data-glb-clear]")) { await assets.del("model:" + tr.dataset.id); toast("Custom model removed"); products(); }
      if (e.target.matches("[data-del]") && confirm("Delete this product?")) { const c = catalog(); c.added = c.added.filter(p => p.id !== tr.dataset.id); delete c.edits[tr.dataset.id]; setCatalog(c); location.reload(); }
    };
    $("#exp").addEventListener("click", () => csv(D.full.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price, stock: p.stock, hidden: !!p.hidden })), "products"));
    $("#reset-cat").addEventListener("click", () => { if (confirm("Reset all product edits and remove added products?")) { setCatalog({ edits: {}, added: [] }); location.reload(); } });
    $("#add").addEventListener("submit", e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = fd.get("name").trim();
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36).slice(-4);
      const cat = fd.get("category");
      const p = { id, category: cat, name, price: Number(fd.get("price")), stock: Number(fd.get("stock")) || 0, line: fd.get("line"), desc: fd.get("desc"),
        leather: fd.getAll("leather").length ? fd.getAll("leather") : (cat === "gifts" ? undefined : ["black"]),
        specs: String(fd.get("specs") || "").split("\n").map(s => s.trim()).filter(Boolean),
        no: String((cat === "belts" ? D.belts : cat === "wallets" ? D.wallets : D.gifts).length + 1).padStart(2, "0"),
        contents: cat === "gifts" ? ["belt", "wallet"] : undefined, occasions: cat === "gifts" ? Object.keys(D.OCCASIONS) : undefined };
      const c = catalog(); c.added.push(p); setCatalog(c);
      toast("Product added"); setTimeout(() => location.reload(), 600);
    });
  }
  function await3D() { return assets.keys(); }
  function downscale(file, max) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/webp", 0.85)); };
      img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  }

  /* ---------- Orders ---------- */
  function orders() {
    const os = store.get("shaurya.orders", []);
    $("#panel").innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:16px"><p class="muted small">${os.length} orders (test mode, this device)</p><button class="btn btn--sm btn--ghost" id="exp">Export CSV</button></div>
      ${os.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Ship to</th><th>Total</th><th>Status</th></tr></thead><tbody>
      ${os.map(o => `<tr data-id="${o.id}"><td><strong>${o.id}</strong><div class="small muted">${new Date(o.at).toLocaleString("en-IN")}</div><div class="small muted">${esc(o.payment || "")}</div></td>
        <td>${esc(o.customer.name)}<div class="small muted">${esc(o.customer.email)}<br>${esc(o.customer.phone)}</div></td>
        <td>${o.items.map(i => `${esc(i.name)} × ${i.qty}<div class="small muted">${esc(SH.optionText(i.options))}${i.options && i.options.message ? " · msg: " + esc(i.options.message) : ""}</div>`).join("")}</td>
        <td class="small">${esc(o.customer.address)}, ${esc(o.customer.city)}, ${esc(o.customer.state)} ${esc(o.customer.pincode)}<div class="muted">${esc(o.customer.shipping)}</div></td>
        <td>${inr(o.total)}</td><td>${select(ORDER_STATUSES, o.status, "data-status")}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">No orders yet. Place a test order from the shop to see it here.</p>'}`;
    $("#panel").onchange = e => {
      if (!e.target.matches("[data-status]")) return;
      const id = e.target.closest("tr").dataset.id;
      store.set("shaurya.orders", store.get("shaurya.orders", []).map(o => o.id === id ? { ...o, status: e.target.value } : o));
      toast("Order " + id + " → " + e.target.value);
    };
    const ex = $("#exp"); ex && ex.addEventListener("click", () => csv(os.map(o => ({ id: o.id, date: o.at, name: o.customer.name, email: o.customer.email, phone: o.customer.phone, city: o.customer.city, pincode: o.customer.pincode, items: o.items.map(i => i.name + " x" + i.qty).join("; "), total: o.total, status: o.status })), "orders"));
  }

  /* ---------- Designs & artwork review ---------- */
  function designs() {
    const ds = store.get("shaurya.designs", []);
    const orders = subs().filter(s => s.type === "custom-order");
    $("#panel").innerHTML = `<div class="notice" style="margin-bottom:20px">Review artwork for engraving feasibility before production. Approve, request changes or reject — customers see the status in their account.</div>
      ${ds.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Design</th><th>Specification</th><th>Artwork</th><th>Instructions</th><th>Ordered</th><th>Review</th></tr></thead><tbody>
      ${ds.map(x => `<tr data-id="${esc(x.id)}"><td><strong>${esc(x.id)}</strong><div class="small muted">${new Date(x.savedAt).toLocaleString("en-IN")}<br>${esc(x.owner || "guest")}</div></td>
        <td class="small">${esc(x.model)} · ${esc(x.color)} ${esc(x.material)} · ${esc(x.finish)}<br>${x.text ? `“${esc(x.text)}” · ${esc(x.font)} · ${esc(x.style)}` : "No text"}</td>
        <td>${x.logo ? `<a href="${x.logo}" download="${esc(x.id)}-artwork.png"><img src="${x.logo}" alt="Uploaded artwork" style="width:72px;height:72px;object-fit:contain;background:#fff;padding:4px"></a>` : ""}<div class="small muted">${esc(x.logoName || "—")}</div></td>
        <td class="small">${esc(x.notes || "—")}</td>
        <td>${orders.some(o => o.design === x.id) ? '<span class="status ok">Yes</span>' : '<span class="muted small">Saved only</span>'}</td>
        <td>${select(REVIEW, x.review || "pending", "data-review")}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">No designs yet. Designs saved in the studio appear here.</p>'}`;
    $("#panel").onchange = e => {
      if (!e.target.matches("[data-review]")) return;
      const id = e.target.closest("tr").dataset.id;
      store.set("shaurya.designs", store.get("shaurya.designs", []).map(x => x.id === id ? { ...x, review: e.target.value } : x));
      toast("Design " + id + " → " + e.target.value);
    };
  }

  /* ---------- Submissions (enquiries / investors / early access) ---------- */
  function submissionTable(types, cols, name) {
    const list = subs().filter(s => types.includes(s.type)).reverse();
    $("#panel").innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:16px"><p class="muted small">${list.length} records${CFG.formEndpoint ? " (also sent to your form endpoint)" : " (demo mode: this device only)"}</p><button class="btn btn--sm btn--ghost" id="exp">Export CSV</button></div>
      ${list.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Ref</th><th>Type</th>${cols.map(c => `<th>${c[1]}</th>`).join("")}<th>Status</th></tr></thead><tbody>
      ${list.map(s => `<tr data-id="${esc(s.id)}"><td><strong>${esc(s.id)}</strong><div class="small muted">${new Date(s.at).toLocaleString("en-IN")}</div></td><td>${esc(s.type)}</td>
        ${cols.map(c => `<td class="small">${esc([].concat(s[c[0]] ?? "—").join(", "))}</td>`).join("")}<td>${select(ENQ_STATUS, s.status || "new", "data-st")}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Nothing here yet.</p>'}`;
    $("#panel").onchange = e => {
      if (!e.target.matches("[data-st]")) return;
      const id = e.target.closest("tr").dataset.id;
      setSubs(subs().map(s => s.id === id ? { ...s, status: e.target.value } : s));
      toast("Updated");
    };
    $("#exp").addEventListener("click", () => csv(list, name));
  }
  const enquiries = () => submissionTable(["contact", "quotation", "newsletter"], [["name", "Name"], ["email", "Email"], ["phone", "Phone"], ["topic", "Topic"], ["quantity", "Qty"], ["message", "Message"], ["design", "Design"]], "enquiries");
  const investors = () => submissionTable(["investor-enquiry"], [["name", "Name"], ["organisation", "Organisation"], ["email", "Email"], ["phone", "Phone"], ["range", "Range"], ["interests", "Interests"], ["message", "Message"]], "investors");
  const early = () => submissionTable(["early-access"], [["name", "Name"], ["email", "Email"], ["city", "City"], ["size", "Size"]], "early-access");

  document.addEventListener("DOMContentLoaded", gate);
})();
