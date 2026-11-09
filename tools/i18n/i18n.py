"""多语言构建：以根目录的简体中文页面为唯一源文件，生成 zh-hant/、en/、ja/ 三套静态页面。

用法：
    python tools/i18n/i18n.py extract   # 抽取全部待翻译单元 -> tools/i18n/units.json
    python tools/i18n/i18n.py build     # 生成三种语言的页面和像素字体子集
    python tools/i18n/i18n.py missing   # 列出 en / ja 还没翻译的单元

改了中文页面后：先 extract，再补 en.json / ja.json 里缺的条目（missing 会列出来），最后 build。
- 繁体：OpenCC s2twp 自动转换，个别用词在 zh-hant-fix.json 里修正。
- 英文 / 日文：en.json、ja.json，键是 units.json 里的 id（源文本的哈希），值是译文。
  源文本改动后 id 会变，旧译文自动失效，missing 会把它列出来。
"""
import hashlib, json, os, re, shutil, sys
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Comment, Tag

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
LANGS = {
    'zh-hant': {'html': 'zh-Hant', 'font': 'zh_tw',
                'body': '"PingFang TC","Microsoft JhengHei","Noto Sans TC","Heiti TC",system-ui,sans-serif',
                'px': '"Fusion Pixel","PingFang TC","Microsoft JhengHei",monospace'},
    'en': {'html': 'en', 'font': 'latin',
           'body': '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"PingFang SC","Microsoft YaHei",sans-serif',
           'px': '"Fusion Pixel",ui-monospace,Consolas,monospace'},
    'ja': {'html': 'ja', 'font': 'ja',
           'body': '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","YuGothic","Meiryo","Noto Sans JP",system-ui,sans-serif',
           'px': '"Fusion Pixel","Hiragino Sans","Yu Gothic","Meiryo",monospace'},
}
PAGES = ['index.html', 'about.html', 'resume.html',
         'projects/nightreign-mod.html', 'projects/tidewheel.html', 'projects/tidewound.html',
         'projects/naruto.html', 'projects/hearthstone.html', 'projects/burger/index.html']
SCRIPTS = ['js/site.js', 'js/stage.js', 'js/about.js', 'js/deck.js']
MIRRORED_DIRS = ('js/',)          # 每种语言各有一份（已翻译）
BLOCK = {'address', 'article', 'aside', 'blockquote', 'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption',
         'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main',
         'nav', 'ol', 'p', 'pre', 'section', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'ul',
         'button', 'label', 'select', 'svg', 'video', 'iframe', 'canvas', 'details', 'summary',
         'html', 'head', 'body', 'title'}
ATTRS = ('alt', 'title', 'aria-label', 'placeholder', 'content', 'data-tip', 'data-slot', 'data-title',
         'data-sub', 'data-meta', 'data-use', 'data-label', 'data-say', 'data-name', 'data-note', 'data-text')
TOKEN_ATTRS = ('data-tags',)      # 空格分隔的标签，逐个翻译（脚本按标签名筛选）
CJK = re.compile(r'[぀-ヿ㐀-鿿豈-﫿　-〿＀-￯“”‘’…—·]')
HAN = re.compile(r'[㐀-鿿]')


def uid(s):
    return hashlib.sha1(s.encode('utf-8')).hexdigest()[:10]


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def need(s):
    return bool(s) and bool(CJK.search(s))


# ---------------------------------------------------------------- HTML 单元
def cjk_attrs(el):
    for a in ATTRS + TOKEN_ATTRS:
        v = el.get(a)
        if isinstance(v, list):
            v = ' '.join(v)
        if isinstance(v, str) and need(v):
            return True
    return False


def has_block(el):
    # 含块级子元素，或子元素带中文属性（提示、alt 等）时不整块翻译，逐层往下拆
    return any(isinstance(d, Tag) and (d.name in BLOCK or cjk_attrs(d)) for d in el.descendants)


def inner(el):
    return ''.join(str(c) for c in el.contents)


