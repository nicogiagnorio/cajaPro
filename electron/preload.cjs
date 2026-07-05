const { contextBridge, ipcRenderer } = require('electron')
const { version } = require('../package.json')

// Información básica de la app
contextBridge.exposeInMainWorld('appInfo', {
  version,
  plataforma: process.platform,
})

// Impresión silenciosa (sin diálogo del sistema)
contextBridge.exposeInMainWorld('electronPrint', {
  /** Imprime HTML directamente en la impresora por defecto (sin diálogo) */
  imprimir: (html) => ipcRenderer.invoke('print:imprimir', html),
})

// Google Calendar
contextBridge.exposeInMainWorld('googleCal', {
  cargarConfig:       ()         => ipcRenderer.invoke('gcal:cargar-config'),
  guardarConfig:      (cfg)      => ipcRenderer.invoke('gcal:guardar-config', cfg),
  iniciarOAuth:       ()         => ipcRenderer.invoke('gcal:iniciar-oauth'),
  listarCalendarios:  ()         => ipcRenderer.invoke('gcal:listar-calendarios'),
  crearEvento:        (ev)       => ipcRenderer.invoke('gcal:crear-evento', ev),
  actualizarEvento:   (ev)       => ipcRenderer.invoke('gcal:actualizar-evento', ev),
  eliminarEvento:     (id, calId)=> ipcRenderer.invoke('gcal:eliminar-evento', id, calId),
  desconectar:        ()         => ipcRenderer.invoke('gcal:desconectar'),
  abrirUrl:           (url)      => ipcRenderer.invoke('gcal:abrir-url', url),
})

// API Admin — accesible desde React como window.adminAPI
contextBridge.exposeInMainWorld('adminAPI', {
  cargarConfig:              ()                          => ipcRenderer.invoke('admin:cargar-config'),
  guardarConfig:             (config)                   => ipcRenderer.invoke('admin:guardar-config', config),
  estadisticas:              ()                         => ipcRenderer.invoke('admin:estadisticas'),
  listarComercios:           ()                         => ipcRenderer.invoke('admin:listar-comercios'),
  crearComercio:             (datos)                    => ipcRenderer.invoke('admin:crear-comercio', datos),
  actualizarComercio:        (id, datos)                => ipcRenderer.invoke('admin:actualizar-comercio', { id, datos }),
  toggleActivoComercio:      (id, activo)               => ipcRenderer.invoke('admin:toggle-activo-comercio', { id, activo }),
  actualizarModulosPermitidos:(comercioId, modulos)     => ipcRenderer.invoke('admin:actualizar-modulos-permitidos', { comercioId, modulosPermitidos: modulos }),
  listarUsuarios:            ()                         => ipcRenderer.invoke('admin:listar-usuarios'),
  listarUsuariosComercio:    (comercioId)               => ipcRenderer.invoke('admin:listar-usuarios-comercio', comercioId),
  crearUsuario:              (datos)                    => ipcRenderer.invoke('admin:crear-usuario', datos),
  actualizarUsuario:         (id, datos)                => ipcRenderer.invoke('admin:actualizar-usuario', { id, datos }),
  resetearPassword:          (authUserId, nuevaPassword)=> ipcRenderer.invoke('admin:resetear-password', { authUserId, nuevaPassword }),
  toggleActivoUsuario:       (id, activo)               => ipcRenderer.invoke('admin:toggle-activo-usuario', { id, activo }),
  eliminarUsuario:           (id, authUserId)            => ipcRenderer.invoke('admin:eliminar-usuario', { id, authUserId }),
  eliminarComercio:          (comercioId)                => ipcRenderer.invoke('admin:eliminar-comercio', comercioId),
})

// Email / notificaciones — window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  enviarEmailPago: (datos) => ipcRenderer.invoke('admin:enviar-confirmacion-pago', datos),
})

// API ARCA — accesible desde React como window.arca
contextBridge.exposeInMainWorld('arca', {
  /** Carga la configuración guardada en disco */
  cargarConfig: () =>
    ipcRenderer.invoke('arca:cargar-config'),

  /** Guarda la configuración (incluye cert y key como texto PEM) */
  guardarConfig: (config) =>
    ipcRenderer.invoke('arca:guardar-config', config),

  /** Elimina cert y key del disco */
  eliminarCert: () =>
    ipcRenderer.invoke('arca:eliminar-cert'),

  /** Abre un diálogo para seleccionar un archivo y devuelve su contenido */
  seleccionarArchivo: (tipo) =>
    ipcRenderer.invoke('arca:seleccionar-archivo', tipo),

  /** Verifica la conexión con ARCA (token WSAA + ping WSFE) */
  verificarConexion: () =>
    ipcRenderer.invoke('arca:verificar-conexion'),

  /** Solicita un CAE para una venta
   * @param {{ ventaId, total, docTipo?, docNro?, concepto? }} datos
   */
  solicitarCAE: (datos) =>
    ipcRenderer.invoke('arca:solicitar-cae', datos),

  /** Solicita una Nota de Crédito electrónica referenciando la factura original
   * @param {{ facturaOriginal: { tipo_factura, nro_factura, punto_venta }, total }} datos
   */
  solicitarNC: (datos) =>
    ipcRenderer.invoke('arca:solicitar-nc', datos),
})

// ─── Auto-updater ─────────────────────────────────────────────────────────────
contextBridge.exposeInMainWorld('updaterAPI', {
  /** Chequear actualizaciones manualmente */
  chequear: () => ipcRenderer.invoke('update:chequear'),

  /** Instalar la actualización descargada y reiniciar */
  instalar: () => ipcRenderer.invoke('update:instalar'),

  /** Escuchar eventos del proceso principal */
  onDisponible:  (fn) => ipcRenderer.on('update:disponible',  (_e, info)     => fn(info)),
  onAlDia:       (fn) => ipcRenderer.on('update:al-dia',      ()             => fn()),
  onProgreso:    (fn) => ipcRenderer.on('update:progreso',    (_e, progress) => fn(progress)),
  onListo:       (fn) => ipcRenderer.on('update:listo',       ()             => fn()),
})
