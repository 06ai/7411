'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface PremiumData {
  value: number
  sampleSize: number
}

interface Premiums {
  size: { [key: number]: PremiumData }
  exotic: { [key: string]: PremiumData }
  leather: { [key: string]: PremiumData }
  year: { [key: string]: PremiumData }
  color: { [key: string]: PremiumData }
  hardware: { [key: string]: PremiumData }
  baseline: { value: number; sampleSize: number }
}

export default function EstimatePage() {
  const [premiums, setPremiums] = useState<Premiums | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalSales, setTotalSales] = useState(0)
  
  // User selections
  const [size, setSize] = useState<number>(30)
  const [isExotic, setIsExotic] = useState<boolean>(false)
  const [exoticType, setExoticType] = useState<string>('Crocodile')
  const [leatherType, setLeatherType] = useState<string>('Togo')
  const [yearRange, setYearRange] = useState<string>('2015-2019')
  const [hardware, setHardware] = useState<string>('Gold')
  const [color, setColor] = useState<string>('Neutral')

  useEffect(() => {
    async function calculatePremiums() {
      const { data: salesData } = await supabase
        .from('sales')
        .select(`
          sale_price,
          sale_date,
          bags!inner (size, is_exotic, exotic_type, leather_type, year, hardware, color)
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

      // BASELINE: Standard B30 Togo median (the most common configuration)
      const baselineSales = standardSales.filter((s: any) => {
        const lt = s.bags.leather_type?.toLowerCase() || ''
        return s.bags.size === 30 && lt.includes('togo')
      })
      const baselinePrices = baselineSales.map((s: any) => Number(s.sale_price))
      
      // Fallback to all standard B30 if not enough Togo
      const standardB30Prices = standardSales
        .filter((s: any) => s.bags.size === 30)
        .map((s: any) => Number(s.sale_price))
      
      const baselineValue = baselinePrices.length >= 5 ? median(baselinePrices) : median(standardB30Prices)
      
      const baseline = {
        value: baselineValue,
        sampleSize: baselinePrices.length >= 5 ? baselinePrices.length : standardB30Prices.length
      }

      // SIZE PREMIUMS (vs B30)
      const sizePremiums: { [key: number]: PremiumData } = {}
      const sizes = [25, 30, 35, 40]
      const standardB30Median = median(standardB30Prices)
      
      for (const s of sizes) {
        const sizePrices = standardSales
          .filter((sale: any) => sale.bags.size === s)
          .map((sale: any) => Number(sale.sale_price))
        
        const sizeMedian = median(sizePrices)
        sizePremiums[s] = {
          value: sizeMedian - standardB30Median,
          sampleSize: sizePrices.length
        }
      }

      // EXOTIC PREMIUMS (vs standard same-size median)
      const exoticPremiums: { [key: string]: PremiumData } = {}
      const standardAllMedian = median(standardSales.map((s: any) => Number(s.sale_price)))
      
      const exoticTypes = ['Crocodile', 'Alligator', 'Ostrich', 'Lizard']
      
      for (const type of exoticTypes) {
        const typeSales = exoticSales.filter((s: any) => {
          const eType = s.bags.exotic_type || ''
          const leather = s.bags.leather_type?.toLowerCase() || ''
          if (type === 'Crocodile') {
            return (eType.toLowerCase().includes('croc') || leather.includes('croc')) && 
                   !eType.toLowerCase().includes('alligator') && !leather.includes('alligator')
          }
          if (type === 'Alligator') {
            return eType.toLowerCase().includes('alligator') || leather.includes('alligator')
          }
          return eType.toLowerCase().includes(type.toLowerCase()) || leather.includes(type.toLowerCase())
        })
        
        const typePrices = typeSales.map((s: any) => Number(s.sale_price))
        const typeMedian = median(typePrices)
        
        exoticPremiums[type] = {
          value: typePrices.length > 0 ? typeMedian - standardAllMedian : 20000,
          sampleSize: typePrices.length
        }
      }

      // STANDARD LEATHER PREMIUMS (vs Togo baseline)
      const leatherPremiums: { [key: string]: PremiumData } = {}
      const standardLeathers = ['Togo', 'Epsom', 'Clemence', 'Swift', 'Chevre', 'Box', 'Barenia']
      
      // Get Togo median as leather baseline
      const togoSales = standardSales.filter((s: any) => {
        const lt = s.bags.leather_type?.toLowerCase() || ''
        return lt.includes('togo')
      })
      const togoMedian = median(togoSales.map((s: any) => Number(s.sale_price)))
      
      for (const leather of standardLeathers) {
        const leatherSales = standardSales.filter((s: any) => {
          const lt = s.bags.leather_type?.toLowerCase() || ''
          return lt.includes(leather.toLowerCase())
        })
        
        const leatherPrices = leatherSales.map((s: any) => Number(s.sale_price))
        const leatherMedian = median(leatherPrices)
        
        leatherPremiums[leather] = {
          value: leatherPrices.length > 0 ? leatherMedian - togoMedian : 0,
          sampleSize: leatherPrices.length
        }
      }

      // YEAR PREMIUMS (vs 2015-2019 baseline)
      const yearPremiums: { [key: string]: PremiumData } = {}
      const yearRanges: { [key: string]: (y: number) => boolean } = {
        '2020+': (y: number) => y >= 2020,
        '2015-2019': (y: number) => y >= 2015 && y <= 2019,
        '2010-2014': (y: number) => y >= 2010 && y <= 2014,
        'Pre-2010': (y: number) => y < 2010
      }

      // Get 2015-2019 as year baseline
      const baselineYearSales = standardSales.filter((s: any) => {
        const year = s.bags.year
        return year && year >= 2015 && year <= 2019
      })
      const baselineYearMedian = median(baselineYearSales.map((s: any) => Number(s.sale_price)))

      for (const [range, filter] of Object.entries(yearRanges)) {
        const rangeSales = standardSales.filter((s: any) => {
          const year = s.bags.year
          return year && filter(year)
        })
        
        const rangePrices = rangeSales.map((s: any) => Number(s.sale_price))
        const rangeMedian = median(rangePrices)
        
        yearPremiums[range] = {
          value: rangePrices.length > 0 ? rangeMedian - baselineYearMedian : 0,
          sampleSize: rangePrices.length
        }
      }

      // HARDWARE PREMIUMS (vs Palladium baseline)
      const hardwarePremiums: { [key: string]: PremiumData } = {}
      
      const palladiumSales = standardSales.filter((s: any) => {
        const hw = s.bags.hardware?.toLowerCase() || ''
        return hw.includes('palladium')
      })
      const goldSales = standardSales.filter((s: any) => {
        const hw = s.bags.hardware?.toLowerCase() || ''
        return hw.includes('gold') && !hw.includes('rose') && !hw.includes('18k')
      })
      const roseGoldSales = standardSales.filter((s: any) => {
        const hw = s.bags.hardware?.toLowerCase() || ''
        return hw.includes('rose gold')
      })

      const palladiumMedian = median(palladiumSales.map((s: any) => Number(s.sale_price)))
      const goldMedian = median(goldSales.map((s: any) => Number(s.sale_price)))
      const roseGoldMedian = median(roseGoldSales.map((s: any) => Number(s.sale_price)))

      hardwarePremiums['Palladium'] = { value: 0, sampleSize: palladiumSales.length }
      hardwarePremiums['Gold'] = { 
        value: goldMedian - palladiumMedian, 
        sampleSize: goldSales.length 
      }
      hardwarePremiums['Rose Gold'] = { 
        value: roseGoldSales.length > 2 ? roseGoldMedian - palladiumMedian : 2000, 
        sampleSize: roseGoldSales.length 
      }

      // COLOR PREMIUMS (vs Neutral baseline)
      const colorPremiums: { [key: string]: PremiumData } = {}
      
      const colorCategories: { [key: string]: string[] } = {
        'Neutral': ['black', 'gold', 'etoupe', 'etain', 'gris', 'noir', 'graphite', 'craie'],
        'Pink/Red': ['rose', 'rouge', 'pink', 'fuchsia', 'framboise', 'red'],
        'Blue': ['bleu', 'blue'],
        'Green': ['vert', 'green', 'bambou'],
        'Orange/Yellow': ['orange', 'jaune', 'yellow', 'lime', 'curry'],
        'Brown/Tan': ['brown', 'tan', 'caramel', 'marron', 'fauve', 'naturel', 'gold']
      }

      // Get Neutral as color baseline
      const neutralSales = standardSales.filter((s: any) => {
        const c = s.bags.color?.toLowerCase() || ''
        return colorCategories['Neutral'].some(k => c.includes(k))
      })
      const neutralMedian = median(neutralSales.map((s: any) => Number(s.sale_price)))

      for (const [category, keywords] of Object.entries(colorCategories)) {
        const categorySales = standardSales.filter((s: any) => {
          const c = s.bags.color?.toLowerCase() || ''
          return keywords.some(k => c.includes(k))
        })
        
        const categoryPrices = categorySales.map((s: any) => Number(s.sale_price))
        const categoryMedian = median(categoryPrices)
        
        colorPremiums[category] = {
          value: categoryPrices.length > 0 ? categoryMedian - neutralMedian : 0,
          sampleSize: categoryPrices.length
        }
      }

      setPremiums({
        size: sizePremiums,
        exotic: exoticPremiums,
        leather: leatherPremiums,
        year: yearPremiums,
        color: colorPremiums,
        hardware: hardwarePremiums,
        baseline
      })
      
      setLoading(false)
    }

    calculatePremiums()
  }, [])

  // Calculate estimate using ADDITIVE approach
  const calculateEstimate = () => {
    if (!premiums) return null

    const baseline = premiums.baseline.value
    const sizePremium = premiums.size[size]?.value || 0
    const yearPremium = premiums.year[yearRange]?.value || 0
    const colorPremium = premiums.color[color]?.value || 0
    const hwPremium = premiums.hardware[hardware]?.value || 0
    
    let leatherOrExoticPremium = 0
    
    if (isExotic) {
      leatherOrExoticPremium = premiums.exotic[exoticType]?.value || 20000
    } else {
      leatherOrExoticPremium = premiums.leather[leatherType]?.value || 0
    }

    // ADDITIVE: Baseline + all premiums
    const estimate = baseline + sizePremium + leatherOrExoticPremium + yearPremium + colorPremium + hwPremium

    // Calculate confidence
    const sampleSizes = [
      premiums.size[size]?.sampleSize || 0,
      premiums.year[yearRange]?.sampleSize || 0,
      premiums.color[color]?.sampleSize || 10,
      premiums.hardware[hardware]?.sampleSize || 0
    ]
    
    if (isExotic) {
      sampleSizes.push(premiums.exotic[exoticType]?.sampleSize || 0)
    } else {
      sampleSizes.push(premiums.leather[leatherType]?.sampleSize || 0)
    }
    
    const minSampleSize = Math.min(...sampleSizes)
    const confidenceRange = minSampleSize >= 10 ? 0.12 : minSampleSize >= 5 ? 0.18 : 0.25

    return {
      estimate: Math.round(estimate),
      low: Math.round(estimate * (1 - confidenceRange)),
      high: Math.round(estimate * (1 + confidenceRange)),
      confidence: minSampleSize >= 10 ? 'High' : minSampleSize >= 5 ? 'Medium' : 'Low',
      breakdown: {
        baseline,
        sizePremium,
        leatherOrExoticPremium,
        yearPremium,
        colorPremium,
        hwPremium,
        sizeSamples: premiums.size[size]?.sampleSize || 0,
        leatherSamples: !isExotic ? (premiums.leather[leatherType]?.sampleSize || 0) : null,
        exoticSamples: isExotic ? (premiums.exotic[exoticType]?.sampleSize || 0) : null,
        yearSamples: premiums.year[yearRange]?.sampleSize || 0,
        colorSamples: premiums.color[color]?.sampleSize || 0,
        hwSamples: premiums.hardware[hardware]?.sampleSize || 0
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

  function formatPremium(value: number): string {
    if (value === 0) return '—'
    const prefix = value > 0 ? '+' : ''
    return prefix + formatPrice(value)
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
            {premiums?.size[size] && (
              <div className="text-xs text-warm-gray mt-2 text-right">
                {formatPremium(premiums.size[size].value)} vs B30 • {premiums.size[size].sampleSize} sales
              </div>
            )}
          </div>

          {/* Leather Type - Standard vs Exotic */}
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
                <div className="text-xs opacity-75">Togo, Epsom, Swift, etc.</div>
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

          {/* Standard Leather Selection */}
          {!isExotic && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-charcoal mb-3">Standard Leather</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Togo', 'Epsom', 'Clemence', 'Swift', 'Chevre', 'Box', 'Barenia'].map((leather) => (
                  <button
                    key={leather}
                    onClick={() => setLeatherType(leather)}
                    className={`py-3 px-2 rounded-xl font-medium transition-all ${
                      leatherType === leather
                        ? 'bg-burgundy text-white'
                        : 'bg-blush/50 text-charcoal hover:bg-blush'
                    }`}
                  >
                    <div className="text-sm">{leather}</div>
                  </button>
                ))}
              </div>
              {premiums?.leather[leatherType] && (
                <div className="text-xs text-warm-gray mt-2 text-right">
                  {formatPremium(premiums.leather[leatherType].value)} vs Togo • {premiums.leather[leatherType].sampleSize} sales
                </div>
              )}
            </div>
          )}

          {/* Exotic Type */}
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
              {premiums?.exotic[exoticType] && (
                <div className="text-xs text-warm-gray mt-2 text-right">
                  {formatPremium(premiums.exotic[exoticType].value)} vs standard • {premiums.exotic[exoticType].sampleSize} sales
                </div>
              )}
            </div>
          )}

          {/* Hardware Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-charcoal mb-3">Hardware</label>
            <div className="grid grid-cols-3 gap-3">
              {['Gold', 'Palladium', 'Rose Gold'].map((hw) => (
                <button
                  key={hw}
                  onClick={() => setHardware(hw)}
                  className={`py-4 rounded-xl font-medium transition-all ${
                    hardware === hw
                      ? 'bg-burgundy text-white'
                      : 'bg-blush/50 text-charcoal hover:bg-blush'
                  }`}
                >
                  <div className="text-xl mb-1">
                    {hw === 'Gold' ? '🥇' : hw === 'Palladium' ? '🥈' : '🌹'}
                  </div>
                  <div className="text-sm">{hw}</div>
                </button>
              ))}
            </div>
            {premiums?.hardware[hardware] && (
              <div className="text-xs text-warm-gray mt-2 text-right">
                {formatPremium(premiums.hardware[hardware].value)} vs Palladium • {premiums.hardware[hardware].sampleSize} sales
              </div>
            )}
          </div>

          {/* Color Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-charcoal mb-3">Color Family</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['Neutral', 'Pink/Red', 'Blue', 'Green', 'Orange/Yellow', 'Brown/Tan'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`py-4 rounded-xl font-medium transition-all ${
                    color === c
                      ? 'bg-burgundy text-white'
                      : 'bg-blush/50 text-charcoal hover:bg-blush'
                  }`}
                >
                  <div className="text-xl mb-1">
                    {c === 'Neutral' ? '⬛' : 
                     c === 'Pink/Red' ? '🩷' : 
                     c === 'Blue' ? '💙' : 
                     c === 'Green' ? '💚' : 
                     c === 'Orange/Yellow' ? '🧡' : '🤎'}
                  </div>
                  <div className="text-sm">{c}</div>
                  <div className="text-xs opacity-75">
                    {c === 'Neutral' ? 'Black, Gold, Etoupe' : 
                     c === 'Pink/Red' ? 'Rose, Rouge, Fuchsia' : 
                     c === 'Blue' ? 'Bleu shades' : 
                     c === 'Green' ? 'Vert shades' : 
                     c === 'Orange/Yellow' ? 'Orange, Lime' : 'Tan, Caramel'}
                  </div>
                </button>
              ))}
            </div>
            {premiums?.color[color] && (
              <div className="text-xs text-warm-gray mt-2 text-right">
                {formatPremium(premiums.color[color].value)} vs Neutral • {premiums.color[color].sampleSize} sales
              </div>
            )}
          </div>

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
            {premiums?.year[yearRange] && (
              <div className="text-xs text-warm-gray mt-2 text-right">
                {formatPremium(premiums.year[yearRange].value)} vs 2015-2019 • {premiums.year[yearRange].sampleSize} sales
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
                    <span className="text-warm-gray">Baseline (B30 Togo)</span>
                    <span className="font-medium">{formatPrice(result.breakdown.baseline)}</span>
                  </div>
                  {result.breakdown.sizePremium !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Size {size} adjustment</span>
                      <span className="font-medium">{formatPremium(result.breakdown.sizePremium)}</span>
                    </div>
                  )}
                  {!isExotic && result.breakdown.leatherOrExoticPremium !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-gray">{leatherType} leather adjustment</span>
                      <span className="font-medium">{formatPremium(result.breakdown.leatherOrExoticPremium)}</span>
                    </div>
                  )}
                  {isExotic && (
                    <div className="flex justify-between">
                      <span className="text-warm-gray">{exoticType} premium</span>
                      <span className="font-medium">{formatPremium(result.breakdown.leatherOrExoticPremium)}</span>
                    </div>
                  )}
                  {result.breakdown.yearPremium !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-gray">{yearRange} adjustment</span>
                      <span className="font-medium">{formatPremium(result.breakdown.yearPremium)}</span>
                    </div>
                  )}
                  {result.breakdown.colorPremium !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-gray">{color} color adjustment</span>
                      <span className="font-medium">{formatPremium(result.breakdown.colorPremium)}</span>
                    </div>
                  )}
                  {result.breakdown.hwPremium !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-gray">{hardware} hardware</span>
                      <span className="font-medium">{formatPremium(result.breakdown.hwPremium)}</span>
                    </div>
                  )}
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
            based on condition, provenance, and market conditions. Resale platforms typically add 15-30% markup.
          </p>
        </div>
      </div>
    </div>
  )
}
