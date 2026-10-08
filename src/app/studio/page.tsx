'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Sliders,
  Database,
  Calendar,
  Building,
} from 'lucide-react';
import DocumentDropzone, { SAMPLE_DOCUMENTS } from '@/components/DocumentDropzone';
import StatutoryClauseToggles, {
  StatutoryDirectives,
  DisputeDomainId,
  STATUTORY_DOMAINS,
} from '@/components/StatutoryClauseToggles';
import { redactSensitivePII } from '@/lib/ocr/redactor';
import {
  ParsedDocumentData,
  ItemizedCharge,
  DisputeCategory,
} from '@/lib/ocr/schemas';
import { compileDisputeLetter } from '@/lib/disputes/engine';
import type { CompiledDisputeLetter } from '@/lib/disputes/types';

// Helper to convert category to domain ID
function categoryToDomainId(category: DisputeCategory): DisputeDomainId {
  switch (category) {
    case 'DEBT_COLLECTION':
      return 'FDCPA_1692G';
    case 'CREDIT_REPORT_ERROR':
      return 'FCRA_1681I';
    case 'SUBSCRIPTION_CANCEL':
      return 'FTC_CLICK_TO_CANCEL';
    case 'MEDICAL_BILLING':
    default:
      return 'NO_SURPRISES_ACT';
  }
}

// Helper to convert domain ID to category
function domainIdToCategory(domainId: DisputeDomainId): DisputeCategory {
  switch (domainId) {
    case 'FDCPA_1692G':
      return 'DEBT_COLLECTION';
    case 'FCRA_1681I':
      return 'CREDIT_REPORT_ERROR';
    case 'FTC_CLICK_TO_CANCEL':
      return 'SUBSCRIPTION_CANCEL';
    case 'NO_SURPRISES_ACT':
    default:
      return 'MEDICAL_BILLING';
  }
}