def units_html(soup, cb):
    """cb(kind, key, setter)：kind 为 html/text；setter(new) 写回译文。"""
    def walk(el):
        for c in list(el.children):
            if isinstance(c, Comment):
                continue
            if isinstance(c, NavigableString):
                if c.parent.name in ('script', 'style'):
                    continue
                if need(str(c)):
                    raw = str(c)
                    lead = raw[:len(raw) - len(raw.lstrip())]
                    trail = raw[len(raw.rstrip()):]
                    key = norm(raw)
                    def put(new, c=c, lead=lead, trail=trail):
                        c.replace_with(NavigableString(lead + new + trail))
                    cb('text', key, put)
                continue
            if not isinstance(c, Tag) or c.name in ('script', 'style'):
                continue
            text = c.get_text()
            if need(text) and not has_block(c) and c.name not in ('svg',):
                if c.name == 'pre':
                    key = inner(c)
                else:
                    key = norm(inner(c))
                def put(new, c=c):
                    c.clear()
                    frag = BeautifulSoup(new, 'html.parser')
                    for n in list(frag.contents):
                        c.append(n)
                cb('html', key, put)
            else:
                walk(c)
    walk(soup)


def attr_units(soup, cb):
    for el in soup.find_all(True):
        for a in ATTRS:
            v = el.get(a)
            if isinstance(v, str) and need(v):
                if a == 'content' and el.name == 'meta' and el.get('http-equiv'):
                    continue
                def put(new, el=el, a=a):
                    el[a] = new
                cb('text', v, put)
        v = el.get('data-list')   # 系列作品清单：组;组，组 = 标题|名称 年份=图片,名称 年份=图片
        if isinstance(v, str) and need(v):
            parsed = []
            for g in v.split(';'):
                head, items = g.split('|', 1)
                parsed.append([head, [it.rsplit('=', 1) for it in items.split(',')]])
            def rebuild(el=el, parsed=parsed):
                el['data-list'] = ';'.join(h + '|' + ','.join(l + '=' + p for l, p in its) for h, its in parsed)
            for grp in parsed:
                if need(grp[0]):
                    cb('text', grp[0], lambda new, grp=grp, rb=rebuild: (grp.__setitem__(0, new), rb()))
                for it in grp[1]:
                    m = re.match(r'(.*?)\s+(\d{4})$', it[0])
                    name, year = (m.group(1), ' ' + m.group(2)) if m else (it[0], '')
                    if need(name):
                        cb('text', name, lambda new, it=it, year=year, rb=rebuild: (it.__setitem__(0, new + year), rb()))
        for a in TOKEN_ATTRS:
            v = el.get(a)
            if isinstance(v, list):
                v = ' '.join(v)
            if isinstance(v, str) and need(v):
                toks = v.split(' ')
                outs = [None] * len(toks)
                for i, t in enumerate(toks):
                    if need(t):
                        def put(new, i=i, el=el, a=a, toks=toks, outs=outs):
                            outs[i] = new.replace(' ', '-')
                            el[a] = ' '.join(o if o is not None else tk for o, tk in zip(outs, toks))
                        cb('text', t, put)


# ---------------------------------------------------------------- JS 字符串
def js_strings(src):
    """返回 [(start, end, quote, raw)]：字符串字面量内容的位置（不含引号）。"""
    out, i, n = [], 0, len(src)
    prev = ''
    while i < n:
        ch = src[i]
        if ch == '/' and i + 1 < n and src[i + 1] == '/':
            j = src.find('\n', i); i = n if j < 0 else j; continue
        if ch == '/' and i + 1 < n and src[i + 1] == '*':
            j = src.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if ch in '\'"`':
            q, j = ch, i + 1
            while j < n and src[j] != q:
                if src[j] == '\\':
                    j += 1
                j += 1
            out.append((i + 1, j, q, src[i + 1:j]))
            i = j + 1; prev = q; continue
        if ch == '/' and prev in '(,=:[!&|?{};+-*%<>~^' :
            j = i + 1; cls = False
            while j < n:
                if src[j] == '\\': j += 2; continue
                if src[j] == '[': cls = True
                elif src[j] == ']': cls = False
                elif src[j] == '/' and not cls: break
                elif src[j] == '\n': break
                j += 1
            i = j + 1; prev = '/'; continue
        if not ch.isspace():
            prev = ch
        i += 1
    return out


def js_escape(s, q):
    return s.replace('\\', '\\\\').replace(q, '\\' + q).replace('\n', '\\n')


