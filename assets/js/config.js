/*
  SHAURYA site configuration.
  Edit these values when real services are ready. Nothing here is secret:
  only public keys / public endpoints belong in this file.
*/
window.SHAURYA_CONFIG = {
  currency: "INR",

  // Payment: leave empty to run the built-in simulated TEST checkout.
  // Add a Razorpay *test* key id (rzp_test_...) to use Razorpay's test checkout.
  razorpayKeyId: "",

  // Form handling: leave empty and submissions are kept in this browser only
  // (demo mode). Set to a form backend URL (e.g. a Formspree / Basin / your API
  // endpoint) that accepts multipart POST to receive real submissions.
  formEndpoint: "",

  // Shipping rules (editable business policy).
  shipping: {
    freeAbove: 2999,
    standard: 99,
    express: 249
  },

  // Admin dashboard passcode (admin.html). This is a demo gate only: anyone can
  // read this file, so it is NOT security. Real admin access needs a server login.
  adminPasscode: "shaurya-admin",

  contactEmail:"hello@shaurya.example",
  investorEmail: "invest@shaurya.example"
};
