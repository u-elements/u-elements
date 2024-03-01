import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import esbuild from 'esbuild'

export default {
  load() {
    const file = path.resolve(__dirname, '../packages/u-tabs/dist/u-tabs.js')
    const { code } = esbuild.transformSync(fs.readFileSync(file), { minify: true })
    const bytes = zlib.gzipSync(code, { level: 9 }).length
    return {
      mini: niceBytes(code.length),
      gzip: niceBytes(bytes)
    }
  }
}

function niceBytes(bytes: number){
  const units = ' KMGTPEZY'
  let size = bytes
  let type = 0

  while (size >= 1024 && ++type) size /= 1024
  return `${size.toFixed(size < 10 && type > 0 ? 1 : 0)} ${units[type]}B`
}