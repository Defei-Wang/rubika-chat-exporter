// ==UserScript==
// @name         Rubika Chat Exporter (Fast & Safe) | استخراج چت روبیکا
// @namespace    https://github.com/Defei-Wang/rubika-chat-exporter
// @version      2.1.0
// @description  Export complete chat history from Rubika Web into a clean text file with total media suppression, zero freeze, and live speed meter.
// @description:fa استخراج و دانلود کامل تاریخچه پیام‌های روبیکا وب به صورت فایل متنی مرتب و سریع بدون افت سرعت.
// @author       Defei Wang
// @match        https://web.rubika.ir/*
// @icon         https://web.rubika.ir/favicon.ico
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 1. Hardcore Media Interception (Prevents ANY video, audio, or canvas from mounting)
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

    // 2. Comprehensive CSS: Kill all images, GIFs, stickers, canvas, and CSS backgrounds
    const style = document.createElement('style');
    style.id = 'rubika-exporter-styles';
    style.textContent = `
        /* Complete media suppression */
        img:not(.emoji), 
        canvas, 
        video, 
        audio, 
        .media-photo,
        .media-video,
        .media-round,
        [class*="photo"], 
        [class*="video"], 
        [class*="gif"], 
        [class*="sticker"],
        [class*="media-container"],
        [style*="background-image"]:not(.emoji) { 
            display: none !important; 
            background-image: none !important; 
            animation: none !important; 
            transition: none !important;
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

    // 3. Add Floating UI once DOM is ready
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

    function startExport() {
        const btn = document.getElementById('rubika-app-btn');
        if (btn) btn.remove();

        const chatScrollEl = Array.from(document.querySelectorAll('.scrollable-y, .bubbles-inner, .bubbles'))
            .find(el => el.querySelector('.bubble') && el.scrollHeight > el.clientHeight);

        if (!chatScrollEl) {
            alert("⚠️ Please open a chat window first! / لطفاً ابتدا پنجره چت را باز کنید.");
            initUI();
            return;
        }

        const store = new Map();
        let pendingDateMids = new Set();
        let currentDate = "Scanning...";
        let isRunning = true;

        const partnerEl = document.querySelector('.top .peer-title, .chat-info .name, .user-title, .chat-title');
        const partnerName = partnerEl?.textContent?.trim() || "Contact";
        const myName = "You";

        // Floating Status Badge
        const badge = document.createElement('div');
        badge.id = 'rubika-app-badge';
        document.body.appendChild(badge);

        let lastTime = performance.now();
        let lastCount = 0;
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
                <div style="font-size: 10px; color: #38bdf8; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">
                    👉 Click to Stop & Download TXT / برای توقف و دانلود کلیک کنید
                </div>
            `;
        }

        function finishDownload() {
            isRunning = false;
            badge.innerHTML = `<b style="color:#4ade80;">✅ Saved ${store.size} msgs! Downloading...</b>`;
            badge.style.borderColor = "#4ade80";

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
            a.download = `rubika_chat_${cleanName}_${store.size}_msgs.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

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
            // Strip any remaining media or canvas
            chatScrollEl.querySelectorAll('video, audio, canvas').forEach(el => el.remove());
            chatScrollEl.querySelectorAll('.bubble img:not(.emoji)').forEach(img => {
                img.removeAttribute('src');
                img.removeAttribute('srcset');
            });

            let bubbles = Array.from(chatScrollEl.querySelectorAll('.bubble'));
            let newFound = 0;
            let activeDate = "";

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
                        store.set(b.dataset.mid, `[${activeDate} ${old.slice(1)}`);
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
                    if (!activeDate) pendingDateMids.add(mid);
                    newFound++;
                }
                b.dataset.extracted = activeDate ? 'full' : 'partial';
            });

            if (activeDate && pendingDateMids.size > 0) {
                for (let id of pendingDateMids) {
                    let l = store.get(id);
                    if (l && !/^\[\d{4}-\d{2}-\d{2}/.test(l)) store.set(id, `[${activeDate} ${l.slice(1)}`);
                }
                pendingDateMids.clear();
            }

            if (bubbles.length > 60) {
                bubbles.slice(40).forEach(b => { if (!b.classList.contains('service') && b.dataset.extracted) b.remove(); });
            }

            return { newFound, domCount: chatScrollEl.querySelectorAll('.bubble').length };
        }

        // Execution Loop
        (async function loop() {
            let stuck = 0;
            while (isRunning) {
                let { newFound, domCount } = scrapeDOM();
                renderBadge(domCount);

                chatScrollEl.scrollTop = 0;
                chatScrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));

                await new Promise(r => setTimeout(r, 380));
                let after = scrapeDOM();

                if (newFound > 0 || after.newFound > 0) {
                    stuck = 0;
                    chatScrollEl.scrollTop = 80;
                } else {
                    stuck++;
                    chatScrollEl.scrollTop = 120;
                    await new Promise(r => setTimeout(r, 150));
                    chatScrollEl.scrollTop = 0;
                    if (stuck >= 15) {
                        console.log("Reached top of chat.");
                        break;
                    }
                }
            }
            if (isRunning) finishDownload();
        })();
    }
})();
