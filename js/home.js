/* ============================================================
   Rate Everything — Home page
   Populates category tiles, live stats and top-rated preview.
   ============================================================ */

(async function () {
  const grid = document.getElementById("categoryGrid");
  const topGrid = document.getElementById("topRatedGrid");
  grid.innerHTML = reSkeletonTiles(8);
  topGrid.innerHTML = reSkeletonCards(3);

  let businesses, categories;
  try {
    businesses = await reGetBusinesses();
    categories = await reGetCategories();
  } catch (err) {
    const msg = `<div class="empty-state"><div class="big">📡</div><h3>Couldn't reach the server</h3>
      <p>${reEscape(err.message)}</p>
      <button class="btn btn-primary" style="margin-top:1rem;" onclick="location.reload()">Try Again</button></div>`;
    grid.innerHTML = msg;
    topGrid.innerHTML = "";
    document.getElementById("statBiz").textContent = "—";
    document.getElementById("statReviews").textContent = "—";
    document.getElementById("statCountries").textContent = "—";
    return;
  }

  /* Category tiles with live counts */
  grid.innerHTML = categories.map(cat => {
    const count = businesses.filter(b => b.category === cat.key).length;
    return `
      <a class="category-tile" href="businesses.html?category=${cat.key}">
        <span class="cat-icon">${cat.icon}</span>
        ${reEscape(cat.label)}
        <span class="cat-count">${count} listed</span>
      </a>`;
  }).join("");
  reReveal(grid);

  /* Live stats */
  const ratingsPerBiz = await Promise.all(businesses.map(b => reGetRatingsFor(b)));
  const totalRatings = ratingsPerBiz.reduce((sum, ratings) => sum + ratings.length, 0);
  const countryCount = new Set(businesses.map(b => b.countryCode)).size;
  document.getElementById("statBiz").textContent = businesses.length;
  document.getElementById("statReviews").textContent = totalRatings;
  document.getElementById("statCountries").textContent = countryCount;

  /* Top-rated preview (best 3 by average, min 4 ratings) */
  const top = businesses
    .map((biz, i) => ({ biz, ratings: ratingsPerBiz[i] }))
    .filter(x => x.ratings.length >= 4)
    .sort((a, b) => reAverage(b.ratings) - reAverage(a.ratings))
    .slice(0, 3);

  const topCards = await Promise.all(top.map(async ({ biz, ratings }) => {
    const cat = await reCategoryByKey(biz.category);
    const country = await reCountryByCode(biz.countryCode);
    const avg = reAverage(ratings);
    return `
      <div class="biz-card">
        ${reBizCoverHtml(biz, cat)}
        <div class="biz-body">
          <h3>${reEscape(biz.name)}</h3>
          <div class="biz-meta">
            <span class="chip">${cat.icon} ${reEscape(cat.label)}</span>
            <span>📍 ${reEscape(biz.city)}${country ? `, ${country.flag} ${reEscape(country.name)}` : ""}</span>
          </div>
          <p class="biz-desc">${reEscape(biz.description)}</p>
          <div class="biz-rating-row">
            <div>
              <span class="stars">${reStarsHtml(avg)}</span>
              <span class="rating-value">${avg.toFixed(1)}</span>
              <span class="rating-count">(${ratings.length})</span>
            </div>
            <div style="display:flex; gap:0.5rem;">
              <a class="btn-details" href="businesses.html?details=${biz.id}">Reviews &amp; Map</a>
              <a class="btn-rate" href="businesses.html?rate=${biz.id}">Rate ⭐</a>
            </div>
          </div>
        </div>
      </div>`;
  }));
  topGrid.innerHTML = topCards.join("");
  reReveal(topGrid);

  /* Hero quick-search → businesses page */
  document.getElementById("heroSearchForm").addEventListener("submit", e => {
    e.preventDefault();
    const q = document.getElementById("heroSearch").value.trim();
    window.location.href = "businesses.html" + (q ? "?q=" + encodeURIComponent(q) : "");
  });
})();
