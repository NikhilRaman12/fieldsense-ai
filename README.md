# 🌿 FieldSense AI

**Step outside. Observe deeply. Let AI guide the discovery—not replace it.**

> *A genuinely useful, fully open-source field-science application that encourages people to leave their screens, explore the outdoors, observe nature, and record discoveries. The actual outdoor activity is the main experience; the AI supports it rather than replace it.*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.41-FF4B4B?logo=streamlit)](https://streamlit.io/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.6-orange)](https://langchain-ai.github.io/langgraph/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688)](https://fastapi.tiangolo.com/)
[![Ollama](https://img.shields.io/badge/Ollama-local%20AI-purple)](https://ollama.com/)

---

## ⚡ Free 1-Click Deployment (Streamlit Community Cloud)

You can deploy FieldSense AI for free in 30 seconds on **[Streamlit Community Cloud](https://share.streamlit.io/)**:
1. Fork or open repository: `https://github.com/NikhilRaman12/fieldsense-ai`
2. Go to **[share.streamlit.io](https://share.streamlit.io/)** and click **New app**.
3. Select this repository, branch `main`, and main file path `app.py`.
4. Click **Deploy!** — Your public demo link will be live at `https://fieldsense-ai.streamlit.app`!


## 🎯 What FieldSense Does

A user visits a garden, farm, park, or natural habitat and **collects field observations**. The AI coordinates 6 specialist agents to investigate possible explanations, identify missing evidence, and recommend the next *physical outdoor test*—not jump straight to a diagnosis.

**Example:** A user notices yellowing leaves on a plant. Rather than declaring a nutrient deficiency from one photograph, FieldSense asks about the pattern, affected leaves, soil moisture, and recent weather. It then separates observed evidence from competing hypotheses.

### The 5-Step Investigation Workflow

```
1. User provides field evidence
   → Plant photo + symptoms + growing conditions

2. FastAPI receives the investigation
   → Validates input, initializes shared LangGraph state

3. LangGraph orchestrates 6 specialist agents
   → Vision Agent:      What is visible?
   → Context Agent:     What else do we know?
   → Knowledge Agent:   What do sources say?
   → Hypothesis Agent:  What could explain it?
   → Field-Test Agent:  What should we check?
   → Review Agent:      Is the evidence sufficient?
   Decision: Needs more evidence? → Ask user → Resume
             Sufficient? → Synthesize report

4. Structured Field Investigation Report
   → Observed facts · Competing hypotheses · Evidence matrix
   → Uncertainty score · Next safe field test

5. User saves report to local Field Journal
   → IndexedDB persistence, offline-first
```

---

## 🤖 Open AI Stack

| Component | Role | Notes |
|-----------|------|-------|
| **Gemma 3** (via Ollama) | Primary reasoning model | Runs 100% locally on CPU/GPU |
| **Ollama** | Local model runtime | `ollama pull gemma3` |
| **LangGraph** | Multi-agent orchestration | 6 specialist agents in sequence |
| **FastAPI** | Backend API gateway | Validates inputs, coordinates agents |

### 3-Tier Fallback (Honesty by Design)

```
TIER 1: FastAPI + LangGraph  (port 8000 running)
  └─ 6 specialist agents with scientific knowledge index
TIER 2: Ollama + Gemma 3     (Ollama daemon running)
  └─ Open-weight LLM with structured JSON prompt
TIER 3: Offline Rule Engine  (ALWAYS available)
  └─ Deterministic botanical heuristics — NOT an LLM.
     Clearly labeled "Guided Mode" in UI.
     We NEVER pretend rule-based output came from an AI.
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Ollama** — [download from ollama.com](https://ollama.com)

### 1. Clone the Repository

```bash
git clone https://github.com/NikhilRaman12/fieldsense-ai.git
cd fieldsense-ai
```

### 2. Start the Backend (FastAPI + LangGraph)

```bash
cd backend
pip install -r requirements.txt
python main.py
# → Listening at http://127.0.0.1:8000
```

### 3. Start the Frontend (React + Vite)

```bash
cd ..
npm install
npm run dev
# → Open http://localhost:5173
```

### 4. (Optional) Install Gemma 3 via Ollama

```bash
ollama pull gemma3
# Then open AI Settings tab in the app and click "Test Local AI Service"
```

The app works fully in **Offline Guided Mode** even without Ollama or the Python backend.

---

## 🗂️ Project Structure

```
fieldsense-ai/
├── backend/                    # Python FastAPI + LangGraph backend
│   ├── main.py                 # FastAPI app, CORS, /api/investigate endpoint
│   ├── schemas.py              # Pydantic input/output schemas
│   ├── investigation_graph.py  # LangGraph 6-agent workflow
│   ├── knowledge_index.json    # Local curated scientific knowledge base
│   └── requirements.txt
│
├── src/                        # React/TypeScript frontend
│   ├── components/
│   │   ├── AIObserverView.tsx  # Main investigation form + report renderer
│   │   ├── MissionView.tsx     # Outdoor field mission cards & timer
│   │   ├── FieldJournalView.tsx# Local journal with Dexie/IndexedDB
│   │   ├── ScorecardView.tsx   # Outdoor activity stats & streaks
│   │   └── SettingsView.tsx    # Ollama URL + model configuration
│   ├── services/
│   │   ├── fastapiService.ts   # FastAPI integration + response mapping
│   │   ├── ollama.ts           # Ollama health check + LLM client
│   │   └── offlineObserver.ts  # Deterministic rule engine (no LLM)
│   ├── data/missions.ts        # 5 curated outdoor field mission templates
│   ├── db/index.ts             # Dexie IndexedDB schema
│   └── types/index.ts          # TypeScript domain types
│
├── public/                     # PWA manifest, service worker, icons
├── package.json
└── vite.config.ts
```

---

## 🔬 Scientific Knowledge Sources

The local knowledge index (`backend/knowledge_index.json`) cites:

| ID | Topic | Domain |
|----|-------|--------|
| KB-CHL-001 | Nitrogen vs Magnesium Mobile Nutrient Translocation | Plant Physiology & Agronomy |
| KB-ROOT-002 | Root Zone Anoxia & Impaired Active Transport (Waterlogging) | Soil Physics & Plant Respiration |
| KB-PATH-003 | Vascular Wilt Pathogens (Fusarium & Verticillium) | Plant Pathology |
| KB-MET-004 | Photo-Inhibition & Meteorological Thermal Shock | Ecophysiology |

All passages are paraphrased from published agronomic and ecological literature. No diagnoses are made—only competing hypotheses with evidence matrices.

---

## 🧪 Testing

```bash
npm test
# → 13/13 unit tests pass (Vitest + Testing Library + fake-indexeddb)
```

---

## ✅ Evidence & Safety Principles

- **No hasty diagnoses** — FieldSense always presents *competing* hypotheses
- **Evidence vs. inference** — Every report separates what was *observed* from what is *deduced*
- **Uncertainty is explicit** — Every report shows `low / moderate / high` confidence with rationale
- **Offline fallback is honest** — Rule-based guidance is clearly labeled, never passed off as AI
- **Privacy-first** — All data stays on your device. No accounts. No telemetry.

---

## 📜 License

MIT — see [LICENSE](LICENSE)

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome for new mission templates, knowledge index entries, and language support.
