'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignOutPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/') }, [router])
  return <p style={{ padding: 40 }}>Signing out...</p>
}
