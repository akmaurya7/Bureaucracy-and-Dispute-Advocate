# Mandatory Documentation Protocol

**Standard:** DOC-STD-001  
**Target:** Bureaucracy & Dispute Advocate  
**Enforcer:** Harvey (Chief of Staff & Senior Engineering Strategist)

---

## 1. Core Rule

> **"No code is committed, reviewed, or considered complete without corresponding documentation created in the `docs/` repository."**

Every bot (Harvey, Lex, Mercury, Justitia) must document their work after each step. Documentation is not an afterthought; it is an active deliverable of every technical action.

---

## 2. Documentation Directory Map

```
docs/
├── architecture/                 # System design, data flow, scalability blueprints
│   ├── SCALABILITY_AND_MODULARITY.md
│   └── DATABASE_AND_REPO_PATTERN.md
├── api/                          # REST & Server Action endpoint specifications
│   ├── CASE_MANAGEMENT_API.md
│   └── OCR_AND_INGESTION_API.md
├── ui/                           # Frontend component specs, UX flow, design tokens
│   ├── DESIGN_SYSTEM_CLEAR_AND_LIGHT.md
│   └── SPLIT_SCREEN_STUDIO_SPEC.md
├── compliance/                   # Statutory audits, citations, PII security checks
│   ├── STATUTORY_CITATION_AUDIT.md
│   └── ZERO_PII_RETENTION_AUDIT.md
├── standards/                    # Engineering standards and protocols
│   └── DOCUMENTATION_PROTOCOL.md
└── steps/                        # Granular documentation for each phase and step executed
    └── STEP_00_PREREQUISITES_SETUP.md
```

---

## 3. Step Execution Workflow

For every technical step:
1. **Pre-Step:** Create `docs/steps/STEP_XX_<NAME>.md` detailing the objectives, files to touch, and acceptance criteria.
2. **Execution:** Implement the clean, typed, modular code with descriptive docstrings.
3. **Post-Step:** Append execution results, tests run, and file diffs to the step doc.
4. **Audit:** Justitia checks that documentation matches reality and updates compliance logs.
5. **Phase Sync:** Update `PROJECT_PHASES.md` marking the deliverable complete.
