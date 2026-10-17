# Professional case-study reframing

Implemented October 17, 2026 in the existing Portfolio-2.0 repository. This is a content and positioning pass using the existing typography, colors, theme system, responsive shell, accessibility enhancements, prerenderer, and Pages workflow.

## Files changed

- `data/site.json`: professional case-study data, compact Experience, shorter navigation labels, and professional SEO descriptions. Independent projects, hero identity, credentials, and toolkit remain intact.
- `scripts/render-site.mjs`: six case-study cards, native disclosures, and a flat featured-work ItemList linked to Person JSON-LD.
- `css/styles.css`: scoped card/disclosure layout using existing design tokens; summary focus styling; obsolete capability selectors removed.
- `scripts/validate-content.mjs`: validates featured/unfeatured case-study fields, six featured items, concise copy, and valid rendered destinations.
- `scripts/validate-site.mjs`: verifies prerendered case-study details, disclosure counts, unfeatured exclusion, and structured data alongside existing checks.
- `scripts/site.test.mjs`: updates existing tests for the content model and disclosure markup while retaining escaping, privacy, URLs, résumé, credentials, SEO, and role-accuracy coverage.
- `README.md`: current editing, schema, behavior, and validation documentation.
- `index.html`: generated with the existing build; never manually edited.
- `docs/PROFESSIONAL_CASE_STUDIES.md`: this implementation report.

No embedded app source/snapshots, résumé PDF, project links, deployment workflow, template shell, or browser JavaScript were changed.

## Final information architecture

Hero → Selected Professional Work → Experience → Independent Projects → Credentials → Toolkit → Contact.

Visible navigation: Work · Experience · Projects · Credentials · Toolkit · Resume · Contact. Existing section anchors and all three direct résumé links remain.

The hero establishes Ryan Scott / Data Operations & Business Systems, with Data Operations Coordinator · SEMA. Its Understand → Trace → Build → Validate sequence connects the QA → software development → data operations career progression to the case studies.

## Exact final card and expanded copy

Only the following six studies are featured. All text below is copied directly from `data/site.json` for this implementation report.

### 1. CRM Migration & Reporting Rebuild

Context: SEMA · Migration & reconciliation

Supported the move from NetForum to Salesforce/Nimble AMS by validating converted data, reconciling relationships, and rebuilding recurring reporting processes.

Tools and methods: SQL · SOQL · Salesforce · Nimble AMS · NetForum · Excel

Disclosure: **Read case study** (accessible name includes the title).

**Challenge:** Legacy reports depended on data structures and business logic that did not translate directly into the new CRM. Converted records and relationships needed to be checked before recurring processes could rely on them.

**Ryan’s role:** Supported migration validation, investigated discrepancies, and rebuilt recurring reports and processes for the new environment.

**Approach:** Traced legacy reporting logic, compared records across systems, and reconciled identifiers and relationships. Adapted the reporting work as mapping and conversion requirements changed.

**Outcome:** Recurring reporting processes were rebuilt against Salesforce/Nimble AMS, with conversion discrepancies and relationship issues investigated to support operational use.

### 2. Marketing Audience Automation Ecosystem

Context: SEMA · Automation & data quality

Built and maintained recurring SQL-driven audience processes connecting CRM, membership, exhibitor, council/network, and marketing data, with consistent segmentation, exclusions, refreshes, and validation.

Tools and methods: SQL · iPost · Salesforce · Excel · Power Query · Data Quality

Disclosure: **Read case study** (accessible name includes the title).

**Challenge:** Recurring campaigns drew on fragmented sources and changing eligibility rules. Isolated audience requests made it difficult to keep segmentation, suppression, and email hygiene consistent.

**Ryan’s role:** Built and maintained recurring audience and data workflows supporting marketing operations.

**Approach:** Translated campaign requirements into maintainable SQL processes, standardized segmentation and exclusion logic, and incorporated recurring refreshes, email-hygiene checks, validation, and operational monitoring.

**Outcome:** Campaign support became a repeatable data-operations workflow, with more consistent audience rules and refresh checks across recurring processes.

### 3. AR Aging Reporting Architecture

Context: SEMA / Finance · Reporting architecture & validation

Translates Finance’s AR Aging needs into Salesforce/Nimble reporting logic, working through order-versus-line granularity, bundle behavior, and balance exceptions to validate meaningful outstanding receivables.

