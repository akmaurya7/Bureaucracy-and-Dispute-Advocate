export interface StatuteRule {
  id: string;
  category: 'MEDICAL_BILLING' | 'DEBT_COLLECTION' | 'CREDIT_REPORT_ERROR' | 'SUBSCRIPTION_CANCEL';
  code: string;
  name: string;
  summary: string;
  statutoryResponseDays: number;
  triggerConditions: string[];
  mandatoryLanguageSnippet: string;
}

export const STATUTORY_RULES: StatuteRule[] = [
  {
    id: 'FDCPA_1692G',
    category: 'DEBT_COLLECTION',
    code: '15 U.S.C. § 1692g',
    name: 'Fair Debt Collection Practices Act - Validation of Debts',
    summary: 'Requires collector to cease collection activities until verification of debt and copy of judgment/original contract is mailed to consumer.',
    statutoryResponseDays: 30,
    triggerConditions: ['collection_notice_received', 'unrecognized_debt', 'disputed_amount'],
    mandatoryLanguageSnippet: 'Pursuant to 15 U.S.C. § 1692g(b), this letter serves as formal notice that your claim is disputed in its entirety. You are hereby required to cease all collection activities until you provide written verification of the debt, including complete accounting records and proof of assignment from the original creditor.'
  },
  {
    id: 'FCRA_1681I',
    category: 'CREDIT_REPORT_ERROR',
    code: '15 U.S.C. § 1681i',
    name: 'Fair Credit Reporting Act - Procedure in Case of Disputed Accuracy',
    summary: 'Mandates consumer reporting agencies conduct a free reinvestigation within 30 days and delete unverified or inaccurate information.',
    statutoryResponseDays: 30,
    triggerConditions: ['inaccurate_tradeline', 'obsolete_account', 'unverified_derogatory_mark'],
    mandatoryLanguageSnippet: 'Under Section 611 of the Fair Credit Reporting Act (15 U.S.C. § 1681i), you are required to conduct a prompt and reasonable reinvestigation of this inaccurate tradeline within 30 days. If the furnisher fails to verify the accuracy with verifiable documentation, you must permanently delete this item.'
  },
  {
    id: 'NO_SURPRISES_ACT',
    category: 'MEDICAL_BILLING',
    code: '42 U.S.C. § 300gg-111',
    name: 'Federal No Surprises Act - Surprise Billing Protections',
    summary: 'Prohibits out-of-network balance billing for emergency services and certain non-emergency services at in-network facilities.',
    statutoryResponseDays: 30,
    triggerConditions: ['out_of_network_emergency', 'facility_in_network_doctor_out', 'unbundled_cpt_charges'],
    mandatoryLanguageSnippet: 'Under the federal No Surprises Act (42 U.S.C. § 300gg-111; 45 CFR § 149.410), patients are protected from surprise balance billing for emergency services. The billed amount exceeds in-network cost-sharing limits and violates statutory federal protections. Please issue an immediate revised itemized billing statement conforming to QPA standards.'
  },
  {
    id: 'FTC_CLICK_TO_CANCEL',
    category: 'SUBSCRIPTION_CANCEL',
    code: '16 CFR Part 425 & 15 U.S.C. § 1693e',
    name: 'FTC Negative Option Rule & Electronic Fund Transfer Act',
    summary: 'Requires sellers to make cancellation as easy as enrollment and revokes recurring payment debit authorization.',
    statutoryResponseDays: 10,
    triggerConditions: ['dark_pattern_cancellation', 'refusal_to_cancel_online', 'unauthorized_recurring_charge'],
    mandatoryLanguageSnippet: 'In accordance with the FTC Negative Option Rule (16 CFR Part 425) and Section 907 of the Electronic Fund Transfer Act (15 U.S.C. § 1693e), I hereby revoke all recurring preauthorized debit permissions for this account. Any subsequent charge will be reported immediately as an unauthorized withdrawal.'
  }
];
