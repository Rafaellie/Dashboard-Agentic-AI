FROM python:3.10-slim

WORKDIR /app

# Copy requirement dan install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh source code backend
COPY . .

EXPOSE 8000

# Jalankan server FastAPI dengan Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
