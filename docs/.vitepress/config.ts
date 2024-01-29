import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'u-elements',
  base: '/u-elements/',
  cleanUrls: true,
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
      { text: 'Guide', link: '/guide/' },
      { text: 'Reference', link: '/reference/' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Why u-elements', link: '/guide/why' },
          { text: 'Getting started', link: '/guide/' },
          { text: 'Runtime API Examples', link: '/guide/api-examples' },
          { text: 'Overview', link: '/reference/' }
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'u-datalist', link: '/reference/u-datalist' },
          { text: 'u-details', link: '/reference/u-details' },
          { text: 'u-dialog', link: '/reference/u-dialog' },
          { text: 'u-progress', link: '/reference/u-progress' },
          { text: 'u-selectlist', link: '/reference/u-selectlist' },
          { text: 'u-tabs', link: '/reference/u-tabs' }
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
