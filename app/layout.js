import './globals.css';

export const metadata = { title: 'Pendapatan Project Regional 5' };

export default function RootLayout({ children }) {
  return (
    <html lang="id" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
