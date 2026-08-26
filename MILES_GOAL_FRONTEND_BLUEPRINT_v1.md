# Earnn Miles Goal — Frontend Technical Blueprint v1

## 1. Status and authority

This is a frontend planning and review document only. It does not authorize
implementation, package installation, API/schema changes, commits, pushes, or
Vercel/Railway/Supabase changes.

Authority, newest first:

1. The founder's frontend proposal supplied for this review.
2. `Backend/core/MILES_GOAL_TECHNICAL_BLUEPRINT_v3.md` for calculation,
   response, ranking, event, toggle, and performance behavior.
3. The current live Frontend repository for implementation conventions.

The frontend must explain and operate the backend result. It must not recreate
C1, miles conversion, event feasibility, unlock timing, target reduction,
ranking, or retention business rules.

---

## 2. Product recommendation

Use the proposed two-screen journey:

```text
Screen 1: Dream
  -> understand the feature
  -> choose a supported destination region

Screen 2: Possibility
  -> see an immediate example
  -> compare Easiest/Dream/Smartest
  -> switch airline scope
  -> customize in a drawer
  -> explore event opportunities without leaving the page
```

This is the right interaction model because it gives the user a meaningful
flight timeline before asking for salary and a 13-category spend profile.

Use a stable technical URL independent of the final marketing label:

```text
/miles
/miles/results?region={region_id}
```

Do not reuse `/analyse` or `/results`; those pages implement a different
reward/wallet journey and are already large, tightly coupled components.

### 2.1 Recommended navigation label

Recommended label:

```text
Fly for Free ✈
```

It is the strongest discovery hook, but every page must qualify it:

```text
Turn everyday spending into your next flight.
Award bookings can still include taxes, airline charges, cash co-payments,
and card fees.
```

The destination result must always surface the backend's `associated_cash_aed`
and the selected card/fee-route cost. Never render “AED 0” unless it is an
actual returned value.

---

## 3. Findings from the live Frontend

The current Frontend is Next.js 16 App Router with React 19 and TypeScript.
Relevant facts:

- `components/Navbar.tsx` owns desktop and mobile navigation.
- `lib/api.ts` is the single relative-URL API client; requests are proxied by
  `next.config.ts` and must not call Railway directly.
- `app/analyse/page.tsx` already owns the canonical 13 categories, salary
  input, merchant preferences, and number-entry interaction patterns.
- `/analyse` stores result artifacts in `sessionStorage` and routes to
  `/results`.
- `app/results/page.tsx` contains card-image, card-detail, loading, responsive,
  and fee-display patterns, but is a 2,000+ line wallet-specific page.
- The app has no map package and no frontend unit-test runner configured.
- Brand tokens already exist in `app/globals.css`; new Miles Goal styling
  should use those tokens through CSS modules.
- Card images use `getCardImageUrl(earnn_card_id)` and fall back to
  `/card-dummy.svg`.

Conclusion: reuse behavior and visual tokens, not the monolithic Analyse or
Results components themselves.

---

## 4. Backend contract dependencies

### 4.1 Personalized mode is compatible

The customization drawer can supply the four required backend inputs:

```text
destination
airline
salary_aed
13-category monthly spend
```

It may also supply the airline-specific current usable miles and toggle state.

### 4.2 Discovery mode is not currently compatible

The proposal correctly says not to invent a salary. The frozen backend v3
request nevertheless requires `salary_aed > 0` and applies salary eligibility.
Therefore the frontend alone cannot produce the proposed anonymous example.

Recommended backend dependency, subject to separate founder approval:

```python
eligibility_mode: Literal["personalized", "discovery"] = "personalized"
salary_aed: float | None
```

Rules:

```text
personalized:
  salary required
  apply COALESCE(min_salary_aed, 0) <= salary

discovery:
  salary omitted
  do not apply salary eligibility
  response assumptions.eligibility_filter_applied = false
```

The UI disclosure is mandatory:

```text
Example based on AED 10,000 monthly spending. Card eligibility may vary.
```

Do not send an artificial high salary, zero salary, or hidden sentinel salary.
Do not implement discovery by calling the personalized endpoint with fabricated
user data.

If the backend contract is not extended, Screen 1 may still be built, but the
instant anonymous result cannot be implemented honestly.

### 4.3 Airline scope requires two simulations

Backend v3 accepts exactly one airline per request. The proposed default
“Best overall” view therefore requires two calls with the same profile:

```text
simulate(destination, emirates, profile)
simulate(destination, etihad, profile)
```

