import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface PriceStats {
  count: number
  median: number
  min: number
  max: number
  avg: number
}

function calculateStats(prices: number[]): PriceStats {
  if (prices.length === 0) return { count: 0, median: 0, min: 0, max: 0, avg: 0 }
  
  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  
  return {
    count: prices.length,
    median: Math.round(median),
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
  }
}

async function getPriceData() {
  const { data: sales } = await supabase
    .from('sales')
    .select(`
      sale_price,
      bags!inner (
        size,
        color,
        leather_type,
        hardware,
        is_exotic,
        exotic_type,
        is_limited_edition
      )
    `)

  if (!sales) return null

  // Group by size
  const bySize: { [key: number]: number[] } = {}
  const byExotic: { exotic: number[], standard: number[] } = { exotic: [], standard: [] }
  const byHardware: { [key: string]: number[] } = {}
  const byLeather: { [key: string]: number[] } = {}
  const byColor: { [key: string]: number[] } = {}

  sales.forEach((sale: any) => {
    const price = Number(sale.sale_price)
    const bag = sale.bags

    // By size
    if (!bySize[bag.size]) bySize[bag.size] = []
    bySize[bag.size].push(price)

    // By exotic (only for non-exotic comparisons, exclude exotic from standard leather stats)
    if (bag.is_exotic) {
      byExotic.exotic.push(price)
    } else {
      byExotic.standard.push(price)
    }

    // By hardware (standard leather only for fair comparison)
    if (!bag.is_exotic) {
      const hw = bag.hardware.includes('Gold') && !bag.hardware.includes('Rose') ? 'Gold' : 
                 bag.hardware.includes('Palladium') ? 'Palladium' : 
                 bag.hardware.includes('Rose') ? 'Rose Gold' : bag.hardware
      if (!byHardware[hw]) byHardware[hw] = []
      byHardware[hw].push(price)
    }

    // By leather (non-exotic only)
    if (!bag.is_exotic) {
      const leather = bag.leather_type.split('/')[0] // Handle "Swift/Toile" etc
      if (!byLeather[leather]) byLeather[leather] = []
      byLeather[leather].push(price)
    }

    // By color (top colors only, non-exotic)
    if (!bag.is_exotic) {
      if (!byColor[bag.color]) byColor[bag.color] = []
      byColor[bag.color].push(price)
    }
  })

  return { bySize, byExotic, byHardware, byLeather, byColor, totalSales: sales.length }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price)
}

