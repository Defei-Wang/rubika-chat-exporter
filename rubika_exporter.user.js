// ==UserScript==
// @name         Rubika Chat Exporter | استخراج چت روبیکا
// @namespace    https://github.com/Defei-Wang/rubika-chat-exporter
// @version      2.2.1
// @description  Export complete chat history from Rubika Web with hard media blocking, crash-proof vault, and wake-lock.
// @description:fa استخراج و دانلود قطعی تاریخچه چت روبیکا با مسدودسازی واقعی رسانه‌ها و ذخیره‌سازی مطمئن.
// @author       Defei Wang
// @match        https://web.rubika.ir/*
// @icon         https://web.rubika.ir/favicon.ico
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // =========================================================================
    // 1. HARD MEDIA BLOCKER (彻底切断图像与视频解码管线，绝不渲染具体内容)
    // =========================================================================

    // (A) 拦截 URL.createObjectURL：禁止生成图片与视频 Blob URL
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function(blob) {
        if (blob && blob.type && (blob.type.startsWith('image/') || blob.type.startsWith('video/') || blob.type.startsWith('audio/'))) {
            // 返回一个 1x1 透明 GIF，彻底掐断真实图片的解码
            return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        }
        return origCreateObjectURL.apply(this, arguments);
    };

    // (B) 拦截 HTMLImageElement.prototype.src：阻止向 img 节点注入真实图片地址
    const origImgSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (origImgSrcDescriptor && origImgSrcDescriptor.set) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
            set: function(val) {
                // 如果是 emoji 或系统纯色图，允许；其余聊天中的图片/动图一律清空
                if (typeof val === 'string' && (val.includes('emoji') || val.startsWith('data:image/gif;base64,R0lGODlhAQAB'))) {
                    return origImgSrcDescriptor.set.call(this, val);
                }
                return origImgSrcDescriptor.set.call(this, "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
            },
            get: origImgSrcDescriptor.get,
            configurable: true
        });
    }

    // (C) 彻底拦截 video/audio 节点生成
    const origCreate = document.createElement;
    document.createElement = function(tag, opt) {
        let t = typeof tag === 'string' ? tag.toLowerCase() : '';
        if (t === 'video' || t === 'audio') {
            let fake = origCreate.call(document, 'div');
            fake.play = () => Promise.resolve();
            fake.pause = () => {};
            fake.load = () => {};
            return fake;
        }
        return origCreate.apply(this, arguments);
    };

    HTMLMediaElement.prototype.play = function() { return Promise.resolve(); };

    // (D) 全局注入硬样式：让任何漏网的媒体容器全透明或彻底隐藏
    const style = document.createElement('style');
    style.id = 'rubika-hard-suppress-styles';
    style.textContent = `
        /* 彻底隐藏所有非 emoji 图片、canvas、视频、语音波形 */
        img:not(.emoji), 
        canvas, 
        video, 
        audio, 
        .media-photo,
        .media-video,
        .media-round,
        .bubble-media-wrapper,
        [class*="photo"], 
        [class*="video"], 
        [class*="gif"], 
        [class*="sticker"],
        [class*="media-container"],
        [style*="background-image"]:not(.emoji) { 
            display: none !important; 
            background: none !important;
            background-image: none !important; 
            visibility: hidden !important;
            opacity: 0 !important;
            max-height: 0 !important;
            height: 0 !important;
        }

        #rubika-app-btn {
            position: fixed; top: 12px; right: 18px; z-index: 9999999;
            background: linear-gradient(135deg, #0ea5e9, #2563eb);
            color: #ffffff; padding: 10px 18px; border-radius: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.35); font-weight: bold;
            font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", sans-serif;
            cursor: pointer; border: none; transition: transform 0.2s, box-shadow 0.2s;
            display: flex; align-items: center; gap: 8px; direction: ltr;
        }
        #rubika-app-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,0.45); }
        #rubika-app-badge {
            position: fixed; top: 12px; right: 18px; z-index: 9999999;
            background: #0f172a; color: #f8fafc; padding: 14px 22px;
            border-radius: 12px; box-shadow: 0 6px 30px rgba(0,0,0,0.7);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", sans-serif;
            font-size: 13px; cursor: pointer; border: 1.5px solid #38bdf8;
            direction: ltr; text-align: left; line-height: 1.5;
        }
    `;
    (document.head || document.documentElement).appendChild(style);

    // =========================================================================
    // 2. 本地静默硬盘保险库 (IndexedDB Vault - 崩溃不丢数据，零弹窗骚扰)
    // =========================================================================
    const DB_NAME = "RubikaSafeVault";
    const STORE_NAME = "messages";
    function getDB() {
        return new Promise((resolve) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "id" });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    }

    async function loadVault() {
        const db = await getDB();
        if (!db) return [];
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, "readonly");
                const store = tx.objectStore(STORE_NAME);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            } catch(e) { resolve([]); }
        });
    }

    async function saveVault(items) {
        if (!items || items.length === 0) return;
        const db = await getDB();
        if (!db) return;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);
                for (let it of items) store.put(it);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch(e) { resolve(false); }
        });
    }

    // =========================================================================
    // 3. 操作系统防休眠锁 (Wake Lock API - 阻止电脑待机黑屏)
    // =========================================================================
    let wakeLock = null;
    async function acquireWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log("☕ [Wake Lock Active] System will NOT sleep during export.");
            } catch (err) {}
        }
    }

    function releaseWakeLock() {
        if (wakeLock) {
            wakeLock.release().then(() => { wakeLock = null; });
        }
    }

    // =========================================================================
    // 4. UI 注入与核心抓取控制
    // =========================================================================
    window.addEventListener('DOMContentLoaded', initUI);
    window.addEventListener('load', initUI);

    function initUI() {
        if (document.getElementById('rubika-app-btn') || document.getElementById('rubika-app-badge')) return;
        const btn = document.createElement('button');
        btn.id = 'rubika-app-btn';
        btn.innerHTML = `<span>📥</span> <span>Export Chat / استخراج چت</span>`;
        btn.onclick = startExport;
        document.body.appendChild(btn);
    }

    async function startExport() {
        const btn = document.getElementById('rubika-app-btn');
        if (btn) btn.remove();

        const chatScrollEl = Array.from(document.querySelectorAll('.scrollable-y, .bubbles-inner, .bubbles'))
            .find(el => el.querySelector('.bubble') && el.scrollHeight > el.clientHeight);

        if (!chatScrollEl) {
            alert("⚠️ Please open a chat conversation first! / لطفاً ابتدا صفحه چت را باز کنید.");
            initUI();
            return;
        }

        await acquireWakeLock();

        const store = new Map();
        // 自动断点续传：先从 IndexedDB 硬盘读取上一次存下的全部数据
        const cachedVault = await loadVault();
        for (let item of cachedVault) {
            store.set(item.id, item.line);
        }
        console.log(`📦 Resumed: loaded ${store.size} messages from local vault.`);

        let pendingDateMids = new Set();
        let currentDate = "Scanning...";
        let isRunning = true;
        let lastMonthCheck = "";

        const partnerEl = document.querySelector('.top .peer-title, .chat-info .name, .user-title, .chat-title');
        const partnerName = partnerEl?.textContent?.trim() || "Contact";
        const myName = "You";

        const badge = document.createElement('div');
        badge.id = 'rubika-app-badge';
        document.body.appendChild(badge);

        let lastTime = performance.now();
        let lastCount = store.size;
        let speed = 0;

        function renderBadge(domCount) {
            const now = performance.now();
            const diff = (now - lastTime) / 1000;
            if (diff >= 1.5) {
                speed = Math.max(0, (store.size - lastCount) / diff);
                lastTime = now;
                lastCount = store.size;
            }
            badge.innerHTML = `
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px;">
                    ⚡ <b>Rubika:</b> <span style="color:#38bdf8;">${store.size}</span> msgs
                    <span style="font-size: 11px; color:#4ade80; margin-left: 6px;">[${speed.toFixed(1)} msgs/s]</span>
                </div>
                <div style="font-size: 12px; color: #cbd5e1;">
                    📅 <b>Date:</b> <span style="color:#fde047; font-weight: bold;">${currentDate}</span>
                    <span style="font-size: 10px; color: #94a3b8; margin-left: 4px;">(DOM: ${domCount})</span>
                </div>
                <div style="font-size: 10px; color: #34d399; margin-top: 3px;">
                    ☕ Anti-Sleep Active | 💾 Silent disk backup active
                </div>
                <div style="font-size: 10px; color: #38bdf8; margin-top: 5px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">
                    👉 Click to Stop & Download TXT / برای توقف و دانلود کلیک کنید
                </div>
            `;
        }

        // 规范的文件下载：只在必要时触发，绝不每隔几百条弹窗打扰
        function downloadTxtFile(isMilestone = false) {
            let lines = Array.from(store.values());
            lines.sort((a, b) => {
                let mA = a.match(/^\[(\d{4}-\d{2}-\d{2})?\s*(\d{1,2}:\d{2})?\]/);
                let mB = b.match(/^\[(\d{4}-\d{2}-\d{2})?\s*(\d{1,2}:\d{2})?\]/);
                let sA = `${mA?.[1]||"1970-01-01"} ${(mA?.[2]||"00:00").padStart(5,'0')}`;
                let sB = `${mB?.[1]||"1970-01-01"} ${(mB?.[2]||"00:00").padStart(5,'0')}`;
                return sA.localeCompare(sB);
            });

            let blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            let cleanName = partnerName.replace(/[\/\\?%*:|"<>]/g, '_');
            let suffix = isMilestone ? `MILESTONE_${currentDate}` : `FINAL_${lines.length}_msgs`;
            a.download = `rubika_${cleanName}_${suffix}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function finishDownload() {
            isRunning = false;
            releaseWakeLock();
            badge.innerHTML = `<b style="color:#4ade80;">✅ Saved ${store.size} msgs! Downloading file...</b>`;
            badge.style.borderColor = "#4ade80";

            downloadTxtFile(false);

            setTimeout(() => {
                badge.remove();
                initUI();
            }, 3000);
        }
        badge.onclick = finishDownload;

        function parseDate(txt) {
            let m = txt.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
            if (m) {
                const months = {january:'01', february:'02', march:'03', april:'04', may:'05', june:'06', july:'07', august:'08', september:'09', october:'10', november:'11', december:'12'};
                const mon = months[m[1].toLowerCase()];
                if (mon) return `${m[3]}-${mon}-${m[2].padStart(2, '0')}`;
            }
            return "";
        }

        function scrapeDOM() {
            // 物理移除残留节点
            chatScrollEl.querySelectorAll('video, audio, canvas').forEach(el => el.remove());

            let bubbles = Array.from(chatScrollEl.querySelectorAll('.bubble'));
            let newFound = 0;
            let activeDate = "";
            let newEntriesToVault = [];

            bubbles.forEach(b => {
                if (b.classList.contains('service') || b.classList.contains('is-date')) {
                    let d = parseDate(b.textContent.trim());
                    if (d) { activeDate = d; currentDate = d; }
                    return;
                }

                if (b.dataset.extracted === 'full') return;
                if (b.dataset.extracted === 'partial' && activeDate && b.dataset.mid) {
                    let old = store.get(b.dataset.mid);
                    if (old && old.startsWith('[')) {
                        let updated = `[${activeDate} ${old.slice(1)}`;
                        store.set(b.dataset.mid, updated);
                        newEntriesToVault.push({ id: b.dataset.mid, line: updated });
                        pendingDateMids.delete(b.dataset.mid);
                        b.dataset.extracted = 'full';
                    }
                    return;
                }
                if (b.dataset.extracted === 'partial') return;

                let clone = b.cloneNode(true);
                let timeEl = clone.querySelector('.time, .bubble-time, .time-inner');
                let timeStr = timeEl ? (timeEl.getAttribute('title') || timeEl.textContent.trim()) : "";
                if (timeEl) timeEl.remove();
                clone.querySelectorAll('.reply, .reply-wrapper, [class*="reply"], .avatar').forEach(el => el.remove());

                let isOut = b.classList.contains('is-out') || !!b.closest('.is-out');
                let sender = isOut ? myName : partnerName;

                let rawText = clone.textContent ? clone.textContent.trim() : "";
                if (/Incoming Call|Outgoing Call|تماس/.test(rawText)) {
                    let dur = rawText.match(/\d+:\d+/);
                    rawText = dur ? `<Voice Call: ${dur[0]}>` : `<Voice Call>`;
                } else if (rawText === "GIF" || b.querySelector('video') || b.querySelector('[class*="gif"]')) {
                    rawText = "<Video/GIF>" + (rawText !== "GIF" && rawText ? " " + rawText : "");
                } else if (!rawText && (b.querySelector('img') || b.querySelector('canvas') || b.querySelector('[class*="photo"]'))) {
                    rawText = "<Photo>";
                }

                let cleanMsg = rawText.split('\n').map(l => l.trim()).filter(Boolean).join(' ');
                if (!cleanMsg) return;

                let line = `[${activeDate ? `${activeDate} ${timeStr}`.trim() : timeStr}] ${sender}: ${cleanMsg}`;
                let mid = b.getAttribute('data-mid') || b.id || `${timeStr}_${sender}_${cleanMsg}`;
                b.dataset.mid = mid;

                if (!store.has(mid)) {
                    store.set(mid, line);
                    newEntriesToVault.push({ id: mid, line: line });
                    if (!activeDate) pendingDateMids.add(mid);
                    newFound++;
                }
                b.dataset.extracted = activeDate ? 'full' : 'partial';
            });

            if (activeDate && pendingDateMids.size > 0) {
                for (let id of pendingDateMids) {
                    let l = store.get(id);
                    if (l && !/^\[\d{4}-\d{2}-\d{2}/.test(l)) {
                        let updated = `[${activeDate} ${l.slice(1)}`;
                        store.set(id, updated);
                        newEntriesToVault.push({ id: id, line: updated });
                    }
                }
                pendingDateMids.clear();
            }

            // 静默存入本地硬盘数据库（不弹窗、不卡顿、防丢失）
            if (newEntriesToVault.length > 0) {
                saveVault(newEntriesToVault);
            }

            // 维持轻量 DOM（只留 40~60 个气泡）
            if (bubbles.length > 60) {
                bubbles.slice(40).forEach(b => { if (!b.classList.contains('service') && b.dataset.extracted) b.remove(); });
            }

            // 整月大里程碑备份（比如刚跨入 3月 或 刚跨入 2月 时，才静默下载一次切片保底，绝不频繁弹窗）
            if (currentDate && currentDate.length >= 7) {
                let thisMonth = currentDate.slice(0, 7);
                if (lastMonthCheck && thisMonth !== lastMonthCheck) {
                    downloadTxtFile(true);
                }
                lastMonthCheck = thisMonth;
            }

            return { newFound, domCount: chatScrollEl.querySelectorAll('.bubble').length };
        }

        // Upward Loop
        (async function loop() {
            let stuck = 0;
            while (isRunning) {
                let { newFound, domCount } = scrapeDOM();
                renderBadge(domCount);

                // 抵达 2 月初自动终结并完整下载
                if (currentDate && (currentDate.startsWith('2026-02-0') || currentDate.startsWith('2026-01') || currentDate < '2026-02-08')) {
                    console.log("🎯 Target early Feb reached!");
                    break;
                }

                chatScrollEl.scrollTop = 0;
                chatScrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));

                await new Promise(r => setTimeout(r, 350));
                let after = scrapeDOM();

                if (newFound > 0 || after.newFound > 0) {
                    stuck = 0;
                    chatScrollEl.scrollTop = 80;
                } else {
                    stuck++;
                    chatScrollEl.scrollTop = 120;
                    await new Promise(r => setTimeout(r, 140));
                    chatScrollEl.scrollTop = 0;
                    if (stuck >= 15) {
                        console.log("Reached top of history.");
                        break;
                    }
                }
            }
            if (isRunning) finishDownload();
        })();
    }
})();