Run them in parallel with `Promise.allSettled`, not sequentially. Keep the two
interaction catalogs separate because their currencies, routes, balances,
targets, and events differ.

If one airline fails, show the successful airline with a visible partial-data
message. Never merge currencies or event catalogs.

### 4.4 Client-side toggle resolver

The frontend must implement the versioned pure resolver defined by backend v3:

```text
conditional_event_v1 catalog + toggle state -> resolved view
```

It performs no API request, C1 call, or network work. Golden fixtures generated
by backend tests must prove TypeScript/Python parity. If an unknown
`resolution_contract_version` arrives, disable interactive overrides and show
the backend's initial `resolved_view`; do not guess.

---

## 5. Destination model

### 5.1 Current canonical coverage

The 14 rows are seven destination values repeated once per airline:

| UI region ID | Consumer label | Backend destination | Emirates origin | Etihad origin |
|---|---|---|---|---|
| `uk_ireland` | UK & Ireland | `uk` | DXB | AUH |
| `europe` | Europe | `europe` | DXB | AUH |
| `north_america` | North America | `usa` | DXB | AUH |
| `egypt_north_africa` | Egypt & North Africa | `egypt` | DXB | AUH |
| `india_subcontinent` | India & Subcontinent | `india` | DXB | AUH |
| `singapore_se_asia` | Singapore & Southeast Asia | `singapore` | DXB | AUH |
| `philippines` | Philippines | `philippines` | DXB | AUH |

The mapping belongs in a typed frontend constant and uses trimmed canonical
destination values.

Every example/result states its representative route, using the origin returned
by the API:

```text
Europe estimate based on a Dubai (DXB) → Europe redemption.
```

### 5.2 Unsupported regions

Do not map South America, Sub-Saharan Africa, Middle East, ANZ, Japan/Korea,
China/East Asia, Russia/Central Asia, or Indian Ocean to unrelated destinations.
That would imply unsupported mileage equivalence.

The world map may render them as disabled “Coming soon” regions. Expand the
mapping only when matching redemption rows exist.

### 5.3 Map implementation

Use a locally stored, optimized SVG world map with seven interactive region
hit areas and an accessible card/list fallback below it.

Requirements:

- keyboard focus and Enter/Space activation;
- visible focus styles;
- descriptive `aria-label` per supported region;
- disabled semantics for unsupported regions;
- touch targets at least 44×44 px;
- no external map script or runtime data request;
- reduced-motion support; and
- the region card list remains fully usable if the SVG fails.

---

## 6. Discovery example

Frozen frontend example profile, once discovery mode is approved:

```text
total monthly spend = AED 10,000
miscellaneous       = AED 10,000
all other categories = AED 0
current usable miles = 0
toggle defaults = backend-computed defaults
salary eligibility = disabled and disclosed
```

This profile is deliberately simple, not personalized. The frontend must call
it “an example,” never “your spending” or “your recommendation.”

On region click:

1. Save selected `region_id` in navigation state/query.
2. Route immediately to `/miles/results`.
3. Start Emirates and Etihad discovery calls in parallel.
4. Show “Finding your fastest way to {region}…” with a reduced-motion variant.
5. Render each airline as it settles; enable Best overall when at least one is
   available.

Cache the two discovery responses in memory/session storage using:

```text
calculation_version + region_id + example_profile_version
```

Never put salary, spend details, miles balances, event overrides, or full API
responses in a URL.

---

## 7. Screen 1 — Dream

Route: `/miles`

### 7.1 Page structure

1. Hero:
   - “Where could your spending take you?”
   - concise supporting copy;
   - no form, salary, login, or airline question.
2. Three-step explainer:
   - Pick a destination;
   - See your fastest cards;
   - Personalize your plan.
3. “Where do you want to go?”
4. Interactive map.
5. Accessible supported-region cards.
6. Compact accuracy disclosure.

### 7.2 Navbar

Add the new link to desktop and mobile navigation in
`components/Navbar.tsx`. Keep the existing CTA unchanged unless a separate
homepage/navigation review authorizes changing it.

### 7.3 No fake preview numbers

Screen 1 may explain the feature visually, but it must not hardcode example
month counts or card names. Real results begin after a destination click.

---

## 8. Screen 2 — Possibility

Route: `/miles/results?region={region_id}`

The page has two modes:

```text
example
personalized
```

Changing mode replaces the same page content; it does not open a third route.

### 8.1 Header

Example:

```text
Your spending could take you to Europe ✈
Example based on AED 10,000/month
Card eligibility may vary
```

Personalized:

