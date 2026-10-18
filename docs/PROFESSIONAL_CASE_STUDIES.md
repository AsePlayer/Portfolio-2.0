# Professional alignment and case-study update

Updated October 17, 2026. This report supersedes the earlier case-study reframing report and its outdated title/technology assumptions.

## Positioning and shared approach

The site retains **Ryan Scott — Data Operations & Business Systems**, with **Data Operations Coordinator · SEMA** as the current role. The supplied résumé’s positioning is **Data Operations | Business Systems | SQL & Salesforce**. Hero and homepage metadata remain professionally focused.

Hero copy: I turn complicated business rules, disconnected data, and manual workflows into reliable, repeatable processes across CRM, marketing, reporting, and operations.

The compact **Understand → Trace → Build → Validate** sequence remains. The thread is problem-solving, not an assertion that every job involved the same duties:

1. Understand the business requirements, workflow, and data relationships.
2. Trace behavior, reproduce issues, and investigate inconsistencies.
3. Build a practical solution with the tools the situation requires.
4. Validate the result, document the process, and make it dependable for continued use.

The career narrative connects pre-release QA investigation and fix verification, a customized Python/Google Sheets business application, and current SQL/CRM/data work. It does not attribute SQL to Knights or game development/deployment to MaxGames. Each professional card begins with its specific problem rather than repeating a résumé accomplishment. The details explain the reasoning and actual contribution, including operational limits and ongoing work.

Professional-work introduction: A CRM migration, a weekly Sales workflow, and a financial analysis call for different solutions. In each, I work from the business question, trace the underlying data or behavior, and build and validate something people can keep using.

Experience introduction: From testing game builds to building a Python business application and working across CRM systems, I carry the same habits forward: understand the requirements, trace the behavior, build a practical solution, and validate it for continued use.

The information architecture remains Hero → Selected Professional Work → Experience → Independent Projects → Credentials → Toolkit → Contact, with the existing navigation and section anchors.

## Updated Experience: exact copy

### SEMA (Specialty Equipment Market Association)

June 2025 – Present

**Data Operations Coordinator**

Independently designs and implements data processes supporting Sales, Marketing, Finance, and operations, including recurring workflow rebuilds during the NetForum-to-Salesforce/Nimble AMS transition.

### Knights of Creation

August 2022 – April 2025

**Business Solutions Developer**

Built a custom Python and Google Sheets application around a business owner’s purchasing, sales, earnings, and supply-tracking needs.

### MaxGames Studios

May 2015 – July 2022

**Quality Assurance & Release Testing — April 2017 – July 2022**

Tested pre-release builds and weekly game content, reproduced community-reported bugs, and documented steps and video evidence in Trello. Verified fixes and provided difficulty and gameplay-balance feedback before beta testing and public release.

**Volunteer QA Contributor — May 2015 – April 2017**

Contributed game testing and defect documentation before transitioning into a paid QA role.

The revised résumé supplies the canonical titles and employment year ranges. Ryan’s explicit brief supplies the more precise employment months. There is no longer an unresolved Knights title question.

## Final six case studies: exact visible and expanded copy

Each default card contains context, title, summary, and tools. **Read case study** expands Challenge / My contribution / Approach / Result; the underlying JSON fields remain `challenge`, `role`, `approach`, and `outcome`.

### 1. CRM Migration & Reporting Rebuild

Context: SEMA · Migration & reconciliation

A new CRM changed the structure behind familiar reports. I rebuilt recurring processes around Salesforce/Nimble AMS while tracing legacy logic and reconciling converted data.

Tools and methods: SQL · SOQL · Salesforce · Nimble AMS · NetForum · Excel

**Challenge:** Recurring reports carried business rules from NetForum that could not simply be copied into Salesforce/Nimble AMS. The same business questions had to be answered against different records, identifiers, and relationships.

**My contribution:** I rebuild recurring reporting processes, validate converted records, and investigate discrepancies as part of the broader CRM transition.

**Approach:** Start with what the legacy process was meant to do, then trace its logic and data relationships. Compare records across systems, investigate conversion discrepancies, and rebuild the reporting workflow against the new model. Validate the results and adapt the process as migration requirements change.

**Result:** Recurring reports have been rebuilt for the new environment, while reconciliation and validation continue as the migration evolves.

### 2. Marketing Data Automation & Segmentation

Context: SEMA · Recurring data processes

Audience rules were spread across data sources and recurring requests. I turned that work into reusable SQL processes for segmentation, exclusions, refreshes, and validation.

Tools and methods: SQL · iPost · Salesforce · Excel · Power Query · Data Quality

**Challenge:** Marketing and operational requests draw on CRM, membership, exhibitor, and council/network information. Eligibility rules, suppression logic, and source data need to stay consistent across recurring refreshes.

**My contribution:** I build and maintain hundreds of SQL queries and recurring data processes supporting marketing segmentation, operational reporting, and data quality.

**Approach:** Translate each business requirement into explicit selection and exclusion logic. Trace how the source records relate, build reusable SQL processes, and validate audience eligibility and data quality. Maintain the refreshes and checks as business requirements change.

