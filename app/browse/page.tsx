import { supabase } from '@/lib/supabase'
import Link from 'next/link'

async function getBagsWithSales(searchParams: { [key: string]: string | undefined }) {
  let query = supabase
    .from('sales')
    .select(`
      *,
      bags!inner (
        *,
        brands!inner (name),
        models!inner (name)
      ),
      sources (name)
    `)
    .order('sale_date', { ascending: false })

  // Apply filters
  if (searchParams.size) {
    query = query.eq('bags.size', parseInt(searchParams.size))
  }
  if (searchParams.exotic === 'true') {
    query = query.eq('bags.is_exotic', true)
  }
  if (searchParams.exotic === 'false') {
    query = query.eq('bags.is_exotic', false)
  }

  const { data, error } = await query.limit(50)

  if (error) {
    console.error('Error fetching bags:', error)
    return []
  }
  return data || []
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price)
}

export default async function BrowsePage({
  searchParams
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  const sales = await getBagsWithSales(searchParams)

  return (
    <div className="min-h-screen bg-soft-white">
      {/* Header */}
      <div className="bg-cream py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4">
            Browse Bags
          </h1>
          <p className="text-warm-gray text-lg">
            {sales.length} recent sales from verified auction houses
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-10">
          <Link 
            href="/browse"
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              !searchParams.size && !searchParams.exotic 
                ? 'bg-burgundy text-white' 
                : 'bg-white text-charcoal hover:bg-blush border border-blush'
            }`}
          >
            All
          </Link>
          
          <div className="w-px bg-blush mx-2" />
          
          <Link 
            href="/browse?size=25"
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              searchParams.size === '25' 
                ? 'bg-burgundy text-white' 
                : 'bg-white text-charcoal hover:bg-blush border border-blush'
            }`}
          >
            Size 25
          </Link>
          <Link 
            href="/browse?size=30"
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              searchParams.size === '30' 
                ? 'bg-burgundy text-white' 
                : 'bg-white text-charcoal hover:bg-blush border border-blush'
            }`}
          >
            Size 30
          </Link>
          <Link 
            href="/browse?size=35"
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              searchParams.size === '35' 
                ? 'bg-burgundy text-white' 
                : 'bg-white text-charcoal hover:bg-blush border border-blush'
            }`}
          >
            Size 35
          </Link>
          <Link 
            href="/browse?size=40"
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              searchParams.size === '40' 
                ? 'bg-burgundy text-white' 
                : 'bg-white text-charcoal hover:bg-blush border border-blush'
            }`}
          >
            Size 40
          </Link>

          <div className="w-px bg-blush mx-2" />

          <Link 
            href="/browse?exotic=true"
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              searchParams.exotic === 'true' 
                ? 'bg-burgundy text-white' 
                : 'bg-white text-charcoal hover:bg-blush border border-blush'
            }`}
          >
            🐊 Exotic Only
          </Link>
          <Link 
            href="/browse?exotic=false"
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              searchParams.exotic === 'false' 
                ? 'bg-burgundy text-white' 
                : 'bg-white text-charcoal hover:bg-blush border border-blush'
            }`}
          >
            Standard Leather
          </Link>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sales.map((sale: any) => (
            <Link 
              key={sale.id} 
              href={`/bag/${sale.bags.id}`}
              className="bag-card bg-white rounded-3xl overflow-hidden"
            >
              {/* Image */}
              <div className="aspect-square bg-gradient-to-br from-blush to-cream relative">
                <div className="absolute inset-0 flex items-center justify-center text-6xl">
                  {sale.bags.is_exotic ? '🐊' : sale.bags.is_limited_edition ? '✨' : '👜'}
                </div>
                
                {sale.bags.is_exotic && (
                  <div className="absolute top-4 left-4 bg-gold text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Exotic
                  </div>
                )}
                
                {sale.bags.is_limited_edition && (
                  <div className="absolute top-4 right-4 bg-burgundy text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {sale.bags.limited_edition_name || 'Limited'}
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="text-xs uppercase tracking-widest text-gold font-semibold mb-1">
                  {sale.bags.brands?.name}
                </div>
                <div className="font-serif text-xl font-medium mb-1">
                  {sale.bags.models?.name} {sale.bags.size}
                </div>
                <div className="text-sm text-warm-gray mb-4 line-clamp-1">
                  {sale.bags.color} • {sale.bags.leather_type} • {sale.bags.hardware}
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-blush">
                  <div className="font-serif text-xl font-semibold text-burgundy">
                    {formatPrice(sale.sale_price)}
                  </div>
                  <div className="text-xs text-warm-gray">
                    {sale.bags.year}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {sales.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👜</div>
            <p className="text-warm-gray text-lg">No bags found with these filters</p>
            <Link href="/browse" className="text-burgundy hover:underline mt-2 inline-block">
              Clear filters
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
