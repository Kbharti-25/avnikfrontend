# Anvik 2.0 — UPI Fraud-Ring Graph Investigator

> **PS 16 — UPI Fraud-Ring Graph Investigator with Explainable Alerts**  
> *Code-e-Manipal Hackathon Project*

---

## 1. Project Identity and Objective

**Anvik 2.0** is an interactive, government-grade financial crime decision-support system designed to detect, explore, and disrupt coordinated UPI fraud syndicates across interconnected financial entities (accounts, devices, collect requests, merchants, and complaints).

Anvik constructs high-fidelity transaction network topologies to surface explainable, evidence-backed transaction clusters, multi-hop structuring flows, hardware device farms, and counterfactual simulation insights for cybercrime investigators, banking fraud desks, and law enforcement agencies (LEAs).

> [!IMPORTANT]
> **Investigative Decision Support Only**: Anvik is an analytical aid for human investigators, not an automated system for declaring individuals guilty. Suspicious alerts, shared hardware links, and graph anomalies represent deterministic investigative leads, not automated legal proof of wrongdoing.

> [!NOTE]
> **Synthetic Data Policy**: Anvik exclusively operates on synthetic transaction datasets. It does not connect to real banking infrastructure, live payment switches, or personal financial records.

---

## 2. Key Architecture & Features

### 1. Government-Grade Financial Crime Network Graph (`NetworkGraphCanvas.tsx`)
- **Visual Hierarchy & Canvas Style**:
  - Crisp Warm Ivory / Editorial Off-White surface (`#FBF9F4`) with a subtle 20px faint slate dot-grid (`#E2DFD7` at 40% opacity).
  - Floating canvas controls for **Zoom In (+)**, **Zoom Out (-)**, and **Fit-to-Screen / Recenter**.
  - Top sub-header: `TRANSACTION NETWORK / UPI NETWORK / Evidence map` with a live entity counter badge (`• 9 entities · 9 relationships`).
  - Fixed bottom legend bar with minimalist glyph markers:
    `[○ UPI account]   [▢ Device]   [○ Collect request]   [○ Potential mule]`
- **Custom Node Topologies**:
  - **UPI Account Node**: 48px circular white badge with solid 2px Emerald/Teal ring (`#007065`), centered user silhouette glyph, entity role in bold 11px slate-800 (`Origin account`, `Linked account`), and VPA handle (`ananya-42@upi`, `priya-18@okhdfc`).
  - **Device Node**: 42px × 52px rounded rectangle (`rx: 10px`) in `#F8FAFC` with 1.5px border (`#94A3B8`), smartphone glyph, and hardware token (`DEV-7F3A9C`, `DEV-208101`).
  - **Collect Request Node**: 48px × 48px rounded square (`rx: 12px`) in warm amber (`#FEF3C7`) with 1.5px amber stroke (`#D97706`), bidirectional transfer arrows (⇅), and reference code (`COL-008412`).
  - **Potential Mule Account Node**: 50px circular badge in soft rose (`#FFF1F2`) with 2px Coral/Crimson ring (`#E11D48`), bank/ATM card glyph, role text in rose-700 (`Potential mule`), and VPA handle (`ravi-18@ybl`, `kiran-913@paytm`, `vikram-55@sbi`, `deepak-77@icici`).
- **Edge Dynamics & Money Flow Motion**:
  - **Transaction Transfer Edges**: Solid curved bezier lines in teal (`#007065`, 2px stroke) with directional arrowheads, rounded white pill labels showing exact amounts (`₹24,500`, `₹16,000`, `₹7,800`, `₹7,500`), and continuous 3px glowing circular particles streaming at 1.5s intervals via hardware-accelerated SVG `<animateMotion>`.
  - **Device Association Edges**: Dashed curved gray lines (`#94A3B8`, `stroke-dasharray: "4 4"`) animated with continuous flowing stroke-dashoffset motion.
- **Interactive Focus States**:
  - **Hover Micro-Card**: Scale effect (1.08x) with soft shadow displaying node type, identifier, active connection count, and activity timestamp.
  - **Click Isolation**: Selecting any node isolates its direct 1st-degree upstream and downstream relationships, dimming unselected nodes and unconnected edges to 20% opacity. Clicking empty canvas restores full visibility.

### 2. Transaction Timeline Integration (`TransactionTimelineBar.tsx`)
- Positioned flush beneath the graph canvas in a dedicated card.
- **Controls**: Reset (↺), Play/Pause (▷ / ||), and active IST time ticker (`09:32:00` → `09:34:45`).
- **Interactive Scrubber**: Full-width track with played section filled in teal (`#007065`), interactive thumb, and 5 timestamp scale markers (`09:32:00`, `09:32:41`, `09:33:22`, `09:34:03`, `09:34:45`).
- **Motion Synchronization**: Scrubbing or playing the timeline reveals transactions chronologically. Nodes and transfer edges scale in dynamically as the scrubber passes their timestamp.
- **Legal Footnote**: `🛡️ Risk informs judgement. It does not replace it.`

