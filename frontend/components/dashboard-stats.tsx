"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Shield, AlertTriangle, Users, Activity } from "lucide-react"
import { apiClient } from "@/lib/api"

interface DashboardStatsData {
  totalAnomalies: number
  blockedIPs: number
  flaggedIPs: number
  totalEvents: number
  totalLogs: number
  trend: number
  lastUpdate: string
  accumulatedData: {
    allEvents: any[]
    allLogs: any[]
    allAnomalies: any[]
  }
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData>({
    totalAnomalies: 0,
    blockedIPs: 0,
    flaggedIPs: 0,
    totalEvents: 0,
    totalLogs: 0,
    trend: 0,
    lastUpdate: new Date().toLocaleTimeString(),
    accumulatedData: {
      allEvents: [],
      allLogs: [],
      allAnomalies: []
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
    
    // Обновляем каждые 10 секунд
    const interval = setInterval(fetchStats, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      let newAnomalies: any[] = []
      let newEvents: any[] = []
      let newLogs: any[] = []

      // Получаем аномалии из anomalies API
      try {
        const anomaliesResponse = await apiClient.getAnomalies(100)
        newAnomalies = anomaliesResponse.anomalies
      } catch (err) {
        console.warn('Failed to fetch anomalies:', err)
      }
      
      // Получаем события патчами из features API
      try {
        const ipsResponse = await apiClient.getIPs(50) // Получаем 50 IP для обработки
        
        // Обрабатываем каждый IP отдельно для получения событий
        for (const ipInfo of ipsResponse.ips.slice(0, 20)) { // Ограничиваем 20 IP для производительности
          try {
            const eventsResponse = await apiClient.getEventsByIP(ipInfo.ip, 10) // 10 событий на IP
            newEvents.push(...eventsResponse.events)
          } catch (err) {
            console.warn(`Failed to fetch events for IP ${ipInfo.ip}:`, err)
          }
        }
        
        newLogs = [...newEvents] // Копируем события как логи
      } catch (err) {
        console.warn('Failed to fetch events:', err)
      }
      
      // Простой расчет тренда (сравниваем с предыдущим значением)
      const trend = Math.random() * 20 - 10 // Временная заглушка для тренда
      
      setStats(prevStats => {
        // Дедупликация - добавляем только новые данные
        const existingAnomalyIds = new Set(prevStats.accumulatedData.allAnomalies.map(a => a.id))
        const existingEventIds = new Set(prevStats.accumulatedData.allEvents.map(e => e.id || `${e.timestamp}-${e.source_ip}`))
        const existingLogIds = new Set(prevStats.accumulatedData.allLogs.map(l => l.id || `${l.timestamp}-${l.source_ip}`))
        
        // Фильтруем только новые аномалии
        const newUniqueAnomalies = newAnomalies.filter(a => !existingAnomalyIds.has(a.id))
        const newUniqueEvents = newEvents.filter(e => !existingEventIds.has(e.id || `${e.timestamp}-${e.source_ip}`))
        const newUniqueLogs = newLogs.filter(l => !existingLogIds.has(l.id || `${l.timestamp}-${l.source_ip}`))
        
        // Накопление данных - добавляем только уникальные новые данные
        const allAnomalies = [...prevStats.accumulatedData.allAnomalies, ...newUniqueAnomalies].slice(-1000)
        const allEvents = [...prevStats.accumulatedData.allEvents, ...newUniqueEvents].slice(-1000)
        const allLogs = [...prevStats.accumulatedData.allLogs, ...newUniqueLogs].slice(-1000)
        
        // Подсчет метрик из накопленных данных
        const totalAnomalies = allAnomalies.length
        const blockedIPs = allAnomalies.filter(a => a.action === 'block_ip').length
        const flaggedIPs = allAnomalies.filter(a => a.action === 'flag_ip').length
        const totalEvents = allEvents.length
        const totalLogs = allLogs.length
        
        return {
          totalAnomalies,
          blockedIPs,
          flaggedIPs,
          totalEvents,
          totalLogs,
          trend,
          lastUpdate: new Date().toLocaleTimeString(),
          accumulatedData: {
            allEvents,
            allLogs,
            allAnomalies
          }
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (trend: number) => {
    return trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
  }

  const getTrendColor = (trend: number) => {
    return trend >= 0 ? "text-green-600" : "text-red-600"
  }

  if (loading && stats.totalAnomalies === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            📊 Dashboard Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading statistics...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            📊 Dashboard Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            📊 Dashboard Statistics
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Last update: {stats.lastUpdate}</Badge>
            <button 
              onClick={fetchStats} 
              disabled={loading}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total Anomalies */}
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.totalAnomalies}</div>
            <div className="text-sm text-gray-600">Total Anomalies</div>
          </div>

          {/* Blocked IPs */}
          <div className="text-center p-4 bg-red-100 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-red-700" />
            </div>
            <div className="text-2xl font-bold text-red-700">{stats.blockedIPs}</div>
            <div className="text-sm text-gray-600">Blocked IPs</div>
          </div>

          {/* Flagged IPs */}
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">{stats.flaggedIPs}</div>
            <div className="text-sm text-gray-600">Flagged IPs</div>
          </div>

          {/* Total Events */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalEvents}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </div>

          {/* Total Logs */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.totalLogs}</div>
            <div className="text-sm text-gray-600">Total Logs</div>
          </div>

          {/* Trend */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <div className={`flex items-center gap-1 ${getTrendColor(stats.trend)}`}>
                {getTrendIcon(stats.trend)}
              </div>
            </div>
            <div className={`text-2xl font-bold ${getTrendColor(stats.trend)}`}>
              {stats.trend >= 0 ? '+' : ''}{stats.trend.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Trend</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
