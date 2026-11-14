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

## 4) وضعیت Build و Preview در PR #22 — بازبینی لاگ‌ها

### Cloudflare Pages: `2020khoda-ai`
- آخرین Preview در commit `de82ad00cc20dfd7f0860d626947b1ebd70c7b8b` در 2026-11-14 با وضعیت موفق منتشر شده است.
- مراحل queued، initialize، clone_repo، build و deploy همگی `success` هستند.
- این Preview فقط Gateway استاتیک است و `uses_functions=false`؛ بنابراین موفقیت آن، اجرای Worker یا CRM را اثبات نمی‌کند.

### Cloudflare Pages: `2020khoda-crm`
- آخرین Preview با شناسه `736097f9-858b-4361-b0a5-cc64d924fab4` در مرحله build شکست خورده است؛ مرحله deploy آغاز نشده است.
- لاگ مستقیم Cloudflare علت را تأیید می‌کند: فایل `wrangler.toml` به‌عنوان پیکربندی Pages نامعتبر تشخیص داده شده، چون `pages_build_output_dir` ندارد؛ سپس Cloudflare به تنظیمات پروژه برگشته و متن کامل دستورالعمل 2020KHODA را به‌عنوان فرمان Shell اجرا کرده است.
- Shell خطای `/bin/sh: 1: 2020KHODA.ai®: not found` و کد خروج `127` ثبت کرده است.
- تنظیمات فعلی پروژه نیز `build_command` را برابر همان متن طولانی و `destination_dir` را `2020khoda.ai` نشان می‌دهد. در شاخه Candidate فایل `2020khoda.ai/index.html` وجود ندارد و `package.json` فقط اسکریپت‌های `check` و `test` دارد؛ بنابراین تعیین مسیر خروجی صحیح نیازمند تصمیم معماری است، نه صرفاً پاک‌کردن فرمان اشتباه.
- این پروژه دامنه‌های `2020khoda.com` و `www.2020khoda.com` را در پیکربندی خود فهرست می‌کند؛ این ممیزی هیچ تغییری در دامنه یا Deployment تولیدی نداده است.

### Cloudflare Workers Builds
- آخرین Build قابل مشاهده برای Worker `2020khoda-global-ai-core` در 2026-11-07 روی شاخه `main` و commit پایه `89bfd177e12db39dfcc52fcbd91a969757956f75` با نتیجه `success` ثبت شده است.
- Build ناموفق تاریخی با نتیجه `fail` مربوط به 2026-10-14، مخزن قدیمی `2020khda.ai` و فرمان متنی نامرتبط در مسیر `/2020khoda.ai` است؛ این رویداد مربوط به PR فعلی یا commit Candidate نیست.
- برای commit فعلی PR، Build جدید Worker در فهرست Buildها ثبت نشده است؛ Trigger موجود فقط شاخه `main` را شامل می‌شود. برای Worker `2020khoda-ai-brain-candidate` نیز رکوردی در Cloudflare Workers Builds موجود نیست. بنابراین نسبت‌دادن یک شکست Build جاری به Worker Candidate با شواهد فعلی تأیید نمی‌شود.

همه موارد بالا Preview/CI هستند و به‌معنای انتشار Production نیستند.

## 5) موانع انتشار

1. تعیین منبع حقیقت: انتخاب فایل اجرایی واحد و تطبیق آن با Worker Candidate.
2. رفع تنظیم نادرست Build پروژه CRM در یک محیط Candidate مستقل و تعیین Output Directory واقعی؛ سپس افزودن Trigger/Build قابل‌ردیابی برای شاخه Candidate Worker، بدون تغییر Trigger تولیدی.
3. آزمون یکپارچه Auth، Memory، Chat و مالکیت داده در محیط ایزوله با کاربرهای آزمایشی.
4. بررسی Origin/CSRF و Rate Limit در مسیرهای عمومی و مدیریتی.
5. اعتبارسنجی Migrationها و سازگاری schema واقعی D1 با Queryهای نسخه انتخابی.
6. افزودن تست‌های integration برای موفقیت و رد دسترسی غیرمجاز؛ تست فعلی فقط حالت نبودن D1 را بررسی می‌کند.
7. اجرای Regression، بازبینی لاگ‌ها و آماده‌سازی Rollback و checksum.

## 6) تصمیم انتشار

**NO-GO برای Production در وضعیت فعلی.**

دلیل: Build پروژه CRM همچنان شکست می‌خورد؛ نسخه GitHub با Worker مستقرشده هنوز تطبیق داده نشده؛ برای commit فعلی Candidate تست Build Worker وجود ندارد؛ و آزمون End-to-End/امنیتی کافی ثبت نشده است.

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
