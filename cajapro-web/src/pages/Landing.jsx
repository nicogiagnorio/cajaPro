import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ESTILOS = `
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;font-family:'Inter',system-ui,sans-serif;background:#ffffff;color:#0f172a;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  a{text-decoration:none;color:inherit}
  ::selection{background:#dbeafe}
  .lp-volver{opacity:0;pointer-events:none;transform:translateY(12px);transition:opacity .25s,transform .25s}
  .lp-volver.visible{opacity:1;pointer-events:auto;transform:translateY(0)}
  .lp-volver:hover{transform:scale(1.08) !important}
  .lp-dot-nav{display:flex}
  .lp-dot-tip{position:absolute;right:calc(100% + 10px);top:50%;transform:translateY(-50%);background:#0f172a;color:#fff;font-size:11px;font-weight:600;white-space:nowrap;padding:4px 9px;border-radius:6px;pointer-events:none;opacity:0;transition:opacity .15s}
  .lp-dot-wrap:hover .lp-dot-tip{opacity:1}
  @media(max-width:768px){.lp-dot-nav{display:none}}

  /* ── Responsive mobile — todo el contenido del bloque HTML usa estilos inline,
     asi que las overrides necesitan !important para poder pisarlos ── */
  @media (max-width: 860px) {
    .lp-nav-links{display:none !important}
    .lp-hero-mockup{display:none !important}
    .lp-grid-2, .lp-grid-3, .lp-grid-4{grid-template-columns:1fr !important;gap:20px !important}
    .lp-plan-pro{transform:none !important}
    .lp-descarga-box{padding:32px 20px !important}
    h1{font-size:32px !important;line-height:1.15 !important}
    h2{font-size:26px !important}
  }
`