```text
Your personal plan is ready
Based on your AED X monthly spending
```

Always include the representative route disclosure and award-cost disclaimer.

### 8.2 Airline switch

Recommended labels:

```text
Best overall | Emirates | Etihad
```

“Best overall” is a client-side view over two independent responses, never a
third currency or backend calculation.

When one airline is selected, render only that response. When Best overall is
selected, merge reached candidates for each strategy and sort using the frozen
backend keys:

```text
months_to_goal ascending
annual_fee_from_year2_aed ascending
```

Preserve the airline on every candidate. Never add a new cross-airline score.

### 8.3 Strategy and ranking presentation

Backend ranking is strategy-specific; it does not define one combined ranking
across Easiest, Dream, and Smartest. The page therefore needs a ranking focus:

```text
Economy (Easiest) | Business (Dream) | Upgrade (Smartest)
```

Recommended behavior:

- default focus: founder-selected strategy;
- rank the card list only by the focused strategy;
- show the other two timelines as secondary values on each tile; and
- switching focus reorders locally without an API call.

This preserves all three numbers without inventing a composite ranking.

### 8.4 Card tile

One tile per card, not one tile per fee route.

Collapsed content:

```text
card image
card and bank name
focused-strategy rank
airline badge for each displayed result
Easiest / Dream / Smartest month and target
fee-route label for each winning strategy result
associated cash payment
one strongest active-event message
Customize my plan CTA in example mode
```

The standard and monthly-fee routes may win different strategies. Therefore
do not show one ambiguous “AED X/year” header. Each strategy result must expose
its winning route and cost-at-goal, for example:

```text
Standard annual fee route
or
Express Miles route · AED 262/month
```

Expanded tile/drawer:

- standard versus monthly route comparison;
- base miles per month;
- active event timeline;
- original and unlocked discounted target;
- fee cost at goal;
- associated airline cash amount;
- conditions/expiry display text;
- card-detail link using existing `/api/cards/{id}` data; and
- conditionally reachable alternatives.

Deduplicate route candidates by card only for the collapsed list. Do not throw
away the losing route; keep it in expanded details.

### 8.5 Conditional-only cards

Cards whose default state misses 36 months but another valid toggle state
reaches remain visible in a separate section:

```text
Possible if you unlock one more condition
```

They have no default rank and must not appear ahead of default-reached cards.

---

## 9. Customization drawer

Open from Screen 2. Use a responsive right-side drawer on desktop and
full-height bottom sheet/modal on mobile.

### 9.1 Fields

Required:

```text
monthly salary
13 monthly spend categories
```

Profile defaults when opened from discovery:

```text
miscellaneous = AED 10,000
all other spend = 0
```

Airline preference:

```text
No preference
Emirates
Etihad
```

Optional balances:

```text
Emirates Skywards miles
Etihad Guest miles
```

Only send the balance belonging to the current airline request.

### 9.2 Reuse

Extract the canonical category metadata from `/analyse` into a shared module
before building this drawer. Both features must use identical category keys,
labels, order, and numeric normalization.

Do not import the entire Analyse page or duplicate an independently maintained
category list.

Merchant preferences remain optional. They should be hidden under an advanced
section in v1 rather than making the lightweight drawer feel like the full
Analyse form.

### 9.3 Submission

1. Validate salary > 0 and total spend > 0.
2. Build the exact 13-category object.
3. Call one or both airlines according to preference.
4. Keep the existing example visible under a non-blocking updating overlay.
5. Atomically replace both result and interaction catalogs when complete.
6. Announce “Your personal plan is ready” through an `aria-live` region.
7. Show delta against the example only when comparing the same
   destination/airline/strategy.

Do not persist the personalized inputs outside browser session storage in v1.
Do not log salary, spend, balances, or full catalogs to the console or
analytics.

---

## 10. Personalized story and opportunity controls

### 10.1 Achievement story

For the focused strategy's best default candidate:

```text
base monthly miles
active welcome events and their unlock months
active spend/annual acceleration events
voucher unlock and target change
goal crossing month
fee route and cost
associated airline cash payment
```

Build this from `active_event_ids`, `event_unlocks`, trajectories, and the
event display catalog. Do not derive or rewrite business rules in copy code.

### 10.2 Opportunities

Render one opportunity control per relevant non-default event:

```text
event benefit
required extra monthly/period spend where applicable
feasibility ratio as a closeness indicator, never “probability”
unlock month
current months-to-goal -> alternative months-to-goal
toggle control
```

Examples:

