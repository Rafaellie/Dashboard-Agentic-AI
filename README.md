# Agentic BI Dashboard

Agentic BI Dashboard adalah sebuah platform business intelligence. Aplikasi ini dapat mengekstrak data operasional dan memberikan wawasan berbasis analisis untuk membantu pengambilan keputusan secara struktur.

## fitur utama
- ai engine: pipeline ai multi-agen yang bertugas memproses data.
- data integration: mengunggah data csv/excel/pdf dengan pencocokan field otomatis.
- real-time dashboard: panel pemantauan metrik bisnis.
- pivot data grid: fleksibilitas eksplorasi data.
- telegram webhook: sistem input data dari bot telegram ke database.

## stack teknologi
- frontend: next.js, tailwind css, shadcn ui
- backend: fastapi, langchain
- database: postgresql, supabase

## cara menjalankan proyek

### backend setup
jalankan perintah berikut untuk memulai backend:
```bash
cd backend
python -m venv venv
pip install -r requirements.txt
```

copy file `.env` di folder `backend/`:
```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
DATABASE_URL=...
GROQ_API_KEY=...
TAVILY_API_KEY=...
```

jalankan server lokal vuvicorn:
```bash
python -m uvicorn app.main:app --reload
```

### frontend setup
buka terminal baru dan masuk ke frontend:
```bash
cd frontend
npm install
```

buat file `.env.local` di folder frontend:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

jalankan server lokal frontend:
```bash
npm run dev
```
