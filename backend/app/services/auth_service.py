from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.utils.security import verify_password
from app.exceptions import UnauthorizedException


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def authenticate(self, username: str, password: str) -> User:
        user = await self.user_repo.get_by_username(username)
        if not user:
            user = await self.user_repo.get_by_email(username)

        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedException("Usuario o contrasena incorrectos")

        if not user.is_active:
            raise UnauthorizedException("Usuario desactivado")

        return await self.user_repo.get_by_id(user.id)
