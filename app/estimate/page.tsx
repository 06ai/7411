'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MultiplierData {
  value: number
  sampleSize: number
}

interface Multipliers {
  size: { [key: number]: MultiplierData }
  exotic: { [key: string]: MultiplierData }
  year: { [key: string]: MultiplierData }
  baseline: { value: number; sampleSize: number }
}

export default function EstimatePage() {
  const [multipliers, setMultipliers] = useState<Multipliers | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalSales, setTotalSales] = useState(0)
  
  // User selections
  const [size, setSize] = useState<number>(30)
  const [isExotic, setIsExotic] = useState<boolean>(false)
  const [exoticType, setExoticType] = useState<string>('Crocodile')
  const [yearRange, setYearRange] = useState<string>('2015-2019')

  useEffect(() => {
    async function calculateMultipliers() {
      const { data: salesData } = await supabase
        .from('sales')
        .select(`
          sale_price,
          sale_date,
          bags!inner (size, is_exotic, exotic_type, year)
        `)

      if (!salesData || salesData.length === 0) {
        setLoading(false)
        return
      }

      setTotalSales(salesData.length)

      // Helper to calculate median
      const median = (prices: number[]): number => {
        if (prices.length === 0) return 0
        const sorted = [...prices].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
      }

      // Separate standard and exotic
      const standardSales = salesData.filter((s: any) => !s.bags.is_exotic)
      const exoticSales = salesData.filter((s: any) => s.bags.is_exotic)

      // BASELINE: Standard B30 median
      const standardB30Prices = standardSales
        .filter((s: any) => s.bags.size === 30)
        .map((s: any) => Number(s.sale_price))
      
      const baseline = {
        value: median(standardB30Prices),
        sampleSize: standardB30Prices.length
      }

      // SIZE MULTIPLIERS (from standard leather only)
      const sizeMultipliers: { [key: number]: MultiplierData } = {}
      const sizes = [25, 30, 35, 40]
      
      for (const s of sizes) {
        const sizePrices = standardSales
          .filter((sale: any) => sale.bags.size === s)
          .map((sale: any) => Number(sale.sale_price))
        
        const sizeMedian = median(sizePrices)
        sizeMultipliers[s] = {
          value: baseline.value > 0 ? sizeMedian / baseline.value : 1,
          sampleSize: sizePrices.length
        }
      }

      // EXOTIC MULTIPLIERS (vs standard baseline)
      const exoticMultipliers: { [key: string]: MultiplierData } = {}
      const standardAllMedian = median(standardSales.map((s: any) => Number(s.sale_price)))
      
      // Group exotic by type
      const exoticTypes = ['Crocodile', 'Alligator', 'Ostrich', 'Lizard']
      
      for (const type of exoticTypes) {
        const typeSales = exoticSales.filter((s: any) => {
          const eType = s.bags.exotic_type || ''
          if (type === 'Crocodile') {
            return eType.toLowerCase().includes('croc') && !eType.toLowerCase().includes('alligator')
          }
          return eType.toLowerCase().includes(type.toLowerCase())
        })
        
        const typePrices = typeSales.map((s: any) => Number(s.sale_price))
        const typeMedian = median(typePrices)
        
        exoticMultipliers[type] = {
          value: standardAllMedian > 0 && typePrices.length > 0 ? typeMedian / standardAllMedian : 2.5,
          sampleSize: typePrices.length
        }
      }

      // If we don't have enough data for specific exotic types, use overall exotic
      const allExoticPrices = exoticSales.map((s: any) => Number(s.sale_price))
      const exoticOverallMedian = median(allExoticPrices)
      exoticMultipliers['Other'] = {
        value: standardAllMedian > 0 ? exoticOverallMedian / standardAllMedian : 2.5,
        sampleSize: allExoticPrices.length
      }

      // YEAR MULTIPLIERS
      const yearMultipliers: { [key: string]: MultiplierData } = {}
      const yearRanges = {
        '2020+': (y: number) => y >= 2020,
        '2015-2019': (y: number) => y >= 2015 && y <= 2019,
        '2010-2014': (y: number) => y >= 2010 && y <= 2014,
        'Pre-2010': (y: number) => y < 2010
      }

      const allStandardMedian = median(standardSales.map((s: any) => Number(s.sale_price)))

      for (const [range, filter] of Object.entries(yearRanges)) {
        const rangeSales = standardSales.filter((s: any) => {
          const year = s.bags.year
          return year && filter(year)
        })
        
        const rangePrices = rangeSales.map((s: any) => Number(s.sale_price))
        const rangeMedian = median(rangePrices)
        
        yearMultipliers[range] = {
          value: allStandardMedian > 0 && rangePrices.length > 0 ? rangeMedian / allStandardMedian : 1,
          sampleSize: rangePrices.length
        }
      }

      setMultipliers({
        size: sizeMultipliers,
        exotic: exoticMultipliers,
        year: yearMultipliers,
        baseline
      })
      
      setLoading(false)
    }

    calculateMultipliers()
  }, [])

  // Calculate estimate
  const calculateEstimate = () => {
    if (!multipliers) return null

    const baseline = multipliers.baseline.value
    const sizeMult = multipliers.size[size]?.value || 1
    const yearMult = multipliers.year[yearRange]?.value || 1
    
    let exoticMult = 1
    if (isExotic) {
      exoticMult = multipliers.exotic[exoticType]?.value || multipliers.exotic['Other']?.value || 2.5
    }

    const estimate = baseline * sizeMult * exoticMult * yearMult

    // Calculate confidence range (±15% for good sample sizes, ±25% for low)
    const minSampleSize = Math.min(
      multipliers.size[size]?.sampleSize || 0,
      isExotic ? (multipliers.exotic[exoticType]?.sampleSize || 0) : 100,
      multipliers.year[yearRange]?.sampleSize || 0
    )
    
    const confidenceRange = minSampleSize >= 10 ? 0.15 : minSampleSize >= 5 ? 0.20 : 0.25

    return {
      estimate: Math.round(estimate),
      low: Math.round(estimate * (1 - confidenceRange)),
      high: Math.round(estimate * (1 + confidenceRange)),
      confidence: minSampleSize >= 10 ? 'High' : minSampleSize >= 5 ? 'Medium' : 'Low',
      breakdown: {
        baseline,
        sizeMult,
        exoticMult,
        yearMult,
        sizeSamples: multipliers.size[size]?.sampleSize || 0,
        exoticSamples: isExotic ? (multipliers.exotic[exoticType]?.sampleSize || 0) : null,
        yearSamples: multipliers.year[yearRange]?.sampleSize || 0
      }
    }
  }

  const result = calculateEstimate()

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
        <div className="text-2xl text-warm-gray">Calculating market data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-blush">
      {/* Header */}
      <div className="bg-cream py-16 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4">
            What's Your Birkin Worth?
          </h1>
          <p className="text-warm-gray text-lg max-w-xl mx-auto">
            Get a fair market estimate based on {totalSales} recent auction sales
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 md:px-12 py-12">
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          
          {/* Size Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-charcoal mb-3">Size</label>
            <div className="grid grid-cols-4 gap-3">
              {[25, 30, 35, 40].map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`py-4 rounded-xl font-medium transition-all ${
                    size === s
                      ? 'bg-burgundy text-white'
                      : 'bg-blush/50 text-charcoal hover:bg-blush'
                  }`}
                >
                  <div className="text-2xl">{s}</div>
                  <div className="text-xs opacity-75">cm</div>
                </button>
              ))}
            </div>
            {multipliers?.size[size] && (
              <div className="text-xs text-warm-gray mt-2 text-right">
                Based on {multipliers.size[size].sampleSize} sales
              </div>
            )}
          </div>

          {/* Leather Type */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-charcoal mb-3">Leather Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsExotic(false)}
                className={`py-6 rounded-xl font-medium transition-all ${
                  !isExotic
                    ? 'bg-burgundy text-white'
                    : 'bg-blush/50 text-charcoal hover:bg-blush'
                }`}
              >
                <div className="text-2xl mb-1">👜</div>
                <div>Standard</div>
                <div className="text-xs opacity-75">Togo, Epsom, Clemence, etc.</div>
              </button>
              <button
                onClick={() => setIsExotic(true)}
                className={`py-6 rounded-xl font-medium transition-all ${
                  isExotic
                    ? 'bg-burgundy text-white'
                    : 'bg-blush/50 text-charcoal hover:bg-blush'
                }`}
              >
                <div className="text-2xl mb-1">🐊</div>
                <div>Exotic</div>
                <div className="text-xs opacity-75">Crocodile, Ostrich, etc.</div>
              </button>
            </div>
          </div>

          {/* Exotic Type (conditional) */}
          {isExotic && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-charcoal mb-3">Exotic Type</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Crocodile', 'Alligator', 'Ostrich', 'Lizard'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setExoticType(type)}
                    className={`py-4 rounded-xl font-medium transition-all ${
                      exoticType === type
                        ? 'bg-burgundy text-white'
                        : 'bg-blush/50 text-charcoal hover:bg-blush'
                    }`}
                  >
                    <div className="text-xl mb-1">
                      {type === 'Crocodile' || type === 'Alligator' ? '🐊' : type === 'Ostrich' ? '🪶' : '🦎'}
                    </div>
                    <div className="text-sm">{type}</div>
                  </button>
                ))}
              </div>
              {multipliers?.exotic[exoticType] && (
                <div className="text-xs text-warm-gray mt-2 text-right">
                  Based on {multipliers.exotic[exoticType].sampleSize} sales
                </div>
              )}
            </div>
          )}

          {/* Year Range */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-charcoal mb-3">Year Produced</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['2020+', '2015-2019', '2010-2014', 'Pre-2010'].map((range) => (
                <button
                  key={range}
                  onClick={() => setYearRange(range)}
                  className={`py-4 rounded-xl font-medium transition-all ${
                    yearRange === range
                      ? 'bg-burgundy text-white'
                      : 'bg-blush/50 text-charcoal hover:bg-blush'
                  }`}
                >
                  <div className="text-sm">{range}</div>
                </button>
              ))}
            </div>
            {multipliers?.year[yearRange] && (
              <div className="text-xs text-warm-gray mt-2 text-right">
                Based on {multipliers.year[yearRange].sampleSize} sales
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-blush my-8"></div>

          {/* Result */}
          {result && (
            <div className="text-center">
              <div className="text-sm uppercase tracking-wider text-warm-gray mb-2">
                Estimated Fair Value
              </div>
              <div className="font-serif text-5xl md:text-6xl font-semibold text-burgundy mb-2">
                {formatPrice(result.estimate)}
              </div>
              <div className="text-warm-gray mb-6">
                Range: {formatPrice(result.low)} — {formatPrice(result.high)}
              </div>
              
              {/* Confidence Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                result.confidence === 'High' 
                  ? 'bg-green-100 text-green-800' 
                  : result.confidence === 'Medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  result.confidence === 'High' 
                    ? 'bg-green-500' 
                    : result.confidence === 'Medium'
                    ? 'bg-yellow-500'
                    : 'bg-orange-500'
                }`}></span>
                {result.confidence} Confidence
              </div>

              {/* Breakdown */}
              <div className="mt-8 p-6 bg-blush/30 rounded-2xl text-left">
                <div className="text-sm font-medium text-charcoal mb-4">How we calculated this:</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-warm-gray">Baseline (Standard B30)</span>
                    <span className="font-medium">{formatPrice(result.breakdown.baseline)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warm-gray">Size {size} multiplier</span>
                    <span className="font-medium">×{result.breakdown.sizeMult.toFixed(2)}</span>
                  </div>
                  {isExotic && (
                    <div className="flex justify-between">
                      <span className="text-warm-gray">{exoticType} multiplier</span>
                      <span className="font-medium">×{result.breakdown.exoticMult.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-warm-gray">{yearRange} multiplier</span>
                    <span className="font-medium">×{result.breakdown.yearMult.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-blush pt-2 mt-2 flex justify-between font-medium">
                    <span>Estimated Value</span>
                    <span className="text-burgundy">{formatPrice(result.estimate)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 text-center text-sm text-warm-gray">
          <p>
            Estimates are based on {totalSales} verified auction sales. Actual values may vary 
            based on condition, provenance, color, and market conditions.
          </p>
        </div>
      </div>
    </div>
  )
}
