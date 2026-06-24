// scripts/og-image.js
// 为每篇文章生成 OG 分享预览图(SVG → PNG via @resvg/resvg-js),并注入 og:image。
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
    const agent = new https.Agent({ keepAlive: false })
    const file = fs.createWriteStream(dest)
    let settled = false
    const finish = (fn) => {
      if (settled) return
      settled = true
      try { agent.destroy() } catch (e) {}
      fn()
    }
    const get = (u) => {
      const req = https.get(u, { agent }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          get(res.headers.location)
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          fs.unlink(dest, () => finish(() => reject(new Error('下载字体失败 ' + res.statusCode + ': ' + u))))
          return
        }
        res.pipe(file)
        file.on('finish', () => file.close(() => finish(resolve)))
      })
      req.on('error', (e) => { fs.unlink(dest, () => {}); finish(() => reject(e)) })
    }
    get(url)
  })
}

async function ensureFont(fontDir, name, url, log) {
  const filePath = path.join(fontDir, name)
  if (fs.existsSync(filePath)) return filePath
  if (!url) throw new Error('字体 URL 未配置: ' + name)
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

// 按字符数切行(中文为主,1 字 ≈ 1 字宽);超出 maxLines 截断加 …
function wrapText(text, charsPerLine, maxLines) {
  const chars = Array.from(text)
  const lines = []
  for (let i = 0; i < chars.length && lines.length < maxLines; i += charsPerLine) {
    lines.push(chars.slice(i, i + charsPerLine).join(''))
  }
  if (chars.length > maxLines * charsPerLine) {
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, Math.max(1, charsPerLine - 1)) + '…'
  }
  return lines
}

function postSlug(post) {
  return (post.path || post.slug || 'post')
    .replace(/\/index\.html$/, '')
    .replace(/[\/\\]/g, '-')
}

function tagNames(post) {
  const t = post.tags
  const arr = Array.isArray(t) ? t : (t && t.data) || []
  return arr.map(x => (x && x.name) || x).filter(Boolean).join('   ')
}

function buildSvg(post, cfg) {
  const title = post.title || post.slug || ''
  const titleLen = Array.from(title).length
  const fontSize = titleLen <= 12 ? 76 : titleLen <= 20 ? 60 : 48
  const charsPerLine = Math.max(6, Math.floor((cfg.width - 160) / fontSize))
  const titleLines = wrapText(title, charsPerLine, 2)

  const date = post.date ? post.date.format('YYYY·MM·DD') : ''
  const tags = tagNames(post)
  const subtitle = [date, tags].filter(Boolean).join('    ·    ')

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

let fontPromise = null
function getFontPaths(cfg, log) {
  // 用 in-flight Promise 去重:并发调用共享同一次下载,避免多 post 同时触发下载导致文件写竞态
  if (fontPromise) return fontPromise
  fontPromise = (async () => {
    const [regular, bold] = await Promise.all([
      ensureFont(cfg.fontDir, cfg.fontRegular, cfg.regularUrl, log),
      ensureFont(cfg.fontDir, cfg.fontBold, cfg.boldUrl, log)
    ])
    return [regular, bold]
  })()
  return fontPromise
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

// 1) 提供 og_image_url helper,供 Open_Graph.pug 直接计算每篇 post 的 og 图地址。
//    不用 post 自定义属性,因为 hexo 的 post Document 属性不一定透传到模板的 page 变量。
hexo.extend.helper.register('og_image_url', function (page) {
  const cfg = getConfig(hexo)
  if (!cfg.enable || !page || !page.path) return ''
  const slug = String(page.path).replace(/\/index\.html$/, '').replace(/[\/\\]/g, '-')
  return '/' + cfg.outputDir + '/' + slug + '.png'
})

// 2) 为每个 post 注册 PNG 生成 route(build 时渲染)
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
