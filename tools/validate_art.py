"""Read-only pixel-asset validation against ART_SPEC.md (requires Pillow)."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


SPECS = {
    "runner": (192, 24, 8), "coin": (48, 12, 4),
    "block": (32, 16, 2), "ground": (16, 16, 1),
    "brick": (16, 16, 1), "cloud": (48, 24, 1),
    "hills": (128, 48, 1), "flag": (16, 48, 1),
    "frame": (24, 24, 1), "icons": (192, 16, 12),
    "avatar": (32, 32, 1), "favicon": (32, 32, 1),
    "door": (32, 24, 2), "lighthouse": (32, 64, 1),
    "cat": (192, 16, 8), "cat_party": (24, 24, 1),
}
OPAQUE = {"ground", "brick", "avatar"}
OUTLINE = (31, 26, 36, 255)
PAPER = (255, 244, 220, 255)
ICON_NAMES = ["pad", "film", "book", "trophy", "mail", "pdf",
              "ext", "heart", "clock", "star", "lock", "map"]


def check_assets(directory: Path) -> dict:
    report = {"directory": str(directory.resolve()), "errors": [], "warnings": [], "assets": {}}
    errors, warnings = report["errors"], report["warnings"]
    for name, (width, height, frame_count) in SPECS.items():
        path = directory / f"{name}.png"
        if not path.is_file():
            errors.append(f"{name}: missing file")
            continue
        with Image.open(path) as source:
            info = {"size": list(source.size), "mode": source.mode, "format": source.format}
            report["assets"][name] = info
            if source.format != "PNG" or source.mode != "RGBA":
                errors.append(f"{name}: must be PNG RGBA, got {source.format} {source.mode}")
            if source.size != (width, height):
                errors.append(f"{name}: expected {width}x{height}, got {source.size}")
                continue
            image = source.convert("RGBA")
        alpha = image.getchannel("A")
        alpha_values = set(alpha.get_flattened_data())
        info["alpha_values"] = sorted(alpha_values)
        if not alpha_values <= {0, 255}:
            errors.append(f"{name}: semitransparent pixels present")
        if name in OPAQUE and alpha_values != {255}:
            errors.append(f"{name}: background must be fully opaque")
        if name not in OPAQUE and 0 not in alpha_values:
            warnings.append(f"{name}: no transparent pixels; inspect whether shape fills its canvas")
        info["opaque_colors"] = len({p[:3] for p in image.get_flattened_data() if p[3]})
        cells, boxes = [], []
        for index in range(frame_count):
            fw = width // frame_count
            cell = image.crop((index * fw, 0, (index + 1) * fw, height))
            box = cell.getchannel("A").getbbox()
            boxes.append(list(box) if box else None)
            cells.append(cell)
            if box is None:
                errors.append(f"{name}[{index}]: empty frame")
        info["frame_bounds"] = boxes
        digests = [hashlib.sha256(cell.tobytes()).hexdigest() for cell in cells]
        info["distinct_frames"] = len(set(digests))
        if frame_count > 1 and len(set(digests)) < frame_count:
            warnings.append(f"{name}: {len(set(digests))}/{frame_count} distinct frames; inspect repeated poses")
        if name in {"runner", "cat", "cat_party"}:
            for index, box in enumerate(boxes):
                if box and box[3] != height:
                    errors.append(f"{name}[{index}]: bottom row is {box[3]-1}, expected {height-1}")
            if name.startswith("cat"):
                allowed = {(31, 26, 36), (58, 49, 66), (156, 144, 133),
                           (110, 101, 92), (255, 255, 255), (230, 207, 159),
                           (255, 200, 61), (242, 160, 166)}
                if name == "cat_party":
                    allowed.add((229, 72, 77))
                if any(p[3] and p[:3] not in allowed for p in image.get_flattened_data()):
                    errors.append(f"{name}: color outside companion palette")
                for index, cell in enumerate(cells):
                    pink = sum(p == (242, 160, 166, 255) for p in cell.get_flattened_data())
                    if pink > 3:
                        errors.append(f"{name}[{index}]: {pink} pink pixels, maximum 3")
        elif name == "coin":
            edge = boxes[2]
            if edge and not 1 <= edge[2] - edge[0] <= 3:
                errors.append(f"coin[2]: edge width {edge[2]-edge[0]}, expected about 2")
            if edge and any(box and edge[2] - edge[0] >= box[2] - box[0]
                            for index, box in enumerate(boxes) if index != 2):
                errors.append("coin[2]: edge-on frame is not narrower than other frames")
        elif name == "icons":
            icon_details = []
            for index, (cell, box) in enumerate(zip(cells, boxes)):
                colors = {p for p in cell.get_flattened_data() if p[3] and p != OUTLINE}
                icon_details.append({"name": ICON_NAMES[index], "interior_colors": len(colors)})
                if box and (box[0] < 1 or box[1] < 1 or box[2] > 15 or box[3] > 15):
                    errors.append(f"icons[{index}] {ICON_NAMES[index]}: missing 1px transparent margin")
                if len(colors) > 3:
                    errors.append(f"icons[{index}] {ICON_NAMES[index]}: {len(colors)} colors besides outline, maximum 3")
            info["icons"] = icon_details
        elif name == "frame":
            center = set(image.crop((8, 8, 16, 16)).get_flattened_data())
            info["center_colors"] = [list(c) for c in sorted(center)]
            if center != {PAPER}:
                errors.append("frame: middle 8x8 must be solid #FFF4DC")
            corners = [(0, 0), (23, 0), (0, 23), (23, 23)]
            if any(image.getpixel(p)[3] != 0 for p in corners):
                errors.append("frame: all four outer corner pixels must be transparent")
            missing_border = []
            for y in range(24):
                for x in range(24):
                    if (x, y) in corners:
                        continue
                    if x < 2 or x > 21 or y < 2 or y > 21:
                        if image.getpixel((x, y)) != OUTLINE:
                            missing_border.append((x, y))
            if missing_border:
                errors.append(f"frame: {len(missing_border)} pixels differ from exact 2px dark border")
            bottom_shade = set(image.crop((2, 20, 22, 22)).get_flattened_data())
            if bottom_shade != {(243, 226, 188, 255)}:
                warnings.append("frame: bottom two interior rows are not uniform #F3E2BC")
        elif name == "avatar":
            info["corner_colors"] = [list(image.getpixel(p)) for p in
                                      [(0, 0), (31, 0), (0, 31), (31, 31)]]
        if name in {"ground", "brick", "hills"}:
            lr_diff = sum(image.getpixel((0, y)) != image.getpixel((width - 1, y))
                          for y in range(height))
            info["opposite_edge_difference_pixels_x"] = lr_diff
            if lr_diff:
                warnings.append(f"{name}: {lr_diff}/{height} opposite horizontal edge pixels differ; visually inspect tiling")
            if name == "brick":
                tb_diff = sum(image.getpixel((x, 0)) != image.getpixel((x, height - 1))
                              for x in range(width))
                info["opposite_edge_difference_pixels_y"] = tb_diff
                if tb_diff:
                    warnings.append(f"brick: {tb_diff}/{width} opposite vertical edge pixels differ; visually inspect tiling")
            if name == "hills":
                edge_tops = []
                for x in (0, width - 1):
                    ys = [y for y in range(height) if image.getpixel((x, y))[3]]
                    edge_tops.append(min(ys) if ys else None)
                info["edge_top_y"] = edge_tops
                if edge_tops[0] != edge_tops[1]:
                    errors.append(f"hills: seam silhouette heights differ: {edge_tops}")
    report["passed"] = not errors
    report["requires_visual_qa"] = [
        "Character identity, head/body ratio, right-facing direction, six-frame loop and jump/idle semantics",
        "Gear and save-block symbols, correct icon order/content, door state order",
        "Original designs, palette hues, top-left lighting and one-pixel outlines",
        "Seamless repeated tiles, nine-slice stretching, lighthouse lamp at (16,11)",
        "Browser boot, keyboard play and 200% pixelation; favicon readability at 16x16",
    ]
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", type=Path,
                        default=Path(__file__).resolve().parents[1] / "img" / "px")
    parser.add_argument("--json", action="store_true", help="Print full JSON report")
    args = parser.parse_args()
    report = check_assets(args.directory)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(f"{len(report['assets'])}/{len(SPECS)} files; {len(report['errors'])} errors; {len(report['warnings'])} warnings")
        for level in ("errors", "warnings"):
            for message in report[level]:
                print(f"{level[:-1].upper()}: {message}")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
