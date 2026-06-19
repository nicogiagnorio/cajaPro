const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs   = require('fs')

// Evitar múltiples instancias abiertas simultáneamente
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

function crearVentana() {
  const ventana = new BrowserWindow({
    width:    1280,
    height:   800,
    minWidth:  960,
    minHeight: 620,
    title:    'CajaPro',
    autoHideMenuBar: true,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  })

  // Permite abrir ventanas popup (impresión de tickets con window.open)
  ventana.webContents.setWindowOpenHandler(() => ({
    action: 'allow',
    overrideBrowserWindowOptions: {
      width:           420,
      height:          680,
      autoHideMenuBar: true,
      title:           'Ticket',
    },
  }))

  if (!app.isPackaged) {
    ventana.loadURL('http://localhost:5173')
    ventana.webContents.openDevTools({ mode: 'detach' })
  } else {
    Menu.setApplicationMenu(null)
    ventana.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  registrarHandlersArca()
  registrarHandlersPrint()
  registrarHandlersGoogleCal()
  registrarHandlersAdmin()
  crearVentana()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana()
  })
})

// Si el usuario intenta abrir una segunda instancia, enfocar la existente
app.on('second-instance', () => {
  const ventana = BrowserWindow.getAllWindows()[0]
  if (ventana) {
    if (ventana.isMinimized()) ventana.restore()
    ventana.focus()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── Handler IPC para impresión silenciosa ───────────────────────────────────
function registrarHandlersPrint() {
  ipcMain.handle('print:imprimir', async (_e, html) => {
    return new Promise(resolve => {
      const win = new BrowserWindow({
        width:  420,
        height: 600,
        show:   false,   // ventana oculta — no aparece en pantalla
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      })

      win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))

      win.webContents.once('did-finish-load', () => {
        win.webContents.print(
          { silent: true, printBackground: true, deviceName: '' },
          (success, errorType) => {
            win.destroy()
            resolve({ ok: success, error: success ? null : errorType })
          }
        )
      })
    })
  })
}

// ─── Handlers IPC para Google Calendar ───────────────────────────────────────
function registrarHandlersGoogleCal() {
  let gcal = null
  function getGCal() {
    if (!gcal) gcal = require('./googleCalendar.cjs')
    return gcal
  }

  ipcMain.handle('gcal:cargar-config',    async ()        => getGCal().cargarConfig())
  ipcMain.handle('gcal:guardar-config',   async (_e, cfg) => getGCal().guardarConfig(cfg))
  ipcMain.handle('gcal:iniciar-oauth',    async ()        => getGCal().iniciarOAuth())
  ipcMain.handle('gcal:listar-calendarios', async ()      => getGCal().listarCalendarios())
  ipcMain.handle('gcal:crear-evento',     async (_e, ev)  => getGCal().crearEvento(ev))
  ipcMain.handle('gcal:actualizar-evento',async (_e, ev)  => getGCal().actualizarEvento(ev))
  ipcMain.handle('gcal:eliminar-evento',  async (_e, id, calId) => getGCal().eliminarEvento(id, calId))
  ipcMain.handle('gcal:desconectar',      async ()        => getGCal().desconectar())
  ipcMain.handle('gcal:abrir-url',        async (_e, url) => { shell.openExternal(url); return { ok: true } })
}

// ─── Handlers IPC para ARCA ──────────────────────────────────────────────────
function registrarHandlersArca() {
  // Lazy-load del módulo arca para no frenar el arranque de la app
  let arca = null
  function getArca() {
    if (!arca) arca = require('./arca.cjs')
    return arca
  }

  // Cargar configuración guardada
  ipcMain.handle('arca:cargar-config', async () => {
    try {
      return { ok: true, data: getArca().cargarConfig() }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Guardar configuración (cert y key llegan como texto PEM)
  ipcMain.handle('arca:guardar-config', async (_e, config) => {
    try {
      const guardado = getArca().guardarConfig(config)
      return { ok: true, data: guardado }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Eliminar certificados del disco
  ipcMain.handle('arca:eliminar-cert', async () => {
    try {
      getArca().eliminarCertificados()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Abrir diálogo para seleccionar archivo (.pem / .crt / .key)
  ipcMain.handle('arca:seleccionar-archivo', async (_e, tipo) => {
    const extensiones =
      tipo === 'cert'
        ? [{ name: 'Certificado', extensions: ['pem', 'crt', 'cer'] }]
        : [{ name: 'Clave privada', extensions: ['key', 'pem'] }]

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title:       tipo === 'cert' ? 'Seleccionar certificado digital' : 'Seleccionar clave privada',
      filters:     extensiones,
      properties:  ['openFile'],
    })

    if (canceled || filePaths.length === 0) return { ok: false, error: 'Cancelado' }

    try {
      const contenido = fs.readFileSync(filePaths[0], 'utf8')
      return { ok: true, contenido }
    } catch (err) {
      return { ok: false, error: `No se pudo leer el archivo: ${err.message}` }
    }
  })

  // Verificar conexión con ARCA
  ipcMain.handle('arca:verificar-conexion', async () => {
    try {
      const resultado = await getArca().verificarConexion()
      return { ok: true, ...resultado }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Solicitar CAE para una venta
  ipcMain.handle('arca:solicitar-cae', async (_e, datos) => {
    try {
      const resultado = await getArca().solicitarCAE(datos)
      return { ok: true, ...resultado }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Solicitar Nota de Crédito electrónica
  ipcMain.handle('arca:solicitar-nc', async (_e, datos) => {
    try {
      const resultado = await getArca().solicitarNC(datos)
      return { ok: true, ...resultado }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })
}

// ─── Handlers IPC para el módulo Administrador ───────────────────────────────
function registrarHandlersAdmin() {
  let adminMod = null
  function getAdminMod() {
    if (!adminMod) adminMod = require('./supabase-admin.cjs')
    return adminMod
  }

  // Configuración del cliente admin (URL + service role key)
  ipcMain.handle('admin:cargar-config', async () => {
    return { ok: true, data: getAdminMod().cargarAdminConfig() }
  })

  ipcMain.handle('admin:guardar-config', async (_e, config) => {
    const res = getAdminMod().guardarAdminConfig(config)
    if (res.ok) getAdminMod().resetAdminClient()  // forzar recreación del cliente
    return res
  })

  // Estadísticas generales
  ipcMain.handle('admin:estadisticas', async () => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      const [{ count: totalComercios }, { count: totalUsuarios }] = await Promise.all([
        client.from('comercios').select('*', { count: 'exact', head: true }),
        client.from('usuarios').select('*', { count: 'exact', head: true }).neq('rol', 'superadmin'),
      ])
      return { ok: true, totalComercios: totalComercios ?? 0, totalUsuarios: totalUsuarios ?? 0 }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Listar todos los comercios
  ipcMain.handle('admin:listar-comercios', async () => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      const { data, error: err } = await client
        .from('comercios')
        .select('id, nombre, domicilio, telefono, email, cuit, activo, modulos, modulos_permitidos, created_at')
        .order('nombre')
      if (err) return { ok: false, error: err.message }
      return { ok: true, data: data ?? [] }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Crear comercio
  ipcMain.handle('admin:crear-comercio', async (_e, datos) => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      const { data, error: err } = await client
        .from('comercios')
        .insert({ nombre: datos.nombre, domicilio: datos.domicilio || null, cuit: datos.cuit || null, email: datos.email || null, telefono: datos.telefono || null })
        .select('id, nombre')
        .single()
      if (err) return { ok: false, error: err.message }
      return { ok: true, data }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Actualizar datos de un comercio
  ipcMain.handle('admin:actualizar-comercio', async (_e, { id, datos }) => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      const { error: err } = await client
        .from('comercios')
        .update(datos)
        .eq('id', id)
      if (err) return { ok: false, error: err.message }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Toggle activo/inactivo de un comercio
  ipcMain.handle('admin:toggle-activo-comercio', async (_e, { id, activo }) => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      const { error: err } = await client.from('comercios').update({ activo }).eq('id', id)
      if (err) return { ok: false, error: err.message }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Actualizar módulos_permitidos de un comercio
  ipcMain.handle('admin:actualizar-modulos-permitidos', async (_e, { comercioId, modulosPermitidos }) => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      const { error: err } = await client
        .from('comercios')
        .update({ modulos_permitidos: modulosPermitidos })
        .eq('id', comercioId)
      if (err) return { ok: false, error: err.message }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Listar usuarios (todos, excepto superadmin)
  ipcMain.handle('admin:listar-usuarios', async () => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      const { data, error: err } = await client
        .from('usuarios')
        .select('id, nombre, email, rol, activo, comercio_id, auth_user_id, created_at, comercios(nombre)')
        .neq('rol', 'superadmin')
        .order('nombre')
      if (err) return { ok: false, error: err.message }
      return { ok: true, data: data ?? [] }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Listar usuarios de un comercio específico
  ipcMain.handle('admin:listar-usuarios-comercio', async (_e, comercioId) => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      const { data, error: err } = await client
        .from('usuarios')
        .select('id, nombre, email, rol, activo, auth_user_id, created_at')
        .eq('comercio_id', comercioId)
        .neq('rol', 'superadmin')
        .order('nombre')
      if (err) return { ok: false, error: err.message }
      return { ok: true, data: data ?? [] }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Crear usuario en Supabase Auth + perfil en usuarios
  ipcMain.handle('admin:crear-usuario', async (_e, { nombre, email, password, rol, comercioId }) => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      // 1. Crear en Auth
      const { data: authData, error: authErr } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (authErr) return { ok: false, error: authErr.message }

      // 2. Crear perfil en usuarios
      const { data: perfil, error: perfilErr } = await client
        .from('usuarios')
        .insert({ nombre, email, rol, comercio_id: comercioId, auth_user_id: authData.user.id, activo: true })
        .select('id')
        .single()
      if (perfilErr) {
        // rollback: eliminar el usuario auth creado
        await client.auth.admin.deleteUser(authData.user.id)
        return { ok: false, error: perfilErr.message }
      }

      return { ok: true, data: perfil }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Actualizar nombre/rol de un usuario
  ipcMain.handle('admin:actualizar-usuario', async (_e, { id, datos }) => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      const { error: err } = await client.from('usuarios').update(datos).eq('id', id)
      if (err) return { ok: false, error: err.message }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Resetear contraseña de un usuario
  ipcMain.handle('admin:resetear-password', async (_e, { authUserId, nuevaPassword }) => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      const { error: err } = await client.auth.admin.updateUserById(authUserId, { password: nuevaPassword })
      if (err) return { ok: false, error: err.message }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Toggle activo/inactivo de un usuario
  ipcMain.handle('admin:toggle-activo-usuario', async (_e, { id, activo }) => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      const { error: err } = await client.from('usuarios').update({ activo }).eq('id', id)
      if (err) return { ok: false, error: err.message }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })
}
