const fs = require('node:fs')
const path = require('node:path')

hexo.extend.filter.register('after_generate', () => {
    const sourceFile = path.join(hexo.base_dir, 'README.md')
    const targetFile = path.join(hexo.public_dir, 'README.md')

    if (!fs.existsSync(sourceFile)) {
        hexo.log.warn('[readme-sync] Missing README.md in project root')
        return
    }

    try {
        fs.copyFileSync(sourceFile, targetFile)
        hexo.log.info('[readme-sync] Synced README.md to public/README.md')
    } catch (error) {
        hexo.log.warn(`[readme-sync] Failed to sync README.md: ${error.message}`)
    }
})
