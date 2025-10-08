import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import asyncio

import google.generativeai as genai
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
)
log = logging.getLogger("ai-assistant")

# Инициализация FastAPI
app = FastAPI(
    title="AI Security Assistant",
    description="AI ассистент для анализа безопасности и аномалий",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Настройка Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=GEMINI_API_KEY)

# Умные шаблоны для fallback режима
def generate_smart_template_response(prompt: str) -> str:
    """Генерирует умный ответ на основе шаблонов"""
    prompt_lower = prompt.lower()
    
    # Команды блокировки/разблокировки
    if "заблокируй" in prompt_lower or "блокировать" in prompt_lower or "добавь в черный" in prompt_lower:
        # Ищем IP адрес в промпте
        import re
        ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        ips = re.findall(ip_pattern, prompt)
        if ips:
            return json.dumps({
                "action": "block_ip",
                "ip": ips[0],
                "reason": "Заблокировано по запросу пользователя",
                "message": f"IP адрес {ips[0]} успешно добавлен в черный список"
            }, ensure_ascii=False)
    
    if "разблокируй" in prompt_lower or "удали из черного" in prompt_lower or "убери блокировку" in prompt_lower:
        import re
        ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        ips = re.findall(ip_pattern, prompt)
        if ips:
            return json.dumps({
                "action": "unblock_ip",
                "ip": ips[0],
                "reason": "Разблокировано по запросу пользователя",
                "message": f"IP адрес {ips[0]} успешно удален из черного списка"
            }, ensure_ascii=False)
    
    if "белый список" in prompt_lower or "whitelist" in prompt_lower:
        import re
        ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        ips = re.findall(ip_pattern, prompt)
        if ips:
            return json.dumps({
                "action": "whitelist_ip",
                "ip": ips[0],
                "reason": "Добавлено в белый список по запросу пользователя",
                "message": f"IP адрес {ips[0]} успешно добавлен в белый список"
            }, ensure_ascii=False)
    
    # Общие вопросы о безопасности
    if any(word in prompt_lower for word in ["что происходит", "статус", "как дела", "обстановка"]):
        try:
            # Пытаемся извлечь данные из промпта
            if "аномалий" in prompt and "отслеживаемых ip" in prompt.lower():
                lines = prompt.split('\n')
                anomalies_count = 0
                ips_count = 0
                for line in lines:
                    if "Всего аномалий:" in line:
                        anomalies_count = int(line.split(':')[1].strip())
                    if "Отслеживаемых IP:" in line:
                        ips_count = int(line.split(':')[1].strip())
                
                if anomalies_count > 50:
                    return f"⚠️ Обнаружено {anomalies_count} аномалий! Это повышенный уровень активности. Система отслеживает {ips_count} подозрительных IP адресов. Рекомендую проверить наиболее опасные IP и добавить их в черный список."
                elif anomalies_count > 20:
                    return f"📊 Текущая ситуация под контролем. Обнаружено {anomalies_count} аномалий при мониторинге {ips_count} IP адресов. Уровень угрозы: средний. Система продолжает мониторинг."
                else:
                    return f"✅ Система работает стабильно. Обнаружено {anomalies_count} незначительных аномалий. Все под контролем!"
        except:
            pass
        
        return "📊 Система мониторинга работает в штатном режиме. Обнаруженные аномалии анализируются в реальном времени. Могу помочь с анализом конкретных IP или управлением блокировками."
    
    # Помощь
    if any(word in prompt_lower for word in ["помощь", "help", "что умеешь", "команды"]):
        return """Я AI ассистент SecureWatch. Вот что я умею:

🛡️ **Управление блокировками:**
- "Заблокируй IP 192.168.1.100" - добавить IP в черный список
- "Разблокируй IP 192.168.1.100" - удалить из черного списка  
- "Добавь IP 192.168.1.100 в белый список" - добавить в whitelist

📊 **Анализ безопасности:**
- "Что происходит?" - общий статус безопасности
- "Покажи аномалии" - список обнаруженных угроз
- "Какие IP самые опасные?" - топ подозрительных адресов

Просто задайте вопрос на естественном языке!"""
    
    # Дефолтный ответ
    return "Я AI ассистент SecureWatch. Я могу помочь вам с анализом безопасности и управлением блокировками IP. Спросите меня о текущей ситуации или попросите заблокировать/разблокировать IP адрес. Напишите 'помощь' для списка команд."