```text
Spend AED 550 more per month to unlock 15,000 miles
7 months -> 6 months

New to Emirates NBD?
Turn on 25,000 welcome miles
7 months -> 5 months
```

Toggles update by running the local resolver against the catalog. Show a brief
number-transition animation, respecting reduced motion.

### 10.3 Toggle hierarchy

UI controls map to:

```text
global new-to-bank
per-bank override keyed by bank_code
per-card override
balance-transfer default
individual event override
one selected voucher tier per mutual_exclusion_group
```

Explicitly selecting one voucher tier turns off its group siblings. The UI
must prevent two group members from becoming active before invoking the
resolver.

---

## 11. Frontend module structure

```text
Frontend/
  app/
    miles/
      page.tsx
      MilesLanding.module.css
      results/
        page.tsx
        MilesResults.module.css
  components/
    miles-goal/
      WorldRegionMap.tsx
      RegionCardList.tsx
      MilesLoadingState.tsx
      AirlineScopeSwitch.tsx
      StrategyFocusTabs.tsx
      MilesCardTile.tsx
      MilesCardDetails.tsx
      MilesTimeline.tsx
      MilesOpportunityCard.tsx
      MilesCustomizeDrawer.tsx
      MilesDisclosure.tsx
  lib/
    spend-categories.ts
    miles-goal/
      api.ts
      contracts.ts
      regions.ts
      resolver.ts
      merge-airlines.ts
      selectors.ts
      storage.ts
      format.ts
```

`lib/api.ts` may re-export the feature API helper, but the large v3 contracts
and resolver should remain in `lib/miles-goal/`.

Avoid a new global state library. Screen-local reducer/context is sufficient:

```text
selected region
mode
airline scope
focused strategy
example catalogs
personalized catalogs
toggle state per airline
drawer state
loading/error state per airline
expanded card
```

---

## 12. API client and request lifecycle

Add a typed helper:

```typescript
simulateMilesGoal(request, { signal }): Promise<MilesGoalSimulationResponse>
```

Requirements:

- relative `/api/miles-goal/simulate` URL only;
- JSON content type;
- `AbortSignal` support;
- typed backend error parsing;
- request ID held in memory to ignore stale responses;
- `calculation_version === "miles_goal_v3"` validation;
- `resolution_contract_version === "conditional_event_v1"` validation; and
- no raw request/response logging.

On region, airline, or profile changes, cancel obsolete requests. Never allow
a late Europe response to overwrite a later India selection.

---

## 13. State and storage

Use one namespaced session key:

```text
earnn_miles_goal_v1
```

Store only what is needed to survive a page refresh:

```text
region ID
mode
airline scope
focused strategy
example profile version
personalized form values
catalogs with their version/expiry timestamp
toggle state
```

Validate parsed storage through type guards and discard incompatible versions.
Do not use localStorage in v1. Provide a “Start over” action that clears only
the Miles Goal session key, never existing Analyse/Results keys.

---

## 14. Loading, empty, and failure states

### 14.1 Loading

Use the proposed flight copy and a lightweight CSS/SVG animation:

```text
Finding your fastest way to Europe…
```

Do not block the entire page during toggle recomputation; that work is local.

### 14.2 Partial airline failure

If one airline succeeds:

- show its results;
- disable the failed airline option with Retry;
- label Best overall as partial; and
- do not discard the successful catalog.

### 14.3 No reached defaults

If no default candidate reaches but conditional candidates exist, lead with:

```text
These routes become reachable if you unlock an additional condition
```

Do not fabricate a default month or show a generic “not reached” card.

### 14.4 No valid state reaches

If the backend drops every card for a strategy, show a compact strategy-level
empty state and let the user switch strategy/airline or customize. Do not
reverse-engineer extra-spend guidance outside returned opportunities.

---

## 15. Responsive and accessibility requirements

- Mobile-first cards with no six-number airline matrix.
- Strategy cells remain readable at 320 px width.
- Drawer focus trap, Escape close, backdrop close, and focus restoration.
- `aria-pressed` for switches and strategy tabs.
- `aria-live` for updated month results.
- Semantic headings and landmark structure.
- Text labels in addition to color/emoji.
- Tabular numerals for miles, months, AED, and fees.
- `prefers-reduced-motion` for map, loading, and number transitions.
- Associated-cash and fee disclosures cannot be hidden behind hover.
- Touch targets at least 44 px.

---

## 16. Validation plan

### 16.1 Pure logic tests

Add a lightweight TypeScript test runner only with separate founder approval.
Use backend-generated golden catalogs to verify:

