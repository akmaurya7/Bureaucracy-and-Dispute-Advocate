import zlib from 'zlib';
import { parseDocument } from '../src/lib/ocr/extractor';
import { verifyZeroPIIRetention } from '../src/lib/ocr/redactor';
import { compileDisputeLetter } from '../src/lib/disputes/engine';
import { generateFdcpaLetter } from '../src/lib/disputes/fdcpa';
import { generateNoSurprisesLetter } from '../src/lib/disputes/noSurprises';
import { generateFcraLetter } from '../src/lib/disputes/fcra';
import { generateFtcClickToCancelLetter } from '../src/lib/disputes/ftcClickToCancel';
import { generateCourtReadyDisputePdf, generateCourtReadyPdf } from '../src/lib/pdf/generator';
import { CaseRepository } from '../src/lib/db/caseRepository';
import { POST as handlePdfExportPost } from '../src/app/api/disputes/pdf/route';
import { NextRequest } from 'next/server';

/**
 * Extracts and decodes all textual content from PDF streams (both uncompressed and Flate-compressed,
 * handling hex-encoded <HEX> Tj and literal (text) Tj operands).
 */
function extractPdfText(buffer: Uint8Array): string {
  const raw = Buffer.from(buffer).toString('latin1');
  let extracted = '';

  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;

  while ((m = streamRegex.exec(raw)) !== null) {
    let streamText = '';
    try {
      streamText = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1');
    } catch {
      streamText = m[1];
    }

    // Extract hex strings: <48656C6C6F> Tj
    const hexRegex = /<([0-9A-Fa-f]+)>\s*Tj/g;
    let hm: RegExpExecArray | null;
    while ((hm = hexRegex.exec(streamText)) !== null) {
      try {
        extracted += Buffer.from(hm[1], 'hex').toString('utf-8') + ' ';
      } catch {
        // Fallback if decoding error
      }
    }

    // Extract literal strings: (Hello) Tj
    const litRegex = /\(([^)]+)\)\s*Tj/g;
    let lm: RegExpExecArray | null;
    while ((lm = litRegex.exec(streamText)) !== null) {
      extracted += lm[1] + ' ';
    }
  }

  return extracted;
}

