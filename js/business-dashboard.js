/* ============================================================
   Rate Everything — Business Dashboard
   Guarded by reRequireRole('business'). Shows the logged-in
   business's own listing, stats and reviews, plus an edit form.
   ============================================================ */

(async function () {
  const ok = await reRequireRole("business");
  if (!ok) return;

  let biz = await reGetMyBusiness().catch(() => null);
  if (!biz) return;

  document.getElementById("dashShell").style.display = "flex";

  let cat = await reCategoryByKey(biz.category);
  let region = await reRegionById(biz.regionId);
  let country = await reCountryByCode(biz.countryCode);

  function renderHeader() {
    document.getElementById("bizNameHeading").textContent = biz.name;
    document.getElementById("bizMetaLine").textContent =
      `${cat.label} • ${biz.city}${region ? ", " + region.name : ""}${country ? ", " + country.name : ""}`;
    const badge = document.getElementById("verifiedBadge");
    badge.textContent = biz.verified ? "✔ Verified" : "Not Verified";
    badge.className = "badge " + (biz.verified ? "badge-verified" : "badge-unverified");
    document.getElementById("viewPublicListing").href = "businesses.html?q=" + encodeURIComponent(biz.name);

    const thumb = document.getElementById("dashCoverThumb");
    thumb.style.background = "";
    thumb.innerHTML = `<img src="${reCoverPhotoUrl(biz, cat)}" alt="" />`;
  }

  async function renderStats() {
    const ratings = await reGetRatingsFor(biz);
    const avg = reAverage(ratings);
    document.getElementById("dashAvg").textContent = ratings.length ? avg.toFixed(1) : "0.0";
    document.getElementById("dashReviewCount").textContent = ratings.length;
  }

  async function renderReviews() {
    const reviews = [...(await reGetReviews(biz.id))].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    document.getElementById("reviewsList").innerHTML =
      reReviewsListHtml(reviews, "No reviews yet — once customers rate you, they'll show up here.");
  }

  renderHeader();
  await renderStats();
  await renderReviews();

  /* ---------- Edit listing form ---------- */
  const catSelect = document.getElementById("editCategory");
  (await reGetCategories()).forEach(c => {
    catSelect.insertAdjacentHTML("beforeend", `<option value="${c.key}">${c.icon} ${reEscape(c.label)}</option>`);
  });

  const form = document.getElementById("editBizForm");
  document.getElementById("editName").value = biz.name;
  catSelect.value = biz.category;
  document.getElementById("editCity").value = biz.city;
  document.getElementById("editDescription").value = biz.description;
  document.getElementById("editServices").value = (biz.services || []).join(", ");
  document.getElementById("editEmail").value = biz.email || "";
  document.getElementById("editPhone").value = biz.phone || "";

  /* ---------- Photo upload (resized/compressed client-side) ---------- */
  const imageInput = document.getElementById("editImage");
  const imagePreviewWrap = document.getElementById("editImagePreviewWrap");
  const imagePreview = document.getElementById("editImagePreview");
  const imageRemoveBtn = document.getElementById("editImageRemove");
  let imageChanged = false;
  let pendingImage = null;

  if (biz.image) {
    imagePreview.src = biz.image;
    imagePreviewWrap.style.display = "flex";
  }

  imageInput.addEventListener("change", async () => {
    const file = imageInput.files[0];
    if (!file) return;
    try {
      pendingImage = await reReadImageAsDataUrl(file);
      imageChanged = true;
      imagePreview.src = pendingImage;
      imagePreviewWrap.style.display = "flex";
    } catch (err) {
      reToast(err.message, "⚠️");
      imageInput.value = "";
    }
  });

  imageRemoveBtn.addEventListener("click", () => {
    pendingImage = null;
    imageChanged = true;
    imageInput.value = "";
    imagePreviewWrap.style.display = "none";
    imagePreview.src = "";
  });

  reLiveValidation(form);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!reValidateForm(form)) {
      reToast("Please fix the highlighted fields.", "⚠️");
      return;
    }

    const payload = {
      name: document.getElementById("editName").value.trim(),
      category: catSelect.value,
      city: document.getElementById("editCity").value.trim(),
      description: document.getElementById("editDescription").value.trim(),
      services: document.getElementById("editServices").value.split(",").map(s => s.trim()).filter(Boolean),
      email: document.getElementById("editEmail").value.trim(),
      phone: document.getElementById("editPhone").value.trim(),
      imageChanged,
      image: pendingImage
    };

    try {
      biz = await reUpdateMyBusiness(payload);
    } catch (err) {
      reToast(err.message || "Could not save — your photo may be too large. Try a smaller image.", "⚠️");
      return;
    }

    imageChanged = false;
    cat = await reCategoryByKey(biz.category);
    region = await reRegionById(biz.regionId);
    country = await reCountryByCode(biz.countryCode);
    renderHeader();
    reToast("Your listing has been updated!", "✅");
  });
})();
