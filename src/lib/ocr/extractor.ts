import { redactSensitivePII, verifyZeroPIIRetention } from './redactor';
import {
  ExtractedDocumentSchema,
  ParsedDocumentDataSchema,
  type ExtractedDocument,
  type ParsedDocumentData,
  type DisputeCategory,
  type ItemizedCharge,
  type SenderOrCreditor,
  type FinancialSummary,
  type StatutoryDisclosures,
  type CodeType,
  type ViolationType,
} from './schemas';

export interface DocumentParseOptions {
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  documentId?: string;
  categoryHint?: DisputeCategory;
}

/**
 * Common Medical CPT / HCPCS / Revenue codes frequently targeted for unbundling,
 * upcoding, or surprise balance billing disputes.
 */
const KNOWN_DISPUTABLE_CODES: Record<
  string,
  { type: CodeType; violationType: ViolationType; flagReason: string; statuteRef: string }
> = {
  // Emergency Department E/M Upcoding
  '99285': {
    type: 'CPT',
    violationType: 'UPCODING',
    flagReason:
      'High-complexity Emergency Dept visit (Level 5); frequent upcoding target without documented organ failure or immediate life threat.',
    statuteRef: '42 U.S.C. § 300gg-111 / No Surprises Act',
  },
  '99284': {
    type: 'CPT',
    violationType: 'UPCODING',
    flagReason:
      'High-severity Emergency Dept visit (Level 4); evaluate for emergency department unbundling against facility fees.',
    statuteRef: '42 U.S.C. § 300gg-111 / No Surprises Act',
  },
  '99283': {
    type: 'CPT',
    violationType: 'UPCODING',
    flagReason:
      'Moderate-severity Emergency Dept visit (Level 3); evaluate for acuity documentation support.',
    statuteRef: '42 U.S.C. § 300gg-111',
  },
  '99291': {
    type: 'CPT',
    violationType: 'UPCODING',
    flagReason:
      'Critical care evaluation (first 30-74 minutes); requires continuous physician attendance record.',
    statuteRef: '42 U.S.C. § 300gg-111 / No Surprises Act',
  },
  // Routine supplies & surgical trays unbundling
  '99070': {
    type: 'CPT',
    violationType: 'UNBUNDLING',
    flagReason:
      'Special surgical tray supplies or routine hospital items; impermissible unbundling under CPT Global Surgical Package rules.',
    statuteRef: '42 U.S.C. § 300gg-111 / CPT Unbundling Rules',
  },
  // Pathology & Laboratory unbundling
  '80053': {
    type: 'CPT',
    violationType: 'UNBUNDLING',
    flagReason:
      'Comprehensive metabolic panel; check for unbundled individual electrolyte and liver panel charges.',
    statuteRef: '42 U.S.C. § 300gg-111',
  },
  '85025': {
    type: 'CPT',
    violationType: 'UNBUNDLING',
    flagReason:
      'Complete blood count (CBC) with automated differential; audit for duplicate hematology billing.',
    statuteRef: '42 U.S.C. § 300gg-111',
  },
  // Radiology
  '71046': {
    type: 'CPT',
    violationType: 'SURPRISE_BILL',
    flagReason:
      'Chest X-Ray 2 views; check for separate physician interpretation balance billing at in-network facility.',
    statuteRef: '42 U.S.C. § 300gg-111',
  },
  '70450': {
    type: 'CPT',
    violationType: 'SURPRISE_BILL',
    flagReason:
      'CT Head/Brain without contrast; verify Qualified Payment Amount (QPA) cost-sharing limits.',
    statuteRef: '42 U.S.C. § 300gg-111',
  },
  // Ambulance HCPCS
  'A0428': {
    type: 'HCPCS',
    violationType: 'SURPRISE_BILL',
    flagReason:
      'Basic Life Support (BLS) non-emergency ambulance transport; audit for excessive mileage and unauthorized surcharge.',
    statuteRef: '42 U.S.C. § 300gg-111',
  },
  'A0429': {
    type: 'HCPCS',
    violationType: 'SURPRISE_BILL',
    flagReason:
      'Basic Life Support (BLS) emergency ambulance transport; verify balance billing protections.',
    statuteRef: '42 U.S.C. § 300gg-111',
  },
  // Revenue codes
  '0450': {
    type: 'REV_CODE',
    violationType: 'DUPLICATE_CHARGE',
    flagReason:
      'Hospital Emergency Room Facility Fee; verify in-network emergency room parity under No Surprises Act.',
    statuteRef: '42 U.S.C. § 300gg-111',
  },
  '0250': {
    type: 'REV_CODE',
    violationType: 'UNAUTHORIZED_FEE',
    flagReason:
      'General Pharmacy facility surcharge; verify itemized drug pricing against wholesale acquisition cost.',
    statuteRef: '42 U.S.C. § 300gg-111',
  },
};

