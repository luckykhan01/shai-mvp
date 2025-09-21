"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { apiClient, type LogEvent } from "@/lib/api"

export function LogsStream() {
  const [logs, setLogs] = useState<LogEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchLogs()
    
    // Автообновление каждые 5 секунд
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchLogs()
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }, [autoRefresh])

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.getLogs(15)
      setLogs(response.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => {
    fetchLogs()
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(filter.toLowerCase()) ||
    log.source_ip.includes(filter) ||
    log.event_type.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📋 Logs Stream (15 per batch)</span>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto ON' : 'Auto OFF'}
            </Button>
            <Button size="sm" onClick={refreshData} disabled={loading}>
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Input
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1"
          />
          <Badge variant="outline">
            Count: {logs.length}
          </Badge>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLogs.map((log, index) => (
            <div key={`${log.timestamp}-${index}`} className="p-3 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={getSeverityColor(log.severity)}>
                    {log.severity}
                  </Badge>
                  <span className="text-sm font-mono">{log.source_ip}</span>
                  <span className="text-sm text-gray-600">{log.service}</span>
                </div>
                <span className="text-xs text-gray-500">{log.timestamp}</span>
              </div>
              <div className="text-sm">
                <strong>{log.event_type}:</strong> {log.message}
              </div>
            </div>
          ))}
        </div>

        {filteredLogs.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            No logs available
          </div>
        )}

        {loading && (
          <div className="text-center text-gray-500 py-4">
            Loading logs...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
