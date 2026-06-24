# Memos + OG Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Hexo+Butterfly 博客新增两个功能——(A) build 时为每篇文章生成 OG 分享预览图(PNG)并注入 og:image;(B) 一个「碎碎念」页面(复用主题现成 shuoshuo 系统)。

**Architecture:** A 用一个 Hexo generator(`scripts/og-image.js`)在 generate 阶段为每篇 post 渲染 SVG→PNG(@resvg/resvg-js + 内嵌 LXGW WenKai 字体),并用 `before_generate` filter 给 post 注入 `og_image` URL,改主题 `Open_Graph.pug` 一行使 meta 优先使用它。B 完全复用主题内置 shuoshuo 系统,仅新增数据文件 + 入口页 + 菜单项。

**Tech Stack:** Hexo 8.1.1, Butterfly 主题, pnpm, `@resvg/resvg-js`, Stylus/Pug(主题), LXGW WenKai 字体。

## Global Constraints

- 包管理器固定 **pnpm**(仓库已标准化,见 `node_modules/.pnpm`)。
- 字体文件(LXGW WenKai Regular+Bold ≈20MB)**不进仓库**:放 `fonts/`(gitignore),构建时脚本自动下载缓存。
- 博客中文内容,字体 **LXGW WenKai**,OG 卡片白字 + 蓝→橙渐变 `#6ec6ff→#90b7ff→#ffd2a8`。
- OG 输出 **PNG 1200×630**(微信/Twitter/Discord 不支持 SVG og:image)。
- **不改** `themes/butterfly/layout/page.pug`(Memos 复用现成 shuoshuo);OG 仅改 `themes/butterfly/layout/includes/head/Open_Graph.pug` 一行。
- 提交粒度:每个 Task 结束 commit(Conventional Commits)。
- **不引入 Playwright/jest**:OG 用 Read 工具直接视觉检查生成的 PNG;Memos 检查生成 HTML + 本地浏览器手动确认。理由:个人博客、无现成测试基础设施,Playwright browsers(~300MB)负担过重。(偏离 frontend policy 的 Playwright 验证,已明示。)

---

## File Structure

| 文件 | 责任 |
|------|------|
| `scripts/og-image.js` | OG 图生成:配置读取、字体下载、SVG 模板、resvg 渲染、generator 注册、og_image 注入 |
| `fonts/`(gitignore) | LXGW WenKai Regular/Bold ttf,构建时下载 |
| `_config.yml` | `og_image` 配置块 |
| `.gitignore` | 忽略 `fonts/` |
| `themes/butterfly/layout/includes/head/Open_Graph.pug` | 改 1 行:image 优先 `page.og_image` |
| `source/_data/shuoshuo.yml` | Memos 数据数组 |
| `source/memos/index.md` | Memos 入口页(`type: shuoshuo`) |
| `_config.butterfly.yml` | menu 加「碎碎念」 |

---

## Phase A — OG Image 静态生成

### Task A1: 依赖、配置、gitignore

**Files:**
- Modify: `package.json`(加依赖)
- Modify: `_config.yml`(加 `og_image` 块)
- Modify: `.gitignore`(加 `fonts/`)

- [ ] **Step 1: 安装 @resvg/resvg-js**

Run: `pnpm add @resvg/resvg-js`
Expected: `package.json` 的 dependencies 出现 `"@resvg/resvg-js"`,`node_modules/.pnpm` 下出现该包。

- [ ] **Step 2: 在 `.gitignore` 加 `fonts/`**

先读 `.gitignore` 确认未含 `fonts/`,在合适位置(如 `node_modules` 附近)加一行:
```
fonts/
```

- [ ] **Step 3: 在 `_config.yml` 末尾加 `og_image` 配置块**

在 `_config.yml` 末尾(`search:` 块之后)追加:
```yaml

# OG Image (auto-generated social preview cards)
og_image:
  enable: true
  width: 1200
  height: 630
  output_dir: og-images
  font_dir: fonts
  font_regular: LXGWWenKai-Regular.ttf
  font_bold: LXGWWenKai-Bold.ttf
  font_regular_url: https://github.com/lxgw/LxgwWenKai/releases/download/v1.330/LXGWWenKai-Regular.ttf
  font_bold_url: https://github.com/lxgw/LxgwWenKai/releases/download/v1.330/LXGWWenKai-Bold.ttf
  site_name: SpeechlessPanda
```

