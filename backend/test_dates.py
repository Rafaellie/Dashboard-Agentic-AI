import pandas as pd
df = pd.read_csv('d:/Magang/WIT Indonesia - Fullstack AI Developer/dummy_data_confidential.csv', sep=None, engine='python')
print(f"Total rows originally: {len(df)}")
dates = pd.to_datetime(df['Date'], errors='coerce')
print(f"Valid dates: {dates.notna().sum()}")
null_dates = df[dates.isna()]['Date'].head()
print(f"Sample of unparseable dates: \n{null_dates}")
