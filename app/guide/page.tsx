'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SizeData {
  size: number
  median: number
  min: number
  max: number
  avg: number
  count: number
}

interface LeatherData {
  leather: string
  median: number
  min: number
  max: number
  count: number
}

interface ExoticTypeData {
  type: string
  median: number
  min: number
  max: number
  count: number
}

interface HardwareData {
  hardware: string
  median: number
  count: number
}

interface ColorData {
  color: string
  median: number
  count: number
}

export default function GuidePage() {
  const [sizeData, setSizeData] = useState<SizeData[]>([])
  const [leatherData, setLeatherData] = useState<LeatherData[]>([])
  const [exoticTypeData, setExoticTypeData] = useState<ExoticTypeData[]>([])
  const [hardwareData, setHardwareData] = useState<HardwareData[]>([])
  const [colorData, setColorData] = useState<ColorData[]>([])
  const [exoticAvg, setExoticAvg] = useState(0)
  const [standardAvg, setStandardAvg] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      // Fetch all sales with bag details
      const { data: salesData } = await supabase
        .from('sales')
        .select(`
          sale_price,
          bags!inner (size, is_exotic, exotic_type, leather_type, hardware, color)
        `)

      if (!salesData) {
        setLoading(false)
        return
      }

      // Process size data (standard leather only, main sizes)
      const sizeGroups: { [key: number]: number[] } = {}
      const mainSizes = [25, 30, 35, 40]
      salesData.forEach((sale: any) => {
        if (sale.bags.is_exotic) return // Standard only
        const size = sale.bags.size
        if (!mainSizes.includes(size)) return
        if (!sizeGroups[size]) sizeGroups[size] = []
        sizeGroups[size].push(Number(sale.sale_price))
      })

      const sizes: SizeData[] = Object.entries(sizeGroups)
        .map(([size, prices]) => {
          const sorted = prices.sort((a, b) => a - b)
          const median = sorted[Math.floor(sorted.length / 2)]
          return {
            size: parseInt(size),
            median,
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
            count: prices.length
          }
        })
        .sort((a, b) => a.size - b.size)
      setSizeData(sizes)

      // Process standard leather types
      const leatherGroups: { [key: string]: number[] } = {}
      const standardLeathers = ['Togo', 'Epsom', 'Clemence', 'Swift', 'Chevre', 'Barenia', 'Evercalf', 'Courchevel', 'Ardennes']
      salesData.forEach((sale: any) => {
        if (sale.bags.is_exotic) return
        const leather = sale.bags.leather_type
        if (!leather) return
        // Match standard leathers
        const matchedLeather = standardLeathers.find(l => leather.toLowerCase().includes(l.toLowerCase()))
        if (!matchedLeather) return
        if (!leatherGroups[matchedLeather]) leatherGroups[matchedLeather] = []
        leatherGroups[matchedLeather].push(Number(sale.sale_price))
      })

      const leathers: LeatherData[] = Object.entries(leatherGroups)
        .map(([leather, prices]) => {
          const sorted = prices.sort((a, b) => a - b)
          return {
            leather,
            median: sorted[Math.floor(sorted.length / 2)],
            min: Math.min(...prices),
            max: Math.max(...prices),
            count: prices.length
          }
        })
        .filter(l => l.count >= 3)
        .sort((a, b) => b.median - a.median)
      setLeatherData(leathers)

      // Process exotic types
      const exoticGroups: { [key: string]: number[] } = {}
      salesData.forEach((sale: any) => {
        if (!sale.bags.is_exotic) return
        let exoticType = sale.bags.exotic_type || 'Other'
        // Normalize exotic types
        if (exoticType.toLowerCase().includes('croc') || exoticType.toLowerCase().includes('alligator')) {
          // Check leather_type for more specific info
          const leather = sale.bags.leather_type?.toLowerCase() || ''
          if (leather.includes('alligator') || leather.includes('mississippiensis')) {
            exoticType = 'Alligator'
          } else {
            exoticType = 'Crocodile'
          }
        }
        if (!exoticGroups[exoticType]) exoticGroups[exoticType] = []
        exoticGroups[exoticType].push(Number(sale.sale_price))
      })

      const exotics: ExoticTypeData[] = Object.entries(exoticGroups)
        .map(([type, prices]) => {
          const sorted = prices.sort((a, b) => a - b)
          return {
            type,
            median: sorted[Math.floor(sorted.length / 2)],
            min: Math.min(...prices),
            max: Math.max(...prices),
            count: prices.length
          }
        })
        .filter(e => e.count >= 2)
        .sort((a, b) => b.median - a.median)
      setExoticTypeData(exotics)

      // Process hardware
      const hwGroups: { [key: string]: number[] } = {}
      salesData.forEach((sale: any) => {
        if (sale.bags.is_exotic) return
        let hw = sale.bags.hardware
        if (!hw) return
        // Normalize hardware names
        if (hw.toLowerCase().includes('gold') && !hw.toLowerCase().includes('rose') && !hw.toLowerCase().includes('18k')) {
          hw = 'Gold'
        } else if (hw.toLowerCase().includes('palladium')) {
          hw = 'Palladium'
        } else if (hw.toLowerCase().includes('rose gold')) {
          hw = 'Rose Gold'
        } else {
          return // Skip unusual hardware
        }
        if (!hwGroups[hw]) hwGroups[hw] = []
        hwGroups[hw].push(Number(sale.sale_price))
      })

      const hardware: HardwareData[] = Object.entries(hwGroups)
        .map(([hw, prices]) => {
          const sorted = prices.sort((a, b) => a - b)
          return {
            hardware: hw,
            median: sorted[Math.floor(sorted.length / 2)],
            count: prices.length
          }
        })
        .filter(h => h.count >= 3)
        .sort((a, b) => b.median - a.median)
      setHardwareData(hardware)

      // Process colors (standard only)
      const colorGroups: { [key: string]: number[] } = {}
      salesData.forEach((sale: any) => {
        if (sale.bags.is_exotic) return
        const color = sale.bags.color
        if (!color) return
        if (!colorGroups[color]) colorGroups[color] = []
        colorGroups[color].push(Number(sale.sale_price))
      })

      const colors: ColorData[] = Object.entries(colorGroups)
        .map(([color, prices]) => {
          const sorted = prices.sort((a, b) => a - b)
          return {
            color,
            median: sorted[Math.floor(sorted.length / 2)],
            count: prices.length
          }
        })
        .filter(c => c.count >= 3)
        .sort((a, b) => b.median - a.median)
        .slice(0, 12) // Top 12 colors
      setColorData(colors)

      // Calculate exotic vs standard averages
      const exoticPrices = salesData.filter((s: any) => s.bags.is_exotic).map((s: any) => Number(s.sale_price))
      const standardPrices = salesData.filter((s: any) => !s.bags.is_exotic).map((s: any) => Number(s.sale_price))
      
      if (exoticPrices.length) {
        setExoticAvg(Math.round(exoticPrices.reduce((a, b) => a + b, 0) / exoticPrices.length))
      }
      if (standardPrices.length) {
        setStandardAvg(Math.round(standardPrices.reduce((a, b) => a + b, 0) / standardPrices.length))
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
        <div className="text-2xl text-warm-gray">Loading price guide...</div>
      </div>
    )
  }

  const exoticPremium = standardAvg > 0 ? Math.round(((exoticAvg - standardAvg) / standardAvg) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-blush">
      {/* Header */}
      <div className="bg-cream py-16 px-6 md:px-12">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4">
            Price Guide
          </h1>
          <p className="text-warm-gray text-lg max-w-xl mx-auto">
            Comprehensive pricing data for Hermès Birkin bags based on recent auction results
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 space-y-12">
        
        {/* Section 1: Price by Size */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-burgundy text-white flex items-center justify-center font-medium">1</div>
            <div>
              <h2 className="font-serif text-2xl font-medium">Price by Size</h2>
              <p className="text-warm-gray">Standard leather Birkins — smaller sizes command premiums</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blush">
                  <th className="text-left py-3 px-4 text-warm-gray font-medium">Size</th>
                  <th className="text-right py-3 px-4 text-warm-gray font-medium">Median</th>
                  <th className="text-right py-3 px-4 text-warm-gray font-medium">Range</th>
                  <th className="text-right py-3 px-4 text-warm-gray font-medium">Avg</th>
                  <th className="text-right py-3 px-4 text-warm-gray font-medium">Sales</th>
                </tr>
              </thead>
              <tbody>
                {sizeData.map((row) => (
                  <tr key={row.size} className="border-b border-blush/50 hover:bg-blush/20">
                    <td className="py-4 px-4 font-medium">Birkin {row.size}</td>
                    <td className="py-4 px-4 text-right font-serif text-burgundy">{formatPrice(row.median)}</td>
                    <td className="py-4 px-4 text-right text-warm-gray">{formatPrice(row.min)} — {formatPrice(row.max)}</td>
                    <td className="py-4 px-4 text-right">{formatPrice(row.avg)}</td>
                    <td className="py-4 px-4 text-right text-warm-gray">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Exotic vs Standard */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-burgundy text-white flex items-center justify-center font-medium">2</div>
            <div>
              <h2 className="font-serif text-2xl font-medium">Exotic vs Standard</h2>
              <p className="text-warm-gray">Exotic skins command a {exoticPremium}% premium over standard leathers</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-cream to-blush rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">👜</div>
              <div className="text-sm uppercase tracking-wider text-warm-gray mb-2">Standard Leather</div>
              <div className="font-serif text-3xl font-semibold text-charcoal">{formatPrice(standardAvg)}</div>
              <div className="text-sm text-warm-gray mt-1">average price</div>
            </div>

            <div className="bg-gradient-to-br from-burgundy to-rose-900 rounded-2xl p-8 text-center text-white">
              <div className="text-4xl mb-3">🐊</div>
              <div className="text-sm uppercase tracking-wider opacity-80 mb-2">Exotic Leather</div>
              <div className="font-serif text-3xl font-semibold">{formatPrice(exoticAvg)}</div>
              <div className="text-sm opacity-80 mt-1">average price</div>
              <div className="mt-3 bg-white/20 rounded-full px-4 py-1 inline-block text-sm">
                +{exoticPremium}% premium
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Hardware */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-burgundy text-white flex items-center justify-center font-medium">3</div>
            <div>
              <h2 className="font-serif text-2xl font-medium">Hardware Comparison</h2>
              <p className="text-warm-gray">Gold vs Palladium — minimal price difference</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {hardwareData.map((hw) => (
              <div key={hw.hardware} className="bg-blush/30 rounded-xl p-6 text-center">
                <div className="text-2xl mb-2">
                  {hw.hardware === 'Gold' ? '🥇' : hw.hardware === 'Palladium' ? '🥈' : '🌹'}
                </div>
                <div className="font-medium mb-1">{hw.hardware}</div>
                <div className="font-serif text-xl text-burgundy">{formatPrice(hw.median)}</div>
                <div className="text-xs text-warm-gray mt-1">{hw.count} sales</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Standard Leather Types */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-burgundy text-white flex items-center justify-center font-medium">4</div>
            <div>
              <h2 className="font-serif text-2xl font-medium">Standard Leather Types</h2>
              <p className="text-warm-gray">Different leathers have varying durability and aesthetics. Price differences are modest.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blush">
                  <th className="text-left py-3 px-4 text-warm-gray font-medium">Leather</th>
                  <th className="text-right py-3 px-4 text-warm-gray font-medium">Median</th>
                  <th className="text-right py-3 px-4 text-warm-gray font-medium">Range</th>
                  <th className="text-right py-3 px-4 text-warm-gray font-medium">Sales</th>
                </tr>
              </thead>
              <tbody>
                {leatherData.map((row) => (
                  <tr key={row.leather} className="border-b border-blush/50 hover:bg-blush/20">
                    <td className="py-4 px-4 font-medium">{row.leather}</td>
                    <td className="py-4 px-4 text-right font-serif text-burgundy">{formatPrice(row.median)}</td>
                    <td className="py-4 px-4 text-right text-warm-gray">{formatPrice(row.min)} — {formatPrice(row.max)}</td>
                    <td className="py-4 px-4 text-right text-warm-gray">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Exotic Leather Types */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-burgundy text-white flex items-center justify-center font-medium">5</div>
            <div>
              <h2 className="font-serif text-2xl font-medium">Exotic Leather Types</h2>
              <p className="text-warm-gray">Crocodile and alligator command the highest premiums. Ostrich offers a more accessible entry point.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blush">
                  <th className="text-left py-3 px-4 text-warm-gray font-medium">Exotic Type</th>
                  <th className="text-right py-3 px-4 text-warm-gray font-medium">Median</th>
                  <th className="text-right py-3 px-4 text-warm-gray font-medium">Range</th>
                  <th className="text-right py-3 px-4 text-warm-gray font-medium">Sales</th>
                </tr>
              </thead>
              <tbody>
                {exoticTypeData.map((row) => (
                  <tr key={row.type} className="border-b border-blush/50 hover:bg-blush/20">
                    <td className="py-4 px-4 font-medium flex items-center gap-2">
                      <span>
                        {row.type === 'Crocodile' ? '🐊' : 
                         row.type === 'Alligator' ? '🐊' : 
                         row.type === 'Ostrich' ? '🪶' : 
                         row.type === 'Lizard' ? '🦎' : '✨'}
                      </span>
                      {row.type}
                    </td>
                    <td className="py-4 px-4 text-right font-serif text-burgundy">{formatPrice(row.median)}</td>
                    <td className="py-4 px-4 text-right text-warm-gray">{formatPrice(row.min)} — {formatPrice(row.max)}</td>
                    <td className="py-4 px-4 text-right text-warm-gray">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 6: Popular Colors */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-burgundy text-white flex items-center justify-center font-medium">6</div>
            <div>
              <h2 className="font-serif text-2xl font-medium">Popular Colors</h2>
              <p className="text-warm-gray">Top colors by median price (standard leather)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {colorData.map((c) => (
              <div key={c.color} className="bg-blush/30 rounded-xl p-4 text-center">
                <div className="font-medium text-sm mb-1 truncate" title={c.color}>{c.color}</div>
                <div className="font-serif text-lg text-burgundy">{formatPrice(c.median)}</div>
                <div className="text-xs text-warm-gray">{c.count} sales</div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <h2 className="font-serif text-2xl font-medium mb-6">Key Takeaways</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <span className="text-2xl">💎</span>
              <div>
                <div className="font-medium mb-1">Size 25 is King</div>
                <p className="text-sm text-warm-gray">The smallest size commands the highest prices due to scarcity and modern demand.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-2xl">🐊</span>
              <div>
                <div className="font-medium mb-1">Exotic Premium is Real</div>
                <p className="text-sm text-warm-gray">Expect to pay {exoticPremium}%+ more for crocodile or alligator skins.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-2xl">🪶</span>
              <div>
                <div className="font-medium mb-1">Ostrich is Entry-Level Exotic</div>
                <p className="text-sm text-warm-gray">At roughly half the price of crocodile, ostrich offers exotic appeal at lower cost.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-2xl">⚖️</span>
              <div>
                <div className="font-medium mb-1">Hardware Doesn't Matter Much</div>
                <p className="text-sm text-warm-gray">Gold vs Palladium has minimal price impact — buy what you love.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Summary */}
        <div className="text-center text-warm-gray text-sm">
          Based on verified auction sales • Data updates in real-time
        </div>
      </div>
    </div>
  )
}