### 3. Investigation Insights Rail (`InvestigationInsightsRail.tsx`)
- Reserved 20%–25% right-hand rail.
- **Selected Node Dossier Inspector**: Role badge, VPA / Hardware fingerprint, bank name, anomaly risk meter (0–100), and 1st-degree incident linkages.
- **Counterfactual Simulation**: "Simulate Immediate Freeze" button to model cluster disruption by severing compromised accounts.
- **Network Overview KPIs**: Aggregated Disputed Volume (₹48,300), Structuring Velocity (< 3 mins), Identified Mules (3), and Shared Hardware Farm (1).
- **Explainable Detection Signals**:
  1. `RAPID_DISPERSION_CHURN`: Aggregator `ravi-18@ybl` split ₹23,800 across 2 secondary mules in 41 seconds.
  2. `DEVICE_COLLUSION_FARM`: Physical device `DEV-7F3A9C` authenticated across 3 distinct mule VPAs.
  3. `COLLECT_REQUEST_DRAIN`: Collect request `COL-008412` initiated without standard user 2FA delay.

### 4. Comprehensive Forensic Report Generator (`reportGenerator.ts`)
- One-click **"Download Report"** button available in the top navigation bar, the graph toolbar, and the summary drawer.
- Captures high-resolution canvas snapshot of the network graph.
- Generates a standalone, courtroom-grade HTML forensic dossier containing:
  - Incident synopsis & executive classification (`INV-2026-084`).
  - High-res embedded graph topology image with visual legend.
  - Quantitative KPI metrics table.
  - Complete 11-entity suspect registry and risk scoring breakdown.
  - Multi-hop transaction ledger with UTRs and detection heuristics.
  - NCRP dispute complaints register.
  - Actionable LEA and PSP banking directives (Section 91 CrPC, NPCI central switch freeze, IMEI blacklisting, and merchant settlement hold).
  - Print-ready CSS for direct 1-click A4 PDF export (`window.print()`).

---

## 3. Technology Stack

### Frontend (Active)
- **Framework & Language**: React 18 / TypeScript
- **Tooling & Build**: Vite
- **Styling**: Tailwind CSS
- **Visualization**: Custom SVG / Canvas Network Engine + Cytoscape.js
- **Icons**: Lucide React
- **State & Storage**: React Context + LocalStorage persistence for complaints

### Backend & Detection Engine (Sole Owner: Bharath K)
- **Language & Runtime**: Python 3.11+
- **API Framework**: FastAPI, Uvicorn, Pydantic
- **Database & Persistence**: PostgreSQL, SQLAlchemy, Alembic
- **Graph Engine & Heuristics**: NetworkX, Pandas, NumPy
- **Testing**: pytest, HTTPX

---

## 4. Current Development Status

**Status: Phase 4 & Phase 5 Active — Interactive Frontend & Detection UI Complete.**

- Interactive 9-entity / 9-relationship government-grade financial network live.
- Chronological timeline scrubber with motion sync live.
- Investigation Insights rail with entity dossiers, risk gauges, and counterfactual freeze live.
- Automated forensic report generator (HTML + PDF) live.
- Next steps: Full integration with Bharath's backend detection microservices and PostgreSQL graph persistence.

---

## 5. Team Ownership & Responsibilities

Anvik follows a strict 6-member team ownership structure:

| Member | Domain & Ownership | Key Responsibilities |
| :--- | :--- | :--- |
| **Member 1** | **Frontend UI/UX** | Application layout, breadcrumbs, complaints panels, filter drawers, responsive UI. |
| **Member 2** | **Graph Visualization** | Graph topology modeling, SVG/Canvas network rendering, edge bezier calculations, node animations. |
| **Member 3 (Bharath)** | **Backend & Detection Engine** | **Sole owner of backend.** FastAPI endpoints, PostgreSQL schema, NetworkX graph engine, heuristic scoring, counterfactual analysis. |
| **Member 4** | **Data Engineering & QA** | Synthetic transaction datasets, ground-truth fraud patterns, benchmark test suites. |
| **Member 5** | **Integration & Case Management** | End-to-end API integration, case files, complaint persistence, deployment coordination. |
| **Member 6** | **Demo & Presentation** | Demonstration scenarios, pitch slides, architecture diagrams, final rehearsals. |

---

## 6. Quickstart & Installation

### Prerequisites
- Node.js (v18+)
- npm / yarn / pnpm

### Running the Frontend
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will launch at:
- **Local:** [http://localhost:3000](http://localhost:3000)
- **Network:** Available across local LAN

### Building for Production
```bash
cd frontend
npm run build
```
Generates a minified, production-ready static bundle in `frontend/dist/`.

---

## 7. License & Compliance
Developed for the **Code-e-Manipal Hackathon**. All datasets, identifiers, names, phone numbers, and bank account numbers are purely synthetic and generated exclusively for investigative simulation and educational demonstrations.
