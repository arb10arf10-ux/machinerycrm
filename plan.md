# Heavy Machinery CRM — Implementation Plan
## Scope and delivery sequence
Build the revenue path first, then add rentals, service, parts, dashboards, and integrations on top of shared account and asset data. The first slice is the foundation plus Accounts, Assets, and Opportunity Pipeline.
## Foundation decisions
- Default currency: USD.
- Locations represent branches, yards, and warehouses.
- Active staff can initially see all branches.
- Sales account visibility is owner-scoped; admins can see and manage all records. Operational roles retain access needed for workflows.
- Telematics is deferred to Phase 6.
- Import real CSV data after schema and templates are ready.
## Backend
Supabase Auth, Postgres, generated types, indexed relations, RLS for every exposed table, SQL fixtures and tests. Roles live in profiles; browser-provided role values must never be trusted.
## Frontend
React + TypeScript SPA with a sign-in screen, protected shell, left navigation, dashboard, Accounts, Assets, and Pipeline.
## Design
Graphite and warm off-white surfaces, amber primary actions, persistent navigation, monospaced serial numbers, status chips, Inter and IBM Plex Mono, short transitions.
## Validation
1. Apply and verify schema/security.
2. Generate types.
3. Typecheck/build.
4. Test sign-in and role-specific data access.
5. Smoke-test Accounts, Assets, Pipeline before deployment.
## Later phases
- Quotes: lines, trade-ins, approvals, computed totals, PDF and state transitions.
- Rentals: overlap constraints, checkout/check-in and billing.
- Service: work orders, scheduling, PM and warranty.
- Parts: inventory ledger, movements and reorder alerts.
- Dashboards/integrations: accounting export, email, then telematics.