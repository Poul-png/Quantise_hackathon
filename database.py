import datetime
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# 1. Загружаем переменные из файла .env
load_dotenv()

# 2. Собираем данные из окружения
db_user = os.getenv("DB_USER", "postgres")
db_password = os.getenv("DB_PASSWORD", "secret")
db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "5432")
db_name = os.getenv("DB_NAME", "postgres")

# 3. Формируем безопасную строку подключения
DATABASE_URL = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

# Настройка SQLAlchemy
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class GameSession(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)  # UUID сессии
    player_name = Column(String, default="Игрок")
    current_stage = Column(String, default="initial_negotiation")
    stress = Column(Integer, default=20)
    agreement = Column(Integer, default=30)
    status = Column(String, default="in_progress")  # in_progress, win, lose
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Связь "один ко многим" с таблицей сообщений
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    sender = Column(String)  # player или client
    text = Column(String)

    # Изменения шкал на конкретном шаге
    stress_change = Column(Integer, default=0)
    agreement_change = Column(Integer, default=0)
    feedback = Column(String, nullable=True)

    # Метрики радар-диаграммы на конкретном шаге
    argumentation = Column(Integer, default=50)
    politeness = Column(Integer, default=50)
    clarity = Column(Integer, default=50)
    empathy = Column(Integer, default=50)
    flexibility = Column(Integer, default=50)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("GameSession", back_populates="messages")


# Функция автоматического создания таблиц в Postgres при старте FastAPI
def init_db():
    Base.metadata.create_all(bind=engine)
