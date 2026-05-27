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
Track every household rupee, dollar or rupee. AI scans receipts, you split.
```

(74 chars)

Alternative (76 chars):

```
Household expense tracker with AI receipt scans. Multi-currency, multi-user.
```

---

## Full description

Up to 4000 chars. Below is ~2000 — leaves headroom for future feature
additions without redoing ASO work.

```
Kharcha is the calm expense tracker for households anywhere in the world. Snap a receipt with the camera, split a bill across the family, log fuel by the litre, and see exactly where the month went — without spreadsheets, and without learning a new vocabulary.

▸ AI receipt scanning
Point the camera at a paper receipt, a phone bill, a grocery slip. Kharcha reads every line, totals it up, and asks who the items belong to. Three free scans every month; unlimited on Pro.

▸ Split a bill across the family
Tap two, three, four people on one expense. Kharcha divides it evenly and writes one entry into each person's list, all tied to the same split, so the household total is always honest.

▸ Fuel, the way drivers measure it
Log a refill by amount and rate; Kharcha computes the litres, your km / L (or miles / gal), and your per-distance cost between full tanks. A dedicated Fuel tab keeps the car's history separate from the household ledger.

▸ A list per person, plus Home and Car
Separate ledgers for each household member, plus Home and Car. One monthly view across all of them. The dashboard answers the question parents actually ask: where did the month go?

▸ Invite the family. One household, one ledger.
Send an email invitation to your spouse, parent or child. They sign up and join your household instead of starting a separate ledger. Free fits up to 3 members; Pro raises the cap to 5, and Pro inherits across every member — no separate billing per person.

— PICK YOUR CURRENCY —
On first sign-in, choose from USD, GBP, EUR, INR, PKR, BDT, LKR, AED, SAR, CAD, AUD and more. Every amount you enter is shown in your currency, with the right symbol and the right digit grouping. Change it any time from Settings.

— TRANSPARENT PRICING —
Free forever: 3 AI scans per month, up to 3 household members, every other feature unlimited.
Pro Monthly: unlimited AI scans, up to 5 members. Pricing adapts to your region: USD 1.99, GBP 1.49, INR 149, PKR 499 or your local equivalent.
Pro Lifetime: pay once, never again. USD 29.99 or your local equivalent.

— PRIVACY YOU CAN READ —
We never sell your data. Not to advertisers, not to banks, not to credit scorers. Receipt photos are sent to Google's Gemini API for parsing and immediately released — only the parsed text stays in your account. You can export everything as CSV from settings and delete your account in one tap. Full notice at https://expense.iukhan.tech/privacy

— BUILT BY A SOLO DEVELOPER —
Made by Irfan Ullah, a full-stack developer who built Kharcha because his own household kept losing track of who paid for what. It exists because no other expense tracker treated a household the way one actually shops.

— SUPPORT FROM A REAL HUMAN —
The same person who wrote the code answers the support email. Reply times stretch when life gets busy, but they always reach a human. hello@iukhan.tech
```

---

## Category & tags

| Field | Value |
|---|---|
| Application type | App |
| Category | Finance |
| Tags | Budgeting, Expense Tracker, Family Finance, Bills, Personal Finance |

---

## Content rating

Answer the IARC questionnaire as:

| Question | Answer |
|---|---|
| User-generated content visible to others outside the household? | No |
| Violence, sexual content, profanity | None |
| Gambling | None |
| In-app purchases | No (until Play Billing is wired for Pro) |
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
| Countries | Available worldwide (no country restriction) |

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
| Currency at upload | USD (Play default); regional pricing handled by Play |

Until Play Billing is wired, **set "Contains in-app purchases" to No** and answer the IARC IAP question as "No". Flip both to Yes when Pro becomes purchasable through Play.

---

## Screenshots needed (2–8 phone screenshots)

Install the production AAB on a real Android phone, sign in, then capture:

1. **Currency picker** — first-launch screen choosing the display currency
2. **Home / dashboard** — current month total + per-person split bar
3. **List detail** — drilled-in entry list with categories
4. **Add Expense** — multi-person split selection
5. **Fuel tab** — km/L hero + refill cards
6. **Scan in progress** — camera view (or just-parsed items)
7. **Household members** — invite + members list
8. **Settings** — profile + Household + currency + Danger zone

Phone screenshots must be 16:9 portrait, min 320 px on the short side.

---

## Asset preparation

`feature-graphic.svg` (1024×500) and `app-icon.svg` (512×512) live next to
this file, with PNG conversions ready to upload (`feature-graphic.png`,
`app-icon.png`). Re-generate any time:

```bash
rsvg-convert -w 1024 -h 500 feature-graphic.svg -o feature-graphic.png
rsvg-convert -w 512  -h 512 app-icon.svg        -o app-icon.png
```

Or via Inkscape / online SVG-to-PNG / Chrome headless if `rsvg-convert`
is not installed locally.

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
- [ ] Target audience: 13+, available worldwide
- [ ] Set up "Internal testing" track first (closed list, 20-person cap, no review)
- [ ] Install AAB on a real device via the internal-testing link, run through: sign up → verify email → pick currency → invite member → scan → delete-account
- [ ] Promote to "Closed testing" (open to wider testers, still no Google review for the testing track)
- [ ] Only then promote to Production for Google review (review typically 1–7 days)

---

## Honest unknowns

- **DKIM is still not configured on `iukhan.tech`.** Verification + invite + reset emails to Gmail/Outlook/Yahoo will spam-folder by default. Fix this before the first real user signs up. Zoho dashboard → Mail Settings → Email Configuration → DKIM.
- **In-app purchases for Pro are not wired through Play Billing.** Mention Pro in the long description as a feature, but submit with IAP=No until Play Billing (or RevenueCat) is integrated.
- **No crash reporting.** First real crash in production = you'll never know. 30 minutes to wire Sentry; worth doing before launch.
- **Multi-language is not yet shipped.** Currency is selectable; UI strings remain English-only for v1. Translations are a planned follow-up.
