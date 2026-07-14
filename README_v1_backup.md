# Connector Command Center

A prototype PM tool for thinking through connector ecosystem design in a DSPM platform — built to explore the product decisions that sit beneath a "300+ connectors" headline.

Built with React + Vite + Tailwind. Data is CSV-backed (no backend) so the full lifecycle — connector health, multi-tenant version tracking, certification pipeline, staged rollout — runs in the browser.

---

## Why I Built This

Enterprise DSPM platforms depend on connectors as foundational infrastructure. Every pillar — security posture, governance, compliance, privacy — is only as reliable as the connector layer feeding it. Yet connector ecosystems are often managed reactively: a customer reports a broken integration, and the team scrambles.

This prototype is a working model of how I'd think about the PM problem space: what does a proactive connector operating rhythm look like? How do you design observability in from day one, not bolt it on after? How do you govern a growing library — first-party, partner, and customer-built connectors — without every connector becoming its own engineering project?

Three views, each representing a distinct stakeholder concern.

---

## Three Views

### 1. Customer Console — Tenant-Facing Health and Onboarding

> *What does a Meridian Health admin actually need to see?*

The Customer Console is scoped to a single tenant (Meridian Health, Enterprise/US-East). It shows only what that tenant's data pipeline touches — not fleet-wide data, not other tenants.

**What it surfaces:**

- **KPI header** — four metrics across all installed connectors: adoption rate, scan success rate, time-to-first-scan, and classification completeness. These are the metrics that tell you whether the connector layer is actually working, not just running.
- **DataFlow Sankey** — a live diagram of how data moves from source systems through Collect → Scan → Classification → Route into the platform indices. Makes the "connector as pipeline stage" mental model visible rather than implicit.
- **Connector tiles** — each installed connector shows its health status, current version, and whether the tenant is up to date with the latest release.
- **Available tab** — certified connectors that have been launched to this tenant but not yet installed. Launch and installation are separate decisions (see Marketplace below).
- **Connector detail** — per-connector pipeline diagram, cumulative volume chart, classification findings, regulatory framework mapping, activity timeline, and AI-assisted classification rules. Clicking through to a degraded connector should immediately show which pipeline stage is failing and why.

![Customer Console — Meridian Health tenant view with KPI header, DataFlow Sankey, and installed connector tiles](docs/screenshots/customer-console.png)

![Connector Detail — pipeline stages, classification findings, compliance risk panel, and activity timeline](docs/screenshots/connector-detail.png)

---

### 2. Ops Console — Internal Fleet Management

> *How does the connector team track version currency and customer distribution across the full library?*

The Ops Console is the internal view — the view a connector PM or release engineer would live in. It shows the entire connector fleet across all customers.

**Key design decisions:**

**Version-per-tenant tracking.** Enterprise customers don't all move to a new connector version simultaneously. The Ops Console shows, for every connector version, exactly which customers are running it. This makes "how many customers are on the latest version?" an answerable question, not an estimate.

**4-tier connector classification.** Every connector in the library is assigned a cert tier based on the kind of change it typically requires:

| Tier | Type | Release Cadence | Risk |
|------|------|-----------------|------|
| Tier 1 | Parser-only | Weekly | Low |
| Tier 2 | Schema change | Bi-weekly | Low |
| Tier 3 | Auth / API change | Monthly | Medium |
| Tier 4 | Framework-level | Quarterly | High |

The insight behind this: treating all connector updates as equivalent creates hidden coupling. A trivial parser fix and a framework-level refactor queued in the same monthly cycle means the parser fix waits — and customers feel it. The tier model decouples update frequency from update risk. High-frequency, low-risk changes (parser adjustments when a vendor tweaks their log format) can ship weekly; framework changes that could affect every downstream pipeline get a full regression cycle.

**Health and adoption per version.** Every version row shows adoption rate (% of eligible customers who updated) and scan success rate. A connector where adoption is 30% on the current version is a maintenance story, not a success story.

![Ops Console — fleet-wide connector table with per-version breakdown, tenant-to-version mapping, and cert tier classification](docs/screenshots/ops-console.png)

---

### 3. Marketplace — Connector Certification and Staged Rollout

> *How do you let partners and customers extend the connector library without every submission becoming a support burden?*

The Marketplace models the full lifecycle of a connector submission from intake to GA.

**Creator types.** The model distinguishes three creator types with different trust levels and review requirements:
- **First-party** — built and maintained by the platform team
- **Partner** — built by a certified integration partner (e.g. DataNimbus, CloudBridge Systems, Workday Alliance Program)
- **Customer-built** — built by a customer for their own environment, optionally shared with the broader community

This distinction matters for certification gate requirements and SLA commitments.

**Certification gates.** Each submission goes through a structured gate review before it can be launched: schema validation, auth pattern compliance, security review, and documentation completeness. Certification and launch are intentionally separate decisions.

