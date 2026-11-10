import json
import tomllib
from pathlib import Path

root = Path(__file__).resolve().parents[1]
config = tomllib.loads((root / "wrangler.local.toml").read_text(encoding="utf-8"))
package = json.loads((root / "package.json").read_text(encoding="utf-8"))

assert config.get("name") == "2020khoda-global-ai-core-candidate-local"
assert config.get("main") == "src/index.js"
assert "d1_databases" not in config, "Local Candidate config must not bind any D1 database"
assert config.get("ai", {}).get("binding") == "AI"
assert config.get("ai", {}).get("remote") is True
assert package.get("devDependencies", {}).get("wrangler") == "4.159.0"

print("PASS: isolated local Candidate config has remote Workers AI and no D1 binding.")
