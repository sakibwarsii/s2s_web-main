import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Signova - AI Real-Time Sign Language Platform",
  description: "Empowering education with AI Speech-to-Sign translation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link
          rel="stylesheet"
          href="https://vhg.cmp.uea.ac.uk/tech/jas/vhg2021/cwa/cwasa.css"
        />
        {/* CWASA's stylesheet above sets `html, body { background-color: #eee }`
            as its own page reset — it was built assuming it's the only
            stylesheet on the page. It's loaded via a plain <link>, so it's
            NOT inside any Tailwind CSS layer, and per the Cascade Layers
            spec, unlayered rules always beat layered ones regardless of
            specificity or source order. That means this one rule was
            silently overriding every layered Tailwind rule trying to make
            the body black (globals.css's @layer base rule, and the
            bg-black utility class below) — on every page. This is the
            actual cause of the whole site rendering as washed-out light
            gray instead of black. Fix: our own unlayered override, with
            !important so it wins regardless of exact injection order. */}
        <style>{`
          html, body {
            background-color: #38bdf8 !important;
            background: linear-gradient(180deg, #38bdf8 0%, #0ea5e9 45%, #0284c7 100%) fixed !important;
          }
        `}</style>
      </head>
      <body className={`${inter.className} text-white relative min-h-screen overflow-x-hidden selection:bg-sky-400/30`}>
        {/* Sky Blue Background Layer */}
        <div 
          className="fixed inset-0 pointer-events-none -z-50"
          style={{
            background: 'linear-gradient(180deg, #38bdf8 0%, #0ea5e9 45%, #0284c7 100%)'
          }}
        />
        
        <div className="relative z-0 min-h-screen flex flex-col">
          {children}
        </div>
        {/* Load CWASA engine — served locally (public/cwasa.js) instead of
            the external vhg.cmp.uea.ac.uk server. That server timed out
            entirely during testing, and since this script loads with
            strategy="beforeInteractive" (blocks the whole app until it's
            in), any outage there took the avatar down completely with zero
            error surfaced anywhere obvious — this was a genuine single point
            of failure on a third party server this app has no control over,
            not a bug in anything built this session. A matching local copy
            was already sitting in web/cwasa.js; just needed to be in
            public/ and referenced locally to remove that dependency. */}
        <Script
          src="/cwasa.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
