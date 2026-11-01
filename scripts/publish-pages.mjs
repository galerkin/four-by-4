import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Publish only the verified static artifact. This does not check out another
// branch, change the real Git index, force-push, or require a workflow token.
const root = process.cwd()
const dryRun = process.argv.includes('--dry-run')
const base = process.env.VITE_BASE_PATH || '/four-by-4/'
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const npm = (script, extraEnv = {}) => execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
  cwd: root, stdio: 'inherit', env: { ...process.env, VITE_BASE_PATH: '/', ...extraEnv },
})
if (git('branch', '--show-current') !== 'main') throw new Error('Publish from the main branch.')
if (git('status', '--porcelain')) throw new Error('Commit your source changes before publishing. The working tree must be clean.')
const sourceCommit = git('rev-parse', 'HEAD')
if (!dryRun) {
  const remoteMain = git('ls-remote', 'origin', 'refs/heads/main').split(/\s/)[0]
  if (remoteMain !== sourceCommit) throw new Error('Push main to origin first, so the deployed artifact has a published source commit.')
}
const gitDir = git('rev-parse', '--absolute-git-dir')
const scratch = await mkdtemp(join(tmpdir(), 'four-by-four-pages-'))
try {
  npm('check')
  npm('test:e2e')
  npm('build', { VITE_BASE_PATH: base })
  npm('test:pages', { VITE_BASE_PATH: base })
  await writeFile('dist/.nojekyll', '')
  await writeFile('dist/deployment.json', JSON.stringify({ sourceCommit, builtAt: new Date().toISOString() }, null, 2) + '\n')
  const artifactGit = (...args) => execFileSync('git', [`--git-dir=${gitDir}`, `--work-tree=${resolve('dist')}`, ...args], {
    cwd: resolve('dist'), encoding: 'utf8', env: { ...process.env, GIT_INDEX_FILE: join(scratch, 'index') },
  }).trim()
  artifactGit('add', '--all')
  const tree = artifactGit('write-tree')
  if (dryRun) {
    console.log(`Verified deployment tree ${tree} for source ${sourceCommit}. No push performed.`)
    console.log(git('ls-tree', '-r', '--name-only', tree))
  } else {
    const parentArgs = []
    if (git('ls-remote', '--heads', 'origin', 'refs/heads/gh-pages')) {
      git('fetch', '--no-tags', 'origin', 'gh-pages')
      parentArgs.push('-p', git('rev-parse', 'FETCH_HEAD'))
    }
    const commit = git('commit-tree', tree, ...parentArgs, '-m', `Deploy ${sourceCommit}`)
    // A concurrent deployment is rejected as non-fast-forward rather than overwritten.
    execFileSync('git', ['push', 'origin', `${commit}:refs/heads/gh-pages`], { cwd: root, stdio: 'inherit' })
    console.log(`Uploaded ${commit} to gh-pages. Check GitHub Pages build status for publication.`)
  }
} finally {
  await rm(scratch, { recursive: true, force: true })
  // Keep an already-running localhost preview usable at its original root URL.
  npm('build')
}
