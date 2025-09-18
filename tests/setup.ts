const { Application } = require('spectron')
const { resolve } = require('path')

export class TestSetup {
  public app: any | null = null

  async startApp(options: any = {}) {
    const electronPath = resolve(__dirname, '../node_modules/.bin/electron')
    const appPath = resolve(__dirname, '../apps/desktop/dist/main.js')

    this.app = new Application({
      path: electronPath,
      args: [appPath],
      env: {
        NODE_ENV: 'test',
        ELECTRON_IS_DEV: '0'
      },
      startTimeout: 10000,
      waitTimeout: 5000,
      ...options
    })

    return await this.app.start()
  }

  async stopApp() {
    if (this.app && this.app.isRunning()) {
      await this.app.stop()
    }
  }

  async getWindowCount() {
    return await this.app?.client.getWindowCount() || 0
  }

  async getTitle() {
    return await this.app?.client.getTitle() || ''
  }
}

// module.exports = { TestSetup }