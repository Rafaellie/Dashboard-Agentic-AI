from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.profile import Profile
from app.models.retail_branch import RetailBranch
from app.models.product import Product
from app.schemas.master import (
    BranchCreate, BranchUpdate, BranchResponse, BranchPaginatedResponse,
    ProfileCreate, ProfileUpdate, ProfileResponse, ProfilePaginatedResponse,
    ProductCreate, ProductUpdate, ProductResponse, ProductPaginatedResponse
)

router = APIRouter(tags=["Master Data"])

def require_admin(current_user: Profile = Depends(get_current_user)):
    """Dependency to enforce Admin-only access."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action. Admin role required."
        )
    return current_user

# =======================
# BRANCH MANAGEMENT
# =======================

@router.get("/branches", response_model=BranchPaginatedResponse)
def get_branches(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Get paginated retail branches with optional filtering."""
    query = db.query(RetailBranch)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                RetailBranch.branch_name.ilike(search_filter),
                RetailBranch.city.ilike(search_filter),
                RetailBranch.address.ilike(search_filter)
            )
        )
        
    if region and region != 'ALL':
        query = query.filter(RetailBranch.region == region)
        
    # Sort active first, then by name
    query = query.order_by(
        RetailBranch.is_active.desc(),
        RetailBranch.branch_name.asc()
    )
    
    total_data = query.count()
    total_pages = (total_data + limit - 1) // limit
    
    branches = query.offset((page - 1) * limit).limit(limit).all()
    
    return BranchPaginatedResponse(
        data=branches,
        meta={
            "current_page": page,
            "per_page": limit,
            "total_data": total_data,
            "total_pages": total_pages
        }
    )

@router.post("/branches", response_model=BranchResponse)
def create_branch(
    branch: BranchCreate,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Create a new retail branch."""
    db_branch = RetailBranch(**branch.model_dump())
    db.add(db_branch)
    db.commit()
    db.refresh(db_branch)
    return db_branch

@router.put("/branches/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: UUID,
    branch_update: BranchUpdate,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Update an existing branch."""
    db_branch = db.query(RetailBranch).filter(RetailBranch.id == branch_id).first()
    if not db_branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    update_data = branch_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_branch, key, value)
        
    db.commit()
    db.refresh(db_branch)
    return db_branch