Tools and methods: Salesforce · Nimble AMS · Reporting · Business Rules · Validation

Disclosure: **Read case study** (accessible name includes the title).

**Challenge:** Order balances and their underlying lines can tell different stories. Bundles and negative lines beneath positive overall balances complicate which receivables should appear in an aging report.

**Ryan’s role:** Investigates transactional relationships and develops and validates the reporting logic with Finance’s reporting needs in view.

**Approach:** Works through Order Item and Order Item Line granularity, checks bundle behavior and balance exceptions, and tests what should surface as outstanding receivables.

**Outcome:** The investigation has clarified the order-versus-line and balance-exception decisions needed for usable AR Aging reporting. Those decisions are being validated against Finance’s needs.

### 4. ESRA Warm/Hot Lead System

Context: SEMA / Sales · Sales operations & automation

Improved and maintained a repeatable Warm/Hot lead process that turns business and engagement data into qualified Sales outputs through refined refresh logic, qualification rules, and automation.

Tools and methods: SQL · Automation · Segmentation · Reporting · Sales Analytics

Disclosure: **Read case study** (accessible name includes the title).

**Challenge:** Business and engagement data needed to become useful Sales information through qualification rules and a consistent recurring refresh process.

**Ryan’s role:** Improved and maintained the operating lead process, its reporting structure, and supporting automation.

**Approach:** Refined recurring refresh logic and qualification rules, structured the Warm/Hot lead outputs, and improved repeatability while continuing to refine the process.

**Outcome:** An operating, repeatable process supplies qualified Warm/Hot lead information to Sales, with more consistent refreshes and supporting automation.

### 5. Booth Space Selection Process Overhaul

Context: SEMA · Workflow design & documentation

Redesigned recurring booth-space-selection reporting into a structured, documented workflow that nontechnical staff could operate with less repeated technical intervention.

Tools and methods: Reporting · Workflow Design · Documentation · Process Improvement

Disclosure: **Read case study** (accessible name includes the title).

**Challenge:** A troublesome recurring reporting process depended on repeated technical intervention and needed a clearer workflow for the staff using it.

**Ryan’s role:** Redesigned the reporting process and documented how staff could operate it.

**Approach:** Worked through the existing workflow, improved its reporting and data flow, and organized the recurring steps into a documented, repeatable process.

**Outcome:** Nontechnical staff could operate more of the process themselves, with a clearer workflow and less dependence on repeated technical support.

### 6. Membership Alignment & Financial Analysis

Context: SEMA · Operational analysis & decision support

Analyzed national and chapter membership relationships, gain/loss patterns, and associated financial impact, turning complex membership data into reporting stakeholders could interpret and use.

Tools and methods: SQL · Excel · Power Query · Data Analysis · Financial Analysis · Reporting

Disclosure: **Read case study** (accessible name includes the title).

**Challenge:** Complex national and chapter membership relationships made alignment and net gain/loss patterns difficult to interpret alongside their financial implications.

**Ryan’s role:** Analyzed membership alignment and financial impact, then translated the findings into stakeholder reporting.

**Approach:** Examined national and chapter relationships, compared alignment and gain/loss patterns, and organized the financial analysis into interpretable reporting.

**Outcome:** Stakeholders gained a clearer view of membership alignment, gain/loss patterns, and their associated financial impact to support decisions.

## Compact Experience

- **SEMA (Specialty Equipment Market Association)**, June 2025 - Present: Data Operations Coordinator — Data operations, business systems, CRM migration, automation, reporting, analysis, and data quality.
- **Knights of Creation**, 2022 - 2025: Software Developer — SQL/Python tooling, internal software, ETL, automation, and operational systems.
- **MaxGames Studios**, 2015 - 2022: Quality Assurance & Live Operations Support (2017 - 2022) — Regression testing, defect reproduction, fix validation, and live-service support. Volunteer QA Contributor (2015 - 2017) — Game-system testing and reproducible defect documentation.

SEMA’s former paragraph no longer repeats migration, audience, reporting, and data-quality accomplishments. Knights is one short descriptor. MaxGames retains its two supported role periods with one short sentence each, preserving the volunteer-to-paid progression and the QA foundation.

## Independent projects and supporting proof

