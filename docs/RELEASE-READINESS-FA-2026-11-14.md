# گزارش ممیزی و آمادگی انتشار — 2020KHODA GLOBAL AI CORE

**تاریخ ممیزی:** 2026-11-14  
**شاخه:** `candidate/release-readiness-2026-11-14`  
**پایه:** `main` در commit `89bfd177e12db39dfcc52fcbd91a969757956f75`  
**وضعیت:** Candidate فقط؛ انتشار Production انجام نشده است.

## 1) دامنه

بررسی READ-ONLY مخزن GitHub، فایل ورودی Worker و متادیتای Cloudflare انجام شد. این PR فقط گزارش مستنداتی اضافه می‌کند؛ هیچ منطق اجرایی یا تنظیمات عملیاتی تغییر نکرده است.

## 2) شواهد Cloudflare

Workerهای قابل مشاهده:
- `2020khoda-ai-brain-candidate`
- `2020khoda-root-candidate`
- `2020khoda-global-ai-core` با Routeهای موجود `crm.2020khoda.com/*` و `www.2020khoda.com`

برای Worker با نام `2020khoda-ai-brain-candidate`:
- Binding با نام `DB` به D1 با شناسه `9f6edc45-7915-4ee9-88b9-51cdd2007ae0` متصل است.
- Binding با نام `AI` وجود دارد.
- Compatibility date برابر `2026-11-05` است.
- Observability و Logs فعال‌اند؛ Traces غیرفعال‌اند.
- در پاسخ فهرست Worker مقدار deployment_id خالی بود؛ از این رو این بررسی انتشار نسخه جدید را اثبات نمی‌کند.

D1 با نام `2020khoda-ai-brain-candidate` در منطقه EU قرار دارد. Query فقط‌خواندنی `sqlite_master` وجود 9 جدول را نشان داد و جدول `ai_schema_migrations` نسخه `001` را ثبت کرده است. پاسخ متادیتای فهرست D1 مقدار num_tables=0 نشان می‌داد که با Query مستقیم ناسازگار است؛ این اختلاف باید بررسی شود.

## 3) دو منبع کد متفاوت — نکته اصلی

مخزن GitHub و Worker بارگذاری‌شده در Cloudflare دو artifact متفاوت‌اند و نباید یک نسخه فرض شوند.

### GitHub: `src/index.js` نسخه 3.1.0
در نسخه موجود مخزن:
- `handleMemory` ابتدا `requireUser` را اجرا می‌کند.
- Queryهای حافظه با `user.id` محدود شده‌اند.
- ارجاع `source_session_id` با `getOwnedChat` برای همان کاربر کنترل می‌شود.
- `handleChat` نیز `requireUser` را اجرا می‌کند.
- برای Chat محدودیت نرخ با کلید شناسه کاربر اعمال می‌شود.
- شناسه گفتگوی ارائه‌شده با `getOwnedChat` به مالکیت کاربر مقید می‌شود.

بنابراین ادعای قبلی مبنی بر اینکه کد GitHub در مسیرهای Memory و Chat هیچ احراز هویت یا کنترل مالکیتی ندارد، دقیق نبود و در این نسخه اصلاح می‌شود.

### Cloudflare: Worker با نام `2020khoda-ai-brain-candidate`
کد Worker مشاهده‌شده در Cloudflare با فایل `src/index.js` مخزن همسان نیست و Router محدودتری دارد. بررسی قبلی روی این artifact مسیرهای `/health`، `/api/chat` و `/api/memory` را نشان داده بود. یافته‌های امنیتی مربوط به این Worker کوچک‌تر را نباید به کد GitHub نسبت داد.

**مانع انتشار:** تا زمانی که نسخه منبع حقیقت انتخاب و artifact نهایی دقیقاً با Worker Candidate تطبیق داده نشود، نمی‌توان امنیت یا قابلیت‌های نسخه GitHub را به Worker مستقرشده نسبت داد.

## 4) وضعیت Build و Preview در PR #22

پس از ایجاد PR، GitHub/Cloudflare به‌صورت خودکار چند بررسی Preview اجرا کردند:
- Cloudflare Pages برای پروژه `2020khoda-ai`: Preview موفق گزارش شده است.
- Build مربوط به Worker با نام `2020khoda-global-ai-core`: ناموفق گزارش شده است.
- Build مربوط به Cloudflare Pages پروژه `2020khoda-crm`: ناموفق گزارش شده است.

