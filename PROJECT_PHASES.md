# Project Execution Phases & Milestone Roadmap

**Project:** Bureaucracy & Dispute Advocate  
**Location:** `D:\projects\Bureaucracy and Dispute Advocate`  
**Team:** Harvey (Legal Lead), Lex (Backend & OCR), Mercury (Frontend Lead), Justitia (QA & Compliance)

---

## Phase 1: Core Foundation, Data Architecture & Privacy Engine [COMPLETED]
* **Objective:** Establish the development environment, Prisma database schema, and client-side zero-retention privacy safeguards.
* **Lead Specialists:** Lex (Backend) & Mercury (Frontend)
* **Key Deliverables:**
  1. **Next.js 15 App Scaffold:** Setup App Router (`src/app`), Tailwind CSS (`tailwind.config.ts`, `globals.css`), Lucide icons, clear & light base layouts, and split-screen studio.
  2. **Prisma ORM Initialization:** SQLite database (`dev.db`) initialized and synchronized with tables: `UserCase`, `Document`, `AuditLineItem`, `DisputeLetter`, and `TimelineEvent`.
  3. **Repository Pattern Abstraction:** Implemented decoupled `CaseRepository` (`src/lib/db/caseRepository.ts`) preventing tight database coupling.
  4. **Client-Side PII Masking Engine:** In-browser regex and canvas redaction for SSNs (`\d{3}-\d{2}-\d{4}`), bank routing/account numbers, and patient IDs before any server upload (`src/lib/ocr/redactor.ts`).
* **Exit Gate:** Clean build, initialized local database (`prisma/dev.db`), and verified zero-leak client redactor (`tests/verifyRedactor.js`).
* **Documentation Reference:** `docs/steps/STEP_01_CORE_FOUNDATION.md`, `docs/architecture/DATABASE_AND_REPO_PATTERN.md`, `docs/compliance/ZERO_PII_RETENTION_AUDIT.md`.

---

## Phase 2: Document Ingestion & Multimodal OCR Pipeline [COMPLETED]
* **Objective:** Ingest invoices, medical bills, and debt collection notices, converting unstructured PDFs/images into structured JSON entity trees with zero PII retention.
* **Lead Specialists:** Lex (Backend & OCR), Mercury (Frontend Lead), Justitia (QA Auditor)
* **Key Deliverables:**
  1. **Zod Normalization Schemas (`src/lib/ocr/schemas.ts`):** Complete typing for creditors, financial summaries, itemized CPT/HCPCS/Rev code charges, and statutory disclosures.
  2. **Multimodal OCR Extractor (`src/lib/ocr/extractor.ts`):** Stateless parser with zero-retention PII masking, code violation detection (CPT 99285 upcoding, CPT 99070 unbundling, Rev Code 0450), and FDCPA statutory disclosure audit.
  3. **Multipart Ingestion API (`src/app/api/documents/upload/route.ts`):** Server endpoint for file/text upload with automatic SQLite persistence via `CaseRepository`.
  4. **Document Dropzone UI (`src/components/DocumentDropzone.tsx`):** Drag-and-drop component with live client-side PII preview toggle and one-click demo presets.
  5. **Split-Screen Studio Integration (`src/app/studio/page.tsx`):** Dynamic synchronization between ingested documents and live dispute letter editor.
  6. **Automated Audit Suite (`tests/verifyOcrPipeline.ts`):** 21 compliance and assertion checks achieving 100.0% extraction accuracy and zero PII leakage.
* **Exit Gate:** 100.0% accuracy on sample medical bills and debt collection letters, clean Next.js production build (`npm run build`).
* **Documentation Reference:** `docs/steps/STEP_02_DOCUMENT_INGESTION_OCR.md`, `docs/api/OCR_AND_INGESTION_API.md`.

---

