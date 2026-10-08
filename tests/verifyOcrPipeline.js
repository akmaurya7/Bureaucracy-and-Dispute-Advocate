#!/usr/bin/env node
/**
 * Justitia (QA & Statutory Compliance Auditor)
 * Automated Verification Suite for OCR Document Ingestion Pipeline
 *
 * Validates:
 * 1. Zod normalization schema and typing.
 * 2. CPT 99285 upcoding and CPT 99070 unbundling detection.
 * 3. FDCPA 15 U.S.C. § 1692g & Mini-Miranda disclosure absence detection.
 * 4. Zero-retention client-side PII masking (SSNs, cards, banking, MRNs).
 * 5. 95%+ extraction accuracy across critical statutory fields.
 * 6. SQLite dev.db persistence via CaseRepository.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('[Justitia QA Auditor] Launching OCR Document Ingestion & Statutory Compliance Test Suite...\n');

try {
  const tsPath = path.resolve(__dirname, 'verifyOcrPipeline.ts');
  execSync(`npx tsx "${tsPath}"`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
  });
  console.log('[Justitia QA Auditor] Test suite execution finished successfully.');
  process.exit(0);
} catch (error) {
  console.error('[Justitia QA Auditor] Verification suite failed with error:', error.message);
  process.exit(error.status || 1);
}
