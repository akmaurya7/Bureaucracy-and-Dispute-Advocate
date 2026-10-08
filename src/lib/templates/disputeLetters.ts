import { STATUTORY_RULES } from '../statutes/rules';

export interface DisputeLetterDraftOptions {
  senderName: string;
  senderAddress: string;
  recipientName: string;
  recipientAddress: string;
  accountReferenceNumber: string;
  disputeReason: string;
  itemizedDetails?: { description: string; amount: number; errorExplanation: string }[];
  statuteId: string;
}

export function generateLegalDisputeLetter(options: DisputeLetterDraftOptions): { subject: string; body: string; statutoryDays: number } {
  const rule = STATUTORY_RULES.find(r => r.id === options.statuteId);
  const statutoryNotice = rule ? rule.mandatoryLanguageSnippet : '';
  const statutoryDays = rule ? rule.statutoryResponseDays : 30;
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const subject = `FORMAL NOTICE OF DISPUTE: Account Ref #${options.accountReferenceNumber} [DEMAND FOR VERIFICATION & CORRECTION]`;

  let itemizedSection = '';
  if (options.itemizedDetails && options.itemizedDetails.length > 0) {
    itemizedSection = `\n### Itemized Discrepancies & Violations:\n` +
      options.itemizedDetails.map((item, idx) => 
        `${idx + 1}. **${item.description}** ($${item.amount.toFixed(2)}) - ${item.errorExplanation}`
      ).join('\n') + '\n';
  }

  const body = `**DATE:** ${currentDate}
**SENT VIA:** Certified Mail with Return Receipt Requested / Formal Regulatory Portal

**FROM:**
${options.senderName}
${options.senderAddress}

**TO:**
${options.recipientName}
${options.recipientAddress}

**RE:** ${subject}

Dear Claims and Compliance Department,

Please be advised that this letter constitutes a formal, legally grounded dispute regarding Account/Reference Number **${options.accountReferenceNumber}**.

### Statement of Dispute:
${options.disputeReason}
${itemizedSection}
### Statutory Compliance & Mandatory Rights:
${statutoryNotice}

### Required Corrective Actions within ${statutoryDays} Calendar Days:
1. Provide complete and itemized documentary evidence validating the lawful basis of the claimed balance or fee.
2. Cease and desist any adverse credit reporting, unverified charges, or unlawful communications during the pendency of this statutory review.
3. If valid documentary proof cannot be established, immediately dismiss this claim, delete adverse reporting marks, and confirm zero balance in writing.

Failure to resolve this matter within the statutory ${statutoryDays}-day window will result in immediate formal escalation to the Consumer Financial Protection Bureau (CFPB), Federal Trade Commission (FTC), state Attorney General, and appropriate civil remedies.

Sincerely,

___________________________________
**${options.senderName}**
`;

  return { subject, body, statutoryDays };
}
