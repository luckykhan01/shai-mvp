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
model = genai.GenerativeModel('gemini-pro')

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
            response = model.generate_content(prompt)
            ai_analysis = json.loads(response.text)
            
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
            response = model.generate_content(prompt)
            return json.loads(response.text)
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
        log_level="info"
    )
