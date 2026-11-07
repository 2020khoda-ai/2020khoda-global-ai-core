# طرح اتصال Supabase — 2020KHODA® GLOBAL AI CORE

**وضعیت:** Candidate / زیرساخت Supabase اولیه ساخته و از نظر وجود جدول‌ها و فعال بودن RLS تأیید شده؛ اتصال Worker و انتشار Production انجام نشده است.

## وضعیت تأییدشده Supabase
در پروژه Supabase، هر ۱۰ جدول زیر ایجاد شده‌اند و RLS برای همه فعال است:
- profiles
- leads
- properties
- referrals
- deals
- conversations
- messages
- follow_ups
- human_approvals
- audit_events

این تأیید فقط وجود جدول‌ها و فعال بودن RLS را ثابت می‌کند؛ اتصال Worker، مجوزهای عملیاتی، احراز هویت end-to-end و عملکرد CRM را ثابت نمی‌کند. هیچ policy عمومی anon/authenticated در Migration اولیه تعریف نشده است.

## وضعیت واقعی Worker
- ورودی Worker: `src/index.js`
- پایگاه داده فعلی Worker: Cloudflare D1 از طریق `env.DB`
- در نبود D1، Worker پاسخ `503 DATABASE_NOT_BOUND` می‌دهد.
- Worker فعلی از جدول‌های D1 دیگری نیز استفاده می‌کند؛ از جمله `users`, `auth_sessions`, `user_memory`, `chat_sessions`, `messages`, `leads`, `sales_pipeline`, `referrals`, `conversions`, `follow_ups`, `guest_sessions`, `guest_messages`, `rate_limits` و `settings`.
- در Candidate، Migration کامل و سازگار D1 برای این جداول یافت نشد.
- تست موجود صرفاً پاسخ امن در نبود D1 را بررسی می‌کند؛ آن را نباید تست اتصال یا آمادگی Production تلقی کرد.

## مانع یکپارچه‌سازی
Migration Supabase، ساختار PostgreSQL جداگانه‌ای فراهم می‌کند و معادل schema فعلی D1 نیست. جایگزینی مستقیم `env.DB` با URL یا کلید Supabase صحیح نیست؛ syntax کوئری‌ها، مدل احراز هویت، sessionها، rate limiting و روابط داده باید بازطراحی شوند.

## مسیر اجرایی پیشنهادی
1. برای Preview مستقل، فقط از D1 غیرProduction با schema کاملاً سازگار استفاده شود؛ اگر چنین D1 موجود نیست، Worker فعلی را Deploy نکنید.
2. مسیر مهاجرت به Supabase با adapter مستقل و تدریجی برای data-access و auth طراحی شود.
3. دسترسی Supabase فقط server-side و با Secret مدیریت‌شده در Cloudflare باشد؛ service-role هرگز در مرورگر، GitHub یا فایل‌های عمومی قرار نگیرد.
4. مدل‌های فعلی users/auth_sessions و سایر جدول‌های D1 با profiles و ساختارهای Supabase نگاشت و سازگاری داده بررسی شود.
5. پس از تکمیل مهاجرت، Preview مستقل و سپس ارزیابی جداگانه Production انجام شود.

## وضعیت تغییرات و انتشار
- Migration اولیه Supabase در Candidate موجود است و طبق نتیجه SQL Editor، ۱۰ جدول آن ساخته شده و RLS فعال است.
- هیچ اتصال Worker به Supabase در این Candidate پیاده‌سازی یا تأیید نشده است.
- هیچ Secret، D1 binding، DNS، دامنه Production یا Worker Production از طریق این تغییرات دست‌کاری نشده است.
- Candidate مستقل از `main` نگه داشته شده است.

**تصمیم فعلی:** NO-GO برای Production. Preview فقط در صورت وجود D1 غیرProduction با schema سازگار و binding با نام `DB` قابل انجام است.
