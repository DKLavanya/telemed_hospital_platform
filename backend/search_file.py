with open("C:/Users/dklav/.gemini/antigravity/scratch/telemed-platform/backend/app/api/endpoints.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("Get records endpoint search:")
in_route = False
for i, line in enumerate(lines):
    if "@router.get(\"/records\"" in line or "@router.get('/records'" in line:
        in_route = True
    if in_route:
        print(f"Line {i+1}: {line.rstrip()}")
        if "def " in line:
            # Print next 10 lines
            for j in range(1, 15):
                print(f"Line {i+j+1}: {lines[i+j].rstrip()}")
            in_route = False
