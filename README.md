# ⭐ Rate Everything

> **Discover it. Try it. Rate it.**
> A global business rating platform — find and rate the best local businesses anywhere in the world, from a kota spot in Soweto to a barbershop in Brooklyn.

## What is this?

A full-stack app: a static **HTML + CSS + JavaScript** frontend (no build tools/bundler) talking to a real **ASP.NET Core Web API + Postgres (Supabase)** backend (`server/RateEverything.Api`). Users discover businesses, compare star ratings, and rate their own experiences. Businesses register to get listed and discovered. Admins manage the platform's reference data (categories, countries, regions, cities) and moderate content. All of it is now stored in a real, shared database — not per-browser `localStorage` — so two different people on two different devices see the same businesses, ratings and accounts.

## Pages

| Page | File | Purpose |
|------|------|---------|
| Home | `index.html` | Landing page — hero search, categories, live stats, top-rated businesses |
| Explore Businesses | `businesses.html` | Search, filter (category/country), sort, **rate** businesses via the star modal (requires a user login), and open a **Reviews & Map** details view with the full written review list, a star breakdown and a free map + directions link |
| Join as a User | `register.html` | User registration with validation — **requires OTP email verification** before the account is created, then auto-logs you in |
| List Your Business | `business-register.html` | Business registration (with its own password) — also **OTP-verified** before the listing exists; once verified it appears in the directory immediately and auto-logs you into your business dashboard |
| Log In | `login.html` | Tabbed login for **Users** and **Businesses**; also where the demo admin logs in |
| Admin Dashboard | `admin.html` | Admin-only. Manage categories, countries, regions/provinces/states, cities, businesses, users and reviews |
| My Business | `business-dashboard.html` | Business-owner-only. Edit your listing, see your rating average and every review you've received |

## Roles

- **User** — registers via `register.html`, can browse, search and rate businesses.
- **Business** — registers via `business-register.html` with its own login, manages its own listing via `business-dashboard.html`.
- **Admin** — a user account with `role: "admin"`. One is seeded automatically the first time the API runs:
  - Email: `admin@rateeverything.com`
  - Password: `Admin@123`

  Log in via `login.html` (User tab) with those credentials to reach `admin.html`. From there, admins can promote other users to admin.

## Running it

Two things need to be running at once — the API and the static frontend.

**1. The database — Supabase (Postgres):**
1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard: **Project Settings → Database → Connection string → .NET** tab, and copy the connection string. Use the **direct connection** (port `5432`), not the pooled/PgBouncer one (port `6543`) — this app is a long-running server, not serverless functions, and PgBouncer's transaction-pooling mode doesn't support everything EF Core needs at migration time.
3. Set it as a local secret (never commit a real password to `appsettings.json` — the checked-in value is a placeholder):
   ```
   cd server/RateEverything.Api
   dotnet user-secrets set "ConnectionStrings:Default" "Host=db.YOUR_PROJECT_REF.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=YOUR_DB_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
   ```
   (`dotnet user-secrets init` has already been run for this project, so this just works.) For a real deployment, set the equivalent as an environment variable instead: `ConnectionStrings__Default`.

**2. The backend:**
```
cd server/RateEverything.Api
dotnet ef database update   # first time only — creates the tables and applies migrations
dotnet run
```
This seeds the database (categories, countries/regions/cities, ~28 demo businesses, the admin account) the first time it finds the tables empty, and listens on `http://localhost:5080`.

**3. The frontend** — any static file server pointed at the project root, e.g.:
```
npx serve .
```
(or the VS Code **Live Server** extension, or the PowerShell server in `.claude/serve.ps1`) on `http://localhost:5173`. The frontend calls the API at `http://localhost:5080/api` (see `RE_API_BASE` in `js/store.js`) — if you serve the frontend on a different origin, update `Cors:AllowedOrigin` in `server/RateEverything.Api/appsettings.json` to match.

## Architecture

