# Court-Ready PDF Export API Reference

**Endpoint:** `POST /api/disputes/pdf`  
**Protocol:** HTTP/1.1 REST  
**Security:** Zero-retention client-side PII sanitization. Unmasked SSNs and payment numbers are never serialized into binary streams.  
**Engine:** Pure JS (`pdf-lib`), 8.5" x 11" US Letter (612 x 792 pt), 0.75" legal margins, USPS Certified Mail Tracking Barcode, and two-pass running footers.

---

## 1. Overview

The PDF Export API transforms structured dispute letters into binary court-ready PDF documents formatted for formal legal service via USPS Certified Mail with Return Receipt Requested.

It supports two invocation modes:
1. **Persistent Mode (`letterId`):** Retrieves the persisted dispute letter and parent user case directly from SQLite (`dev.db`), compiles the formal PDF, updates the case status to `LETTER_GENERATED`, and logs a `PDF_EXPORTED` event in the case timeline.
2. **Ad-Hoc / Preview Mode (`letter`):** Renders a court-ready PDF directly from an in-memory `CompiledDisputeLetter` JSON object without requiring a pre-saved case record.

---

## 2. Request Schema

### Mode A: Export by Persisted `letterId` (Recommended)

```json
{
  "letterId": "cmuzedqm70003w354ayk3spbd",
  "options": {
    "includeCertifiedMailHeader": true,
    "signerNameOverride": "Jane Consumer",
    "signerTitleOverride": "Consumer Applicant & Disputing Party",
    "includeCertificateOfService": true
  }
}
```

### Mode B: Direct Object Export (`letter`)

```json
{
  "letter": {
    "disputeDomain": "DEBT_COLLECTION",
    "recipientName": "APEX RECOVERY SOLUTIONS LLC",
    "recipientAddress": "450 Financial Way, Wilmington, DE 19801",
    "subjectLine": "FORMAL NOTICE OF DISPUTE & DEBT VALIDATION DEMAND: Account Ref #CLM-889102",
    "fullLetterMarkdown": "### Formal Dispute Demand\nPursuant to 15 U.S.C. § 1692g(b)...",
    "statutoryDeadlineDate": "November 03, 2026",
    "statutorySlaDays": 30,
    "statutoryTimeUnit": "calendar_days",
    "totalDisputedAmount": 1200.00,
    "trackingNumber": "7020 0640 0001 2345 6789",
    "legalCitations": [
      "15 U.S.C. § 1692g(b) (Statutory Validation of Debts & Mandatory Stay of Collection)",
      "15 U.S.C. § 1692c(c) (Ceasing Communication / Mandatory Written Notice Rule)",
      "15 U.S.C. § 1692k(a)(2)(A) (Civil Liability & $1,000 Statutory Damages per Violation)"
    ],
    "escalationAgencies": [
      "Consumer Financial Protection Bureau (CFPB)",
      "Federal Trade Commission (FTC)",
      "State Attorney General - Consumer Protection Division"
    ],
    "disputedCharges": [
      {
        "id": "chg-1",
        "description": "Collection Fee",
        "amount": 350.00,
        "violationExplanation": "Unauthorized collection surcharge under 15 U.S.C. § 1692f(1)."
      }
    ]
  },
  "options": {
    "includeCertifiedMailHeader": true,
    "includeCertificateOfService": true
  }
}
```

---

## 3. Response Headers & Payload

### Success (200 OK)

- **`Content-Type`**: `application/pdf`
- **`Content-Disposition`**: `attachment; filename="dispute-letter-[domain]-[account].pdf"`
- **`Content-Length`**: Length of binary buffer (typically 12KB – 25KB)
- **Body**: Standard binary PDF document stream beginning with magic header `%PDF-`.

### Error Responses

#### `400 Bad Request`
```json
{
  "error": "Either 'letterId' (string) or 'letter' (object) must be provided."
}
```

#### `404 Not Found`
```json
{
  "error": "Dispute letter with ID 'cmuzedqm70003w354ayk3spbd' not found."
}
```

#### `500 Internal Server Error`
```json
{
  "error": "PDF generation failed",
  "details": "Underlying error description"
}
```

---

## 4. Document Typography & Layout Standards

All PDFs conform to standard federal and state court submission practices:

| Component | Standard Specification |
|---|---|
| **Page Geometry** | 8.5" x 11" US Letter (`612 x 792 pt`), `0.75"` (54 pt) Margins |
| **Fonts** | Helvetica, Helvetica-Bold, Helvetica-Oblique, Courier-Bold |
| **Certified Mail Banner** | USPS Certified Mail™ Top Banner with Simulated Code 128 / IMpb Barcode and Article Tracking Number |
| **Notice Block** | Bold `RETURN RECEIPT REQUESTED` notice |
| **Running Headers** | Page 2+ running header with tracking number and page indicator |
| **Itemized Table** | Zebra-striped line-item table for CPT codes, descriptions, disputed amounts, and coding violations |
| **Statutory Authorities Index** | Dedicated governing federal code box listing all statutory citations |
| **Regulatory Escalation Alert** | Red-accented alert box with enforcement agency escalation list and response SLA |
| **Certificate of Service** | USPS Form 3800 Proof of Mailing Declaration under penalty of perjury (28 U.S.C. § 1746) |
| **Running Footers** | Two-pass post-processed exact page count (`Page X of Y`) and confidentiality statement |

---

## 5. Automated Verification

The automated verification suite in `tests/verifyPdfExport.ts` runs 68 comprehensive assertions covering:
- Binary `%PDF-` header integrity.
- Minimum file size assertion (`> 10KB`) across all 4 legal domains.
- Zero PII leaks (plaintext and hex representation of SSNs, checking accounts, and credit cards are strictly absent).
- Accurate preservation of tracking numbers and statutory citations in the decoded PDF stream.
- SQLite timeline audit event logging (`PDF_EXPORTED`).
