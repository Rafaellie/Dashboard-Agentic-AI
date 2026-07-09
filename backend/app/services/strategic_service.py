import pandas as pd
from typing import Dict, Any, List
from app.core.supabase_client import supabase
import json
import os

class StrategicService:
    def __init__(self):
        pass

    async def get_consolidated_data(self) -> pd.DataFrame:
        """
        buat master sheet dengan konsolidasi data transaksi dan stok.
        """
        df_tx = pd.DataFrame()
        df_inv = pd.DataFrame()

        # coba ambil dari supabase
        if supabase is not None:
            try:
                tx_res = supabase.table("fact_transactions").select("*").execute()
                df_tx = pd.DataFrame(tx_res.data) if hasattr(tx_res, 'data') else pd.DataFrame()

                inv_res = supabase.table("fact_inventory_daily").select("*").execute()
                df_inv = pd.DataFrame(inv_res.data) if hasattr(inv_res, 'data') else pd.DataFrame()
            except:
                pass

        # pakai csv lokal kalau kosong
        if df_tx.empty:
            tx_path = r"d:\Magang\WIT Indonesia - Fullstack AI Developer\dummy_data_confidential.csv"
            if os.path.exists(tx_path):
                df_tx = pd.read_csv(tx_path, sep=';')
        
        if df_inv.empty:
            inv_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "data", "fact_inventory_daily_dummy.csv"
            )
            if os.path.exists(inv_path):
                df_inv = pd.read_csv(inv_path)

        if df_tx.empty:
            return pd.DataFrame()

        return df_tx

    def calculate_deviations(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        hitung deviasi statistik seperti tren penjualan.
        """
        if df.empty:
            return {"status": "no_data"}
        
        # contoh perhitungan deviasi penjualan
        df['Date'] = pd.to_datetime(df['Date'], format='mixed', dayfirst=True)
        daily_sales = df.groupby(df['Date'].dt.date)['Total_Sales'].sum().reset_index()
        
        if len(daily_sales) < 2:
            return {"status": "insufficient_data"}
            
        latest_sales = float(daily_sales.iloc[-1]['Total_Sales'])
        avg_sales = float(daily_sales['Total_Sales'].mean())
        deviation = float(((latest_sales - avg_sales) / avg_sales) * 100)
        
        # breakdown per wilayah
        region_sales = df.groupby('Branch_City')['Total_Sales'].sum()
        region_dict = {k: float(v) for k, v in region_sales.items()}
        
        return {
            "overall_deviation": round(deviation, 2),
            "latest_sales": latest_sales,
            "avg_sales": round(avg_sales, 2),
            "region_performance": region_dict
        }

    def get_swot_knowledge(self) -> Dict[str, Any]:
        """
        ambil data swot untuk d'besto.
        """
        return {
            "strengths": [
                "Founders have veterinary medicine background (ensures high hygiene standards)",
                "Affordable pricing (Value for Money)",
                "Large network of 200+ outlets"
            ],
            "weaknesses": [
                "Kiosk/mini-resto model limits upselling opportunities (drinks/desserts) compared to KFC",
                "Limited physical space for dining"
            ],
            "opportunities": [
                "Expansion to islands outside Java",
                "Integration with cloud kitchen models",
                "Digitization of supply chain to defend margins"
            ],
            "threats": [
                "Fluctuation in raw chicken prices (commodity pressure)",
                "High competition from global giants and aggressive local franchises"
            ]
        }

    def get_porters_forces(self) -> Dict[str, Any]:
        """
        ambil data porter's five forces d'besto.
        """
        return {
            "competition": "High (Saturated market with global players and local franchises)",
            "supplier_power": "Medium (Scale of 200+ outlets gives bargaining power for feed and chicken costs)",
            "buyer_power": "High (Low switching costs for consumers)",
            "threat_of_substitutes": "High (Many alternative street food options)",
            "threat_of_new_entrants": "Medium (Low barrier to entry, but hard to scale to 200+ outlets)"
        }

strategic_service = StrategicService()
