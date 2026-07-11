// Reproduce: login como superadmin -> /admin -> click "Ajustes" -> capturar crash
const { _electron: electron } = require('playwright-core')
const path = require('path')
const os   = require('os')
const fs   = require('fs')

const EMAIL    = process.argv[2]
const PASSWORD = process.argv[3]
const DIR_APP  = 'C:\\Users\\nicol\\Proyectos\\AutomatizacionesAR'
const DIR_SHOTS = path.join(os.tmpdir(), 'cajapro-shots-repro')
const ELECTRON_BIN = path.join(DIR_APP, 'node_modules', 'electron', 'dist', 'electron.exe')

fs.mkdirSync(DIR_SHOTS, { recursive: true })
const shot = (n) => path.join(DIR_SHOTS, `${n}.png`)
const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function clickLink(pagina, texto) {
  await pagina.evaluate((t) => {
    const link = [...document.querySelectorAll('a')].find(a => a.textContent.trim() === t)
    link?.click()
  }, texto)
}

async function main() {
  console.log('Iniciando Electron...')
  const app = await electron.launch({
    executablePath: ELECTRON_BIN,
    args: [DIR_APP],
    env: { ...process.env, NODE_ENV: 'development' },
    timeout: 30_000,
  })

  app.on('close', () => console.log('>>> EVENTO: app (proceso Electron) CERRADO'))
  app.process().on('exit', (code, signal) => console.log(`>>> Proceso Electron principal salió — code=${code} signal=${signal}`))
  app.process().stdout.on('data', d => console.log('[main stdout]', d.toString()))
  app.process().stderr.on('data', d => console.log('[main stderr]', d.toString()))

  await wait(3000)
  let pagina = app.windows().find(p => p.url().includes('localhost')) ?? app.windows()[0]

  pagina.on('console', msg => console.log(`[console:${msg.type()}]`, msg.text()))
  pagina.on('pageerror', err => console.log('[PAGEERROR]', err.message, '\n', err.stack))
  pagina.on('crash', () => console.log('>>> EVENTO: page CRASHED'))
  pagina.on('close', () => console.log('>>> EVENTO: page CERRADA'))

  console.log(`URL inicial: ${pagina.url()}`)
  await pagina.waitForSelector('form', { timeout: 15_000 })
  await pagina.screenshot({ path: shot('01-login') })
  console.log('Shot 01: login')

  console.log(`Iniciando sesion como ${EMAIL}...`)
  await pagina.fill('input[type="text"], input[type="email"]', EMAIL)
  await pagina.fill('input[type="password"]', PASSWORD)
  await pagina.click('button[type="submit"]')
  await wait(3000)
  await pagina.screenshot({ path: shot('02-post-login') })
  console.log(`URL post-login: ${pagina.url()}`)
  console.log('Shot 02: post-login')

  // Click en "Ajustes" del sidebar admin
  console.log('Buscando y clickeando "Ajustes"...')
  await clickLink(pagina, 'Ajustes')
  await wait(3000)

  const ventanasAbiertas = app.windows().length
  console.log(`Ventanas abiertas tras click en Ajustes: ${ventanasAbiertas}`)

  if (ventanasAbiertas > 0 && !pagina.isClosed()) {
    console.log(`URL tras click Ajustes: ${pagina.url()}`)
    await pagina.screenshot({ path: shot('03-ajustes') })
    console.log('Shot 03: ajustes (la app sigue viva)')
  } else {
    console.log('>>> La ventana/pagina se cerro tras entrar a Ajustes')
  }

  await wait(2000)
  try { await app.close() } catch (e) { console.log('app.close() fallo (probablemente ya crasheo):', e.message) }
  console.log(`\nScreenshots en: ${DIR_SHOTS}`)
}

main().catch(err => { console.error('ERROR EN SCRIPT:', err.message, '\n', err.stack) })
