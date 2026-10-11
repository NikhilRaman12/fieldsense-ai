---
title: FieldSense AI: Step Outside, Observe Deeply — Open-Source Multi-Agent Field Discovery for the Real World
published: true
tags: devchallenge, hf26challenge
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*

---

## What I Built

Most modern plant apps encourage the opposite of being present: you snap a photo, stare at a loading spinner, receive a confident but hallucinated diagnosis like *"99% Late Blight"*, and spend the next 20 minutes doom-scrolling chemical remedies.

**FieldSense AI** flips this paradigm on its head.

FieldSense AI is an open-source, evidence-based field companion built for hikers, community gardeners, urban foragers, and botanical field observers. Its philosophy is simple: **Step outside. Observe deeply. Let AI guide the discovery—not replace it.** The screen is deliberately designed to be the *shortest* part of your outdoor experience.

```
       [ Step Outside into Nature ]
                   │
                   ▼
  1. Quick Field Observation (Photo + Habitat)
                   │
                   ▼
  2. Open-Source Multi-Agent Investigation
     (Vision → Context → Knowledge → Hypothesis → Field-Test → Review)
                   │
                   ▼
  3. Physical Field Test Prescription
     ("Touch the soil 2 inches deep", "Check leaf underside with magnifying lens")
                   │
                   ▼
       [ Back to Touching Grass! ]
```

Instead of dispensing premature pronouncements from an isolated photo, FieldSense AI functions like a seasoned field ecologist walking beside you:
1. **It acknowledges uncertainty**: It clearly delineates directly observed facts from plausible hypotheses.
2. **It prescribes safe, hands-on field tests**: Rather than guessing, it directs you to touch the soil 2 inches down, check stem rigidity, or inspect the underside of leaves for spores or webbing.
3. **It operates anywhere on Earth**: Thanks to local inference and an offline botanical evidence engine, it functions deep in state parks, rural trails, or dense forest canopies with **zero internet or cell signal**.

---

## Demo

