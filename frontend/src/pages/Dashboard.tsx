import { useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, Activity, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { StatsCard } from '@/components/StatsCard';
import { AnomalyTable } from '@/components/AnomalyTable';
import { mlDetectorApi } from '@/lib/api';

export function Dashboard() {
  const { data: anomaliesData, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['anomalies', 20],
    queryFn: () => mlDetectorApi.getAnomalies(20),
    refetchInterval: 2000, // Обновление каждые 2 секунды
  });

  const { data: ipsData } = useQuery({
    queryKey: ['ips'],
    queryFn: () => mlDetectorApi.getIps(100),
    refetchInterval: 3000, // Обновление каждые 3 секунды
  });

  const blockedCount =
    anomaliesData?.anomalies.filter((a) => a.action === 'block_ip').length || 0;
  const flaggedCount =
    anomaliesData?.anomalies.filter((a) => a.action === 'flag_ip').length || 0;
  const totalIps = ipsData?.count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Обзор системы безопасности и мониторинг угроз
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Всего аномалий"
          value={anomaliesData?.count || 0}
          icon={Activity}
          color="primary"
        />
        <StatsCard
          title="Заблокировано IP"
          value={blockedCount}
          icon={Shield}
          color="danger"
        />
        <StatsCard
          title="Помечено IP"
          value={flaggedCount}
          icon={AlertTriangle}
          color="warning"
        />
        <StatsCard
          title="Отслеживается IP"
          value={totalIps}
          icon={Eye}
          color="success"
        />
      </div>

      {/* Recent Anomalies */}
      <Card>
        <CardHeader>
          <CardTitle>Последние аномалии</CardTitle>
        </CardHeader>
        <CardContent>
          <AnomalyTable
            anomalies={anomaliesData?.anomalies || []}
            isLoading={anomaliesLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

