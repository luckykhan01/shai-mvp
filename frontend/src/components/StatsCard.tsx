import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './Card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'primary' | 'danger' | 'warning' | 'success';
}

export function StatsCard({ title, value, icon: Icon, trend, color = 'primary' }: StatsCardProps) {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    danger: 'bg-danger-100 text-danger-600',
    warning: 'bg-warning-100 text-warning-600',
    success: 'bg-success-100 text-success-600',
  };

  return (
    <Card>
      <CardContent className="flex items-center">
        <div className={cn('p-3 rounded-lg', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-xs text-gray-500 mt-1">
              <span
                className={cn(
                  'font-medium',
                  trend.value > 0 ? 'text-danger-600' : 'text-success-600'
                )}
              >
                {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>{' '}
              {trend.label}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


