# Statutory Compliance & Zero-Retention PII Audit

**Standard:** COMP-SEC-001  
**Lead:** Justitia (QA & Statutory Compliance Auditor)  
**Reviewed by:** Harvey (Chief Strategist)

---

## 1. Statutory Mandates & Privacy Requirements

Consumer dispute documents (medical bills, hospital records, debt collection notices, credit reports) contain highly sensitive consumer data governed by:
- **HIPAA Privacy Rule (45 CFR Part 160 and Part 164):** Protected Health Information (PHI) including Medical Record Numbers (MRNs), diagnostic identifiers, and provider account numbers.
- **Gramm-Leach-Bliley Act (GLBA 15 U.S.C. \S 6801-6809):** Safeguards rule protecting non-public personal financial information.
- **Fair Credit Reporting Act (FCRA 15 U.S.C. \S 1681):** Truncation rules prohibiting exposure of full account numbers and SSNs.

---

## 2. Client-Side Masking Specification

Under our zero-retention architecture:
1. **SSN Masking:** All occurrences of `\b\d{3}-\d{2}-\d{4}\b` and `\b\d{9}\b` matching SSN patterns are replaced with `[REDACTED-SSN-***-**-XXXX]` where only the last 4 digits are retained for consumer verification.
2. **Bank Account & Routing Numbers:** Routing transit numbers (`\b[0-3]\d{8}\b`) and bank account numbers are redacted into `[REDACTED-ACCT-XXXX]`.
3. **Medical Record Numbers (MRN):** Formatted MRNs and patient IDs are sanitized before any external transmission.
4. **Zero-Retention Guarantee:** Masking executes **in the browser / edge boundary** before the document text or image is sent to multimodal vision models. Unmasked PII is never logged or stored in plain text.
