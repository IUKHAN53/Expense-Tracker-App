# Google Play Console — Store listing kit

Everything Play Console asks for, in one place. Copy/paste fields into the
Console form. The two image files in this directory (`feature-graphic.svg`,
`app-icon.svg`) need to be converted to PNG before upload — see the
"Asset preparation" section at the bottom.

---

## App name

```
Kharcha · Household Expense Tracker
```

(Up to 30 chars: 33 — trim if needed)

Shorter fallback (29 chars):

```
Kharcha · Expense Tracker
```

---

## Short description

Up to 80 chars. This shows under the app name on the listing card.

```
Track every household rupee. AI scans receipts. Made in Pakistan.
```

(65 chars)

---

## Full description

Up to 4000 chars. Below is ~1900 — leaves headroom for future feature
additions without redoing ASO work.

```
Kharcha is the calm expense tracker for Pakistani households. Snap a receipt with the camera, split a bill across the family, log fuel by the litre, and see exactly where the month went — without spreadsheets, and without learning a new vocabulary.

▸ AI receipt scanning
Point the camera at a paper receipt or a phone bill. Kharcha reads every line, totals it up, and asks who the items belong to. Three free scans every month; unlimited on Pro.

▸ Split a bill across the family
Tap two, three, four people on one expense. Kharcha divides it evenly and writes one entry into each person's list, all tied to the same split, so the household total is always honest.

▸ Fuel, the way drivers measure it
Log a refill by rupees and rate; Kharcha computes the litres, your km / L, and your Rs / km between full tanks. A dedicated Fuel tab keeps the car's history separate from the household ledger.

▸ A list per person, plus Home and Car
Separate ledgers for each household member, plus Home and Car. One monthly view across all of them. The dashboard answers the question parents actually ask: where did the month go?

▸ Invite the family. One household, one ledger.
Send an email invitation to your spouse, parent or child. They sign up and join your household instead of starting a separate ledger. Free fits up to 3 members; Pro raises the cap to 5, and Pro inherits across every member — no separate billing per person.

— PRICING IN PAKISTANI RUPEES —
Free forever: 3 AI scans per month, up to 3 household members, every other feature unlimited.
Pro Monthly (PKR 499): unlimited AI scans, up to 5 members.
Pro Lifetime (PKR 7,999): pay once, never again.

Detect your region automatically; PKR, INR, BDT, LKR, AED, GBP and USD are supported.

— BUILT FOR PAKISTANI HOUSEHOLDS —
Made in Karachi by a small team. Currency is PKR by default. The AI has been trained on local receipts from Imtiaz, Carrefour, Naheed, Al-Fatah, neighbourhood karyana stores, Shaheen Chemists, pharmacies and fuel pumps across Pakistan.

— PRIVACY YOU CAN READ —
We never sell your data. Not to advertisers, not to banks, not to credit scorers. Receipt photos are sent to Google's Gemini API for parsing and immediately released — only the parsed text stays in your account. You can export everything as CSV from settings and delete your account in one tap. Full notice at https://expense.iukhan.tech/privacy

— SUPPORT FROM A REAL HUMAN —
The same person who wrote the code answers the support email. Reply times stretch when life gets busy, but they always reach a human. hello@iukhan.tech
```

---

## Category & tags

| Field | Value |
|---|---|
| Application type | App |
| Category | Finance |
| Tags | Budgeting, Expense Tracker, Family Finance, Bills |

---

## Content rating

Answer the IARC questionnaire as:

| Question | Answer |
|---|---|
| User-generated content visible to others outside the household? | No |
| Violence, sexual content, profanity | None |
| Gambling | None |
| In-app purchases | Yes (Pro plans — but not yet wired through Play Billing) |
| User-to-user communication | Only between accepted household members (invite-gated) |
| Shares user location | No |
| Personal info collected | Email, name |

Expected rating: **Everyone**.

---

## Data Safety form

Use these answers verbatim — they match what the app actually does.

### Data collection

| Data type | Collected? | Shared? | Optional? | Purpose |
|---|---|---|---|---|
| Email address | Yes | No | No | Account management, app functionality |
| Name | Yes | No | No | Account management |
| Photos (receipt) | Yes | Yes (Google Gemini) | Yes | App functionality (AI parsing) — not stored on our server after parsing |
| Financial info (user-entered expense amounts) | Yes | No | No | App functionality |
| Device or other IDs | No | — | — | — |
| Location | No | — | — | — |
| App activity (analytics) | No | — | — | — |
| Crash logs | No | — | — | — (no analytics or crash reporter wired yet) |

### Security practices

