#!/usr/bin/env node
/**
 * Justitia (QA & Statutory Compliance Auditor)
 * Automated Verification Suite for Court-Ready PDF Export & Certified Mail Engine
 *
 * Validates:
 * 1. Court-ready PDF generation across all 4 primary domains (FDCPA, No Surprises Act, FCRA, FTC Click-to-Cancel).
 * 2. Binary %PDF- header integrity, non-empty stream, and size > 10KB.
 * 3. USPS Certified Mail tracking header format and "RETURN RECEIPT REQUESTED" bold notice.
 * 4. 100% preservation of federal statutory citations and deadlines across letters and PDF streams.
 * 5. Zero-retention client-side PII masking with 0 leaks in binary PDF buffers (SSNs, banking, card numbers).
 * 6. SQLite dev.db persistence of letter drafting and PDF export timeline events.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('[Justitia QA Auditor] Launching Court-Ready PDF Export & Certified Mail Verification Suite...\n');

try {
  const tsPath = path.resolve(__dirname, 'verifyPdfExport.ts');
  execSync(`npx tsx "${tsPath}"`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
  });
  console.log('[Justitia QA Auditor] PDF export verification suite finished successfully.');
  process.exit(0);
} catch (error) {
  console.error('[Justitia QA Auditor] PDF verification suite failed with error:', error.message);
  process.exit(error.status || 1);
}
