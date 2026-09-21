/* Pour Dawgz product catalog.
   Single source of truth for the store. Edit this file to add/remove products.
   - price: number in USD, or null if not yet carried over from the old site.
   - image: local file under images/ (downloaded from the old site).
   - squareLink: Square payment link for this product. "#" = not yet connected.
   - orderLink: link for the "Message Us to Order" button (used while Square checkout is not connected).
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
  },
  {
    id: "yofidra-angle-grinder",
    name: "YOFIDRA Brushless 125mm (5-inch) Cordless Angle Grinder",
    price: 34.09,
    description: "Brushless cordless angle grinder with 125mm (5-inch) disc, 20,000 RPM max speed, and 14mm disc bore. 4.9-star rating with 1,000+ sold. Tool only - battery NOT included. Free US shipping, delivery Sep 26 - Oct 1.",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/Se3f478c0ed214ac29c437470f2142ed1v.jpg",
    squareLink: "https://square.link/u/MMRZFC3R",
    externalLink: "https://www.aliexpress.us/item/3256810467309266.html",
    seller: "Pour Dawgz Tools",
    type: "fixed",
    available: true
  },
  {
    id: "electric-goddess-recip-saw",
    name: "Electric Goddess Cordless Reciprocating Saw",
    price: 38.09,
    description: "Sawzall-style cordless reciprocating saw for cutting wood and metal. 4.9-star rating, 99 sold. Tool only - battery NOT included (fits DeWalt 20V batteries). Free US shipping, delivery Sep 26 - Oct 1.",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/Sda0836da87b2475b9d78b067f6b87b5ap.png",
    squareLink: "https://square.link/u/ZViv2lX6",
    externalLink: "https://www.aliexpress.us/item/3256809419115120.html",
    seller: "Pour Dawgz Tools",
    type: "fixed",
    available: true
  },
  {
    id: "yofidra-multi-tool",
    name: "YOFIDRA Oscillating Multi-Tool",
    price: 57.13,
    description: "600W oscillating multi-tool: up to 20,000 oscillations/min with a 4-degree oscillation angle for cutting, sanding, and scraping. 4.7-star rating, 700+ sold, 124 reviews. Tool only - battery NOT included (works with 21V/18V batteries). Free US shipping, delivery Sep 26 - Sep 30.",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/Se6e59eaca5b74767b1e4598db79719c0L.jpg",
    squareLink: "https://square.link/u/fipfjYE4",
    externalLink: "https://www.aliexpress.us/item/3256807462426939.html",
    seller: "Pour Dawgz Tools",
    type: "fixed",
    available: true
  },
  {
    id: "tdfr-multi-pocket-overalls",
    name: "TDFR Multi-Pocket Denim Overalls - Men's Cargo Bib",
    price: 36.71,
    description: "Men's multi-pocket denim cargo bib overalls: durable midweight cotton-blend denim, loose roomy fit, functional tool pockets, zipper fly. 4.6-star rating from verified buyers, 36 sold. Sizes XS-XXL in Blue or Black. Free returns within 15 days; delivery Sep 27 - Oct 3.",
    image: "https://ae-pic-a1.aliexpress-media.com/kf/Sc9168362ea394f33abdf980e467fcd5b8.jpg",
    squareLink: "https://square.link/u/khAlR8Kn",
    externalLink: "https://www.aliexpress.us/item/3256802713548400.html",
    seller: "Pour Dawgz Workwear",
    type: "fixed",
    available: true
  },
  {
    id: "pourdawgz-tee-logo-front",
    name: "Pour Dawgz Tee - Logo Front",
    price: 34.99,
    description: "Unisex Staple T-Shirt (Bella + Canvas 3001) in Black with large front logo print. Sizes XS-5XL.",
    image: "images/browser-download-20260921T180306.622521264Z-0-unisex-staple-t-shirt-black-front-6ab1714e8d231.png",
    squareLink: "#",
    orderLink: "contact.html",
    seller: "Pour Dawgz Merch",
    type: "fixed",
    available: true
  },
  {
    id: "pourdawgz-tee-handyman-slogan",
    name: "Pour Dawgz Tee - Handyman Slogan",
    price: 34.99,
    description: "Unisex Staple T-Shirt (Bella + Canvas 3001) in Black. Front print: 'HANDYMAN' with the slogan 'Can't be no geek off the street \u2014 gotta be handy with the tools.' Sizes XS-5XL.",
    image: "images/browser-download-20260921T180444.572019898Z-1-unisex-staple-t-shirt-black-front-6ab171b11c75a.png",
    squareLink: "#",
    orderLink: "contact.html",
    seller: "Pour Dawgz Merch",
    type: "fixed",
    available: true
  },
  {
    id: "pourdawgz-hoodie-back-logo",
    name: "Pour Dawgz Hoodie - Back Logo",
    price: 59.99,
    description: "Unisex Heavy Blend Hoodie (Gildan 18500) in Black. Big logo on the back, 'Works hard, plays even harder' on the front chest, 'FAFO' and 'GUILD' on the sleeves. Sizes S-5XL.",
    image: "images/unisex-heavy-blend-hoodie-black-front-6ab171fd1f236.png",
    squareLink: "#",
    orderLink: "contact.html",
    seller: "Pour Dawgz Merch",
    type: "fixed",
    available: true
  }
];
