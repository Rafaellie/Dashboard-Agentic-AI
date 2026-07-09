import asyncio
import pandas as pd
import os
import sys

# tambah path untuk import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.strategic_service import strategic_service

async def main():
    print("Generating Consolidated Master Sheet...")
    df = await strategic_service.get_consolidated_data()
    
    if df.empty:
        print("No data found to consolidate.")
        return

    output_path = os.path.join(os.getcwd(), "..", "data", "consolidated_master_sheet.xlsx")
    
    # simpan ke excel
    try:
        df.to_excel(output_path, index=False)
        print(f"Master Sheet successfully generated at: {output_path}")
    except Exception as e:
        print(f"Error saving to Excel: {e}")
        # Fallback to CSV
        output_path_csv = output_path.replace(".xlsx", ".csv")
        df.to_csv(output_path_csv, index=False)
        print(f"Fallback: Master Sheet saved as CSV at: {output_path_csv}")

if __name__ == "__main__":
    asyncio.run(main())
