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

## Phase 2: Document Ingestion & Multimodal OCR Pipeline [UPCOMING]
* **Objective:** Ingest invoices, medical bills, and debt collection notices, converting unstructured PDFs/images into structured JSON entity trees.
* **Lead Specialists:** Lex (Backend & OCR) & Justitia (Compliance Auditor)
* **Key Deliverables:**
  1. **Upload Dropzone & File Handlers:** Drag-and-drop multi-page PDF and image upload with thumbnail preview.
  2. **Multimodal Vision OCR Extractor:** Structured schema extraction identifying:
     - Creditor / hospital name, address, and account reference.
     - Line items: procedure codes (CPT/HCPCS), descriptions, charged amounts, and dates of service.
     - Regulatory disclosures (e.g. 15 U.S.C. § 1692g notice language presence).
  3. **Data Normalization Layer:** Zod schema validation ensuring strict typing before rule evaluation.
* **Exit Gate:** 95%+ extraction accuracy on sample medical bills and debt collection letters with validated JSON output.

---

## Phase 3: Statutory Rules & Legal Dispute Engine
* **Objective:** Map real-world consumer grievances and overcharges to codified federal statutes to generate binding dispute demands.
* **Lead Specialists:** Harvey (Legal Lead) & Justitia (Compliance Auditor)
* **Key Deliverables:**
  1. **FDCPA Debt Collection Module (15 U.S.C. § 1692g & CFPB Reg F):**
     - Generates 30-day formal debt validation demand.
     - Requires chain-of-title, original agreement, itemized accounting since default.
     - Explicit phone cease-and-desist under § 1692c.
  2. **No Surprises Act Medical Auditor (42 U.S.C. § 300gg-111 & CMS IDR):**
     - CPT code unbundling and upcoding anomaly detection.
     - In-network facility vs out-of-network clinician balance bill check.
     - Generates Open Negotiation Notice and Itemized Bill Demand.
  3. **FCRA Credit Bureau Reinvestigation (15 U.S.C. § 1681i):**
     - Specific tradeline inaccuracy challenge.
     - Demand for Method of Verification (MOV) under § 611(a)(7).
  4. **FTC Click-to-Cancel & EFTA (16 CFR Part 425 & 15 U.S.C. § 1693e):**
     - Cancellation symmetry notice and formal payment authorization revocation.
* **Exit Gate:** Automated generation of customized, legally codified dispute letters for all 4 primary domains.

---

## Phase 4: Split-Screen Dispute Studio & PDF Export
* **Objective:** Deliver a seamless user experience where consumers can inspect their bill side-by-side with the generated legal demand.
* **Lead Specialists:** Mercury (Frontend Lead) & Lex (Backend)
* **Key Deliverables:**
  1. **Split-Screen Studio:** Left pane displays the source document with flagged line items highlighted; right pane displays the live-editable dispute letter.
  2. **Interactive Clause Editor:** Toggle statutory citations (e.g., enable/disable telephone cease-and-desist, request specific accounting ledgers).
  3. **Certified Legal PDF Generator:** Standardized legal format with formal header, Certified Mail tracking number slots, and signature line.
* **Exit Gate:** Real-time editable preview with 1-click court-ready PDF download and copy-to-clipboard functionality.

---

## Phase 5: Evidence Vault & Statutory Deadline Tracker
* **Objective:** Track dispute status, calculate legal response windows, and prepare regulatory escalations if opponents fail to reply.
* **Lead Specialists:** Lex (Backend) & Mercury (Frontend)
* **Key Deliverables:**
  1. **Statutory Deadline Countdown:** 30-calendar-day countdown clock for FDCPA and FCRA; 30-business-day clock for No Surprises Open Negotiation.
  2. **Status Progression Pipeline:** `DRAFT` -> `AUDITED` -> `SENT` -> `AWAITING_RESPONSE` -> `RESOLVED` / `ESCALATE`.
  3. **Regulatory Escalation Exporter:** 1-click export formatted for direct submission to the CFPB Consumer Complaint Portal, FTC Fraud Alert, or state Attorney General.
* **Exit Gate:** Functional case dashboard showing active claims, pending statutory clocks, and escalation triggers.

---

## Phase 6: QA Auditing, Statutory Verification & Production Polish
* **Objective:** Rigorous audit of all statutory citations, prompt stability, security reviews, and build verification.
* **Lead Specialists:** Justitia (QA Auditor) & Harvey (Legal Lead)
* **Key Deliverables:**
  1. **Statutory Citation Audit:** Zero hallucinated case laws or statutes; strict alignment with official codified US Code titles.
  2. **Security & PII Leak Testing:** Automated tests verifying no unmasked PII is persisted in logs or database unencrypted.
  3. **End-to-End User Simulation:** Full walkthrough from uploading an inflated hospital bill to generating a validated dispute package.
* **Exit Gate:** Clean test suite pass, zero lint errors, production build ready for deployment.
