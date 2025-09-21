"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Shield, AlertTriangle, Users, Network } from "lucide-react"
import { apiClient, type IPInfo, type ListItem } from "@/lib/api"

export function IPMonitor() {
  const [ips, setIps] = useState<IPInfo[]>([])
  const [allowList, setAllowList] = useState<ListItem[]>([])
  const [denyList, setDenyList] = useState<ListItem[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [currentList, setCurrentList] = useState<"allow" | "deny">("allow")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ipsResponse, allowResponse, denyResponse] = await Promise.all([
        apiClient.getIPs(100),
        apiClient.getAllowList(100),
        apiClient.getDenyList(100)
      ])
      
      setIps(ipsResponse.ips)
      setAllowList(allowResponse.items)
      setDenyList(denyResponse.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRiskLevel = (ratio: number) => {
    if (ratio > 0.7) return { level: "High", color: "destructive" }
    if (ratio > 0.4) return { level: "Medium", color: "warning" }
    return { level: "Low", color: "success" }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ip":
        return <Network className="h-4 w-4" />
      case "user":
        return <Users className="h-4 w-4" />
      case "network":
        return <Shield className="h-4 w-4" />
      default:
        return <Network className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* IP Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Active IP Addresses
          </CardTitle>
          <CardDescription>Recent activity from monitored IP addresses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ips.map((ip, index) => {
              const risk = getRiskLevel(ip.recent_fail_ratio)
              return (
                <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-mono text-sm font-medium">{ip.ip}</p>
                    <p className="text-xs text-muted-foreground">
                      {ip.recent_events} events, {ip.recent_failed} failed
                    </p>
                  </div>
                  <Badge variant={risk.color as any}>{risk.level}</Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Allow/Deny Lists */}
      <Card>
        <CardHeader>
          <CardTitle>Access Control Lists</CardTitle>
          <CardDescription>Manage IP addresses, users, and networks</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="allow" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="allow" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Allow List ({allowList.length})
              </TabsTrigger>
              <TabsTrigger value="deny" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Deny List ({denyList.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="allow" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Trusted entities with access</p>
                <Dialog
                  open={isAddDialogOpen && currentList === "allow"}
                  onOpenChange={(open) => {
                    setIsAddDialogOpen(open)
                    if (open) setCurrentList("allow")
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Allow List
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add to Allow List</DialogTitle>
                      <DialogDescription>Add an IP address, user, or network to the allow list</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                          Type
                        </Label>
                        <Select>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ip">IP Address</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="network">Network</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="value" className="text-right">
                          Value
                        </Label>
                        <Input id="value" placeholder="192.168.1.100" className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                          Description
                        </Label>
                        <Textarea id="description" placeholder="Optional description" className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Add to List</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                {allowList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-success/5"
                  >
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.type)}
                      <div>
                        <p className="font-mono text-sm font-medium">{item.value}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="deny" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Blocked entities</p>
                <Dialog
                  open={isAddDialogOpen && currentList === "deny"}
                  onOpenChange={(open) => {
                    setIsAddDialogOpen(open)
                    if (open) setCurrentList("deny")
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Deny List
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add to Deny List</DialogTitle>
                      <DialogDescription>Add an IP address, user, or network to the deny list</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                          Type
                        </Label>
                        <Select>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ip">IP Address</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="network">Network</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="value" className="text-right">
                          Value
                        </Label>
                        <Input id="value" placeholder="192.168.1.100" className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                          Description
                        </Label>
                        <Textarea id="description" placeholder="Optional description" className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" variant="destructive">
                        Add to List
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                {denyList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-destructive/5"
                  >
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.type)}
                      <div>
                        <p className="font-mono text-sm font-medium">{item.value}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
