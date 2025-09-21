"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient, type LogEvent, type Incident } from "@/lib/api"

export function LogsViewer() {
  const [logs, setLogs] = useState<LogEvent[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewType, setViewType] = useState<"logs" | "incidents">("logs")
  const [limit, setLimit] = useState(50)
  const [filter, setFilter] = useState("")

  useEffect(() => {
    fetchData()
  }, [viewType, limit])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      if (viewType === "logs") {
        const response = await apiClient.getLogs(limit)
        setLogs(response.items)
      } else {
        const response = await apiClient.getIncidents(limit)
        setIncidents(response.items)
      }
      
      const countResponse = await apiClient.getTotalLogsCount()
      setTotalLogs(countResponse.total_logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
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

  const filteredIncidents = incidents.filter(incident => 
    incident.message.toLowerCase().includes(filter.toLowerCase()) ||
    incident.source_ip.includes(filter) ||
    incident.event_type.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📊 Logs & Incidents</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Total: {totalLogs}</Badge>
            <Button size="sm" onClick={fetchData} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Select value={viewType} onValueChange={(value: "logs" | "incidents") => setViewType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="logs">Logs</SelectItem>
              <SelectItem value="incidents">Incidents</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </Select>
          </Select>
          
          <Input
            placeholder="Filter by message, IP, or type..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {viewType === "logs" ? (
            filteredLogs.map((log, index) => (
              <div key={index} className="p-3 border rounded-lg bg-gray-50">
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
            ))
          ) : (
            filteredIncidents.map((incident, index) => (
              <div key={index} className="p-3 border rounded-lg bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {incident.severity}
                    </Badge>
                    <span className="text-sm font-mono">{incident.source_ip}</span>
                    <span className="text-sm text-gray-600">{incident.rule_triggered}</span>
                  </div>
                  <span className="text-xs text-gray-500">{incident.timestamp}</span>
                </div>
                <div className="text-sm">
                  <strong>{incident.event_type}:</strong> {incident.message}
                </div>
              </div>
            ))
          )}
        </div>

        {((viewType === "logs" && filteredLogs.length === 0) || 
          (viewType === "incidents" && filteredIncidents.length === 0)) && (
          <div className="text-center text-gray-500 py-8">
            {loading ? 'Loading...' : 'No data available'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}