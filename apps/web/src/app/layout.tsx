import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AIOSv2 Integration',
  description: 'AIOS Unified Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
