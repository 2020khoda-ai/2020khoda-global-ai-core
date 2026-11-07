# طرح اتصال Supabase — 2020KHODA® GLOBAL AI CORE

**وضعیت:** Candidate / آماده بازبینی؛ هنوز به Production متصل یا منتشر نشده است.

## یافته‌های قطعی از نسخه فعلی
- Worker در `src/index.js` برای تمام عملیات پایگاه داده از D1 binding با نام `env.DB` استفاده می‌کند.
- Worker در نبود D1 با `503 DATABASE_NOT_BOUND` متوقف می‌شود.
- `wrangler.toml` فقط entry point و compatibility date را دارد؛ bindingهای عملیاتی در آن تعریف نشده‌اند.
- تست موجود فقط پاسخ امن در نبود D1 را بررسی می‌کند؛ اتصال واقعی دیتابیس، AI، ورود کاربران و CRM را اثبات نمی‌کند.
- پروژه Supabase در داشبورد Healthy است؛ بررسی SQL قبلی هیچ جدول کسب‌وکاری در schemaهای برنامه نشان نداد و migration ثبت‌شده‌ای نیز گزارش نشده بود.

## Candidate ایجادشده
Migration اولیه در `supabase/migrations/20261107000100_initial_core.sql` طراحی شده است و جداول پایه را برای:
- پروفایل کاربران
- Leads و املاک
- معرف‌ها و معاملات
- گفتگوها و پیام‌ها
- پیگیری‌ها
- تأیید انسانی
- Audit events

تعریف می‌کند. RLS برای همه جداول فعال است و هیچ policy عمومی برای anon یا authenticated ایجاد نشده است.

## مانع فنی مهم
این Migration به‌تنهایی Worker فعلی را به Supabase وصل نمی‌کند. Worker فعلی با SQL و binding اختصاصی D1 نوشته شده است؛ Supabase از PostgreSQL و Data API/PostgREST استفاده می‌کند. بنابراین جایگزینی ساده `env.DB` با URL یا کلید Supabase صحیح نیست و می‌تواند داده‌ها یا احراز هویت را خراب کند.

## مراحل باقی‌مانده پیش از انتشار
1. انتخاب روش اتصال Worker به PostgreSQL: ترجیحاً Supabase Data API از سمت سرور با service-role secret در Cloudflare، یا اتصال PostgreSQL سازگار با محیط Workers.
2. بازنویسی لایه repository/data-access به‌صورت تدریجی و نگه‌داشتن adapter موقت D1 برای rollback.
3. نگاشت دقیق queryها و احراز هویت فعلی به Supabase Auth؛ عدم استفاده از service-role در مرورگر.
4. افزودن تست‌های واقعی با محیط staging جداگانه و داده آزمایشی.
5. بررسی RLS، مجوزها، rate limiting، CSRF/origin، مدیریت PII و audit trail.
6. اجرای migration فقط در پروژه staging پس از تأیید انسانی.
7. Pull Request و گزارش CI؛ سپس تصمیم مستقل برای Production.

## خط قرمز انتشار
هیچ migration روی پروژه اصلی، هیچ secret، binding، DNS یا Worker production تغییر داده نشده است. این شاخه فقط پیشنهاد فنی مستقل است.
