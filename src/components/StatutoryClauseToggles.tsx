'use client';

import React, { useMemo } from 'react';
import {
  Scale,
  PhoneOff,
  FileSpreadsheet,
  FileCheck2,
  SearchCheck,
  AlertTriangle,
  Clock,
  ShieldAlert,
  HelpCircle,
  Sparkles,
  Check,
  CheckCircle2,
  Calendar,
  Building,
  Gavel,
} from 'lucide-react';
import { STATUTORY_RULES, StatuteRule } from '@/lib/statutes/rules';

export interface StatutoryDirectives {
  /** Telephone Cease-and-Desist (15 U.S.C. § 1692c) */
  ceasePhoneCalls: boolean;
  /** Demand Complete Itemized Ledger & Accounting (45 CFR § 149.410 / Truth in Lending § 1666) */
  demandItemizedLedger: boolean;
  /** Request Chain-of-Title & Original Creditor Agreement (15 U.S.C. § 1692g(a)(4) / Evid. Rule 901) */
  requestChainOfTitle: boolean;
  /** Include Method of Verification (MOV) Demand (15 U.S.C. § 1681i(a)(7)) */
  includeMethodOfVerification: boolean;
  /** Include CFPB / CMS / FTC / State AG Escalation Warning (12 U.S.C. § 5536) */
  includeRegulatoryEscalation: boolean;
}

export type DisputeDomainId =
  | 'FDCPA_1692G'
  | 'NO_SURPRISES_ACT'
  | 'FCRA_1681I'
  | 'FTC_CLICK_TO_CANCEL';

export interface DomainMetadata {
  id: DisputeDomainId;
  name: string;
  shortName: string;
  code: string;
  category: 'DEBT_COLLECTION' | 'MEDICAL_BILLING' | 'CREDIT_REPORT_ERROR' | 'SUBSCRIPTION_CANCEL';
  statutoryResponseDays: number;
  isBusinessDays: boolean;
  governingAgencies: string[];
  maxStatutoryPenalty: string;
  coreBurden: string;
  tagline: string;
  defaultDirectives: StatutoryDirectives;
}

