from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.fact_transaction import FactTransaction

class DashboardService:
    
    def _apply_filters(self, query, start_date: str, end_date: str, branch_id: Optional[str] = None):
        """Apply common date and branch filters to the query."""
        try:
            if start_date:
                sd = datetime.fromisoformat(start_date)
                query = query.filter(FactTransaction.date >= sd)
            if end_date:
                ed = datetime.fromisoformat(end_date)
                query = query.filter(FactTransaction.date <= ed)
        except ValueError:
            pass # Ignore invalid date formats for now

        if branch_id:
            query = query.filter(FactTransaction.branch_id == branch_id)
            
        return query

    def get_kpi_summary(self, db: Session, start_date: str, end_date: str, branch_id: Optional[str] = None) -> Dict[str, Any]:
        """Aggregate top-level KPI metrics."""
        query = db.query(
            func.sum(FactTransaction.total_sales).label("total_revenue"),
            func.count(FactTransaction.transaction_id).label("total_transactions"),
            func.sum(FactTransaction.cogs_total).label("total_cogs"),
            func.sum(FactTransaction.platform_fee).label("total_platform_fee"),
            func.sum(FactTransaction.waste_qty).label("total_waste"),
            func.count(func.distinct(FactTransaction.branch_id)).label("active_branches")
        )
        query = self._apply_filters(query, start_date, end_date, branch_id)
        
        result = query.first()
        
        revenue = result.total_revenue or 0
        transactions = result.total_transactions or 0
        cogs = result.total_cogs or 0
        platform_fee = result.total_platform_fee or 0
        waste = result.total_waste or 0
        
        net_profit = revenue - cogs - platform_fee
        margin = (net_profit / revenue * 100) if revenue > 0 else 0
        
        # Calculate true critical stock (products with stock < 20)
        critical_query = db.query(func.count(func.distinct(FactTransaction.product_name)))\
            .filter(FactTransaction.stock_remaining < 20)
        critical_query = self._apply_filters(critical_query, start_date, end_date, branch_id)
        critical_stock = critical_query.scalar() or 0
        
        return {
            "total_revenue": revenue,
            "total_transactions": transactions,
            "net_profit": net_profit,
            "margin_percentage": round(margin, 2),
            "total_waste": waste,
            "platform_fee": platform_fee,
            "active_branches": result.active_branches or 0,
            "critical_stock": critical_stock
        }

    def get_trend_chart(self, db: Session, start_date: str, end_date: str, branch_id: Optional[str] = None) -> list:
        """Aggregate revenue by date for the line chart."""
        query = db.query(
            func.date(FactTransaction.date).label("trx_date"),
            func.sum(FactTransaction.total_sales).label("revenue")
        ).group_by(func.date(FactTransaction.date)).order_by(func.date(FactTransaction.date))
        
        query = self._apply_filters(query, start_date, end_date, branch_id)
        
        results = query.all()
        return [{"date": str(r.trx_date), "revenue": r.revenue or 0} for r in results]

    def get_breakdown(self, db: Session, dimension: str, start_date: str, end_date: str, branch_id: Optional[str] = None) -> list:
        """Aggregate metrics grouped by a specific dimension (e.g. sales_channel or category)."""
        column_to_group = getattr(FactTransaction, dimension, FactTransaction.sales_channel)
        
        query = db.query(
            column_to_group.label("name"),
            func.sum(FactTransaction.total_sales).label("value")
        ).group_by(column_to_group).order_by(func.sum(FactTransaction.total_sales).desc())
        
        query = self._apply_filters(query, start_date, end_date, branch_id)
        
        results = query.all()
        return [{"name": r.name or "Unknown", "value": r.value or 0} for r in results]

    def get_waste_analysis(self, db: Session, start_date: str, end_date: str, branch_id: Optional[str] = None) -> list:
        """Aggregate waste quantity grouped by waste reason."""
        query = db.query(
            FactTransaction.waste_reason.label("name"),
            func.sum(FactTransaction.waste_qty).label("value")
        ).filter(FactTransaction.waste_reason != '-').filter(FactTransaction.waste_reason.isnot(None))
        
        query = query.group_by(FactTransaction.waste_reason).order_by(func.sum(FactTransaction.waste_qty).desc())
        query = self._apply_filters(query, start_date, end_date, branch_id)
        
        results = query.all()
        return [{"name": r.name, "value": r.value or 0} for r in results]

    def get_hourly_peak(self, db: Session, start_date: str, end_date: str, branch_id: Optional[str] = None) -> list:
        """Aggregate transaction count by hour of the day (operating hours 7 to 22)."""
        from sqlalchemy import extract
        
        query = db.query(
            extract('hour', FactTransaction.date).label("hour"),
            func.count(FactTransaction.transaction_id).label("transactions")
        )
        query = self._apply_filters(query, start_date, end_date, branch_id)
        
        # filter operating hours 7 to 22
        query = query.filter(extract('hour', FactTransaction.date) >= 7)
        query = query.filter(extract('hour', FactTransaction.date) <= 22)
        
        query = query.group_by(extract('hour', FactTransaction.date)).order_by(extract('hour', FactTransaction.date))
        results = query.all()
        
        hour_map = {int(r.hour): r.transactions for r in results if r.hour is not None}
        
        return [{"hour": h, "transactions": hour_map.get(h, 0)} for h in range(7, 23)]

    def get_demographic_pattern(self, db: Session, start_date: str, end_date: str, branch_id: Optional[str] = None) -> list:
        """Aggregate demographic pattern (Male/Female by AgeGroup)."""
        query = db.query(
            FactTransaction.cust_demographic,
            func.sum(FactTransaction.total_sales).label("total_sales"),
            func.count(FactTransaction.transaction_id).label("count")
        ).filter(FactTransaction.cust_demographic.isnot(None))
        
        query = self._apply_filters(query, start_date, end_date, branch_id)
        query = query.group_by(FactTransaction.cust_demographic)
        results = query.all()
        
        # Process in python since the string split logic is complex for SQL
        age_groups = {}
        for r in results:
            if not r.cust_demographic or ',' not in r.cust_demographic:
                continue
            parts = [p.strip() for p in r.cust_demographic.split(',')]
            if len(parts) == 2:
                gender, age = parts
                if age not in age_groups:
                    age_groups[age] = {"male": 0, "female": 0, "male_count": 0, "female_count": 0}
                
                if gender == 'L':
                    age_groups[age]["male"] += (r.total_sales or 0)
                    age_groups[age]["male_count"] += (r.count or 0)
                elif gender == 'P':
                    age_groups[age]["female"] += (r.total_sales or 0)
                    age_groups[age]["female_count"] += (r.count or 0)
                    
        # Convert to list format
        output = []
        for age, data in sorted(age_groups.items()):
            output.append({
                "age": age,
                "male": data["male"],
                "female": data["female"],
                "male_count": data["male_count"],
                "female_count": data["female_count"]
            })
        return output

    def get_affinity(self, db: Session, start_date: str, end_date: str, branch_id: Optional[str] = None) -> list:
        """Calculate cross-sell affinity using SQL self join on transaction_id."""
        from sqlalchemy.orm import aliased
        ft1 = aliased(FactTransaction)
        ft2 = aliased(FactTransaction)
        
        query = db.query(
            ft1.product_name.label("product_a"),
            ft2.product_name.label("product_b"),
            func.count().label("affinity_count")
        ).filter(
            ft1.transaction_id == ft2.transaction_id,
            ft1.product_name < ft2.product_name
        )
        
        try:
            if start_date: query = query.filter(ft1.date >= datetime.fromisoformat(start_date))
            if end_date: query = query.filter(ft1.date <= datetime.fromisoformat(end_date))
        except ValueError:
            pass
            
        if branch_id:
            query = query.filter(ft1.branch_id == branch_id)
            
        query = query.group_by(ft1.product_name, ft2.product_name).order_by(func.count().desc()).limit(6)
        results = query.all()
        
        max_count = results[0].affinity_count if results else 1
        return [
            {
                "product_a": r.product_a, 
                "product_b": r.product_b, 
                "affinity": round(r.affinity_count / max_count, 2) if max_count > 0 else 0
            }
            for r in results
        ]

    def get_inventory_velocity(self, db: Session, start_date: str, end_date: str, branch_id: Optional[str] = None) -> dict:
        """Return safe mock data for inventory velocity until fact_inventory is fully established."""
        return {
            "avg_stock": 1450.5,
            "days_remaining": 12,
            "is_critical": False,
            "bom_mapping": [
                { "product": "Paket Ayam Kremes", "bom": ["1 Potong Ayam", "1 Porsi Nasi", "15g Kremesan", "1 Porsi Lalapan"] },
                { "product": "Ayam Geprek Jumbo", "bom": ["1 Potong Ayam", "20g Sambal Geprek", "1 Porsi Nasi"] },
                { "product": "Es Teh Manis", "bom": ["1 Teh Celup", "20g Gula", "Air Es"] }
            ]
        }

    def get_regional_profit(self, db: Session, start_date: str, end_date: str, branch_id: Optional[str] = None) -> list:
        query = db.query(
            FactTransaction.city.label("name"),
            FactTransaction.outlet_name.label("outlet"),
            func.sum(FactTransaction.total_sales).label("total_sales"),
            func.sum(FactTransaction.cogs_total).label("cogs"),
            func.sum(FactTransaction.platform_fee).label("platform_fee"),
            func.count(FactTransaction.transaction_id).label("trx_count")
        )
        query = self._apply_filters(query, start_date, end_date, branch_id)
        query = query.group_by(FactTransaction.city, FactTransaction.outlet_name).order_by(func.sum(FactTransaction.total_sales).desc())
        
        results = query.all()
        output = []
        for r in results:
            ts = r.total_sales or 0
            cogs = r.cogs or 0
            pf = r.platform_fee or 0
            net_profit = ts - cogs - pf
            margin = round((net_profit / ts * 100), 2) if ts > 0 else 0
            
            output.append({
                "name": r.name or "Unknown City",
                "outlet": r.outlet or "Unknown Outlet",
                "Total_Sales": ts,
                "Net_Profit": net_profit,
                "Margin": margin,
                "Trx_Count": r.trx_count or 0
            })
        return output

    def get_sku_leaderboard(self, db: Session, start_date: str, end_date: str, branch_id: Optional[str] = None) -> list:
        query = db.query(
            FactTransaction.city.label("branch_city"),
            FactTransaction.sku_variant.label("sku_variant"),
            func.sum(FactTransaction.qty_sold).label("qty_sold")
        )
        query = self._apply_filters(query, start_date, end_date, branch_id)
        query = query.group_by(FactTransaction.city, FactTransaction.sku_variant).order_by(func.sum(FactTransaction.qty_sold).desc())
        results = query.limit(20).all()
        
        return [
            {
                "Branch_City": r.branch_city or "Unknown",
                "SKU_Variant": r.sku_variant or "Unknown",
                "Qty_Sold": r.qty_sold or 0
            }
            for r in results
        ]

dashboard_service = DashboardService()
