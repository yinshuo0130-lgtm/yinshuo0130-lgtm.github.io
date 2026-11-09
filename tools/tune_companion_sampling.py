"""Choose reproducible sampling phases; never paint or synthesize sprite pixels.

Retain tiny generated tie stripes / eyes that a single center sample can miss.
The chosen absolute coordinates are stored in the export manifest for review.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'output/imagegen/companions/manifest.json'
entries = json.loads(path.read_text(encoding='utf-8'))
for entry in entries:
    name = entry['name']
    if name not in ('runner.png', 'cat.png', 'cat_party.png'):
        continue
    src = np.asarray(Image.open(ROOT / entry['source']).convert('RGBA'))
    palette = np.array([tuple(bytes.fromhex(c[1:])) for c in entry['palette'].split(',')])
    crops = entry.get('crops', [[0, 0, src.shape[1], src.shape[0]]])
    entry['frameXSamples'], entry['frameYSamples'] = [], []
    entry.setdefault('frameSizes', [[0, 24]])
    for i, (cx, cy, cw, ch) in enumerate(crops):
        yy, xx = np.where(src[cy:cy+ch, cx:cx+cw, 3] >= entry['alphaThreshold'])
        l, t, r, b = cx+xx.min(), cy+yy.min(), cx+xx.max()+1, cy+yy.max()+1
        w, h = entry['frameSizes'][i]
        if w == 0: w = round((r-l) * h / (b-t))
        best = None
        for px in [.2, .35, .5, .65, .8]:
            for py in [.2, .35, .5, .65, .8]:
                xs = l + np.minimum(r-l-1, ((np.arange(w)+px)*(r-l)/w).astype(int))
                ys = t + np.minimum(b-t-1, ((np.arange(h)+py)*(b-t)/h).astype(int))
                pixels = src[ys[:, None], xs[None, :]]
                opaque = pixels[:, :, 3] >= entry['alphaThreshold']
                if not opaque[-1].any(): continue
                delta = pixels[:, :, None, :3].astype(int)-palette
                color = np.argmin((delta*delta*np.array([2,3,1])).sum(axis=3), axis=2)
                def mask(hexcolor):
                    return (color == entry['palette'].split(',').index(hexcolor)) & opaque
                score = -abs(px-.5)-abs(py-.5)
                if name == 'runner.png':
                    reds = mask('#E5484D').sum()
                    score += 40 if 1 <= reds <= 2 else -20*abs(reds-1)
                    skin = mask('#F6D2B0') | mask('#D9A27E')
                    eyes = mask('#1F1A24') & np.roll(skin,1,axis=1) & np.roll(skin,-1,axis=1)
                    score += 35*min(1, eyes[:12].sum())
                    score += min(18, mask('#FFFFFF').sum())
                    score += min(16, skin[:12].sum())
                else:
                    gold = mask('#FFC83D').sum()
                    score += 50 if gold else -50
                    pink = mask('#F2A0A6').sum()
                    score += 12 if 1 <= pink <= 3 else -15*abs(pink-2)
                    score += min(25, mask('#FFFFFF').sum())/3
                # Avoid detached speckles without changing any generated pixel.
                isolated = opaque & ~(
                    np.pad(opaque[1:],((0,1),(0,0))) |
                    np.pad(opaque[:-1],((1,0),(0,0))) |
                    np.pad(opaque[:,1:],((0,0),(0,1))) |
                    np.pad(opaque[:,:-1],((0,0),(1,0))))
                score -= isolated.sum()*6
                if best is None or score > best[0]: best = score, xs, ys
        _, xs, ys = best
        fw = entry['width']//entry['frames']; fh = entry['height']
        xmap = [int(l)]*fw; ymap = [int(t)]*fh
        dx = (fw-w)//2; dy = fh-h
        xmap[dx:dx+w] = xs.tolist(); ymap[dy:dy+h] = ys.tolist()
        entry['frameXSamples'].append(xmap); entry['frameYSamples'].append(ymap)
        entry['frameSizes'][i] = [w,h]
path.write_text(json.dumps(entries,indent=2),encoding='utf-8')
print('Sampling coordinates saved; run export_generated_art.ps1 next.')
