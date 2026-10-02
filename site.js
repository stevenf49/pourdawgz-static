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

  /* ---------- sellers ---------- */

  function avgStars(seller) {
    var r = seller.reviews || [];
    if (!r.length) return 0;
    var sum = r.reduce(function (a, x) { return a + (x.stars || 0); }, 0);
    return sum / r.length;
  }

  window.sellerRating = function (seller) {
    var r = seller.reviews || [];
    return { avg: avgStars(seller), count: r.length };
  };

  // Read-only star display, rounded to nearest whole star.
  window.starRow = function (rating, count) {
    var full = Math.round(rating);
    var html = "";
    for (var i = 1; i <= 5; i++) {
      html += '<span class="star' + (i <= full ? " on" : "") + '">\u2605</span>';
    }
    var label = rating > 0
      ? rating.toFixed(1) + " (" + count + " review" + (count === 1 ? "" : "s") + ")"
      : "No reviews yet";
    return '<span class="stars" title="' + label + '">' + html + '</span> ' +
      '<span class="rating-label">' + escapeHtml(label) + "</span>";
  };

  function reviewHtml(r) {
    var who = escapeHtml(r.name || "Buyer");
    var when = r.date ? ' <span class="review-date">' + escapeHtml(r.date) + "</span>" : "";
    return (
      '<div class="review">' +
        '<div class="review-head">' + window.starRow(r.stars || 5, 0).replace(/ \(0 reviews?\)|No reviews yet/, "") + "<strong>" + who + "</strong>" + when + "</div>" +
        '<p class="review-text">' + escapeHtml(r.text || "") + "</p>" +
      "</div>"
    );
  }

  function sellerCard(s) {
    var rating = window.sellerRating(s);
    var listings = (typeof PRODUCTS !== "undefined")
      ? PRODUCTS.filter(function (p) {
          return p.available !== false && (p.seller || "").toLowerCase().indexOf(s.name.toLowerCase()) !== -1;
        })
      : [];
    var listingsHtml = listings.length
      ? '<div class="seller-listings"><strong>' + listings.length + " listing" + (listings.length === 1 ? "" : "s") + ":</strong> " +
        listings.map(function (p) { return escapeHtml(p.name); }).join(" &middot; ") + "</div>"
      : "";
    var reviews = s.reviews || [];
    var reviewsHtml = reviews.length
      ? reviews.map(reviewHtml).join("")
      : '<p class="fineprint">No reviews yet — be the first to buy from this seller and leave one.</p>';
    return (
      '<article class="card seller-card" id="seller-' + escapeHtml(s.id) + '">' +
        '<div class="body">' +
          "<h3>" + escapeHtml(s.name) + "</h3>" +
          '<div class="seller">' + escapeHtml(s.town || "") + (s.since ? " &middot; selling since " + escapeHtml(s.since) : "") + "</div>" +
          '<div class="seller-rating">' + window.starRow(rating.avg, rating.count) + "</div>" +
          '<p class="desc">' + escapeHtml(s.blurb || "") + "</p>" +
          listingsHtml +
          '<div class="reviews">' + reviewsHtml + "</div>" +
          '<a class="buy-btn" href="sellers.html#review-' + escapeHtml(s.id) + '">Leave a review</a>' +
        "</div>" +
      "</article>"
    );
  }

  // Render all sellers into #sellers-grid.
  window.renderSellers = function (targetId) {
    var el = document.getElementById(targetId);
    if (!el || typeof SELLERS === "undefined") return;
    el.innerHTML = SELLERS.map(sellerCard).join("");
  };
})();
