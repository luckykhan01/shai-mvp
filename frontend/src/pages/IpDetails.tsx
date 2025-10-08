import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Shield,
  Flag,
  Activity,
  Ban,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { mlDetectorApi } from '@/lib/api';
import { formatTimestamp, formatRelativeTime, formatPercentage } from '@/lib/utils';

export function IpDetails() {
  const { ip } = useParams<{ ip: string }>();
  const queryClient = useQueryClient();

  const { data: anomaliesData, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['anomalies', ip],
    queryFn: () => mlDetectorApi.getAnomaliesByIp(ip!, 100),
    enabled: !!ip,
    refetchInterval: 5000,
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', ip],
    queryFn: () => mlDetectorApi.getEventsByIp(ip!, 200),
    enabled: !!ip,
    refetchInterval: 10000,
  });

  const { data: blacklistData } = useQuery({
    queryKey: ['blacklist'],
    queryFn: () => mlDetectorApi.getBlacklist(),
  });

  const isBlacklisted = blacklistData?.items.some(
    (item) => item.type === 'ip' && item.value === ip
  );

  const blockMutation = useMutation({
    mutationFn: (ip: string) =>
      mlDetectorApi.addToBlacklist({
        type: 'ip',
        value: ip,
        description: 'Заблокирован через веб-интерфейс',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (ip: string) =>
      mlDetectorApi.removeFromBlacklist({
        item_type: 'ip',
        value: ip,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
    },
  });

  if (!ip) {
    return <div>IP не указан</div>;
  }

  const anomalies = anomaliesData?.anomalies || [];
  const events = eventsData?.events || [];
  const totalEvents = events.length;
  const failedEvents = events.filter((e) => e.outcome === 'failure').length;
  const failRatio = totalEvents > 0 ? failedEvents / totalEvents : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/ips" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{ip}</h1>
            <p className="mt-2 text-sm text-gray-600">
              Детальная информация об IP адресе
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {isBlacklisted ? (
            <Button
              variant="success"
              onClick={() => unblockMutation.mutate(ip)}
              isLoading={unblockMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Разблокировать
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={() => blockMutation.mutate(ip)}
              isLoading={blockMutation.isPending}
            >
              <Ban className="w-4 h-4 mr-2" />
              Заблокировать
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-3 rounded-lg bg-primary-100 text-primary-600">
              <Activity className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Всего событий</p>
              <p className="text-2xl font-bold text-gray-900">{totalEvents}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-3 rounded-lg bg-danger-100 text-danger-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Неудачные</p>
              <p className="text-2xl font-bold text-gray-900">{failedEvents}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div
              className={`p-3 rounded-lg ${
                failRatio > 0.7
                  ? 'bg-danger-100 text-danger-600'
                  : failRatio > 0.4
                  ? 'bg-warning-100 text-warning-600'
                  : 'bg-success-100 text-success-600'
              }`}
            >
              <Flag className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Процент неудач</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(failRatio)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-3 rounded-lg bg-warning-100 text-warning-600">
              <Shield className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Аномалии</p>
              <p className="text-2xl font-bold text-gray-900">{anomalies.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies */}
      <Card>
        <CardHeader>
          <CardTitle>Аномалии ({anomalies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {anomaliesLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : anomalies.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Аномалии не найдены</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anomaly, idx) => (
                <div
                  key={`${anomaly.ts}-${idx}`}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            anomaly.action === 'block_ip' ? 'danger' : 'warning'
                          }
                        >
                          {anomaly.action === 'block_ip'
                            ? 'Заблокирован'
                            : 'Помечен'}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatRelativeTime(anomaly.ts)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-900">{anomaly.reason}</p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Score: {anomaly.iso_score.toFixed(3)}</span>
                        <span>События: {anomaly.recent_events}</span>
                        <span>Неудачные: {anomaly.recent_failed}</span>
                        <span>
                          Процент: {formatPercentage(anomaly.recent_fail_ratio)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(anomaly.ts)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events */}
      <Card>
        <CardHeader>
          <CardTitle>События ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">События не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Время
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Пользователь
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Сервис
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Действие
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Результат
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Сообщение
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.slice(0, 50).map((event) => (
                    <tr key={event.event_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {formatRelativeTime(event.ts)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {event.user}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {event.service}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {event.action}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant={
                            event.outcome === 'success'
                              ? 'success'
                              : event.outcome === 'failure'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {event.outcome}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {event.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

