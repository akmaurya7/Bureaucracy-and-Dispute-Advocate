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
  Eye,
  Edit3,
  Barcode,
  Gavel,
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

  // Right pane view mode: 'preview' (Court-Ready Document with highlights) vs 'editor' (Raw Markdown)
  const [rightViewMode, setRightViewMode] = useState<'preview' | 'editor'>('preview');

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

  // Synchronized Highlighting State across left and right panes
  const [highlightedChargeId, setHighlightedChargeId] = useState<string | null>(null);

  // Live Editable Legal Draft State
  const [customLetterDraft, setCustomLetterDraft] = useState<string>('');
  const [isDraftManuallyEdited, setIsDraftManuallyEdited] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);

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

  // Sync draft state with compiled letter unless user manually customized it
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

  // 1-Click "Download Court-Ready PDF" trigger via POST /api/disputes/pdf
  const handleDownloadCourtReadyPdf = async () => {
    try {
      setPdfDownloading(true);
      const res = await fetch('/api/disputes/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: savedCaseId || undefined,
          letter: compiledLetter,
          customDraftMarkdown: isDraftManuallyEdited ? customLetterDraft : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`PDF generation endpoint returned status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeRecipient = (compiledLetter.recipientName || 'Dispute_Demand').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Court_Ready_Dispute_${safeRecipient}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('PDF endpoint download failed, triggering native print dialog fallback:', err);
      window.print();
    } finally {
      setPdfDownloading(false);
    }
  };

  // "Copy Certified Text" with clean plain-text formatting and instant visual indicator
  const handleCopyCertifiedText = async () => {
    try {
      const rawText = customLetterDraft || compiledLetter.fullLetterMarkdown;
      // Strip markdown markers while preserving formal structure and indentation
      const cleanPlainText = rawText
        .replace(/^###\s*(.*)$/gm, '\n$1\n' + '—'.repeat(40))
        .replace(/^##\s*(.*)$/gm, '\n\n$1\n' + '='.repeat(50))
        .replace(/^#\s*(.*)$/gm, '\n\n$1\n' + '='.repeat(60))
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trim();

      await navigator.clipboard.writeText(cleanPlainText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2200);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Native Browser Print optimized for 0.75-inch legal margins
  const handleNativePrint = () => {
    window.print();
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
      <header className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm no-print">
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
              Hover over items to cross-inspect evidence and statutory directives.
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

            {/* Copy Certified Text Action Button */}
            <button
              type="button"
              onClick={handleCopyCertifiedText}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              aria-label="Copy clean certified plain text to clipboard"
            >
              {copiedText ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              )}
              <span>{copiedText ? 'Copied Certified Text!' : 'Copy Certified Text'}</span>
            </button>

            {/* 1-Click Download Court-Ready PDF Button */}
            <button
              type="button"
              onClick={handleDownloadCourtReadyPdf}
              disabled={pdfDownloading}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              aria-label="Download court-ready Certified Mail PDF letter"
            >
              {pdfDownloading ? (
                <Clock className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{pdfDownloading ? 'Generating PDF...' : 'Download Court-Ready PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Collapsible Document Dropzone Component Integration */}
      {showDropzone && (
        <div className="transition-all duration-300 no-print">
          <DocumentDropzone onDocumentParsed={handleDocumentParsed} />
        </div>
      )}

      {/* Collapsible Statutory Clause Toggles & Engine Switcher */}
      {showDirectivesPanel && (
        <div className="transition-all duration-300 no-print">
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
          className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden no-print"
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

                {/* Parsed Line Items List with Bidirectional Synchronized Highlighting */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Extracted Line Items ({currentCharges.length}):
                    </h2>
                    <span className="text-[11px] text-slate-500">
                      Hover to highlight in demand letter • Check to dispute
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
                        className={`p-3 rounded-lg border transition-all duration-150 relative ${
                          isHovered
                            ? 'border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-400'
                            : isFlagged
                            ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50/70'
                            : 'border-slate-200 bg-white hover:bg-slate-50/80'
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
                                {isHovered && (
                                  <span className="bg-amber-200 text-amber-900 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider animate-pulse">
                                    Synchronized
                                  </span>
                                )}
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

        {/* ================= RIGHT PANE: Live Legal Demand Letter & Court Preview ================= */}
        <section
          aria-label="Formal Legal Demand Letter Live Editor"
          className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden"
        >
          {/* Right Pane Top Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2 no-print">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-slate-800" aria-hidden="true" />
              <h2 className="text-xs font-bold text-slate-900">
                Formal Legal Demand Letter
              </h2>

              {/* View Mode Switcher: Formatted Court Preview vs Raw Markdown Editor */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs ml-2">
                <button
                  type="button"
                  onClick={() => setRightViewMode('preview')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    rightViewMode === 'preview'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-pressed={rightViewMode === 'preview'}
                >
                  <Eye className="w-3 h-3" /> Court Preview
                </button>
                <button
                  type="button"
                  onClick={() => setRightViewMode('editor')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    rightViewMode === 'editor'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-pressed={rightViewMode === 'editor'}
                >
                  <Edit3 className="w-3 h-3" /> Raw Editor
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Statutory Deadline Chip */}
              <span className="text-xs font-mono bg-white border border-amber-200 px-2 py-0.5 rounded text-amber-900 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" aria-hidden="true" />
                Due: {compiledLetter.statutoryDeadlineDate}
              </span>

              {/* Right-Pane Header 1-Click PDF Button */}
              <button
                type="button"
                onClick={handleDownloadCourtReadyPdf}
                disabled={pdfDownloading}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 shadow-2xs"
                title="Download certified PDF with 0.75-inch margins"
              >
                {pdfDownloading ? (
                  <Clock className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                <span>Court PDF</span>
              </button>

              {isDraftManuallyEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDraftManuallyEdited(false);
                    setCustomLetterDraft(compiledLetter.fullLetterMarkdown);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 underline underline-offset-2 ml-1"
                  aria-label="Reset draft to auto-synchronized state"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Legal Citations & Statutory Grounds Bar */}
          <div className="bg-slate-50/70 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center gap-1.5 text-xs no-print">
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
          <div className="bg-white border-b border-slate-100 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 no-print">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-700">Enforced Directives:</span>
              {directives.ceasePhoneCalls && (
                <span className="bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded font-medium">
                  Writing-Only
                </span>
              )}
              {directives.demandItemizedLedger && (
                <span className="bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded font-medium">
                  Itemized Ledger
                </span>
              )}
              {directives.requestChainOfTitle && (
                <span className="bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded font-medium">
                  Chain-of-Title
                </span>
              )}
              {directives.includeMethodOfVerification && (
                <span className="bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded font-medium">
                  MOV Demand
                </span>
              )}
              {directives.includeRegulatoryEscalation && (
                <span className="bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded font-medium">
                  Escalation Warning
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <Building className="w-3 h-3 text-slate-400" />
              <span>Escalation: {compiledLetter.escalationAgencies[0]}</span>
            </div>
          </div>

          {/* Content Body: Dual Mode (Interactive Court Preview OR Raw Textarea Editor) */}
          <div className="p-4 flex-1 flex flex-col space-y-3 overflow-y-auto max-h-[750px]">
            {rightViewMode === 'preview' ? (
              /* ================= COURT PREVIEW (INTERACTIVE SYNCHRONIZED HIGHLIGHTING) ================= */
              <div className="space-y-4 font-serif text-slate-900 text-xs sm:text-sm leading-relaxed p-4 bg-slate-50/50 border border-slate-200 rounded-lg">
                {/* USPS Certified Mail Tracking Header Card */}
                <div className="bg-white border-2 border-slate-300 p-3.5 rounded-lg space-y-1.5 font-sans">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                    <span className="tracking-wider">USPS CERTIFIED MAIL™ • RETURN RECEIPT REQUESTED</span>
                    <span className="bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded">
                      FORMAL LEGAL SERVICE
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono pt-0.5">
                    <span className="font-bold text-slate-800">
                      ARTICLE NO: {compiledLetter.trackingNumber}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      SLA: {compiledLetter.statutorySlaDays}{' '}
                      {compiledLetter.governingStatute.timeUnit === 'business_days' ? 'Business' : 'Calendar'} Days
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 tracking-widest pt-0.5">
                    |||| | ||||| |||| || | |||| ||||| |||| || | |||| ||||| || ||||| ||
                  </div>
                </div>

                {/* Formal Caption Block */}
                <div className="space-y-2 border-b border-slate-200 pb-3 font-sans text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[10px]">Date of Dispatch:</span>
                    <span className="font-semibold text-slate-900">
                      {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="bg-white p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 font-bold block uppercase text-[10px]">From (Debtor / Consumer):</span>
                      <span className="font-semibold text-slate-900 block">{parsedDoc.consumerOrDebtor?.name || 'Consumer Account Holder'}</span>
                      <span className="text-slate-600 text-[11px] block">{parsedDoc.consumerOrDebtor?.address || '123 Consumer Protection Way, Austin, TX 78701'}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 font-bold block uppercase text-[10px]">To (Creditor / Collector / Billing):</span>
                      <span className="font-bold text-slate-900 block">{compiledLetter.recipientName}</span>
                      <span className="text-slate-600 text-[11px] block">{compiledLetter.recipientAddress}</span>
                    </div>
                  </div>

                  <div className="bg-slate-100 p-2.5 rounded border border-slate-200 mt-2 font-mono text-xs">
                    <span className="font-bold text-slate-900 block">{compiledLetter.subjectLine}</span>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-600">
                      <span>Total Disputed: <strong>${compiledLetter.totalDisputedAmount.toFixed(2)}</strong></span>
                      <span>•</span>
                      <span>Governing Law: <strong>{compiledLetter.governingStatute.code}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Formal Letter Introduction */}
                <p>
                  Dear Compliance Officers and Claims Representatives,
                </p>
                <p>
                  Please take formal notice that the consumer disputes in whole the claimed balance, billing assertions,
                  and derogatory fees associated with Reference Number{' '}
                  <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {parsedDoc.senderOrCreditor.accountOrReferenceNumber || '847291048'}
                  </strong>
                  . Pursuant to codified protections under {compiledLetter.governingStatute.code}, this notice establishes
                  our formal evidentiary objections and demands for statutory remediation.
                </p>

                {/* Synchronized Disputed Line-Item Paragraphs */}
                {activeDisputedCharges.length > 0 && (
                  <div className="space-y-2 border-y border-slate-200 py-3 my-3">
                    <h3 className="font-sans text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                      <span>Itemized Discrepancies & Statutory Violations:</span>
                      <span className="text-[10px] text-slate-500 lowercase font-normal">
                        (hovering links to left-pane evidence)
                      </span>
                    </h3>

                    <div className="space-y-2">
                      {activeDisputedCharges.map((charge, idx) => {
                        const isHovered = highlightedChargeId === charge.id;
                        return (
                          <div
                            key={charge.id || idx}
                            onMouseEnter={() => charge.id && setHighlightedChargeId(charge.id)}
                            onMouseLeave={() => setHighlightedChargeId(null)}
                            className={`p-2.5 rounded transition-all duration-150 cursor-pointer ${
                              isHovered
                                ? 'bg-amber-100/90 border-l-4 border-amber-600 shadow-sm ring-1 ring-amber-300 pl-3'
                                : 'bg-white border border-slate-200 hover:bg-slate-100/60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 font-sans text-xs">
                                    {idx + 1}. {charge.code ? `[${charge.code}] ` : ''}{charge.description}
                                  </span>
                                  {isHovered && (
                                    <span className="bg-amber-600 text-white text-[9px] font-sans font-bold px-1.5 py-0.2 rounded uppercase">
                                      Active Evidence Focus
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-700 italic">
                                  Violation: {charge.violationExplanation || charge.flagReason || 'Unverified billing charge requiring formal substantiation.'}
                                </p>
                                {(charge.statutoryBasis || charge.statuteRef) && (
                                  <span className="inline-block text-[10px] font-mono text-sky-800 bg-sky-50 border border-sky-200 px-1 py-0.2 rounded font-sans">
                                    Statutory Basis: {charge.statutoryBasis || charge.statuteRef}
                                  </span>
                                )}
                              </div>
                              <span className="font-sans font-bold text-slate-900 text-xs flex-shrink-0">
                                ${(charge.amount || charge.billedAmount || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mandatory Accounting & Evidentiary Demands Section */}
                {directives.demandItemizedLedger && (
                  <div className="space-y-1.5 bg-white p-3 rounded border border-slate-200">
                    <h4 className="font-sans text-xs font-bold text-slate-900 uppercase">
                      Mandatory Accounting & Procedural Ledger Demand:
                    </h4>
                    <p className="text-[11px] text-slate-700">
                      Pursuant to codified statutory disclosure mandates, you are formally directed to furnish a complete,
                      unredacted line-by-line accounting ledger calculated from $0 original balance, detailing procedural codes (CPT/REV),
                      contracted in-network allowances, and Relative Value Units (RVUs).
                    </p>
                  </div>
                )}

                {/* Telephone Cease-and-Desist Directive */}
                {directives.ceasePhoneCalls && (
                  <div className="space-y-1.5 bg-white p-3 rounded border border-slate-200">
                    <h4 className="font-sans text-xs font-bold text-slate-900 uppercase">
                      Formal Telephone Cease-and-Desist Directive (15 U.S.C. § 1692c(c)):
                    </h4>
                    <p className="text-[11px] text-slate-700">
                      All telephone contact, automated dialers, and SMS messaging to consumer residence or place of employment
                      are strictly prohibited as inconvenient. All future communication regarding this matter must occur exclusively in writing via U.S. Mail.
                    </p>
                  </div>
                )}

                {/* Chain of Title Directive */}
                {directives.requestChainOfTitle && (
                  <div className="space-y-1.5 bg-white p-3 rounded border border-slate-200">
                    <h4 className="font-sans text-xs font-bold text-slate-900 uppercase">
                      Demand for Complete Chain-of-Title & Original Agreement:
                    </h4>
                    <p className="text-[11px] text-slate-700">
                      You are required to submit certified documentation evidencing the unbroken assignment of legal title from the originating creditor
                      along with a true and correct copy of the original signed contract establishing standing to collect.
                    </p>
                  </div>
                )}

                {/* Method of Verification (MOV) Demand */}
                {directives.includeMethodOfVerification && (
                  <div className="space-y-1.5 bg-white p-3 rounded border border-slate-200">
                    <h4 className="font-sans text-xs font-bold text-slate-900 uppercase">
                      Statutory Method of Verification (MOV) Demand (15 U.S.C. § 1681i(a)(7)):
                    </h4>
                    <p className="text-[11px] text-slate-700">
                      Demand is hereby made that you provide a written description of the exact procedure used to verify disputed information,
                      including the business name, address, and telephone number of each furnisher contacted.
                    </p>
                  </div>
                )}

                {/* Statutory Regulatory Escalation Warning */}
                {directives.includeRegulatoryEscalation && (
                  <div className="space-y-1.5 bg-rose-50/60 p-3 rounded border border-rose-200">
                    <h4 className="font-sans text-xs font-bold text-rose-900 uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Notice of Pending Regulatory Escalation:
                    </h4>
                    <p className="text-[11px] text-rose-900">
                      Failure to respond and rectify the disputed balance within {compiledLetter.statutorySlaDays} days
                      (on or before <strong>{compiledLetter.statutoryDeadlineDate}</strong>) will result in immediate formal complaints
                      submitted to the {compiledLetter.escalationAgencies.join(', ')} without further notice.
                    </p>
                  </div>
                )}

                {/* Perjury Attestation & Signature Line */}
                <div className="pt-3 border-t border-slate-200 space-y-3 font-sans text-xs">
                  <p className="text-[11px] text-slate-600 italic">
                    I declare under penalty of perjury under the laws of the United States of America that the foregoing dispute notice
                    and factual assertions are true and correct. All consumer rights are expressly reserved.
                  </p>
                  <div className="pt-4">
                    <p className="text-slate-800">Respectfully submitted,</p>
                    <div className="mt-6 border-b border-slate-400 w-64" />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Authorized Signature of Consumer / Legal Representative
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* ================= RAW MARKDOWN EDITOR ================= */
              <div className="relative flex-1">
                <textarea
                  value={customLetterDraft || compiledLetter.fullLetterMarkdown}
                  onChange={(e) => {
                    setCustomLetterDraft(e.target.value);
                    setIsDraftManuallyEdited(true);
                  }}
                  aria-label="Live editable legal demand draft"
                  className="w-full h-full min-h-[520px] p-4 text-xs font-mono text-slate-900 bg-slate-50/40 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed resize-none transition-all"
                  placeholder="Dispute letter draft content..."
                />
              </div>
            )}

            {/* Hidden container dedicated strictly for native browser printing (@media print) */}
            <div className="court-ready-print-container hidden print:block">
              <pre className="court-ready-letter-text">
                {customLetterDraft || compiledLetter.fullLetterMarkdown}
              </pre>
            </div>

            {/* Letter Bottom Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2 no-print">
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
                  onClick={handleNativePrint}
                  className="text-xs font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-1 underline underline-offset-2"
                  title="Print formal letter with 0.75-inch margins"
                >
                  <Printer className="w-3.5 h-3.5" aria-hidden="true" /> Print / Native PDF
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
