# ⭐ KhethaBiz

> **Choose better. Rate smarter.**
> *Khetha* means "choose" in isiZulu / isiXhosa — KhethaBiz helps South Africans choose the best local businesses based on real community ratings.

## What is this?

A front-end prototype (pure **HTML + CSS + JavaScript**, no build tools required) for a South African business rating platform. Users discover businesses, compare star ratings, and rate their own experiences. Businesses register to get listed and discovered.

## Pages

| Page | File | Purpose |
|------|------|---------|
| Home | `index.html` | Landing page — hero search, categories, live stats, top-rated businesses |
| Explore Businesses | `businesses.html` | Search, filter (category/province), sort, and **rate** businesses via the star modal |
| Join as a User | `register.html` | User registration with validation |
| List Your Business | `business-register.html` | Business registration — new listings appear in the directory immediately |

## Running it

No install needed. Either:

1. **Double-click `index.html`** — it runs straight in your browser, or
2. In VS Code, install the **Live Server** extension → right-click `index.html` → *Open with Live Server*.

## How it works (prototype architecture)

```
KhethaBiz/
├── index.html               # Landing page
├── businesses.html          # Directory: search / filter / rate
├── register.html            # User registration
├── business-register.html   # Business registration
├── css/
│   └── styles.css           # Full design system (SA green + gold palette)
└── js/
    ├── data.js              # Seed data: 18 sample SA businesses, categories, provinces
    └── app.js               # Shared logic: storage, ratings, validation, toasts
```

- **Persistence:** `localStorage` for now — registered users, businesses, and submitted ratings survive page reloads on your machine.
- **Seed data:** 18 realistic South African businesses across 8 categories and all 9 provinces, so the directory feels alive from the first open.
- **Ratings:** submitted stars are stored separately and merged with each business's seed ratings, so averages update live.

## Roadmap (when we expand)

- [ ] Real backend API + database (swap the `kbLoad`/`kbSave` helpers in `js/app.js`)
- [ ] Proper authentication (passwords are **not** stored in this prototype)
- [ ] Photo uploads for business listings
- [ ] Written reviews displayed on a business detail page
- [ ] Business verification via CIPC registration lookup
- [ ] Geolocation — "businesses near me"

---

*Prototype built July 2026.*
