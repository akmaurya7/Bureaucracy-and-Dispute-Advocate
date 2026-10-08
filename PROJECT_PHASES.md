---

## Phase 4: Split-Screen Dispute Studio & PDF Export [COMPLETED]
* **Objective:** Deliver a seamless user experience where consumers can inspect their bill side-by-side with the generated legal demand and export court-ready legal documents.
* **Lead Specialists:** Mercury (Frontend Lead), Lex (Backend Lead), Justitia (QA Auditor), Harvey (Chief Legal Strategist)
* **Key Deliverables:**
  1. **Split-Screen Studio (`src/app/studio/page.tsx`):** Left pane displays the source document with flagged line items highlighted; right pane displays the live-editable dispute letter with real-time statutory clause toggles.
  2. **Court-Ready PDF Generation Service (`src/lib/pdf/generator.ts`):** Pure JS (`pdf-lib`) generator producing standardized 8.5" x 11" US Letter documents with 0.75" legal margins, USPS Certified Mail™ tracking banner with simulated barcode, itemized charges table, statutory authorities index, regulatory alert container, and Certificate of Service under penalty of perjury (28 U.S.C. § 1746).
  3. **PDF Generation REST API (`src/app/api/disputes/pdf/route.ts`):** `POST /api/disputes/pdf` route generating binary PDF streams, linking to SQLite cases via `CaseRepository`, recording `PDF_EXPORTED` timeline events, and returning `application/pdf` with `Content-Disposition: attachment`.
  4. **Automated Audit Suite (`tests/verifyPdfExport.ts` & `tests/verifyPdfExport.js`):** 68 automated assertions verifying %PDF- magic headers, >10KB file size standards, 100% zero-PII retention, statutory citation preservation, and timeline audit logging across all 4 domains.
* **Exit Gate:** 100% test pass rate across all 68 assertions, Next.js 15 production build passing with 0 errors across 10 routes.
* **Documentation Reference:** `docs/steps/STEP_04_SPLIT_SCREEN_STUDIO_AND_PDF_EXPORT.md`, `docs/api/PDF_EXPORT_API.md`.

---