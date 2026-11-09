# 殷硕 · 游戏策划作品集

在线浏览：https://USERNAME.github.io

| 作品 | 类型 | 角色 |
| --- | --- | --- |
| [《艾尔登法环 黑夜君临》大型内容扩展 Mod](projects/nightreign-mod.html) | Mod · 测试版已发布 | 独立制作：系统、关卡、演出 |
| [《发条人偶》Tidewheel](projects/tidewheel.html) | thatgamejam #02 · [itch.io](https://shuo-yin.itch.io/tidewheel) | 策划（兼部分程序），4 人团队 |
| [《宇宙汉堡》](projects/burger/index.html) | 抖音增量经营小游戏 | 独立制作：系统、数值、开发 |
| [《火影忍者》手游 成长与经济系统拆解](projects/naruto.html) | 系统拆解 · 36 页 | MDA 框架，与《异人之下》对比 |
| [《炉石传说》酒馆战棋 经济与对局节奏拆解](projects/hearthstone.html) | 系统拆解 · 20 页 | 数值推算，AB 测试设计 |

简历在站内阅读页 [resume.html](resume.html)，内嵌 `files/resume.pdf`，可以下载。

另有 [关于我](about.html)：履历与技能（做成角色介绍页，分属性、经历、技能、装备四页）、游戏经历（35 款卡带分页排在卡带架上，每页两行，点一下插进左边的游戏机看详情，可按平台筛选、按时长或白金排序）、影视经历（32 部作品和 12 位音乐人，做成可以左右翻的叠放卡牌）、履历与技能。

纯 HTML / CSS / JS，无构建步骤，无外部依赖。

## 视觉与互动

全站统一为像素平台跳跃风格。

- **首页舞台**：首页第一屏是一个能玩的小关卡。方向键或 A、D 移动，空格跳，跳起来顶方块就读取对应存档；直接点方块或点门会立刻进入，不用等小人跑过去。左侧地面上立着一块“怎么玩”木牌，小人头顶的气泡在玩家第一次操作前一直提示按键。右边的门通往“关于我”。没人操作时，小人在方块之间来回走，广告牌跟着轮播。触屏有左右和跳跃按钮。
- **首页下半部分**：从黄昏走到夜里，依次是玩家状态窗口（对话逐字出现、数字滚动）、读取存档菜单、三扇门、灯塔和“关卡完成”。
- **全站**：
  - 站内跳转播放读档加载条。
  - 底部有一条关卡进度条，小人随页面滚动往右走。
  - 方块可以顶出硬币，计数在顶栏。
  - 有 8 位音效，顶栏可以关。
  - 隐藏彩蛋：↑↑↓↓←→←→BA。
- **拆解阅读页**：两份系统拆解有站内阅读页，含摘要和内嵌 PDF 全文。飞书原文和其他外部链接一律在新标签页打开，作品集这边不会被替换掉。

## 目录

