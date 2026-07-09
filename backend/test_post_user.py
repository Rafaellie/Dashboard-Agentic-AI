import sys
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_current_user
from app.models.profile import Profile

def override_get_current_user():
    return Profile(id="123e4567-e89b-12d3-a456-426614174000", email="admin@test.com", role="admin")

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

payload = {
    "id": "7c07f8bb-9ee7-478f-88ae-7e4b0fc48c99",
    "email": "testpost@dbesto.id",
    "role": "manager",
    "branch_id": None
}

response = client.post("/api/master/users", json=payload)
print("STATUS CODE:", response.status_code)
print("RESPONSE:", response.json() if response.status_code != 500 else response.text)