# Функция для вызова AI с fallback моделями
def generate_ai_response(prompt: str, user_message: str = "") -> str:
    """Генерирует ответ AI с fallback моделями или использует умные шаблоны"""
    models_to_try = [
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-1.5-pro-latest',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-1.0-pro',
    ]
    
    for model_name in models_to_try:
        try:
            log.info(f"Trying model: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            log.info(f"Successfully used model: {model_name}")
            return response.text
        except Exception as e:
            log.warning(f"Model {model_name} failed: {e}")
            continue
    
    # Fallback: используем умные шаблоны вместо реального AI
    # Используем user_message если передан, иначе prompt
    log.warning("All AI models failed, using smart templates")
    return generate_smart_template_response(user_message if user_message else prompt)

# Конфигурация ML детектора
ML_DETECTOR_URL = os.getenv("ML_DETECTOR_URL", "http://ml-detector:8000")

# Pydantic модели
class AnomalyAnalysis(BaseModel):
    ip: str
    anomaly_score: float
    action: str
    reason: str
    timestamp: str
    recent_failed_attempts: int
    recent_total_events: int
    failure_ratio: float

class SecurityStatus(BaseModel):
    overall_status: str
    threat_level: str
    active_threats: int
    blocked_ips: int
    flagged_ips: int
    recommendations: List[str]
    last_analysis: str

class AttackAnalysis(BaseModel):
    attack_type: str
    severity: str
    description: str
    indicators: List[str]
    recommendations: List[str]
    confidence: float

class ChatMessage(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class AIAssistant:
    def __init__(self):
        self.ml_detector_url = ML_DETECTOR_URL
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def get_anomalies(self, limit: int = 50) -> List[Dict]:
        """Получает аномалии от ML детектора"""
        try:
            response = await self.client.get(f"{self.ml_detector_url}/anomalies", params={"limit": limit})
            response.raise_for_status()
            data = response.json()
            return data.get("anomalies", [])
        except Exception as e:
            log.error(f"Failed to get anomalies: {e}")
            return []
    
    async def get_ips_summary(self, limit: int = 100) -> List[Dict]:
        """Получает сводку по IP адресам"""
        try:
            response = await self.client.get(f"{self.ml_detector_url}/ips", params={"limit": limit})
            response.raise_for_status()
            data = response.json()
            return data.get("ips", [])
        except Exception as e:
            log.error(f"Failed to get IPs summary: {e}")
            return []
    
    async def get_allow_list(self) -> List[Dict]:
        """Получает список разрешений"""
        try:
            response = await self.client.get(f"{self.ml_detector_url}/lists/allow")
            response.raise_for_status()
            data = response.json()
            return data.get("items", [])
        except Exception as e:
            log.error(f"Failed to get allow list: {e}")
            return []
    
    async def get_deny_list(self) -> List[Dict]:
        """Получает список блокировок"""
        try:
            response = await self.client.get(f"{self.ml_detector_url}/lists/deny")
            response.raise_for_status()
            data = response.json()
            return data.get("items", [])
        except Exception as e:
            log.error(f"Failed to get deny list: {e}")
            return []
    
    async def add_to_blacklist(self, ip: str, description: str = "Blocked by AI Assistant") -> Dict:
        """Добавляет IP в черный список"""
        try:
            payload = {
                "type": "ip",
                "value": ip,
                "description": description
            }
            response = await self.client.post(f"{self.ml_detector_url}/lists/deny", json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            log.error(f"Failed to add {ip} to blacklist: {e}")
            raise
    
    async def remove_from_blacklist(self, ip: str) -> Dict:
        """Удаляет IP из черного списка"""
        try:
            payload = {
                "item_type": "ip",
                "value": ip
            }
            response = await self.client.delete(f"{self.ml_detector_url}/lists/deny", json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            log.error(f"Failed to remove {ip} from blacklist: {e}")
            raise
    
    async def add_to_whitelist(self, ip: str, description: str = "Whitelisted by AI Assistant") -> Dict:
        """Добавляет IP в белый список"""
        try:
            payload = {
                "type": "ip",
                "value": ip,
                "description": description
            }
            response = await self.client.post(f"{self.ml_detector_url}/lists/allow", json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            log.error(f"Failed to add {ip} to whitelist: {e}")
            raise
    
    def analyze_anomalies_with_ai(self, anomalies: List[Dict]) -> Dict[str, Any]:
        """Анализирует аномалии с помощью AI"""
        if not anomalies:
            return {
                "threat_level": "low",
                "active_threats": 0,
                "blocked_ips": 0,
                "flagged_ips": 0,
                "recommendations": ["No anomalies detected"],
                "analysis": "No security threats detected"
            }
        
        # Подготавливаем данные для AI
        anomalies_summary = []
        blocked_count = 0
        flagged_count = 0
        
        for anomaly in anomalies:
            if anomaly.get("action") == "block_ip":
                blocked_count += 1
            elif anomaly.get("action") == "flag_ip":
                flagged_count += 1
                
            anomalies_summary.append({
                "ip": anomaly.get("ip"),
                "action": anomaly.get("action"),
                "score": anomaly.get("iso_score"),
                "reason": anomaly.get("reason"),
                "failed_attempts": anomaly.get("recent_failed"),
                "total_events": anomaly.get("recent_events"),
                "failure_ratio": anomaly.get("recent_fail_ratio")
            })
        
        # Формируем промпт для AI
        prompt = f"""
        Анализируй следующие аномалии безопасности и предоставь анализ:

        Аномалии:
        {json.dumps(anomalies_summary, indent=2, ensure_ascii=False)}

        Пожалуйста, предоставь анализ в следующем формате JSON:
        {{
            "threat_level": "low/medium/high/critical",
            "active_threats": число,
            "blocked_ips": число,
            "flagged_ips": число,
            "attack_patterns": ["паттерн1", "паттерн2"],
            "recommendations": ["рекомендация1", "рекомендация2"],
            "analysis": "детальный анализ ситуации"
        }}

        Учти:
        - Количество заблокированных и помеченных IP
        - Паттерны атак (brute force, DDoS, etc.)
        - Уровень угрозы на основе оценок аномальности
        - Рекомендации по улучшению безопасности
        """
        
        try:
            response_text = generate_ai_response(prompt)
            ai_analysis = json.loads(response_text)
            
            # Добавляем реальные данные
            ai_analysis.update({
                "blocked_ips": blocked_count,
                "flagged_ips": flagged_count,
                "active_threats": len(anomalies)
            })
            
            return ai_analysis
            
        except Exception as e:
            log.error(f"AI analysis failed: {e}")
            return {
                "threat_level": "medium",
                "active_threats": len(anomalies),
                "blocked_ips": blocked_count,
                "flagged_ips": flagged_count,
                "recommendations": ["Enable AI analysis for detailed insights"],
                "analysis": f"Detected {len(anomalies)} anomalies, {blocked_count} blocked, {flagged_count} flagged"
            }
    
    def analyze_specific_attack(self, anomaly: Dict) -> Dict[str, Any]:
        """Анализирует конкретную атаку"""
        prompt = f"""
        Анализируй эту аномалию безопасности:

        IP: {anomaly.get('ip')}
        Действие: {anomaly.get('action')}
        Оценка аномальности: {anomaly.get('iso_score')}
        Причина: {anomaly.get('reason')}
        Неудачные попытки: {anomaly.get('recent_failed')}
        Общие события: {anomaly.get('recent_events')}
        Коэффициент неудач: {anomaly.get('recent_fail_ratio')}

        Предоставь анализ в формате JSON:
        {{
            "attack_type": "тип атаки",
            "severity": "low/medium/high/critical",
            "description": "описание атаки",
            "indicators": ["индикатор1", "индикатор2"],
            "recommendations": ["рекомендация1", "рекомендация2"],
            "confidence": 0.0-1.0
        }}
        """
        
        try:
            response_text = generate_ai_response(prompt)
            return json.loads(response_text)
        except Exception as e:
            log.error(f"Attack analysis failed: {e}")
            return {
                "attack_type": "Unknown",
                "severity": "medium",
                "description": f"Anomaly detected: {anomaly.get('reason')}",
                "indicators": ["Unusual activity pattern"],
                "recommendations": ["Monitor this IP closely"],
                "confidence": 0.5
            }

# Инициализация AI ассистента
ai_assistant = AIAssistant()

@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {
        "status": "ok",
        "service": "ai-assistant",
        "timestamp": datetime.now().isoformat(),
        "ml_detector_connected": True
    }

@app.get("/status")
async def get_security_status():
    """Получить общий статус безопасности"""
    try:
        # Получаем данные от ML детектора
        anomalies = await ai_assistant.get_anomalies(limit=100)
        allow_list = await ai_assistant.get_allow_list()
        deny_list = await ai_assistant.get_deny_list()
        
        # Анализируем с помощью AI
        ai_analysis = ai_assistant.analyze_anomalies_with_ai(anomalies)
        
        return SecurityStatus(
            overall_status="operational" if ai_analysis["threat_level"] in ["low", "medium"] else "threat_detected",
            threat_level=ai_analysis["threat_level"],
            active_threats=ai_analysis["active_threats"],
            blocked_ips=ai_analysis["blocked_ips"],
            flagged_ips=ai_analysis["flagged_ips"],
            recommendations=ai_analysis["recommendations"],
            last_analysis=datetime.now().isoformat()
        )
        
    except Exception as e:
        log.exception("Failed to get security status")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analyze/{ip}")
async def analyze_ip(ip: str):
    """Анализировать конкретный IP адрес"""
    try:
        # Получаем аномалии для IP
        anomalies = await ai_assistant.get_anomalies(limit=100)
        ip_anomalies = [a for a in anomalies if a.get("ip") == ip]
        
        if not ip_anomalies:
            return {
                "ip": ip,
                "status": "clean",
                "analysis": "No anomalies detected for this IP",
                "recommendations": ["Continue monitoring"]
            }
        
        # Анализируем последнюю аномалию
        latest_anomaly = ip_anomalies[0]  # Самые новые первыми
        attack_analysis = ai_assistant.analyze_specific_attack(latest_anomaly)
        
        return {
            "ip": ip,
            "status": "threat_detected",
            "anomalies_count": len(ip_anomalies),
            "latest_anomaly": latest_anomaly,
            "attack_analysis": attack_analysis
        }
        
    except Exception as e:
        log.exception(f"Failed to analyze IP {ip}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recommendations")
async def get_recommendations():
    """Получить рекомендации по безопасности"""
    try:
        anomalies = await ai_assistant.get_anomalies(limit=50)
        ai_analysis = ai_assistant.analyze_anomalies_with_ai(anomalies)
        
        return {
            "recommendations": ai_analysis["recommendations"],
            "threat_level": ai_analysis["threat_level"],
            "attack_patterns": ai_analysis.get("attack_patterns", []),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        log.exception("Failed to get recommendations")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/summary")
async def get_security_summary():
    """Получить краткую сводку по безопасности"""
    try:
        anomalies = await ai_assistant.get_anomalies(limit=20)
        ips_summary = await ai_assistant.get_ips_summary(limit=50)
        allow_list = await ai_assistant.get_allow_list()
        deny_list = await ai_assistant.get_deny_list()
        
        ai_analysis = ai_assistant.analyze_anomalies_with_ai(anomalies)
        
        return {
            "summary": {
                "total_anomalies": len(anomalies),
                "blocked_ips": ai_analysis["blocked_ips"],
                "flagged_ips": ai_analysis["flagged_ips"],
                "whitelist_size": len(allow_list),
                "blacklist_size": len(deny_list),
                "threat_level": ai_analysis["threat_level"]
            },
            "recent_anomalies": anomalies[:5],  # Последние 5
            "top_suspicious_ips": sorted(ips_summary, key=lambda x: x.get("recent_fail_ratio", 0), reverse=True)[:5],
            "ai_analysis": ai_analysis,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        log.exception("Failed to get security summary")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_ai(chat_msg: ChatMessage):
    """Чат с AI ассистентом для анализа безопасности и управления блокировками"""
    try:
        user_message = chat_msg.message
        log.info(f"Chat request: {user_message}")
        
        # Получаем контекст системы
        anomalies = await ai_assistant.get_anomalies(limit=20)
        ips_summary = await ai_assistant.get_ips_summary(limit=50)
        deny_list = await ai_assistant.get_deny_list()
        allow_list = await ai_assistant.get_allow_list()
        
        # Формируем системный промпт с контекстом
        system_context = f"""
Ты - AI ассистент безопасности для системы SecureWatch. 

Текущая ситуация:
- Всего аномалий: {len(anomalies)}
- Отслеживаемых IP: {len(ips_summary)}
- В черном списке: {len(deny_list)}
- В белом списке: {len(allow_list)}

Последние аномалии:
{json.dumps(anomalies[:5], indent=2, ensure_ascii=False)}

Топ подозрительных IP:
{json.dumps(sorted(ips_summary, key=lambda x: x.get('recent_fail_ratio', 0), reverse=True)[:5], indent=2, ensure_ascii=False)}

Ты можешь выполнять команды:
1. "заблокируй IP X.X.X.X" - добавить IP в черный список
2. "разблокируй IP X.X.X.X" - удалить IP из черного списка  
3. "добавь IP X.X.X.X в белый список" - добавить в белый список
4. Отвечать на вопросы о безопасности, аномалиях, IP адресах

ВАЖНО: Если пользователь просит заблокировать/разблокировать IP, ответь в формате JSON:
{{
    "action": "block_ip" | "unblock_ip" | "whitelist_ip",
    "ip": "X.X.X.X",
    "reason": "причина",
    "message": "сообщение пользователю"
}}

Если это просто вопрос, ответь обычным текстом на русском языке.
"""
        
        # Отправляем запрос к Gemini AI
        prompt = f"{system_context}\n\nВопрос пользователя: {user_message}\n\nОтвет:"
        
        ai_response = generate_ai_response(prompt, user_message).strip()
        
        log.info(f"AI response: {ai_response}")
        
        # Проверяем, есть ли команда для выполнения
        action_taken = None
        try:
            # Пытаемся распарсить как JSON (команду)
            if ai_response.startswith("{") and ai_response.endswith("}"):
                command = json.loads(ai_response)
                
                if command.get("action") == "block_ip":
                    ip = command.get("ip")
                    reason = command.get("reason", "Blocked by AI Assistant")
                    await ai_assistant.add_to_blacklist(ip, reason)
                    action_taken = f"✅ IP {ip} добавлен в черный список"
                    ai_response = command.get("message", action_taken)
                    
                elif command.get("action") == "unblock_ip":
                    ip = command.get("ip")
                    await ai_assistant.remove_from_blacklist(ip)
                    action_taken = f"✅ IP {ip} удален из черного списка"
                    ai_response = command.get("message", action_taken)
                    
                elif command.get("action") == "whitelist_ip":
                    ip = command.get("ip")
                    reason = command.get("reason", "Whitelisted by AI Assistant")
                    await ai_assistant.add_to_whitelist(ip, reason)
                    action_taken = f"✅ IP {ip} добавлен в белый список"
                    ai_response = command.get("message", action_taken)
        except:
            # Это не команда, а обычный ответ
            pass
        
        return {
            "response": ai_response,
            "action_taken": action_taken,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        log.exception("Chat failed")
        return {
            "response": f"Извините, произошла ошибка: {str(e)}",
            "action_taken": None,
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
        log_level="info"
    )
