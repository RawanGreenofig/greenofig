/**
 * Greenofig store catalog. Single source of truth for the storefront grid
 * and the per-product detail page. When this app moves to a real
 * `products` Supabase table, swap the consumers to read from it instead;
 * the Product shape stays the same.
 */

export type ProductCategory =
  | 'supplements'
  | 'superfoods'
  | 'snacks'
  | 'kitchen'
  | 'books'

export type ProductBadge = 'drPick' | 'bestseller' | 'newBadge' | 'saleBadge'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  price: number
  compareAt?: number
  stock: number
  badges: ProductBadge[]
  hue: string
  /** Public URL for the product photo. When set, the store renders this
   *  instead of the gradient placeholder. */
  image?: string
  description: string
  benefits: string[]
}

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Daily Greens Powder',
    category: 'superfoods',
    price: 28,
    stock: 14,
    badges: ['drPick', 'bestseller'],
    hue: 'rgb(163 230 53 / 0.18)',
    description:
      'A daily greens blend with spirulina, chlorella, wheatgrass, and a 5-strain probiotic. One scoop replaces a serving of greens on the days you didn’t get yours in. Mediterranean-friendly profile, no synthetic flavoring.',
    benefits: [
      '5 g of mixed greens per scoop',
      'Probiotic blend supports gut health',
      'No added sugar or artificial sweeteners',
      'Mixes clean in water, smoothies, or yogurt',
    ],
  },
  {
    id: 'p2',
    name: 'Magnesium Glycinate 200 mg',
    category: 'supplements',
    price: 19,
    stock: 22,
    badges: ['drPick'],
    hue: 'rgb(168 85 247 / 0.18)',
    description:
      'Glycinate (not citrate) for the form most people tolerate without GI upset. 200 mg elemental magnesium per capsule. Take 30 minutes before sleep — Dr. Rawan’s most-recommended single supplement.',
    benefits: [
      'Supports sleep quality and nervous-system calm',
      'Better-tolerated than magnesium citrate',
      '200 mg elemental Mg per capsule',
      'Third-party tested for purity',
    ],
  },
  {
    id: 'p3',
    name: 'Vitamin D3 + K2',
    category: 'supplements',
    price: 24,
    compareAt: 28,
    stock: 9,
    badges: ['saleBadge'],
    hue: 'rgb(232 145 42 / 0.18)',
    description:
      'D3 paired with MK-7 form of K2 — the combination most clinical research recommends for bone and arterial health. 4,000 IU D3 + 100 mcg K2 per softgel.',
    benefits: [
      '4,000 IU vitamin D3 per softgel',
      'Includes MK-7 form of K2 (most bioavailable)',
      'Supports bone density + calcium routing',
      'Take with a fat-containing meal for absorption',
    ],
  },
  {
    id: 'p4',
    name: 'Omega-3 Fish Oil',
    category: 'supplements',
    price: 32,
    stock: 18,
    badges: ['bestseller'],
    hue: 'rgb(6 182 212 / 0.16)',
    description:
      'Triglyceride-form fish oil sourced from cold-water sardines and anchovies. 1,000 mg combined EPA + DHA per softgel — the threshold most studies use for cardiovascular benefit.',
    benefits: [
      '1,000 mg EPA + DHA per softgel',
      'Triglyceride form (not ethyl ester)',
      'IFOS-certified for purity and freshness',
      'No fishy aftertaste',
    ],
  },
  {
    id: 'p5',
    name: 'Mediterranean Olive Oil',
    category: 'kitchen',
    price: 22,
    stock: 30,
    badges: ['drPick'],
    hue: 'rgb(132 204 22 / 0.18)',
    description:
      'Single-origin extra virgin olive oil from the West Bank. First cold-pressed within 6 hours of harvest. High polyphenol count — peppery finish you can taste in the back of your throat.',
    benefits: [
      'Single-origin, single-harvest',
      'High polyphenol count (>400 mg/kg)',
      'Cold-pressed within 6 hours of harvest',
      '500 ml dark glass bottle to preserve integrity',
    ],
  },
  {
    id: 'p6',
    name: 'Almond Butter, raw',
    category: 'snacks',
    price: 14,
    stock: 24,
    badges: [],
    hue: 'rgb(232 145 42 / 0.16)',
    description:
      'Stone-ground raw almonds, no added oil, no salt, no sugar. Just almonds. Perfect 1:1 swap for peanut butter when you want a milder protein and more vitamin E.',
    benefits: [
      '100% almonds — no fillers',
      'High in vitamin E and magnesium',
      'Stone-ground for smoother texture',
      'Stir before first use; refrigerate after opening',
    ],
  },
  {
    id: 'p7',
    name: 'Chia Seeds 500 g',
    category: 'superfoods',
    price: 8,
    stock: 50,
    badges: ['newBadge'],
    hue: 'rgb(168 85 247 / 0.16)',
    description:
      'Black chia seeds — the cheapest, simplest fiber upgrade you can make to any breakfast. 10 g of fiber per 2-tablespoon serving. Soak overnight in milk for an easy pudding.',
    benefits: [
      '10 g fiber per 2 tbsp serving',
      'Plant-based omega-3 (ALA)',
      'Forms a gel — keeps you full longer',
      '500 g pouch (~30 servings)',
    ],
  },
  {
    id: 'p8',
    name: 'Dark Chocolate 85%',
    category: 'snacks',
    price: 6,
    stock: 0,
    badges: [],
    hue: 'rgb(120 53 15 / 0.18)',
    description:
      'Single-origin Madagascar cacao. 85% — bitter enough that two squares is satisfying. Sugar is the third ingredient, not the first. Currently out of stock.',
    benefits: [
      '85% cacao, low sugar',
      'Single-origin Madagascar',
      'Two squares ≈ a satisfying portion',
      'Pairs well with a handful of almonds',
    ],
  },
  {
    id: 'p9',
    name: 'Cold-Pressed Tahini',
    category: 'kitchen',
    price: 11,
    stock: 20,
    badges: ['drPick'],
    hue: 'rgb(234 179 8 / 0.18)',
    description:
      'Single-origin Ethiopian sesame, cold-pressed in small batches. Smooth pour, no separation in the first weeks, and the flavor that makes hummus taste like it does in Amman.',
    benefits: [
      'Single-origin Ethiopian sesame',
      'Cold-pressed (no roasting)',
      'High in calcium and zinc',
      '500 ml glass jar',
    ],
  },
  {
    id: 'p10',
    name: 'Probiotic 25 Billion',
    category: 'supplements',
    price: 38,
    stock: 6,
    badges: ['drPick', 'newBadge'],
    hue: 'rgb(34 197 94 / 0.18)',
    description:
      '8 strains, 25 billion CFU per capsule. Delayed-release shell so the bacteria survive stomach acid. Shelf-stable — no refrigeration needed.',
    benefits: [
      '25 billion CFU at expiration (not at manufacture)',
      '8 strains including L. rhamnosus and B. lactis',
      'Delayed-release acid-resistant capsule',
      'Shelf-stable — travels well',
    ],
  },
  {
    id: 'p11',
    name: 'Roasted Almonds (unsalted)',
    category: 'snacks',
    price: 10,
    stock: 28,
    badges: [],
    hue: 'rgb(217 119 6 / 0.16)',
    description:
      'Dry-roasted unsalted almonds. The pre-portioned 25 g pouches are the move — bigger bags become a problem.',
    benefits: [
      'Dry-roasted, no oils added',
      'Unsalted — pair with what you want',
      'Vitamin E, magnesium, plant protein',
      'Resealable 250 g pouch',
    ],
  },
  {
    id: 'p12',
    name: 'Eat Real — Dr. Rawan',
    category: 'books',
    price: 18,
    stock: 12,
    badges: ['drPick', 'newBadge'],
    hue: 'rgb(61 122 74 / 0.22)',
    description:
      'Dr. Rawan’s clinical-but-warm guide to eating in the Mediterranean style without turning food into a stressful project. 240 pages, 60 recipes, no calorie math.',
    benefits: [
      '240 pages, 60 recipes',
      'Mediterranean-style framework',
      'Practical — no calorie counting',
      'Hardcover, signed copies available',
    ],
  },
]
