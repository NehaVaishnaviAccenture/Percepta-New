'use client'
import { useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'

export default function SignOutPage() {
  const { signOut } = useClerk()
    useEffect(() => { signOut({ redirectUrl: '/' }) }, [])
  return <p style={{ padding: 40 }}>Signing out...</p>
}
