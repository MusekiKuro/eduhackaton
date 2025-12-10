"""
AI Tutor Platform - Backend
FastAPI сервер для обработки учебных материалов, чата с AI и тестов
"""

import os
import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import PyPDF2
from openai import OpenAI
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Инициализация FastAPI
app = FastAPI(
    title="AI Tutor Platform",
    description="MVP для хакатона - AI помощник для обучения",
    version="1.0.0"
)

# CORS middleware для React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализация OpenAI клиента
openai_client = OpenAI(api_key=os.getenv("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"))

# In-Memory Database
DEMO_DB = {
    "materials": {},
    "tests": {},
    "chat_history": [],
    "test_results": []
}

# Pydantic модели для валидации
class ChatRequest(BaseModel):
    material_id: str
    question: str

class TestGenerationRequest(BaseModel):
    material_id: str
    num_questions: int = 5
    difficulty: str = "medium"  # easy, medium, hard

class AnswerSubmission(BaseModel):
    question_id: int
    selected_answer: int
    time_spent: Optional[int] = 0

# Вспомогательные функции
def extract_text_from_pdf(file_content: bytes) -> str:
    """Извлечение текста из PDF файла"""
    try:
        import io
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка при чтении PDF: {str(e)}")

def generate_ai_response(prompt: str, context: str = "") -> str:
    """Генерация ответа с помощью OpenAI GPT"""
    try:
        full_prompt = f"{context}\n\n{prompt}" if context else prompt
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Ты - помощник для обучения. Отвечай кратко и понятно."},
                {"role": "user", "content": full_prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка AI: {str(e)}")

# API Endpoints

@app.get("/health")
async def health_check():
    """Проверка работы сервера"""
    return {"status": "ok", "message": "AI Tutor сервер работает!", "timestamp": datetime.now()}

@app.get("/")
async def root():
    """Информация о API"""
    return {
        "name": "AI Tutor Platform",
        "version": "1.0.0",
        "description": "AI помощник для обучения",
        "endpoints": {
            "health": "GET /health",
            "upload": "POST /materials/upload",
            "materials": "GET /materials/list/{course_id}",
            "chat": "POST /chat/ask",
            "generate_test": "POST /tests/generate",
            "submit_answer": "POST /tests/submit-answer",
            "analytics": "GET /analytics/dashboard/{course_id}"
        }
    }

@app.post("/materials/upload")
async def upload_material(file: UploadFile = File(...)):
    """Загрузка учебного материала (PDF или TXT)"""
    try:
        # Проверка формата файла
        if file.content_type not in ["application/pdf", "text/plain"]:
            raise HTTPException(status_code=400, detail="Поддерживаются только PDF и TXT файлы")
        
        # Чтение файла
        content = await file.read()
        
        # Извлечение текста
        if file.content_type == "application/pdf":
            text_content = extract_text_from_pdf(content)
        else:
            text_content = content.decode("utf-8")
        
        # Проверка длины текста
        if len(text_content) < 10:
            raise HTTPException(status_code=400, detail="Файл слишком маленький или пустой")
        
        # Создание материала
        material_id = str(uuid.uuid4())
        material = {
            "id": material_id,
            "course_id": "demo-course",
            "title": file.filename,
            "content": text_content,
            "content_length": len(text_content),
            "created_at": datetime.now().isoformat()
        }
        
        # Сохранение в БД
        DEMO_DB["materials"][material_id] = material
        
        return {
            "material_id": material_id,
            "title": file.filename,
            "text_length": len(text_content),
            "message": "Материал успешно загружен"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки: {str(e)}")

@app.get("/materials/list/{course_id}")
async def list_materials(course_id: str):
    """Получение списка материалов для курса"""
    materials = [
        {
            "id": mat["id"],
            "title": mat["title"],
            "content_length": mat["content_length"],
            "created_at": mat["created_at"]
        }
        for mat in DEMO_DB["materials"].values()
        if mat["course_id"] == course_id
    ]
    
    return {
        "materials": materials,
        "count": len(materials),
        "course_id": course_id
    }

@app.post("/chat/ask")
async def ask_ai(request: ChatRequest):
    """Вопрос к AI по материалу"""
    try:
        # Поиск материала
        material = DEMO_DB["materials"].get(request.material_id)
        if not material:
            raise HTTPException(status_code=404, detail="Материал не найден")
        
        # Формирование контекста
        context = f"На основе следующего материала: {material['content'][:2000]}..."
        
        # Генерация ответа
        answer = generate_ai_response(request.question, context)
        
        # Сохранение в историю чата
        chat_entry = {
            "material_id": request.material_id,
            "question": request.question,
            "answer": answer,
            "created_at": datetime.now().isoformat()
        }
        DEMO_DB["chat_history"].append(chat_entry)
        
        return {
            "question": request.question,
            "answer": answer,
            "sources": [material["title"]],
            "timestamp": chat_entry["created_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка чата: {str(e)}")

@app.post("/tests/generate")
async def generate_test(request: TestGenerationRequest):
    """Генерация теста по материалу"""
    try:
        # Поиск материала
        material = DEMO_DB["materials"].get(request.material_id)
        if not material:
            raise HTTPException(status_code=404, detail="Материал не найден")
        
        # Формирование промта для генерации вопросов
        prompt = f"""
        Создай {request.num_questions} вопросов с вариантами ответов по следующему материалу:
        {material['content'][:1500]}...
        
        Формат ответа (строго JSON):
        [
            {{
                "question": "Текст вопроса",
                "options": ["Вариант А", "Вариант Б", "Вариант В", "Вариант Г"],
                "correct": 0,
                "explanation": "Объяснение правильного ответа"
            }}
        ]
        Сложность: {request.difficulty}
        """
        
        # Генерация вопросов
        response_text = generate_ai_response(prompt)
        
        # Парсинг JSON ответа
        try:
            questions_data = json.loads(response_text)
        except json.JSONDecodeError:
            # Если AI вернул не валидный JSON, создаем тестовые вопросы
            questions_data = [
                {
                    "question": "Какой основной темой является данный материал?",
                    "options": ["Технология", "Наука", "Искусство", "Спорт"],
                    "correct": 0,
                    "explanation": "Материал посвящен технологиям и инновациям"
                },
                {
                    "question": "Какие ключевые понятия рассматриваются?",
                    "options": ["Основы", "Продвинутые темы", "История", "Будущее"],
                    "correct": 1,
                    "explanation": "Рассматриваются продвинутые темы в области"
                }
            ][:request.num_questions]
        
        # Создание теста
        test_id = str(uuid.uuid4())
        test = {
            "id": test_id,
            "material_id": request.material_id,
            "material_title": material["title"],
            "questions": questions_data,
            "difficulty": request.difficulty,
            "created_at": datetime.now().isoformat()
        }
        
        # Сохранение в БД
        DEMO_DB["tests"][test_id] = test
        
        return {
            "test_id": test_id,
            "questions": questions_data,
            "difficulty": request.difficulty,
            "material_title": material["title"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации теста: {str(e)}")

@app.post("/tests/submit-answer")
async def submit_answer(request: AnswerSubmission):
    """Проверка ответа на вопрос теста"""
    try:
        # Здесь должна быть логика проверки ответа
        # Для MVP возвращаем тестовый результат
        is_correct = request.selected_answer == 0  # Упрощенная логика
        
        # Сохранение результата
        result_entry = {
            "question_id": request.question_id,
            "selected_answer": request.selected_answer,
            "is_correct": is_correct,
            "time_spent": request.time_spent,
            "timestamp": datetime.now().isoformat()
        }
        
        return {
            "is_correct": is_correct,
            "feedback": "Правильно!" if is_correct else "Неправильно, попробуйте еще раз",
            "explanation": "Это был правильный ответ, потому что...",
            "result": result_entry
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка проверки ответа: {str(e)}")

@app.get("/analytics/dashboard/{course_id}")
async def get_analytics(course_id: str):
    """Получение аналитики по курсу"""
    try:
        materials = [
            mat for mat in DEMO_DB["materials"].values()
            if mat["course_id"] == course_id
        ]
        
        total_materials = len(materials)
        total_content_length = sum(mat["content_length"] for mat in materials)
        
        return {
            "course_id": course_id,
            "total_materials": total_materials,
            "total_content_length": total_content_length,
            "materials": [
                {
                    "id": mat["id"],
                    "title": mat["title"],
                    "content_length": mat["content_length"],
                    "created_at": mat["created_at"]
                }
                for mat in materials
            ],
            "chat_history_count": len(DEMO_DB["chat_history"]),
            "tests_count": len(DEMO_DB["tests"]),
            "last_update": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка аналитики: {str(e)}")

# Точка входа
if __name__ == "__main__":
    import uvicorn
    
    # Проверка наличия API ключа
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  ВНИМАНИЕ: OPENAI_API_KEY не найден в .env файле!")
        print("   Получите ключ на https://platform.openai.com/api-keys")
        print("   Создайте файл .env с содержимым: OPENAI_API_KEY=sk-your-key")
        print()
    
    print("🚀 Запуск AI Tutor Platform...")
    print("📡 Сервер будет доступен на http://localhost:8000")
    print("📚 Документация API: http://localhost:8000/docs")
    print()
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )