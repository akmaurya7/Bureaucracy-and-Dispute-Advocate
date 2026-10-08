import type {
  DisputeEngineOptions,
  CompiledDisputeLetter,
  GoverningStatuteInfo,
} from './types';
import type { ItemizedCharge } from '../ocr/schemas';

export const FCRA_STATUTE_INFO: GoverningStatuteInfo = {
  code: '15 U.S.C. § 1681 et seq.',
  name: 'Fair Credit Reporting Act (FCRA) - Reinvestigation & Furnisher Liability',
  summary:
    'Mandates consumer reporting agencies and furnishers conduct a 30-day reasonable reinvestigation and disclose the Method of Verification (MOV) under § 611(a)(7).',
  statutoryResponseDays: 30,
  timeUnit: 'calendar_days',
  regulatoryAgencies: [
    'Consumer Financial Protection Bureau (CFPB)',
    'Federal Trade Commission (FTC)',
    'Office of the State Attorney General (Consumer Protection Division)',
  ],
};

function calculateCalendarDaysDeadline(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generates an FCRA formal credit dispute and reinvestigation demand under 15 U.S.C. § 1681i
 * with a mandatory Method of Verification (MOV) demand under § 611(a)(7).
 */
export function generateFcraLetter(options: DisputeEngineOptions): CompiledDisputeLetter {
  const { parsedDoc, directives = {}, senderOverride = {}, recipientOverride = {} } = options;

  const demandLedger = directives.demandItemizedLedger !== false; // Default true
  const citeDamages = directives.citeStatutoryDamages !== false; // Default true
  const includeEscalation = directives.includeRegulatoryEscalation !== false; // Default true
  const slaDays = directives.targetSlaDaysOverride ?? FCRA_STATUTE_INFO.statutoryResponseDays;
  const deadlineDate = calculateCalendarDaysDeadline(slaDays);
  const nowFormatted = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Credit Bureau or Furnisher Identity
  const recipientName =
    recipientOverride.name || parsedDoc.senderOrCreditor.name || 'Consumer Reporting Agency / Reinvestigation Dept';
  const recipientDepartment =
    recipientOverride.department || parsedDoc.senderOrCreditor.department || 'Formal Dispute & Reinvestigation Bureau';
  const recipientAddress =
    recipientOverride.address || parsedDoc.senderOrCreditor.address || 'P.O. Box 740256, Atlanta, GA 30374';
  const accountRef =
    recipientOverride.accountOrReferenceNumber ||
    parsedDoc.senderOrCreditor.accountOrReferenceNumber ||
    'UNKNOWN-TRADELINE-REF';

  // Consumer
  const senderName = senderOverride.name || parsedDoc.consumerOrDebtor?.name || 'Consumer Applicant';
  const senderAddress = senderOverride.address || parsedDoc.consumerOrDebtor?.address || '123 Consumer Credit Way';

  // Tracking
  const trackingNumber =
    directives.certifiedMailNumber ||
    `USPS-CERTIFIED-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

  // Disputed tradeline / itemized entries
  const allCharges: ItemizedCharge[] = parsedDoc.debtOrBillDetails.itemizedCharges || [];
  const selectedIds = directives.selectedChargeIds;
  const disputedCharges = selectedIds
    ? allCharges.filter((c) => (c.id ? selectedIds.includes(c.id) : c.isDisputed))
    : allCharges.filter((c) => c.isDisputed || c.isFlagged);

  const totalDue =
    parsedDoc.debtOrBillDetails.totalDue ||
    parsedDoc.financialSummary?.totalDue ||
    0.0;
  const totalDisputedAmount =
    disputedCharges.length > 0
      ? disputedCharges.reduce((sum, item) => sum + (item.amount || item.billedAmount || 0), 0)
      : totalDue;

  const subjectLine = `FORMAL FCRA 30-DAY REINVESTIGATION DEMAND: Disputed Tradeline #${accountRef} [15 U.S.C. § 1681i & § 1681s-2]`;

  const legalCitations = [
    '15 U.S.C. § 1681i(a)(1) (Mandatory 30-Day Reinvestigation of Disputed Information)',
    '15 U.S.C. § 1681i(a)(7) (Statutory Demand for Method of Verification - MOV)',
    '15 U.S.C. § 1681s-2(b) (Furnisher Duties of Investigation upon Receipt of Notice)',
    '15 U.S.C. § 1681c (7-Year Statutory Obsolescence & Reporting Expiration)',
    '15 U.S.C. § 1681n (Civil Liability for Willful Non-Compliance & Punitive Damages)',
    '15 U.S.C. § 1681o (Civil Liability for NegligENT Non-Compliance & Actual Damages)',
  ];

  let itemizedSection = '';
  if (disputedCharges.length > 0) {
    itemizedSection =
      '### Disputed Inaccurate Tradelines & Line Items:\n' +
      disputedCharges
        .map((c, i) => `${i + 1}. **${c.description}** ($${c.amount.toFixed(2)}) — ${c.violationExplanation || c.flagReason || 'Inaccurate, incomplete, or unverified derogatory mark.'}`)
        .join('\n') +
      '\n\n';
  }

  const movSection = demandLedger
    ? `### Mandatory Demand for Method of Verification (MOV) under 15 U.S.C. § 1681i(a)(7):
Pursuant to Section 611(a)(7) of the Fair Credit Reporting Act, if you do not immediately delete this derogatory tradeline, you are required to furnish a written statement detailing the **Method of Verification (MOV)** within 15 days following the reinvestigation, including:
1. The legal name, business address, and direct telephone number of every person or furnisher representative contacted;
2. The specific documents, electronic interfaces (e.g. e-OSCAR codes), or ledger audits relied upon to verify this tradeline;
3. A certified copy of the original credit agreement bearing the consumer's signature authorizing this reportable tradeline.
`
    : '';

  const damagesSection = citeDamages
    ? `### Civil Liability & Statutory Damages Notice (15 U.S.C. § 1681n & § 1681o):
Merely verifying this tradeline through automated computer matching (e-OSCAR ACVD) without conducting an independent, substantive inquiry constitutes a willful failure to maintain reasonable procedures. Under 15 U.S.C. § 1681n, willful non-compliance subjects the agency and data furnisher to statutory damages of up to **$1,000 per violation**, punitive damages, and mandatory attorney fees and costs.
`
    : '';

  const escalationSection = includeEscalation
    ? `### Regulatory Escalation Notice:
If this disputed derogatory tradeline is not fully deleted or corrected within the statutory 30-calendar-day window (on or before **${deadlineDate}**), formal complaints documenting FCRA non-compliance will be submitted immediately to:
- **Consumer Financial Protection Bureau (CFPB)**
- **Federal Trade Commission (FTC)**
- **Office of the State Attorney General (Consumer Protection Division)**
`
    : '';

  const customNotesBlock = directives.customNotes
    ? `### Factual Consumer Statement:
${directives.customNotes}
`
    : '';

  const fullLetterMarkdown = `**CERTIFIED MAIL RECEIPT #:** ${trackingNumber}
**DATE:** ${nowFormatted}
**SENT VIA:** USPS Certified Mail with Return Receipt Requested / Registered Consumer Dispute Channel

**FROM:**
${senderName}
${senderAddress}

**TO:**
${recipientName}
${recipientDepartment}
${recipientAddress}

**RE:** ${subjectLine}
**DISPUTED TRADELINE / ACCOUNT NUMBER:** ${accountRef}
**TOTAL DISPUTED BALANCE:** $${totalDisputedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
**STATUTORY 30-DAY REINVESTIGATION DEADLINE:** ${deadlineDate}

Dear Consumer Reporting Agency Compliance Officers and Reinvestigation Specialists:

This communication constitutes a formal, legally grounded dispute and demand for a complete reinvestigation pursuant to Section 611 of the Fair Credit Reporting Act (**15 U.S.C. § 1681i**) and the duties of furnishers under **15 U.S.C. § 1681s-2**.

### Statement of Inaccuracy & Ground for Dispute:
Upon reviewing my consumer credit disclosure, I have identified inaccurate, incomplete, and unverified derogatory reporting associated with Account/Tradeline Reference **#${accountRef}**.

${
  parsedDoc.statutoryDisclosures.missingMandatoryDisclosures.length > 0
    ? `**Identified Compliance Deficiencies:**\n` +
      parsedDoc.statutoryDisclosures.missingMandatoryDisclosures.map((d) => `- ${d}`).join('\n') +
      '\n\n'
    : ''
}${itemizedSection}${movSection}${damagesSection}${customNotesBlock}### Mandatory 30-Day Reinvestigation & Deletion Requirement:
Under 15 U.S.C. § 1681i(a)(1), you must conduct a free and reasonable reinvestigation to determine whether the disputed information is inaccurate, record the current status of the disputed information, or delete the item from the file within 30 calendar days of receiving this notice. If the data furnisher fails to verify the accuracy of the tradeline within this statutory period, federal law mandates that you **promptly delete the information from my credit file** (15 U.S.C. § 1681i(a)(5)).

${escalationSection}### Required Corrective Actions within 30 Calendar Days (by ${deadlineDate}):
1. Complete a comprehensive, independent reinvestigation of the disputed tradeline;
2. Permanently delete all inaccurate or unverified derogatory marks from my consumer file;
3. Send an updated, certified copy of my credit disclosure reflecting the permanent removal of this tradeline;
4. If verified, provide the complete Method of Verification (MOV) disclosure as demanded under 15 U.S.C. § 1681i(a)(7).

Sincerely,

__________________________________________________
**${senderName}**
Consumer Applicant & Account Holder
`;

  return {
    subjectLine,
    recipientName,
    recipientAddress,
    bodyMarkdown: fullLetterMarkdown,
    fullLetterMarkdown,
    legalCitations,
    statutorySlaDays: slaDays,
    statutoryDeadlineDate: deadlineDate,
    disputeDomain: 'CREDIT_REPORT_ERROR',
    governingStatute: FCRA_STATUTE_INFO,
    totalDisputedAmount,
    disputedLineItemsCount: disputedCharges.length,
    disputedCharges,
    escalationAgencies: FCRA_STATUTE_INFO.regulatoryAgencies,
    trackingNumber,
    generatedAt: new Date().toISOString(),
    directivesApplied: directives,
  };
}
