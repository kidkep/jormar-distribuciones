from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.role_repository import RoleRepository
from app.schemas.user import UserCreate, UserUpdate, UserChangePassword, UserUpdateTheme
from app.utils.security import get_password_hash, verify_password
from app.exceptions import NotFoundException, ConflictException, BadRequestException

VALID_THEMES = {"gold", "emerald", "blue", "purple", "rose"}


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)

    async def get_user(self, user_id: int) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("Usuario", user_id)
        return user

    async def get_users(self, skip: int = 0, limit: int = 50) -> tuple[list[User], int]:
        return await self.user_repo.get_all(skip, limit)

    async def create_user(self, data: UserCreate) -> User:
        if await self.user_repo.get_by_email(data.email):
            raise ConflictException("Ya existe un usuario con ese email")

        if await self.user_repo.get_by_username(data.username):
            raise ConflictException("Ya existe un usuario con ese username")

        if data.role_id:
            role = await self.role_repo.get_by_id(data.role_id)
            if not role:
                raise NotFoundException("Rol", data.role_id)

        user = User(
            email=data.email,
            username=data.username,
            full_name=data.full_name,
            hashed_password=get_password_hash(data.password),
            is_active=data.is_active,
            is_superuser=data.is_superuser,
            role_id=data.role_id,
        )
        return await self.user_repo.create(user)

    async def update_user(self, user_id: int, data: UserUpdate) -> User:
        user = await self.get_user(user_id)

        if data.email and data.email != user.email:
            if await self.user_repo.get_by_email(data.email):
                raise ConflictException("Ya existe un usuario con ese email")
            user.email = data.email

        if data.username and data.username != user.username:
            if await self.user_repo.get_by_username(data.username):
                raise ConflictException("Ya existe un usuario con ese username")
            user.username = data.username

        if data.full_name is not None:
            user.full_name = data.full_name
        if data.role_id is not None:
            user.role_id = data.role_id
        if data.is_active is not None:
            user.is_active = data.is_active
        if data.is_superuser is not None:
            user.is_superuser = data.is_superuser
        if data.password:
            user.hashed_password = get_password_hash(data.password)

        if data.theme is not None:
            if data.theme not in VALID_THEMES:
                raise BadRequestException("Tema invalido")
            user.theme = data.theme

        return await self.user_repo.update(user)

    async def update_theme(self, user_id: int, data: UserUpdateTheme) -> User:
        if data.theme not in VALID_THEMES:
            raise BadRequestException("Tema invalido")
        user = await self.get_user(user_id)
        user.theme = data.theme
        return await self.user_repo.update(user)

    async def change_password(self, user_id: int, data: UserChangePassword) -> None:
        user = await self.get_user(user_id)
        if not verify_password(data.current_password, user.hashed_password):
            raise BadRequestException("La contrasena actual es incorrecta")
        user.hashed_password = get_password_hash(data.new_password)
        await self.user_repo.update(user)

    async def delete_user(self, user_id: int) -> None:
        user = await self.get_user(user_id)
        await self.user_repo.delete(user)