- [ ] **Step 4: 验证 build 仍正常(此时还没生成图)**

Run: `pnpm build`
Expected: 构建成功(无 og-image 脚本注入报错,因为脚本还没写)。

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore _config.yml
git commit -m "build: add @resvg/resvg-js and og_image config"
```

---

### Task A2: 写 `scripts/og-image.js`(核心)

**Files:**
- Create: `scripts/og-image.js`

**Interfaces:**
- Produces: Hexo generator `og-image` —— 为每篇 post 注册 `og-images/<slug>.png` route;`before_generate` filter 给每个 post 设 `post.og_image = '/og-images/<slug>.png'`。
- Consumes: `hexo.config.og_image`(Task A1)、`hexo.locals.get('posts')`。

- [ ] **Step 1: 创建 `scripts/og-image.js`(完整内容如下)**

```js
// scripts/og-image.js
// 为每篇文章生成 OG 分享预览图(SVG → PNG),并注入 og:image。
'use strict'

const fs = require('fs')
const path = require('path')
const https = require('https')

function getConfig(hexo) {
  const c = (hexo.config && hexo.config.og_image) || {}
  return {
    enable: c.enable !== false,
    width: c.width || 1200,
    height: c.height || 630,
    outputDir: c.output_dir || 'og-images',
    fontDir: path.resolve(hexo.base_dir, c.font_dir || 'fonts'),
    fontRegular: c.font_regular || 'LXGWWenKai-Regular.ttf',
    fontBold: c.font_bold || 'LXGWWenKai-Bold.ttf',
    regularUrl: c.font_regular_url || '',
    boldUrl: c.font_bold_url || '',
    siteName: c.site_name || hexo.config.title || ''
  }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        fs.unlink(dest, () => download(res.headers.location, dest).then(resolve, reject))
        return
      }
      if (res.statusCode !== 200) {
        file.close()
        fs.unlink(dest, () => reject(new Error('下载字体失败 ' + res.statusCode + ' : ' + url)))
        return
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    })
    req.on('error', (e) => { file.close(); fs.unlink(dest, () => reject(e)) })
  })
}

async function ensureFont(fontDir, name, url, log) {
  const filePath = path.join(fontDir, name)
  if (fs.existsSync(filePath)) return filePath
  if (!url) throw new Error('字体 URL 未配置:' + name)
  await fs.promises.mkdir(fontDir, { recursive: true })
  log.info('[og-image] 下载字体 %s ...', name)
  await download(url, filePath)
  log.info('[og-image] 字体已保存 %s', filePath)
  return filePath
}

function escapeXml(s) {
  return String(s == null ? '' : s).replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ))
}

// 按字符数切行(中文为主,1 字符 ≈ 1 字宽);超出 maxLines 截断加 …
function wrapText(text, charsPerLine, maxLines) {
  const chars = Array.from(text)
  const lines = []
  for (let i = 0; i < chars.length && lines.length < maxLines; i += charsPerLine) {
    lines.push(chars.slice(i, i + charsPerLine).join(''))
  }
  if (chars.length > maxLines * charsPerLine) {
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…'
  }
  return lines
}

function postSlug(post) {
  // 用 post.path(去 index.html)作稳定文件名;含中文 OK,与 permalink 一致
  return (post.path || post.slug || 'post').replace(/\/index\.html$/, '').replace(/[\/\\]/g, '-')
}

