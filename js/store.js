/* ============================================================
   Rate Everything — API client
   Talks to the real ASP.NET Core + SQL Server backend
   (server/RateEverything.Api). Function names/shapes match the
   old localStorage-backed store.js wherever practical, so page
   scripts mostly just needed `await` added at call sites.
   ============================================================ */

/* Local dev talks to the API running on localhost:5080; the deployed
   Netlify site talks to the deployed Render API. Update the production
   URL below once your Render service is live (Render shows it on the
   service's dashboard page, e.g. https://rate-everything-api.onrender.com). */
const RE_API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:5080/api"
  : "https://rate-everything-api.onrender.com/api";

const RE_KEYS = {
  token: "rateeverything.token",
  session: "rateeverything.session"
};

/* ---------- Low-level fetch helper ----------
   Retries a couple of times on a genuine network failure (dropped
   connection, API still warming up) — but never on an actual HTTP
   error response, since retrying a 400/404/409 just repeats the
   same mistake. Without this, one transient blip at page load could
   leave an entire page stuck (filters never populated, no data,
   skeletons that never resolve) since nothing else downstream
   would run either. */
async function reApiFetch(path, options = {}, attempt = 0) {
  const token = localStorage.getItem(RE_KEYS.token);
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = "Bearer " + token;

  let res;
  try {
    res = await fetch(RE_API_BASE + path, { ...options, headers });
  } catch (networkErr) {
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 350 * (attempt + 1)));
      return reApiFetch(path, options, attempt + 1);
    }
    const err = new Error("Can't reach the server right now. Check your connection and try again.");
    err.status = 0;
    throw err;
  }

  if (res.status === 204) return null;

  let body = null;
  try { body = await res.json(); } catch { /* empty body */ }

  if (!res.ok) {
    const message = (body && body.message) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function reQuery(params) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return q ? `?${q}` : "";
}

/* ---------- Categories ---------- */
function reGetCategories() { return reApiFetch("/categories"); }
function reCreateCategory(data) { return reApiFetch("/categories", { method: "POST", body: JSON.stringify(data) }); }
function reUpdateCategory(key, data) { return reApiFetch(`/categories/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(data) }); }
function reDeleteCategory(key) { return reApiFetch(`/categories/${encodeURIComponent(key)}`, { method: "DELETE" }); }

/* ---------- Countries ---------- */
function reGetCountries() { return reApiFetch("/countries"); }
function reCreateCountry(data) { return reApiFetch("/countries", { method: "POST", body: JSON.stringify(data) }); }
function reUpdateCountry(code, data) { return reApiFetch(`/countries/${encodeURIComponent(code)}`, { method: "PUT", body: JSON.stringify(data) }); }
function reDeleteCountry(code) { return reApiFetch(`/countries/${encodeURIComponent(code)}`, { method: "DELETE" }); }

/* ---------- Regions ---------- */
function reGetRegions(countryCode) { return reApiFetch("/regions" + reQuery({ countryCode })); }
function reCreateRegion(data) { return reApiFetch("/regions", { method: "POST", body: JSON.stringify(data) }); }
function reUpdateRegion(id, data) { return reApiFetch(`/regions/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }); }
function reDeleteRegion(id) { return reApiFetch(`/regions/${encodeURIComponent(id)}`, { method: "DELETE" }); }

/* ---------- Cities ---------- */
function reGetCities(regionId) { return reApiFetch("/cities" + reQuery({ regionId })); }
function reCreateCity(data) { return reApiFetch("/cities", { method: "POST", body: JSON.stringify(data) }); }
function reUpdateCity(id, data) { return reApiFetch(`/cities/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }); }
function reDeleteCity(id) { return reApiFetch(`/cities/${encodeURIComponent(id)}`, { method: "DELETE" }); }

/* ---------- Businesses ---------- */
function reGetBusinesses() { return reApiFetch("/businesses"); }
function reGetBusiness(id) { return reApiFetch(`/businesses/${encodeURIComponent(id)}`); }
function reGetMyBusiness() { return reApiFetch("/businesses/mine"); }
function reUpdateMyBusiness(data) { return reApiFetch("/businesses/mine", { method: "PUT", body: JSON.stringify(data) }); }
function reAdminUpdateBusiness(id, data) { return reApiFetch(`/businesses/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }); }
function reSetBusinessVerified(id, verified) { return reApiFetch(`/businesses/${encodeURIComponent(id)}/verified`, { method: "PATCH", body: JSON.stringify({ verified }) }); }
function reDeleteBusiness(id) { return reApiFetch(`/businesses/${encodeURIComponent(id)}`, { method: "DELETE" }); }
function reRemoveBusinessImage(id) { return reApiFetch(`/businesses/${encodeURIComponent(id)}/image`, { method: "DELETE" }); }

/* ---------- Reviews ---------- */
function reGetReviews(businessId) { return reApiFetch("/reviews" + reQuery({ businessId })); }
function reCreateReview(data) { return reApiFetch("/reviews", { method: "POST", body: JSON.stringify(data) }); }
function reDeleteReview(id) { return reApiFetch(`/reviews/${encodeURIComponent(id)}`, { method: "DELETE" }); }

