from pydantic import BaseModel


class PermissionBrief(BaseModel):
    id: int
    name: str
    description: str | None = None
    module: str

    model_config = {"from_attributes": True}


class RoleBase(BaseModel):
    name: str
    description: str | None = None


class RoleCreate(RoleBase):
    permission_ids: list[int] = []


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permission_ids: list[int] | None = None


class RoleResponse(RoleBase):
    id: int
    permissions: list[PermissionBrief] = []

    model_config = {"from_attributes": True}


class PermissionResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    module: str

    model_config = {"from_attributes": True}
