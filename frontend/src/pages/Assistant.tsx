import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bot, Send, Loader, Sparkles, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { aiAssistantApi } from '@/lib/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  action?: string | null;
  timestamp: string;
}

export function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Привет! Я AI ассистент SecureWatch. Я могу помочь вам анализировать угрозы безопасности и управлять блокировками IP. Спросите меня о текущей ситуации или попросите заблокировать/разблокировать IP адрес.',
      sender: 'ai',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: summary } = useQuery({
    queryKey: ['ai-summary'],
    queryFn: () => aiAssistantApi.getSummary(),
    refetchInterval: 30000,
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) => aiAssistantApi.chat(message),
    onSuccess: (data) => {
      const aiMessage: Message = {
        id: Date.now().toString(),
        text: data.response,
        sender: 'ai',
        action: data.action_taken,
        timestamp: data.timestamp,
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
    onError: () => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Извините, произошла ошибка при обработке вашего запроса.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Ассистент</h1>
          <p className="mt-2 text-sm text-gray-600">
            Интеллектуальный помощник для анализа безопасности
          </p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-success-50 text-success-700">
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Онлайн</span>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="p-2 rounded-lg bg-primary-100 text-primary-600">
                <Shield className="w-5 h-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-600">Аномалии</p>
                <p className="text-lg font-bold">{summary.summary.total_anomalies}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="p-2 rounded-lg bg-danger-100 text-danger-600">
                <Shield className="w-5 h-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-600">Заблокировано</p>
                <p className="text-lg font-bold">{summary.summary.blocked_ips}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="p-2 rounded-lg bg-warning-100 text-warning-600">
                <Shield className="w-5 h-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-600">Помечено</p>
                <p className="text-lg font-bold">{summary.summary.flagged_ips}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-4">
              <div className={`p-2 rounded-lg ${
                summary.summary.threat_level === 'high' || summary.summary.threat_level === 'critical'
                  ? 'bg-danger-100 text-danger-600'
                  : summary.summary.threat_level === 'medium'
                  ? 'bg-warning-100 text-warning-600'
                  : 'bg-success-100 text-success-600'
              }`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-600">Уровень угрозы</p>
                <p className="text-lg font-bold capitalize">{summary.summary.threat_level}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat Interface */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>
            <div className="flex items-center">
              <Bot className="w-5 h-5 mr-2 text-primary-600" />
              Чат с AI
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-4 ${
                    message.sender === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.sender === 'ai' && (
                    <div className="flex items-center mb-2">
                      <Bot className="w-4 h-4 mr-2" />
                      <span className="text-xs font-medium">AI Ассистент</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  {message.action && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <p className="text-xs font-medium text-success-600">{message.action}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="max-w-[70%] rounded-lg p-4 bg-gray-100">
                  <div className="flex items-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-600">AI думает...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Спросите об аномалиях или попросите заблокировать IP..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={chatMutation.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending}
                isLoading={chatMutation.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Примеры: "Что происходит?", "Заблокируй IP 192.168.1.100", "Разблокируй IP 10.0.0.50"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
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
            <CardTitle>Управление блокировками</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Блокируйте и разблокируйте IP адреса через естественный язык - просто попросите AI ассистента
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Рекомендации</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Получайте персонализированные рекомендации по улучшению безопасности на основе анализа
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


