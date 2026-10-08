# Team Memory & Standing Directives: Bureaucracy & Dispute Advocate

**Team Name:** `Bureaucracy & Dispute Advocate`  
**Workspace Directory:** `D:\projects\Bureaucracy and Dispute Advocate`  
**Repository Branch:** `main`

## Core Responsibilities
- **Harvey (Chief Legal Architect & Senior Engineering Strategist):** Ensures all dispute letters cite codified legal statutes (15 U.S.C. 1681, 15 U.S.C. 1692, 42 U.S.C. 300gg-111, 16 CFR Part 425) with zero hallucinations; enforces the mandatory documentation protocol; coordinates teammate tasks and dependencies.
- **Lex (Backend & OCR Lead):** Implements document ingestion, OCR parsing, Prisma SQLite storage (`dev.db`), and decoupled repository patterns (`src/lib/db/caseRepository.ts`) with zero PII leaks.
- **Mercury (Frontend Lead):** Builds intuitive, highly responsive Next.js 15 web studio with split-screen dispute previews (`src/app/studio/page.tsx`), accessible drag-and-drop dropzones (`src/components/DocumentDropzone.tsx`), clear and light design tokens, and WCAG AAA controls.
- **Justitia (QA & Compliance Auditor):** Verifies all generated outputs adhere to strict legal firmness without hyperbole, audits PII masking routines, and builds automated test suites (`tests/verifyOcrPipeline.ts`).

## System Milestones
- **Phase 1 [COMPLETED]:** Core Next.js 15 scaffold, Tailwind CSS clear & light palette, Prisma ORM initialization with SQLite `dev.db`, repository pattern in `CaseRepository`, zero-retention client PII redactor in `redactor.ts`, and clean production build verified.
- **Phase 2 [COMPLETED]:** Cross-agent document ingestion pipeline, Zod normalization schemas (`schemas.ts`), zero-retention heuristic OCR extractor (`extractor.ts`), multipart upload route (`/api/documents/upload`), drag-and-drop dropzone with client-side PII preview (`DocumentDropzone.tsx`), and automated compliance test suite achieving 100% extraction accuracy and zero PII leakage.
