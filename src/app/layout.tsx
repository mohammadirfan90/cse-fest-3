import type { Metadata } from "next";
import { Agentation } from "agentation";
import { Space_Grotesk, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://csefest.smuct.ac.bd";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CSE Fest 2026 — SMUCT Technology Festival",
    template: "%s | CSE Fest 2026",
  },
  description:
    "The official management platform for CSE Fest 2026 at Shanto-Mariam University of Creative Technology. Register teams, submit proposals, track results, and showcase innovation.",
  keywords: [
    "CSE Fest",
    "SMUCT",
    "technology festival",
    "hackathon",
    "competitive programming",
    "CSE competition",
    "Bangladesh tech fest",
  ],
  authors: [{ name: "CSE & CSIT Department, SMUCT" }],
  icons: {
    icon: "/festlogo.png",
    shortcut: "/festlogo.png",
    apple: "/festlogo.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_BD",
    url: SITE_URL,
    siteName: "CSE Fest 2026",
    title: "CSE Fest 2026 — SMUCT Technology Festival",
    description:
      "Join Bangladesh's premier university technology festival. Compete in Software Showcase, IoT, Datathon, CTF, Robo Soccer, and more.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CSE Fest 2026 — SMUCT Technology Festival",
    description:
      "Join Bangladesh's premier university technology festival — July 18, 2026.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Pre-paint theme initializer (root).
          This script runs in <head>, before any body markup is parsed
          or any React hydration occurs, eliminating flash-of-light-content.

          The `(public)` route group ships its *own* initializer in its
          layout that runs immediately after this one and writes the
          final `theme_public` value. Nested groups win when they exist,
          so the public site defaults to dark regardless of what this
          script decides. For dashboard/admin/auth, this script is the
          authority: default light, override via the `theme` key.
        */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  // If the public route group has already set the
                  // attribute, defer entirely to it.
                  if (document.documentElement.hasAttribute('data-public-theme')) {
                    return;
                  }
                  var theme = localStorage.getItem('theme') || 'light';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {
                  /* localStorage unavailable: leave classes as SSR rendered them */
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-neutral-950 text-neutral-50 font-sans antialiased flex flex-col" suppressHydrationWarning>
        {children}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
