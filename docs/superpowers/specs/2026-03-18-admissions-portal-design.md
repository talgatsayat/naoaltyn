# Портал подачи заявок — НАО «Алтынсарина»
**Дата:** 2026-03-18
**Версия:** 1.1 (тестовая)

---

## 1. Контекст

НАО «Национальная академия образования имени И. Алтынсарина» (uba.edu.kz) принимает заявки от физических и юридических лиц на курсы повышения квалификации, вакансии, научные проекты и стажировки. Сейчас процесс подачи документов не автоматизирован. Цель — создать отдельный портал на поддомене (например `apply.uba.edu.kz`), который интегрируется с существующим сайтом без его изменения.

---

## 2. Стек технологий

| Слой | Технология |
|------|-----------|
| Фронтенд | React (Vite) + react-i18next (3 языка) + React Router |
| Бэкенд | FastAPI (Python 3.11+) |
| База данных | PostgreSQL |
| Файловое хранилище | Локальная файловая система (`uploads/`) — ограничение v1, не масштабируется горизонтально |
| Аутентификация | JWT: access-токен (15 мин) + refresh-токен (7 дней, хранится в БД) |
| Email | `fastapi-mail` через SMTP |
| Стиль | CSS-переменные — цвета uba.edu.kz (синий #1a3a6b, золотой #f0c040) |

---

## 3. Части системы

### 3.1 Публичный сайт (лендинг)
- Навигация с переключателем языков (РУ / ҚЗ / EN)
- Hero-секция с кнопками «Подать заявку» и «Войти»
- 4 карточки типов заявок
- Футер с контактами академии
- Интеграция: на uba.edu.kz добавляется ссылка на поддомен

### 3.2 Портал заявителя

**Аутентификация:**
- Регистрация (email, пароль, ФИО, телефон)
- Вход → access + refresh токены
- `POST /api/auth/logout` — инвалидация refresh-токена в БД
- Подтверждение email (ссылка действует 24 часа; эндпоинт повторной отправки: `POST /api/auth/resend-verification`)
- Сброс пароля: `POST /api/auth/forgot-password` → письмо со ссылкой → `POST /api/auth/reset-password?token=...`

**Дашборд:**
- Список моих заявок с фильтрами по типу и статусу, пагинация
- Кнопка «Новая заявка»

**Многошаговая форма — 4 шага:**

Шаг 1 — Выбор типа заявки: `courses` / `jobs` / `research` / `internship`

Шаг 2 — Личные данные, с переключателем `individual` / `company`:
- `individual`: ФИО (фамилия, имя, отчество), ИИН (12 цифр), email, телефон, должность, место работы
- `company`: + название организации, БИН (12 цифр), ФИО представителя, должность представителя
  > Поля `company_name` и `bin` обязательны только если `applicant_type = company`; для `individual` — `NULL`

Шаг 3 — Дополнительные данные (зависят от типа, описаны в `extra_data`-схемах ниже):
- `courses`: название курса, желаемая дата, стаж работы (лет)
- `jobs`: желаемая должность, ожидаемая зарплата (тенге, опционально)
- `research`: тема исследования, краткое описание (до 2000 символов), аффилиация
- `internship`: направление, желаемый период (дата начала/конца), учебное заведение

Шаг 4 — Загрузка документов + финальное подтверждение → статус меняется `draft → pending`

**Документы** (PDF / JPG / PNG, до 10 МБ каждый):
- Удостоверение личности / паспорт
- Диплом об образовании
- Резюме / CV
- Сертификаты / свидетельства
- Трудовая книжка / справка о стаже
- Фото 3×4
- Юр. лицо дополнительно: свидетельство о регистрации, доверенность

**Отслеживание статуса:**
- Страница «Моя заявка» — текущий статус + история изменений

### 3.3 Админ-панель
- Отдельный вход (роль `admin`); первый admin создаётся командой `python -m app.cli create-admin`
- Список всех заявок с фильтрами (тип, статус, дата), пагинация (`page`, `page_size`)
- Карточка заявки: все данные + список документов со скачиванием
- Смена статуса: `pending → approved / rejected` с необязательным комментарием
- При смене статуса автоматически уходит email заявителю

### 3.4 Email-уведомления

| Событие | Кому | Содержание |
|---------|------|-----------|
| Регистрация | Заявитель | Ссылка подтверждения (24 ч) |
| Заявка подана | Заявитель | Номер заявки, тип, список документов |
| Статус изменён | Заявитель | Новый статус + комментарий администратора |
| Сброс пароля | Заявитель | Ссылка (1 час) |

---

## 4. Модель данных

```sql
users
  id UUID PK, email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  first_name, last_name, middle_name VARCHAR,
  phone VARCHAR, iin VARCHAR(12),
  role ENUM('applicant','admin') DEFAULT 'applicant',
  is_verified BOOLEAN DEFAULT false,
  applicant_type ENUM('individual','company') DEFAULT 'individual',
  company_name VARCHAR NULL,   -- обязателен если applicant_type='company'
  bin VARCHAR(12) NULL,        -- обязателен если applicant_type='company'
  created_at TIMESTAMPTZ DEFAULT now()

refresh_tokens
  id UUID PK, user_id UUID FK→users,
  token_hash VARCHAR UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()

password_reset_tokens
  id UUID PK, user_id UUID FK→users,
  token_hash VARCHAR UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false

applications
  id UUID PK, user_id UUID FK→users,
  type ENUM('courses','jobs','research','internship') NOT NULL,
  status ENUM('draft','pending','approved','rejected') DEFAULT 'draft',
  extra_data JSONB NOT NULL DEFAULT '{}',
  admin_comment TEXT NULL,
  submitted_at TIMESTAMPTZ NULL,   -- заполняется при финальном подтверждении
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()

documents
  id UUID PK, application_id UUID FK→applications,
  user_id UUID FK→users,           -- для проверки доступа
  document_type VARCHAR NOT NULL,
  original_filename VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,      -- путь относительно uploads/
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()

status_history
  id UUID PK, application_id UUID FK→applications,
  old_status ENUM, new_status ENUM,
  changed_by_user_id UUID FK→users NULL,  -- NULL = системное изменение
  comment TEXT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()

email_notifications
  id UUID PK, application_id UUID FK→applications NULL,
  recipient_email VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL,
  sent_at TIMESTAMPTZ NULL,
  success BOOLEAN DEFAULT false,
  error_message TEXT NULL
```

### Схемы `extra_data` по типу заявки

```json
// courses
{ "course_name": "string", "preferred_date": "YYYY-MM-DD", "work_experience_years": 5 }

// jobs
{ "desired_position": "string", "expected_salary_kzt": 300000 }

// research
{ "topic": "string", "description": "string (max 2000)", "affiliation": "string" }

// internship
{ "direction": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "institution": "string" }
```

---

## 5. API эндпоинты

```
# Auth
POST /api/auth/register
POST /api/auth/login                  → {access_token, refresh_token}
POST /api/auth/refresh                → {access_token}
POST /api/auth/logout                 (инвалидирует refresh_token)
GET  /api/auth/verify-email?token=
POST /api/auth/resend-verification
POST /api/auth/forgot-password
POST /api/auth/reset-password

# Заявки (заявитель)
GET  /api/applications?page=1&page_size=20&type=&status=
POST /api/applications                → создать черновик
GET  /api/applications/{id}
PATCH /api/applications/{id}          → обновить черновик (только status=draft)
POST /api/applications/{id}/submit    → draft → pending
DELETE /api/applications/{id}         → только черновики

# Документы (заявитель)
POST   /api/applications/{id}/documents    → загрузить файл
GET    /api/applications/{id}/documents    → список
GET    /api/documents/{id}/download        → только владелец или admin
DELETE /api/documents/{id}                 → только владелец, только если заявка=draft

# Админ
GET   /api/admin/applications?page=1&page_size=20&type=&status=&date_from=&date_to=
GET   /api/admin/applications/{id}
PATCH /api/admin/applications/{id}/status  → {status, comment}
GET   /api/admin/users?page=1&q=           → поиск по ФИО/email
GET   /api/admin/users/{id}
```

**Безопасность файлов:** `GET /api/documents/{id}/download` проверяет в БД что `documents.user_id = current_user.id` или `current_user.role = admin`. Файлы НЕ отдаются напрямую через статику.

**CORS:** Бэкенд разрешает запросы только с `ALLOWED_ORIGINS` (из `.env`), например `http://localhost:5173, https://apply.uba.edu.kz`.

---

## 6. Локализация

Три языка: `ru` (по умолчанию), `kz`, `en`.
Файлы: `frontend/src/locales/{ru,kz,en}.json`.
Для v1 допустимы заглушки на казахском и английском (переводы предоставляются заказчиком).
Переключатель языка в навигации, выбор сохраняется в `localStorage`.

---

## 7. Структура проекта

```
наоалтынсарин/
├── docker-compose.yml           # postgres + backend + frontend
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, роутеры
│   │   ├── cli.py               # python -m app.cli create-admin
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic Settings (.env)
│   │   │   ├── database.py      # SQLAlchemy async engine
│   │   │   └── security.py      # JWT, password hashing
│   │   ├── models/              # SQLAlchemy ORM модели
│   │   ├── schemas/             # Pydantic схемы запросов/ответов
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── applications.py
│   │   │   ├── documents.py
│   │   │   └── admin.py
│   │   └── services/
│   │       ├── email.py
│   │       └── file_storage.py
│   ├── uploads/                 # загруженные файлы (в .gitignore)
│   ├── alembic/                 # миграции БД
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Apply.jsx        # многошаговая форма
│   │   │   ├── ApplicationDetail.jsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.jsx
│   │   │       └── AdminApplicationDetail.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── StepForm.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── locales/
│   │   │   ├── ru.json
│   │   │   ├── kz.json
│   │   │   └── en.json
│   │   ├── api/                 # axios клиент + перехватчик refresh
│   │   └── styles/
│   │       └── variables.css    # --color-primary: #1a3a6b
│   └── package.json
└── docs/
```

---

## 8. Проверка (верификация)

1. `docker-compose up` → PostgreSQL + бэкенд + фронтенд поднимаются без ошибок
2. `python -m app.cli create-admin` → создаётся admin-аккаунт
3. Зарегистрироваться как заявитель → прийти письмо с подтверждением → активировать
4. Подать заявку каждого типа (`courses`, `jobs`, `research`, `internship`) как физ. лицо
5. Подать заявку как юр. лицо → проверить обязательность полей `company_name` и `bin`
6. Попробовать загрузить файл > 10 МБ и неподдерживаемый формат → получить ошибку
7. Войти как admin → найти заявки → сменить статус → проверить email у заявителя
8. Убедиться, что заявитель не может скачать документы чужой заявки (ожидается 403)
9. Проверить сброс пароля: письмо → ссылка → новый пароль → вход
10. Переключить язык (ru/kz/en) на всех страницах → UI перерисовывается без перезагрузки
11. Проверить отображение на мобильном (375px)
