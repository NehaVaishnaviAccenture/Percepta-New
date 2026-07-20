'use client';
import { useRef } from 'react';
import { useUser, SignInButton, UserButton } from '@clerk/nextjs';

export default function NavAuthPill() {
  const { isLoaded, isSignedIn, user } = useUser();
  const avatarRef = useRef<HTMLDivElement>(null);

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="navSignInBtn">Sign in</button>
      </SignInButton>
    );
  }

  const email = user.primaryEmailAddress?.emailAddress ?? user.username ?? '';

  function triggerUserButton() {
    avatarRef.current?.querySelector('button')?.click();
  }

  return (
    <div className="navUserPill">
      <span className="navUserEmail" onClick={triggerUserButton} style={{ cursor: 'pointer' }}>
        {email}
      </span>
      <div className="navUserAvatar" ref={avatarRef}>
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}
