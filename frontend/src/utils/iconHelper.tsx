import {
  Coffee,
  CupSoda,
  Utensils,
  Cookie,
  Pizza,
  Sandwich,
  Soup,
  IceCream,
  ShoppingBag,
  Package,
  Flame,
  Sparkles,
  LucideIcon
} from 'lucide-react';

export interface IconOption {
  id: string;
  label: string;
  category: string;
  Icon: LucideIcon;
  bgGradient: string;
  iconColor: string;
  badgeBg: string;
  badgeBorder: string;
}

export const AVAILABLE_2D_ICONS: IconOption[] = [
  {
    id: 'coffee',
    label: 'Kopi & Hangat',
    category: 'Minuman Hangat',
    Icon: Coffee,
    bgGradient: 'from-[#835227]/20 via-[#CBC6B2]/20 to-[#835227]/5',
    iconColor: 'text-[#835227]',
    badgeBg: 'bg-[#835227]/15',
    badgeBorder: 'border-[#835227]/25'
  },
  {
    id: 'cup-soda',
    label: 'Es & Minuman Dingin',
    category: 'Minuman Dingin',
    Icon: CupSoda,
    bgGradient: 'from-[#8B9793]/25 via-[#CBC6B2]/20 to-white',
    iconColor: 'text-[#5C726D]',
    badgeBg: 'bg-[#8B9793]/20',
    badgeBorder: 'border-[#8B9793]/30'
  },
  {
    id: 'utensils',
    label: 'Makanan & Lauk',
    category: 'Makanan',
    Icon: Utensils,
    bgGradient: 'from-[#835227]/15 via-[#CBC6B2]/25 to-white',
    iconColor: 'text-[#835227]',
    badgeBg: 'bg-[#835227]/15',
    badgeBorder: 'border-[#835227]/25'
  },
  {
    id: 'cookie',
    label: 'Snack & Cemilan',
    category: 'Snack',
    Icon: Cookie,
    bgGradient: 'from-[#CBC6B2]/30 via-white to-[#835227]/10',
    iconColor: 'text-[#835227]',
    badgeBg: 'bg-[#835227]/15',
    badgeBorder: 'border-[#835227]/25'
  },
  {
    id: 'pizza',
    label: 'Pizza & Fastfood',
    category: 'Fastfood',
    Icon: Pizza,
    bgGradient: 'from-amber-500/15 via-[#CBC6B2]/20 to-white',
    iconColor: 'text-amber-700',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/25'
  },
  {
    id: 'sandwich',
    label: 'Sandwich & Roti',
    category: 'Roti & Bakery',
    Icon: Sandwich,
    bgGradient: 'from-[#CBC6B2]/35 via-amber-50/50 to-white',
    iconColor: 'text-[#835227]',
    badgeBg: 'bg-[#835227]/15',
    badgeBorder: 'border-[#835227]/25'
  },
  {
    id: 'soup',
    label: 'Sup, Mie & Bakso',
    category: 'Kuah & Sup',
    Icon: Soup,
    bgGradient: 'from-amber-600/15 via-[#CBC6B2]/20 to-white',
    iconColor: 'text-amber-800',
    badgeBg: 'bg-amber-600/15',
    badgeBorder: 'border-amber-600/25'
  },
  {
    id: 'ice-cream',
    label: 'Es Krim & Dessert',
    category: 'Dessert',
    Icon: IceCream,
    bgGradient: 'from-pink-500/15 via-[#CBC6B2]/20 to-white',
    iconColor: 'text-pink-700',
    badgeBg: 'bg-pink-500/15',
    badgeBorder: 'border-pink-500/25'
  },
  {
    id: 'shopping-bag',
    label: 'Sembako & Toko',
    category: 'Sembako',
    Icon: ShoppingBag,
    bgGradient: 'from-[#8B9793]/25 via-[#CBC6B2]/20 to-white',
    iconColor: 'text-[#3E2410]',
    badgeBg: 'bg-[#3E2410]/15',
    badgeBorder: 'border-[#3E2410]/20'
  },
  {
    id: 'package',
    label: 'Paket / Combo',
    category: 'Paket',
    Icon: Package,
    bgGradient: 'from-[#CBC6B2]/25 via-white to-[#835227]/10',
    iconColor: 'text-[#835227]',
    badgeBg: 'bg-[#835227]/15',
    badgeBorder: 'border-[#835227]/20'
  },
  {
    id: 'flame',
    label: 'Pedas / Spesial',
    category: 'Menu Pedas',
    Icon: Flame,
    bgGradient: 'from-orange-500/20 via-[#CBC6B2]/20 to-white',
    iconColor: 'text-orange-700',
    badgeBg: 'bg-orange-500/15',
    badgeBorder: 'border-orange-500/25'
  },
  {
    id: 'sparkles',
    label: 'Rekomendasi / Lainnya',
    category: 'Umum',
    Icon: Sparkles,
    bgGradient: 'from-indigo-500/15 via-[#CBC6B2]/20 to-white',
    iconColor: 'text-indigo-700',
    badgeBg: 'bg-indigo-500/15',
    badgeBorder: 'border-indigo-500/25'
  }
];