def js_units(src, cb, rel_prefix=''):
    pieces, last = [], 0
    for (a, b, q, raw) in js_strings(src):
        new = None
        if need(raw):
            box = {}
            cb('js', raw, lambda v, box=box: box.__setitem__('v', v))
            if 'v' in box:
                new = js_escape(box['v'], q) if q != '`' else box['v']
        elif rel_prefix and re.match(r'(img|files|fonts|css)/', raw):
            new = rel_prefix + raw
        if new is not None:
            pieces.append(src[last:a]); pieces.append(new); last = b
    pieces.append(src[last:])
    return ''.join(pieces)


# ---------------------------------------------------------------- 路径
SKIP = re.compile(r'^(?:[a-z]+:|//|#|data:|javascript:)', re.I)


def fix_path(val, page_dir):
    if not val or SKIP.match(val):
        return val
    path = val.split('#')[0].split('?')[0]
    if not path:
        return val
    target = os.path.normpath(os.path.join(page_dir, path)).replace('\\', '/')
    if target.startswith('..'):
        return val
    if target.endswith('.html') or target.endswith('/') or target.startswith(MIRRORED_DIRS):
        return val
    # 共享资源留在根目录：从语言子目录里的同名页面重新算相对路径（页面目录多了一层语言目录）
    new = os.path.relpath(target, os.path.join('LANG', page_dir) if page_dir else 'LANG').replace('\\', '/')
    return new + val[len(path):]


def fix_css_urls(text, page_dir):
    return re.sub(r'url\((["\']?)([^)"\']+)\1\)', lambda m: 'url(' + m.group(1) + fix_path(m.group(2), page_dir) + m.group(1) + ')', text)


# ---------------------------------------------------------------- 抽取
def collect():
    units = {}
    def add(kind, key, where):
        k = uid(key)
        u = units.setdefault(k, {'src': key, 'kind': kind, 'pages': []})
        if where not in u['pages']:
            u['pages'].append(where)
    for page in PAGES:
        soup = BeautifulSoup((ROOT / page).read_text(encoding='utf-8'), 'html.parser')
        units_html(soup, lambda kind, key, put: add(kind, key, page))
        attr_units(soup, lambda kind, key, put: add(kind, key, page))
        for s in soup.find_all('script'):
            if not s.get('src') and s.string:
                js_units(s.string, lambda kind, key, put: add(kind, key, page))
    for js in SCRIPTS:
        js_units((ROOT / js).read_text(encoding='utf-8'), lambda kind, key, put: add(kind, key, js))
    return units


def cmd_extract():
    units = collect()
    (HERE / 'units.json').write_text(json.dumps(units, ensure_ascii=False, indent=1), encoding='utf-8')
    chars = sum(len(HAN.findall(u['src'])) for u in units.values())
    print(f'{len(units)} units, {chars} 汉字 -> tools/i18n/units.json')


def load(name):
    """读取 name（如 en.json）；同名目录 tools/i18n/en/ 下的分页文件一并合并。"""
    out = {}
    p = HERE / name
    if p.exists():
        out.update(json.loads(p.read_text(encoding='utf-8')))
    d = HERE / name.replace('.json', '')
    if d.is_dir():
        for f in sorted(d.glob('*.json')):
            out.update(json.loads(f.read_text(encoding='utf-8')))
    return out


def cmd_missing():
    units = collect()
    for lang in ('en', 'ja'):
        tr = load(lang + '.json')
        miss = [k for k in units if k not in tr]
        print(f'{lang}: {len(units) - len(miss)}/{len(units)} translated')
        for k in miss[:400]:
            print(' ', k, units[k]['src'][:90].replace('\n', ' '))


# ---------------------------------------------------------------- 构建
def translator(lang):
    if lang == 'zh-hant':
        import opencc
        cc = opencc.OpenCC('s2twp')
        fixes = load('zh-hant-fix.json')
        def t(s):
            out = cc.convert(s)
            for a, b in fixes.items():
                out = out.replace(a, b)
            return out
        return t, set()
    tr = load(lang + '.json')
    missing = set()
    def t(s):
        k = uid(s)
        if k in tr:
            return tr[k]
        missing.add(k)
        return s
    return t, missing