Independent Projects retains its own introduction, “Things I build outside of work.”, and three ready-to-view projects: Back-Fixer-Upper, So What We Eating?, and AsePlayer. Product stories, types, technologies, channel snapshot, and destinations remain intact. No artificial professional relevance or unfinished Music Library Manager/Mr. Nugs cards were added. The self-referential Portfolio Website card remains omitted.

Credentials retain Salesforce Certified Data 360 Consultant, B.S. Computer Science (Cum Laude), Certified ScrumMaster, and supporting Trailhead learning. Data 360 implementation experience is not asserted. The toolkit stays at four compact groups.

## UI behavior

Each card contains a native `details/summary` disclosure with a unique accessible name. Its four detail fields are already in the HTML. Enter or Space toggles the focused summary; the focus indicator remains visible; no JavaScript is required. Disclosures operate independently. Cards use two columns above 600px and one at/below 600px, with the existing design tokens. There are no new project routes, dependencies, or content fetches.

## Evidence and deliberately omitted claims

The user’s professional reframing brief supplies the six work narratives. Existing `data/site.json`, README, and the bundled résumé support current roles, dates, tool familiarity, and QA/software/data progression. The prior three alternate examples preserve their existing supported summaries and scales with `featured: false`; they are not published as page cards or structured case studies. Magazine Circulation is absent from the source selection and generated page.

AR Aging is presented as active transactional investigation, reporting development, and validation. No independent work documentation here verifies a completed production rollout, so neither a final launch nor completion metric is claimed. ESRA is an operating, improved process rather than a hypothetical future project.

No new percentages, dollar savings, hours saved, revenue/conversion impact, adoption counts, dataset sizes, or performance gains were invented. No proprietary screenshots, queries, schemas, raw data, internal URLs, account records, financial figures, or private rule thresholds were introduced. CRM migration wording stays at support/validation/rebuild rather than ownership of the entire migration. Booth tags use supported workflow/reporting methods rather than guessing implementation tools. AR tags omit SQL/SOQL and ESRA tags omit iPost/Power Query because project-specific usage was not established by the available evidence.

## Validation

- `node --test scripts/site.test.mjs`: **19 passed**. Obsolete capability-only tests were replaced/consolidated; existing safety, metadata, and content-pipeline coverage remains.
- `node scripts/build.mjs`: **passed**; root `index.html` and `dist/` generated from JSON/templates.
- `node scripts/validate-site.mjs`: **passed**; source/artifact freshness, all six full case studies, structured data, anchors/assets, privacy, PDF, and deployment architecture.
- Local preview via `node scripts/serve.mjs`: **passed**.
- Chrome/Playwright manual-verification harness in ignored `.tmp/professional-case-study-qa.mjs`: **passed** at 1440, 1200, 1024, 861, 860, 768, 600, 390, 375, and 320px in light and dark mode (20 combinations), with reduced motion enabled. No overflow or header collisions.
- All six disclosures: Enter opens, Space closes, focus remains visible and retained, and multiple studies expand independently, checked at 1440 and 390px. Native expansion also passed with JavaScript disabled.
- All six section navigation destinations, focus movement, mobile menu closing/Escape, skip link, and theme persistence: **passed**.
- All three direct résumé links returned a valid PDF; both embedded app cards launched their full apps and returned to `/#projects` without a service worker controlling the homepage: **passed**.
- GitHub and YouTube external destinations: HTTP **200**. LinkedIn: **999** automated-access restriction. Trailhead: **403** automated-access restriction. Existing URLs were retained; these two profiles need a normal browser visit for full remote verification.
- Browser error collection: **none**. Screenshots and QA JSON are in ignored `.tmp/professional-case-study-qa/`.

No embedded app implementation changed, so app-internal behavioral suites were not broadened for this content pass; the unchanged deployment workflow continues to run its normal app tests/build.

## Unresolved title discrepancy

**Knights of Creation remains Software Developer**, as currently stored and shown in the bundled résumé. LinkedIn is reported to use **Solutions Architect**. Ryan must choose the accurate canonical title; this implementation does not guess or silently change it.

## Recommended next pass

Resolve the Knights title across the portfolio, LinkedIn, and résumé. As professional projects mature, verify specific completion states and project-specific tool usage before strengthening their outcomes. Rotate a fully documented alternate into the six rather than adding every accomplishment. Revisit Magazine Circulation only after it reaches a clear completed state. Add Music Library Manager or Mr. Nugs only when there is a public-ready destination.
