import api from './client'

export type ReportSavedType = 'trend' | 'breakdown'

export interface ReportSaved {
  id: number
  type: ReportSavedType
  name: string
  description: string | null
  params: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ReportSavedPayload {
  type: ReportSavedType
  name: string
  description?: string | null
  params: Record<string, unknown>
}

export const fetchReportSavedList = async (type: ReportSavedType): Promise<ReportSaved[]> =>
  (await api.get<ReportSaved[]>('/report-saved', { params: { type } })).data

export const createReportSaved = async (payload: ReportSavedPayload): Promise<ReportSaved> =>
  (await api.post<ReportSaved>('/report-saved', payload)).data

export const updateReportSaved = async (
  id: number,
  payload: Partial<Pick<ReportSavedPayload, 'name' | 'description' | 'params'>>,
): Promise<ReportSaved> =>
  (await api.put<ReportSaved>(`/report-saved/${id}`, payload)).data

export const deleteReportSaved = async (id: number): Promise<void> => {
  await api.delete(`/report-saved/${id}`)
}
