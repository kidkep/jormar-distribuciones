from pydantic_settings import BaseSettings
from functools import lru_cache


# Ajuste puntual: venta anterior no contabilizada correspondiente a inversion.
# Al sumar aqui, la distribucion de inversion refleja este monto sin alterar
# el saldo total de caja.
AJUSTE_INVERSION: float = 140000.0


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./jormar.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    APP_NAME: str = "JORMAR DISTRIBUCIONES"
    APP_VERSION: str = "1.0"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
