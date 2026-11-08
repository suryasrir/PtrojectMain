/*
  SHAURYA catalogue.
  Prices are launch list prices set by the brand and can be edited here.
*/
(function () {
  const SIZES = ["30", "32", "34", "36", "38", "40", "42", "44"];

  const LEATHER = {
    black: { name: "Noir Black", hex: "#141210" },
    matte: { name: "Matte Carbon", hex: "#1c1c1d" },
    brown: { name: "Deep Brown", hex: "#3b2414" },
    tan: { name: "Cognac Tan", hex: "#8a5530" },
    oxblood: { name: "Oxblood", hex: "#4a1418" },
    olive: { name: "Forest Olive", hex: "#2f3324" },
    navy: { name: "Midnight Navy", hex: "#161c2a" },
    reverso: { name: "Black / Brown", hex: "linear-gradient(90deg,#141210 50%,#3b2414 50%)" }
  };

  const METAL = {
    silver: { name: "Polished Silver", hex: "#cfd2d6" },
    brass: { name: "Antique Brass", hex: "#a07c45" },
    gunmetal: { name: "Gunmetal", hex: "#4a4c51" },
    gold: { name: "Gold", hex: "#cba65c" },
    matteblack: { name: "Matte Black", hex: "#1f1f21" },
    brushed: { name: "Brushed Silver", hex: "#b3b5b8" }
  };

  const belts = [
    {
      id: "classic", no: "01", category: "belts",
      name: "SHAURYA Classic",
      line: "The formal essential.",
      desc: "Full-grain black leather, hand-burnished edges and a minimal polished silver frame buckle. Clean enough for a boardroom, quiet enough for every day.",
      price: 2490, width: "30 mm", leather: ["black", "brown"], metal: "silver",
      specs: ["Full-grain cowhide, 3.5 mm", "30 mm strap width", "Polished silver-tone zinc alloy frame buckle", "Hand-painted, burnished edges", "Five adjustment holes"],
      style: "Formal"
    },
    {
      id: "heritage", no: "02", category: "belts",
      name: "SHAURYA Heritage",
      line: "Craft passed down.",
      desc: "Deep brown leather with contrast saddle stitching and an antique brass buckle drawn from the arches of Rajput palace windows.",
      price: 3290, width: "38 mm", leather: ["brown", "tan"], metal: "brass",
      specs: ["Vegetable-tanned leather", "38 mm strap width", "Antique brass arch buckle", "Contrast saddle stitching", "Leather keeper loop"],
      style: "Heritage"
    },
    {
      id: "urban", no: "03", category: "belts",
      name: "SHAURYA Urban",
      line: "Built for the street.",
      desc: "A matte black strap with a modern gunmetal track buckle. No holes, micro-adjustable fit, a squared-off contemporary silhouette.",
      price: 2790, width: "40 mm", leather: ["matte", "olive"], metal: "gunmetal",
      specs: ["Matte-finish leather", "40 mm strap width", "Gunmetal ratchet track buckle", "Micro-adjustable, no holes", "Square-cut tip"],
      style: "Street"
    },
    {
      id: "reverso", no: "04", category: "belts",
      name: "SHAURYA Reverso",
      line: "Two belts. One decision.",
      desc: "Black on one face, brown on the other. Twist the swivel buckle and turn the strap to change your look in seconds.",
      price: 3490, width: "34 mm", leather: ["reverso"], metal: "brushed",
      specs: ["Bonded black / brown leather", "34 mm strap width", "Brushed silver swivel buckle", "Reversible in one motion", "Five adjustment holes"],
      style: "Versatile"
    },
    {
      id: "signature", no: "05", category: "belts",
      name: "SHAURYA Signature",
      line: "The statement piece.",
      desc: "Croc-embossed leather finished by hand, paired with a sculpted plaque buckle carrying the SHAURYA emblem in relief.",
      price: 4990, width: "36 mm", leather: ["black", "oxblood", "brown"], metal: "gold",
      specs: ["Croc-embossed full-grain leather", "36 mm strap width", "Plaque buckle with relief emblem", "Hand-finished edges, tonal stitching", "Presented in signature box"],
      style: "Luxury"
    },
    {
      id: "personal", no: "06", category: "belts",
      name: "SHAURYA Personal",
      line: "Your name, in metal.",
      desc: "A substantial plate buckle engraved with your name, initials or mark. Every piece is reviewed and finished to order.",
      price: 3990, width: "35 mm", leather: ["black", "brown", "tan", "navy"], metal: "silver",
      specs: ["Full-grain leather", "35 mm strap width", "Engravable plate buckle", "Name, initials or logo", "Made to order: 7–10 working days"],
      style: "Personalised", personal: true
    }
  ];

  const wallets = [
    {
      id: "bifold", no: "01", category: "wallets",
      name: "Classic Bifold",
      line: "The everyday companion.",
      desc: "Six card slots, two slip pockets and a full-length cash compartment in soft full-grain leather.",
      price: 2190, leather: ["black", "brown", "tan"],
      specs: ["6 card slots", "2 slip pockets", "Full-length cash compartment", "11.2 × 9.2 cm closed", "Full-grain leather, edge-painted"],
      dims: "11.2 × 9.2 × 1.4 cm"
    },
    {
      id: "slim", no: "02", category: "wallets",
      name: "Slim Minimalist",
      line: "Carry less. Carry better.",
      desc: "A slim card holder with four outer slots and a central pocket. Under 6 mm loaded with essentials.",
      price: 1490, leather: ["black", "tan", "navy", "olive"],
      specs: ["4 card slots + central pocket", "Holds 6–8 cards", "10.2 × 7.2 cm", "Saffiano-textured leather", "Under 6 mm thin"],
      dims: "10.2 × 7.2 × 0.5 cm"
    },
    {
      id: "long", no: "03", category: "wallets",
      name: "Premium Long Wallet",
      line: "For the jacket pocket.",
      desc: "A tall-format wallet with twelve card slots, a zipped coin pocket and two full-length note sections.",
      price: 3190, leather: ["black", "brown", "oxblood"],
      specs: ["12 card slots", "Zipped coin pocket", "2 full-length note sections", "19 × 9.6 cm closed", "Snap closure"],
      dims: "19 × 9.6 × 1.8 cm"
    },
    {
      id: "personalised-wallet", no: "04", category: "wallets",
      name: "Personalised Wallet",
      line: "Monogrammed by hand.",
      desc: "Our classic bifold, debossed with your initials on the front panel. Made to order.",
      price: 2690, leather: ["black", "brown", "tan", "navy"],
      specs: ["Up to 3 initials", "Blind deboss or gold-foil", "6 card slots, cash compartment", "11.2 × 9.2 cm closed", "Made to order: 5–7 working days"],
      dims: "11.2 × 9.2 × 1.4 cm", personal: true
    }
  ];

  const gifts = [
    {
      id: "combo-belt-wallet", category: "gifts",
      name: "Belt & Wallet Set",
      line: "The essential pairing.",
      desc: "SHAURYA Classic belt with a matching Classic Bifold, presented together.",
      price: 4290, contents: ["belt", "wallet"], occasions: ["birthday", "anniversary", "fathers", "corporate"]
    },
    {
      id: "personal-belt-keychain", category: "gifts",
      name: "Personalised Belt & Keychain",
      line: "Made in his name.",
      desc: "SHAURYA Personal belt with an engraved buckle and a matching engraved leather keychain.",
      price: 4590, contents: ["belt", "keychain"], occasions: ["birthday", "wedding", "fathers"], personal: true
    },
    {
      id: "trio", category: "gifts",
      name: "Belt, Wallet & Keychain Trio",
      line: "The complete set.",
      desc: "Belt, bifold wallet and leather keychain in a single coordinated colour story.",
      price: 5690, contents: ["belt", "wallet", "keychain"], occasions: ["wedding", "anniversary", "corporate"]
    },
    {
      id: "gift-box", category: "gifts",
      name: "Premium Gift Box",
      line: "Wrap anything in ceremony.",
      desc: "Our rigid gift box with gold-foiled emblem, ribbon and handwritten card. Add to any order.",
      price: 490, contents: ["box"], occasions: ["birthday", "anniversary", "wedding", "fathers", "corporate"]
    },
    {
      id: "occasion", category: "gifts",
      name: "Special Occasion Collection",
      line: "Curated for the moment.",
      desc: "A curated set chosen for the occasion, with personalisation and a message card. Price shown is the starting price.",
      price: 3490, from: true, contents: ["belt", "wallet"], occasions: ["wedding", "anniversary", "corporate"]
    }
  ];

  const OCCASIONS = {
    birthday: "Birthday", anniversary: "Anniversary", wedding: "Wedding",
    fathers: "Father's Day", corporate: "Corporate"
  };

  const PACKAGING = [
    { id: "signature", name: "Signature Black Box", price: 0 },
    { id: "ivory", name: "Ivory Heritage Box", price: 190 },
    { id: "chest", name: "Wooden Keepsake Chest", price: 890 }
  ];

  /* Admin overrides (edited in admin.html, stored on this device):
     { edits: { [id]: { price, stock, name, line, desc, hidden, image } }, added: [product, ...] } */
  let OV = { edits: {}, added: [] };
  try { OV = Object.assign(OV, JSON.parse(localStorage.getItem("shaurya.catalog") || "{}")); } catch (e) {}
  const lists = { belts, wallets, gifts };
  (OV.added || []).forEach(p => { if (lists[p.category] && !lists[p.category].some(x => x.id === p.id)) lists[p.category].push({ ...p, custom: true }); });
  [belts, wallets, gifts].forEach(list => list.forEach(p => {
    if (p.stock == null) p.stock = 25;
    Object.assign(p, (OV.edits || {})[p.id] || {});
  }));
  const full = [...belts, ...wallets, ...gifts]; // includes hidden, for admin
  [belts, wallets, gifts].forEach(list => { for (let i = list.length - 1; i >= 0; i--) if (list[i].hidden) list.splice(i, 1); });

  const all = [...belts, ...wallets, ...gifts];
  const byId = Object.fromEntries(all.map(p => [p.id, p]));

  function pageFor(p) {
    if (p.category === "belts") return "collection.html#" + p.id;
    if (p.category === "wallets") return "leather.html#" + p.id;
    return "gifting.html#" + p.id;
  }

  window.SHAURYA_DATA = { SIZES, LEATHER, METAL, belts, wallets, gifts, all, full, byId, OCCASIONS, PACKAGING, pageFor };
})();
