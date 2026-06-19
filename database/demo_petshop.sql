-- ============================================================
-- CajaPro — Datos de demo: Pet Shop "Huella Feliz"
-- Ejecutar en: Supabase > SQL Editor (con sesión iniciada)
-- Inserta datos para el comercio del usuario autenticado.
-- ============================================================

DO $$
DECLARE
  v_cid          UUID := (SELECT id FROM public.comercios WHERE activo = true ORDER BY created_at LIMIT 1);

  -- Categorías de productos
  v_cat_alimento UUID;
  v_cat_acceso   UUID;
  v_cat_anti     UUID;
  v_cat_arena    UUID;
  v_cat_juguete  UUID;

  -- Proveedores
  v_prov_probal  UUID;
  v_prov_petmundo UUID;
  v_prov_vetline UUID;
  v_prov_arena   UUID;

  -- Categorías de gastos
  v_cg_servicios UUID;
  v_cg_alquiler  UUID;
  v_cg_personal  UUID;
  v_cg_limpieza  UUID;
  v_cg_packaging UUID;
  v_cg_mantenim  UUID;

BEGIN

  IF v_cid IS NULL THEN
    RAISE EXCEPTION 'No hay ningún comercio registrado. Creá tu cuenta en la app primero.';
  END IF;

  -- --------------------------------------------------------
  -- CATEGORÍAS DE PRODUCTOS
  -- --------------------------------------------------------
  INSERT INTO categorias (comercio_id, nombre, descripcion)
    VALUES (v_cid, 'Alimento Balanceado', 'Alimentos secos y húmedos para perros y gatos')
    RETURNING id INTO v_cat_alimento;

  INSERT INTO categorias (comercio_id, nombre, descripcion)
    VALUES (v_cid, 'Accesorios', 'Collares, correas, camas, comederos y más')
    RETURNING id INTO v_cat_acceso;

  INSERT INTO categorias (comercio_id, nombre, descripcion)
    VALUES (v_cid, 'Antiparasitarios', 'Pipetas, comprimidos y sprays antipulgas y garrapaticidas')
    RETURNING id INTO v_cat_anti;

  INSERT INTO categorias (comercio_id, nombre, descripcion)
    VALUES (v_cid, 'Arena Sanitaria', 'Arenas para gatos: sílica, bentonita y biodegradables')
    RETURNING id INTO v_cat_arena;

  INSERT INTO categorias (comercio_id, nombre, descripcion)
    VALUES (v_cid, 'Juguetes', 'Juguetes interactivos para perros y gatos')
    RETURNING id INTO v_cat_juguete;

  -- --------------------------------------------------------
  -- PROVEEDORES
  -- --------------------------------------------------------
  INSERT INTO proveedores (comercio_id, nombre, contacto, telefono, email)
    VALUES (v_cid, 'ProBalance S.A.', 'Sergio Giménez', '011-4555-0101', 'ventas@probalance.com.ar')
    RETURNING id INTO v_prov_probal;

  INSERT INTO proveedores (comercio_id, nombre, contacto, telefono, email)
    VALUES (v_cid, 'PetMundo S.A.', 'Valeria Romero', '011-4555-0202', 'distribuidora@petmundo.com.ar')
    RETURNING id INTO v_prov_petmundo;

  INSERT INTO proveedores (comercio_id, nombre, contacto, telefono, email)
    VALUES (v_cid, 'VetLine S.A.', 'Marcelo Torres', '011-4555-0303', 'pedidos@vetline.com.ar')
    RETURNING id INTO v_prov_vetline;

  INSERT INTO proveedores (comercio_id, nombre, contacto, telefono, email)
    VALUES (v_cid, 'Arena del Sur S.A.', 'Claudia Benítez', '011-4555-0404', 'ventas@arenadelsur.com.ar')
    RETURNING id INTO v_prov_arena;

  -- --------------------------------------------------------
  -- PRODUCTOS — Alimento Balanceado
  -- --------------------------------------------------------
  INSERT INTO productos (comercio_id, categoria_id, proveedor_id, codigo_barras, nombre, precio_venta, precio_costo, stock_actual, stock_minimo, unidad)
  VALUES
    (v_cid, v_cat_alimento, v_prov_probal,  '7790001000011', 'Biopet Perro Adulto 15 kg',         28500, 18000, 25, 5, 'bolsa'),
    (v_cid, v_cat_alimento, v_prov_probal,  '7790001000012', 'Biopet Perro Cachorro 7.5 kg',      16900, 10500, 18, 4, 'bolsa'),
    (v_cid, v_cat_alimento, v_prov_probal,  '7790001000013', 'Biopet Gato Adulto 7.5 kg',         17500, 11000, 20, 5, 'bolsa'),
    (v_cid, v_cat_alimento, v_prov_probal,  '7790001000014', 'Dog Chow Cachorros 21 kg',          38000, 25000,  8, 3, 'bolsa'),
    (v_cid, v_cat_alimento, v_prov_probal,  '7790001000015', 'Purina Cat Chow Adulto 8 kg',       19800, 12500, 20, 5, 'bolsa'),
    (v_cid, v_cat_alimento, v_prov_probal,  '7790001000016', 'Royal Canin Maxi Adulto 15 kg',     45000, 30000, 12, 3, 'bolsa'),
    (v_cid, v_cat_alimento, v_prov_probal,  '7790001000017', 'Excellent Gato Adulto 10 kg',       22500, 14000, 15, 4, 'bolsa'),
    (v_cid, v_cat_alimento, v_prov_probal,  '7790001000018', 'Excellent Perro Adulto Razas Medianas 20 kg', 32000, 21000, 10, 3, 'bolsa');

  -- --------------------------------------------------------
  -- PRODUCTOS — Accesorios
  -- --------------------------------------------------------
  INSERT INTO productos (comercio_id, categoria_id, proveedor_id, codigo_barras, nombre, precio_venta, precio_costo, stock_actual, stock_minimo, unidad)
  VALUES
    (v_cid, v_cat_acceso, v_prov_petmundo, '7790002000021', 'Collar ajustable perro mediano',     2800,  1500, 35, 8, 'unidad'),
    (v_cid, v_cat_acceso, v_prov_petmundo, '7790002000022', 'Collar nylon gato con cascabel',     1900,   950, 30, 8, 'unidad'),
    (v_cid, v_cat_acceso, v_prov_petmundo, '7790002000023', 'Correa retráctil 5 m',              5500,  3200, 20, 5, 'unidad'),
    (v_cid, v_cat_acceso, v_prov_petmundo, '7790002000024', 'Correa cuero trenzada 1.2 m',       3800,  2100, 25, 6, 'unidad'),
    (v_cid, v_cat_acceso, v_prov_petmundo, '7790002000025', 'Cama acolchada talle M',            8900,  5500, 15, 4, 'unidad'),
    (v_cid, v_cat_acceso, v_prov_petmundo, '7790002000026', 'Cama cueva polar gato',             7200,  4400, 12, 3, 'unidad'),
    (v_cid, v_cat_acceso, v_prov_petmundo, '7790002000027', 'Comedero doble acero inox',         3200,  1800, 28, 6, 'unidad'),
    (v_cid, v_cat_acceso, v_prov_petmundo, '7790002000028', 'Bebedero automático 1.5 L',         6800,  4200, 12, 3, 'unidad'),
    (v_cid, v_cat_acceso, v_prov_petmundo, '7790002000029', 'Transportín plástico talle S',     12500,  8000,  8, 2, 'unidad'),
    (v_cid, v_cat_acceso, v_prov_petmundo, '7790002000030', 'Jaula plegable talle M',           18900, 12000,  6, 2, 'unidad'),
    (v_cid, v_cat_acceso, v_prov_petmundo, '7790002000031', 'Ropa impermeable perro talle M',    4500,  2600, 10, 3, 'unidad');

  -- --------------------------------------------------------
  -- PRODUCTOS — Antiparasitarios
  -- --------------------------------------------------------
  INSERT INTO productos (comercio_id, categoria_id, proveedor_id, codigo_barras, nombre, precio_venta, precio_costo, stock_actual, stock_minimo, unidad)
  VALUES
    (v_cid, v_cat_anti, v_prov_vetline, '7790003000041', 'Frontline Plus Perros 1-10 kg (3 pipetas)',    8500, 5500, 30, 8, 'caja'),
    (v_cid, v_cat_anti, v_prov_vetline, '7790003000042', 'Frontline Plus Perros 10-20 kg (3 pipetas)',   9800, 6500, 25, 6, 'caja'),
    (v_cid, v_cat_anti, v_prov_vetline, '7790003000043', 'Frontline Plus Perros 20-40 kg (3 pipetas)',  10500, 7000, 20, 5, 'caja'),
    (v_cid, v_cat_anti, v_prov_vetline, '7790003000044', 'Frontline Gatos (3 pipetas)',                  8200, 5200, 20, 5, 'caja'),
    (v_cid, v_cat_anti, v_prov_vetline, '7790003000045', 'Bravecto Perros 2-4.5 kg',                   12500, 8500, 15, 4, 'caja'),
    (v_cid, v_cat_anti, v_prov_vetline, '7790003000046', 'Bravecto Perros 4.5-10 kg',                  13800, 9200, 12, 3, 'caja'),
    (v_cid, v_cat_anti, v_prov_vetline, '7790003000047', 'Nexgard Perros 4-10 kg (3 comp.)',             7800, 5000, 20, 5, 'caja'),
    (v_cid, v_cat_anti, v_prov_vetline, '7790003000048', 'Antipulgas spray ambiental 500 ml',            4500, 2800, 18, 5, 'unidad');

  -- --------------------------------------------------------
  -- PRODUCTOS — Arena Sanitaria
  -- --------------------------------------------------------
  INSERT INTO productos (comercio_id, categoria_id, proveedor_id, codigo_barras, nombre, precio_venta, precio_costo, stock_actual, stock_minimo, unidad)
  VALUES
    (v_cid, v_cat_arena, v_prov_arena, '7790004000061', 'Arena sílica gel cristales 3.8 L',         5800, 3500, 40, 10, 'bolsa'),
    (v_cid, v_cat_arena, v_prov_arena, '7790004000062', 'Arena aglomerante bentonita 5 kg',         3200, 1800, 50, 12, 'bolsa'),
    (v_cid, v_cat_arena, v_prov_arena, '7790004000063', 'Arena aglomerante bentonita 10 kg',        5800, 3200, 35, 8,  'bolsa'),
    (v_cid, v_cat_arena, v_prov_arena, '7790004000064', 'Arena biodegradable de pino 4.5 kg',       4100, 2400, 35, 8,  'bolsa'),
    (v_cid, v_cat_arena, v_prov_arena, '7790004000065', 'Arena perfumada lavanda 5 kg',             3800, 2200, 30, 8,  'bolsa'),
    (v_cid, v_cat_arena, v_prov_arena, '7790004000066', 'Arena carbon activado 5 kg',               4600, 2700, 25, 6,  'bolsa');

  -- --------------------------------------------------------
  -- PRODUCTOS — Juguetes
  -- --------------------------------------------------------
  INSERT INTO productos (comercio_id, categoria_id, proveedor_id, codigo_barras, nombre, precio_venta, precio_costo, stock_actual, stock_minimo, unidad)
  VALUES
    (v_cid, v_cat_juguete, v_prov_petmundo, '7790005000081', 'Pelota goma con silbato',              1200,  650, 40, 10, 'unidad'),
    (v_cid, v_cat_juguete, v_prov_petmundo, '7790005000082', 'Kong Classic talle M',                 3800, 2200, 20,  5, 'unidad'),
    (v_cid, v_cat_juguete, v_prov_petmundo, '7790005000083', 'Cuerda trenzada masticable',           1800,  900, 30,  8, 'unidad'),
    (v_cid, v_cat_juguete, v_prov_petmundo, '7790005000084', 'Varita interactiva plumas gato',       2100, 1100, 25,  6, 'unidad'),
    (v_cid, v_cat_juguete, v_prov_petmundo, '7790005000085', 'Ratón de tela con catnip',              980,  520, 35,  8, 'unidad'),
    (v_cid, v_cat_juguete, v_prov_petmundo, '7790005000086', 'Túnel de tela plegable gato',          4500, 2600, 12,  3, 'unidad'),
    (v_cid, v_cat_juguete, v_prov_petmundo, '7790005000087', 'Frisbee resistente perro',             2500, 1400, 20,  5, 'unidad'),
    (v_cid, v_cat_juguete, v_prov_petmundo, '7790005000088', 'Pelota dispensadora snacks',           3200, 1800, 15,  4, 'unidad');

  -- --------------------------------------------------------
  -- CATEGORÍAS DE GASTOS
  -- --------------------------------------------------------
  INSERT INTO categorias_gastos (comercio_id, nombre, descripcion)
    VALUES (v_cid, 'Servicios', 'Luz, agua, gas e internet')
    RETURNING id INTO v_cg_servicios;

  INSERT INTO categorias_gastos (comercio_id, nombre, descripcion)
    VALUES (v_cid, 'Alquiler', 'Alquiler mensual del local')
    RETURNING id INTO v_cg_alquiler;

  INSERT INTO categorias_gastos (comercio_id, nombre, descripcion)
    VALUES (v_cid, 'Personal', 'Sueldos y jornales')
    RETURNING id INTO v_cg_personal;

  INSERT INTO categorias_gastos (comercio_id, nombre, descripcion)
    VALUES (v_cid, 'Limpieza e Higiene', 'Productos de limpieza y desinfección del local')
    RETURNING id INTO v_cg_limpieza;

  INSERT INTO categorias_gastos (comercio_id, nombre, descripcion)
    VALUES (v_cid, 'Packaging y Bolsas', 'Bolsas, papel de regalo y materiales de empaque')
    RETURNING id INTO v_cg_packaging;

  INSERT INTO categorias_gastos (comercio_id, nombre, descripcion)
    VALUES (v_cid, 'Mantenimiento', 'Reparaciones y mantenimiento del local y equipos')
    RETURNING id INTO v_cg_mantenim;

  RAISE NOTICE '✅ Datos de demo cargados para el comercio %', v_cid;
  RAISE NOTICE '   Categorías de productos: 5';
  RAISE NOTICE '   Proveedores: 4';
  RAISE NOTICE '   Productos: 41';
  RAISE NOTICE '   Categorías de gastos: 6';

END;
$$;
