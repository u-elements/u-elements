import vue from '@vitejs/plugin-vue'

export default {
  root: __dirname,
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('u-'),
        }
      }
    })
  ]
}