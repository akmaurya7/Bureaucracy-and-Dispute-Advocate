# Design System: Clear, Light & Cognitive-Ease UX

**Specification:** UI-SPEC-001  
**Lead:** Mercury (Lead UI/UX & Full-Stack Frontend Engineer)  
**Reviewed by:** Harvey (Chief Strategist)

---

## 1. Visual Design Philosophy: "Clarity and Calm"

Consumers using the **Bureaucracy & Dispute Advocate** platform are frequently dealing with urgent financial distress, aggressive debt collectors, or exorbitant medical bills. A cluttered, complex, or dark UI increases anxiety. 

Our interface must project:
- **Calm Authority:** Clean white and light slate canvases that provide emotional relief.
- **Immediate Comprehensibility:** Complex legal and medical jargon translated into plain, actionable explanations with tooltips.
- **Effortless Navigation:** Standard 3-step dispute flow with progress bars, visual checklists, and split-screen verification.

---

## 2. Color Palette & Accessibility Tokens

| Token | Class / Hex | Purpose |
| :--- | :--- | :--- |
| **Canvas Background** | `bg-white` (`#FFFFFF`) / `bg-slate-50` (`#F8FAFC`) | Primary surface and page background |
| **Panel / Card Surface** | `bg-white border border-slate-200 shadow-sm` | Lightweight cards with subtle hairline separation |
| **Primary Text** | `text-slate-900` (`#0F172A`) | Maximum legibility for letter text and body copy |
| **Secondary Text** | `text-slate-500` (`#64748B`) | Metadata, helper text, timestamps |
| **Primary Accent** | `bg-slate-900 hover:bg-slate-800 text-white` | Decisive, authoritative action buttons |
| **Violation / Error Badge**| `bg-rose-50 text-rose-700 border-rose-200` | Flagged billing codes, statutory violations |
| **Statutory Notice Badge**| `bg-sky-50 text-sky-700 border-sky-200` | Codified law citations (FCRA, FDCPA, NSA) |
| **Success / Resolved Badge**| `bg-emerald-50 text-emerald-700 border-emerald-200`| Resolved claims, verified zero balances |
| **Pending / Warning Badge**| `bg-amber-50 text-amber-700 border-amber-200` | 30-day response countdowns pending |

---

## 3. Typography & Spacing Hierarchy

- **Font Family:** `Inter`, system `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`.
- **Display Headings:** `text-2xl font-bold tracking-tight text-slate-900`.
- **Section Headers:** `text-lg font-semibold text-slate-800`.
- **Body Copy:** `text-sm leading-relaxed text-slate-600`.
- **Legal Draft Font:** Monospace or clean serif preview (`font-serif` or `font-mono text-xs`) for certified mail dispute letters.
- **Whitespace Rule:** Padding minimum `p-6` on cards, `space-y-6` between major operational blocks to avoid visual crowding.

---

## 4. Key Component Layouts

### 4.1 3-Step Guided Dispute Flow
1. **Drop & Protect:** Drag-and-drop file upload with real-time in-browser PII redactor (SSN, credit card, patient ID masked instantly).
2. **Audit & Review:** Visual line-item audit table highlighting overcharges, unbundled CPT codes, or missing debt disclosures.
3. **Generate & Dispatch:** Split-screen dispute studio: original document on left, live-editable legal demand on right, with 1-click PDF download.

### 4.2 Split-Screen Dispute Studio
- Clean 50/50 desktop split view.
- Synchronization: Hovering over a flagged line item on the document highlights the corresponding statutory demand clause on the right.
- Non-destructive clause toggling (e.g. checkbox to include/exclude "Cease & Desist Phone Contact").
