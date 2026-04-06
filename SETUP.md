# RateLand — Setup Instructions

## 1. Prerequisites

| Tool    | Version  | Install                          |
|---------|----------|----------------------------------|
| Node.js | ≥ 18 LTS | https://nodejs.org/              |
| npm     | ≥ 9      | Bundled with Node.js             |
| Git     | any      | https://git-scm.com/             |

---

## 2. Create a Supabase Project

1. Go to **https://supabase.com** and sign in (free tier is fine).
2. Click **New Project**.
3. Choose an organization, name the project (e.g. `rateland`), set a database password, pick a region.
4. Wait for provisioning (~1 min).
5. Go to **Settings → API** and copy:
   - **Project URL** → this is `VITE_SUPABASE_URL`
   - **anon / public key** → this is `VITE_SUPABASE_ANON_KEY`

> **Security:** Never use the `service_role` key in frontend code.

---

## 3. Create Database Tables & RLS Policies

1. In the Supabase dashboard go to **SQL Editor → New Query**.
2. Paste the entire contents of `supabase/migrations/001_create_tables.sql`.
3. Click **Run**.

This creates:
- `profiles` table (auto‑populated on sign‑up via trigger)
- `city_searches` table
- Row‑Level Security policies (users can only see/insert their own data)

---

## 4. Enable Auth Providers

1. Go to **Authentication → Providers**.
2. Ensure **Email** is enabled (it is by default).
3. Magic‑link login works automatically when email is enabled.
4. (Optional) Under **Authentication → URL Configuration**, set your **Site URL** to `http://localhost:5173` during development.

---

## 5. Get Free API Keys

| API                       | Sign‑up URL                                         |
|---------------------------|------------------------------------------------------|
| U.S. Census               | https://api.census.gov/data/key_signup.html          |
| FBI Crime Data Explorer   | https://api.usa.gov/signup                           |
| HUD Fair Market Rent      | https://www.huduser.gov/hudapi/public/register       |

All three are free, public‑domain / government APIs.
Keys are stored as **Supabase Secrets** (server‑side only) — see § 5b below.

---

## 6. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> **Note:** Census, FBI, and HUD API keys are no longer stored in `.env`.
> They are configured as Supabase Secrets (see § 5b below).

---

## 5b. Deploy the Edge Function (API Proxy)

