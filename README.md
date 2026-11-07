# Rubika Chat Exporter | استخراج‌کننده تاریخچه چت روبیکا وب

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Chrome%20%7C%20Firefox%20%7C%20Edge-brightgreen.svg)]()
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Supported-green.svg)]()
[![Safe & Client-Side](https://img.shields.io/badge/Security-Safe%20%26%20Anti--Ban-orange.svg)]()

[**English**](#english) | [**فارسی (Persian)**](#فارسی-persian)

---

<a name="english"></a>
## 🇬🇧 English

A lightweight, 100% client-side tool to export and backup full chat history from **Rubika Web** (`web.rubika.ir`) into a clean, structured `.txt` file.

### ✨ Highlights
* **⚡ One-Click UserScript (Tampermonkey)**: Install directly into Tampermonkey / Violentmonkey. A native `[📥 Export Chat]` button appears directly inside Rubika Web!
* **🛡️ Zero-Freeze Engine**: Intercepts media elements at `@run-at document-start` to eliminate Chrome's `WebMediaPlayer` resource limits.
* **🧹 Clean & Structured Format**: Automatically strips redundant avatar tags, voice call noise, and quote bubbles into `[YYYY-MM-DD HH:MM] Sender: Message`.
* **🔒 100% Safe (Zero Ban Risk)**: Works within your active browser session without extra SMS verification or secondary login risk.

### 🚀 How to Install & Use

#### Option A: Tampermonkey (Recommended / Easy)
1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension in Chrome, Edge, or Firefox.
2. Click here to install: [**Install rubika_exporter.user.js**](https://raw.githubusercontent.com/Defei-Wang/rubika-chat-exporter/main/rubika_exporter.user.js) *(Click "Install" in Tampermonkey)*.
3. Open [web.rubika.ir](https://web.rubika.ir) and click on any chat.
4. Click the blue **[📥 Export Chat / استخراج چت]** button in the top-right corner.
5. The tool will auto-scroll, prune media, and download your `.txt` file when complete!

#### Option B: Developer Console (No Extensions)
1. Open [web.rubika.ir](https://web.rubika.ir) and open the target chat.
2. Press `F12` to open Developer Tools -> Go to **Console** tab.
3. Ensure the top-left dropdown context is set to **`top`**.
4. Paste the contents of [`rubika_exporter.js`](rubika_exporter.js) and hit Enter.

---

<a name="فارسی-persian"></a>
## 🇮🇷 فارسی (Persian)

ابزار سبک، متن‌باز و کاملاً سمت کاربر (Client-Side) برای **استخراج، دانلود و پشتیبان‌گیری از تاریخچه پیام‌ها و چت‌های روبیکا وب** (`web.rubika.ir`) به صورت فایل متنی (`.txt`).

### ✨ ویژگی‌های برجسته
* **⚡ افزونه تمپرمونکی (Tampermonkey)**: بدون نیاز به باز کردن کنسول و دانش فنی! دکمه آبی‌رنگ `[📥 استخراج چت]` به صورت خودکار به صفحه روبیکا اضافه می‌شود.
* **🛡️ موتور ضد فریز و بهینه‌سازی حافظه**: جلوگیری از کرش مرورگر با مسدودسازی ویدیوها و آزادسازی حافظه به صورت آنی.
* **🧹 خروجی استاندارد و مرتب**: پیام‌ها به شکل `[تاریخ ساعت] فرستنده: متن پیام` ذخیره می‌شوند.
* **🔒 امنیت ۱۰۰٪ و بدون خطر مسدودیت**: بدون نیاز به وارد کردن شماره تلفن و کد پیامکی؛ کاملاً داخل نشست مرورگر شما اجرا می‌شود.

### 🚀 راهنمای نصب و استفاده

#### روش اول: از طریق اکستنشن تمپرمونکی (پیشنهادی و ساده‌ترین روش)
۱. ابتدا افزونه [Tampermonkey](https://www.tampermonkey.net/) را روی مرورگر خود (گوگل کروم، فایرفاکس یا اج) نصب کنید.  
۲. روی لینک زیر کلیک کنید تا اسکریپت باز شود، سپس در صفحه باز شده دکمه **Install (نصب)** را بزنید:  
👉 [**نصب مستقیم اسکریپت rubika_exporter.user.js**](https://raw.githubusercontent.com/Defei-Wang/rubika-chat-exporter/main/rubika_exporter.user.js)  
۳. وارد نسخه وب روبیکا ([web.rubika.ir](https://web.rubika.ir)) شوید و وارد گفتگوی مورد نظر شوید.  
۴. دکمه آبی رنگ **[📥 Export Chat / استخراج چت]** در گوشه بالا-راست صفحه ظاهر می‌شود. روی آن کلیک کنید.  
۵. برنامه پیام‌ها را استخراج کرده و در پایان فایل متنی را دانلود می‌کند.

#### روش دوم: از طریق کنسول مرورگر (F12)
۱. وارد نسخه وب روبیکا شده و چت مورد نظر را باز کنید.  
۲. کلید `F12` را زده و به تب **Console** بروید.  
۳. مطمئن شوید در گوشه بالا-چپ کنسول، گزینه روی **`top`** باشد.  
۴. کدهای فایل [`rubika_exporter.js`](rubika_exporter.js) را کپی کرده، در کنسول پیست کنید و Enter بزنید.

---

### 📄 License
This project is open-sourced under the [MIT License](LICENSE).
