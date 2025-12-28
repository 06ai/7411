'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface SizeData {
  size: number
  avg_price: number
  count: number
}

interface ExoticData {
  is_exotic: boolean
  avg_price: number
  count: number
}

export default function TrendsPage() {
  const [sizeData, setSizeData] = useState<SizeData[]>([])
  const [exoticData, setExoticData] = useState<ExoticData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      // Get sales grouped by size
      const { data: salesData } = await supabase
        .from('sales')
        .select(`
          sale_price,
          bags!inner (size, is_exotic)
        `)

      if (salesData) {
        // Group by size
        const sizeGroups: { [key: number]: number[] } = {}
        const exoticGroups: { [key: string]: number[] } = { exotic: [], standard: [] }

        salesData.forEach((sale: any) => {
          const size = sale.bags.size
          const price = Number(sale.sale_price)
          
          if (!sizeGroups[size]) sizeGroups[size] = []
          sizeGroups[size].push(price)

          if (sale.bags.is_exotic) {
            exoticGroups.exotic.push(price)
          } else {
            exoticGroups.standard.push(price)
          }
        })

        // Calculate averages
        const sizeAvgs: SizeData[] = Object.entries(sizeGroups)
          .map(([size, prices]) => ({
            size: parseInt(size),
            avg_price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
            count: prices.length
          }))
          .sort((a, b) => a.size - b.size)

        const exoticAvgs: ExoticData[] = [
          {
            is_exotic: false,
            avg_price: Math.round(exoticGroups.standard.reduce((a, b) => a + b, 0) / exoticGroups.standard.length),
            count: exoticGroups.standard.length
          },
          {
            is_exotic: true,
            avg_price: Math.round(exoticGroups.exotic.reduce((a, b) => a + b, 0) / exoticGroups.exotic.length),
            count: exoticGroups.exotic.length
          }
        ]

        setSizeData(sizeAvgs)
        setExoticData(exoticAvgs)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

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
          <div className="mb-8">
            <h2 className="font-serif text-2xl font-medium">Average Price by Size</h2>
            <p className="text-warm-gray">Hermès Birkin — All Leathers</p>
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
                  fill="#8B3A3A" 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-8">
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
                {formatPrice(exoticData[0]?.avg_price || 0)}
              </div>
              <div className="text-sm text-warm-gray mt-2">{exoticData[0]?.count || 0} sales</div>
            </div>

            <div className="bg-gradient-to-br from-burgundy to-rose-900 rounded-2xl p-8 text-center text-white">
              <div className="text-5xl mb-4">🐊</div>
              <div className="text-sm uppercase tracking-wider opacity-80 mb-2">Exotic Leather</div>
              <div className="font-serif text-4xl font-semibold">
                {formatPrice(exoticData[1]?.avg_price || 0)}
              </div>
              <div className="text-sm opacity-80 mt-2">{exoticData[1]?.count || 0} sales</div>
              {exoticData[0] && exoticData[1] && (
                <div className="mt-4 bg-white/20 rounded-full px-4 py-1 inline-block text-sm">
                  +{Math.round(((exoticData[1].avg_price - exoticData[0].avg_price) / exoticData[0].avg_price) * 100)}% premium
                </div>
              )}
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
                <div className="font-medium mb-1">Exotic Premium is Significant</div>
                <p className="text-sm text-warm-gray">
                  Crocodile and alligator skins command 100-200% premiums over standard leathers like Togo and Epsom.
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

        {/* Share Button */}
        <div className="text-center">
          <button className="bg-gradient-to-r from-burgundy to-rose-900 text-white px-8 py-4 rounded-full font-medium hover:scale-105 transition-transform inline-flex items-center gap-2">
            📤 Share on Instagram
          </button>
        </div>
      </div>
    </div>
  )
}
