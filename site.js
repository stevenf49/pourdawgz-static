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

  // Shared buy-button logic (used by cards and the product detail page).
  function buyBtn(p) {
    if (!p.available) {
      return '<span class="buy-btn disabled">Unavailable</span>';
    }
    if (p.type === "auction") {
      return '<a class="buy-btn" href="contact.html">Bid / Ask About This</a>';
    }
    if (p.squareLink && p.squareLink !== "#") {
      return '<a class="buy-btn" href="' + escapeHtml(p.squareLink) + '">Buy Now</a>';
    }
    if (p.orderLink && p.orderLink !== "#") {
      return '<a class="buy-btn" href="' + escapeHtml(p.orderLink) + '">Message Us to Order</a>';
    }
    return '<a class="buy-btn" href="#" title="Secure Square checkout link coming soon">Buy Now</a>';
  }

  function card(p) {
    var badge = p.type === "auction"
      ? '<span class="badge">Auction</span> '
      : "";
    var btn = buyBtn(p);
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

  /* ---------- picture-first shop grid + product detail pages ---------- */

  function productById(id) {
    if (typeof PRODUCTS === "undefined" || !id) return null;
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }

  // Match a product's seller string to a SELLERS profile (for town + rating).
  // All "Pour Dawgz *" seller names roll up to the main Pour Dawgz profile.
  function sellerProfileFor(sellerName) {
    if (typeof SELLERS === "undefined" || !sellerName) return null;
    var n = String(sellerName).toLowerCase();
    for (var i = 0; i < SELLERS.length; i++) {
      var s = String(SELLERS[i].name).toLowerCase();
      if (n.indexOf(s) !== -1 || s.indexOf(n) !== -1) return SELLERS[i];
    }
    return null;
  }

  function priceSpan(p) {
    if (p.priceLabel) return '<span class="price">' + escapeHtml(p.priceLabel) + "</span>";
    if (typeof p.price === "number") return '<span class="price">$' + p.price.toFixed(2) + "</span>";
    return '<span class="price request">Price on request</span>';
  }

  function imgTag(p, cls) {
    return '<img class="' + cls + '" src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) +
      '" loading="lazy" onerror="this.outerHTML=\'<div class=&quot;no-img&quot;>Photo coming soon</div>\'">';
  }

  // Picture-first card: photo, name, price. Whole card links to the detail page.
  function picCard(p) {
    var badge = p.type === "auction" ? '<span class="badge">Auction</span>' : "";
    return (
      '<a class="pic-card" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
        '<span class="pic-img">' + badge + imgTag(p, "") + "</span>" +
        '<span class="pic-name">' + escapeHtml(p.name) + "</span>" +
        priceSpan(p) +
      "</a>"
    );
  }

  // Picture grid for shop.html — photos first, details live on product.html.
  window.renderProductGrid = function (targetId, ids) {
    var el = document.getElementById(targetId);
    if (!el || typeof PRODUCTS === "undefined") return;
    var list = ids
      ? PRODUCTS.filter(function (p) { return ids.indexOf(p.id) !== -1; })
      : PRODUCTS.slice();
    el.innerHTML = list.map(picCard).join("");
  };

  // "Items like this": same seller first, then the rest of the catalog.
  function relatedProducts(p, n) {
    var same = [], rest = [];
    for (var i = 0; i < PRODUCTS.length; i++) {
      var x = PRODUCTS[i];
      if (x.id === p.id) continue;
      if ((x.seller || "") === (p.seller || "")) same.push(x);
      else rest.push(x);
    }
    return same.concat(rest).slice(0, n || 4);
  }

  // Full product page for product.html?id=<id>.
  window.renderProductDetail = function (targetId) {
    var el = document.getElementById(targetId);
    if (!el || typeof PRODUCTS === "undefined") return;
    var id = null;
    try {
      id = new URLSearchParams(window.location.search).get("id");
    } catch (e) { /* very old browser: fall through to not-found */ }
    var p = productById(id);
    if (!p) {
      el.innerHTML =
        '<p class="lede">Couldn\u2019t find that item.</p>' +
        '<p><a class="buy-btn" href="shop.html">Back to the shop</a></p>';
      return;
    }

    var prof = sellerProfileFor(p.seller);
    var starsHtml = "";
    if (prof) {
      var r = window.sellerRating(prof);
      starsHtml =
        '<div class="detail-stars">' + window.starRow(r.avg, r.count) +
        ' <a href="sellers.html#seller-' + escapeHtml(prof.id) + '">Sold by ' + escapeHtml(prof.name) + "</a></div>";
    } else if (p.seller) {
      starsHtml = '<div class="detail-stars"><span class="rating-label">Sold by ' + escapeHtml(p.seller) + "</span></div>";
    }
    var originHtml = (prof && prof.town)
      ? '<div class="detail-origin">Ships from ' + escapeHtml(prof.town) + "</div>"
      : "";
    var optsHtml = p.options ? '<div class="detail-opts">' + escapeHtml(p.options) + "</div>" : "";
    var badge = p.type === "auction" ? '<p><span class="badge">Auction</span></p>' : "";

    var related = relatedProducts(p, 4);
    var relatedHtml = related.length
      ? "<h2>Items like this</h2>" +
        '<div class="pic-grid related-grid">' + related.map(picCard).join("") + "</div>"
      : "";

    el.innerHTML =
      '<p><a class="back-link" href="shop.html">&larr; Back to the shop</a></p>' +
      '<div class="detail-main">' +
        '<div class="detail-img">' + imgTag(p, "") + "</div>" +
        '<div class="detail-info">' +
          badge +
          "<h1>" + escapeHtml(p.name) + "</h1>" +
          starsHtml +
          originHtml +
          '<div class="detail-price">' + money(p) + "</div>" +
          optsHtml +
          '<p class="desc">' + escapeHtml(p.description || "") + "</p>" +
          '<div class="detail-buy">' + buyBtn(p) + "</div>" +
          '<p class="fineprint">Secure checkout through Square &mdash; no account needed. Questions about this item? <a href="contact.html">Ask us here</a>.</p>' +
        "</div>" +
      "</div>" +
      relatedHtml;
  };
})();
