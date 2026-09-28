/* ============================================================
   Rate Everything — User registration page
   ============================================================ */

(async function () {
  const countrySelect = document.getElementById("country");
  const regionSelect = document.getElementById("region");

  await rePopulateCountrySelect(countrySelect);
  countrySelect.addEventListener("change", async () => {
    await rePopulateRegionSelect(regionSelect, countrySelect.value);
  });

  const form = document.getElementById("userForm");
  reLiveValidation(form);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!reValidateForm(form)) {
      reToast("Please fix the highlighted fields.", "⚠️");
      return;
    }

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    const payload = {
      firstName: document.getElementById("firstName").value.trim(),
      lastName: document.getElementById("lastName").value.trim(),
      email: document.getElementById("email").value.trim().toLowerCase(),
      phone: document.getElementById("phone").value.trim(),
      countryCode: countrySelect.value,
      regionId: regionSelect.value,
      password: document.getElementById("password").value
    };

    let pending;
    try {
      pending = await reApiRegisterUser(payload);
    } catch (err) {
      submitBtn.disabled = false;
      reToast(err.message, "⚠️");
      if (err.status === 409) document.getElementById("email").classList.add("invalid");
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
    document.getElementById("welcomeName").textContent = result.name;
    document.getElementById("successPanel").classList.add("show");
    reToast("Email verified — account created!", "🎉");
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
