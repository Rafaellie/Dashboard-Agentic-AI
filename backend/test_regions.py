import psycopg2

regions = [
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 
    'ap-south-1', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 
    'eu-west-1', 'eu-west-2', 'eu-central-1', 'sa-east-1', 'ca-central-1'
]

print("Scanning regions...")
for r in regions:
    host = f"aws-0-{r}.pooler.supabase.com"
    dsn = f"postgresql://postgres.vrkdeptlgfjsirejztin:DABIwitproject123@{host}:6543/postgres?sslmode=require"
    try:
        conn = psycopg2.connect(dsn, connect_timeout=3)
        print(f"SUCCESS! Region is: {r}")
        conn.close()
        break
    except Exception as e:
        msg = str(e)
        if "tenant/user" in msg and "not found" in msg:
            # Tenant not in this region
            print(f"Region {r}: Not found")
            continue
        print(f"Region {r} error: {msg}")

print("Scan complete.")
