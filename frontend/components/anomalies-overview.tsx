"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, Shield, Clock, TrendingUp, RefreshCw } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { apiClient, type Anomaly, type AnomaliesResponse } from "@/lib/api"

export function AnomaliesOverview() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState("20")
  const [searchIp, setSearchIp] = useState("")
  const [stats, setStats] = useState({
    total: 0,
    blocked: 0,
    flagged: 0,
    trend: 0
  })

  const chartData = [
    { time: "10:00", anomalies: 2, blocked: 1 },
    { time: "10:15", anomalies: 5, blocked: 3 },
    { time: "10:30", anomalies: 8, blocked: 5 },
    { time: "10:45", anomalies: 3, blocked: 2 },
    { time: "11:00", anomalies: 6, blocked: 4 },
    { time: "11:15", anomalies: 4, blocked: 2 },
  ]

  useEffect(() => {
    // Загружаем данные только в браузере
    if (typeof window !== 'undefined') {
      // Небольшая задержка для инициализации
      const timer = setTimeout(() => {
        fetchAnomalies()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [limit])

  const fetchAnomalies = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.getAnomalies(parseInt(limit))
      setAnomalies(response.anomalies)
      
      // Calculate stats
      const blocked = response.anomalies.filter(a => a.action === "block_ip").length
      const flagged = response.anomalies.filter(a => a.action === "flag_ip").length
      setStats({
        total: response.count,
        blocked,
        flagged,
        trend: 0 // TODO: Calculate trend from historical data
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch anomalies')
      console.error('Error fetching anomalies:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (action: string, score: number) => {
    if (action === "block_ip") return "destructive"
    if (score < -0.8) return "warning"
    return "secondary"
  }

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Anomalies</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Blocked IPs</p>
                <p className="text-2xl font-bold text-destructive">{stats.blocked}</p>
              </div>
              <Shield className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Flagged IPs</p>
                <p className="text-2xl font-bold text-warning">{stats.flagged}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Trend</p>
                <p className="text-2xl font-bold text-success">{stats.trend > 0 ? '+' : ''}{stats.trend}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Anomaly Trends</CardTitle>
          <CardDescription>Real-time anomaly detection over the last hour</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Line
                type="monotone"
                dataKey="anomalies"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                name="Total Anomalies"
              />
              <Line type="monotone" dataKey="blocked" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Blocked IPs" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Anomalies List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Anomalies</CardTitle>
              <CardDescription>Latest security anomalies detected by the system</CardDescription>
            </div>
            <Button onClick={fetchAnomalies} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by IP address..."
                value={searchIp}
                onChange={(e) => setSearchIp(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 items</SelectItem>
                <SelectItem value="20">20 items</SelectItem>
                <SelectItem value="50">50 items</SelectItem>
                <SelectItem value="100">100 items</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading anomalies...</span>
              </div>
            ) : anomalies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No anomalies found
              </div>
            ) : (
              anomalies
                .filter((anomaly) => !searchIp || anomaly.ip.includes(searchIp))
                .map((anomaly, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-4">
                    <Badge variant={getSeverityColor(anomaly.action, anomaly.iso_score) as any}>
                      {anomaly.action === "block_ip" ? "BLOCKED" : "FLAGGED"}
                    </Badge>
                    <div>
                      <p className="font-mono text-sm font-medium text-foreground">{anomaly.ip}</p>
                      <p className="text-xs text-muted-foreground">{formatTimestamp(anomaly.ts)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">Score: {anomaly.iso_score.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {anomaly.recent_failed}/{anomaly.recent_events} failed
                    </p>
                  </div>
                </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
