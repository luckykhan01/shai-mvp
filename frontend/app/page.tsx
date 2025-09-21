import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardStats } from "@/components/dashboard-stats"
import { AnomaliesOverview } from "@/components/anomalies-overview"
import { IPMonitor } from "@/components/ip-monitor"
import { EventsViewer } from "@/components/events-viewer"
import { ExportPanel } from "@/components/export-panel"
import { AIAssistant } from "@/components/ai-assistant"
import { LogsStats } from "@/components/logs-stats"
import { LogsStream } from "@/components/logs-stream"

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Dashboard Statistics - Full Width */}
        <DashboardStats />
        
        {/* Other Components */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <AnomaliesOverview />
          </div>
          <div>
            <IPMonitor />
          </div>
          <div className="lg:col-span-2">
            <EventsViewer />
          </div>
          <div className="lg:col-span-2">
            <LogsStream />
          </div>
          <div>
            <LogsStats />
          </div>
          <div>
            <AIAssistant />
          </div>
          <div>
            <ExportPanel />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}