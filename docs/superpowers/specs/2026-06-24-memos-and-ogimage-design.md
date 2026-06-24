# 设计文档:Memos 碎碎念 + OG Image 静态生成

- **日期**:2026-06-24
- **作者**:SpeechlessPanda(协同 Claude)
- **状态**:待评审
- **博客栈**:Hexo 8.1.1 + Butterfly 主题,部署于 GitHub Pages(纯静态,本地 `hexo deploy` 构建)

---

## 1. 目标

为博客新增两个功能:

1. **OG Image 静态生成**:build 时为每篇文章生成一张 1200×630 的社交分享预览图(PNG),并写入 `<head>` 的 `og:image` / `twitter:image`,让链接分享到微信/Twitter/Discord 等平台时带预览图。
2. **Memos 碎碎念**:一个 `/memos/` 独立页面,按时间倒序展示短动态(类似朋友圈/说说),数据写在本地 yml,纯静态、零后端。

## 2. 背景与约束

- 博客部署在 GitHub Pages,**纯静态、无后端** → Memos 必须用本地数据方案,不能依赖运行时服务。
- 博客是**中文内容**,字体为 **LXGW WenKai** → OG 图必须正确渲染中文,不能用 Arial 等默认字体(否则中文显示为方框)。
- 博客 header 主题色为蓝→橙渐变 `#6ec6ff → #90b7ff → #ffd2a8` → OG 卡片沿用此渐变,视觉统一。
- 大部分文章 front-matter **没有 cover / description**,只有 `title / date / tags` → OG 卡片不依赖封面,统一用渐变背景。
- 构建方式:`hexo deploy`(git deployer),即**本地构建后 push** → 构建环境为本地 Windows + pnpm,可用原生模块(`@resvg/resvg-js` 有 Windows 预编译二进制)。
- 包管理器:**pnpm**(仓库 `node_modules/.pnpm` 已标准化)。

## 3. 已确认决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| Memos 数据源 | 纯静态本地 yml | 契合 GitHub Pages,零成本零后端 |
| Memos 菜单名 | 「碎碎念」 | 贴合博客偏日记/随笔风格 |
| 首页 memos 滚动条 | 不加 | 保持首页干净,memos 只在独立页 |
| OG 视觉风格 | 主题渐变背景 + 白字 | 与博客视觉统一 |
| OG 是否含封面 | 不含,统一渐变 | 视觉一致;且大部分文章无 cover |
| OG 输出格式 | PNG | 微信/Twitter/Discord 不支持 SVG 作为 og:image |
| 渲染库 | `@resvg/resvg-js` | 原生支持加载本地字体,中文跨平台稳定;sharp 对 SVG 嵌入字体支持差 |

## 4. 子系统一:OG Image 静态生成

### 4.1 架构

```
hexo generate
   │
   ├─ [after_generate filter] scripts/og-image.js
   │     ├─ 遍历所有 post
   │     ├─ 用 EJS 模板渲染 SVG(标题/日期/标签/站名 + 渐变背景)
   │     ├─ @resvg/resvg-js 加载 fonts/LXGWWenKai-*.ttt → SVG 转 PNG
   │     ├─ 写入 public/og-images/<slug>.png
   │     └─ 给 post 注入 og_image URL(供 meta 注入)
   │
   └─ [meta 注入] 把 og:image / twitter:image 写入每篇 post 的 <head>
```

### 4.2 SVG 模板设计(1200×630)

- **背景**:135° 线性渐变 `#6ec6ff → #90b7ff → #ffd2a8`(浅色模式)。暗色卡片可选 `#1a2440 → #2f3b66 → #5b425d`(本期只做浅色一张,统一)。
- **标题**:LXGW WenKai Bold,白色,#1a1a1a 描边阴影 `rgba(28,58,92,0.28)`;字号动态(长标题缩小或自动换行,最多 2 行,超出截断加 `…`)。
  - SVG 无自动换行 → 脚本按字符宽度(中文≈fontSize,英文≈fontSize×0.55)手动切行。
