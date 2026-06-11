# Earnn.money — Frontend Context Handover
_Last updated: 9 June 2026_

---

## 1. Project Overview

**Earnn** is an AI-powered financial intelligence tool for UAE consumers. It helps users discover missed cashback, rewards, miles, and find the best credit cards based on their actual spending patterns.

- **Stack**: Next.js (App Router), TypeScript, inline styles + Tailwind base
- **Dev server**: http://localhost:3000
- **Revert point**: `C:\Users\divth\Desktop\Earnn_Python_code\frontend_version1\` — full backup labelled "Version 1". Restore by copying this folder back over `frontend\`.

---

## 2. Brand & Design

| Token | Value |
|---|---|
| Primary blue | `#0E3785` |
| Deep navy | `#0A1A33` / `#050E24` |
| Gold | `#FFD700` |
| Muted text | `#5A6A85` |
| Success green | `#00A67E` |
| Warning amber | `#E07B1F` |

**Design philosophy**: Premium fintech, AI-native (Stripe / Ramp / Mercury / Linear feel). NOT a comparison portal — conversion-focused. Deep navy + white. No gimmicks.

---

## 3. File Map

```
frontend/
├── app/
│   ├── layout.tsx          — Navbar + FeedbackWidget + Footer (site-wide)
│   ├── page.tsx            — Home page (see §4)
│   ├── analyse/page.tsx    — Analyse page (see §5)
│   ├── compare/page.tsx    — Compare page (see §6)
│   └── ask-earnn/page.tsx  — Ask Earnn page
├── components/
│   ├── Navbar.tsx
│   └── FeedbackWidget.tsx  — Floating feedback button (replaced ChatWidget)
├── public/
│   ├── earnn_logo.jpeg
│   ├── hero-card-cover.png     — Original hero image (glowing card, streaked blue bg)
│   └── hero-card-cover-2.png  — Current hero image (card outline on binary-data blue bg)
└── CONTEXT.md              — This file
```

---

## 4. Home Page (`app/page.tsx`)

### Sections (top → bottom)
1. **Hero** — Full-width, `hero-card-cover-2.png` background with dark gradient overlay. Heading: "Stop Guessing. / Start Optimising / Every Dirham." (all white, 800 weight). Single CTA button: "Analyse If You Are Losing Money →" → `/analyse`
2. **The Problem** — 3 stat cards (AED 3,400+ / 68% / 12hrs) + 5 issue cards (Wrong card used, Missed cashback, Forgotten rewards, Hidden fees, Poor decisions)
3. **How It Works** — 3 steps: Connect → Analyse → Optimise
4. **Security** — 4 Earnn-specific pillars:
   - 🕵️ Redacted before upload — Card & personal details stripped before analysis.
   - 🗑️ Nothing stored — Statement deleted right after results.
   - 🇦🇪 UAE-based & compliant — Processed within UAE, CBUAE-aligned.
   - 🚫 Zero bank access — No linking, no account — just a PDF and your answer.
   - Compliance tags: `CBUAE-aligned · No data stored · No bank linking · UAE servers only`
5. **Supported UAE Banks** — Auto-scrolling marquee ribbon (fades at edges, pauses on hover): ENBD, FAB, ADCB, RAK, HSBC, Mashreq, DIB, CBD, ADIB, Citi + more
   - Note: text badges only — no actual logo image files yet
6. **Final CTA** — Section linking to `/analyse`

### Footer (in `layout.tsx`)
- Left: earnn logo + "earnn.money" / "AI-Powered Financial Intelligence"
- Right: "Designed for clarity. Built for trust."
- Bottom bar: © 2026 earnn Financial Technologies · UAE Credit Card Rewards Platform

---

## 5. Analyse Page (`app/analyse/page.tsx`)

### Two modes: Upload Statement / Manual Entry

**Manual Entry flow:**
1. **Your salary** box (💰) — AED input, monthly take-home income
2. **Your preference** box (⭐) — Radio toggle: Cashback card (selected by default) / Miles card (disabled, "coming soon")
3. **Spend category grid** — `repeat(auto-fill, minmax(340px, 1fr))`, gap 16. All 3 rows (salary+pref, categories, total) use identical grid sizing for alignment.
4. **Total Monthly Spend** — navy summary bar
5. **"Find My Best Cards →"** submit button

- Salary and preference are captured in state (`salary`, `preference`) but not yet sent to backend — wired up alongside spend data when backend is ready.

---

## 6. Compare Page (`app/compare/page.tsx`)

### Key features
- **8 category columns**: Dining, Grocery, Travel, Fuel, Online, Retail 🛍️, Utility 💡, All Other ➕
- **Tile layout**: Card name on top (with `borderBottom` separator + "View & Apply" pill), then flex row: image+earnn score | rate pills | annual fee + "Earn Up To" static box + chevron
- **Earnn score box**: `88×56px`, border-radius 10, labelled "earnn score" (11px)
- **"Earn Up To" box**: `130×56px`, `#EAFBF4` background — static display
- **Annual Fee**: fixed `108px` width, `whiteSpace: nowrap` — aligned across 3-digit and 4-digit values. One card shows "Free for lifetime" (card_1) as test case.
- **Pagination**: "**10** cards per page · page X/Y"

---

## 7. FeedbackWidget (`components/FeedbackWidget.tsx`)

Floating 💡 button, bottom-right corner (`position: fixed, bottom: 28, right: 28`):
- "Feedback Please" label below button (hidden when panel open)
- Toggles to ✕ / rotates 45° when open
- Panel: emoji satisfaction scale (😞😐🙂😄🤩), textarea, "Send Feedback →" button
- Shows "🙏 Thank you!" on submit, auto-dismisses after 1.8s
- **TODO**: wire to `POST /api/feedback` — currently local state only

---

## 8. What Is NOT Done Yet (Suggested Next Steps)

### High Priority (MVP blockers)
1. **Backend integration — Analyse** → Send `salary`, `preference`, and spend data to the AI analysis API. Currently the upload path hits the backend but manual entry payload may not include the new fields.
2. **Feedback API** → Wire `FeedbackWidget` to `POST /api/feedback` so feedback is actually collected (critical for MVP learning).
3. **Bank logos** → Replace text badges in the scrolling ribbon with real PNG/SVG logos. Files need to be added to `public/` (ENBD, FAB, ADCB, RAK, HSBC, Mashreq, DIB, CBD, ADIB, Citi).

### Medium Priority (Quality)
4. **Miles card flow** → Enable the Miles card preference option when that analysis path is built out.
5. **Real card data** → The compare page uses mock/seed card data. Connect to a real card database or CMS.
6. **Mobile responsiveness** → Test and fix all pages on small screens (the flex/grid layouts mostly work but need a pass).
7. **Apply links** — "View & Apply" buttons on compare cards should link to real card application URLs.

### Nice to Have
8. **Ask Earnn page** — Likely needs backend AI chat integration.
9. **Analytics / tracking** — No analytics wired yet (Mixpanel, PostHog, etc.).
10. **SEO** — Metadata set in `layout.tsx` but no OG images, structured data, or sitemap yet.
11. **Clean up `DataGridBackdrop`** — Unused component still sitting in `page.tsx`, can be removed.

---

## 9. Running the Project

```bash
cd C:\Users\divth\Desktop\Earnn_Python_code\frontend
npm run dev        # starts on http://localhost:3000
```

Backend (Python/FastAPI) lives separately in `C:\Users\divth\Desktop\Earnn_Python_code\` — start it independently before testing upload/analyse flows.
