import { apiServerRequest } from './auth'
import type { CollectionItem } from '@/views/content/collect/collection-data'

export type CollectionMutation = Pick<
  CollectionItem,
  | 'title'
  | 'category'
  | 'period'
  | 'material'
  | 'museum'
  | 'description'
  | 'dimensions'
  | 'level'
  | 'published'
> & {
  weight?: string
  provenance?: string
}

function apiOrigin() {
  return new URL(apiServerRequest.defaults.baseURL || '/', window.location.origin)
}

function absoluteAssetUrl(value: string) {
  if (!value || /^(blob:|data:|https?:)/i.test(value)) return value
  return new URL(value, apiOrigin()).href
}

function normalizeCollection(item: CollectionItem): CollectionItem {
  const description = item.description.replace(
    /\]\((\/collections\/[^)]+)\)/g,
    (_match, url: string) => `](${absoluteAssetUrl(url)})`
  )
  return {
    ...item,
    description,
    cover: absoluteAssetUrl(item.cover),
    gallery: item.gallery.map(absoluteAssetUrl),
    gcodeUrl: absoluteAssetUrl(item.gcodeUrl || ''),
    modelUrl: absoluteAssetUrl(item.modelUrl || '')
  }
}

export async function fetchCollections() {
  const { data } = await apiServerRequest.get<CollectionItem[]>('/collections')
  return data.map(normalizeCollection)
}

export async function fetchCollection(id: string) {
  const { data } = await apiServerRequest.get<CollectionItem>(
    `/collections/${encodeURIComponent(id)}`
  )
  return normalizeCollection(data)
}

export async function createCollection(payload: CollectionMutation) {
  const { data } = await apiServerRequest.post<CollectionItem>('/collections', payload)
  return normalizeCollection(data)
}

export async function updateCollection(id: string, payload: Partial<CollectionMutation>) {
  const { data } = await apiServerRequest.patch<CollectionItem>(
    `/collections/${encodeURIComponent(id)}`,
    payload
  )
  return normalizeCollection(data)
}

export async function deleteCollectionRequest(id: string) {
  const { data } = await apiServerRequest.delete<{ success: boolean }>(
    `/collections/${encodeURIComponent(id)}`
  )
  return data
}

export async function importCollectionPackage(file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiServerRequest.post<CollectionItem>('/collections/import', form, {
    timeout: 120_000
  })
  return normalizeCollection(data)
}

export async function appendCollectionGallery(id: string, files: File[]) {
  const form = new FormData()
  files.forEach((file) => form.append('files', file))
  const { data } = await apiServerRequest.post<CollectionItem>(
    `/collections/${encodeURIComponent(id)}/gallery`,
    form,
    { timeout: 120_000 }
  )
  return normalizeCollection(data)
}

export async function reorderCollectionGallery(id: string, paths: string[]) {
  const { data } = await apiServerRequest.patch<CollectionItem>(
    `/collections/${encodeURIComponent(id)}/gallery/order`,
    { paths }
  )
  return normalizeCollection(data)
}

export async function replaceCollectionModel(id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiServerRequest.put<CollectionItem>(
    `/collections/${encodeURIComponent(id)}/model`,
    form,
    { timeout: 120_000 }
  )
  return normalizeCollection(data)
}

export async function deleteCollectionModel(id: string) {
  const { data } = await apiServerRequest.delete<CollectionItem>(
    `/collections/${encodeURIComponent(id)}/model`
  )
  return normalizeCollection(data)
}

export async function replaceCollectionGcode(id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiServerRequest.put<CollectionItem>(
    `/collections/${encodeURIComponent(id)}/gcode`,
    form,
    { timeout: 120_000 }
  )
  return normalizeCollection(data)
}

export async function deleteCollectionGcode(id: string) {
  const { data } = await apiServerRequest.delete<CollectionItem>(
    `/collections/${encodeURIComponent(id)}/gcode`
  )
  return normalizeCollection(data)
}
