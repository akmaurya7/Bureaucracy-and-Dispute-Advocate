import type {
  DisputeEngineOptions,
  CompiledDisputeLetter,
  GoverningStatuteInfo,
} from './types';
import type { ItemizedCharge } from '../ocr/schemas';

export const FTC_CLICK_TO_CANCEL_INFO: GoverningStatuteInfo = {
  code: '16 CFR Part 425 & 15 U.S.C. § 1693e',
  name: 'FTC Negative Option Rule (Click-to-Cancel) & Electronic Fund Transfer Act (EFTA)',
  summary:
    'Requires recurring subscription cancellations be as simple as enrollment and revokes preauthorized electronic debit permissions under Regulation E.',
  statutoryResponseDays: 10,
  timeUnit: 'business_days',
  regulatoryAgencies: [
    'Federal Trade Commission (FTC Bureau of Consumer Protection)',
    'Consumer Financial Protection Bureau (CFPB)',
    'Office of the State Attorney General (Consumer Fraud & Protection Section)',
  ],
};

function calculateBusinessDaysDeadline(businessDays: number): string {
  const d = new Date();
  let added = 0;
  while (added < businessDays) {
    d.setDate(d.getDate() + 1);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generates an FTC Negative Option Rule & EFTA cancellation demand and debit authorization revocation notice.
 */
export function generateFtcClickToCancelLetter(
  options: DisputeEngineOptions
): CompiledDisputeLetter {
  const { parsedDoc, directives = {}, senderOverride = {}, recipientOverride = {} } = options;

  const demandLedger = directives.demandItemizedLedger !== false;
  const citeDamages = directives.citeStatutoryDamages !== false;
  const includeEscalation = directives.includeRegulatoryEscalation !== false;
  const slaDays = directives.targetSlaDaysOverride ?? FTC_CLICK_TO_CANCEL_INFO.statutoryResponseDays;
  const deadlineDate = calculateBusinessDaysDeadline(slaDays);
  const nowFormatted = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Merchant / Subscription Service Provider
  const recipientName =
    recipientOverride.name || parsedDoc.senderOrCreditor.name || 'Merchant Billing & Subscriptions Department';
  const recipientDepartment =
    recipientOverride.department || parsedDoc.senderOrCreditor.department || 'Account Cancellation & Member Services';
  const recipientAddress =
    recipientOverride.address || parsedDoc.senderOrCreditor.address || 'Corporate Headquarters';
  const accountRef =
    recipientOverride.accountOrReferenceNumber ||
    parsedDoc.senderOrCreditor.accountOrReferenceNumber ||
    'UNKNOWN-SUBSCRIPTION-ID';

  // Consumer
  const senderName = senderOverride.name || parsedDoc.consumerOrDebtor?.name || 'Authorized Account Holder';
  const senderAddress = senderOverride.address || parsedDoc.consumerOrDebtor?.address || '123 Consumer Protection Way';

  // Tracking
  const trackingNumber =
    directives.certifiedMailNumber ||
    `USPS-CERTIFIED-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

  // Itemized line items / recurring charges
  const allCharges: ItemizedCharge[] = parsedDoc.debtOrBillDetails.itemizedCharges || [];
  const selectedIds = directives.selectedChargeIds;
  const disputedCharges = selectedIds
    ? allCharges.filter((c) => (c.id ? selectedIds.includes(c.id) : c.isDisputed))
    : allCharges.filter((c) => c.isDisputed || c.isFlagged);

  const currentTotalDue =
    parsedDoc.debtOrBillDetails.totalDue ||
    parsedDoc.financialSummary?.totalDue ||
    0.0;
  const totalDisputedAmount =
    disputedCharges.length > 0
      ? disputedCharges.reduce((sum, item) => sum + (item.amount || item.billedAmount || 0), 0)
      : currentTotalDue;

  const subjectLine = `FORMAL NOTICE OF CANCELLATION & REVOCATION OF DEBIT AUTHORIZATION: Account #${accountRef} [16 CFR Part 425 & 15 U.S.C. § 1693e]`;

  const legalCitations = [
    '16 CFR Part 425 (FTC Rule on Recurring Subscriptions and Negative Option Features - "Click-to-Cancel")',
    '15 U.S.C. § 1693e(a) (Electronic Fund Transfer Act - Preauthorized Electronic Fund Transfers)',
    '12 CFR § 1005.10(c) (CFPB Regulation E - Consumer Revocation of Recurring Debit Authorization)',
    '15 U.S.C. § 1693m (Civil Liability, Treble Damages, and Attorney Fees for Unauthorized Debits)',
    '15 U.S.C. § 45(a) (FTC Act Section 5 - Unfair or Deceptive Acts or Practices / Dark Patterns)',
  ];

  let itemizedSection = '';
  if (disputedCharges.length > 0) {
    itemizedSection =
      '### Itemized Disputed Subscription Charges:\n' +
      disputedCharges
        .map((c, i) => `${i + 1}. **${c.description}** ($${c.amount.toFixed(2)}) — ${c.violationExplanation || c.flagReason || 'Unauthorized recurring membership fee.'}`)
        .join('\n') +
      '\n\n';
  }

  const ledgerSection = demandLedger
    ? `### Mandatory Demand for Proof of Affirmative Consent & Billing History:
Under 16 CFR § 425.4 and EFTA disclosure regulations, you are hereby demanded to provide:
1. **Verifiable Proof of Affirmative Consent:** A timestamped audit log or electronic signature evidencing unambiguous affirmative consent to recurring auto-renewal before billing commenced.
2. **Clear and Conspicuous Terms:** Copies of the pre-enrollment disclosures presented to the consumer detailing the exact cancellation procedures.
3. **Complete Billing Ledger:** A full historical breakdown of all debits and payment authorizations processed against this account.
`
    : '';

  const damagesSection = citeDamages
    ? `### Statutory Damages & Regulatory Enforcement Notice:
Under the FTC Click-to-Cancel Rule, failure to provide a simple, symmetric cancellation mechanism constitutes an unfair or deceptive practice under Section 5(a) of the FTC Act (15 U.S.C. § 45), exposing merchants to civil penalties of up to **$51,744 per violation**. Furthermore, continuing to debit bank accounts following formal revocation constitutes an unauthorized electronic transfer under 15 U.S.C. § 1693m and Regulation E, subjecting your organization to statutory damages, actual damages, and attorney fees.
`
    : '';

  const escalationSection = includeEscalation
    ? `### Notice of Immediate Regulatory Reporting:
If you do not confirm cancellation and provide written confirmation of account closure within ${slaDays} business days (on or before **${deadlineDate}**), formal complaints will be filed with:
- **Federal Trade Commission (FTC Bureau of Consumer Protection)**
- **Consumer Financial Protection Bureau (CFPB Consumer Response Center)**
- **Office of the State Attorney General (Consumer Protection Division)**
`
    : '';

  const customNotesBlock = directives.customNotes
    ? `### Consumer Factual Background:
${directives.customNotes}
`
    : '';

  const fullLetterMarkdown = `**CERTIFIED MAIL RECEIPT #:** ${trackingNumber}
**DATE:** ${nowFormatted}
**SENT VIA:** USPS Certified Mail with Return Receipt Requested / Registered Commercial Compliance

**FROM:**
${senderName}
${senderAddress}

**TO:**
${recipientName}
${recipientDepartment}
${recipientAddress}

**RE:** ${subjectLine}
**SUBSCRIPTION / ACCOUNT ID:** ${accountRef}
**TOTAL DISPUTED CHARGES:** $${totalDisputedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
**STATUTORY 10-BUSINESS-DAY COMPLIANCE WINDOW:** ${deadlineDate}

Dear Subscription Services Directors and Corporate Billing Compliance Officers:

Please take formal legal notice that this communication constitutes an immediate and unconditional cancellation of all subscription memberships, recurring billing agreements, and negative option contracts associated with Account Reference **#${accountRef}**, pursuant to the Federal Trade Commission's Negative Option Rule (**16 CFR Part 425**) and the Electronic Fund Transfer Act (**15 U.S.C. § 1693e**).

### Formal Revocation of Preauthorized Electronic Fund Transfers:
In accordance with Section 907 of the Electronic Fund Transfer Act (**15 U.S.C. § 1693e(a)**) and Consumer Financial Protection Bureau Regulation E (**12 CFR § 1005.10(c)**), I hereby **REVOKE ALL AUTHORIZATION** for your organization, its processors, payment gateways, or merchant entities to initiate recurring automatic debits, ACH withdrawals, credit card charges, or debit card transactions against any bank account or credit card associated with my identity.

### FTC "Click-to-Cancel" Symmetry Mandate (16 CFR Part 425):
Federal Trade Commission regulations mandate that businesses must offer a cancellation mechanism that is at least as simple and accessible as the method used to enroll. Conditioning cancellation on protracted telephone queues, mandatory retention agent calls, or burdensome mailing procedures constitutes an unlawful deceptive dark pattern.

${
  parsedDoc.statutoryDisclosures.missingMandatoryDisclosures.length > 0
    ? `**Statutory Disclosure Deficiencies:**\n` +
      parsedDoc.statutoryDisclosures.missingMandatoryDisclosures.map((d) => `- ${d}`).join('\n') +
      '\n\n'
    : ''
}${itemizedSection}${ledgerSection}${damagesSection}${customNotesBlock}### Warning of Unauthorized Transfer Reporting:
Any charge, debit attempt, or withdrawal initiated by your organization after receipt of this revocation notice will be immediately flagged and formally disputed with my financial institution as an **unauthorized electronic fund transfer** under 15 U.S.C. § 1693a(12) and 12 CFR § 1005.11, accompanied by this certified delivery receipt.

${escalationSection}### Mandatory Actions Required within ${slaDays} Business Days (by ${deadlineDate}):
1. Terminate all recurring billing, subscription profiles, and auto-renewal terms immediately;
2. Refund all disputed, unapproved recurring charges totaling **$${totalDisputedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}**;
3. Furnish written certification confirming zero balance, permanent cancellation, and removal of all payment card tokens from your processing systems.

Sincerely,

__________________________________________________
**${senderName}**
Account Holder & Consumer
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
    disputeDomain: 'SUBSCRIPTION_CANCEL',
    governingStatute: FTC_CLICK_TO_CANCEL_INFO,
    totalDisputedAmount,
    disputedLineItemsCount: disputedCharges.length,
    disputedCharges,
    escalationAgencies: FTC_CLICK_TO_CANCEL_INFO.regulatoryAgencies,
    trackingNumber,
    generatedAt: new Date().toISOString(),
    directivesApplied: directives,
  };
}
