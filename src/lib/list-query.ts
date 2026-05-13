export type Pagination = {
  page: number
  perPage: number
  from: number
  to: number
}

export function getPagination(url: URL): Pagination {
  const pageParam = Number.parseInt(url.searchParams.get('page') ?? '1', 10)
  const perPageParam = Number.parseInt(url.searchParams.get('per_page') ?? '50', 10)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
  const perPage = Number.isFinite(perPageParam) && perPageParam > 0 ? Math.min(100, perPageParam) : 50
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  return { page, perPage, from, to }
}

export function cleanSearchTerm(value: string | null): string {
  return (value ?? '').replace(/[%,()]/g, ' ').trim()
}

export function hasListParams(url: URL): boolean {
  return Array.from(url.searchParams.keys()).length > 0
}

export function paginatedJson<T>(data: T[], total: number | null, page: number, perPage: number): Response {
  return Response.json({ data, total: total ?? data.length, page, per_page: perPage })
}
