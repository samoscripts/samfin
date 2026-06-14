import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(frontendRoot, '..')
const pkg = JSON.parse(readFileSync(path.join(frontendRoot, 'package.json'), 'utf8'))

const now = new Date()
const build = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
  '.',
  String(now.getHours()).padStart(2, '0'),
  String(now.getMinutes()).padStart(2, '0'),
].join('')

let commit = null
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim()
} catch {
  // outside git repo or git unavailable
}

const info = {
  version: pkg.version,
  build,
  commit,
}

const outDir = (() => {
  const dockerConfig = '/backend-config'
  if (existsSync(dockerConfig)) return dockerConfig
  return path.join(repoRoot, 'backend/config')
})()
mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'build_info.json')
writeFileSync(outPath, `${JSON.stringify(info, null, 2)}\n`)
console.log(`Wrote ${outPath}:`, info)
