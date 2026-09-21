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
      btn = '<a class="buy-btn" href="#" title="Secure Square checkout link coming soon">Buy Now</a>';
    }
    var opts = p.options ? '<div class="seller">' + escapeHtml(p.options) + "</div>" : "";
    return (
      '<article class="card">' +
        '<div class="img-wrap"><img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '" loading="lazy" onerror="this.outerHTML=\'<div class=&quot;no-img&quot;>Photo coming soon</div>\'"></div>' +
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
      : PRODUCTS.slice();
    el.innerHTML = list.map(card).join("");
  };
})();
