import asyncio
from app.services.ingestion_service import ingestion_service

async def main():
    data = await ingestion_service.load_latest_file()
    print(f"Total Sales from transform: {data['kpis']['total_sales']}")
    print(f"Total Rows from operational_data: {len(data['raw_data'])}")
    print(f"Monthly Chart: {data['charts']['monthly_revenue']}")

if __name__ == "__main__":
    asyncio.run(main())
