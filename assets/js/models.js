/* =========================================================
   SHAURYA procedural product models
   Every product is built from its own geometry (strap path, width,
   tip, buckle construction, stitching), not a recoloured template.
   Units: 1 ≈ 10 cm for wallets; belts are presentation-scaled.
   ========================================================= */
(function () {
  const T = window.THREE;
  const K = window.SH3D;
  if (!T || !K) return;
  const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const UP = V3(0, 1, 0);
  const TAU = Math.PI * 2;
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ---------------- Ribbon (swept rectangle) ----------------
     samples: [{p:Vector3, w:Number, twist:Number}]
     groups: 0 outer face, 1 inner face, 2 edges + caps. */
  function ribbon(samples, th, uvScale = 0.6) {
    const n = samples.length;
    const frames = [];
    let s = 0;
    for (let i = 0; i < n; i++) {
      const a = samples[Math.max(0, i - 1)].p, b = samples[Math.min(n - 1, i + 1)].p;
      const t = b.clone().sub(a).normalize();
      const side = t.clone().cross(UP).normalize();
      const up = UP.clone();
      const phi = samples[i].twist || 0;
      const S = side.clone().multiplyScalar(Math.cos(phi)).add(up.clone().multiplyScalar(Math.sin(phi)));
      const U = up.clone().multiplyScalar(Math.cos(phi)).sub(side.clone().multiplyScalar(Math.sin(phi)));
      if (i > 0) s += samples[i].p.distanceTo(samples[i - 1].p);
      frames.push({ p: samples[i].p, T: t, S, U, w: samples[i].w, s });
    }
    const pos = [], nor = [], uv = [], idx = [];
    const groups = [[], [], []];
    const hth = th / 2;
    function strip(group, getPair, getNormal, vScale) {
      const base = pos.length / 3;
      frames.forEach(f => {
        const [p0, p1] = getPair(f);
        const nn = getNormal(f);
        pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
        nor.push(nn.x, nn.y, nn.z, nn.x, nn.y, nn.z);
        const u = f.s / uvScale;
        uv.push(u, 0.5 + vScale(f) / 2, u, 0.5 - vScale(f) / 2);
      });
      const start = idx.length;
      for (let i = 0; i < n - 1; i++) {
        const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, b, c, b, d, c);
      }
      groups[group].push([start, idx.length - start]);
    }
    const A = f => f.p.clone().addScaledVector(f.S, hth).addScaledVector(f.U, f.w / 2);
    const B = f => f.p.clone().addScaledVector(f.S, hth).addScaledVector(f.U, -f.w / 2);
    const C = f => f.p.clone().addScaledVector(f.S, -hth).addScaledVector(f.U, f.w / 2);
    const D = f => f.p.clone().addScaledVector(f.S, -hth).addScaledVector(f.U, -f.w / 2);
    strip(0, f => [A(f), B(f)], f => f.S, f => f.w / uvScale);
    strip(1, f => [D(f), C(f)], f => f.S.clone().negate(), f => f.w / uvScale);
    strip(2, f => [C(f), A(f)], f => f.U, () => th / uvScale);
    strip(2, f => [B(f), D(f)], f => f.U.clone().negate(), () => th / uvScale);
    // caps
    const cap = (f, end) => {
      const base = pos.length / 3;
      const nn = end ? f.T : f.T.clone().negate();
      [A(f), B(f), C(f), D(f)].forEach(v => { pos.push(v.x, v.y, v.z); nor.push(nn.x, nn.y, nn.z); uv.push(0, 0); });
      const start = idx.length;
      if (end) idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
      else idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      groups[2].push([start, 6]);
    };
    cap(frames[0], false); cap(frames[n - 1], true);

    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    groups.forEach((list, gi) => list.forEach(([st, ct]) => g.addGroup(st, ct, gi)));
    return { geometry: g, frames, length: s };
  }

  /* Belt loop path: a softened oval, worn shape. The tail passes over
     the start through the buckle at the front (θ = 2π). */
  function beltSamples(o) {
    const { rx, rz, width, th, tip = "round", start = 0.04, tail = 0.95, n = 420, twist } = o;
    const out = [];
    const end = TAU + tail;
    const tipLen = tip === "square" ? 0 : width * (tip === "point" ? 1.1 : 0.55);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const th0 = start + (end - start) * (i / n);
      const sx = Math.sin(th0), cz = Math.cos(th0);
      const e = 2 / 2.7; // superellipse exponent → slightly squared waist
      const r = 1 + (th * 1.35 / rz) * smooth(TAU - 0.55, TAU - 0.22, th0);
      pts.push(V3(Math.sign(sx) * Math.pow(Math.abs(sx), e) * rx * r, 0, Math.sign(cz) * Math.pow(Math.abs(cz), e) * rz * r));
    }
    // arc length for tip shaping
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = L[L.length - 1];
    pts.forEach((p, i) => {
      const fromEnd = total - L[i];
      let w = width;
      if (tipLen && fromEnd < tipLen) {
        const k = fromEnd / tipLen;
        w = tip === "point" ? width * Math.min(1, 0.12 + k * 0.95) : width * Math.sqrt(Math.max(0.02, 1 - (1 - k) * (1 - k)));
      }
      out.push({ p, w, twist: twist ? twist(L[i] / total, L[i], total) : 0 });
    });
    return out;
  }

  /* Place instanced items along strap frames by arc length */
  function along(frames, from, to, step, fn) {
    const res = [];
    let j = 0;
    for (let s = from; s <= to; s += step) {
      while (j < frames.length - 2 && frames[j + 1].s < s) j++;
      const a = frames[j], b = frames[j + 1];
      const k = (s - a.s) / Math.max(1e-6, b.s - a.s);
      res.push(fn({
        p: a.p.clone().lerp(b.p, k), T: a.T.clone().lerp(b.T, k).normalize(),
        S: a.S.clone().lerp(b.S, k).normalize(), U: a.U.clone().lerp(b.U, k).normalize(),
        w: a.w + (b.w - a.w) * k, s
      }));
    }
    return res;
  }
  function instanced(geo, mat, mats) {
    const m = new T.InstancedMesh(geo, mat, mats.length);
    mats.forEach((mx, i) => m.setMatrixAt(i, mx));
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false; // bounds of a single instance would cull the whole set

    return m;
  }
  function basis(T_, U_, S_, p) { return new T.Matrix4().makeBasis(T_, U_, S_).setPosition(p); }

  /* ---------------- Buckles ----------------
     Built facing +z, strap running along x, width along y. */
  function rrShape(w, h, r, holeW, holeH, holeR) {
    const s = new T.Shape();
    rr(s, -w / 2, -h / 2, w, h, r);
    if (holeW) { const p = new T.Path(); rr(p, -holeW / 2, -holeH / 2, holeW, holeH, holeR); s.holes.push(p); }
    return s;
  }
  function rr(p, x, y, w, h, r) {
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
    p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
    p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
  }
  function extrude(shape, depth, bevel = 0.008, segs = 3) {
    const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 18 });
    g.translate(0, 0, -depth / 2);
    return g;
  }
  function prong(len, metal) {
    const g = new T.Group();
    const bar = new T.Mesh(new T.CylinderGeometry(0.0085, 0.0085, len, 16), metal);
    bar.rotation.z = Math.PI / 2; g.add(bar);
    const tip = new T.Mesh(new T.SphereGeometry(0.0095, 16, 12), metal);
    tip.position.x = -len / 2; g.add(tip);
    return g;
  }

  function buckleFrame(W, metal, o = {}) {
    const g = new T.Group();
    const bw = o.bw || 0.24, bh = W + 0.075, bar = o.bar || 0.03;
    const frame = new T.Mesh(extrude(rrShape(bw, bh, o.r ?? 0.02, bw - bar * 2, bh - bar * 2, Math.max(0.004, (o.r ?? 0.02) - bar * 0.5)), 0.03, 0.009), metal);
    g.add(frame);
    const pr = prong(bw - bar * 0.6, metal); pr.position.z = 0.012; g.add(pr);
    // centre bar the strap wraps around
    const cb = new T.Mesh(new T.CylinderGeometry(0.011, 0.011, bh - bar, 16), metal);
    cb.position.set(bw / 2 - bar / 2, 0, -0.004); g.add(cb);
    return g;
  }

  function buckleArch(W, metal) {
    // Heritage: frame with ogee arches top and bottom, beaded corners
    const g = new T.Group();
    const bw = 0.30, bh = W + 0.11, bar = 0.038;
    // outline: straight sides, palace-window arches top and bottom
    const outline = new T.Shape();
    outline.moveTo(bw / 2, -bh / 2);
    outline.lineTo(bw / 2, bh / 2);
    outline.quadraticCurveTo(bw / 2 - 0.02, bh / 2 + 0.007, 0.02, bh / 2 + 0.031);
    outline.quadraticCurveTo(0, bh / 2 + 0.052, -0.02, bh / 2 + 0.031);
    outline.quadraticCurveTo(-bw / 2 + 0.02, bh / 2 + 0.007, -bw / 2, bh / 2);
    outline.lineTo(-bw / 2, -bh / 2);
    outline.quadraticCurveTo(-bw / 2 + 0.02, -bh / 2 - 0.007, -0.02, -bh / 2 - 0.031);
    outline.quadraticCurveTo(0, -bh / 2 - 0.052, 0.02, -bh / 2 - 0.031);
    outline.quadraticCurveTo(bw / 2 - 0.02, -bh / 2 - 0.007, bw / 2, -bh / 2);
    const hole = new T.Path();
    rr(hole, -bw / 2 + bar, -bh / 2 + bar, bw - bar * 2, bh - bar * 2, 0.012);
    outline.holes.push(hole);
    g.add(new T.Mesh(extrude(outline, 0.034, 0.01, 4), metal));
    // beads + engraved ridges
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
      const b = new T.Mesh(new T.SphereGeometry(0.012, 16, 12), metal);
      b.position.set(sx * (bw / 2 - bar / 2), sy * (bh / 2 - bar / 2), 0.026); g.add(b);
    });
    [-1, 1].forEach(sy => {
      const r = new T.Mesh(new T.TorusGeometry(0.014, 0.004, 8, 24), metal);
      r.position.set(0, sy * (bh / 2 + 0.012), 0.024); g.add(r);
    });
    const pr = prong(bw - bar * 0.7, metal); pr.position.z = 0.014; g.add(pr);
    return g;
  }

  function bucklePlate(W, metal, faceMat, o = {}) {
    const g = new T.Group();
    const bw = o.bw || 0.4, bh = W + (o.extra || 0.08), r = o.r ?? 0.04, d = o.d || 0.045, bev = o.bev ?? 0.012;
    const body = new T.Mesh(extrude(rrShape(bw, bh, r), d, bev, 4), metal);
    g.add(body);
    if (faceMat) {
      const fs = rrShape(bw - 0.004, bh - 0.004, Math.max(0.005, r - 0.002));
      const fg = new T.ShapeGeometry(fs, 24);
      // map shape coords to 0..1 UVs
      const uv = fg.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / bw + 0.5, uv.getY(i) / bh + 0.5);
      const face = new T.Mesh(fg, faceMat);
      face.position.z = d / 2 + bev + 0.0008;
      g.add(face);
      g.userData.face = face;
    }
    // hidden hook behind the plate
    const hook = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, W * 0.6, 12), metal);
    hook.position.set(-bw * 0.18, 0, -d / 2 - 0.02); g.add(hook);
    g.userData.size = [bw, bh];
    return g;
  }

  function buckleTrack(W, metal, faceMat) {
    // Urban: low, squared track buckle with lever and grip ridges
    const g = bucklePlate(W, metal, faceMat, { bw: 0.42, extra: 0.05, r: 0.012, d: 0.06, bev: 0.008 });
    const lever = new T.Mesh(extrude(rrShape(0.07, W + 0.02, 0.01), 0.02, 0.005), metal);
    lever.position.set(-0.16, 0, 0.05); g.add(lever);
    for (let i = 0; i < 5; i++) {
      const rib = new T.Mesh(new T.BoxGeometry(0.004, W * 0.75, 0.006), new T.MeshStandardMaterial({ color: 0x111113, metalness: 0.8, roughness: 0.4 }));
      rib.position.set(-0.185 + i * 0.012, 0, 0.062); g.add(rib);
    }
    return g;
  }

  function buckleSwivel(W, metal) {
    // Reverso: rectangular frame mounted on a clamp with swivel pins
    const g = new T.Group();
    const frame = new T.Group();
    frame.add(buckleFrame(W, metal, { bw: 0.24, r: 0.03, bar: 0.032 }));
    g.add(frame);
    const clamp = new T.Mesh(extrude(rrShape(0.09, W + 0.02, 0.012), 0.02, 0.006), metal);
    clamp.position.set(0.17, 0, -0.012); g.add(clamp);
    [-1, 1].forEach(s => {
      const pin = new T.Mesh(new T.CylinderGeometry(0.016, 0.016, 0.03, 20), metal);
      pin.position.set(0.13, s * (W / 2 + 0.035), 0); g.add(pin);
      const rivet = new T.Mesh(new T.SphereGeometry(0.009, 12, 8), metal);
      rivet.position.set(0.19, s * W * 0.25, 0.006); g.add(rivet);
    });
    g.userData.swivel = frame;
    return g;
  }

  /* ---------------- Belt ---------------- */
  const BELTS = {
    classic:   { width: 0.22, th: 0.03,  rx: 1.22, rz: 0.92, tip: "round", leather: "#141210", kind: "smooth", metal: "silver", buckle: "frame", holes: 5, edge: "#0a0908" },
    heritage:  { width: 0.29, th: 0.036, rx: 1.26, rz: 0.96, tip: "point", leather: "#3b2414", kind: "pebble", metal: "brass", buckle: "arch", holes: 5, stitch: "#c9a46a", keeper: true, edge: "#1d110a" },
    urban:     { width: 0.31, th: 0.04,  rx: 1.28, rz: 0.98, tip: "square", leather: "#1c1c1d", kind: "matte", metal: "gunmetal", buckle: "track", holes: 0, edge: "#111", track: true },
    reverso:   { width: 0.26, th: 0.034, rx: 1.24, rz: 0.94, tip: "round", leather: "#141210", inner: "#3b2414", kind: "smooth", metal: "brushed", buckle: "swivel", holes: 5, edge: "#0d0b0a" },
    signature: { width: 0.28, th: 0.038, rx: 1.26, rz: 0.96, tip: "round", leather: "#141210", kind: "croc", metal: "gold", buckle: "plaque", holes: 0, stitch: "#1a1715", edge: "#0b0908", uv: 1.0 },
    personal:  { width: 0.27, th: 0.036, rx: 1.25, rz: 0.95, tip: "round", leather: "#141210", kind: "smooth", metal: "silver", buckle: "plate", holes: 0, edge: "#0b0908" }
  };

  function belt(id, opt = {}) {
    const spec = Object.assign({}, BELTS[id] || BELTS.classic, opt);
    const group = new T.Group();
    group.name = "belt-" + id;
    const outerMat = K.leather(spec.leather, spec.kind, { repeat: [1, 1] });
    const innerMat = spec.inner ? K.leather(spec.inner, "smooth") : K.leather(shadeHex(spec.leather, 1.25), "matte");
    const edgeMat = new T.MeshStandardMaterial({ color: spec.inner ? "#1a120c" : spec.edge, roughness: 0.38, metalness: 0, envMapIntensity: 0.9 });
    const metalMat = K.metal(spec.metal);
    let strap, frames, twistProgress = 0;

    function buildStrap() {
      const tw = spec.inner && twistProgress > 0
        ? (u) => Math.PI * smooth(0, 0.12, twistProgress * 1.12 - u * 1.0 + 0.0)
        : null;
      const r = ribbon(beltSamples({ rx: spec.rx, rz: spec.rz, width: spec.width, th: spec.th, tip: spec.tip, twist: tw }), spec.th, spec.uv || 0.6);
      if (strap) { strap.geometry.dispose(); strap.geometry = r.geometry; }
      else { strap = new T.Mesh(r.geometry, [outerMat, innerMat, edgeMat]); group.add(strap); }
      frames = r.frames;
      return r;
    }
    const built = buildStrap();
    const total = built.length;

    // Front position (θ = 2π) of the tail
    const front = frames.reduce((best, f) => (f.p.z > best.p.z && f.s > total * 0.6 ? f : best), frames[0]);
    const zFront = front.p.z;

    // Holes (through both faces)
    const extras = new T.Group(); group.add(extras);
    if (spec.holes) {
      const holeGeo = new T.CircleGeometry(spec.width * 0.055, 20);
      const holeMat = new T.MeshBasicMaterial({ color: 0x050403 });
      const startS = front.s + (spec.keeper ? 0.26 : 0.2), mats = [];
      along(frames, startS, startS + 0.11 * (spec.holes - 1) + 0.001, 0.11, f => {
        [1, -1].forEach(side => {
          const n = f.S.clone().multiplyScalar(side);
          const p = f.p.clone().addScaledVector(n, spec.th / 2 + 0.0012);
          const q = new T.Quaternion().setFromUnitVectors(V3(0, 0, 1), n);
          mats.push(new T.Matrix4().compose(p, q, V3(1, 1, 1)));
        });
      });
      extras.add(instanced(holeGeo, holeMat, mats));
    }
    // Stitching along both edges on the outer face
    if (spec.stitch) {
      const sg = new T.BoxGeometry(0.018, 0.0045, 0.004);
      const sm = new T.MeshStandardMaterial({ color: spec.stitch, roughness: 0.7 });
      const mats = [];
      along(frames, 0.05, total - 0.08, 0.03, f => {
        [1, -1].forEach(sy => {
          const p = f.p.clone().addScaledVector(f.S, spec.th / 2 + 0.0015).addScaledVector(f.U, sy * (f.w / 2 - 0.022));
          if (f.w > spec.width * 0.6) mats.push(basis(f.T, f.U, f.S, p));
        });
      });
      extras.add(instanced(sg, sm, mats));
    }
    // Track teeth on the underside of Urban strap tail (hidden ratchet)
    if (spec.track) {
      const tg = new T.BoxGeometry(0.008, spec.width * 0.7, 0.006);
      const tm = new T.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.8 });
      const mats = [];
      along(frames, front.s - 0.3, total - 0.06, 0.025, f => mats.push(basis(f.T, f.U, f.S, f.p.clone().addScaledVector(f.S, -spec.th / 2 - 0.002))));
      extras.add(instanced(tg, tm, mats));
    }
    // Keeper loop (Heritage)
    if (spec.keeper) {
      // Leather loop wrapping the tail and the strap beneath it, beside the buckle.
      const inS = spec.th * 2.6, inU = spec.width + 0.006;
      const kp = new T.Mesh(
        extrude(rrShape(inS + 0.022, inU + 0.022, 0.008, inS, inU, 0.004), 0.05, 0.004),
        K.leather(spec.leather, spec.kind)
      );
      const f = along(frames, front.s + 0.13, front.s + 0.13, 1, x => x)[0];
      kp.position.copy(f.p).addScaledVector(f.S, -spec.th * 0.67);
      kp.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(f.S, f.U, f.T.clone().negate()));
      group.add(kp);
    }

    // Buckle
    let engr = null, face = null;
    const W = spec.width;
    let buckle;
    if (spec.buckle === "frame") buckle = buckleFrame(W, metalMat, { bw: 0.2, r: 0.006, bar: 0.026 });
    else if (spec.buckle === "arch") buckle = buckleArch(W, metalMat);
    else if (spec.buckle === "swivel") buckle = buckleSwivel(W, metalMat);
    else {
      const aspect = spec.buckle === "track" ? 0.42 / (W + 0.05) : spec.buckle === "plaque" ? 0.4 / (W + 0.08) : 0.46 / (W + 0.1);
      engr = K.engraver(aspect);
      if (spec.buckle === "track") { engr.set({ text: "SHAURYA", font: "sans", style: "laser", border: false }); buckle = buckleTrack(W, metalMat, engr.material(spec.metal)); }
      else if (spec.buckle === "plaque") { engr.set({ text: "", emblem: true, style: "relief", border: true }); buckle = bucklePlate(W, metalMat, engr.material(spec.metal), { bw: 0.4, extra: 0.08, r: 0.05 }); }
      else { engr.set({ text: opt.text || "A K", font: "roman", style: "deep", border: true }); buckle = bucklePlate(W, metalMat, engr.material(spec.metal), { bw: 0.46, extra: 0.1, r: 0.03, d: 0.05 }); }
      face = buckle.userData.face;
    }
    const isPlate = !!engr;
    buckle.position.set(0, 0, zFront + (isPlate ? spec.th / 2 + 0.035 : 0));
    group.add(buckle);

    // Fit and centre
    group.position.y = 0;

    const api = {
      group, spec, buckle, engraver: engr, face, frames,
      buckleWorld: () => buckle.getWorldPosition(V3()),
      setLeather(hex, kind) {
        const k = kind || spec.kind;
        const nm = K.leather(hex, k);
        strap.material[0].dispose(); strap.material[0] = nm;
        if (!spec.inner) { strap.material[1].dispose(); strap.material[1] = K.leather(shadeHex(hex, 1.25), "matte"); }
        spec.leather = hex; spec.kind = k;
        const lightEdge = new T.Color(hex).getHSL({}).l > 0.12;
        edgeMat.color.set(lightEdge ? shadeHex(hex, 0.6) : spec.edge);
      },
      setMetal(kind) {
        K.setMetal(metalMat, kind);
        if (face) K.setMetal(face.material, kind), (face.material.roughness = 1);
        spec.metal = kind;
      },
      // Reverso: animate the strap turning inside-out while the buckle swivels.
      async reverse() {
        if (!spec.inner || api.busy) return;
        api.busy = true;
        extras.visible = false;
        const sw = buckle.userData.swivel;
        const r0 = sw ? sw.rotation.x : 0;
        await K.tween(0, 1, 2.6, k => {
          twistProgress = k; buildStrap();
          if (sw) sw.rotation.x = r0 + Math.PI * K.ease.inOut(Math.min(1, k * 1.4));
        });
        // swap materials so the strap is rebuilt flat with the other face outside
        const [o, i] = strap.material; strap.material[0] = i; strap.material[1] = o;
        twistProgress = 0; buildStrap();
        extras.visible = true;
        api.flipped = !api.flipped;
        api.busy = false;
      }
    };
    return api;
  }

  function shadeHex(hex, f) {
    const c = new T.Color(hex); c.multiplyScalar(f);
    return "#" + c.getHexString();
  }

  /* ---------------- Wallets ---------------- */
  function panel(w, h, d, mat, r = 0.05) {
    const m = new T.Mesh(extrude(rrShape(w, h, r), d, 0.008, 2), mat);
    // ExtrudeGeometry UVs are in shape units; scale for leather tiling
    const uv = m.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.7, uv.getY(i) / 0.7);
    return m;
  }
  function stitchRect(w, h, inset, z, color, step = 0.035) {
    const pts = [];
    const x0 = -w / 2 + inset, x1 = w / 2 - inset, y0 = -h / 2 + inset, y1 = h / 2 - inset;
    for (let x = x0; x <= x1; x += step) { pts.push([x, y0, 0]); pts.push([x, y1, 0]); }
    for (let y = y0 + step; y < y1; y += step) { pts.push([x0, y, Math.PI / 2]); pts.push([x1, y, Math.PI / 2]); }
    const geo = new T.BoxGeometry(0.02, 0.005, 0.004);
    const mat = new T.MeshStandardMaterial({ color, roughness: 0.7 });
    const mats = pts.map(([x, y, rot]) => new T.Matrix4().compose(V3(x, y, z), new T.Quaternion().setFromAxisAngle(V3(0, 0, 1), rot), V3(1, 1, 1)));
    return instanced(geo, mat, mats);
  }
  function card(color, w = 0.86, h = 0.54) {
    const m = new T.Mesh(extrude(rrShape(w, h, 0.03), 0.008, 0.001, 1), new T.MeshStandardMaterial({ color, roughness: 0.35, metalness: color === "#c9a35e" ? 0.7 : 0.1 }));
    return m;
  }
  function slots(w, count, startY, gap, z, mat, step = 0.0045) {
    const g = new T.Group();
    for (let i = 0; i < count; i++) {
      const sh = 0.36;
      const p = panel(w, sh, 0.006, mat, 0.02);
      p.position.set(0, startY - i * gap - sh / 2, z + i * step);
      g.add(p);
      // slot mouth shadow
      const lip = new T.Mesh(new T.BoxGeometry(w - 0.04, 0.008, 0.002), new T.MeshBasicMaterial({ color: 0x050403 }));
      lip.position.set(0, startY - i * gap - 0.004, z + i * step + 0.006);
      g.add(lip);
    }
    return g;
  }

  function wallet(id, opt = {}) {
    const hex = opt.leather || "#141210";
    const kind = id === "slim" ? "saffiano" : "smooth";
    const outer = K.leather(hex, kind);
    const inner = K.leather(shadeHex(hex, 1.35), kind === "saffiano" ? "saffiano" : "pebble");
    const stitchCol = opt.stitch || (new T.Color(hex).getHSL({}).l > 0.15 ? "#e8dcc6" : "#2b2622");
    const group = new T.Group();
    const api = { group, id, open: 0 };
    let monoEngr = null;

    if (id === "slim") {
      const W = 1.02, H = 0.72, d = 0.03;
      const body = panel(W, H, d, outer, 0.06); group.add(body);
      group.add(Object.assign(stitchRect(W, H, 0.035, d / 2 + 0.01, stitchCol), {}));
      const back = stitchRect(W, H, 0.035, -d / 2 - 0.01, stitchCol); group.add(back);
      // front & back slot layers (stepped)
      [1, -1].forEach(side => {
        for (let i = 0; i < 2; i++) {
          const p = panel(W - 0.002, 0.42 - i * 0.12, 0.006, inner, 0.05);
          p.position.set(0, -H / 2 + (0.42 - i * 0.12) / 2, side * (d / 2 + 0.008 + i * 0.007));
          group.add(p);
        }
      });
      // emblem on front slot
      const em = new T.Mesh(new T.PlaneGeometry(0.12, 0.135), new T.MeshStandardMaterial({ map: emblemTex(), transparent: true, metalness: 0.9, roughness: 0.3, color: 0xd8bd85 }));
      em.position.set(0, -0.2, d / 2 + 0.025); group.add(em);
      // cards in central pocket
      const c1 = card("#c9a35e"), c2 = card("#1d1d1f");
      c1.position.set(0.02, 0.02, 0.0); c2.position.set(-0.03, 0.0, -0.01);
      group.add(c1, c2);
      api.cards = [c1, c2];
      api.setOpen = k => { api.open = k; c1.position.y = 0.02 + k * 0.42; c2.position.y = k * 0.26; };
      api.setOpen(0);
      group.rotation.x = -0.1;
      return api;
    }

    const long = id === "long";
    const W = long ? 1.9 : 1.12, H = long ? 0.96 : 0.92, d = 0.035, gap = 0.022;
    // Fixed half and folding half
    const fixed = new T.Group(); const fold = new T.Group();
    const body = new T.Group(); group.add(body);
    body.add(fixed, fold);
    const outerP = panel(W, H, d, outer, 0.05);
    const outerP2 = panel(W, H, d, outer, 0.05);
    const linA = panel(W - 0.01, H - 0.01, 0.006, inner, 0.05);
    const linB = panel(W - 0.01, H - 0.01, 0.006, inner, 0.05);
    if (!long) {
      // horizontal bifold: hinge on y axis at x = 0
      outerP.position.set(W / 2, 0, d / 2); linA.position.set(W / 2, 0, d + 0.004);
      fixed.add(outerP, linA);
      const s1 = stitchRect(W, H, 0.03, d + 0.012, stitchCol); s1.position.x = W / 2; fixed.add(s1);
      fold.position.set(0, 0, d + gap);
      const inner2 = new T.Group(); inner2.position.x = -W / 2; fold.add(inner2);
      outerP2.position.set(0, 0, -d / 2 - gap); linB.position.set(0, 0, -gap + 0.004 - 0.0);
      inner2.add(outerP2, linB);
      const s2 = stitchRect(W, H, 0.03, -gap + 0.012, stitchCol); inner2.add(s2);
      // slots: 3 per side + cards peeking
      const sA = slots(W - 0.08, 3, H / 2 - 0.12, 0.11, d + 0.012, inner); sA.position.x = W / 2; fixed.add(sA);
      const sB = slots(W - 0.08, 3, H / 2 - 0.12, 0.11, -gap + 0.012, inner); inner2.add(sB);
      [["#c9a35e", W / 2 + 0.02, H / 2 - 0.03, d + 0.009], ["#25211d", W / 2 - 0.03, H / 2 - 0.14, d + 0.014]].forEach(([c, x, y, z]) => { const k = card(c); k.position.set(x, y - 0.27, z); fixed.add(k); });
      const kb = card("#e9e1d3"); kb.position.set(0.01, H / 2 - 0.05 - 0.27, -gap + 0.009); inner2.add(kb);
      // cash compartment: dark mouth along the top behind the slots
      const mouth = new T.Mesh(new T.BoxGeometry(W - 0.12, 0.012, 0.004), new T.MeshBasicMaterial({ color: 0x050403 }));
      mouth.position.set(W / 2, H / 2 - 0.02, d + 0.002); fixed.add(mouth);
      // outer front: emblem or monogram on folding half's outside
      const decal = monogramPlane(opt, 0.36, 0.36);
      decal.position.set(0, -H * 0.18, -d - gap - 0.0095); decal.rotation.y = Math.PI; inner2.add(decal);
      monoEngr = decal.userData.set;
      api.setOpen = k => { api.open = k; fold.rotation.y = (1 - k) * (Math.PI - 0.035); body.position.x = -(1 - k) * W / 2; };
    } else {
      // tall long wallet: hinge on x axis at y = 0 (book fold)
      outerP.position.set(0, -H / 2, d / 2); linA.position.set(0, -H / 2, d + 0.004);
      fixed.add(outerP, linA);
      const s1 = stitchRect(W, H, 0.03, d + 0.012, stitchCol); s1.position.y = -H / 2; fixed.add(s1);
      fold.position.set(0, 0, d + gap);
      const inner2 = new T.Group(); inner2.position.y = H / 2; fold.add(inner2);
      outerP2.position.set(0, 0, -d / 2 - gap); linB.position.set(0, 0, -gap + 0.004);
      inner2.add(outerP2, linB);
      const s2 = stitchRect(W, H, 0.03, -gap + 0.012, stitchCol); inner2.add(s2);
      // bottom half: two columns × 3 slots
      [-1, 1].forEach(c => {
        const sl = slots(W / 2 - 0.1, 3, -0.08, 0.1, d + 0.012, inner);
        sl.position.x = c * W / 4; fixed.add(sl);
      });
      const kc = card("#c9a35e"); kc.position.set(-W / 4, -0.08 - 0.25, d + 0.009); fixed.add(kc);
      // top half: zipped coin pocket + slip pocket
      const zipBand = new T.Mesh(new T.BoxGeometry(W - 0.2, 0.02, 0.006), K.metal("gold"));
      zipBand.position.set(0, 0.08, -gap + 0.014); inner2.add(zipBand);
      const teeth = []; for (let x = -W / 2 + 0.12; x < W / 2 - 0.12; x += 0.012) teeth.push(new T.Matrix4().makeTranslation(x, 0.08, -gap + 0.018));
      inner2.add(instanced(new T.BoxGeometry(0.006, 0.03, 0.004), new T.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 }), teeth));
      const puller = new T.Mesh(extrude(rrShape(0.03, 0.08, 0.01), 0.008, 0.003), K.metal("gold"));
      puller.position.set(W / 2 - 0.16, 0.04, -gap + 0.022); inner2.add(puller);
      const slip = panel(W - 0.08, 0.36, 0.006, inner, 0.03); slip.position.set(0, -0.24, -gap + 0.012); inner2.add(slip);
      // snap tab on outside
      const tab = panel(0.22, 0.3, 0.014, outer, 0.06); tab.position.set(W / 2 - 0.2, H / 2 - 0.05, -d - gap - 0.012); inner2.add(tab);
      const snap = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.02, 24), K.metal("gold"));
      snap.rotation.x = Math.PI / 2; snap.position.set(W / 2 - 0.2, H / 2 + 0.03, -d - gap - 0.024); inner2.add(snap);
      const decal = monogramPlane(opt, 0.34, 0.34);
      decal.position.set(-W * 0.25, 0, -d - gap - 0.0095); decal.rotation.x = Math.PI; inner2.add(decal);
      monoEngr = decal.userData.set;
      api.setOpen = k => { api.open = k; fold.rotation.x = (1 - k) * (Math.PI - 0.035); body.position.y = (1 - k) * H / 2; };
    }
    api.setOpen(0);
    api.setMonogram = t => monoEngr && monoEngr(t);
    return api;
  }

  let _emblemTex;
  function emblemTex() {
    if (_emblemTex) return _emblemTex;
    const c = document.createElement("canvas"); c.width = 256; c.height = 288;
    const img = K.emblemImage();
    _emblemTex = new T.CanvasTexture(c); _emblemTex.encoding = T.sRGBEncoding;
    const draw = () => { const g = c.getContext("2d"); g.clearRect(0, 0, 256, 288); g.drawImage(img, 0, 0, 256, 288); _emblemTex.needsUpdate = true; };
    img.complete ? draw() : img.addEventListener("load", draw);
    return _emblemTex;
  }
  // Debossed monogram / emblem decal on leather (blind or gold foil)
  function monogramPlane(opt, w, h) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 512;
    const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding;
    const mat = new T.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.45, metalness: 0.0, depthWrite: false });
    const m = new T.Mesh(new T.PlaneGeometry(w, h), mat);
    const set = (text, foil) => {
      const g = c.getContext("2d"); g.clearRect(0, 0, 512, 512);
      const gold = foil !== false && opt.foil !== false;
      if (text) {
        g.font = '600 220px "Cinzel", "Cormorant Garamond", serif'; g.textAlign = "center"; g.textBaseline = "middle";
        let size = 220; while (g.measureText(text).width > 460 && size > 60) { size -= 10; g.font = `600 ${size}px "Cinzel", serif`; }
        g.fillStyle = gold ? "#cfae6a" : "rgba(0,0,0,.55)"; g.fillText(text, 256, 270);
      } else {
        const img = K.emblemImage();
        const draw = () => { g.globalAlpha = 0.9; g.drawImage(img, 136, 120, 240, 270); g.globalCompositeOperation = "source-in"; g.fillStyle = gold ? "#cfae6a" : "rgba(0,0,0,.5)"; g.fillRect(0, 0, 512, 512); g.globalCompositeOperation = "source-over"; tex.needsUpdate = true; };
        img.complete ? draw() : img.addEventListener("load", draw, { once: true });
      }
      mat.metalness = gold ? 0.85 : 0; mat.roughness = gold ? 0.3 : 0.7;
      tex.needsUpdate = true;
    };
    set(opt.monogram || "");
    m.userData.set = set;
    if (document.fonts) document.fonts.ready.then(() => set(opt.monogram || ""));
    return m;
  }

  /* ---------------- Keychain ---------------- */
  function keychain(hex = "#141210", metalKind = "silver") {
    const g = new T.Group();
    const tab = panel(0.16, 0.42, 0.03, K.leather(hex, "smooth"), 0.07);
    tab.position.y = -0.18; g.add(tab);
    const ring = new T.Mesh(new T.TorusGeometry(0.09, 0.012, 12, 40), K.metal(metalKind));
    ring.position.y = 0.1; g.add(ring);
    const em = new T.Mesh(new T.PlaneGeometry(0.1, 0.11), new T.MeshStandardMaterial({ map: emblemTex(), transparent: true, metalness: 0.9, roughness: 0.3, color: 0xd8bd85 }));
    em.position.set(0, -0.22, 0.026); g.add(em);
    return g;
  }

  /* ---------------- Gift box ---------------- */
  function giftBox(opts = {}) {
    const style = opts.style || "signature";
    const col = { signature: "#121010", ivory: "#e9e0cf", chest: "#4a2f1c" }[style];
    const boxMat = style === "chest"
      ? new T.MeshStandardMaterial({ color: col, roughness: 0.55, map: woodTex() })
      : new T.MeshStandardMaterial({ color: col, roughness: style === "ivory" ? 0.75 : 0.5, envMapIntensity: 0.6 });
    const innerMat = new T.MeshStandardMaterial({ color: style === "ivory" ? "#2a1b12" : "#3a2416", roughness: 0.9 });
    const W = 2.0, D = 1.5, H = 0.55, t = 0.03;
    const g = new T.Group();
    const base = new T.Group(); g.add(base);
    const wall = (w, h, d, x, y, z, m = boxMat) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); base.add(b); return b; };
    wall(W, t, D, 0, t / 2, 0, innerMat);
    wall(W, H, t, 0, H / 2, D / 2); wall(W, H, t, 0, H / 2, -D / 2);
    wall(t, H, D, W / 2, H / 2, 0); wall(t, H, D, -W / 2, H / 2, 0);
    // velvet bed
    const bed = new T.Mesh(new T.BoxGeometry(W - 0.08, 0.12, D - 0.08), innerMat); bed.position.y = 0.08; base.add(bed);
    // lid
    const lid = new T.Group(); g.add(lid);
    const LW = W + 0.06, LD = D + 0.06, LH = 0.2;
    const top = new T.Mesh(new T.BoxGeometry(LW, t, LD), boxMat); top.position.y = LH; lid.add(top);
    [[LW, LH, t, 0, LH / 2, LD / 2], [LW, LH, t, 0, LH / 2, -LD / 2], [t, LH, LD, LW / 2, LH / 2, 0], [t, LH, LD, -LW / 2, LH / 2, 0]].forEach(([w, h, d, x, y, z]) => {
      const b = new T.Mesh(new T.BoxGeometry(w, h, d), boxMat); b.position.set(x, y, z); lid.add(b);
    });
    // gold-foil emblem on lid
    const foil = new T.Mesh(new T.PlaneGeometry(0.42, 0.47), new T.MeshStandardMaterial({ map: emblemTex(), transparent: true, metalness: 1, roughness: 0.25, color: 0xd8bd85 }));
    foil.rotation.x = -Math.PI / 2; foil.position.y = LH + t / 2 + 0.002; lid.add(foil);
    const wm = new T.Mesh(new T.PlaneGeometry(0.9, 0.12), new T.MeshStandardMaterial({ map: K.textTexture("SHAURYA", { w: 1024, h: 136, font: '600 92px "Cormorant Garamond", serif', color: "#d8bd85" }), transparent: true, metalness: 1, roughness: 0.3 }));
    wm.rotation.x = -Math.PI / 2; wm.position.set(0, LH + t / 2 + 0.002, 0.42); lid.add(wm);
    // ribbon
    const ribbonMat = new T.MeshStandardMaterial({ color: style === "ivory" ? "#7a1f22" : "#b08d57", roughness: 0.35, metalness: style === "ivory" ? 0.1 : 0.6 });
    const ribbonG = new T.Group(); lid.add(ribbonG);
    const r1 = new T.Mesh(new T.BoxGeometry(0.12, 0.004, LD + 0.01), ribbonMat); r1.position.set(-0.55, LH + t / 2 + 0.003, 0); ribbonG.add(r1);
    [LD / 2 + 0.003, -LD / 2 - 0.003].forEach(z => { const s = new T.Mesh(new T.BoxGeometry(0.12, LH, 0.004), ribbonMat); s.position.set(-0.55, LH / 2, z); ribbonG.add(s); });
    const bow = new T.Mesh(new T.TorusKnotGeometry(0.07, 0.022, 64, 8, 2, 3), ribbonMat);
    bow.position.set(-0.55, LH + 0.06, 0.25); bow.rotation.x = Math.PI / 2; ribbonG.add(bow);
    lid.position.y = H - LH + 0.02;

    // contents
    const contents = new T.Group(); g.add(contents);
    const tissue = new T.Mesh(new T.PlaneGeometry(W - 0.1, D - 0.1, 12, 12), new T.MeshStandardMaterial({ color: "#efe7d8", roughness: 0.95, side: T.DoubleSide, transparent: true, opacity: 0.92 }));
    tissue.rotation.x = -Math.PI / 2; tissue.position.y = 0.16;
    const tp = tissue.geometry.attributes.position; for (let i = 0; i < tp.count; i++) tp.setZ(i, (Math.random() - 0.5) * 0.02);
    tissue.geometry.computeVertexNormals();
    contents.add(tissue);
    const items = opts.contents || ["belt", "wallet"];
    const leatherHex = opts.leather || "#141210";
    if (items.includes("belt")) {
      const b = belt(opts.personal ? "personal" : "classic", { leather: leatherHex, text: opts.text });
      b.group.scale.setScalar(0.34); b.group.position.set(items.includes("wallet") ? -0.45 : 0, 0.24, 0);
      contents.add(b.group);
    }
    if (items.includes("wallet")) {
      const w = wallet("bifold", { leather: leatherHex });
      w.group.scale.setScalar(0.48); w.group.rotation.x = -Math.PI / 2; w.group.position.set(0.48, 0.2, 0.1);
      contents.add(w.group);
    }
    if (items.includes("keychain")) {
      const k = keychain(leatherHex);
      k.scale.setScalar(0.9); k.rotation.x = -Math.PI / 2; k.rotation.z = 0.5; k.position.set(items.includes("wallet") ? 0.5 : 0.5, 0.2, -0.45);
      contents.add(k);
    }
    if (items.includes("box")) {
      const card = new T.Mesh(new T.BoxGeometry(0.7, 0.01, 0.46), new T.MeshStandardMaterial({ color: "#f2ebdf", roughness: 0.8 }));
      card.position.set(0, 0.2, 0); card.rotation.y = 0.2; contents.add(card);
      const cardText = new T.Mesh(new T.PlaneGeometry(0.6, 0.2), new T.MeshBasicMaterial({ map: K.textTexture("With courage", { w: 512, h: 160, font: 'italic 500 64px "Cormorant Garamond", serif', color: "#3a2416" }), transparent: true }));
      cardText.rotation.x = -Math.PI / 2; cardText.position.y = 0.006; card.add(cardText);
    }
    contents.position.y = -0.05;
    g.position.y = -0.3;

    const api = { group: g, lid, ribbon: ribbonG, contents, open: 0 };
    api.setOpen = k => {
      api.open = k;
      const r = Math.min(1, k * 2.2);
      ribbonG.position.x = -r * 1.6; ribbonG.children.forEach(c => c.material && (c.material.opacity = 1));
      ribbonG.visible = r < 0.98;
      const l = K.ease.inOut(Math.max(0, Math.min(1, (k - 0.3) / 0.55)));
      lid.position.y = H - LH + 0.02 + l * 0.9;
      lid.position.z = -l * 1.1;
      lid.rotation.x = -l * 0.9;
      const c = K.ease.out(Math.max(0, (k - 0.7) / 0.3));
      contents.position.y = -0.05 + c * 0.14;
    };
    api.setOpen(0);
    return api;
  }
  let _wood;
  function woodTex() {
    if (_wood) return _wood;
    const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d");
    g.fillStyle = "#4a2f1c"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${20 + Math.random() * 40},${10 + Math.random() * 20},5,.35)`; g.beginPath(); const y = Math.random() * 256; g.moveTo(0, y); g.bezierCurveTo(80, y + Math.random() * 10 - 5, 170, y + Math.random() * 10 - 5, 256, y); g.stroke(); }
    _wood = new T.CanvasTexture(c); _wood.encoding = T.sRGBEncoding; return _wood;
  }

  /* ---------------- Magnetic belt concept ---------------- */
  // A) Full loop with diagonal seam and no buckle
  function magneticLoop(hex = "#141210") {
    const g = new T.Group();
    const width = 0.27, th = 0.036, rx = 1.24, rz = 0.95;
    const samples = [];
    const n = 400, e = 2 / 2.7;
    for (let i = 0; i <= n; i++) {
      const t0 = 0.012 + (TAU - 0.024) * (i / n);
      const sx = Math.sin(t0), cz = Math.cos(t0);
      samples.push({ p: V3(Math.sign(sx) * Math.pow(Math.abs(sx), e) * rx, 0, Math.sign(cz) * Math.pow(Math.abs(cz), e) * rz), w: width, twist: 0 });
    }
    const outer = K.leather(hex, "smooth");
    const r = ribbon(samples, th);
    const strap = new T.Mesh(r.geometry, [outer, K.leather(shadeHex(hex, 1.3), "matte"), new T.MeshStandardMaterial({ color: "#0a0908", roughness: 0.4 })]);
    g.add(strap);
    // diagonal seam with brushed inlay
    const seam = new T.Mesh(new T.BoxGeometry(0.008, width * 1.12, th * 1.02), K.metal("brushed"));
    seam.position.set(0, 0, rz); seam.rotation.z = 0.5; g.add(seam);
    const accent = new T.Mesh(new T.BoxGeometry(0.004, width * 1.06, 0.004), K.metal("gold"));
    accent.position.set(0, 0, rz + th / 2 + 0.003); accent.rotation.z = 0.5; g.add(accent);
    g.userData.setLeather = h => { strap.material[0] = K.leather(h, "smooth"); };
    return g;
  }

  // B) Closure mechanism: two diagonal belt ends with concealed magnets
  function magneticClosure(hex = "#141210") {
    const g = new T.Group();
    const W = 0.6, TH = 0.09, L = 1.6, DX = 0.32; // presentation scale
    const leatherMat = K.leather(hex, "smooth");
    leatherMat.transparent = true;
    const liningMat = K.leather(shadeHex(hex, 1.4), "matte");
    const housingMat = new T.MeshStandardMaterial({ color: 0x232326, roughness: 0.5, metalness: 0.3, transparent: true });
    const plateMat = K.metal("brushed");
    const magMatN = new T.MeshStandardMaterial({ color: 0xd2d4d8, metalness: 1, roughness: 0.22 });
    const ringN = new T.MeshStandardMaterial({ color: 0xb08d57, metalness: 0.6, roughness: 0.3, emissive: 0x000000 });
    const ringS = new T.MeshStandardMaterial({ color: 0x6f7c8f, metalness: 0.6, roughness: 0.3, emissive: 0x000000 });

    function endShape(dir) {
      // trapezoid in XY: long body along -x (left end) or +x (right end), diagonal face at x≈0
      const s = new T.Shape();
      if (dir < 0) { s.moveTo(-L, -W / 2); s.lineTo(DX / 2, -W / 2); s.lineTo(-DX / 2, W / 2); s.lineTo(-L, W / 2); }
      else { s.moveTo(L, -W / 2); s.lineTo(L, W / 2); s.lineTo(-DX / 2, W / 2); s.lineTo(DX / 2, -W / 2); }
      s.closePath();
      return s;
    }
    function layer(shape, depth, mat, inset = 0) {
      const geo = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004 - inset, bevelSegments: 1 });
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.7, uv.getY(i) / 0.7);
      geo.translate(0, 0, -depth / 2);
      return new T.Mesh(geo, mat);
    }
    function makeEnd(dir) {
      const e = new T.Group();
      const sh = endShape(dir);
      const L_ = {
        top: layer(sh, TH * 0.3, leatherMat),
        housing: layer(sh, TH * 0.32, housingMat),
        plate: layer(sh, TH * 0.08, plateMat),
        lining: layer(sh, TH * 0.22, liningMat)
      };
      L_.top.position.z = TH * 0.35; L_.housing.position.z = 0.0; L_.plate.position.z = -TH * 0.22; L_.lining.position.z = -TH * 0.38;
      Object.values(L_).forEach(m => e.add(m));
      // magnets in a row parallel to the diagonal face
      const mags = new T.Group(); e.add(mags);
      const dirVec = V3(-DX, W, 0).normalize();
      const nrm = V3(dir < 0 ? -1 : 1, 0, 0).multiplyScalar(0.12);
      [-0.32, 0, 0.32].forEach((k, i) => {
        const m = new T.Group();
        const disk = new T.Mesh(new T.CylinderGeometry(0.055, 0.055, TH * 0.28, 32), magMatN);
        disk.rotation.x = Math.PI / 2; m.add(disk);
        const ring = new T.Mesh(new T.TorusGeometry(0.056, 0.006, 8, 32), (i + (dir < 0 ? 0 : 1)) % 2 ? ringS : ringN);
        ring.position.z = TH * 0.14; m.add(ring);
        m.position.copy(dirVec.clone().multiplyScalar(k * W * 0.95)).add(nrm);
        mags.add(m);
      });
      e.userData = { layers: L_, mags };
      return e;
    }
    const left = makeEnd(-1), right = makeEnd(1);
    g.add(left, right);

    // Illustrative field lines (concept only)
    const fieldMat = new T.LineDashedMaterial({ color: 0xd8bd85, dashSize: 0.03, gapSize: 0.02, transparent: true, opacity: 0 });
    const field = new T.Group(); g.add(field);
    for (let i = 0; i < 3; i++) {
      for (let a = 0; a < 3; a++) {
        const dirVec = V3(-DX, W, 0).normalize().multiplyScalar((i - 1) * 0.32 * W * 0.95);
        const h = 0.08 + a * 0.06;
        const curve = new T.QuadraticBezierCurve3(V3(-0.12, 0, TH * 0.2).add(dirVec), V3(0, 0, TH * 0.2 + h).add(dirVec), V3(0.12, 0, TH * 0.2).add(dirVec));
        const geo = new T.BufferGeometry().setFromPoints(curve.getPoints(30));
        const line = new T.Line(geo, fieldMat); line.computeLineDistances(); field.add(line);
      }
    }

    const api = { group: g, left, right, field, sep: 1.1, explode: 0, xray: 0 };
    api.apply = () => {
      left.position.x = -api.sep / 2; right.position.x = api.sep / 2;
      [left, right].forEach(e => {
        const L_ = e.userData.layers, x = api.explode;
        L_.top.position.z = TH * 0.35 + x * 0.42;
        L_.housing.position.z = 0 + x * 0.14;
        L_.plate.position.z = -TH * 0.22 - x * 0.14;
        L_.lining.position.z = -TH * 0.38 - x * 0.36;
        e.userData.mags.position.z = x * 0.28;
      });
      const op = 1 - api.xray * 0.8;
      leatherMat.opacity = op; housingMat.opacity = 1 - api.xray * 0.6;
      leatherMat.depthWrite = op > 0.95; housingMat.depthWrite = api.xray < 0.1;
      fieldMat.opacity = Math.max(0, 1 - api.sep / 0.45) * 0.9 * (1 - api.explode);
      const glow = Math.max(0, 1 - api.sep / 0.6);
      ringN.emissive.setRGB(0.35 * glow, 0.25 * glow, 0.08 * glow); ringS.emissive.setRGB(0.1 * glow, 0.15 * glow, 0.25 * glow);
    };
    api.setLeather = h => { const m = K.leather(h, "smooth"); leatherMat.map = m.map; leatherMat.bumpMap = m.bumpMap; leatherMat.needsUpdate = true; liningMat.map = K.leather(shadeHex(h, 1.4), "matte").map; liningMat.needsUpdate = true; };
    api.apply();
    g.rotation.x = -0.35;
    return api;
  }

  window.SHM = { belt, wallet, keychain, giftBox, magneticLoop, magneticClosure, BELTS, shadeHex };
})();