- default resolution parity;
- every event override;
- per-bank `bank_code` handling;
- voucher mutual exclusion and unlock timing;
- standard/monthly route handling;
- conditional-only retention;
- 36-month boundary; and
- Best overall merge without new scoring.

### 16.2 Component tests

- supported/unsupported map regions;
- keyboard map/list operation;
- example versus personalized disclosures;
- salary/category validation;
- airline partial failure;
- unknown contract-version fallback;
- card-route details;
- opportunity toggle updates; and
- session restoration/version invalidation.

### 16.3 Manual responsive QA

Test at minimum:

```text
320×568
390×844
768×1024
1440×900
```

Verify map hit areas, drawers, three strategy values, fee/cash disclosures,
long card names, partial states, and reduced motion.

### 16.4 Local release gate

Before any authorized push:

```text
npm run lint
npm run build
frontend logic/component tests
local proxy integration against an approved backend environment
manual two-airline/toggle smoke test
```

No production push is included in this blueprint.

---

## 17. Implementation sequence

### Phase A — Resolve product/API gates

1. Approve discovery-mode salary behavior.
2. Approve launch destination taxonomy.
3. Approve navigation label.
4. Approve default focused strategy and Best overall merge behavior.

### Phase B — Shared contracts and primitives

1. Extract shared 13-category metadata from Analyse.
2. Add typed Miles Goal API contracts/client.
3. Add region mapping and storage guards.
4. Port resolver and validate against backend golden fixtures.

### Phase C — Screen 1

1. Add navbar link.
2. Build hero/explainer.
3. Build accessible SVG map and region list.
4. Wire navigation and discovery loading.

### Phase D — Screen 2 example mode

1. Run two airline requests in parallel.
2. Build airline/strategy selectors.
3. Build card tiles, fee routes, disclosures, and conditional section.
4. Add partial/error states and session caching.

### Phase E — Personalization

1. Build lightweight customization drawer.
2. Run personalized one/two-airline requests.
3. Add transformed personal-plan hero and example delta.

### Phase F — Events and polish

1. Build achievement timeline.
2. Build event opportunities and local overrides.
3. Add voucher group controls and per-bank new-to-bank overrides.
4. Complete accessibility, responsive, and performance QA.

### Phase G — Local release validation

1. Run all frontend gates.
2. Verify against backend contract fixtures.
3. Conduct independent review.
4. Request explicit founder authorization before any commit/push/deploy.

---

## 18. Founder decisions required before implementation

### 18.1 Anonymous discovery eligibility — blocking

Approve one:

```text
Recommended: add explicit backend discovery mode that disables salary filtering
Alternative: remove anonymous results and ask salary before the first API call
```

Fabricating a salary is rejected.

### 18.2 Launch destination taxonomy — blocking for map/copy

Recommended: launch the seven data-backed consumer regions in §5 and show the
other proposed regions as Coming soon.

Alternative: founder supplies and approves an explicit representative mapping
for all 14 consumer regions, accepting the accuracy implications.

### 18.3 Default ranking focus

Choose the initial strategy that orders the card list:

```text
Dream / Business (recommended for the aspirational journey)
Easiest / Economy
Smartest / Upgrade
```

All three remain visible and switchable. No composite ranking will be invented.

### 18.4 Marketing label

Confirm `Fly for Free ✈` for navigation with the mandatory cash/fee qualifier,
or choose a safer label such as `Fly with Miles`.

### 18.5 Best overall cell behavior

Recommended: in Best overall, each strategy cell may select its fastest airline
and must show that airline badge. This keeps backend ranking exact but means a
single card tile can show Emirates for one strategy and Etihad for another.

Alternative: force one airline per card tile, which requires an additional
founder-approved rule for choosing that airline across three strategies.

---

## 19. Definition of done

The frontend is ready for release review only when:

- the two-screen journey works without an intermediate onboarding page;
- discovery does not fabricate salary or imply personalized eligibility;
- only supported destination mappings produce estimates;
- Emirates/Etihad catalogs remain currency-separated;
- all three strategies are visible and ranking remains strategy-specific;
- card fee routes and associated cash are explicit;
- personalization uses the canonical 13-category contract;
- toggles resolve locally against the versioned backend catalog;
- voucher timing and mutual exclusion remain correct;
- conditional-only cards remain visible but unranked;
- no live user data or secrets are logged or placed in URLs;
- lint, build, logic, component, accessibility, responsive, and integration
  checks pass locally; and
- no commit, push, or deployment occurs without exact founder authorization.
