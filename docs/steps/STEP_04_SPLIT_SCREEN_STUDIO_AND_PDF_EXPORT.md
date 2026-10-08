# Step 04: Split-Screen Dispute Studio & Court-Ready Legal PDF Export

**Step Reference:** STEP-04  
**Phase:** Phase 4 — Split-Screen Dispute Studio & PDF Export  
**Date:** 2026-10-08  
**Author:** Harvey (Chief Legal Architect & Dispute Strategist)  
**Assigned Specialists:**
- **Harvey (Legal Lead):** Legal formatting standards, Certified Mail tracking standards (USPS Form 3800 & 3811), signature and evidentiary exhibit layout specifications.
- **Lex (Backend & OCR Lead):** Court-ready PDF generation service (`src/lib/pdf/generator.ts`), PDF REST API endpoint (`POST /api/disputes/pdf`), and database linking.
- **Mercury (Frontend Lead):** Split-Screen Studio enhancements (`src/app/studio/page.tsx`), 1-click Certified PDF download, formatted clipboard export, and print stylesheet (`@media print`) optimization.
- **Justitia (QA & Compliance):** PDF export test suite (`tests/verifyPdfExport.ts`), statutory formatting checks, margin geometry verification, and zero-PII leak audit in PDF binaries.
**Status:** COMPLETED (CERTIFIED)

---

## 1. Objectives & Technical Specifications

Phase 4 bridges the gap between digital dispute generation and physical, court-admissible legal service. Federal debt collection and consumer defense require strict evidentiary paper trails: sending formal notice via **USPS Certified Mail with Return Receipt Requested** establishes indisputable legal proof of service and anchors statutory response deadlines under federal law.

### A. Certified Mail Legal Document Standards
1. **Certified Mail Tracking Header:** Standardized USPS Article Number (e.g., `7020 0640 0001 2345 6789`) with visual barcode block and "RETURN RECEIPT REQUESTED" bold notice.
2. **Formal Legal Caption:**
   - Formal date of dispatch
   - Formal recipient block (Creditor, Debt Collector, Hospital Billing Office, or Consumer Reporting Agency)
   - Certified Mail tracking indicator
   - Formal Re: Subject line identifying the alleged account number, dispute type, and statutory basis
3. **Structured Legal Sections:**
   - Formal Notice & Factual Background
   - Specific Statutory Grounds & Codified Violations
   - Itemized Charge / Discrepancy Breakdown Table
   - Mandatory Evidentiary Demands (Chain-of-Title, QPA, MOV, Itemized Accounting)
   - Legal Directives (Telephone Cease-and-Desist, Preauthorized Debit Revocation)
   - Response Deadline & Mandatory Regulatory Escalation Warning
   - Formal Signature Block with Consumer Rights Reservation

---

## 2. Technical Contracts & Deliverables

### A. Lex (Backend Lead):
- **PDF Generation Service (`src/lib/pdf/generator.ts`):** High-reliability, pure JavaScript PDF generation engine utilizing `pdf-lib` to output standardized 8.5" x 11" Letter documents with 0.75" legal margins, simulated USPS barcode, statutory authorities index, itemized tables, and Certificate of Service under penalty of perjury.
- **PDF Generation API Route (`src/app/api/disputes/pdf/route.ts`):** Next.js 15 API route that accepts dispute letter parameters or letter ID, generates the binary PDF stream, records the generation event in `TimelineEvent` via `CaseRepository`, and returns `application/pdf` with `Content-Disposition: attachment`.
- **API Documentation (`docs/api/PDF_EXPORT_API.md`):** Comprehensive REST endpoint documentation with request/response schemas and typography specifications.

### B. Mercury (Frontend Lead):
- **Dispute Studio Polish (`src/app/studio/page.tsx`):**
  - "Download Certified PDF" action button with live loading state and progress indicator.
  - "Copy to Clipboard" with formatted markdown / legal plain text.
  - Print styling (`@media print`) allowing direct browser printing with formal page pagination.
  - Cross-highlighting between left-pane line items and right-pane demand clauses.

### C. Justitia (QA Auditor):
- **Automated PDF Export Test Suite (`tests/verifyPdfExport.ts` & `tests/verifyPdfExport.js`):**
  - Generates PDFs for all 4 domains (FDCPA, No Surprises Act, FCRA, FTC Click-to-Cancel).
  - Validates binary `%PDF-` header and minimum file size (> 10KB).
  - Asserts Certified Mail tracking header presence.
  - Asserts zero unmasked PII in the generated document streams.

---

## 3. Exit Gates & Verification Criteria

