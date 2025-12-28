'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SizeData {
  size: number
  avg_price: number
  count: number
}

type FilterType = 'all' | 'standard' | 'exotic'

// Only show main sizes with significant volume
const MAIN_SIZES = [25, 30, 35, 40]

export default function TrendsPage() {
  const [allSales, setAllSales] = useState<any[]>([])
  const [filter, setFilter] = useState<FilterType>('standard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: salesData } = await supabase
        .from('sales')
        .select(`
          sale_price,
          bags!inner (size, is_exotic, leather_type)
        `)

      if (salesData) {
        setAllSales(salesData)
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  // Filter sales based on selected filter
  const filteredSales = allSales.filter((sale: any) => {
    if (filter === 'all') return true
    if (filter === 'standard') return !sale.bags.is_exotic
    if (filter === 'exotic') return sale.bags.is_exotic
    return true
  })

  // Calculate size data from filtered sales (only main sizes)
  const sizeGroups: { [key: number]: number[] } = {}
  filteredSales.forEach((sale: any) => {
    const size = sale.bags.size
    // Only include main sizes
    if (!MAIN_SIZES.includes(size)) return
    const price = Number(sale.sale_price)
    if (!sizeGroups[size]) sizeGroups[size] = []
    sizeGroups[size].push(price)
  })

  const sizeData: SizeData[] = Object.entries(sizeGroups)
    .map(([size, prices]) => ({
      size: parseInt(size),
      avg_price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      count: prices.length
    }))
    .sort((a, b) => a.size - b.size)

  // Calculate exotic comparison (always from all data)
  const exoticPrices = allSales.filter((s: any) => s.bags.is_exotic).map((s: any) => Number(s.sale_price))
  const standardPrices = allSales.filter((s: any) => !s.bags.is_exotic).map((s: any) => Number(s.sale_price))
  
  const exoticAvg = exoticPrices.length ? Math.round(exoticPrices.reduce((a, b) => a + b, 0) / exoticPrices.length) : 0
  const standardAvg = standardPrices.length ? Math.round(standardPrices.reduce((a, b) => a + b, 0) / standardPrices.length) : 0
  const exoticPremium = standardAvg > 0 ? Math.round(((exoticAvg - standardAvg) / standardAvg) * 100) : 0

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-white flex items-center justify-center">
        <div className="text-2xl text-warm-gray">Loading trends...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-blush">
      {/* Header */}
      <div className="bg-cream py-16 px-6 md:px-12">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4">
            Price Trends
          </h1>
          <p className="text-warm-gray text-lg max-w-xl mx-auto">
            Track how values change across sizes, leathers, and time
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 space-y-12">
        {/* Size Chart */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h2 className="font-serif text-2xl font-medium">Average Price by Size</h2>
              <p className="text-warm-gray">
                Hermès Birkin — {filter === 'all' ? 'All Leathers' : filter === 'standard' ? 'Standard Leather Only' : 'Exotic Only'}
              </p>
            </div>
            
            {/* Filter Toggle */}
            <div className="flex bg-blush/50 rounded-full p-1">
              <button
                onClick={() => setFilter('standard')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === 'standard' 
                    ? 'bg-burgundy text-white' 
                    : 'text-charcoal hover:bg-white/50'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setFilter('exotic')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === 'exotic' 
                    ? 'bg-burgundy text-white' 
                    : 'text-charcoal hover:bg-white/50'
                }`}
              >
                🐊 Exotic
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === 'all' 
                    ? 'bg-burgundy text-white' 
                    : 'text-charcoal hover:bg-white/50'
                }`}
              >
                All
              </button>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sizeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8C4C4" />
                <XAxis 
                  dataKey="size" 
                  tickFormatter={(v) => `${v}cm`}
                  stroke="#6B6560"
                />
                <YAxis 
                  tickFormatter={(v) => `$${v/1000}k`}
                  stroke="#6B6560"
                />
                <Tooltip 
                  formatter={(value: number) => [formatPrice(value), 'Avg Price']}
                  labelFormatter={(label) => `Size ${label}cm`}
                  contentStyle={{
                    backgroundColor: '#2D2926',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                />
                <Bar 
                  dataKey="avg_price" 
                  fill={filter === 'exotic' ? '#C9A66B' : '#8B3A3A'} 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {sizeData.map((d) => (
              <div key={d.size} className="text-center p-4 bg-blush/30 rounded-xl">
                <div className="text-sm text-warm-gray mb-1">Size {d.size}</div>
                <div className="font-serif text-xl font-semibold text-burgundy">
                  {formatPrice(d.avg_price)}
                </div>
                <div className="text-xs text-warm-gray">{d.count} sales</div>
              </div>
            ))}
          </div>

          {filteredSales.length === 0 && (
            <div className="text-center py-8 text-warm-gray">
              No sales data for this filter
            </div>
          )}
        </div>

        {/* Exotic vs Standard */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="mb-8">
            <h2 className="font-serif text-2xl font-medium">Exotic vs Standard Leather</h2>
            <p className="text-warm-gray">Premium for exotic skins</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-cream to-blush rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">👜</div>
              <div className="text-sm uppercase tracking-wider text-warm-gray mb-2">Standard Leather</div>
              <div className="font-serif text-4xl font-semibold text-charcoal">
                {formatPrice(standardAvg)}
              </div>
              <div className="text-sm text-warm-gray mt-2">{standardPrices.length} sales</div>
            </div>

            <div className="bg-gradient-to-br from-burgundy to-rose-900 rounded-2xl p-8 text-center text-white">
              <div className="text-5xl mb-4">🐊</div>
              <div className="text-sm uppercase tracking-wider opacity-80 mb-2">Exotic Leather</div>
              <div className="font-serif text-4xl font-semibold">
                {formatPrice(exoticAvg)}
              </div>
              <div className="text-sm opacity-80 mt-2">{exoticPrices.length} sales</div>
              <div className="mt-4 bg-white/20 rounded-full px-4 py-1 inline-block text-sm">
                +{exoticPremium}% premium
              </div>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <h2 className="font-serif text-2xl font-medium mb-6">Key Insights</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-blush/30 rounded-xl">
              <span className="text-2xl">📈</span>
              <div>
                <div className="font-medium mb-1">Size 25 Commands Highest Prices</div>
                <p className="text-sm text-warm-gray">
                  The smallest Birkin size averages 30-50% higher than size 35, driven by scarcity and demand from younger collectors.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-blush/30 rounded-xl">
              <span className="text-2xl">🐊</span>
              <div>
                <div className="font-medium mb-1">Exotic Premium is +{exoticPremium}%</div>
                <p className="text-sm text-warm-gray">
                  Crocodile and alligator skins command significant premiums over standard leathers like Togo and Epsom.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-blush/30 rounded-xl">
              <span className="text-2xl">📉</span>
              <div>
                <div className="font-medium mb-1">Size 40 is the Value Play</div>
                <p className="text-sm text-warm-gray">
                  Larger sizes trade at significant discounts, offering collector value for those who prefer bigger bags.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Summary */}
        <div className="text-center text-warm-gray text-sm">
          Based on {allSales.length} verified auction sales • Updated in real-time
        </div>
      </div>
    </div>
  )
}