```
RateEverything/
├── index.html, businesses.html, register.html, business-register.html,
│   login.html, admin.html, business-dashboard.html
├── css/styles.css             # Full design system (green + gold, global-neutral)
├── js/
│   ├── store.js                # API client — fetch wrappers, same function names/shapes as before
│   ├── app.js                  # Generic UI helpers: toast, validation, confirm modal, image resize, maps
│   ├── auth.js                 # JWT session management, role guards, shared nav auth slot
│   ├── home.js / businesses.js / register.js / business-register.js
│   ├── login.js
│   ├── admin.js                 # Admin CRUD for every reference-data type
│   └── business-dashboard.js
└── server/RateEverything.Api/  # ASP.NET Core 9 Web API
    ├── Models/                  # Category, Country, Region, City, AppUser, Business, Review, PendingVerification...
    ├── Data/
    │   ├── AppDbContext.cs       # EF Core — Postgres (Npgsql), cascading deletes (country → regions → cities, business → reviews)
    │   ├── AppDbContextFactory.cs # Design-time-only factory so `dotnet ef migrations add` never has to hit a real database
    │   ├── DbInitializer.cs      # Idempotent startup seeding from Data/seed/*.json
    │   └── seed/*.json           # The original seed data (categories, 12 countries, 33 regions, 43 cities w/ lat-lng, 28 businesses)
    ├── Controllers/              # Auth, Categories, Countries, Regions, Cities, Businesses, Reviews, Users
    ├── Services/
    │   ├── PasswordService.cs    # Real server-side password hashing (ASP.NET Identity's PBKDF2 PasswordHasher)
    │   ├── TokenService.cs       # Issues JWT bearer tokens
    │   ├── OtpService.cs         # 6-digit codes, 10-min expiry, 5-attempt lockout, resend
    │   └── ConsoleFileEmailSender.cs  # OTP "email" stub — see below
    └── Migrations/
```

