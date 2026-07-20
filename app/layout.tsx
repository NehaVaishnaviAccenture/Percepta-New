import { ClerkProvider } from '@clerk/nextjs'
import './globals.css';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        </head>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
