<div align="right">
  <a title="中文" href="/README_CN.md">中文</a>
</div>

<div align="center">

<img src="./source/img/butterfly-icon.png" width="150" height="150" alt="Butterfly Logo" />

# hexo-theme-butterfly

A modern, elegant and feature-rich theme for Hexo

![master version](https://img.shields.io/github/package-json/v/jerryc127/hexo-theme-butterfly/master?color=%231ab1ad&label=master)
![dev version](https://img.shields.io/github/package-json/v/jerryc127/hexo-theme-butterfly/dev?label=dev)
![npm version](https://img.shields.io/npm/v/hexo-theme-butterfly?color=%09%23bf00ff)
![hexo version](https://img.shields.io/badge/hexo-5.3.0+-0e83cd)
![license](https://img.shields.io/github/license/jerryc127/hexo-theme-butterfly?color=FF5531)
![GitHub stars](https://img.shields.io/github/stars/jerryc127/hexo-theme-butterfly?style=social)

📢 **Demo**: [Butterfly Official](https://butterfly.js.org/) | [CrazyWong's Blog](https://blog.crazywong.com/)

📖 **Documentation**: [English Docs](https://butterfly.js.org/en/posts/butterfly-docs-en-get-started/) | [中文文档](https://butterfly.js.org/posts/21cfbf15/)

![Butterfly Theme Preview](https://cdn.jsdelivr.net/gh/jerryc127/CDN@m2/img/theme-butterfly-readme.png)

</div>

---

## 🚀 Quick Start

### 💾 Installation

#### Method 1: Git Installation (Recommended)

> 💡 **Tip**: If GitHub access is slow in mainland China, you can use the [Gitee Mirror](https://gitee.com/immyw/hexo-theme-butterfly.git)

Execute in your Hexo blog root directory:

```bash
# Install stable version (recommended)
git clone -b master https://github.com/jerryc127/hexo-theme-butterfly.git themes/butterfly
```

```bash
# Install development version (early access to new features)
git clone -b dev https://github.com/jerryc127/hexo-theme-butterfly.git themes/butterfly
```

#### Method 2: NPM Installation

> ⚠️ **Note**: NPM installation only supports Hexo 5.0.0 and above

```bash
npm install hexo-theme-butterfly
```

### ⚙️ Theme Configuration

1. **Enable Theme**: Modify your Hexo configuration file `_config.yml`:

```yaml
theme: butterfly
```

2. **Install Dependencies**: If you haven't installed pug and stylus renderers, please run:

```bash
npm install hexo-renderer-pug hexo-renderer-stylus --save
```

## ✨ Theme Features

### 🎨 Design Style
- [x] **Card-based Design** - Modern card-style layout
- [x] **Rounded/Square Design** - Customizable border styles
- [x] **Responsive Design** - Perfect adaptation to all screen sizes
- [x] **Two-column Layout** - Optimized reading experience
- [x] **Dark Mode** - Eye-friendly night mode

### 📝 Content Features
- [x] **Multi-level Menu** - Support for secondary navigation menus
- [x] **Reading Mode** - Focused article reading experience
- [x] **TOC Navigation** - Desktop and mobile TOC support
- [x] **Word Count** - Display article word count and reading time
- [x] **Related Articles** - Smart recommendation of related content
- [x] **Outdated Reminder** - Automatic article update status alerts
- [x] **Traditional/Simplified Chinese** - Support for Traditional and Simplified Chinese switching
- [x] **Tag Plugins** - Rich tag plugin support

### 🔍 Search & Navigation
- [x] **Multiple Search Options** - Algolia Search / Local Search / Docsearch
- [x] **Built-in 404** - Beautiful 404 error page
- [x] **Pjax Support** - Smooth page transition experience

### 🎨 Code Display
- [x] **Syntax Highlighting** - Built-in multiple themes (darker/pale night/light/ocean)
- [x] **Code Features** - Language display/fold expand/copy button/auto-wrap
- [x] **Math Formulas** - Support for Mathjax and Katex

### 💬 Social Interaction
- [x] **Multiple Comment Systems** - Disqus/Gitalk/Valine/Waline/Twikoo/Giscus/Artalk etc.
- [x] **Dual Comments Support** - Enable two comment systems simultaneously
- [x] **Share Features** - Sharejs/Addtoany sharing components
- [x] **Live Chat** - Chatra/Tidio/Crisp instant messaging

### 📊 Analytics & Statistics
- [x] **Visit Statistics** - Busuanzi counter
- [x] **Site Analytics** - Google Analytics/Baidu Analytics/Cloudflare Analytics/Microsoft Clarity/Umami
- [x] **Webmaster Verification** - Major search engine verification
- [x] **Ad Support** - Google AdSense/custom ad slots

### 🎪 Visual Effects
- [x] **Typing Effects** - activate_power_mode animations
- [x] **Background Effects** - Static ribbons/dynamic ribbons/floating ribbons/Canvas Nest
- [x] **Mouse Effects** - Fireworks/hearts/text click effects
- [x] **Loading Animations** - Preloader and pace.js progress bars
- [x] **Image Effects** - Medium Zoom/Fancybox image lightbox
- [x] **Lazy Loading** - Image lazy loading optimization

### 🛠️ Advanced Features
- [x] **PWA Support** - Progressive Web App
- [x] **Copy Protection** - Disable text copying/copyright info append
- [x] **Theme Customization** - Custom site color schemes
- [x] **Chart Support** - Mermaid flowcharts/Chart.js data charts
- [x] **Music Notation** - ABCJS music notation support
- [x] **Article Series** - Series article organization
- [x] **Instantpage** - Page preloading acceleration
- [x] **Snackbar** - Elegant notification messages

## 🤝 Contributors

Thanks to all the developers who have contributed to the Butterfly theme!

[![Contributors](https://contrib.rocks/image?repo=jerryc127/hexo-theme-butterfly)](https://github.com/jerryc127/hexo-theme-butterfly/graphs/contributors)

## 📸 Screenshots

<div align="center">

![Theme Demo](https://cdn.jsdelivr.net/gh/jerryc127/CDN@m2/img/butterfly-readme-screenshots-1.jpg)

![Theme Demo](https://cdn.jsdelivr.net/gh/jerryc127/CDN@m2/img/butterfly-readme-screenshots-2.jpg)

![Theme Demo](https://cdn.jsdelivr.net/gh/jerryc127/CDN@m2/img/butterfly-readme-screenshots-3.jpg)

![Theme Demo](https://cdn.jsdelivr.net/gh/jerryc127/CDN@m2/img/butterfly-readme-screenshots-4.jpg)

</div>


## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=jerryc127/hexo-theme-butterfly&type=Date)](https://star-history.com/#jerryc127/hexo-theme-butterfly&Date)

## 🤝 Building a Better Theme Together

We believe **the power of open source comes from everyone's participation**! Whether you're a developer, designer, or user, you can contribute to the development of the Butterfly theme.

### 💬 Get Help & Support

- 🐛 **Found a bug?** → [GitHub Issues](https://github.com/jerryc127/hexo-theme-butterfly/issues) - Let's solve it together!
- 💡 **Have ideas?** → [GitHub Discussions](https://github.com/jerryc127/hexo-theme-butterfly/discussions) - Share your creative ideas!
- 📚 **Learning to use?** → [Official Documentation](https://butterfly.js.org/) - Detailed usage guide
- 💬 **Real-time discussion?** → [Telegram Group](https://t.me/bu2fly) - Chat with community members

### 🎯 Contributing

Want to make Butterfly better? We welcome any form of contribution:

- **🔧 Code Contributions** - Fix bugs, add new features, optimize performance
- **📝 Documentation** - Improve docs, translate content, write tutorials
- **🎨 Design Suggestions** - UI/UX improvements, theme colors, icon design
- **🧪 Testing & Feedback** - Test new features, report issues, provide user experience
- **💰 Financial Support** - [Sponsor the Project](https://buy.stripe.com/3cs6rP6YA91sbbG5kk) - Support long-term development

## 📄 License

This project is licensed under the [Apache 2.0](LICENSE) License.

## 🙏 Acknowledgments

This theme is developed based on [hexo-theme-melody](https://github.com/Molunerfinn/hexo-theme-melody). Thanks to the original author for their excellent work that provided inspiration and foundation!

Thanks to all friends who have contributed to the development of the Butterfly theme. Your support has made this theme continuously improve and progress.

---

<div align="center">

**✨ If this theme helps you, please give us a ⭐ Star! ✨**
</div>