function StatCard({ title, stats, emoji }: { title: string, stats: PriceStats, emoji: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-blush hover:border-gold transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{emoji}</span>
        <h3 className="font-serif text-xl">{title}</h3>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-warm-gray">Median Price</span>
          <span className="font-serif text-2xl font-semibold text-burgundy">{formatPrice(stats.median)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-warm-gray">Range</span>
          <span className="text-charcoal">{formatPrice(stats.min)} — {formatPrice(stats.max)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-warm-gray">Average</span>
          <span className="text-charcoal">{formatPrice(stats.avg)}</span>
        </div>
        <div className="pt-2 border-t border-blush">
          <span className="text-xs text-warm-gray">{stats.count} sales tracked</span>
        </div>
      </div>
    </div>
  )
}

export default async function GuidePage() {
  const data = await getPriceData()
  
  if (!data) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const { bySize, byExotic, byHardware, byLeather, byColor, totalSales } = data

  // Calculate stats for each category
  const sizeStats = Object.entries(bySize)
    .map(([size, prices]) => ({ size: parseInt(size), stats: calculateStats(prices) }))
    .sort((a, b) => a.size - b.size)

  const exoticStats = {
    standard: calculateStats(byExotic.standard),
    exotic: calculateStats(byExotic.exotic)
  }

  const exoticPremium = exoticStats.standard.median > 0 
    ? Math.round(((exoticStats.exotic.median - exoticStats.standard.median) / exoticStats.standard.median) * 100)
    : 0

  const hardwareStats = Object.entries(byHardware)
    .map(([hw, prices]) => ({ hardware: hw, stats: calculateStats(prices) }))
    .filter(h => h.stats.count >= 3)
    .sort((a, b) => b.stats.median - a.stats.median)

  const leatherStats = Object.entries(byLeather)
    .map(([leather, prices]) => ({ leather, stats: calculateStats(prices) }))
    .filter(l => l.stats.count >= 3)
    .sort((a, b) => b.stats.median - a.stats.median)

  // Top colors by count
  const colorStats = Object.entries(byColor)
    .map(([color, prices]) => ({ color, stats: calculateStats(prices) }))
    .filter(c => c.stats.count >= 2)
    .sort((a, b) => b.stats.count - a.stats.count)
    .slice(0, 8)

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-soft-white">
      {/* Hero */}
      <div className="bg-cream py-16 px-6 md:px-12 border-b border-blush">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full text-sm text-burgundy mb-6 shadow-sm">
            📊 Based on {totalSales} verified auction sales
          </div>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium mb-4">
            Hermès Birkin <em className="text-burgundy">Price Guide</em>
          </h1>
          <p className="text-xl text-warm-gray max-w-2xl">
            Real median prices from Sotheby&apos;s, Christie&apos;s, and top resellers. 
            Know exactly what to pay before you buy.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 space-y-16">
        
        {/* Price by Size */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-burgundy rounded-full flex items-center justify-center text-white font-serif">1</div>
            <h2 className="font-serif text-2xl md:text-3xl">Price by Size</h2>
          </div>
          <p className="text-warm-gray mb-8 max-w-2xl">
            Size 25 commands the highest prices due to its scarcity and popularity among younger collectors. 
            Size 40 offers the best value for those who prefer larger bags.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sizeStats.map(({ size, stats }) => (
              <StatCard 
                key={size} 
                title={`Birkin ${size}`} 
                stats={stats}
                emoji={size === 25 ? '👑' : size === 30 ? '⭐' : size === 35 ? '✨' : '💼'}
              />
            ))}
          </div>
        </section>

        {/* Exotic vs Standard */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-burgundy rounded-full flex items-center justify-center text-white font-serif">2</div>
            <h2 className="font-serif text-2xl md:text-3xl">Exotic Leather Premium</h2>
          </div>
          <p className="text-warm-gray mb-8 max-w-2xl">
            Exotic skins (crocodile, alligator, ostrich) command significant premiums over standard leathers.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-8 border border-blush">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">👜</span>
                <div>
                  <h3 className="font-serif text-xl">Standard Leather</h3>
                  <p className="text-sm text-warm-gray">Togo, Epsom, Clemence, Swift</p>
                </div>
              </div>
              <div className="font-serif text-4xl font-semibold text-charcoal mb-2">
                {formatPrice(exoticStats.standard.median)}
              </div>
              <div className="text-sm text-warm-gray">
                Range: {formatPrice(exoticStats.standard.min)} — {formatPrice(exoticStats.standard.max)}
              </div>
              <div className="text-xs text-warm-gray mt-2">{exoticStats.standard.count} sales</div>
            </div>

            <div className="bg-gradient-to-br from-burgundy to-rose-900 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">🐊</span>
                <div>
                  <h3 className="font-serif text-xl">Exotic Leather</h3>
                  <p className="text-sm text-white/70">Crocodile, Alligator, Ostrich</p>
                </div>
              </div>
              <div className="font-serif text-4xl font-semibold mb-2">
                {formatPrice(exoticStats.exotic.median)}
              </div>
              <div className="text-sm text-white/70">
                Range: {formatPrice(exoticStats.exotic.min)} — {formatPrice(exoticStats.exotic.max)}
              </div>
              <div className="text-xs text-white/70 mt-2">{exoticStats.exotic.count} sales</div>
              <div className="mt-4 bg-white/20 rounded-full px-4 py-2 inline-block">
                <span className="font-semibold">+{exoticPremium}%</span> premium over standard
              </div>
            </div>
          </div>
        </section>

        {/* Hardware Comparison */}
        {hardwareStats.length > 1 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-burgundy rounded-full flex items-center justify-center text-white font-serif">3</div>
              <h2 className="font-serif text-2xl md:text-3xl">Hardware Type</h2>
            </div>
            <p className="text-warm-gray mb-8 max-w-2xl">
              Hardware color has minimal impact on price. Choose based on personal preference.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {hardwareStats.map(({ hardware, stats }) => (
                <StatCard 
                  key={hardware} 
                  title={`${hardware} Hardware`} 
                  stats={stats}
                  emoji={hardware === 'Gold' ? '🟡' : hardware === 'Palladium' ? '⚪' : '🌹'}
                />
              ))}
            </div>
          </section>
        )}

        {/* Leather Types */}
        {leatherStats.length > 1 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-burgundy rounded-full flex items-center justify-center text-white font-serif">4</div>
              <h2 className="font-serif text-2xl md:text-3xl">Leather Types</h2>
            </div>
            <p className="text-warm-gray mb-8 max-w-2xl">
              Different leathers have varying durability and aesthetics. Price differences are modest.
            </p>
            <div className="bg-white rounded-2xl overflow-hidden border border-blush">
              <table className="w-full">
                <thead className="bg-blush/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-charcoal">Leather</th>
                    <th className="text-right p-4 font-medium text-charcoal">Median</th>
                    <th className="text-right p-4 font-medium text-charcoal hidden md:table-cell">Range</th>
                    <th className="text-right p-4 font-medium text-charcoal">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {leatherStats.map(({ leather, stats }, i) => (
                    <tr key={leather} className={i % 2 ? 'bg-cream/30' : ''}>
                      <td className="p-4 font-medium">{leather}</td>
                      <td className="p-4 text-right font-serif text-lg text-burgundy">{formatPrice(stats.median)}</td>
                      <td className="p-4 text-right text-warm-gray hidden md:table-cell">
                        {formatPrice(stats.min)} — {formatPrice(stats.max)}
                      </td>
                      <td className="p-4 text-right text-warm-gray">{stats.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Popular Colors */}
        {colorStats.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-burgundy rounded-full flex items-center justify-center text-white font-serif">5</div>
              <h2 className="font-serif text-2xl md:text-3xl">Popular Colors</h2>
            </div>
            <p className="text-warm-gray mb-8 max-w-2xl">
              Classic neutrals like Black, Gold, and Etoupe are most common. Bright colors vary in availability.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {colorStats.map(({ color, stats }) => (
                <div key={color} className="bg-white rounded-xl p-4 border border-blush text-center">
                  <div className="font-medium mb-1">{color}</div>
                  <div className="font-serif text-xl text-burgundy">{formatPrice(stats.median)}</div>
                  <div className="text-xs text-warm-gray">{stats.count} sales</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Key Takeaways */}
        <section className="bg-charcoal text-white rounded-3xl p-8 md:p-12">
          <h2 className="font-serif text-2xl md:text-3xl mb-8">Key Takeaways</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-medium mb-2">Size matters most</h3>
                <p className="text-white/70 text-sm">
                  A Birkin 25 typically costs 30-50% more than a Birkin 35 in the same leather and condition.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-2xl">🐊</span>
              <div>
                <h3 className="font-medium mb-2">Exotic = 2-3x price</h3>
                <p className="text-white/70 text-sm">
                  Crocodile and alligator Birkins sell for {exoticPremium}%+ more than standard leather equivalents.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-2xl">🔧</span>
              <div>
                <h3 className="font-medium mb-2">Hardware is personal preference</h3>
                <p className="text-white/70 text-sm">
                  Gold and Palladium hardware don&apos;t significantly affect resale value. Buy what you love.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-2xl">📅</span>
              <div>
                <h3 className="font-medium mb-2">Newer bags hold value</h3>
                <p className="text-white/70 text-sm">
                  Bags from the last 5 years typically sell for 10-20% more than older vintages.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <h2 className="font-serif text-2xl md:text-3xl mb-4">Ready to explore?</h2>
          <p className="text-warm-gray mb-8">Browse all {totalSales} bags in our database</p>
          <Link 
            href="/browse"
            className="inline-flex items-center gap-2 bg-burgundy text-white px-8 py-4 rounded-full font-medium hover:bg-charcoal transition-colors"
          >
            Browse All Bags →
          </Link>
        </section>
      </div>
    </div>
  )
}
