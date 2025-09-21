"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Activity, Search, Eye, User, AlertCircle, CheckCircle, XCircle, Minus } from "lucide-react"
import { apiClient, type SecurityEvent } from "@/lib/api"

export function EventsViewer() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [filteredEvents, setFilteredEvents] = useState<SecurityEvent[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [outcomeFilter, setOutcomeFilter] = useState("all")
  const [serviceFilter, setServiceFilter] = useState("all")
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIP, setSelectedIP] = useState("")

  useEffect(() => {
    // Load events for a default IP or show message to select IP
    if (selectedIP) {
      fetchEvents(selectedIP)
    }
  }, [selectedIP])

  const fetchEvents = async (ip: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.getEventsByIP(ip, 100)
      setEvents(response.events)
      setFilteredEvents(response.events)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
      console.error('Error fetching events:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = events

    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.source_ip.includes(searchTerm) ||
          event.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.message.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (outcomeFilter !== "all") {
      filtered = filtered.filter((event) => event.outcome === outcomeFilter)
    }

    if (serviceFilter !== "all") {
      filtered = filtered.filter((event) => event.service === serviceFilter)
    }

    setFilteredEvents(filtered)
  }, [events, searchTerm, outcomeFilter, serviceFilter])

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />
      case "failure":
        return <XCircle className="h-4 w-4 text-destructive" />
      case "blocked":
        return <AlertCircle className="h-4 w-4 text-warning" />
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />
      case "deny":
        return <Minus className="h-4 w-4 text-muted-foreground" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case "success":
        return "success"
      case "failure":
        return "destructive"
      case "blocked":
        return "warning"
      case "error":
        return "destructive"
      case "deny":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString()
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const uniqueServices = [...new Set(events.map((e) => e.service))]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Security Events
            </CardTitle>
            <CardDescription>Real-time security event monitoring and analysis</CardDescription>
          </div>
          <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">
            {filteredEvents.length} events
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events by IP, user, service, or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outcomes</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="deny">Deny</SelectItem>
            </SelectContent>
          </Select>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {uniqueServices.map((service) => (
                <SelectItem key={service} value={service}>
                  {service}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Events List */}
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {filteredEvents.map((event) => (
              <div
                key={event.event_id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  {getOutcomeIcon(event.outcome)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getOutcomeColor(event.outcome) as any} className="text-xs">
                        {event.outcome.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {event.service}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(event.ts)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-mono text-primary">
                        {event.source_ip}:{event.source_port}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-mono">
                        {event.dest_ip}:{event.dest_port}
                      </span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{event.user}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate max-w-md">{event.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatBytes(event.bytes)}</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(event)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Event Details</DialogTitle>
                        <DialogDescription>Detailed information for event {event.event_id}</DialogDescription>
                      </DialogHeader>
                      {selectedEvent && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">Basic Information</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Event ID:</span>
                                  <span className="font-mono">{selectedEvent.event_id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Timestamp:</span>
                                  <span>{formatTimestamp(selectedEvent.ts)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Outcome:</span>
                                  <Badge variant={getOutcomeColor(selectedEvent.outcome) as any}>
                                    {selectedEvent.outcome}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Service:</span>
                                  <span>{selectedEvent.service}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Protocol:</span>
                                  <span className="uppercase">{selectedEvent.protocol}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Network Information</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Source:</span>
                                  <span className="font-mono">
                                    {selectedEvent.source_ip}:{selectedEvent.source_port}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Destination:</span>
                                  <span className="font-mono">
                                    {selectedEvent.dest_ip}:{selectedEvent.dest_port}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">User:</span>
                                  <span>{selectedEvent.user}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Bytes:</span>
                                  <span>{formatBytes(selectedEvent.bytes)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Sensor:</span>
                                  <span>{selectedEvent.sensor}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h4 className="font-semibold mb-2">Message</h4>
                            <p className="text-sm bg-muted p-3 rounded-md">{selectedEvent.message}</p>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Scenario</h4>
                            <Badge variant="outline">{selectedEvent.scenario}</Badge>
                          </div>

                          {Object.keys(selectedEvent.metadata).length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Metadata</h4>
                              <div className="bg-muted p-3 rounded-md">
                                <pre className="text-xs overflow-x-auto">
                                  {JSON.stringify(selectedEvent.metadata, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
