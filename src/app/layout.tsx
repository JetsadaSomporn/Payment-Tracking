import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const notoThai = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

import { AuthProvider } from "@/providers/auth-provider";
import ClientProviders from "@/components/client-providers";

export const metadata: Metadata = {
  title: "Spendly",
  description: "Track Thai bank slip expenses with a confirmation-first flow.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`h-full antialiased ${inter.variable} ${notoThai.variable} ${robotoMono.variable}`}
    >
      <body className="min-h-full">
        {/* Anti-FOUC: restore saved theme before first paint */}
        <script
          suppressHydrationWarning
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('spendly-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
        <AuthProvider>
          <ClientProviders>
            {children}
          </ClientProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
