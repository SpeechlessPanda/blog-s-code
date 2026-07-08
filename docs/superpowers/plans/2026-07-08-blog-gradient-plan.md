# 博客渐变主题增强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将博客浅色/深色模式下的封面、页头、导航栏、底部栏、网页背景与 OG 分享图背景替换为跨度更大、层次更分明的渐变。

**Architecture:** 颜色主题集中在 `themes/butterfly/_config.yml` 的 `inject.head` 内联样式中，通过 CSS 选择器覆盖各场景；OG 图背景在 `scripts/og-image.js` 的 SVG 模板中独立定义。两文件分别负责页面渲染与分享图生成，保持同步即可。

**Tech Stack:** Hexo 6/7 + Butterfly 主题、Stylus/CSS、Node.js 脚本。

## Global Constraints

- 浅色主渐变必须包含：蓝 `#4facfe`、天蓝 `#6ec6ff`、紫 `#a18cd1`、粉 `#fbc2eb`、桃 `#ffd2a8`。
- 深色主渐变必须包含：极深蓝 `#020024`、深蓝 `#090979`、原暗蓝 `#1a2440`、暗粉紫 `#5b425d`、亮紫 `#9d4edd`。
- 所有渐变方向保持 `135deg`（主渐变）与 `180deg`（遮罩/背景）。
- 文字颜色保持 `#ffffff`（浅色模式）与 `#eaf4ff`（深色模式），并保留/增强阴影以维持对比度。
- OG 图使用浅色主渐变。
- 修改后必须执行 `hexo generate` 构建成功。

---

## 文件结构

- `themes/butterfly/_config.yml`：主题配置文件，所有页面渐变色与文字样式在 `inject.head` 内联样式段落中。
- `scripts/og-image.js`：Hexo 脚本，负责生成 OG 分享图的 SVG，其中 `<linearGradient id="bg">` 定义背景渐变。

---

### Task 1: 更新页面与组件渐变（`_config.yml`）

**Files:**
- Modify: `themes/butterfly/_config.yml:1062-1270`

**Interfaces:**
- Consumes: 无
- Produces: 更新后的 CSS 内联样式字符串，影响所有页面元素的渐变与文字可读性。

- [ ] **Step 1: 备份当前配置**

  复制 `themes/butterfly/_config.yml` 的 `inject.head` 段落内容到临时文件，以便回滚。

- [ ] **Step 2: 替换浅色主渐变**

  将以下选择器中的旧渐变
  ```css
  linear-gradient(135deg, #6ec6ff 0%, #90b7ff 48%, #ffd2a8 100%)
  ```
  全部替换为新渐变
  ```css
  linear-gradient(135deg, #4facfe 0%, #6ec6ff 25%, #a18cd1 55%, #fbc2eb 75%, #ffd2a8 100%)
  ```

  涉及的选择器：
  - `#page-header.full_page`
  - `#page-header.post-bg`
  - `#page-header.not-home-page`
  - `#page-header.not-top-img`
  - `#footer`
  - `.read-mode #page-header.post-bg`

- [ ] **Step 3: 替换浅色固定导航栏/无顶图半透明渐变**

  将
  ```css
  linear-gradient(135deg, rgba(110, 198, 255, 0.96) 0%, rgba(144, 183, 255, 0.96) 48%, rgba(255, 210, 168, 0.96) 100%)
  ```
  替换为
  ```css
  linear-gradient(135deg, rgba(79, 172, 254, 0.96) 0%, rgba(161, 140, 209, 0.96) 55%, rgba(255, 210, 168, 0.96) 100%)
  ```

  涉及的选择器：
  - `#page-header.nav-fixed #nav`
  - `#page-header.not-top-img.nav-fixed #nav`

- [ ] **Step 4: 替换浅色网页背景**

  将 `#web_bg` 的
  ```css
  linear-gradient(180deg, #f6fbff 0%, #eef5ff 55%, #f8fbff 100%)
  ```
  替换为
  ```css
  linear-gradient(180deg, #f3f9ff 0%, #edf2ff 55%, #fff8f3 100%)
  ```

- [ ] **Step 5: 替换深色主渐变**

  将 `[data-theme='dark']` 下以下选择器中的旧渐变
  ```css
  linear-gradient(135deg, #1a2440 0%, #2f3b66 52%, #5b425d 100%)
  ```
  替换为新渐变
  ```css
  linear-gradient(135deg, #020024 0%, #090979 25%, #1a2440 50%, #5b425d 75%, #9d4edd 100%)
  ```

  涉及的选择器：
  - `[data-theme='dark'] #page-header.full_page`
  - `[data-theme='dark'] #page-header.post-bg`
  - `[data-theme='dark'] #page-header.not-home-page`
  - `[data-theme='dark'] #page-header.not-top-img`
  - `[data-theme='dark'] #footer`
  - `[data-theme='dark'] .read-mode #page-header.post-bg`

