'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface PremiumData {
  value: number
  sampleSize: number
}

interface ModelData {
  // Additive premiums for standard bags
  sizePremiums: { [key: number]: PremiumData }
  leatherPremiums: { [key: string]: PremiumData }
  yearPremiums: { [key: string]: PremiumData }
  colorPremiums: { [key: string]: PremiumData }
  hardwarePremiums: { [key: string]: PremiumData }
  
  // Ratio multipliers for exotic
  exoticRatios: { [key: string]: PremiumData }
  
  baseline: { value: number; sampleSize: number }
}

export default function EstimatePage() {
  const [model, setModel] = useState<ModelData | null>(null)
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
    async function calculateModel() {
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

      const median = (prices: number[]): number => {
        if (prices.length === 0) return 0
        const sorted = [...prices].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
      }

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

      // === ADDITIVE PREMIUMS (for standard bags) ===

      // SIZE PREMIUMS (vs B30)
      const sizePremiums: { [key: number]: PremiumData } = {}
      const standardB30Median = median(standardB30Prices)
      
      for (const s of [25, 30, 35, 40]) {
        const sizePrices = standardSales
          .filter((sale: any) => sale.bags.size === s)
          .map((sale: any) => Number(sale.sale_price))
        
        sizePremiums[s] = {
          value: median(sizePrices) - standardB30Median,
          sampleSize: sizePrices.length
        }
      }

      // LEATHER PREMIUMS (vs Togo)
      const leatherPremiums: { [key: string]: PremiumData } = {}
      const togoSales = standardSales.filter((s: any) => 
        (s.bags.leather_type || '').toLowerCase().includes('togo')
      )
      const togoMedian = median(togoSales.map((s: any) => Number(s.sale_price)))
      
      for (const leather of ['Togo', 'Epsom', 'Clemence', 'Swift', 'Chevre', 'Box', 'Barenia']) {
        const leatherSales = standardSales.filter((s: any) => 
          (s.bags.leather_type || '').toLowerCase().includes(leather.toLowerCase())
        )
        const prices = leatherSales.map((s: any) => Number(s.sale_price))
        
        leatherPremiums[leather] = {
          value: prices.length > 0 ? median(prices) - togoMedian : 0,
          sampleSize: prices.length
        }
      }

      // YEAR PREMIUMS (vs 2015-2019)
      const yearPremiums: { [key: string]: PremiumData } = {}
      const yearRanges: { [key: string]: (y: number) => boolean } = {
        '2020+': (y) => y >= 2020,
        '2015-2019': (y) => y >= 2015 && y <= 2019,
        '2010-2014': (y) => y >= 2010 && y <= 2014,
        'Pre-2010': (y) => y < 2010
      }
      const baselineYearPrices = standardSales
        .filter((s: any) => s.bags.year >= 2015 && s.bags.year <= 2019)
        .map((s: any) => Number(s.sale_price))
      const baselineYearMedian = median(baselineYearPrices)

      for (const [range, filter] of Object.entries(yearRanges)) {
        const rangeSales = standardSales.filter((s: any) => s.bags.year && filter(s.bags.year))
        const prices = rangeSales.map((s: any) => Number(s.sale_price))
        
        yearPremiums[range] = {
          value: prices.length > 0 ? median(prices) - baselineYearMedian : 0,
          sampleSize: prices.length
        }
      }

      // HARDWARE PREMIUMS (vs Palladium)
      const hardwarePremiums: { [key: string]: PremiumData } = {}
      const palladiumSales = standardSales.filter((s: any) => 
        (s.bags.hardware || '').toLowerCase().includes('palladium')
      )
      const palladiumMedian = median(palladiumSales.map((s: any) => Number(s.sale_price)))

      for (const hw of ['Gold', 'Palladium', 'Rose Gold']) {
        const hwSales = standardSales.filter((s: any) => {
          const h = (s.bags.hardware || '').toLowerCase()
          if (hw === 'Gold') return h.includes('gold') && !h.includes('rose')
          if (hw === 'Palladium') return h.includes('palladium')
          return h.includes('rose gold')
        })
        const prices = hwSales.map((s: any) => Number(s.sale_price))
        
        hardwarePremiums[hw] = {
          value: prices.length > 0 ? median(prices) - palladiumMedian : 0,
          sampleSize: prices.length
        }
      }

      // COLOR PREMIUMS (vs Neutral)
      const colorPremiums: { [key: string]: PremiumData } = {}
      const colorCategories: { [key: string]: string[] } = {
        'Neutral': ['black', 'gold', 'etoupe', 'etain', 'gris', 'noir', 'graphite', 'craie'],
        'Pink/Red': ['rose', 'rouge', 'pink', 'fuchsia', 'framboise', 'red'],
        'Blue': ['bleu', 'blue'],
        'Green': ['vert', 'green', 'bambou'],
        'Orange/Yellow': ['orange', 'jaune', 'yellow', 'lime', 'curry'],
        'Brown/Tan': ['brown', 'tan', 'caramel', 'marron', 'fauve', 'naturel']
      }

      const neutralSales = standardSales.filter((s: any) => {
        const c = (s.bags.color || '').toLowerCase()
        return colorCategories['Neutral'].some(k => c.includes(k))
      })
      const neutralMedian = median(neutralSales.map((s: any) => Number(s.sale_price)))

      for (const [category, keywords] of Object.entries(colorCategories)) {
        const catSales = standardSales.filter((s: any) => {
          const c = (s.bags.color || '').toLowerCase()
          return keywords.some(k => c.includes(k))
        })
        const prices = catSales.map((s: any) => Number(s.sale_price))
        
        colorPremiums[category] = {
          value: prices.length > 0 ? median(prices) - neutralMedian : 0,
          sampleSize: prices.length
        }
      }

      // === RATIO MULTIPLIERS (for exotic bags) ===
      const exoticRatios: { [key: string]: PremiumData } = {}
      const standardAllMedian = median(standardSales.map((s: any) => Number(s.sale_price)))

      for (const type of ['Crocodile', 'Alligator', 'Ostrich', 'Lizard']) {
        const typeSales = exoticSales.filter((s: any) => {
          const et = (s.bags.exotic_type || '').toLowerCase()
          const lt = (s.bags.leather_type || '').toLowerCase()
          if (type === 'Crocodile') {
            return (et.includes('croc') || lt.includes('croc')) && 
                   !et.includes('alligator') && !lt.includes('alligator')
          }
          if (type === 'Alligator') {
            return et.includes('alligator') || lt.includes('alligator')
          }
          return et.includes(type.toLowerCase()) || lt.includes(type.toLowerCase())
        })
        
        const prices = typeSales.map((s: any) => Number(s.sale_price))
        const typeMedian = prices.length > 0 ? median(prices) : standardAllMedian * 2.5
        
        exoticRatios[type] = {
          value: typeMedian / standardAllMedian,
          sampleSize: prices.length
        }
      }

      setModel({
        sizePremiums,
        leatherPremiums,
        yearPremiums,
        colorPremiums,
        hardwarePremiums,
        exoticRatios,
        baseline
      })
      
      setLoading(false)
    }

    calculateModel()
  }, [])

  // HYBRID CALCULATION
  const calculateEstimate = () => {
    if (!model) return null

    // Step 1: Calculate standard base using ADDITIVE approach
    const baseline = model.baseline.value
    const sizePremium = model.sizePremiums[size]?.value || 0
    const leatherPremium = model.leatherPremiums[leatherType]?.value || 0
    const yearPremium = model.yearPremiums[yearRange]?.value || 0
    const colorPremium = model.colorPremiums[color]?.value || 0
    const hwPremium = model.hardwarePremiums[hardware]?.value || 0

    // Standard bag value (additive)
    const standardValue = baseline + sizePremium + leatherPremium + yearPremium + colorPremium + hwPremium

    let estimate: number
    let exoticRatio = 1

    if (isExotic) {
      // Step 2: For exotic, multiply by exotic ratio
      exoticRatio = model.exoticRatios[exoticType]?.value || 2.5
      estimate = standardValue * exoticRatio
    } else {
      estimate = standardValue
    }

    // Confidence calculation
    const sampleSizes = [
      model.sizePremiums[size]?.sampleSize || 0,
      model.yearPremiums[yearRange]?.sampleSize || 0,
      model.colorPremiums[color]?.sampleSize || 10,
      model.hardwarePremiums[hardware]?.sampleSize || 0
    ]
    
    if (isExotic) {
      sampleSizes.push(model.exoticRatios[exoticType]?.sampleSize || 0)
    } else {
      sampleSizes.push(model.leatherPremiums[leatherType]?.sampleSize || 0)
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
        leatherPremium: isExotic ? 0 : leatherPremium,
        yearPremium,
        colorPremium,
        hwPremium,
        standardValue,
        exoticRatio: isExotic ? exoticRatio : null,
        sizeSamples: model.sizePremiums[size]?.sampleSize || 0,
        leatherSamples: !isExotic ? (model.leatherPremiums[leatherType]?.sampleSize || 0) : null,
        exoticSamples: isExotic ? (model.exoticRatios[exoticType]?.sampleSize || 0) : null,
        yearSamples: model.yearPremiums[yearRange]?.sampleSize || 0,
        colorSamples: model.colorPremiums[color]?.sampleSize || 0,
        hwSamples: model.hardwarePremiums[hardware]?.sampleSize || 0
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
            {model?.sizePremiums[size] && (
              <div className="text-xs text-warm-gray mt-2 text-right">
                {formatPremium(model.sizePremiums[size].value)} vs B30 • {model.sizePremiums[size].sampleSize} sales
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
              {model?.leatherPremiums[leatherType] && (
                <div className="text-xs text-warm-gray mt-2 text-right">
                  {formatPremium(model.leatherPremiums[leatherType].value)} vs Togo • {model.leatherPremiums[leatherType].sampleSize} sales
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
              {model?.exoticRatios[exoticType] && (
                <div className="text-xs text-warm-gray mt-2 text-right">
                  ×{model.exoticRatios[exoticType].value.toFixed(2)} multiplier • {model.exoticRatios[exoticType].sampleSize} sales
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
            {model?.hardwarePremiums[hardware] && (
              <div className="text-xs text-warm-gray mt-2 text-right">
                {formatPremium(model.hardwarePremiums[hardware].value)} vs Palladium • {model.hardwarePremiums[hardware].sampleSize} sales
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
            {model?.colorPremiums[color] && (
              <div className="text-xs text-warm-gray mt-2 text-right">
                {formatPremium(model.colorPremiums[color].value)} vs Neutral • {model.colorPremiums[color].sampleSize} sales
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
            {model?.yearPremiums[yearRange] && (
              <div className="text-xs text-warm-gray mt-2 text-right">
                {formatPremium(model.yearPremiums[yearRange].value)} vs 2015-2019 • {model.yearPremiums[yearRange].sampleSize} sales
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
                    <span className="text-warm-gray">Baseline (B30 Standard)</span>
                    <span className="font-medium">{formatPrice(result.breakdown.baseline)}</span>
                  </div>
                  {result.breakdown.sizePremium !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Size {size} adjustment</span>
                      <span className="font-medium">{formatPremium(result.breakdown.sizePremium)}</span>
                    </div>
                  )}
                  {!isExotic && result.breakdown.leatherPremium !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-gray">{leatherType} leather</span>
                      <span className="font-medium">{formatPremium(result.breakdown.leatherPremium)}</span>
                    </div>
                  )}
                  {result.breakdown.yearPremium !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-gray">{yearRange} year</span>
                      <span className="font-medium">{formatPremium(result.breakdown.yearPremium)}</span>
                    </div>
                  )}
                  {result.breakdown.colorPremium !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-gray">{color} color</span>
                      <span className="font-medium">{formatPremium(result.breakdown.colorPremium)}</span>
                    </div>
                  )}
                  {result.breakdown.hwPremium !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-gray">{hardware} hardware</span>
                      <span className="font-medium">{formatPremium(result.breakdown.hwPremium)}</span>
                    </div>
                  )}
                  
                  {isExotic && (
                    <>
                      <div className="border-t border-blush pt-2 mt-2 flex justify-between">
                        <span className="text-warm-gray">Standard equivalent</span>
                        <span className="font-medium">{formatPrice(result.breakdown.standardValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-warm-gray">{exoticType} multiplier</span>
                        <span className="font-medium">×{result.breakdown.exoticRatio?.toFixed(2)}</span>
                      </div>
                    </>
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
