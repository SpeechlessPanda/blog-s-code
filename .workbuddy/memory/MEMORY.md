# blog 项目长期备忘

> 关联项目：`D:/project/Panda`（hexo-theme-panda，blog 使用的主题，独立 git 仓库）。
> 主题侧改动会影响 blog 构建，两者要一起验证。

## 双仓架构（务必记住）

| | 源仓 | 发布仓 |
|---|---|---|
| 仓库 | `SpeechlessPanda/blog-s-code` | `SpeechlessPanda/SpeechlessPanda.github.io` |
| 跑什么 | `deploy-from-source.yml`（构建 + 推送） | 4 个 workflow（SMTP secrets 在此） |
| secrets | `GH_DISCUSSION_TOKEN`、`PAGES_DEPLOY_TOKEN` | `SMTP_*`、`MAIL_*`、`SOURCE_DEPLOY_PAT` |

发布仓 workflow 靠 `scripts/events/sync_comment_notify_workflow.js`（hexo `after_generate` 钩子）
从 `.github/workflows/` 按**文件名白名单**复制到 `public/.github/workflows/`，再由部署推过去。
新增发布仓 workflow 必须：① 在源仓 `.github/workflows/` 建文件 ② 加进脚本白名单
③ 带 `if: github.repository == 'SpeechlessPanda/SpeechlessPanda.github.io'` 守卫。

## GitHub Actions 硬约束（踩过坑）

- **`workflow_run` 只能监听同一仓库内的 workflow 运行**。跨仓监听静默失败，
  Actions 页面连运行记录都没有。
- **workflow_run 只追踪事件发生前已存在于默认分支的 workflow**。一个自己被部署同步
  进发布仓的 workflow，用 workflow_run 监听同仓事件会因竞态抓不到首次事件。
  → 这类场景改用 `push` 事件（参考 `deploy-notify.yml` / `search-engine-ping.yml`）。
- `deploy-notify.yml` 三个触发器方案的完整踩坑记录见 2026-10-19 日志。

## 行尾符

全局 `core.autocrlf=true`（PortableGit 系统级配置，**不要改，影响所有仓库**）。
blog 与 Panda 都已加 `.gitattributes` 锁 LF，sync 脚本也会归一化。

**验证陷阱**：`git checkout-index -a -f` 和 `git checkout -- .` 都不会重写未变更文件，
改完 `.gitattributes` 后工作区看着没变，容易误判修复失败。
**唯一权威验证是全新克隆**：
```
git clone --depth 1 file:///D:/project/Panda /tmp/t && cd /tmp/t && od -An -c _config.yml | grep -c '\r'
```
新克隆为 0 CR 即已生效，旧工作区的 CRLF 只是残留，克隆/CI 都干净。
用 `git ls-files --eol | grep w/mixed` 查混合行尾符，`git check-attr text eol -- <file>` 查规则命中。

## Actions 版本（2026-10-19 全部升到 node24，弃用警告 0 条）

`actions/checkout@v7` · `actions/setup-node@v7`（`node-version: 22`）·
`actions/cache@v6` · `pnpm/action-setup@v6` · `peaceiris/actions-gh-pages@v4.1.0` ·
`dawidd6/action-send-mail@v22`

升 checkout 大版本时的核对点：
- v6+ 凭证存 `$RUNNER_TEMP`，git push/fetch 仍自动可用，与 gh-pages 的
  `personal_token` 跨仓推送不冲突。
- v7 拒绝 fork PR checkout 仅针对 `pull_request_target`/`workflow_run`；
  本仓触发器是 push/workflow_dispatch/repository_dispatch，不受影响。
- runner 是托管 `ubuntu-latest`，满足 v5+ 的 v2.327.1+（无自建 runner 顾虑）。
- `node-version`（构建用 Node）≠ action runtime，**两者都要查**，很容易只改后者。

## 排查方法论（血泪教训）

