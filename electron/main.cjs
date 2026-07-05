const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
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
    icon:     path.join(__dirname, '..', 'build', 'icon.png'),
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
  const ventana = BrowserWindow.getAllWindows()[0]
  configurarAutoUpdater(ventana)
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

  // Eliminar usuario (tabla usuarios + Supabase Auth)
  ipcMain.handle('admin:eliminar-usuario', async (_e, { id, authUserId }) => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      // 1. Eliminar de la tabla usuarios
      const { error: tablaErr } = await client.from('usuarios').delete().eq('id', id)
      if (tablaErr) return { ok: false, error: tablaErr.message }
      // 2. Eliminar de Auth (si tiene cuenta)
      if (authUserId) {
        const { error: authErr } = await client.auth.admin.deleteUser(authUserId)
        if (authErr) return { ok: false, error: authErr.message }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Eliminar comercio (y todos sus usuarios — tabla + Supabase Auth)
  ipcMain.handle('admin:eliminar-comercio', async (_e, comercioId) => {
    const { ok, client, error } = getAdminMod().getAdminClient()
    if (!ok) return { ok: false, error }
    try {
      // 1. Obtener todos los usuarios del comercio
      const { data: usuarios, error: listErr } = await client
        .from('usuarios')
        .select('id, auth_user_id')
        .eq('comercio_id', comercioId)
      if (listErr) return { ok: false, error: listErr.message }

      // 2. Eliminar cada usuario de Supabase Auth (ignorar errores individuales)
      const authIds = (usuarios ?? []).filter(u => u.auth_user_id).map(u => u.auth_user_id)
      for (const authId of authIds) {
        await client.auth.admin.deleteUser(authId)
      }

      // 3. Eliminar usuarios de la tabla
      if ((usuarios ?? []).length > 0) {
        const { error: usersErr } = await client.from('usuarios').delete().eq('comercio_id', comercioId)
        if (usersErr) return { ok: false, error: usersErr.message }
      }

      // 4. Eliminar el comercio
      const { error: comercioErr } = await client.from('comercios').delete().eq('id', comercioId)
      if (comercioErr) return { ok: false, error: comercioErr.message }

      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // ── Email: confirmación de pago a comercio ────────────────────
  ipcMain.handle('admin:enviar-confirmacion-pago', async (_e, datos) => {
    const gmailUser = process.env.GMAIL_USER
    const gmailPass = process.env.GMAIL_APP_PASSWORD
    if (!gmailUser || !gmailPass) {
      return { ok: false, error: 'GMAIL_USER o GMAIL_APP_PASSWORD no configurados en .env' }
    }
    if (!datos.comercioEmail) {
      return { ok: false, error: 'El comercio no tiene email registrado' }
    }

    const { comercioNombre, comercioEmail, tipo, monto, fechaPago, medioPago, comprobante } = datos
    const montoFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td style="padding-bottom:24px" align="center">
          <span style="font-size:20px;font-weight:700;color:#0f172a">CajaPro</span>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          <div style="height:4px;background:linear-gradient(90deg,#7c3aed,#a855f7)"></div>
          <div style="padding:36px 40px">
            <div style="margin-bottom:24px">
              <span style="display:inline-block;background:#f0fdf4;color:#16a34a;font-size:12px;font-weight:600;padding:6px 14px;border-radius:99px">✓ Pago confirmado</span>
            </div>
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a">Hola, ${comercioNombre}</p>
            <p style="margin:0 0 32px;font-size:15px;color:#64748b">Registramos el siguiente pago en tu cuenta.</p>
            <div style="background:#faf5ff;border:1px solid #ede9fe;border-radius:14px;padding:20px 24px;margin-bottom:28px;text-align:center">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#7c3aed;text-transform:uppercase">${tipo}</p>
              <p style="margin:0;font-size:36px;font-weight:800;color:#6d28d9">${montoFmt}</p>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#94a3b8;width:45%">Fecha de pago</td>
                <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;color:#1e293b;text-align:right">${fechaPago}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;font-size:13px;color:#94a3b8">Medio de pago</td>
                <td style="padding:12px 0;font-size:14px;font-weight:600;color:#1e293b;text-align:right">${medioPago}</td>
              </tr>
              ${comprobante ? `<tr><td style="padding:12px 0;font-size:13px;color:#94a3b8">Comprobante</td><td style="padding:12px 0;font-size:14px;font-weight:600;color:#1e293b;text-align:right">${comprobante}</td></tr>` : ''}
            </table>
          </div>
          <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #f1f5f9">
            <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center">
              Ante cualquier consulta, respondé este email.<br>
              <strong style="color:#64748b">CajaPro</strong> · Sistema de gestión comercial
            </p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    try {
      const nodemailer = require('nodemailer')
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      })
      await transporter.sendMail({
        from:    `"CajaPro" <${gmailUser}>`,
        to:      comercioEmail,
        subject: `✓ Pago registrado — ${tipo} (${montoFmt})`,
        html,
      })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })
}

// ─── Auto-updater ────────────────────────────────────────────────────────────
// Solo activo en builds de producción. En dev no hace nada.
function configurarAutoUpdater(ventana) {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = false   // Preguntar antes de bajar
  autoUpdater.autoInstallOnAppQuit = true

  // Hay una nueva versión disponible
  autoUpdater.on('update-available', (info) => {
    ventana.webContents.send('update:disponible', info)
  })

  // No hay actualizaciones
  autoUpdater.on('update-not-available', () => {
    ventana.webContents.send('update:al-dia')
  })

  // Progreso de descarga
  autoUpdater.on('download-progress', (progress) => {
    ventana.webContents.send('update:progreso', progress)
  })

  // Descarga terminada → instalar al cerrar
  autoUpdater.on('update-downloaded', () => {
    ventana.webContents.send('update:listo')
  })

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater]', err.message)
  })

  // Chequear actualizaciones 5s después de arrancar
  setTimeout(() => autoUpdater.checkForUpdates(), 5000)
}

// IPC: el renderer puede pedir que se instale la actualización
ipcMain.handle('update:instalar', () => {
  autoUpdater.quitAndInstall()
})

// IPC: chequear manualmente
ipcMain.handle('update:chequear', () => {
  if (app.isPackaged) autoUpdater.checkForUpdates()
})

