import pandas as pd
df = pd.read_csv('d:/Magang/WIT Indonesia - Fullstack AI Developer/dummy_data_confidential.csv', sep=None, engine='python')
df['Total_Sales'] = pd.to_numeric(df['Total_Sales'].astype(str).str.replace(r'[Rp\s,]', '', regex=True), errors='coerce')
print(f"Sum Total Sales: {df['Total_Sales'].sum()}")
print(f"Total Rows: {len(df)}")
