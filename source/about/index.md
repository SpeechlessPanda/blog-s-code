---
title: 关于
date: 2026-03-01 14:35:00
type: about
aside: false
---

# 关于我

你好，欢迎来到我的博客。我是一个普通人，现在就读于 HITSZ ，爱好是打篮球、看书和农，目前还没什么突出成就和值得说道的事情（希望以后会有）。

本博客主要内容包括：

- **个人成长与随笔**：记录大学生活、学习经验、人生选择与思考。
- **不定主题内容**：作者想写的任何内容，包括但不限于技术感悟、生活观察等。

SpeechlessPanda 这个名字来源于我某次游戏取名的无心之举。因为我以前就有个别人给的ip就是熊猫，但是单纯熊猫这个名字太单调了，所以随手加了个无语上去。加上去之后，就觉得这个修饰还挺符合我本人的性格，故后面就用了它的英文直译形式作为我的 GitHub 和博客名。

好像没什么能写的了，那就这样结束这部分吧。

联系我：zhoushimingyu@qq.com

为了方便后来和我一样有想搭博客写博客想法的人重走我的路（当然鼓励自行探索），在此留下本博客仓库 [README.md](https://github.com/SpeechlessPanda/SpeechlessPanda.github.io/blob/main/README.md) 和本人根据我博客开源的最新 hexo 主题：[Panda](https://github.com/SpeechlessPanda/hexo-theme-panda)。

## 项目经历

### 星载多模态遥感大模型

**队长 · 五人团队**（2026.06 – 2026.09）

面向星上算力受限场景的遥感视觉语言模型，支持遥感问答、描述、变化解译与目标定位等多任务，打通“数据治理 — 模型微调 — 蒸馏压缩 — 端侧部署”全链路。

- **我的工作**：统筹整体技术路线与团队分工；负责多源遥感数据治理与防泄漏划分，设计 Qwen3-VL 多任务 LoRA 微调方案，并落地从蒸馏、剪枝、量化到端侧部署的模型压缩链路。
- **技术栈**：PyTorch、LoRA、知识蒸馏、结构化剪枝、量化感知训练。
- **成果**：多任务全量评测 Overall Accuracy 由 22.81% 提升至 42.89%；压缩后的模型保留教师模型约 84% 综合性能、部分任务反超教师，并在 Jetson AGX Orin 上完成端侧部署实测。

### 可解释颅面罕见病智能诊断系统

**核心开发者 · 双人团队**（2025.09 – 2026.02）

面向幼儿面部照片的颅面罕见病辅助诊断系统（健康 / Williams / 唐氏 / Goldenhar 四分类），同时输出结构化诊断说明，兼顾可解释与端侧落地。

- **我的工作**：负责从基线复现、多方案对比的实验推进；独立实现 FastAPI 后端、Web 前端与 Flutter 移动端，打通“拍照上传 — 人脸裁剪 — 诊断输出”完整链路。
- **技术栈**：MedGemma、LoRA、FastAPI、Flutter、InsightFace。
- **成果**：产出一项国家发明专利（已受理，第三发明人）；测试集上 Williams 综合征召回 0.90、健康样本假阳性率 0.22%。

## 我的 GitHub 项目

- **[hexo-theme-panda](https://github.com/SpeechlessPanda/hexo-theme-panda)** `npm 包`：基于 Butterfly 深度二开并独立维护的卡片式 Hexo 主题，发布于 npm（首月下载 400+，GitHub 20 star），本博客即演示站。扩展了 memo 时间线（Giscus 评论、深链独立页、本地搜索注入）、博客系列聚合卡片、混合文章与动态的 Atom 订阅源、文章级 OG 分享图等一整套功能；配套 30 项单元 / 冒烟测试、语义化版本发布流程与六语言 i18n。
- **[HITA_Android](https://github.com/HIT-A/HITA_Android)**（HIT-A 组织项目，我作为组织成员参与开发）：面向哈工大三校区的开源校园工具 App（Kotlin / Jetpack Compose，非官方），覆盖课表日程、教务查询、选课助手与 ReAct AI 助手；周活跃安装 893，最新版本下载 1100+。我主要负责课表数据的自动刷新与合并策略，并参与功能迭代与版本文档维护。
- **[EnvironmentalMonitoringInstrument](https://github.com/SpeechlessPanda/EnvironmentalMonitoringInstrument)**（三人团队）：手持多传感器环境监测装置——MSPM0G3507 固件采集气压 / 温湿度 / 光照，OLED 分页显示、蜂鸣器 / LED 阈值报警，经 HC-05 蓝牙透传至浏览器 Web Bluetooth 实时面板。我负责 PCB 绘制、焊接调试与固件 / 网页实现，获评优秀项目。
- **[AircraftWar](https://github.com/SpeechlessPanda/AircraftWar)**：Java Swing 桌面射击游戏：三档难度、多种敌机与补给、排行榜与成就系统，集中实践工厂、策略、模板方法、观察者、DAO 等设计模式，附 JUnit 5 测试与 UML 类图，支持打包 JAR 与 Windows 免安装包。
- **[hitsz-resume-typst](https://github.com/SpeechlessPanda/hitsz-resume-typst)**：哈工深中文简历的 Typst 模板（自 LaTeX 模板移植，MIT）：模板与个人信息分离——个人内容只写入 gitignore 的本地文件，从机制上防止隐私误提交；自带字体 / 图标资源与编译脚本，一条命令出 PDF。
- **[BlogForEveryone](https://github.com/SpeechlessPanda/BlogForEveryone)** `半成品`：面向新手的博客搭建与管理桌面应用（Electron + Vue 3），用全可视化流程替代命令行操作，覆盖从创建、发布到迁移恢复的完整链路，目前支持 Hexo / Hugo 共 10 款主题，可一键发布到 GitHub Pages。
- **[kunlungame](https://github.com/SpeechlessPanda/kunlungame)** `半成品`：Windows 桌面叙事游戏（TypeScript），结合 AI 对话、文化知识检索与混合视觉叙事的互动体验。
- **[rustbook-project](https://github.com/SpeechlessPanda/rustbook-project)**：两个 Rust 实战项目：命令行文本搜索工具 minigrep，以及基于手写线程池的多线程 Web 服务器（mpsc 任务队列、优雅停机，7 项单元测试 + 文档测试）。
- **[learncpp-projrct](https://github.com/SpeechlessPanda/learncpp-projrct)**：C++17 控制台小游戏合集：健壮计算器、猜单词、二十一点、数字推盘、打怪升级等 7 个可独立编译运行的小程序。
- 另有本博客相关仓库：[blog-s-code](https://github.com/SpeechlessPanda/blog-s-code)（本站 Hexo 源码，push 即自动构建发布）与 [SpeechlessPanda.github.io](https://github.com/SpeechlessPanda/SpeechlessPanda.github.io)（本站静态页面发布仓库）。
