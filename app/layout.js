import './globals.css'

export const metadata = {
  title: 'Prompt Bank',
  description: 'Team collection of working prompts',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}