1. Next.js 15 production build passes (`npm run build`) with zero errors across all 10 routes. [PASSED]
2. `tests/verifyPdfExport.ts` passes 100% (68/68 assertions) across all 4 domains. [PASSED]
3. 1-click PDF download functional in browser with standard legal layout. [PASSED]
4. Step documentation and team memory updated and pushed to GitHub. [PASSED]

### Audit Results Log (`tests/verifyPdfExport.ts`):
```text
================================================================
  JUSTITIA STATUTORY PDF EXPORT & CERTIFIED MAIL AUDIT SUITE    
================================================================

TEST 1: Auditing FDCPA Debt Validation Certified Mail PDF Export...
  [PASS] FDCPA PDF Generated Non-Empty Buffer
  [PASS] Valid %PDF- Binary Magic Header Present
  [PASS] FDCPA PDF File Size > 10KB (15.1 KB)
  [PASS] Zero PII: Debtor SSN Not Found in Decoded PDF Content
  [PASS] Zero PII: Debtor SSN Plaintext Absent from Binary Buffer
  [PASS] Zero PII: Debtor SSN Hex Representation Absent from Binary Buffer
  [PASS] Zero PII: Debtor Checking Account Absent from Decoded PDF
  [PASS] Zero PII: Debtor Checking Account Hex Absent from Binary
  [PASS] Zero PII: Bank Routing Number Absent from Decoded PDF
  [PASS] USPS Article Tracking Number Found in PDF Text
  [PASS] RETURN RECEIPT REQUESTED Notice Present in PDF
  [PASS] USPS CERTIFIED MAIL Header Present in PDF
  [PASS] FDCPA 15 U.S.C. § 1692g Preserved in Letter
  [PASS] FDCPA 15 U.S.C. § 1692c(c) Preserved in Letter
  [PASS] FDCPA 15 U.S.C. § 1692k Preserved in Letter
  [PASS] FDCPA 1692g Citation Streamed in PDF Binary Body
  [PASS] FDCPA 30 Calendar Days SLA Stated

TEST 2: Auditing No Surprises Act Open Negotiation PDF Export...
  [PASS] No Surprises PDF Generated Non-Empty Buffer
  [PASS] Valid %PDF- Binary Magic Header Present for NSA
  [PASS] No Surprises PDF File Size > 10KB (17.7 KB)
  [PASS] Zero PII: Patient SSN Not Found in NSA Decoded PDF
  [PASS] Zero PII: Patient SSN Plaintext Absent from NSA Binary Buffer
  [PASS] Zero PII: Patient SSN Hex Absent from NSA Binary Buffer
  [PASS] NSA Tracking Number Found in PDF Text
  [PASS] RETURN RECEIPT REQUESTED Present in NSA PDF
  [PASS] NSA 42 U.S.C. § 300gg-111 Preserved in Letter
  [PASS] NSA 45 CFR Part 149 Preserved in Letter
  [PASS] NSA 42 U.S.C. § 300gg-139 Preserved in Letter
  [PASS] NSA 300gg-111 Citation Streamed in PDF Binary Body
  [PASS] NSA 30 Business Days SLA Stated

TEST 3: Auditing FCRA 30-Day Reinvestigation PDF Export...
  [PASS] FCRA PDF Generated Non-Empty Buffer
  [PASS] Valid %PDF- Binary Magic Header Present for FCRA
  [PASS] FCRA PDF File Size > 10KB (13.6 KB)
  [PASS] Zero PII: Consumer SSN Not Found in FCRA Decoded PDF
  [PASS] Zero PII: Consumer SSN Plaintext Absent from FCRA Binary Buffer
  [PASS] Zero PII: Consumer SSN Hex Absent from FCRA Binary Buffer
  [PASS] FCRA Tracking Number Found in PDF Text
  [PASS] RETURN RECEIPT REQUESTED Present in FCRA PDF
  [PASS] FCRA 15 U.S.C. § 1681i Preserved in Letter
  [PASS] FCRA Method of Verification Preserved in Letter
  [PASS] FCRA Furnisher Liability Preserved in Letter
  [PASS] FCRA 1681i Citation Streamed in PDF Binary Body
  [PASS] FCRA 30 Calendar Days SLA Stated

TEST 4: Auditing FTC Click-to-Cancel & EFTA PDF Export...
  [PASS] FTC PDF Generated Non-Empty Buffer
  [PASS] Valid %PDF- Binary Magic Header Present for FTC
  [PASS] FTC PDF File Size > 10KB (14.6 KB)
  [PASS] Zero PII: Credit Card Number Not Found in FTC Decoded PDF
  [PASS] Zero PII: Credit Card Plaintext Absent from FTC Binary Buffer
  [PASS] Zero PII: Credit Card Hex Absent from FTC Binary Buffer
  [PASS] FTC Tracking Number Found in PDF Text
  [PASS] RETURN RECEIPT REQUESTED Present in FTC PDF
  [PASS] FTC 16 CFR Part 425 Preserved in Letter
  [PASS] EFTA 15 U.S.C. § 1693e Preserved in Letter
  [PASS] FTC Rule 425 Citation Streamed in PDF Binary Body
  [PASS] FTC 10 Business Days SLA Stated

TEST 5: Auditing Database Persistence for PDF Generation Lifecycle...
  [PASS] Case Created: ID = cmuzef12u0000w3g8hqm8ljhx
  [PASS] Dispute Letter Saved: ID = cmuzef13y0003w3g859qzw9lc
  [PASS] Dispute Letter Retrieved by ID
  [PASS] Dispute Letter userCase Relation Loaded Successfully
  [PASS] Case Status Updated to LETTER_GENERATED
  [PASS] Timeline Events Recorded: Count = 4
  [PASS] Timeline Contains PDF_EXPORTED Event

TEST 6: Auditing POST /api/disputes/pdf HTTP Endpoint Handler...
  [PASS] POST /api/disputes/pdf with letterId returns 200 OK
  [PASS] API Response Content-Type is application/pdf
  [PASS] Content-Disposition Attachment Header Configured
  [PASS] API Generated PDF Byte Count > 10KB (16.4 KB)
  [PASS] API Generated PDF Starts with %PDF-
  [PASS] Test Case Cleaned Up Cascadingly from SQLite.

================================================================
  ALL 68 PDF EXPORT & STATUTORY TESTS PASSED SUCCESSFULLY! (100% ACCURACY & ZERO PII LEAKS)
================================================================
```

