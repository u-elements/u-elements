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
      pattern: 'https://github.com/u-elements/u-elements/edit/main/docs/:path',
      text: 'Suggest changes to this page'
    },
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Elements', link: '/elements/' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Why u-elements', link: '/guide/why' },
          { text: 'Getting started', link: '/guide/' }
        ]
      },
      {
        text: 'Elements',
        items: [
          { text: '&lt;u-datalist&gt; <mark data-badge="html5"></mark>', link: '/elements/u-datalist' },
          { text: '&lt;u-details&gt; <mark data-badge="html5"></mark>', link: '/elements/u-details' },
          { text: '<del>&lt;u-dialog&gt;</del> <mark data-badge="html5"></mark>', link: '/elements/u-dialog' },
          { text: '&lt;u-progress&gt; <mark data-badge="html5"></mark>', link: '/elements/u-progress' },
          { text: '<del>&lt;u-selectlist&gt;</del> <mark data-badge="pending"></mark>', link: '/elements/u-selectlist' },
          { text: '&lt;u-tabs&gt; <mark data-badge="wcag"></mark>', link: '/elements/u-tabs' }
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
