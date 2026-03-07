<!--
  SYNC NOTES — When updating this file, check whether these adjacent files need changes:
  - Root CLAUDE.md (../../CLAUDE.md) — if deployment URL or platform scope changes
  - API gateway CLAUDE.md (../../infra/api-gateway/CLAUDE.md) — if you consume new
    routes or the MCP tool schema changes
  - core CLAUDE.md (../../core/CLAUDE.md) — if the platform starts surfacing knowledge
    graph data or linking church directory records to ontology entities
  Key coupling points: Zuplo route paths, Supabase schema, MCP tool definitions, env var names
-->

# global.church-developer-site — Developer Platform & Church Directory

## What This Is

The public-facing Global.Church platform. A Next.js 15 app with a church explorer (10K+ churches on a 3D globe and Leaflet map), an MCP server chat interface, developer portal for API key management, and admin dashboard for church review/approval. This is the church directory and developer onboarding surface.

Deployed at: **platform.global.church**

## Tech Stack

- **Framework**: Next.js 15.5.7 (App Router, Server Components, Server Actions)
- **UI**: React 19, Tailwind CSS 4, Radix UI (shadcn), lucide-react
- **3D/Maps**: react-globe.gl + three.js (homepage globe), Leaflet + react-leaflet (explorer map), supercluster (pin clustering)
- **Auth**: Privy (@privy-io/react-auth, @privy-io/server-auth) — email + Google login
- **Database**: Supabase (profiles, api_keys, user_roles, churches tables — service-role only, no client auth)
- **API Gateway**: Zuplo (church search, MCP endpoint, developer key management via Dev API)
- **AI**: OpenAI Responses API + remote MCP server (for `/api/ask` natural language church search)
- **Analytics**: PostHog, Vercel Analytics, Vercel Speed Insights
- **Email**: Resend API (request-access and feedback forms)

## App Structure

```
src/
├── app/
│   ├── admin/              — Admin dashboard (church review, user management, claims)
│   ├── api/                — API routes (church search proxy, ask, feedback, auth, YouTube, Facebook)
│   ├── church/[id]/        — Dynamic church detail pages
│   ├── developer/          — Developer portal (dashboard, API keys, settings)
│   ├── explorer/           — Church explorer with map + filters
│   ├── mcp-server/         — MCP server chat demo
│   ├── schema/             — Data schema docs
│   ├── about/, faq/, methodology/, security-privacy/, feedback/, request-access/, api-docs/
│   └── page.tsx            — Home page with 3D globe
├── components/
│   ├── admin/              — AdminDashboard, ChurchEditor, AdminUsersTable, ClaimsReview
│   ├── developer/          — ApiKeyList, DashboardShell, ProfileForm
│   ├── explorer/           — ChurchExplorerClient, filters (belief, denomination, programs, service day/time)
│   ├── ui/                 — Radix UI primitives (shadcn)
│   ├── InteractiveGlobe.tsx — 3D globe with belief/country color modes
│   ├── LeafletMapInner.tsx  — Leaflet map for explorer
│   └── ChurchCard.tsx       — Church result cards
├── lib/
│   ├── zuplo.ts            — SERVER-ONLY: Zuplo API client (search, fetch, GeoJSON, radius, bbox)
│   ├── zuploClient.ts      — CLIENT-SAFE: wrappers calling /api/* proxy routes
│   ├── zuploAdmin.ts       — Zuplo Developer API for key management
│   ├── supabaseServerClient.ts — Service-role-only Supabase client
│   ├── privy.ts            — SERVER-ONLY: Privy token verification
│   ├── serverAuth.ts       — SERVER-ONLY: Get session from Privy cookies
│   ├── session.ts          — Session utils (getCurrentSession, hasRole, hasPermission, ensureRole)
│   └── types.ts            — TypeScript types (ChurchPublic, BeliefType, Claim, etc.)
├── contexts/
│   ├── AuthContext.tsx     — Privy auth context (client-side)
│   └── SessionContext.tsx  — User session context (server-provided)
├── hooks/
│   ├── useSession.ts       — Client-side auth state (wraps useAuth)
│   ├── useClaims.ts        — Claims list fetching (React Query)
│   └── useReviewClaim.ts   — Claim review mutation (React Query)
└── middleware.ts           — Auth guards for /developer/* and /admin/*
```

