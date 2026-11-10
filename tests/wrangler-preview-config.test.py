import json
import tomllib
from pathlib import Path

root = Path(__file__).resolve().parents[1]
config = tomllib.loads((root / "wrangler.toml").read_text(encoding="utf-8"))
package = json.loads((root / "package.json").read_text(encoding="utf-8"))

assert config.get("name") == "2020khoda-global-ai-core"
assert config.get("main") == "src/index.js"
assert config.get("ai", {}).get("binding") == "AI", "Production AI binding must match env.AI"
assert config.get("previews", {}).get("ai", {}).get("binding") == "AI"
assert "d1_databases" not in config.get("previews", {}), "Preview must not bind Production D1"
prod_d1 = config.get("d1_databases", [])
assert len(prod_d1) == 1
assert prod_d1[0].get("binding") == "DB"
assert prod_d1[0].get("database_name") == "2020khoda-crm"
assert prod_d1[0].get("database_id") == "25e5ebc9-4809-4028-ab26-349ba359c53f"
assert "preview_database_id" not in prod_d1[0]
assert package.get("devDependencies", {}).get("wrangler") == "4.159.0"

print("PASS: Wrangler Preview block, AI binding, D1 isolation, and pinned Wrangler version.")
