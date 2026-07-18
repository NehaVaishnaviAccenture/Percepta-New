'use client';
import { useUser } from '@clerk/nextjs';
import { SignInButton } from '@clerk/nextjs';

export default function NavAuthPill() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="navSignInBtn">Sign in</button>
      </SignInButton>
    );
  }

  const email = user.primaryEmailAddress?.emailAddress ?? user.username ?? '';
  const imageUrl = user.imageUrl;
  const initials = (user.firstName?.[0] ?? user.username?.[0] ?? email[0] ?? '?').toUpperCase();

  return (
    <div className="navUserPill">
      <span className="navUserEmail">{email}</span>
      <div className="navUserAvatar">
        {imageUrl
          ? <img src={imageUrl} alt={initials} className="navUserAvatarImg" />
          : <span className="navUserAvatarInitials">{initials}</span>
        }
      </div>
    </div>
  );
}
