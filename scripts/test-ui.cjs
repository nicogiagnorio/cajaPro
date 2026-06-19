// Driver de testing para CajaPro
// Uso: node scripts/test-ui.cjs <email> <password>
const { _electron: electron } = require('playwright-core')
const path = require('path')
const os   = require('os')
const fs   = require('fs')

const [,, EMAIL, PASSWORD] = process.argv
const DIR_APP   = path.join(__dirname, '..')
const DIR_SHOTS = path.join(os.tmpdir(), 'cajapro-shots')
const ELECTRON_BIN = path.join(DIR_APP, 'node_modules', 'electron', 'dist',
  process.platform === 'win32' ? 'electron.exe' : 'electron')

fs.mkdirSync(DIR_SHOTS, { recursive: true })

const shot = (n) => path.join(DIR_SHOTS, `${n}.png`)
const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function clickLink(pagina, texto) {
  await pagina.evaluate((t) => {
    const link = [...document.querySelectorAll('a')].find(a => a.textContent.trim() === t)
    link?.click()
  }, texto)
}

async function clickButton(pagina, texto) {
  await pagina.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes(t))
    btn?.click()
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

  await wait(4000)
  const paginas = app.windows()
  const pagina = paginas.find(p => p.url().includes('localhost') || p.url().includes('index.html'))
    ?? paginas[0]

  console.log(`URL inicial: ${pagina.url()}`)

  await pagina.waitForSelector('form', { timeout: 15_000 })
  await pagina.screenshot({ path: shot('01-login'), fullPage: true })
  console.log('Shot 01: login')

  if (!EMAIL || !PASSWORD) {
    console.log('\nNo se pasaron credenciales. Solo se capturó el login.')
    console.log('Uso: node scripts/test-ui.cjs <email> <password>')
    await app.close()
    return
  }

  // ── Login ────────────────────────────────────────────────
  console.log(`Iniciando sesión como ${EMAIL}...`)
  await pagina.fill('input[type="email"]', EMAIL)
  await pagina.fill('input[type="password"]', PASSWORD)
  await pagina.click('button[type="submit"]')
  await pagina.waitForURL('**/app/dashboard**', { timeout: 15_000 }).catch(() => {})
  await wait(1500)
  await pagina.screenshot({ path: shot('02-dashboard'), fullPage: true })
  console.log('Shot 02: dashboard')

  // ── Inventario ───────────────────────────────────────────
  await clickLink(pagina, 'Inventario')
  await wait(1200)
  await pagina.screenshot({ path: shot('03-productos'), fullPage: true })
  console.log('Shot 03: inventario - productos')

  await clickLink(pagina, 'Categorías')
  await wait(800)
  await pagina.screenshot({ path: shot('04-categorias'), fullPage: true })
  console.log('Shot 04: inventario - categorías')

  await clickLink(pagina, 'Proveedores')
  await wait(800)
  await pagina.screenshot({ path: shot('05-proveedores'), fullPage: true })
  console.log('Shot 05: inventario - proveedores')

  // ── Modal nuevo producto ─────────────────────────────────
  await clickLink(pagina, 'Productos')
  await wait(600)
  await clickButton(pagina, 'Nuevo producto')
  await wait(600)
  await pagina.screenshot({ path: shot('06-modal-producto'), fullPage: true })
  console.log('Shot 06: modal nuevo producto')
  await pagina.keyboard.press('Escape')
  await wait(400)

  // ── Punto de Venta: Venta Detallada ─────────────────────
  await clickLink(pagina, 'Punto de Venta')
  await wait(1200)
  await pagina.screenshot({ path: shot('07-venta-detallada'), fullPage: true })
  console.log('Shot 07: venta detallada')

  // ── Punto de Venta: Venta Rápida ────────────────────────
  await clickLink(pagina, 'Venta Rápida')
  await wait(800)
  await pagina.screenshot({ path: shot('08-venta-rapida'), fullPage: true })
  console.log('Shot 08: venta rápida')

  // ── Punto de Venta: Historial ───────────────────────────
  await clickLink(pagina, 'Historial')
  await wait(1000)
  await pagina.screenshot({ path: shot('09-historial-ventas'), fullPage: true })
  console.log('Shot 09: historial ventas')

  // ── Compras: Compra Detallada ───────────────────────────
  await clickLink(pagina, 'Compras')
  await wait(1200)
  await pagina.screenshot({ path: shot('10-compra-detallada'), fullPage: true })
  console.log('Shot 10: compra detallada')

  // ── Compras: Compra Rápida ──────────────────────────────
  await clickLink(pagina, 'Compra Rápida')
  await wait(800)
  await pagina.screenshot({ path: shot('11-compra-rapida'), fullPage: true })
  console.log('Shot 11: compra rápida')

  // ── Compras: Historial ──────────────────────────────────
  await clickLink(pagina, 'Historial')
  await wait(1000)
  await pagina.screenshot({ path: shot('12-historial-compras'), fullPage: true })
  console.log('Shot 12: historial compras')

  await app.close()
  console.log(`\n✅ Screenshots guardados en: ${DIR_SHOTS}`)
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1) })
