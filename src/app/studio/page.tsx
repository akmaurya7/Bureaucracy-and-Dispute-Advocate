'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Download,
  Copy,
  Check,
  Scale,
  Lock,
  ChevronDown,
  ChevronUp,
  FileCheck,
  RotateCcw,
  Printer,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import DocumentDropzone, { SAMPLE_DOCUMENTS } from '@/components/DocumentDropzone';
import { redactSensitivePII } from '@/lib/ocr/redactor';
import {
  ParsedDocumentData,
  ItemizedCharge,
  DisputeCategory,
} from '@/lib/ocr/schemas';
import { STATUTORY_RULES } from '@/lib/statutes/rules';

export default function DisputeStudioPage() {
  // Initial demo document data parsed from default Memorial Hospital bill
  const defaultSample = SAMPLE_DOCUMENTS[0];
  const initialRedaction = redactSensitivePII(defaultSample.rawText);

  // Studio Ingestion & Document State
  const [showDropzone, setShowDropzone] = useState(true);
  const [rawSourceText, setRawSourceText] = useState(defaultSample.rawText);
  const [isPIIRedacted, setIsPIIRedacted] = useState(true);
  const [activeLeftView, setActiveLeftView] = useState<'itemized' | 'raw'>('itemized');

  // Parsed Document State
  const [parsedDoc, setParsedDoc] = useState<ParsedDocumentData>({
    fileName: defaultSample.name,
    fileType: 'application/pdf',
    detectedCategory: defaultSample.category,
    confidenceScore: 0.94,
    senderOrCreditor: {
      name: 'Memorial Regional Hospital & Healthcare Network',
      department: 'Claims & Patient Financial Services',
      address: '100 Hospital Drive, Austin, TX 78705',
      accountOrReferenceNumber: '847291048',
      accountReferenceNumber: '847291048',
    },
    consumerOrDebtor: {
      name: 'Johnathan Doe',
      address: '123 Consumer Protection Way, Austin, TX 78701',
      maskedAccountNumber: '[REDACTED-ACCT-***1048]',
      maskedPatientId: '[REDACTED-PATIENT-MRN]',
    },
    debtOrBillDetails: {
      statementDate: 'September 20, 2026',
      totalDue: 3420.0,
      totalBilled: 5220.0,
      patientResponsibility: 3420.0,
      itemizedCharges: [
        {
          id: 'charge-1',
          code: 'CPT 99285',
          description: 'Emergency Dept Visit (Level 5 High Severity)',
          units: 1,
          amount: 2450.0,
          billedAmount: 2450.0,
          isDisputed: true,
          isFlagged: true,
          violationType: 'UPCODING',
          violationExplanation: 'Inappropriate Level 5 code assignment without documentation of high-complexity medical decision-making.',
          statutoryBasis: '42 U.S.C. § 300gg-111 / No Surprises Act',
        },
        {
          id: 'charge-2',
          code: 'CPT 99070',
          description: 'Special Surgical Tray Supplies',
          units: 1,
          amount: 680.0,
          billedAmount: 680.0,
          isDisputed: true,
          isFlagged: true,
          violationType: 'UNBUNDLING',
          violationExplanation: 'Impermissible unbundling of surgical tray supplies into separate billing line items.',
          statutoryBasis: 'CPT Global Surgical Package Rules',
        },
        {
          id: 'charge-3',
          code: 'REV 0450',
          description: 'Hospital Emergency Room Facility Fee',
          units: 1,
          amount: 890.0,
          billedAmount: 890.0,
          isDisputed: false,
          isFlagged: false,
          violationType: 'OTHER',
          violationExplanation: 'Standard emergency facility base rate under review.',
          statutoryBasis: 'Itemized Transparency Rules',
        },
        {
          id: 'charge-4',
          description: 'Out-of-Network Emergency Physician Surcharge',
          units: 1,
          amount: 1200.0,
          billedAmount: 1200.0,
          isDisputed: true,
          isFlagged: true,
          violationType: 'SURPRISE_BILL',
          violationExplanation: 'Clear violation of the federal No Surprises Act prohibiting balance billing for emergency care at in-network facility.',
          statutoryBasis: '42 U.S.C. § 300gg-111; 45 CFR § 149.410',
        },
      ],
    },
    financialSummary: {
      statementDate: 'September 20, 2026',
      totalBilled: 5220.0,
      totalDue: 3420.0,
      currency: 'USD',
    },
    statutoryDisclosures: {
      hasFdcpaMiniMiranda: false,
      hasValidationPeriodNotice: false,
      hasNoSurprisesNotice: false,
      hasGoodFaithEstimateNotice: false,
      hasOutOfNetworkMarkers: true,
      hasArbitrationClause: false,
      missingMandatoryDisclosures: [
        'Missing mandatory No Surprises Act balance billing protections disclosure under 42 U.S.C. § 300gg-111.',
      ],
    },
    rawText: defaultSample.rawText,
    redactedText: initialRedaction.redactedText,
    auditFlagsCount: 3,
    totalFlaggedAmount: 4330.0,
  });

  // Disputed item selection IDs
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([
    'charge-1',
    'charge-2',
    'charge-4',
  ]);

  // Clause Toggles
  const [includeCeasePhone, setIncludeCeasePhone] = useState(true);
  const [includeAccountingLedger, setIncludeAccountingLedger] = useState(true);
  const [includeRegulatoryEscalation, setIncludeRegulatoryEscalation] = useState(true);
  const [includeDebtValidationNotice, setIncludeDebtValidationNotice] = useState(true);

  // Active highlighted line item ID (for bidirectional synchronization)
  const [highlightedChargeId, setHighlightedChargeId] = useState<string | null>(null);

  // Live Editable Legal Draft State
  const [customLetterDraft, setCustomLetterDraft] = useState<string>('');
  const [isDraftManuallyEdited, setIsDraftManuallyEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Find relevant statute rule based on detected document category
  const relevantStatute = useMemo(() => {
    const category = parsedDoc.detectedCategory;
    if (category === 'DEBT_COLLECTION') {
      return STATUTORY_RULES.find((r) => r.id === 'FDCPA_1692G') || STATUTORY_RULES[0];
    } else if (category === 'CREDIT_REPORT_ERROR') {
      return STATUTORY_RULES.find((r) => r.id === 'FCRA_1681I') || STATUTORY_RULES[1];
    } else if (category === 'SUBSCRIPTION_CANCEL') {
      return STATUTORY_RULES.find((r) => r.id === 'FTC_CLICK_TO_CANCEL') || STATUTORY_RULES[3];
    }
    // Default to Medical Billing / No Surprises Act
    return STATUTORY_RULES.find((r) => r.id === 'NO_SURPRISES_ACT') || STATUTORY_RULES[2];
  }, [parsedDoc.detectedCategory]);

  // Compute live auto-generated dispute letter draft
  const generatedDraft = useMemo(() => {
    const creditorName = parsedDoc.senderOrCreditor.name || 'Claims & Patient Financial Services';
    const creditorAddress = parsedDoc.senderOrCreditor.address || 'Corporate Compliance Office';
    const accountRef = isPIIRedacted
      ? parsedDoc.senderOrCreditor.accountOrReferenceNumber
        ? `[REDACTED-ACCT-***${parsedDoc.senderOrCreditor.accountOrReferenceNumber.slice(-4)}]`
        : '[REDACTED-ACCOUNT-REF]'
      : parsedDoc.senderOrCreditor.accountOrReferenceNumber || '847291048';

    const charges = parsedDoc.debtOrBillDetails.itemizedCharges || [];
    const activeDisputedCharges = charges.filter((c) => (c.id ? selectedChargeIds.includes(c.id) : c.isDisputed));

    const totalDisputedAmount = activeDisputedCharges.reduce(
      (sum, item) => sum + (item.amount || item.billedAmount || 0),
      0
    );

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const statutorySlaDays = relevantStatute?.statutoryResponseDays || 30;

    let itemizedViolationsBlock = '';
    if (activeDisputedCharges.length > 0) {
      itemizedViolationsBlock =
        '### Itemized Discrepancies & Statutory Violations:\n' +
        activeDisputedCharges
          .map((item, idx) => {
            const codePrefix = item.code ? `[${item.code}] ` : '';
            const amountStr = `$${(item.amount || item.billedAmount || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
            })}`;
            const explanation =
              item.violationExplanation || item.flagReason || 'Unverified billing charge requiring formal substantiation.';
            const basis = item.statutoryBasis || item.statuteRef ? ` (Statutory Basis: ${item.statutoryBasis || item.statuteRef})` : '';
            return `${idx + 1}. **${codePrefix}${item.description}** (${amountStr})\n   - *Dispute Ground:* ${explanation}${basis}`;
          })
          .join('\n\n') +
        '\n\n';
    }

    const recipientDepartment = parsedDoc.senderOrCreditor.department || 'Billing & Legal Compliance Department';

    return `DATE: ${currentDate}
SENT VIA: Certified Mail with Return Receipt Requested / Formal Regulatory Compliance Portal

FROM:
Consumer Advocate on behalf of Account Holder
123 Consumer Protection Way
Austin, TX 78701

TO:
${creditorName}
${recipientDepartment}
${creditorAddress}

RE: FORMAL STATUTORY NOTICE OF DISPUTE & DEMAND FOR CORRECTION
Account / Reference ID: ${accountRef}
Total Disputed Amount: $${totalDisputedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
Applicable Governing Law: ${relevantStatute.code} (${relevantStatute.name})

Dear Compliance Officers and Claims Representatives,

Please take formal notice that the consumer disputes in whole the claimed balance, assessments, and derogatory billing line items associated with Account/Reference Number ${accountRef}.

### Statement of Dispute:
A thorough line-by-line audit of your statement dated ${parsedDoc.debtOrBillDetails.statementDate || 'recently'} reveals improper billing practices, unverified fees, and statutory deficiencies under federal and state consumer protection standards.

${itemizedViolationsBlock}### Statutory Authority & Mandatory Protections:
${relevantStatute.mandatoryLanguageSnippet}

${
  includeAccountingLedger
    ? `### Mandatory Demand for Itemized Accounting Records:
Pursuant to federal billing disclosure standards and statutory auditing rules, you are hereby requested to furnish a comprehensive, line-by-line itemized ledger displaying the CMS relative value units (RVU), in-network contracted rates, procedural coding documentation, and full proof of lawful assignment.`
    : ''
}

${
  includeCeasePhone
    ? `### Binding Communication Directive:
Pursuant to statutory consumer protection principles, all future communications regarding this matter must be conducted strictly in writing. Immediately cease and desist all telephone contact, automated dialing, and text messaging to personal and workplace telephone numbers.`
    : ''
}

${
  includeDebtValidationNotice && parsedDoc.detectedCategory === 'DEBT_COLLECTION'
    ? `### FDCPA Debt Validation Directive (15 U.S.C. § 1692g):
Because your notice lacked proper statutory disclosures, this letter serves as a timely dispute within the statutory window. You must immediately halt all collection attempts until written verification signed by the original creditor is provided.`
    : ''
}

### Mandatory Corrective Actions Required within ${statutorySlaDays} Calendar Days:
1. Immediately retract the flagged unbundled, upcoded, or out-of-network balance bill charges totaling $${totalDisputedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}.
2. Provide a certified zero-balance receipt or an amended statement conforming strictly to lawful cost-sharing.
3. Confirm in writing that this account is placed on formal administrative dispute hold and has not been referred to external credit bureaus or collection agencies.

${
  includeRegulatoryEscalation
    ? `Failure to provide written compliance within ${statutorySlaDays} calendar days will result in immediate formal complaints lodged with the Consumer Financial Protection Bureau (CFPB), the Centers for Medicare & Medicaid Services (CMS No Surprises Help Desk), and the Office of the Attorney General.`
    : ''
}

Sincerely,

__________________________________________________
Authorized Consumer Representative & Advocate
`;
  }, [
    parsedDoc,
    isPIIRedacted,
    selectedChargeIds,
    relevantStatute,
    includeCeasePhone,
    includeAccountingLedger,
    includeRegulatoryEscalation,
    includeDebtValidationNotice,
  ]);

  // Keep live textarea synchronized unless user has customized it
  useEffect(() => {
    if (!isDraftManuallyEdited) {
      setCustomLetterDraft(generatedDraft);
    }
  }, [generatedDraft, isDraftManuallyEdited]);

  // Handle document parsed from DocumentDropzone
  const handleDocumentParsed = useCallback((extracted: ParsedDocumentData, rawText: string) => {
    setParsedDoc(extracted);
    setRawSourceText(rawText);

    // Auto-select all flagged charges
    const charges = extracted.debtOrBillDetails.itemizedCharges || [];
    const flaggedIds = charges.filter((c) => c.isFlagged || c.isDisputed).map((c) => c.id || '');
    setSelectedChargeIds(flaggedIds.length > 0 ? (flaggedIds as string[]) : charges.map((c) => c.id || ''));

    setIsDraftManuallyEdited(false);
    setActiveLeftView('itemized');
  }, []);

  const handleToggleCharge = (chargeId: string) => {
    setSelectedChargeIds((prev) =>
      prev.includes(chargeId) ? prev.filter((id) => id !== chargeId) : [...prev, chargeId]
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customLetterDraft || generatedDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportPDF = () => {
    setPdfGenerating(true);
    // Create clean printable view and invoke window.print()
    setTimeout(() => {
      setPdfGenerating(false);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Legal Demand Letter - ${parsedDoc.senderOrCreditor.accountOrReferenceNumber || 'Dispute'}</title>
              <style>
                body {
                  font-family: 'Times New Roman', serif;
                  font-size: 12pt;
                  line-height: 1.6;
                  color: #000;
                  margin: 1.5in 1in 1in 1in;
                  background: #fff;
                }
                pre {
                  white-space: pre-wrap;
                  font-family: 'Times New Roman', serif;
                  font-size: 11pt;
                }
                @page {
                  margin: 1in;
                }
              </style>
            </head>
            <body>
              <pre>${customLetterDraft || generatedDraft}</pre>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }, 600);
  };

  const currentCharges = parsedDoc.debtOrBillDetails.itemizedCharges || [];
  const displayedSourceText = isPIIRedacted ? parsedDoc.redactedText || initialRedaction.redactedText : rawSourceText;

  return (
    <div className="space-y-6">
      {/* Studio Header & Global Actions */}
      <header className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Split-Screen Dispute Studio</h1>
              <span className="bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {parsedDoc.detectedCategory.replace(/_/g, ' ')}
              </span>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-mono px-2 py-0.5 rounded-full">
                Ref #{parsedDoc.senderOrCreditor.accountOrReferenceNumber || '847291048'}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Annotated source document (Left) synchronized with live statutory demand letter (Right). Drop any bill or notice to audit in real time.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Dropzone Toggle Button */}
            <button
              type="button"
              onClick={() => setShowDropzone(!showDropzone)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              aria-expanded={showDropzone}
              aria-label={showDropzone ? 'Collapse upload dropzone' : 'Expand upload dropzone'}
            >
              <FileCheck className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>{showDropzone ? 'Hide Dropzone' : 'Upload / Switch Document'}</span>
              {showDropzone ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* PII Masking Global Button */}
            <button
              type="button"
              role="switch"
              aria-checked={isPIIRedacted}
              aria-label="Toggle client-side zero-retention PII masking"
              onClick={() => setIsPIIRedacted(!isPIIRedacted)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                isPIIRedacted
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              {isPIIRedacted ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              )}
              <span>{isPIIRedacted ? 'PII Masking ON (Safe)' : 'PII Masking OFF'}</span>
            </button>

            {/* Copy Draft Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              aria-label="Copy legal demand letter draft to clipboard"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              )}
              <span>{copied ? 'Copied Draft' : 'Copy Letter'}</span>
            </button>

            {/* 1-Click PDF Export Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={pdfGenerating}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              aria-label="Export certified court-ready PDF letter"
            >
              {pdfGenerating ? (
                <Clock className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{pdfGenerating ? 'Generating...' : 'Export Certified PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Collapsible Document Dropzone Component Integration */}
      {showDropzone && (
        <div className="transition-all duration-300">
          <DocumentDropzone onDocumentParsed={handleDocumentParsed} />
        </div>
      )}

      {/* Split-Screen Workspace (50 / 50 Desktop Grid) */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[720px]">
        {/* ================= LEFT PANE: Ingested Document & Itemized Audit ================= */}
        <section
          aria-label="Annotated Source Document and Line-Item Audit"
          className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden"
        >
          {/* Left Pane Top Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-700" aria-hidden="true" />
              <span className="text-xs font-bold text-slate-900 truncate max-w-[220px]">
                {parsedDoc.fileName || 'Ingested Document'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {(parsedDoc.auditFlagsCount ?? 0) > 0 ? (
                <span className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" aria-hidden="true" />
                  {parsedDoc.auditFlagsCount} Violations Flagged
                </span>
              ) : (
                <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  Zero Violations
                </span>
              )}

              {/* View Switcher: Itemized Audit vs Raw Stream */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveLeftView('itemized')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    activeLeftView === 'itemized'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-pressed={activeLeftView === 'itemized'}
                >
                  Line-Item Audit
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLeftView('raw')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    activeLeftView === 'raw'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-pressed={activeLeftView === 'raw'}
                >
                  Raw Redacted Stream
                </button>
              </div>
            </div>
          </div>

          {/* Left Pane Content Body */}
          <div className="p-4 flex-1 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[750px]">
            {activeLeftView === 'itemized' ? (
              <div className="space-y-4">
                {/* Document Metadata Bar */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold block">Creditor / Sender</span>
                    <span className="font-semibold text-slate-900 truncate block">
                      {parsedDoc.senderOrCreditor.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold block">Total Billed</span>
                    <span className="font-semibold text-slate-900 block">
                      ${(parsedDoc.debtOrBillDetails.totalBilled || parsedDoc.financialSummary?.totalBilled || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold block">Patient / Debtor Due</span>
                    <span className="font-bold text-rose-700 block">
                      ${(parsedDoc.debtOrBillDetails.totalDue || parsedDoc.financialSummary?.totalDue || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-semibold block">Audit SLA</span>
                    <span className="font-semibold text-slate-800 block">
                      {relevantStatute.statutoryResponseDays} Calendar Days
                    </span>
                  </div>
                </div>

                {/* Parsed Line Items List with Synchronization Checkboxes */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Extracted Line Items ({currentCharges.length}):
                    </h2>
                    <span className="text-[11px] text-slate-500">
                      Check items to include in formal legal demand letter
                    </span>
                  </div>

                  {currentCharges.map((item, index) => {
                    const isSelected = item.id ? selectedChargeIds.includes(item.id) : item.isDisputed;
                    const isFlagged = item.isFlagged || item.violationType;
                    const isHovered = highlightedChargeId === item.id;

                    return (
                      <div
                        key={item.id || `charge-${index}`}
                        onMouseEnter={() => setHighlightedChargeId(item.id || null)}
                        onMouseLeave={() => setHighlightedChargeId(null)}
                        className={`p-3 rounded-lg border transition-all ${
                          isHovered
                            ? 'border-slate-800 bg-slate-50 shadow-sm'
                            : isFlagged
                            ? 'border-rose-200 bg-rose-50/40'
                            : 'border-slate-200 bg-white hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start space-x-2.5">
                            <input
                              type="checkbox"
                              id={`charge-${item.id || index}`}
                              checked={isSelected}
                              onChange={() => item.id && handleToggleCharge(item.id)}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                              aria-label={`Include ${item.description} in dispute letter`}
                            />
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {item.code && (
                                  <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold">
                                    {item.code}
                                  </span>
                                )}
                                <label
                                  htmlFor={`charge-${item.id || index}`}
                                  className="text-xs font-semibold text-slate-900 cursor-pointer"
                                >
                                  {item.description}
                                </label>
                              </div>

                              {/* Flag Reason & Statutory Basis */}
                              {(item.violationExplanation || item.flagReason) && (
                                <p className="text-[11px] text-rose-700 mt-1 flex items-start gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                  <span>{item.violationExplanation || item.flagReason}</span>
                                </p>
                              )}

                              {(item.statutoryBasis || item.statuteRef) && (
                                <span className="inline-block mt-1 text-[10px] font-mono bg-white border border-rose-200 text-rose-800 px-1.5 py-0.5 rounded">
                                  {item.statutoryBasis || item.statuteRef}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-bold text-slate-900 block">
                              ${(item.amount || item.billedAmount || 0).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            {isFlagged ? (
                              <span className="text-[10px] text-rose-600 font-semibold uppercase">Disputed</span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">Standard</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Statutory Citations & Disclosure Violations Legend */}
                {parsedDoc.statutoryDisclosures.missingMandatoryDisclosures.length > 0 && (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-amber-900 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                      <span>Statutory Disclosure Deficiencies Detected</span>
                    </div>
                    <ul className="text-xs text-amber-800 space-y-1 list-disc pl-4">
                      {parsedDoc.statutoryDisclosures.missingMandatoryDisclosures.map((disc, idx) => (
                        <li key={idx}>{disc}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              /* Raw Source Text Stream with Zero-PII Redaction */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Layers className="w-3.5 h-3.5" aria-hidden="true" /> Source OCR Stream:
                  </span>
                  <span className="text-[11px] font-mono">
                    {isPIIRedacted ? 'Masked In-Memory' : 'Unmasked Raw'}
                  </span>
                </div>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[580px] selection:bg-rose-500 selection:text-white">
                  {displayedSourceText}
                </div>
              </div>
            )}

            {/* Statutory Legal Protection Footer Badge */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-slate-700" aria-hidden="true" />
                <span>Statute: {relevantStatute.name}</span>
              </span>
              <span className="font-mono text-[11px] text-slate-600">{relevantStatute.code}</span>
            </div>
          </div>
        </section>

        {/* ================= RIGHT PANE: Live-Editable Legal Demand Letter ================= */}
        <section
          aria-label="Formal Legal Demand Letter Live Editor"
          className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden"
        >
          {/* Right Pane Top Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-slate-800" aria-hidden="true" />
              <h2 className="text-xs font-bold text-slate-900">Formal Legal Demand Letter (Live Editor)</h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" aria-hidden="true" />
                Statutory SLA: {relevantStatute.statutoryResponseDays} Days
              </span>
              {isDraftManuallyEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDraftManuallyEdited(false);
                    setCustomLetterDraft(generatedDraft);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 underline underline-offset-2"
                  aria-label="Reset draft to auto-synchronized state"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Auto-Draft
                </button>
              )}
            </div>
          </div>

          {/* Clause Toggles Bar */}
          <div className="bg-slate-50/60 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-700">
            <span className="font-bold text-slate-600">Clause Directives:</span>

            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCeasePhone}
                onChange={(e) => {
                  setIncludeCeasePhone(e.target.checked);
                  setIsDraftManuallyEdited(false);
                }}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Cease Phone Calls (Writing-Only)</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAccountingLedger}
                onChange={(e) => {
                  setIncludeAccountingLedger(e.target.checked);
                  setIsDraftManuallyEdited(false);
                }}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Demand Itemized Ledger & RVUs</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRegulatoryEscalation}
                onChange={(e) => {
                  setIncludeRegulatoryEscalation(e.target.checked);
                  setIsDraftManuallyEdited(false);
                }}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>CFPB & CMS Regulatory Escalation</span>
            </label>
          </div>

          {/* Live Editable Textarea Body */}
          <div className="p-4 flex-1 flex flex-col space-y-3">
            <div className="relative flex-1">
              <textarea
                value={customLetterDraft || generatedDraft}
                onChange={(e) => {
                  setCustomLetterDraft(e.target.value);
                  setIsDraftManuallyEdited(true);
                }}
                aria-label="Live editable legal demand draft"
                className="w-full h-full min-h-[520px] p-4 text-xs font-mono text-slate-900 bg-slate-50/40 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed resize-none transition-all"
                placeholder="Dispute letter draft content..."
              />
            </div>

            {/* Letter Bottom Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700">
                  {selectedChargeIds.length} of {currentCharges.length} Discrepancies Selected
                </span>
                <span>•</span>
                <span>{(customLetterDraft || generatedDraft).length} characters</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="text-xs font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-1 underline underline-offset-2"
                >
                  <Printer className="w-3.5 h-3.5" aria-hidden="true" /> Print / Save as PDF
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
