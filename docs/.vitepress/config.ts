import { defineConfig } from 'vitepress'

const base = '/u-elements/';

export default defineConfig({
  title: 'u-elements',
  base,
  cleanUrls: true,
  description: "Standard HTML tags - just truly accessible",
  vue: {
    template: {
      compilerOptions: {
        whitespace: 'preserve', // Making Sandbox html render nicer
        isCustomElement: (tag) => tag.includes('-')
      }
    }
  },
  head: [['link', { rel: 'icon', href: `${base}logo.svg` }]],
  themeConfig: {
    logo: '/logo.svg',
    outline: 'deep',
    externalLinkIcon: true,
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
          { text: '&lt;u-datalist&gt;', link: '/reference/u-datalist' },
          { text: '&lt;u-details&gt;', link: '/reference/u-details' },
          { text: '&lt;u-dialog&gt;', link: '/reference/u-dialog' },
          { text: '&lt;u-progress&gt;', link: '/reference/u-progress' },
          { text: '&lt;u-selectlist&gt;', link: '/reference/u-selectlist' },
          { text: '&lt;u-tabs&gt;', link: '/reference/u-tabs' }
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