## Key Features

### 3D Globe (Homepage)
- WebGL globe via react-globe.gl showing 10K+ churches as pins
- Two color modes: belief type (Catholic/Protestant/Orthodox/Anglican/Other) and country
- Auto-rotate, zoom controls, click-to-navigate to church detail pages
- Data fetched via `/api/churches/search?for_globe=true`

### Church Explorer (/explorer)
- Leaflet map with supercluster pin clustering
- Filters: belief type, languages, service days/times, denomination, programs
- "Near Me" geolocation button
- URL param sync for filter persistence
- Paginated results with church cards

### MCP Server Chat (/mcp-server)
- OpenAI Responses API + remote MCP server at Zuplo `/mcp` endpoint
- Exposes `churches_search_v1` tool
- Shows tool calls and raw results in UI
- Rate-limited: 5 requests/min per IP

### Developer Portal (/developer)
- Requires Privy auth + `developer` role (checked via `api:access` permission)
- API key CRUD via Zuplo Dev API (create consumer → create key → store ref in Supabase)
- Max 5 active keys per user
- Profile management (display name, company, website, bio)

### Admin Dashboard (/admin)
- Church management: search, filter by status (approved/needs_review/rejected), edit details
- User management: assign roles (admin/support/editor/data_steward/developer) with audit logging
- Org claims review: approve/reject claims submitted from engage.global.church (admin + support)
- Role-based access via Privy auth + `roles` reference table with FK-constrained `user_roles`

## API Routes

**Public**: `/api/churches/search`, `/api/churches/[id]`, `/api/churches/geojson`, `/api/feedback`, `/api/request-access`, `/api/youtube/latest`, `/api/facebook/validate`

**Protected**: `/api/ask` (OpenAI MCP, rate-limited), `/api/auth/me` (GET, session/roles), `/api/admin/claims` (GET), `/api/admin/claims/review` (POST)

## Middleware

- Public paths: `/`, `/explorer`, `/schema`, `/api-docs`, `/mcp-server`, `/faq`, `/feedback`, `/methodology`, `/security-privacy`, `/request-access`, `/signin`, `/signup`, `/church/*`
- Protected: `/developer/*` → requires auth (redirect to `/signin`)
- Protected: `/admin/*` → requires auth + role checks at page level

## Environment Variables

- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy app ID (public)
- `PRIVY_APP_SECRET` — Privy app secret (server-only)
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL` — Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase (server-only, service role for all DB access)
- `API_URL`, `GC_API_KEY` — API gateway at api.global.church (key rotates every 90 days)
- `ZUPLO_DEV_API_KEY`, `ZUPLO_ACCOUNT_NAME`, `ZUPLO_BUCKET_NAME` — Zuplo Dev API for key management
- `OPENAI_API_KEY` — For /api/ask route
- `MCP_URL` — Remote MCP server endpoint
- `RESEND_API_KEY` — Email sending
- `EMAIL_FROM`, `REQUEST_ACCESS_RECIPIENT`, `FEEDBACK_RECIPIENT` — Email config
- `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY` — Analytics

## Supabase Tables

- **profiles** — Unified user profiles (id=Privy DID, email, display_name, company, website, bio)
- **roles** — Reference table (name PK, scope: platform/org, description, rank). FK target for user_roles and org_memberships
- **user_roles** — RBAC (user_id → profiles, role → roles, is_active, assigned_by). Unique on (user_id, role)
- **role_audit_log** — Audit trail for role grants/revocations (target_user, action, role, performed_by, reason)
- **api_keys** — Developer API keys (privy_user_id, zuplo_consumer_id, zuplo_key_id, key_hint, label, is_active)
- **org_memberships** — Org membership (user_email + user_id, org_uri, org_role → roles)
- **org_claims** — Org claim requests from onboarding
- **churches** — Church records (full ChurchPublic schema, admin_status, pipeline_status)
