import type { DisputeCategory } from '../ocr/schemas';
import type {
  DisputeEngineOptions,
  CompiledDisputeLetter,
  GoverningStatuteInfo,
} from './types';
import { generateFdcpaLetter, FDCPA_STATUTE_INFO } from './fdcpa';
import { generateNoSurprisesLetter, NO_SURPRISES_STATUTE_INFO } from './noSurprises';
import { generateFcraLetter, FCRA_STATUTE_INFO } from './fcra';
import { generateFtcClickToCancelLetter, FTC_CLICK_TO_CANCEL_INFO } from './ftcClickToCancel';

export const DOMAIN_GOVERNING_STATUTES: Record<DisputeCategory, GoverningStatuteInfo> = {
  DEBT_COLLECTION: FDCPA_STATUTE_INFO,
  MEDICAL_BILLING: NO_SURPRISES_STATUTE_INFO,
  CREDIT_REPORT_ERROR: FCRA_STATUTE_INFO,
  SUBSCRIPTION_CANCEL: FTC_CLICK_TO_CANCEL_INFO,
  RENTAL_LEASE_DISPUTE: {
    code: 'State Residential Landlord-Tenant Act & Security Deposit Statutes',
    name: 'State Security Deposit Return & Itemized Deduction Accounting Standards',
    summary:
      'Mandates itemized receipts and return of tenant security deposits within strict statutory windows (typically 14-30 days).',
    statutoryResponseDays: 21,
    timeUnit: 'calendar_days',
    regulatoryAgencies: [
      'State Attorney General (Consumer & Tenant Protection Bureau)',
      'Local Housing Authority & Municipal Rent Board',
    ],
  },
  UTILITY_OVERCHARGE: {
    code: 'State Public Utility Commission (PUC) Customer Service Rules',
    name: 'Public Utility Tariff Regulations & Billing Dispute Safeguards',
    summary:
      'Prohibits estimated overbilling, mandates meter recalibration, and prevents service disconnection during pending dispute.',
    statutoryResponseDays: 30,
    timeUnit: 'calendar_days',
    regulatoryAgencies: [
      'State Public Utility Commission (PUC)',
      'Office of Public Utility Counsel (OPUC)',
    ],
  },
  AIRLINE_PASSENGER_RIGHTS: {
    code: '14 CFR Part 259 & 49 U.S.C. § 41712',
    name: 'DOT Airline Passenger Protections & Unfair Deceptive Practices Ban',
    summary:
      'Mandates prompt refunds for cancelled or significantly delayed flights under U.S. Department of Transportation regulations.',
    statutoryResponseDays: 14,
    timeUnit: 'business_days',
    regulatoryAgencies: [
      'U.S. Department of Transportation (DOT Aviation Consumer Protection)',
      'Federal Aviation Administration (FAA)',
    ],
  },
};

/**
 * Returns the statutory governing authority for a given dispute category.
 */
export function getGoverningStatuteForCategory(
  category: DisputeCategory
): GoverningStatuteInfo {
  return DOMAIN_GOVERNING_STATUTES[category] || FDCPA_STATUTE_INFO;
}

/**
 * Master dispute compiler and router.
 *
 * Routes incoming `ParsedDocumentData` and user directives to the appropriate
 * domain-specific statutory generator, assembling a certified mail dispute letter.
 */
export function compileDisputeLetter(options: DisputeEngineOptions): CompiledDisputeLetter {
  const category = options.categoryOverride || options.parsedDoc.detectedCategory;

  switch (category) {
    case 'DEBT_COLLECTION':
      return generateFdcpaLetter(options);

    case 'MEDICAL_BILLING':
      return generateNoSurprisesLetter(options);

    case 'CREDIT_REPORT_ERROR':
      return generateFcraLetter(options);

    case 'SUBSCRIPTION_CANCEL':
      return generateFtcClickToCancelLetter(options);

    case 'RENTAL_LEASE_DISPUTE':
    case 'UTILITY_OVERCHARGE':
    case 'AIRLINE_PASSENGER_RIGHTS':
    default:
      // For general consumer disputes, leverage statutory frameworks:
      // If collection or unverified debt is involved, default to FDCPA;
      // otherwise, if healthcare or billing related, No Surprises; else FDCPA.
      if (options.parsedDoc.rawText?.toLowerCase().includes('cpt') || options.parsedDoc.rawText?.toLowerCase().includes('hospital')) {
        return generateNoSurprisesLetter(options);
      }
      return generateFdcpaLetter(options);
  }
}
