"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api"

export function LogsStats() {
  const [totalLogs, setTotalLogs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    fetchLogsCount()
    
    // Обновляем каждые 5 секунд
    const interval = setInterval(fetchLogsCount, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchLogsCount = async () => {
    setLoading(true)
    setError(null)
    try {
      // Получаем общее количество событий из ML Detector
      const ipsResponse = await apiClient.getIPs(100)
      const totalEvents = ipsResponse.ips.reduce((sum, ip) => sum + ip.recent_events, 0)
      setTotalLogs(totalEvents)
      setLastUpdate(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch logs count:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Logs Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading logs count...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Logs Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Logs Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total Logs:</span>
          <Badge variant="outline" className="text-lg font-bold">
            {totalLogs.toLocaleString()}
          </Badge>
        </div>
        <div className="text-xs text-gray-500">
          Real-time log monitoring
          {lastUpdate && (
            <div className="mt-1">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