def build_lang(lang):
    conf = LANGS[lang]
    t, missing = translator(lang)
    out = ROOT / lang
    if out.exists():
        shutil.rmtree(out)
    for page in PAGES:
        page_dir = os.path.dirname(page)
        soup = BeautifulSoup((ROOT / page).read_text(encoding='utf-8'), 'html.parser')
        jobs = []
        units_html(soup, lambda kind, key, put: jobs.append((key, put)))
        for key, put in jobs:
            put(t(key))
        jobs = []
        attr_units(soup, lambda kind, key, put: jobs.append((key, put)))
        for key, put in jobs:
            put(t(key))
        for s in soup.find_all('script'):
            if not s.get('src') and s.string:
                s.string = js_units(s.string, lambda kind, key, put: put(t(key)))
        for el in soup.find_all(True):
            for a in ('src', 'href', 'poster', 'data-src'):
                v = el.get(a)
                if isinstance(v, str):
                    el[a] = fix_path(v, page_dir)
            if el.get('style'):
                el['style'] = fix_css_urls(el['style'], page_dir)
            if el.get('data-list'):
                el['data-list'] = re.sub(r'=([^,;|]+)', lambda m: '=' + fix_path(m.group(1), page_dir), el['data-list'])
            if el.name == 'meta' and el.get('http-equiv') == 'refresh':
                pass
        for st in soup.find_all('style'):
            if st.string:
                st.string = fix_css_urls(st.string, page_dir)
        html = soup.find('html')
        html['lang'] = conf['html']
        depth = page.count('/') + 1
        up = '../' * depth
        head = soup.find('head')
        style = soup.new_tag('style')
        style.string = ('@font-face{font-family:"Fusion Pixel";src:url("%sfonts/fusion-pixel-%s.woff2") format("woff2");font-display:swap}'
                        ':root{--body-font:%s;--px-font:%s}') % (up, lang, conf['body'], conf['px'])
        head.append(style)
        for code, c in [('zh-Hans', '')] + [(LANGS[l]['html'], l + '/') for l in LANGS]:
            link = soup.new_tag('link', rel='alternate', hreflang=code, href=up + c + page)
            head.append(link)
        dst = out / page
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(str(soup), encoding='utf-8')
    for js in SCRIPTS:
        src = (ROOT / js).read_text(encoding='utf-8')
        dst = out / js
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(js_units(src, lambda kind, key, put: put(t(key)), rel_prefix='../'), encoding='utf-8')
    return missing


def build_fonts():
    from fontTools import subset
    from fontTools.ttLib import TTFont
    base = set(chr(c) for c in range(0x20, 0x7f))
    base.update('　，。、：；！？「」『』（）《》〈〉【】“”‘’…—·×÷←→↑↓▶◀▲▼↗★☆●○■□％')
    for lang, conf in LANGS.items():
        chars = set(base)
        for p in (ROOT / lang).rglob('*'):
            if p.suffix in ('.html', '.js'):
                chars.update(p.read_text(encoding='utf-8'))
        chars.update((ROOT / 'css').joinpath('shell.css').read_text(encoding='utf-8'))
        chars.update('简繁日本語中文English简体中文繁體中文')
        src = ROOT / 'output/font-source' / f'fusion-pixel-12px-proportional-{conf["font"]}.ttf.woff2'
        font = TTFont(src)
        cmap = font.getBestCmap()
        have = ''.join(c for c in chars if (c.isprintable() or c == '　') and ord(c) in cmap)
        opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = True
        sub = subset.Subsetter(opts); sub.populate(text=have); sub.subset(font)
        dst = ROOT / 'fonts' / f'fusion-pixel-{lang}.woff2'
        font.flavor = 'woff2'; font.save(dst)
        print(f'  font {lang}: {len(have)} glyphs, {dst.stat().st_size // 1024} KB')


def cmd_build():
    for lang in LANGS:
        missing = build_lang(lang)
        print(f'{lang}: built' + (f', {len(missing)} untranslated units (shown in Chinese)' if missing else ''))
    build_fonts()


if __name__ == '__main__':
    {'extract': cmd_extract, 'build': cmd_build, 'missing': cmd_missing}[sys.argv[1] if len(sys.argv) > 1 else 'build']()
