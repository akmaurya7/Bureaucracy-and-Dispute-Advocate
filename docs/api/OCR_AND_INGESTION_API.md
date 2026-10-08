# Document Ingestion & Multimodal OCR API Specification

**Endpoint Reference:** API-SPEC-002  
**Lead:** Lex (Lead Backend & Document Intelligence Engineer)  
**Standard:** RESTful JSON / Multipart Form-Data (Next.js 15 App Router)  
**Security & Privacy:** Zero-Retention Client-Side PII Masking Guarantee  

---

## 1. Overview & Architectural Role

The Document Ingestion and Multimodal OCR pipeline serves as the primary gateway for consumers uploading dispute documents—including inflated hospital bills, predatory collection notices, inaccurate credit tradeline reports, and subscription receipts.

All incoming payloads pass through an in-memory zero-retention PII sanitizer (`src/lib/ocr/redactor.ts`) before being parsed into strictly validated Zod data trees (`src/lib/ocr/schemas.ts`) and persisted into the local SQLite database via `CaseRepository.addDocument`.

---

## 2. API Endpoints

### `POST /api/documents/upload`

Ingests, sanitizes, parses, and persists consumer dispute documents.

#### Request Format
Supports both `multipart/form-data` and `application/json`.

**Multipart Form-Data Parameters:**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | `File` (Binary) | Conditional | Target document (PDF, PNG, JPEG, WEBP, or TXT). Max size: 10MB. |
| `rawText` | `string` | Conditional | Document text content (if pre-transcribed or manually entered). |
| `caseId` | `string` | Optional | ID of an existing `UserCase` to attach the document to. If omitted, a case is created automatically. |
| `title` | `string` | Optional | Custom case title (e.g. "Valley Hospital ER Dispute"). |
| `categoryHint` | `string` | Optional | Explicit category hint (`MEDICAL_BILLING`, `DEBT_COLLECTION`, etc.). |

**JSON Payload (`application/json`):**
```json
{
  "rawText": "VALLEY GENERAL HEALTH SYSTEM ...",
  "fileName": "statement.txt",
  "fileType": "text/plain",
  "caseId": "cmuzde7fw0000w3vosb0j6oe6",
  "categoryHint": "MEDICAL_BILLING"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "caseId": "cmuzde7fw0000w3vosb0j6oe6",
  "document": {
    "id": "cmuzde7g80003w3voa0wpvk1c",
    "fileName": "valley_hospital_er_bill.txt",
    "fileType": "text/plain",
    "fileSize": 1024,
    "filePath": "uploads/documents/1728384000000_valley_hospital_er_bill.txt",
    "createdAt": "2026-10-08T10:00:00.000Z"
  },
  "extractedData": {
    "detectedCategory": "MEDICAL_BILLING",
    "confidenceScore": 0.95,
    "senderOrCreditor": {
      "name": "VALLEY GENERAL HEALTH SYSTEM",
      "address": "100 Health Sciences Blvd, Seattle, WA 98104",
      "phone": "(206) 555-0199",
      "accountOrReferenceNumber": "ACT-449812"
    },
    "debtOrBillDetails": {
      "statementDate": "October 01, 2026",
      "totalDue": 5050.00,
      "patientResponsibility": 5050.00,
      "itemizedCharges": [
        {
          "id": "charge-1",
          "code": "99285",
          "codeType": "CPT",
          "description": "Emergency Department Visit Level 5",
          "units": 1,
          "amount": 2450.00,
          "billedAmount": 2450.00,
          "isFlagged": true,
          "violationType": "UPCODING",
          "violationExplanation": "High-complexity Emergency Dept visit (Level 5); frequent upcoding target without documented organ failure or immediate life threat.",
          "statuteRef": "42 U.S.C. § 300gg-111 / No Surprises Act"
        }
      ]
    },
    "statutoryDisclosures": {
      "hasFdcpaMiniMiranda": false,
      "hasValidationPeriodNotice": false,
      "hasNoSurprisesNotice": false,
      "missingMandatoryDisclosures": [
        "Missing mandatory No Surprises Act balance billing protections disclosure under 42 U.S.C. § 300gg-111."
      ]
    },
    "redactionMetrics": {
      "totalEntitiesFound": 5,
      "ssnCount": 1,
      "cardCount": 1,
      "mrnCount": 1,
      "routingCount": 1,
      "dobCount": 0,
      "hasHighRiskPII": true
    }
  },
  "redaction": {
    "originalLength": 1024,
    "sanitizedLength": 980,
    "entitiesRedacted": 5,
    "highRiskPIIPrevented": true,
    "zeroRetentionVerified": true
  }
}
```

#### Error Responses
- `400 Bad Request`: Payload missing both `file` and `rawText`, file size exceeds 10MB limit, or unsupported MIME type.
- `422 Unprocessable Entity`: Zero-retention policy check failed (unmasked PII detected in output stream).
- `500 Internal Server Error`: Unhandled system exception or database write failure.

---

## 3. Zero-Retention Safeguards

1. **Pre-Processing Redaction:** Raw text is intercepted and scrubbed using `redactSensitivePII` before any classification or regex extraction occurs.
2. **Double Verification:** After redaction, `verifyZeroPIIRetention` scans the sanitized text to ensure zero exposed SSNs (`\d{3}-\d{2}-\d{4}`) or raw credit cards (`4[0-9]{15}`) persist.
3. **Storage Sanitization:** SQLite documents table stores only the sanitized `ocrRawText` and normalized JSON. Unmasked consumer identifiers are never saved to disk or transmitted across network boundaries.
