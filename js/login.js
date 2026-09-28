/* ============================================================
   Rate Everything — Login page
   Two tabs (User / Business), authenticated against the real API.
   Honors ?redirect= for deep links.
   ============================================================ */

(function () {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");

  function defaultLandingFor(session) {
    if (session.kind === "business") return "business-dashboard.html";
    if (session.kind === "user" && session.role === "admin") return "admin.html";
    return "index.html";
  }

  /* A redirect target is only safe to honor if this session can actually
     pass that page's own guard — otherwise we'd bounce forever between
     login.html and the protected page. */
  function resolveLanding(session, wanted) {
    if (!wanted) return defaultLandingFor(session);
    if (wanted.startsWith("admin.html")) {
      return session.kind === "user" && session.role === "admin" ? wanted : defaultLandingFor(session);
    }
    if (wanted.startsWith("business-dashboard.html")) {
      return session.kind === "business" ? wanted : defaultLandingFor(session);
    }
    return wanted;
  }

  /* If already logged in, just go straight to the right place */
  const existing = reGetSession();
  if (existing) {
    window.location.href = resolveLanding(existing, redirect);
    return;
  }

  /* ---------- Tabs ---------- */
  const tabs = document.querySelectorAll(".auth-tab");
  const panels = { user: document.getElementById("userPanel"), business: document.getElementById("businessPanel") };
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      Object.values(panels).forEach(p => p.classList.remove("active"));
      panels[tab.dataset.tab].classList.add("active");
    });
  });
  if (params.get("as") === "business") {
    document.querySelector('.auth-tab[data-tab="business"]').click();
  }

  /* ---------- User login ---------- */
  const userForm = document.getElementById("userLoginForm");
  reLiveValidation(userForm);
  userForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (!reValidateForm(userForm)) return;

    const email = document.getElementById("userEmail").value.trim().toLowerCase();
    const password = document.getElementById("userPassword").value;

    let result;
    try {
      result = await reApiLoginUser(email, password);
    } catch (err) {
      reToast(err.message, "⚠️");
      document.getElementById("userEmail").classList.add("invalid");
      document.getElementById("userPassword").classList.add("invalid");
      return;
    }

    reLogin(result);
    reToast(`Welcome back, ${result.name}!`, "🎉");
    window.location.href = resolveLanding(result, redirect);
  });

  /* ---------- Business login ---------- */
  const bizForm = document.getElementById("businessLoginForm");
  reLiveValidation(bizForm);
  bizForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (!reValidateForm(bizForm)) return;

    const email = document.getElementById("bizLoginEmail").value.trim().toLowerCase();
    const password = document.getElementById("bizLoginPassword").value;

    let result;
    try {
      result = await reApiLoginBusiness(email, password);
    } catch (err) {
      reToast(err.message, "⚠️");
      document.getElementById("bizLoginEmail").classList.add("invalid");
      document.getElementById("bizLoginPassword").classList.add("invalid");
      return;
    }

    reLogin(result);
    reToast(`Welcome back, ${result.name}!`, "🎉");
    window.location.href = resolveLanding(result, redirect);
  });
})();
