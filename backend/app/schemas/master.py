from pydantic import BaseModel, EmailStr, UUID4, Field, field_validator
from typing import Optional
from datetime import datetime

# --- Branch Schemas ---
class BranchBase(BaseModel):
    branch_name: str
    region: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    branch_name: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class BranchResponse(BranchBase):
    id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True

# --- Profile Schemas ---
class ProfileBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: str
    branch_id: Optional[UUID4] = None
    telegram_id: Optional[str] = None

class ProfileCreate(ProfileBase):
    id: Optional[UUID4] = None

class ProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    branch_id: Optional[UUID4] = None
    telegram_id: Optional[str] = None

class ProfileResponse(ProfileBase):
    id: UUID4
    is_active: Optional[bool] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Product Schemas ---
class ProductBase(BaseModel):
    product_name: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    sub_category: Optional[str] = None
    base_selling_price: float = Field(..., ge=0.0)
    preparation_time_min: int = Field(..., ge=1)
    is_active: bool = True

    @field_validator('product_name', 'category', 'sub_category')
    @classmethod
    def check_not_empty_spaces(cls, v):
        if v is not None and str(v).strip() == "":
            raise ValueError("Field tidak boleh hanya berisi spasi kosong")
        return v

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    product_name: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = Field(None, min_length=1)
    sub_category: Optional[str] = None
    base_selling_price: Optional[float] = Field(None, ge=0.0)
    preparation_time_min: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None

    @field_validator('product_name', 'category', 'sub_category')
    @classmethod
    def check_not_empty_spaces(cls, v):
        if v is not None and str(v).strip() == "":
            raise ValueError("Field tidak boleh hanya berisi spasi kosong")
        return v

class ProductResponse(ProductBase):
    sku_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Pagination Schemas ---
class PaginationMeta(BaseModel):
    current_page: int
    per_page: int
    total_data: int
    total_pages: int

class ProductPaginatedResponse(BaseModel):
    data: list[ProductResponse]
    meta: PaginationMeta

class ProfilePaginatedResponse(BaseModel):
    data: list[ProfileResponse]
    meta: PaginationMeta

class BranchPaginatedResponse(BaseModel):
    data: list[BranchResponse]
    meta: PaginationMeta
