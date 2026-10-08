'use client';

import React from 'react';
import { Clock, AlertTriangle, ShieldCheck, CheckCircle2, Send, ExternalLink, Calendar } from 'lucide-react';

export default function EvidenceVaultPage() {
  const activeDisputes = [
    {
      id: 'DISP-8921',
      title: 'Emergency Medical Coding Dispute',
      opponent: 'Memorial Regional Hospital',
      category: 'MEDICAL_BILLING',
      amount: '$3,420.00',
      sentDate: '2026-09-28',
      daysElapsed: 10,
      daysRemaining: 20,
      statute: '42 U.S.C. § 300gg-111 (No Surprises Act)',
      status: 'AWAITING_RESPONSE',
      regulatorPortal: 'CMS No Surprises Help Desk',
    },
    {
      id: 'DISP-4819',
      title: 'FDCPA 30-Day Debt Validation Demand',
      opponent: 'Midland Credit Management',
      category: 'DEBT_COLLECTION',
      amount: '$1,850.50',
      sentDate: '2026-09-18',
      daysElapsed: 20,
      daysRemaining: 10,
      statute: '15 U.S.C. § 1692g & CFPB Reg F',
      status: 'AWAITING_RESPONSE',
      regulatorPortal: 'CFPB Consumer Complaint Database',
    },
    {
      id: 'DISP-1029',
      title: 'Inaccurate Medical Tradeline Removal',
      opponent: 'Equifax Information Services',
      category: 'CREDIT_REPORT_ERROR',
      amount: 'N/A (Tradeline)',
      sentDate: '2026-09-02',
      daysElapsed: 36,
      daysRemaining: 0,
      statute: '15 U.S.C. § 1681i (FCRA § 611)',
      status: 'EXPIRED_ESCALATE',
      regulatorPortal: 'CFPB & FTC Fraud Alert',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-slate-800" />
          <h1 className="text-2xl font-bold text-slate-900">Evidence Vault & Statutory Clocks</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Automated 30-day response countdown timers and 1-click regulatory escalation triggers.
        </p>
      </div>

      {/* Clocks Grid */}
      <div className="space-y-4">
        {activeDisputes.map((item) => {
          const isExpired = item.daysRemaining === 0;

          return (
            <div
              key={item.id}
              className={`bg-white border rounded-xl p-6 shadow-sm transition-all ${
                isExpired ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {item.id}
                    </span>
                    <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        isExpired
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Opponent: <strong className="text-slate-800">{item.opponent}</strong> • Disputed:{' '}
                    <strong className="text-slate-800">{item.amount}</strong> • Basis:{' '}
                    <span className="font-mono text-slate-700">{item.statute}</span>
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Notice Sent: {item.sentDate}</span>
                    </span>
                    <span>•</span>
                    <span>{item.daysElapsed} days elapsed</span>
                  </div>
                </div>

                {/* Statutory Clock / Escalation Button */}
                <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-500">Statutory Window</div>
                    <div
                      className={`text-lg font-extrabold ${
                        isExpired ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {isExpired ? 'DEADLINE EXPIRED' : `${item.daysRemaining} Days Left`}
                    </div>
                  </div>

                  {isExpired ? (
                    <button
                      onClick={() =>
                        alert(`Escalating complaint to ${item.regulatorPortal}!`)
                      }
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Escalate to {item.regulatorPortal.split(' ')[0]}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => alert('Viewing delivery receipt and proof of certified mail delivery.')}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                      <span>Proof of Delivery</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
