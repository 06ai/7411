// R² Comparison: Ratio-based vs Additive pricing models
// Run this in browser console on your site, or as a Node script

// This is a React component that calculates and displays R² for both models
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SaleData {
  actual: number
  size: number
  isExotic: boolean
  exoticType: string | null
  leatherType: string | null
  year: number | null
  hardware: string | null
  color: string | null
}

export default function ModelComparisonPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function analyzeModels() {
      const { data: salesData } = await supabase
        .from('sales')
        .select(`
          sale_price,
          bags!inner (size, is_exotic, exotic_type, leather_type, year, hardware, color)
        `)

      if (!salesData || salesData.length === 0) {
        setLoading(false)
        return
      }

      // Prepare data
      const sales: SaleData[] = salesData.map((s: any) => ({
        actual: Number(s.sale_price),
        size: s.bags.size,
        isExotic: s.bags.is_exotic,
        exoticType: s.bags.exotic_type,
        leatherType: s.bags.leather_type,
        year: s.bags.year,
        hardware: s.bags.hardware,
        color: s.bags.color
      }))

      // Helper functions
      const median = (arr: number[]): number => {
        if (arr.length === 0) return 0
        const sorted = [...arr].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
      }

      const mean = (arr: number[]): number => {
        if (arr.length === 0) return 0
        return arr.reduce((a, b) => a + b, 0) / arr.length
      }

      // Calculate R²
      const calculateR2 = (actual: number[], predicted: number[]): number => {
        const meanActual = mean(actual)
        const ssTotal = actual.reduce((sum, y) => sum + Math.pow(y - meanActual, 2), 0)
        const ssResidual = actual.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0)
        return 1 - (ssResidual / ssTotal)
      }

      // Calculate MAE (Mean Absolute Error)
      const calculateMAE = (actual: number[], predicted: number[]): number => {
        return mean(actual.map((a, i) => Math.abs(a - predicted[i])))
      }

      // Calculate MAPE (Mean Absolute Percentage Error)
      const calculateMAPE = (actual: number[], predicted: number[]): number => {
        return mean(actual.map((a, i) => Math.abs((a - predicted[i]) / a))) * 100
      }

      // Separate standard and exotic for baseline calculations
      const standardSales = sales.filter(s => !s.isExotic)
      const exoticSales = sales.filter(s => s.isExotic)

      // === CALCULATE BASELINES AND FACTORS ===
      
      // Baseline: Standard B30 median
      const standardB30Prices = standardSales.filter(s => s.size === 30).map(s => s.actual)
      const baseline = median(standardB30Prices)

      // Size medians
      const sizeMedians: { [key: number]: number } = {}
      const sizePremiums: { [key: number]: number } = {}
      for (const size of [25, 30, 35, 40]) {
        const prices = standardSales.filter(s => s.size === size).map(s => s.actual)
        sizeMedians[size] = median(prices)
        sizePremiums[size] = sizeMedians[size] - sizeMedians[30]
      }

      // Exotic factors
      const standardMedian = median(standardSales.map(s => s.actual))
      const exoticMedians: { [key: string]: number } = {}
      const exoticPremiums: { [key: string]: number } = {}
      for (const type of ['Crocodile', 'Alligator', 'Ostrich', 'Lizard']) {
        const typeSales = exoticSales.filter(s => {
          const et = (s.exoticType || '').toLowerCase()
          const lt = (s.leatherType || '').toLowerCase()
          if (type === 'Crocodile') return (et.includes('croc') || lt.includes('croc')) && !et.includes('alligator')
          if (type === 'Alligator') return et.includes('alligator') || lt.includes('alligator')
          return et.includes(type.toLowerCase()) || lt.includes(type.toLowerCase())
        })
        const prices = typeSales.map(s => s.actual)
        exoticMedians[type] = prices.length > 0 ? median(prices) : standardMedian * 2.5
        exoticPremiums[type] = exoticMedians[type] - standardMedian
      }

      // Year factors
      const yearRanges = {
        '2020+': (y: number) => y >= 2020,
        '2015-2019': (y: number) => y >= 2015 && y <= 2019,
        '2010-2014': (y: number) => y >= 2010 && y <= 2014,
        'Pre-2010': (y: number) => y < 2010
      }
      const yearMedians: { [key: string]: number } = {}
      const yearPremiums: { [key: string]: number } = {}
      const baselineYearMedian = median(standardSales.filter(s => s.year && s.year >= 2015 && s.year <= 2019).map(s => s.actual))
      
      for (const [range, filter] of Object.entries(yearRanges)) {
        const prices = standardSales.filter(s => s.year && filter(s.year)).map(s => s.actual)
        yearMedians[range] = prices.length > 0 ? median(prices) : standardMedian
        yearPremiums[range] = yearMedians[range] - baselineYearMedian
      }

      // Hardware factors
      const hwMedians: { [key: string]: number } = {}
      const hwPremiums: { [key: string]: number } = {}
      const palladiumPrices = standardSales.filter(s => (s.hardware || '').toLowerCase().includes('palladium')).map(s => s.actual)
      const palladiumMedian = median(palladiumPrices)
      
      for (const hw of ['Gold', 'Palladium', 'Rose Gold']) {
        const hwSales = standardSales.filter(s => {
          const h = (s.hardware || '').toLowerCase()
          if (hw === 'Gold') return h.includes('gold') && !h.includes('rose')
          if (hw === 'Palladium') return h.includes('palladium')
          return h.includes('rose gold')
        })
        const prices = hwSales.map(s => s.actual)
        hwMedians[hw] = prices.length > 0 ? median(prices) : palladiumMedian
        hwPremiums[hw] = hwMedians[hw] - palladiumMedian
      }

      // === PREDICT USING BOTH MODELS ===
      
      const getYearRange = (year: number | null): string => {
        if (!year) return '2015-2019'
        if (year >= 2020) return '2020+'
        if (year >= 2015) return '2015-2019'
        if (year >= 2010) return '2010-2014'
        return 'Pre-2010'
      }

      const getHardwareType = (hw: string | null): string => {
        const h = (hw || '').toLowerCase()
        if (h.includes('rose gold')) return 'Rose Gold'
        if (h.includes('gold')) return 'Gold'
        return 'Palladium'
      }

      const getExoticType = (sale: SaleData): string => {
        const et = (sale.exoticType || '').toLowerCase()
        const lt = (sale.leatherType || '').toLowerCase()
        if (et.includes('alligator') || lt.includes('alligator')) return 'Alligator'
        if (et.includes('ostrich') || lt.includes('ostrich')) return 'Ostrich'
        if (et.includes('lizard') || lt.includes('lizard')) return 'Lizard'
        return 'Crocodile'
      }

      // Model 1: RATIO-BASED (multiplicative)
      const ratioPredictions = sales.map(sale => {
        const sizeRatio = (sizeMedians[sale.size] || sizeMedians[30]) / sizeMedians[30]
        const yearRange = getYearRange(sale.year)
        const yearRatio = (yearMedians[yearRange] || standardMedian) / standardMedian
        const hwType = getHardwareType(sale.hardware)
        const hwRatio = (hwMedians[hwType] || palladiumMedian) / palladiumMedian

        if (sale.isExotic) {
          const exoticType = getExoticType(sale)
          const exoticRatio = (exoticMedians[exoticType] || standardMedian * 2.5) / standardMedian
          return baseline * sizeRatio * exoticRatio * yearRatio
        } else {
          return baseline * sizeRatio * yearRatio * hwRatio
        }
      })

      // Model 2: ADDITIVE (dollar premiums)
      const additivePredictions = sales.map(sale => {
        const sizePremium = sizePremiums[sale.size] || 0
        const yearRange = getYearRange(sale.year)
        const yearPremium = yearPremiums[yearRange] || 0
        const hwType = getHardwareType(sale.hardware)
        const hwPremium = hwPremiums[hwType] || 0

        if (sale.isExotic) {
          const exoticType = getExoticType(sale)
          const exoticPremium = exoticPremiums[exoticType] || 20000
          return baseline + sizePremium + exoticPremium + yearPremium
        } else {
          return baseline + sizePremium + yearPremium + hwPremium
        }
      })

      // Model 3: HYBRID (additive for standard, ratio for exotic premium)
      const hybridPredictions = sales.map(sale => {
        const sizePremium = sizePremiums[sale.size] || 0
        const yearRange = getYearRange(sale.year)
        const yearPremium = yearPremiums[yearRange] || 0
        const hwType = getHardwareType(sale.hardware)
        const hwPremium = hwPremiums[hwType] || 0

        const standardBase = baseline + sizePremium + yearPremium + hwPremium

        if (sale.isExotic) {
          const exoticType = getExoticType(sale)
          const exoticRatio = (exoticMedians[exoticType] || standardMedian * 2.5) / standardMedian
          return standardBase * exoticRatio
        } else {
          return standardBase
        }
      })

      const actuals = sales.map(s => s.actual)

      // Calculate metrics
      const ratioR2 = calculateR2(actuals, ratioPredictions)
      const additiveR2 = calculateR2(actuals, additivePredictions)
      const hybridR2 = calculateR2(actuals, hybridPredictions)

      const ratioMAE = calculateMAE(actuals, ratioPredictions)
      const additiveMAE = calculateMAE(actuals, additivePredictions)
      const hybridMAE = calculateMAE(actuals, hybridPredictions)

      const ratioMAPE = calculateMAPE(actuals, ratioPredictions)
      const additiveMAPE = calculateMAPE(actuals, additivePredictions)
      const hybridMAPE = calculateMAPE(actuals, hybridPredictions)

      // Standard only
      const standardActuals = standardSales.map(s => s.actual)
      const standardRatioPred = ratioPredictions.filter((_, i) => !sales[i].isExotic)
      const standardAdditivePred = additivePredictions.filter((_, i) => !sales[i].isExotic)
      const standardHybridPred = hybridPredictions.filter((_, i) => !sales[i].isExotic)

      const standardRatioR2 = calculateR2(standardActuals, standardRatioPred)
      const standardAdditiveR2 = calculateR2(standardActuals, standardAdditivePred)
      const standardHybridR2 = calculateR2(standardActuals, standardHybridPred)

      // Exotic only
      const exoticActuals = exoticSales.map(s => s.actual)
      const exoticRatioPred = ratioPredictions.filter((_, i) => sales[i].isExotic)
      const exoticAdditivePred = additivePredictions.filter((_, i) => sales[i].isExotic)
      const exoticHybridPred = hybridPredictions.filter((_, i) => sales[i].isExotic)

      const exoticRatioR2 = calculateR2(exoticActuals, exoticRatioPred)
      const exoticAdditiveR2 = calculateR2(exoticActuals, exoticAdditivePred)
      const exoticHybridR2 = calculateR2(exoticActuals, exoticHybridPred)

      setResults({
        totalSales: sales.length,
        standardSales: standardSales.length,
        exoticSales: exoticSales.length,
        baseline,
        
        overall: {
          ratio: { r2: ratioR2, mae: ratioMAE, mape: ratioMAPE },
          additive: { r2: additiveR2, mae: additiveMAE, mape: additiveMAPE },
          hybrid: { r2: hybridR2, mae: hybridMAE, mape: hybridMAPE }
        },
        standard: {
          ratio: { r2: standardRatioR2 },
          additive: { r2: standardAdditiveR2 },
          hybrid: { r2: standardHybridR2 }
        },
        exotic: {
          ratio: { r2: exoticRatioR2 },
          additive: { r2: exoticAdditiveR2 },
          hybrid: { r2: exoticHybridR2 }
        },

        // Sample predictions for review
        samples: sales.slice(0, 10).map((s, i) => ({
          actual: s.actual,
          ratioPred: Math.round(ratioPredictions[i]),
          additivePred: Math.round(additivePredictions[i]),
          hybridPred: Math.round(hybridPredictions[i]),
          size: s.size,
          isExotic: s.isExotic,
          year: s.year
        }))
      })

      setLoading(false)
    }

    analyzeModels()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="text-xl">Analyzing models...</div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="text-xl">No data available</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">Model Comparison: R² Analysis</h1>
      
      <div className="mb-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Dataset</h2>
        <p>Total Sales: {results.totalSales}</p>
        <p>Standard: {results.standardSales} | Exotic: {results.exoticSales}</p>
        <p>Baseline (B30): ${results.baseline.toLocaleString()}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Ratio-Based (Multiplicative)</h3>
          <div className="space-y-2">
            <p><strong>Overall R²:</strong> {(results.overall.ratio.r2 * 100).toFixed(1)}%</p>
            <p><strong>Standard R²:</strong> {(results.standard.ratio.r2 * 100).toFixed(1)}%</p>
            <p><strong>Exotic R²:</strong> {(results.exotic.ratio.r2 * 100).toFixed(1)}%</p>
            <p><strong>MAE:</strong> ${results.overall.ratio.mae.toLocaleString()}</p>
            <p><strong>MAPE:</strong> {results.overall.ratio.mape.toFixed(1)}%</p>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Additive (Dollar Premiums)</h3>
          <div className="space-y-2">
            <p><strong>Overall R²:</strong> {(results.overall.additive.r2 * 100).toFixed(1)}%</p>
            <p><strong>Standard R²:</strong> {(results.standard.additive.r2 * 100).toFixed(1)}%</p>
            <p><strong>Exotic R²:</strong> {(results.exotic.additive.r2 * 100).toFixed(1)}%</p>
            <p><strong>MAE:</strong> ${results.overall.additive.mae.toLocaleString()}</p>
            <p><strong>MAPE:</strong> {results.overall.additive.mape.toFixed(1)}%</p>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow border-2 border-blue-500">
          <h3 className="text-lg font-semibold mb-4">Hybrid (Additive + Exotic Ratio)</h3>
          <div className="space-y-2">
            <p><strong>Overall R²:</strong> {(results.overall.hybrid.r2 * 100).toFixed(1)}%</p>
            <p><strong>Standard R²:</strong> {(results.standard.hybrid.r2 * 100).toFixed(1)}%</p>
            <p><strong>Exotic R²:</strong> {(results.exotic.hybrid.r2 * 100).toFixed(1)}%</p>
            <p><strong>MAE:</strong> ${results.overall.hybrid.mae.toLocaleString()}</p>
            <p><strong>MAPE:</strong> {results.overall.hybrid.mape.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold mb-4">Winner</h3>
        <p className="text-xl">
          {results.overall.hybrid.r2 >= results.overall.ratio.r2 && results.overall.hybrid.r2 >= results.overall.additive.r2
            ? '🏆 Hybrid Model'
            : results.overall.additive.r2 > results.overall.ratio.r2
            ? '🏆 Additive Model'
            : '🏆 Ratio Model'}
        </p>
      </div>

      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Sample Predictions (first 10)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Actual</th>
              <th className="p-2 text-left">Ratio Pred</th>
              <th className="p-2 text-left">Additive Pred</th>
              <th className="p-2 text-left">Hybrid Pred</th>
              <th className="p-2 text-left">Size</th>
              <th className="p-2 text-left">Type</th>
            </tr>
          </thead>
          <tbody>
            {results.samples.map((s: any, i: number) => (
              <tr key={i} className="border-b">
                <td className="p-2">${s.actual.toLocaleString()}</td>
                <td className="p-2">${s.ratioPred.toLocaleString()}</td>
                <td className="p-2">${s.additivePred.toLocaleString()}</td>
                <td className="p-2">${s.hybridPred.toLocaleString()}</td>
                <td className="p-2">{s.size}</td>
                <td className="p-2">{s.isExotic ? 'Exotic' : 'Standard'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