- **Live Local Experience**: Run with a single command via Vite (`npm run dev`) and Python (`python main.py`).
- **Codebase & Architecture Walkthrough**: Full repository with interactive React 19 interface, FastAPI backend, and LangGraph multi-agent pipeline is documented at [github.com/NikhilRaman12/fieldsense-ai](https://github.com/NikhilRaman12/fieldsense-ai).
- **Core Interface Views**:
  - 🌿 **Mission**: Outdoor observation ethos and minimal-screen guidance.
  - 🔍 **Field Observer**: Real-time evidence collection, agent execution trace, and structured Field Investigation Reports.
  - 📖 **Field Journal**: Local observation history with geolocation and photo logs.
  - 📚 **Field Guide**: Verified botanical symptoms, differential diagnoses, and hands-on physical verification techniques.
  - ⚙️ **Settings & Transparency**: Active AI engine indicator (LangGraph + Ollama vs. Offline Botanical Engine), source transparency, and model configuration.

---

## Code

{% github NikhilRaman12/fieldsense-ai %}

The repository is fully open-source under the MIT license:
- **Repository URL**: [https://github.com/NikhilRaman12/fieldsense-ai](https://github.com/NikhilRaman12/fieldsense-ai)
- **Tech Stack**:
  - **Frontend**: React 19, TypeScript, Lucide Icons, Vite
  - **Multi-Agent Backend**: Python 3.11+, LangGraph, FastAPI, Pydantic
  - **Local Model Runtime**: Ollama (Llama 3.2 / Qwen 2.5 / Mistral)
  - **Offline Fallback**: Deterministic Botanical Evidence Synthesis Graph

---

## How I Built It

FieldSense AI is architected around an open-source AI core that respects the constraints of the outdoor environment.

```
                     ┌───────────────────────────────────────┐
                     │         User Field Observation         │
                     │ (Visual input, symptoms, soil context) │
                     └──────────────────┬────────────────────┘
                                        │
                                        ▼
                     ┌───────────────────────────────────────┐
                     │          FastAPI Gateway             │
                     │      Validates Field Input State      │
                     └──────────────────┬────────────────────┘
                                        │
                                        ▼
                     ┌───────────────────────────────────────┐
                     │     LangGraph Multi-Agent Engine      │
                     │                                       │
                     │  ┌──────────────┐   ┌──────────────┐  │
                     │  │ Vision Agent │ → │Context Agent │  │
                     │  └──────────────┘   └──────────────┘  │
                     │         │                  │          │
                     │         ▼                  ▼          │
                     │  ┌──────────────┐   ┌──────────────┐  │
                     │  │Knowledge Ag. │ → │Hypothesis Ag.│  │
                     │  └──────────────┘   └──────────────┘  │
                     │         │                  │          │
                     │         ▼                  ▼          │
                     │  ┌──────────────┐   ┌──────────────┐  │
                     │  │Field-Test Ag.│ → │ Review Agent │  │
                     │  └──────────────┘   └──────────────┘  │
                     └──────────────────┬────────────────────┘
                                        │
            ┌───────────────────────────┴───────────────────────────┐
            ▼                                                       ▼
┌───────────────────────────────┐       ┌───────────────────────────────────────┐
│     Ollama (Open-Weight)      │       │     Offline Botanical Engine          │
│ Local Llama 3.2 / Qwen 2.5    │       │ Deterministic Rule Graph + Knowledge  │
│ Zero-cloud inference on trail │       │ Instant evaluation without battery/net│
└───────────────────────────────┘       └───────────────────────────────────────┘
                                        │
                                        ▼
                     ┌───────────────────────────────────────┐
                     │     Field Investigation Report        │
                     │ • Directly Observed Facts             │
                     │ • Competing Hypotheses & Evidence     │
                     │ • Uncertainty & Knowledge Citations   │
                     │ • Next Physical Field Test            │
                     └───────────────────────────────────────┘
```

### The Specialist Agents (LangGraph `StateGraph`)
Instead of a monolithic prompt, FieldSense coordinates 6 focused specialist nodes sharing a unified `InvestigationState`:

1. **Vision Agent**: Extracts macroscopic visual markers (interveinal chlorosis, marginal scorch, concentric ring lesions, powdery white residue).
2. **Context Agent**: Ingests environmental telemetry—soil drainage, recent temperature extremes, watering cadence, and planting container type.
3. **Knowledge Agent**: Matches observations against botanical field indices (citing verified horticultural extension bulletins and pathology databases).
4. **Hypothesis Agent**: Formulates differential diagnoses rather than jumping to a single conclusion (e.g., contrasting *Nutrient Lockout due to pH* vs. *Root Rot due to Overwatering*).
5. **Field-Test Agent**: Dynamically generates practical, physical tests the user can immediately perform with their hands, pocketknife, or hand lens.
6. **Review & Synthesis Agent**: Computes an evidence-to-uncertainty ratio and generates the structured investigation report.

---

## Why Does Open Innovation Matter?

FieldSense AI is proof of why open AI is essential for applications connecting people to the physical world:

### 1. The Wilderness Has No Cell Towers
Proprietary cloud APIs (OpenAI, Claude, Gemini) are useless at mile 6 of a mountain trail or in a rural community garden with zero connectivity. By running open-weight models via **Ollama** or dropping cleanly to our deterministic offline botanical graph, FieldSense AI works identically on an airplane, in the backcountry, or during power outages.

### 2. Zero-Cost, Community-Owned Agriculture
Smallholder gardeners, permaculture students, and grassroots nature conservancies cannot afford $0.03 per-API-call billing meters to monitor their crops. FieldSense AI is 100% free, runs on consumer hardware (MacBook, Linux mini-PC, or local laptop), and costs nothing to operate indefinitely.

### 3. Absolute Privacy & Geolocation Protection
Foraging spots, rare native plant coordinates, and private farm yields should never be uploaded to third-party corporate servers for model retraining. With local open AI, all images, coordinates, and journal entries remain strictly in local storage on the user's device.

### 4. Transparent, Auditable Botanical Logic
Commercial black-box vision classifiers notoriously hallucinate fungal diseases when confronted with normal seasonal senescing. With open-source LangGraph workflows, every node's reasoning, evidence attribution, and uncertainty thresholds are completely inspectable, forkable, and improvable by the scientific community.

---

## Taking It Outside: A Real Field Test

During our field testing session in an urban garden plot, we observed severe chlorosis on *Solanum lycopersicum* (early-season tomato) lower leaves:

- **What a standard closed app did**: Declared *"Early Blight (98% confidence)"* from a single photograph, suggesting immediate chemical fungicide spraying.
- **What FieldSense AI did**:
  1. Correctly identified that yellowing was restricted to older leaves with no concentric rings (contradicting Early Blight).
  2. Noted recent heavy rainfall from habitat context.
  3. **Prescribed a hands-on field test**: *"Dig 2–3 inches into the root zone with your fingers. Check if soil is waterlogged and smell the soil for sour anaerobic odors. If muddy, test soil nitrate or allow drying before applying any treatment."*
  4. The user tested the soil: it was completely saturated clay. The issue was temporary nitrogen leeching due to overwatering, not blight! No fungicide needed; the tomato plants recovered in 5 days after drainage was improved.

**FieldSense AI kept the user engaged with the soil, not glued to a screen.**

---

## Prize Categories
- **Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass**
- **Open-Weight / Local Inference Track**
