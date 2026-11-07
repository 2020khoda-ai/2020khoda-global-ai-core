# راهنمای انتشار کنترل‌شده Cloudflare — 2020KHODA® GLOBAL AI CORE

**وضعیت:** راهنمای Candidate؛ هیچ تغییری در Production انجام نشده است.

## مشخصات قطعی نسخه
- Repository: `2020khoda-ai/2020khoda-global-ai-core`
- Branch: `candidate/supabase-core-2026-11-07`
- Worker entry point: `src/index.js`
- Wrangler config: `wrangler.toml`
- Worker name: `2020khoda-global-ai-core`
- Binding اجباری فعلی: D1 با نام دقیق `DB`
- Binding اختیاری برای AI: Workers AI با نام دقیق `AI`

## نکته مسدودکننده پیش از Deploy
این Worker فعلی از D1 استفاده می‌کند، نه Supabase. کد به جدول‌هایی مانند `users`, `auth_sessions`, `user_memory`, `chat_sessions`, `messages`, `leads`, `sales_pipeline`, `referrals`, `conversions`, `follow_ups`, `guest_sessions`, `guest_messages`, `rate_limits` و `settings` وابسته است.

در مخزن، Migration کامل D1 برای این جدول‌ها پیدا نشد. Migration موجود Supabase ساختار PostgreSQL جداگانه‌ای دارد و جایگزین D1 نیست. بنابراین فقط در صورتی Preview Deploy انجام شود که یک D1 غیرProduction با تمام جدول‌ها و ستون‌های سازگار از قبل آماده باشد. در غیر این صورت Deploy فعلاً متوقف بماند؛ Worker بدون binding پاسخ 503 می‌دهد و با binding ناقص نیز مسیرهای دیتابیس خطا می‌دهند.

## تنظیم Git Integration در Cloudflare (فقط Preview)
1. Cloudflare Dashboard → Workers & Pages → Create → Connect to Git.
2. Repository را انتخاب کنید: `2020khoda-ai/2020khoda-global-ai-core`.
3. Branch را دقیقاً روی `candidate/supabase-core-2026-11-07` قرار دهید؛ نه `main`.
4. Worker name: `2020khoda-global-ai-core-preview` (محیط Preview جدا از Production).
5. Build command خالی؛ Deploy command: `npx wrangler deploy`.
6. در Settings → Bindings، فقط D1 سازگارِ غیرProduction را با Variable name دقیق `DB` متصل کنید.
7. در صورت استفاده از Workers AI، binding نوع Workers AI با Variable name دقیق `AI` اضافه شود.
8. هیچ دامنه Production، Route عمومی اصلی، DNS یا اتصال کاربری واقعی به Preview متصل نشود.

## Secrets
- هیچ Secret در GitHub، فایل تنظیمات، کد مرورگر یا پیام چت قرار نگیرد.
- `ADMIN_TOKEN` در README به‌عنوان تنظیم Cloudflare Secret ذکر شده؛ پیش از فعال‌سازی باید مسیرهای مدیریتی و روش احراز هویت آن جداگانه بازبینی شوند.
- کلید Supabase service-role را به این Worker فعلی اضافه نکنید؛ کد فعلی هنوز از Supabase استفاده نمی‌کند.

## تصمیم انتشار
- Preview فقط پس از آماده بودن D1 سازگار مجاز است.
- این راهنما مجوز Production Deploy، اتصال دامنه اصلی، تغییر DNS، جایگزینی دیتابیس یا فعال‌سازی Secrets نیست.
- برای مهاجرت به Supabase باید data-access/auth لایه Worker به‌صورت جداگانه و سازگار بازطراحی شود؛ صرفاً افزودن URL و کلید کافی نیست.
