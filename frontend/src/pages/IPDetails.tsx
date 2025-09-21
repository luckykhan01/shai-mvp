import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Anomaly, Event } from '../types/api';
import AnomaliesTable from '../components/AnomaliesTable';
import EventsTable from '../components/EventsTable';
import FiltersBar from '../components/FiltersBar';
import { ArrowLeft, Server, AlertTriangle, Activity } from 'lucide-react';

const IPDetails: React.FC = () => {
  const { ip } = useParams<{ ip: string }>();
  const navigate = useNavigate();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [anomaliesLimit, setAnomaliesLimit] = useState(50);
  const [eventsLimit, setEventsLimit] = useState(100);

  const loadData = async () => {
    if (!ip) return;
    
    setLoading(true);
    try {
      const [anomaliesData, eventsData] = await Promise.all([
        apiClient.getAnomaliesByIP(ip, anomaliesLimit),
        apiClient.getEventsByIP(ip, eventsLimit)
      ]);
      
      setAnomalies(anomaliesData.anomalies);
      setEvents(eventsData.events);
    } catch (error) {
      console.error('Error loading IP details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [ip, anomaliesLimit, eventsLimit]);

  if (!ip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">IP адрес не найден</h2>
          <p className="text-gray-600">Пожалуйста, выберите корректный IP адрес</p>
        </div>
      </div>
    );
  }

  const blockedCount = anomalies.filter(a => a.action === 'block_ip').length;
  const flaggedCount = anomalies.filter(a => a.action === 'flag_ip').length;
  const totalEvents = events.length;
  const failedEvents = events.filter(e => e.outcome === 'failure').length;
  const failRatio = totalEvents > 0 ? failedEvents / totalEvents : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад к дашборду</span>
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Server className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{ip}</h1>
              <p className="text-gray-600">Детальная информация об IP адресе</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Всего аномалий</p>
                <p className="text-2xl font-bold text-gray-900">{anomalies.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Заблокировано</p>
                <p className="text-2xl font-bold text-red-600">{blockedCount}</p>
              </div>
              <div className="p-3 bg-red-200 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-700" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Помечено</p>
                <p className="text-2xl font-bold text-yellow-600">{flaggedCount}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">События</p>
                <p className="text-2xl font-bold text-blue-600">{totalEvents}</p>
                <p className="text-sm text-gray-500">
                  Неудач: {failedEvents} ({(failRatio * 100).toFixed(1)}%)
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Anomalies Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Аномалии для {ip}</h2>
            <FiltersBar
              onRefresh={loadData}
              onLimitChange={setAnomaliesLimit}
              loading={loading}
              currentLimit={anomaliesLimit}
            />
          </div>
          <AnomaliesTable
            anomalies={anomalies}
            loading={loading}
            onIPClick={(clickedIP) => navigate(`/ip/${clickedIP}`)}
          />
        </div>

        {/* Events Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">События для {ip}</h2>
            <FiltersBar
              onRefresh={loadData}
              onLimitChange={setEventsLimit}
              loading={loading}
              currentLimit={eventsLimit}
            />
          </div>
          <EventsTable
            events={events}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default IPDetails;
