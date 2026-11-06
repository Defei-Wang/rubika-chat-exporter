# Rubika Chat Exporter / استخراج‌کننده تاریخچه چت روبیکا وب

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Chrome%20%7C%20Firefox%20%7C%20Edge-brightgreen.svg)]()
[![Safe & Client-Side](https://img.shields.io/badge/Security-Safe%20%26%20Anti--Ban-orange.svg)]()

[**English**](#english) | [**فارسی (Persian)**](#فارسی-persian)

---

<a name="english"></a>
## 🇬🇧 English

A lightweight, 100% client-side tool to export and backup full chat history from **Rubika Web** (`web.rubika.ir`) into a clean, structured `.txt` file.

### ✨ Why this tool?
* **🔒 100% Safe (Zero Ban Risk)**: Operates purely within your existing authenticated browser session via DOM inspection. It does **not** create suspicious login sessions, use reverse-engineered MTProto clients, or send high-frequency bot requests.
* **🧹 Clean & Structured**: Automatically removes advertisements, sidebar channels, duplicated quotes, and redundant text. Output matches standard format: `[YYYY-MM-DD HH:MM] Sender: Message`.
* **⚡ One-Click Operation**: Works directly in Chrome, Firefox, Edge, or Safari Developer Console or via a Bookmarklet.
* **🏷️ Universal & Automatic**: Automatically detects the contact's name and handles date delimiters.

### 🚀 How to Use (Step-by-Step)

1. Open [web.rubika.ir](https://web.rubika.ir) in Google Chrome or any Chromium-based browser.
2. Click on the conversation or chat you want to export.
3. Press **`F12`** (or right-click anywhere and select **Inspect**) to open Developer Tools.
4. Switch to the **Console** tab.
5. Copy the entire contents of [`rubika_exporter.js`](rubika_exporter.js), paste it into the Console, and press **Enter**.
6. A floating badge will appear in the top-right corner showing real-time extraction progress.
7. Once finished (or when you click the badge to stop), a `.txt` file will automatically download to your computer.

---

<a name="فارسی-persian"></a>
## 🇮🇷 فارسی (Persian)

ابزار سبک، متن‌باز و کاملاً سمت کاربر (Client-Side) برای **استخراج، دانلود و پشتیبان‌گیری از تاریخچه پیام‌ها و چت‌های روبیکا وب** (`web.rubika.ir`) به صورت فایل متنی (`.txt`).

روبیکا در حال حاضر امکان رسمی برای خروجی گرفتن از پیام‌ها (Export Chat) ارائه نمی‌دهد. این اسکریپت به شما اجازه می‌دهد تمام پیام‌های گفتگوی مورد نظر خود را با حفظ زمان و نام فرستنده در یک فایل متنی ذخیره کنید.

### ✨ چرا این ابزار امن‌ترین راهکار است؟
* **🔒 بدون خطر بن شدن (Anti-Ban & Safe)**: برخلاف ربات‌ها و کتابخانه‌های غیررسمی (مانند `rubpy`) که نیاز به لاگین مجدد با شماره تلفن و نشست جدید دارند و باعث مسدود شدن حساب می‌شوند، این ابزار **کاملاً داخل مرورگر شما** اجرا می‌شود و رفتار اسکرول انسانی را شبیه‌سازی می‌کند.
* **🧹 خروجی تمیز و مرتب**: متن کانال‌ها، تبلیغات سایدبار و نقل‌قول‌های تکراری حذف شده و پیام‌ها به شکل مرتب `[تاریخ ساعت] نام: پیام` ذخیره می‌شوند.
* **🎯 کاملاً خودکار**: نام مخاطب به صورت خودکار از سربرگ چت خوانده می‌شود و روی هر چتی قابل اجراست.

### 🚀 راهنمای استفاده گام‌به‌گام

1. وارد نسخه وب روبیکا ([web.rubika.ir](https://web.rubika.ir)) شوید.
2. روی چت یا گفتگویی که قصد دانلود تاریخچه آن را دارید کلیک کنید.
3. کلید **`F12`** کیبورد را فشار دهید (یا راست‌کلیک کرده و گزینه **Inspect / بررسی** را بزنید).
4. به تب **Console (کنسول)** بروید.
5. کل کدهای فایل [`rubika_exporter.js`](rubika_exporter.js) را کپی کرده، در کنسول پیست (Paste) کنید و کلید **Enter** را بزنید.
6. یک نشانگر آبی در گوشه بالا-راست صفحه ظاهر می‌شود که تعداد پیام‌های استخراج شده را به صورت زنده نشان می‌دهد.
7. پس از اتمام (یا با کلیک روی نشانگر برای توقف دستی)، فایل متنی حاوی کل پیام‌ها به طور خودکار دانلود خواهد شد.

---

### 📝 کلیدواژه‌ها / Keywords (SEO)
`استخراج چت روبیکا` • `دانلود پیام های روبیکا` • `خروجی گرفتن از روبیکا` • `بکاپ چت روبیکا` • `روبیکا وب` • `ذخیره پیام های روبیکا در کامپیوتر` • `rubika export chat` • `rubika chat exporter` • `web.rubika.ir backup` • `rubika message downloader`

### 📄 License
This project is open-sourced under the [MIT License](LICENSE).
