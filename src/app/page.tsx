import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  FileSearch,
  Send,
  ArrowRight,
  Stethoscope,
  BadgeAlert,
  CreditCard,
  Repeat,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function HomePage() {
  const domains = [
    {
      title: 'Medical Bill & No Surprises Act',
      statute: '42 U.S.C. § 300gg-111 & CMS IDR',
      description:
        'Audit CPT/HCPCS codes for unbundling and balance billing. Generates 30-day Open Negotiation and Itemized Bill demands.',
      icon: Stethoscope,
      category: 'MEDICAL_BILLING',
      accentColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
    },
    {
      title: 'Predatory Debt Validation',
      statute: '15 U.S.C. § 1692g & CFPB Reg F',
      description:
        'Demand chain-of-title, original signed contract, and accounting ledgers. Enforces strict telephone cease-and-desist.',
      icon: BadgeAlert,
      category: 'DEBT_COLLECTION',
      accentColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    {
      title: 'Credit Bureau Inaccuracy Dispute',
      statute: '15 U.S.C. § 1681i (FCRA § 611)',
      description:
        'Challenge erroneous tradelines, obsolete derogatory marks, and demand Method of Verification (MOV) within 30 days.',
      icon: CreditCard,
      category: 'CREDIT_REPORT_ERROR',
      accentColor: 'text-sky-600',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
    },
    {
      title: 'Dark-Pattern Subscription Revocation',
      statute: '16 CFR Part 425 & 15 U.S.C. § 1693e',
      description:
        'Revoke recurring debit authorizations under EFTA and cite the FTC Click-to-Cancel rule to bypass cancellation barriers.',
      icon: Repeat,
      category: 'SUBSCRIPTION_CANCEL',
      accentColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto pt-4 space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-slate-800" />
          <span>Statutory Consumer Protection Engine</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Turn Unfair Bills into Legally Binding Disputes
        </h1>
        <p className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Over 80% of medical bills and debt collection claims contain statutory violations.
          We audit your documents, map discrepancies to codified federal laws, and generate formal legal demand packages.
        </p>
        <div className="pt-2 flex justify-center items-center space-x-4">
          <Link
            href="/studio"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-sm"
          >
            <span>Start a Free Dispute</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/statutes"
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all"
          >
            <span>Explore Codified Rules</span>
          </Link>
        </div>
      </section>

      {/* 3-Step Guided Process */}
      <section className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-slate-900">How the Platform Defends You</h2>
          <p className="text-sm text-slate-500 mt-1">
            Three simple steps from confusing paperwork to an enforceable legal response.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 font-bold text-lg">
              1
            </div>
            <h3 className="font-semibold text-slate-800 flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-sky-600" />
              <span>Drop & Redact</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload your bill, letter, or invoice. Sensitive SSNs and bank numbers are redacted client-side before processing.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-lg">
              2
            </div>
            <h3 className="font-semibold text-slate-800 flex items-center space-x-1.5">
              <FileSearch className="w-4 h-4 text-indigo-600" />
              <span>Statutory Audit</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Our rules engine cross-references line items against CPT fee benchmarks, FDCPA disclosure mandates, and FCRA standards.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-lg">
              3
            </div>
            <h3 className="font-semibold text-slate-800 flex items-center space-x-1.5">
              <Send className="w-4 h-4 text-emerald-600" />
              <span>Generate & Dispatch</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Review your split-screen studio, customize legal clauses, and export a certified-mail-ready PDF demand with statutory deadline clocks.
            </p>
          </div>
        </div>
      </section>

      {/* 4 Core Dispute Domains */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Choose a Dispute Category</h2>
            <p className="text-sm text-slate-500">
              Select your issue to launch a tailored statutory defense workflow.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {domains.map((d) => {
            const Icon = d.icon;
            return (
              <div
                key={d.title}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-slate-300 hover:shadow transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-lg ${d.bgColor} ${d.borderColor} border flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${d.accentColor}`} />
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {d.statute}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{d.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{d.description}</p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">Statutory 30-Day SLA</span>
                  <Link
                    href={`/studio?category=${d.category}`}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-900 hover:text-slate-700"
                  >
                    <span>Launch Dispute</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Case Management & Active Clocks Preview */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sample Active Disputes & Deadlines</h2>
            <p className="text-xs text-slate-500">
              Live tracking of statutory response windows for pending demands.
            </p>
          </div>
          <Link
            href="/studio"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center space-x-1"
          >
            <span>View All</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2.5 px-3">Opponent / Organization</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Disputed Amount</th>
                <th className="py-2.5 px-3">Statutory Basis</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Remaining SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-semibold text-slate-900">Memorial Health Emergency</td>
                <td className="py-3 px-3">Medical Billing</td>
                <td className="py-3 px-3 font-mono text-rose-600 font-semibold">$3,420.00</td>
                <td className="py-3 px-3 text-slate-500">42 U.S.C. § 300gg-111</td>
                <td className="py-3 px-3">
                  <span className="badge-audited">AUDITED</span>
                </td>
                <td className="py-3 px-3 flex items-center space-x-1 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>26 Days Left</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-semibold text-slate-900">Midland Credit Management</td>
                <td className="py-3 px-3">Debt Collection</td>
                <td className="py-3 px-3 font-mono text-amber-600 font-semibold">$1,850.50</td>
                <td className="py-3 px-3 text-slate-500">15 U.S.C. § 1692g</td>
                <td className="py-3 px-3">
                  <span className="badge-sent">AWAITING_REPLY</span>
                </td>
                <td className="py-3 px-3 flex items-center space-x-1 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>14 Days Left</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-semibold text-slate-900">Equifax Information Services</td>
                <td className="py-3 px-3">Credit Report Error</td>
                <td className="py-3 px-3 font-mono text-slate-600">N/A (Tradeline)</td>
                <td className="py-3 px-3 text-slate-500">15 U.S.C. § 1681i</td>
                <td className="py-3 px-3">
                  <span className="badge-resolved flex items-center space-x-1 w-max">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>RESOLVED</span>
                  </span>
                </td>
                <td className="py-3 px-3 text-emerald-600 font-medium">Deleted from Report</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
