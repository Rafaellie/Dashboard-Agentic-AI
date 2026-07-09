from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.agents.graph import app_graph
from app.agents.state import AgentState
from langchain_core.messages import HumanMessage
from typing import Dict, Any
from pydantic import BaseModel
from datetime import date
from app.core.security import get_current_user, require_roles
from app.core.database import get_db
from app.models.profile import Profile
from app.models.strategic_report import StrategicReport

router = APIRouter(prefix="/strategic", tags=["Strategic Analysis"])

class GenerateReportRequest(BaseModel):
    period_start: str
    period_end: str

from fastapi.responses import StreamingResponse
import json

@router.post("/generate-report")
async def generate_strategic_report(
    req: GenerateReportRequest, 
    current_user: Profile = Depends(require_roles(["admin", "csuite"]))
):
    """
    trigger pipeline AI untuk buat laporan strategis (Streamed).
    """
    # state awal
    initial_state: AgentState = {
        "messages": [HumanMessage(content=f"Generate a strategic business report for D'BESTO from {req.period_start} to {req.period_end}.")],
        "user_id": str(current_user.id),
        "period_start": req.period_start,
        "period_end": req.period_end,
        "config": {},
        "kpi_data": {},
        "market_context": "",
        "analysis": {},
        "report_markdown": "",
        "report_id": ""
    }
    
    async def event_generator():
        try:
            async for event in app_graph.astream(initial_state, config={"configurable": {"thread_id": str(current_user.id)}}):
                node_name = list(event.keys())[0] if isinstance(event, dict) else "unknown"
                node_state = list(event.values())[0] if isinstance(event, dict) else {}
                
                is_final = False
                report_markdown = node_state.get("report_markdown", "")
                
                # periksa apakah pembuatan laporan telah selesai
                if node_name == "generation" or (node_name != "unknown" and report_markdown):
                    is_final = True
                
                # ekstrak status yang dapat diserialisasi saja
                chunk = {
                    "node": node_name,
                    "status": "completed",
                    "report_id": str(node_state.get("report_id", "")),
                    "report_markdown": str(report_markdown),
                    "analysis_data": node_state.get("analysis", {}),
                    "kpis_snapshot": node_state.get("kpi_data", {}),
                    "is_final": is_final
                }
                
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            import traceback
            error_msg = str(e)
            with open("error_log_generate.txt", "w") as f:
                f.write(traceback.format_exc())
            yield f"data: {json.dumps({'error': error_msg})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/reports")
async def get_strategic_reports(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_roles(["admin", "csuite"]))
):
    """
    ambil memory history AI
    """
    try:
        # untuk csuite dan admin, kembalikan semua laporan untuk saat ini
        reports = db.query(StrategicReport).order_by(StrategicReport.generated_at.desc()).all()
        return [{
            "id": str(r.id),
            "title": r.title,
            "period_start": r.period_start,
            "period_end": r.period_end,
            "generated_at": r.generated_at,
            "model_used": r.model_used,
            "report_markdown": r.report_markdown,
            "analysis_json": r.analysis_json,
            "kpis_snapshot": r.kpis_snapshot
        } for r in reports]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/master-sheet")
async def get_master_sheet():
    """
    ambil data konsolidasi untuk dashboard.
    """
    from app.services.strategic_service import strategic_service
    df = await strategic_service.get_consolidated_data()
    return df.to_dict(orient="records")