const ICON_MAP = new Map<string, IconOption>(
  AVAILABLE_2D_ICONS.map((opt) => [opt.id, opt])
);

/**
 * Intelligent Category Icon Resolver:
 * Ensures 'Hot Drink' / 'Kopi' gets Coffee, 'Ice Drink' / 'Minuman' gets CupSoda,
 * 'Snack' gets Cookie, 'Makanan' gets Utensils, etc.
 */
export function getCategoryIconComponent(categoryName: string, iconKey?: string | null): LucideIcon {
  if (iconKey && ICON_MAP.has(iconKey)) {
    return ICON_MAP.get(iconKey)!.Icon;
  }

  const text = (categoryName || '').toLowerCase().trim();

  // 1. Hot Drinks / Coffee / Tea
  if (
    text.includes('hot') ||
    text.includes('kopi') ||
    text.includes('coffee') ||
    text.includes('espresso') ||
    text.includes('latte') ||
    text.includes('cappuccino') ||
    text.includes('americano') ||
    text.includes('hangat') ||
    text.includes('teh') ||
    text.includes('tea') ||
    text.includes('tubruk') ||
    text.includes('warm')
  ) {
    return Coffee;
  }

  // 2. Cold Drinks / Juice / Beverages
  if (
    text.includes('ice') ||
    text.includes('dingin') ||
    text.includes('es ') ||
    text.startsWith('es') ||
    text.includes('drink') ||
    text.includes('minum') ||
    text.includes('jus') ||
    text.includes('juice') ||
    text.includes('boba') ||
    text.includes('soda') ||
    text.includes('beverage') ||
    text.includes('susu') ||
    text.includes('milk') ||
    text.includes('shake') ||
    text.includes('smoothie') ||
    text.includes('fresh') ||
    text.includes('cendol') ||
    text.includes('sirup') ||
    text.includes('air')
  ) {
    return CupSoda;
  }

  // 3. Snack & Bakery & Desserts
  if (
    text.includes('snack') ||
    text.includes('cemilan') ||
    text.includes('kue') ||
    text.includes('cake') ||
    text.includes('roti') ||
    text.includes('biskuit') ||
    text.includes('pastry') ||
    text.includes('dessert') ||
    text.includes('donut') ||
    text.includes('goreng') ||
    text.includes('keripik') ||
    text.includes('kentang') ||
    text.includes('bakery') ||
    text.includes('cookies')
  ) {
    return Cookie;
  }

  // 4. Ice Cream / Gelato
  if (
    text.includes('ice cream') ||
    text.includes('es krim') ||
    text.includes('eskrim') ||
    text.includes('gelato')
  ) {
    return IceCream;
  }

  // 5. Soup / Bakso / Soto / Mie
  if (
    text.includes('soup') ||
    text.includes('sup') ||
    text.includes('soto') ||
    text.includes('bakso') ||
    text.includes('mie') ||
    text.includes('ramen') ||
    text.includes('kuah') ||
    text.includes('rawon')
  ) {
    return Soup;
  }

  // 6. Pizza / Burger
  if (text.includes('pizza') || text.includes('burger')) {
    return Pizza;
  }

  // 7. Sandwich / Toast
  if (text.includes('sandwich') || text.includes('toast')) {
    return Sandwich;
  }

  // 8. Food / Main Dishes
  if (
    text.includes('makan') ||
    text.includes('food') ||
    text.includes('nasi') ||
    text.includes('ayam') ||
    text.includes('bebek') ||
    text.includes('daging') ||
    text.includes('ikan') ||
    text.includes('seafood') ||
    text.includes('lauk') ||
    text.includes('geprek') ||
    text.includes('penyet') ||
    text.includes('resto') ||
    text.includes('dish')
  ) {
    return Utensils;
  }

  // 9. Sembako / Retail / Toko
  if (
    text.includes('sembako') ||
    text.includes('retail') ||
    text.includes('belanja') ||
    text.includes('toko') ||
    text.includes('kelontong') ||
    text.includes('barang') ||
    text.includes('grosir')
  ) {
    return ShoppingBag;
  }

  // 10. Paket / Combo
  if (
    text.includes('paket') ||
    text.includes('combo') ||
    text.includes('bundle') ||
    text.includes('set')
  ) {
    return Package;
  }

  // 11. Pedas
  if (
    text.includes('pedas') ||
    text.includes('spicy') ||
    text.includes('fire') ||
    text.includes('flame')
  ) {
    return Flame;
  }

  return Utensils;
}

