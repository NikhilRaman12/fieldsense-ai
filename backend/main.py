from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import FieldEvidenceInput, FieldInvestigationReport
from investigation_graph import run_field_investigation

app = FastAPI(
    title="FieldSense AI Investigation Service",
    description="Evidence-based field investigation engine orchestrating specialist agents via LangGraph.",
    version="1.0.0"
)

# Enable CORS for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "orchestrator": "LangGraph",
        "service": "FieldSense Investigation Engine",
        "agents": [
            "Vision Agent",
            "Context Agent",
            "Knowledge Retrieval Agent",
            "Hypothesis Agent",
            "Field-Test Agent",
            "Review Agent"
        ]
    }

@app.post("/api/investigate", response_model=FieldInvestigationReport)
def investigate_field_evidence(evidence: FieldEvidenceInput):
    """
    Step 2 in the 5-step architecture:
    FastAPI receives the investigation, validates input against schemas,
    and initializes shared state for LangGraph multi-agent coordination.
    """
    try:
        report = run_field_investigation(evidence)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Investigation workflow error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
