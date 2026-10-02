/* Pour Dawgz seller directory.
   Sellers register with real identity (name + contact + town) — that's what
   keeps scammers out. Each seller gets a profile with a star rating and
   buyer reviews, rendered on sellers.html.

   To add a seller: append an entry below (after their registration email
   arrives). To add a review: append to that seller's reviews array after
   Steven approves it. Rating is computed automatically. */
const SELLERS = [
  {
    id: "pour-dawgz",
    name: "Pour Dawgz",
    owner: "Steven Fredrickson",
    town: "Newell, SD",
    since: "2019",
    blurb: "Handyman outfit first — repair, remodel, install, build — plus tough work gear and flea market finds. If it's got our name on it, it works.",
    reviews: [
      // { name: "Buyer name", stars: 5, text: "Review text.", date: "2026-10-01" }
    ]
  },
  {
    id: "heather-munoz-lujan",
    name: "Heather Munoz - Lujan",
    owner: "Heather Munoz - Lujan",
    town: "",
    since: "2026",
    blurb: "Selling plants and more on the Pour Dawgz marketplace.",
    reviews: [
    ]
  }
];
