/* Pour Dawgz product catalog.
   Single source of truth for the store. Edit this file to add/remove products.
   - price: number in USD, or null if not yet carried over from the old site.
   - image: local file under images/ (downloaded from the old site).
   - squareLink: Square payment link for this product. "#" = not yet connected.
   - type: "fixed" (buy now) or "auction" (bid / ask).
   - available: false disables the buy button (e.g. crib listing). */
const PRODUCTS = [
  {
    id: "duluth-pants",
    name: "Duluth Fire Hose Cargo Work Pants, Desert Khaki 32x32",
    price: 119.99,
    description: "Duluth Fire Hose cargo work pants in Desert Khaki, 32x32. Pour Dawgz Owner Picks.",
    image: "images/duluth-pants.jpg",
    squareLink: "#",
    seller: "Pour Dawgz Owner Picks",
    type: "fixed",
    available: true
  },
  {
    id: "powercap-beanie",
    name: "POWERCAP 2.5 Rechargeable LED Beanie, Black Knit",
    price: 34.99,
    description: "POWERCAP 2.5 rechargeable LED beanie in black knit. Pour Dawgz Owner Picks.",
    image: "images/powercap-beanie.jpg",
    squareLink: "#",
    seller: "Pour Dawgz Owner Picks",
    type: "fixed",
    available: true
  },
  {
    id: "volt-gloves",
    name: "Volt Heated 7V Leather Work Gloves, Medium",
    price: 229.99,
    description: "Volt heated 7V leather work gloves, size Medium. Pour Dawgz Owner Picks.",
    image: "images/volt-gloves.png",
    squareLink: "#",
    seller: "Pour Dawgz Owner Picks",
    type: "fixed",
    available: true
  },
  {
    id: "stan-ray-jacket",
    name: "Stan Ray Shop Jacket, Natural Drill (XL)",
    price: 139.95,
    description: "Stan Ray shop jacket in Natural Drill, size XL. Pour Dawgz Owner Picks.",
    image: "images/stan-ray-jacket.jpg",
    squareLink: "#",
    seller: "Pour Dawgz Owner Picks",
    type: "fixed",
    available: true
  },
  {
    id: "neon-tee",
    name: "Pour Dawgz Neon Workshop Tee",
    price: 59.99,
    description: "Pour Dawgz Neon Workshop Tee. Choose color and size (S, M, L, XL, 2XL, 3XL).",
    image: "images/neon-tee.png",
    squareLink: "#",
    seller: "Pour Dawgz",
    type: "fixed",
    available: true,
    options: "Sizes S\u20133XL"
  },
  {
    id: "skill-tee",
    name: "Pour Dawgz Skill & Tools Tee",
    price: 62.99,
    description: "Pour Dawgz Skill & Tools Tee. Choose color and size (S, M, L, XL, 2XL, 3XL).",
    image: "images/skill-tee.png",
    squareLink: "#",
    seller: "Pour Dawgz",
    type: "fixed",
    available: true,
    options: "Sizes S\u20133XL"
  },
  {
    id: "cuff-beanie",
    name: "Pour Dawgz Logo Cuff Beanie",
    price: 49.95,
    description: "Pour Dawgz logo cuff beanie. Extra photos: images/cuff-beanie-2.png, images/cuff-beanie-3.png.",
    image: "images/cuff-beanie-1.png",
    squareLink: "#",
    seller: "Pour Dawgz",
    type: "fixed",
    available: true
  },
  {
    id: "no-job-tee",
    name: "Pour Dawgz No Job Too Big Tee",
    price: 61.99,
    description: "Pour Dawgz No Job Too Big Tee. Choose color and size (S, M, L, XL, 2XL, 3XL).",
    image: "images/no-job-tee.png",
    squareLink: "#",
    seller: "Pour Dawgz",
    type: "fixed",
    available: true,
    options: "Sizes S\u20133XL"
  },
  {
    id: "crib",
    name: "Crib",
    price: null,
    description: "Older crib for kid, no mattress, but it's cool. Listed by Riders. Pickup or shipping.",
    image: "images/crib.jpeg",
    squareLink: "#",
    seller: "Riders",
    type: "fixed",
    available: false
  },
  {
    id: "trailer-plate",
    name: "vintage 1975 South Dakota trailer plate",
    price: 5,
    priceLabel: "Starting bid: $5.00",
    description: "Vintage 1975 South Dakota trailer plate. Auction \u2014 0 bids, next bid $5, ends Sep 26, 2026, 6:02 PM. Listed by witchy witch drop in. Pickup or shipping.",
    image: "images/trailer-plate.jpg",
    squareLink: "#",
    seller: "witchy witch drop in",
    type: "auction",
    available: true
  }
];
