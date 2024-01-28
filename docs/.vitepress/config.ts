import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "u-elements",
  description: "Standard HTML tags - just truly accessible",
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.includes('-')
      }
    }
  },
  head: [['link', { rel: 'icon', href: '/logo.svg' }]],
  themeConfig: {
    logo: '/logo.svg',
    outline: 'deep',
    editLink: {
      pattern: 'https://github.com/u-elements/u-tags/tree/main/docs/:path'
    },
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Guide', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Why u-elements', link: '/why' },
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/u-elements/u-tags' }
    ],
    footer: {
      message: 'Released under the MIT License'
    }
  }
})
