import React from 'react';
import { Event } from '../types/api';
import { 
  Clock, 
  User, 
  Server, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Ban,
  AlertTriangle
} from 'lucide-react';

interface EventsTableProps {
  events: Event[];
  loading?: boolean;
}

const EventsTable: React.FC<EventsTableProps> = ({ 
  events, 
  loading = false 
}) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'blocked':
        return <Ban className="w-4 h-4 text-red-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'deny':
        return <Shield className="w-4 h-4 text-red-700" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failure':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'blocked':
        return 'bg-red-200 text-red-900 border-red-300';
      case 'error':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'deny':
        return 'bg-red-300 text-red-900 border-red-400';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOutcomeText = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return 'Успех';
      case 'failure':
        return 'Неудача';
      case 'blocked':
        return 'Заблокировано';
      case 'error':
        return 'Ошибка';
      case 'deny':
        return 'Отклонено';
      default:
        return outcome;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Нет событий для отображения</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Время
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Источник
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Назначение
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Пользователь
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Сервис
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Результат
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Сообщение
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {events.map((event, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{formatTimestamp(event.ts)}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="font-medium">{event.source_ip}</div>
                    <div className="text-gray-500">:{event.source_port}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>
                  <div className="font-medium">{event.dest_ip}</div>
                  <div className="text-gray-500">:{event.dest_port}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{event.user || 'N/A'}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{event.service}</span>
                  <span className="text-gray-500">({event.protocol})</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  {getOutcomeIcon(event.outcome)}
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getOutcomeColor(event.outcome)}`}>
                    {getOutcomeText(event.outcome)}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                <div className="truncate" title={event.message}>
                  {event.message}
                </div>
                {event.scenario && (
                  <div className="text-xs text-gray-500 mt-1">
                    Сценарий: {event.scenario}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EventsTable;