- **副信息行**(标题下方):`YYYY·MM·DD · 标签1 标签2`,LXGW WenKai Regular,32px,半透明白 `rgba(255,255,255,0.85)`。
- **站名**:左下角 `SpeechlessPanda`,28px,半透明白。
- **边距**:左右 80px,标题基线 y≈290。

### 4.3 字体处理

- 字体文件 **不提交仓库**(LXGW WenKai Regular + Bold 合计约 20MB),放在 `fonts/`,加入 `.gitignore`。
- `scripts/og-image.js` 首次运行时检测 `fonts/LXGWWenKai-Regular.ttf` / `LXGWWenKai-Bold.ttf`,缺失则从 [lxgw/LxgwWenKai Releases](https://github.com/lxgw/LxgwWenKai/releases) 自动下载并缓存。
- resvg 配置:`font: { fontFiles: [...], loadSystemFonts: false, defaultFontFamily: 'LXGW WenKai' }`。

### 4.4 meta 注入(实现时需确认调用点)

目标:每篇 post 的 `<head>` 输出
```html
<meta property="og:image" content="https://speechlesspanda.github.io/og-images/<slug>.png">
<meta name="twitter:image" content="...同上">
<meta name="twitter:card" content="summary_large_image">
```

Butterfly 已开启 `Open_Graph_meta`(用 hexo 内置 `open_graph` helper)。优先方案:
- **方案 A(首选)**:`after_post_render` filter 给 post 设 `og_image` 字段,并在主题 head 模板的 `open_graph()` 调用处补 `image: page.og_image`。需改主题 1 处(实现时定位 `themes/butterfly/layout/includes/head.pug` 中 `open_graph` 调用)。
- **方案 B(备选,零主题改动)**:`after_generate` filter 用 `hexo.route` 读取每篇 post 的最终 HTML,字符串注入/替换 `<meta property="og:image">`。

实现时先尝试 A(更干净),A 不可行则用 B。

### 4.5 配置项(`_config.yml`)

```yaml
og_image:
  enable: true
  width: 1200
  height: 630
  output_dir: og-images      # public/<output_dir>/<slug>.png
  font_dir: fonts            # 本地字体目录
  site_name: SpeechlessPanda
```

## 5. 子系统二:Memos 碎碎念

### 5.1 架构

```
source/_data/memos.yml  ──(hexo site.data.memos)──▶  themes/butterfly/layout/includes/page/memos.pug
                                                            │
source/memos/index.md (type: memos) ────────────────────────┘
themes/butterfly/layout/page.pug  ── 注册 when 'memos'
_config.butterfly.yml menu  ── 加「碎碎念 /memos/」
```

### 5.2 数据结构(`source/_data/memos.yml`)

```yaml
- class_name: 碎碎念
  memo_list:
    - content: 一条碎碎念的正文,支持纯文本。
      date: 2026-06-24 14:00
    - content: 带图片的一条。
      image: https://example.com/x.jpg
      date: 2026-06-23 09:30
```

- 按时间倒序展示(脚本/模板排序)。
- `image` 可选;`content` 支持 markdown 内联(加粗、链接、emoji)。

### 5.3 页面模板(`themes/butterfly/layout/includes/page/memos.pug`)

- 时间线布局:左侧时间轴竖线 + 圆点,右侧卡片。
- 卡片:内容文本 + 可选图片(走主题已有 fancybox 灯箱)。
- 顶部 `h1` 页标题 + 小提示「静态部署,记录随手想法」。
- 最多展示全部(条目预期不多,不分页;若超过 50 条再考虑分页)。

### 5.4 样式

- 新增 `themes/butterfly/source/css/_memos.styl`(Stylus,匹配主题现有 `.styl` 约定),并在主题主 styl 入口 `import`,或用 `_config.butterfly.yml` 的 `inject.head` 注入。
- 配色:卡片浅底 + 主题蓝点缀;暗色模式适配(`[data-theme='dark']`)。
- 响应式:移动端单列,时间轴简化。

### 5.5 入口与导航

- `source/memos/index.md`:`title: 碎碎念 / type: memos / aside: false / comments: true`。
- `themes/butterfly/layout/page.pug` 的 `case page.type` 增加:
  ```pug
  when 'memos'
    include includes/page/memos.pug
  ```
- `_config.butterfly.yml` 的 `menu` 在「关于」后加 `碎碎念: /memos/ || fas fa-comment-dots`。

## 6. 产出物清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `scripts/og-image.js` | 新建 | OG 图生成 filter |
| `fonts/*.ttf` | 新建(gitignore) | LXGW WenKai 字体,构建时自动下载 |
| `source/_data/memos.yml` | 新建 | Memos 数据(含示例条目) |
| `source/memos/index.md` | 新建 | Memos 入口页 |
| `themes/butterfly/layout/includes/page/memos.pug` | 新建 | Memos 页面模板 |
| `themes/butterfly/source/css/_memos.styl` | 新建 | Memos 样式 |
| `themes/butterfly/layout/page.pug` | 改 1 处 | 注册 `when 'memos'` |
| `themes/butterfly/layout/includes/head.pug` | 改 0~1 处 | og:image 注入(方案 A 时) |
| `themes/butterfly/source/css/<主入口>.styl` 或 inject | 改 1 处 | 引入 `_memos.styl` |
| `_config.yml` | 改 | 加 `og_image` 配置块 |
| `_config.butterfly.yml` | 改 | menu 加碎碎念项 |
| `.gitignore` | 改 | 忽略 `fonts/`、`public/og-images/` |
| `package.json` | 改 | 加 `@resvg/resvg-js` 依赖 |

## 7. 验证方式(遵循前端政策)

OG Image:
1. `pnpm build` 后检查 `public/og-images/*.png` 是否每篇各一张。
2. 肉眼抽检 2~3 张:中文无方框、渐变正确、标题未截断错位。
3. `hexo s` 打开任一文章 → 浏览器 DevTools 检查 `<meta property="og:image">` 指向生成的 PNG。
4. (可选)用 [opengraph.xyz](https://www.opengraph.xyz) 预览线上链接卡片。

Memos:
1. Playwright 打开 `hexo s` 的 `/memos/`,桌面(1280宽)+ 移动(375宽)两视口截图。
2. 检查:时间线布局、卡片样式、暗色模式、图片灯箱、响应式。
3. 验证排序倒序、image 可选渲染。

## 8. 不做的事(YAGNI)

- ❌ 首页 memos 滚动条(用户已确认不加)。
- ❌ OG 卡片含文章封面(统一渐变)。
- ❌ 暗色版 OG 卡片(本期只出浅色一张;后续可按需扩展)。
- ❌ Memos 分页 / 评论回复(条目预期少,先不分页;评论复用页面级 Giscus)。
- ❌ Memos 的富媒体(音乐、视频、链接卡片)——先支持文本 + 单图。
- ❌ 动态 OG 生成服务(Vercel og / Cloudflare)——静态 PNG 已满足。

## 9. 风险与缓解

| 风险 | 缓解 |
|------|------|
| resvg-js 原生模块在 Windows 安装失败 | 有预编译二进制;若失败,文档记录备选(sharp + 系统字体,或 CI 用 Linux) |
| 字体文件大、首次构建需下载 | 字体 gitignore + 脚本自动下载缓存;CI 可缓存 `fonts/` |
| 长标题换行/截断错位 | 脚本按字符宽度切行,最多 2 行 + `…`;实现后抽检多篇文章 |
| 改主题文件与未来主题升级冲突 | 主题为本地源码(`themes/butterfly/`),改动最小化并记录;升级时按本文档回放 |
| meta 注入被 pjax/缓存影响 | og meta 是服务端生成到静态 HTML,不受 pjax 影响 |

## 10. 后续可扩展(不在本期)

- 暗色 OG 卡片 / 多套模板选择。
- Memos 首页滚动条(若后续想要)。
- Memos 富媒体(音乐、链接卡片)。
- Memos 通过 GitHub Issue / usememos 动态化(若迁出纯静态)。