| 路径 | 内容 |
| --- | --- |
| `css/shell.css` | 全站外壳：字体、色板、顶栏、像素按钮、天空、地面、页脚、加载条。所有页面都引用，包括《宇宙汉堡》页 |
| `css/site.css` | 首页、关于我、案例页的内容样式 |
| `css/home.css` | 首页舞台和下半场景 |
| `css/burger.css` | 《宇宙汉堡》作品页专用：店铺柜台首屏、关卡地图式核心循环、手机截图轨道、节奏进度条 |
| `js/site.js` | 加载条、硬币、音效、进度条、彩蛋、云朵、滚动渐显 |
| `css/about.css`、`js/about.js` | 关于我页的角色介绍页和游戏机 |
| `js/deck.js` | 关于我页的叠放卡牌：按钮、键盘、拖动、触控板横滑切换，带筛选 |
| `js/stage.js` | 首页舞台：小人操作、方块碰撞、广告牌 |
| `img/games/` | 游戏库封面，300 × 450。大部分来自 Steam 官方商店竖版图，炉石、火影、血源、宇宙机器人、马力欧奥德赛、使命召唤 MWII、Pokopia 来自英文维基百科词条；原神和保卫向日葵是用像素字体画的文字封面 |
| `img/films/` | 影视卡面，300 × 450，来自英文维基百科词条；系列作品用其中一部的海报，卡牌下方注明。`img/films/kr/` 是假面骑士 27 部 TV 剧的海报，200 × 300，来自 Kamen Rider Wiki（Fandom） |
| `img/music/` | 音乐人的代表专辑封面，360 × 360，来自 Apple Music |
| `img/px/` | 像素素材，Codex 按 `ART_SPEC.md` 绘制。原图和校验记录在 `output/imagegen/` |
| `img/tidewheel/` | Tidewheel 截图，已压到 1600 宽 |
| `fonts/fusion-pixel-site.woff2` | Fusion Pixel 12px 的字符子集，SIL OFL 1.1，许可证见 `fonts/OFL.txt` |
| `tools/make_placeholders.py` | 重新生成占位像素图 |
| `tools/build_font.py` | 重新裁剪像素字体子集 |
| `projects/tidewound.html` | 旧地址，自动跳转到 `tidewheel.html` |

## 改动后要做的事

- 改了任何页面的文字，运行 `python tools/build_font.py`，否则新增的字会回退到系统字体。
- 本地预览：在本目录运行 `python -m http.server`，打开 http://localhost:8000 。
- 主角和同伴“小咪”素材：确定性导出配置在 `output/imagegen/companions/manifest.json`；运行 `./tools/export_generated_art.ps1 -Manifest output/imagegen/companions/manifest.json` 后，用 `python tools/validate_art.py` 校验，`python tools/preview_companions.py` 生成 8 倍检查图。
- 字体完整源文件保存在 `output/font-source/`，来自 [Fusion Pixel 官方发布](https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.10.25)，`python tools/build_font.py` 会重新生成本地子集，网站不请求外部字体。
- 参考照片移至同级目录 `../作品集私有绘图参考_小咪/`，不会放进网站。发布前运行 `python tools/build_deploy.py`，仅上传生成的 `output/portfolio-public-*.zip` 解压内容；不要直接上传整个工作目录。发布包按白名单包含页面与运行资源，不含 `output/`、源图、参考照片、工具或本地文档。

## 待填

- 黑夜君临 Mod 页：抖音播放数（网页版不登录看不到，要从创作者后台取）。补上后可以把“B 站播放”改成“全平台播放”。其余数据截至 2026.11.09，更新时改 `projects/nightreign-mod.html` 的两组 stats、存档信息和 `js/stage.js` 的介绍。

## 多语言（简体 / 繁體 / English / 日本語）

根目录的简体中文页面是唯一源文件；`zh-hant/`、`en/`、`ja/` 由脚本生成，不要手改。顶栏右上角的语言按钮在同一路径的四个版本之间切换。

改了中文页面后：

```
python tools/i18n/i18n.py extract   # 重新抽取待翻译文本
python tools/i18n/i18n.py missing   # 列出 en / ja 缺的译文
# 把缺的条目补进 tools/i18n/en/*.json、tools/i18n/ja/*.json（键是 missing 列出的 id）
python tools/i18n/i18n.py build     # 生成三种语言页面和各自的像素字体子集
```

- 繁体由 OpenCC（s2twp，台湾用语）自动转换，个别用词在 `tools/i18n/zh-hant-fix.json` 修正。需要 `pip install opencc-python-reimplemented beautifulsoup4 fonttools brotli`。
- 每种语言用 Fusion Pixel 对应的字形变体（zh_tw / ja / latin），字体文件为 `fonts/fusion-pixel-<语言>.woff2`。
- 简历 PDF、拆解 PDF 和飞书文档只有中文版，外文页面已注明。