| Question | Answer |
|---|---|
| Data encrypted in transit | **Yes** (HTTPS only) |
| Users can request data deletion | **Yes** — in-app: Settings → Delete account |
| Independent security review | No |
| Committed to Play Families Policy | N/A (general audience, 13+) |

---

## Target audience & content

| Field | Value |
|---|---|
| Target age groups | 13 and older |
| Appeals to children | No |

---

## Required URLs

| Field | URL |
|---|---|
| Website | https://expense.iukhan.tech |
| Privacy Policy | https://expense.iukhan.tech/privacy |
| Account deletion (web-discoverable) | https://expense.iukhan.tech/admin/login (Settings → Delete account in-app) |
| Email | hello@iukhan.tech |

---

## Pricing

| Field | Value |
|---|---|
| Pricing model | Free with in-app products (when Play Billing is wired) |
| Contains ads | No |
| Currency | PKR primary, USD secondary |

Until Play Billing is wired, **set "Contains in-app purchases" to No** and answer the IARC IAP question as "No". Flip both to Yes when Pro becomes purchasable through Play.

---

## Screenshots needed (2–8 phone screenshots)

Install the preview APK on a real Android phone, sign in, then capture:

1. **Home / dashboard** — current month total + per-person split bar
2. **List detail** — drilled-in entry list with categories
3. **Add Expense** — multi-person split selection
4. **Fuel tab** — km/L hero + refill cards
5. **Scan in progress** — camera view (or just-parsed items)
6. **Household members** — invite + members list
7. **Settings** — profile + Household + Danger zone
8. (optional) **Verify email** — the OTP screen with a code visible

Phone screenshots must be 16:9 portrait, min 320 px on the short side.

---

## Asset preparation

`feature-graphic.svg` (1024×500) and `app-icon.svg` (512×512) live next to
this file. Play Console requires PNG, not SVG, so convert before upload:

**Option A — online converter**
Use https://svgtopng.com or any reliable SVG→PNG tool. Upload the SVG,
set output to the exact dimensions, download.

**Option B — Inkscape (best fidelity)**
```
inkscape feature-graphic.svg --export-type=png --export-width=1024
inkscape app-icon.svg --export-type=png --export-width=512
```

**Option C — ImageMagick (if you have it)**
```
magick convert -background none -density 144 feature-graphic.svg -resize 1024x500 feature-graphic.png
magick convert -background none -density 144 app-icon.svg     -resize 512x512   app-icon.png
```

**Option D — Chrome headless (zero install if Chrome is available)**
```
chrome --headless --disable-gpu --window-size=1024,500 --screenshot=feature-graphic.png file:///path/to/feature-graphic.svg
chrome --headless --disable-gpu --window-size=512,512  --screenshot=app-icon.png       file:///path/to/app-icon.svg
```

Sanity-check the output: feature graphic should preserve crisp typography
and the saffron accent; app icon must still look like the Mark B at 64×64
(the smallest size Play renders it).

---

## Submission checklist

Before hitting "Send for review":

- [ ] Created `com.iukhan.kharcha` app in Play Console
- [ ] All screenshots uploaded (≥2)
- [ ] Feature graphic 1024×500 PNG uploaded
- [ ] App icon 512×512 PNG uploaded
- [ ] Short + long description pasted from this file
- [ ] Privacy policy URL set
- [ ] Data Safety form filled per table above
- [ ] Content rating questionnaire completed
- [ ] Target audience: 13+
- [ ] Set up "Internal testing" track first (closed list, 20-person cap, no review)
- [ ] Install AAB on a real device via the internal-testing link, run through signup → verify → invite → scan → delete-account
- [ ] Promote to "Closed testing" (open to wider testers, still no Google review for the testing track)
- [ ] Only then promote to Production for Google review (review typically 1–7 days)

---

## Honest unknowns

- **DKIM is still not configured on `iukhan.tech`.** Verification + invite + reset emails to Gmail/Outlook/Yahoo will spam-folder by default. Fix this before the first real user signs up or you'll have a flood of "I never got the code" support tickets. Zoho dashboard → Mail Settings → Email Configuration → DKIM.
- **In-app purchases for Pro are not wired through Play Billing.** Marketing pages list Pro plans; the app currently can't take a payment. Either (a) launch Free-only and remove Pro from the app (web pricing page stays), or (b) integrate RevenueCat / Play Billing before submitting. Play will flag a discrepancy between "in-app purchases declared" and "no purchase flow in app" if you set IAP=Yes without one wired.
- **No crash reporting.** First real crash in production = you'll never know. 30 minutes to wire Sentry; worth doing before a real launch.
