import api from './client'

export interface BankProvider {
  code: string
  displayName: string
}

export interface CsvImportResult {
  id: number
  source: string
  status: 'PENDING' | 'VALIDATED' | 'FAILED' | 'IMPORTED'
  originalFilename: string | null
  periodFrom: string | null
  periodTo: string | null
  detectedClientName: string | null
  detectedAccountNumber: string | null
  detectedAccountDisplay: string | null
  partyBankAccountId: number | null
  partyId: number | null
  partyName: string | null
  rowsTotal: number
  rowsParsed: number
  rowsInvalid: number
  errorSummary: string | null
  createdById: number | null
  createdAt: string
  updatedAt: string
}

export interface CsvImportError {
  id: number
  csvImportId: number
  scope: 'HEADER' | 'ROW'
  lineNo: number | null
  code: string
  message: string
  createdAt: string
}

export interface CsvImportRow {
  id: number
  csvImportId: number
  lineNo: number
  operationDate: string | null
  descriptionRaw: string | null
  ownAccountLabelRaw: string | null
  counterpartyAccountRaw: string | null
  bankCategoryRaw: string | null
  amountRaw: string | null
  amountMinor: number | null
  parseStatus: 'VALIDATED' | 'PARSE_ERROR' | 'DUPLICATE' | 'IMPORTED'
  parseError: string | null
}

export interface PagedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface UploadResponse {
  import: CsvImportResult
  errors: string[]
}

export const fetchProviders = async (): Promise<BankProvider[]> =>
  (await api.get<BankProvider[]>('/csv-imports/providers')).data

export const fetchImports = async (params?: {
  source?: string
  status?: string
  page?: number
  limit?: number
}): Promise<PagedResponse<CsvImportResult>> =>
  (await api.get<PagedResponse<CsvImportResult>>('/csv-imports', { params })).data

export const fetchImport = async (id: number): Promise<CsvImportResult> =>
  (await api.get<CsvImportResult>(`/csv-imports/${id}`)).data

export const fetchImportErrors = async (
  id: number,
  params?: { scope?: string; page?: number; limit?: number },
): Promise<PagedResponse<CsvImportError>> =>
  (await api.get<PagedResponse<CsvImportError>>(`/csv-imports/${id}/errors`, { params })).data

export const fetchImportRows = async (
  id: number,
  params?: { parseStatus?: string; page?: number; limit?: number },
): Promise<PagedResponse<CsvImportRow>> =>
  (await api.get<PagedResponse<CsvImportRow>>(`/csv-imports/${id}/rows`, { params })).data

export const triggerImport = async (id: number): Promise<CsvImportResult> =>
  (await api.post<CsvImportResult>(`/csv-imports/${id}/import`)).data

export const deleteImport = async (id: number): Promise<void> => {
  await api.delete(`/csv-imports/${id}`)
}

export const uploadCsv = async (source: string, file: File): Promise<UploadResponse> => {
  const form = new FormData()
  form.append('source', source)
  form.append('file', file)
  return (
    await api.post<UploadResponse>('/csv-imports', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ).data
}
