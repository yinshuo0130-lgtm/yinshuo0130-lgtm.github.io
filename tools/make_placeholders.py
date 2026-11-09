"""生成像素素材的占位图。

正式素材由 Codex 按 ART_SPEC.md 绘制，文件名、尺寸、帧数和这里完全一致，
放进 img/px/ 覆盖即可，网页代码不用改。

运行：python tools/make_placeholders.py（在作品集根目录）
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "img" / "px"
OUT.mkdir(parents=True, exist_ok=True)

# 站点色板，和 css/shell.css 的变量一致
INK = (31, 26, 36, 255)
PAPER = (255, 244, 220, 255)
PAPER2 = (243, 226, 188, 255)
GOLD = (255, 200, 61, 255)
GOLD_D = (217, 138, 28, 255)
RED = (229, 72, 77, 255)
BLUE = (58, 111, 216, 255)
BLUE_D = (38, 70, 150, 255)
GRASS = (91, 191, 58, 255)
GRASS_D = (46, 125, 50, 255)
DIRT = (200, 118, 58, 255)
DIRT_D = (138, 75, 34, 255)
SKIN = (242, 194, 155, 255)
HAIR = (59, 42, 32, 255)
WHITE = (255, 255, 255, 255)
CLOUD_S = (214, 232, 247, 255)
HILL = (120, 196, 96, 255)
HILL_D = (84, 160, 70, 255)
T = (0, 0, 0, 0)


def new(w, h):
    return Image.new("RGBA", (w, h), T)


def rect(d, x, y, w, h, c):
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)


def save(img, name):
    img.save(OUT / name)
    print(name, img.size)


# ---------- runner.png：8 帧 × 24×24，0–5 跑步，6 跳跃，7 站立 ----------
def draw_runner(d, ox, legs, arm, bob, jump=False):
    y0 = 2 + bob
    # 头发与头
    rect(d, ox + 8, y0, 9, 3, HAIR)
    rect(d, ox + 7, y0 + 2, 11, 8, INK)
    rect(d, ox + 8, y0 + 3, 9, 6, SKIN)
    rect(d, ox + 8, y0 + 2, 9, 2, HAIR)
    rect(d, ox + 15, y0 + 5, 1, 2, INK)  # 眼
    rect(d, ox + 12, y0 + 5, 1, 2, INK)
    # 身体（蓝色卫衣）与金色围巾
    rect(d, ox + 8, y0 + 10, 9, 7, INK)
    rect(d, ox + 9, y0 + 11, 7, 5, BLUE)
    rect(d, ox + 9, y0 + 10, 7, 1, GOLD)
    # 背包
    rect(d, ox + 5, y0 + 11, 4, 5, INK)
    rect(d, ox + 6, y0 + 12, 2, 3, GOLD_D)
    # 手臂
    ax = ox + 16 + arm
    rect(d, ax, y0 + 11, 2, 4, INK)
    rect(d, ax, y0 + 14, 2, 1, SKIN)
    # 腿与鞋
    for lx, ly in legs:
        rect(d, ox + lx, y0 + 17 + ly, 2, 3, BLUE_D)
        rect(d, ox + lx - (0 if jump else 0), y0 + 20 + ly, 3, 1, RED)


runner = new(24 * 8, 24)
rd = ImageDraw.Draw(runner)
cycle = [
    ([(9, 0), (14, -1)], 1, 0),
    ([(10, 0), (13, 0)], 0, -1),
    ([(12, -1), (11, 0)], -1, 0),
    ([(14, -1), (9, 0)], 0, 0),
    ([(13, 0), (10, 0)], 1, -1),
    ([(11, 0), (12, -1)], 0, 0),
]
for i, (legs, arm, bob) in enumerate(cycle):
    draw_runner(rd, i * 24, legs, arm, bob)
draw_runner(rd, 6 * 24, [(9, -2), (14, -1)], 1, -2, jump=True)
draw_runner(rd, 7 * 24, [(10, 0), (13, 0)], -1, 0)
save(runner, "runner.png")

# ---------- coin.png：4 帧 × 12×12，齿轮硬币旋转 ----------
coin = new(48, 12)
cd = ImageDraw.Draw(coin)
for i, w in enumerate([10, 6, 2, 6]):
    ox = i * 12 + (12 - w) // 2
    cd.ellipse([ox, 1, ox + w - 1, 10], fill=INK)
    if w > 2:
        cd.ellipse([ox + 1, 2, ox + w - 2, 9], fill=GOLD)
        rect(cd, i * 12 + 5, 4, 2, 4, GOLD_D)
save(coin, "coin.png")

# ---------- block.png：2 帧 × 16×16，存档方块（正常 / 已顶过） ----------
block = new(32, 16)
bd = ImageDraw.Draw(block)
for i, (face, mark) in enumerate([(GOLD, WHITE), (DIRT_D, DIRT)]):
    ox = i * 16
    rect(bd, ox, 0, 16, 16, INK)
    rect(bd, ox + 1, 1, 14, 14, face)
    for px, py in [(2, 2), (13, 2), (2, 13), (13, 13)]:
        rect(bd, ox + px, py, 1, 1, INK)
    # 星形记号（不用问号，避免和其他作品雷同）
    rect(bd, ox + 7, 4, 2, 8, mark)
    rect(bd, ox + 4, 7, 8, 2, mark)
    rect(bd, ox + 5, 5, 6, 6, mark if i == 0 else face)
    if i == 0:
        rect(bd, ox + 6, 6, 4, 4, GOLD_D)
save(block, "block.png")

# ---------- ground.png：16×16，可横向平铺的草地 ----------
g = new(16, 16)
gd = ImageDraw.Draw(g)
rect(gd, 0, 0, 16, 16, DIRT)
rect(gd, 0, 0, 16, 4, GRASS)
rect(gd, 0, 4, 16, 1, GRASS_D)
for x, y in [(2, 8), (9, 11), (13, 7), (5, 13)]:
    rect(gd, x, y, 2, 1, DIRT_D)
for x in (3, 10):
    rect(gd, x, 4, 1, 2, GRASS_D)
save(g, "ground.png")

# ---------- brick.png：16×16，加载条轨道 ----------
b = new(16, 16)
bkd = ImageDraw.Draw(b)
rect(bkd, 0, 0, 16, 16, DIRT_D)
for y, off in [(0, 0), (8, 4)]:
    for x in range(-8, 16, 8):
        rect(bkd, x + off + 1, y + 1, 6, 6, DIRT)
save(b, "brick.png")

# ---------- cloud.png：48×24 ----------
c = new(48, 24)
ccd = ImageDraw.Draw(c)
for (x, y, w, h) in [(4, 10, 40, 12), (10, 4, 14, 14), (22, 2, 16, 16)]:
    ccd.ellipse([x, y, x + w, y + h], fill=WHITE)
rect(ccd, 6, 19, 36, 3, CLOUD_S)
save(c, "cloud.png")

# ---------- hills.png：128×48，可横向平铺的远山 ----------
h = new(128, 48)
hd = ImageDraw.Draw(h)
hd.polygon([(0, 48), (0, 30), (20, 14), (44, 30), (64, 22), (92, 6), (128, 30), (128, 48)], fill=HILL)
hd.polygon([(0, 48), (0, 40), (30, 30), (64, 40), (100, 28), (128, 40), (128, 48)], fill=HILL_D)
save(h, "hills.png")

# ---------- flag.png：16×48，终点旗 ----------
f = new(16, 48)
fd = ImageDraw.Draw(f)
rect(fd, 3, 2, 2, 46, INK)
rect(fd, 2, 0, 4, 3, GOLD)
fd.polygon([(5, 4), (15, 9), (5, 14)], fill=RED)
rect(fd, 0, 44, 8, 4, DIRT_D)
save(f, "flag.png")

# ---------- frame.png：24×24 九宫格对话框，角 8px ----------
fr = new(24, 24)
frd = ImageDraw.Draw(fr)
rect(frd, 2, 0, 20, 24, INK)
rect(frd, 0, 2, 24, 20, INK)
rect(frd, 1, 1, 22, 22, INK)
rect(frd, 3, 2, 18, 20, PAPER)
rect(frd, 2, 3, 20, 18, PAPER)
rect(frd, 3, 19, 18, 2, PAPER2)
save(fr, "frame.png")

# ---------- icons.png：12 个 16×16 图标，顺序见 ART_SPEC.md ----------
ic = new(16 * 12, 16)
idr = ImageDraw.Draw(ic)


def icon(i, fn):
    fn(i * 16)


def i_pad(o):
    rect(idr, o + 1, 5, 14, 7, INK); rect(idr, o + 2, 6, 12, 5, BLUE)
    rect(idr, o + 4, 8, 3, 1, WHITE); rect(idr, o + 5, 7, 1, 3, WHITE)
    rect(idr, o + 11, 7, 1, 1, RED); rect(idr, o + 12, 9, 1, 1, GOLD)


def i_film(o):
    rect(idr, o + 1, 3, 14, 10, INK); rect(idr, o + 3, 5, 10, 6, BLUE)
    for x in (2, 6, 10, 13):
        rect(idr, o + x, 3, 1, 1, WHITE); rect(idr, o + x, 12, 1, 1, WHITE)


def i_book(o):
    rect(idr, o + 2, 2, 12, 12, INK); rect(idr, o + 3, 3, 10, 10, RED); rect(idr, o + 5, 5, 6, 1, PAPER)


def i_trophy(o):
    rect(idr, o + 4, 2, 8, 6, GOLD); rect(idr, o + 2, 3, 2, 3, GOLD_D); rect(idr, o + 12, 3, 2, 3, GOLD_D)
    rect(idr, o + 7, 8, 2, 3, GOLD_D); rect(idr, o + 5, 11, 6, 2, INK)


def i_mail(o):
    rect(idr, o + 1, 4, 14, 9, INK); rect(idr, o + 2, 5, 12, 7, PAPER)
    for k in range(5):
        rect(idr, o + 3 + k, 6 + k // 2, 1, 1, INK); rect(idr, o + 12 - k, 6 + k // 2, 1, 1, INK)


def i_pdf(o):
    rect(idr, o + 3, 1, 10, 14, INK); rect(idr, o + 4, 2, 8, 12, PAPER); rect(idr, o + 5, 9, 6, 3, RED)


def i_ext(o):
    rect(idr, o + 2, 4, 10, 10, INK); rect(idr, o + 3, 5, 8, 8, PAPER)
    rect(idr, o + 8, 2, 6, 2, BLUE); rect(idr, o + 12, 2, 2, 6, BLUE); rect(idr, o + 8, 6, 2, 2, BLUE)


def i_heart(o):
    rect(idr, o + 3, 4, 4, 3, RED); rect(idr, o + 9, 4, 4, 3, RED); rect(idr, o + 2, 6, 12, 3, RED)
    rect(idr, o + 4, 9, 8, 2, RED); rect(idr, o + 6, 11, 4, 2, RED)


def i_clock(o):
    idr.ellipse([o + 1, 1, o + 14, 14], fill=INK); idr.ellipse([o + 2, 2, o + 13, 13], fill=PAPER)
    rect(idr, o + 7, 4, 2, 5, INK); rect(idr, o + 8, 8, 3, 1, INK)


def i_star(o):
    rect(idr, o + 7, 1, 2, 14, GOLD); rect(idr, o + 1, 6, 14, 3, GOLD); rect(idr, o + 4, 4, 8, 8, GOLD)


def i_lock(o):
    rect(idr, o + 4, 2, 8, 6, INK); rect(idr, o + 6, 4, 4, 4, T); rect(idr, o + 3, 7, 10, 7, GOLD_D)


def i_map(o):
    rect(idr, o + 1, 3, 14, 10, INK); rect(idr, o + 2, 4, 12, 8, PAPER2)
    rect(idr, o + 4, 6, 2, 2, RED); rect(idr, o + 6, 8, 4, 1, DIRT_D); rect(idr, o + 10, 6, 2, 2, GRASS_D)


for i, fn in enumerate([i_pad, i_film, i_book, i_trophy, i_mail, i_pdf, i_ext, i_heart, i_clock, i_star, i_lock, i_map]):
    icon(i, fn)
save(ic, "icons.png")

# ---------- avatar.png：32×32 头像（关于我页的玩家卡） ----------
av = new(32, 32)
ad = ImageDraw.Draw(av)
rect(ad, 0, 0, 32, 32, (110, 181, 255, 255))
rect(ad, 8, 6, 16, 4, HAIR)
rect(ad, 7, 8, 18, 14, INK)
rect(ad, 8, 10, 16, 11, SKIN)
rect(ad, 8, 8, 16, 4, HAIR)
rect(ad, 12, 14, 2, 3, INK); rect(ad, 19, 14, 2, 3, INK)
rect(ad, 14, 19, 4, 1, (196, 120, 100, 255))
rect(ad, 6, 22, 20, 10, INK); rect(ad, 7, 23, 18, 9, BLUE); rect(ad, 7, 23, 18, 2, GOLD)
save(av, "avatar.png")

# ---------- favicon.png：32×32，取站立帧放大 ----------
fav = runner.crop((7 * 24 + 2, 0, 7 * 24 + 22, 24)).resize((20, 24), Image.NEAREST)
fv = new(32, 32)
fv.paste(fav, (6, 4), fav)
save(fv, "favicon.png")

# ---------- door.png：2 帧 × 16×24，关门 / 开门（首页“玩家档案”的三扇门） ----------
door = new(32, 24)
dd = ImageDraw.Draw(door)
for i in range(2):
    ox = i * 16
    rect(dd, ox + 1, 2, 14, 22, INK)
    rect(dd, ox + 1, 0, 14, 3, INK); rect(dd, ox + 3, 0, 10, 1, T)
    rect(dd, ox + 2, 3, 12, 21, DIRT_D)
    if i == 0:
        rect(dd, ox + 3, 4, 10, 20, DIRT)
        rect(dd, ox + 4, 6, 8, 6, DIRT_D); rect(dd, ox + 4, 14, 8, 8, DIRT_D)
        rect(dd, ox + 11, 13, 2, 2, GOLD)
    else:
        rect(dd, ox + 3, 4, 10, 20, (40, 30, 50, 255))
        rect(dd, ox + 3, 4, 3, 20, DIRT)
        rect(dd, ox + 7, 18, 4, 6, (255, 220, 120, 120))
save(door, "door.png")

# ---------- lighthouse.png：32×64，首页终点的灯塔 ----------
lh = new(32, 64)
ld = ImageDraw.Draw(lh)
ld.polygon([(9, 63), (23, 63), (20, 18), (12, 18)], fill=INK)
ld.polygon([(10, 62), (22, 62), (19, 19), (13, 19)], fill=PAPER)
for y in (26, 40, 54):
    rect(ld, 10, y, 12, 5, RED)
rect(ld, 9, 16, 14, 3, INK)
rect(ld, 11, 8, 10, 8, INK); rect(ld, 12, 9, 8, 6, GOLD)
ld.polygon([(10, 8), (16, 2), (22, 8)], fill=RED)
rect(ld, 15, 0, 2, 3, INK)
rect(ld, 4, 60, 24, 4, DIRT_D)
save(lh, "lighthouse.png")