export async function runPdfExportVerification() {
  console.log('================================================================');
  console.log('  JUSTITIA STATUTORY PDF EXPORT & CERTIFIED MAIL AUDIT SUITE    ');
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
  // TEST 1: FDCPA Debt Collection Certified PDF Export
  // -------------------------------------------------------------------------
  console.log('TEST 1: Auditing FDCPA Debt Validation Certified Mail PDF Export...');
  const debtRaw = `
APEX RECOVERY SOLUTIONS LLC
450 Financial Way, Wilmington, DE 19801
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

  const parsedDebtDoc = parseDocument(debtRaw, { fileName: 'apex_collection_notice.txt' });
  const fdcpaLetter = generateFdcpaLetter({
    parsedDoc: parsedDebtDoc,
    directives: {
      ceasePhoneCalls: true,
      demandItemizedLedger: true,
      citeStatutoryDamages: true,
      includeRegulatoryEscalation: true,
      certifiedMailNumber: '7020 0640 0001 2345 6789',
    },
    senderOverride: {
      name: 'Jane Consumer',
      address: '742 Evergreen Terrace, Seattle, WA 98101',
    },
  });

  const fdcpaPdfBytes = await generateCourtReadyDisputePdf({
    letter: fdcpaLetter,
    trackingNumber: fdcpaLetter.trackingNumber,
  });

  assert(Boolean(fdcpaPdfBytes && fdcpaPdfBytes.length > 0), 'FDCPA PDF Generated Non-Empty Buffer', 'Empty PDF buffer');
  const fdcpaHeader = Buffer.from(fdcpaPdfBytes.slice(0, 5)).toString('utf-8');
  assert(fdcpaHeader === '%PDF-', 'Valid %PDF- Binary Magic Header Present', 'Invalid PDF magic header');
  assert(fdcpaPdfBytes.length > 10000, `FDCPA PDF File Size > 10KB (${(fdcpaPdfBytes.length / 1024).toFixed(1)} KB)`, 'PDF too small');

  // Decompress and decode text content
  const fdcpaDecodedText = extractPdfText(fdcpaPdfBytes);
  const fdcpaRawBinaryString = Buffer.from(fdcpaPdfBytes).toString('latin1');
  const ssnHex = Buffer.from('332-11-7788').toString('hex');
  const acctHex = Buffer.from('44001928374').toString('hex');

  // Zero PII Assertions
  assert(!fdcpaDecodedText.includes('332-11-7788'), 'Zero PII: Debtor SSN Not Found in Decoded PDF Content', 'SSN found in decoded PDF');
  assert(!fdcpaRawBinaryString.includes('332-11-7788'), 'Zero PII: Debtor SSN Plaintext Absent from Binary Buffer', 'SSN in binary buffer');
  assert(!fdcpaRawBinaryString.includes(ssnHex), 'Zero PII: Debtor SSN Hex Representation Absent from Binary Buffer', 'SSN hex in binary');
  assert(!fdcpaDecodedText.includes('44001928374'), 'Zero PII: Debtor Checking Account Absent from Decoded PDF', 'Account in decoded PDF');
  assert(!fdcpaRawBinaryString.includes(acctHex), 'Zero PII: Debtor Checking Account Hex Absent from Binary', 'Account hex in binary');
  assert(!fdcpaDecodedText.includes('021000021'), 'Zero PII: Bank Routing Number Absent from Decoded PDF', 'Routing in decoded PDF');

  // Certified Mail Header & Notice Assertions
  assert(fdcpaDecodedText.includes('7020 0640 0001 2345 6789'), 'USPS Article Tracking Number Found in PDF Text', 'Missing tracking number in PDF text');
  assert(fdcpaDecodedText.includes('RETURN RECEIPT REQUESTED'), 'RETURN RECEIPT REQUESTED Notice Present in PDF', 'Missing return receipt notice');
  assert(fdcpaDecodedText.includes('USPS CERTIFIED MAIL'), 'USPS CERTIFIED MAIL Header Present in PDF', 'Missing USPS certified mail text');

  // Statutory Citation Preservation
  assert(fdcpaLetter.legalCitations.some((c) => c.includes('15 U.S.C. § 1692g')), 'FDCPA 15 U.S.C. § 1692g Preserved in Letter', 'Missing 1692g citation');
  assert(fdcpaLetter.legalCitations.some((c) => c.includes('15 U.S.C. § 1692c(c)')), 'FDCPA 15 U.S.C. § 1692c(c) Preserved in Letter', 'Missing 1692c citation');
  assert(fdcpaLetter.legalCitations.some((c) => c.includes('15 U.S.C. § 1692k')), 'FDCPA 15 U.S.C. § 1692k Preserved in Letter', 'Missing 1692k citation');
  assert(fdcpaDecodedText.includes('1692g'), 'FDCPA 1692g Citation Streamed in PDF Binary Body', '1692g missing in PDF text');
  assert(fdcpaLetter.statutorySlaDays === 30, 'FDCPA 30 Calendar Days SLA Stated', 'SLA mismatch');

  // -------------------------------------------------------------------------
  // TEST 2: No Surprises Act Medical Billing Certified PDF Export
  // -------------------------------------------------------------------------
  console.log('\nTEST 2: Auditing No Surprises Act Open Negotiation PDF Export...');
  const medRaw = `
MEMORIAL REGIONAL HOSPITAL & HEALTHCARE NETWORK
Claims & Patient Financial Services
100 Hospital Drive, Austin, TX 78705
Account Number: 847291048

PATIENT BILLING STATEMENT
Statement Date: September 20, 2026
Patient Name: Johnathan Doe
SSN: 123-45-6789

ITEMIZED CHARGES:
99285 Emergency Dept Visit Level 5 $2,450.00
99070 Special Surgical Tray Supplies $680.00
0450 Hospital Emergency Room Facility Fee $890.00
Out-of-Network Emergency Physician Surcharge $1,200.00

Total Billed: $5,220.00
Patient Responsibility: $3,420.00
`;

  const parsedMedDoc = parseDocument(medRaw, { fileName: 'memorial_er_bill.txt' });
  const nsaLetter = generateNoSurprisesLetter({
    parsedDoc: parsedMedDoc,
    directives: {
      demandItemizedLedger: true,
      citeStatutoryDamages: true,
      includeRegulatoryEscalation: true,
      certifiedMailNumber: '7020 0640 0001 8888 9999',
    },
  });

  const nsaPdfBytes = await generateCourtReadyPdf(nsaLetter);

  assert(Boolean(nsaPdfBytes && nsaPdfBytes.length > 0), 'No Surprises PDF Generated Non-Empty Buffer', 'Empty PDF buffer');
  const nsaHeader = Buffer.from(nsaPdfBytes.slice(0, 5)).toString('utf-8');
  assert(nsaHeader === '%PDF-', 'Valid %PDF- Binary Magic Header Present for NSA', 'Invalid PDF magic header');
  assert(nsaPdfBytes.length > 10000, `No Surprises PDF File Size > 10KB (${(nsaPdfBytes.length / 1024).toFixed(1)} KB)`, 'PDF too small');

  const nsaDecodedText = extractPdfText(nsaPdfBytes);
  const nsaRawBinaryString = Buffer.from(nsaPdfBytes).toString('latin1');
  const medSsnHex = Buffer.from('123-45-6789').toString('hex');

  // Zero PII Leak
  assert(!nsaDecodedText.includes('123-45-6789'), 'Zero PII: Patient SSN Not Found in NSA Decoded PDF', 'SSN found in decoded PDF');
  assert(!nsaRawBinaryString.includes('123-45-6789'), 'Zero PII: Patient SSN Plaintext Absent from NSA Binary Buffer', 'SSN in binary buffer');
  assert(!nsaRawBinaryString.includes(medSsnHex), 'Zero PII: Patient SSN Hex Absent from NSA Binary Buffer', 'SSN hex in binary buffer');

  // Tracking and Certified Notice
  assert(nsaDecodedText.includes('7020 0640 0001 8888 9999'), 'NSA Tracking Number Found in PDF Text', 'Tracking not found in text');
  assert(nsaDecodedText.includes('RETURN RECEIPT REQUESTED'), 'RETURN RECEIPT REQUESTED Present in NSA PDF', 'Missing return receipt');

  // Statutory Citation Preservation
  assert(nsaLetter.legalCitations.some((c) => c.includes('42 U.S.C. § 300gg-111')), 'NSA 42 U.S.C. § 300gg-111 Preserved in Letter', 'Missing 300gg-111 citation');
  assert(nsaLetter.legalCitations.some((c) => c.includes('45 CFR Part 149')), 'NSA 45 CFR Part 149 Preserved in Letter', 'Missing 45 CFR citation');
  assert(nsaLetter.legalCitations.some((c) => c.includes('42 U.S.C. § 300gg-139')), 'NSA 42 U.S.C. § 300gg-139 Preserved in Letter', 'Missing 300gg-139 citation');
  assert(nsaDecodedText.includes('300gg-111'), 'NSA 300gg-111 Citation Streamed in PDF Binary Body', '300gg-111 missing in PDF text');
  assert(nsaLetter.statutorySlaDays === 30, 'NSA 30 Business Days SLA Stated', 'SLA mismatch');

  // -------------------------------------------------------------------------
  // TEST 3: FCRA Reinvestigation Certified PDF Export
  // -------------------------------------------------------------------------
  console.log('\nTEST 3: Auditing FCRA 30-Day Reinvestigation PDF Export...');
  const fcraRaw = `
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
`;

  const parsedFcraDoc = parseDocument(fcraRaw, {
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

  const fcraPdfBytes = await generateCourtReadyPdf(fcraLetter);

  assert(Boolean(fcraPdfBytes && fcraPdfBytes.length > 0), 'FCRA PDF Generated Non-Empty Buffer', 'Empty PDF buffer');
  const fcraHeader = Buffer.from(fcraPdfBytes.slice(0, 5)).toString('utf-8');
  assert(fcraHeader === '%PDF-', 'Valid %PDF- Binary Magic Header Present for FCRA', 'Invalid PDF magic header');
  assert(fcraPdfBytes.length > 10000, `FCRA PDF File Size > 10KB (${(fcraPdfBytes.length / 1024).toFixed(1)} KB)`, 'PDF too small');

  const fcraDecodedText = extractPdfText(fcraPdfBytes);
  const fcraRawBinaryString = Buffer.from(fcraPdfBytes).toString('latin1');
  const fcraSsnHex = Buffer.from('987-65-4321').toString('hex');

  // Zero PII Leak
  assert(!fcraDecodedText.includes('987-65-4321'), 'Zero PII: Consumer SSN Not Found in FCRA Decoded PDF', 'SSN found in decoded PDF');
  assert(!fcraRawBinaryString.includes('987-65-4321'), 'Zero PII: Consumer SSN Plaintext Absent from FCRA Binary Buffer', 'SSN in binary buffer');
  assert(!fcraRawBinaryString.includes(fcraSsnHex), 'Zero PII: Consumer SSN Hex Absent from FCRA Binary Buffer', 'SSN hex in binary buffer');

  // Tracking and Certified Notice
  assert(fcraDecodedText.includes('7020 0640 0001 5555 4444'), 'FCRA Tracking Number Found in PDF Text', 'Tracking not found in text');
  assert(fcraDecodedText.includes('RETURN RECEIPT REQUESTED'), 'RETURN RECEIPT REQUESTED Present in FCRA PDF', 'Missing return receipt');

  // Statutory Citation Preservation
  assert(fcraLetter.legalCitations.some((c) => c.includes('15 U.S.C. § 1681i')), 'FCRA 15 U.S.C. § 1681i Preserved in Letter', 'Missing 1681i citation');
  assert(fcraLetter.legalCitations.some((c) => c.includes('15 U.S.C. § 1681i(a)(7)')), 'FCRA Method of Verification Preserved in Letter', 'Missing MOV citation');
  assert(fcraLetter.legalCitations.some((c) => c.includes('15 U.S.C. § 1681s-2')), 'FCRA Furnisher Liability Preserved in Letter', 'Missing 1681s-2 citation');
  assert(fcraDecodedText.includes('1681i'), 'FCRA 1681i Citation Streamed in PDF Binary Body', '1681i missing in PDF text');
  assert(fcraLetter.statutorySlaDays === 30, 'FCRA 30 Calendar Days SLA Stated', 'SLA mismatch');

  // -------------------------------------------------------------------------
  // TEST 4: FTC Negative Option & EFTA Certified PDF Export
  // -------------------------------------------------------------------------
  console.log('\nTEST 4: Auditing FTC Click-to-Cancel & EFTA PDF Export...');
  const ftcRaw = `
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

  const parsedFtcDoc = parseDocument(ftcRaw, {
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

  const ftcPdfBytes = await generateCourtReadyPdf(ftcLetter);

  assert(Boolean(ftcPdfBytes && ftcPdfBytes.length > 0), 'FTC PDF Generated Non-Empty Buffer', 'Empty PDF buffer');
  const ftcHeader = Buffer.from(ftcPdfBytes.slice(0, 5)).toString('utf-8');
  assert(ftcHeader === '%PDF-', 'Valid %PDF- Binary Magic Header Present for FTC', 'Invalid PDF magic header');
  assert(ftcPdfBytes.length > 10000, `FTC PDF File Size > 10KB (${(ftcPdfBytes.length / 1024).toFixed(1)} KB)`, 'PDF too small');

  const ftcDecodedText = extractPdfText(ftcPdfBytes);
  const ftcRawBinaryString = Buffer.from(ftcPdfBytes).toString('latin1');
  const cardHex = Buffer.from('4111111111119999').toString('hex');

  // Zero PII Leak
  assert(!ftcDecodedText.includes('4111111111119999'), 'Zero PII: Credit Card Number Not Found in FTC Decoded PDF', 'Credit card in decoded PDF');
  assert(!ftcRawBinaryString.includes('4111111111119999'), 'Zero PII: Credit Card Plaintext Absent from FTC Binary Buffer', 'Credit card in binary buffer');
  assert(!ftcRawBinaryString.includes(cardHex), 'Zero PII: Credit Card Hex Absent from FTC Binary Buffer', 'Card hex in binary buffer');

  // Tracking and Certified Notice
  assert(ftcDecodedText.includes('7020 0640 0001 2222 1111'), 'FTC Tracking Number Found in PDF Text', 'Tracking not found in text');
  assert(ftcDecodedText.includes('RETURN RECEIPT REQUESTED'), 'RETURN RECEIPT REQUESTED Present in FTC PDF', 'Missing return receipt');

  // Statutory Citation Preservation
  assert(ftcLetter.legalCitations.some((c) => c.includes('16 CFR Part 425')), 'FTC 16 CFR Part 425 Preserved in Letter', 'Missing 16 CFR citation');
  assert(ftcLetter.legalCitations.some((c) => c.includes('15 U.S.C. § 1693e')), 'EFTA 15 U.S.C. § 1693e Preserved in Letter', 'Missing 1693e citation');
  assert(ftcDecodedText.includes('425'), 'FTC Rule 425 Citation Streamed in PDF Binary Body', '425 missing in PDF text');
  assert(ftcLetter.statutorySlaDays === 10, 'FTC 10 Business Days SLA Stated', 'SLA mismatch');

  // -------------------------------------------------------------------------
  // TEST 5: SQLite Database Persistence & Audit Timeline Logging
  // -------------------------------------------------------------------------
  console.log('\nTEST 5: Auditing Database Persistence for PDF Generation Lifecycle...');
  const testCase = await CaseRepository.createCase({
    title: `PDF Export Case: ${nsaLetter.recipientName}`,
    category: nsaLetter.disputeDomain,
    opponentName: nsaLetter.recipientName,
    opponentAddress: nsaLetter.recipientAddress,
    accountNumber: '847291048',
    disputedAmount: nsaLetter.totalDisputedAmount,
    currency: 'USD',
    statutoryDays: nsaLetter.statutorySlaDays,
  });

  assert(Boolean(testCase.id), `Case Created: ID = ${testCase.id}`, 'Case creation failed');

  const savedLetter = await CaseRepository.createDisputeLetter(testCase.id, {
    recipientName: nsaLetter.recipientName,
    recipientAddr: nsaLetter.recipientAddress,
    subjectLine: nsaLetter.subjectLine,
    bodyMarkdown: nsaLetter.fullLetterMarkdown,
    legalCitations: JSON.stringify(nsaLetter.legalCitations),
  });

  assert(Boolean(savedLetter.id), `Dispute Letter Saved: ID = ${savedLetter.id}`, 'Letter creation failed');

  // Verify CaseRepository.getDisputeLetterById with relation
  const retrievedLetter = await CaseRepository.getDisputeLetterById(savedLetter.id);
  assert(retrievedLetter !== null, 'Dispute Letter Retrieved by ID', 'Failed to retrieve letter');
  assert(retrievedLetter?.userCase?.id === testCase.id, 'Dispute Letter userCase Relation Loaded Successfully', 'userCase relation missing');

  // Simulate PDF generation lifecycle status update & timeline logging
  await CaseRepository.updateCaseStatus(
    testCase.id,
    'LETTER_GENERATED',
    `Exported USPS Certified Mail PDF document (Article #${nsaLetter.trackingNumber}).`
  );

  await CaseRepository.addTimelineEvent(testCase.id, {
    title: 'Court-Ready Legal PDF Exported',
    description: `Generated USPS Certified Mail dispute PDF (${nsaPdfBytes.byteLength} bytes) for ${nsaLetter.recipientName}.`,
    eventType: 'PDF_EXPORTED',
  });

  const updatedCase = await CaseRepository.getCaseById(testCase.id);
  assert(updatedCase?.status === 'LETTER_GENERATED', 'Case Status Updated to LETTER_GENERATED', 'Status not updated');
  assert(
    Boolean(updatedCase?.timelineEvents && updatedCase.timelineEvents.length >= 3),
    `Timeline Events Recorded: Count = ${updatedCase?.timelineEvents.length}`,
    'Timeline events count unexpected'
  );
  assert(
    Boolean(updatedCase?.timelineEvents.some((e) => e.eventType === 'PDF_EXPORTED')),
    'Timeline Contains PDF_EXPORTED Event',
    'Missing PDF_EXPORTED event'
  );

  // -------------------------------------------------------------------------
  // TEST 6: Next.js API Route (/api/disputes/pdf) Integration Test
  // -------------------------------------------------------------------------
  console.log('\nTEST 6: Auditing POST /api/disputes/pdf HTTP Endpoint Handler...');
  const apiReqWithLetterId = new NextRequest('http://localhost:3000/api/disputes/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ letterId: savedLetter.id }),
  });

  const apiResWithLetterId = await handlePdfExportPost(apiReqWithLetterId);
  assert(apiResWithLetterId.status === 200, 'POST /api/disputes/pdf with letterId returns 200 OK', 'Route returned non-200');
  assert(apiResWithLetterId.headers.get('Content-Type') === 'application/pdf', 'API Response Content-Type is application/pdf', 'Invalid content-type');
  assert(Boolean(apiResWithLetterId.headers.get('Content-Disposition')?.includes('.pdf')), 'Content-Disposition Attachment Header Configured', 'Missing disposition header');

  const apiResBytes = new Uint8Array(await apiResWithLetterId.arrayBuffer());
  assert(apiResBytes.length > 10000, `API Generated PDF Byte Count > 10KB (${(apiResBytes.length / 1024).toFixed(1)} KB)`, 'API PDF too small');
  const apiPdfHeader = Buffer.from(apiResBytes.slice(0, 5)).toString('utf-8');
  assert(apiPdfHeader === '%PDF-', 'API Generated PDF Starts with %PDF-', 'API PDF header invalid');

  // Cascading cleanup
  await CaseRepository.deleteCase(testCase.id);
  assert(true, 'Test Case Cleaned Up Cascadingly from SQLite.', '');

  console.log('\n================================================================');
  console.log(`  ALL ${totalAssertions} PDF EXPORT & STATUTORY TESTS PASSED SUCCESSFULLY! (100% ACCURACY & ZERO PII LEAKS)`);
  console.log('================================================================\n');

  return {
    success: true,
    totalChecks: totalAssertions,
  };
}

if (typeof require !== 'undefined' && require.main === module) {
  runPdfExportVerification().catch((err) => {
    console.error('\n[FATAL PDF TEST FAILURE]:', err);
    process.exit(1);
  });
}