export const STATUTORY_DOMAINS: DomainMetadata[] = [
  {
    id: 'FDCPA_1692G',
    name: 'Fair Debt Collection Practices Act',
    shortName: 'FDCPA Debt Collection',
    code: '15 U.S.C. § 1692 et seq. / CFPB Reg F',
    category: 'DEBT_COLLECTION',
    statutoryResponseDays: 30,
    isBusinessDays: false,
    governingAgencies: ['CFPB', 'FTC', 'State Attorney General'],
    maxStatutoryPenalty: '$1,000 statutory damages per action + reasonable attorney fees (15 U.S.C. § 1692k)',
    coreBurden: 'Collector must cease collection activities until written validation and original creditor chain-of-title are mailed.',
    tagline: 'Stops predatory collectors, halts telephone harassment, and demands complete accounting.',
    defaultDirectives: {
      ceasePhoneCalls: true,
      demandItemizedLedger: true,
      requestChainOfTitle: true,
      includeMethodOfVerification: false,
      includeRegulatoryEscalation: true,
    },
  },
  {
    id: 'NO_SURPRISES_ACT',
    name: 'Federal No Surprises Act & IDR Rules',
    shortName: 'No Surprises Act (Medical)',
    code: '42 U.S.C. § 300gg-111 / 45 CFR Part 149',
    category: 'MEDICAL_BILLING',
    statutoryResponseDays: 30,
    isBusinessDays: true,
    governingAgencies: ['CMS', 'HHS', 'Department of Labor'],
    maxStatutoryPenalty: 'Up to $10,000 civil monetary penalty per violation (42 U.S.C. § 300gg-111(a)(3))',
    coreBurden: 'Bans out-of-network balance billing for emergency or facility services without documented statutory consent.',
    tagline: 'Audits unbundled CPT codes, flags upcoding, and triggers 30-day Open Negotiation before Federal IDR.',
    defaultDirectives: {
      ceasePhoneCalls: true,
      demandItemizedLedger: true,
      requestChainOfTitle: false,
      includeMethodOfVerification: false,
      includeRegulatoryEscalation: true,
    },
  },
  {
    id: 'FCRA_1681I',
    name: 'Fair Credit Reporting Act Tradeline Reinvestigation',
    shortName: 'FCRA Credit Reporting',
    code: '15 U.S.C. § 1681i / § 1681s-2',
    category: 'CREDIT_REPORT_ERROR',
    statutoryResponseDays: 30,
    isBusinessDays: false,
    governingAgencies: ['CFPB', 'FTC'],
    maxStatutoryPenalty: 'Actual damages + up to $1,000 statutory damages per willful noncompliance + punitive damages (15 U.S.C. § 1681n)',
    coreBurden: 'Consumer reporting agencies must conduct a free reinvestigation and delete inaccurate or unverified tradelines.',
    tagline: 'Forces credit bureaus to execute rigorous reinvestigation and furnish Method of Verification (MOV).',
    defaultDirectives: {
      ceasePhoneCalls: false,
      demandItemizedLedger: true,
      requestChainOfTitle: true,
      includeMethodOfVerification: true,
      includeRegulatoryEscalation: true,
    },
  },
  {
    id: 'FTC_CLICK_TO_CANCEL',
    name: 'FTC Negative Option Rule & Electronic Fund Transfer Act',
    shortName: 'FTC Click-to-Cancel',
    code: '16 CFR Part 425 & 15 U.S.C. § 1693e',
    category: 'SUBSCRIPTION_CANCEL',
    statutoryResponseDays: 10,
    isBusinessDays: true,
    governingAgencies: ['FTC', 'Consumer Financial Protection Bureau'],
    maxStatutoryPenalty: 'Up to $51,744 civil penalty per violation under 15 U.S.C. § 45(m)(1)(A) + restitution',
    coreBurden: 'Cancellation mechanism must be as simple and accessible as enrollment, and preauthorized debits are immediately revocable.',
    tagline: 'Revokes preauthorized payment permissions and exposes recurring billing dark patterns.',
    defaultDirectives: {
      ceasePhoneCalls: true,
      demandItemizedLedger: true,
      requestChainOfTitle: false,
      includeMethodOfVerification: false,
      includeRegulatoryEscalation: true,
    },
  },
];

export interface DirectiveDefinition {
  key: keyof StatutoryDirectives;
  label: string;
  citation: string;
  statuteTag: string;
  plainSummary: string;
  icon: React.ComponentType<{ className?: string }>;
  primaryDomains: DisputeDomainId[];
}

export const DIRECTIVE_DEFINITIONS: DirectiveDefinition[] = [
  {
    key: 'ceasePhoneCalls',
    label: 'Telephone Cease-and-Desist',
    citation: '15 U.S.C. § 1692c(c) / CFPB Reg F 12 CFR § 1006.14',
    statuteTag: 'Writing-Only Directive',
    plainSummary:
      'Directs the recipient to immediately cease all telephone calls, automated dialers, and SMS contact. Compels all future communications to occur strictly via verifiable U.S. Mail.',
    icon: PhoneOff,
    primaryDomains: ['FDCPA_1692G', 'NO_SURPRISES_ACT', 'FTC_CLICK_TO_CANCEL'],
  },
  {
    key: 'demandItemizedLedger',
    label: 'Demand Complete Itemized Ledger & Accounting',
    citation: '45 CFR § 149.410 / Truth in Lending 15 U.S.C. § 1666',
    statuteTag: 'RVU & Contracted Rate Audit',
    plainSummary:
      'Requires a comprehensive, line-by-line accounting ledger disclosing procedural billing codes (CPT/HCPCS), CMS Relative Value Units (RVUs), and in-network contracted allowances.',
    icon: FileSpreadsheet,
    primaryDomains: ['FDCPA_1692G', 'NO_SURPRISES_ACT', 'FCRA_1681I', 'FTC_CLICK_TO_CANCEL'],
  },
  {
    key: 'requestChainOfTitle',
    label: 'Request Chain-of-Title & Original Creditor Agreement',
    citation: '15 U.S.C. § 1692g(a)(4) / Fed. R. Evid. 901',
    statuteTag: 'Standing & Assignment Audit',
    plainSummary:
      'Compels debt collectors or furnishers to provide certified documentary proof of assignment, bill of sale from the originating creditor, and the original signed contract.',
    icon: FileCheck2,
    primaryDomains: ['FDCPA_1692G', 'FCRA_1681I'],
  },
  {
    key: 'includeMethodOfVerification',
    label: 'Include Method of Verification (MOV) Demand',
    citation: '15 U.S.C. § 1681i(a)(7)',
    statuteTag: 'Statutory MOV Disclosure',
    plainSummary:
      'Compels consumer reporting agencies or collectors to disclose the exact procedure used to verify disputed data, including the business name, address, and telephone number of each person contacted.',
    icon: SearchCheck,
    primaryDomains: ['FCRA_1681I', 'FDCPA_1692G'],
  },
  {
    key: 'includeRegulatoryEscalation',
    label: 'Include CFPB / CMS / FTC / State AG Escalation Warning',
    citation: '12 U.S.C. § 5536 / State Consumer Protection Acts',
    statuteTag: 'Enforcement Notice',
    plainSummary:
      'Puts compliance officers on notice that failure to rectify within the statutory window triggers formal complaint filings with the CFPB, CMS No Surprises Help Desk, FTC, and State Attorney General.',
    icon: AlertTriangle,
    primaryDomains: ['FDCPA_1692G', 'NO_SURPRISES_ACT', 'FCRA_1681I', 'FTC_CLICK_TO_CANCEL'],
  },
];

