# گزارش ممیزی و آمادگی انتشار — 2020KHODA GLOBAL AI CORE

**تاریخ ممیزی:** 2026-11-14  
**شاخه:** `candidate/release-readiness-2026-11-14`  
**پایه:** `main` در commit `89bfd177e12db39dfcc52fcbd91a969757956f75`  
**وضعیت:** Candidate فقط؛ انتشار Production مجاز/انجام‌شده نیست.

## 1) دامنه و روش

ممیزی به‌صورت READ-ONLY روی مخزن GitHub و منابع Cloudflare انجام شد. هیچ Worker، Route، DNS، Secret، D1 schema یا Production deployment تغییر نکرد.

مخزن بررسی‌شده:
- `2020khoda-ai/2020khoda-global-ai-core`
- شاخه اصلی: `main`
- فایل ورودی مخزن: `src/index.js`
- نسخه اعلام‌شده در کد: `3.1.0`

## 2) شواهد Cloudflare

Workerهای موجود در حساب:
- `2020khoda-ai-brain-candidate` — برچسب‌های `candidate` و `isolated`
- `2020khoda-root-candidate`
- `2020khoda-global-ai-core` — دارای Routeهای موجود `crm.2020khoda.com/*` و `www.2020khoda.com`

**Worker تولیدی، Routeهای موجود و تنظیمات آن‌ها دست‌نخورده باقی ماندند.**

تنظیمات Worker با نام `2020khoda-ai-brain-candidate` نشان می‌دهد:
- Binding به نام `DB` به D1 با شناسه `9f6edc45-7915-4ee9-88b9-51cdd2007ae0` متصل است.
- Binding به نام `AI` موجود است.
- تاریخ سازگاری `2026-11-05` است.
- Observability و Logs فعال‌اند؛ Traces غیرفعال‌اند.
- در فهرست Worker مقدار `deployment_id` خالی گزارش شده است؛ بنابراین این ممیزی ادعای انتشار نسخه جدید نمی‌کند.

D1 با نام `2020khoda-ai-brain-candidate` در منطقه EU قرار دارد. Query فقط‌خواندنی `sqlite_master` وجود 9 جدول کاربردی/داخلی را نشان داد و Query جدول `ai_schema_migrations` نسخه `001` را تأیید کرد. مقدار `num_tables` در پاسخ فهرست دیتابیس صفر بود، اما Query مستقیم 9 جدول را نشان داد؛ این اختلاف متادیتا باید جداگانه بررسی شود.

## 3) اختلاف مهم بین مخزن GitHub و Worker Candidate

کد `src/index.js` در GitHub (نسخه 3.1.0) با کد Worker در Cloudflare به نام `2020khoda-ai-brain-candidate` یکسان نیست.

Worker Cloudflare فعلی فقط مسیرهای زیر را در کد مشاهده‌شده دارد:
- `GET /health`
- `POST /api/chat`
- `POST /api/memory`
- `GET /api/memory`

در حالی که فایل GitHub شامل Router گسترده‌تری برای حساب کاربری، CRM، Lead، داشبورد، پیگیری و مسیرهای دیگر است. این دو کد نباید بدون تطبیق و آزمون، یک نسخه واحد فرض شوند.

## 4) یافته‌های امنیتی و عملکردی مسدودکننده

### بحرانی برای هرگونه ارائه عمومی Candidate
- مسیر `POST /api/memory` در کد Worker Candidate احراز هویت یا مالکیت `subjectId` را بررسی نمی‌کند؛ در نتیجه امکان ثبت/به‌روزرسانی حافظه با شناسه دلخواه وجود دارد.
- مسیر `GET /api/memory` نیز احراز هویت/مالکیت `subjectId` را بررسی نمی‌کند؛ این مسیر می‌تواند اطلاعات حافظه را در صورت دانستن شناسه افشا کند.
- مسیر `POST /api/chat` مقدار `userId` و `sessionId` را از ورودی کاربر می‌پذیرد و هویت نشست را احراز نمی‌کند؛ جداسازی هویت و مالکیت نشست اثبات نشده است.
- برای این مسیرها Rate Limit و Origin/CSRF guard در کد مشاهده‌شده وجود ندارد.

### نیازمند بررسی بیشتر در مخزن GitHub
- منطق admin با `X-Admin-Token` و حفاظت لایه پلتفرم باید بازبینی شود.
- فرضیات `CF-Connecting-IP` و رفتار fallback باید تست شوند.
- مسیرهای عمومی Lead و Chat باید در برابر سوءاستفاده، replay و درخواست‌های cross-origin ارزیابی شوند.
- تست فعلی فقط پاسخ مورد انتظار هنگام نبودن D1 را بررسی می‌کند؛ تست آن، سازگاری schema، Auth، AI یا End-to-End را اثبات نمی‌کند.

## 5) تصمیم انتشار

**NO-GO برای Production و هرگونه اتصال عمومی/دامنه اصلی.**

این تصمیم به معنی شکست پروژه نیست؛ یعنی هنوز شواهد امنیت و یکپارچگی کافی برای انتشار وجود ندارد.

## 6) اقدامات لازم برای Release Candidate بعدی

1. انتخاب یک منبع حقیقت واحد: تطبیق و تثبیت کد GitHub و Worker Candidate.
2. افزودن احراز هویت واقعی و کنترل مالکیت برای Memory و Session؛ عدم اعتماد به `userId` یا `subjectId` ارسالی از کلاینت.
3. افزودن Origin/CSRF protection، Rate Limit، محدودیت اندازه ورودی و پاسخ‌های خطای امن.
4. تعریف Migrationهای نسخه‌بندی‌شده و بررسی سازگاری همه Queryها با D1 واقعی.
5. افزودن تست‌های واحد و integration برای Chat، Memory، Session، Auth و Lead؛ بدون استفاده از داده واقعی مشتری.
6. اجرای تست‌های ایزوله و بررسی لاگ‌ها؛ عدم ثبت متن خصوصی یا Secret در Logs.
7. ساخت بسته انتشار، checksum، راهنمای Rollback و گزارش شواهد.
8. ارائه Release Candidate برای بازبینی و تأیید انسانی؛ Merge به `main`، تغییر Route/DNS، اتصال Production و Deploy فقط پس از تأیید جداگانه.

## 7) حفاظت از دارایی‌ها

- شاخه `main` و فایل‌های اصلی تغییر نکرده‌اند.
- هیچ migration یا query تغییردهنده اجرا نشده است.
- هیچ Secret خوانده، چاپ یا تغییر داده نشده است.
- هیچ پیام یا عملیات CRM روی مشتری واقعی انجام نشده است.
- هیچ Deploy یا تغییر Production انجام نشده است.

**نتیجه:** زیرساخت Candidate دارای Bindingهای D1 و Workers AI و Migration اولیه است، اما مسیرهای Memory و Chat هنوز برای استفاده عمومی امن و آماده انتشار اثبات نشده‌اند.
