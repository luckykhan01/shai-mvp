import React from 'react';
import { Search, Filter, RefreshCw, Download } from 'lucide-react';

interface FiltersBarProps {
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onLimitChange?: (limit: number) => void;
  loading?: boolean;
  searchPlaceholder?: string;
  currentLimit?: number;
  showExport?: boolean;
}

const FiltersBar: React.FC<FiltersBarProps> = ({
  onSearch,
  onRefresh,
  onExport,
  onLimitChange,
  loading = false,
  searchPlaceholder = "Поиск...",
  currentLimit = 20,
  showExport = false
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const limit = parseInt(e.target.value);
    onLimitChange?.(limit);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          {/* Limit selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Показать:</label>
            <select
              value={currentLimit}
              onChange={handleLimitChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Обновить</span>
          </button>

          {/* Export button */}
          {showExport && (
            <button
              onClick={onExport}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Экспорт</span>
            </button>
          )}
        </div>
      </div>

      {/* Active filters display */}
      {searchQuery && (
        <div className="mt-4 flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">Активные фильтры:</span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Поиск: "{searchQuery}"
            <button
              onClick={() => {
                setSearchQuery('');
                onSearch?.('');
              }}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </span>
        </div>
      )}
    </div>
  );
};

export default FiltersBar;
