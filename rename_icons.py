import os
from PIL import Image

renames = {
    "60гранул.webp": "granule_60.webp",
    "300гранул.webp": "granule_300.webp",
    "980гранул.webp": "granule_980.webp",
    "1980гранул.webp": "granule_1980.webp",
    "3280гранул.webp": "granule_3280.webp",
    "6480гранул.webp": "granule_6480.webp",
}

for old, new in renames.items():
    if os.path.exists(old):
        os.replace(old, new)
        im = Image.open(new)
        print(f"OK: {new}  {im.size} {im.mode}")
    else:
        print("НЕ НАЙДЕН:", old)
