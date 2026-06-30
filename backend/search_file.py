with open("C:/Users/dklav/.gemini/antigravity/scratch/telemed-platform/frontend/app/globals.css", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "button" in line:
        print(f"Line {i+1}: {line.strip()}")