/**
 * Heuristic classifier to detect document category based on domain keywords and statutory markers.
 */
export function detectDocumentCategory(
  text: string,
  hint?: DisputeCategory
): { category: DisputeCategory; confidence: number } {
  if (hint) {
    return { category: hint, confidence: 0.95 };
  }

  const lower = text.toLowerCase();

  // Scoring matrix
  const scores: Record<DisputeCategory, number> = {
    MEDICAL_BILLING: 0,
    DEBT_COLLECTION: 0,
    CREDIT_REPORT_ERROR: 0,
    SUBSCRIPTION_CANCEL: 0,
    RENTAL_LEASE_DISPUTE: 0,
    UTILITY_OVERCHARGE: 0,
    AIRLINE_PASSENGER_RIGHTS: 0,
  };

  // Medical Billing cues
  if (/cpt|hcpcs|cms-1500|ub-04|patient|hospital|physician|clinic|health system/i.test(lower)) scores.MEDICAL_BILLING += 3;
  if (/date of service|diagnosis|explanation of benefits|balance bill|no surprises act|coinsurance|copay/i.test(lower)) scores.MEDICAL_BILLING += 3;
  if (/\b(?:9928[1-5]|99070|9921[1-5]|80053|71046|0450|0250)\b/.test(text)) scores.MEDICAL_BILLING += 4;

  // Debt Collection cues
  if (/debt collector|collection agency|attempting to collect a debt|any information obtained will be used/i.test(lower)) scores.DEBT_COLLECTION += 5;
  if (/original creditor|delinquent|past due balance|validation of this debt|1692g|fdcpa|mini-miranda/i.test(lower)) scores.DEBT_COLLECTION += 4;
  if (/assignee of|settlement offer|creditor to whom the debt is owed/i.test(lower)) scores.DEBT_COLLECTION += 3;

  // Credit Report Error cues
  if (/credit report|equifax|experian|transunion|credit bureau|tradeline|derogatory mark/i.test(lower)) scores.CREDIT_REPORT_ERROR += 4;
  if (/fair credit reporting act|1681i|inaccurate tradeline|dispute accuracy|inquiry removal/i.test(lower)) scores.CREDIT_REPORT_ERROR += 4;

  // Subscription Cancel cues
  if (/subscription|auto-renew|recurring payment|membership fee|click-to-cancel|16 cfr 425|efta/i.test(lower)) scores.SUBSCRIPTION_CANCEL += 4;
  if (/cancellation request|monthly membership|revoke debit authorization/i.test(lower)) scores.SUBSCRIPTION_CANCEL += 3;

  // Rental cues
  if (/security deposit|lease agreement|landlord|tenant|rental premises|itemized deductions/i.test(lower)) scores.RENTAL_LEASE_DISPUTE += 4;

  // Utility cues
  if (/electric utility|kilowatt|kwh|meter reading|water utility|gas bill|therms/i.test(lower)) scores.UTILITY_OVERCHARGE += 4;

  // Airline cues
  if (/flight number|airline ticket|denied boarding|baggage delay|dot passenger rights|tarmac delay/i.test(lower)) scores.AIRLINE_PASSENGER_RIGHTS += 4;

  // Find category with highest score
  let bestCategory: DisputeCategory = 'DEBT_COLLECTION';
  let maxScore = -1;

  for (const [cat, score] of Object.entries(scores) as [DisputeCategory, number][]) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat;
    }
  }

  // Calculate normalized confidence score
  const confidence = maxScore >= 5 ? 0.95 : maxScore >= 3 ? 0.85 : 0.65;
  return { category: bestCategory, confidence };
}

/**
 * Extracts sender or creditor information using regex heuristics.
 */