/* ---------- Users (admin) ---------- */
function reGetUsers() { return reApiFetch("/users"); }
function reSetUserRole(id, role) { return reApiFetch(`/users/${encodeURIComponent(id)}/role`, { method: "PATCH", body: JSON.stringify({ role }) }); }
function reDeleteUser(id) { return reApiFetch(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }); }

/* ---------- Lookups (small datasets — fetch-then-find is fine at this scale) ---------- */
async function reCountryByCode(code) {
  if (!code) return null;
  const countries = await reGetCountries();
  return countries.find(c => c.code === code) || null;
}
async function reRegionById(id) {
  if (!id) return null;
  const regions = await reGetRegions();
  return regions.find(r => r.id === id) || null;
}
async function reCityById(id) {
  if (!id) return null;
  const cities = await reGetCities();
  return cities.find(c => c.id === id) || null;
}
async function reCategoryByKey(key) {
  const categories = await reGetCategories();
  return categories.find(c => c.key === key) || { key, label: key, icon: "🏢", color: "#12734f" };
}

/* A business stores its city as free text (not a city id), so we match it
   by name against the known cities in its region to find coordinates for
   the map preview. No match (typo, unlisted town, etc.) just means no
   map preview — "Get Directions" still works via a text address search. */
async function reCoordsForBusiness(biz) {
  const typed = (biz.city || "").trim().toLowerCase();
  if (!typed || !biz.regionId) return null;
  const cities = await reGetCities(biz.regionId);
  const match = cities.find(c => c.name.trim().toLowerCase() === typed);
  if (match && typeof match.lat === "number" && typeof match.lng === "number") {
    return { lat: match.lat, lng: match.lng };
  }
  return null;
}

/* Ratings = the business's legacy seed ratings (already on the BusinessDto) + submitted reviews */
/* The API already merges review stars into `business.ratings` (one grouped
   query server-side) — no per-business fetch needed here anymore. Stays
   async so existing `await reGetRatingsFor(...)` call sites don't change. */
async function reGetRatingsFor(business) {
  return business.ratings || [];
}

function reAverage(ratings) {
  if (!ratings.length) return 0;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

/* ---------- Select / datalist population helpers ---------- */
async function rePopulateCountrySelect(select, selectedCode) {
  const countries = [...(await reGetCountries())].sort((a, b) => a.name.localeCompare(b.name));
  select.innerHTML = '<option value="">Select country...</option>' +
    countries.map(c => `<option value="${c.code}">${c.flag} ${reEscape(c.name)}</option>`).join("");
  if (selectedCode) select.value = selectedCode;
}

async function rePopulateRegionSelect(select, countryCode, selectedId) {
  const regions = countryCode ? [...(await reGetRegions(countryCode))].sort((a, b) => a.name.localeCompare(b.name)) : [];
  select.innerHTML = countryCode
    ? '<option value="">Select region/province/state...</option>' +
      regions.map(r => `<option value="${r.id}">${reEscape(r.name)}</option>`).join("")
    : '<option value="">Select a country first...</option>';
  select.disabled = !countryCode;
  if (selectedId) select.value = selectedId;
}

async function rePopulateCityDatalist(datalist, regionId) {
  const cities = regionId ? await reGetCities(regionId) : [];
  datalist.innerHTML = cities.map(c => `<option value="${reEscape(c.name)}"></option>`).join("");
}

/* ---------- Auth / OTP ----------
   Shaped to match what register.js / business-register.js / login.js
   already expect: registration/resend return a "pending" object with
   {id, email, otp}; verify-otp returns either {ok:true, ...AuthResult}
   or {ok:false, reason, attemptsLeft, message}. */
function reApiRegisterUser(data) {
  return reApiFetch("/auth/register/user", { method: "POST", body: JSON.stringify(data) })
    .then(r => ({ id: r.pendingId, email: r.email, otp: r.devCode }));
}

function reApiRegisterBusiness(data) {
  return reApiFetch("/auth/register/business", { method: "POST", body: JSON.stringify(data) })
    .then(r => ({ id: r.pendingId, email: r.email, otp: r.devCode }));
}

async function reApiResendOtp(pendingId) {
  try {
    const r = await reApiFetch("/auth/resend-otp", { method: "POST", body: JSON.stringify({ pendingId }) });
    return { id: r.pendingId, email: r.email, otp: r.devCode };
  } catch {
    return null;
  }
}

function reApiCancelPending(pendingId) {
  return reApiFetch("/auth/cancel-pending", { method: "POST", body: JSON.stringify({ pendingId }) });
}

async function reApiVerifyOtp(pendingId, code) {
  const res = await fetch(RE_API_BASE + "/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pendingId, code })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, reason: body.reason || "incorrect", attemptsLeft: body.attemptsLeft, message: body.message };
  }
  return { ok: true, ...body };
}

function reApiLoginUser(email, password) {
  return reApiFetch("/auth/login/user", { method: "POST", body: JSON.stringify({ email, password }) });
}

function reApiLoginBusiness(email, password) {
  return reApiFetch("/auth/login/business", { method: "POST", body: JSON.stringify({ email, password }) });
}

function reApiMe() {
  return reApiFetch("/auth/me");
}
