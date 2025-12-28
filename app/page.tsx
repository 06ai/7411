import { supabase } from '@/lib/supabase'
import Link from 'next/link'

async function getRecentSales() {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      bags (
        *,
        brands (name),
        models (name)
      ),
      sources (name)
    `)
    .order('sale_date', { ascending: false })
    .limit(8)

  if (error) {
    console.error('Error fetching sales:', error)
    return []
  }
  return data || []
}

async function getStats() {
  const { data: salesData } = await supabase
    .from('sales')
    .select('sale_price')
  
  const { count: bagCount } = await supabase
    .from('bags')
    .select('*', { count: 'exact', head: true })

  const totalValue = salesData?.reduce((sum, s) => sum + Number(s.sale_price), 0) || 0
  
  return {
    totalBags: bagCount || 0,
    totalValue,
    avgPrice: salesData?.length ? Math.round(totalValue / salesData.length) : 0
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price)
}

export default async function Home() {
  const [recentSales, stats] = await Promise.all([
    getRecentSales(),
    getStats()
  ])

  return (
    <div>
      {/* Hero Section */}
      <section className="min-h-[90vh] flex items-center px-6 md:px-12 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-blush via-rose/50 to-transparent rounded-bl-[40%] opacity-50" />
        
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full text-sm text-burgundy mb-8 shadow-sm">
            ✨ Now tracking {stats.totalBags} luxury bags
          </div>
          
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium leading-tight mb-6">
            Know the <em className="text-burgundy italic">true value</em> of your collection
          </h1>
          
          <p className="text-xl text-warm-gray font-light mb-10 leading-relaxed">
            The most comprehensive price guide for Hermès, Dior, and luxury vintage handbags. 
            Track trends, build your portfolio, and never second-guess a price again.
          </p>

          {/* Search */}
          <div className="bg-white p-1.5 rounded-full flex shadow-xl max-w-xl">
            <input 
              type="text" 
              placeholder="Search by brand, model, color, size..."
              className="flex-1 px-6 py-4 text-base outline-none bg-transparent"
            />
            <Link 
              href="/browse"
              className="bg-gradient-to-r from-gold to-yellow-600 text-white px-8 py-4 rounded-full font-medium hover:scale-105 transition-transform"
            >
              Search
            </Link>
          </div>

          {/* Stats */}
          <div className="flex gap-12 mt-12">
            <div className="text-center">
              <div className="font-serif text-3xl font-semibold text-burgundy">
                {formatPrice(stats.totalValue)}
              </div>
              <div className="text-sm text-warm-gray uppercase tracking-wider mt-1">
                Sales Tracked
              </div>
            </div>
            <div className="text-center">
              <div className="font-serif text-3xl font-semibold text-burgundy">
                {stats.totalBags}
              </div>
              <div className="text-sm text-warm-gray uppercase tracking-wider mt-1">
                Bags
              </div>
            </div>
            <div className="text-center">
              <div className="font-serif text-3xl font-semibold text-burgundy">
                {formatPrice(stats.avgPrice)}
              </div>
              <div className="text-sm text-warm-gray uppercase tracking-wider mt-1">
                Avg Price
              </div>
            </div>
          </div>
        </div>

        {/* Floating bag visuals */}
        <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-64 h-64 bg-white rounded-3xl shadow-2xl p-6 animate-float">
              <div className="w-full h-full bg-gradient-to-br from-gold to-gold-light rounded-2xl flex items-center justify-center text-6xl">
                👜
              </div>
            </div>
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white rounded-3xl shadow-xl p-4 animate-float" style={{ animationDelay: '-2s' }}>
              <div className="w-full h-full bg-gradient-to-br from-burgundy to-rose rounded-2xl flex items-center justify-center text-4xl">
                👝
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Sales Section */}
      <section className="py-20 px-6 md:px-12 bg-soft-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-medium mb-4">
              Recent Sales
            </h2>
            <p className="text-warm-gray text-lg max-w-xl mx-auto">
              The latest auction results from Sotheby's, Christie's, and top resellers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentSales.map((sale: any) => (
              <Link 
                key={sale.id} 
                href={`/bag/${sale.bags.id}`}
                className="bag-card bg-white rounded-3xl overflow-hidden cursor-pointer"
              >
                {/* Image placeholder */}
                <div className="aspect-square bg-gradient-to-br from-blush to-cream relative">
                  <div className="absolute inset-0 flex items-center justify-center text-6xl">
                    {sale.bags.is_exotic ? '🐊' : '👜'}
                  </div>
                  
                  {/* Price trend badge */}
                  <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-xs font-semibold text-green-700">
                    {sale.sources?.name || 'Auction'}
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-xs uppercase tracking-widest text-gold font-semibold mb-1">
                    {sale.bags.brands?.name}
                  </div>
                  <div className="font-serif text-xl font-medium mb-1">
                    {sale.bags.models?.name} {sale.bags.size}
                  </div>
                  <div className="text-sm text-warm-gray mb-4">
                    {sale.bags.color} • {sale.bags.leather_type} • {sale.bags.hardware} HW • {sale.bags.year}
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-blush">
                    <div className="font-serif text-2xl font-semibold text-burgundy">
                      {formatPrice(sale.sale_price)}
                    </div>
                    <div className="text-xs text-warm-gray">
                      {new Date(sale.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link 
              href="/browse"
              className="inline-flex items-center gap-2 bg-burgundy text-white px-8 py-4 rounded-full font-medium hover:bg-charcoal transition-colors"
            >
              Browse All Bags →
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 md:px-12 bg-gradient-to-b from-cream to-blush">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-medium mb-4">
              Why Baggee?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-serif text-xl mb-2">Price Trends</h3>
              <p className="text-warm-gray text-sm">
                Track how values change over time. Perfect for timing your buy or sell.
              </p>
            </div>
            
            <div className="bg-white rounded-3xl p-8 text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="font-serif text-xl mb-2">Fair Value Estimates</h3>
              <p className="text-warm-gray text-sm">
                Get accurate valuations even for bags that haven't sold recently.
              </p>
            </div>
            
            <div className="bg-white rounded-3xl p-8 text-center">
              <div className="text-4xl mb-4">👜</div>
              <h3 className="font-serif text-xl mb-2">Portfolio Tracker</h3>
              <p className="text-warm-gray text-sm">
                Track your collection's value in real-time. Know exactly what your closet is worth.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