## Phase 3: Statutory Rules & Legal Dispute Engine [COMPLETED]
* **Objective:** Map real-world consumer grievances and overcharges to codified federal statutes to generate binding dispute demands.
* **Lead Specialists:** Harvey (Legal Lead), Lex (Backend Lead), Justitia (Compliance Auditor)
* **Key Deliverables:**
  1. **Dispute Types & Directives (`src/lib/disputes/types.ts`):** Defined statutory interfaces, directive options (`ceasePhoneCalls`, `demandItemizedLedger`, `citeStatutoryDamages`, `includeRegulatoryEscalation`, `disputeGrounds`), and compiled letter outputs.
  2. **FDCPA Debt Collection Module (`src/lib/disputes/fdcpa.ts`):** 15 U.S.C. § 1692g(b) debt validation demand, chain-of-title proof, accounting from $0, § 1692c(c) phone cease-and-desist, 30 calendar days SLA.
  3. **No Surprises Act Medical Auditor (`src/lib/disputes/noSurprises.ts`):** 42 U.S.C. § 300gg-111 & 45 CFR Part 149 Open Negotiation Notice, QPA ledger demand, CPT 99285 upcoding/99070 unbundling challenge, 30 business days SLA.
  4. **FCRA Credit Bureau Reinvestigation Module (`src/lib/disputes/fcra.ts`):** 15 U.S.C. § 1681i formal 30-day reinvestigation demand, § 611(a)(7) Method of Verification (MOV) demand, furnisher liability under § 1681s-2.
  5. **FTC Click-to-Cancel & EFTA Module (`src/lib/disputes/ftcClickToCancel.ts`):** 16 CFR Part 425 Negative Option Rule cancellation symmetry notice, 15 U.S.C. § 1693e preauthorized debit revocation, 10 business days SLA.
  6. **Master Dispute Router & Compiler (`src/lib/disputes/engine.ts`):** Master dispute compiler routing `ParsedDocumentData` and directives into formal certified mail demand letters.
  7. **Generation REST API (`src/app/api/disputes/generate/route.ts`):** POST endpoint persisting dispute letters into SQLite via `CaseRepository.createDisputeLetter` and advancing case status to `LETTER_GENERATED`.
  8. **Comprehensive Verification Suite (`tests/verifyDisputeEngine.ts` & `tests/verifyDisputeEngine.js`):** 60 automated statutory checks verifying citations, deadlines, zero PII retention, and database persistence with 100% pass rate.
* **Exit Gate:** 100% accuracy on all 4 statutory domains, verified database persistence, clean Next.js production build (`npm run build`).
* **Documentation Reference:** `docs/steps/STEP_03_STATUTORY_RULES_ENGINE.md`, `docs/api/DISPUTE_GENERATION_API.md`.

---

## Phase 4: Split-Screen Dispute Studio & PDF Export [COMPLETED]
* **Objective:** Deliver a seamless user experience where consumers can inspect their bill side-by-side with the generated legal demand and export court-ready legal documents.
* **Lead Specialists:** Mercury (Frontend Lead), Lex (Backend Lead), Justitia (QA Auditor), Harvey (Chief Legal Strategist)
* **Key Deliverables:**
  1. **Split-Screen Studio (`src/app/studio/page.tsx`):** Left pane displays source document with flagged line items; right pane displays court preview and raw editor with real-time statutory clause toggles, 1-click Certified PDF download, and formatted certified text copying.
  2. **Side-by-Side Synchronized Highlighting:** Bidirectional interactive highlighting between invoice charges and corresponding demand clauses.
  3. **Print Stylesheet Optimization (`src/app/globals.css`):** Dedicated `@media print` rules enforcing 0.75-inch legal margins and hiding all extraneous UI elements for native court filing prints.
  4. **Court-Ready PDF Generation Service (`src/lib/pdf/generator.ts`):** Pure JS (`pdf-lib`) generator producing standardized 8.5" x 11" US Letter documents with 0.75" legal margins, USPS Certified Mail™ tracking banner with simulated barcode, itemized charges table, statutory authorities index, regulatory alert container, and Certificate of Service under penalty of perjury (28 U.S.C. § 1746).
  5. **PDF Generation REST API (`src/app/api/disputes/pdf/route.ts`):** `POST /api/disputes/pdf` route generating binary PDF streams, linking to SQLite cases via `CaseRepository`, recording `PDF_EXPORTED` timeline events, and returning `application/pdf` with `Content-Disposition: attachment`.
  6. **Automated Audit Suite (`tests/verifyPdfExport.ts` & `tests/verifyPdfExport.js`):** 68 automated assertions verifying %PDF- magic headers, >10KB file size standards, 100% zero-PII retention, statutory citation preservation, and timeline audit logging across all 4 domains.