این وضعیت‌ها مربوط به Preview/CI هستند و نه انتشار Production. لاگ‌های دقیق خطای Build هنوز بررسی نشده‌اند؛ بنابراین علت شکست اعلام نمی‌شود.

## 5) موانع انتشار

1. تعیین منبع حقیقت: انتخاب فایل اجرایی واحد و تطبیق آن با Worker Candidate.
2. بررسی علت شکست Build مربوط به Worker و پروژه CRM از روی لاگ‌های دقیق.
3. آزمون یکپارچه Auth، Memory، Chat و مالکیت داده در محیط ایزوله با کاربرهای آزمایشی.
4. بررسی Origin/CSRF و Rate Limit در مسیرهای عمومی و مدیریتی.
5. اعتبارسنجی Migrationها و سازگاری schema واقعی D1 با Queryهای نسخه انتخابی.
6. افزودن تست‌های integration برای موفقیت و رد دسترسی غیرمجاز؛ تست فعلی فقط حالت نبودن D1 را بررسی می‌کند.
7. اجرای Regression، بازبینی لاگ‌ها و آماده‌سازی Rollback و checksum.

## 6) تصمیم انتشار

**NO-GO برای Production در وضعیت فعلی.**

دلیل: اختلاف artifactها و Buildهای ناموفق Preview حل‌نشده‌اند و آزمون End-to-End/امنیتی کافی ثبت نشده است.

## 7) حفاظت از دارایی‌ها

- `main` تغییر نکرده است.
- Workerها، Routeها، DNS، Secrets و D1 schema تغییر نکرده‌اند.
- هیچ داده مشتری یا عملیات CRM تغییر نکرده است.
- هیچ Production Deploy انجام نشده است.
- این PR مستنداتی است و شامل اصلاح کد اجرایی نیست.

**نتیجه:** Candidate زیرساختی دارای Bindingهای DB و AI و Migration اولیه است؛ اما برای Release Candidate اجرایی، ابتدا باید اختلاف GitHub/Cloudflare و خطاهای Build حل شوند و تست‌های امنیتی و یکپارچه‌سازی ثبت شوند.


## 8) اصلاح خطای 404 در Pages Preview — 2026-11-14

### علت تأییدشده
- پروژه Pages به ریشه مخزن متصل است و Build command / Output directory تعریف نشده است.
- لاگ Deployment با شناسه `4c3a974a-b0d9-4874-beef-a172f41aa39c` نشان داد فایل `wrangler.toml` پیکربندی معتبر Pages نیست و مرحله Build رد شده است.
- در فهرست فایل‌های منتشرشده آن Deployment، `/index.html` وجود نداشت؛ بنابراین ریشه Preview سند ورودی نداشت.
- این مخزن اساساً Worker محور است؛ رابط‌های HTML داخل `src/index.js` از طریق Worker route می‌شوند و Pages بدون Functions، Worker را اجرا نمی‌کند.

### اصلاح Candidate
- فایل مستقل `/index.html` به شاخه Candidate اضافه شد تا ریشه Pages دیگر 404 ناشی از نبودن ورودی نداشته باشد.
- صفحه جدید صریحاً «Candidate Preview Gateway» است و اعلام می‌کند به D1، CRM و Workers AI متصل نیست؛ هیچ قابلیت عملیاتی یا اتصال ساختگی نمایش نمی‌دهد.
- Commit اصلاح: `1ea11650966ef08634d45d31b7db8f4b4762a492`.
- Cloudflare Pages Preview deployment: `73900452-63fd-4014-9b40-d8cd1ea1d370`.
- شواهد API Cloudflare: مراحل queued، initialize، clone_repo، build و deploy همگی `success`؛ فایل `/index.html` در فهرست Deployment ثبت شده است.
- URL تخصیص‌یافته برای Preview: `https://candidate-release-readiness-d6z2.2020khoda-ai.pages.dev`.

### محدوده و محدودیت
این اصلاح فقط ورودی استاتیک Pages Preview را ایجاد می‌کند. اپلیکیشن واقعی Worker، احراز هویت، CRM، D1 و AI هنوز از طریق این Pages Preview اجرا یا End-to-End تست نشده‌اند. برای فعال‌سازی واقعی باید معماری Pages Functions یا Worker route به‌صورت جداگانه طراحی و در محیط Candidate با Bindingهای آزمایشی بررسی شود.

**Production همچنان NO-GO است؛ هیچ Production، DNS، Worker route، Secret یا D1 تغییری نکرده است.**
