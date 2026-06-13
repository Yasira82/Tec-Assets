# TEC Assets — Claude Code Instructions

## What This App Is

Digital asset and NFT management app within the TEC Federated Platform.
Pi-native asset creation, portfolio management, and peer-to-peer trading.

**Current Phase: Phase 0 — Pre-Mainnet Hardening**
No new features until P1 violations closed across platform.

---

## Stack

- Next.js 15 App Router + TypeScript strict
- @yasser172/tec-ui (design system, TEC_COLORS)
- @yasser172/tec-auth (getStoredUser, getAccessToken, ssoRedirect)
- Vitest (unit) + Playwright (e2e)
- Deployment: Vercel

---

## Architecture Rules

### ADR-007 — Pi Foreign Session (CRITICAL)
Every Pi payment handler must include this guard:
```typescript
const isHubNavigation = () =>
  document.referrer.toLowerCase().includes('hub.tecosystem.app')

if (isHubNavigation() || !(window as any).Pi || !piReady) {
  redirectToHubPayment(...)
  return
}
```

### Two-SDK Boundary
```
Client Components  →  lib-client/*  (browser state, auth helpers)
API Routes (BFF)   →  @yasser172/tec-sdk via /api/bff/* (server-side only)
```

### Auth Pattern
- SSO via Hub cookies: `tec_access_token`, `tec_csrf`, `tec_user`
- NEVER localStorage for tokens
- CSRF header on all POST/PUT/DELETE BFF routes

---

## Kernel Spec (C-47) — Relevant Rules

### Fail Closed (P6)
- Missing session on asset action → deny, redirect to login
- Hub navigation → Force Mode 1, never attempt Mode 2

### Canonical Entity
- **Asset** owned by: `tec-asset-service` — never derive ownership client-side
- Asset ownership = `Identity` (Pi username from tec_user cookie)

### Invariants for Assets
```
1. Asset ownership transfer requires verified payment (approval first)
2. Every ownership transfer has audit trail
3. Asset owner always resolves to ONE principal (P6)
```

---

## Development Commands

```bash
npm run dev         # Next.js dev server
npm run build       # Production build
npm run lint        # ESLint
npx vitest          # Unit tests
npx playwright test # E2E tests
```

---

## What NOT To Do

- Do NOT skip ADR-007 `isHubNavigation()` check before any Pi payment
- Do NOT store auth tokens in localStorage
- Do NOT add `NEXT_PUBLIC_*` env vars for internal service URLs
- Do NOT add new features during Phase 0
- Do NOT derive asset ownership client-side (always from tec-asset-service)

---

## Commit Convention

```
feat(assets):   new asset feature
fix(assets):    bug fix
fix(payment):   payment flow fix
style(assets):  UI polish
```

---

## Phase 0 Items (C-41 — Before Mainnet)

```
□ Write Vitest tests — target ≥ 60%
□ Document Pi App ID + domain (tec-assets → tecosystem.app/assets)
□ Upgrade to @yasser172/tec-ui PaymentModal when v1.2.0 publishes
□ PI_SANDBOX=false verified in production
```

---

## Platform Orchestra — This Repo

**Role:** Ownership Layer — digital assets, NFTs, creator reputation, peer-to-peer trading
**Upstream:** @yasser172/tec-auth · @yasser172/tec-ui · @yasser172/tec-sdk · tec-asset-service (4006)
**Layer:** Phase 0 hardening

---

## Commercial Targets

- ADR-007 compliance: every payment button has `isHubNavigation()` guard
- Tests coverage ≥ 60% before Phase 1
- Asset attribution: creator identity tied to Pi username (tec_user cookie)

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|-----------|
| R1 | Hub→Assets payment_not_found (C-76) | P0 | `isHubNavigation()` → Mode 1 — DO NOT REMOVE |
| R2 | Railway URL in client bundle | P1 | server-only `API_GATEWAY_URL` |
| R3 | Auth token in localStorage | P1 | HttpOnly cookies ONLY |
| R4 | Asset ownership derived client-side | P0 | Always from tec-asset-service |

---

## Platform Governance

### SHARED
- Payment: ADR-007 guard on every payment button
- Auth: Hub SSO cookies — never custom auth
- Asset ownership: tec-asset-service is the authority

### SOVEREIGN
- Asset UI/UX, portfolio layout
- Creator profile design
- NFT display and trading flow UI

---

## Release Gate Protocol

```bash
npm run type-check    # 0 errors
npm run lint          # 0 errors
npx vitest            # all pass
git status            # clean
git fetch origin claude/ecommerce-engineering-review-EuiQO
git rebase origin/claude/ecommerce-engineering-review-EuiQO
```

ADR-007 check: grep any modified payment handler for `isHubNavigation()`.

---

## Platform Context

Full platform context, ADR system, and engineering roadmap:
→ `TEC_MODELS_PAT.prompt.yml` in yasira82/tec-app (branch: claude/ecommerce-engineering-review-EuiQO)
→ `TEC_Ecosystem_AI_Key.prompt.yml` in yasira82/tec-app
→ C-47 Kernel Spec — P6 Fail Closed, Asset ownership invariants
→ C-41 Engineering Roadmap — Phase 0 assets items


---

## Skills

Available via plugin — invoke automatically when the situation matches:

| Situation | Skill |
|-----------|-------|
| Writing new feature or fixing a bug → use TDD | `/tdd` |
| Bug, regression, or unexpected behavior | `/diagnose` |
| Writing or modifying tests | `/test-guard` |
| Writing or modifying BFF routes, payment handlers, or API contracts | `/clean-code-guard` |
| Updating docs, CLAUDE.md, or knowledge-base entries | `/docs-guard` |
| Planning a new feature or architectural decision | `/grill-with-docs` |
| Breaking down a roadmap item into GitHub Issues | `/to-issues` |
| Session is getting long or context is filling up | `/handoff` |
| Adding pre-commit hooks to this repo | `/setup-pre-commit` |
