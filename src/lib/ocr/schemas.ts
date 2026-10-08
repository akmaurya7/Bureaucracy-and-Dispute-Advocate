import { z } from 'zod';

/**
 * Dispute Categories supported across the advocacy platform.
 * Aligns strictly with Prisma enum `DisputeCategory`.
 */
export const DisputeCategoryEnum = z.enum([
  'MEDICAL_BILLING',
  'DEBT_COLLECTION',
  'CREDIT_REPORT_ERROR',
  'SUBSCRIPTION_CANCEL',
  'RENTAL_LEASE_DISPUTE',
  'UTILITY_OVERCHARGE',
  'AIRLINE_PASSENGER_RIGHTS',
]);
export type DisputeCategory = z.infer<typeof DisputeCategoryEnum>;

/**
 * Procedural Code Types (e.g. CPT, HCPCS, Revenue Codes).
 */
export const CodeTypeEnum = z.enum([
  'CPT',
  'HCPCS',
  'REV_CODE',
  'DRG',
  'SERVICE_CODE',
  'OTHER',
]);
export type CodeType = z.infer<typeof CodeTypeEnum>;

/**
 * Violation types identified during statutory audit.
 */
export const ViolationTypeEnum = z.enum([
  'UPCODING',
  'UNBUNDLING',
  'SURPRISE_BILL',
  'DUPLICATE_CHARGE',
  'TIME_BARRED_DEBT',
  'INACCURATE_BALANCE',
  'UNAUTHORIZED_FEE',
  'MISSING_DISCLOSURE',
  'OTHER',
]);
export type ViolationType = z.infer<typeof ViolationTypeEnum>;

/**
 * Sender / Creditor details extracted from the document header and body.
 */
export const SenderOrCreditorSchema = z.object({
  name: z.string().min(1, 'Creditor or institution name is required'),
  department: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  accountOrReferenceNumber: z.string().nullable().optional(),
  accountReferenceNumber: z.string().nullable().optional(),
  facilityName: z.string().nullable().optional(),
});
export type SenderOrCreditor = z.infer<typeof SenderOrCreditorSchema>;

/**
 * Consumer / Patient / Debtor identification (Strictly sanitized of high-risk PII).
 */
export const ConsumerOrDebtorSchema = z.object({
  name: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  maskedAccountNumber: z.string().nullable().optional(),
  maskedPatientId: z.string().nullable().optional(),
});
export type ConsumerOrDebtor = z.infer<typeof ConsumerOrDebtorSchema>;

/**
 * Itemized service or billing charge line item.
 */
export const ItemizedChargeSchema = z.object({
  id: z.string().optional(),
  code: z.string().nullable().optional(),
  codeType: CodeTypeEnum.default('OTHER').optional(),
  description: z.string().min(1, 'Charge description is required'),
  serviceDate: z.string().nullable().optional(),
  units: z.number().default(1).optional(),
  amount: z.number().nonnegative(),
  billedAmount: z.number().nonnegative().optional(),
  allowedAmount: z.number().nonnegative().nullable().optional(),
  insurancePaid: z.number().nonnegative().nullable().optional(),
  patientResponsibility: z.number().nonnegative().nullable().optional(),
  isDisputed: z.boolean().default(false).optional(),
  isFlagged: z.boolean().default(false).optional(),
  violationType: ViolationTypeEnum.optional(),
  violationExplanation: z.string().nullable().optional(),
  statutoryBasis: z.string().nullable().optional(),
  flagReason: z.string().nullable().optional(),
  statuteRef: z.string().nullable().optional(),
});
export type ItemizedCharge = z.infer<typeof ItemizedChargeSchema>;

/**
 * Balance summary and financial accounting details.
 */
export const FinancialSummarySchema = z.object({
  statementDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  originalBalance: z.number().nonnegative().nullable().optional(),
  totalBilled: z.number().nonnegative().default(0.0),
  totalDue: z.number().nonnegative().default(0.0),
  currency: z.string().default('USD'),
  originalCreditor: z.string().nullable().optional(),
  currentCreditor: z.string().nullable().optional(),
  priorPayments: z.number().nonnegative().nullable().optional(),
  adjustments: z.number().nonnegative().nullable().optional(),
  patientResponsibility: z.number().nonnegative().nullable().optional(),
});
export type FinancialSummary = z.infer<typeof FinancialSummarySchema>;