const HTML = `<div style="width:100%;overflow-x:hidden">

<!-- ============ NAV ============ -->
<header style="position:sticky;top:0;z-index:50;background:rgba(255,255,255,0.85);backdrop-filter:saturate(180%) blur(12px);border-bottom:1px solid #eef2f6">
  <div style="max-width:1180px;margin:0 auto;padding:0 24px;height:68px;display:flex;align-items:center;justify-content:space-between;gap:24px">
    <a href="#top" style="display:flex;align-items:center;gap:11px">
      <img src="/logo_tile.png" alt="CajaPro" style="width:38px;height:38px;object-fit:contain">
      <span style="font-size:20px;font-weight:800;letter-spacing:-0.02em">Caja<span style="color:#2563eb">Pro</span></span>
    </a>
    <nav class="lp-nav-links" style="display:flex;align-items:center;gap:28px;font-size:14.5px;font-weight:500;color:#475569">
      <a href="#nosotros" style="transition:color .15s">Quiénes somos</a>
      <a href="#modulos" style="transition:color .15s">Módulos</a>
      <a href="#arca" style="transition:color .15s">Facturación ARCA</a>
      <a href="#planes" style="transition:color .15s">Planes</a>
      <a href="#descarga" style="transition:color .15s">Descargar</a>
    </nav>
    <div style="display:flex;align-items:center;gap:14px">
      <a href="/login" style="font-size:14.5px;font-weight:600;color:#334155;padding:9px 4px">Ingresar</a>
      <a href="/registro" style="font-size:14.5px;font-weight:600;color:#fff;background:#2563eb;padding:10px 18px;border-radius:10px;box-shadow:0 4px 12px rgba(37,99,235,0.25);transition:background .15s">Probar gratis</a>
    </div>
  </div>
</header>

<!-- ============ HERO ============ -->
<section id="top" style="position:relative;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);overflow:hidden">
  <div style="max-width:1180px;margin:0 auto;padding:76px 24px 48px">
    <div style="max-width:760px;margin-bottom:52px">
      <div style="display:inline-flex;align-items:center;gap:8px;background:#eff6ff;border:1px solid #dbeafe;color:#1d4ed8;font-size:13px;font-weight:600;padding:6px 13px;border-radius:999px;margin-bottom:24px">
        <span style="width:7px;height:7px;background:#2563eb;border-radius:50%;display:inline-block"></span>
        Software de Gestión Inteligente · Hecho en Argentina
      </div>
      <h1 style="font-size:56px;line-height:1.05;font-weight:800;letter-spacing:-0.035em;margin:0 0 22px;color:#0f172a;text-wrap:balance">
        La herramienta que ordena tu negocio, atiende a tus clientes y <span style="color:#2563eb">factura por vos.</span>
      </h1>
      <p style="font-size:19px;line-height:1.55;color:#475569;margin:0 0 34px;max-width:620px;font-weight:400">
        CajaPro consolida ventas, caja, turnos e inventario en una sola plataforma ágil y veloz, con facturación electrónica ARCA integrada. Menos planillas, menos fugas, más control.
      </p>
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin-bottom:22px">
        <a href="/registro" style="display:inline-flex;align-items:center;gap:9px;font-size:16px;font-weight:600;color:#fff;background:#2563eb;padding:15px 26px;border-radius:12px;box-shadow:0 8px 22px rgba(37,99,235,0.3);transition:transform .15s,background .15s">
          Empezar ahora
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
        <a href="#descarga" style="display:inline-flex;align-items:center;gap:9px;font-size:16px;font-weight:600;color:#334155;background:#fff;border:1px solid #e2e8f0;padding:15px 24px;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,0.04);transition:border-color .15s">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Descargar para Windows
        </a>
      </div>
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:22px;font-size:13.5px;color:#64748b;font-weight:500">
        <span style="display:inline-flex;align-items:center;gap:7px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg>Datos cifrados en la nube (Supabase)</span>
        <span style="display:inline-flex;align-items:center;gap:7px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg>Implementación llave en mano</span>
        <span style="display:inline-flex;align-items:center;gap:7px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg>Actualizaciones de ley</span>
      </div>
    </div>

    <!-- ===== PRODUCT MOCKUP ===== -->
    <div class="lp-hero-mockup" style="position:relative">
      <div style="border-radius:16px;overflow:hidden;box-shadow:0 30px 60px -20px rgba(15,23,42,0.35),0 12px 24px -12px rgba(15,23,42,0.2);border:1px solid #e2e8f0;background:#fff">
        <div style="height:40px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;padding:0 14px;gap:8px">
          <div style="display:flex;gap:7px"><span style="width:11px;height:11px;border-radius:50%;background:#f87171"></span><span style="width:11px;height:11px;border-radius:50%;background:#fbbf24"></span><span style="width:11px;height:11px;border-radius:50%;background:#34d399"></span></div>
          <div style="flex:1;max-width:340px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:7px;height:24px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:#94a3b8;font-weight:500">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            app.cajapro.com.ar
          </div>
        </div>
        <div style="display:flex;height:452px;background:#f1f5f9">
          <aside style="width:200px;background:#0f172a;display:flex;flex-direction:column;flex-shrink:0">
            <div style="padding:14px;border-bottom:1px solid rgba(51,65,85,0.5);display:flex;align-items:center;gap:9px">
              <img src="/logo_tile.png" alt="CajaPro" style="width:30px;height:30px;object-fit:contain">
              <span style="color:#fff;font-weight:700;font-size:15px;letter-spacing:-0.02em">Caja<span style="color:#60a5fa">Pro</span></span>
            </div>
            <nav style="flex:1;padding:12px 10px;display:flex;flex-direction:column;gap:2px">
              <div style="display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:9px;background:#2563eb;color:#fff;font-size:12.5px;font-weight:600"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>Dashboard</div>
              <div style="display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:9px;color:#94a3b8;font-size:12.5px;font-weight:500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>Punto de Venta</div>
              <div style="display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:9px;color:#94a3b8;font-size:12.5px;font-weight:500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>Caja</div>
              <div style="display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:9px;color:#94a3b8;font-size:12.5px;font-weight:500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>Turnos</div>
              <div style="display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:9px;color:#94a3b8;font-size:12.5px;font-weight:500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>Inventario</div>
              <div style="display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:9px;color:#94a3b8;font-size:12.5px;font-weight:500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>Reportes</div>
            </nav>
            <div style="padding:12px;border-top:1px solid rgba(51,65,85,0.5);display:flex;align-items:center;gap:9px">
              <div style="width:28px;height:28px;border-radius:50%;background:#2563eb;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700">MG</div>
              <div style="line-height:1.2"><div style="color:#fff;font-size:12px;font-weight:600">Martín G.</div><div style="color:#64748b;font-size:10.5px">Administrador</div></div>
            </div>
          </aside>
          <div style="flex:1;overflow:hidden;padding:22px 22px 0">
            <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:2px">Bienvenido, Martín!</div>
            <div style="font-size:12.5px;color:#64748b;margin-bottom:14px">Desde acá manejás todo tu comercio en un solo lugar.</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:11px;margin-bottom:14px">
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:13px"><div style="font-size:11px;color:#64748b;font-weight:500;margin-bottom:4px">Ventas de hoy</div><div style="font-size:19px;font-weight:800;color:#0f172a;letter-spacing:-0.02em">$248.500</div><div style="font-size:10.5px;color:#059669;font-weight:600;margin-top:2px">▲ 12% vs ayer</div></div>
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:13px"><div style="font-size:11px;color:#64748b;font-weight:500;margin-bottom:4px">En caja</div><div style="font-size:19px;font-weight:800;color:#0f172a;letter-spacing:-0.02em">$86.200</div><div style="font-size:10.5px;color:#64748b;font-weight:500;margin-top:2px">Turno abierto</div></div>
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:13px"><div style="font-size:11px;color:#64748b;font-weight:500;margin-bottom:4px">Turnos hoy</div><div style="font-size:19px;font-weight:800;color:#0f172a;letter-spacing:-0.02em">14</div><div style="font-size:10.5px;color:#2563eb;font-weight:600;margin-top:2px">3 próximos</div></div>
            </div>
            <div style="background:#fff;border:1px solid #fde68a;border-radius:13px;padding:11px 13px;display:flex;align-items:center;gap:10px;margin-bottom:14px">
              <div style="width:30px;height:30px;background:#fef3c7;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>
              <div style="flex:1;line-height:1.25"><div style="font-size:12.5px;font-weight:600;color:#334155">3 productos necesitan atención</div><div style="font-size:11px;color:#64748b">1 sin stock / 2 bajo mínimo</div></div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:14px"><div style="width:34px;height:34px;border-radius:9px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;margin-bottom:9px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg></div><div style="font-size:13px;font-weight:600;color:#0f172a">Punto de Venta</div><div style="font-size:11px;color:#64748b;line-height:1.35;margin-top:2px">Cobros multimedios y arqueo</div></div>
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:14px"><div style="width:34px;height:34px;border-radius:9px;background:#f0f9ff;color:#0284c7;display:flex;align-items:center;justify-content:center;margin-bottom:9px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/></svg></div><div style="font-size:13px;font-weight:600;color:#0f172a">Agenda de Turnos</div><div style="font-size:11px;color:#64748b;line-height:1.35;margin-top:2px">Bloqueos por profesional</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ TRUST STRIP ============ -->
<section style="border-top:1px solid #eef2f6;border-bottom:1px solid #eef2f6;background:#fff">
  <div style="max-width:1180px;margin:0 auto;padding:26px 24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:14px 30px">
    <span style="font-size:13px;font-weight:600;color:#94a3b8;letter-spacing:0.02em">ADAPTABILIDAD COMPROBADA POR RUBRO</span>
    <span style="font-size:15px;font-weight:600;color:#475569">Veterinarias</span>
    <span style="color:#e2e8f0">·</span>
    <span style="font-size:15px;font-weight:600;color:#475569">Petshops</span>
    <span style="color:#e2e8f0">·</span>
    <span style="font-size:15px;font-weight:600;color:#475569">Peluquerías</span>
    <span style="color:#e2e8f0">·</span>
    <span style="font-size:15px;font-weight:600;color:#475569">Ferreterías</span>
    <span style="color:#e2e8f0">·</span>
    <span style="font-size:15px;font-weight:600;color:#475569">Almacenes</span>
  </div>
</section>

<!-- ============ QUIÉNES SOMOS ============ -->
<section id="nosotros" style="background:#fff;padding:88px 0">
  <div class="lp-grid-2" style="max-width:1180px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center">
    <div>
      <div style="font-size:13px;font-weight:700;color:#2563eb;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px">Quiénes somos</div>
      <h2 style="font-size:38px;font-weight:800;letter-spacing:-0.03em;margin:0 0 18px;color:#0f172a;line-height:1.1;text-wrap:balance">Ponemos orden donde antes había cuadernos y planillas</h2>
      <p style="font-size:17px;line-height:1.6;color:#475569;margin:0 0 20px">CajaPro nació para resolver los problemas cotidianos de los comercios de barrio: la falta de herramientas centralizadas que genera fugas de dinero, desorganización horaria y pérdida de clientes.</p>
      <p style="font-size:17px;line-height:1.6;color:#475569;margin:0 0 28px">Consolidamos la operación de venta y administración en una interfaz ágil, intuitiva y sumamente veloz, con una implementación profesional llave en mano para que empieces sin fricciones.</p>
      <div style="display:flex;gap:32px;flex-wrap:wrap">
        <div><div style="font-size:30px;font-weight:800;color:#0f172a;letter-spacing:-0.02em">4</div><div style="font-size:13.5px;color:#64748b;font-weight:500">módulos core integrados</div></div>
        <div><div style="font-size:30px;font-weight:800;color:#0f172a;letter-spacing:-0.02em">3</div><div style="font-size:13.5px;color:#64748b;font-weight:500">pasos de implementación</div></div>
        <div><div style="font-size:30px;font-weight:800;color:#0f172a;letter-spacing:-0.02em">1 clic</div><div style="font-size:13.5px;color:#64748b;font-weight:500">para facturar con ARCA</div></div>
      </div>
    </div>
    <div style="border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 24px 48px -20px rgba(15,23,42,0.28)">
      <div style="width:100%;aspect-ratio:16/9;background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border-radius:18px;overflow:hidden"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="14" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21h6"/><path d="M12 17v4"/></svg><span style="color:#94a3b8;font-size:14px;font-weight:500">Vista web de CajaPro</span></div>
    </div>
  </div>
</section>

<!-- ============ DESAFÍOS ============ -->
<section style="background:#0f172a;padding:80px 0">
  <div style="max-width:1180px;margin:0 auto;padding:0 24px">
    <div style="max-width:620px;margin-bottom:44px">
      <div style="font-size:13px;font-weight:700;color:#60a5fa;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px">Los desafíos que resolvemos</div>
      <h2 style="font-size:36px;font-weight:800;letter-spacing:-0.03em;margin:0;color:#fff;line-height:1.12;text-wrap:balance">Identificamos los puntos críticos de tu negocio</h2>
    </div>
    <div class="lp-grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
      <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:26px">
        <div style="width:44px;height:44px;border-radius:11px;background:rgba(234,179,8,0.15);display:flex;align-items:center;justify-content:center;margin-bottom:16px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg></div>
        <h3 style="font-size:17px;font-weight:700;color:#fff;margin:0 0 8px">Desorganización en la agenda</h3>
        <p style="font-size:14px;line-height:1.55;color:#94a3b8;margin:0">Turnos perdidos, superpuestos o gestionados en cuadernos informales que derivan en baches y clientes insatisfechos.</p>
      </div>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:26px">
        <div style="width:44px;height:44px;border-radius:11px;background:rgba(239,68,68,0.15);display:flex;align-items:center;justify-content:center;margin-bottom:16px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <h3 style="font-size:17px;font-weight:700;color:#fff;margin:0 0 8px">Fugas ocultas y falta de control</h3>
        <p style="font-size:14px;line-height:1.55;color:#94a3b8;margin:0">Cajas diarias que no cierran de forma exacta e imposibilidad de auditar retiros de efectivo o ingresos reales por turno.</p>
      </div>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:26px">
        <div style="width:44px;height:44px;border-radius:11px;background:rgba(37,99,235,0.18);display:flex;align-items:center;justify-content:center;margin-bottom:16px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg></div>
        <h3 style="font-size:17px;font-weight:700;color:#fff;margin:0 0 8px">Complejidad impositiva y fiscal</h3>
        <p style="font-size:14px;line-height:1.55;color:#94a3b8;margin:0">Demoras críticas y fricción al ingresar a portales fiscales externos para emitir un comprobante obligatorio a un cliente.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ MÓDULOS CORE ============ -->
<section id="modulos" style="background:#f8fafc;padding:88px 0">
  <div style="max-width:1180px;margin:0 auto;padding:0 24px">
    <div style="max-width:640px;margin-bottom:48px">
      <div style="font-size:13px;font-weight:700;color:#2563eb;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px">Módulos Core</div>
      <h2 style="font-size:40px;font-weight:800;letter-spacing:-0.03em;margin:0 0 16px;color:#0f172a;text-wrap:balance">Diseñados para la acción</h2>
      <p style="font-size:17px;line-height:1.55;color:#475569;margin:0">Todo conectado: una venta descuenta stock, registra la caja y suma al reporte automáticamente.</p>
    </div>
    <div class="lp-grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:30px;display:flex;gap:20px;transition:transform .18s,box-shadow .18s">
        <div style="width:52px;height:52px;flex-shrink:0;border-radius:13px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg></div>
        <div><h3 style="font-size:18px;font-weight:700;margin:0 0 7px;color:#0f172a">Punto de Venta (POS)</h3><p style="font-size:14.5px;line-height:1.55;color:#64748b;margin:0">Cobros multimedios, uso de lector de códigos de barras y arqueos automáticos al final del día de forma limpia.</p></div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:30px;display:flex;gap:20px;transition:transform .18s,box-shadow .18s">
        <div style="width:52px;height:52px;flex-shrink:0;border-radius:13px;background:#f0f9ff;color:#0284c7;display:flex;align-items:center;justify-content:center"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/></svg></div>
        <div><h3 style="font-size:18px;font-weight:700;margin:0 0 7px;color:#0f172a">Agenda de Turnos</h3><p style="font-size:14.5px;line-height:1.55;color:#64748b;margin:0">Bloqueos horarios automáticos, control de citas por profesional y sincronización directa.</p></div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:30px;display:flex;gap:20px;transition:transform .18s,box-shadow .18s">
        <div style="width:52px;height:52px;flex-shrink:0;border-radius:13px;background:#ecfdf5;color:#059669;display:flex;align-items:center;justify-content:center"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg></div>
        <div><h3 style="font-size:18px;font-weight:700;margin:0 0 7px;color:#0f172a">Factura Electrónica</h3><p style="font-size:14.5px;line-height:1.55;color:#64748b;margin:0">Integración nativa con ARCA / AFIP. Emisión de comprobantes autorizados y CAE en un solo clic.</p></div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:30px;display:flex;gap:20px;transition:transform .18s,box-shadow .18s">
        <div style="width:52px;height:52px;flex-shrink:0;border-radius:13px;background:#fff1f2;color:#e11d48;display:flex;align-items:center;justify-content:center"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg></div>
        <div><h3 style="font-size:18px;font-weight:700;margin:0 0 7px;color:#0f172a">Clientes y Reportes</h3><p style="font-size:14.5px;line-height:1.55;color:#64748b;margin:0">Cuentas corrientes instantáneas, historial por cliente y reportes financieros automáticos.</p></div>
      </div>
    </div>
    <!-- secundarios -->
    <div class="lp-grid-4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;display:flex;align-items:center;gap:12px"><div style="width:38px;height:38px;flex-shrink:0;border-radius:10px;background:#f5f3ff;color:#7c3aed;display:flex;align-items:center;justify-content:center"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg></div><div style="font-size:14px;font-weight:600;color:#0f172a">Inventario y stock</div></div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;display:flex;align-items:center;gap:12px"><div style="width:38px;height:38px;flex-shrink:0;border-radius:10px;background:#f0fdfa;color:#0d9488;display:flex;align-items:center;justify-content:center"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg></div><div style="font-size:14px;font-weight:600;color:#0f172a">Caja y arqueo</div></div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;display:flex;align-items:center;gap:12px"><div style="width:38px;height:38px;flex-shrink:0;border-radius:10px;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div><div style="font-size:14px;font-weight:600;color:#0f172a">Compras</div></div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;display:flex;align-items:center;gap:12px"><div style="width:38px;height:38px;flex-shrink:0;border-radius:10px;background:#fffbeb;color:#d97706;display:flex;align-items:center;justify-content:center"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg></div><div style="font-size:14px;font-weight:600;color:#0f172a">Gastos</div></div>
    </div>
  </div>
</section>

<!-- ============ ARCA ============ -->
<section id="arca" style="background:#0f172a;padding:90px 0;position:relative;overflow:hidden">
  <div style="position:absolute;top:-120px;right:-120px;width:420px;height:420px;background:radial-gradient(circle,rgba(37,99,235,0.35),transparent 70%);pointer-events:none"></div>
  <div class="lp-grid-2" style="max-width:1180px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;position:relative">
    <div>
      <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(37,99,235,0.15);border:1px solid rgba(96,165,250,0.3);color:#93c5fd;font-size:13px;font-weight:600;padding:6px 13px;border-radius:999px;margin-bottom:22px">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
        Integración nativa ARCA (ex AFIP)
      </div>
      <h2 style="font-size:40px;font-weight:800;letter-spacing:-0.03em;margin:0 0 18px;color:#fff;line-height:1.08;text-wrap:balance">Emití comprobantes autorizados en un solo clic</h2>
      <p style="font-size:17px;line-height:1.6;color:#cbd5e1;margin:0 0 28px">Homologamos formalmente tu punto de venta digital con los servidores de ARCA / AFIP. El timbrado es automático y el CAE queda guardado con cada venta, sin cargar dos veces.</p>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;align-items:center;gap:12px"><span style="width:24px;height:24px;border-radius:50%;background:rgba(37,99,235,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><span style="font-size:15.5px;color:#e2e8f0">Factura A, B, C y notas de crédito</span></div>
        <div style="display:flex;align-items:center;gap:12px"><span style="width:24px;height:24px;border-radius:50%;background:rgba(37,99,235,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><span style="font-size:15.5px;color:#e2e8f0">CAE automático y timbrado válido</span></div>
        <div style="display:flex;align-items:center;gap:12px"><span style="width:24px;height:24px;border-radius:50%;background:rgba(37,99,235,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><span style="font-size:15.5px;color:#e2e8f0">PDF listo para enviar por WhatsApp o email</span></div>
      </div>
    </div>
    <div style="background:#fff;border-radius:16px;box-shadow:0 30px 60px -20px rgba(0,0,0,0.5);overflow:hidden">
      <div style="background:#2563eb;padding:18px 22px;display:flex;align-items:center;justify-content:space-between">
        <div style="color:#fff"><div style="font-size:11px;font-weight:600;opacity:0.8;letter-spacing:0.04em">FACTURA</div><div style="font-size:22px;font-weight:800;letter-spacing:-0.02em">B</div></div>
        <div style="text-align:right;color:#fff"><div style="font-size:11px;opacity:0.85">Comprobante N°</div><div style="font-size:15px;font-weight:700">0001-00004521</div></div>
      </div>
      <div style="padding:22px">
        <div style="display:flex;justify-content:space-between;font-size:12.5px;color:#64748b;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #f1f5f9">
          <div><div style="font-weight:700;color:#0f172a;font-size:13.5px;margin-bottom:2px">Mascotas del Sur</div>CUIT 30-71234567-8</div>
          <div style="text-align:right">Fecha<br><span style="color:#0f172a;font-weight:600">05/07/2026</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:#334155">Alimento premium 15kg</span><span style="color:#0f172a;font-weight:600">$28.500</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:#334155">Antipulgas pipeta x3</span><span style="color:#0f172a;font-weight:600">$12.900</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:#334155">Consulta veterinaria</span><span style="color:#0f172a;font-weight:600">$4.200</span></div>
        </div>
        <div style="border-top:1px dashed #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;align-items:baseline">
          <span style="font-size:13px;color:#64748b">IVA 21% incluido</span>
          <div style="text-align:right"><div style="font-size:11px;color:#94a3b8;font-weight:600">TOTAL</div><div style="font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.02em">$45.600</div></div>
        </div>
        <div style="margin-top:16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:11px 13px;display:flex;align-items:center;gap:10px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
          <div style="line-height:1.3"><div style="font-size:12.5px;font-weight:700;color:#065f46">CAE 74029183746521</div><div style="font-size:11px;color:#059669">Autorizado por ARCA · Vto 15/07/2026</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ E-COMMERCE / WHATSAPP BAND ============ -->
<section style="background:#fff;padding:88px 0">
  <div class="lp-grid-2" style="max-width:1180px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center">
    <div style="border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 24px 48px -20px rgba(37,99,235,0.3)">
      <div style="width:100%;aspect-ratio:16/9;background:linear-gradient(135deg,#0f172a 0%,#1a2744 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border-radius:18px;overflow:hidden"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg><span style="color:#94a3b8;font-size:14px;font-weight:500">Tienda online + WhatsApp</span></div>
    </div>
    <div>
      <div style="font-size:13px;font-weight:700;color:#2563eb;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px">Gestión + E-commerce</div>
      <h2 style="font-size:38px;font-weight:800;letter-spacing:-0.03em;margin:0 0 18px;color:#0f172a;line-height:1.1;text-wrap:balance">Tu tienda online, conectada a la misma caja</h2>
      <p style="font-size:17px;line-height:1.6;color:#475569;margin:0 0 24px">Modernizá la experiencia de cara al cliente final: vendé por tu tienda online, confirmá pedidos por WhatsApp y mantené el stock y la caja sincronizados con tu mostrador en tiempo real.</p>
      <div style="display:flex;flex-direction:column;gap:13px">
        <div style="display:flex;align-items:center;gap:12px"><span style="width:22px;height:22px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><span style="font-size:15.5px;color:#334155">Catálogo online con tu marca</span></div>
        <div style="display:flex;align-items:center;gap:12px"><span style="width:22px;height:22px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><span style="font-size:15.5px;color:#334155">Confirmación de pedidos por WhatsApp</span></div>
        <div style="display:flex;align-items:center;gap:12px"><span style="width:22px;height:22px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-4-4"/></svg></span><span style="font-size:15.5px;color:#334155">Stock y caja siempre sincronizados</span></div>
      </div>
    </div>
  </div>
</section>

<!-- ============ RUBROS ============ -->
<section style="background:#f8fafc;padding:80px 0;border-top:1px solid #eef2f6">
  <div style="max-width:1180px;margin:0 auto;padding:0 24px">
    <div style="max-width:640px;margin-bottom:44px">
      <div style="font-size:13px;font-weight:700;color:#2563eb;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px">Por rubro</div>
      <h2 style="font-size:36px;font-weight:800;letter-spacing:-0.03em;margin:0;color:#0f172a;line-height:1.12;text-wrap:balance">Adaptabilidad comprobada</h2>
    </div>
    <div class="lp-grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px"><div style="width:46px;height:46px;border-radius:12px;background:#fff1f2;color:#e11d48;display:flex;align-items:center;justify-content:center;margin-bottom:16px"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.25 16.25h1.5L12 17z"/><path d="m10 11 1-1 1 1"/><path d="M8.5 21c-1.5-1-3-3-3-6 0-4 3-7 6.5-7s6.5 3 6.5 7c0 3-1.5 5-3 6"/><circle cx="7" cy="9" r="1.5"/><circle cx="17" cy="9" r="1.5"/><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/></svg></div><h3 style="font-size:17px;font-weight:700;margin:0 0 8px;color:#0f172a">Veterinarias y Petshops</h3><p style="font-size:14px;line-height:1.55;color:#64748b;margin:0">Fichas clínicas completas vinculadas de forma directa a la venta de mostrador y el stock de medicamentos.</p></div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px"><div style="width:46px;height:46px;border-radius:12px;background:#f5f3ff;color:#7c3aed;display:flex;align-items:center;justify-content:center;margin-bottom:16px"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22V8a4 4 0 0 1 8 0v14"/><path d="M6 12h12"/><path d="M12 2v2"/></svg></div><h3 style="font-size:17px;font-weight:700;margin:0 0 8px;color:#0f172a">Estética y Peluquerías</h3><p style="font-size:14px;line-height:1.55;color:#64748b;margin:0">Asignación ágil de turnos para múltiples especialistas con liquidación transparente de servicios.</p></div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px"><div style="width:46px;height:46px;border-radius:12px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;margin-bottom:16px"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg></div><h3 style="font-size:17px;font-weight:700;margin:0 0 8px;color:#0f172a">Comercios de Cercanía</h3><p style="font-size:14px;line-height:1.55;color:#64748b;margin:0">Ferreterías o almacenes con alta rotación que exigen rapidez en cobros y control milimétrico de caja.</p></div>
    </div>
  </div>
</section>

<!-- ============ DESCARGA ESCRITORIO ============ -->
<section id="descarga" style="background:#fff;padding:88px 0">
  <div style="max-width:1180px;margin:0 auto;padding:0 24px">
    <div class="lp-grid-2 lp-descarga-box" style="background:linear-gradient(135deg,#f8fafc,#eff6ff);border:1px solid #e2e8f0;border-radius:24px;padding:52px 56px;display:grid;grid-template-columns:1.1fr 0.9fr;gap:48px;align-items:center">
      <div>
        <div style="display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid #e2e8f0;color:#334155;font-size:13px;font-weight:600;padding:6px 13px;border-radius:999px;margin-bottom:20px">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
          App de escritorio
        </div>
        <h2 style="font-size:36px;font-weight:800;letter-spacing:-0.03em;margin:0 0 14px;color:#0f172a;line-height:1.1">Usalo desde la web o instalá la app</h2>
        <p style="font-size:17px;line-height:1.55;color:#475569;margin:0 0 28px;max-width:460px">La versión de escritorio para Windows funciona más rápido, imprime tickets directo a la impresora térmica y sigue andando aunque se caiga internet.</p>
        <div style="display:flex;flex-wrap:wrap;gap:14px">
          <a href="https://drive.google.com/drive/folders/1Dy2Q18sDKKGEUvs88Kj3BqDwsk6qKGMg" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:11px;background:#0f172a;color:#fff;padding:14px 22px;border-radius:12px;font-weight:600;font-size:15.5px;box-shadow:0 8px 20px rgba(15,23,42,0.2);transition:transform .15s">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.7 10 4.6v6.9H3V5.7Zm0 12.6 7 1.1v-6.8H3v5.7Zm8 1.2 10 1.5V12.5H11v7Zm0-15.4v7H21V3l-10 1.1Z"/></svg>
            <span>Descargar para Windows<br><span style="font-size:11.5px;font-weight:500;opacity:0.7">.exe · 64-bit · v1.0</span></span>
          </a>
          <a href="/login" style="display:inline-flex;align-items:center;gap:9px;background:#fff;color:#334155;border:1px solid #cbd5e1;padding:14px 22px;border-radius:12px;font-weight:600;font-size:15.5px;transition:border-color .15s">Abrir en el navegador
          </a>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;gap:13px;align-items:flex-start"><div style="width:38px;height:38px;border-radius:10px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div><div><div style="font-size:15px;font-weight:700;color:#0f172a">Más rápido</div><div style="font-size:13.5px;color:#64748b;line-height:1.45">Cargá ventas al instante, sin esperar la red.</div></div></div>
        <div style="display:flex;gap:13px;align-items:flex-start"><div style="width:38px;height:38px;border-radius:10px;background:#f0fdfa;color:#0d9488;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg></div><div><div style="font-size:15px;font-weight:700;color:#0f172a">Impresión de tickets</div><div style="font-size:13.5px;color:#64748b;line-height:1.45">Conectá tu impresora térmica y listo.</div></div></div>
        <div style="display:flex;gap:13px;align-items:flex-start"><div style="width:38px;height:38px;border-radius:10px;background:#ecfdf5;color:#059669;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div><div style="font-size:15px;font-weight:700;color:#0f172a">Se actualiza sola</div><div style="font-size:13.5px;color:#64748b;line-height:1.45">Siempre la última versión, sin reinstalar.</div></div></div>
      </div>
    </div>
  </div>
</section>

<!-- ============ PLANES ============ -->
<section id="planes" style="background:#f8fafc;padding:88px 0;border-top:1px solid #eef2f6">
  <div style="max-width:1180px;margin:0 auto;padding:0 24px">
    <div style="text-align:center;max-width:620px;margin:0 auto 48px">
      <div style="font-size:13px;font-weight:700;color:#2563eb;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px">Planes de inversión mensual</div>
      <h2 style="font-size:40px;font-weight:800;letter-spacing:-0.03em;margin:0 0 14px;color:#0f172a">Escalables, transparentes y sin sorpresas</h2>
      <p style="font-size:17px;line-height:1.55;color:#475569;margin:0">Adaptados a la madurez de tu negocio. Cambiá de plan cuando quieras.</p>
    </div>
    <div class="lp-grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px;align-items:stretch;max-width:1040px;margin:0 auto">
      <!-- Starter -->
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:30px;display:flex;flex-direction:column">
        <div style="font-size:15px;font-weight:700;color:#0f172a">Starter</div>
        <div style="font-size:13.5px;color:#64748b;margin:4px 0 20px">Para arrancar a ordenarte</div>
        <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:22px"><span style="font-size:34px;font-weight:800;color:#0f172a;letter-spacing:-0.02em">$80.000</span><span style="font-size:14px;color:#94a3b8;font-weight:500">/mes</span></div>
        <a href="/registro" style="text-align:center;background:#fff;border:1px solid #cbd5e1;color:#334155;font-weight:600;font-size:15px;padding:12px;border-radius:11px;margin-bottom:24px;transition:border-color .15s">Empezar</a>
        <div style="display:flex;flex-direction:column;gap:11px">
          <div style="display:flex;gap:10px;font-size:14px;color:#334155"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Punto de venta (POS)</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#334155"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Cierre y arqueo de caja</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#334155"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Hasta 2 usuarios</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#334155"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Soporte estándar</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#334155"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Actualizaciones de ley</div>
        </div>
      </div>
      <!-- Pro destacado -->
      <div class="lp-plan-pro" style="background:#0f172a;border:1px solid #0f172a;border-radius:20px;padding:30px;display:flex;flex-direction:column;position:relative;box-shadow:0 24px 50px -20px rgba(15,23,42,0.5);transform:scale(1.03)">
        <div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:#2563eb;color:#fff;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px;letter-spacing:0.02em">MÁS ELEGIDO</div>
        <div style="font-size:15px;font-weight:700;color:#fff">Pro</div>
        <div style="font-size:13.5px;color:#94a3b8;margin:4px 0 20px">Tu comercio, completo</div>
        <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:22px"><span style="font-size:34px;font-weight:800;color:#fff;letter-spacing:-0.02em">$120.000</span><span style="font-size:14px;color:#64748b;font-weight:500">/mes</span></div>
        <a href="mailto:nicolasgiagnorio@gmail.com?subject=CajaPro%20%E2%80%93%20Consulta" style="text-align:center;background:#2563eb;color:#fff;font-weight:600;font-size:15px;padding:12px;border-radius:11px;margin-bottom:24px;box-shadow:0 8px 20px rgba(37,99,235,0.4);transition:background .15s">Contratar Pro</a>
        <div style="display:flex;flex-direction:column;gap:11px">
          <div style="display:flex;gap:10px;font-size:14px;color:#e2e8f0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Todo lo del plan Starter</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#e2e8f0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Gestión de turnos avanzada</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#e2e8f0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Facturación Electrónica ARCA</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#e2e8f0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Módulo de compras</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#e2e8f0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Fichas Clientes / Pacientes</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#e2e8f0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Reportes avanzados</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#e2e8f0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Hasta 5 usuarios activos</div>
        </div>
      </div>
      <!-- Full -->
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:30px;display:flex;flex-direction:column">
        <div style="font-size:15px;font-weight:700;color:#0f172a">Full</div>
        <div style="font-size:13.5px;color:#64748b;margin:4px 0 20px">Control total, sin límites</div>
        <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:22px"><span style="font-size:34px;font-weight:800;color:#0f172a;letter-spacing:-0.02em">$150.000</span><span style="font-size:14px;color:#94a3b8;font-weight:500">/mes</span></div>
        <a href="mailto:nicolasgiagnorio@gmail.com?subject=CajaPro%20%E2%80%93%20Consulta" style="text-align:center;background:#fff;border:1px solid #cbd5e1;color:#334155;font-weight:600;font-size:15px;padding:12px;border-radius:11px;margin-bottom:24px;transition:border-color .15s">Hablar con ventas</a>
        <div style="display:flex;flex-direction:column;gap:11px">
          <div style="display:flex;gap:10px;font-size:14px;color:#334155"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Todo lo del plan Pro</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#334155"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Inventario y stock completo</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#334155"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Alertas automáticas de stock</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#334155"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Reportes personalizados</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#334155"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Hasta 10 usuarios activos</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#334155"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Soporte prioritario 24/7</div>
          <div style="display:flex;gap:10px;font-size:14px;color:#334155"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M20 6 9 17l-4-4"/></svg>Onboarding dedicado</div>
        </div>
      </div>
    </div>
    <p style="text-align:center;font-size:13.5px;color:#94a3b8;margin-top:26px">Esquemas escalables adaptados a la madurez de tu negocio. Valores mensuales de referencia.</p>
  </div>
</section>

<!-- ============ IMPLEMENTACIÓN 3 PASOS ============ -->
<section style="background:#fff;padding:88px 0">
  <div style="max-width:1180px;margin:0 auto;padding:0 24px">
    <div style="max-width:640px;margin-bottom:48px">
      <div style="font-size:13px;font-weight:700;color:#2563eb;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px">Implementación profesional</div>
      <h2 style="font-size:38px;font-weight:800;letter-spacing:-0.03em;margin:0 0 14px;color:#0f172a;text-wrap:balance">Un proceso llave en mano en 3 pasos</h2>
      <p style="font-size:17px;line-height:1.55;color:#475569;margin:0">Estructurado para asegurar un despliegue sin fricciones ni cortes de servicio en tu negocio.</p>
    </div>
    <div class="lp-grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px">
      <div style="border:1px solid #e2e8f0;border-radius:18px;padding:30px;position:relative">
        <div style="width:44px;height:44px;border-radius:12px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;margin-bottom:18px">1</div>
        <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#0f172a">Infraestructura segura en la nube</h3>
        <p style="font-size:14.5px;line-height:1.55;color:#64748b;margin:0">Apertura de tu entorno privado en Supabase con base PostgreSQL robusta y cifrado de extremo a extremo TLS que aísla tu información comercial.</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:18px;padding:30px;position:relative">
        <div style="width:44px;height:44px;border-radius:12px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;margin-bottom:18px">2</div>
        <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#0f172a">Homologación y vinculación</h3>
        <p style="font-size:14.5px;line-height:1.55;color:#64748b;margin:0">Configuración de tus terminales de venta. Para cuentas Pro y Full, enlazamos el punto de venta digital con los servidores de ARCA / AFIP.</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:18px;padding:30px;position:relative">
        <div style="width:44px;height:44px;border-radius:12px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;margin-bottom:18px">3</div>
        <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#0f172a">Capacitación y lanzamiento</h3>
        <p style="font-size:14.5px;line-height:1.55;color:#64748b;margin:0">Entrega de credenciales por rol, manual operativo oficial y canal directo de soporte durante las primeras jornadas de uso real.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ CTA FINAL ============ -->
<section style="background:#fff;padding:24px 0 90px">
  <div style="max-width:1180px;margin:0 auto;padding:0 24px">
    <div style="background:#2563eb;border-radius:24px;padding:64px 40px;text-align:center;position:relative;overflow:hidden">
      <div style="position:absolute;bottom:-140px;left:-80px;width:360px;height:360px;background:radial-gradient(circle,rgba(255,255,255,0.14),transparent 70%);pointer-events:none"></div>
      <div style="position:absolute;top:-120px;right:-60px;width:320px;height:320px;background:radial-gradient(circle,rgba(255,255,255,0.1),transparent 70%);pointer-events:none"></div>
      <h2 style="font-size:42px;font-weight:800;letter-spacing:-0.03em;color:#fff;margin:0 0 16px;position:relative;text-wrap:balance">¿Listo para transformar la gestión de tu comercio?</h2>
      <p style="font-size:18px;color:#dbeafe;margin:0 auto 32px;max-width:560px;line-height:1.5;position:relative">Contactate con nuestro equipo comercial para coordinar el alta de tu entorno.</p>
      <div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;position:relative">
        <a href="mailto:nicolasgiagnorio@gmail.com?subject=CajaPro%20%E2%80%93%20Consulta" style="display:inline-flex;align-items:center;gap:9px;background:#fff;color:#1d4ed8;font-weight:700;font-size:16px;padding:15px 30px;border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,0.15);transition:transform .15s">Contactar a ventas</a>
        <a href="#descarga" style="display:inline-flex;align-items:center;gap:9px;background:rgba(255,255,255,0.12);color:#fff;border:1px solid rgba(255,255,255,0.35);font-weight:600;font-size:16px;padding:15px 28px;border-radius:12px;transition:background .15s">Descargar la app</a>
      </div>
    </div>
  </div>
</section>

<!-- ============ FOOTER ============ -->
<footer style="background:#0f172a;padding:52px 0 32px">
  <div style="max-width:1180px;margin:0 auto;padding:0 24px">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:40px;padding-bottom:36px;border-bottom:1px solid rgba(51,65,85,0.6)">
      <div style="max-width:300px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <img src="/logo_tile.png" alt="CajaPro" style="width:34px;height:34px;object-fit:contain">
          <span style="font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.02em">Caja<span style="color:#60a5fa">Pro</span></span>
        </div>
        <p style="font-size:14px;color:#94a3b8;line-height:1.55;margin:0">La herramienta que ordena tu negocio, atiende a tus clientes y factura por vos. Hecho en Argentina por AutomatizacionesAR.</p>
      </div>
      <div style="display:flex;gap:56px;flex-wrap:wrap">
        <div>
          <div style="font-size:12.5px;font-weight:700;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px">Producto</div>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:14px;color:#94a3b8">
            <a href="#nosotros" style="transition:color .15s">Quiénes somos</a>
            <a href="#modulos" style="transition:color .15s">Módulos</a>
            <a href="#arca" style="transition:color .15s">Facturación ARCA</a>
            <a href="#planes" style="transition:color .15s">Planes</a>
            <a href="#descarga" style="transition:color .15s">Descargar</a>
          </div>
        </div>
        <div>
          <div style="font-size:12.5px;font-weight:700;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px">Soporte</div>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:14px;color:#94a3b8">
            <a href="#" style="transition:color .15s">Centro de ayuda</a>
            <a href="#" style="transition:color .15s">WhatsApp</a>
            <a href="#" style="transition:color .15s">Estado del servicio</a>
          </div>
        </div>
        <div>
          <div style="font-size:12.5px;font-weight:700;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px">Legal</div>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:14px;color:#94a3b8">
            <a href="#" style="transition:color .15s">Términos</a>
            <a href="#" style="transition:color .15s">Privacidad</a>
          </div>
        </div>
      </div>
    </div>
    <div style="padding-top:24px;font-size:13px;color:#64748b">© 2026 CajaPro · AutomatizacionesAR. Todos los derechos reservados.</div>
  </div>
</footer>

</div>`

