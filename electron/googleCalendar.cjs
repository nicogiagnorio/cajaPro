/**
 * googleCalendar.cjs — Integración Google Calendar para CajaPro
 *
 * Flujo OAuth2:
 *   1. El usuario ingresa Client ID + Secret en la sección Turnos > Configuración
 *   2. iniciarOAuth() abre el navegador con la URL de autorización
 *      y levanta un servidor HTTP local temporal para capturar el code
 *   3. Se intercambia el code por access_token + refresh_token
 *   4. Los tokens se guardan en userData (cifrado mínimo: no se envían a la red)
 *
 * Prerequisito (usuario lo hace 1 vez en Google Cloud Console):
 *   1. Crear proyecto → Habilitar "Google Calendar API"
 *   2. Crear credenciales OAuth2 (Aplicación de escritorio)
 *   3. Copiar Client ID y Client Secret a la configuración de CajaPro
 */

'use strict'

const { app, shell } = require('electron')
const path   = require('path')
const fs     = require('fs')
const http   = require('http')
const https  = require('https')
const { URL } = require('url')

// ─── Rutas ────────────────────────────────────────────────────────────────────
function rutaConfig() {
  return path.join(app.getPath('userData'), 'gcal-config.json')
}

// ─── Config persistida ────────────────────────────────────────────────────────
function cargarConfig() {
  try {
    const ruta = rutaConfig()
    if (!fs.existsSync(ruta)) return { ok: true, data: null }
    return { ok: true, data: JSON.parse(fs.readFileSync(ruta, 'utf8')) }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

function guardarConfig(cfg) {
  try {
    const existente = cargarConfig().data ?? {}
    const nueva = { ...existente, ...cfg }
    fs.writeFileSync(rutaConfig(), JSON.stringify(nueva, null, 2), 'utf8')
    return { ok: true, data: nueva }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

function desconectar() {
  try {
    const cfg = cargarConfig().data ?? {}
    delete cfg.access_token
    delete cfg.refresh_token
    delete cfg.token_expiry
    delete cfg.calendar_id
    fs.writeFileSync(rutaConfig(), JSON.stringify(cfg, null, 2), 'utf8')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── OAuth2 helpers ───────────────────────────────────────────────────────────
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

const REDIRECT_PORT = 42813
const REDIRECT_URI  = `http://localhost:${REDIRECT_PORT}/oauth2callback`

/**
 * Inicia el flujo OAuth2:
 * 1. Levanta servidor HTTP local temporal en REDIRECT_PORT
 * 2. Abre el navegador con la URL de autorización de Google
 * 3. Espera el redirect con el code (timeout 5 min)
 * 4. Intercambia el code por tokens
 * 5. Guarda tokens
 */
function iniciarOAuth() {
  return new Promise((resolve) => {
    const cfg = cargarConfig().data
    if (!cfg?.client_id || !cfg?.client_secret) {
      return resolve({ ok: false, error: 'Configurá Client ID y Client Secret primero.' })
    }

    const params = new URLSearchParams({
      client_id:     cfg.client_id,
      redirect_uri:  REDIRECT_URI,
      response_type: 'code',
      scope:         SCOPES,
      access_type:   'offline',
      prompt:        'consent',
    })
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

    let server = null
    const timeout = setTimeout(() => {
      server?.close()
      resolve({ ok: false, error: 'Tiempo de espera agotado. Intentá de nuevo.' })
    }, 5 * 60 * 1000) // 5 minutos

    server = http.createServer(async (req, res) => {
      try {
        const url   = new URL(req.url, `http://localhost:${REDIRECT_PORT}`)
        const code  = url.searchParams.get('code')
        const error = url.searchParams.get('error')

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        if (error) {
          res.end(`<html><body><h2>Error: ${error}</h2><p>Podés cerrar esta pestaña.</p></body></html>`)
          clearTimeout(timeout)
          server.close()
          return resolve({ ok: false, error })
        }

        res.end(`<html><body>
          <h2 style="font-family:sans-serif;color:#16a34a">✓ ¡Conectado!</h2>
          <p style="font-family:sans-serif">Google Calendar vinculado con CajaPro. Podés cerrar esta pestaña.</p>
        </body></html>`)

        clearTimeout(timeout)
        server.close()

        // Intercambiar code por tokens
        const tokenRes = await exchangeCode(cfg.client_id, cfg.client_secret, code, REDIRECT_URI)
        if (!tokenRes.ok) return resolve(tokenRes)

        // Guardar tokens
        guardarConfig({
          access_token:  tokenRes.access_token,
          refresh_token: tokenRes.refresh_token,
          token_expiry:  Date.now() + tokenRes.expires_in * 1000,
          conectado:     true,
        })

        resolve({ ok: true, mensaje: 'Google Calendar conectado correctamente.' })
      } catch (err) {
        clearTimeout(timeout)
        server?.close()
        resolve({ ok: false, error: err.message })
      }
    })

    server.listen(REDIRECT_PORT, '127.0.0.1', () => {
      shell.openExternal(authUrl)
    })

    server.on('error', (err) => {
      clearTimeout(timeout)
      resolve({ ok: false, error: `Puerto ${REDIRECT_PORT} ocupado: ${err.message}` })
    })
  })
}

function exchangeCode(clientId, clientSecret, code, redirectUri) {
  return new Promise((resolve) => {
    const body = new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }).toString()

    const options = {
      hostname: 'oauth2.googleapis.com',
      path:     '/token',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) return resolve({ ok: false, error: json.error_description ?? json.error })
          resolve({ ok: true, ...json })
        } catch (err) {
          resolve({ ok: false, error: 'Respuesta inválida de Google' })
        }
      })
    })
    req.on('error', err => resolve({ ok: false, error: err.message }))
    req.write(body)
    req.end()
  })
}

