import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Learnspace — distraction-free learning workspace',
    template: '%s · Learnspace',
  },
  description:
    'A learning workspace for students. No recommendations, no autoplay, no feeds — only what you intentionally choose to study.',
  applicationName: 'Learnspace',
  authors: [{ name: 'Learnspace Contributors' }],
  keywords: ['learning', 'study', 'distraction-free', 'students', 'YouTube', 'open source'],
  openGraph: {
    type: 'website',
    title: 'Learnspace — distraction-free learning workspace',
    description:
      'A learning workspace for students. No recommendations, no autoplay, no feeds.',
    siteName: 'Learnspace',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learnspace',
    description: 'Distraction-free learning workspace for students.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
