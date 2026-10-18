import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Stereobliss Retail - Musical Instrument & Audio Inventory',
  description: 'Stereobliss Retail inventory, musical instruments, and stock tracking system.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Prevent Flash of Incorrect Theme on initial render */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = localStorage.getItem('stereobliss_theme') || localStorage.getItem('soundstock_theme');
                if (savedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="font-['Plus_Jakarta_Sans',sans-serif] bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 min-h-screen transition-colors duration-150">
        <ThemeProvider>
          <AuthProvider>
            <SettingsProvider>
              <AppShell>{children}</AppShell>
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
