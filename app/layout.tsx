import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Baggee — Luxury Handbag Price Guide',
  description: 'The most comprehensive price guide for Hermès, Dior, and luxury vintage handbags.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-4 flex justify-between items-center bg-cream/90 backdrop-blur-xl border-b border-gold-light">
          <Link href="/" className="font-serif text-2xl font-semibold text-burgundy tracking-wider">
            baggee<span className="text-gold">.</span>
          </Link>
          
          <div className="hidden md:flex gap-10">
            <Link href="/guide" className="text-charcoal hover:text-burgundy transition-colors text-sm tracking-wide">
              Price Guide
            </Link>
            <Link href="/browse" className="text-charcoal hover:text-burgundy transition-colors text-sm tracking-wide">
              Browse
            </Link>
            <Link href="/trends" className="text-charcoal hover:text-burgundy transition-colors text-sm tracking-wide">
              Trends
            </Link>
          </div>

          <Link 
            href="/closet" 
            className="bg-burgundy text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-charcoal transition-all hover:-translate-y-0.5"
          >
            👜 My Closet
          </Link>
        </nav>

        <main className="pt-20">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-charcoal text-white py-16 px-6 md:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <div className="font-serif text-2xl font-semibold mb-4">
                baggee<span className="text-gold">.</span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                The ultimate price guide for luxury handbag collectors. Track values, build your portfolio, and never overpay again.
              </p>
            </div>
            
            <div>
              <h4 className="font-serif text-lg mb-4">Browse</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li><Link href="/browse?model=birkin" className="hover:text-gold transition-colors">Hermès Birkin</Link></li>
                <li><Link href="/browse?model=kelly" className="hover:text-gold transition-colors">Hermès Kelly</Link></li>
                <li><Link href="/browse" className="hover:text-gold transition-colors">All Bags</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-serif text-lg mb-4">Resources</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li><Link href="/guide" className="hover:text-gold transition-colors">Price Guide</Link></li>
                <li><Link href="/trends" className="hover:text-gold transition-colors">Trends</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-serif text-lg mb-4">Contact</h4>
              <p className="text-white/70 text-sm">Coming soon: baggee.com</p>
            </div>
          </div>
          
          <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-white/10 text-center text-white/50 text-sm">
            © 2025 Baggee. Made with 💕 for bag lovers everywhere.
          </div>
        </footer>
      </body>
    </html>
  )
}
