import { qwikVite } from '@builder.io/qwik/optimizer'

export default {
  root: __dirname,
  plugins: [
    qwikVite({
      csr: true,
      srcDir: './'
    })
  ]
}
