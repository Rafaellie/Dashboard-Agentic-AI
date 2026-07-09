from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.supabase_client import supabase
from app.models.profile import Profile
from typing import Optional

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> Profile:
    token_str = None
    if credentials:
        token_str = credentials.credentials
    elif token:
        token_str = token

    if not token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # pengecekan mock token untuk pengujian
    if token_str == "mock-admin-token":
        profile = db.query(Profile).filter(Profile.role == "admin").first()
        if profile:
            return profile
        else:
            raise HTTPException(status_code=404, detail="Mock admin profile not found in database.")
    elif token_str == "mock-manager-token":
        profile = db.query(Profile).filter(Profile.role == "manager").first()
        if profile:
            return profile
        else:
            raise HTTPException(status_code=404, detail="Mock manager profile not found in database.")
    elif token_str == "mock-kasir-token":
        profile = db.query(Profile).filter(Profile.role == "kasir").first()
        if profile:
            return profile
        else:
            raise HTTPException(status_code=404, detail="Mock kasir profile not found in database.")

    if not supabase:
        # fallback untuk lingkungan pengembangan tanpa supabase
        profile = db.query(Profile).filter(Profile.id == 1).first()
        if not profile:
            raise HTTPException(status_code=401, detail="Supabase not configured and no dev user found.")
        return profile

    try:
        # verifikasi jwt dengan supabase
        user_res = supabase.auth.get_user(token_str)
        if not user_res or not user_res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        
        # asumsi email atau id terhubung ke tabel profil
        user_email = user_res.user.email
        
        # periksa id terlebih dahulu (mungkin dibuat oleh trigger)
        profile = db.query(Profile).filter(Profile.id == user_res.user.id).first()
        
        if not profile:
            profile = db.query(Profile).filter(Profile.email == user_email).first()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akun Anda belum terdaftar di sistem. Silakan hubungi Administrator."
            )
        else:
            # jika profil ada dari trigger tetapi email kosong, lakukan pembaruan
            if profile.email is None:
                profile.email = user_email
                # opsional, jika role adalah kasir dan ingin dijadikan admin 
                # jika dibuat dari dashboard sebagai manajer, api create_user akan memperbarui role
                db.commit()
                db.refresh(profile)
            
        return profile
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
        )

def apply_rls(query, model, current_user: Profile):
    """
    fungsi pembantu untuk menerapkan rls tingkat aplikasi.
    jika user adalah manajer atau kasir, akses hanya dibatasi ke cabang mereka sendiri.
    jika user adalah admin atau csuite, akses dibuka untuk seluruh data.
    """
    if current_user.role in ["manager", "kasir"]:
        if hasattr(model, 'branch_id'):
            return query.filter(model.branch_id == current_user.branch_id)
        # If the model uses a different field or needs join, handle it here
    return query

def require_roles(allowed_roles: list[str]):
    def dependency(current_user: Profile = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have permission to perform this action. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return dependency

