// @ts-ignore
import Sandbox from '../components/sandbox.vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './custom.css'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('Sandbox', Sandbox)
  }
} satisfies Theme
