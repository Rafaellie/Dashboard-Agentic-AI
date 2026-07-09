import sys
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_current_user
from app.models.profile import Profile

# Override dependency to return an admin user
def override_get_current_user():
    return Profile(id="123e4567-e89b-12d3-a456-426614174000", email="admin@test.com", role="admin")

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)
response = client.get("/api/master/branches")
print("STATUS CODE:", response.status_code)
print("RESPONSE:", response.json())
