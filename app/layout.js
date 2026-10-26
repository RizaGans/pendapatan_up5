import './globals.css';

export const metadata = {
  title: 'PLN UP5 | Sistem Pendapatan Regional 5',
  applicationName: 'PLN UP5',
  description: 'Sistem pemantauan pendapatan dan penagihan PLN UP5.',
  icons: { icon: '/pln-logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Urbanist:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