- **别用粗筛正则下结论**。`grep -cE "^(updated|sticky)\s*:"` 把「两个不同键各一行」
  误报成「重复键」，一度以为 24 篇文章有问题。精确判断要用脚本逐文件解析。
- **shell heredoc 会吃掉 `\n`**。用它写 YAML/正则探针会得到 `meta:/n` 这类假象，
  进而误判代码有 bug。**写探针用 Write 工具落盘再 node 跑**。
- 判定「某功能不存在」前，先搜仓库外证据（用户邮件、收件箱、官方 changelog）。
  `git log -S` 只能证明「本仓库没写过」。
- 看到「后面全cancelled」先怀疑测试异步写法，别急着改被测代码。

## 运行环境

| 项目 | Node | 依据 |
|---|---|---|
| blog CI | **26**（`node-version`） | v26 于 2026-10-28 转 Active LTS；v24 于 2026-10-20 转 Maintenance |
| blog `engines` | `>=26` | 与 CI 一致 |
| Panda `engines` | `>=22` | 发布在 npm，不能强制 26；22 是仍受支持的最旧 LTS |

**本机两套 Node，别搞混**：
- `C:\Users\ming\.workbuddy\binaries\node\versions\*` —— WorkBuddy 托管运行时，**不要动**
- `D:\nodejs` —— 用户的系统安装（Machine PATH 唯一 node 条目，MSI 装的）
  - 归 Administrators 所有，**非管理员写不进去**
  - 沙箱黑名单拦 `Start-Process -Verb RunAs` / `msiexec` / `sc.exe`，
    升级只能让用户手动双击 MSI

## 邮件通知现状

- **评论通知**：`comment-email-notify.yml`（发布仓，`discussion` + `discussion_comment`）
- **部署通知**：`deploy-notify.yml`（发布仓，`push`）—— 替代 GitHub
  2026-10-15 下线的仓库 push 原生邮件通知
- 两者都用 `dawidd6/action-send-mail@v22`（node24）。**v20+ 有 BREAKING CHANGE**：
  `HTTP_PROXY` 不再读取，改用 `SMTP_PROXY` 环境变量（本项目不走代理，无影响）。
- 部署通知需要**推第二次**才会收到第一封邮件：文件由部署同步进发布仓，
  当次部署的 push 事件发生在文件落地之前，属正常时序。

## 测试约定（两个项目通用）

`node --test` 里 **`t.test()` 必须 `await`，父测试必须 `async`**。否则子测试被标记
`test did not finish before its parent and was cancelled`，症状是"第一个子测试过、
后面全cancelled"，看着像被测代码坏了，其实是被测代码没问题、测试写法有问题。

**排查手法**：先把断言抽出来 `node -e` 逐条跑一遍，全通过即证明问题在测试侧。
Panda 的 `post-updated.test.js` 就是这样查出真实原因的。

注意 `describe`/`it` 在 node:test 里是**同步**的，不受此影响 —— Panda 另外 4 个
测试文件用的这套，所以一直正常，别误改。

## npm registry（重要）

本机全局 registry 是 **`https://registry.npmmirror.com`（淘宝镜像）**，不是 npm 官方源。
新版本发布后镜像同步有延迟：`npm view <pkg> version` 可能仍显示旧版，
但 `pnpm add <pkg>@<new>` 却能成功。**遇到"版本查不到"先确认 registry，别急着判断没发布。**
需要确认官方源是否已上：`npm view <pkg> version --registry=https://registry.npmjs.org`

## 部署注意事项

- checkout 会把所有文件 mtime 设为 checkout 时间，导致 `updated_option: mtime`
  把每篇文章的 updated 当成构建时间。deploy workflow 已按 git 提交时间恢复 mtime，
  改构建流程时别破坏这个步骤。
- `exclude_assets: ""` 必须保留，否则丢掉 `public/.github/workflows`。
