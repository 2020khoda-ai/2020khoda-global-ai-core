# گزارش ممیزی فنی READ-ONLY — 2020KHODA® GLOBAL AI CORE
تاریخ بررسی: 2026-11-07
شاخه بررسی‌شده: `candidate/supabase-core-2026-11-07`
مخزن: `2020khoda-ai/2020khoda-global-ai-core`

## 1) وضعیت Git
- شاخه Candidate موجود است.
- مقایسه با `main`: شش commit جلوتر، صفر commit عقب‌تر.
- فایل‌های متفاوت در PR شماره 2: فقط سه فایل جدید:
  - `docs/CLOUDFLARE-PREVIEW-DEPLOY-FA.md`
  - `docs/SUPABASE-INTEGRATION-PLAN-FA.md`
  - `supabase/migrations/20261107000100_initial_core.sql`
- فایل `src/index.js` در این PR تغییر نکرده است.
- برای PR شماره 2 هیچ Review ثبت‌شده‌ای برنگشت.
- این بررسی، موفقیت CI یا اجرای تست را اثبات نمی‌کند.

## 2) وضعیت Cloudflare بر اساس تصویر ارائه‌شده
- Worker نمایش‌داده‌شده: `2020khoda-crm`
- محیط: Production
- مخزن متصل‌شده: `2020khoda-ai/2020khoda-global-ai-core`
- شاخه Deployment نمایش‌داده‌شده: `main`
- تعداد Bindings نمایش‌داده‌شده: صفر
- دامنه `ai.2020khoda.com` روی صفحه دیده می‌شود.
- این تصویر اتصال GitHub و وضعیت داشبورد را نشان می‌دهد؛ اتصال Supabase یا دیتابیس Worker را ثابت نمی‌کند.
- هیچ تنظیم Cloudflare یا Production در این ممیزی تغییر داده نشده است.

## 3) وضعیت Worker فعلی
- ورودی: `src/index.js` (2761 خط)
- دیتابیس مورد انتظار: Cloudflare D1 با binding به نام `DB`
- هوش مصنوعی: binding اختیاری `AI`
- در نبود D1، مسیرهای دیتابیس با خطای عدم اتصال مواجه می‌شوند.
- Worker شامل Auth/session، حافظه، chat، lead capture، CRM/admin، referrals، pipeline، conversions، follow-ups و settings است.
- SQLهای فعلی D1-specific هستند؛ از جمله placeholderهای `?`، `PRAGMA table_info`، `rowid` و الگوهای دسترسی D1.
- Migration کامل D1 موردنیاز این Worker در Candidate یافت نشد.

## 4) وضعیت Supabase
- Migration اولیه PostgreSQL برای ۱۰ جدول اصلی در Candidate موجود است.
- بر اساس نتیجه قبلی SQL Editor، همان ۱۰ جدول ایجاد شده و RLS برای همه فعال است.
- Migration اولیه policyهای دسترسی برای نقش‌های `anon` یا `authenticated` ایجاد نمی‌کند.
- ساخت این جدول‌ها، اتصال Worker، Auth end-to-end یا مجوزهای CRM را اثبات نمی‌کند.
- ساختار Supabase فعلی معادل جداول و ستون‌های D1 نیست.

## 5) ریسک‌ها و موانع واقعی
1. **عدم یکپارچگی:** هیچ کد Supabase client/repository در `src/index.js` وجود ندارد؛ Worker همچنان D1-based است.
2. **عدم تطابق Schema:** جدول‌های Supabase فعلی جایگزین مستقیم `users`, `auth_sessions`, `user_memory`, `chat_sessions`, `sales_pipeline`, `conversions`, `guest_sessions`, `guest_messages`, `rate_limits` و `settings` نیستند.
3. **RLS بدون Policy:** فعال بودن RLS بدون policy یعنی دسترسی client-side با نقش‌های عادی به‌صورت پیش‌فرض مسدود است؛ سیاست‌های حداقلی باید با مدل مالکیت/نقش طراحی شوند.
4. **مدل Auth:** Worker فعلی نشست و رمز عبور را در D1 مدیریت می‌کند؛ انتقال به Supabase Auth نیازمند مهاجرت جداگانه و آزمون سازگاری است.
5. **Admin token:** مسیرهای مدیریتی از `X-Admin-Token` و Secret با نام `ADMIN_TOKEN` استفاده می‌کنند؛ کنترل نقش مبتنی بر هویت کاربر و audit کامل باید بازبینی شود.
6. **Health check:** تابع سلامت، حتی در صورت خطای دیتابیس، بدنه‌ای با `ok: true` برمی‌گرداند و فقط فیلد `database` را تغییر می‌دهد؛ این رفتار می‌تواند پایش را گمراه کند.
7. **تست ناکافی:** تست موجود فقط پاسخ امن در نبود D1 را بررسی می‌کند؛ تست اتصال Supabase، RLS، Auth، CRM، AI و Regression وجود ندارد یا در این بررسی اثبات نشده است.
8. **Cloudflare Production:** تصویر، Worker Production با صفر Binding را نشان می‌دهد؛ نباید آن را با Candidate یا Preview جدید یکی دانست.

## 6) وضعیت تست
- بررسی ایستا و خواندن فایل‌ها انجام شد.
- اجرای `npm run check`، `npm test`، تست Integration یا تست واقعی Supabase در این محیط انجام نشده است.
- هیچ نتیجه‌ای به‌عنوان PASS اعلام نمی‌شود.
- هیچ Deploy، Migration جدید روی Supabase، تغییر Secret، Binding، DNS یا Production انجام نشده است.

## 7) مسیر اجرایی امن بعدی
1. ایجاد شاخه Candidate مستقل برای پیاده‌سازی Supabase-native، بدون دست‌کاری `main` یا Worker Production.
2. طراحی repository layer بر پایه Supabase Data API و انتقال تدریجی endpointها؛ عدم تلاش برای ترجمه کور SQLهای D1.
3. طراحی دقیق Auth، نقش‌ها، مالکیت داده و RLS policies؛ استفاده از کلید محرمانه فقط server-side در Cloudflare Secret، هرگز در مرورگر یا GitHub.
4. افزودن rate limiting و audit trail مناسب و اصلاح health semantics.
5. افزودن تست‌های واحد و mock integration و سپس تست واقعی روی پروژه staging جداگانه.
6. انتشار فقط روی Preview مستقل پس از تکمیل Binding/Secret و تأیید تست‌ها.
7. Production فقط پس از تأیید انسانی مستقل.

## تصمیم فعلی
**NO-GO برای Production و NO-GO برای Deploy کردن Worker فعلی بدون D1 سازگار.**
Candidate فعلی صرفاً شامل مستندات و Migration اولیه Supabase است؛ اتصال اجرایی Worker به Supabase هنوز پیاده‌سازی نشده است.