function buildSvg(post, cfg) {
  const title = post.title || post.slug || ''
  // 字号:短标题大、长标题小
  const titleLen = Array.from(title).length
  const fontSize = titleLen <= 12 ? 76 : titleLen <= 20 ? 60 : 48
  const charsPerLine = Math.floor((cfg.width - 160) / fontSize) // 中文近似 1 字宽
  const titleLines = wrapText(title, charsPerLine, 2)

  const date = post.date ? post.date.format('YYYY·MM·DD') : ''
  const tags = (post.tags && post.tags.length)
    ? post.tags.data ? post.tags.data.map(t => t.name).join('  ') : post.tags.map(t => t.name).join('  ')
    : ''
  const subtitle = [date, tags].filter(Boolean).join('   ·   ')

  const titleStartY = 280
  const lineGap = Math.round(fontSize * 1.18)
  const titleEls = titleLines.map((line, i) =>
    `<text x="80" y="${titleStartY + i * lineGap}" font-size="${fontSize}" font-weight="700">${escapeXml(line)}</text>`
  ).join('\n    ')
  const subtitleY = titleStartY + titleLines.length * lineGap + 36

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cfg.width}" height="${cfg.height}" viewBox="0 0 ${cfg.width} ${cfg.height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6ec6ff"/>
      <stop offset="48%" stop-color="#90b7ff"/>
      <stop offset="100%" stop-color="#ffd2a8"/>
    </linearGradient>
  </defs>
  <rect width="${cfg.width}" height="${cfg.height}" fill="url(#bg)"/>
  <g font-family="LXGW WenKai" fill="#ffffff" text-rendering="geometricPrecision">
    ${titleEls}
    ${subtitle ? `<text x="80" y="${subtitleY}" font-size="32" opacity="0.88">${escapeXml(subtitle)}</text>` : ''}
    <text x="80" y="${cfg.height - 48}" font-size="28" opacity="0.9">${escapeXml(cfg.siteName)}</text>
  </g>
</svg>`
}

// 渲染并缓存字体路径(同一进程多次调用只下载一次)
let fontCache = null
async function getFontPaths(cfg, log) {
  if (fontCache) return fontCache
  const [regular, bold] = await Promise.all([
    ensureFont(cfg.fontDir, cfg.fontRegular, cfg.regularUrl, log),
    ensureFont(cfg.fontDir, cfg.fontBold, cfg.boldUrl, log)
  ])
  fontCache = [regular, bold]
  return fontCache
}

function renderPng(post, cfg, fontFiles) {
  const { Resvg } = require('@resvg/resvg-js')
  const svg = buildSvg(post, cfg)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: cfg.width },
    font: {
      fontFiles: fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: 'LXGW WenKai'
    }
  })
  return resvg.render().asPng()
}

// 1) 给每个 post 注入 og_image 路径(供 Open_Graph.pug 读取)
hexo.extend.filter.register('before_generate', function () {
  const cfg = getConfig(hexo)
  if (!cfg.enable) return
  hexo.locals.get('posts').forEach(post => {
    if (post.published === false) return
    post.og_image = '/' + cfg.outputDir + '/' + postSlug(post) + '.png'
  })
})

// 2) 为每个 post 注册 PNG 生成 route
hexo.extend.generator.register('og-image', function (locals) {
  const cfg = getConfig(hexo)
  if (!cfg.enable) return []
  return locals.posts.toArray()
    .filter(p => p.published !== false)
    .map(post => ({
      path: cfg.outputDir + '/' + postSlug(post) + '.png',
      data: async function () {
        const fontFiles = await getFontPaths(cfg, hexo.log)
        return renderPng(post, cfg, fontFiles)
      }
    }))
})
```

- [ ] **Step 2: 运行 build,确认字体下载 + PNG 生成**

Run: `pnpm build`
Expected:
- 控制台出现 `[og-image] 下载字体 LXGWWenKai-Regular.ttf ...`(首次)。
- 构建完成无报错。
- `fonts/` 下出现两个 ttf。

- [ ] **Step 3: 确认 PNG 产物存在**

Run(Bash): `ls public/og-images/ | head -5; ls public/og-images/ | wc -l`
Expected: 列出若干 `<slug>.png`,数量约等于已发布文章数(约 15 张)。

- [ ] **Step 4: 视觉抽检 PNG(用 Read 工具读图片)**

对一张代表性文章(如短标题 `hello world`、长标题 `我的奋斗与痛苦`)的 PNG 执行 Read:
- 路径示例:`public/og-images/hello-world.png`(实际 slug 见 Step 3 列表)。
Expected: 渐变背景正确、中文无方框/tofu、标题未错位、日期与标签显示、站名 SpeechlessPanda 在左下。
若中文为方框:检查字体 family 名(`font-family` 与 ttf 内部名是否一致),必要时把 `defaultFontFamily` 改为字体实际名。

- [ ] **Step 5: Commit**

```bash
git add scripts/og-image.js
git commit -m "feat: add og-image generator (svg→png via resvg)"
```

---

### Task A3: 注入 og:image meta

**Files:**
- Modify: `themes/butterfly/layout/includes/head/Open_Graph.pug:3`

**Interfaces:**
- Consumes: `post.og_image`(Task A2 的 `before_generate` 注入,对 post 页生效)。

- [ ] **Step 1: 改 `Open_Graph.pug` 第 3 行,让 image 优先用 `page.og_image`**

把:
```pug
    const coverVal = page.cover_type === 'img' ? page.cover : theme.avatar.img
```
改为:
```pug
    const coverVal = page.og_image || (page.cover_type === 'img' ? page.cover : theme.avatar.img)
```

- [ ] **Step 2: 重新 build 并启动本地服务器**

Run: `pnpm build && pnpm server`(后台;或 `hexo s`)
Expected: 服务器在 `http://localhost:4000` 起来。

- [ ] **Step 3: 验证文章 HTML 的 og:image meta**

用 curl 取一篇文章 HTML 并查 meta:
Run(Bash): `curl -s http://localhost:4000/ | head -40 | grep og:image` (取一篇 post URL,替换)
Expected: 出现 `<meta property="og:image" content="https://speechlesspanda.github.io/og-images/<slug>.png">`。
若未出现:确认 `before_generate` 已设 `post.og_image`(post 页面),且 Open_Graph.pug 改动生效(清 `hexo clean` 后重建)。

- [ ] **Step 4: 停服并 Commit**

```bash
git add themes/butterfly/layout/includes/head/Open_Graph.pug
git commit -m "feat: inject generated og:image into open graph meta"
```

---

### Task A4: OG 抽检与参数微调

**Files:**
- Modify(视情况): `scripts/og-image.js`(字号/换行参数)

- [ ] **Step 1: 抽检极端标题(超长、含英文/标点)**

Read 2~3 张代表性 PNG(最长标题、含英文标题如 `vibe coding`、短标题)。
Expected: 标题不溢出右边界、换行合理、截断 `…` 位置自然。

- [ ] **Step 2: 若有问题,调参并重建**

常见调整(`buildSvg` 内):
- 字号阶梯:`titleLen` 阈值 12/20。
- `lineGap = fontSize * 1.18`(行距)。
- `charsPerLine` 公式(英文多时可乘 1.6)。
改后 `hexo clean && pnpm build` 重新生成,再次 Read 抽检。

- [ ] **Step 3: Commit(若有调整)**

```bash
git add scripts/og-image.js
git commit -m "fix: tune og-image typography for long titles"
```
无调整则跳过本 Task。

---

## Phase B — Memos 碎碎念(复用 shuoshuo)

### Task B1: 数据文件 + 入口页 + 菜单

**Files:**
- Create: `source/_data/shuoshuo.yml`
- Create: `source/memos/index.md`
- Modify: `_config.butterfly.yml`(`menu`)

- [ ] **Step 1: 创建 `source/_data/shuoshuo.yml`(示例数据)**

```yaml
- author: SpeechlessPanda
  date: 2026-06-24 14:00
  content: |
    碎碎念上线啦!这里记录随手想法、短动态,和长文章分开。支持 **markdown**、[链接](https://speechlesspanda.github.io) 和标签。
  tags:
    - 公告
  key: memo-2026-06-24-01
- date: 2026-06-23 09:30
  content: |
    今天调试了博客的 OG 图生成,中文用 LXGW WenKai 渲染,效果还不错。
  tags:
    - 技术
- date: 2026-06-22 22:10
  content: |
    晚上打球状态一般,但出完汗挺舒服。保持运动。
  tags:
    - 生活
```

- [ ] **Step 2: 创建 `source/memos/index.md`**

```markdown
---
title: 碎碎念
date: 2026-06-24 00:00:00
type: shuoshuo
aside: false
comments: true
---
```

- [ ] **Step 3: 在 `_config.butterfly.yml` 的 `menu` 加「碎碎念」**

在 `menu:` 的 `友链: /link/ || fas fa-link` 之后加一行:
```yaml
  碎碎念: /memos/ || fas fa-comment-dots
```

- [ ] **Step 4: build + 启服验证页面可访问**

Run: `hexo clean && pnpm build && pnpm server`
Expected: `http://localhost:4000/memos/` 返回 200,导航栏出现「碎碎念」。

- [ ] **Step 5: 检查生成的 HTML 确认数据渲染**

Run(Bash): `curl -s http://localhost:4000/memos/ | grep -o 'shuoshuo-item' | head -3; grep -c 'id=.shuoshuo-data' public/memos/index.html`
Expected: 页面含 `shuoshuo-item` 结构;`public/memos/index.html` 内嵌 `<script type="application/json" id="shuoshuo-data">` 且含示例内容。
若 `shuoshuo-data` 为空数组:检查 `source/_data/shuoshuo.yml` 顶层是数组(非 `{class_name: ...}`)。

- [ ] **Step 6: Commit**

```bash
git add source/_data/shuoshuo.yml source/memos/index.md _config.butterfly.yml
git commit -m "feat: add memos page reusing theme shuoshuo system"
```

---

### Task B2: Memos 视觉与交互确认

**Files:** 无(复用现成;仅验证)

- [ ] **Step 1: 浏览器手动验证(桌面 + 移动视口)**

本地 `hexo s` 打开 `/memos/`,确认:
- 卡片按日期倒序(2026-06-24 在最上)。
- 分页(若条目 >8)、页码输入可用。
- 标签渲染为圆角标签;设了 `key` 的第一条有评论按钮,点击展开 Giscus。
- 切换暗色模式样式正常;移动端(DevTools 375px)响应式正常。

- [ ] **Step 2: 若数据/样式异常,排查并修**

常见:
- 排序错乱 → 确认 `date` 为可解析字符串。
- 评论不展开 → 确认该条设了 `key`,且 `comments: true`、Giscus 配置正常。
- 图片不显示 → content 里的 `![]()` 路径正确。

- [ ] **Step 3: 收尾——确认未污染范围外文件**

Run: `git status --short`
Expected: 仅含本计划相关文件;`source/link/index.md` 与博客草稿保持用户原样未被 stage。

---

## Self-Review(计划自审)

**Spec 覆盖:**
- §4 OG Image:架构/模板/字体/meta/配置 → Task A1(配置依赖)、A2(脚本+模板+字体+generator)、A3(meta)、A4(微调)。✅
- §5 Memos(复用 shuoshuo):数据/入口/菜单 → Task B1;验证 → B2。✅
- §6 产出物清单每项均落到 task。✅
- §7 验证:OG 用 Read PNG(A2/A4);Memos 用 HTML 检查+浏览器(B1/B2)。✅(Playwright 按全局约束降级,已明示)
- §8 YAGNI(首页滚动条/封面/暗色卡/分页评论):均未做。✅
- §9 风险:resvg 安装(A1 验证)、字体下载(A2 Step2)、长标题(A4)、主题文件改动(仅 head/Open_Graph.pug 一行,A3)均有对应步骤。✅

**Placeholder scan:** 无 TBD/TODO;所有代码块完整。✅

**类型/命名一致:** `getConfig`、`postSlug`、`buildSvg`、`wrapText`、`ensureFont`、`renderPng`、`getFontPaths` 定义与使用一致;`post.og_image`、`page.og_image`、`og_image` config 键一致;`postSlug` 在 generator 与 filter 用同一函数产出相同文件名。✅

**遗留实现注意:**
- `@resvg/resvg-js` 在 Windows 安装若失败(无预编译),回退:用 `napi` 重装,或 CI 改 Linux。已在风险表。
- LXGW WenKai release 版本 `v1.330` 若 404,到 [releases](https://github.com/lxgw/LxgwWenKai/releases) 取最新版本号改 `_config.yml`。
- generator `data` 为 async 函数返回 Buffer,hexo 支持;若某些 hexo 版本对 generator async data 不友好,改为 `after_generate` + `fs.writeFile` 直写 `public/`(备选,代码已在脚本注释思路内)。
