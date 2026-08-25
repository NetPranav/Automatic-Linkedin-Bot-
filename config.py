"""
config.py
---------
Central configuration loader. Reads all environment variables from .env
and exposes them as a typed Settings object used throughout the application.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path


class Settings(BaseSettings):
    """
    All application settings loaded from environment variables.
    Pydantic-settings automatically reads from .env file.
    """

    # --- LinkedIn Credentials ---
    linkedin_client_id: str = Field(default="", env="LINKEDIN_CLIENT_ID")
    linkedin_client_secret: str = Field(default="", env="LINKEDIN_CLIENT_SECRET")
    linkedin_access_token: str = Field(default="", env="LINKEDIN_ACCESS_TOKEN")
    linkedin_person_urn: str = Field(default="", env="LINKEDIN_PERSON_URN")
    linkedin_email: str = Field(default="", env="LINKEDIN_EMAIL")
    linkedin_password: str = Field(default="", env="LINKEDIN_PASSWORD")

    # --- Google Gemini Configuration ---
    gemini_api_key: str = Field(default="", env="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.0-flash", env="GEMINI_MODEL")

    # --- NVIDIA NIM Configuration ---
    nvidia_nim_api_key: str = Field(default="", env="NVIDIA_NIM_API_KEY")
    nvidia_nim_model: str = Field(
        default="meta/llama-3.2-90b-vision-instruct",
        env="NVIDIA_NIM_MODEL"
    )

    # --- Server Settings ---
    backend_host: str = Field(default="0.0.0.0", env="BACKEND_HOST")
    backend_port: int = Field(default=8000, env="BACKEND_PORT")
    frontend_preview_url: str = Field(
        default="http://192.168.29.89:3001/preview-incoming",
        env="FRONTEND_PREVIEW_URL"
    )
    backend_ip: str = Field(default="192.168.29.88", env="BACKEND_IP")

    # --- App Settings ---
    upload_dir: str = Field(default="uploads", env="UPLOAD_DIR")
    secret_key: str = Field(default="change_this_to_a_random_secret_key_32chars", env="SECRET_KEY")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# Singleton settings instance - import this throughout the app
settings = Settings()

# Ensure the uploads directory exists on startup
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)