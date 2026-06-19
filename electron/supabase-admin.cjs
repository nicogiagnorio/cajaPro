'use strict'

/**
 * supabase-admin.cjs
 * Cliente Supabase con service role key para operaciones de administrador.
 * El service role key bypassea RLS — solo usarlo en el proceso principal de Electron,
 * nunca exponerlo al renderer.
 *
 * Configuración: Supabase Dashboard → Settings → API → service_role key
 */

const { app }  = require('electron')
const path     = require('path')
const fs       = require('fs')

const CONFIG_PATH = () => path.join(app.getPath('userData'), 'admin-supabase-config.json')

// ─── Persistencia ─────────────────────────────────────────────────────────────
function cargarAdminConfig() {
  try {
    const ruta = CONFIG_PATH()
    if (!fs.existsSync(ruta)) return null
    return JSON.parse(fs.readFileSync(ruta, 'utf8'))
  } catch {
    return null
  }
}

function guardarAdminConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH(), JSON.stringify(config, null, 2), 'utf8')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Cliente admin (lazy, se crea la primera vez que se necesita) ─────────────
let _adminClient = null

function getAdminClient() {
  if (_adminClient) return { ok: true, client: _adminClient }

  const config = cargarAdminConfig()
  if (!config?.supabaseUrl || !config?.serviceRoleKey) {
    return { ok: false, error: 'El cliente admin no está configurado. Ingresá las credenciales en Ajustes → Admin.' }
  }

  try {
    const { createClient } = require('@supabase/supabase-js')
    const ws = require('ws')
    _adminClient = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth:     { autoRefreshToken: false, persistSession: false },
      realtime: { transport: ws },
    })
    return { ok: true, client: _adminClient }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

function resetAdminClient() {
  _adminClient = null
}

module.exports = { cargarAdminConfig, guardarAdminConfig, getAdminClient, resetAdminClient }
