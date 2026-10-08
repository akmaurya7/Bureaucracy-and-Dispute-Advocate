'use client';

import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Download,
  Copy,
  Check,
  RefreshCw,
  Scale,
  Sparkles,
  Lock,
} from 'lucide-react';
import { redactSensitivePII } from '@/lib/ocr/redactor';

export default function DisputeStudioPage() {
  const [selectedCategory, setSelectedCategory] = useState<'MEDICAL_BILLING' | 'DEBT_COLLECTION' | 'CREDIT_REPORT_ERROR' | 'SUBSCRIPTION_CANCEL'>('MEDICAL_BILLING');
  const [includeCeasePhone, setIncludeCeasePhone] = useState(true);
  const [includeAccountingLedger, setIncludeAccountingLedger] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isPIIRedacted, setIsPIIRedacted] = useState(true);

  // Sample raw medical bill text (illustrating patient bill with unbundled CPT codes)
  const rawDocumentSample = `MEMORIAL REGIONAL HOSPITAL - INVOICE & STATEMENT
PATIENT: John Doe
ACCOUNT #: 847291048
MRN: 948271-B
SSN: 123-45-6789
DATE OF SERVICE: 09/14/2026

ITEMIZED CHARGES:
1. CPT 99285 - Emergency Dept Visit (Level 5 High Severity) ........ $2,450.00 [FLAGGED: Upcoding]
2. CPT 99070 - Special Surgical Tray Supplies ......................... $680.00 [FLAGGED: Unbundled]
3. Routine Nursing Care (General Facility) ............................ $890.00 [FLAGGED: Duplicate Facility Fee]
4. Out-of-Network Emergency Physician Surcharge ..................... $1,200.00 [FLAGGED: No Surprises Act Violation]

TOTAL BILLED: $5,220.00
PATIENT RESPONSIBILITY: $3,420.00`;

  const redactedResult = redactSensitivePII(rawDocumentSample);
  const displayedDocument = isPIIRedacted ? redactedResult.redactedText : rawDocumentSample;

  const letterDraft = `DATE: October 8, 2026
SENT VIA: Certified Mail with Return Receipt Requested / Formal Regulatory Portal

FROM:
John Doe
123 Consumer Protection Way
Austin, TX 78701

TO:
Memorial Regional Hospital
Claims & Patient Financial Services
100 Hospital Drive, Austin, TX 78705

RE: FORMAL STATUTORY NOTICE OF DISPUTE: Account Ref #847291048 [DEMAND FOR ITEMIZATION & BALANCE BILLING REVISION]

Dear Compliance and Billing Department,

Please be advised that this letter constitutes a formal, legally grounded dispute regarding billing statement Account #847291048 for dates of service September 14, 2026.

### Itemized Discrepancies & Statutory Violations:
1. CPT Code 99285 ($2,450.00): Inappropriate Level 5 code assignment without documentation of high-complexity medical decision-making.
2. CPT Code 99070 ($680.00): Impermissible unbundling of surgical tray supplies into separate billing line items.
3. Out-of-Network Physician Surcharge ($1,200.00): Clear violation of the federal No Surprises Act (42 U.S.C. § 300gg-111; 45 CFR § 149.410), which prohibits out-of-network balance billing for emergency services at in-network facilities.

### Statutory Rights & Mandatory Directives:
Under 42 U.S.C. § 300gg-111, patients receiving emergency care cannot be billed amounts exceeding the in-network cost-sharing requirement (Qualifying Payment Amount - QPA). Any attempt to collect beyond the lawful QPA constitutes a direct violation subject to federal regulatory penalties.

${includeAccountingLedger ? `### Required Accounting Records:
Pursuant to statutory billing transparency rules, you are hereby requested to provide a comprehensive, line-by-line itemized ledger displaying the CMS relative value units (RVU), in-network contracted rates, and proof of assignment.` : ''}

${includeCeasePhone ? `### Communication Directive:
Pursuant to consumer protection principles, all future communications regarding this matter must be conducted strictly in writing. Cease and desist all telephone contact to my personal and work lines.` : ''}

### Required Corrective Actions within 30 Calendar Days:
1. Immediately retract the $1,200.00 out-of-network balance bill and unbundled charges.
2. Issue an amended billing statement reflecting strictly lawful, in-network cost-sharing.
3. Confirm in writing that this account is placed on formal dispute hold and will not be referred to third-party collections.

Failure to resolve this matter within the statutory 30-day window will result in formal complaint filings with the Centers for Medicare & Medicaid Services (CMS No Surprises Help Desk) and the Texas Department of Insurance.

Sincerely,

___________________________________
John Doe
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(letterDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">Split-Screen Dispute Studio</h1>
            <span className="badge-audited">Case #MED-2026-0914</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Source document verification (Left) synchronized with live statutory demand letter (Right).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPIIRedacted(!isPIIRedacted)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isPIIRedacted
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            {isPIIRedacted ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isPIIRedacted ? 'PII Masking ON (Safe)' : 'PII Masking OFF'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Draft' : 'Copy Letter'}</span>
          </button>

          <button
            onClick={() => alert('Court-ready Certified Mail PDF generation triggered!')}
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Certified PDF</span>
          </button>
        </div>
      </div>

      {/* Split-Screen Workspace (50 / 50 Desktop Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[680px]">
        {/* Left Pane: Ingested Document Visualizer */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800">Source Document: Memorial_ER_Bill.pdf</span>
            </div>
            <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-semibold">
              4 Violations Detected
            </span>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap selection:bg-rose-500 selection:text-white">
              {displayedDocument}
            </div>

            {/* Violation Legend */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center space-x-1.5 text-rose-800 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Statutory Violation Flags</span>
              </div>
              <ul className="text-xs text-rose-700 space-y-1 list-disc pl-4">
                <li><strong>No Surprises Act (42 U.S.C. § 300gg-111):</strong> Out-of-network clinician balance billing at in-network hospital facility ($1,200.00).</li>
                <li><strong>Unbundled CPT 99070:</strong> Impermissible separate charge for surgical tray supplies ($680.00).</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Pane: Live-Editable Legal Demand Draft */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold text-slate-800">Formal Legal Demand Letter (Live Editor)</span>
            </div>
            <span className="text-xs font-mono text-slate-500">Statutory SLA: 30 Days</span>
          </div>

          {/* Clause Toggles Bar */}
          <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center gap-4 text-xs text-slate-700">
            <span className="font-semibold text-slate-500">Clauses:</span>
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCeasePhone}
                onChange={(e) => setIncludeCeasePhone(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Cease Phone Calls (Writing Only)</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAccountingLedger}
                onChange={(e) => setIncludeAccountingLedger(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Demand Full Itemized Ledger</span>
            </label>
          </div>

          <div className="p-4 flex-1">
            <textarea
              value={letterDraft}
              readOnly
              className="w-full h-full min-h-[460px] p-4 text-xs font-mono text-slate-800 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none leading-relaxed resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
