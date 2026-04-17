import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nucleus',
  description: 'Nucleus — PI Planning data platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Nav/sidebar not yet built — add in a dedicated navigation session.
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
