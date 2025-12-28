import type { Metadata } from 'next'
import { Cormorant_Garamond, Outfit } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Baggee - Hermès Birkin Price Guide & Database',
  description: 'Track real auction prices for Hermès Birkin bags. Fair value estimates, price trends, and comprehensive market data.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${outfit.variable} font-sans`}>
        {/* Navigation */}
        <nav className="bg-cream border-b border-blush/50">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="font-serif text-2xl font-semibold text-burgundy">
                Baggee
              </Link>
              <div className="flex items-center gap-6">
                <Link href="/browse" className="text-charcoal hover:text-burgundy transition-colors">
                  Browse
                </Link>
                <Link href="/trends" className="text-charcoal hover:text-burgundy transition-colors">
                  Trends
                </Link>
                <Link href="/guide" className="text-charcoal hover:text-burgundy transition-colors">
                  Price Guide
                </Link>
                <Link href="/estimate" className="bg-burgundy text-white px-4 py-2 rounded-full hover:bg-burgundy/90 transition-colors">
                  What's It Worth?
                </Link>
              </div>
            </div>
          </div>
        </nav>
        
        {children}
        
        {/* Footer */}
        <footer className="bg-charcoal text-white/60 py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="font-serif text-2xl text-white">Baggee</div>
              <div className="flex gap-8 text-sm">
                <Link href="/browse" className="hover:text-white transition-colors">Browse</Link>
                <Link href="/trends" className="hover:text-white transition-colors">Trends</Link>
                <Link href="/guide" className="hover:text-white transition-colors">Price Guide</Link>
                <Link href="/estimate" className="hover:text-white transition-colors">Estimate</Link>
              </div>
              <div className="text-sm">
                © 2025 Baggee
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
