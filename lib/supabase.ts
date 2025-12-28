import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Bag {
  id: string
  brand_id: string
  model_id: string
  size: number
  color: string
  color_secondary?: string
  leather_type: string
  hardware: string
  year: number
  is_exotic: boolean
  exotic_type?: string
  is_limited_edition: boolean
  limited_edition_name?: string
  condition?: string
  image_url?: string
  description?: string
  created_at: string
  // Joined fields
  brand_name?: string
  model_name?: string
}

export interface Sale {
  id: string
  bag_id: string
  source_id: string
  sale_price: number
  currency: string
  sale_date: string
  source_name?: string
}

export interface BagWithSales extends Bag {
  sales: Sale[]
  latest_price?: number
  price_change_percent?: number
}