* **Exit Gate:** 100% test pass rate across all 68 assertions, Next.js 15 production build passing with 0 errors across 10 routes.
* **Documentation Reference:** `docs/steps/STEP_04_SPLIT_SCREEN_STUDIO_AND_PDF_EXPORT.md`, `docs/api/PDF_EXPORT_API.md`.

---

## Phase 5: Evidence Vault & Statutory Deadline Tracker [IN PROGRESS]
* **Objective:** Track dispute status, calculate legal response windows, and prepare regulatory escalations if opponents fail to reply.
* **Lead Specialists:** Lex (Backend & Data), Mercury (Frontend & UI), Justitia (Compliance & QA), Harvey (Legal Strategist)
* **Key Deliverables:**
  1. **Statutory Deadline Engine & Business Day Math (`src/lib/deadlines/`):**
     * 30-calendar-day countdown clock for FDCPA (15 U.S.C. § 1692g) and FCRA (15 U.S.C. § 1681i).
     * 30-business-day federal calculation for No Surprises Act Open Negotiation (42 U.S.C. § 300gg-111 & 45 CFR § 149.510(b)(1)), accounting for federal holidays and weekends.
     * 10-business-day statutory revocation window for EFTA (15 U.S.C. § 1693e) & FTC Click-to-Cancel (16 CFR Part 425).
  2. **Case Pipeline & Lifecycle State Machine:**
     * Status transitions: `DRAFT` -> `AUDITED` -> `LETTER_GENERATED` -> `SENT` -> `AWAITING_RESPONSE` -> `OVERDUE` -> `RESOLVED` / `REGULATORY_ESCALATION`.
     * Tracking USPS Certified Mail tracking numbers and actual mailing date timestamps.
  3. **Evidence Vault UI (`src/app/vault/page.tsx`):**
     * Comprehensive dashboard displaying all open cases, disputed amounts, remaining statutory countdown timers, and urgent deadline chips.
     * Filterable by status (`Active`, `Awaiting Response`, `Overdue`, `Resolved`).
     * Case detail modal / view displaying document history, dispute letters, timeline events, and postal receipts.
  4. **Regulatory Escalation Package Generator (`src/lib/escalations/` & `/api/escalations/`):**
     * 1-click regulatory complaint compiler generating formal complaints formatted for:
       - CFPB (Consumer Financial Protection Bureau Portal)
       - CMS / HHS (No Surprises Act Independent Dispute Resolution / Enforcement Portal)
       - FTC (ReportFraud.ftc.gov)
       - State Attorney General Consumer Protection Division
  5. **Verification & Audit Suite (`tests/verifyDeadlinesAndVault.ts`):**
     * Calendar vs. business day calculation proofs, state machine transition validation, regulatory export schema verification.
* **Exit Gate:** 100% automated test passage, full CRUD & lifecycle tracking in SQLite, clean Next.js build.
* **Documentation Reference:** `docs/steps/STEP_05_EVIDENCE_VAULT_AND_DEADLINE_TRACKER.md`.

---

## Phase 6: Production Polish, Security Hardening & End-to-End Walkthrough
* **Objective:** Rigorous audit of all statutory citations, prompt stability, security reviews, and build verification.
* **Lead Specialists:** Justitia (QA Auditor) & Harvey (Legal Lead)
* **Key Deliverables:**
  1. **Statutory Citation Audit:** Zero hallucinated case laws or statutes; strict alignment with official codified US Code titles.
  2. **Security & PII Leak Testing:** Automated tests verifying no unmasked PII is persisted in logs or database unencrypted.
  3. **End-to-End User Simulation:** Full walkthrough from uploading an inflated hospital bill to generating a validated dispute package.
* **Exit Gate:** Clean test suite pass, zero lint errors, production build ready for deployment.
