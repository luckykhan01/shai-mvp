import { Bot, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';

export function Assistant() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Ассистент</h1>
        <p className="mt-2 text-sm text-gray-600">
          Умный помощник для анализа безопасности
        </p>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 mb-6">
              <Bot className="w-10 h-10 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Скоро появится
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              AI ассистент поможет вам анализировать угрозы безопасности,
              предоставлять рекомендации и объяснять обнаруженные аномалии.
            </p>
            <div className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-50 text-primary-700">
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">В разработке</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Анализ угроз</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Автоматический анализ аномалий с помощью Gemini AI для определения типов атак и их серьезности
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Рекомендации</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Персонализированные рекомендации по улучшению безопасности на основе обнаруженных паттернов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Объяснения</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Понятные объяснения обнаруженных аномалий и их потенциального влияния на систему
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


