from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.ingestion import router as ingestion_router
from app.api.strategic import router as strategic_router
from app.api.telegram import router as telegram_router
from app.api.master import router as master_router
from app.api.dashboard import router as dashboard_router
from app.core.database import engine, Base
import app.models.retail_branch
import app.models.profile
import app.models.product
import app.models.fact_transaction
import app.models.fact_inventory
import app.models.saved_view
import app.models.strategic_report
import app.models.ingestion_history
import uvicorn

app = FastAPI(title="Dashboard Agentic AI API")

# buat tabel kalau belum ada
Base.metadata.create_all(bind=engine)

# konfigurasi cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingestion_router, prefix="/api")
app.include_router(strategic_router, prefix="/api")
app.include_router(master_router, prefix="/api/master")
app.include_router(dashboard_router, prefix="/api/dashboard")
app.include_router(telegram_router) # router telegram

@app.get("/")
async def root():
    return {"message": "Welcome to Dashboard Agentic AI API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

