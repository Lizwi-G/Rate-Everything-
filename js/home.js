/* ============================================================
   KhethaBiz — Home page
   Populates category tiles, live stats and top-rated preview.
   ============================================================ */

(function () {
  const businesses = kbGetAllBusinesses();

  /* Category tiles with live counts */
  const grid = document.getElementById("categoryGrid");
  grid.innerHTML = KB_CATEGORIES.map(cat => {
    const count = businesses.filter(b => b.category === cat.key).length;
    return `
      <a class="category-tile" href="businesses.html?category=${cat.key}">
        <span class="cat-icon">${cat.icon}</span>
        ${cat.label}
        <span class="cat-count">${count} listed</span>
      </a>`;
  }).join("");

  /* Live stats */
  const totalRatings = businesses.reduce((sum, b) => sum + kbGetRatingsFor(b).length, 0);
  document.getElementById("statBiz").textContent = businesses.length;
  document.getElementById("statReviews").textContent = totalRatings;

  /* Top-rated preview (best 3 by average, min 4 ratings) */
  const top = businesses
    .map(b => ({ biz: b, ratings: kbGetRatingsFor(b) }))
    .filter(x => x.ratings.length >= 4)
    .sort((a, b) => kbAverage(b.ratings) - kbAverage(a.ratings))
    .slice(0, 3);

  document.getElementById("topRatedGrid").innerHTML = top.map(({ biz, ratings }) => {
    const cat = kbCategory(biz.category);
    const avg = kbAverage(ratings);
    return `
      <div class="biz-card">
        <div class="biz-cover" style="background:${cat.gradient}">
          ${biz.icon || cat.icon}
          ${biz.verified ? '<span class="verified">✔ VERIFIED</span>' : ""}
        </div>
        <div class="biz-body">
          <h3>${kbEscape(biz.name)}</h3>
          <div class="biz-meta">
            <span class="chip">${cat.icon} ${cat.label}</span>
            <span>📍 ${kbEscape(biz.city)}, ${kbEscape(biz.province)}</span>
          </div>
          <p class="biz-desc">${kbEscape(biz.description)}</p>
          <div class="biz-rating-row">
            <div>
              <span class="stars">${kbStarsHtml(avg)}</span>
              <span class="rating-value">${avg.toFixed(1)}</span>
              <span class="rating-count">(${ratings.length})</span>
            </div>
            <a class="btn-rate" href="businesses.html?rate=${biz.id}">Rate ⭐</a>
          </div>
        </div>
      </div>`;
  }).join("");

  /* Hero quick-search → businesses page */
  document.getElementById("heroSearchForm").addEventListener("submit", e => {
    e.preventDefault();
    const q = document.getElementById("heroSearch").value.trim();
    window.location.href = "businesses.html" + (q ? "?q=" + encodeURIComponent(q) : "");
  });
})();
