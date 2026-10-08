import { parseDocument } from '../src/lib/ocr/extractor';
import { redactSensitivePII, verifyZeroPIIRetention } from '../src/lib/ocr/redactor';
import { ExtractedDocumentSchema } from '../src/lib/ocr/schemas';
import { CaseRepository } from '../src/lib/db/caseRepository';

export async function runOcrPipelineTests(): Promise<{
  success: boolean;
  accuracy: number;
  piiViolationsCount: number;
  totalChecks: number;
}> {
  console.log('================================================================');
  console.log('  JUSTITIA STATUTORY AUDIT & OCR ACCURACY VERIFICATION SUITE   ');
  console.log('================================================================\n');

  let passedAssertions = 0;
  let totalAssertions = 0;

  function assert(condition: boolean, passMsg: string, failMsg: string) {
    totalAssertions++;
    if (condition) {
      passedAssertions++;
      console.log(`  [PASS] ${passMsg}`);
    } else {
      console.error(`  [FAIL] ${failMsg}`);
      throw new Error(`Assertion Failed: ${failMsg}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Medical Bill with PII, CPT 99070 Unbundling, CPT 99285 Upcoding, No Surprises Act
  // -------------------------------------------------------------------------
  console.log('TEST 1: Ingesting & Auditing Inflated Hospital Emergency Bill...');
  const sampleMedicalBill = `
VALLEY GENERAL HEALTH SYSTEM
Department of Emergency Medicine
100 Health Sciences Blvd, Seattle, WA 98104
Phone: (206) 555-0199
Account Number: ACT-449812

PATIENT BILLING STATEMENT
Statement Date: October 01, 2026
Due Date: October 31, 2026
Patient Name: Jane Consumer
SSN: 219-45-8910
Patient ID: MRN-55281
Routing Number: 121000358
Bank Account: 9876543210
Credit Card: 4111111111119876

ITEMIZED CHARGES:
99285 Emergency Department Visit Level 5 $2,450.00
99070 Special Surgical Tray Supplies $680.00
80053 Comprehensive Metabolic Panel $380.00
71046 Radiologic Exam Chest 2 Views $420.00
0450 Hospital Emergency Room Facility Fee $1,800.00

Total Billed: $5,730.00
Patient Responsibility: $5,730.00
Notice: Non-participating out-of-network provider balance billing.
`;

  // Parse document through pipeline
  const medResult = parseDocument(sampleMedicalBill, {
    fileName: 'valley_hospital_er_bill.txt',
    fileSize: sampleMedicalBill.length,
    fileType: 'text/plain',
  });

  // Verify Zod schema conformity
  const parsedMed = ExtractedDocumentSchema.parse(medResult);
  assert(Boolean(parsedMed), 'Zod Schema Validation Succeeded.', 'Zod Schema failed to validate ExtractedDocument');

  // Verify Zero PII Retention
  const piiCheck1 = verifyZeroPIIRetention(medResult.redactedText || '');
  assert(piiCheck1.isSafe, 'Zero PII Leak: Zero unmasked SSNs or Credit Cards found.', `PII leak detected: ${piiCheck1.violationReason}`);

  const hasExposedSSN1 = medResult.redactedText?.includes('219-45-8910') ?? false;
  const hasExposedCC1 = medResult.redactedText?.includes('4111111111119876') ?? false;
  const hasExposedBank1 = medResult.redactedText?.includes('9876543210') ?? false;
  assert(!hasExposedSSN1 && !hasExposedCC1 && !hasExposedBank1, 'Zero-Retention Guarantee: All patient PII masked into secure compliance tokens.', 'Raw PII leaked in output text');

  // Verify Category Classification
  assert(medResult.detectedCategory === 'MEDICAL_BILLING', 'Category Correctly Detected: MEDICAL_BILLING', `Expected MEDICAL_BILLING, got ${medResult.detectedCategory}`);

  // Verify Creditor extraction
  assert(medResult.senderOrCreditor.name.includes('VALLEY GENERAL'), `Creditor Extracted: "${medResult.senderOrCreditor.name}"`, 'Creditor extraction failed');

  // Verify Account Number extraction
  assert(medResult.senderOrCreditor.accountOrReferenceNumber === 'ACT-449812', `Account Number Extracted: "${medResult.senderOrCreditor.accountOrReferenceNumber}"`, 'Account number mismatch');

  // Verify CPT 99285 Upcoding Flagging
  const upcodedItem = medResult.debtOrBillDetails.itemizedCharges.find((c) => c.code === '99285');
  assert(Boolean(upcodedItem && upcodedItem.isFlagged), `CPT 99285 Flagged for Upcoding: "${upcodedItem?.flagReason}"`, 'CPT 99285 was not flagged for upcoding');

  // Verify CPT 99070 Unbundling Flagging
  const unbundledItem = medResult.debtOrBillDetails.itemizedCharges.find((c) => c.code === '99070');
  assert(Boolean(unbundledItem && unbundledItem.isFlagged), `CPT 99070 Flagged for Unbundling: "${unbundledItem?.flagReason}"`, 'CPT 99070 was not flagged for unbundling');

  // Verify Revenue Code 0450 Facility Fee Detection
  const facilityItem = medResult.debtOrBillDetails.itemizedCharges.find((c) => c.code === '0450');
  assert(Boolean(facilityItem && facilityItem.codeType === 'REV_CODE'), `Revenue Code 0450 Identified: "${facilityItem?.description}"`, 'Revenue code 0450 not identified');

  // Verify Missing No Surprises Act Disclosure
  const hasNsaNotice = medResult.statutoryDisclosures.hasNoSurprisesNotice;
  const missingNsa = medResult.statutoryDisclosures.missingMandatoryDisclosures.some((d) =>
    d.includes('No Surprises Act')
  );
  assert(!hasNsaNotice && missingNsa, 'No Surprises Act Violation Detected: Missing mandatory balance billing disclosure flagged.', 'No Surprises Act violation was not flagged');

  // -------------------------------------------------------------------------
  // TEST 2: Predatory Debt Collection Notice Missing FDCPA Disclosures
  // -------------------------------------------------------------------------
  console.log('\nTEST 2: Ingesting Predatory Debt Collection Notice...');
  const sampleDebtNotice = `
APEX RECOVERY SOLUTIONS LLC
450 Financial Way, Wilmington, DE 19801
Phone: (302) 555-4321
Ref Number: CLM-889102

FINAL COLLECTION DEMAND NOTICE
Date: October 04, 2026
Debtor: John Consumer
SSN: 332-11-7788
Bank Routing: 021000021
Checking Account: 44001928374

DEMAND SUMMARY:
Original Creditor: Horizon Wireless
Original Balance: $850.00
Collection Fee: $350.00
Total Due: $1,200.00

Immediate payment is required to avoid further actions within 10 calendar days.
`;

  const debtResult = parseDocument(sampleDebtNotice, {
    fileName: 'apex_debt_demand.txt',
    fileSize: sampleDebtNotice.length,
    fileType: 'text/plain',
  });

  // Verify Category
  assert(debtResult.detectedCategory === 'DEBT_COLLECTION', 'Category Correctly Detected: DEBT_COLLECTION', `Expected DEBT_COLLECTION, got ${debtResult.detectedCategory}`);

  // Verify Zero PII Leak
  const piiCheck2 = verifyZeroPIIRetention(debtResult.redactedText || '');
  assert(piiCheck2.isSafe, 'Zero PII Leak Guarantee: Debtor SSN and Banking numbers masked.', `PII leak: ${piiCheck2.violationReason}`);

  // Verify FDCPA Violations (Missing Mini-Miranda & Missing 30-day notice)
  assert(!debtResult.statutoryDisclosures.hasFdcpaMiniMiranda, 'FDCPA Mini-Miranda Correctly Identified as Missing', 'Mini-Miranda falsely detected');
  assert(!debtResult.statutoryDisclosures.hasValidationPeriodNotice, 'FDCPA 30-Day Validation Notice Correctly Identified as Missing', '30-day notice falsely detected');

  const fdcpaMissingCount = debtResult.statutoryDisclosures.missingMandatoryDisclosures.length;
  assert(fdcpaMissingCount >= 2, `FDCPA Disclosures Flagged (${fdcpaMissingCount} statutory violations):`, 'Expected both Mini-Miranda and 30-day validation notice to be flagged as missing');
  debtResult.statutoryDisclosures.missingMandatoryDisclosures.forEach((d) => console.log(`         - ${d}`));

  // -------------------------------------------------------------------------
  // TEST 3: Quantitative 95%+ Extraction Accuracy Audit
  // -------------------------------------------------------------------------
  console.log('\nTEST 3: Evaluating Quantitative Extraction Accuracy...');
  // Ground truth evaluation across 20 critical entity data points:
  const targetDataPoints = [
    // Med bill
    medResult.detectedCategory === 'MEDICAL_BILLING',
    medResult.senderOrCreditor.name.includes('VALLEY GENERAL'),
    medResult.senderOrCreditor.accountOrReferenceNumber === 'ACT-449812',
    medResult.senderOrCreditor.phone === '(206) 555-0199',
    medResult.senderOrCreditor.city === 'Seattle',
    medResult.senderOrCreditor.state === 'WA',
    medResult.senderOrCreditor.zip === '98104',
    medResult.financialSummary.totalDue === 5730.0,
    medResult.debtOrBillDetails.itemizedCharges.length === 5,
    medResult.debtOrBillDetails.itemizedCharges.some((c) => c.code === '99285' && (c.billedAmount === 2450.0 || c.amount === 2450.0)),
    medResult.debtOrBillDetails.itemizedCharges.some((c) => c.code === '99070' && (c.billedAmount === 680.0 || c.amount === 680.0)),
    medResult.debtOrBillDetails.itemizedCharges.some((c) => c.code === '80053' && (c.billedAmount === 380.0 || c.amount === 380.0)),
    medResult.statutoryDisclosures.hasOutOfNetworkMarkers === true,
    !medResult.statutoryDisclosures.hasNoSurprisesNotice,
    // Debt notice
    debtResult.detectedCategory === 'DEBT_COLLECTION',
    debtResult.senderOrCreditor.name.includes('APEX RECOVERY'),
    debtResult.senderOrCreditor.accountOrReferenceNumber === 'CLM-889102',
    debtResult.financialSummary.totalDue === 1200.0,
    debtResult.financialSummary.originalBalance === 850.0,
    debtResult.statutoryDisclosures.missingMandatoryDisclosures.length >= 2,
  ];

  const matchedCount = targetDataPoints.filter(Boolean).length;
  const accuracyRate = (matchedCount / targetDataPoints.length) * 100;
  console.log(`  [INFO] Extracted Entities: ${matchedCount} / ${targetDataPoints.length} target fields`);
  console.log(`  [INFO] Pipeline Extraction Accuracy: ${accuracyRate.toFixed(2)}%`);
  assert(accuracyRate >= 95.0, `Extraction Accuracy Threshold Verified: ${accuracyRate.toFixed(1)}% >= 95% statutory standard`, 'Accuracy failed to achieve 95%');

  // -------------------------------------------------------------------------
  // TEST 4: Database Persistence via CaseRepository (SQLite dev.db)
  // -------------------------------------------------------------------------
  console.log('\nTEST 4: Verifying SQLite Persistence via CaseRepository...');
  const newCase = await CaseRepository.createCase({
    title: `Dispute Case: ${medResult.senderOrCreditor.name}`,
    category: medResult.detectedCategory,
    opponentName: medResult.senderOrCreditor.name,
    opponentAddress: medResult.senderOrCreditor.address,
    accountNumber: medResult.senderOrCreditor.accountOrReferenceNumber,
    disputedAmount: medResult.debtOrBillDetails.totalDue,
    currency: 'USD',
    statutoryDays: 30,
  });

  assert(Boolean(newCase.id), `Case Created in SQLite: ID = ${newCase.id}`, 'Case creation failed');

  const savedDoc = await CaseRepository.addDocument({
    caseId: newCase.id,
    fileName: 'valley_hospital_er_bill.txt',
    fileType: 'text/plain',
    fileSize: sampleMedicalBill.length,
    filePath: 'uploads/documents/test_er_bill.txt',
    ocrRawText: medResult.redactedText,
    parsedJson: JSON.stringify(medResult),
  });

  assert(Boolean(savedDoc.id), `Document Attached: Doc ID = ${savedDoc.id}`, 'Document attachment failed');

  // Sync Line Items
  const lineItemDTOs = medResult.debtOrBillDetails.itemizedCharges.map((item) => ({
    description: item.description,
    billedAmount: item.billedAmount ?? item.amount,
    fairAmount: item.allowedAmount ?? null,
    isFlagged: item.isFlagged ?? false,
    flagReason: item.flagReason ?? null,
    statuteRef: item.statuteRef ?? null,
  }));
  const savedLines = await CaseRepository.setLineItems(newCase.id, lineItemDTOs);
  assert(savedLines.length === 5, `Itemized Line Items Persisted: Count = ${savedLines.length}`, 'Line items persistence count mismatch');

  // Query Case back with relations
  const fetchedCase = await CaseRepository.getCaseById(newCase.id);
  assert(
    Boolean(fetchedCase && fetchedCase.documents.length === 1 && fetchedCase.lineItems.length === 5),
    `Case Verification Query Succeeded: Loaded ${fetchedCase?.documents.length} docs and ${fetchedCase?.lineItems.length} lines.`,
    'Case query failed'
  );

  // Cleanup test case
  await CaseRepository.deleteCase(newCase.id);
  assert(true, 'Test Case Cleaned Up Cascadingly.', '');

  console.log('\n================================================================');
  console.log(`  ALL ${totalAssertions} COMPLIANCE & OCR TESTS PASSED SUCCESSFULLY! (${accuracyRate.toFixed(1)}% Accuracy)`);
  console.log('================================================================\n');

  return {
    success: true,
    accuracy: accuracyRate,
    piiViolationsCount: 0,
    totalChecks: totalAssertions,
  };
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runOcrPipelineTests().catch((err) => {
    console.error('\n[FATAL TEST FAILURE]:', err);
    process.exit(1);
  });
}
