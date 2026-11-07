# گزارش ممیزی فنی READ-ONLY — 2020KHODA® GLOBAL AI CORE
تاریخ بررسی: 2026-11-07
شاخه بررسی‌شده: `candidate/supabase-core-2026-11-07`
مخزن: `2020khoda-ai/2020khoda-global-ai-core`
مبنای ممیزی: خواندن زنده GitHub و بررسی ایستای فایل‌ها؛ بدون اجرای کد یا تغییر سرویس‌های خارجی.

## 1) وضعیت Git و Pull Request
- مخزن موجود و قابل خواندن است؛ شاخه پیش‌فرض `main` است.
- مقایسه زنده: Candidate هفت commit جلوتر و صفر commit عقب‌تر از `main` است.
- Base SHA: `89bfd177e12db39dfcc52fcbd91a969757956f75`
- Candidate HEAD / PR head SHA: `0482f2eef8a20755077dfdc47ae902ea844626de`
- PR شماره 2 باز، Draft و Merge نشده است: https://github.com/2020khoda-ai/2020khoda-global-ai-core/pull/2
- PR شامل چهار فایل افزوده‌شده است:
  - `docs/CLOUDFLARE-PREVIEW-DEPLOY-FA.md`
  - `docs/READ-ONLY-AUDIT-2026-11-07-FA.md`
  - `docs/SUPABASE-INTEGRATION-PLAN-FA.md`
  - `supabase/migrations/20261107000100_initial_core.sql`
- `src/index.js` در این PR تغییر نکرده است.
- هیچ Workflow run مرتبط با HEAD از ابزار GitHub برنگشت؛ این به معنی PASS بودن CI نیست.
- وضعیت Commit Status نیز هیچ status check ثبت‌شده‌ای برنگرداند؛ تست موفق اثبات نشده است.

## 2) وضعیت Cloudflare
- سوابق تصویری ارائه‌شده قبلی نشان می‌داد Worker با نام `2020khoda-crm` در Production، متصل به GitHub و branch برابر `main` بوده و صفر Binding نمایش داده شده است.
- این داده، گزارش تاریخی مبتنی بر تصویر است؛ در این نوبت API زنده Cloudflare در ابزارهای متصل موجود نبود و وضعیت فعلی حساب/Worker مستقیماً بررسی نشد.
- Worker فعلی در Candidate نام `2020khoda-global-ai-core` دارد؛ راهنمای Preview نام جداگانه `2020khoda-global-ai-core-preview` را پیشنهاد می‌کند.
- هیچ تنظیم Cloudflare، Binding، Secret، DNS، Route یا Deploy در این ممیزی تغییر نکرده است.

## 3) وضعیت واقعی Worker
- فایل `src/index.js`: 2,761 خط؛ 77,415 کاراکتر در نسخه خوانده‌شده.
- ورودی Worker از `env.DB` به‌عنوان Cloudflare D1 استفاده می‌کند.
- نبود `env.DB` در ورودی Worker پاسخ `503 DATABASE_NOT_BOUND` ایجاد می‌کند.
- توابع DB از الگوی D1 یعنی `prepare().bind().first/all/run()` استفاده می‌کنند.
- بررسی ایستا حداقل وابستگی به این جدول‌ها را نشان داد:
  `users`, `auth_sessions`, `user_memory`, `chat_sessions`, `messages`, `leads`, `sales_pipeline`, `referrals`, `conversions`, `follow_ups`, `guest_sessions`, `guest_messages`, `rate_limits`, `settings`.
- در کد، 192 علامت `?`، یک `PRAGMA` و چهار ارجاع `rowid` یافت شد؛ این شواهد با SQL/رفتار D1 سازگار است و جایگزینی مستقیم با Supabase/PostgREST را رد می‌کند.
- هیچ Supabase client یا repository layer در Worker فعلی مشاهده نشد.
- Workers AI از `env.AI` به‌عنوان Binding اختیاری استفاده می‌کند.

## 4) وضعیت Supabase و شکاف Schema
- Migration Candidate ده جدول PostgreSQL را تعریف می‌کند:
  `profiles`, `leads`, `properties`, `referrals`, `deals`, `conversations`, `messages`, `follow_ups`, `human_approvals`, `audit_events`.
- طبق نتیجه قبلی SQL Editor که در سوابق پروژه ثبت شده، این ده جدول ایجاد و RLS برای همه فعال شده است. این نوبت ابزار Supabase برای بررسی زنده پروژه در دسترس نبود؛ بنابراین وضعیت فعلی دیتابیس از راه دور دوباره query نشد.
- Migration برای نقش‌های `anon` و `authenticated` policy ایجاد نمی‌کند. با RLS فعال و بدون policy، دسترسی این نقش‌ها به داده‌ها به‌صورت پیش‌فرض مسدود خواهد بود.
- جدول‌های لازم Worker مانند `auth_sessions`, `user_memory`, `chat_sessions`, `sales_pipeline`, `conversions`, `guest_sessions`, `guest_messages`, `rate_limits` و `settings` در Migration فعلی وجود ندارند.
- بنابراین Supabase schema فعلی جایگزین schema موردنیاز Worker نیست و اتصال اجرایی برقرار نشده است.

