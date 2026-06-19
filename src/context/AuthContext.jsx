import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesion,   setSesion]   = useState(null)
  const [perfil,   setPerfil]   = useState(null)
  const [comercio, setComercio] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSesion(session)
      if (session) await cargarPerfil(session.user.id)
      setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (evento, session) => {
        setSesion(session)
        if (session) {
          await cargarPerfil(session.user.id)
        } else {
          setPerfil(null)
          setComercio(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function cargarPerfil(authUserId) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*, comercios(id, nombre, domicilio, telefono, email, cuit, logo_url, banner_url, color_tema, modulos, modulos_permitidos, rubro, tipo_perfil)')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (error) {
      console.error('cargarPerfil error:', error.message)
      const { data: dataFallback } = await supabase
        .from('usuarios')
        .select('*, comercios(id, nombre, domicilio, telefono, email, cuit, logo_url, banner_url, color_tema, modulos)')
        .eq('auth_user_id', authUserId)
        .maybeSingle()
      if (!dataFallback || !dataFallback.activo) {
        await supabase.auth.signOut()
        return
      }
      const { comercios: comercioData, ...perfilData } = dataFallback
      setPerfil(perfilData)
      setComercio(comercioData ?? null)
      return
    }

    if (!data || !data.activo) {
      await supabase.auth.signOut()
      return
    }

    const { comercios: comercioData, ...perfilData } = data
    setPerfil(perfilData)
    setComercio(comercioData ?? null)
  }

  async function refrescarComercio() {
    if (!perfil?.comercio_id) return
    const { data } = await supabase
      .from('comercios')
      .select('id, nombre, domicilio, telefono, email, cuit, logo_url, banner_url, color_tema, modulos, modulos_permitidos, rubro, tipo_perfil')
      .eq('id', perfil.comercio_id)
      .maybeSingle()
    if (data) setComercio(data)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  const value = {
    sesion,
    perfil,
    comercio,
    cargando,
    refrescarComercio,
    cerrarSesion,
    esSuperAdmin: perfil?.rol === 'superadmin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
