import { useCallback, useEffect, useState } from 'react'

import type { ReportSaved } from '@/shared/api/reportSaved'

import {
  createReportSaved,
  deleteReportSaved,
  fetchReportSavedList,
  updateReportSaved,
  type ReportSavedType,
} from '@/shared/api/reportSaved'

import { REPORT_SAVED_ID_PARAM } from '@/domains/home/reports/shared/utils/reportSavedParams'
import { getApiErrorMessage } from '@/shared/utils/errors'

interface UseReportSavedOptions {
  type: ReportSavedType
  reportSavedId: string | null
  setSearchParams: (
    fn: (prev: URLSearchParams) => URLSearchParams,
    options?: { replace?: boolean },
  ) => void
  captureParams: () => Record<string, unknown>
  onSelectApplied?: () => void
}

export function useReportSaved({
  type,
  reportSavedId,
  setSearchParams,
  captureParams,
  onSelectApplied,
}: UseReportSavedOptions) {
  const [loadedReport, setLoadedReport] = useState<ReportSaved | null>(null)
  const [listRefreshKey, setListRefreshKey] = useState(0)

  useEffect(() => {
    if (!reportSavedId) {
      setLoadedReport(null)
      return
    }

    let cancelled = false
    void fetchReportSavedList(type)
      .then((list) => {
        if (cancelled) return
        const found = list.find((item) => String(item.id) === reportSavedId) ?? null
        setLoadedReport(found)
      })
      .catch(() => {
        if (!cancelled) setLoadedReport(null)
      })

    return () => {
      cancelled = true
    }
  }, [type, reportSavedId, listRefreshKey])

  const setReportSavedId = useCallback(
    (id: number | null) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        if (id === null) params.delete(REPORT_SAVED_ID_PARAM)
        else params.set(REPORT_SAVED_ID_PARAM, String(id))
        return params
      }, { replace: true })
    },
    [setSearchParams],
  )

  const createReport = useCallback(
    async (name: string, description: string | null) => {
      const params = captureParams()
      const created = await createReportSaved({
        type,
        name,
        description,
        params,
      })
      setReportSavedId(created.id)
      setLoadedReport(created)
      setListRefreshKey((k) => k + 1)
      return created
    },
    [captureParams, setReportSavedId, type],
  )

  const updateReport = useCallback(async () => {
    if (!loadedReport) return
    const params = captureParams()
    const updated = await updateReportSaved(loadedReport.id, { params })
    setLoadedReport(updated)
    setListRefreshKey((k) => k + 1)
    return updated
  }, [captureParams, loadedReport])

  const renameReport = useCallback(
    async (name: string, description: string | null) => {
      if (!loadedReport) return
      const updated = await updateReportSaved(loadedReport.id, { name, description })
      setLoadedReport(updated)
      setListRefreshKey((k) => k + 1)
      return updated
    },
    [loadedReport],
  )

  const deleteReport = useCallback(
    async (report: ReportSaved) => {
      await deleteReportSaved(report.id)
      if (loadedReport?.id === report.id) {
        setReportSavedId(null)
      }
      setListRefreshKey((k) => k + 1)
    },
    [loadedReport?.id, setReportSavedId],
  )

  const selectReport = useCallback(
    (
      report: ReportSaved,
      applyParams: (params: Record<string, unknown>, reportSavedId: number) => void,
    ) => {
      applyParams(report.params, report.id)
      setLoadedReport(report)
      onSelectApplied?.()
    },
    [onSelectApplied],
  )

  return {
    loadedReport,
    listRefreshKey,
    createReport,
    updateReport,
    renameReport,
    deleteReport,
    selectReport,
    loadList: () => fetchReportSavedList(type),
    listErrorMessage: (err: unknown, fallback: string) => getApiErrorMessage(err, fallback),
  }
}
