import re
import pathlib

p = pathlib.Path("/home/ubuntu/Astalakshimi/.env")
print("=== CURRENT ENV (redacted) ===")
for line in p.read_text().splitlines():
    if not line.strip() or line.strip().startswith("#"):
        continue
    if "=" not in line:
        continue
    k, v = line.split("=", 1)
    if k == "DATABASE_URL":
        v = re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", v)
    elif any(x in k for x in ("SECRET", "PASSWORD", "ACCESS_KEY", "AUTH_KEY", "JWT_SECRET")):
        v = "***" if v else "(empty)"
    print(f"{k}={v}")
