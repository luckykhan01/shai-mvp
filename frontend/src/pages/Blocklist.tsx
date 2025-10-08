import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Plus, Trash2, Shield, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { mlDetectorApi } from '@/lib/api';
import { formatTimestamp } from '@/lib/utils';

export function Blocklist() {
  const queryClient = useQueryClient();
  const [newIp, setNewIp] = useState('');
  const [description, setDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Получаем черный список
  const { data: blacklistData, isLoading: blacklistLoading } = useQuery({
    queryKey: ['blacklist'],
    queryFn: () => mlDetectorApi.getBlacklist(200),
    refetchInterval: 5000,
  });

  // Получаем белый список
  const { data: whitelistData, isLoading: whitelistLoading } = useQuery({
    queryKey: ['whitelist'],
    queryFn: () => mlDetectorApi.getWhitelist(200),
    refetchInterval: 5000,
  });

  // Добавление в черный список
  const addToBlocklistMutation = useMutation({
    mutationFn: (data: { type: 'ip'; value: string; description?: string }) =>
      mlDetectorApi.addToBlacklist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      setNewIp('');
      setDescription('');
      setShowAddForm(false);
    },
  });

  // Добавление в белый список
  const addToWhitelistMutation = useMutation({
    mutationFn: (data: { type: 'ip'; value: string; description?: string }) =>
      mlDetectorApi.addToWhitelist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
    },
  });

  // Удаление из черного списка
  const removeFromBlocklistMutation = useMutation({
    mutationFn: (params: { item_id?: number; item_type?: 'ip'; value?: string }) =>
      mlDetectorApi.removeFromBlacklist(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
    },
  });

  // Удаление из белого списка
  const removeFromWhitelistMutation = useMutation({
    mutationFn: (params: { item_id?: number; item_type?: 'ip'; value?: string }) =>
      mlDetectorApi.removeFromWhitelist(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
    },
  });

  const handleAddToBlocklist = () => {
    if (!newIp.trim()) return;
    addToBlocklistMutation.mutate({
      type: 'ip',
      value: newIp.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleMoveToWhitelist = (ip: string) => {
    // Сначала удаляем из черного списка
    removeFromBlocklistMutation.mutate({ item_type: 'ip', value: ip });
    // Затем добавляем в белый список
    setTimeout(() => {
      addToWhitelistMutation.mutate({
        type: 'ip',
        value: ip,
        description: 'Перемещен из черного списка',
      });
    }, 500);
  };

  const blacklistedIps = blacklistData?.items.filter((item) => item.type === 'ip') || [];
  const whitelistedIps = whitelistData?.items.filter((item) => item.type === 'ip') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Управление блокировками</h1>
          <p className="mt-2 text-sm text-gray-600">
            Добавляйте и удаляйте IP адреса из черного и белого списков
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          variant="danger"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить IP
        </Button>
      </div>

      {/* Add IP Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Добавить IP в черный список</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP адрес
                </label>
                <input
                  type="text"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-danger-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание (необязательно)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Причина блокировки"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-danger-500"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleAddToBlocklist}
                  variant="danger"
                  isLoading={addToBlocklistMutation.isPending}
                  disabled={!newIp.trim()}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Заблокировать
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewIp('');
                    setDescription('');
                  }}
                  variant="outline"
                >
                  Отмена
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-3 rounded-lg bg-danger-100 text-danger-600">
              <Ban className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Черный список</p>
              <p className="text-2xl font-bold text-gray-900">{blacklistedIps.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-3 rounded-lg bg-success-100 text-success-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Белый список</p>
              <p className="text-2xl font-bold text-gray-900">{whitelistedIps.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blacklist Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center">
              <Ban className="w-5 h-5 mr-2 text-danger-600" />
              Черный список ({blacklistedIps.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {blacklistLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-danger-600"></div>
            </div>
          ) : blacklistedIps.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Черный список пуст
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Нет заблокированных IP адресов
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      IP адрес
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Описание
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Дата добавления
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {blacklistedIps.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Badge variant="danger">
                            <Ban className="w-3 h-3 mr-1" />
                            {item.value}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {item.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatTimestamp(item.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleMoveToWhitelist(item.value)}
                          isLoading={removeFromBlocklistMutation.isPending}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          В белый список
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            removeFromBlocklistMutation.mutate({ item_id: item.id })
                          }
                          isLoading={removeFromBlocklistMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Удалить
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Whitelist Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-success-600" />
              Белый список ({whitelistedIps.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {whitelistLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-success-600"></div>
            </div>
          ) : whitelistedIps.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Белый список пуст
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Нет доверенных IP адресов
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      IP адрес
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Описание
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Дата добавления
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {whitelistedIps.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Badge variant="success">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {item.value}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {item.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatTimestamp(item.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            removeFromWhitelistMutation.mutate({ item_id: item.id })
                          }
                          isLoading={removeFromWhitelistMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Удалить
                        </Button>
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