/**
 * Product 2D Icon Resolver for cards and placeholders
 */
export function getProduct2DIconData(product: {
  name: string;
  categoryName?: string;
  icon?: string | null;
}) {
  // If explicitly selected icon exists
  if (product.icon && ICON_MAP.has(product.icon)) {
    return ICON_MAP.get(product.icon)!;
  }

  const text = `${product.name} ${product.categoryName || ''}`.toLowerCase();

  // Match keyword rules
  if (
    text.includes('kopi') ||
    text.includes('coffee') ||
    text.includes('espresso') ||
    text.includes('latte') ||
    text.includes('cappuccino') ||
    text.includes('americano') ||
    text.includes('mocha') ||
    text.includes('hangat') ||
    text.includes('tubruk') ||
    (text.includes('hot') && !text.includes('hotdog'))
  ) {
    return ICON_MAP.get('coffee')!;
  }

  if (
    text.includes('ice') ||
    text.includes('dingin') ||
    text.includes('es ') ||
    text.includes('jus') ||
    text.includes('juice') ||
    text.includes('minum') ||
    text.includes('drink') ||
    text.includes('susu') ||
    text.includes('boba') ||
    text.includes('beverage') ||
    text.includes('matcha') ||
    text.includes('smoothie') ||
    text.includes('tea') ||
    text.includes('teh') ||
    text.includes('air')
  ) {
    return ICON_MAP.get('cup-soda')!;
  }

  if (
    text.includes('ice cream') ||
    text.includes('es krim') ||
    text.includes('eskrim') ||
    text.includes('gelato')
  ) {
    return ICON_MAP.get('ice-cream')!;
  }

  if (
    text.includes('soup') ||
    text.includes('sup') ||
    text.includes('soto') ||
    text.includes('bakso') ||
    text.includes('mie') ||
    text.includes('ramen') ||
    text.includes('kuah') ||
    text.includes('rawon')
  ) {
    return ICON_MAP.get('soup')!;
  }

  if (text.includes('pizza')) {
    return ICON_MAP.get('pizza')!;
  }

  if (text.includes('sandwich') || text.includes('toast') || text.includes('burger')) {
    return ICON_MAP.get('sandwich')!;
  }

  if (
    text.includes('snack') ||
    text.includes('cemilan') ||
    text.includes('kue') ||
    text.includes('cake') ||
    text.includes('roti') ||
    text.includes('keripik') ||
    text.includes('kentang') ||
    text.includes('gorengan') ||
    text.includes('biskuit') ||
    text.includes('dessert') ||
    text.includes('donut') ||
    text.includes('pastry')
  ) {
    return ICON_MAP.get('cookie')!;
  }

  if (
    text.includes('makan') ||
    text.includes('nasi') ||
    text.includes('ayam') ||
    text.includes('geprek') ||
    text.includes('daging') ||
    text.includes('ikan') ||
    text.includes('food') ||
    text.includes('sate') ||
    text.includes('bebek') ||
    text.includes('seafood') ||
    text.includes('pasta')
  ) {
    return ICON_MAP.get('utensils')!;
  }

  if (
    text.includes('sembako') ||
    text.includes('beras') ||
    text.includes('minyak') ||
    text.includes('gula') ||
    text.includes('telur') ||
    text.includes('retail') ||
    text.includes('kelontong')
  ) {
    return ICON_MAP.get('shopping-bag')!;
  }

  if (text.includes('paket') || text.includes('combo') || text.includes('bundle')) {
    return ICON_MAP.get('package')!;
  }

  if (text.includes('pedas') || text.includes('spicy') || text.includes('fire')) {
    return ICON_MAP.get('flame')!;
  }

  return ICON_MAP.get('sparkles')!;
}
