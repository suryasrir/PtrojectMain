/* =========================================================
   SHAURYA 3D kit (Three.js r149, global THREE)
   - Lazy stages: a renderer is created only when a stage nears the viewport,
     and frames are only drawn while it is visible.
   - Studio environment built locally (no HDR download).
   - Procedural leather, metal and engraving materials.
   ========================================================= */
(function () {
  const T = window.THREE;
  const hasWebGL = (() => {
    if (!T) return false;
    try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
    catch (e) { return false; }
  })();
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = () => innerWidth < 720;

  /* ---------------- Shared loop ---------------- */
  const stages = new Set();
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    stages.forEach(s => s.visible && s.tick(dt, now / 1000));
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------------- Environment ---------------- */
  function buildEnvironment(renderer, mood = "studio") {
    const scene = new T.Scene();
    const room = new T.Mesh(new T.BoxGeometry(20, 12, 20), new T.MeshBasicMaterial({ color: mood === "warm" ? 0x120c08 : 0x0b0a09, side: T.BackSide }));
    scene.add(room);
    const panel = (w, h, color, intensity, pos, look) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(intensity), side: T.DoubleSide }));
      m.position.set(...pos); m.lookAt(...look); scene.add(m);
    };
    // Key softbox (warm), strip lights, cool rim, floor bounce
    panel(6, 4, 0xfff1dc, 3.2, [-5, 5, 4], [0, 0, 0]);
    panel(1.2, 9, 0xffffff, 2.4, [6, 1, 2], [0, 0, 0]);
    panel(1.0, 9, 0xd8e2ff, 1.4, [-6, 1, -5], [0, 0, 0]);
    panel(8, 1.2, 0xffe2b8, 1.6, [0, 5.8, -4], [0, 0, 0]);
    panel(10, 10, 0x3a2416, 0.35, [0, -5.9, 0], [0, 0, 0]);
    const pm = new T.PMREMGenerator(renderer);
    const tex = pm.fromScene(scene, 0.035).texture;
    pm.dispose();
    return tex;
  }

  /* ---------------- Stage ---------------- */
  function stage(el, opts = {}) {
    const o = Object.assign({
      dist: 6, fov: 28, height: 0.6, autoRotate: true, speed: 0.25,
      yaw: 0.5, pitch: 0.28, minDist: 2.2, maxDist: 12, interactive: true,
      shadow: true, shadowY: -0.4, shadowSize: 6, exposure: 1.05, mood: "studio", hint: true
    }, opts);

    const api = {
      el, visible: false, ready: false, o,
      yaw: o.yaw, pitch: o.pitch, dist: o.dist,
      tYaw: o.yaw, tPitch: o.pitch, tDist: o.dist,
      target: new T.Vector3(0, 0, 0), tTarget: new T.Vector3(0, 0, 0),
      autoRotate: o.autoRotate && !reduceMotion,
      onFrame: [], onReady: [],
      scene: null, camera: null, renderer: null, pivot: null,
      tick() {}
    };
    if (!hasWebGL) { el.classList.add("no-webgl"); return api; }

    function init() {
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(devicePixelRatio, isSmall() ? 1.6 : 2));
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = o.exposure;
      renderer.physicallyCorrectLights = true;
      el.prepend(renderer.domElement);

      const scene = new T.Scene();
      scene.environment = buildEnvironment(renderer, o.mood);
      const camera = new T.PerspectiveCamera(o.fov, 1, 0.05, 100);
      const pivot = new T.Group();
      scene.add(pivot);

      const key = new T.DirectionalLight(0xfff0dd, 2.2); key.position.set(-3, 5, 4); scene.add(key);
      const rim = new T.DirectionalLight(0xc9d6ff, 1.4); rim.position.set(4, 2, -5); scene.add(rim);
      scene.add(new T.AmbientLight(0xffffff, 0.15));

      if (o.shadow) {
        const sh = new T.Mesh(new T.PlaneGeometry(o.shadowSize, o.shadowSize), new T.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.85 }));
        sh.rotation.x = -Math.PI / 2; sh.position.y = o.shadowY; sh.renderOrder = -1;
        scene.add(sh); api.shadow = sh;
      }
      Object.assign(api, { renderer, scene, camera, pivot });
      resize();
      new ResizeObserver(resize).observe(el);
      if (o.interactive) bindControls();
      api.ready = true;
      el.classList.add("is-ready");
      api.onReady.forEach(f => f(api));
    }
    function resize() {
      if (!api.renderer) return;
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      api.renderer.setSize(w, h, false);
      api.camera.aspect = w / h;
      api.camera.updateProjectionMatrix();
    }

    api.tick = (dt, t) => {
      if (!api.ready) return;
      if (api.autoRotate && !api.dragging) api.tYaw += dt * o.speed;
      const k = 1 - Math.pow(0.0015, dt);
      api.yaw += (api.tYaw - api.yaw) * k;
      api.pitch += (api.tPitch - api.pitch) * k;
      api.dist += (api.tDist - api.dist) * k;
      api.target.lerp(api.tTarget, k);
      api.pivot.rotation.set(0, 0, 0);
      api.pivot.rotateOnWorldAxis(new T.Vector3(1, 0, 0), api.pitch);
      api.pivot.rotateOnWorldAxis(new T.Vector3(0, 1, 0), api.yaw);
      api.camera.position.set(api.target.x, api.target.y + o.height * (api.dist / o.dist) * 0.25, api.target.z + api.dist);
      api.camera.lookAt(api.target);
      api.onFrame.forEach(f => f(dt, t, api));
      api.renderer.render(api.scene, api.camera);
    };

    function bindControls() {
      const pts = new Map();
      let lastPinch = 0, lastTap = 0;
      el.addEventListener("pointerdown", e => {
        if (e.target.closest("button, a, input, select, label")) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        api.dragging = true;
        el.setPointerCapture(e.pointerId);
        const now = performance.now();
        if (e.pointerType === "touch" && now - lastTap < 280) api.zoomBy(api.tDist > o.dist * 0.75 ? 0.6 : 1 / 0.6);
        lastTap = now;
      });
      el.addEventListener("pointermove", e => {
        const p = pts.get(e.pointerId);
        if (!p) return;
        if (pts.size === 2) {
          const [a, b] = [...pts.values()];
          const d0 = Math.hypot(a.x - b.x, a.y - b.y);
          p.x = e.clientX; p.y = e.clientY;
          const [c, d] = [...pts.values()];
          const d1 = Math.hypot(c.x - d.x, c.y - d.y);
          if (lastPinch) api.tDist = clamp(api.tDist * (d0 / d1), o.minDist, o.maxDist);
          lastPinch = d1;
          return;
        }
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        p.x = e.clientX; p.y = e.clientY;
        api.tYaw += dx * 0.009;
        api.tPitch = clamp(api.tPitch + dy * 0.006, -1.2, 1.35);
      });
      const end = e => { pts.delete(e.pointerId); lastPinch = 0; if (!pts.size) api.dragging = false; };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      // Trackpad pinch arrives as ctrl+wheel; plain wheel keeps scrolling the page.
      el.addEventListener("wheel", e => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        api.tDist = clamp(api.tDist * (1 + e.deltaY * 0.01), o.minDist, o.maxDist);
      }, { passive: false });
    }

    api.add = obj => { api.whenReady(() => api.pivot.add(obj)); return obj; };
    api.clear = () => { if (!api.pivot) return; [...api.pivot.children].forEach(c => { api.pivot.remove(c); disposeDeep(c); }); };
    api.whenReady = f => { api.ready ? f(api) : api.onReady.push(f); };
    api.zoomBy = f => { api.tDist = clamp(api.tDist * f, o.minDist, o.maxDist); };
    api.view = name => {
      const V = Object.assign({
        front: [0, 0.12], back: [Math.PI, 0.12], side: [Math.PI / 2, 0.08], top: [0, 1.25], three: [0.6, 0.3]
      }, o.views || {});
      const v = V[name]; if (!v) return;
      // shortest path to the requested yaw
      const base = Math.round((api.tYaw - v[0]) / (Math.PI * 2)) * Math.PI * 2;
      api.tYaw = v[0] + base; api.tPitch = v[1];
      api.setAutoRotate(false);
    };
    api.focus = (pt, dist) => { api.tTarget.copy(pt); if (dist) api.tDist = dist; };
    api.reset = () => { api.tTarget.set(0, 0, 0); api.tDist = o.dist; api.tPitch = o.pitch; };
    api.setAutoRotate = b => { api.autoRotate = b && !reduceMotion; el.dispatchEvent(new CustomEvent("autorotate", { detail: api.autoRotate })); };

    // Lazy init + visibility
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !api.ready) init();
      api.visible = e.isIntersecting;
    }), { rootMargin: "200px 0px" });
    io.observe(el);
    stages.add(api);
    return api;
  }

  /* Standard controls bar: views + zoom + rotate toggle */
  function controls(stageApi, opts = {}) {
    const el = stageApi.el;
    const views = opts.views || ["front", "side", "back"];
    const bar = document.createElement("div");
    bar.className = "stage-ui";
    bar.innerHTML = `<div class="stage-btns">${views.map(v => `<button class="stage-btn" data-view="${v}">${v}</button>`).join("")}${(opts.extra || []).map(x => `<button class="stage-btn" data-extra="${x.id}" ${x.pressed != null ? `aria-pressed="${x.pressed}"` : ""}>${x.label}</button>`).join("")}</div>
      <div class="stage-btns"><button class="stage-btn" data-zoom="out" aria-label="Zoom out">−</button><button class="stage-btn" data-zoom="in" aria-label="Zoom in">+</button><button class="stage-btn" data-rot aria-pressed="${stageApi.autoRotate}" aria-label="Toggle rotation">360°</button></div>`;
    el.append(bar);
    if (stageApi.o.hint !== false) {
      const hint = document.createElement("div");
      hint.className = "stage-hint";
      hint.textContent = matchMedia("(pointer:coarse)").matches ? "Drag to rotate · double-tap to zoom" : "Drag to rotate · pinch or + to zoom";
      el.append(hint);
    }
    bar.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.view) stageApi.view(b.dataset.view);
      if (b.dataset.zoom) stageApi.zoomBy(b.dataset.zoom === "in" ? 0.8 : 1.25);
      if (b.hasAttribute("data-rot")) stageApi.setAutoRotate(!stageApi.autoRotate);
      if (b.dataset.extra) { const x = opts.extra.find(x => x.id === b.dataset.extra); x && x.onClick(b); }
    });
    el.addEventListener("autorotate", e => { const r = bar.querySelector("[data-rot]"); r && r.setAttribute("aria-pressed", String(e.detail)); });
    return bar;
  }

  /* ---------------- Textures ---------------- */
  const cache = {};
  function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

  function shadowTexture() {
    if (cache.shadow) return cache.shadow;
    const c = canvas(256, 256), g = c.getContext("2d");
    const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    grd.addColorStop(0, "rgba(0,0,0,0.75)"); grd.addColorStop(0.5, "rgba(0,0,0,0.3)"); grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    return (cache.shadow = new T.CanvasTexture(c));
  }

  // Tileable value noise
  function makeNoise(size, seed) {
    let s = seed || 1;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    return (grid) => {
      const g = []; for (let i = 0; i < grid * grid; i++) g.push(rnd());
      return (x, y) => {
        const fx = x / size * grid, fy = y / size * grid;
        const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        const v = (i, j) => g[((j % grid + grid) % grid) * grid + ((i % grid + grid) % grid)];
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        return (v(x0, y0) * (1 - sx) + v(x0 + 1, y0) * sx) * (1 - sy) + (v(x0, y0 + 1) * (1 - sx) + v(x0 + 1, y0 + 1) * sx) * sy;
      };
    };
  }

  // Height field per leather finish (0..1), cached
  function heightField(kind) {
    if (cache["h" + kind]) return cache["h" + kind];
    const N = 512, H = new Float32Array(N * N);
    const mk = makeNoise(N, kind.length * 977 + 13);
    const n1 = mk(64), n2 = mk(128), n3 = mk(16);
    if (kind === "croc") {
      // Jittered rectangular scales (Voronoi), tileable
      const gx = 7, gy = 12, cw = N / gx, ch = N / gy, pts = [];
      let sd = 4242; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) pts.push([(i + 0.15 + 0.7 * rr()) * cw, (j + 0.15 + 0.7 * rr()) * ch]);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let d1 = 1e9, d2 = 1e9;
        const ci = Math.floor(x / cw), cj = Math.floor(y / ch);
        for (let oj = -1; oj <= 1; oj++) for (let oi = -1; oi <= 1; oi++) {
          const i = ci + oi, j = cj + oj;
          const wi = (i + gx) % gx, wj = (j + gy) % gy;
          const p = pts[wj * gx + wi];
          const px = p[0] + (i - wi) * cw, py = p[1] + (j - wj) * ch;
          const dx = x - px, dy = (y - py) * 1.7;
          const d = dx * dx + dy * dy;
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
        }
        const edge = Math.sqrt(d2) - Math.sqrt(d1);
        const dome = Math.min(1, edge / 22);
        H[y * N + x] = Math.pow(dome, 0.6) * 0.85 + n2(x, y) * 0.15;
      }
    } else if (kind === "pebble") {
      const nA = mk(48), nB = mk(96);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = nA(x, y) * 0.6 + nB(x, y) * 0.4;
        H[y * N + x] = Math.pow(Math.abs(Math.sin(v * 9.0)), 0.5) * 0.8 + n2(x, y) * 0.2;
      }
    } else if (kind === "saffiano") {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const a = Math.abs(Math.sin((x + y) * 0.55)), b = Math.abs(Math.sin((x - y) * 0.55));
        H[y * N + x] = Math.min(a, b) * 0.7 + n1(x, y) * 0.3;
      }
    } else {
      // smooth / matte full grain: soft pores + low-frequency undulation
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        H[y * N + x] = n1(x, y) * 0.45 + n2(x, y) * 0.35 + n3(x, y) * 0.2;
      }
    }
    return (cache["h" + kind] = H);
  }

  function leather(hex, kind = "smooth", opts = {}) {
    const key = "L" + hex + kind;
    if (!cache[key]) {
      const N = 512, H = heightField(kind);
      const cMap = canvas(N, N), cB = canvas(N, N), cR = canvas(N, N);
      const gM = cMap.getContext("2d"), gB = cB.getContext("2d"), gR = cR.getContext("2d");
      const iM = gM.createImageData(N, N), iB = gB.createImageData(N, N), iR = gR.createImageData(N, N);
      const base = new T.Color(hex);
      const r = base.r * 255, g = base.g * 255, b = base.b * 255;
      const contrast = { croc: 0.55, pebble: 0.35, saffiano: 0.25, smooth: 0.18, matte: 0.12 }[kind] || 0.2;
      for (let i = 0; i < N * N; i++) {
        const h = H[i];
        const f = 1 - contrast + contrast * 1.6 * h;
        iM.data[i * 4] = Math.min(255, r * f); iM.data[i * 4 + 1] = Math.min(255, g * f); iM.data[i * 4 + 2] = Math.min(255, b * f); iM.data[i * 4 + 3] = 255;
        const hv = h * 255; iB.data[i * 4] = iB.data[i * 4 + 1] = iB.data[i * 4 + 2] = hv; iB.data[i * 4 + 3] = 255;
        const rough = kind === "matte" ? 230 - h * 20 : 150 + (1 - h) * 90 - (kind === "croc" ? h * 60 : 0);
        iR.data[i * 4] = iR.data[i * 4 + 1] = iR.data[i * 4 + 2] = rough; iR.data[i * 4 + 3] = 255;
      }
      gM.putImageData(iM, 0, 0); gB.putImageData(iB, 0, 0); gR.putImageData(iR, 0, 0);
      cache[key] = { cMap, cB, cR };
    }
    const { cMap, cB, cR } = cache[key];
    const tex = c => { const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t; };
    const map = tex(cMap); map.encoding = T.sRGBEncoding;
    const mat = new T.MeshStandardMaterial({
      map, bumpMap: tex(cB), roughnessMap: tex(cR),
      bumpScale: { croc: 0.012, pebble: 0.006, saffiano: 0.004, smooth: 0.0025, matte: 0.002 }[kind] || 0.003,
      roughness: 1, metalness: 0, envMapIntensity: kind === "matte" ? 0.35 : 0.8
    });
    const rep = opts.repeat || [1, 1];
    [mat.map, mat.bumpMap, mat.roughnessMap].forEach(t => t.repeat.set(rep[0], rep[1]));
    mat.userData.leather = { hex, kind };
    return mat;
  }

  const METALS = {
    silver: { color: 0xdfe1e4, roughness: 0.14 },
    brushed: { color: 0xc4c6c9, roughness: 0.32, brushed: true },
    brass: { color: 0xa8823f, roughness: 0.36, patina: true },
    gold: { color: 0xd8b064, roughness: 0.18 },
    gunmetal: { color: 0x55575d, roughness: 0.28 },
    matteblack: { color: 0x202022, roughness: 0.55, metalness: 0.55 }
  };
  function brushedTexture() {
    if (cache.brushed) return cache.brushed;
    const c = canvas(256, 256), g = c.getContext("2d");
    g.fillStyle = "#8a8a8a"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      const y = Math.random() * 256, v = 100 + Math.random() * 90;
      g.fillStyle = `rgba(${v},${v},${v},0.35)`; g.fillRect(0, y, 256, Math.random() * 1.2 + 0.2);
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping;
    return (cache.brushed = t);
  }
  function metal(kind = "silver") {
    const m = METALS[kind] || METALS.silver;
    const mat = new T.MeshStandardMaterial({ color: m.color, metalness: m.metalness ?? 1, roughness: m.roughness, envMapIntensity: 1.25 });
    if (m.brushed || m.patina) { mat.roughnessMap = brushedTexture(); mat.roughness = m.roughness * 1.6; }
    mat.userData.metal = kind;
    return mat;
  }
  function setMetal(mat, kind) {
    const m = METALS[kind] || METALS.silver;
    mat.color.set(m.color); mat.metalness = m.metalness ?? 1; mat.roughness = m.roughness * (m.brushed || m.patina ? 1.6 : 1);
    mat.roughnessMap = (m.brushed || m.patina) ? brushedTexture() : null;
    mat.needsUpdate = true; mat.userData.metal = kind;
  }

  /* ---------------- Engraving canvas ----------------
     Produces colour, roughness, bump and emissive (laser) maps for a
     buckle face. `progress` animates the engraving left → right. */
  const ENGRAVE_FONTS = {
    roman: '600 {s}px "Cinzel", "Cormorant Garamond", serif',
    serif: 'italic 600 {s}px "Cormorant Garamond", serif',
    sans: '700 {s}px "Manrope", sans-serif',
    script: '400 {s}px "Great Vibes", cursive',
    deva: '400 {s}px "Tiro Devanagari Hindi", serif'
  };
  function engraver(aspect = 2) {
    const W = 1024, H = Math.round(1024 / aspect);
    const mask = canvas(W, H), col = canvas(W, H), rough = canvas(W, H), bump = canvas(W, H), glow = canvas(W, H);
    const tx = {};
    [["map", col], ["roughnessMap", rough], ["bumpMap", bump], ["emissiveMap", glow]].forEach(([k, c]) => {
      const t = new T.CanvasTexture(c); t.anisotropy = 8; tx[k] = t;
    });
    tx.map.encoding = T.sRGBEncoding;
    const state = { text: "", font: "roman", style: "deep", image: null, progress: 1, border: true, emblem: false };

    function drawMask() {
      const g = mask.getContext("2d");
      g.clearRect(0, 0, W, H);
      g.fillStyle = "#fff"; g.strokeStyle = "#fff";
      if (state.border) { g.lineWidth = 6; roundRect(g, 26, 26, W - 52, H - 52, 40); g.stroke(); g.lineWidth = 2; roundRect(g, 44, 44, W - 88, H - 88, 30); g.stroke(); }
      if (state.image) {
        const img = state.image, maxW = W * 0.7, maxH = H * 0.66;
        const s = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * s, h = img.height * s;
        const tmp = canvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))), tg = tmp.getContext("2d");
        tg.drawImage(img, 0, 0, tmp.width, tmp.height);
        const d = tg.getImageData(0, 0, tmp.width, tmp.height);
        for (let i = 0; i < d.data.length; i += 4) {
          const lum = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) / 255;
          const on = d.data[i + 3] > 100 && lum < 0.6; // dark, opaque pixels become engraved
          d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = on ? 255 : 0;
        }
        tg.putImageData(d, 0, 0);
        g.drawImage(tmp, (W - w) / 2, (H - h) / 2 - (state.text ? H * 0.08 : 0));
      }
      if (state.emblem && !state.image && !state.text) {
        const em = emblemImage();
        if (!em.complete) em.addEventListener("load", () => { drawMask(); compose(); }, { once: true });
        else {
          const h = H * 0.7, w = h * 64 / 72;
          g.drawImage(cache.emblemImg, (W - w) / 2, (H - h) / 2, w, h);
        }
      }
      if (state.text) {
        const txt = state.text;
        let size = state.image ? H * 0.16 : H * 0.42;
        const f = (ENGRAVE_FONTS[state.font] || ENGRAVE_FONTS.roman);
        g.font = f.replace("{s}", size);
        const maxW = W * 0.78;
        while (g.measureText(txt).width > maxW && size > 12) { size -= 4; g.font = f.replace("{s}", size); }
        g.textAlign = "center"; g.textBaseline = "middle";
        const y = state.image ? H * 0.82 : H * 0.53;
        if (state.font === "roman" || state.font === "sans") g.letterSpacing = "0.08em";
        if (state.style === "outline") { g.lineWidth = Math.max(2, size * 0.04); g.strokeText(txt, W / 2, y); }
        else g.fillText(txt, W / 2, y);
      }
    }

    function compose() {
      const p = state.progress;
      const cut = W * p;
      const metalBase = state.style === "relief" ? 150 : 205;
      // colour
      const gc = col.getContext("2d");
      gc.fillStyle = `rgb(${metalBase},${metalBase},${metalBase})`; gc.fillRect(0, 0, W, H);
      for (let i = 0; i < 260; i++) { const y = Math.random() * H, v = metalBase - 20 + Math.random() * 40; gc.fillStyle = `rgba(${v},${v},${v},.35)`; gc.fillRect(0, y, W, 1); }
      const paint = (g, color, shadow) => {
        g.save(); g.beginPath(); g.rect(0, 0, cut, H); g.clip();
        const tmp = canvas(W, H), tg = tmp.getContext("2d");
        tg.drawImage(mask, 0, 0); tg.globalCompositeOperation = "source-in"; tg.fillStyle = color; tg.fillRect(0, 0, W, H);
        if (shadow) { g.shadowColor = shadow; g.shadowBlur = 6; g.shadowOffsetY = 3; }
        g.drawImage(tmp, 0, 0); g.restore();
      };
      const fillCol = { deep: "rgb(38,36,34)", laser: "rgb(95,92,88)", relief: "rgb(245,245,245)", outline: "rgb(40,38,36)" }[state.style] || "rgb(40,40,40)";
      paint(gc, fillCol, state.style === "relief" ? "rgba(0,0,0,.6)" : null);
      // roughness: engraved = rough/frosted, relief = polished on raised parts
      const gr = rough.getContext("2d");
      gr.fillStyle = state.style === "relief" ? "rgb(150,150,150)" : "rgb(60,60,60)"; gr.fillRect(0, 0, W, H);
      paint(gr, state.style === "relief" ? "rgb(25,25,25)" : (state.style === "laser" ? "rgb(200,200,200)" : "rgb(235,235,235)"));
      // bump: engraved = recessed, relief = raised
      const gb = bump.getContext("2d");
      gb.fillStyle = state.style === "relief" ? "rgb(40,40,40)" : "rgb(220,220,220)"; gb.fillRect(0, 0, W, H);
      gb.filter = "blur(2px)";
      paint(gb, state.style === "relief" ? "rgb(255,255,255)" : (state.style === "laser" ? "rgb(170,170,170)" : "rgb(0,0,0)"));
      gb.filter = "none";
      // glow: laser head
      const gg = glow.getContext("2d");
      gg.fillStyle = "#000"; gg.fillRect(0, 0, W, H);
      if (p > 0 && p < 1) {
        const grd = gg.createLinearGradient(cut - 40, 0, cut + 4, 0);
        grd.addColorStop(0, "rgba(255,140,40,0)"); grd.addColorStop(1, "rgba(255,190,90,1)");
        gg.save(); gg.beginPath(); gg.rect(cut - 40, 0, 44, H); gg.clip();
        gg.drawImage(mask, 0, 0); gg.globalCompositeOperation = "source-in"; gg.fillStyle = grd; gg.fillRect(0, 0, W, H); gg.restore();
        gg.fillStyle = "rgba(255,220,160,.9)"; gg.fillRect(cut - 1, 0, 2, H);
      }
      Object.values(tx).forEach(t => (t.needsUpdate = true));
    }

    const api = {
      textures: tx, state,
      set(patch) { Object.assign(state, patch); drawMask(); compose(); },
      animate(duration = 2.4) {
        const t0 = performance.now();
        return new Promise(res => {
          const step = () => {
            const k = Math.min(1, (performance.now() - t0) / 1000 / duration);
            state.progress = k; compose();
            k < 1 ? requestAnimationFrame(step) : res();
          };
          step();
        });
      },
      material(metalKind = "silver") {
        const m = METALS[metalKind] || METALS.silver;
        const mat = new T.MeshStandardMaterial({
          color: m.color, metalness: m.metalness ?? 1, roughness: 1,
          map: tx.map, roughnessMap: tx.roughnessMap, bumpMap: tx.bumpMap, bumpScale: 0.006,
          emissive: 0xffffff, emissiveMap: tx.emissiveMap, emissiveIntensity: 1.6, envMapIntensity: 1.3
        });
        mat.userData.metal = metalKind;
        return mat;
      }
    };
    drawMask(); compose();
    // Redraw once web fonts are ready
    if (document.fonts) document.fonts.ready.then(() => { drawMask(); compose(); });
    return api;
  }

  // Rasterise the emblem once for use on metal surfaces
  function emblemImage() {
    if (cache.emblemImg) return cache.emblemImg;
    const svg = window.SH.emblem({ color: "#ffffff" }).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="720" ');
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    return (cache.emblemImg = img);
  }

  function textTexture(text, opts = {}) {
    const c = canvas(opts.w || 512, opts.h || 256), g = c.getContext("2d");
    g.fillStyle = opts.bg || "rgba(0,0,0,0)"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = opts.color || "#d8bd85";
    g.font = opts.font || '600 120px "Cinzel", serif';
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, c.width / 2, c.height / 2);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    return t;
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function disposeDeep(o) {
    o.traverse(n => {
      if (n.geometry) n.geometry.dispose();
      if (n.material) [].concat(n.material).forEach(m => m.dispose());
    });
  }
  const ease = {
    inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    out: t => 1 - Math.pow(1 - t, 3),
    back: t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };
  // Simple tween helper bound to rAF
  function tween(from, to, dur, onUpdate, easing = ease.inOut) {
    return new Promise(res => {
      if (reduceMotion) { onUpdate(to); return res(); }
      const t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / (dur * 1000));
        onUpdate(from + (to - from) * easing(k));
        k < 1 ? requestAnimationFrame(step) : res();
      };
      step();
    });
  }

  window.SH3D = { hasWebGL, reduceMotion, stage, controls, leather, metal, setMetal, engraver, emblemImage, textTexture, shadowTexture, clamp, ease, tween, disposeDeep, METALS };
})();
