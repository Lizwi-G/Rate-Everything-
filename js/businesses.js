/* ============================================================
   Rate Everything — Businesses directory page
   Search, filter, sort and the star-rating modal (login-gated).
   ============================================================ */

(async function () {
  /* ---------- Populate filter dropdowns ---------- */
  const categoryFilter = document.getElementById("categoryFilter");
  const countryFilter = document.getElementById("countryFilter");
  const searchInput = document.getElementById("searchInput");
  const sortBy = document.getElementById("sortBy");
  const bizGridEl = document.getElementById("bizGrid");
  bizGridEl.innerHTML = reSkeletonCards(6);

  try {
    (await reGetCategories()).forEach(cat => {
      categoryFilter.insertAdjacentHTML("beforeend",
        `<option value="${cat.key}">${cat.icon} ${reEscape(cat.label)}</option>`);
    });
    [...(await reGetCountries())].sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
      countryFilter.insertAdjacentHTML("beforeend", `<option value="${c.code}">${c.flag} ${reEscape(c.name)}</option>`);
    });
  } catch (err) {
    bizGridEl.innerHTML = `<div class="empty-state"><div class="big">📡</div><h3>Couldn't reach the server</h3>
      <p>${reEscape(err.message)}</p>
      <button class="btn btn-primary" style="margin-top:1rem;" onclick="location.reload()">Try Again</button></div>`;
    return;
  }

  /* ---------- Read query params (from home page links) ---------- */
  const params = new URLSearchParams(window.location.search);
  if (params.get("q")) searchInput.value = params.get("q");
  if (params.get("category")) categoryFilter.value = params.get("category");
  if (params.get("country")) countryFilter.value = params.get("country");

  /* ---------- Render ---------- */
  const bizGrid = document.getElementById("bizGrid");
  const emptyState = document.getElementById("emptyState");
  const resultsInfo = document.getElementById("resultsInfo");

  const STAR_WORDS = ["", "Poor 😞", "Fair 😐", "Good 🙂", "Great 😃", "Excellent! 🤩"];

  function matchesSearch(biz, term, regionMap, countryMap, catMap) {
    if (!term) return true;
    const region = regionMap.get(biz.regionId);
    const country = countryMap.get(biz.countryCode);
    const cat = catMap.get(biz.category);
    const haystack = [
      biz.name, biz.description, biz.city, region ? region.name : "", country ? country.name : "",
      cat ? cat.label : "", ...(biz.services || [])
    ].join(" ").toLowerCase();
    return haystack.includes(term);
  }

  let firstRender = true;

  async function render() {
    const term = searchInput.value.trim().toLowerCase();
    const cat = categoryFilter.value;
    const country = countryFilter.value;

    if (firstRender) { bizGrid.innerHTML = reSkeletonCards(6); firstRender = false; }

    let businesses, regions, countries, categories;
    try {
      [businesses, regions, countries, categories] = await Promise.all([
        reGetBusinesses(), reGetRegions(), reGetCountries(), reGetCategories()
      ]);
    } catch (err) {
      bizGrid.innerHTML = `<div class="empty-state"><div class="big">📡</div><h3>Couldn't load businesses</h3>
        <p>${reEscape(err.message)}</p>
        <button class="btn btn-primary" style="margin-top:1rem;" onclick="location.reload()">Try Again</button></div>`;
      resultsInfo.innerHTML = "";
      return;
    }
    const regionMap = new Map(regions.map(r => [r.id, r]));
    const countryMap = new Map(countries.map(c => [c.code, c]));
    const catMap = new Map(categories.map(c => [c.key, c]));

    const filtered = businesses
      .filter(b => matchesSearch(b, term, regionMap, countryMap, catMap))
      .filter(b => !cat || b.category === cat)
      .filter(b => !country || b.countryCode === country);

    const items = await Promise.all(filtered.map(async b => {
      const ratings = await reGetRatingsFor(b);
      return { biz: b, ratings, avg: reAverage(ratings) };
    }));

    switch (sortBy.value) {
      case "reviews": items.sort((a, b) => b.ratings.length - a.ratings.length); break;
      case "name":    items.sort((a, b) => a.biz.name.localeCompare(b.biz.name)); break;
      default:        items.sort((a, b) => b.avg - a.avg);
    }

    resultsInfo.innerHTML = `Showing <strong>${items.length}</strong> business${items.length === 1 ? "" : "es"}`
      + (term ? ` for "<strong>${reEscape(searchInput.value.trim())}</strong>"` : "");

    emptyState.style.display = items.length ? "none" : "block";

    bizGrid.innerHTML = items.map(({ biz, ratings, avg }) => {
      const catInfo = catMap.get(biz.category) || { icon: "🏢", label: biz.category, color: "#12734f" };
      const region = regionMap.get(biz.regionId);
      const country = countryMap.get(biz.countryCode);
      const services = (biz.services || []).slice(0, 4)
        .map(s => `<span class="service-tag">${reEscape(s)}</span>`).join("");
      const locationParts = [biz.city, region ? region.name : ""].filter(Boolean).join(", ");
      return `
        <div class="biz-card">
          ${reBizCoverHtml(biz, catInfo)}
          <div class="biz-body">
            <h3>${reEscape(biz.name)}</h3>
            <div class="biz-meta">
              <span class="chip">${catInfo.icon} ${reEscape(catInfo.label)}</span>
              <span>📍 ${reEscape(locationParts)}${country ? ` ${country.flag}` : ""}</span>
            </div>
            <p class="biz-desc">${reEscape(biz.description)}</p>
            <div class="biz-services">${services}</div>
            <div class="biz-rating-row">
              <div>
                <span class="stars">${reStarsHtml(avg)}</span>
                <span class="rating-value">${ratings.length ? avg.toFixed(1) : "New"}</span>
                <span class="rating-count">(${ratings.length} rating${ratings.length === 1 ? "" : "s"})</span>
              </div>
              <div style="display:flex; gap:0.5rem;">
                <button class="btn-details" data-detail-id="${biz.id}">Reviews &amp; Map</button>
                <button class="btn-rate" data-rate-id="${biz.id}">Rate ⭐</button>
              </div>
            </div>
          </div>
        </div>`;
    }).join("");
    reReveal(bizGrid);
  }

  /* Debounce the search box (every keystroke now triggers a real network
     round trip); category/country/sort stay instant since they're discrete
     select changes, not a keystroke stream. */
  let searchDebounce;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(render, 300);
  });
  categoryFilter.addEventListener("change", render);
  countryFilter.addEventListener("change", render);
  sortBy.addEventListener("change", render);
  await render();

  /* Delegated click handler for the Rate / Details buttons (cards re-render often) */
  bizGrid.addEventListener("click", async e => {
    const rateBtn = e.target.closest("[data-rate-id]");
    if (rateBtn) { await openRateModal(rateBtn.dataset.rateId); return; }
    const detailBtn = e.target.closest("[data-detail-id]");
    if (detailBtn) await openDetailsModal(detailBtn.dataset.detailId);
  });

  /* ---------- Details modal: full reviews list + free map/directions ---------- */
  const detailsModal = document.getElementById("detailsModal");
  let detailsBizId = null;

  async function openDetailsModal(bizId) {
    const biz = await reGetBusiness(bizId).catch(() => null);
    if (!biz) return;
    detailsBizId = bizId;

    const [catInfo, region, country, reviews, ratings] = await Promise.all([
      reCategoryByKey(biz.category),
      reRegionById(biz.regionId),
      reCountryByCode(biz.countryCode),
      reGetReviews(biz.id),
      reGetRatingsFor(biz)
    ]);
    const sortedReviews = [...reviews].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const avg = reAverage(ratings);

    document.getElementById("detailsCoverWrap").innerHTML = reBizCoverHtml(biz, catInfo);
    document.getElementById("detailsName").textContent = biz.name;
    document.getElementById("detailsMeta").textContent =
      `${catInfo.icon} ${catInfo.label} • 📍 ${biz.city}${region ? ", " + region.name : ""}${country ? ", " + country.name : ""}`;
    document.getElementById("detailsDescription").textContent = biz.description;
    document.getElementById("detailsServices").innerHTML = (biz.services || [])
      .map(s => `<span class="service-tag">${reEscape(s)}</span>`).join("");

    document.getElementById("detailsAvg").textContent = ratings.length ? avg.toFixed(1) : "—";
    document.getElementById("detailsStars").innerHTML = reStarsHtml(avg);
    document.getElementById("detailsRatingCount").textContent =
      `${ratings.length} rating${ratings.length === 1 ? "" : "s"}`;
    document.getElementById("detailsRatingBars").innerHTML = reRatingBreakdownHtml(ratings);
    document.getElementById("detailsReviewCount").textContent = sortedReviews.length;
    document.getElementById("detailsReviewsList").innerHTML =
      reReviewsListHtml(sortedReviews, "No written reviews yet — be the first to leave one!");

    const coords = await reCoordsForBusiness(biz);
    const mapWrap = document.getElementById("detailsMapWrap");
    if (coords) {
      mapWrap.innerHTML = `<iframe src="${reMapEmbedUrl(coords.lat, coords.lng)}" loading="lazy" title="Map showing ${reEscape(biz.name)}"></iframe>`;
    } else {
      mapWrap.innerHTML = `<p class="hint">A map preview isn't available for this location yet — directions will still work below.</p>`;
    }
    document.getElementById("detailsDirectionsBtn").href = reDirectionsUrl(biz, coords);

    detailsModal.classList.add("open");
  }

  document.getElementById("detailsClose").addEventListener("click", () => detailsModal.classList.remove("open"));
  detailsModal.addEventListener("click", e => { if (e.target === detailsModal) detailsModal.classList.remove("open"); });
  document.getElementById("detailsRateBtn").addEventListener("click", async () => {
    detailsModal.classList.remove("open");
    if (detailsBizId) await openRateModal(detailsBizId);
  });

  /* ---------- Rating modal (requires a logged-in user account) ---------- */
  const rateModal = document.getElementById("rateModal");
  const starPicker = document.getElementById("starPicker");
  const starLabel = document.getElementById("starLabel");
  const reviewText = document.getElementById("reviewText");
  let currentBizId = null;
  let currentStars = 0;

  async function openRateModal(bizId) {
    const session = reGetSession();
    if (!session || session.kind !== "user") {
      reToast("Please log in as a user to rate a business.", "🔒");
      const redirectTo = "businesses.html?rate=" + encodeURIComponent(bizId);
      window.location.href = "login.html?redirect=" + encodeURIComponent(redirectTo);
      return;
    }
    const biz = await reGetBusiness(bizId).catch(() => null);
    if (!biz) return;
    currentBizId = bizId;
    currentStars = 0;
    reviewText.value = "";
    starLabel.textContent = "Tap a star to rate";
    paintStars(0);
    const [region, country, catInfo] = await Promise.all([
      reRegionById(biz.regionId), reCountryByCode(biz.countryCode), reCategoryByKey(biz.category)
    ]);
    document.getElementById("modalBizName").textContent = "Rate " + biz.name;
    document.getElementById("modalBizMeta").textContent =
      `📍 ${biz.city}${region ? ", " + region.name : ""}${country ? ", " + country.name : ""} • ${catInfo.label}`;
    rateModal.classList.add("open");
  }

  function paintStars(count) {
    starPicker.querySelectorAll("button").forEach(btn => {
      btn.classList.toggle("lit", Number(btn.dataset.star) <= count);
    });
  }

  starPicker.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("mouseenter", () => paintStars(Number(btn.dataset.star)));
    btn.addEventListener("mouseleave", () => paintStars(currentStars));
    btn.addEventListener("click", () => {
      currentStars = Number(btn.dataset.star);
      paintStars(currentStars);
      starLabel.textContent = STAR_WORDS[currentStars];
    });
  });

  document.getElementById("cancelRate").addEventListener("click", () => rateModal.classList.remove("open"));
  rateModal.addEventListener("click", e => { if (e.target === rateModal) rateModal.classList.remove("open"); });

  document.getElementById("submitRate").addEventListener("click", async () => {
    if (!currentStars) {
      starLabel.textContent = "Please select a star rating first ⭐";
      return;
    }
    try {
      await reCreateReview({ businessId: currentBizId, stars: currentStars, comment: reviewText.value.trim() });
    } catch (err) {
      reToast(err.message, "⚠️");
      return;
    }
    rateModal.classList.remove("open");
    reToast("Thanks! Your rating helps the community choose better.", "⭐");
    await render();
  });

  /* Deep links: businesses.html?rate=kb-001 or ?details=kb-001 */
  if (params.get("rate")) await openRateModal(params.get("rate"));
  if (params.get("details")) await openDetailsModal(params.get("details"));
})();
