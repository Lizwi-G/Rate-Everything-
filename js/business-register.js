/* ============================================================
   Rate Everything — Business registration page
   ============================================================ */

(async function () {
  /* Populate dropdowns */
  const catSelect = document.getElementById("bizCategory");
  (await reGetCategories()).forEach(cat => {
    catSelect.insertAdjacentHTML("beforeend",
      `<option value="${cat.key}">${cat.icon} ${reEscape(cat.label)}</option>`);
  });

  const countrySelect = document.getElementById("bizCountry");
  const regionSelect = document.getElementById("bizRegion");
  const cityInput = document.getElementById("bizCity");
  const cityDatalist = document.getElementById("bizCityOptions");

  await rePopulateCountrySelect(countrySelect);
  countrySelect.addEventListener("change", async () => {
    await rePopulateRegionSelect(regionSelect, countrySelect.value);
    cityDatalist.innerHTML = "";
  });
  regionSelect.addEventListener("change", async () => {
    await rePopulateCityDatalist(cityDatalist, regionSelect.value);
  });

  /* Live character count for description */
  const desc = document.getElementById("bizDescription");
  desc.addEventListener("input", () => {
    document.getElementById("descCount").textContent = desc.value.length;
  });

  /* ---------- Photo upload (resized/compressed client-side) ---------- */
  const imageInput = document.getElementById("bizImage");
  const imagePreviewWrap = document.getElementById("bizImagePreviewWrap");
  const imagePreview = document.getElementById("bizImagePreview");
  const imageRemoveBtn = document.getElementById("bizImageRemove");
  let pendingImage = null;

  imageInput.addEventListener("change", async () => {
    const file = imageInput.files[0];
    if (!file) return;
    try {
      pendingImage = await reReadImageAsDataUrl(file);
      imagePreview.src = pendingImage;
      imagePreviewWrap.style.display = "flex";
    } catch (err) {
      reToast(err.message, "⚠️");
      imageInput.value = "";
    }
  });

  imageRemoveBtn.addEventListener("click", () => {
    pendingImage = null;
    imageInput.value = "";
    imagePreviewWrap.style.display = "none";
    imagePreview.src = "";
  });

  const form = document.getElementById("bizForm");
  reLiveValidation(form);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!reValidateForm(form)) {
      reToast("Please fix the highlighted fields.", "⚠️");
      return;
    }

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    const name = document.getElementById("bizName").value.trim();
    const services = document.getElementById("bizServices").value
      .split(",").map(s => s.trim()).filter(Boolean);

    const payload = {
      name,
      category: catSelect.value,
      icon: document.getElementById("bizIcon").value,
      image: pendingImage,
      city: document.getElementById("bizCity").value.trim(),
      regionId: regionSelect.value,
      countryCode: countrySelect.value,
      description: desc.value.trim(),
      services,
      email: document.getElementById("bizEmail").value.trim().toLowerCase(),
      phone: document.getElementById("bizPhone").value.trim(),
      regNo: document.getElementById("bizRegNo").value.trim(),
      password: document.getElementById("bizPassword").value
    };

    let pending;
    try {
      pending = await reApiRegisterBusiness(payload);
    } catch (err) {
      submitBtn.disabled = false;
      reToast(err.message, "⚠️");
      if (err.status === 409) document.getElementById("bizEmail").classList.add("invalid");
      return;
    }
    submitBtn.disabled = false;
    showOtpStep(pending);
  });

  /* ---------- OTP verification step ---------- */
  const otpPanel = document.getElementById("otpPanel");
  const otpForm = document.getElementById("otpForm");
  const otpCodeInput = document.getElementById("otpCodeInput");
  const otpError = document.getElementById("otpError");
  const otpResendBtn = document.getElementById("otpResendBtn");
  let currentPendingId = null;
  let resendTimer = null;

  function showOtpStep(pending) {
    currentPendingId = pending.id;
    document.getElementById("otpEmailTarget").textContent = pending.email;
    document.getElementById("otpDevCode").textContent = pending.otp;
    otpError.classList.remove("show");
    otpCodeInput.value = "";
    otpCodeInput.classList.remove("invalid");
    form.style.display = "none";
    otpPanel.classList.add("show");
    otpCodeInput.focus();
    startResendCooldown();
  }

  function showOtpError(message) {
    otpError.textContent = message;
    otpError.classList.add("show");
    otpCodeInput.classList.add("invalid");
  }

  function startResendCooldown(seconds = 30) {
    clearInterval(resendTimer);
    let remaining = seconds;
    otpResendBtn.disabled = true;
    otpResendBtn.textContent = `Resend Code (${remaining}s)`;
    resendTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(resendTimer);
        otpResendBtn.disabled = false;
        otpResendBtn.textContent = "Resend Code";
      } else {
        otpResendBtn.textContent = `Resend Code (${remaining}s)`;
      }
    }, 1000);
  }

  otpCodeInput.addEventListener("input", () => {
    otpCodeInput.value = otpCodeInput.value.replace(/\D/g, "").slice(0, 6);
    otpError.classList.remove("show");
    otpCodeInput.classList.remove("invalid");
  });

  otpForm.addEventListener("submit", async e => {
    e.preventDefault();
    const code = otpCodeInput.value.trim();
    if (code.length !== 6) {
      showOtpError("Please enter the 6-digit code.");
      return;
    }

    const result = await reApiVerifyOtp(currentPendingId, code);
    if (!result.ok) {
      if (result.reason === "expired") showOtpError("This code has expired. Tap Resend to get a new one.");
      else if (result.reason === "locked") showOtpError("Too many incorrect attempts. Tap Resend to get a new code.");
      else showOtpError(`Incorrect code. ${result.attemptsLeft ?? 0} attempt(s) left.`);
      return;
    }

    reLogin(result);
    reRenderAuthNav();

    clearInterval(resendTimer);
    otpPanel.classList.remove("show");
    document.getElementById("successBizName").textContent = result.name;
    document.getElementById("successPanel").classList.add("show");
    reToast("Email verified — your business is now live!", "🚀");
  });

  otpResendBtn.addEventListener("click", async () => {
    const pending = await reApiResendOtp(currentPendingId);
    if (!pending) {
      reToast("This verification session expired — please start over.", "⚠️");
      otpPanel.classList.remove("show");
      form.style.display = "block";
      return;
    }
    document.getElementById("otpDevCode").textContent = pending.otp;
    otpError.classList.remove("show");
    reToast("A new code was generated.", "📩");
    startResendCooldown();
  });

  document.getElementById("otpBackBtn").addEventListener("click", () => {
    clearInterval(resendTimer);
    if (currentPendingId) reApiCancelPending(currentPendingId);
    otpPanel.classList.remove("show");
    form.style.display = "block";
  });
})();