async function refreshAccessToken() {
  const cfg = cargarConfig().data
  if (!cfg?.refresh_token) throw new Error('No hay refresh token. Reconectá Google Calendar.')

  const body = new URLSearchParams({
    refresh_token: cfg.refresh_token,
    client_id:     cfg.client_id,
    client_secret: cfg.client_secret,
    grant_type:    'refresh_token',
  }).toString()

  const data = await httpsPost('oauth2.googleapis.com', '/token', body)
  if (data.error) throw new Error(data.error_description ?? data.error)

  guardarConfig({
    access_token: data.access_token,
    token_expiry: Date.now() + data.expires_in * 1000,
  })
  return data.access_token
}

async function getToken() {
  const cfg = cargarConfig().data
  if (!cfg?.access_token) throw new Error('Google Calendar no conectado.')

  // Refrescar si quedan menos de 5 minutos
  if (cfg.token_expiry && cfg.token_expiry - Date.now() < 5 * 60 * 1000) {
    return await refreshAccessToken()
  }
  return cfg.access_token
}

// ─── API Calendar (HTTP manual, sin googleapis package) ──────────────────────
function httpsPost(hostname, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname, path, method: 'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        ...headers,
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve(data) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function httpsRequest(method, hostname, path, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : ''
    const options = {
      hostname, method, path,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

async function apiGet(path) {
  const token = await getToken()
  const res = await httpsRequest('GET', 'www.googleapis.com', path, null, token)
  if (res.status >= 400) throw new Error(res.body?.error?.message ?? `Error ${res.status}`)
  return res.body
}

async function apiPost(path, body) {
  const token = await getToken()
  const res = await httpsRequest('POST', 'www.googleapis.com', path, body, token)
  if (res.status >= 400) throw new Error(res.body?.error?.message ?? `Error ${res.status}`)
  return res.body
}

async function apiPatch(path, body) {
  const token = await getToken()
  const res = await httpsRequest('PATCH', 'www.googleapis.com', path, body, token)
  if (res.status >= 400) throw new Error(res.body?.error?.message ?? `Error ${res.status}`)
  return res.body
}

async function apiDelete(path) {
  const token = await getToken()
  const res = await httpsRequest('DELETE', 'www.googleapis.com', path, null, token)
  if (res.status >= 400 && res.status !== 404 && res.status !== 410)
    throw new Error(res.body?.error?.message ?? `Error ${res.status}`)
  return { ok: true }
}

// ─── Calendarios ──────────────────────────────────────────────────────────────
async function listarCalendarios() {
  try {
    const data = await apiGet('/calendar/v3/users/me/calendarList')
    const items = (data.items ?? []).map(c => ({
      id:          c.id,
      nombre:      c.summary,
      descripcion: c.description,
      color:       c.backgroundColor,
      principal:   c.primary ?? false,
    }))
    return { ok: true, data: items }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Eventos (Turnos) ─────────────────────────────────────────────────────────
/**
 * Crea un evento en Google Calendar para un turno confirmado.
 * @param {{ calendarId, titulo, descripcion, fecha, horaInicio, horaFin, color }} ev
 */
async function crearEvento({ calendarId, titulo, descripcion, fecha, horaInicio, horaFin, color }) {
  try {
    const cal = calendarId ?? (cargarConfig().data?.calendar_id ?? 'primary')
    const evento = {
      summary:     titulo,
      description: descripcion ?? '',
      start: { dateTime: `${fecha}T${horaInicio}:00`, timeZone: 'America/Argentina/Buenos_Aires' },
      end:   { dateTime: `${fecha}T${horaFin}:00`,   timeZone: 'America/Argentina/Buenos_Aires' },
      colorId: googleColorId(color),
    }
    const resultado = await apiPost(`/calendar/v3/calendars/${encodeURIComponent(cal)}/events`, evento)
    return { ok: true, eventId: resultado.id }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function actualizarEvento({ calendarId, eventId, titulo, descripcion, fecha, horaInicio, horaFin }) {
  try {
    const cal = calendarId ?? (cargarConfig().data?.calendar_id ?? 'primary')
    const evento = {
      summary:     titulo,
      description: descripcion ?? '',
      start: { dateTime: `${fecha}T${horaInicio}:00`, timeZone: 'America/Argentina/Buenos_Aires' },
      end:   { dateTime: `${fecha}T${horaFin}:00`,   timeZone: 'America/Argentina/Buenos_Aires' },
    }
    await apiPatch(`/calendar/v3/calendars/${encodeURIComponent(cal)}/events/${eventId}`, evento)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function eliminarEvento(eventId, calendarId) {
  try {
    const cal = calendarId ?? (cargarConfig().data?.calendar_id ?? 'primary')
    await apiDelete(`/calendar/v3/calendars/${encodeURIComponent(cal)}/events/${eventId}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// Mapea colores hex a colorId de Google Calendar (aproximado)
function googleColorId(color) {
  const map = {
    '#3B82F6': '9',  // Blueberry
    '#10B981': '2',  // Sage
    '#F59E0B': '5',  // Banana
    '#EF4444': '11', // Tomato
    '#8B5CF6': '3',  // Grape
    '#F97316': '6',  // Tangerine
    '#06B6D4': '7',  // Peacock
  }
  return map[color] ?? '9'
}

module.exports = {
  cargarConfig,
  guardarConfig,
  desconectar,
  iniciarOAuth,
  listarCalendarios,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
}
