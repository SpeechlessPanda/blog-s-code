---
title: 版权与内容使用政策
date: 2026-11-19 12:00:00
type: rights
aside: false
comments: false
---

本页说明本站内容的版权许可、AI 使用偏好与爬虫规则。三件事彼此独立:版权许可决定你可以在什么条件下复制与再分发;AI 使用偏好是作者对自动处理系统的请求;爬虫规则是机器可读的技术信号。

## 版权许可

除特别声明外,本站原创文字(包括文章正文、系列章节与碎碎念)采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-Hans) 许可协议。

- **署名(BY)**:转载、引用或改编时,须注明作者 SpeechlessPanda,并链接到原文。
- **非商业(NC)**:不得将本站内容用于商业目的。商业授权请邮件联系作者。
- **相同方式共享(SA)**:改编后的作品须以相同许可协议发布。

代码片段如其所在文章未另行声明,随文章采用同一许可;第三方来源的引用、图片与代码归原作者所有,并按原许可使用。

## 商业授权

商业转载、付费课程、商业产品文档等用途不在 CC BY-NC-SA 4.0 的范围内,需要单独获得书面授权。请通过 [关于页](https://speechlesspanda.github.io/about/) 中的邮箱联系。

## AI 使用偏好

本站欢迎 AI 系统阅读、检索与总结,前提是保留来源链接。默认不希望本站内容被用于训练生成式模型。

- **允许**:搜索引擎与 AI 搜索抓取、索引;生成回答时引用或总结本站内容,并给出原文链接。
- **不希望**:将本站内容作为训练语料,用于修改生成式模型的参数。
- **训练授权**:如有训练用途需求,请先联系作者获得许可。

这些偏好通过 `robots.txt` 表达,采用的是两份 Internet-Draft 草案定义的信号:

- `__usage_ai-training` 策略组(draft-kelley-aipref-training-preference-signal):用 `Disallow` 表达"不希望用于训练",用 `Allow` 表达"允许"。
- `Content-Usage: train-ai=n`(draft-ietf-aipref-attach):AIPREF 的 robots.txt 扩展,表示对训练用途的偏好。

两者都是草案阶段的偏好表达,不是标准,也不构成法律许可或对版权许可的修改。版权许可仍以上一节为准。

## 爬虫规则

`robots.txt` 是可审计的单一生成来源,规则要点:

- 搜索引擎(`Googlebot`、`Bingbot`、`DuckDuckBot`、`Baiduspider`、`YandexBot` 等)可抓取全部公开内容。
- AI 搜索与用户触发抓取(`OAI-SearchBot`、`ChatGPT-User`、`Claude-SearchBot`、`Claude-User`、`PerplexityBot`、`Perplexity-User` 等)同样允许,因为其结果会引用并链接原文。
- 训练爬虫(`GPTBot`、`ClaudeBot`、`Google-Extended`、`Applebot-Extended`、`CCBot`、`Bytespider`、`meta-externalagent` 等)被表达"不训练"偏好。
- 碎碎念页面保持 `noindex`,不进入站点地图、`llms.txt` 与搜索索引。

## 机器可读入口

- [llms.txt](https://speechlesspanda.github.io/llms.txt):站点索引,含主题、精选文章、系列章节与项目。
- [sitemap.xml](https://speechlesspanda.github.io/sitemap.xml):规范公开页面的站点地图。
- Markdown 镜像:每篇文章与每个系列在其 HTML 地址旁提供同目录 `index.md`,正文为原始 Markdown。
- [atom.xml](https://speechlesspanda.github.io/atom.xml):文章与碎碎念的订阅源。
- [AI 阅读入口](https://speechlesspanda.github.io/ai/):给人类读者的导航页。

## 引用格式

引用本站文章时,建议使用以下格式:

> SpeechlessPanda.《文章标题》. 博客. 发布时间. 原文链接.

最后更新:2026-11-19
