import { ref } from 'vue'

export type Category = '金属' | '漆器' | '陶瓷' | '织物' | '玉石' | '竹木' | '书画' | '其他'

export interface CollectionItem {
  id: string
  sourceUrl?: string
  title: string
  category: Category
  period: string
  material: string
  museum: string
  description: string
  dimensions: string
  level: string
  weight?: string
  provenance?: string
  cover: string
  gallery: string[]
  galleryPaths?: string[]
  hasModel: boolean
  modelName: string
  modelUrl?: string
  published: boolean
  createdAt?: string
  updatedAt?: string
}

export const categories = [
  '全部',
  '金属',
  '漆器',
  '陶瓷',
  '织物',
  '玉石',
  '竹木',
  '书画',
  '其他'
] as const

export const periodOptions = [
  { value: '史前时期', label: '史前时期（约公元前300万年—前21世纪）' },
  { value: '旧石器时代', label: '旧石器时代' },
  { value: '新石器时代', label: '新石器时代（约公元前10000年—前2000年）' },
  { value: '三皇五帝', label: '三皇五帝（传说时代）' },
  { value: '夏', label: '夏（约公元前2070年—前1600年）' },
  { value: '商', label: '商（约公元前1600年—前1046年）' },
  { value: '西周', label: '西周（公元前1046年—前771年）' },
  { value: '春秋', label: '春秋（公元前770年—前476年）' },
  { value: '战国', label: '战国（公元前475年—前221年）' },
  { value: '秦', label: '秦（公元前221年—前207年）' },
  { value: '汉', label: '汉（公元前202年—公元220年）' },
  { value: '西汉', label: '西汉（公元前202年—公元8年）' },
  { value: '新', label: '新（公元9年—23年）' },
  { value: '东汉', label: '东汉（公元25年—220年）' },
  { value: '三国', label: '三国（220年—280年）' },
  { value: '晋', label: '晋（265年—420年）' },
  { value: '西晋', label: '西晋（265年—316年）' },
  { value: '东晋', label: '东晋（317年—420年）' },
  { value: '十六国', label: '十六国（304年—439年）' },
  { value: '南北朝', label: '南北朝（420年—589年）' },
  { value: '隋', label: '隋（581年—618年）' },
  { value: '唐', label: '唐（618年—907年）' },
  { value: '五代十国', label: '五代十国（907年—979年）' },
  { value: '宋', label: '宋（960年—1279年）' },
  { value: '北宋', label: '北宋（960年—1127年）' },
  { value: '南宋', label: '南宋（1127年—1279年）' },
  { value: '辽', label: '辽（916年—1125年）' },
  { value: '西夏', label: '西夏（1038年—1227年）' },
  { value: '金', label: '金（1115年—1234年）' },
  { value: '元', label: '元（1271年—1368年）' },
  { value: '明', label: '明（1368年—1644年）' },
  { value: '清', label: '清（1636年—1912年）' },
  { value: '中华民国', label: '中华民国（1912年—1949年）' },
  { value: '中华人民共和国', label: '中华人民共和国（1949年至今）' }
] as const

// 藏品只从服务端加载，不再内置演示数据。
export const collections = ref<CollectionItem[]>([])
