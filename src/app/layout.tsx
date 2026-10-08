import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Bureaucracy & Dispute Advocate | Autonomous Consumer Legal Defense',
  description:
    'Audit medical bills, enforce FDCPA debt validation, dispute credit report inaccuracies, and cancel stubborn subscriptions using codified consumer protection statutes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <div>
              <span className="font-semibold text-slate-700">Bureaucracy & Dispute Advocate</span> — Automated statutory defense for consumer rights.
            </div>
            <div className="flex space-x-4">
              <span>FCRA 15 U.S.C. § 1681</span>
              <span>•</span>
              <span>FDCPA 15 U.S.C. § 1692</span>
              <span>•</span>
              <span>No Surprises Act 42 U.S.C. § 300gg-111</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
