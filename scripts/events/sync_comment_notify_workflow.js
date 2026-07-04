const fs = require('node:fs')
const path = require('node:path')

hexo.extend.filter.register('after_generate', () => {
    const sourceDir = path.join(hexo.base_dir, '.github', 'workflows')
    const targetDir = path.join(hexo.public_dir, '.github', 'workflows')
    const publishRepoWorkflows = new Set([
        'comment-email-notify.yml',
        'search-engine-ping.yml'
    ])

    if (!fs.existsSync(sourceDir)) {
        hexo.log.warn('[workflow-sync] Missing directory .github/workflows')
        return
    }

    const files = fs
        .readdirSync(sourceDir)
        .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
        .filter(file => publishRepoWorkflows.has(file))

    if (files.length === 0) {
        hexo.log.warn('[workflow-sync] No publish-repo workflows found in .github/workflows')
        return
    }

    fs.mkdirSync(targetDir, { recursive: true })
    for (const file of files) {
        fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file))
    }

    hexo.log.info(`[workflow-sync] Synced ${files.length} workflow file(s) to public/.github/workflows`)
})
