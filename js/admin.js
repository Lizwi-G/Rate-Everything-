/* ============================================================
   Rate Everything — Admin Dashboard
   Full CRUD over categories, countries, regions, cities, plus
   moderation of businesses / users / reviews. Guarded by
   reRequireRole('user', 'admin'). Talks to the real API — slugging,
   uniqueness checks and cascades (deleting a country removes its
   regions/cities, deleting a business removes its reviews) all
   happen server-side now.
   ============================================================ */

(async function () {
  const ok = await reRequireRole("user", "admin");
  if (!ok) return;

  document.getElementById("adminShell").style.display = "grid";

  /* Skeleton rows while the first round of admin fetches is in flight */
  [["categoriesTable", 6], ["countriesTable", 6], ["regionsTable", 4], ["citiesTable", 5],
   ["businessesTable", 7], ["usersTable", 6], ["reviewsTable", 6]].forEach(([id, cols]) => {
    document.getElementById(id).innerHTML = `<tbody>${reSkeletonRows(cols, 4)}</tbody>`;
  });

  /* ---------- Sidebar ---------- */
  const navItems = document.querySelectorAll(".admin-nav-item");
  navItems.forEach(btn => {
    btn.addEventListener("click", () => {
      navItems.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
      document.getElementById("panel-" + btn.dataset.panel).classList.add("active");
    });
  });

  const val = id => document.getElementById(id).value.trim();
  const tableHead = cols => `<thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead>`;
  const emptyRow = colspan => `<tr><td colspan="${colspan}" class="table-empty">No records yet.</td></tr>`;

  /* ============================================================
     Overview
     ============================================================ */
  async function renderOverview() {
    const [businesses, users, reviews, countries] = await Promise.all([
      reGetBusinesses(), reGetUsers(), reGetReviews(), reGetCountries()
    ]);
    const verifiedCount = businesses.filter(b => b.verified).length;
    const ratingsPerBiz = await Promise.all(businesses.map(b => reGetRatingsFor(b)));
    const allRatings = ratingsPerBiz.flat();
    const avg = reAverage(allRatings);

    const cards = [
      ["🏪", businesses.length, "Businesses"],
      ["✔", verifiedCount, "Verified Businesses"],
      ["👥", users.length, "Users"],
      ["⭐", reviews.length, "Reviews Submitted"],
      ["🌍", countries.length, "Countries"],
      ["📈", allRatings.length ? avg.toFixed(1) : "—", "Overall Avg Rating"]
    ];

    document.getElementById("overviewStats").innerHTML = cards.map(([icon, num, lbl]) => `
      <div class="stat-card">
        <div class="num">${icon} ${num}</div>
        <div class="lbl">${lbl}</div>
      </div>`).join("");
  }

  /* ============================================================
     Categories
     ============================================================ */
  async function renderCategories() {
    const [cats, businesses] = await Promise.all([reGetCategories(), reGetBusinesses()]);
    const rows = cats.map(c => {
      const count = businesses.filter(b => b.category === c.key).length;
      return `<tr>
        <td style="font-size:1.3rem;">${c.icon}</td>
        <td>${reEscape(c.label)}</td>
        <td><code>${reEscape(c.key)}</code></td>
        <td><span class="swatch" style="background:${c.color}"></span></td>
        <td>${count}</td>
        <td class="row-actions">
          <button type="button" class="icon-btn" data-edit="category" data-id="${c.key}">Edit</button>
          <button type="button" class="icon-btn danger" data-delete="category" data-id="${c.key}">Delete</button>
        </td>
      </tr>`;
    }).join("");
    document.getElementById("categoriesTable").innerHTML =
      tableHead(["Icon", "Label", "Key", "Color", "Businesses", ""]) + `<tbody>${rows || emptyRow(6)}</tbody>`;
  }

  async function renderCategoryFields(id) {
    const cat = id ? (await reGetCategories()).find(c => c.key === id) : null;
    modalBody.innerHTML = `
      <div class="form-group full">
        <label>Icon (emoji) <span class="req">*</span></label>
        <input id="f_icon" maxlength="6" value="${reEscape(cat ? cat.icon : "")}" required />
      </div>
      <div class="form-group full">
        <label>Label <span class="req">*</span></label>
        <input id="f_label" value="${reEscape(cat ? cat.label : "")}" required />
      </div>
      <div class="form-group full">
        <label>Card Color</label>
        <div class="color-field-row">
          <input type="color" id="f_color" value="${cat ? cat.color : "#12734f"}" />
          <span class="hint">Used to generate the category card gradient.</span>
        </div>
      </div>
      ${cat ? `<div class="form-group full"><span class="hint">Key: <code>${reEscape(cat.key)}</code> (fixed after creation)</span></div>` : ""}`;
  }

  async function saveCategory(id) {
    const icon = val("f_icon");
    const label = val("f_label");
    const color = document.getElementById("f_color").value;
    const payload = { icon, label, color };
    if (id) await reUpdateCategory(id, payload);
    else await reCreateCategory(payload);
  }

  async function deleteCategory(id) { await reDeleteCategory(id); }

  /* ============================================================
     Countries
     ============================================================ */
  async function renderCountries() {
    const [countriesRaw, regions, businesses] = await Promise.all([reGetCountries(), reGetRegions(), reGetBusinesses()]);
    const countries = [...countriesRaw].sort((a, b) => a.name.localeCompare(b.name));
    const rows = countries.map(c => {
      const regionCount = regions.filter(r => r.countryCode === c.code).length;
      const bizCount = businesses.filter(b => b.countryCode === c.code).length;
      return `<tr>
        <td style="font-size:1.3rem;">${c.flag}</td>
        <td>${reEscape(c.name)}</td>
        <td><code>${reEscape(c.code)}</code></td>
        <td>${regionCount}</td>
        <td>${bizCount}</td>
        <td class="row-actions">
          <button type="button" class="icon-btn" data-edit="country" data-id="${c.code}">Edit</button>
          <button type="button" class="icon-btn danger" data-delete="country" data-id="${c.code}">Delete</button>
        </td>
      </tr>`;
    }).join("");
    document.getElementById("countriesTable").innerHTML =
      tableHead(["Flag", "Name", "Code", "Regions", "Businesses", ""]) + `<tbody>${rows || emptyRow(6)}</tbody>`;
  }

  async function renderCountryFields(id) {
    const country = id ? await reCountryByCode(id) : null;
    modalBody.innerHTML = `
      <div class="form-group full">
        <label>Flag (emoji) <span class="req">*</span></label>
        <input id="f_flag" maxlength="6" value="${reEscape(country ? country.flag : "")}" required />
      </div>
      <div class="form-group full">
        <label>Country Name <span class="req">*</span></label>
        <input id="f_name" value="${reEscape(country ? country.name : "")}" required />
      </div>
      <div class="form-group full">
        <label>ISO Code <span class="req">*</span></label>
        <input id="f_code" maxlength="3" style="text-transform:uppercase;" value="${reEscape(country ? country.code : "")}" ${country ? "readonly" : ""} required />
        <span class="hint">${country ? "Locked after creation (used by regions/cities)." : "e.g. US, GB, ZA"}</span>
      </div>`;
  }

  async function saveCountry(id) {
    const flag = val("f_flag");
    const name = val("f_name");
    const code = val("f_code").toUpperCase();
    if (id) await reUpdateCountry(id, { flag, name });
    else await reCreateCountry({ flag, name, code });
  }

  async function deleteCountry(code) { await reDeleteCountry(code); } // server cascades regions -> cities

  /* ============================================================
     Regions
     ============================================================ */
  async function renderRegions() {
    const [regionsRaw, cities] = await Promise.all([reGetRegions(), reGetCities()]);
    const regions = [...regionsRaw].sort((a, b) => a.name.localeCompare(b.name));
    const rows = await Promise.all(regions.map(async r => {
      const country = await reCountryByCode(r.countryCode);
      const cityCount = cities.filter(c => c.regionId === r.id).length;
      return `<tr>
        <td>${reEscape(r.name)}</td>
        <td>${country ? `${country.flag} ${reEscape(country.name)}` : "—"}</td>
        <td>${cityCount}</td>
        <td class="row-actions">
          <button type="button" class="icon-btn" data-edit="region" data-id="${r.id}">Edit</button>
          <button type="button" class="icon-btn danger" data-delete="region" data-id="${r.id}">Delete</button>
        </td>
      </tr>`;
    }));
    document.getElementById("regionsTable").innerHTML =
      tableHead(["Name", "Country", "Cities", ""]) + `<tbody>${rows.join("") || emptyRow(4)}</tbody>`;
  }

  async function renderRegionFields(id) {
    const region = id ? await reRegionById(id) : null;
    modalBody.innerHTML = `
      <div class="form-group full">
        <label>Name <span class="req">*</span></label>
        <input id="f_name" value="${reEscape(region ? region.name : "")}" required />
      </div>
      <div class="form-group full">
        <label>Country <span class="req">*</span></label>
        <select id="f_country" required></select>
      </div>`;
    await rePopulateCountrySelect(document.getElementById("f_country"), region ? region.countryCode : "");
  }

  async function saveRegion(id) {
    const name = val("f_name");
    const countryCode = val("f_country");
    const payload = { name, countryCode };
    if (id) await reUpdateRegion(id, payload);
    else await reCreateRegion(payload);
  }

  async function deleteRegion(id) { await reDeleteRegion(id); } // server cascades cities

  /* ============================================================
     Cities
     ============================================================ */
  async function renderCities() {
    const citiesRaw = await reGetCities();
    const cities = [...citiesRaw].sort((a, b) => a.name.localeCompare(b.name));
    const rows = await Promise.all(cities.map(async c => {
      const [region, country] = await Promise.all([reRegionById(c.regionId), reCountryByCode(c.countryCode)]);
      return `<tr>
        <td>${reEscape(c.name)}</td>
        <td>${region ? reEscape(region.name) : "—"}</td>
        <td>${country ? `${country.flag} ${reEscape(country.name)}` : "—"}</td>
        <td>${typeof c.lat === "number" && typeof c.lng === "number" ? "📍 Yes" : "—"}</td>
        <td class="row-actions">
          <button type="button" class="icon-btn" data-edit="city" data-id="${c.id}">Edit</button>
          <button type="button" class="icon-btn danger" data-delete="city" data-id="${c.id}">Delete</button>
        </td>
      </tr>`;
    }));
    document.getElementById("citiesTable").innerHTML =
      tableHead(["Name", "Region", "Country", "Map Coords", ""]) + `<tbody>${rows.join("") || emptyRow(5)}</tbody>`;
  }

  async function renderCityFields(id) {
    const city = id ? await reCityById(id) : null;
    modalBody.innerHTML = `
      <div class="form-group full">
        <label>Name <span class="req">*</span></label>
        <input id="f_name" value="${reEscape(city ? city.name : "")}" required />
      </div>
      <div class="form-group full">
        <label>Country <span class="req">*</span></label>
        <select id="f_country" required></select>
      </div>
      <div class="form-group full">
        <label>Region <span class="req">*</span></label>
        <select id="f_region" required></select>
      </div>
      <div class="form-group">
        <label>Latitude</label>
        <input id="f_lat" type="number" step="any" min="-90" max="90" value="${city && typeof city.lat === "number" ? city.lat : ""}" placeholder="e.g. 51.5074" />
      </div>
      <div class="form-group">
        <label>Longitude</label>
        <input id="f_lng" type="number" step="any" min="-180" max="180" value="${city && typeof city.lng === "number" ? city.lng : ""}" placeholder="e.g. -0.1278" />
      </div>
      <div class="form-group full">
        <span class="hint">Optional — powers the free map preview on business listings. Look the city up on <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">openstreetmap.org</a> or Google Maps and paste the coordinates here (no account or API key needed).</span>
      </div>`;
    const countryCode = city ? city.countryCode : "";
    await rePopulateCountrySelect(document.getElementById("f_country"), countryCode);
    await rePopulateRegionSelect(document.getElementById("f_region"), countryCode, city ? city.regionId : "");
    document.getElementById("f_country").addEventListener("change", async e => {
      await rePopulateRegionSelect(document.getElementById("f_region"), e.target.value);
    });
  }

  async function saveCity(id) {
    const name = val("f_name");
    const regionId = val("f_region");
    const latRaw = val("f_lat");
    const lngRaw = val("f_lng");
    if ((latRaw && !lngRaw) || (!latRaw && lngRaw)) throw new Error("Please provide both latitude and longitude, or leave both blank.");
    const lat = latRaw ? Number(latRaw) : null;
    const lng = lngRaw ? Number(lngRaw) : null;
    if (latRaw && (Number.isNaN(lat) || lat < -90 || lat > 90)) throw new Error("Latitude must be a number between -90 and 90.");
    if (lngRaw && (Number.isNaN(lng) || lng < -180 || lng > 180)) throw new Error("Longitude must be a number between -180 and 180.");

    const payload = { name, regionId, lat, lng };
    if (id) await reUpdateCity(id, payload);
    else await reCreateCity(payload);
  }

  async function deleteCity(id) { await reDeleteCity(id); }

  /* ============================================================
     Businesses
     ============================================================ */
  async function renderBusinesses() {
    const [businessesRaw, categories, countries] = await Promise.all([reGetBusinesses(), reGetCategories(), reGetCountries()]);
    const catMap = new Map(categories.map(c => [c.key, c]));
    const countryMap = new Map(countries.map(c => [c.code, c]));
    const businesses = [...businessesRaw].sort((a, b) => a.name.localeCompare(b.name));

    const rows = await Promise.all(businesses.map(async b => {
      const cat = catMap.get(b.category) || { icon: "🏢", label: b.category, color: "#12734f" };
      const country = countryMap.get(b.countryCode);
      const ratings = await reGetRatingsFor(b);
      const avg = reAverage(ratings);
      return `<tr>
        <td>${reThumbHtml(b, cat)}</td>
        <td>${reEscape(b.name)}</td>
        <td>${cat.icon} ${reEscape(cat.label)}</td>
        <td>${reEscape(b.city)}${country ? ` ${country.flag}` : ""}</td>
        <td>${ratings.length ? `${avg.toFixed(1)} ★ (${ratings.length})` : "New"}</td>
        <td>
          <label class="checkbox-row" style="margin:0;">
            <input type="checkbox" data-toggle-verified="${b.id}" ${b.verified ? "checked" : ""} />
            <span>${b.verified ? "Verified" : "Unverified"}</span>
          </label>
        </td>
        <td class="row-actions">
          <button type="button" class="icon-btn" data-edit="business" data-id="${b.id}">Edit</button>
          ${b.image ? `<button type="button" class="icon-btn danger" data-remove-image="${b.id}">Remove Photo</button>` : ""}
          <button type="button" class="icon-btn danger" data-delete="business" data-id="${b.id}">Delete</button>
        </td>
      </tr>`;
    }));
    document.getElementById("businessesTable").innerHTML =
      tableHead(["Photo", "Business", "Category", "Location", "Rating", "Status", ""]) + `<tbody>${rows.join("") || emptyRow(7)}</tbody>`;
  }

  async function renderBusinessFields(id) {
    const biz = await reGetBusiness(id);
    modalBody.innerHTML = `
      <div class="form-group full">
        <label>Name <span class="req">*</span></label>
        <input id="f_name" value="${reEscape(biz.name)}" required />
      </div>
      <div class="form-group full">
        <label>Category <span class="req">*</span></label>
        <select id="f_category" required></select>
      </div>
      <div class="form-group full">
        <label>Description <span class="req">*</span></label>
        <textarea id="f_description" required>${reEscape(biz.description)}</textarea>
      </div>
      <div class="form-group full">
        <div class="checkbox-row">
          <input type="checkbox" id="f_verified" ${biz.verified ? "checked" : ""} />
          <label for="f_verified">Verified business</label>
        </div>
      </div>`;
    const catSelect = document.getElementById("f_category");
    catSelect.innerHTML = (await reGetCategories()).map(c => `<option value="${c.key}">${c.icon} ${reEscape(c.label)}</option>`).join("");
    catSelect.value = biz.category;
  }

  async function saveBusiness(id) {
    const payload = {
      name: val("f_name"),
      category: val("f_category"),
      description: val("f_description"),
      verified: document.getElementById("f_verified").checked
    };
    await reAdminUpdateBusiness(id, payload);
  }

  async function deleteBusiness(id) { await reDeleteBusiness(id); } // server cascades reviews/services/ratings

  async function toggleVerified(id, verified) { await reSetBusinessVerified(id, verified); }

  async function removeBusinessImage(id) { await reRemoveBusinessImage(id); }

  /* ============================================================
     Users
     ============================================================ */
  async function renderUsers() {
    const me = reGetSession();
    const [usersRaw, countries] = await Promise.all([reGetUsers(), reGetCountries()]);
    const countryMap = new Map(countries.map(c => [c.code, c]));
    const users = [...usersRaw].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const rows = users.map(u => {
      const country = countryMap.get(u.countryCode);
      const isMe = me && me.kind === "user" && u.id === me.id;
      return `<tr>
        <td>${reEscape(u.firstName)} ${reEscape(u.lastName)}${isMe ? " <em>(you)</em>" : ""}</td>
        <td>${reEscape(u.email)}</td>
        <td><span class="badge ${u.role === "admin" ? "badge-admin" : "badge-user"}">${u.role}</span></td>
        <td>${country ? `${country.flag} ${reEscape(country.name)}` : "—"}</td>
        <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
        <td class="row-actions">
          ${isMe ? "" : u.role === "admin"
            ? `<button type="button" class="icon-btn" data-demote="${u.id}">Demote</button>`
            : `<button type="button" class="icon-btn" data-promote="${u.id}">Make Admin</button>`}
          ${isMe ? "" : `<button type="button" class="icon-btn danger" data-delete="user" data-id="${u.id}">Delete</button>`}
        </td>
      </tr>`;
    }).join("");
    document.getElementById("usersTable").innerHTML =
      tableHead(["Name", "Email", "Role", "Country", "Joined", ""]) + `<tbody>${rows || emptyRow(6)}</tbody>`;
  }

  async function setUserRole(id, role) { await reSetUserRole(id, role); }
  async function deleteUser(id) { await reDeleteUser(id); }

  /* ============================================================
     Reviews
     ============================================================ */
  async function renderReviews() {
    const [reviewsRaw, businesses] = await Promise.all([reGetReviews(), reGetBusinesses()]);
    const bizMap = new Map(businesses.map(b => [b.id, b]));
    const reviews = [...reviewsRaw].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const rows = reviews.map(r => {
      const biz = bizMap.get(r.businessId);
      const comment = r.comment ? (r.comment.length > 60 ? r.comment.slice(0, 60) + "…" : r.comment) : "—";
      return `<tr>
        <td>${biz ? reEscape(biz.name) : "(deleted business)"}</td>
        <td>${"★".repeat(r.stars)}<span style="color:#d8e0dc;">${"★".repeat(5 - r.stars)}</span></td>
        <td>${reEscape(comment)}</td>
        <td>${reEscape(r.reviewerName || "Anonymous")}</td>
        <td>${r.date ? new Date(r.date).toLocaleDateString() : "—"}</td>
        <td class="row-actions">
          <button type="button" class="icon-btn danger" data-delete="review" data-id="${r.id}">Delete</button>
        </td>
      </tr>`;
    }).join("");
    document.getElementById("reviewsTable").innerHTML =
      tableHead(["Business", "Stars", "Comment", "Reviewer", "Date", ""]) + `<tbody>${rows || emptyRow(6)}</tbody>`;
  }

  async function deleteReview(id) { await reDeleteReview(id); }

  /* ============================================================
     Modal wiring
     ============================================================ */
  const modal = document.getElementById("adminModal");
  const modalTitle = document.getElementById("adminModalTitle");
  const modalBody = document.getElementById("adminModalBody");
  const modalForm = document.getElementById("adminModalForm");
  let modalCtx = null;

  const ENTITY = {
    category: { label: "Category", render: renderCategoryFields, save: saveCategory },
    country:  { label: "Country",  render: renderCountryFields,  save: saveCountry },
    region:   { label: "Region",   render: renderRegionFields,   save: saveRegion },
    city:     { label: "City",     render: renderCityFields,     save: saveCity },
    business: { label: "Business", render: renderBusinessFields, save: saveBusiness }
  };

  async function openModal(type, id) {
    modalCtx = { type, id };
    modalTitle.textContent = (id ? "Edit " : "Add ") + ENTITY[type].label;
    await ENTITY[type].render(id);
    modal.classList.add("open");
  }

  function closeModal() {
    modal.classList.remove("open");
    modalCtx = null;
  }

  document.getElementById("adminModalCancel").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

  modalForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (!modalCtx) return;
    try {
      await ENTITY[modalCtx.type].save(modalCtx.id);
    } catch (err) {
      reToast(err.message, "⚠️");
      return;
    }
    closeModal();
    await renderAll();
    reToast("Saved successfully!", "✅");
  });

  /* "+ Add X" buttons */
  document.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => openModal(btn.dataset.add, null));
  });

  /* ---------- Delegated table actions ---------- */
  document.querySelector(".admin-content").addEventListener("click", async e => {
    const editBtn = e.target.closest("[data-edit]");
    if (editBtn) { await openModal(editBtn.dataset.edit, editBtn.dataset.id); return; }

    const delBtn = e.target.closest("[data-delete]");
    if (delBtn) {
      const type = delBtn.dataset.delete;
      const id = delBtn.dataset.id;
      const messages = {
        category: "Delete this category? Businesses using it will fall back to a generic icon.",
        country: "Delete this country? Its regions and cities will be deleted too.",
        region: "Delete this region? Its cities will be deleted too.",
        city: "Delete this city?",
        business: "Delete this business? Its reviews will be deleted too.",
        user: "Delete this user account?",
        review: "Delete this review?"
      };
      const confirmed = await reConfirm(messages[type] || "Are you sure?", { title: "Delete", confirmLabel: "Delete" });
      if (!confirmed) return;
      try {
        await ({ category: deleteCategory, country: deleteCountry, region: deleteRegion,
           city: deleteCity, business: deleteBusiness, user: deleteUser, review: deleteReview
        })[type](id);
      } catch (err) {
        reToast(err.message, "⚠️");
        return;
      }
      await renderAll();
      reToast("Deleted.", "🗑️");
      return;
    }

    const removeImgBtn = e.target.closest("[data-remove-image]");
    if (removeImgBtn) {
      const confirmed = await reConfirm("Remove this business's photo? It will fall back to a generic icon.", { title: "Remove photo", confirmLabel: "Remove" });
      if (!confirmed) return;
      await removeBusinessImage(removeImgBtn.dataset.removeImage);
      await renderBusinesses();
      reToast("Photo removed.", "🗑️");
      return;
    }

    const promoteBtn = e.target.closest("[data-promote]");
    if (promoteBtn) {
      await setUserRole(promoteBtn.dataset.promote, "admin");
      await renderAll();
      reToast("User promoted to admin.", "👑");
      return;
    }

    const demoteBtn = e.target.closest("[data-demote]");
    if (demoteBtn) {
      const confirmed = await reConfirm("Remove admin access from this user?", { title: "Demote admin", confirmLabel: "Demote" });
      if (!confirmed) return;
      await setUserRole(demoteBtn.dataset.demote, "user");
      await renderAll();
      reToast("Admin access removed.", "✅");
    }
  });

  document.querySelector(".admin-content").addEventListener("change", async e => {
    const toggle = e.target.closest("[data-toggle-verified]");
    if (toggle) {
      await toggleVerified(toggle.dataset.toggleVerified, toggle.checked);
      await renderBusinesses();
      await renderOverview();
      reToast(toggle.checked ? "Marked as verified." : "Marked as unverified.", "✅");
    }
  });

  /* ---------- Initial render ---------- */
  async function renderAll() {
    await Promise.all([
      renderOverview(), renderCategories(), renderCountries(),
      renderRegions(), renderCities(), renderBusinesses(), renderUsers(), renderReviews()
    ]);
  }

  await renderAll();
})();
