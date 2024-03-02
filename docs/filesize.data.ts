import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import esbuild from 'esbuild'

export default {
  load() {
    const pkgsPath = path.resolve(__dirname, '../packages');
    const pkgsDistFiles = fs.readdirSync(pkgsPath)
      .map((pkgName) => path.resolve(pkgsPath, pkgName, `dist/${pkgName}.js`))
      .filter((pkgDistFile) => fs.existsSync(pkgDistFile))

    return Object.fromEntries(pkgsDistFiles.map((file) => {
      const { code } = esbuild.transformSync(fs.readFileSync(file), { minify: true })
      const gzip = zlib.gzipSync(code, { level: 9 }).length;

      return [path.basename(file, '.js'), niceBytes(gzip)];
    }))
  }
}

function niceBytes(bytes: number){
  const units = ' KMGTPEZY'
  let size = bytes
  let type = 0

  while (size >= 1024 && ++type) size /= 1024
  return `${size.toFixed(size < 10 && type > 0 ? 1 : 0).replace('.0', '')} ${units[type]}B`
}