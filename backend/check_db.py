import os
import json
from supabase import create_client

with open("d:\\Fillax---\\backend\\.env", "r") as f:
    env_content = f.read()

env = {}
for line in env_content.splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

url = env.get("SUPABASE_URL")
key = env.get("SUPABASE_SERVICE_KEY")

supabase = create_client(url, key)

output = {}

rec_res = supabase.table("receipts").select("*").execute()
output["receipts"] = rec_res.data

tx_res = supabase.table("transactions").select("*").execute()
output["transactions"] = tx_res.data

prof_res = supabase.table("profiles").select("*").execute()
output["profiles"] = prof_res.data

line_res = supabase.table("line_profiles").select("*").execute()
output["line_profiles"] = line_res.data

# Write safely to a json file in UTF-8
with open("db_output.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("Successfully wrote database data to db_output.json! Lengths:")
print(f"Receipts: {len(rec_res.data)}")
print(f"Transactions: {len(tx_res.data)}")
print(f"Profiles: {len(prof_res.data)}")
print(f"Line Profiles: {len(line_res.data)}")
