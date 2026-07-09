import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useStockAlertas() {
  const { perfil } = useAuth()
  const [alertas, setAlertas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => { if (perfil?.comercio_id) cargar() }, [perfil?.comercio_id])

  async function cargar() {
    const { data } = await supabase
      .from('productos')
      .select('id, nombre, stock_actual, stock_minimo, unidad, categorias(nombre)')
      .eq('comercio_id', perfil.comercio_id)
      .eq('activo', true)
      .order('stock_actual')

    const filtradas = (data ?? []).filter(p =>
      Number(p.stock_actual) <= 0 ||
      (Number(p.stock_minimo) > 0 && Number(p.stock_actual) <= Number(p.stock_minimo))
    )
    setAlertas(filtradas)
    setCargando(false)
  }

  const sinStock  = alertas.filter(p => Number(p.stock_actual) <= 0)
  const bajoStock = alertas.filter(p => Number(p.stock_actual) > 0)

  return { alertas, sinStock, bajoStock, cargando }
}
