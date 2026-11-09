"""把 Fusion Pixel 12px 裁成全站用到的字符子集，输出 fonts/fusion-pixel-site.woff2。

改了任何页面的文字后重新运行一次：
    python tools/build_font.py "<fusion-pixel-12px-proportional-zh_hans.ttf 的路径>"
不传路径时用默认位置。字体以 SIL OFL 1.1 授权，许可证复制到 fonts/OFL.txt。
"""
import sys, shutil
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
LOCAL_SRC = ROOT / 'output/font-source/fusion-pixel-12px-proportional-zh_hans.ttf.woff2'
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else LOCAL_SRC
OUT = ROOT / "fonts" / "fusion-pixel-site.woff2"

chars = set(chr(c) for c in range(0x20, 0x7f))
chars.update("　，。、：；！？「」『』（）《》〈〉【】“”‘’…—·×÷←→↑↓▶◀▲▼↗★☆●○■□％")
for p in ROOT.rglob("*"):
    if p.suffix.lower() in (".html", ".js", ".css") and not {'node_modules', 'output', '.git'} & set(p.relative_to(ROOT).parts):
        chars.update(p.read_text(encoding="utf-8", errors="ignore"))
chars = {c for c in chars if c.isprintable() or c == "\u3000"}

font = TTFont(SRC)
cmap = font.getBestCmap()
have = [c for c in chars if ord(c) in cmap]
missing = sorted(c for c in chars if ord(c) not in cmap and ord(c) > 0x2e80)

opts = subset.Options()
opts.flavor = "woff2"
opts.layout_features = ["*"]
opts.name_IDs = ["*"]
opts.notdef_outline = True
sub = subset.Subsetter(opts)
sub.populate(text="".join(have))
sub.subset(font)
OUT.parent.mkdir(parents=True, exist_ok=True)
font.flavor = "woff2"
font.save(OUT)
lic = SRC.parent / "OFL.txt"
if lic.exists():
    shutil.copy(lic, OUT.parent / "OFL.txt")
print(f"{len(have)} glyphs -> {OUT} ({OUT.stat().st_size // 1024} KB)")
if missing:
    print("字体里没有这些字，会回退到系统字体：", "".join(missing))
