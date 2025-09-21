"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Download, Database, Clock, AlertCircle } from "lucide-react"

interface SuppressRequest {
  type: "ip" | "user" | "pattern"
  value: string
  minutes: number
  description: string
}

export function ExportPanel() {
  const [exportFormat, setExportFormat] = useState("ndjson")
  const [exportLimit, setExportLimit] = useState("1000")
  const [sinceDate, setSinceDate] = useState("")
  const [untilDate, setUntilDate] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [suppressType, setSuppressType] = useState<"ip" | "user" | "pattern">("ip")
  const [suppressValue, setSuppressValue] = useState("")
  const [suppressMinutes, setSuppressMinutes] = useState("30")
  const [suppressDescription, setSuppressDescription] = useState("")

  const handleExport = async () => {
    setIsExporting(true)

    // Simulate export process
    setTimeout(() => {
      // Create mock NDJSON content
      const mockData = [
        {
          timestamp: "2024-01-15T10:30:45.123456+00:00",
          action: "block_ip",
          source_ip: "192.168.1.100",
          anomaly_score: -0.85,
          recent_failed_attempts: 15,
          recent_total_events: 25,
          failure_ratio: 0.6,
          reason: "Too many failed logins in window",
          event_type: "anomaly_detection",
          severity: "high",
          source: "ml-detector",
          exported_at: new Date().toISOString(),
        },
        {
          timestamp: "2024-01-15T10:25:30.987654+00:00",
          action: "flag_ip",
          source_ip: "10.0.0.50",
          anomaly_score: -0.75,
          recent_failed_attempts: 5,
          recent_total_events: 10,
          failure_ratio: 0.5,
          reason: "Suspicious login pattern",
          event_type: "anomaly_detection",
          severity: "medium",
          source: "ml-detector",
          exported_at: new Date().toISOString(),
        },
      ]

      const ndjsonContent = mockData.map((item) => JSON.stringify(item)).join("\n")
      const blob = new Blob([ndjsonContent], { type: "application/x-ndjson" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `anomalies_${new Date().toISOString().split("T")[0]}.ndjson`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setIsExporting(false)
    }, 2000)
  }

  const handleSuppress = async () => {
    // Simulate suppress request
    console.log("Suppressing alerts:", {
      type: suppressType,
      value: suppressValue,
      minutes: Number.parseInt(suppressMinutes),
      description: suppressDescription,
    })

    // Reset form
    setSuppressValue("")
    setSuppressDescription("")
  }

  return (
    <div className="space-y-6">
      {/* Export Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>Export anomaly data for SIEM integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="format">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ndjson">NDJSON</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="limit">Record Limit</Label>
              <Select value={exportLimit} onValueChange={setExportLimit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100 records</SelectItem>
                  <SelectItem value="1000">1,000 records</SelectItem>
                  <SelectItem value="5000">5,000 records</SelectItem>
                  <SelectItem value="10000">10,000 records</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Date Range (Optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="since" className="text-sm text-muted-foreground">
                  Since
                </Label>
                <Input
                  id="since"
                  type="datetime-local"
                  value={sinceDate}
                  onChange={(e) => setSinceDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="until" className="text-sm text-muted-foreground">
                  Until
                </Label>
                <Input
                  id="until"
                  type="datetime-local"
                  value={untilDate}
                  onChange={(e) => setUntilDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleExport} disabled={isExporting} className="w-full">
            {isExporting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Anomalies
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• NDJSON format is recommended for SIEM systems</p>
            <p>• Files include timestamp, IP, scores, and metadata</p>
            <p>• Large exports may take several minutes</p>
          </div>
        </CardContent>
      </Card>

      {/* Alert Suppression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Alert Suppression
          </CardTitle>
          <CardDescription>Temporarily suppress alerts for maintenance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="suppress-type">Suppression Type</Label>
            <Select value={suppressType} onValueChange={(value: "ip" | "user" | "pattern") => setSuppressType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ip">IP Address</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="pattern">Pattern</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="suppress-value">Value</Label>
            <Input
              id="suppress-value"
              placeholder={suppressType === "ip" ? "192.168.1.100" : suppressType === "user" ? "username" : "pattern"}
              value={suppressValue}
              onChange={(e) => setSuppressValue(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="suppress-minutes">Duration (minutes)</Label>
            <Select value={suppressMinutes} onValueChange={setSuppressMinutes}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
                <SelectItem value="480">8 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="suppress-description">Description (Optional)</Label>
            <Input
              id="suppress-description"
              placeholder="Maintenance window, testing, etc."
              value={suppressDescription}
              onChange={(e) => setSuppressDescription(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSuppress}
            disabled={!suppressValue}
            variant="outline"
            className="w-full bg-transparent"
          >
            <Clock className="h-4 w-4 mr-2" />
            Suppress Alerts
          </Button>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Export Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">2,847</p>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">156</p>
              <p className="text-sm text-muted-foreground">Exports Today</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Export:</span>
            <Badge variant="outline">2 hours ago</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
