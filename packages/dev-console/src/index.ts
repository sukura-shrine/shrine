import fs from 'fs'
import path from 'path'
import process from 'process'
import spawn from 'cross-spawn'

import chalk from 'chalk'
import openUrl from 'open'
import inquirer from 'inquirer'

import { clientPackagesInfo } from '@hakushin/utils'
import { getPkgNames } from './utils.js'
import './service.js'

async function writeCacheFile () {
  const apps = await clientPackagesInfo(process.cwd())
  const appsInfo = JSON.stringify(apps, null, 2)
  const cachePath = path.join(process.cwd(), 'node_modules/@hakushin')
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath)
  }
  fs.writeFileSync(path.join(cachePath, 'app.cache.json'), appsInfo, { flag: 'w' })
}

async function start (pkgName) {
  const subprocess = spawn('haku', ['micro', pkgName])

  subprocess.on('spawn', async () => {
    await writeCacheFile()
    const shrineConfig = (await import(`${process.cwd()}/shrine.config.js`)).default

    const microPkg = fs.readFileSync(`packages/${pkgName}/package.json`).toString()
    const { hakushin: { port } } = JSON.parse(microPkg)

    console.log()
    console.log(`  Micro App ${chalk.cyan(pkgName)} started`)
    console.log()
    console.log('  > local:', chalk.cyan(`localhost:${port}`))

    const dirname = path.join(new URL('.', import.meta.url).pathname, '..')
    spawn('pnpm', ['start'], { cwd: dirname, stdio: 'inherit' })

    openUrl(`http://localhost:${shrineConfig.port}`, { wait: true })
  })

  subprocess.on('error', (error) => {
    console.log(error)
  })
}

export default function devConsole (cli) {
  cli
    .command('start [name]', 'desc')
    .action((name) => {
      const pkgNames = getPkgNames(process.cwd())
      if (pkgNames.length === 0) {
        return console.log('dev-console: package 数量为0，请先创建应用')
      }

      if (name) {
        return start(name)
      }
      inquirer.prompt([
        {
          type: 'list',
          name: 'pkgName',
          message: '选择要启动的应用',
          choices: pkgNames,
        },
      ]).then(({ pkgName }) => {
        start(pkgName)
      })
    })
}