export default function DisputeStudioPage() {
  // Initial demo document data parsed from default Memorial Hospital bill
  const defaultSample = SAMPLE_DOCUMENTS[0];
  const initialRedaction = redactSensitivePII(defaultSample.rawText);

  // Panels visibility state
  const [showDropzone, setShowDropzone] = useState(false);
  const [showDirectivesPanel, setShowDirectivesPanel] = useState(true);

  // Studio Ingestion & Document State
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
          violationExplanation:
            'Inappropriate Level 5 code assignment without documentation of high-complexity medical decision-making.',
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
          violationExplanation:
            'Impermissible unbundling of routine surgical tray supplies into separate billing line items.',
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
          violationExplanation:
            'Clear violation of the federal No Surprises Act prohibiting balance billing for emergency care at in-network facility.',
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

  // Active Statutory Dispute Engine & Directives State
  const [selectedDomain, setSelectedDomain] = useState<DisputeDomainId>('NO_SURPRISES_ACT');
  const [directives, setDirectives] = useState<StatutoryDirectives>({
    ceasePhoneCalls: true,
    demandItemizedLedger: true,
    requestChainOfTitle: false,
    includeMethodOfVerification: false,
    includeRegulatoryEscalation: true,
  });

  // Disputed item selection IDs
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([
    'charge-1',
    'charge-2',
    'charge-4',
  ]);

  // Active highlighted line item ID (for bidirectional synchronization)
  const [highlightedChargeId, setHighlightedChargeId] = useState<string | null>(null);

  // Live Editable Legal Draft State
  const [customLetterDraft, setCustomLetterDraft] = useState<string>('');
  const [isDraftManuallyEdited, setIsDraftManuallyEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Database Persistence State
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [dbSaveNotice, setDbSaveNotice] = useState<string | null>(null);

  // Compile formal statutory dispute letter in real time
  const compiledLetter: CompiledDisputeLetter = useMemo(() => {
    return compileDisputeLetter({
      parsedDoc,
      categoryOverride: domainIdToCategory(selectedDomain),
      directives: {
        ceasePhoneCalls: directives.ceasePhoneCalls,
        demandItemizedLedger: directives.demandItemizedLedger,
        requestChainOfTitle: directives.requestChainOfTitle,
        includeMethodOfVerification: directives.includeMethodOfVerification,
        includeRegulatoryEscalation: directives.includeRegulatoryEscalation,
        citeStatutoryDamages: true,
        selectedChargeIds,
      },
    });
  }, [parsedDoc, selectedDomain, directives, selectedChargeIds]);

  // Sync draft state with compiled letter unless user customized it
  useEffect(() => {
    if (!isDraftManuallyEdited) {
      setCustomLetterDraft(compiledLetter.fullLetterMarkdown);
    }
  }, [compiledLetter.fullLetterMarkdown, isDraftManuallyEdited]);

  // Asynchronous background persistence to SQLite via /api/disputes/generate
  const dbSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (dbSyncTimerRef.current) {
      clearTimeout(dbSyncTimerRef.current);
    }

    dbSyncTimerRef.current = setTimeout(async () => {
      try {
        setIsSavingToDb(true);
        const res = await fetch('/api/disputes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: savedCaseId || undefined,
            parsedDoc,
            categoryOverride: domainIdToCategory(selectedDomain),
            directives: {
              ceasePhoneCalls: directives.ceasePhoneCalls,
              demandItemizedLedger: directives.demandItemizedLedger,
              requestChainOfTitle: directives.requestChainOfTitle,
              includeMethodOfVerification: directives.includeMethodOfVerification,
              includeRegulatoryEscalation: directives.includeRegulatoryEscalation,
              citeStatutoryDamages: true,
              selectedChargeIds,
            },
            saveToDatabase: true,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.caseId) {
            setSavedCaseId(data.caseId);
          }
          setDbSaveNotice('Synced to SQLite');
          setTimeout(() => setDbSaveNotice(null), 3000);
        }
      } catch (err) {
        console.warn('Background SQLite autosave skipped:', err);
      } finally {
        setIsSavingToDb(false);
      }
    }, 1200);

    return () => {
      if (dbSyncTimerRef.current) {
        clearTimeout(dbSyncTimerRef.current);
      }
    };
  }, [parsedDoc, selectedDomain, directives, selectedChargeIds, savedCaseId]);

  // Handle document parsed from DocumentDropzone
  const handleDocumentParsed = useCallback((extracted: ParsedDocumentData, rawText: string) => {
    setParsedDoc(extracted);
    setRawSourceText(rawText);

    // Auto-switch domain to match ingested document category
    const autoDomain = categoryToDomainId(extracted.detectedCategory);
    setSelectedDomain(autoDomain);

    // Apply domain-specific directive presets
    const domainMeta = STATUTORY_DOMAINS.find((d) => d.id === autoDomain);
    if (domainMeta) {
      setDirectives(domainMeta.defaultDirectives);
    }

    // Auto-select all flagged charges
    const charges = extracted.debtOrBillDetails.itemizedCharges || [];
    const flaggedIds = charges.filter((c) => c.isFlagged || c.isDisputed).map((c) => c.id || '');
    setSelectedChargeIds(flaggedIds.length > 0 ? (flaggedIds as string[]) : charges.map((c) => c.id || ''));

    setIsDraftManuallyEdited(false);
    setActiveLeftView('itemized');
    setSavedCaseId(null);
  }, []);

  const handleDomainChange = (domain: DisputeDomainId) => {
    setSelectedDomain(domain);
    setIsDraftManuallyEdited(false);
  };

  const handleDirectiveChange = (key: keyof StatutoryDirectives, value: boolean) => {
    setDirectives((prev) => ({ ...prev, [key]: value }));
    setIsDraftManuallyEdited(false);
  };

  const handleApplyDirectivesPreset = (newDirectives: StatutoryDirectives) => {
    setDirectives(newDirectives);
    setIsDraftManuallyEdited(false);
  };

  const handleToggleCharge = (chargeId: string) => {
    setSelectedChargeIds((prev) =>
      prev.includes(chargeId) ? prev.filter((id) => id !== chargeId) : [...prev, chargeId]
    );
    setIsDraftManuallyEdited(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customLetterDraft || compiledLetter.fullLetterMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportPDF = () => {
    setPdfGenerating(true);
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
              <pre>${customLetterDraft || compiledLetter.fullLetterMarkdown}</pre>
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
  const activeDisputedCharges = currentCharges.filter((c) =>
    c.id ? selectedChargeIds.includes(c.id) : c.isDisputed
  );
  const activeDisputedChargesTotal = activeDisputedCharges.reduce(
    (sum, item) => sum + (item.amount || item.billedAmount || 0),
    0
  );

  const displayedSourceText = isPIIRedacted
    ? parsedDoc.redactedText || initialRedaction.redactedText
    : rawSourceText;

  return (
    <div className="space-y-6">
      {/* Studio Header & Global Actions */}
      <header className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Split-Screen Dispute Studio
              </h1>
              <span className="bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {compiledLetter.disputeDomain.replace(/_/g, ' ')}
              </span>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-mono px-2 py-0.5 rounded-full">
                Ref #{parsedDoc.senderOrCreditor.accountOrReferenceNumber || '847291048'}
              </span>
              {dbSaveNotice && (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Database className="w-3 h-3" /> {dbSaveNotice}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Annotated source document (Left) synchronized with live statutory demand letter (Right).
              Switch engines or toggle directives to adjust statutory demands in real time.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Directives & Engine Panel Toggle */}
            <button
              type="button"
              onClick={() => setShowDirectivesPanel(!showDirectivesPanel)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                showDirectivesPanel
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              aria-expanded={showDirectivesPanel}
              aria-label="Toggle statutory clauses control panel"
            >
              <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showDirectivesPanel ? 'Hide Engine Controls' : 'Statutory Directives & Engine'}</span>
              {showDirectivesPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Dropzone Toggle Button */}
            <button
              type="button"
              onClick={() => setShowDropzone(!showDropzone)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              aria-expanded={showDropzone}
              aria-label={showDropzone ? 'Collapse upload dropzone' : 'Expand upload dropzone'}
            >
              <FileCheck className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>{showDropzone ? 'Hide Upload' : 'Upload / Switch Doc'}</span>
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
              <span>{isPIIRedacted ? 'PII Masking ON' : 'PII Masking OFF'}</span>
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
              <span>{copied ? 'Copied' : 'Copy'}</span>
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

      {/* Collapsible Statutory Clause Toggles & Engine Switcher */}
      {showDirectivesPanel && (
        <div className="transition-all duration-300">
          <StatutoryClauseToggles
            selectedDomain={selectedDomain}
            onDomainChange={handleDomainChange}
            directives={directives}
            onDirectiveChange={handleDirectiveChange}
            onApplyPreset={handleApplyDirectivesPreset}
            disputedChargesCount={selectedChargeIds.length}
            totalDisputedAmount={activeDisputedChargesTotal}
          />
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
                  Raw Stream
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
                    <span className="text-[10px] uppercase text-slate-500 font-semibold block">Statutory Window</span>
                    <span className="font-semibold text-slate-800 block">
                      {compiledLetter.statutorySlaDays} {compiledLetter.governingStatute.timeUnit === 'business_days' ? 'Bus. Days' : 'Cal. Days'}
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
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
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

            {/* Governing Law Footer Badge */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-slate-700" aria-hidden="true" />
                <span className="font-semibold text-slate-800">{compiledLetter.governingStatute.name}</span>
              </span>
              <span className="font-mono text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                {compiledLetter.governingStatute.code}
              </span>
            </div>
          </div>
        </section>

        {/* ================= RIGHT PANE: Live-Editable Legal Demand Letter ================= */}
        <section
          aria-label="Formal Legal Demand Letter Live Editor"
          className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden"
        >
          {/* Right Pane Top Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-slate-800" aria-hidden="true" />
              <h2 className="text-xs font-bold text-slate-900">
                Formal Legal Demand Letter (Live Editor)
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono bg-white border border-amber-200 px-2 py-0.5 rounded text-amber-900 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" aria-hidden="true" />
                Deadline: {compiledLetter.statutoryDeadlineDate}
              </span>
              {isDraftManuallyEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDraftManuallyEdited(false);
                    setCustomLetterDraft(compiledLetter.fullLetterMarkdown);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 underline underline-offset-2"
                  aria-label="Reset draft to auto-synchronized state"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Auto-Draft
                </button>
              )}
            </div>
          </div>

          {/* Legal Citations & Statutory Grounds Bar */}
          <div className="bg-slate-50/70 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-700 mr-1 text-[11px] uppercase tracking-wide">
              Codified Citations:
            </span>
            {compiledLetter.legalCitations.map((citation, idx) => (
              <span
                key={idx}
                className="bg-white border border-slate-200 text-slate-800 text-[10px] font-mono px-2 py-0.5 rounded shadow-2xs font-medium"
                title={citation}
              >
                {citation.split('(')[0].trim()}
              </span>
            ))}
          </div>

          {/* Active Directives Status Strip */}
          <div className="bg-white border-b border-slate-100 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700">Active Directives:</span>
              {directives.ceasePhoneCalls && (
                <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-medium">
                  Writing-Only
                </span>
              )}
              {directives.demandItemizedLedger && (
                <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-medium">
                  Itemized Ledger
                </span>
              )}
              {directives.requestChainOfTitle && (
                <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-medium">
                  Chain-of-Title
                </span>
              )}
              {directives.includeMethodOfVerification && (
                <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-medium">
                  MOV Demand
                </span>
              )}
              {directives.includeRegulatoryEscalation && (
                <span className="bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded font-medium">
                  Escalation Warning
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <Building className="w-3 h-3 text-slate-400" />
              <span>Escalation: {compiledLetter.escalationAgencies[0]}</span>
            </div>
          </div>

          {/* Live Editable Textarea Body */}
          <div className="p-4 flex-1 flex flex-col space-y-3">
            <div className="relative flex-1">
              <textarea
                value={customLetterDraft || compiledLetter.fullLetterMarkdown}
                onChange={(e) => {
                  setCustomLetterDraft(e.target.value);
                  setIsDraftManuallyEdited(true);
                }}
                aria-label="Live editable legal demand draft"
                className="w-full h-full min-h-[500px] p-4 text-xs font-mono text-slate-900 bg-slate-50/40 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed resize-none transition-all"
                placeholder="Dispute letter draft content..."
              />
            </div>

            {/* Letter Bottom Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700">
                  {selectedChargeIds.length} of {currentCharges.length} Charges Disputed ($
                  {activeDisputedChargesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </span>
                <span>•</span>
                <span>{(customLetterDraft || compiledLetter.fullLetterMarkdown).length} characters</span>
                {isSavingToDb && <span className="text-slate-400 italic">Syncing DB...</span>}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="text-xs font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-1 underline underline-offset-2"
                >
                  <Printer className="w-3.5 h-3.5" aria-hidden="true" /> Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
