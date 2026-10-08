import type {
  DisputeEngineOptions,
  CompiledDisputeLetter,
  GoverningStatuteInfo,
} from './types';
import type { ItemizedCharge } from '../ocr/schemas';

export const NO_SURPRISES_STATUTE_INFO: GoverningStatuteInfo = {
  code: '42 U.S.C. § 300gg-111 & 45 CFR Part 149',
  name: 'Federal No Surprises Act & Independent Dispute Resolution (IDR) Framework',
  summary:
    'Prohibits balance billing for emergency medical services and non-emergency services at in-network facilities. Mandates 30-business-day Open Negotiation before Federal IDR.',
  statutoryResponseDays: 30,
  timeUnit: 'business_days',
  regulatoryAgencies: [
    'Centers for Medicare & Medicaid Services (CMS No Surprises Help Desk)',
    'U.S. Department of Health and Human Services (HHS)',
    'State Department of Insurance (Healthcare Bureau)',
    'Office of the State Attorney General (Healthcare Fraud & Protection Division)',
  ],
};

/**
 * Calculates deadline counting business days (Monday-Friday) from today.
 */
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
 * Generates a formal No Surprises Act Open Negotiation Notice and Itemized Bill Dispute
 * pursuant to 42 U.S.C. § 300gg-111, 45 CFR Part 149, and CMS IDR regulations.
 */
