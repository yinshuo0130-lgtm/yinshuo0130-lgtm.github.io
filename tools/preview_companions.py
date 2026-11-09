"""Assemble exported sprites at exactly 8x nearest-neighbor for visual QA."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sheet = Image.new('RGB', (1600, 800), '#FFF4DC')
draw = ImageDraw.Draw(sheet)

def place(name, x, y, size=None):
    sprite = Image.open(ROOT / 'img' / 'px' / (name + '.png')).convert('RGBA')
    if size:
        sprite = sprite.resize(size, Image.Resampling.NEAREST)
    draw.text((x, y - 22), name + (f' {size[0]}x{size[1]}' if size else ''), fill='#1F1A24')
    sprite = sprite.resize((sprite.width * 8, sprite.height * 8), Image.Resampling.NEAREST)
    for sy in range(y, y + sprite.height, 8):
        for sx in range(x, x + sprite.width, 8):
            draw.rectangle((sx, sy, sx+7, sy+7), fill='#DADDE1' if ((sx-x+sy-y)//8)%2 else '#F1F3F5')
    sheet.paste(sprite, (x, y), sprite)

place('runner', 32, 40)
place('cat', 32, 290)
place('avatar', 32, 490)
place('favicon', 360, 490)
place('favicon', 688, 490, (16, 16))
place('cat_party', 920, 490)
target = ROOT / 'output' / 'preview_sheet.png'
target.parent.mkdir(exist_ok=True)
sheet.save(target)
print(target)
