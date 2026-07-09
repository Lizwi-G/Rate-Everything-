/* ============================================================
   KhethaBiz — Business registration page
   ============================================================ */

(function () {
  /* Populate dropdowns */
  const catSelect = document.getElementById("bizCategory");
  KB_CATEGORIES.forEach(cat => {
    catSelect.insertAdjacentHTML("beforeend",
      `<option value="${cat.key}">${cat.icon} ${cat.label}</option>`);
  });

  const provSelect = document.getElementById("bizProvince");
  KB_PROVINCES.forEach(p => {
    provSelect.insertAdjacentHTML("beforeend", `<option value="${p}">${p}</option>`);
  });

  /* Live character count for description */
  const desc = document.getElementById("bizDescription");
  desc.addEventListener("input", () => {
    document.getElementById("descCount").textContent = desc.value.length;
  });

  const form = document.getElementById("bizForm");
  kbLiveValidation(form);

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!kbValidateForm(form)) {
      kbToast("Please fix the highlighted fields.", "⚠️");
      return;
    }

    const name = document.getElementById("bizName").value.trim();
    const services = document.getElementById("bizServices").value
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const businesses = kbLoad(KB_KEYS.businesses);
    businesses.push({
      id: kbUid("kb"),
      name,
      category: catSelect.value,
      icon: document.getElementById("bizIcon").value,
      city: document.getElementById("bizCity").value.trim(),
      province: provSelect.value,
      description: desc.value.trim(),
      services,
      email: document.getElementById("bizEmail").value.trim(),
      phone: document.getElementById("bizPhone").value.trim(),
      regNo: document.getElementById("bizRegNo").value.trim(),
      verified: document.getElementById("bizRegNo").value.trim() !== "",
      ratings: [],
      createdAt: new Date().toISOString()
    });
    kbSave(KB_KEYS.businesses, businesses);

    document.getElementById("successBizName").textContent = name;
    document.getElementById("viewListingBtn").href =
      "businesses.html?q=" + encodeURIComponent(name);
    form.style.display = "none";
    document.getElementById("successPanel").classList.add("show");
    kbToast("Your business is now live on KhethaBiz!", "🚀");
  });
})();
