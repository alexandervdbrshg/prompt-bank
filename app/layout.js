import './globals.css'

export const metadata = {
  title: 'Prompt Bank',
  description: 'Team collection of working prompts',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
