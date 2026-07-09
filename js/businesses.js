/* ============================================================
   KhethaBiz — Businesses directory page
   Search, filter, sort and the star-rating modal.
   ============================================================ */

(function () {
  /* ---------- Populate filter dropdowns ---------- */
  const categoryFilter = document.getElementById("categoryFilter");
  const provinceFilter = document.getElementById("provinceFilter");
  const searchInput = document.getElementById("searchInput");
  const sortBy = document.getElementById("sortBy");

  KB_CATEGORIES.forEach(cat => {
    categoryFilter.insertAdjacentHTML("beforeend",
      `<option value="${cat.key}">${cat.icon} ${cat.label}</option>`);
  });
  KB_PROVINCES.forEach(p => {
    provinceFilter.insertAdjacentHTML("beforeend", `<option value="${p}">${p}</option>`);
  });

  /* ---------- Read query params (from home page links) ---------- */
  const params = new URLSearchParams(window.location.search);
  if (params.get("q")) searchInput.value = params.get("q");
  if (params.get("category")) categoryFilter.value = params.get("category");

  /* ---------- Render ---------- */
  const bizGrid = document.getElementById("bizGrid");
  const emptyState = document.getElementById("emptyState");
  const resultsInfo = document.getElementById("resultsInfo");

  const STAR_WORDS = ["", "Poor 😞", "Fair 😐", "Good 🙂", "Great 😃", "Excellent! 🤩"];

  function matchesSearch(biz, term) {
    if (!term) return true;
    const haystack = [
      biz.name, biz.description, biz.city, biz.province,
      kbCategory(biz.category).label, ...(biz.services || [])
    ].join(" ").toLowerCase();
    return haystack.includes(term);
  }

  function render() {
    const term = searchInput.value.trim().toLowerCase();
    const cat = categoryFilter.value;
    const prov = provinceFilter.value;

    let items = kbGetAllBusinesses()
      .filter(b => matchesSearch(b, term))
      .filter(b => !cat || b.category === cat)
      .filter(b => !prov || b.province === prov)
      .map(b => {
        const ratings = kbGetRatingsFor(b);
        return { biz: b, ratings, avg: kbAverage(ratings) };
      });

    switch (sortBy.value) {
      case "reviews": items.sort((a, b) => b.ratings.length - a.ratings.length); break;
      case "name":    items.sort((a, b) => a.biz.name.localeCompare(b.biz.name)); break;
      default:        items.sort((a, b) => b.avg - a.avg);
    }

    resultsInfo.innerHTML = `Showing <strong>${items.length}</strong> business${items.length === 1 ? "" : "es"}`
      + (term ? ` for "<strong>${kbEscape(searchInput.value.trim())}</strong>"` : "");

    emptyState.style.display = items.length ? "none" : "block";

    bizGrid.innerHTML = items.map(({ biz, ratings, avg }) => {
      const catInfo = kbCategory(biz.category);
      const services = (biz.services || []).slice(0, 4)
        .map(s => `<span class="service-tag">${kbEscape(s)}</span>`).join("");
      return `
        <div class="biz-card">
          <div class="biz-cover" style="background:${catInfo.gradient}">
            ${biz.icon || catInfo.icon}
            ${biz.verified ? '<span class="verified">✔ VERIFIED</span>' : ""}
          </div>
          <div class="biz-body">
            <h3>${kbEscape(biz.name)}</h3>
            <div class="biz-meta">
              <span class="chip">${catInfo.icon} ${catInfo.label}</span>
              <span>📍 ${kbEscape(biz.city)}, ${kbEscape(biz.province)}</span>
            </div>
            <p class="biz-desc">${kbEscape(biz.description)}</p>
            <div class="biz-services">${services}</div>
            <div class="biz-rating-row">
              <div>
                <span class="stars">${kbStarsHtml(avg)}</span>
                <span class="rating-value">${ratings.length ? avg.toFixed(1) : "New"}</span>
                <span class="rating-count">(${ratings.length} rating${ratings.length === 1 ? "" : "s"})</span>
              </div>
              <button class="btn-rate" data-rate-id="${biz.id}">Rate ⭐</button>
            </div>
          </div>
        </div>`;
    }).join("");
  }

  searchInput.addEventListener("input", render);
  categoryFilter.addEventListener("change", render);
  provinceFilter.addEventListener("change", render);
  sortBy.addEventListener("change", render);
  render();

  /* Delegated click handler for the Rate buttons (cards re-render often) */
  bizGrid.addEventListener("click", e => {
    const btn = e.target.closest("[data-rate-id]");
    if (btn) openRateModal(btn.dataset.rateId);
  });

  /* ---------- Rating modal ---------- */
  const rateModal = document.getElementById("rateModal");
  const starPicker = document.getElementById("starPicker");
  const starLabel = document.getElementById("starLabel");
  const reviewText = document.getElementById("reviewText");
  let currentBizId = null;
  let currentStars = 0;

  function openRateModal(bizId) {
    const biz = kbGetAllBusinesses().find(b => b.id === bizId);
    if (!biz) return;
    currentBizId = bizId;
    currentStars = 0;
    reviewText.value = "";
    starLabel.textContent = "Tap a star to rate";
    paintStars(0);
    document.getElementById("modalBizName").textContent = "Rate " + biz.name;
    document.getElementById("modalBizMeta").textContent =
      `📍 ${biz.city}, ${biz.province} • ${kbCategory(biz.category).label}`;
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

  document.getElementById("submitRate").addEventListener("click", () => {
    if (!currentStars) {
      starLabel.textContent = "Please select a star rating first ⭐";
      return;
    }
    const reviews = kbLoad(KB_KEYS.reviews);
    reviews.push({
      id: kbUid("rev"),
      businessId: currentBizId,
      stars: currentStars,
      comment: reviewText.value.trim(),
      date: new Date().toISOString()
    });
    kbSave(KB_KEYS.reviews, reviews);
    rateModal.classList.remove("open");
    kbToast("Thanks! Your rating helps the community choose better.", "⭐");
    render();
  });

  /* Deep link: businesses.html?rate=kb-001 opens the modal directly */
  if (params.get("rate")) openRateModal(params.get("rate"));
})();
