import os
import sys
import json
import base64
from datetime import datetime
from io import BytesIO
from typing import Dict, Any, List

import streamlit as st
from PIL import Image

# Ensure backend directory is in python path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

try:
    from backend.investigation_graph import run_field_investigation
    from backend.schemas import FieldEvidenceInput
except ImportError:
    # Direct import fallback if cwd is backend or root
    from investigation_graph import run_field_investigation
    from schemas import FieldEvidenceInput

# Page Configuration
st.set_page_config(
    page_title="FieldSense AI — Outdoor Discovery & Field Observation",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling for Premium Aesthetics
st.markdown("""
<style>
    /* Emerald & Botanical Dark Palette */
    :root {
        --primary-emerald: #10b981;
        --emerald-dark: #064e3b;
        --emerald-light: #d1fae5;
        --earth-amber: #f59e0b;
        --slate-bg: #0f172a;
    }
    
    .main-header {
        background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%);
        padding: 1.8rem 2rem;
        border-radius: 14px;
        margin-bottom: 1.5rem;
        border: 1px solid rgba(16, 185, 129, 0.2);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    
    .main-header h1 {
        color: #ffffff;
        font-size: 2.2rem;
        font-weight: 700;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.6rem;
    }
    
    .tagline {
        color: #6ee7b7;
        font-size: 1.05rem;
        font-weight: 500;
        margin-top: 0.4rem;
    }

    .mission-banner {
        background: rgba(16, 185, 129, 0.08);
        border-left: 4px solid #10b981;
        padding: 1rem 1.25rem;
        border-radius: 0 10px 10px 0;
        margin-bottom: 1.5rem;
    }

    .report-card {
        background: #1e293b;
        border-radius: 12px;
        padding: 1.25rem;
        margin-bottom: 1rem;
        border: 1px solid #334155;
    }

    .field-test-box {
        background: linear-gradient(135deg, #14532d 0%, #1e293b 100%);
        border: 2px solid #22c55e;
        border-radius: 12px;
        padding: 1.2rem;
        margin-top: 1rem;
        box-shadow: 0 4px 15px rgba(34, 197, 94, 0.15);
    }

    .evidence-badge {
        display: inline-block;
        padding: 0.25rem 0.6rem;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        margin-right: 0.5rem;
    }

    .badge-support {
        background-color: rgba(34, 197, 94, 0.2);
        color: #4ade80;
        border: 1px solid #22c55e;
    }

    .badge-contradict {
        background-color: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid #ef4444;
    }

    .badge-test {
        background-color: rgba(245, 158, 11, 0.2);
        color: #fbbf24;
        border: 1px solid #f59e0b;
    }
</style>
""", unsafe_allow_html=True)

# Initialize Session State
if "journal" not in st.session_state:
    st.session_state.journal = [
        {
            "id": "obs-1",
            "timestamp": "2026-10-10 14:30",
            "plant_name": "Tomato (Solanum lycopersicum)",
            "observation": "Lower basal foliage showing yellowing; upper growth remains deep green.",
            "top_hypothesis": "Root Zone Anoxia / Waterlogging (Impaired Aerobic Respiration)",
            "test_done": "Fingertip soil depth check (waterlogged clay confirmed)",
            "status": "Resolved — Drainage improved, no fungicide needed"
        }
    ]

if "last_report" not in st.session_state:
    st.session_state.last_report = None

if "clarifying_answers" not in st.session_state:
    st.session_state.clarifying_answers = {}

# Header
st.markdown("""
<div class="main-header">
    <h1>🌿 FieldSense AI</h1>
    <div class="tagline">Step outside. Observe deeply. Let AI guide the discovery—not replace it.</div>
</div>
""", unsafe_allow_html=True)

# Sidebar Navigation
with st.sidebar:
    st.image("https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=500&q=80", use_container_width=True)
    st.markdown("### 🧭 Field Navigation")
    menu = st.radio(
        "Choose View:",
        ["🔍 Field Observer", "🌱 Mission & Touch Grass", "📖 Field Journal", "📚 Botanical Guide", "⚙️ Open AI Architecture"],
        index=0
    )
    
    st.divider()
    st.markdown("### 🛰️ AI Engine Status")
    st.success("🟢 LangGraph Multi-Agent Engine: Active")
    st.info("📦 Open Models: Llama 3.2 / Qwen 2.5 via Ollama + Offline Knowledge Graph")
    st.caption("Zero cloud dependency required on trails or remote fields.")

# VIEW 1: FIELD OBSERVER
if menu == "🔍 Field Observer":
    st.markdown("""
    <div class="mission-banner">
        <strong>Outdoor Rule:</strong> Don't just stare at the screen! Inspect the physical specimen with your senses—leaf textures, soil depth, stem firmness, and distribution.
    </div>
    """, unsafe_allow_html=True)

    col1, col2 = st.columns([1, 1], gap="large")

    with col1:
        st.subheader("1. Record Field Evidence")
        
        obs_text = st.text_area(
            "What do you directly see? (Visual symptoms)",
            value="Lower leaves turning distinctly yellow between the veins. Upper leaves are green and healthy.",
            placeholder="Describe foliar color, spot patterns, leaf positions...",
            help="Describe what you see without jumping to conclusions."
        )

        uploaded_img = st.file_uploader(
            "Attach Field Photograph (Optional)",
            type=["jpg", "jpeg", "png"],
            help="Take a clear macro photo of affected leaves or stems."
        )

        if uploaded_img:
            img = Image.open(uploaded_img)
            st.image(img, caption="Attached Field Specimen", use_container_width=True)

        st.markdown("#### Growing Context & Habitat")
        
        c_part, c_moist = st.columns(2)
        with c_part:
            affected_part = st.selectbox(
                "Affected Leaf Position",
                ["Lower/Basal (Oldest leaves)", "Upper/Terminal (Newest growth)", "Uniformly throughout", "Single side/Branch"],
                index=0
            )
        with c_moist:
            soil_moist = st.selectbox(
                "Substrate Moisture",
                ["Waterlogged / Saturated", "Moist, well-draining", "Dry / Dusty", "Compacted clay"],
                index=0
            )

        c_weather, c_spread = st.columns(2)
        with c_weather:
            weather = st.selectbox(
                "Recent Weather History",
                ["Recent heavy rains", "High heat & intense sun", "Sudden cold snap", "Normal / Mild"],
                index=0
            )
        with c_spread:
            spread = st.selectbox(
                "Spread Extent",
                ["Single isolated plant", "Multiple neighboring plants", "Entire crop row / bed"],
                index=1
            )

        habitat = st.text_input("Ecological Habitat", value="Raised vegetable bed, outdoor garden plot")

        # Interactive Clarifying Answer if requested previously
        user_qa = {}
        if st.session_state.last_report and st.session_state.last_report.get("clarifying_question_for_user"):
            q_text = st.session_state.last_report["clarifying_question_for_user"]
            st.warning(f"🤔 **Clarifying Question from Review Agent:** {q_text}")
            user_response = st.text_input("Your Field Observation Answer:", key="clarifying_input")
            if user_response:
                user_qa[q_text] = user_response

        run_btn = st.button("🚀 Coordinate Agents & Investigate", type="primary", use_container_width=True)

    with col2:
        st.subheader("2. Structured Field Report")

        if run_btn:
            with st.spinner("LangGraph coordinating 6 specialist agents (Vision → Context → Knowledge → Hypothesis → Field-Test → Review)..."):
                # Prepare base64 image if present
                img_b64 = None
                if uploaded_img:
                    buffered = BytesIO()
                    img.save(buffered, format="JPEG")
                    img_b64 = base64.b64encode(buffered.getvalue()).decode()

                # Build input model
                evidence_input = FieldEvidenceInput(
                    observation_text=obs_text,
                    image_base64=img_b64,
                    affected_parts=affected_part,
                    soil_moisture=soil_moist,
                    recent_weather=weather,
                    spread_extent=spread,
                    habitat_context=habitat,
                    user_answered_questions=user_qa
                )

                # Execute multi-agent graph
                report_obj = run_field_investigation(evidence_input)
                report_data = report_obj.model_dump()
                st.session_state.last_report = report_data

        if st.session_state.last_report:
            rep = st.session_state.last_report

            # Confidence & Uncertainty Header
            conf_color = "green" if rep["system_confidence"] == "high" else "orange" if rep["system_confidence"] == "moderate" else "red"
            st.markdown(f"""
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; padding: 0.8rem; margin-bottom: 1rem;">
                <strong>Investigation Confidence:</strong> <span style="color: {conf_color}; font-weight: bold; text-transform: uppercase;">{rep['system_confidence']}</span><br/>
                <small style="color: #cbd5e1;">{rep['confidence_rationale']}</small>
            </div>
            """, unsafe_allow_html=True)

            # Observed Facts
            with st.expander("👁️ Directly Observed Facts (Vision & Context Agents)", expanded=True):
                for fact in rep.get("observed_facts", []):
                    st.markdown(f"- **Visual:** {fact}")
                for fact in rep.get("context_facts", []):
                    st.markdown(f"- **Context:** {fact}")

            # Competing Hypotheses
            st.markdown("#### ⚖️ Competing Hypotheses")
            for hyp in rep.get("competing_hypotheses", []):
                plaus = hyp.get("plausibility", "possible").upper()
                badge_style = "badge-support" if plaus == "LIKELY" else "badge-test"
                st.markdown(f"""
                <div class="report-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong>{hyp['name']}</strong>
                        <span class="evidence-badge {badge_style}">{plaus}</span>
                    </div>
                """, unsafe_allow_html=True)
                
                if hyp.get("supporting_evidence"):
                    for sup in hyp["supporting_evidence"]:
                        st.markdown(f"- <span class='evidence-badge badge-support'>SUPPORT</span> {sup}", unsafe_allow_html=True)
                if hyp.get("contradicting_evidence"):
                    for con in hyp["contradicting_evidence"]:
                        st.markdown(f"- <span class='evidence-badge badge-contradict'>CONTRADICT</span> {con}", unsafe_allow_html=True)
                if hyp.get("missing_distinguishing_clue"):
                    st.markdown(f"<small style='color: #94a3b8;'><strong>Missing Clue:</strong> {hyp['missing_distinguishing_clue']}</small>", unsafe_allow_html=True)
                
                st.markdown("</div>", unsafe_allow_html=True)

            # Prescribed Hands-on Field Tests (Touch Grass Theme)
            st.markdown("#### 🧤 Step Outside & Verify (Next Safe Physical Tests)")
            for test in rep.get("discriminating_tests", []):
                st.markdown(f"""
                <div class="field-test-box">
                    <div style="color: #4ade80; font-weight: 700; font-size: 1.1rem; margin-bottom: 0.4rem;">
                        👉 Action: {test['recommended_action']}
                    </div>
                    <div style="color: #e2e8f0; font-size: 0.95rem; margin-bottom: 0.4rem;">
                        <strong>What to look for:</strong> {test['what_to_look_for']}
                    </div>
                    <div style="color: #94a3b8; font-size: 0.85rem;">
                        <em>Target Comparison:</em> {test['target_hypotheses']} | <em>Safety:</em> {test.get('risk_or_impact', 'Safe')}
                    </div>
                </div>
                """, unsafe_allow_html=True)

            # Scientific Citations
            if rep.get("retrieved_knowledge"):
                with st.expander("📚 Scientific Literature Citations (Knowledge Agent)"):
                    for doc in rep["retrieved_knowledge"]:
                        st.markdown(f"**[{doc.get('source_id', 'REF')}] {doc.get('topic', '')}**")
                        st.caption(f"{doc.get('citation', '')}: {doc.get('passage', '')}")

            # Save to Journal Action
            st.divider()
            if st.button("💾 Save Observation to Field Journal", use_container_width=True):
                top_hyp = rep["competing_hypotheses"][0]["name"] if rep.get("competing_hypotheses") else "Unknown"
                st.session_state.journal.append({
                    "id": f"obs-{len(st.session_state.journal) + 1}",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "plant_name": "Field Specimen",
                    "observation": obs_text[:80] + ("..." if len(obs_text) > 80 else ""),
                    "top_hypothesis": top_hyp,
                    "test_done": rep["discriminating_tests"][0]["recommended_action"] if rep.get("discriminating_tests") else "None",
                    "status": "In Progress"
                })
                st.success("✅ Saved to your local Field Journal!")
        else:
            st.info("👈 Fill out your field evidence on the left and click **'Coordinate Agents & Investigate'** to generate a report.")

# VIEW 2: MISSION & TOUCH GRASS
elif menu == "🌱 Mission & Touch Grass":
    st.subheader("🌾 Touch Grass Philosophy")
    st.markdown("""
    ### Why We Built FieldSense AI
    Modern technology often pulls us into endless feeds. Even nature apps tend to reduce living ecosystems to a 2-second camera snapshot and a premature diagnosis that sends people straight to the checkout page for synthetic chemicals.

    **FieldSense AI is designed to do the exact opposite:**
    - **Screen time is the shortest part**: Log your observation in 30 seconds, get directed back to the soil, and spend 15 minutes physically examining leaf structures, soil moisture, and root health.
    - **Evidence over Diagnosis**: Real scientists don't declare plant diseases from one angle. We weigh competing explanations and verify them through physical tests.
    - **100% Open & Local**: Whether you're on a remote backcountry trail or a community garden with no Wi-Fi, FieldSense AI runs locally without subscriptions or cloud tracking.
    """)

    col_a, col_b, col_c = st.columns(3)
    with col_a:
        st.markdown("""
        #### 1. Observe Deeply
        Look at whole plants, not just spots. Check leaf underside, soil dampness, and whether neighboring weeds share the symptoms.
        """)
    with col_b:
        st.markdown("""
        #### 2. Touch the Soil
        Don't guess moisture from appearance. Dig 2-3 inches with your fingers and perform a ribbon test to gauge aeration and texture.
        """)
    with col_c:
        st.markdown("""
        #### 3. Respect Uncertainty
        Know what is truly observed vs what is merely possible. Avoid premature spraying or over-fertilizing.
        """)

# VIEW 3: FIELD JOURNAL
elif menu == "📖 Field Journal":
    st.subheader("📓 Your Outdoor Field Journal")
    st.markdown("Track and revisit physical observations recorded in your gardens, parks, and trails.")

    if st.session_state.journal:
        for item in reversed(st.session_state.journal):
            with st.container():
                st.markdown(f"""
                <div class="report-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="margin: 0; color: #34d399;">{item['plant_name']}</h4>
                        <small style="color: #94a3b8;">📅 {item['timestamp']}</small>
                    </div>
                    <p style="margin: 0.5rem 0; color: #e2e8f0;"><strong>Observation:</strong> {item['observation']}</p>
                    <p style="margin: 0.3rem 0; color: #cbd5e1;"><strong>Plausible Hypothesis:</strong> {item['top_hypothesis']}</p>
                    <p style="margin: 0.3rem 0; color: #fbbf24;"><strong>Field Action:</strong> {item['test_done']}</p>
                    <small style="color: #10b981;">Status: {item['status']}</small>
                </div>
                """, unsafe_allow_html=True)
        
        # Download Journal JSON
        journal_json = json.dumps(st.session_state.journal, indent=2)
        st.download_button(
            "📥 Export Journal (JSON)",
            data=journal_json,
            file_name="fieldsense_journal.json",
            mime="application/json"
        )
    else:
        st.info("Your field journal is empty. Record an observation in the Field Observer to start your log.")

# VIEW 4: BOTANICAL GUIDE
elif menu == "📚 Botanical Guide":
    st.subheader("🌿 Botanical Diagnostic Matrix")
    st.markdown("Evidence criteria for distinguishing common physiological plant disorders from pathogens.")

    tab1, tab2, tab3 = st.tabs(["Mobile vs. Immobile Nutrients", "Waterlogging vs. Drought", "Fungal vs. Abiotic Scorch"])

    with tab1:
        st.markdown("""
        ### Mobile vs. Immobile Nutrient Translocation
        - **Mobile Elements (N, P, K, Mg)**: The plant can scavenge these from older lower leaves to feed newer growing shoots. Deficiency symptoms **always start at the base**.
        - **Immobile Elements (Fe, Ca, B)**: Cannot be moved once deposited in cell walls. Deficiency symptoms **always start at newest terminal shoots**.
        - *Field Check*: If upper leaves are lush and lower are yellowing, it is almost certainly a mobile element issue or root oxygen starvation—never iron chlorosis!
        """)

    with tab2:
        st.markdown("""
        ### Root Zone Anoxia (Waterlogging) vs. True Drought
        - Both cause wilting! Why? Because waterlogged roots drown, lose ATP respiration, and can no longer pump water upward to foliage.
        - *Field Check*: Stick your finger 2-3 inches into the substrate. If the soil is cool and wet while leaves droop, you are seeing **hypoxic stress**, not drought. Adding water will accelerate root rot!
        """)

    with tab3:
        st.markdown("""
        ### Fungal Lesions vs. Marginal Sun Scorch
        - **Sun Scorch**: Uniform papery browning restricted to upper exposed leaf edges facing the sun; does not cross vein boundaries.
        - **Pathogenic Blight**: Concentric 'target-board' rings, water-soaked margins, or fungal mycelial fuzz on leaf undersides.
        - *Field Check*: Use a 10x hand lens on the underside of yellowing halos to search for spore bodies.
        """)

# VIEW 5: OPEN AI ARCHITECTURE
elif menu == "⚙️ Open AI Architecture":
    st.subheader("🏗️ How Open-Source AI Powers FieldSense")
    st.markdown("""
    FieldSense AI coordinates open-source components into a unified field-science architecture:

    ```
                      [ Field Observation Input ]
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  LangGraph State Machine  │
                    └─────────────┬─────────────┘
                                  │
       ┌──────────────┬───────────┴───────────┬──────────────┐
       ▼              ▼                       ▼              ▼
  Vision Agent  Context Agent          Knowledge Agent  Hypothesis Agent
  (Morphology)  (Habitat/Soil)         (Curated KB)     (Differential)
       │              │                       │              │
       └──────────────┴───────────┬───────────┴──────────────┘
                                  ▼
                         Field-Test Agent
                      (Physical Checks: Touch Soil!)
                                  │
                                  ▼
                           Review Agent
                    (Confidence & Uncertainty Ratio)
    ```

    ### Why Open Innovation is Essential for Field Science:
    1. **Trail Connectivity**: Closed APIs fail in forests and wilderness. Open models running via Ollama and our offline graph allow 100% offline operation.
    2. **Zero Operating Cost**: Community gardens and nature clubs cannot afford metered pay-per-call API keys.
    3. **Data Sovereignty**: Your forage coordinates and private crop photos never get logged to commercial server farms.
    4. **Auditable Reasoning**: Every botanical rule and agent transition can be verified, critiqued, and improved by botanists.
    """)

    st.code("""
# Quick Run Locally:
git clone https://github.com/NikhilRaman12/fieldsense-ai.git
cd fieldsense-ai
pip install -r requirements.txt
streamlit run app.py
    """, language="bash")
