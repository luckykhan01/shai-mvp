import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { apiClient } from './api/client';
import { Anomaly, IPStats } from './types/api';
import { 
  Home, 
  Shield, 
  Activity,
  Menu,
  X,
  AlertTriangle,
  RefreshCw,
  Server,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// Компонент таблицы аномалий
const AnomaliesTable: React.FC<{ anomalies: Anomaly[]; loading: boolean }> = ({ anomalies, loading }) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionColor = (action: string) => {
    return action === 'block_ip' ? 'text-red-600 bg-red-100' : 'text-yellow-600 bg-yellow-100';
  };

  const getActionText = (action: string) => {
    return action === 'block_ip' ? 'Блокировка' : 'Флаг';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
          <RefreshCw style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
        </div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Загрузка аномалий...</p>
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
        <AlertTriangle style={{ width: '3rem', height: '3rem', margin: '0 auto 1rem', color: '#d1d5db' }} />
        <p>Нет аномалий для отображения</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#f9fafb' }}>
          <tr>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Время</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Действие</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IP Адрес</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Оценка</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Статистика</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Причина</th>
          </tr>
        </thead>
        <tbody>
          {anomalies.map((anomaly, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                {formatTimestamp(anomaly.ts)}
              </td>
              <td style={{ padding: '1rem 0.75rem' }}>
                <span style={{ 
                  display: 'inline-flex', 
                  padding: '0.25rem 0.5rem', 
                  fontSize: '0.75rem', 
                  fontWeight: '600', 
                  borderRadius: '9999px', 
                  border: '1px solid',
                  backgroundColor: anomaly.action === 'block_ip' ? '#fee2e2' : '#fef3c7',
                  color: anomaly.action === 'block_ip' ? '#dc2626' : '#d97706',
                  borderColor: anomaly.action === 'block_ip' ? '#fecaca' : '#fde68a'
                }}>
                  {getActionText(anomaly.action)}
                </span>
              </td>
              <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{anomaly.ip}</span>
              </td>
              <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                <span style={{ fontWeight: '600' }}>{anomaly.iso_score.toFixed(3)}</span>
              </td>
              <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
      <div>
                  <div>События: {anomaly.recent_events}</div>
                  <div>Неудачи: {anomaly.recent_failed}</div>
                  <div>Соотношение: {(anomaly.recent_fail_ratio * 100).toFixed(1)}%</div>
                </div>
              </td>
              <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827', maxWidth: '200px' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={anomaly.reason}>
                  {anomaly.reason}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Компонент таблицы IP адресов
const IPsTable: React.FC<{ ips: IPStats[]; loading: boolean }> = ({ ips, loading }) => {
  const getRiskLevel = (failRatio: number) => {
    if (failRatio > 0.8) return { level: 'Высокий', color: 'text-red-600 bg-red-100' };
    if (failRatio > 0.5) return { level: 'Средний', color: 'text-orange-600 bg-orange-100' };
    if (failRatio > 0.2) return { level: 'Низкий', color: 'text-yellow-600 bg-yellow-100' };
    return { level: 'Минимальный', color: 'text-green-600 bg-green-100' };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
          <RefreshCw style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
        </div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Загрузка IP адресов...</p>
      </div>
    );
  }

  if (ips.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
        <p>Нет IP адресов для отображения</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#f9fafb' }}>
          <tr>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IP Адрес</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Всего событий</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Неудачных</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Соотношение неудач</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Уровень риска</th>
          </tr>
        </thead>
        <tbody>
          {ips.map((ip, index) => {
            const riskLevel = getRiskLevel(ip.recent_fail_ratio);
            return (
              <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                  <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{ip.ip}</span>
                </td>
                <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                  <span style={{ fontWeight: '600' }}>{ip.recent_events}</span> событий
                </td>
                <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                  <span style={{ fontWeight: '600', color: '#dc2626' }}>{ip.recent_failed}</span> неудач
                </td>
                <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: '600' }}>{(ip.recent_fail_ratio * 100).toFixed(1)}%</span>
                    <div style={{ width: '4rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '0.5rem' }}>
                      <div 
                        style={{ 
                          backgroundColor: '#2563eb', 
                          height: '0.5rem', 
                          borderRadius: '9999px',
                          width: `${ip.recent_fail_ratio * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    padding: '0.25rem 0.5rem', 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    borderRadius: '9999px',
                    ...riskLevel.color
                  }}>
                    {riskLevel.level}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Страница дашборда с реальными данными
const Dashboard: React.FC = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [ips, setIPs] = useState<IPStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading data...');
      const [anomaliesData, ipsData] = await Promise.all([
        apiClient.getAnomalies(20),
        apiClient.getIPs(20)
      ]);
      
      console.log('Data loaded:', { anomalies: anomaliesData.anomalies.length, ips: ipsData.ips.length });
      setAnomalies(anomaliesData.anomalies);
      setIPs(ipsData.ips);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ошибка загрузки данных. Проверьте, что бэкенд запущен на порту 8001.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate stats
  const totalAnomalies = anomalies.length;
  const blockedIPs = anomalies.filter(a => a.action === 'block_ip').length;
  const flaggedIPs = anomalies.filter(a => a.action === 'flag_ip').length;
  const uniqueIPs = ips.length;
  const totalEvents = ips.reduce((sum, ip) => sum + ip.recent_events, 0);
  const failedEvents = ips.reduce((sum, ip) => sum + ip.recent_failed, 0);
  const avgFailRatio = ips.length > 0 ? ips.reduce((sum, ip) => sum + ip.recent_fail_ratio, 0) / ips.length : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>Дашборд аномалий</h1>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            <RefreshCw style={{ width: '1rem', height: '1rem' }} />
            Обновить
          </button>
        </div>

        {error && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '0.375rem', 
            color: '#dc2626',
            marginBottom: '2rem'
          }}>
            {error}
          </div>
        )}
        
        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Всего аномалий</h3>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{totalAnomalies}</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>За последние 24 часа</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Заблокировано IP</h3>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{blockedIPs}</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>Активные блокировки</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Помечено IP</h3>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#d97706', margin: 0 }}>{flaggedIPs}</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>Требуют внимания</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Система</h3>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>{uniqueIPs}</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>Уникальных IP</p>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
              <div>События: {totalEvents}</div>
              <div>Неудачи: {failedEvents}</div>
              <div>Соотношение: {(avgFailRatio * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Anomalies Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '2rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: 0 }}>Последние аномалии</h2>
          </div>
          <AnomaliesTable anomalies={anomalies} loading={loading} />
        </div>

        {/* IPs Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: 0 }}>IP адреса</h2>
          </div>
          <IPsTable ips={ips} loading={loading} />
        </div>
      </div>
    </div>
  );
};

// Простая страница управления списками
const ListsManagement: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '2rem' }}>Управление списками</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          {/* Allow List */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f0fdf4' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#166534', margin: 0 }}>Список разрешений</h2>
              <p style={{ fontSize: '0.875rem', color: '#16a34a', margin: '0.5rem 0 0 0' }}>Доверенные IP адреса и пользователи</p>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: '#6b7280' }}>Список пуст</p>
            </div>
          </div>

          {/* Deny List */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fef2f2' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#991b1b', margin: 0 }}>Список блокировок</h2>
              <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: '0.5rem 0 0 0' }}>Заблокированные IP адреса и пользователи</p>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: '#6b7280' }}>Список пуст</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Navigation: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Дашборд', href: '/', icon: Home },
    { name: 'Управление списками', href: '/lists', icon: Shield },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav style={{ backgroundColor: 'white', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', height: '4rem' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#dbeafe', borderRadius: '0.5rem' }}>
                  <Activity style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>AnomalyDetector</span>
              </div>
            </div>
            <div style={{ display: 'flex', marginLeft: '1.5rem', gap: '2rem' }}>
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.25rem 0',
                      borderBottom: '2px solid',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      textDecoration: 'none',
                      color: isActive(item.href) ? '#111827' : '#6b7280',
                      borderBottomColor: isActive(item.href) ? '#3b82f6' : 'transparent'
                    }}
                  >
                    <Icon style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                color: '#9ca3af',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              {mobileMenuOpen ? (
                <X style={{ width: '1.5rem', height: '1.5rem' }} />
              ) : (
                <Menu style={{ width: '1.5rem', height: '1.5rem' }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div>
          <div style={{ paddingTop: '0.5rem', paddingBottom: '0.75rem' }}>
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'block',
                    paddingLeft: '0.75rem',
                    paddingRight: '1rem',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem',
                    borderLeft: '4px solid',
                    fontSize: '1rem',
                    fontWeight: '500',
                    textDecoration: 'none',
                    color: isActive(item.href) ? '#1d4ed8' : '#6b7280',
                    backgroundColor: isActive(item.href) ? '#eff6ff' : 'transparent',
                    borderLeftColor: isActive(item.href) ? '#3b82f6' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Icon style={{ width: '1rem', height: '1rem', marginRight: '0.75rem' }} />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lists" element={<ListsManagement />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;