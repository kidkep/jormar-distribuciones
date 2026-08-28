from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserResponse, UserChangePassword
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.utils.security import create_access_token

router = APIRouter(prefix="/auth", tags=["Autenticacion"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.authenticate(data.username, data.password)
    token = create_access_token(data={"sub": str(user.id), "username": user.username})
    return TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.put("/me/password")
async def change_my_password(
    data: UserChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    await service.change_password(current_user.id, data)
    return {"message": "Contrasena actualizada correctamente"}
