# YAE SHOP — карта проекта

Донат-магазин игровых валют (Genshin, HSR, WuWa, ZZZ, Brawl Stars, Love and Deepspace).
Владелец — Егор (новичок, объяснять пошагово, без жаргона). Домен: **yaeshop.net**.

## Структура (две части)
- **`yae_backend-main/`** — API. FastAPI + SQLAlchemy async + asyncpg, aiogram-бот, Alembic, pydantic_settings.
  Точка входа: `src/main.py`. Бот: `src/support_bot.py` (polling) или вебхук.
- **`yae_front-main/`** — сайт. Статика (HTML/CSS/JS без фреймворков) + `local.py` (раздача + прокси `/api` на бэкенд).

## Куда коммитить (ВАЖНО — раздельные репозитории!)
- Бэкенд → **github.com/WarmYaeShop/yae_backend**
- Фронт → **github.com/WarmYaeShop/yae_front** (там файл `CNAME` для домена — НЕ удалять)
- `.env` в git НЕ коммитить (есть в .gitignore). Передаётся программисту (MoxForever) лично.
- Клоны репозиториев для пуша держу в scratchpad; локальные папки — рабочая копия.

## Запуск локально
1. Postgres: кластер `C:\Users\Егор\yae_pgdata`, порт **5544** (5433 система блокирует!),
   `postgres:yaedev`, БД `yaeshop`. Старт: `pg_ctl -D C:\Users\Егор\yae_pgdata -o "-p 5544" start`
2. БД-схема: `alembic upgrade head` (из `yae_backend-main`). Существующую базу: `alembic stamp head`.
3. Бэкенд: из `yae_backend-main/src` → `python -m uvicorn main:app --port 8001`
4. Фронт: из `yae_front-main` → `python -m uvicorn local:app --port 8000` → сайт на 127.0.0.1:8000
5. Тестировать с **Ctrl+Shift+R** (css/js кэшируются на 5 мин).

## Бэкенд: где что
- `src/core/config.py` — pydantic_settings (класс Settings + алиасы констант). Все секреты из `.env`.
- `src/core/auth.py` — токены сессий (HMAC, identity = my_code: `t<tg_id>` / `e<hash16>`).
- `src/core/services.py` — бизнес-логика: цены, рефералка, тиры, deliver_order, confirm_payment, SMTP.
- `src/core/site_settings.py` — контент сайта в таблице `site_settings` (НЕ JSON-файлы).
- `src/database/{models,dao}/` — модели и DAO. DAO-контейнер: `request.state.dao.orders/.tickets/.users/.refs/.email_users/.site_settings/.promo_codes`.
- `src/routers/` — admin, auth, orders, promo, referral, site, telegram (вебхук), tickets.
- `src/bot/` — распиленный бот: `common.py` + `handlers/{start,images,hours,promos,announce,caticons,content,discounts,menu,promocodes,orders}`. Порядок роутеров важен (catch-all тикетов последний).

## Безопасность (уже сделано — не ломать)
- Цена считается на сервере (`calculate_server_price`), клиентскую игнорируем.
- Личность (`my_code`) — только из подписанного токена, не из тела запроса.
- История заказов/тикетов — по токену (401 без него). Нельзя читать чужое.
- Вход через Telegram — проверка подписи HMAC. Antilopay-вебхук — RSA + сверка суммы.
- Бэкенд НЕ монтирует свою папку как статику (там `.env`). Google-ключ — `GOOGLE_SA_JSON` (base64) в `.env`.
- HTML-экранирование пользовательского ввода в ТГ-уведомлениях.
- Осталось (мелкое, не срочное): rate-limit на checkout.

## Бизнес-правила
- Промокоды: создаёт админ в боте `/promocodes` (`КОД | percent/fixed | скидка | макс`). Один код = один раз на клиента (`promo_uses`). Клиент вводит в личном кабинете.
- Рефералка: другу −3% на первый заказ, пригласившему +3% (авто на след. заказ). Баланс скрыт из UI, работает сам.
- Ранги по сумме: Бронза 5к→1%, Золото 10к→2%, Алмаз 50к→3%.
- TEST_MODE=true → заказы без оплаты (сразу в ТГ). Перед боем → false.

## Фронт: особенности
- Качество эффектов: Авто (замер FPS) / Максимум / Средний / Эконом (`setting_fx`, `fx_auto`).
  FPS-важно: `backdrop-filter` на sticky/анимируемых элементах убран (грел CPU на слабых ПК).
- Чистые URL: `/genshin` вместо `/genshin.html` (редиректы в local.py; на nginx — `try_files $uri $uri.html`).
- Корзина сохраняется 3 дня, промокод — `promo_code_applied`. Токен — `session_token`.
- SEO: robots.txt, sitemap.xml, JSON-LD. Яндекс.Метрика — включается в боте (📊, `metrika_id`).

## Известная проблема
- Фронт на **GitHub Pages** блокируется в РФ (IP гитхаба под РКН) → не открывается без VPN.
  Решение: перенести фронт на тот же VPS что и бэкенд (nginx). На Pages ещё и `local.py`/прокси не работают.

## Стиль работы
- Пуш обычно во ВСЕ три репо (монорепо yaeshop + WarmYaeShop/yae_front + yae_backend). Перед пушем проверять что `.env` не в индексе.
- Беречь красоту сайта при оптимизациях. Экономить токены.