/**
 * Detailed debt or bill details container.
 */
export const DebtOrBillDetailsSchema = z.object({
  statementDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  totalDue: z.number().nonnegative().default(0.0),
  totalBilled: z.number().nonnegative().default(0.0).optional(),
  originalCreditor: z.string().nullable().optional(),
  patientResponsibility: z.number().nonnegative().nullable().optional(),
  itemizedCharges: z.array(ItemizedChargeSchema).default([]),
});
export type DebtOrBillDetails = z.infer<typeof DebtOrBillDetailsSchema>;

/**
 * Statutory disclosure compliance markers extracted from notice fine print.
 */
export const StatutoryDisclosuresSchema = z.object({
  hasFdcpaMiniMiranda: z.boolean().default(false),
  hasValidationPeriodNotice: z.boolean().default(false),
  hasNoSurprisesNotice: z.boolean().default(false),
  fdcpa30DayNotice: z.boolean().default(false).optional(),
  hasGoodFaithEstimateNotice: z.boolean().default(false).optional(),
  hasOutOfNetworkMarkers: z.boolean().default(false).optional(),
  hasArbitrationClause: z.boolean().default(false).optional(),
  missingMandatoryDisclosures: z.array(z.string()).default([]),
});
export type StatutoryDisclosures = z.infer<typeof StatutoryDisclosuresSchema>;

/**
 * Metrics on masked sensitive tokens.
 */
export const RedactionMetricsSchema = z.object({
  totalEntitiesFound: z.number().default(0),
  ssnCount: z.number().default(0),
  cardCount: z.number().default(0),
  mrnCount: z.number().default(0),
  routingCount: z.number().default(0),
  dobCount: z.number().default(0),
  hasHighRiskPII: z.boolean().default(false),
});
export type RedactionMetrics = z.infer<typeof RedactionMetricsSchema>;

/**
 * PII Redaction Audit Summary ensuring zero retention before downstream analysis.
 */
export const RedactionSummarySchema = z.object({
  originalTextLength: z.number(),
  redactedTextLength: z.number(),
  detectedEntitiesCount: z.number(),
  hasHighRiskPII: z.boolean(),
  entityTypesMasked: z.array(z.string()).default([]),
  zeroRetentionVerified: z.boolean().default(true),
});
export type RedactionSummary = z.infer<typeof RedactionSummarySchema>;

/**
 * Unified parsed document schema representing extracted and normalized data.
 */
export const ParsedDocumentDataSchema = z.object({
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  detectedCategory: DisputeCategoryEnum,
  confidenceScore: z.number().min(0).max(1).default(0.85),
  senderOrCreditor: SenderOrCreditorSchema,
  consumerOrDebtor: ConsumerOrDebtorSchema.default({}),
  debtOrBillDetails: DebtOrBillDetailsSchema,
  itemizedCharges: z.array(ItemizedChargeSchema).optional(),
  financialSummary: FinancialSummarySchema,
  statutoryDisclosures: StatutoryDisclosuresSchema,
  rawText: z.string().optional(),
  redactedText: z.string().optional(),
  rawRedactedText: z.string().optional(),
  redactionMetrics: RedactionMetricsSchema.optional(),
  redactionSummary: RedactionSummarySchema.optional(),
  uploadedAt: z.string().optional(),
  extractedAt: z.string().optional(),
  auditFlagsCount: z.number().default(0),
  totalFlaggedAmount: z.number().default(0.0),
});
export type ParsedDocumentData = z.infer<typeof ParsedDocumentDataSchema>;

/**
 * ExtractedDocumentSchema and type alias.
 */
export const ExtractedDocumentSchema = ParsedDocumentDataSchema;
export type ExtractedDocument = ParsedDocumentData;