export function generateNoSurprisesLetter(options: DisputeEngineOptions): CompiledDisputeLetter {
  const { parsedDoc, directives = {}, senderOverride = {}, recipientOverride = {} } = options;

  const demandLedger = directives.demandItemizedLedger !== false; // Default true
  const citeDamages = directives.citeStatutoryDamages !== false; // Default true
  const includeEscalation = directives.includeRegulatoryEscalation !== false; // Default true
  const slaDays = directives.targetSlaDaysOverride ?? NO_SURPRISES_STATUTE_INFO.statutoryResponseDays;
  const deadlineDate = calculateBusinessDaysDeadline(slaDays);
  const nowFormatted = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Healthcare Institution / Billing Agency
  const recipientName =
    recipientOverride.name || parsedDoc.senderOrCreditor.name || 'Hospital Financial Services & Billing Dept';
  const recipientDepartment =
    recipientOverride.department || parsedDoc.senderOrCreditor.department || 'Patient Financial Compliance & Auditing';
  const recipientAddress =
    recipientOverride.address || parsedDoc.senderOrCreditor.address || 'Hospital Corporate Office';
  const accountRef =
    recipientOverride.accountOrReferenceNumber ||
    parsedDoc.senderOrCreditor.accountOrReferenceNumber ||
    'UNKNOWN-PATIENT-ACCOUNT';

  // Patient / Advocate
  const senderName = senderOverride.name || parsedDoc.consumerOrDebtor?.name || 'Patient / Consumer Representative';
  const senderAddress = senderOverride.address || parsedDoc.consumerOrDebtor?.address || '123 Health Protection Way';

  // Tracking barcode
  const trackingNumber =
    directives.certifiedMailNumber ||
    `USPS-CERTIFIED-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

  // Itemized line items analysis
  const allCharges: ItemizedCharge[] = parsedDoc.debtOrBillDetails.itemizedCharges || [];
  const selectedIds = directives.selectedChargeIds;
  const disputedCharges = selectedIds
    ? allCharges.filter((c) => (c.id ? selectedIds.includes(c.id) : c.isDisputed))
    : allCharges.filter((c) => c.isDisputed || c.isFlagged || c.violationType);

  // If no charges flagged specifically, dispute the total billed
  const totalBilled =
    parsedDoc.debtOrBillDetails.totalBilled ||
    parsedDoc.financialSummary?.totalBilled ||
    parsedDoc.debtOrBillDetails.totalDue ||
    0.0;
  const totalDue =
    parsedDoc.debtOrBillDetails.totalDue ||
    parsedDoc.financialSummary?.totalDue ||
    0.0;

  const totalDisputedAmount =
    disputedCharges.length > 0
      ? disputedCharges.reduce((sum, item) => sum + (item.amount || item.billedAmount || 0), 0)
      : totalDue;

  const statementDate =
    parsedDoc.debtOrBillDetails.statementDate ||
    parsedDoc.financialSummary?.statementDate ||
    'Recent Billing Statement';

  const subjectLine = `FORMAL NOTICE OF DISPUTE & 30-DAY OPEN NEGOTIATION NOTICE: Account #${accountRef} [42 U.S.C. § 300gg-111 & No Surprises Act]`;

  const legalCitations = [
    '42 U.S.C. § 300gg-111(a) (Emergency Services Balance Billing Protections)',
    '42 U.S.C. § 300gg-111(b) (Non-Emergency Services Performed by Nonparticipating Providers at Participating Facilities)',
    '45 CFR Part 149 (HHS, DOL, Treasury Rules on Surprise Medical Billing & Federal IDR)',
    '45 CFR § 149.410 (Emergency Services Balance Billing Regulations & In-Network Cost Sharing)',
    '45 CFR § 149.420 (Notice and Consent Exceptions & Strict Non-Waiver for Emergency Acuity)',
    '45 CFR § 149.510 (Independent Dispute Resolution Process & 30-Business-Day Open Negotiation Period)',
    '42 U.S.C. § 300gg-139 / 45 CFR § 150.313 (Civil Monetary Penalties up to $10,000 per Violation)',
  ];

  // Discrepancy Breakdown
  let itemizedSection = '';
  if (disputedCharges.length > 0) {
    itemizedSection =
      '### Itemized Billing Discrepancies & Coding Anomalies:\n' +
      disputedCharges
        .map((item, idx) => {
          const codePrefix = item.code ? `[${item.code}] ` : '';
          const amt = (item.amount || item.billedAmount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
          });
          const reason =
            item.violationExplanation ||
            item.flagReason ||
            'Unsubstantiated clinical charge exceeding statutory cost-sharing.';
          const basis = item.statutoryBasis || item.statuteRef ? ` (Authority: ${item.statutoryBasis || item.statuteRef})` : '';
          return `${idx + 1}. **${codePrefix}${item.description}** ($${amt})\n   - *Dispute Ground:* ${reason}${basis}`;
        })
        .join('\n\n') +
      '\n\n';
  }

  const ledgerSection = demandLedger
    ? `### Mandatory Demand for Qualified Payment Amount (QPA) & Itemized Ledger:
Under 45 CFR § 149.140 and billing transparency standards, you are hereby requested to provide within ${slaDays} business days:
1. **CMS-1500 / UB-04 Form:** A complete, unabridged standard billing claim form displaying all procedural CPT/HCPCS and Revenue codes, modifier attachments, and National Provider Identifiers (NPI).
2. **Qualified Payment Amount (QPA) Calculation:** Documentation establishing the median contracted rate for the relevant geographic insurance market, demonstrating that cost-sharing does not exceed the in-network baseline.
3. **Medical Record Substantiation:** Clinical chart notes justifying the medical necessity of any high-acuity Emergency Department codes (e.g. CPT 99285/99284) and demonstrating continuous physician attendance for critical care claims.
4. **Itemization of Surgical Packages:** An unbundled ledger eliminating duplicate surgical tray supplies (CPT 99070) that are subsumed under the global surgical fee schedule.
`
    : '';

  const damagesSection = citeDamages
    ? `### Statutory Penalties & Regulatory Sanctions Notice (42 U.S.C. § 300gg-139):
The federal No Surprises Act strictly prohibits hospitals, facility operators, and healthcare providers from billing patients for out-of-network emergency cost-sharing beyond lawful in-network rates. Under 42 U.S.C. § 300gg-139(b)(2) and 45 CFR § 150.313, providers and healthcare facilities that violate these balance billing prohibitions are subject to **civil monetary penalties (CMPs) of up to $10,000.00 for each violation**.
`
    : '';

  const escalationSection = includeEscalation
    ? `### Formal Notice of Regulatory Escalation:
In the event that this dispute is not resolved and an amended statement conforming to lawful in-network rates is not issued by **${deadlineDate}**, formal enforcement actions will be initiated immediately with:
- **Centers for Medicare & Medicaid Services (CMS No Surprises Help Desk)** via official complaint portal;
- **State Department of Insurance (Division of Consumer Healthcare Assistance)**;
- **Office of the State Attorney General (Consumer Healthcare Division)**.
`
    : '';

  const customNotesBlock = directives.customNotes
    ? `### Patient Statement & Factual Background:
${directives.customNotes}
`
    : '';

  const fullLetterMarkdown = `**CERTIFIED MAIL TRACKING #:** ${trackingNumber}
**DATE:** ${nowFormatted}
**SENT VIA:** USPS Certified Mail with Return Receipt Requested / Registered Patient Advocate Portal

**FROM:**
${senderName}
${senderAddress}

**TO:**
${recipientName}
${recipientDepartment}
${recipientAddress}

**RE:** ${subjectLine}
**ACCOUNT / CLAIM REFERENCE #:** ${accountRef}
**STATEMENT DATE:** ${statementDate}
**TOTAL BILLED AMOUNT:** $${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
**TOTAL DISPUTED CHARGES:** $${totalDisputedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
**STATUTORY OPEN NEGOTIATION PERIOD:** 30 Business Days (Ending **${deadlineDate}**)

Dear Billing Directors, Compliance Officers, and Patient Financial Services:

Please accept this communication as a formal notice of dispute and statutory **30-Business-Day Open Negotiation Notice** pursuant to the federal No Surprises Act (**42 U.S.C. § 300gg-111**) and implementing federal regulations at **45 CFR Part 149**.

### Statutory Framework & Legal Statement:
Under 42 U.S.C. § 300gg-111(a)(1), individuals who receive emergency medical services are protected by federal law from balance billing. Federal law dictates that cost-sharing requirements for emergency care cannot exceed the in-network cost-sharing requirement, calculated strictly using the Qualified Payment Amount (QPA). Out-of-network balance billing for emergency treatment or non-emergency care provided by ancillary clinicians at participating facilities is expressly unlawful.

${
  parsedDoc.statutoryDisclosures.missingMandatoryDisclosures.length > 0
    ? `**Statutory Disclosure Violations Detected in Statement:**\n` +
      parsedDoc.statutoryDisclosures.missingMandatoryDisclosures.map((d) => `- ${d}`).join('\n') +
      '\n\n'
    : ''
}${itemizedSection}${ledgerSection}${damagesSection}${customNotesBlock}### Mandatory Directive to Stay Adverse Collection & Credit Reporting:
During the statutory 30-business-day open negotiation window, this account must be placed on administrative hold. You are expressly prohibited from referring this balance to collection agencies, issuing collection calls, or submitting adverse credit tradelines to credit bureaus under 15 U.S.C. § 1681s-2 and CFPB regulatory guidance.

${escalationSection}### Mandatory Corrective Actions Required by ${deadlineDate}:
1. Immediately retract all improper out-of-network balance billing, upcoded evaluation codes, and unbundled charges totaling **$${totalDisputedAmount.toLocaleString(
    'en-US',
    { minimumFractionDigits: 2 }
  )}**.
2. Issue a revised, corrected billing statement that reflects strictly lawful in-network cost-sharing in accordance with the Qualified Payment Amount.
3. Provide written verification confirming that this account is in good standing and not subject to collection referrals.

Sincerely,

__________________________________________________
**${senderName}**
Patient / Authorized Healthcare Consumer Advocate
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
    disputeDomain: 'MEDICAL_BILLING',
    governingStatute: NO_SURPRISES_STATUTE_INFO,
    totalDisputedAmount,
    disputedLineItemsCount: disputedCharges.length,
    disputedCharges,
    escalationAgencies: NO_SURPRISES_STATUTE_INFO.regulatoryAgencies,
    trackingNumber,
    generatedAt: new Date().toISOString(),
    directivesApplied: directives,
  };
}
