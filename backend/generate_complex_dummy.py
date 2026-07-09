import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import uuid

# Configuration
NUM_TRANSACTIONS = 1500
OUTPUT_FILE = "d:/Magang/WIT Indonesia - Fullstack AI Developer/product-agentic-bi-dashboard-29b14eff58c869fb9b8cbcebde110afa06fd2cbf/Dashboard Agentic BI/data/complex_dummy_data.csv"

# Data Pools
branches = [
    {"Outlet_Name": "JKT-Pusat-01", "Branch_City": "Jakarta", "Region": "Jabodetabek"},
    {"Outlet_Name": "JKT-Selatan-02", "Branch_City": "Jakarta", "Region": "Jabodetabek"},
    {"Outlet_Name": "BDO-Utara-01", "Branch_City": "Bandung", "Region": "Jawa Barat"},
    {"Outlet_Name": "SUB-Timur-01", "Branch_City": "Surabaya", "Region": "Jawa Timur"}
]

products = {
    "Makanan Utama": [
        {"Product_Name": "Paket Ayam Kremes", "SKU_Variant": "AK-01", "Price": 35000, "COGS": 18000},
        {"Product_Name": "Ayam Geprek Jumbo", "SKU_Variant": "AG-02", "Price": 30000, "COGS": 15000},
        {"Product_Name": "Nasi Goreng Spesial", "SKU_Variant": "NG-01", "Price": 28000, "COGS": 12000},
        {"Product_Name": "Sate Taichan Goreng", "SKU_Variant": "ST-01", "Price": 25000, "COGS": 10000}
    ],
    "Minuman": [
        {"Product_Name": "Es Teh Manis", "SKU_Variant": "ET-01", "Price": 8000, "COGS": 2000},
        {"Product_Name": "Es Jeruk Peras", "SKU_Variant": "EJ-01", "Price": 12000, "COGS": 4000},
        {"Product_Name": "Kopi Susu Gula Aren", "SKU_Variant": "KS-01", "Price": 18000, "COGS": 7000}
    ],
    "Cemilan & Tambahan": [
        {"Product_Name": "Tahu Tempe Goreng", "SKU_Variant": "TT-01", "Price": 10000, "COGS": 4000},
        {"Product_Name": "Kulit Ayam Crispy", "SKU_Variant": "KA-01", "Price": 15000, "COGS": 6000},
        {"Product_Name": "Extra Sambal Bawang", "SKU_Variant": "ES-01", "Price": 5000, "COGS": 1000}
    ]
}

channels = [
    {"Channel": "Dine-In", "Platform_Fee_Pct": 0.0},
    {"Channel": "Takeaway", "Platform_Fee_Pct": 0.0},
    {"Channel": "GoFood", "Platform_Fee_Pct": 0.20},
    {"Channel": "GrabFood", "Platform_Fee_Pct": 0.20},
    {"Channel": "ShopeeFood", "Platform_Fee_Pct": 0.15}
]

demographics = ["L, 18-24", "P, 18-24", "L, 25-35", "P, 25-35", "L, 36-45", "P, 36-45"]
waste_reasons = ["Kadaluarsa", "Rusak Kemasan", "Kesalahan Masak", "Tumpah", "Kualitas Buruk"]

# Bundling logic for affinity
bundles = [
    [products["Makanan Utama"][0], products["Minuman"][0]], # Paket Ayam Kremes + Es Teh Manis
    [products["Makanan Utama"][1], products["Cemilan & Tambahan"][0]], # Ayam Geprek + Tahu Tempe
    [products["Makanan Utama"][2], products["Minuman"][2], products["Cemilan & Tambahan"][1]] # Nasi Goreng + Kopi Susu + Kulit Ayam
]

data = []
start_date = datetime(2026, 1, 1)

for i in range(NUM_TRANSACTIONS):
    # Generate Date (distributed over 6 months, slight increase in later months)
    days_offset = random.randint(0, 180)
    # Give bias to lunch and dinner times
    hour = random.choice([11, 12, 13, 18, 19, 20] * 3 + list(range(7, 23)))
    minute = random.randint(0, 59)
    trx_date = start_date + timedelta(days=days_offset, hours=hour, minutes=minute)
    
    # Base transaction data
    trx_id = f"TRX-{trx_date.strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
    branch = random.choice(branches)
    channel = random.choices(channels, weights=[30, 20, 25, 15, 10])[0]
    demo = random.choice(demographics)
    
    # Determine what's bought in this transaction
    items_to_buy = []
    if random.random() < 0.4: # 40% chance of a bundle (creates strong affinity)
        bundle = random.choice(bundles)
        for item in bundle:
            # Need to clone dict to add category
            cat = next(cat for cat, p_list in products.items() if item in p_list)
            i_copy = item.copy()
            i_copy['Category'] = cat
            items_to_buy.append(i_copy)
    else: # Random 1-3 items
        num_items = random.randint(1, 3)
        for _ in range(num_items):
            cat = random.choice(list(products.keys()))
            item = random.choice(products[cat]).copy()
            item['Category'] = cat
            items_to_buy.append(item)
            
    # Remove exact duplicates within same transaction (just increase qty instead, but for simplicity let's just use unique items)
    unique_items = {i["SKU_Variant"]: i for i in items_to_buy}.values()
    
    for item in unique_items:
        qty = random.randint(1, 3)
        price = item["Price"]
        cogs = item["COGS"] * qty
        gross_sales = price * qty
        platform_fee = gross_sales * channel["Platform_Fee_Pct"]
        
        # Waste simulation
        waste_qty = 0
        waste_reason = "-"
        if random.random() < 0.05: # 5% chance of waste
            waste_qty = random.randint(1, 2)
            waste_reason = random.choice(waste_reasons)
            
        data.append({
            "Transaction_ID": trx_id,
            "Date": trx_date.strftime("%Y-%m-%d %H:%M:%S"),
            "Total_Sales": gross_sales,
            "Platform_Fee": platform_fee,
            "COGS_Total": cogs,
            "Shipping_Cost": random.choice([0, 10000, 15000]) if channel["Channel"] not in ["Dine-In", "Takeaway"] else 0,
            "Sales_Channel": channel["Channel"],
            "Payment_Method": random.choice(["Cash", "QRIS", "Credit Card", "E-Wallet"]),
            "Payment_Status": "paid",
            "Product_Name": item["Product_Name"],
            "SKU_Variant": item["SKU_Variant"],
            "Category": item["Category"],
            "Qty_Sold": qty,
            "Price_Per_Unit": price,
            "Stock_Remaining": random.randint(10, 150),
            "Waste_Qty": waste_qty,
            "Waste_Reason": waste_reason,
            "Outlet_Name": branch["Outlet_Name"],
            "Branch_City": branch["Branch_City"],
            "Region": branch["Region"],
            "Cust_Demographic": demo,
            "Notes": "Auto generated"
        })

df = pd.DataFrame(data)
df = df.sort_values(by="Date")
df.to_csv(OUTPUT_FILE, index=False)
print(f"Generated {len(df)} records across {df['Transaction_ID'].nunique()} transactions.")
print(f"File saved to {OUTPUT_FILE}")
