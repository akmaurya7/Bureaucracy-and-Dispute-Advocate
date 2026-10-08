# Documentation Hub & Knowledge Index

Welcome to the central documentation index for **Bureaucracy & Dispute Advocate**.  
This repository maintains a strict **Step-by-Step Documentation Protocol**: every architectural layer, compliance policy, UI design token, and engineering milestone is documented and summarized so future engineers and automated subagents can understand and continue development seamlessly.

---

## 1. Quick Navigation by Topic

| Category | Document | Description | Target Audience |
| :--- | :--- | :--- | :--- |
| **Prerequisites** | [`/PREREQUISITES.md`](../PREREQUISITES.md) | Runtime requirements, environment setup, database specifications, and UX directives. | Developers, DevOps |
| **Project Phases** | [`/PROJECT_PHASES.md`](../PROJECT_PHASES.md) | 6-phase engineering roadmap with exit gates and lead specialist assignments. | Engineering Leads, PMs |
| **Architecture** | [`/ARCHITECTURE.md`](../ARCHITECTURE.md) | Master technical blueprint, system mermaid diagrams, and end-to-end data flow. | System Architects |
| **Architecture** | [`/docs/architecture/SCALABILITY_AND_MODULARITY.md`](./architecture/SCALABILITY_AND_MODULARITY.md) | Plugin interface, horizontal scaling, and decoupled service layers. | Backend Engineers |
| **Architecture** | [`/docs/architecture/DATABASE_AND_REPO_PATTERN.md`](./architecture/DATABASE_AND_REPO_PATTERN.md) | Relational ERD and the `CaseRepository` abstraction pattern. | Database Engineers |
| **API Reference** | [`/docs/api/OCR_AND_INGESTION_API.md`](./api/OCR_AND_INGESTION_API.md) | Ingestion endpoint (`/api/documents/upload`), schemas, and error responses. | API Consumers |
| **Standards** | [`/docs/standards/DOCUMENTATION_PROTOCOL.md`](./standards/DOCUMENTATION_PROTOCOL.md) | Codified standard requiring step documentation before and after work. | All Contributors |
| **Design System** | [`/docs/ui/DESIGN_SYSTEM_CLEAR_AND_LIGHT.md`](./ui/DESIGN_SYSTEM_CLEAR_AND_LIGHT.md) | Clear, light, calm aesthetic guidelines, color tokens, and WCAG AAA rules. | Frontend Engineers, Designers |
| **Compliance** | [`/docs/compliance/ZERO_PII_RETENTION_AUDIT.md`](./compliance/ZERO_PII_RETENTION_AUDIT.md) | HIPAA, GLBA, and FCRA client-side PII sanitization and zero-leak guarantees. | QA & Legal Auditors |
| **Team Memory** | [`/TEAM_MEMORY.md`](../TEAM_MEMORY.md) | Shared bot personas, roles, and platform milestones. | Multi-Agent Swarm |

---

## 2. Step-by-Step Milestone Logs

Detailed chronological logs of all completed engineering steps, including objectives, code signatures, verification commands, and exit gate audits:

- **Step 00:** [`/docs/steps/STEP_00_PREREQUISITES_SETUP.md`](./steps/STEP_00_PREREQUISITES_SETUP.md) — Foundation prerequisites, design tokens, and documentation standards.
- **Step 01:** [`/docs/steps/STEP_01_CORE_FOUNDATION.md`](./steps/STEP_01_CORE_FOUNDATION.md) — Next.js 15 app scaffold, Prisma SQLite synchronization, CaseRepository implementation, zero-retention client redactor, and clean build verification.
- **Step 02:** [`/docs/steps/STEP_02_DOCUMENT_INGESTION_OCR.md`](./steps/STEP_02_DOCUMENT_INGESTION_OCR.md) — Multi-agent OCR document ingestion pipeline, Zod normalization schemas, client-side PII masking dropzone, split-screen studio integration, and 100% test accuracy audit.

---

## 3. How to Contribute & Advance Steps

When beginning a new step:
1. Create `docs/steps/STEP_XX_<NAME>.md` specifying objectives and technical contracts.
2. Implement code adhering to decoupled repository patterns and client-side PII masking.
3. Verify with automated test scripts and `npm run build`.
4. Update `PROJECT_PHASES.md` and document verification results in the step log.
