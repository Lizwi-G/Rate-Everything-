/* ============================================================
   KhethaBiz — User registration page
   ============================================================ */

(function () {
  /* Populate province dropdown */
  const provinceSelect = document.getElementById("province");
  KB_PROVINCES.forEach(p => {
    provinceSelect.insertAdjacentHTML("beforeend", `<option value="${p}">${p}</option>`);
  });

  const form = document.getElementById("userForm");
  kbLiveValidation(form);

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!kbValidateForm(form)) {
      kbToast("Please fix the highlighted fields.", "⚠️");
      return;
    }

    const email = document.getElementById("email").value.trim().toLowerCase();
    const users = kbLoad(KB_KEYS.users);

    if (users.some(u => u.email === email)) {
      kbToast("An account with this email already exists.", "⚠️");
      document.getElementById("email").classList.add("invalid");
      return;
    }

    users.push({
      id: kbUid("usr"),
      firstName: document.getElementById("firstName").value.trim(),
      lastName: document.getElementById("lastName").value.trim(),
      email,
      phone: document.getElementById("phone").value.trim(),
      province: provinceSelect.value,
      // Prototype only — never store plain passwords in production!
      createdAt: new Date().toISOString()
    });
    kbSave(KB_KEYS.users, users);

    document.getElementById("welcomeName").textContent =
      document.getElementById("firstName").value.trim();
    form.style.display = "none";
    document.getElementById("successPanel").classList.add("show");
    kbToast("Account created successfully!", "🎉");
  });
})();