API keys are proxied through a Supabase Edge Function so they never appear in
the browser. You need the [Supabase CLI](https://supabase.com/docs/guides/cli).

### Install the Supabase CLI

```bash
npm install -g supabase
```

### Set API keys as Supabase Secrets

```bash
supabase secrets set CENSUS_API_KEY=your_census_key
supabase secrets set FBI_API_KEY=your_fbi_key
supabase secrets set HUD_API_KEY=your_hud_key
```

### Deploy the Edge Function

```bash
supabase functions deploy api-proxy --no-verify-jwt
```

The `--no-verify-jwt` flag is needed because the function validates requests
via the Supabase client library (which includes the anon key), not via raw JWT
verification.

### Verify

```bash
curl -X POST https://xxxx.supabase.co/functions/v1/api-proxy \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"service":"census","params":{"variables":"B01003_001E"}}'
```

---

## 7. Install Dependencies & Run Locally

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 8. Deploy to Cloudflare Pages

Cloudflare Pages is free (even for private repos), includes a global CDN, built‑in
SPA routing, and HTTPS with custom domains at no cost.

### Option A — Cloudflare Dashboard (recommended first time)

1. Push this repo to **GitHub** (public or private).
2. Go to **https://dash.cloudflare.com** → sign up / sign in (free).
3. Navigate to **Workers & Pages → Create → Pages → Connect to Git**.
4. Select your GitHub account and the **RateLand** repository.
5. Configure the build:

   | Setting          | Value           |
   |------------------|-----------------|
   | **Framework**    | None            |
   | **Build command**| `npm run build` |
   | **Output dir**   | `dist`          |

6. Click **Save and Deploy**. The first build takes ~1 min.

### Option B — Wrangler CLI

```bash
npm i -g wrangler
wrangler login
wrangler pages project create rateland
npm run build
wrangler pages deploy dist --project-name rateland
```

### Environment Variables on Cloudflare

In the Cloudflare dashboard → **Workers & Pages → rateland → Settings →
Environment Variables**, add:

| Key                       | Value                    |
|---------------------------|--------------------------|
| `VITE_SUPABASE_URL`       | your Supabase URL        |
| `VITE_SUPABASE_ANON_KEY`  | your anon key            |

> API keys (Census, FBI, HUD) are stored as Supabase Secrets and are **not**
> needed in Cloudflare environment variables.

> **Important:** Cloudflare injects env vars at **build time** for Vite (`VITE_`
> prefix). After adding or changing variables, trigger a new deployment.

### Custom Domain (optional)

1. In the Cloudflare Pages project → **Custom domains → Set up a domain**.
2. Enter your domain (e.g. `rateland.com`).
3. If the domain uses Cloudflare DNS, records are added automatically.
   Otherwise, add the CNAME record shown to your DNS provider.
4. HTTPS is provisioned automatically — no certificate setup needed.

### Update Supabase Redirect URL

After deploying, go to Supabase **Authentication → URL Configuration** and add
your Cloudflare Pages domain (e.g. `https://rateland.pages.dev` or your custom
domain) as the **Site URL** and under **Redirect URLs**.

### Costs

| Service              | Free Tier                                      |
|----------------------|------------------------------------------------|
| Cloudflare Pages     | Unlimited bandwidth, 500 builds/month          |
| Cloudflare Workers   | 100K requests/day (if you add API proxying)    |
| Supabase             | 500 MB DB, 50K monthly active users            |
| Census / FBI / HUD   | Unlimited (government APIs)                    |
| Custom domain        | ~$10–15/year from any registrar                |

---

## Folder Structure

```
RateLand/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── .gitignore
├── SETUP.md
├── public/
│   ├── _headers          ← Cloudflare security headers
│   └── _redirects        ← SPA catch‑all routing
├── supabase/
│   └── migrations/
│       ├── 001_create_tables.sql
│       └── 002_add_delete_policy.sql
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── context/
    │   └── AuthContext.jsx
    ├── components/
    │   ├── CityMap.jsx
    │   ├── CrimeChart.jsx
    │   ├── DataSourceBadge.jsx
    │   ├── EducationDonut.jsx
    │   ├── InfoTooltip.jsx
    │   ├── RentChart.jsx
    │   ├── ScoreCard.jsx
    │   └── SectionMeta.jsx
    ├── lib/
    │   ├── supabaseClient.js
    │   └── api/
    │       ├── census.js
    │       ├── crime.js
    │       ├── fips.js
    │       ├── geocode.js
    │       ├── housing.js
    │       ├── livingWage.js
    │       ├── health.js
    │       ├── wonder.js
    │       └── combine.js
    └── pages/
        ├── LoginPage.jsx
        ├── DashboardPage.jsx
        ├── SearchPage.jsx
        ├── ResultsPage.jsx
        └── SavedSearchesPage.jsx
```

---

## Notes

- **County FIPS Resolution** — `fips.js` converts city coordinates into a county
  FIPS code using the FCC Area API (primary) with Census Geocoder as fallback.
  Both are free government APIs requiring no API key. Results are cached in
  `localStorage` with a 90-day TTL. Geographic data uses the FCC Data API but
  is not endorsed or certified by the FCC.
- **HUD Fair Market Rent** — When FIPS is available, `housing.js` fetches
  **county-level** FMR via `fmr/data/{entityId}` (entity ID = FIPS + "99999").
  Falls back to state-level data if the county endpoint fails.
- **MIT Living Wage** — No public REST/JSON API exists. MIT's FAQ explicitly
  prohibits scraping. The module returns a county-aware "Coming Soon" placeholder.
  Full integration would require a data license from the Living Wage Institute.
- **County Health Rankings** — No REST API. Data is available only as
  downloadable CSVs. The program is sunsetting December 2026. The module returns
  a county-aware "Coming Soon" placeholder.
- **CDC WONDER** requires a data-use agreement and token — the module is a
  coming-soon placeholder per the project spec.
- All API calls run **concurrently** in `combine.js` via `Promise.all`. Each is
  individually wrapped in a try/catch so one failure doesn't block the others.