- **Database:** Postgres, hosted on [Supabase](https://supabase.com) (a free-tier project is plenty for this app's scale). Connection string lives in `appsettings.json` as a placeholder — the real one belongs in user-secrets locally or an environment variable in production, never committed. `dotnet ef migrations add <Name>` + `dotnet ef database update` to evolve the schema.
- **Auth is now real:** passwords are hashed server-side (PBKDF2, never sent back to the client, never visible in browser JS), and every protected request carries a JWT bearer token validated by the API. A stale/expired/revoked token is caught by `reRequireRole()` re-checking `GET /api/auth/me` before a guarded page renders.
- **OTP registration flow:** submitting `register.html`/`business-register.html` does **not** create the account — the API hashes the password, stashes the fully-prepared record in a `PendingVerification` row with a 6-digit code, a 10-minute expiry and a 5-attempt limit, and only moves it into the real `Users`/`Businesses` table once the code is verified. **There's no email provider configured**, so — clearly labeled as a stand-in — `ConsoleFileEmailSender` logs the code to the console and `server/RateEverything.Api/otp-outbox.log` instead of emailing it, and the API echoes it back in the response so the frontend's "🔧 Prototype note" UI still shows it on-screen. Swapping in a real provider (SendGrid, Brevo, SMTP, etc.) is a one-file change: implement `IEmailSender` and swap the registration in `Program.cs` — nothing else needs to change.
- **Global data model:** Country → Region/Province/State → City, seeded with 12 countries across Africa, the Americas, Europe, Asia and the Middle East. Admins can add, edit or delete any of these from the dashboard (cascading deletes are enforced by the database now, not manual client-side cleanup).
- **Ratings:** submitted stars are stored as `Review` rows and merged with each business's legacy seed ratings, so averages update live. Rating a business requires being logged in as a **user**; the server derives the reviewer's name from the JWT, not from client input.
- **Business photos:** businesses can upload a real cover photo (registration or their dashboard) instead of the emoji-on-a-gradient placeholder. Images are resized/compressed client-side (canvas, max 900px, JPEG) and stored as a base64 string in the `Businesses.Image` column — fine for a demo, but a real launch should move this to object storage (S3/Cloud Storage) behind a CDN rather than a database column.
- **Reviews & Map details view:** every business card has a "Reviews & Map" button opening a modal with the full written review list, a 5★→1★ breakdown, and a location section — a free OpenStreetMap embed as a visual preview plus a "Get Directions" button. Both map features are **completely free with no subscription or API key**: the preview uses OpenStreetMap's public embed (`openstreetmap.org/export/embed.html`, no signup), and directions use Google's keyless "Maps URLs" deep-link scheme (`google.com/maps/dir/?api=1&destination=...`) — distinct from the billed Maps JavaScript/Places/Directions APIs. Coordinates come from hand-entered `lat`/`lng` on each seeded city, matched against a business's typed city name; admins can add coordinates for any new city from the Cities tab. If a business's city has no match, the map preview is skipped gracefully and "Get Directions" falls back to a plain-text address search.

## Deploying it — Netlify (frontend) + Render (API) + Supabase (database)

**1. Database** — already covered above (Supabase). Do that first; the API won't start without it.

**2. API → Render:**
1. Push this repo to GitHub (Render deploys from a git remote, not a local folder).
2. In the Render dashboard: **New → Blueprint**, connect the repo. Render reads `render.yaml` at the repo root and proposes one service, `rate-everything-api`, built from `server/RateEverything.Api/Dockerfile`.
3. Render will prompt for the env vars marked `sync: false` in `render.yaml`:
   - `ConnectionStrings__Default` — the same Supabase connection string you set locally
   - `Cors__AllowedOrigins` — your Netlify URL once you have it (step 3 below); you can leave this blank for the very first deploy and come back to set it
   - `Jwt__Secret` is auto-generated by Render — no action needed
4. Deploy. Render assigns a URL like `https://rate-everything-api.onrender.com` — copy it.
5. **Free-tier note:** Render's free web services spin down after 15 minutes of inactivity and take ~30-60s to wake back up on the next request — the first request after idle will feel slow, that's expected, not broken.

**3. Frontend → Netlify:**
1. Update `RE_API_BASE` in `js/store.js` with the real Render URL from step 2.4, then push.
2. In the Netlify dashboard: **Add new site → Import from Git**, connect the repo. `netlify.toml` already sets the publish directory (repo root) and there's no build step to configure — leave the build command blank.
3. Netlify assigns a URL like `https://rate-everything.netlify.app` (or attach a custom domain).
4. Go back to Render and set `Cors__AllowedOrigins` to that URL (comma-separate it with `http://localhost:5173` if you still want local dev to keep working against the deployed API) — the API will reject browser requests from any origin not in that list.

## Still dev-only — read before real users sign up

- The API runs on plain HTTP for local dev; Render/Netlify both terminate HTTPS for you automatically once deployed, so this resolves itself on deploy — just don't skip it if you ever self-host instead.
- OTP codes aren't actually emailed (see above) — wire up a real `IEmailSender` before real users register.
- `dotnet user-secrets` and Render's env vars keep real credentials out of git, but nothing here has been through a security review — treat this as a solid starting point, not a production-hardened app.

## Roadmap (when we expand)

- [ ] Real OTP delivery via an email/SMS provider (SendGrid, Twilio, etc.)
- [ ] Move business photos from a database column to real object storage + a CDN
- [x] Move secrets out of `appsettings.json` — done via `dotnet user-secrets` locally and Render env vars in production
- [ ] Business verification via official company-registry lookups (per country)
- [ ] Geolocation — "businesses near me"
- [ ] Pagination / infinite scroll once the directory grows large
- [ ] Cut down the N+1-ish lookup pattern in `js/store.js` (`reCategoryByKey`/`reCountryByCode` re-fetch the full list each call) once payload sizes justify it

---

*Rebuilt with a real ASP.NET Core + Postgres (Supabase) backend, September 2026 — originally a KhethaBiz prototype, rebranded to Rate Everything for global scale.*
