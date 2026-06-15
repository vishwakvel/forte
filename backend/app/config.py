from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    spotify_redirect_uri: str = "http://127.0.0.1:8000/auth/callback"
    supabase_url: str = ""
    supabase_key: str = ""
    jwt_secret: str = "change-me-in-production"
    frontend_url: str = "http://127.0.0.1:5173"
    min_ratings_for_ml: int = 20

    class Config:
        env_file = ".env"


settings = Settings()
