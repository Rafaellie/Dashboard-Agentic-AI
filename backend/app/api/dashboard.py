from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user, apply_rls
from app.models.profile import Profile
from app.models.fact_transaction import FactTransaction
from app.services.dashboard_service import dashboard_service
from datetime import datetime, timedelta

router = APIRouter(tags=["Operational Dashboard"])

@router.get("/kpi")
def get_dashboard_kpi(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    branch_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """
    mengambil metrik kpi dan data grafik untuk dashboard operasional.
    menerapkan rls secara otomatis berdasarkan role user.
    """
    # gunakan default 7 hari terakhir jika tidak ditentukan
    if not date_to:
        date_to = datetime.utcnow().isoformat()
    if not date_from:
        date_from = (datetime.utcnow() - timedelta(days=7)).isoformat()
        
    # terapkan rls tingkat aplikasi
    if current_user.role in ["manager", "kasir"]:
        # sesuaikan parameter branch_id dengan cabang asal user
        effective_branch_id = str(current_user.branch_id) if current_user.branch_id else "00000000-0000-0000-0000-000000000000"
    else:
        # admin atau csuite dapat memfilter berdasarkan branch_id atau melihat semua jika kosong
        effective_branch_id = branch_id

    # 1. ambil ringkasan kpi
    kpis = dashboard_service.get_kpi_summary(db, date_from, date_to, effective_branch_id)
    
    # 2. ambil grafik tren
    trend = dashboard_service.get_trend_chart(db, date_from, date_to, effective_branch_id)
    
    # 3. ambil rincian berdasarkan saluran
    channel_breakdown = dashboard_service.get_breakdown(db, "sales_channel", date_from, date_to, effective_branch_id)
    
    # 4. ambil rincian berdasarkan kategori
    category_breakdown = dashboard_service.get_breakdown(db, "category", date_from, date_to, effective_branch_id)

    # 5. agregasi baru
    hourly_peak = dashboard_service.get_hourly_peak(db, date_from, date_to, effective_branch_id)
    waste_analysis = dashboard_service.get_waste_analysis(db, date_from, date_to, effective_branch_id)
    demographic_pattern = dashboard_service.get_demographic_pattern(db, date_from, date_to, effective_branch_id)
    affinity = dashboard_service.get_affinity(db, date_from, date_to, effective_branch_id)
    inventory_velocity = dashboard_service.get_inventory_velocity(db, date_from, date_to, effective_branch_id)
    regional_profit = dashboard_service.get_regional_profit(db, date_from, date_to, effective_branch_id)
    sku_leaderboard = dashboard_service.get_sku_leaderboard(db, date_from, date_to, effective_branch_id)

    return {
        "kpi": kpis,
        "charts": {
            "trend_revenue": trend,
            "breakdown_channel": channel_breakdown,
            "breakdown_category": category_breakdown,
            "hourly_peak": hourly_peak,
            "waste_analysis": waste_analysis,
            "demographic_pattern": demographic_pattern,
            "affinity": affinity,
            "inventory_velocity": inventory_velocity,
            "regional_profit": regional_profit,
            "sku_leaderboard": sku_leaderboard
        }
    }
