// scripts/memo-helpers.js
// 首页最新碎碎念卡片用的 helper(pug 模板里无法直接访问 hexo.render,故注册为 helper)
'use strict'

hexo.extend.helper.register('latest_memo', function () {
  const memos = (hexo.locals.get('data').shuoshuo || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date))
  if (!memos.length) return null
  const latest = memos[0]
  const html = hexo.render.renderSync({ text: latest.content || '', engine: 'markdown' })
  const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const excerpt = plainText.length > 120 ? plainText.slice(0, 120) + '…' : plainText
  return { excerpt, date: latest.date }
})
