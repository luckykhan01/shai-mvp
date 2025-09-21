import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Anomaly, IPStats } from '../types/api';
import StatsCards from '../components/StatsCards';
import AnomaliesTable from '../components/AnomaliesTable';
import IPsTable from '../components/IPsTable';
import FiltersBar from '../components/FiltersBar';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [ips, setIPs] = useState<IPStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [anomaliesLimit, setAnomaliesLimit] = useState(20);
  const [ipsLimit, setIPsLimit] = useState(20);

  // Calculate stats
  const totalAnomalies = anomalies.length;
  const blockedIPs = anomalies.filter(a => a.action === 'block_ip').length;
  const flaggedIPs = anomalies.filter(a => a.action === 'flag_ip').length;
  const totalEvents = ips.reduce((sum, ip) => sum + ip.recent_events, 0);
  const failedEvents = ips.reduce((sum, ip) => sum + ip.recent_failed, 0);
  const uniqueIPs = ips.length;
  const avgFailRatio = ips.length > 0 ? ips.reduce((sum, ip) => sum + ip.recent_fail_ratio, 0) / ips.length : 0;

  const loadData = async () => {
    setLoading(true);
    try {
      const [anomaliesData, ipsData] = await Promise.all([
        apiClient.getAnomalies(anomaliesLimit),
        apiClient.getIPs(ipsLimit)
      ]);
      
      setAnomalies(anomaliesData.anomalies);
      setIPs(ipsData.ips);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [anomaliesLimit, ipsLimit]);

  const handleIPClick = (ip: string) => {
    navigate(`/ip/${ip}`);
  };

  const handleExport = async () => {
    try {
      const blob = await apiClient.exportAnomalies();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      apiClient.downloadFile(blob, `anomalies_${timestamp}.ndjson`);
    } catch (error) {
      console.error('Error exporting anomalies:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Дашборд аномалий</h1>
          <p className="mt-2 text-gray-600">
            Мониторинг безопасности и обнаружение аномалий в реальном времени
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards
          totalAnomalies={totalAnomalies}
          blockedIPs={blockedIPs}
          flaggedIPs={flaggedIPs}
          totalEvents={totalEvents}
          failedEvents={failedEvents}
          uniqueIPs={uniqueIPs}
          avgFailRatio={avgFailRatio}
          loading={loading}
        />

        {/* Anomalies Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Последние аномалии</h2>
            <FiltersBar
              onRefresh={loadData}
              onExport={handleExport}
              onLimitChange={setAnomaliesLimit}
              loading={loading}
              currentLimit={anomaliesLimit}
              showExport={true}
            />
          </div>
          <AnomaliesTable
            anomalies={anomalies}
            loading={loading}
            onIPClick={handleIPClick}
          />
        </div>

        {/* IPs Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">IP адреса</h2>
            <FiltersBar
              onRefresh={loadData}
              onLimitChange={setIPsLimit}
              loading={loading}
              currentLimit={ipsLimit}
              searchPlaceholder="Поиск по IP адресу..."
            />
          </div>
          <IPsTable
            ips={ips}
            loading={loading}
            onIPClick={handleIPClick}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
