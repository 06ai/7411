import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

async function getBag(id: string) {
  const { data: bag, error } = await supabase
    .from('bags')
    .select(`
      *,
      brands (name),
      models (name)
    `)
    .eq('id', id)
    .single()

  if (error || !bag) {
    return null
  }

  // Get sales for this bag
  const { data: sales } = await supabase
    .from('sales')
    .select(`
      *,
      sources (name)
    `)
    .eq('bag_id', id)
    .order('sale_date', { ascending: false })

  // Get similar bags for comparison
  const { data: similarSales } = await supabase
    .from('sales')
    .select(`
      sale_price,
      bags!inner (
        size,
        is_exotic,
        models!inner (name)
      )
    `)
    .eq('bags.models.name', bag.models?.name)
    .eq('bags.size', bag.size)
    .eq('bags.is_exotic', bag.is_exotic)
    .order('sale_date', { ascending: false })
    .limit(20)

  return { bag, sales: sales || [], similarSales: similarSales || [] }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price)
}

export default async function BagPage({ params }: { params: { id: string } }) {
  const data = await getBag(params.id)
  
  if (!data) {
    notFound()
  }

  const { bag, sales, similarSales } = data
  const latestSale = sales[0]
  
  // Calculate stats from similar bags
  const prices = similarSales.map((s: any) => Number(s.sale_price))
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
  const minPrice = prices.length ? Math.min(...prices) : 0
  const maxPrice = prices.length ? Math.max(...prices) : 0

  return (
    <div className="min-h-screen bg-soft-white">
      {/* Breadcrumb */}
      <div className="bg-cream py-4 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-warm-gray">
            <Link href="/" className="hover:text-burgundy">Home</Link>
            <span>/</span>
            <Link href="/browse" className="hover:text-burgundy">Browse</Link>
            <span>/</span>
            <span className="text-charcoal">{bag.brands?.name} {bag.models?.name} {bag.size}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: Image */}
          <div>
            <div className="bg-white rounded-[2rem] p-8 shadow-sm sticky top-28">
              <div className="aspect-square bg-gradient-to-br from-blush to-rose rounded-2xl flex items-center justify-center text-[10rem]">
                {bag.is_exotic ? '🐊' : '👜'}
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div>
            <div className="text-sm uppercase tracking-widest text-gold font-semibold mb-2">
              {bag.brands?.name}
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-medium mb-6">
              {bag.models?.name} {bag.size}
            </h1>

            {/* Price Box */}
            <div className="bg-gradient-to-br from-burgundy to-rose-900 text-white p-8 rounded-3xl mb-8">
              <div className="text-sm uppercase tracking-wider opacity-90 mb-2">
                {latestSale ? 'Last Sale Price' : 'Estimated Fair Value'}
              </div>
              <div className="flex items-center gap-4">
                <span className="font-serif text-4xl md:text-5xl font-semibold">
                  {formatPrice(latestSale?.sale_price || avgPrice)}
                </span>
                {latestSale && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                    {new Date(latestSale.sale_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Properties */}
            <div className="mb-8">
              <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                ✨ Properties
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-blush rounded-2xl p-4 hover:border-gold transition-colors">
                  <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Brand</div>
                  <div className="font-medium">{bag.brands?.name}</div>
                </div>
                <div className="bg-white border border-blush rounded-2xl p-4 hover:border-gold transition-colors">
                  <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Model</div>
                  <div className="font-medium">{bag.models?.name}</div>
                </div>
                <div className="bg-white border border-blush rounded-2xl p-4 hover:border-gold transition-colors">
                  <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Size</div>
                  <div className="font-medium">{bag.size}cm</div>
                </div>
                <div className="bg-white border border-blush rounded-2xl p-4 hover:border-gold transition-colors">
                  <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Color</div>
                  <div className="font-medium">{bag.color}</div>
                </div>
                <div className="bg-white border border-blush rounded-2xl p-4 hover:border-gold transition-colors">
                  <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Leather</div>
                  <div className="font-medium">{bag.leather_type}</div>
                </div>
                <div className="bg-white border border-blush rounded-2xl p-4 hover:border-gold transition-colors">
                  <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Hardware</div>
                  <div className="font-medium">{bag.hardware}</div>
                </div>
                <div className="bg-white border border-blush rounded-2xl p-4 hover:border-gold transition-colors">
                  <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Year</div>
                  <div className="font-medium">{bag.year}</div>
                </div>
                <div className="bg-white border border-blush rounded-2xl p-4 hover:border-gold transition-colors">
                  <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Exotic</div>
                  <div className="font-medium">{bag.is_exotic ? `Yes (${bag.exotic_type})` : 'No'}</div>
                </div>
                {bag.is_limited_edition && (
                  <div className="bg-white border border-gold rounded-2xl p-4 col-span-2">
                    <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Limited Edition</div>
                    <div className="font-medium text-burgundy">{bag.limited_edition_name || 'Yes'}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Market Data */}
            <div className="mb-8">
              <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                📊 Market Data
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-blush rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Comparable Sales</div>
                  <div className="font-medium">{similarSales.length} bags</div>
                </div>
                <div className="bg-white border border-blush rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Avg Price</div>
                  <div className="font-medium">{formatPrice(avgPrice)}</div>
                </div>
                <div className="bg-white border border-blush rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Price Range</div>
                  <div className="font-medium">{formatPrice(minPrice)} - {formatPrice(maxPrice)}</div>
                </div>
                <div className="bg-white border border-blush rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-wider text-warm-gray mb-1">Source</div>
                  <div className="font-medium">{latestSale?.sources?.name || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Add to Portfolio Button */}
            <button className="w-full bg-charcoal text-white py-4 rounded-2xl font-medium hover:bg-burgundy transition-colors flex items-center justify-center gap-2">
              👜 Add to My Closet
            </button>
          </div>
        </div>

        {/* Sales History */}
        {sales.length > 0 && (
          <div className="mt-16">
            <h2 className="font-serif text-2xl mb-6">Sales History</h2>
            <div className="bg-white rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-blush/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-warm-gray">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-warm-gray">Source</th>
                    <th className="text-right p-4 text-sm font-medium text-warm-gray">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale: any) => (
                    <tr key={sale.id} className="border-t border-blush">
                      <td className="p-4">
                        {new Date(sale.sale_date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-4">{sale.sources?.name}</td>
                      <td className="p-4 text-right font-serif text-lg font-semibold text-burgundy">
                        {formatPrice(sale.sale_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