export default function Landing() {
  const ref      = useRef(null)
  const navigate = useNavigate()

  // Inyectar Google Fonts
  useEffect(() => {
    if (!document.getElementById('gfont-inter')) {
      const preconn1 = document.createElement('link')
      preconn1.rel = 'preconnect'
      preconn1.href = 'https://fonts.googleapis.com'
      document.head.appendChild(preconn1)

      const preconn2 = document.createElement('link')
      preconn2.rel = 'preconnect'
      preconn2.href = 'https://fonts.gstatic.com'
      preconn2.crossOrigin = 'anonymous'
      document.head.appendChild(preconn2)

      const link  = document.createElement('link')
      link.id     = 'gfont-inter'
      link.rel    = 'stylesheet'
      link.href   = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
      document.head.appendChild(link)
    }
  }, [])

  // Interceptar clicks en links internos (/login, /registro) para React Router
  useEffect(() => {
    const el = ref.current
    if (!el) return
    function onClick(e) {
      const a = e.target.closest('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (href && href.startsWith('/') && !href.startsWith('//')) {
        e.preventDefault()
        navigate(href)
      }
    }
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [navigate])

  const [mostrarVolver,  setMostrarVolver]  = useState(false)
  const [seccionActiva,  setSeccionActiva]  = useState('top')

  // Scroll → mostrar botón volver arriba + detectar sección activa
  useEffect(() => {
    const SECCIONES = [
      { id: 'top',       label: 'Inicio' },
      { id: 'nosotros',  label: 'Nosotros' },
      { id: 'modulos',   label: 'Módulos' },
      { id: 'arca',      label: 'Facturación' },
      { id: 'planes',    label: 'Planes' },
      { id: 'descarga',  label: 'Descarga' },
    ]

    const onScroll = () => setMostrarVolver(window.scrollY > 420)
    window.addEventListener('scroll', onScroll, { passive: true })

    // IntersectionObserver por sección
    const observers = []
    const activate = (id) => setSeccionActiva(id)
    SECCIONES.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) activate(id) },
        { rootMargin: '-40% 0px -55% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
      observers.forEach(o => o.disconnect())
    }
  }, [])

  const SECCIONES_NAV = [
    { id: 'top',       label: 'Inicio'       },
    { id: 'nosotros',  label: 'Quiénes somos'},
    { id: 'modulos',   label: 'Módulos'      },
    { id: 'arca',      label: 'Facturación'  },
    { id: 'planes',    label: 'Planes'       },
    { id: 'descarga',  label: 'Descargar'   },
  ]

  function irA(id) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <style>{ESTILOS}</style>
      <div ref={ref} dangerouslySetInnerHTML={{ __html: HTML }} />

      {/* ── Botón volver arriba ── */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Volver arriba"
        className={`lp-volver${mostrarVolver ? ' visible' : ''}`}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 200,
          width: 44, height: 44, borderRadius: '50%',
          background: '#2563eb', color: '#fff',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(37,99,235,.45)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6"/>
        </svg>
      </button>

      {/* ── Side-nav: dots de sección (solo desktop) ── */}
      <nav
        className="lp-dot-nav"
        style={{
          position: 'fixed', right: 20, top: '50%', transform: 'translateY(-50%)',
          zIndex: 200, flexDirection: 'column', gap: 10, alignItems: 'flex-end',
        }}
      >
        {SECCIONES_NAV.map(({ id, label }) => {
          const activa = seccionActiva === id
          return (
            <div
              key={id}
              className="lp-dot-wrap"
              style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
            >
              <span className="lp-dot-tip">{label}</span>
              <button
                onClick={() => irA(id)}
                title={label}
                style={{
                  width:  activa ? 14 : 8,
                  height: activa ? 14 : 8,
                  borderRadius: '50%',
                  background: activa ? '#2563eb' : 'rgba(37,99,235,0.28)',
                  border: activa ? '2px solid #2563eb' : '1.5px solid rgba(37,99,235,0.4)',
                  cursor: 'pointer', padding: 0,
                  transition: 'all .22s cubic-bezier(.4,0,.2,1)',
                  boxShadow: activa ? '0 0 0 3px rgba(37,99,235,.15)' : 'none',
                }}
              />
            </div>
          )
        })}
      </nav>
    </>
  )
}
