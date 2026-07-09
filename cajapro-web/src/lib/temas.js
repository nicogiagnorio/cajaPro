// Paletas de color disponibles para cada comercio.
// Se usan clases Tailwind estáticas para que el compilador las incluya en el bundle.
export const TEMAS = {
  azul:    { nombre: 'Azul',    activo: 'bg-blue-600',    hover: 'hover:bg-blue-700',    acento: 'text-blue-400',    avatar: 'bg-blue-600',    muestra: 'bg-blue-500'    },
  verde:   { nombre: 'Verde',   activo: 'bg-emerald-600', hover: 'hover:bg-emerald-700', acento: 'text-emerald-400', avatar: 'bg-emerald-600', muestra: 'bg-emerald-500' },
  violeta: { nombre: 'Violeta', activo: 'bg-violet-600',  hover: 'hover:bg-violet-700',  acento: 'text-violet-400',  avatar: 'bg-violet-600',  muestra: 'bg-violet-500'  },
  naranja: { nombre: 'Naranja', activo: 'bg-orange-600',  hover: 'hover:bg-orange-700',  acento: 'text-orange-400',  avatar: 'bg-orange-600',  muestra: 'bg-orange-500'  },
  rojo:    { nombre: 'Rojo',    activo: 'bg-red-600',     hover: 'hover:bg-red-700',     acento: 'text-red-400',     avatar: 'bg-red-600',     muestra: 'bg-red-500'     },
  rosa:    { nombre: 'Rosa',    activo: 'bg-pink-600',    hover: 'hover:bg-pink-700',    acento: 'text-pink-400',    avatar: 'bg-pink-600',    muestra: 'bg-pink-500'    },
  cyan:    { nombre: 'Cyan',    activo: 'bg-cyan-600',    hover: 'hover:bg-cyan-700',    acento: 'text-cyan-400',    avatar: 'bg-cyan-600',    muestra: 'bg-cyan-500'    },
  dorado:  { nombre: 'Dorado',  activo: 'bg-amber-500',   hover: 'hover:bg-amber-600',   acento: 'text-amber-400',   avatar: 'bg-amber-500',   muestra: 'bg-amber-400'   },
}

export function getTema(colorTema) {
  return TEMAS[colorTema] ?? TEMAS.azul
}
