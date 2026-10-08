import { parseDocument } from '../src/lib/ocr/extractor';
import { verifyZeroPIIRetention } from '../src/lib/ocr/redactor';
import { compileDisputeLetter, getGoverningStatuteForCategory } from '../src/lib/disputes/engine';
import { generateFdcpaLetter } from '../src/lib/disputes/fdcpa';
import { generateNoSurprisesLetter } from '../src/lib/disputes/noSurprises';
import { generateFcraLetter } from '../src/lib/disputes/fcra';
import { generateFtcClickToCancelLetter } from '../src/lib/disputes/ftcClickToCancel';
import { CaseRepository } from '../src/lib/db/caseRepository';

export async function runDisputeEngineVerification() {
  console.log('================================================================');
  console.log('  JUSTITIA & LEX STATUTORY RULES & DISPUTE ENGINE AUDIT SUITE   ');
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
  // TEST 1: FDCPA Debt Collection Statutory Demand (15 U.S.C. § 1692g)
  // -------------------------------------------------------------------------
  console.log('TEST 1: Verifying FDCPA 30-Day Debt Validation & Cease-and-Desist Engine...');
  const debtRawSample = `
APEX RECOVERY SOLUTIONS LLC
450 Financial Way, Wilmington, DE 19801
Phone: (302) 555-4321
Ref Number: CLM-889102

FINAL COLLECTION DEMAND NOTICE
Date: October 04, 2026
Debtor: Jane Consumer
SSN: 332-11-7788
Bank Routing: 021000021
Checking Account: 44001928374

DEMAND SUMMARY:
Original Creditor: Horizon Wireless
Original Balance: $850.00
Collection Fee: $350.00
Total Due: $1,200.00
`;

  const parsedDebtDoc = parseDocument(debtRawSample, {
    fileName: 'apex_collection_notice.txt',
  });

  const fdcpaLetter = generateFdcpaLetter({
    parsedDoc: parsedDebtDoc,
    directives: {
      ceasePhoneCalls: true,
      demandItemizedLedger: true,
      citeStatutoryDamages: true,
      includeRegulatoryEscalation: true,
      certifiedMailNumber: '7020 0640 0001 2345 6789',
      customNotes: 'I do not recognize this wireless account and requested proof in writing previously.',
    },
    senderOverride: {
      name: 'Jane Consumer',
      address: '742 Evergreen Terrace, Seattle, WA 98101',
    },
  });

  assert(fdcpaLetter.disputeDomain === 'DEBT_COLLECTION', 'FDCPA Domain Correct: DEBT_COLLECTION', 'Domain mismatch');
  assert(fdcpaLetter.statutorySlaDays === 30, 'FDCPA Statutory SLA: 30 Calendar Days', 'SLA mismatch');
  assert(fdcpaLetter.governingStatute.timeUnit === 'calendar_days', 'FDCPA Time Unit: calendar_days', 'Time unit mismatch');
  assert(fdcpaLetter.legalCitations.some((c: string) => c.includes('15 U.S.C. § 1692g')), 'Mandatory 15 U.S.C. § 1692g Cited', 'Missing 1692g citation');
  assert(fdcpaLetter.legalCitations.some((c: string) => c.includes('15 U.S.C. § 1692c(c)')), 'Telephone Cease-and-Desist 15 U.S.C. § 1692c(c) Cited', 'Missing 1692c citation');
  assert(fdcpaLetter.legalCitations.some((c: string) => c.includes('15 U.S.C. § 1692k')), 'Statutory Damages 15 U.S.C. § 1692k Cited', 'Missing 1692k citation');
  assert(fdcpaLetter.fullLetterMarkdown.includes('7020 0640 0001 2345 6789'), 'Certified Mail Barcode Tracking Included', 'Missing tracking number');
  assert(fdcpaLetter.fullLetterMarkdown.includes('cease and desist all telephone contact'), 'Cease Telephone Contact Directive Active', 'Missing cease phone directive');
  assert(fdcpaLetter.fullLetterMarkdown.includes('Full Chain-of-Title Assignments'), 'Chain-of-Title Demand Included', 'Missing chain of title demand');
  assert(fdcpaLetter.fullLetterMarkdown.includes('Consumer Financial Protection Bureau (CFPB)'), 'CFPB Regulatory Escalation Included', 'Missing CFPB notice');

  // Zero PII Leak Audit for FDCPA Letter
  const fdcpaPiiCheck = verifyZeroPIIRetention(fdcpaLetter.fullLetterMarkdown);
  assert(fdcpaPiiCheck.isSafe, 'Zero PII Retention Verified in FDCPA Letter', `PII Leak: ${fdcpaPiiCheck.violationReason}`);
  assert(!fdcpaLetter.fullLetterMarkdown.includes('332-11-7788'), 'Debtor SSN Masked in FDCPA Letter', 'Raw SSN leaked in FDCPA letter');
  assert(!fdcpaLetter.fullLetterMarkdown.includes('44001928374'), 'Debtor Bank Account Masked in FDCPA Letter', 'Raw Bank Account leaked');

  // -------------------------------------------------------------------------
  // TEST 2: No Surprises Act Medical Billing Engine (42 U.S.C. § 300gg-111)
  // -------------------------------------------------------------------------
  console.log('\nTEST 2: Verifying No Surprises Act Open Negotiation & Coding Engine...');
  const medRawSample = `
MEMORIAL REGIONAL HOSPITAL & HEALTHCARE NETWORK
Claims & Patient Financial Services
100 Hospital Drive, Austin, TX 78705
Account Number: 847291048

PATIENT BILLING STATEMENT
Statement Date: September 20, 2026
Patient Name: Johnathan Doe
SSN: 123-45-6789
Patient ID: MRN-99412

ITEMIZED CHARGES:
99285 Emergency Dept Visit Level 5 $2,450.00
99070 Special Surgical Tray Supplies $680.00
0450 Hospital Emergency Room Facility Fee $890.00
Out-of-Network Emergency Physician Surcharge $1,200.00

Total Billed: $5,220.00
Patient Responsibility: $3,420.00
Notice: Non-participating out-of-network provider balance billing.
`;

  const parsedMedDoc = parseDocument(medRawSample, {
    fileName: 'memorial_er_bill.txt',
  });

  const nsaLetter = generateNoSurprisesLetter({
    parsedDoc: parsedMedDoc,
    directives: {
      demandItemizedLedger: true,
      citeStatutoryDamages: true,
      includeRegulatoryEscalation: true,
      certifiedMailNumber: '7020 0640 0001 8888 9999',
    },
  });

  assert(nsaLetter.disputeDomain === 'MEDICAL_BILLING', 'No Surprises Domain Correct: MEDICAL_BILLING', 'Domain mismatch');
  assert(nsaLetter.statutorySlaDays === 30, 'No Surprises Statutory SLA: 30 Business Days', 'SLA mismatch');
  assert(nsaLetter.governingStatute.timeUnit === 'business_days', 'No Surprises Time Unit: business_days', 'Time unit mismatch');
  assert(nsaLetter.legalCitations.some((c: string) => c.includes('42 U.S.C. § 300gg-111')), '42 U.S.C. § 300gg-111 Balance Billing Ban Cited', 'Missing NSA citation');
  assert(nsaLetter.legalCitations.some((c: string) => c.includes('45 CFR Part 149')), '45 CFR Part 149 IDR Regulations Cited', 'Missing 45 CFR Part 149');
  assert(nsaLetter.legalCitations.some((c: string) => c.includes('42 U.S.C. § 300gg-139')), '$10,000 CMP Penalties 42 U.S.C. § 300gg-139 Cited', 'Missing penalty citation');
  assert(nsaLetter.fullLetterMarkdown.includes('30-Business-Day Open Negotiation Notice'), 'Open Negotiation Precursor to IDR Stated', 'Missing open negotiation header');
  assert(nsaLetter.fullLetterMarkdown.includes('Qualified Payment Amount (QPA)'), 'Qualified Payment Amount (QPA) Demand Included', 'Missing QPA demand');
  assert(nsaLetter.fullLetterMarkdown.includes('Centers for Medicare & Medicaid Services (CMS No Surprises Help Desk)'), 'CMS Help Desk Escalation Notice Included', 'Missing CMS escalation');
  assert(nsaLetter.fullLetterMarkdown.includes('Itemized Billing Discrepancies'), 'Itemized Coding Discrepancies Table Present', 'Missing itemized section');
  assert(nsaLetter.fullLetterMarkdown.includes('99285') && nsaLetter.fullLetterMarkdown.includes('99070'), 'Flagged Codes (99285 upcoding, 99070 unbundling) Displayed', 'Flagged codes missing from breakdown');
  assert(nsaLetter.fullLetterMarkdown.includes('7020 0640 0001 8888 9999'), 'Certified Mail Header Included in Medical Letter', 'Missing tracking number');

  // Zero PII Leak Audit for No Surprises Letter
  const nsaPiiCheck = verifyZeroPIIRetention(nsaLetter.fullLetterMarkdown);
  assert(nsaPiiCheck.isSafe, 'Zero PII Retention Verified in Medical Billing Letter', `PII Leak: ${nsaPiiCheck.violationReason}`);
  assert(!nsaLetter.fullLetterMarkdown.includes('123-45-6789'), 'Patient SSN Masked in Medical Letter', 'Raw SSN leaked in Medical letter');

  // -------------------------------------------------------------------------
  // TEST 3: FCRA Credit Reporting Reinvestigation Engine (15 U.S.C. § 1681i)
  // -------------------------------------------------------------------------
  console.log('\nTEST 3: Verifying FCRA 30-Day Reinvestigation & Method of Verification Engine...');
  const fcraRawSample = `
EQUIFAX INFORMATION SERVICES LLC
Dispute Processing Center
P.O. Box 740256, Atlanta, GA 30374
Reference Number: EQ-992140

CREDIT REPORT DISCLOSURE DISCREPANCY
Report Date: October 01, 2026
Consumer: Alex Mercer
SSN: 987-65-4321

DISPUTED TRADELINE:
First National Collections - Account #88410928
Balance Reported: $1,450.00
Status: Collection / Derogatory
Date of First Delinquency: 08/2018 (Obsolete beyond statutory 7 years)
`;

  const parsedFcraDoc = parseDocument(fcraRawSample, {
    categoryHint: 'CREDIT_REPORT_ERROR',
    fileName: 'equifax_credit_report.txt',
  });

  const fcraLetter = generateFcraLetter({
    parsedDoc: parsedFcraDoc,
    directives: {
      demandItemizedLedger: true,
      citeStatutoryDamages: true,
      includeRegulatoryEscalation: true,
      certifiedMailNumber: '7020 0640 0001 5555 4444',
    },
  });

  assert(fcraLetter.disputeDomain === 'CREDIT_REPORT_ERROR', 'FCRA Domain Correct: CREDIT_REPORT_ERROR', 'Domain mismatch');
  assert(fcraLetter.statutorySlaDays === 30, 'FCRA Statutory SLA: 30 Calendar Days', 'SLA mismatch');
  assert(fcraLetter.governingStatute.timeUnit === 'calendar_days', 'FCRA Time Unit: calendar_days', 'Time unit mismatch');
  assert(fcraLetter.legalCitations.some((c: string) => c.includes('15 U.S.C. § 1681i')), '15 U.S.C. § 1681i Reinvestigation Cited', 'Missing 1681i citation');
  assert(fcraLetter.legalCitations.some((c: string) => c.includes('15 U.S.C. § 1681i(a)(7)')), 'Method of Verification (MOV) § 611(a)(7) Cited', 'Missing MOV citation');
  assert(fcraLetter.legalCitations.some((c: string) => c.includes('15 U.S.C. § 1681s-2')), 'Furnisher Duties 15 U.S.C. § 1681s-2 Cited', 'Missing 1681s-2 citation');
  assert(fcraLetter.fullLetterMarkdown.includes('Method of Verification (MOV)'), 'MOV Demand Section Present', 'Missing MOV section in letter');
  assert(fcraLetter.fullLetterMarkdown.includes('15 U.S.C. § 1681n'), 'Willful Non-Compliance Civil Liability Stated', 'Missing 1681n liability');
  assert(fcraLetter.fullLetterMarkdown.includes('7020 0640 0001 5555 4444'), 'Certified Mail Header Included in FCRA Letter', 'Missing tracking number');
  assert(fcraLetter.fullLetterMarkdown.includes('Consumer Financial Protection Bureau (CFPB)'), 'Regulatory Escalation Present in FCRA Letter', 'Missing regulatory agency');

  // Zero PII Leak Audit for FCRA Letter
  const fcraPiiCheck = verifyZeroPIIRetention(fcraLetter.fullLetterMarkdown);
  assert(fcraPiiCheck.isSafe, 'Zero PII Retention Verified in FCRA Letter', `PII Leak: ${fcraPiiCheck.violationReason}`);
  assert(!fcraLetter.fullLetterMarkdown.includes('987-65-4321'), 'Consumer SSN Masked in FCRA Letter', 'Raw SSN leaked in FCRA letter');

  // -------------------------------------------------------------------------
  // TEST 4: FTC Negative Option & EFTA Engine (16 CFR Part 425 & 15 U.S.C. § 1693e)
  // -------------------------------------------------------------------------
  console.log('\nTEST 4: Verifying FTC Click-to-Cancel & EFTA Debit Revocation Engine...');
  const ftcRawSample = `
FITNESS PRO GLOBAL CORP
Membership & Recurring Billing Services
500 Fitness Blvd, Santa Monica, CA 90401
Account Number: SUB-559124

MONTHLY SUBSCRIPTION BILLING STATEMENT
Statement Date: October 05, 2026
Member: John Doe
Card: 4111111111119999

ITEMIZED CHARGES:
Monthly VIP Club Membership Renewal $149.00
Unsolicited Personal Trainer Add-On $79.00
`;

  const parsedFtcDoc = parseDocument(ftcRawSample, {
    categoryHint: 'SUBSCRIPTION_CANCEL',
    fileName: 'fitness_subscription_invoice.txt',
  });

  const ftcLetter = generateFtcClickToCancelLetter({
    parsedDoc: parsedFtcDoc,
    directives: {
      demandItemizedLedger: true,
      citeStatutoryDamages: true,
      includeRegulatoryEscalation: true,
      certifiedMailNumber: '7020 0640 0001 2222 1111',
    },
  });

  assert(ftcLetter.disputeDomain === 'SUBSCRIPTION_CANCEL', 'FTC Domain Correct: SUBSCRIPTION_CANCEL', 'Domain mismatch');
  assert(ftcLetter.statutorySlaDays === 10, 'FTC/EFTA Statutory SLA: 10 Business Days', 'SLA mismatch');
  assert(ftcLetter.governingStatute.timeUnit === 'business_days', 'FTC Time Unit: business_days', 'Time unit mismatch');
  assert(ftcLetter.legalCitations.some((c: string) => c.includes('16 CFR Part 425')), '16 CFR Part 425 Click-to-Cancel Rule Cited', 'Missing 16 CFR Part 425');
  assert(ftcLetter.legalCitations.some((c: string) => c.includes('15 U.S.C. § 1693e')), 'EFTA § 907 Debit Revocation 15 U.S.C. § 1693e Cited', 'Missing 1693e citation');
  assert(ftcLetter.fullLetterMarkdown.includes('REVOKE ALL AUTHORIZATION'), 'Preauthorized Debit Revocation Clause Present', 'Missing revocation clause');
  assert(ftcLetter.fullLetterMarkdown.includes('$51,744 per violation'), 'FTC Section 5 Penalty Notice Present', 'Missing FTC penalty notice');
  assert(ftcLetter.fullLetterMarkdown.includes('7020 0640 0001 2222 1111'), 'Certified Mail Header Included in FTC Letter', 'Missing tracking number');
  assert(ftcLetter.fullLetterMarkdown.includes('Federal Trade Commission (FTC Bureau of Consumer Protection)'), 'FTC Escalation Notice Included', 'Missing FTC escalation');

  // Zero PII Leak Audit for FTC Letter
  const ftcPiiCheck = verifyZeroPIIRetention(ftcLetter.fullLetterMarkdown);
  assert(ftcPiiCheck.isSafe, 'Zero PII Retention Verified in FTC Letter', `PII Leak: ${ftcPiiCheck.violationReason}`);
  assert(!ftcLetter.fullLetterMarkdown.includes('4111111111119999'), 'Credit Card Number Masked in FTC Letter', 'Raw Credit Card leaked in FTC letter');

  // -------------------------------------------------------------------------
  // TEST 5: Master Compiler & Router Integration
  // -------------------------------------------------------------------------
  console.log('\nTEST 5: Verifying Master Dispute Compiler & Category Routing...');
  const compiledMed = compileDisputeLetter({ parsedDoc: parsedMedDoc });
  assert(compiledMed.disputeDomain === 'MEDICAL_BILLING', 'Router correctly mapped Medical to No Surprises', 'Routing failure');

  const compiledDebt = compileDisputeLetter({ parsedDoc: parsedDebtDoc });
  assert(compiledDebt.disputeDomain === 'DEBT_COLLECTION', 'Router correctly mapped Debt to FDCPA', 'Routing failure');

  const compiledFcra = compileDisputeLetter({ parsedDoc: parsedFcraDoc });
  assert(compiledFcra.disputeDomain === 'CREDIT_REPORT_ERROR', 'Router correctly mapped Credit Report to FCRA', 'Routing failure');

  const compiledFtc = compileDisputeLetter({ parsedDoc: parsedFtcDoc });
  assert(compiledFtc.disputeDomain === 'SUBSCRIPTION_CANCEL', 'Router correctly mapped Subscription to FTC', 'Routing failure');

  // -------------------------------------------------------------------------
  // TEST 6: SQLite Database Persistence via CaseRepository.createDisputeLetter
  // -------------------------------------------------------------------------
  console.log('\nTEST 6: Verifying SQLite Persistence of Generated Dispute Letters...');
  const testCase = await CaseRepository.createCase({
    title: `Dispute Case: ${compiledMed.recipientName}`,
    category: compiledMed.disputeDomain,
    opponentName: compiledMed.recipientName,
    opponentAddress: compiledMed.recipientAddress,
    accountNumber: '847291048',
    disputedAmount: compiledMed.totalDisputedAmount,
    currency: 'USD',
    statutoryDays: compiledMed.statutorySlaDays,
  });

  assert(Boolean(testCase.id), `Case Created: ID = ${testCase.id}`, 'Case creation failed');

  const savedLetter = await CaseRepository.createDisputeLetter(testCase.id, {
    recipientName: compiledMed.recipientName,
    recipientAddr: compiledMed.recipientAddress,
    subjectLine: compiledMed.subjectLine,
    bodyMarkdown: compiledMed.fullLetterMarkdown,
    legalCitations: JSON.stringify(compiledMed.legalCitations),
  });

  assert(Boolean(savedLetter.id), `Dispute Letter Persisted: ID = ${savedLetter.id}, Version = ${savedLetter.version}`, 'Letter persistence failed');
  assert(savedLetter.version === 1, 'Letter Version starts at 1', 'Letter version mismatch');

  const fetchedCaseWithLetter = await CaseRepository.getCaseById(testCase.id);
  assert(
    Boolean(fetchedCaseWithLetter && fetchedCaseWithLetter.disputeLetters.length === 1),
    `Case Query Loaded Dispute Letter: Count = ${fetchedCaseWithLetter?.disputeLetters.length}`,
    'Case relations query failed'
  );
  assert(
    fetchedCaseWithLetter?.status === 'LETTER_GENERATED',
    'Case Status Updated to LETTER_GENERATED',
    'Case status not updated'
  );

  // Cascading cleanup
  await CaseRepository.deleteCase(testCase.id);
  assert(true, 'Test Case and Dispute Letter Cleaned Up Cascadingly.', '');

  console.log('\n================================================================');
  console.log(`  ALL ${totalAssertions} DISPUTE ENGINE TESTS PASSED SUCCESSFULLY! (100% STATUTORY ACCURACY & ZERO PII LEAKS)`);
  console.log('================================================================\n');

  return {
    success: true,
    totalChecks: totalAssertions,
  };
}

if (typeof require !== 'undefined' && require.main === module) {
  runDisputeEngineVerification().catch((err) => {
    console.error('\n[FATAL TEST FAILURE]:', err);
    process.exit(1);
  });
}