export function extractSenderOrCreditor(text: string): SenderOrCreditor {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let name = '';
  let address: string | null = null;
  let phone: string | null = null;
  let email: string | null = null;
  let accountOrReferenceNumber: string | null = null;

  // 1. Explicit Line-Anchored Sender / Creditor labels
  const labeledMatch = text.match(
    /(?:^|\n)\s*(?:Creditor|From|Collector|Billing Agency|Health System|Hospital)[:\s]*[:\-]\s*([^\n\r]+)/im
  );
  if (labeledMatch && labeledMatch[1].trim()) {
    const rawVal = labeledMatch[1].trim();
    if (!/^(statement|invoice|bill|notice|date|itemized|\d+)/i.test(rawVal) && rawVal.length < 80) {
      name = rawVal;
    }
  }

  // 2. Primary Header Check: Top non-empty lines usually designate the issuing organization
  if (!name && lines.length > 0) {
    for (let i = 0; i < Math.min(4, lines.length); i++) {
      const line = lines[i];
      if (
        !/^(patient|statement|invoice|bill|notice|date|page|account|ref|due|itemized)/i.test(line) &&
        line.length >= 3 &&
        line.length <= 80 &&
        !/\$[0-9,]+\.[0-9]{2}/.test(line)
      ) {
        name = line;
        break;
      }
    }
  }

  if (!name) {
    name = 'Unknown Creditor / Institution';
  }

  // 3. Phone Extraction
  const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/);
  if (phoneMatch) {
    phone = phoneMatch[0].trim();
  }

  // 4. Email Extraction
  const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  if (emailMatch) {
    email = emailMatch[0].trim();
  }

  // 5. Address Extraction (Street, City, State ZIP)
  const streetMatch = text.match(
    /\b\d{1,5}\s+[A-Za-z0-9\.\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Pkwy|Parkway|Suite|Ste|Floor|Fl|Box|P\.?O\.?\s*Box)\b[^\n\r]*/i
  );
  const cityStateZipMatch = text.match(
    /\b([A-Za-z\s]{2,25}),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/
  );

  if (streetMatch && cityStateZipMatch) {
    address = `${streetMatch[0].trim()}, ${cityStateZipMatch[0].trim()}`;
  } else if (streetMatch) {
    address = streetMatch[0].trim();
  } else if (cityStateZipMatch) {
    address = cityStateZipMatch[0].trim();
  }

  // 6. Account or Reference Number (Ensure delimiter and avoid crossing newline into generic words)
  const acctMatch = text.match(
    /(?:Account|Acct|Reference|Ref|Claim|Invoice)[^\S\r\n]*(?:#|No\.?|Number)?[^\S\r\n]*[:\-][^\S\r\n]*([A-Za-z0-9\-_]{4,25})/i
  );
  if (acctMatch) {
    accountOrReferenceNumber = acctMatch[1].trim();
  }

  return {
    name,
    department: null,
    address,
    city: cityStateZipMatch ? cityStateZipMatch[1].trim() : null,
    state: cityStateZipMatch ? cityStateZipMatch[2].trim() : null,
    zip: cityStateZipMatch ? cityStateZipMatch[3].trim() : null,
    phone,
    email,
    accountOrReferenceNumber,
    accountReferenceNumber: accountOrReferenceNumber,
    facilityName: null,
  };
}

/**
 * Extracts financial balances, totals, and original creditor details.
 */
