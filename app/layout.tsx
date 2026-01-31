import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: {
        default: 'Periodic Test Peer Evaluation | MBBS',
        template: '%s | Periodic Test',
    },
    description:
        'A modern platform for MBBS periodic tests with blinded peer evaluation. Take tests, evaluate peers, and track your progress.',
    keywords: [
        'MBBS',
        'periodic test',
        'peer evaluation',
        'medical education',
        'assessment',
        'CBME',
        'RGUHS',
    ],
    authors: [{ name: 'Medical Education Team' }],
    creator: 'Periodic Test Peer Evaluation App',
    publisher: 'Periodic Test Peer Evaluation App',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL(
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    ),
    openGraph: {
        type: 'website',
        locale: 'en_US',
        siteName: 'Periodic Test Peer Evaluation',
        title: 'Periodic Test Peer Evaluation | MBBS',
        description:
            'A modern platform for MBBS periodic tests with blinded peer evaluation.',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Periodic Test Peer Evaluation | MBBS',
        description:
            'A modern platform for MBBS periodic tests with blinded peer evaluation.',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    manifest: '/manifest.json',
    icons: {
        icon: [
            { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        apple: [
            { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Periodic Test',
    },
};

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
    ],
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
            </head>
            <body
                className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
            >
                <Providers>
                    <div className="relative min-h-screen flex flex-col">
                        {children}
                    </div>
                    <Toaster />
                </Providers>
            </body>
        </html>
    );
}
