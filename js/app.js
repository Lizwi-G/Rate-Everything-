/* ============================================================
   Rate Everything — Shared App Logic
   Generic UI + crypto/id helpers used across every page.
   Prototype persistence uses localStorage (see store.js) —
   later this layer is swapped for real API calls.
   ============================================================ */

/* ---------- IDs / escaping ---------- */
function reUid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function reEscape(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

/* ---------- Star rendering ---------- */
function reStarsHtml(avg) {
  const rounded = Math.round(avg);
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += i <= rounded ? "★" : '<span class="empty">★</span>';
  }
  return html;
}

/* ---------- Color / gradient ---------- */
function reShadeColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  let r = (num >> 16) + amt;
  let g = (num >> 8 & 0x00ff) + amt;
  let b = (num & 0x0000ff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

function reGradient(hex) {
  return `linear-gradient(135deg, ${hex}, ${reShadeColor(hex, -22)})`;
}

/* ---------- Business photo uploads ----------
   Resizes/compresses in the browser (canvas) before it's stored
   as a base64 data URL in localStorage — keeps a phone photo from
   blowing the ~5-10MB per-origin storage quota. */
function reReadImageAsDataUrl(file, maxDim = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(null); return; }
    if (!file.type.startsWith("image/")) { reject(new Error("Please choose an image file (JPG, PNG, etc.).")); return; }
    if (file.size > 8 * 1024 * 1024) { reject(new Error("That image is too large — please choose one under 8MB.")); return; }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read that image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else { width = Math.round(width * (maxDim / height)); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* Cover art for a business card: the uploaded photo if there is one,
   otherwise the old icon-on-a-gradient fallback. */
const RE_CATEGORY_PHOTOS = {
  restaurants: "images/categories/restaurants.jpg",
  beauty: "images/categories/beauty.jpg",
  automotive: "images/categories/automotive.jpg",
  health: "images/categories/health.jpg",
  tech: "images/categories/tech.jpg",
  retail: "images/categories/retail.jpg",
  home: "images/categories/home.jpg",
  travel: "images/categories/travel.jpg"
};

function reCoverPhotoUrl(biz, catInfo) {
  return biz.image || RE_CATEGORY_PHOTOS[catInfo.key] || RE_CATEGORY_PHOTOS.retail;
}

function reBizCoverHtml(biz, catInfo) {
  const verifiedBadge = biz.verified ? '<span class="verified">✔ VERIFIED</span>' : "";
  return `<div class="biz-cover photo" style="background-image:url('${reCoverPhotoUrl(biz, catInfo)}')">${verifiedBadge}</div>`;
}

/* Small square thumbnail used in tables/dashboards */
function reThumbHtml(biz, catInfo) {
  return `<div class="thumb-cover"><img src="${reCoverPhotoUrl(biz, catInfo)}" alt="" /></div>`;
}

/* ---------- Maps (free, no API key / subscription) ----------
   Map preview: OpenStreetMap's public embed (openstreetmap.org/export/embed.html)
   — no signup, no key, no rate limit for normal embed use.
   Directions: Google Maps "Maps URLs" deep link — also free/keyless,
   distinct from the billed Maps JavaScript/Directions APIs. Works with
   either coordinates or a plain address, and opens the user's native
   maps app on mobile. */
function reMapEmbedUrl(lat, lng, spanDeg = 0.06) {
  const bbox = [lng - spanDeg, lat - spanDeg, lng + spanDeg, lat + spanDeg].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function reDirectionsUrl(biz, coords) {
  if (coords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
  }
  const region = reRegionById(biz.regionId);
  const country = reCountryByCode(biz.countryCode);
  const address = [biz.name, biz.city, region ? region.name : "", country ? country.name : ""]
    .filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

/* ---------- Review list rendering (shared by business dashboard + the public details modal) ---------- */
function reReviewsListHtml(reviews, emptyMessage = "No reviews yet.") {
  if (!reviews.length) return `<p style="color:var(--ink-400);">${reEscape(emptyMessage)}</p>`;
  return reviews.map(r => `
    <div class="review-item">
      <div class="review-top">
        <span class="stars">${reStarsHtml(r.stars)}</span>
        <span class="review-date">${r.date ? new Date(r.date).toLocaleDateString() : ""}</span>
      </div>
      <div style="font-weight:700; color:var(--green-900); font-size:0.88rem;">${reEscape(r.reviewerName || "Anonymous")}</div>
      ${r.comment ? `<div class="review-comment">${reEscape(r.comment)}</div>` : ""}
    </div>`).join("");
}

/* ---------- Star breakdown bars (5★ down to 1★) ---------- */
function reRatingBreakdownHtml(ratings) {
  const counts = [0, 0, 0, 0, 0];
  ratings.forEach(s => { if (s >= 1 && s <= 5) counts[s - 1] += 1; });
  const total = ratings.length || 1;
  return [5, 4, 3, 2, 1].map(star => {
    const count = counts[star - 1];
    const pct = Math.round((count / total) * 100);
    return `
      <div class="rating-bar-row">
        <span class="rating-bar-label">${star}★</span>
        <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%"></div></div>
        <span class="rating-bar-count">${count}</span>
      </div>`;
  }).join("");
}

/* ---------- Toast ---------- */
function reToast(message, emoji = "✅") {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>${emoji}</span><span>${reEscape(message)}</span>`;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3200);
}

/* ---------- Reusable confirm dialog (replaces native confirm()) ---------- */
function reConfirm(message, { title = "Are you sure?", confirmLabel = "Confirm", danger = true } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay open";
    overlay.innerHTML = `
      <div class="modal modal-confirm">
        <h3>${reEscape(title)}</h3>
        <p class="modal-sub">${reEscape(message)}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-cancel" data-act="cancel">Cancel</button>
          <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="confirm">${reEscape(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    function close(result) {
      overlay.remove();
      resolve(result);
    }
    overlay.addEventListener("click", e => {
      if (e.target === overlay) close(false);
      const act = e.target.closest("[data-act]");
      if (act) close(act.dataset.act === "confirm");
    });
  });
}

/* ---------- Simple form validation ---------- */
function reValidateForm(form) {
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
function reLiveValidation(form) {
  form.querySelectorAll("input, select, textarea").forEach(input => {
    input.addEventListener("input", () => {
      input.classList.remove("invalid");
      const group = input.closest(".form-group");
      const errorMsg = group ? group.querySelector(".error-msg") : null;
      if (errorMsg) errorMsg.classList.remove("show");
    });
  });
}

/* ---------- Skeleton loading states ----------
   Shown immediately while an async fetch is in flight, so a page
   never sits on a blank grid waiting on the network. */
function reSkeletonCards(n = 6) {
  return Array.from({ length: n }, () => `
    <div class="skel-card">
      <div class="skel skel-cover"></div>
      <div class="skel-body">
        <div class="skel skel-line w-80"></div>
        <div class="skel skel-line w-40"></div>
        <div class="skel skel-line w-60"></div>
        <div class="skel skel-line w-40" style="margin-top:.4rem;"></div>
      </div>
    </div>`).join("");
}

function reSkeletonTiles(n = 8) {
  return Array.from({ length: n }, () => `<div class="skel skel-tile"></div>`).join("");
}

function reSkeletonRows(colCount, rowCount = 4) {
  const cells = Array.from({ length: colCount }, () => `<td class="skel-row"><div class="skel skel-line w-80"></div></td>`).join("");
  return Array.from({ length: rowCount }, () => `<tr>${cells}</tr>`).join("");
}

/* Staggered fade/rise-in for a freshly-rendered grid of cards */
function reReveal(container, selector) {
  const items = selector ? container.querySelectorAll(selector) : container.children;
  Array.from(items).forEach((el, i) => {
    el.classList.add("reveal");
    el.style.setProperty("--reveal-i", i);
  });
}
