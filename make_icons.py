"""
Готовит иконки товаров для сайта.
Как пользоваться:
1. Создай рядом папку 'icons_raw' (скрипт создаст сам при первом запуске)
2. Накидай туда картинки (PNG с прозрачным фоном — лучше всего, с вики)
3. Запусти:  python make_icons.py
4. Готовые .webp 200x200 появятся в папке сайта — подключу их в код.
"""
import os
from PIL import Image

SRC = "icons_raw"   # папка с исходниками
SIZE = 200          # итоговый размер (квадрат)

os.makedirs(SRC, exist_ok=True)

files = [f for f in os.listdir(SRC) if f.lower().endswith((".png", ".webp", ".jpg", ".jpeg"))]
if not files:
    print(f"Папка '{SRC}' пустая. Положи туда картинки и запусти снова.")
else:
    for f in files:
        im = Image.open(os.path.join(SRC, f)).convert("RGBA")
        # вписываем в квадрат с прозрачными полями, сохраняя пропорции
        w, h = im.size
        scale = SIZE / max(w, h)
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        canvas.paste(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2), im)
        out = os.path.splitext(f)[0] + ".webp"
        canvas.save(out, "WEBP", quality=92)
        print(f"OK -> {out}")
    print(f"\nГотово! Обработано файлов: {len(files)}")
