import os
import json
import uuid
import requests
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Импортируем настройки БД из database.py
from database import SessionLocal, init_db, GameSession, Message

app = FastAPI()

# Автоматически создаем таблицы в PostgreSQL при запуске сервера
init_db()

# Настройка CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Переменные окружения (поддержат и локальный запуск, и Docker Compose)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
MODEL_NAME = "qwen2.5:3b"


# Dependency для получения сессии БД в эндпоинты
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Модель входящего запроса от фронтенда
class GameState(BaseModel):
    session_id: str | None = None  # Если None — создаем новую сессию
    player_message: str
    stage: str


@app.post("/game/chat")
async def chat_step(state: GameState, db: Session = Depends(get_db)):
    # 1. Проверяем наличие или создаем новую игровую сессию в Postgres
    if not state.session_id:
        session_id = str(uuid.uuid4())
        db_session = GameSession(id=session_id, stress=20, agreement=30, status="in_progress")
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
    else:
        session_id = state.session_id
        db_session = db.query(GameSession).filter(GameSession.id == session_id).first()
        if not db_session:
            raise HTTPException(status_code=404, detail="Игровая сессия не найдена")

    # Если игра уже завершена (победа или поражение), блокируем новые ходы
    if db_session.status != "in_progress":
        return {
            "session_id": session_id,
            "game_status": db_session.status,
            "client_replica": "Переговоры завершены. Начните новую игру.",
            "new_stress": db_session.stress,
            "new_agreement": db_session.agreement
        }

    # 2. Загружаем профиль клиента из сценария json
    scenario_path = "scenario.json"
    if os.path.exists(scenario_path):
        with open(scenario_path, "r", encoding="utf-8") as f:
            scenario_data = json.load(f)
        client_profile = scenario_data.get("client_profile", "Занятой IT-директор.")
    else:
        client_profile = "Жесткий директор IT. Ценит время, факты и цифры."

    # 3. Формируем системный промпт для Ollama с текущими шкалами из БД
    system_prompt = (
        f"Ты играешь роль клиента: {client_profile}. Текущий этап переговоров: {state.stage}. "
        f"Твой текущий уровень стресса: {db_session.stress}, согласие на сделку: {db_session.agreement}. "
        "Проанализируй реплику игрока. Ответь строго в роли. Оцени сообщение игрока и измени шкалы. "
        "Ты ОБЯЗАН ответить СТРОГО в формате JSON без лишнего текста до и после: "
        '{"client_replica": "текст ответа", "stress_change": int, "agreement_change": int, "feedback": "почему изменились шкалы"}'
    )

    payload = {
        "model": MODEL_NAME,
        "prompt": f"{system_prompt}\n\nРеплика игрока: {state.player_message}\nОтвет в JSON:",
        "stream": False,
        "format": "json"
    }

    # 4. Запрос к нейросети
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=30)
        response_data = response.json()
        ai_json = json.loads(response_data.get("response", "{}"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации Ollama: {str(e)}")

    # 5. Математический пересчет шкал с лимитами [0, 100]
    new_stress = max(0, min(100, db_session.stress + ai_json.get("stress_change", 0)))
    new_agreement = max(0, min(100, db_session.agreement + ai_json.get("agreement_change", 0)))

    # Проверка условий окончания игры
    game_status = "in_progress"
    client_replica = ai_json.get("client_replica", "Продолжайте.")

    if new_stress >= 100:
        game_status = "lose"
        client_replica = "Разговор окончен. Мне жаль потраченного времени. До свидания! *Бросил трубку*"
    elif new_agreement >= 100:
        game_status = "win"
        client_replica = "Что ж, ваши аргументы убедительны, а условия прозрачны. Давайте подписывать контракт!"

    # 6. Расчет метрик для радар-диаграммы навыков
    radar_metrics = {
        "argumentation": max(10, min(100, 50 + (new_agreement - new_stress) // 2)),
        "politeness": max(10, min(100, 100 - new_stress)),
        "clarity": 80 if ai_json.get("stress_change", 0) <= 0 else 40,
        "empathy": max(10, min(100, new_agreement)),
        "flexibility": max(10, min(100, 50 + ai_json.get("agreement_change", 0) * 2))
    }

    # 7. Запись данных текущего шага в PostgreSQL
    db_session.stress = new_stress
    db_session.agreement = new_agreement
    db_session.status = game_status
    db_session.current_stage = state.stage

    player_msg = Message(session_id=session_id, sender="player", text=state.player_message)
    client_msg = Message(
        session_id=session_id, sender="client", text=client_replica,
        stress_change=ai_json.get("stress_change", 0), agreement_change=ai_json.get("agreement_change", 0),
        feedback=ai_json.get("feedback", ""),
        argumentation=radar_metrics["argumentation"], politeness=radar_metrics["politeness"],
        clarity=radar_metrics["clarity"], empathy=radar_metrics["empathy"], flexibility=radar_metrics["flexibility"]
    )

    db.add(player_msg)
    db.add(client_msg)
    db.commit()

    # 8. Отдаем расширенный ответ фронтенду
    return {
        "session_id": session_id,
        "client_replica": client_replica,
        "feedback": ai_json.get("feedback", ""),
        "new_stress": new_stress,
        "new_agreement": new_agreement,
        "game_status": game_status,
        "radar_metrics": radar_metrics
    }
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
