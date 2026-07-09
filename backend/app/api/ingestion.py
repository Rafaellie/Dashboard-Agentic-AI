from fastapi import APIRouter, UploadFile, File, HTTPException, Form, BackgroundTasks, Depends
from app.core.security import get_current_user, require_roles
from app.models.profile import Profile
from app.services.ingestion_service import ingestion_service
import traceback
import json
from pydantic import BaseModel
from typing import List, Dict, Any
from app.services.mapping_service import mapping_service

router = APIRouter(prefix="/ingestion", tags=["ingestion"])

# status impor global untuk melacak proses impor
import_status_store = {
    "status": "idle",
    "imported_rows": 0,
    "message": ""
}

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), admin: Profile = Depends(require_roles(["admin"]))):
    try:
        content = await file.read()
        data = await ingestion_service.process_file(content, file.filename)
        return {
            "status": "success",
            "filename": file.filename,
            "data": data
        }
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract-headers")
async def extract_headers(file: UploadFile = File(...), admin: Profile = Depends(require_roles(["admin"]))):
    try:
        content = await file.read()
        headers = await ingestion_service.extract_headers(content, file.filename)
        return {
            "status": "success",
            "filename": file.filename,
            "headers": headers
        }
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

def run_background_import(content: bytes, filename: str, mapping_dict: dict):
    global import_status_store
    import_status_store["status"] = "processing"
    import_status_store["imported_rows"] = 0
    import_status_store["message"] = "Processing started"
    
    # menggunakan synchronous wrapper atau asyncio.run jika fungsi layanan bersifat async
    import asyncio
    try:
        # buat event loop baru untuk tugas latar belakang jika diperlukan
        # menjalankan tugas menggunakan asyncio.run
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(ingestion_service.import_mapped_file(content, filename, mapping_dict, import_status_store))
        loop.close()
        
        import_status_store["status"] = "success"
        import_status_store["imported_rows"] = result.get("imported_rows", 0)
        import_status_store["message"] = "Import completed successfully"
    except Exception as e:
        print(traceback.format_exc())
        import_status_store["status"] = "error"
        import_status_store["message"] = str(e)

@router.post("/import-mapped")
async def import_mapped_file(background_tasks: BackgroundTasks, file: UploadFile = File(...), mapping: str = Form(...), admin: Profile = Depends(require_roles(["admin"]))):
    try:
        content = await file.read()
        mapping_dict = json.loads(mapping)
        
        # jadwal tugas di latar belakang
        background_tasks.add_task(run_background_import, content, file.filename, mapping_dict)
        
        return {"status": "processing", "message": "File uploaded successfully, processing in background"}
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/import-status")
async def get_import_status(admin: Profile = Depends(require_roles(["admin"]))):
    return import_status_store

from fastapi.responses import StreamingResponse
import asyncio

@router.get("/import-status-stream")
async def get_import_status_stream(admin: Profile = Depends(require_roles(["admin"]))):
    async def event_generator():
        last_status = None
        last_rows = -1
        while True:
            current_status = import_status_store["status"]
            current_rows = import_status_store["imported_rows"]
            
            if current_status != last_status or current_rows != last_rows:
                yield f"data: {json.dumps(import_status_store)}\n\n"
                last_status = current_status
                last_rows = current_rows
                
                if current_status in ["success", "error"]:
                    break
            
            await asyncio.sleep(0.5)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/data")
async def get_dashboard_data(current_user: Profile = Depends(get_current_user)):
    try:
        data = await ingestion_service.load_latest_file()
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

class MatchFieldsRequest(BaseModel):
    target_schema: List[Dict[str, Any]]
    external_columns: List[str]

@router.post("/match-fields")
async def ai_match_fields(payload: MatchFieldsRequest, admin: Profile = Depends(require_roles(["admin"]))):
    try:
        mapping_result = await mapping_service.match_fields(
            target_schema=payload.target_schema,
            external_columns=payload.external_columns
        )
        return {
            "status": "success",
            "mapping": mapping_result
        }
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_ingestion_history(admin: Profile = Depends(require_roles(["admin"]))):
    from app.core.database import SessionLocal
    from app.models.ingestion_history import IngestionHistory
    try:
        with SessionLocal() as db:
            history = db.query(IngestionHistory).order_by(IngestionHistory.imported_at.desc()).limit(50).all()
            return {
                "status": "success",
                "data": [
                    {
                        "id": str(h.id),
                        "filename": h.filename,
                        "row_count": h.row_count,
                        "status": h.status,
                        "error_message": h.error_message,
                        "imported_at": h.imported_at.isoformat() if h.imported_at else None
                    }
                    for h in history
                ]
            }
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
