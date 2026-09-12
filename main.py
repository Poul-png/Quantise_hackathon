from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json

app = FastAPI()

# Настройка CORS для работы с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2.5:3b"


class GameState(BaseModel):
    player_message: str
    current_stress: int
    current_agreement: int
    stage: str


@app.post("/game/chat")
async def chat_step(state: GameState):
    # 1. Загружаем профиль из сценария (для MVP можно захардкодить или прочитать из файла)
    client_profile = "Жесткий директор IT. Ценит время и цифры."

    # 2. Формируем системный промпт
    system_prompt = (
        f"Ты играешь роль клиента: {client_profile}. Текущий этап: {state.stage}. "
        f"Текущий стресс клиента: {state.current_stress}, согласие: {state.current_agreement}. "
        "Ответь на реплику игрока. Ты ОБЯЗАН ответить ТОЛЬКО в формате JSON: "
        '{"client_replica": "текст", "stress_change": int, "agreement_change": int, "feedback": "почему"}'
    )

    # 3. Запрос к Ollama
    payload = {
        "model": MODEL_NAME,
        "prompt": f"{system_prompt}\n\nРеплика игрока: {state.player_message}\nОтвет в JSON:",
        "stream": False,
        "format": "json"  # Важно! Заставляет современные модели Ollama выдавать JSON
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload)
        response_data = response.json()
        ai_response_raw = response_data.get("response", "{}")

        # Парсим JSON, полученный от модели
        ai_json = json.loads(ai_response_raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации или парсинга ИИ: {str(e)}")

    # 4. Расчет новых показателей шкал (с ограничением от 0 до 100)
    new_stress = max(0, min(100, state.current_stress + ai_json.get("stress_change", 0)))
    new_agreement = max(0, min(100, state.current_agreement + ai_json.get("agreement_change", 0)))

    # 5. Генерируем данные для радар-диаграммы (5 базовых навыков деловой речи)
    # На хакатоне их можно рассчитывать динамически на основе feedback или завязать на баланс шкал
    radar_metrics = {
        "argumentation": max(10, min(100, 50 + (new_agreement - new_stress) // 2)),
        "politeness": max(10, min(100, 100 - new_stress)),
        "clarity": 70 if ai_json.get("stress_change", 0) <= 0 else 40,
        "empathy": max(10, min(100, new_agreement)),
        "flexibility": max(10, min(100, 50 + ai_json.get("agreement_change", 0) * 2))
    }

    return {
        "client_replica": ai_json.get("client_replica", "Ясно. Продолжайте."),
        "feedback": ai_json.get("feedback", ""),
        "new_stress": new_stress,
        "new_agreement": new_agreement,
        "radar_metrics": radar_metrics
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
