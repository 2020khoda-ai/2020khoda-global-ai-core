# دروازه اتصال Cloudflare — بدون Deploy Production

این مراحل صرفاً برای اتصال مخزن و آماده‌سازی Preview هستند.

1. مخزن GitHub را Private نگه دارید.
2. ابتدا یک Worker/Preview غیرتولیدی متصل کنید؛ دامنه اصلی را متصل نکنید.
3. Entry point: `src/index.js`.
4. قبل از اجرای برنامه، وجود و ساختار D1 را با migrationهای واقعی تطبیق دهید.
5. Binding مورد انتظار Worker: `DB` برای D1 و در صورت استفاده `AI` برای Workers AI.
6. Secretها فقط در Cloudflare تنظیم شوند؛ در Git قرار نگیرند.
7. ابتدا build و syntax check؛ سپس تست‌های D1 و API در محیط غیرتولیدی.
8. هرگونه Deploy عمومی، اتصال دامنه، DNS یا تغییر Production نیازمند تأیید صریح جداگانه است.

Rollback: نسخه/Deployment قبلی Cloudflare را حفظ کنید و در صورت خطا به آخرین نسخه تأییدشده برگردید. هیچ migration مخربی اجرا نکنید.
