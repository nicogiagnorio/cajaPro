function ars(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n ?? 0)
}

function fmtFechaHora(iso) {
  const d = iso ? new Date(iso) : new Date()
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d)
}

const METODO_LABEL = {
  efectivo:        'Efectivo',
  tarjeta_debito:  'Débito',
  tarjeta_credito: 'Crédito',
  transferencia:   'Transferencia',
  otro:            'Otro',
}

/**
 * @param {object} opts
 * @param {string}   opts.comercioNombre
 * @param {string}   [opts.comercioDomicilio]
 * @param {string}   [opts.comercioTelefono]
 * @param {string}   [opts.comercioCuit]
 * @param {number}   [opts.numero]
 * @param {string}   [opts.fecha]
 * @param {Array}    [opts.items]
 * @param {string}   [opts.descripcion]
 * @param {number}   opts.subtotal
 * @param {number}   [opts.descuento]
 * @param {number}   opts.total
 * @param {string}   opts.metodoPago
 * @param {number}   [opts.vuelto]
 * @param {string}   [opts.clienteNombre]
 * @param {string}   [opts.cae]
 * @param {string}   [opts.caeVencimiento]
 * @param {number}   [opts.nroFactura]
 * @param {string}   [opts.tipoFactura]
 * @param {number}   [opts.puntoVenta]
 */
export function imprimirTicket(opts) {
  const {
    comercioNombre = 'Mi Comercio',
    comercioDomicilio,
    comercioTelefono,
    comercioCuit,
    numero,
    fecha,
    items = [],
    descripcion,
    subtotal = 0,
    descuento = 0,
    total = 0,
    metodoPago = 'efectivo',
    vuelto = 0,
    clienteNombre,
    cae,
    caeVencimiento,
    nroFactura,
    tipoFactura,
    puntoVenta,
  } = opts

  const tieneFactura = !!cae

  const lineasHeader = [
    comercioDomicilio && `<p>${comercioDomicilio}</p>`,
    comercioTelefono  && `<p>Tel: ${comercioTelefono}</p>`,
    comercioCuit      && `<p>CUIT: ${comercioCuit}</p>`,
  ].filter(Boolean).join('')

  const lineasItems = items.length > 0
    ? items.map(i => `
        <tr>
          <td class="nombre">${i.nombre}</td>
          <td class="cant">${i.cantidad}</td>
          <td class="precio">${ars(i.precio_unitario)}</td>
          <td class="total">${ars(i.subtotal)}</td>
        </tr>`).join('')
    : descripcion
      ? `<tr><td class="nombre" colspan="3">${descripcion}</td><td class="total">${ars(total)}</td></tr>`
      : ''

  const bloqueFactura = tieneFactura ? `
<div class="hr"></div>
<div class="factura-box">
  <p class="factura-title">FACTURA ELECTRONICA TIPO ${tipoFactura}</p>
  <p>PV: ${String(puntoVenta).padStart(5, '0')} &nbsp;&nbsp; N°: ${String(nroFactura).padStart(8, '0')}</p>
  <p class="cae-label">CAE:</p>
  <p class="cae-num">${cae}</p>
  <p>Vence: ${caeVencimiento}</p>
</div>` : ''

  const metaDiv = lineasHeader ? `<div class="meta">${lineasHeader}</div>` : ''

  const numeroSpan = numero
    ? `<span class="bold">${tieneFactura ? 'Factura ' + tipoFactura : 'Ticket'} #${numero}</span><br>`
    : ''

  const itemsSection = (items.length > 0 || descripcion) ? `
<table>
  <thead>
    <tr>
      <th class="nombre">Artículo</th>
      <th class="cant">Cant</th>
      <th class="precio">P.Unit</th>
      <th class="total">Total</th>
    </tr>
  </thead>
  <tbody>
    ${lineasItems}
  </tbody>
</table>
<div class="hr"></div>` : ''

  const descuentoRows = descuento > 0 ? `
  <tr>
    <td>Subtotal</td>
    <td>${ars(subtotal)}</td>
  </tr>
  <tr>
    <td>Descuento</td>
    <td>- ${ars(descuento)}</td>
  </tr>` : ''

  const vueltoLine = (metodoPago === 'efectivo' && vuelto > 0)
    ? `<p>Vuelto: <strong>${ars(vuelto)}</strong></p>`
    : ''

  const clienteLine = clienteNombre ? `<br>Cliente: ${clienteNombre}` : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${tieneFactura ? 'Factura ' + tipoFactura : 'Ticket'}${numero ? ' #' + numero : ''}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    width: 72mm;
    padding: 4mm 2mm;
    color: #000;
  }
  .center  { text-align: center; }
  .right   { text-align: right; }
  .bold    { font-weight: bold; }
  .hr      { border-top: 1px dashed #000; margin: 4px 0; }
  .comercio-nombre {
    font-size: 15px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 2px;
  }
  .meta { text-align: center; font-size: 10px; color: #333; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 4px 0;
    font-size: 10.5px;
  }
  th {
    border-bottom: 1px solid #000;
    padding: 2px 1px;
    text-align: left;
    font-size: 10px;
  }
  td { padding: 2px 1px; vertical-align: top; }
  td.nombre { width: 50%; }
  td.cant, th.cant { width: 10%; text-align: center; }
  td.precio, th.precio { width: 20%; text-align: right; }
  td.total, th.total { width: 20%; text-align: right; }
  .totales { width: 100%; margin: 2px 0; font-size: 11px; }
  .totales td:first-child { width: 60%; }
  .totales td:last-child { text-align: right; font-weight: bold; }
  .total-final td { font-size: 14px; border-top: 1px solid #000; padding-top: 3px; }
  .footer { text-align: center; margin-top: 6px; font-size: 10px; }
  .factura-box {
    text-align: center;
    margin: 4px 0;
    font-size: 10px;
    line-height: 1.5;
  }
  .factura-title {
    font-weight: bold;
    font-size: 11px;
    border: 1px solid #000;
    padding: 2px 4px;
    display: inline-block;
    margin-bottom: 4px;
  }
  .cae-label { font-size: 9px; color: #555; margin-top: 3px; }
  .cae-num   { font-weight: bold; font-size: 11px; letter-spacing: 0.5px; }
  @media print {
    body { width: 72mm; }
    @page { margin: 0; size: 80mm auto; }
  }
</style>
</head>
<body>

<p class="comercio-nombre">${comercioNombre}</p>
${metaDiv}

<div class="hr"></div>

<p class="center">
  ${numeroSpan}
  ${fmtFechaHora(fecha)}
  ${clienteLine}
</p>

<div class="hr"></div>

${itemsSection}

<table class="totales">
  ${descuentoRows}
  <tr class="total-final">
    <td class="bold">TOTAL</td>
    <td>${ars(total)}</td>
  </tr>
</table>

<div class="hr"></div>

<p>Forma de pago: <strong>${METODO_LABEL[metodoPago] ?? metodoPago}</strong></p>
${vueltoLine}

${bloqueFactura}

<div class="hr"></div>

<p class="footer">Gracias por su compra!</p>
<br><br>

</body>
</html>`

  if (typeof window !== 'undefined' && window.electronPrint) {
    window.electronPrint.imprimir(html)
    return
  }

  const win = window.open('', '_blank', 'width=340,height=600,menubar=no,toolbar=no,location=no')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.onload = () => {
    win.focus()
    win.print()
    win.close()
  }
}
