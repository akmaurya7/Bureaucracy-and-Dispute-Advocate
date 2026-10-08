#!/usr/bin/env node
/**
 * Justitia (QA & Statutory Compliance Auditor)
 * Automated Verification Suite for Statutory Rules & Dispute Generation Engine
 *
 * Validates:
 * 1. Zero hallucinated statutes or citations across FDCPA, No Surprises Act, FCRA, and FTC Click-to-Cancel.
 * 2. Mandatory statutory citations: 15 U.S.C. § 1692g/c, 42 U.S.C. § 300gg-111, 45 CFR Part 149, 15 U.S.C. § 1681i/MOV, 16 CFR Part 425, 15 U.S.C. § 1693e.
 * 3. Exact statutory response deadlines (30 calendar days for FDCPA/FCRA, 30 business days for No Surprises Open Negotiation, 10 business days for FTC/EFTA).
 * 4. Presence of USPS Certified Mail tracking headers, mandatory statutory warnings, line item breakdown tables, and regulatory escalation directives.
 * 5. Zero-retention client-side PII masking with 0 leaks across all compiled letters.
 * 6. SQLite dev.db persistence via CaseRepository.createDisputeLetter.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('[Justitia QA Auditor] Launching Statutory Rules & Dispute Engine Verification Suite...\n');

try {
  const tsPath = path.resolve(__dirname, 'verifyDisputeEngine.ts');
  execSync(`npx tsx "${tsPath}"`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
  });
  console.log('[Justitia QA Auditor] Dispute engine test suite execution finished successfully.');
  process.exit(0);
} catch (error) {
  console.error('[Justitia QA Auditor] Verification suite failed with error:', error.message);
  process.exit(error.status || 1);
}
