# TEC Assets — Claude Code Instructions

## What This App Is

Digital asset and NFT management app within the TEC Federated Platform.
Pi-native asset creation, portfolio management, and peer-to-peer trading.

**Current Phase: Platform Hardening** — no new features until P1 violations closed across platform.

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
- Do NOT add new features during Platform Hardening Phase

---

## Commit Convention

```
feat(assets):   new asset feature
fix(assets):    bug fix
fix(payment):   payment flow fix
style(assets):  UI polish
```

## Platform Context

Full platform context, ADR system, and engineering roadmap:
→ `TEC_MODELS_PAT.prompt.yml` in yasira82/tec-app (branch: claude/ecommerce-engineering-review-EuiQO)
→ `TEC_Ecosystem_AI_Key.prompt.yml` in yasira82/tec-app
