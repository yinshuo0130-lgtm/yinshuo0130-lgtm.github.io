"""Create a fresh public-only deployment zip; source photos/output never enter it."""
from datetime import datetime
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIRS = ('css', 'js', 'fonts', 'files', 'img', 'projects')
files = list(ROOT.glob('*.html')) + [ROOT / '.nojekyll']
for directory in PUBLIC_DIRS:
    files.extend(p for p in (ROOT / directory).rglob('*') if p.is_file())
target = ROOT / 'output' / ('portfolio-public-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.zip')
target.parent.mkdir(exist_ok=True)
with ZipFile(target, 'x', ZIP_DEFLATED) as archive:
    for path in sorted(files):
        if path.is_symlink() or not path.resolve().is_relative_to(ROOT):
            raise ValueError(f'Public file escapes site directory: {path}')
        archive.write(path, path.relative_to(ROOT).as_posix())
print(f'{len(files)} public files -> {target}')