**Result:** Recurring audience and reporting work runs through reusable processes with consistent rules and validation, giving business teams a dependable basis for ongoing operations.

### 3. Weekly Sales Lead Reporting Automation

Context: SEMA / Sales · Weekly workflow automation

Weekly Sales lists began with manual exports, deduplication, and assembly. Scheduled FTP delivery now supplies the data, and I use a VBA macro to prepare the output before distributing it.

Tools and methods: FTP · VBA · Excel · Reporting

**Challenge:** Weekly lead preparation started with manually exporting email opens and clicks, combining and deduplicating the engagement data, and assembling usable lists for Sales.

**My contribution:** I changed the preparation workflow to use scheduled FTP exports and VBA processing. I still prepare and distribute the weekly output.

**Approach:** Traced the path from email engagement data to the weekly Sales list to identify the manual preparation steps. Replaced manual source exports with scheduled FTP delivery and introduced a VBA macro to format and prepare the output. I run that preparation and distribute the results each week.

**Result:** Source data arrives automatically and the VBA-assisted workflow is used weekly. I handle final preparation and distribution.

### 4. Accounts Receivable Aging Reporting

Context: SEMA / Finance · Transactional analysis & validation

A positive order balance can hide a different picture at the line level. I work through bundles, payment rollups, and balance exceptions to develop and validate usable aging reports for Finance.

Tools and methods: Salesforce · Nimble AMS · Reporting · Reconciliation · Validation

**Challenge:** Order-level balances do not tell the whole story of outstanding receivables. Bundled transactions, payment rollups, and positive overall balances with negative underlying lines complicate what should appear in an aging report.

**My contribution:** I develop and validate receivables reporting against Salesforce/Nimble AMS transactional data, translating Finance’s needs into reporting logic.

**Approach:** Work from the financial question back through Order Item and Order Item Line relationships. Reconcile order and line balances, examine bundle behavior and payment rollups, and validate how reporting exceptions affect the outstanding receivables shown.

**Result:** Finance’s requirements are being translated into explicit reporting logic grounded in the transactional relationships. Development and validation continue as balance and rollup exceptions are worked through.

### 5. Event Operations Workflow Improvement

Context: SEMA · Workflow design & documentation

A recurring booth-selection workflow kept bringing staff back for technical help. I simplified the reporting and data-handling steps and documented a process they could run more independently.

Tools and methods: Reporting · Workflow Design · Documentation · Process Improvement

**Challenge:** Staff needed to complete recurring booth-selection tasks, but the reporting and data-handling workflow depended on repeated technical assistance.

**My contribution:** I redesigned booth-selection reporting and documented a repeatable workflow for the nontechnical staff using it.

**Approach:** Worked through the existing procedure from the staff’s perspective to understand what each step needed to achieve. Simplified the reporting and data flow, organized the recurring steps, and documented how to run the process.

**Result:** Nontechnical staff can complete recurring tasks with less technical assistance, using a more structured and documented workflow.

### 6. Membership & Financial Analysis

Context: SEMA · Analysis & decision support

National and chapter membership data needed to be read together to understand alignment and gain/loss. I reconciled those relationships and organized the financial and operational findings for stakeholders.

Tools and methods: SQL · Excel · Power Query · Data Analysis · Financial Analysis · Reporting

**Challenge:** National and chapter membership relationships are complex. Alignment and gain/loss patterns need to be interpreted together with their financial implications before the data can support a useful discussion.

**My contribution:** I analyzed membership relationships, organizational alignment, and net gain/loss, then prepared reporting that stakeholders could interpret.

**Approach:** Start with the alignment question, reconcile membership relationships, and compare the gain/loss patterns. Connect those findings to the financial and operational analysis, then organize the detail into reporting that makes the relationships understandable.

**Result:** Stakeholders received an interpretable view of membership alignment, gain/loss patterns, and their financial implications to support discussion and decisions.

## Résumé and professional accuracy

The provided finalized PDF was read as a one-page document and visually inspected. It replaces `data/Ryan Scott Resume.pdf` exactly; all three existing download links retain their paths and safe new-tab behavior. The public PDF was subsequently updated on October 18, 2026 to omit the phone number. Future public versions must also omit it from visible and extracted text, metadata, and links, as well as public JSON/HTML.

Current public PDF SHA-256 (verified against the live download on October 18, 2026): `f79edb3082a41033a7a656aeac372657160b2b3de07c67a438e801b3a2b3324e`.

Corrections from older content:

