//@ts-ignore
import Sandbox from '../components/sandbox.vue';
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import '../../../dist/index.js' // Load u-elements
import './custom.css'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('Sandbox', Sandbox)
  }
} satisfies Theme