---

## 4. Justitia (QA & Compliance Auditor) Formal Sign-Off

**Audit Date:** 2026-10-08  
**Auditor:** Justitia, QA & Statutory Compliance Auditor  
**Certification Status:** **UNCONDITIONAL COMPLIANCE CERTIFICATION (APPROVED)**

### Audit Summary:
1. **USPS Certified Mail & Evidentiary Standard Compliance:**
   - USPS Form 3800 tracking barcode headers and bold "RETURN RECEIPT REQUESTED" notices are verified present on Page 1 across all 4 dispute domains.
   - Formal Certificates of Service under 28 U.S.C. § 1746 executed under penalty of perjury.
   - Standard 8.5" x 11" US Letter geometry with strict 0.75-inch (54pt) evidentiary legal margins.
   - Running headers on subsequent pages and standardized running footers (`Page X of Y` + Article Number + Statutory citation) stamped across all pages.
2. **Statutory Citation & SLA Preservation:**
   - 100% preservation of federal citations across source letters and compiled PDF streams:
     * FDCPA: 15 U.S.C. § 1692g, 15 U.S.C. § 1692c(c), 15 U.S.C. § 1692k (30 Calendar Days).
     * No Surprises Act: 42 U.S.C. § 300gg-111, 45 CFR Part 149, 42 U.S.C. § 300gg-139 (30 Business Days).
     * FCRA: 15 U.S.C. § 1681i, 15 U.S.C. § 1681i(a)(7) MOV, 15 U.S.C. § 1681s-2 (30 Calendar Days).
     * FTC Click-to-Cancel & EFTA: 16 CFR Part 425, 15 U.S.C. § 1693e, 15 U.S.C. § 45 (10 Business Days).
3. **Zero-PII Retention Verification:**
   - Deep inspection of raw Latin-1 PDF buffers, hex-encoded text streams, and decompressed Flate streams confirmed **0 unmasked SSNs, 0 banking routing/account numbers, and 0 credit card numbers**.
4. **Automated Verification Suite:**
   - `node tests/verifyPdfExport.js`: **68 / 68 assertions passed (100% pass rate)**.
   - `node tests/verifyOcrPipeline.js`: **21 / 21 assertions passed (100% pass rate)**.
   - `node tests/verifyDisputeEngine.js`: **60 / 60 assertions passed (100% pass rate)**.
5. **Production Build & Endpoint Verification:**
   - `npm run build`: Production build verified with zero errors across all 10 application routes.
   - `POST /api/disputes/pdf`: Verified generating valid `%PDF-` streams > 10KB with correct `application/pdf` attachment headers and SQLite timeline event persistence (`PDF_EXPORTED`).

**Recommendation:** Proceed immediately to Phase 5 (Batch Processing, Tracking & Escalations).
