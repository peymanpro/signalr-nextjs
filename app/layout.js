import './globals.css'

export const metadata = {
  title: 'SignalR Chat Client | Next.js',
  description: 'Real-time chat client with SignalR and Next.js',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}