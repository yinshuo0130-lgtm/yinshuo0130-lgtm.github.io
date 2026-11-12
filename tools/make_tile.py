"""生成阅读区的像素砖墙底纹：img/px/wall.png（纸色）和 img/px/wall-2.png（深一档纸色）。
64×64 原尺寸，页面里按 2 倍、pixelated 平铺。砖 32×16，隔行错开半块；
每块砖的底色在三档相近的纸色里随机挑，左上一像素高光、右下一像素阴影，偶尔几粒斑点。
对比度刻意压得很低，正文直接压在上面也不影响阅读。
用法：python tools/make_tile.py"""
import random
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def shade(c, k):
    return tuple(max(0, min(255, round(v * k))) for v in c)


def wall(base, out, seed=7):
    rnd = random.Random(seed)
    b = hexrgb(base)
    tones = [b, shade(b, 0.988), shade(b, 0.976)]
    mortar = shade(b, 0.952)
    hi = shade(b, 1.012)
    lo = shade(b, 0.968)
    speck = shade(b, 0.962)
    W = H = 64
    im = Image.new('RGB', (W, H), mortar)
    px = im.load()
    for row in range(H // 16):
        off = 0 if row % 2 == 0 else 16
        for col in range(-1, W // 32 + 1):
            x0 = col * 32 + off
            tone = rnd.choice(tones)
            for y in range(row * 16, row * 16 + 15):          # 下边留 1 像素灰缝
                for x in range(x0, x0 + 31):                  # 右边留 1 像素灰缝
                    xx = x % W
                    c = tone
                    if y == row * 16 or x == x0:
                        c = hi
                    elif y == row * 16 + 14 or x == x0 + 30:
                        c = lo
                    px[xx, y] = c
            for _ in range(rnd.randint(0, 3)):
                sx = (x0 + rnd.randint(3, 27)) % W
                sy = row * 16 + rnd.randint(3, 11)
                px[sx, sy] = speck
    im.save(out)
    print('->', out)


if __name__ == '__main__':
    wall('#fff4dc', ROOT / 'img/px/wall.png')
    wall('#f3e2bc', ROOT / 'img/px/wall-2.png', seed=11)
