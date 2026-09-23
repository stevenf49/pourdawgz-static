/* Shared storefront helpers. products.js must load before this file. */
(function () {
  function money(p) {
    if (p.priceLabel) return '<div class="price">' + escapeHtml(p.priceLabel) + "</div>";
    if (typeof p.price === "number") return '<div class="price">$' + p.price.toFixed(2) + "</div>";
    return '<div class="price request">Price on request</div>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function card(p) {
    var badge = p.type === "auction"
      ? '<span class="badge">Auction</span> '
      : "";
    var btn;
    if (!p.available) {
      btn = '<span class="buy-btn disabled">Unavailable</span>';
    } else if (p.type === "auction") {
      btn = '<a class="buy-btn" href="contact.html">Bid / Ask About This</a>';
    } else if (p.squareLink && p.squareLink !== "#") {
      btn = '<a class="buy-btn" href="' + escapeHtml(p.squareLink) + '">Buy Now</a>';
    } else if (p.orderLink) {
      btn = '<a class="buy-btn" href="' + escapeHtml(p.orderLink) + '">Message Us to Order</a>';
    } else {
      btn = '<a class="buy-btn" href="contact.html">Message Us to Order</a>';
    }
    var opts = p.options ? '<div class="seller">' + escapeHtml(p.options) + "</div>" : "";
    return (
      '<article class="card">' +
        '<div class="img-wrap"><img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '" loading="lazy" onerror="this.outerHTML=\'<div class=&quot;no-img&quot;>Photo coming soon</div>\'">' + "</div>" +
        '<div class="body">' +
          "<h3>" + badge + escapeHtml(p.name) + "</h3>" +
          '<div class="seller">' + escapeHtml(p.seller || "") + "</div>" +
          opts +
          '<p class="desc">' + escapeHtml(p.description || "") + "</p>" +
          money(p) +
          btn +
        "</div>" +
      "</article>"
    );
  }

  // Render all products into #product-grid, or a subset into #featured-grid.
  window.renderProducts = function (targetId, ids) {
    var el = document.getElementById(targetId);
    if (!el || typeof PRODUCTS === "undefined") return;
    var list = ids
      ? PRODUCTS.filter(function (p) { return ids.indexOf(p.id) !== -1; })
      : PRODUCTS.slice(); var featuredOrder = ["mr-seal-waterproof-sealant", "solar-flood-light-2pack", "solar-power-bank-2pack", "solar-camping-string-lights"]; list.sort(function(a, b) { var ai = featuredOrder.indexOf(a.id); var bi = featuredOrder.indexOf(b.id); if (ai !== -1 && bi !== -1) return ai - bi; if (ai !== -1) return -1; if (bi !== -1) return 1; return 0; });
    el.innerHTML = list.map(card).join("");
  };

  // Render an explicit, pre-ordered list of products (used for ranked grids
  // such as Top Sellers), reusing the same card markup.
  window.renderProductList = function (targetId, list) {
    var el = document.getElementById(targetId);
    if (!el) return;
    el.innerHTML = (list || []).map(card).join("");
  };
})();