## 5) یافته‌های امنیتی و قابلیت اطمینان
1. **عدم یکپارچگی داده:** Worker همچنان D1-based است و Supabase Data Access Layer ندارد.
2. **مهاجرت Auth:** Worker نشست و احراز هویت را با جدول‌های D1 مدیریت می‌کند؛ انتقال به Supabase Auth نیازمند طرح مهاجرت هویت، نشست، انقضا، خروج و بازیابی حساب است.
3. **Admin token:** مسیرهای مدیریتی از Header به نام `X-Admin-Token` و مقدار Secret به نام `ADMIN_TOKEN` استفاده می‌کنند. مدل نقش‌محور مبتنی بر هویت و ممیزی دسترسی باید قبل از بهره‌برداری بازطراحی/بررسی شود.
4. **Health semantics:** تابع `healthStatus` حتی هنگام خطای اتصال دیتابیس مقدار `ok: true` می‌دهد و وضعیت دیتابیس را جداگانه `error` گزارش می‌کند؛ مانیتورینگ ممکن است سلامت کلی را اشتباه تفسیر کند.
5. **D1-specific settings:** مسیر تنظیمات از `PRAGMA table_info(settings)` استفاده می‌کند و در Supabase قابل اجرا نیست.
6. **RLS:** فعال بودن RLS بدون سیاست‌های صریح مالکیت/نقش، به‌تنهایی دسترسی عملیاتی CRM را فراهم نمی‌کند.
7. **Audit coverage:** وجود جدول `audit_events` در Migration، ثبت کامل همه عملیات حساس در مسیرهای فعلی Worker را اثبات نمی‌کند.
8. **Preview dependency:** راهنمای موجود Preview را به D1 غیرProduction با schema کامل و سازگار و Binding با نام دقیق `DB` مشروط کرده است. نبود schema معتبر، مانع Deploy ایمن است.

## 6) وضعیت تست و انتشار
- فایل `package.json` فقط دو script دارد: `npm run check` و `npm test`.
- `tests/worker-smoke.test.mjs` فقط پاسخ 503 مورد انتظار در نبود D1 را بررسی می‌کند.
- در این نوبت اجرای Node.js، `npm run check`، `npm test`، تست Integration، تست Auth/RBAC، تست RLS یا تست واقعی Supabase انجام نشد.
- Workflow run و status check موفق برای Candidate مشاهده نشد.
- هیچ Migration جدیدی روی Supabase اجرا نشد.
- هیچ Deploy، تغییر Secret/Binding، DNS، Route یا Production انجام نشد.

## 7) معماری هدف پیشنهادی
- **Source of Truth:** فقط Supabase PostgreSQL.
- **Authentication:** Supabase Auth؛ شناسه کاربر در `profiles.id` با `auth.users.id` مرتبط بماند.
- **Authorization:** نقش‌ها و مجوزهای سمت سرور همراه با RLS مبتنی بر هویت؛ عدم اتکا به مقدار role ارسالی از مرورگر.
- **Cloudflare Worker:** لایه API و Business Logic؛ ارتباط server-side با Supabase Data API از طریق Secret مدیریت‌شده در Cloudflare.
- **AI Core:** از طریق Worker و Binding/سرویس AI، بدون دسترسی مستقیم مدل به کلیدهای دیتابیس.
- **CRM و املاک:** توسعه مدل‌های Lead، Property، Deal، Referral، Conversation، Follow-up، Approval و Audit روی همان PostgreSQL.
- **عدم دوگانگی:** D1 برای داده‌های عملیاتی CRM در معماری نهایی استفاده نشود؛ هر مهاجرت موقت باید فقط ابزار انتقال باشد و برنامه حذف آن مشخص باشد.
- این معماری هدف است، نه وضعیت پیاده‌سازی‌شده.

## 8) مسیر اجرایی امن بعدی
1. تهیه ماتریس کامل تمام جدول‌ها، ستون‌ها، queryها و endpointهای D1 و نگاشت آن‌ها به مدل Supabase.
2. تکمیل طرح PostgreSQL برای قابلیت‌های فعلی و حذف شکاف‌های Auth، Memory، Chat، Rate Limit، Settings و Pipeline.
3. طراحی و بازبینی RLS، نقش‌ها، مالکیت داده و دسترسی Service-side.
4. پیاده‌سازی Supabase repository/data-access layer در شاخه Candidate مستقل؛ عدم ترجمه کور SQLهای D1.
5. مهاجرت Auth و session با حفظ سازگاری و برنامه rollback.
6. اصلاح Health Check و ثبت Audit برای عملیات حساس.
7. افزودن تست‌های واحد، mock، integration و regression؛ سپس اجرای تست واقعی روی محیط staging مجزا.
8. Preview مستقل فقط پس از آماده بودن schema، Secret و تست‌ها.
9. Production فقط پس از گزارش GO و تأیید انسانی مستقل.

## تصمیم فعلی
**NO-GO برای Production و NO-GO برای Deploy کردن Worker فعلی بدون D1 سازگار.**
Candidate فعلی هنوز Worker را به Supabase متصل نمی‌کند. اولویت توسعه بعدی، ماتریس کامل D1-to-Postgres و تکمیل schema هدف است؛ پس از آن پیاده‌سازی adapter و Auth انجام شود.
