import os
from typing import Optional

class Config:
    """Конфигурация AI ассистента"""
    
    # Gemini AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # ML Detector
    ML_DETECTOR_URL: str = os.getenv("ML_DETECTOR_URL", "http://ml-detector:8000")
    
    # AI Assistant
    AI_ASSISTANT_PORT: int = int(os.getenv("AI_ASSISTANT_PORT", "8002"))
    AI_ASSISTANT_HOST: str = os.getenv("AI_ASSISTANT_HOST", "0.0.0.0")
    
    # Timeouts
    HTTP_TIMEOUT: int = int(os.getenv("HTTP_TIMEOUT", "30"))
    
    @classmethod
    def validate(cls) -> bool:
        """Проверяет корректность конфигурации"""
        if not cls.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is required")
        return True
