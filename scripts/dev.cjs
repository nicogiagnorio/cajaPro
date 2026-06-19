// Arranca Vite y luego Electron de forma cross-platform (sin depender de && del shell)
const { spawn } = require('child_process')
const http = require('http')

const VITE_URL  = 'http://localhost:5173'
const MAX_ESPERA = 30_000
const INTERVALO  = 500

function iniciarProceso(cmd, args) {
  return spawn(cmd, args, { shell: true, stdio: 'inherit', cwd: process.cwd() })
}

function esperarVite(resolve, reject, inicio) {
  http.get(VITE_URL, () => resolve()).on('error', () => {
    if (Date.now() - inicio > MAX_ESPERA) {
      reject(new Error('Timeout: Vite no respondió en 30 segundos'))
    } else {
      setTimeout(() => esperarVite(resolve, reject, inicio), INTERVALO)
    }
  })
}

const vite = iniciarProceso('npx', ['vite'])

vite.on('error', (err) => {
  console.error('Error iniciando Vite:', err.message)
  process.exit(1)
})

console.log('⏳ Esperando que Vite esté listo...')

new Promise((resolve, reject) =>
  setTimeout(() => esperarVite(resolve, reject, Date.now()), 1000)
)
  .then(() => {
    console.log('✓ Vite listo — iniciando Electron')
    const electron = iniciarProceso('npx', ['electron', '.'])
    electron.on('close', () => {
      vite.kill()
      process.exit(0)
    })
  })
  .catch((err) => {
    console.error(err.message)
    vite.kill()
    process.exit(1)
  })
