import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

import app.db.models
from app.api.internal import router as internal_router
from app.api.v1 import api_router
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import Base, engine

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            if "postgresql" in settings.DATABASE_URL or "postgres" in settings.DATABASE_URL:
                await conn.execute(
                    text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS branch VARCHAR(100);")
                )
                await conn.execute(
                    text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS semester VARCHAR(50);")
                )
                await conn.execute(
                    text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS forwarded_to VARCHAR(50);")
                )
                await conn.execute(
                    text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS clerk_notes VARCHAR(1000);")
                )
                await conn.execute(
                    text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);")
                )
                await conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS enrollment_number VARCHAR(64);"
                    )
                )
                await conn.execute(
                    text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(32);")
                )
                await conn.execute(
                    text("ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(100);")
                )
                await conn.execute(
                    text("ALTER TABLE users ADD COLUMN IF NOT EXISTS course VARCHAR(100);")
                )
                await conn.execute(
                    text("ALTER TABLE users ADD COLUMN IF NOT EXISTS semester VARCHAR(30);")
                )
                await conn.execute(
                    text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_enrollment_number ON users (enrollment_number) WHERE enrollment_number IS NOT NULL;"
                    )
                )
                await conn.execute(
                    text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone_number ON users (phone_number) WHERE phone_number IS NOT NULL;"
                    )
                )
                await conn.execute(
                    text(
                        "INSERT INTO exam_control_settings (id, is_active, session_name, fee_amount, updated_at) "
                        "VALUES (1, false, 'Summer / Spring 2026 Regular & Remedial', 1200, NOW()) "
                        "ON CONFLICT (id) DO NOTHING;"
                    )
                )
                # Seed initial bootstrap admin account if none exists
                check_admin = await conn.execute(
                    text("SELECT id FROM users WHERE role = 'admin' LIMIT 1;")
                )
                if check_admin.fetchone() is None:
                    admin_id = str(uuid.uuid4())
                    temp_admin_hash = hash_password("Admin@Campus2026")
                    await conn.execute(
                        text(
                            "INSERT INTO users (id, email, hashed_password, role, name, is_active, created_at, updated_at) "
                            "VALUES (:id, 'admin@university.edu', :pwd, 'admin', 'Central University Administrator', true, NOW(), NOW()) "
                            "ON CONFLICT (email) DO NOTHING;"
                        ),
                        {"id": admin_id, "pwd": temp_admin_hash},
                    )
                    logger.info("Initialized default bootstrap admin: admin@university.edu")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Database schema auto-creation notice: %s", exc)
    yield


app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
# Deliberately NOT under settings.API_V1_PREFIX / nginx's /api/ routing —
# see app/api/internal.py's module docstring (BACKEND-07).
app.include_router(internal_router, prefix="/internal/v1")


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": settings.APP_NAME, "status": "running"}