@router.delete("/branches/{branch_id}")
def delete_branch(
    branch_id: UUID,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Soft delete a branch (set is_active to False)."""
    db_branch = db.query(RetailBranch).filter(RetailBranch.id == branch_id).first()
    if not db_branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    db_branch.is_active = False
    db.commit()
    return {"status": "success", "message": f"Branch {branch_id} deactivated."}

@router.get("/branch-regions", response_model=List[str])
def get_branch_regions(
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Get all unique branch regions."""
    regions = db.query(RetailBranch.region).filter(RetailBranch.region.isnot(None)).distinct().all()
    return sorted([r[0] for r in regions if r[0]])

# =======================
# USER / PROFILE MANAGEMENT
# =======================

@router.get("/users/me", response_model=ProfileResponse)
def get_me(current_user: Profile = Depends(get_current_user)):
    """Get current logged-in user profile."""
    return current_user

@router.get("/users", response_model=ProfilePaginatedResponse)
def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Get paginated active users/profiles."""
    query = db.query(Profile)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Profile.full_name.ilike(search_filter),
                Profile.email.ilike(search_filter)
            )
        )
        
    query = query.order_by(
        (Profile.role != 'inactive').desc(),
        Profile.full_name.asc()
    )
    
    total_data = query.count()
    total_pages = (total_data + limit - 1) // limit
    
    users = query.offset((page - 1) * limit).limit(limit).all()
    
    return ProfilePaginatedResponse(
        data=users,
        meta={
            "current_page": page,
            "per_page": limit,
            "total_data": total_data,
            "total_pages": total_pages
        }
    )

@router.post("/users/validate")
def validate_user(
    profile: ProfileCreate,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Pre-validate user data (like telegram_id uniqueness) before auth signup."""
    import re
    if profile.email:
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', profile.email.strip()):
            raise HTTPException(status_code=400, detail="Invalid email format")
            
        existing_email = db.query(Profile).filter(Profile.email == profile.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")
            
    if profile.telegram_id:
        existing_tg = db.query(Profile).filter(Profile.telegram_id == profile.telegram_id).first()
        if existing_tg:
            raise HTTPException(status_code=400, detail="Telegram ID already registered")
            
    if profile.branch_id:
        from app.models.retail_branch import RetailBranch
        branch = db.query(RetailBranch).filter(RetailBranch.id == profile.branch_id).first()
        if not branch:
            raise HTTPException(status_code=400, detail="Invalid branch_id")
            
    return {"status": "valid"}

@router.post("/users", response_model=ProfileResponse)
def create_user(
    profile: ProfileCreate,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Create a new user profile (manager, kasir, etc.)."""
    # Validate uniqueness and format
    import re
    if profile.email:
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', profile.email.strip()):
            raise HTTPException(status_code=400, detail="Invalid email format")
            
        existing_email = db.query(Profile).filter(Profile.email == profile.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")
            
    if profile.telegram_id:
        existing_tg = db.query(Profile).filter(Profile.telegram_id == profile.telegram_id).first()
        if existing_tg:
            raise HTTPException(status_code=400, detail="Telegram ID already registered")

    # Validate branch exists if provided
    if profile.branch_id:
        branch = db.query(RetailBranch).filter(RetailBranch.id == profile.branch_id).first()
        if not branch:
            raise HTTPException(status_code=400, detail="Invalid branch_id")

    # Check if profile already created by Supabase trigger
    if profile.id:
        existing_profile = db.query(Profile).filter(Profile.id == profile.id).first()
        if existing_profile:
            # Update the existing profile instead of creating a new one
            existing_profile.email = profile.email
            existing_profile.full_name = profile.full_name
            existing_profile.role = profile.role
            existing_profile.branch_id = profile.branch_id
            existing_profile.telegram_id = profile.telegram_id
            db.commit()
            db.refresh(existing_profile)
            return existing_profile

    db_profile = Profile(**profile.model_dump())
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.put("/users/{user_id}", response_model=ProfileResponse)
def update_user(
    user_id: UUID,
    profile_update: ProfileUpdate,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Update a user's role, branch, or telegram_id."""
    db_profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = profile_update.model_dump(exclude_unset=True)
    
    # Check uniqueness if updating email or telegram_id
    if "email" in update_data and update_data["email"]:
        existing = db.query(Profile).filter(Profile.email == update_data["email"], Profile.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered by another user")
            
    if "telegram_id" in update_data and update_data["telegram_id"]:
        existing = db.query(Profile).filter(Profile.telegram_id == update_data["telegram_id"], Profile.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Telegram ID already registered by another user")

    if "branch_id" in update_data and update_data["branch_id"]:
        branch = db.query(RetailBranch).filter(RetailBranch.id == update_data["branch_id"]).first()
        if not branch:
            raise HTTPException(status_code=400, detail="Invalid branch_id")

    for key, value in update_data.items():
        setattr(db_profile, key, value)
        
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.delete("/users/{user_id}")
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Delete or archive a user based on relations."""
    from app.models.fact_transaction import FactTransaction
    
    db_profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="User not found")
        
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # Check relation
    transaction_relation = db.query(FactTransaction).filter(
        (FactTransaction.owner_id == user_id) | (FactTransaction.kasir_id == user_id)
    ).first()

    if transaction_relation:
        # Soft delete (Arsip)
        db_profile.is_active = False
        db.commit()
        return {"status": "success", "message": "Pegawai diarsipkan karena memiliki relasi transaksi"}
    else:
        # Hard delete
        db.delete(db_profile)
        db.commit()
        return {"status": "success", "message": "Pegawai berhasil dihapus permanen"}

# --- Products ---

@router.get("/products", response_model=ProductPaginatedResponse)
def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Get paginated products with optional filtering."""
    query = db.query(Product)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Product.product_name.ilike(search_filter),
                Product.sku_id.ilike(search_filter)
            )
        )
        
    if category and category != 'ALL':
        query = query.filter(Product.category == category)
        
    # Sort active first, then by category, then by name
    query = query.order_by(
        Product.is_active.desc(),
        Product.category.asc(),
        Product.product_name.asc()
    )
    
    total_data = query.count()
    total_pages = (total_data + limit - 1) // limit
    
    products = query.offset((page - 1) * limit).limit(limit).all()
    
    return ProductPaginatedResponse(
        data=products,
        meta={
            "current_page": page,
            "per_page": limit,
            "total_data": total_data,
            "total_pages": total_pages
        }
    )

@router.get("/product-categories", response_model=List[str])
def get_product_categories(
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Get all unique product categories."""
    categories = db.query(Product.category).filter(Product.category.isnot(None)).distinct().all()
    return sorted([c[0] for c in categories if c[0]])

@router.post("/products", response_model=ProductResponse)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Create a new product with auto-generated SKU (PRD-XXX)."""
    # Auto-generate SKU
    last_product = db.query(Product).order_by(Product.sku_id.desc()).first()
    if last_product and last_product.sku_id.startswith("PRD-"):
        try:
            last_num = int(last_product.sku_id.split("-")[1])
            new_sku = f"PRD-{(last_num + 1):03d}"
        except:
            new_sku = "PRD-001"
    else:
        new_sku = "PRD-001"

    db_product = Product(sku_id=new_sku, **product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.put("/products/{sku_id}", response_model=ProductResponse)
def update_product(
    sku_id: str,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Update an existing product."""
    db_product = db.query(Product).filter(Product.sku_id == sku_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_product, key, value)
        
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/products/{sku_id}")
def delete_product(
    sku_id: str,
    db: Session = Depends(get_db),
    admin: Profile = Depends(require_admin)
):
    """Soft delete (deactivate) a product."""
    db_product = db.query(Product).filter(Product.sku_id == sku_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    db_product.is_active = False
    db.commit()
    return {"message": "Product deactivated successfully"}