**Staged rollout.** A certified submission can be launched to all customers at once, or to a hand-picked subset first. This lets the connector team do a soft launch — pick two or three early-adopter tenants, run for two weeks, then expand to all. The Marketplace UI models both paths and lets an expansion-to-all happen from the same screen.

![Marketplace — submission pipeline with certification gate status, creator type badges, and staged rollout controls](docs/screenshots/marketplace.png)

---

## Data Model

The app is backed by CSV files under `public/data/` — no backend, no API calls. All joins and computed views happen in `src/data/loadData.js` and `src/data/model.js`.

**Entities:**
- `connectors.csv` — connector library with health, scan depth, cert tier, auth pattern, and aggregate metrics
- `connector_versions.csv` — version history per connector with lifecycle stage and per-version metrics
- `version_tenants.csv` — which tenants are running which version (many-to-many)
- `tenants.csv` — tenant registry with tier (Enterprise / Mid-Market) and region
- `connector_events.csv` — event log: per-run pipeline stages (Collect / Scan / Classification / Route) with phase (started / completed / error), volume counts, and lifecycle events
- `marketplace_submissions.csv` — submission registry with cert status and creator metadata
- `marketplace_gates.csv` — per-gate status for each submission

**Key computed functions in `model.js`:**
- `pipelineForConnector()` — derives pipeline stages based on scan depth; metadata-only connectors (identity systems) skip Classification and land directly in the Metadata Index
- `versionForTenant()` — customer-safe version lookup that never exposes other tenants' data
- `groupEventsIntoRuns()` — assembles raw events into structured runs with derived status
- `regulatoryFrameworksForFindings()` — maps classification findings + tenant region to triggered regulatory frameworks (HIPAA, GDPR, CCPA, GLBA, PDPA)
- `platformMetrics()` — fleet-level KPI aggregation, excluding metadata-only connectors from classification completeness average
- `isLaunchedForTenant()` — enforces the certification ≠ launch separation

---

## Connector Library (12 connectors across 4 tenants)

| Connector | Category | Deployment | Auth | Cert Tier | Scan Depth |
|-----------|----------|------------|------|-----------|------------|
| Amazon S3 | Cloud Object Store | Cloud | Service Account | Tier 3 | Full |
| Azure Blob Storage | Cloud Object Store | Cloud | OAuth 2.0 | Tier 3 | Full |
| Snowflake | Data Warehouse | Cloud | OAuth 2.0 | Tier 2 | Full |
| Google BigQuery | Data Warehouse | Cloud | Service Account | Tier 2 | Full |
| SharePoint Online | SaaS Collaboration | Cloud | OAuth 2.0 | Tier 3 | Full |
| Google Drive | SaaS Collaboration | Cloud | OAuth 2.0 | Tier 2 | Full |
| Slack | SaaS Collaboration | Cloud | OAuth 2.0 | Tier 2 | Full |
| PostgreSQL | Database | Hybrid | Certificate (mTLS) | Tier 3 | Full |
| MongoDB Atlas | Database | Cloud | API Key | Tier 2 | Full |
| Workday | Identity | Cloud | OAuth 2.0 | Tier 4 | Metadata only |
| Active Directory | Identity | On-prem | Certificate (mTLS) | Tier 3 | Metadata only |
| NFS File Share | On-Prem File System | On-prem | API Key | Tier 1 | Full |

Four auth patterns modeled: OAuth 2.0 (delegated consent, refresh-token rotation), API Key (static credential, tenant-scoped), Service Account (IAM role binding, no shared secret), Certificate / mTLS (per-deployment issued).

---

## PM Design Decisions Worth Calling Out

**Observability is scoped by audience.** The Customer Console and Ops Console share the same underlying data but surface different views. A customer admin sees their own tenant's pipeline health; a connector PM sees fleet-wide version distribution. The data model enforces this separation — `eventsForConnectorAndTenant()` filters to one tenant's runs plus platform-wide events, never another tenant's data.

**Failure isolation in pipeline runs.** When a run hits an error in the Collect stage, Scan, Classification, and Route never start. The `stagesForRun()` function models this explicitly — it stops building the stage list at the first error. This makes the observability truthful: a failed run shows exactly where and why it failed, without false "skipped" states.

**Classification completeness excludes metadata-only connectors.** Identity connectors (Workday, Active Directory) don't classify content — they index users, groups, and entitlements. Including them in a classification completeness average would silently drag the metric down for reasons unrelated to content scanning quality. The `platformMetrics()` function filters them out with an explicit comment explaining the exclusion.

**Regulatory mapping is illustrative, not prescriptive.** The compliance panel shows which frameworks are triggered by classification findings and tenant region — HIPAA for PHI, GDPR for EU-West data, CCPA for US-West/US-East, GLBA for financial data. It's labeled "illustrative regulatory-framework mapping (not legal guidance)" in the code, which is the right boundary for a PM tool vs. a legal compliance system.

---

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. All data loads from the CSV files in `public/data/` — no environment variables or API keys required.

---

*Built by Kousalya Naidu · July 2026*