interface StatutoryClauseTogglesProps {
  selectedDomain: DisputeDomainId;
  onDomainChange: (domain: DisputeDomainId) => void;
  directives: StatutoryDirectives;
  onDirectiveChange: (key: keyof StatutoryDirectives, value: boolean) => void;
  onApplyPreset?: (directives: StatutoryDirectives) => void;
  disputedChargesCount?: number;
  totalDisputedAmount?: number;
}

export default function StatutoryClauseToggles({
  selectedDomain,
  onDomainChange,
  directives,
  onDirectiveChange,
  onApplyPreset,
  disputedChargesCount = 0,
  totalDisputedAmount = 0,
}: StatutoryClauseTogglesProps) {
  // Current domain metadata
  const currentDomainMeta = useMemo(() => {
    return (
      STATUTORY_DOMAINS.find((d) => d.id === selectedDomain) ||
      STATUTORY_DOMAINS[0]
    );
  }, [selectedDomain]);

  // Compute calculated response deadline date
  const deadlineDate = useMemo(() => {
    const today = new Date();
    let daysToAdd = currentDomainMeta.statutoryResponseDays;
    
    // If business days, rough calculate ~1.4 calendar days per business day
    if (currentDomainMeta.isBusinessDays) {
      daysToAdd = Math.ceil((daysToAdd * 7) / 5);
    }
    
    const target = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return target.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [currentDomainMeta]);

  // Active directive count
  const activeDirectivesCount = useMemo(() => {
    return Object.values(directives).filter(Boolean).length;
  }, [directives]);

  const handleSelectDomain = (domainId: DisputeDomainId) => {
    onDomainChange(domainId);
    // Automatically suggest default directives for the selected domain if preset callback exists
    const domainMeta = STATUTORY_DOMAINS.find((d) => d.id === domainId);
    if (domainMeta && onApplyPreset) {
      onApplyPreset(domainMeta.defaultDirectives);
    }
  };

  const handleToggleAll = (enable: boolean) => {
    if (onApplyPreset) {
      onApplyPreset({
        ceasePhoneCalls: enable,
        demandItemizedLedger: enable,
        requestChainOfTitle: enable,
        includeMethodOfVerification: enable,
        includeRegulatoryEscalation: enable,
      });
    } else {
      DIRECTIVE_DEFINITIONS.forEach((d) => {
        onDirectiveChange(d.key, enable);
      });
    }
  };

  return (
    <section
      aria-label="Statutory Dispute Engine & Clause Directives Control Panel"
      className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-5"
    >
      {/* Header & SLA Countdown Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-slate-900" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">
              Statutory Dispute Engine & Legal Directives
            </h2>
            <span className="bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              Federal Law Codified
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Switch dispute rules engines to automatically inject statutory provisions, evidentiary burdens, and mandatory response windows.
          </p>
        </div>

        {/* Real-time Response Countdown Chip */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span>Statutory SLA:</span>
              <span className="text-amber-700">
                {currentDomainMeta.statutoryResponseDays}{' '}
                {currentDomainMeta.isBusinessDays ? 'Business' : 'Calendar'} Days
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block">
              Opponent response due by: <strong className="text-slate-800">{deadlineDate}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Domain Switcher Grid (4 Federal Statutory Modules) */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
          Active Dispute Domain Engine:
        </label>
        <div
          role="radiogroup"
          aria-label="Select Statutory Dispute Engine"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {STATUTORY_DOMAINS.map((domain) => {
            const isSelected = selectedDomain === domain.id;
            return (
              <button
                key={domain.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectDomain(domain.id)}
                className={`text-left p-3 rounded-lg border transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                    : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {domain.shortName}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-mono block leading-tight ${
                      isSelected ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {domain.code}
                  </span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/40 flex items-center justify-between text-[10px]">
                  <span
                    className={`font-semibold ${
                      isSelected ? 'text-sky-300' : 'text-sky-700'
                    }`}
                  >
                    {domain.statutoryResponseDays} {domain.isBusinessDays ? 'Bus. Days' : 'Cal. Days'}
                  </span>
                  <span
                    className={`truncate max-w-[90px] font-medium ${
                      isSelected ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {domain.governingAgencies[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Domain Statutory Highlights Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-slate-700" aria-hidden="true" />
            <span className="font-bold text-slate-900">{currentDomainMeta.name}</span>
            <span className="bg-sky-100 text-sky-800 text-[10px] font-mono px-2 py-0.5 rounded font-semibold">
              {currentDomainMeta.code}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Building className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>Enforced by: {currentDomainMeta.governingAgencies.join(', ')}</span>
          </div>
        </div>

        <p className="text-slate-700 leading-relaxed">
          <strong>Mandatory Evidentiary Burden:</strong> {currentDomainMeta.coreBurden}
        </p>

        <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-200/80 gap-2 text-[11px]">
          <span className="text-rose-700 font-medium">
            <strong>Statutory Liability Exposure:</strong> {currentDomainMeta.maxStatutoryPenalty}
          </span>
          {disputedChargesCount > 0 && (
            <span className="text-slate-700 font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded">
              Auditing {disputedChargesCount} items (${totalDisputedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })})
            </span>
          )}
        </div>
      </div>

      {/* Directive Toggles Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Legal Directives & Statutory Demands ({activeDirectivesCount} of 5 Active)
            </h3>
            <span className="text-[11px] text-slate-500">
              Toggle specific legal mandates to inject directly into the live demand letter on the right.
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleToggleAll(true)}
              className="text-slate-700 hover:text-slate-900 font-medium underline underline-offset-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              Select All (Maximum Leverage)
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => handleToggleAll(false)}
              className="text-slate-500 hover:text-slate-800 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DIRECTIVE_DEFINITIONS.map((def) => {
            const isChecked = Boolean(directives[def.key]);
            const Icon = def.icon;
            const isPrimaryForCurrentDomain = def.primaryDomains.includes(selectedDomain);

            return (
              <div
                key={def.key}
                onClick={() => onDirectiveChange(def.key, !isChecked)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                  isChecked
                    ? 'border-slate-800 bg-white shadow-sm ring-1 ring-slate-800/10'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`p-1.5 rounded-md ${
                          isChecked ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        {def.label}
                      </span>
                    </div>

                    {/* Accessible Switch Toggle */}
                    <div
                      role="switch"
                      aria-checked={isChecked}
                      aria-label={def.label}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isChecked ? 'bg-slate-900' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isChecked ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed mb-2.5">
                    {def.plainSummary}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-[10px] font-mono text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded font-semibold">
                    {def.citation}
                  </span>
                  {isPrimaryForCurrentDomain ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                      Recommended
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Optional Directive
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