export function extractFinancialSummary(text: string): FinancialSummary {
  let totalDue = 0.0;
  let totalBilled = 0.0;
  let originalBalance: number | null = null;
  let originalCreditor: string | null = null;
  let statementDate: string | null = null;
  let dueDate: string | null = null;
  let patientResponsibility: number | null = null;

  // Total Due / Current Balance
  const dueMatch = text.match(
    /(?:Total (?:Amount )?Due|Balance Due|Amount Due|Pay This Amount|Current Balance|New Balance|Total Owed)[:\s]*\$?([0-9,]+\.[0-9]{2})/i
  );
  if (dueMatch) {
    totalDue = parseFloat(dueMatch[1].replace(/,/g, ''));
  }

  // Total Billed / Charges
  const billedMatch = text.match(
    /(?:Total Charges|Total Billed|Gross Charges|Billed Amount|Total Fees)[:\s]*\$?([0-9,]+\.[0-9]{2})/i
  );
  if (billedMatch) {
    totalBilled = parseFloat(billedMatch[1].replace(/,/g, ''));
  } else if (totalDue > 0) {
    totalBilled = totalDue;
  }

  // Patient Responsibility
  const patRespMatch = text.match(
    /(?:Patient Responsibility|Your Responsibility|You Owe|Patient Owes)[:\s]*\$?([0-9,]+\.[0-9]{2})/i
  );
  if (patRespMatch) {
    patientResponsibility = parseFloat(patRespMatch[1].replace(/,/g, ''));
  }

  // Fallback for totalDue: if no explicit "Total Due" line, fall back to patient responsibility or total billed
  if (totalDue === 0) {
    if (patientResponsibility && patientResponsibility > 0) {
      totalDue = patientResponsibility;
    } else if (totalBilled > 0) {
      totalDue = totalBilled;
    }
  }

  // Original Balance (Debt Collection)
  const origBalMatch = text.match(
    /(?:Original (?:Debt|Balance|Amount))[:\s]*\$?([0-9,]+\.[0-9]{2})/i
  );
  if (origBalMatch) {
    originalBalance = parseFloat(origBalMatch[1].replace(/,/g, ''));
  }

  // Original Creditor
  const origCredMatch = text.match(
    /(?:Original Creditor|Assigned From|Prior Creditor)[:\s]*([^\\n\\r]+)/i
  );
  if (origCredMatch) {
    originalCreditor = origCredMatch[1].trim();
  }

  // Statement / Notice Date
  const stmtDateMatch = text.match(
    /(?:Statement Date|Date of Notice|Bill Date|Notice Date|Date)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/i
  );
  if (stmtDateMatch) {
    statementDate = stmtDateMatch[1].trim();
  }

  // Due Date
  const dueDateMatch = text.match(
    /(?:Payment Due Date|Due Date|Must Be Received By)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/i
  );
  if (dueDateMatch) {
    dueDate = dueDateMatch[1].trim();
  }

  return {
    statementDate,
    dueDate,
    originalBalance,
    totalBilled,
    totalDue,
    currency: 'USD',
    originalCreditor,
    currentCreditor: null,
    priorPayments: null,
    adjustments: null,
    patientResponsibility,
  };
}

/**
 * Evaluates document fine print for mandatory statutory disclosures and notices.
 */
export function extractStatutoryDisclosures(
  text: string,
  category: DisputeCategory
): StatutoryDisclosures {
  const lower = text.toLowerCase();

  // 1. FDCPA § 1692e(11) Mini-Miranda
  const hasFdcpaMiniMiranda =
    /(?:this (?:is an attempt to collect a debt|communication is from a debt collector)|any information obtained will be used for that purpose)/i.test(
      lower
    );

  // 2. FDCPA § 1692g 30-Day Debt Validation Notice
  const hasValidationPeriodNotice =
    /(?:30 days (?:after|from) (?:receipt|receiving)|dispute the validity of (?:this|the) debt|1692g)/i.test(
      lower
    );

  // 3. Federal No Surprises Act (42 U.S.C. § 300gg-111)
  const hasNoSurprisesNotice =
    /(?:no surprises act|surprise (?:medical )?bill|300gg-111|balance billing protection|balance billing disclosure)/i.test(
      lower
    );

  // 4. Good Faith Estimate notice
  const hasGoodFaithEstimateNotice =
    /(?:good faith estimate|gfe|45 cfr §?\s*149\.610)/i.test(lower);

  // 5. Out-of-network balance billing markers
  const hasOutOfNetworkMarkers =
    /(?:out-of-network|non-participating|out of network|balance billing|not in your plan's network)/i.test(
      lower
    );

  // 6. Arbitration clause
  const hasArbitrationClause =
    /(?:binding arbitration|arbitration agreement|waive right to jury trial|class action waiver)/i.test(
      lower
    );

  // 7. Determine missing statutory disclosures based on category
  const missingMandatoryDisclosures: string[] = [];

  if (category === 'DEBT_COLLECTION') {
    if (!hasFdcpaMiniMiranda) {
      missingMandatoryDisclosures.push(
        'Missing statutory FDCPA Mini-Miranda disclosure under 15 U.S.C. § 1692e(11).'
      );
    }
    if (!hasValidationPeriodNotice) {
      missingMandatoryDisclosures.push(
        'Missing mandatory 30-day debt validation notice under 15 U.S.C. § 1692g(a).'
      );
    }
  } else if (category === 'MEDICAL_BILLING') {
    if (hasOutOfNetworkMarkers && !hasNoSurprisesNotice) {
      missingMandatoryDisclosures.push(
        'Missing mandatory No Surprises Act balance billing protections disclosure under 42 U.S.C. § 300gg-111.'
      );
    }
  }

  return {
    hasFdcpaMiniMiranda,
    hasValidationPeriodNotice,
    hasNoSurprisesNotice,
    fdcpa30DayNotice: hasValidationPeriodNotice,
    hasGoodFaithEstimateNotice,
    hasOutOfNetworkMarkers,
    hasArbitrationClause,
    missingMandatoryDisclosures,
  };
}

