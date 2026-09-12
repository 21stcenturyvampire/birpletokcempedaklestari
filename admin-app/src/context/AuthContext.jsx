import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const muatProfil = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nama_lengkap, role')
      .eq('id', userId)
      .single()
    if (!error) setProfile(data)
  }, [])

  useEffect(() => {
    let aktif = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!aktif) return
      setSession(data.session)
      await muatProfil(data.session?.user?.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      await muatProfil(newSession?.user?.id)
    })

    return () => {
      aktif = false
      listener.subscription.unsubscribe()
    }
  }, [muatProfil])

  const masuk = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }

  const keluar = async () => {
    await supabase.auth.signOut()
  }

  const isSuperAdmin = profile?.role === 'super_admin'

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, masuk, keluar, isSuperAdmin, refreshProfil: () => muatProfil(session?.user?.id) }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}
