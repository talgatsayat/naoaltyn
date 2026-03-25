# НАО «Алтынсарина» — Портал подачи заявок

## Быстрый запуск

### Вариант 1: Docker Compose (рекомендуется)

```bash
cp backend/.env.example backend/.env
# Отредактируйте backend/.env при необходимости
docker-compose up --build
```

Сервисы:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Вариант 2: Локально

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Создание администратора

```bash
# Через Docker:
docker-compose exec backend python -m app.cli create-admin

# Локально:
cd backend && python -m app.cli create-admin
```

## Структура заявок

- **Курсы** — повышение квалификации
- **Вакансии** — трудоустройство
- **Науч. проекты** — гранты и исследования
- **Стажировка** — практика

## Типы заявителей

- Физическое лицо
- Юридическое лицо (от компании)

## Языки

Русский · Қазақша · English
