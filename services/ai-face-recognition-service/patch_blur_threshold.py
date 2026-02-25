import re

file_path = "app/config/rate_config.py"
with open(file_path, "r", encoding="utf-8") as file:
    content = file.read()

# Replace BLUR_THRESHOLD
# We will lower the BLUR_THRESHOLD
content = re.sub(r"BLUR_THRESHOLD\s*=\s*os\.getenv\(\s*\'BLUR_THRESHOLD\'\s*,\s*\'30\.0\'\s*\)", r"BLUR_THRESHOLD = os.getenv('BLUR_THRESHOLD', '15.0')", content)

with open(file_path, "w", encoding="utf-8") as file:
    file.write(content)
