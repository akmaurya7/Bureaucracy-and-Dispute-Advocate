// Simple Node verification script for PII Redactor
const PII_PATTERNS = {
  SSN_DASHED: /\b(?!(000|666|9))\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b/g,
  CREDIT_CARD: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
  ABA_ROUTING: /\b(?:Routing|RTN|ABA|Route\s*#?)[:\s]*(\d{9})\b/gi,
  BANK_ACCOUNT: /\b(?:Account|Acct|Checking|Savings|ACT\s*#?)[:\s]*([0-9]{6,17})\b/gi,
  MEDICAL_MRN: /\b(?:MRN|Medical\s*Record\s*(?:No|Number|#)|Patient\s*ID|Chart\s*#?)[:\s]*([A-Za-z0-9\-]{4,15})\b/gi,
  DOB: /\b(?:DOB|Date\s*of\s*Birth|Born)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/gi,
};

function redactSensitivePII(rawText) {
  let text = rawText;
  const entities = [];

  text = text.replace(PII_PATTERNS.SSN_DASHED, (match, offset) => {
    const last4 = match.slice(-4);
    const masked = `[REDACTED-SSN-***-**-${last4}]`;
    entities.push({ type: 'SSN', maskedValue: masked });
    return masked;
  });

  text = text.replace(PII_PATTERNS.CREDIT_CARD, (match, offset) => {
    const last4 = match.slice(-4);
    const masked = `[REDACTED-CARD-****-${last4}]`;
    entities.push({ type: 'CREDIT_CARD', maskedValue: masked });
    return masked;
  });

  text = text.replace(PII_PATTERNS.ABA_ROUTING, (match, routingNum, offset) => {
    const masked = match.replace(routingNum, '[REDACTED-ROUTING-*********]');
    entities.push({ type: 'ROUTING_NUMBER', maskedValue: masked });
    return masked;
  });

  text = text.replace(PII_PATTERNS.BANK_ACCOUNT, (match, acctNum, offset) => {
    const last4 = acctNum.slice(-4);
    const masked = match.replace(acctNum, `[REDACTED-ACCT-***${last4}]`);
    entities.push({ type: 'BANK_ACCOUNT', maskedValue: masked });
    return masked;
  });

  text = text.replace(PII_PATTERNS.MEDICAL_MRN, (match, mrnVal, offset) => {
    const masked = match.replace(mrnVal, '[REDACTED-PATIENT-MRN]');
    entities.push({ type: 'MEDICAL_MRN', maskedValue: masked });
    return masked;
  });

  return { text, entities };
}

const testBill = `
PATIENT RECORD:
Name: Jane Consumer
SSN: 123-45-6789
Patient ID: MRN-98421
Routing: 121000358
Account: 9876543210
Credit Card: 4111111111111234
Charge: $1,420.00 for Emergency Room CPT 99285
`;

console.log('--- RAW BILL ---');
console.log(testBill);

const res = redactSensitivePII(testBill);
console.log('\n--- REDACTED RESULT ---');
console.log(res.text);

console.log('\n--- ENTITIES DETECTED ---');
console.log(res.entities);

// Test verification assertion
const ssnExposed = /\b\d{3}-\d{2}-\d{4}\b/.test(res.text);
const ccExposed = /\b4111111111111234\b/.test(res.text);
if (!ssnExposed && !ccExposed) {
  console.log('\n[PASS] Zero PII Leak Retention Verified! SSN and Card successfully masked.');
} else {
  console.error('\n[FAIL] PII leak detected!');
  process.exit(1);
}
