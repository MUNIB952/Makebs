import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles
import FirebaseProvider from '@/components/FirebaseProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Agentic Workspace',
  description: 'A multi-agent project workspace with chat, file management, and artifact viewing.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="font-sans antialiased bg-white text-zinc-900" suppressHydrationWarning>
        <FirebaseProvider>
          {children}
        </FirebaseProvider>
      </body>
    </html>
  );
}
