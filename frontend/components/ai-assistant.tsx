"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export function AIAssistant() {
  const [query, setQuery] = useState("")
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const askAI = async () => {
    if (!query.trim()) return
    
    setLoading(true)
    setError(null)
    setResponse(null)
    
    try {
      // Попробуем использовать chat API если доступен
      try {
        const chatRes = await fetch('http://localhost:8002/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        })
        if (chatRes.ok) {
          const chatData = await chatRes.json()
          setResponse({
            ...chatData,
            query: query,
            timestamp: new Date().toISOString()
          })
          return
        }
      } catch (chatErr) {
        console.log('Chat API not available, falling back to status')
      }
      
      // Fallback to status API
      const res = await fetch('http://localhost:8002/status')
      const data = await res.json()
      setResponse({
        ...data,
        query: query,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🤖 AI Security Assistant
          <Badge variant="outline">Operational</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about security status..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && askAI()}
            />
            <Button onClick={askAI} disabled={loading}>
              {loading ? 'Analyzing...' : 'Ask AI'}
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setQuery("What are the current security threats?")}
            >
              Current Threats
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setQuery("Analyze recent anomalies")}
            >
              Analyze Anomalies
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setQuery("What IPs are most suspicious?")}
            >
              Suspicious IPs
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setQuery("Give me security recommendations")}
            >
              Recommendations
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {response && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Status:</strong> 
                <Badge className="ml-2" variant={response.overall_status === 'operational' ? 'default' : 'destructive'}>
                  {response.overall_status}
                </Badge>
              </div>
              <div>
                <strong>Threat Level:</strong> 
                <Badge className="ml-2" variant={response.threat_level === 'low' ? 'default' : 'destructive'}>
                  {response.threat_level}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Active Threats: <strong>{response.active_threats}</strong></div>
              <div>Blocked IPs: <strong>{response.blocked_ips}</strong></div>
              <div>Flagged IPs: <strong>{response.flagged_ips}</strong></div>
            </div>
            
            {response.recommendations && (
              <div>
                <strong>Recommendations:</strong>
                <ul className="mt-1 list-disc list-inside text-sm">
                  {response.recommendations.map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              Last analysis: {new Date(response.last_analysis).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
