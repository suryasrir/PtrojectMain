# SHAURYA — website

Static multi-page website (HTML, CSS, JavaScript, Three.js). No build step.

## Run locally

```bash
cd PtrojectMain
python3 -m http.server 8000
# open http://localhost:8000
```

An internet connection is needed for Three.js (jsDelivr CDN) and Google Fonts.

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Homepage (10 sections, 3D hero) |
| `collection.html` | 3D showroom for the six signature belts |
| `studio.html` | Personalisation studio (engraving preview, logo upload, save, order, quotation) |
| `leather.html` | Wallet collection in 3D (open / close) |
| `gifting.html` | Gift sets with gift-box animation, packaging, occasion, message |
| `magnetic.html` | Magnetic belt concept (clearly labelled R&D) + early access |
| `invest.html` | Investor deck, editable funding placeholders, projection calculator |
| `shop.html` | All products, search, filters, sort |
| `cart.html` | Checkout (test payment), order confirmation |
| `account.html` | Customer sign-up / sign-in, orders, saved designs, artwork, profile |
| `admin.html` | Admin dashboard (passcode in `assets/js/config.js`) |
| `support.html` | Contact, shipping, returns, size guide, FAQ |
| `brand.html` | Logo system, palette, typography |

## Configuration — `assets/js/config.js`

- `razorpayKeyId` — add a Razorpay **test** key (`rzp_test_…`) to use Razorpay checkout; empty = simulated test payment.
- `formEndpoint` — a form backend URL (Formspree, Basin, or your own API) to receive enquiries, orders and artwork files; empty = saved in the browser only.
- `adminPasscode` — demo gate for `admin.html`. **Not security.**
- `shipping` — free-shipping threshold and rates.

## Product edits

Prices, stock, names, images, visibility and new products can be edited in **Admin → Products**.
Uploading a `.glb` model for a product replaces the built-in procedural 3D model in the viewer.
Default catalogue lives in `assets/js/data.js`.

## Demo mode limits (before going live)

Accounts, orders, designs and admin data are stored in the visitor's browser (localStorage / IndexedDB).
For production, connect a server for: real authentication, a database, secure admin login,
cloud storage for artwork, payment verification (Razorpay order + signature check server-side),
shipping (e.g. Shiprocket) and email notifications.

## Files

```
assets/css/style.css   design system
assets/css/pages.css   page layouts
assets/js/config.js    settings
assets/js/data.js      catalogue
assets/js/core.js      header/footer, logo, cart, accounts, forms, motion
assets/js/three-kit.js 3D stages, controls, materials, engraving
assets/js/models.js    procedural belts, wallets, gift box, magnetic concept
assets/js/pages.js     page behaviours
assets/js/admin.js     admin dashboard
```
