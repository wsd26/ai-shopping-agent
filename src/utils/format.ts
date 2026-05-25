export function formatPrice(price: number): string {
  return `¥${price.toFixed(price % 1 === 0 ? 0 : 1)}`
}

export function formatSalesCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}千`
  return String(count)
}

export function discountPercent(price: number, originalPrice: number): number {
  return Math.round((1 - price / originalPrice) * 100)
}

export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    clothing: '👗',
    skincare: '🧴',
    accessories: '👜',
    food: '🫘',
    electronics: '🎧',
  }
  return map[category] || '📦'
}