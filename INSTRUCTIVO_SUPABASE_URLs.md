# Instructivo — Configuración de URLs en Supabase + GitHub Pages

## PASO 1 — Subir confirm.html a GitHub Pages

### 1.1 Habilitar GitHub Pages en el repo

1. Ir a: **github.com/nicogiagnorio/cajaPro → Settings → Pages**
2. En **"Source"**: seleccionar **"Deploy from a branch"**
3. En **"Branch"**: seleccionar `main` y carpeta `/public`  
   *(si no aparece `/public` como opción, seleccionar `/ (root)` — ver nota abajo)*
4. Hacer click en **Save**
5. Esperar 1-2 minutos y la URL estará disponible en:

```
https://nicogiagnorio.github.io/cajaPro/confirm.html
```

> **Nota:** GitHub Pages sirve desde `/docs` o desde la raíz `/ (root)`.
> Si la opción `/public` no aparece, mover el archivo:
> - Copiar `public/confirm.html` → raíz del proyecto como `confirm.html`
> - O crear una carpeta `docs/` y poner `confirm.html` adentro
> - Seleccionar esa carpeta en la config de Pages

---

## PASO 2 — Configurar URLs en Supabase (proyecto cajapro — PRODUCCIÓN)

### 2.1 Site URL

**Ruta:** supabase.com → proyecto `cajapro` → **Authentication → URL Configuration**

| Campo | Valor actual | Nuevo valor |
|-------|-------------|-------------|
| **Site URL** | `http://localhost:5173` | `https://nicogiagnorio.github.io/cajaPro/confirm.html` |

### 2.2 Redirect URLs — agregar estas dos entradas

En el campo **"Redirect URLs"**, agregar (una por línea):

```
https://nicogiagnorio.github.io/cajaPro/confirm.html
https://nicogiagnorio.github.io/cajaPro/confirm.html?type=recovery
```

Hacer click en **Save**.

---

## PASO 3 — Verificar Email Templates

**Ruta:** Authentication → **Email Templates**

### Template: "Confirm signup"

Verificar que el link de confirmación use la variable `{{ .ConfirmationURL }}` y NO tenga `localhost` hardcodeado.

El template correcto debe verse así:
```html
<a href="{{ .ConfirmationURL }}">Confirmar email</a>
```

Si tiene `http://localhost:5173/...` hardcodeado, reemplazarlo por `{{ .ConfirmationURL }}`.

### Template: "Reset Password"

Mismo chequeo. Debe usar `{{ .ConfirmationURL }}` sin localhost hardcodeado.

---

## PASO 4 — Repetir para el proyecto cajapro-dev

Hacer los mismos cambios del **Paso 2** en el proyecto `cajapro-dev`, pero usando la URL del proyecto de desarrollo.

Por ahora podés dejarlo en `http://localhost:5173` para el proyecto dev ya que solo lo usás desde tu PC.

---

## PASO 5 — Probar

1. Registrá un usuario nuevo desde CajaPro instalado en otra PC (o en modo incógnito)
2. Abrí el email de confirmación
3. Hacé click en el link → debe abrir el navegador con la página de confirmación
4. Verificar que muestre el **Caso A** (email confirmado ✅)
5. Abrí CajaPro e iniciá sesión → debe funcionar sin errores

---

## Resumen de la URL final

```
https://nicogiagnorio.github.io/cajaPro/confirm.html
```

Esta URL va en:
- Supabase → Site URL
- Supabase → Redirect URLs
