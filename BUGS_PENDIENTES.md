# CajaPro — Audit de código (2026-06-18)

Resultado del audit técnico completo del codebase. Bugs ordenados por severidad.

---

## 🔴 CRÍTICOS — ninguno encontrado

El bug previamente sospechado en `NuevaVenta.jsx` (stock no decrementado) **NO es real**: la migración `migracion_ventas.sql` define el trigger `trg_stock_salida_venta` que corre `AFTER INSERT ON ventas_items` y actualiza `productos.stock_actual` a nivel DB. Correcto.

`VentaRapida.jsx` no toca stock de forma intencional — muestra el badge "Sin afectar stock" al usuario.

---

## 🟡 IMPORTANTES — corregidos en este audit

### 1. `HistorialGastos.jsx` — delete silencioso
**Problema:** `eliminarGasto()` ignora el resultado del `.delete()`. Si Supabase falla (RLS, red, etc.), la UI elimina el item optimistamente y el usuario nunca se entera. Al recargar, el gasto reaparece.
**Fix aplicado:** desestructurar `{ error }` del delete y mostrar `alert()` si falla; revertir el estado local.

### 2. `CalendarioSemanal.jsx` — cambio de estado silencioso
**Problema:** `cambiarEstado()` llama a `supabase.from('turnos').update(...)` sin capturar errores. Si la actualización falla, el calendario hace `cargar()` mostrando el estado anterior sin feedback al usuario.
**Fix aplicado:** capturar error del update principal y mostrar alerta antes de continuar.

### 3. `clientes/index.jsx` — toggleActivo silencioso
**Problema:** `toggleActivo()` actualiza el estado local optimistamente sin verificar si el `.update()` en Supabase tuvo éxito.
**Fix aplicado:** capturar error y revertir el toggle local si falla.

### 4. `HistorialVentas.jsx` — `err.message` en lugar de `traducirError`
**Problema:** En la función de importación masiva de ventas (línea ~492), un error de Supabase se muestra como `err.message` (en inglés, técnico) en lugar de pasar por `traducirError()`.
**Fix aplicado:** reemplazar `err.message` por `traducirError(err)`.

---

## ⚪ MENORES / MEJORAS FUTURAS — sin corregir (no afectan funcionalidad)

### 5. `validarPrecio` / `validarStock` subutilizados
`Productos.jsx` es el único módulo que usa los helpers de `validaciones.js`. Módulos como `CompraDetallada`, `NuevoGasto`, etc. validan precios y cantidades inline via reglas de react-hook-form (funcional, pero inconsistente). Candidato para normalizar en una iteración futura.

### 6. `CalendarioSemanal.jsx` — sin `traducirError` importado
Las operaciones de Google Calendar dentro de `cambiarEstado` no tienen error UI (son integración opcional, por lo que el impacto es bajo).

### 7. `Configuracion/index.jsx` — error de imagen raw
En la subida de logo/foto, `setError(res.error)` muestra el string crudo del resultado del helper de storage. No es un error de Supabase sino un string personalizado, por lo que no aplica `traducirError` pero podría refinarse.

---

## Módulos auditados — estado

| Módulo | Error handling | traducirError | Validaciones | Stock/triggers |
|---|---|---|---|---|
| Auth / Login | ✅ | ✅ | ✅ | — |
| Registro | ✅ | ✅ | ✅ | — |
| Inventario / Productos | ✅ | ✅ | ✅ | — |
| Inventario / Categorías | ✅ | ✅ | — | — |
| Inventario / Proveedores | ✅ | ✅ | — | — |
| Ventas / NuevaVenta | ✅ | ✅ | parcial | ✅ DB trigger |
| Ventas / VentaRapida | ✅ | ✅ | ✅ | intencional |
| Ventas / HistorialVentas | 🟡 fix | ✅ | — | — |
| Compras / CompraDetallada | ✅ | ✅ | ✅ | ✅ |
| Compras / CompraRapida | ✅ | ✅ | ✅ | — |
| Compras / HistorialCompras | ✅ | ✅ | — | ✅ |
| Gastos / NuevoGasto | ✅ | ✅ | — | — |
| Gastos / HistorialGastos | 🟡 fix | — | — | — |
| Gastos / CategoriasGastos | ✅ | ✅ | — | — |
| Caja | ✅ | ✅ | — | — |
| Clientes | 🟡 fix | ✅ | — | — |
| Reportes | ✅ | ✅ | — | — |
| Configuración | ⚪ parcial | — | — | — |
| Turnos / NuevoTurno | ✅ | ✅ | — | — |
| Turnos / CalendarioSemanal | 🟡 fix | — | — | — |
| Turnos / Profesionales | ✅ | ✅ | — | — |
| Admin / Cobros | ✅ | ✅ | — | — |
| Admin / GastosPropios | ✅ | ✅ | — | — |
| Admin / Finanzas | ✅ | — | — | — |
| GestionUsuarios | ✅ | ✅ | — | — |

---

*Generado automáticamente el 2026-06-18*
