import type { LinksFunction } from 'react-router';
import { Links, Meta, Outlet, Scripts } from 'react-router';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '~/components/ui/sonner';
import appStylesHref from './app.css?url';

export const links: LinksFunction = () => [
  { rel: 'icon', type: 'image/svg+xml', href: 'vite.svg' },
  { rel: 'stylesheet', href: appStylesHref },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Siri Color Picker</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Outlet />
      <Toaster position="bottom-center" />
    </ThemeProvider>
  );
}