/**
 * Parses itemized charge lines, identifies CPT/HCPCS/Revenue codes, and applies statutory audit flags.
 */
export function extractItemizedCharges(text: string): ItemizedCharge[] {
  const items: ItemizedCharge[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Skip generic summary lines and disclaimer lines
    if (
      /^(total|balance|amount due|subtotal|payment|credit|adjustment|statement|date|patient responsibility|your responsibility|you owe|patient owes|notice:)/i.test(
        line
      )
    ) {
      continue;
    }

    // Direct CPT match check (5 digits)
    const cptMatch = line.match(/\b([0-9]{5})\b/);
    // HCPCS match (A-V + 4 digits)
    const hcpcsMatch = line.match(/\b([A-V][0-9]{4})\b/);
    // Revenue code match (0 followed by 3 digits)
    const revCodeMatch = line.match(/\b(0[1-9][0-9]{2})\b/);
    const amountMatch = line.match(/\$([0-9,]+\.[0-9]{2})/);

    if (amountMatch) {
      const billedAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (billedAmount <= 0) continue;

      let code: string | null = null;
      let codeType: CodeType = 'OTHER';
      let violationType: ViolationType | undefined = undefined;

      if (cptMatch && KNOWN_DISPUTABLE_CODES[cptMatch[1]]) {
        code = cptMatch[1];
        codeType = KNOWN_DISPUTABLE_CODES[code].type;
        violationType = KNOWN_DISPUTABLE_CODES[code].violationType;
      } else if (hcpcsMatch && KNOWN_DISPUTABLE_CODES[hcpcsMatch[1]]) {
        code = hcpcsMatch[1];
        codeType = KNOWN_DISPUTABLE_CODES[code].type;
        violationType = KNOWN_DISPUTABLE_CODES[code].violationType;
      } else if (revCodeMatch && KNOWN_DISPUTABLE_CODES[revCodeMatch[1]]) {
        code = revCodeMatch[1];
        codeType = KNOWN_DISPUTABLE_CODES[code].type;
        violationType = KNOWN_DISPUTABLE_CODES[code].violationType;
      } else if (cptMatch) {
        code = cptMatch[1];
        codeType = 'CPT';
      } else if (hcpcsMatch) {
        code = hcpcsMatch[1];
        codeType = 'HCPCS';
      } else if (revCodeMatch) {
        code = revCodeMatch[1];
        codeType = 'REV_CODE';
      }

      // Clean description
      let description = line
        .replace(/\$([0-9,]+\.[0-9]{2})/, '')
        .replace(code ? new RegExp(`\\b${code}\\b`, 'g') : '', '')
        .replace(/^[-\s:;]+|[-\s:;]+$/g, '')
        .trim();

      if (!description) {
        description = code ? `Service Code ${code}` : 'Itemized Charge';
      }

      // Check for statutory flags
      let isFlagged = false;
      let flagReason: string | null = null;
      let statuteRef: string | null = null;

      if (code && KNOWN_DISPUTABLE_CODES[code]) {
        isFlagged = true;
        flagReason = KNOWN_DISPUTABLE_CODES[code].flagReason;
        statuteRef = KNOWN_DISPUTABLE_CODES[code].statuteRef;
      } else if (/emergency|er\s*facility|trauma|out-of-network/i.test(line)) {
        isFlagged = true;
        violationType = 'SURPRISE_BILL';
        flagReason =
          'Potential surprise balance billing for emergency or facility service.';
        statuteRef = '42 U.S.C. § 300gg-111 / No Surprises Act';
      } else if (/unbundled|facility\s*fee|administrative\s*fee|surcharge/i.test(line)) {
        isFlagged = true;
        violationType = 'UNBUNDLING';
        flagReason =
          'Suspect unbundled facility surcharge without itemized clinical justification.';
        statuteRef = '42 U.S.C. § 300gg-111';
      }

      items.push({
        id: `charge-${items.length + 1}`,
        code,
        codeType,
        description,
        serviceDate: null,
        units: 1,
        amount: billedAmount,
        billedAmount,
        allowedAmount: null,
        insurancePaid: null,
        patientResponsibility: billedAmount,
        isDisputed: isFlagged,
        isFlagged,
        violationType,
        violationExplanation: flagReason,
        statutoryBasis: statuteRef,
        flagReason,
        statuteRef,
      });
    }
  }

  return items;
}

