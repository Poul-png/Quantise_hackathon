import datetime
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship


DATABASE_URL = "postgresql://postgres:627school@localhost:5432/postgres"



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

    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    sender = Column(String)  # player или client
    text = Column(String)

    stress_change = Column(Integer, default=0)
    agreement_change = Column(Integer, default=0)
    feedback = Column(String, nullable=True)

    argumentation = Column(Integer, default=50)
    politeness = Column(Integer, default=50)
    clarity = Column(Integer, default=50)
    empathy = Column(Integer, default=50)
    flexibility = Column(Integer, default=50)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("GameSession", back_populates="messages")


def init_db():
    Base.metadata.create_all(bind=engine)
