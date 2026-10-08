import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Scale, FileText, Clock, PlusCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">
                  Bureaucracy & Dispute Advocate
                </span>
                <span className="text-xs text-slate-500 font-medium block">
                  Autonomous Consumer Legal Defense
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/studio"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center space-x-1.5"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Dispute Studio</span>
            </Link>
            <Link
              href="/statutes"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center space-x-1.5"
            >
              <Scale className="w-4 h-4 text-slate-400" />
              <span>Statutory Rules</span>
            </Link>
            <Link
              href="/vault"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center space-x-1.5"
            >
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Statutory Clocks</span>
            </Link>
          </nav>

          {/* Right Action & Security Badge */}
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Client-Side PII Shield</span>
            </div>

            <Link
              href="/studio"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Dispute</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
