import type {
  DisputeEngineOptions,
  CompiledDisputeLetter,
  GoverningStatuteInfo,
} from './types';
import type { ItemizedCharge } from '../ocr/schemas';

export const FDCPA_STATUTE_INFO: GoverningStatuteInfo = {
  code: '15 U.S.C. § 1692 et seq.',
  name: 'Fair Debt Collection Practices Act (FDCPA) & CFPB Regulation F (12 CFR Part 1006)',
  summary:
    'Mandates debt collectors cease all collection activities upon timely written dispute until verified with original creditor accounting and chain-of-title.',
  statutoryResponseDays: 30,
  timeUnit: 'calendar_days',
  regulatoryAgencies: [
    'Consumer Financial Protection Bureau (CFPB)',
    'Federal Trade Commission (FTC)',
    'Office of the State Attorney General (Consumer Protection Division)',
  ],
};

/**
 * Computes statutory deadline date given calendar days from today.
 */
function calculateDeadlineDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generates an FDCPA formal debt validation notice under 15 U.S.C. § 1692g(b)
 * and telephone cease-and-desist under 15 U.S.C. § 1692c(c).
 */
export function generateFdcpaLetter(options: DisputeEngineOptions): CompiledDisputeLetter {
  const { parsedDoc, directives = {}, senderOverride = {}, recipientOverride = {} } = options;

  const ceasePhone = directives.ceasePhoneCalls !== false; // Default true
  const demandLedger = directives.demandItemizedLedger !== false; // Default true
  const citeDamages = directives.citeStatutoryDamages !== false; // Default true
  const includeEscalation = directives.includeRegulatoryEscalation !== false; // Default true
  const slaDays = directives.targetSlaDaysOverride ?? FDCPA_STATUTE_INFO.statutoryResponseDays;
  const deadlineDate = calculateDeadlineDate(slaDays);
  const nowFormatted = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Creditor / Collector identification
  const recipientName =
    recipientOverride.name || parsedDoc.senderOrCreditor.name || 'Debt Collection Agency / Compliance Dept';
  const recipientDepartment =
    recipientOverride.department || parsedDoc.senderOrCreditor.department || 'Legal & Debt Validation Dept';
  const recipientAddress =
    recipientOverride.address || parsedDoc.senderOrCreditor.address || 'Corporate Compliance Office';
  const accountRef =
    recipientOverride.accountOrReferenceNumber ||
    parsedDoc.senderOrCreditor.accountOrReferenceNumber ||
    'UNKNOWN-ACCOUNT-REF';

  // Consumer Identification
  const senderName = senderOverride.name || parsedDoc.consumerOrDebtor?.name || 'Consumer Account Holder';
  const senderAddress = senderOverride.address || parsedDoc.consumerOrDebtor?.address || '123 Consumer Protection Blvd';

  // Financial Balances
  const originalCreditor =
    parsedDoc.financialSummary?.originalCreditor ||
    parsedDoc.debtOrBillDetails.originalCreditor ||
    'Alleged Original Creditor';
  const originalBalance =
    parsedDoc.financialSummary?.originalBalance ??
    parsedDoc.debtOrBillDetails.totalDue ??
    0.0;
  const currentTotalDue =
    parsedDoc.debtOrBillDetails.totalDue ||
    parsedDoc.financialSummary?.totalDue ||
    0.0;

  // Tracking and Reference
  const trackingNumber =
    directives.certifiedMailNumber ||
    `USPS-CERTIFIED-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

  // Itemized line items if any were flagged
  const allCharges: ItemizedCharge[] = parsedDoc.debtOrBillDetails.itemizedCharges || [];
  const selectedIds = directives.selectedChargeIds;
  const disputedCharges = selectedIds
    ? allCharges.filter((c) => (c.id ? selectedIds.includes(c.id) : c.isDisputed))
    : allCharges.filter((c) => c.isDisputed || c.isFlagged);

  const subjectLine = `FORMAL NOTICE OF DISPUTE & DEBT VALIDATION DEMAND: Account Ref #${accountRef} [15 U.S.C. § 1692g & CFPB Reg F]`;

  const legalCitations = [
    '15 U.S.C. § 1692g(b) (Statutory Validation of Debts & Mandatory Stay of Collection)',
    '15 U.S.C. § 1692c(c) (Ceasing Communication / Mandatory Written Notice Rule)',
    '15 U.S.C. § 1692e (Prohibition of False, Deceptive, or Misleading Representations)',
    '15 U.S.C. § 1692f (Prohibition of Unfair Collection Practices & Unauthorized Fees)',
    '15 U.S.C. § 1692k(a)(2)(A) (Civil Liability & $1,000 Statutory Damages per Violation)',
    '12 CFR § 1006.34 (CFPB Regulation F Validation Notice Requirements)',
  ];

  // Build Sections
  let itemizedSection = '';
  if (disputedCharges.length > 0) {
    itemizedSection =
      '### Itemized Disputed Fees & Assessments:\n' +
      disputedCharges
        .map(
          (c, i) =>
            `${i + 1}. **${c.description}** ($${c.amount.toFixed(2)}) — ${
              c.violationExplanation || c.flagReason || 'Unsubstantiated surcharge or fee.'
            }`
        )
        .join('\n') +
      '\n\n';
  }

  const accountingSection = demandLedger
    ? `### Mandatory Demand for Complete Itemized Accounting Records:
Pursuant to 15 U.S.C. § 1692g(b) and 12 CFR § 1006.34, you are required to furnish:
1. **Full Chain-of-Title Assignments:** Complete, unbroken documentary proof of transfer from ${originalCreditor} to your agency, proving your legal ownership and standing to collect this debt.
2. **Itemized Accounting from $0 Balance:** A comprehensive ledger demonstrating how the claimed balance of $${currentTotalDue.toFixed(
        2
      )} was calculated, specifically detailing:
   - Original principal balance charged off by ${originalCreditor};
   - Exact dates and basis of all accrued interest;
   - All collection fees, late charges, and legal expenses assessed;
   - All payments, credits, or adjustments applied.
3. **Underlying Contract:** A true and correct copy of the original signed agreement or contract bearing the consumer's signature authorizing these assessments.
4. **State Licensure Verification:** Proof of your agency's active collection license and surety bond in the consumer's home jurisdiction.
`
    : '';

  const ceasePhoneSection = ceasePhone
    ? `### Formal Telephone Cease-and-Desist Directive (15 U.S.C. § 1692c(c)):
Be advised that telephone calls to my residence, cellular telephone, place of employment, or relatives are inconvenient and strictly prohibited. Pursuant to 15 U.S.C. § 1692c(c), you and your agents are directed to **immediately cease and desist all telephone contact, automated dialing, voice messages, and SMS text messages**. All future communications regarding this matter must be conducted solely in writing via U.S. Mail.
`
    : '';

  const statutoryDamagesSection = citeDamages
    ? `### Statutory Damages Notice (15 U.S.C. § 1692k):
Continued collection activity, credit bureau reporting, or telephone harassment prior to providing complete statutory validation constitutes willful non-compliance with the FDCPA. Under 15 U.S.C. § 1692k(a)(2)(A), debt collectors who violate statutory protections are liable for actual damages, statutory damages of up to **$1,000.00 per violation**, and reasonable attorney fees and court costs.
`
    : '';

  const regulatorySection = includeEscalation
    ? `### Notice of Regulatory Escalation:
If you fail to provide full written validation within ${slaDays} calendar days (on or before **${deadlineDate}**), or if you continue collection efforts without substantiation, formal complaints will be immediately lodged with:
- **Consumer Financial Protection Bureau (CFPB)**
- **Federal Trade Commission (FTC)**
- **Office of the State Attorney General (Consumer Protection Bureau)**
`
    : '';

  const customNotesBlock = directives.customNotes
    ? `### Factual Background & Consumer Notes:
${directives.customNotes}
`
    : '';

  const fullLetterMarkdown = `**CERTIFIED MAIL RECEIPT #:** ${trackingNumber}
**DATE:** ${nowFormatted}
**SENT VIA:** USPS Certified Mail with Return Receipt Requested / Registered Regulatory Channel

**FROM:**
${senderName}
${senderAddress}

**TO:**
${recipientName}
${recipientDepartment}
${recipientAddress}

**RE:** ${subjectLine}
**ALLEGED ORIGINAL CREDITOR:** ${originalCreditor}
**ALLEGED ACCOUNT / REFERENCE ID:** ${accountRef}
**TOTAL CLAIMED BALANCE:** $${currentTotalDue.toFixed(2)}
**STATUTORY DEADLINE FOR RESPONSE:** ${deadlineDate} (${slaDays} Calendar Days)

Dear Debt Collection Compliance Officers and Legal Representatives:

Please take formal notice that this communication constitutes a timely, legally binding dispute of the validity of the alleged debt referenced above, pursuant to Section 809(b) of the Fair Debt Collection Practices Act (**15 U.S.C. § 1692g(b)**) and Consumer Financial Protection Bureau Regulation F (**12 CFR Part 1006**).

### Statement of Dispute:
I dispute the alleged debt in its entirety, including the validity of the principal, the legal standing of your agency to collect, and all interest, penalties, and collection fees assessed. 

${
  parsedDoc.statutoryDisclosures.missingMandatoryDisclosures.length > 0
    ? `**Statutory Disclosure Deficiencies in Issuing Notice:**\n` +
      parsedDoc.statutoryDisclosures.missingMandatoryDisclosures.map((d) => `- ${d}`).join('\n') +
      '\n\n'
    : ''
}${itemizedSection}${accountingSection}${ceasePhoneSection}${statutoryDamagesSection}${customNotesBlock}### Mandatory Stay of Collection Activity:
Under 15 U.S.C. § 1692g(b), you are required to **immediately halt and suspend all collection activities** until you have obtained verification of this debt or a copy of a judgment and mailed a copy to the consumer. Any attempt to report this debt to consumer reporting agencies (Equifax, Experian, TransUnion) while disputed without marking it as "disputed by consumer" constitutes a direct violation of 15 U.S.C. § 1692e(8) and 15 U.S.C. § 1681s-2.

${regulatorySection}### Required Corrective Actions within ${slaDays} Calendar Days (by ${deadlineDate}):
1. Furnish complete verification, chain of title, and itemized accounting as demanded herein; OR
2. Provide written confirmation that this account has been formally closed, dismissed with prejudice, and permanently deleted from all credit bureau files.

Sincerely,

__________________________________________________
**${senderName}**
Consumer Advocate & Authorized Representative
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
    disputeDomain: 'DEBT_COLLECTION',
    governingStatute: FDCPA_STATUTE_INFO,
    totalDisputedAmount: currentTotalDue,
    disputedLineItemsCount: disputedCharges.length,
    disputedCharges,
    escalationAgencies: FDCPA_STATUTE_INFO.regulatoryAgencies,
    trackingNumber,
    generatedAt: new Date().toISOString(),
    directivesApplied: directives,
  };
}
