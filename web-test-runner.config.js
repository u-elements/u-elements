import { playwrightLauncher, devices } from '@web/test-runner-playwright'
import { vitePlugin } from '@remcovaes/web-test-runner-vite-plugin'

export default {
  files: 'tests/*.spec.ts',
  playwright: true,
  coverageConfig: {
    include: ['src/u-*.ts']
  },
	plugins: [vitePlugin()],
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'firefox' }),
    playwrightLauncher({ product: 'webkit' }),
    playwrightLauncher({
      product: 'webkit',
      createBrowserContext: ({ browser }) => browser.newContext({ ...devices['iPhone X'] })
    }),
    playwrightLauncher({
      product: 'chromium',
      createBrowserContext: ({ browser }) => browser.newContext({ ...devices['Pixel 5'] })
    })
  ]
}