# 𝒢 Theorem Graph — Study Web App for Mathematical Structure

A study tool for exploring and mastering mathematical domains through **graphs of definitions (nodes)** connected by **theorems (typed edges)** and **counterexamples (witnesses)**.

Built as a **study tool first**, and a mathematical reference second.

---

## 🌟 Key Highlights & Architectural Principles

1. **Do Not Invent Mathematics:** All mathematical statements, properties, and counterexamples are stored in structured JSON files under `data/<domain>/`. Every statement carries `source` citations and `verified: false` until formally reviewed by a domain expert.
2. **Deterministic Data Validation:** An automated validator (`npm run validate`) executes before every build and in CI to guarantee graph consistency, lack of cycles among strict implications, valid counterexample witnesses, transitive reduction compliance, and contradiction freedom.
3. **Graph Readability First:**
   - **Layered Top-Down Layout (Dagre/ELK):** Strongest properties at the top, implying weaker properties below.
   - **Compound Equivalence Nodes:** Automatically collapses equivalence classes (e.g. $[0, 1]^\mathbb{R}$ compactness equivalences in metric spaces) into interactive compound nodes. Tap to expand into individual definitions.
   - **Transitive Reduction Display:** Shows only minimal essential arrows by default, with an instant toggle for transitively implied arrows.
   - **Context Hierarchy:** Context switcher re-layouts the graph for standing hypotheses (e.g., General Topological Spaces $\to$ $T_1$ Spaces $\to$ Hausdorff Spaces $\to$ Metrizable Spaces). Stronger theorems are greyed out with context requirement tags.
   - **Refutation Edges:** Non-implications are dashed red edges with $\times$ symbols; clicking reveals the witness counterexample.
   - **Multi-Route Path Finder:** Lists all deductive routes from Property $A$ to Property $B$, detailing the standing hypotheses required along each route.
4. **Study & Active Recall Modes:**
   - 🌫️ **Fog of War (Explore Mode):** Unlocks nodes by solving multiple-choice definition challenges.
   - 🎯 **Predict the Arrow (Quiz Mode):** Tests deduction directions ($\implies$, $\Longleftarrow$, $\iff$, or neither) with a required witness counterexample selection step. *Guaranteed never to quiz on undetermined pairs (unknown $\neq$ false).*
   - 🧩 **Missing-Edge Puzzle:** Identifies the key theorem that completes a hidden link in a deduction chain.
   - 🧠 **Spaced Repetition (SM-2):** Flashcards for every implication ("Why $A \implies B$?") and non-implication ("Why $B \not\implies A$?"). Persisted in `localStorage` with JSON export/import.
   - 📊 **Progress Dashboard:** Tracks domain mastery %, quiz accuracy, and surfaces weak edges needing review.

---

## 🛠️ Stack

- **Runtime & Bundler:** Vite 6, TypeScript 5.7
- **UI Framework:** React 18, Tailwind CSS, Lucide Icons
- **Graph Visualization:** Cytoscape.js with `cytoscape-dagre` layered layout & compound nodes
- **Mathematical Typography:** KaTeX (inline `$...$` and display `$$...$$`)
- **State Management:** Zustand with `localStorage` synchronization
- **Testing & Verification:** Vitest (unit & algorithmic tests), Playwright (E2E & responsive smoke tests)
- **CI/CD:** GitHub Actions workflow (`.github/workflows/ci.yml`)

---

## 📂 Data Model & Schemas

Domain data resides under `data/<domain>/` as four JSON files:

```
data/
└── topology/
    ├── contexts.json
    ├── properties.json
    ├── statements.json
    └── counterexamples.json
```

### 1. `Context` (`contexts.json`)
The standing mathematical hypotheses under which theorems hold.
```typescript
type Context = {
  id: string;                  // e.g. "metric-spaces"
  name: string;                // e.g. "Metrizable Spaces"
  assumptions: string[];       // LaTeX/text assumptions
  requiredProperties?: string[]; // Property IDs required for a space to belong to this context
};
```

### 2. `Property` (`properties.json`)
A definition or property (represented as a node in the graph).
```typescript
type Property = {
  id: string;                  // e.g. "compact"
  name: string;                // e.g. "Compact" (supports LaTeX: "$T_1$")
  domain: string;              // e.g. "topology"
  definition: string;          // LaTeX/markdown mathematical definition
  equivalentForms?: string[];  // Alternative characterizations
  examples?: string[];         // Canonical examples
  nonExamples?: string[];      // Canonical non-examples
  notes?: string;              // Geometric / historical context
};
```

