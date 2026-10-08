/**
 * Client-Side Zero-Retention PII Redactor
 *
 * Scans and redacts sensitive consumer identifiers (SSNs, banking routing/account numbers,
 * credit cards, Medical Record Numbers, and dates of birth) in-memory before any
 * document content is transmitted to multimodal vision or LLM inference engines.
 */

export interface DetectedEntity {
  type: 'SSN' | 'CREDIT_CARD' | 'ROUTING_NUMBER' | 'BANK_ACCOUNT' | 'MEDICAL_MRN' | 'DOB';
  maskedValue: string;
  matchedPattern: string;
  startIndex: number;
  endIndex: number;
}

export interface RedactionResult {
  originalTextLength: number;
  redactedText: string;
  detectedCount: number;
  entities: DetectedEntity[];
  hasHighRiskPII: boolean;
}

// Regex patterns for sensitive consumer markers
const PII_PATTERNS = {
  // SSN: matches 123-45-6789 or 123 45 6789
  SSN_DASHED: /\b(?!(000|666|9))\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b/g,
  
  // Credit Cards: 13-16 digits formatted or consecutive
  CREDIT_CARD: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
  
  // US ABA Routing Transit Numbers (9 digits)
  ABA_ROUTING: /\b(?:Routing|RTN|ABA|Route\s*#?)[:\s]*(\d{9})\b/gi,
  
  // Bank Account Numbers preceded by keywords
  BANK_ACCOUNT: /\b(?:Account|Acct|Checking|Savings|ACT\s*#?)[:\s]*([0-9]{6,17})\b/gi,
  
  // Medical Record Number (MRN) or Patient Account
  MEDICAL_MRN: /\b(?:MRN|Medical\s*Record\s*(?:No|Number|#)|Patient\s*ID|Chart\s*#?)[:\s]*([A-Za-z0-9\-]{4,15})\b/gi,
  
  // Date of Birth markers
  DOB: /\b(?:DOB|Date\s*of\s*Birth|Born)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/gi,
};

/**
 * Executes in-browser / edge zero-retention redaction.
 * Replaces critical identification numbers with standardized compliance tokens.
 */
export function redactSensitivePII(rawText: string): RedactionResult {
  let text = rawText;
  const entities: DetectedEntity[] = [];

  // 1. Redact SSNs
  text = text.replace(PII_PATTERNS.SSN_DASHED, (match, offset) => {
    const last4 = match.slice(-4);
    const masked = `[REDACTED-SSN-***-**-${last4}]`;
    entities.push({
      type: 'SSN',
      maskedValue: masked,
      matchedPattern: match,
      startIndex: offset,
      endIndex: offset + match.length,
    });
    return masked;
  });

  // 2. Redact Credit Card Numbers
  text = text.replace(PII_PATTERNS.CREDIT_CARD, (match, offset) => {
    const last4 = match.slice(-4);
    const masked = `[REDACTED-CARD-****-${last4}]`;
    entities.push({
      type: 'CREDIT_CARD',
      maskedValue: masked,
      matchedPattern: match,
      startIndex: offset,
      endIndex: offset + match.length,
    });
    return masked;
  });

  // 3. Redact ABA Routing Numbers
  text = text.replace(PII_PATTERNS.ABA_ROUTING, (match, routingNum, offset) => {
    const masked = match.replace(routingNum, '[REDACTED-ROUTING-*********]');
    entities.push({
      type: 'ROUTING_NUMBER',
      maskedValue: masked,
      matchedPattern: routingNum,
      startIndex: offset,
      endIndex: offset + match.length,
    });
    return masked;
  });

  // 4. Redact Bank Account Numbers
  text = text.replace(PII_PATTERNS.BANK_ACCOUNT, (match, acctNum, offset) => {
    const last4 = acctNum.slice(-4);
    const masked = match.replace(acctNum, `[REDACTED-ACCT-***${last4}]`);
    entities.push({
      type: 'BANK_ACCOUNT',
      maskedValue: masked,
      matchedPattern: acctNum,
      startIndex: offset,
      endIndex: offset + match.length,
    });
    return masked;
  });

  // 5. Redact Medical Record Numbers (MRN)
  text = text.replace(PII_PATTERNS.MEDICAL_MRN, (match, mrnVal, offset) => {
    const masked = match.replace(mrnVal, '[REDACTED-PATIENT-MRN]');
    entities.push({
      type: 'MEDICAL_MRN',
      maskedValue: masked,
      matchedPattern: mrnVal,
      startIndex: offset,
      endIndex: offset + match.length,
    });
    return masked;
  });

  // 6. Redact Date of Birth
  text = text.replace(PII_PATTERNS.DOB, (match, dobVal, offset) => {
    const masked = match.replace(dobVal, '[REDACTED-DOB]');
    entities.push({
      type: 'DOB',
      maskedValue: masked,
      matchedPattern: dobVal,
      startIndex: offset,
      endIndex: offset + match.length,
    });
    return masked;
  });

  return {
    originalTextLength: rawText.length,
    redactedText: text,
    detectedCount: entities.length,
    entities,
    hasHighRiskPII: entities.some((e) => e.type === 'SSN' || e.type === 'CREDIT_CARD'),
  };
}

/**
 * Validates whether text is safe for external multimodal LLM transmission.
 * Returns true only if zero exposed SSNs or unmasked credit cards are found.
 */
export function verifyZeroPIIRetention(text: string): { isSafe: boolean; violationReason?: string } {
  if (PII_PATTERNS.SSN_DASHED.test(text)) {
    return {
      isSafe: false,
      violationReason: 'Unmasked Social Security Number detected in document stream.',
    };
  }
  if (PII_PATTERNS.CREDIT_CARD.test(text)) {
    return {
      isSafe: false,
      violationReason: 'Unmasked payment card number detected in document stream.',
    };
  }
  return { isSafe: true };
}
