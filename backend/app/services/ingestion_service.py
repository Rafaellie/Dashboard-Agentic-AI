import pandas as pd
import io
import os
from typing import Dict, Any, List
import PyPDF2
from app.core.config import settings
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
import json
from app.core.supabase_client import supabase
from app.core.database import engine

class IngestionService:
    def __init__(self):
        self.llm = ChatGroq(groq_api_key=settings.GROQ_API_KEY, model_name="llama-3.3-70b-versatile")
        self.data_dir = os.path.join(os.getcwd(), "data")
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
        # Point self.data_path relatively to the project root directory
        self.data_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
            "data",
            "fact_transactions_dummy_100.csv"
        )
        self.latest_upload_path = os.path.join(self.data_dir, "latest_ingestion.csv")
        self.latest_df = None

    async def load_latest_file(self) -> Dict[str, Any]:
        # cek cache memori
        if self.latest_df is not None:
            return self._transform_df_to_dashboard_data(self.latest_df)

        # cek file lokal
        if os.path.exists(self.latest_upload_path):
            self.latest_df = pd.read_csv(self.latest_upload_path)
            return self._transform_df_to_dashboard_data(self.latest_df)

        # supabase
        try:
            return await self.load_from_supabase()
        except:
            pass
            
        # pakai data dummy jika gagal
        if os.path.exists(self.data_path):
            df = pd.read_csv(self.data_path)
            return self._transform_df_to_dashboard_data(df)
        
        raise FileNotFoundError(f"No data available. Dummy file also missing at {self.data_path}")

    async def load_from_supabase(self) -> Dict[str, Any]:
        if supabase is None:
            raise ValueError("Supabase client is not initialized")
        result = supabase.table("fact_transactions").select("*").execute()
        if hasattr(result, 'data') and len(result.data) > 0:
            df = pd.DataFrame(result.data)
            return self._transform_df_to_dashboard_data(df)
        raise ValueError("No data found in Supabase table 'fact_transactions'")

    async def process_file(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        if filename.endswith('.csv'):
            return self._process_csv(file_content)
        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            return self._process_excel(file_content)
        elif filename.endswith('.pdf'):
            return await self._process_pdf_ai(file_content)
        else:
            raise ValueError("Unsupported file format")

    async def extract_headers(self, file_content: bytes, filename: str) -> List[str]:
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_content), nrows=0, sep=None, engine='python')
            return df.columns.tolist()
        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            df = pd.read_excel(io.BytesIO(file_content), nrows=0)
            return df.columns.tolist()
        else:
            raise ValueError("Unsupported file format for header extraction")

    async def import_mapped_file(self, file_content: bytes, filename: str, mapping: Dict[str, str], status_store: Dict[str, Any] = None) -> Dict[str, Any]:
        import hashlib
        from app.core.database import SessionLocal
        from app.models.ingestion_history import IngestionHistory
        
        file_hash = hashlib.md5(file_content).hexdigest()
        
        # Check for duplicates
        with SessionLocal() as db:
            existing = db.query(IngestionHistory).filter(IngestionHistory.file_hash == file_hash).first()
            if existing and existing.status == "success":
                raise ValueError(f"Duplicate File Detected: This exact file was already imported on {existing.imported_at.strftime('%Y-%m-%d %H:%M')}.")

        if filename.endswith('.csv'):
            # First, read in chunks to avoid memory overflow for millions of rows
            chunk_iter = pd.read_csv(io.BytesIO(file_content), sep=None, engine='python', chunksize=100000)
            df_list = []
            for chunk in chunk_iter:
                df_list.append(chunk)
            df = pd.concat(df_list, ignore_index=True)
        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            raise ValueError("Unsupported file format")

        # mapping: { "target_db_col": "External_Col" }
        # Remove empty mappings ("--select header--")
        valid_mapping = {db_col: ext_col for db_col, ext_col in mapping.items() if ext_col and ext_col != "--select header--"}
        
        # Invert mapping to rename dataframe: { "External_Col": "target_db_col" }
        rename_map = {ext_col: db_col for db_col, ext_col in valid_mapping.items()}
        
        # Rename the columns in the dataframe
        df.rename(columns=rename_map, inplace=True)
        
        # Filter dataframe to only include the mapped columns
        mapped_columns = list(valid_mapping.keys())
        available_cols = [col for col in mapped_columns if col in df.columns]
        df = df[available_cols].copy()

        # Data Cleansing
        # 1. Handle missing transaction_id and date
        if 'transaction_id' in df.columns:
            df.dropna(subset=['transaction_id'], inplace=True)
            df['transaction_id'] = df['transaction_id'].astype(str)
        if 'date' in df.columns:
            # First try standard ISO parsing, then fallback to dayfirst for NaT
            parsed_dates = pd.to_datetime(df['date'], errors='coerce')
            if parsed_dates.isna().any():
                # For any dates that failed standard parsing, try dayfirst=True
                fallback_dates = pd.to_datetime(df['date'], errors='coerce', dayfirst=True)
                parsed_dates = parsed_dates.fillna(fallback_dates)
            
            df['date'] = parsed_dates
            df.dropna(subset=['date'], inplace=True) # drop if invalid date
            df['date'] = df['date'].dt.strftime('%Y-%m-%dT%H:%M:%S%z')

        # 2. Clean numeric columns
        numeric_cols = ['total_sales', 'platform_fee', 'cogs_total', 'shipping_cost', 'qty_sold', 'price_per_unit', 'stock_remaining', 'waste_qty']
        for col in numeric_cols:
            if col in df.columns:
                # Remove currency symbols and commas, convert to float
                if df[col].dtype == object:
                    df[col] = df[col].astype(str).str.replace(r'[Rp\s,]', '', regex=True)
                df[col] = pd.to_numeric(df[col], errors='coerce')

        # Add source column
        df['source'] = 'integration'

        # 3. Clean string/enum constraints
        if 'payment_status' in df.columns:
            df['payment_status'] = df['payment_status'].astype(str).str.lower()

        self.latest_df = df
        df.to_csv(self.latest_upload_path, index=False)
        
        # Sync to supabase in chunks
        chunk_size = 50000
        total_rows = len(df)
        
        if status_store:
            status_store["message"] = f"Saving {total_rows} rows to database..."
            
        for i in range(0, total_rows, chunk_size):
            chunk_df = df.iloc[i:i+chunk_size]
            self._sync_to_supabase(chunk_df)
            if status_store:
                status_store["imported_rows"] += len(chunk_df)

        with SessionLocal() as db:
            history = IngestionHistory(
                filename=filename,
                file_hash=file_hash,
                row_count=total_rows,
                status="success"
            )
            db.add(history)
            db.commit()
                
        return {"status": "success", "imported_rows": total_rows}

    def _process_csv(self, content: bytes) -> Dict[str, Any]:
        df = pd.read_csv(io.BytesIO(content), sep=None, engine='python')
        self.latest_df = df
        df.to_csv(self.latest_upload_path, index=False)
        self._sync_to_supabase(df)
        return self._transform_df_to_dashboard_data(df)

    def _process_excel(self, content: bytes) -> Dict[str, Any]:
        df = pd.read_excel(io.BytesIO(content))
        self.latest_df = df
        df.to_csv(self.latest_upload_path, index=False)
        self._sync_to_supabase(df)
        return self._transform_df_to_dashboard_data(df)

    def _sync_to_supabase(self, df: pd.DataFrame):
        if supabase is None:
            return
        try:
            # konversi nan ke none agar kompatibel dengan json supabase
            # Juga konversi tipe data yang tidak valid
            import numpy as np
            df = df.replace({np.nan: None})
            records = df.where(pd.notnull(df), None).to_dict('records')
            
            # Jika records kosong, jangan lakukan apapun
            if not records:
                raise ValueError("Tidak ada data valid untuk diimpor setelah proses pembersihan (Cleansing). Pastikan format tanggal dan angka benar.")
                
            # Gunakan SQLAlchemy engine (menggunakan DATABASE_URL yang merupakan akses admin/superuser)
            # Ini aman dan direkomendasikan untuk tugas backend karena bypass RLS tanpa membukanya ke publik.
            df.to_sql("fact_transactions", engine, if_exists="append", index=False, method='multi', chunksize=10000)
        except Exception as e:
            print(f"sync error: {e}")
            raise Exception(f"Gagal menyimpan ke database: {str(e)}")

    async def _process_pdf_ai(self, content: bytes) -> Dict[str, Any]:
        # ekstrak teks dari pdf
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            text += page.extract_text()

        # pakai ai untuk parsing teks ke json dashboard
        prompt = PromptTemplate.from_template("""
        You are an AI Business Analyst. Extract operational data from the following text (which is from a financial report or invoice).
        The data should be formatted as a JSON object with exactly these keys:
        - kpis: {{ "total_sold": int, "critical_stock": int, "active_branches": int, "avg_margin": float }}
        - operational_data: list of {{ "id": str, "product": str, "city": str, "category": str, "stock": int, "sold": int, "status": str }}
        - channels: {{ "dine_in": int, "delivery": int, "direct": int }}
        
        Text: {text}
        
        Output only the JSON.
        """)
        
        chain = prompt | self.llm
        response = chain.invoke({"text": text})
        
        # format json output
        raw_json = response.content.strip()
        if "```json" in raw_json:
            raw_json = raw_json.split("```json")[1].split("```")[0].strip()
        
        return json.loads(raw_json)

    def _transform_df_to_dashboard_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        # Rename columns to standard Title Case format expected by the function
        # This handles dataframes coming from DB/CSV which might have lowercase names
        col_map = {
            'total_sales': 'Total_Sales',
            'platform_fee': 'Platform_Fee',
            'cogs_total': 'COGS_Total',
            'shipping_cost': 'Shipping_Cost',
            'sales_channel': 'Sales_Channel',
            'cust_demographic': 'Cust_Demographic',
            'transaction_id': 'Transaction_ID',
            'waste_reason': 'Waste_Reason',
            'waste_qty': 'Waste_Qty',
            'date': 'Date',
            'stock_remaining': 'Stock_Remaining',
            'qty_sold': 'Qty_Sold',
            'city': 'Branch_City',
            'branch_city': 'Branch_City',
            'outlet_name': 'Outlet_Name',
            'sku_variant': 'SKU_Variant',
            'product_name': 'Product_Name',
            'category': 'Category'
        }
        # Create a case-insensitive lookup
        actual_cols = df.columns.tolist()
        rename_dict = {}
        for col in actual_cols:
            lower_col = col.lower()
            if lower_col in col_map:
                rename_dict[col] = col_map[lower_col]
        
        df = df.rename(columns=rename_dict)
        
        # Ensure fallback for missing columns
        for standard_col in set(col_map.values()):
            if standard_col not in df.columns:
                if standard_col in ['Total_Sales', 'Platform_Fee', 'COGS_Total', 'Shipping_Cost', 'Waste_Qty', 'Stock_Remaining', 'Qty_Sold']:
                    df[standard_col] = 0
                else:
                    df[standard_col] = '-'

        # hitung laba bersih: total sales - platform fee - cogs total - shipping cost
        df['Net_Profit'] = df['Total_Sales'] - df['Platform_Fee'] - df['COGS_Total'] - df['Shipping_Cost']
        
        # sales & marketing: profitabilitas per channel (combo chart)
        sales_by_channel = df.groupby('Sales_Channel').agg({
            'Total_Sales': 'sum',
            'Net_Profit': 'sum'
        }).reset_index().to_dict('records')
        
        # sales & marketing: pola belanja demografi pelanggan
        # asumsikan format "L, 18-24" atau "P, 25-35"
        try:
            df[['Gender', 'AgeGroup']] = df['Cust_Demographic'].str.split(', ', expand=True)
            sales_by_demographic = df.groupby(['AgeGroup', 'Gender']).agg({
                'Total_Sales': 'sum',
                'Transaction_ID': 'count'
            }).unstack(fill_value=0)
            
            # flatten multi-index kolom dan rename suffix gender
            data_list = []
            for age, row in sales_by_demographic.iterrows():
                data_list.append({
                    "age": age,
                    "male": float(row[('Total_Sales', 'L')]),
                    "female": float(row[('Total_Sales', 'P')]),
                    "male_count": int(row[('Transaction_ID', 'L')]),
                    "female_count": int(row[('Transaction_ID', 'P')])
                })
            demographic_pattern = data_list
        except:
            demographic_pattern = []
        
        demographic_dict = demographic_pattern # Fallback or for legacy compatibility

        # logistik & inventori: analisis waste (donut chart)
        waste_data = df[df['Waste_Reason'] != '-'].groupby('Waste_Reason').agg({
            'Waste_Qty': 'sum'
        }).reset_index()
        waste_dict = waste_data.rename(columns={'Waste_Qty': 'value', 'Waste_Reason': 'name'}).to_dict('records')

        # peak hour analysis
        df['Hour_Int'] = pd.to_datetime(df['Date']).dt.hour
        
        # filter jam operasional outlet
        operating_df = df[(df['Hour_Int'] >= 7) & (df['Hour_Int'] <= 22)]
        
        hourly_transactions = operating_df.groupby('Hour_Int')['Transaction_ID'].count().reset_index()
        hourly_transactions.columns = ['hour', 'transactions']
        
        # pastikan semua jam terisi untuk grafik yang mulus
        full_hours = pd.DataFrame({'hour': range(7, 23)})
        hourly_complete = pd.merge(full_hours, hourly_transactions, on='hour', how='left').fillna(0)
        hourly_dict = hourly_complete.to_dict('records')

        # inventory velocity (gauge chart)
        avg_stock = df['Stock_Remaining'].mean()
        avg_sold_daily = df.groupby(pd.to_datetime(df['Date']).dt.date)['Qty_Sold'].sum().mean()
        velocity_days = avg_stock / avg_sold_daily if avg_sold_daily > 0 else 0

        # manajemen: peta profitabilitas regional
        regional_profit = df.groupby(['Branch_City', 'Outlet_Name']).agg({
            'Net_Profit': 'sum',
            'Total_Sales': 'sum'
        }).reset_index()
        regional_profit['Margin'] = (regional_profit['Net_Profit'] / regional_profit['Total_Sales'] * 100).round(2)
        regional_dict = regional_profit.rename(columns={'Branch_City': 'name', 'Outlet_Name': 'outlet'}).sort_values(by='Net_Profit', ascending=False).to_dict('records')

        # manajemen: leaderboard per varian sku
        sku_leaderboard = df.groupby(['Branch_City', 'SKU_Variant'])['Qty_Sold'].sum().reset_index()
        sku_leaderboard = sku_leaderboard.sort_values(['Branch_City', 'Qty_Sold'], ascending=[True, False]).to_dict('records')

        # sales: total revenue bulanan
        df['Date_Parsed'] = pd.to_datetime(df['Date'])
        monthly_revenue = df.groupby(df['Date_Parsed'].dt.strftime('%b')).agg({
            'Total_Sales': 'sum'
        }).reset_index()
        monthly_revenue.columns = ['month', 'revenue']
        
        # urutkan sesuai urutan bulan normal
        month_order = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        monthly_revenue['month_idx'] = monthly_revenue['month'].apply(lambda x: month_order.index(x) if x in month_order else 99)
        monthly_revenue = monthly_revenue.sort_values('month_idx')
        monthly_dict = monthly_revenue[['month', 'revenue']].to_dict('records')

        # affinity (analisis market basket otomatis)
        try:
            from itertools import combinations
            from collections import Counter
            
            # deteksi kolom transaksi secara otomatis
            cols = df.columns.tolist()
            tx_col = next((c for c in cols if 'transaction' in c.lower() or 'id' in c.lower() and 'prod' not in c.lower()), 'Transaction_ID')
            pr_col = next((c for c in cols if 'product' in c.lower() or 'item' in c.lower() or 'sku' in c.lower()), 'Product_Name')
            
            # kelompokkan produk berdasar transaksi
            if tx_col in df.columns and pr_col in df.columns:
                transactions = df.groupby(tx_col)[pr_col].apply(list).tolist()
                
                # hitung pasangan produk
                pair_counts = Counter()
                item_counts = Counter()
                
                for txn in transactions:
                    items = sorted(list(set([str(i) for i in txn if pd.notnull(i)])))
                    for item in items:
                        item_counts[item] += 1
                    for pair in combinations(items, 2):
                        pair_counts[pair] += 1
                
                affinity_list = []
                for (item_a, item_b), count in pair_counts.most_common(10):
                    denominator = item_counts[item_a] + item_counts[item_b] - count
                    score = round(count / denominator, 2) if denominator > 0 else 0
                    affinity_list.append({
                        "product_a": item_a,
                        "product_b": item_b,
                        "affinity": score
                    })
                
                if not affinity_list:
                    top_items = [i for i, c in item_counts.most_common(6)]
                    for i in range(0, len(top_items), 2):
                        if i+1 < len(top_items):
                            affinity_list.append({
                                "product_a": top_items[i],
                                "product_b": top_items[i+1],
                                "affinity": 0.0  # Zero match since they didn't appear together
                            })
                
                affinity_data = affinity_list[:6]
            else:
                affinity_data = []
                
        except:
            affinity_data = []

        # KPIs
        total_sales = df['Total_Sales'].sum()
        total_profit = df['Net_Profit'].sum()
        
        # data operasional (format tabel)
        operational_data = []
        for i, row in df.head(10).iterrows():
            operational_data.append({
                "id": row['Transaction_ID'],
                "product": row['Product_Name'],
                "city": row['Branch_City'],
                "category": row['Category'],
                "stock": int(row['Stock_Remaining']),
                "sold": int(row['Qty_Sold']),
                "status": "Critical Stock" if row['Stock_Remaining'] <= 5 else "High Demand" if row['Qty_Sold'] >= 8 else "Stable"
            })

        # data mentah untuk drill down / pivot table
        raw_data = df.to_dict('records')
        
        # semua id dalam bentuk string untuk frontend
        for rd in raw_data:
            if 'Transaction_ID' in rd:
                rd['id'] = str(rd['Transaction_ID'])
            # mapping 
            if 'Branch_City' in rd: rd['Branch'] = rd['Branch_City']
            if 'Outlet_Name' in rd: rd['Outlet'] = rd['Outlet_Name']
            if 'Product_Name' in rd: rd['Product'] = rd['Product_Name']
            if 'SKU_Variant' in rd: rd['SKU'] = rd['SKU_Variant']
            if 'Qty_Sold' in rd: rd['Qty'] = int(rd['Qty_Sold'])
            if 'Total_Sales' in rd: rd['Sales'] = float(rd['Total_Sales'])

        result = {
            "kpis": {
                "total_sales": float(total_sales),
                "total_profit": float(total_profit),
                "critical_stock": int(len(df[df['Stock_Remaining'] <= 5])),
                "active_branches": int(len(df['Branch_City'].unique())),
                "avg_margin": float((total_profit / total_sales * 100).round(2)) if total_sales > 0 else 0
            },
            "charts": {
                "profit_by_channel": sales_by_channel,
                "sales_by_demographic": demographic_dict,
                "demographic_pattern": demographic_pattern,
                "waste_analysis": waste_dict,
                "hourly_peak": hourly_dict,
                "inventory_velocity": {
                    "avg_stock": float(avg_stock),
                    "days_remaining": float(round(velocity_days, 1)),
                    "is_critical": velocity_days < 3,
                    "bom_mapping": [
                        { "product": "Paket Kremes", "bom": ["1 Potong Ayam", "1 Porsi Nasi", "15g Kremesan", "1 Porsi Lalapan"] },
                        { "product": "Ayam Tulang Lunak", "bom": ["1 Potong Ayam Presto", "1 Porsi Nasi", "1 Pungkus Sambal"] },
                        { "product": "Es Teh Manis", "bom": ["1 Kantong Teh", "30g Gula Pasir", "200ml Air", "100g Es Batu"] },
                        { "product": "Sambal Dadak", "bom": ["15g Cabai Rawit", "5g Bawang Merah", "2g Terasi", "Garam & Gula"] }
                    ]
                },
                "regional_profit": regional_dict,
                "sku_leaderboard": sku_leaderboard,
                "monthly_revenue": monthly_dict,
                "affinity": affinity_data
            },
            "operational_data": operational_data,
            "raw_data": raw_data
        }

        # tangani masalah serialisasi numpy dengan konversi ke tipe python asli
        return json.loads(json.dumps(result, default=self._json_serializer))

    def _json_serializer(self, obj):
        import numpy as np
        if isinstance(obj, (np.int64, np.int32, np.int16, np.int8)):
            return int(obj)
        if isinstance(obj, (np.float64, np.float32, np.float16)):
            return float(obj)
        if isinstance(obj, (np.bool_)):
            return bool(obj)
        return str(obj)

ingestion_service = IngestionService()
