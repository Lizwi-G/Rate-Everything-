/* ============================================================
   Rate Everything — Auth
   Session + role guards + the shared nav auth slot. Loaded after
   store.js on every page (the nav markup sits above the script
   tags at the bottom of <body>, so it's safe to render immediately).
   ============================================================ */

/* ---------- Session ----------
   The JWT (needed on every API call) and a small display snapshot
   {kind, id, role, name, email} are stored separately — the snapshot
   lets the nav render instantly with no network round trip. */
function reGetSession() {
  try {
    return JSON.parse(localStorage.getItem(RE_KEYS.session));
  } catch {
    return null;
  }
}

/* `authResult` is whatever the API returned from register/verify/login:
   {token, kind, id, role, name, email} */
function reLogin(authResult) {
  localStorage.setItem(RE_KEYS.token, authResult.token);
  localStorage.setItem(RE_KEYS.session, JSON.stringify({
    kind: authResult.kind, id: authResult.id, role: authResult.role,
    name: authResult.name, email: authResult.email
  }));
}

function reLogout() {
  localStorage.removeItem(RE_KEYS.token);
  localStorage.removeItem(RE_KEYS.session);
}

/* ---------- Route guards ----------
   Await this at the top of a protected page's script before
   rendering anything else. Redirects to login.html on failure.
   Also re-validates the token against the server, so a stale/expired
   token (or a user demoted/deleted since login) still gets bounced. */
async function reRequireRole(kind, role) {
  const session = reGetSession();
  const token = localStorage.getItem(RE_KEYS.token);
  let ok = !!session && !!token && session.kind === kind && (!role || session.role === role);

  if (ok) {
    try {
      const me = await reApiMe();
      ok = me.kind === kind && (!role || me.role === role);
      if (ok) {
        // Keep the cached snapshot fresh in case name/role changed server-side.
        localStorage.setItem(RE_KEYS.session, JSON.stringify(me));
      }
    } catch {
      ok = false;
    }
  }

  if (!ok) {
    reLogout();
    const here = location.pathname.split("/").pop() + location.search;
    location.href = "login.html?redirect=" + encodeURIComponent(here);
    return false;
  }
  return true;
}

/* ---------- Shared nav auth slot ----------
   #navAuthSlot is a permanent, hidden marker li. Real nav items
   are injected as its siblings (tagged .nav-auth-dynamic) so
   re-rendering is idempotent and the markup stays valid (li's
   nested inside li's would otherwise get silently unwrapped by
   the HTML parser). */
function reRenderAuthNav() {
  const slot = document.getElementById("navAuthSlot");
  if (!slot) return;
  document.querySelectorAll(".nav-auth-dynamic").forEach(el => el.remove());

  const session = reGetSession();
  let items = [];

  if (!session) {
    items = [
      '<a href="register.html">Join as a User</a>',
      '<a href="business-register.html" class="cta-outline">List Your Business</a>',
      '<a href="login.html" class="cta-outline">Log In</a>'
    ];
  } else if (session.kind === "user") {
    if (session.role === "admin") {
      items = [
        `<span class="nav-greeting">Hi, ${reEscape(session.name)} 👑</span>`,
        '<a href="admin.html" class="cta-outline">Admin Dashboard</a>',
        '<button type="button" class="cta-outline nav-logout-btn" id="navLogoutBtn">Log Out</button>'
      ];
    } else {
      items = [
        `<span class="nav-greeting">Hi, ${reEscape(session.name)} 👋</span>`,
        '<a href="business-register.html" class="cta-outline">List Your Business</a>',
        '<button type="button" class="cta-outline nav-logout-btn" id="navLogoutBtn">Log Out</button>'
      ];
    }
  } else if (session.kind === "business") {
    items = [
      `<span class="nav-greeting">🏪 ${reEscape(session.name)}</span>`,
      '<a href="business-dashboard.html" class="cta-outline">My Business</a>',
      '<button type="button" class="cta-outline nav-logout-btn" id="navLogoutBtn">Log Out</button>'
    ];
  }

  const html = items.map(i => `<li class="nav-auth-dynamic">${i}</li>`).join("");
  slot.insertAdjacentHTML("afterend", html);
}

document.addEventListener("click", e => {
  if (e.target.id === "navLogoutBtn") {
    reLogout();
    window.location.href = "index.html";
  }
});

reRenderAuthNav();

/* ---------- Theme toggle ----------
   Defaults to the OS preference (no stored choice = no data-theme
   attribute, so the CSS media query decides). An explicit toggle
   stores the choice and overrides it either direction. */
function reApplyThemeIcon() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  const stored = localStorage.getItem("rateeverything.theme");
  const isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  btn.textContent = isDark ? "☀️" : "🌙";
}

document.getElementById("themeToggle")?.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme")
    || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("rateeverything.theme", next);
  reApplyThemeIcon();
});

reApplyThemeIcon();

/* ---------- Sticky header scroll shadow ---------- */
(function () {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
