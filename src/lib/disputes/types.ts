import type { DisputeCategory, ItemizedCharge, ParsedDocumentData } from '../ocr/schemas';

/**
 * Procedural dispute grounds recognized by federal and state consumer protection statutes.
 */
export type DisputeGround =
  | 'UPCODING'
  | 'UNBUNDLING'
  | 'SURPRISE_BILL'
  | 'DUPLICATE_CHARGE'
  | 'TIME_BARRED_DEBT'
  | 'INACCURATE_BALANCE'
  | 'UNAUTHORIZED_FEE'
  | 'MISSING_DISCLOSURE'
  | 'NO_CONTRACT'
  | 'WRONG_PERSON'
  | 'FAILURE_TO_VALIDATE'
  | 'METHOD_OF_VERIFICATION'
  | 'REVOKED_DEBIT_AUTHORIZATION'
  | 'NEGATIVE_OPTION_SYMMETRY'
  | 'OTHER';

/**
 * Directives configuring the legal letter generation engine.
 */
export interface DisputeDirectives {
  /**
   * Enforces 15 U.S.C. § 1692c(c) or consumer privacy directive requiring
   * the creditor/collector to immediately cease all telephone contact and communicate solely in writing.
   */
  ceasePhoneCalls?: boolean;

  /**
   * Demands a line-by-line accounting ledger from $0 original balance, RVU documentation,
   * or complete billing transparency breakdown.
   */
  demandItemizedLedger?: boolean;

  /**
   * Compels production of complete chain-of-title assignments and original signed credit agreement.
   */
  requestChainOfTitle?: boolean;

  /**
   * Demands statutory Method of Verification (MOV) under 15 U.S.C. § 1681i(a)(7) identifying furnishers.
   */
  includeMethodOfVerification?: boolean;

  /**
   * Explicitly cites statutory civil damages (e.g. $1,000 per violation under 15 U.S.C. § 1692k(a)(2)(A),
   * willful non-compliance penalties under 15 U.S.C. § 1681n, or $10,000 CMP under 42 U.S.C. § 300gg-139).
   */
  citeStatutoryDamages?: boolean;

  /**
   * Issues notice of pending escalation to primary regulatory enforcement agencies
   * (CFPB, CMS No Surprises Help Desk, FTC, and State Attorney General).
   */
  includeRegulatoryEscalation?: boolean;

  /**
   * Specific dispute grounds to highlight in the statutory demand.
   */
  disputeGrounds?: DisputeGround[];

  /**
   * Optional custom narrative, factual background, or consumer notes.
   */
  customNotes?: string;

  /**
   * Optional Certified Mail tracking barcode/number (e.g., "7020 0640 0001 2345 6789").
   */
  certifiedMailNumber?: string;

  /**
   * Target SLA days override (defaults to the statutory standard: 30 days for FDCPA/FCRA/No Surprises, 10 days for FTC/EFTA).
   */
  targetSlaDaysOverride?: number;

  /**
   * Explicit itemized charge IDs to dispute. If omitted, defaults to all flagged items.
   */
  selectedChargeIds?: string[];
}

/**
 * Party identity in a formal dispute demand (Consumer/Debtor or Creditor/Collector).
 */
export interface DisputeParty {
  name: string;
  department?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  email?: string | null;
  accountOrReferenceNumber?: string | null;
}

/**
 * Standardized dispute engine generation options.
 */
export interface DisputeEngineOptions {
  parsedDoc: ParsedDocumentData;
  directives?: DisputeDirectives;
  senderOverride?: Partial<DisputeParty>;
  recipientOverride?: Partial<DisputeParty>;
  categoryOverride?: DisputeCategory;
  caseId?: string;
}

/**
 * Metadata on codified statutory governing law.
 */
export interface GoverningStatuteInfo {
  code: string;
  name: string;
  summary: string;
  statutoryResponseDays: number;
  timeUnit: 'calendar_days' | 'business_days';
  regulatoryAgencies: string[];
}

/**
 * Complete, court-ready compiled dispute letter artifact.
 */
export interface CompiledDisputeLetter {
  id?: string;
  caseId?: string;
  subjectLine: string;
  recipientName: string;
  recipientAddress: string;
  bodyMarkdown: string;
  fullLetterMarkdown: string;
  legalCitations: string[];
  statutorySlaDays: number;
  statutoryDeadlineDate: string;
  disputeDomain: DisputeCategory;
  governingStatute: GoverningStatuteInfo;
  totalDisputedAmount: number;
  disputedLineItemsCount: number;
  disputedCharges: ItemizedCharge[];
  escalationAgencies: string[];
  trackingNumber: string;
  generatedAt: string;
  directivesApplied: DisputeDirectives;
}

/**
 * Domain-specific generator function signature.
 */
export type DomainDisputeGenerator = (
  options: DisputeEngineOptions
) => CompiledDisputeLetter;
