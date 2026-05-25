export interface Product {
  id: string
  name: string
  price: number
  originalPrice: number
  imageUrl: string
  category: ProductCategory
  attributes: ProductAttributes
  salesCount: number
  rating: number
  description: string
  hostComment: string
  tags: string[]
}

export type ProductCategory = 'clothing' | 'skincare' | 'accessories' | 'food' | 'electronics'

export interface ProductAttributes {
  material?: string
  sizes?: string[]
  colors?: string[]
  fit?: string
  skinType?: string[]
  effect?: string
  weight?: string
  origin?: string
  shelfLife?: string
  ingredients?: string
  [key: string]: string | string[] | undefined
}

export interface CartItem {
  product: Product
  quantity: number
  addedAt: number
}