### 3. `Statement` (`statements.json`)
A theorem connecting properties (represented as typed edges).
```typescript
type Statement = {
  id: string;                  // e.g. "stmt-compact-implies-countably-compact"
  kind: "implies" | "equivalent" | "not-implies";
  from: string[];              // Property IDs
  to: string[];                // Property IDs (for equivalent: mutually equivalent)
  context: string;             // Context ID
  name?: string;               // e.g. "Heine–Borel Theorem"
  proofSketch?: string;        // Proof idea + key mechanism
  keyLemma?: string;           // Key lemma used (e.g. "Urysohn's Lemma")
  witness?: string;            // Required for not-implies: Counterexample ID
  source: string;              // Textbook/paper citation
  verified: boolean;           // false until owner review
  leanName?: string;           // Optional Mathlib formalization identifier
};
```

### 4. `Counterexample` (`counterexamples.json`)
A mathematical object refuting an implication.
```typescript
type Counterexample = {
  id: string;                  // e.g. "sierpinski-space"
  name: string;                // e.g. "Sierpiński space"
  description: string;         // Construction and properties
  satisfies: string[];         // Property IDs satisfied
  fails: string[];             // Property IDs failed
  source: string;              // Citation (e.g. Steen & Seebach)
  verified: boolean;
};
```

JSON Schemas are located in the `schema/` folder for validation and IDE autocompletion.

---

## 🔍 Validation Rules (`npm run validate`)

The validator (`scripts/validate.ts` & `src/lib/validator.ts`) enforces strict mathematical and structural invariants:

1. **ID Integrity:** Every referenced context, property, and counterexample witness exists; no duplicate IDs.
2. **Counterexample Witness Matching:** Every `not-implies` statement must have a `witness`. The specified counterexample must satisfy all properties in `from` and fail all properties in `to`.
3. **No Strict Implication Cycles:** Once equivalence classes are collapsed in each context, there can be no directed cycles among strict implication edges.
4. **Transitive Reduction Enforcement:** If an implication $A \implies B$ is stored explicitly, but can be inferred through an alternate path $A \implies \dots \implies B$ of length $\ge 2$, the validator flags a warning so that only the transitive reduction is stored.
5. **Contradiction Detection:** Warns if a counterexample claims to satisfy $A$ and fail $B$, but $A \implies B$ is derivable within that context.
6. **Unverified Tracking:** Prints a clear count of statements and counterexamples where `verified: false`. Fails the build on any error.

---

## 🚀 Getting Started

### Prerequisites
- Node.js $\ge 18$ (LTS recommended)
- npm $\ge 9$

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/theorem-graph.git
cd theorem-graph

# Install dependencies
npm install
```

### Running the App
```bash
# Start local development server
npm run dev

# Run data validator
npm run validate

# Run unit tests (Vitest)
npm test

# Run end-to-end smoke tests (Playwright)
npm run test:e2e

# Compile & build static production bundle
npm run build
```

---

## ➕ How to Add a New Domain

Adding a new mathematical domain (e.g. `ring-theory`, `group-theory`, `functional-analysis`) requires **editing only files in `data/<domain>/` with zero code changes**:

1. **Create the domain directory:**
   ```bash
   mkdir data/ring-theory
   ```

2. **Add the 4 JSON files:**
   - `data/ring-theory/contexts.json` (e.g. Commutative rings, Integral domains, Fields)
   - `data/ring-theory/properties.json` (e.g. Noetherian, Artinian, UFD, PID, Euclidean domain)
   - `data/ring-theory/statements.json` (e.g. PID $\implies$ UFD, Euclidean $\implies$ PID)
   - `data/ring-theory/counterexamples.json` (e.g. $\mathbb{Z}[x]$: UFD that is not a PID)

3. **Rules for authoring:**
   - Mark every statement and counterexample with `verified: false` and provide a textbook or paper citation in `source`.
   - Store only the **transitive reduction** (do not explicitly add $A \implies C$ if $A \implies B \implies C$ already holds).
   - Ensure every `not-implies` edge specifies a valid `witness`.

4. **Validate:**
   ```bash
   npm run validate
   ```
   The validator will automatically discover the new domain, verify all references and graph logic, and the UI will automatically include it in the domain selector dropdown!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `1` | Switch to **Graph Viewer** mode |
| `2` | Switch to **Fog of War (Explore)** mode |
| `3` | Switch to **Predict the Arrow (Quiz)** mode |
| `4` | Switch to **Missing-Edge Puzzle** mode |
| `5` | Switch to **Spaced Repetition Review** mode |
| `6` | Switch to **Progress Overview** mode |
| `Esc` | Close side panel / dismiss modal |

---

## 📜 Citations & Prior Art

Seed topology definitions, theorems, and counterexamples are compiled from:
- Lynn Arthur Steen & J. Arthur Seebach, Jr., *Counterexamples in Topology*, Dover Publications, 1978.
- James R. Munkres, *Topology* (2nd Edition), Prentice Hall, 2000.
- Stephen Willard, *General Topology*, Addison-Wesley, 1970.
- $\pi$-Base: *A Database of Topological Spaces, Properties, and Theorems* (community topological database).

---

## 📄 License
MIT License. Content definitions and theorems cite their respective historical and mathematical sources.
