/* ============================================================
   KhethaBiz — Shared App Logic
   Prototype persistence uses localStorage. Later this is
   swapped for real API calls without changing the pages much.
   ============================================================ */

const KB_KEYS = {
  users: "khethabiz.users",
  businesses: "khethabiz.businesses",
  reviews: "khethabiz.reviews"
};

/* ---------- Storage helpers ---------- */
function kbLoad(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function kbSave(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* All businesses = seed data + user-registered ones */
function kbGetAllBusinesses() {
  return [...KB_SEED_BUSINESSES, ...kbLoad(KB_KEYS.businesses)];
}

/* Ratings submitted in the app are stored separately and merged in */
function kbGetRatingsFor(business) {
  const extra = kbLoad(KB_KEYS.reviews)
    .filter(r => r.businessId === business.id)
    .map(r => r.stars);
  return [...(business.ratings || []), ...extra];
}

function kbAverage(ratings) {
  if (!ratings.length) return 0;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

function kbCategory(key) {
  return KB_CATEGORIES.find(c => c.key === key) || {
    key, label: key, icon: "🏢", gradient: "linear-gradient(135deg,#0e5c40,#17915f)"
  };
}

/* ---------- Star rendering ---------- */
function kbStarsHtml(avg) {
  const rounded = Math.round(avg);
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += i <= rounded ? "★" : '<span class="empty">★</span>';
  }
  return html;
}

/* ---------- Toast ---------- */
function kbToast(message, emoji = "✅") {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>${emoji}</span><span>${message}</span>`;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3200);
}

/* ---------- Simple form validation ---------- */
function kbValidateForm(form) {
  let valid = true;
  form.querySelectorAll("[required]").forEach(input => {
    const group = input.closest(".form-group");
    const errorMsg = group ? group.querySelector(".error-msg") : null;
    let fieldOk = input.value.trim() !== "";

    if (fieldOk && input.type === "email") {
      fieldOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    }
    if (fieldOk && input.dataset.match) {
      const other = form.querySelector(input.dataset.match);
      fieldOk = other && input.value === other.value;
    }
    if (fieldOk && input.type === "checkbox") {
      fieldOk = input.checked;
    }
    if (fieldOk && input.minLength > 0) {
      fieldOk = input.value.length >= input.minLength;
    }

    input.classList.toggle("invalid", !fieldOk);
    if (errorMsg) errorMsg.classList.toggle("show", !fieldOk);
    if (!fieldOk) valid = false;
  });
  return valid;
}

/* Clear invalid state as the user types */
function kbLiveValidation(form) {
  form.querySelectorAll("input, select, textarea").forEach(input => {
    input.addEventListener("input", () => {
      input.classList.remove("invalid");
      const group = input.closest(".form-group");
      const errorMsg = group ? group.querySelector(".error-msg") : null;
      if (errorMsg) errorMsg.classList.remove("show");
    });
  });
}

function kbUid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function kbEscape(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}
