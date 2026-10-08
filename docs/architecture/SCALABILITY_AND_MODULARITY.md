# Scalability & Modularity Architecture

**Specification:** ARCH-SPEC-001  
**Lead:** Lex (Backend & Document Intelligence Lead) & Harvey (Chief Strategist)

---

## 1. Architectural Goals

1. **Category Extensibility:** Adding a new dispute domain (e.g. predatory auto loans, security deposit withholding, flight delay compensation) must require **only** creating a new rule matrix plugin, with zero changes to the core OCR ingestion or dispute letter generator.
2. **Stateless Operations:** API endpoints and service functions must remain strictly stateless to permit multi-instance deployment.
3. **Database Portability:** Support lightweight SQLite for local/edge operation and PostgreSQL for multi-tenant enterprise deployment without altering domain logic.
4. **Performance & Low Latency:** Heavy OCR and LLM tasks run asynchronously with streaming feedback or background webhook updates.

---

## 2. Decoupled Service Layers

```
src/
├── app/                          # Next.js 15 App Router (Presentation & Controllers)
│   ├── api/
│   │   ├── audit/route.ts        # Statutory auditing endpoint
│   │   ├── cases/route.ts        # Case CRUD endpoints
│   │   ├── letters/route.ts      # Letter generation & export endpoints
│   │   └── upload/route.ts       # Document upload & OCR trigger
│   ├── cases/page.tsx            # Case management dashboard
│   ├── studio/page.tsx           # Split-screen dispute studio
│   └── page.tsx                  # Landing & quick-audit dropzone
├── components/                   # Reusable UI widgets
│   ├── layout/                   # Navbar, sidebar, footer
│   ├── studio/                   # Split-screen viewer & clause toggles
│   ├── audit/                    # Line item tables, violation cards
│   └── ui/                       # Radix UI primitives & light buttons
├── lib/                          # Core Domain Logic (Independent of Framework)
│   ├── db/                       # Prisma client & Repository abstractions
│   │   ├── prisma.ts             # Global Prisma instance
│   │   ├── caseRepository.ts     # Type-safe case access
│   │   └── letterRepository.ts   # Dispute letter persistence
│   ├── ocr/                      # Document intelligence & Multimodal vision
│   │   ├── parser.ts             # Gemini Vision multimodal parser
│   │   └── redactor.ts           # Client-side zero-retention PII masker
│   ├── statutes/                 # Codified statutory rules engine
│   │   ├── rules.ts              # Core rules matrix (FCRA, FDCPA, NSA, FTC)
│   │   └── matcher.ts            # Discrepancy-to-statute matcher
│   └── templates/                # Formal legal demand letter synthesizers
│       ├── disputeLetters.ts     # Codified letter templates
│       └── pdfGenerator.ts       # Court-ready PDF exporter
└── tests/                        # Automated compliance & unit test suites
```

---

## 3. Modular Plugin Interface for Dispute Categories

Every dispute category adheres to a uniform interface:

```typescript
export interface DisputePlugin {
  category: DisputeCategory;
  name: string;
  description: string;
  audit(lineItems: RawLineItem[]): Promise<AuditResult[]>;
  generateDemand(context: DisputeContext): DisputeDraft;
  getStatutoryDeadline(triggerDate: Date): Date;
}
```

New categories register themselves into the `StatutoryRegistry`, making the system horizontally extensible without modifying core routes.
