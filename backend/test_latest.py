import pandas as pd
df = pd.read_csv('data/latest_ingestion.csv')
print(f"Columns: {df.columns.tolist()}")
df['total_sales'] = pd.to_numeric(df['total_sales'].astype(str).str.replace(r'[Rp\s,]', '', regex=True), errors='coerce')
print(f"Sum Total Sales: {df['total_sales'].sum()}")
print(f"Total Rows: {len(df)}")
