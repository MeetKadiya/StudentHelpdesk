"""Auth endpoints: signup, login, refresh. See api_contract.md."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshRequest,
    SignupRequest,
    TokenResponse,
    UserOut,
)
from app.services import auth_service
from app.services.auth_service import AuthError

router = APIRouter()


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Allows authenticated user (student/faculty/clerk/admin) to change their password."""
    try:
        await auth_service.change_password(
            db, user.id, payload.current_password, payload.new_password
        )
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"message": "Password changed successfully."}


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)) -> UserOut:
    """Added alongside FRONTEND-04 (Claude-3) — not previously needed
    since FRONTEND-01/02 only ever dealt with students. TokenResponse
    carries no role/email (access tokens only encode `sub`, see
    core/security.py), so a faculty-vs-student-vs-admin-aware frontend has
    no way to know which UI to show after login without this. Read-only,
    reuses get_current_user + the existing UserOut schema — no new
    tables/columns, no change to any existing endpoint. Logged here per
    TEAM_PROTOCOL.md rather than silently added, since app/api/v1/auth.py
    is Claude-1 (Backend) ownership; see task_board.md's FRONTEND-04 entry
    for the full note.
    """
    return UserOut.model_validate(user)


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)) -> UserOut:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Public account registration is disabled. All student, faculty, and clerk accounts are provisioned exclusively by Central University Administration.",
    )
    try:
        user = await auth_service.signup(db, payload.email, payload.password, payload.role)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return UserOut.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        user = await auth_service.authenticate(db, payload.email, payload.password)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    access_token, refresh_token = auth_service.issue_tokens(user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        access_token, refresh_token = await auth_service.refresh_access_token(
            db, payload.refresh_token
        )
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
