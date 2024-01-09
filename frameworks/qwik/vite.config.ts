import { qwikVite } from '@builder.io/qwik/optimizer'

export default {
  plugins: [
    qwikVite({
      csr: true,
      srcDir: './'
    })
  ]
}