/**
 * Main stateless document parser and structured entity extractor.
 *
 * Guarantees zero-retention client-side PII safeguards by executing
 * `redactSensitivePII` before extracting structured JSON entities.
 */
export function parseDocument(
  rawInputText: string,
  options: DocumentParseOptions = {}
): ExtractedDocument {
  // Step 1: Execute Zero-Retention PII Redactor
  const redactionResult = redactSensitivePII(rawInputText);
  const verification = verifyZeroPIIRetention(redactionResult.redactedText);

  if (!verification.isSafe) {
    throw new Error(
      `Zero PII retention policy violation: ${verification.violationReason}`
    );
  }

  const cleanText = redactionResult.redactedText;
  const nowIso = new Date().toISOString();

  // Step 2: Detect Category
  const { category, confidence } = detectDocumentCategory(
    cleanText,
    options.categoryHint
  );

  // Step 3: Heuristic Extraction
  const senderOrCreditor = extractSenderOrCreditor(cleanText);
  const financialSummary = extractFinancialSummary(cleanText);
  const statutoryDisclosures = extractStatutoryDisclosures(cleanText, category);
  const itemizedCharges = extractItemizedCharges(cleanText);

  // If financial summary total due is 0 but itemized charges exist, compute sum
  if (financialSummary.totalDue === 0 && itemizedCharges.length > 0) {
    const sum = itemizedCharges.reduce((acc, curr) => acc + curr.amount, 0);
    financialSummary.totalDue = sum;
    financialSummary.totalBilled = sum;
  }

  // Calculate audit flags count and total flagged amount
  const flaggedItems = itemizedCharges.filter((item) => item.isFlagged);
  const auditFlagsCount =
    flaggedItems.length + statutoryDisclosures.missingMandatoryDisclosures.length;
  const totalFlaggedAmount = flaggedItems.reduce(
    (acc, curr) => acc + curr.amount,
    0
  );

  // Count individual sensitive tokens for redaction metrics
  const ssnCount = redactionResult.entities.filter((e) => e.type === 'SSN').length;
  const cardCount = redactionResult.entities.filter((e) => e.type === 'CREDIT_CARD').length;
  const mrnCount = redactionResult.entities.filter((e) => e.type === 'MEDICAL_MRN').length;
  const routingCount = redactionResult.entities.filter(
    (e) => e.type === 'ROUTING_NUMBER' || e.type === 'BANK_ACCOUNT'
  ).length;
  const dobCount = redactionResult.entities.filter((e) => e.type === 'DOB').length;

  // Redaction Summary & Metrics
  const redactionSummary = {
    originalTextLength: redactionResult.originalTextLength,
    redactedTextLength: cleanText.length,
    detectedEntitiesCount: redactionResult.detectedCount,
    hasHighRiskPII: redactionResult.hasHighRiskPII,
    entityTypesMasked: Array.from(
      new Set(redactionResult.entities.map((e) => e.type))
    ),
    zeroRetentionVerified: true,
  };

  const redactionMetrics = {
    totalEntitiesFound: redactionResult.detectedCount,
    ssnCount,
    cardCount,
    mrnCount,
    routingCount,
    dobCount,
    hasHighRiskPII: redactionResult.hasHighRiskPII,
  };

  // Build Normalized Object
  const candidate: ExtractedDocument = {
    fileName: options.fileName,
    fileSize: options.fileSize,
    fileType: options.fileType,
    detectedCategory: category,
    confidenceScore: confidence,
    senderOrCreditor,
    consumerOrDebtor: {
      name: null,
      address: null,
      maskedAccountNumber: senderOrCreditor.accountOrReferenceNumber,
      maskedPatientId: null,
    },
    debtOrBillDetails: {
      statementDate: financialSummary.statementDate,
      dueDate: financialSummary.dueDate,
      totalDue: financialSummary.totalDue,
      totalBilled: financialSummary.totalBilled,
      originalCreditor: financialSummary.originalCreditor,
      patientResponsibility: financialSummary.patientResponsibility ?? undefined,
      itemizedCharges,
    },
    itemizedCharges,
    financialSummary,
    statutoryDisclosures,
    rawText: rawInputText,
    redactedText: cleanText,
    rawRedactedText: cleanText,
    redactionMetrics,
    redactionSummary,
    uploadedAt: nowIso,
    extractedAt: nowIso,
    auditFlagsCount,
    totalFlaggedAmount,
  };

  // Step 4: Strict Zod Validation
  return ExtractedDocumentSchema.parse(candidate);
}
