import React from 'react';
import { STATUTORY_RULES } from '@/lib/statutes/rules';
import { Scale, Clock, ShieldCheck, BookOpen, AlertCircle } from 'lucide-react';

export default function StatutesLibraryPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-slate-800" />
          <h1 className="text-2xl font-bold text-slate-900">Codified Consumer Protection Statutes</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Federal statutory rules, mandatory disclosure clauses, and legal response deadlines enforced by the platform.
        </p>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {STATUTORY_RULES.map((rule) => (
          <div
            key={rule.id}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  {rule.code}
                </span>
                <span className="flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  <Clock className="w-3 h-3 text-sky-600" />
                  <span>{rule.statutoryResponseDays} Days SLA</span>
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900">{rule.name}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{rule.summary}</p>

              {/* Trigger Conditions */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Trigger Conditions:
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {rule.triggerConditions.map((cond) => (
                    <span
                      key={cond}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200"
                    >
                      {cond.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Mandatory Statutory Language Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center space-x-1 text-xs font-bold text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>Mandatory Demand Snippet</span>
              </div>
              <p className="text-[11px] font-mono text-slate-700 leading-relaxed italic">
                &ldquo;{rule.mandatoryLanguageSnippet}&rdquo;
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