- [ ] **Step 6: 替换深色固定导航栏/无顶图半透明渐变**

  将
  ```css
  linear-gradient(135deg, rgba(26, 36, 64, 0.96) 0%, rgba(47, 59, 102, 0.96) 52%, rgba(91, 66, 93, 0.96) 100%)
  ```
  替换为
  ```css
  linear-gradient(135deg, rgba(2, 0, 36, 0.96) 0%, rgba(26, 36, 64, 0.96) 50%, rgba(157, 78, 221, 0.96) 100%)
  ```

  涉及的选择器：
  - `[data-theme='dark'] #page-header.nav-fixed #nav`
  - `[data-theme='dark'] #page-header.not-top-img.nav-fixed #nav`

- [ ] **Step 7: 替换深色网页背景**

  将 `[data-theme='dark'] #web_bg` 的
  ```css
  linear-gradient(180deg, #141a30 0%, #1a2240 55%, #201f38 100%)
  ```
  替换为
  ```css
  linear-gradient(180deg, #0a0a1a 0%, #11132e 55%, #1a1529 100%)
  ```

- [ ] **Step 8: 增强浅色文字阴影对比度**

  将浅色模式下以下选择器的 `text-shadow`
  ```css
  text-shadow: 0 2px 10px rgba(28, 58, 92, 0.28);
  ```
  增强为
  ```css
  text-shadow: 0 2px 12px rgba(28, 58, 92, 0.38);
  ```

  涉及的选择器：
  - `#page-header.full_page #site-title` 等文字元素
  - `#page-header.nav-fixed #nav a` 等导航元素

- [ ] **Step 9: 保存并提交 Task 1 变更**

  ```bash
  git add themes/butterfly/_config.yml
  git commit -m "feat(theme): 增强浅色/深色模式渐变颜色跨度"
  ```

---

### Task 2: 更新 OG 图渐变背景（`og-image.js`）

**Files:**
- Modify: `scripts/og-image.js:119-122`

**Interfaces:**
- Consumes: 无
- Produces: 更新后的 SVG 渐变字符串，生成的 OG 图背景与页面浅色主渐变保持一致。

- [ ] **Step 1: 替换 SVG 渐变**

  将 `buildSvg` 函数中的
  ```html
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#6ec6ff"/>
    <stop offset="48%" stop-color="#90b7ff"/>
    <stop offset="100%" stop-color="#ffd2a8"/>
  </linearGradient>
  ```
  替换为
  ```html
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#4facfe"/>
    <stop offset="25%" stop-color="#6ec6ff"/>
    <stop offset="55%" stop-color="#a18cd1"/>
    <stop offset="75%" stop-color="#fbc2eb"/>
    <stop offset="100%" stop-color="#ffd2a8"/>
  </linearGradient>
  ```

- [ ] **Step 2: 保存并提交 Task 2 变更**

  ```bash
  git add scripts/og-image.js
  git commit -m "feat(og-image): 同步 OG 图渐变背景"
  ```

---

### Task 3: 构建验证

**Files:**
- Test: 本地构建产物 `public/` 目录

**Interfaces:**
- Consumes: Task 1 与 Task 2 的修改
- Produces: 成功构建的静态站点，用于人工/浏览器验证。

- [ ] **Step 1: 运行 Hexo 构建**

  ```bash
  npx hexo generate
  ```

  预期结果：命令成功退出，无报错。

- [ ] **Step 2: 检查生成的 CSS 与 OG 图**

  - 打开 `public/index.html`，搜索 `linear-gradient(135deg, #4facfe`，确认新渐变已注入。
  - 运行（可选）单篇 OG 图生成调试：在 Node.js 中调用 `buildSvg` 并打印 SVG，确认 `stop-color` 顺序正确。

- [ ] **Step 3: 启动本地服务器人工验证**

  ```bash
  npx hexo server
  ```

  访问 `http://localhost:4000/`，验证：
  - 首页封面渐变更明显、层次更多。
  - 滚动后顶部导航栏背景使用新渐变。
  - 切换深色模式后封面与导航栏使用新的深色渐变。
  - 底部栏颜色正确。
  - 文字在两种模式下均清晰可读。

- [ ] **Step 4: 提交验证结果（无需代码变更时）**

  若仅验证无新改动，无需额外提交。否则修复问题后提交。

---

## 自我检查

- **Spec 覆盖：**
  - 封面/页头/导航栏/底部栏/网页背景渐变 → Task 1 Step 2-7
  - 浅色/深色模式 → Task 1 Step 2-7
  - OG 图自动生成渐变 → Task 2 Step 1
  - 文字对比度 → Task 1 Step 8
  - 构建验证 → Task 3
- **Placeholder 扫描：** 无 TBD/TODO/待补充。
- **类型一致性：** 仅涉及 CSS 字符串替换，无函数签名不一致风险。
