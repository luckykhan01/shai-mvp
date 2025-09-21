import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { ListItem, CreateListItemRequest } from '../types/api';
import { Plus, Trash2, Shield, Ban, Users, Network, Clock } from 'lucide-react';

const ListsManagement: React.FC = () => {
  const [allowList, setAllowList] = useState<ListItem[]>([]);
  const [denyList, setDenyList] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'allow' | 'deny'>('allow');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<CreateListItemRequest>({
    type: 'ip',
    value: '',
    description: ''
  });

  const loadLists = async () => {
    setLoading(true);
    try {
      const [allowData, denyData] = await Promise.all([
        apiClient.getAllowList(),
        apiClient.getDenyList()
      ]);
      
      setAllowList(allowData.items);
      setDenyList(denyData.items);
    } catch (error) {
      console.error('Error loading lists:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  const handleAddItem = async () => {
    if (!newItem.value.trim()) return;

    try {
      if (activeTab === 'allow') {
        await apiClient.addToAllowList(newItem);
      } else {
        await apiClient.addToDenyList(newItem);
      }
      
      setNewItem({ type: 'ip', value: '', description: '' });
      setShowAddForm(false);
      loadLists();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleRemoveItem = async (item: ListItem) => {
    try {
      if (activeTab === 'allow') {
        await apiClient.removeFromAllowList({ item_id: item.id });
      } else {
        await apiClient.removeFromDenyList({ item_id: item.id });
      }
      
      loadLists();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ip':
        return <Network className="w-4 h-4" />;
      case 'user':
        return <Users className="w-4 h-4" />;
      case 'network':
        return <Network className="w-4 h-4" />;
      default:
        return <Network className="w-4 h-4" />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'ip':
        return 'IP адрес';
      case 'user':
        return 'Пользователь';
      case 'network':
        return 'Сеть';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Бессрочно';
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const currentList = activeTab === 'allow' ? allowList : denyList;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Управление списками</h1>
          <p className="mt-2 text-gray-600">
            Управление списками разрешений и блокировок
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('allow')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'allow'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Список разрешений</span>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    {allowList.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('deny')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'deny'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Ban className="w-4 h-4" />
                  <span>Список блокировок</span>
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                    {denyList.length}
                  </span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Добавить в {activeTab === 'allow' ? 'список разрешений' : 'список блокировок'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип
                </label>
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ip">IP адрес</option>
                  <option value="user">Пользователь</option>
                  <option value="network">Сеть</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Значение
                </label>
                <input
                  type="text"
                  value={newItem.value}
                  onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                  placeholder={newItem.type === 'ip' ? '192.168.1.1' : newItem.type === 'user' ? 'username' : '10.0.0.0/8'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание
                </label>
                <input
                  type="text"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Описание записи"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Добавить
              </button>
            </div>
          </div>
        )}

        {/* Add Button */}
        {!showAddForm && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить запись</span>
            </button>
          </div>
        )}

        {/* List Table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Значение
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Описание
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Создано
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Истекает
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : currentList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Список пуст
                    </td>
                  </tr>
                ) : (
                  currentList.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(item.type)}
                          <span className="text-sm font-medium text-gray-900">
                            {getTypeText(item.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-mono">{item.value}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.description || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={isExpired(item.expires_at) ? 'text-red-600' : 'text-gray-500'}>
                          {formatDate(item.expires_at)}
                        </span>
                        {isExpired(item.expires_at) && (
                          <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                            Истекло
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="text-red-600 hover:text-red-800 flex items-center space-x-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Удалить</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListsManagement;
