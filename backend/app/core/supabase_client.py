from supabase import create_client, Client
from app.core.config import settings

def get_supabase() -> Client:
    try:
        if not settings.SUPABASE_URL or "your_supabase_url" in settings.SUPABASE_URL:
            return None
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    except Exception as e:
        print(f"Supabase connection error: {e}")
        return None

supabase: Client = get_supabase()