- Knights: **Business Solutions Developer** and **Python/Google Sheets**. Removed the unsupported SQL/ETL description and the old unresolved-title note.
- MaxGames: **Quality Assurance & Release Testing**, with accurate paid/volunteer dates, pre-release testing, community defect reproduction, Trello/video documentation, fix verification, and balance feedback. Removed live-operations wording that could imply deployment or infrastructure responsibility.
- Sales: replaced internal lead terminology and generic qualification-system language with the actual weekly workflow: scheduled FTP exports, VBA-assisted preparation, and Ryan’s distribution. No predictive scoring, real-time intelligence, or fully unattended process is asserted.
- Receivables: names the public business problem and includes order/line relationships, bundles, payment rollups, exceptions, and continuing validation. No completed production rollout is asserted.
- Marketing: the “hundreds” scale is supported by the supplied résumé; it refers to the collection of SQL queries/data processes, not a new fabricated count of users or business impact.
- Toolkit: added Google Sheets, replaced forecasting with reporting, and replaced Apex emphasis with workflow automation. Generic ETL remains supported by the résumé’s skills; it is not attributed to Knights.

The public identity, employment history, core tools, and accomplishments align with the supplied résumé and the user’s LinkedIn clarifications. LinkedIn itself was not edited, and its live text could not be independently verified through automated access (HTTP 999). No claim is made that the remote LinkedIn profile was changed or audited. Salesforce Data 360 remains certified knowledge. Certified ScrumMaster is retained because the brief explicitly requests it, although it is absent from the supplied one-page résumé.

## Independent Projects and omitted material

Back-Fixer-Upper, So What We Eating?, and AsePlayer retain their existing ready-to-view cards and product/creative framing. Their descriptions and links were inspected and left unchanged. Both embedded apps launch in the browser and return to `/#projects`. So What We Eating? remains described as location-aware with real menu prices, consistent with its AllMenus/Photon production implementation. No consumer-app themes were added to homepage SEO.

Music Library Manager and Mr. Nugs were not added: this repository does not establish their current public-demo readiness or provide a verified showcase destination. The self-referential Portfolio Website card remains omitted. The three alternate professional studies remain unfeatured in the data model. Magazine Circulation remains absent from the featured selection.

No proprietary screenshots, fictional dashboards, queries, schemas, raw financial/member/customer data, internal URLs, sensitive identifiers, rule thresholds, or private source files were introduced. No new savings, dollar amounts, percentages, revenue/conversion gains, user counts, dataset sizes, or performance claims were invented. Membership figures remain confidential; the case describes the analytical method and qualitative reporting result. No new ownership of organization-wide strategy or migration leadership is claimed.

## Files changed

- `data/site.json`: problem-led case-study copy, precise/corrected Experience, shared career narrative, supported toolkit, and professional SEO descriptions/knowsAbout.
- `data/Ryan Scott Resume.pdf`: exact replacement with the supplied finalized PDF.
- `scripts/render-site.mjs`: visible disclosure labels changed to My contribution and Result; native behavior and schema structure preserved.
- `scripts/site.test.mjs`: existing label/headline assertions updated and an arbitrary fixed skill count replaced with the existing compact-group constraint. Suite remains 19 tests; no new static-copy suite.
- `README.md`: current titles, tools, narrative, case lineup, source-of-truth and validation guidance.
- `docs/PROFESSIONAL_CASE_STUDIES.md`: this updated implementation report, including exact copy and factual boundaries.
- `index.html`: generated through the existing build from content and renderer.

CSS, browser JavaScript, templates, validation architecture, dependencies, Pages workflow, independent project descriptions/links, and embedded app source/generated bundles were not changed.

## Validation and build

- `node --test scripts/site.test.mjs`: **19 passed**.
- `node scripts/build.mjs`: **passed**; substantive content and metadata are prerendered into root HTML and `dist/`.
- `node scripts/validate-site.mjs`: **passed**; checks content, schema, anchors, assets, privacy, PDF validity, structured data, freshness, and artifact consistency.
- Local preview using `node scripts/serve.mjs`: **passed**.
- Chrome/Playwright browser verification: **20 width/theme combinations** at 320, 375, 390, 600, 768, 860, 861, 1024, 1200, and 1440px in light/dark mode. No overflow or header collisions; existing layout and theme persistence preserved.
- All six disclosures at 1440 and 390px: Enter opens, Space closes, visible focus retained, independent expansion. Native expansion also works without JavaScript.
- All six section navigation links, focus destinations, mobile menu/Escape, and skip link: **passed**.
- All three résumé links returned valid PDFs matching the supplied PDF’s SHA-256, not just its filename: **passed**.
- Both embedded app launches and return links: **passed**; no service worker controlled the portfolio home page after return.
- GitHub and YouTube returned **200**. LinkedIn returned **999** and Trailhead **403**, so those unchanged profile destinations require a normal manual visit for full remote verification.
- Browser error collection: **none**. Local evidence is in ignored `.tmp/professional-alignment-local/`.

The browser harness is an ignored verification aid, not a new committed static-copy test suite. The unchanged deployment pipeline continues to run its regular app tests/builds.

## Next iteration

Verify LinkedIn in a normal signed-in browser against the now-resolved titles and date ranges. As receivables work matures, update its result only when completion/validation evidence supports it. Rotate in an alternate professional study when it has a distinct, documented story rather than expanding the section into a work log. Add independent software only with a public-ready demo or source destination. Any future professional visual should be explicitly public-safe and clearly identified as illustrative if it is not an actual artifact.
