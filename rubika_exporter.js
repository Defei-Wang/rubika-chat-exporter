/**
 * Rubika Full-Timeline Exporter V12 (Fast-Network, Zero-Media-Timeout & Strict Time Sort)
 * استخراج‌کننده فوق‌سریع و بدون توقف تاریخچه چت روبیکا با مسدودسازی هوشمند ترافیک رسانه
 * 
 * Languages: English & فارسی (Persian)
 * License: MIT
 */
(async function exportRubikaV12() {
    console.clear();
    console.log("🚀 [Rubika V12] Initializing Fast Network & Zero-Timeout Mode / در حال راه‌اندازی حالت فوق‌سریع...");

    // 1. Instantly fail GetFile.ashx / media requests so they don't block the 6-connection HTTP pool or freeze on 5x retries
    // مسدودسازی فوری درخواست‌های فایل‌های رسانه‌ای سنگین جهت خالی ماندن خطوط اتصال برای بارگذاری متن پیام‌ها
    const _open = XMLHttpRequest.prototype.open;
    const _send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (m, url, ...rest) {
        this.__blk = String(url).includes('GetFile.ashx') || String(url).includes('/stream/');
        return _open.call(this, m, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function (...a) {
        if (this.__blk) {
            setTimeout(() => {
                try {
                    this.status = 500;
                    this.dispatchEvent(new ProgressEvent('error'));
                } catch(e) {}
            }, 0);
            return;
        }
        return _send.apply(this, a);
    };

    // 2. Suppress Angular's async checkMedia/addPreload2 appendChild errors on pruned DOM nodes
    const origErrorHandler = window.onerror;
    window.onerror = function(msg) {
        if (typeof msg === 'string' && (msg.includes('appendChild') || msg.includes('GetFile') || msg.includes('timeout'))) return true;
        return origErrorHandler ? origErrorHandler.apply(this, arguments) : false;
    };

    // 3. Hide media & disable heavy animations via CSS
    if (!document.getElementById('rubika-kill-media')) {
        const s = document.createElement('style');
        s.id = 'rubika-kill-media';
        s.textContent = `
            img:not(.emoji), video, audio, canvas, [class*="gif"], [class*="sticker"], .avatar { 
                display: none !important; 
                animation: none !important;
                transition: none !important;
            }
        `;
        document.head.appendChild(s);
    }

    // 4. Prevent media elements from auto-playing
    HTMLMediaElement.prototype.play = function() {
        this.muted = true;
        this.pause();
        return Promise.resolve();
    };

    // 5. Strip media sources safely
    function purgeAndMarkMedia(root = document) {
        root.querySelectorAll('video, audio').forEach(el => {
            try {
                const bubble = el.closest('.bubble');
                if (bubble && !bubble.dataset.mediaType) {
                    bubble.dataset.mediaType = el.tagName.toLowerCase() === 'video' ? 'video' : 'audio';
                }
                el.pause();
                el.removeAttribute('src');
                el.load();
                el.remove();
            } catch (e) {}
        });

        root.querySelectorAll('.bubble img:not(.emoji)').forEach(img => {
            try {
                const bubble = img.closest('.bubble');
                if (bubble && !bubble.dataset.mediaType) {
                    bubble.dataset.mediaType = 'photo';
                }
                if (img.hasAttribute('src')) img.removeAttribute('src');
                if (img.hasAttribute('srcset')) img.removeAttribute('srcset');
            } catch (e) {}
        });
    }

    // 6. Locate active chat scrollable container
    const chatScrollEl = (function() {
        const scrollables = Array.from(document.querySelectorAll('div.scrollable-y, div.bubbles-inner, .bubbles, .sidebar-slider-item'));
        const valid = scrollables.filter(el => el.querySelector('.bubble') && el.scrollHeight > el.clientHeight);
        if (valid.length > 0) return valid[valid.length - 1];
        return scrollables.find(el => el.querySelector('.bubble'));
    })();

    if (!chatScrollEl) {
        alert("⚠️ Chat window not found! Please open a chat conversation first.\n\n⚠️ پنجره چت یافت نشد! لطفاً ابتدا یک چت را باز کنید.");
        return;
    }

    const partnerNameEl = document.querySelector('.top .peer-title, .chat-info .name, .user-title, .chat-title');
    const partnerName = partnerNameEl?.textContent?.trim() || "Contact";
    const myName = "You";

    // 7. Auto-merge ALL historical keys (v9, v10, v11, etc.) into unified map
    // ترکیب و بازیابی خودکار تمامی نسخه‌های قبلی ذخیره شده در مرورگر
    let collectedMessages = new Map();
    try {
        let allKeys = Object.keys(localStorage).filter(k => k.includes('rubika_saved_chat'));
        allKeys.forEach(k => {
            try {
                let data = JSON.parse(localStorage.getItem(k) || "{}");
                for (const [id, val] of Object.entries(data)) {
                    collectedMessages.set(id, val);
                }
            } catch(e) {}
        });
    } catch(e) {}

    const STORAGE_KEY = `rubika_saved_chat_v10_${partnerName}`;
    let pendingDateMids = new Set();
    let unsavedCount = 0;

    // 8. Floating Bilingual Status UI
    let badge = document.getElementById('rubika-turbo-badge') || document.createElement('div');
    badge.id = 'rubika-turbo-badge';
    badge.style.cssText = `
        position: fixed; top: 15px; right: 20px; z-index: 999999;
        background: #0f172a; color: #f8fafc; padding: 14px 22px;
        border-radius: 12px; box-shadow: 0 6px 30px rgba(0,0,0,0.65);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", Tahoma, sans-serif;
        font-size: 13px; cursor: pointer; border: 1.5px solid #38bdf8;
        direction: ltr; text-align: left; line-height: 1.5;
        transition: border-color 0.3s ease;
    `;
    document.body.appendChild(badge);

    let isRunning = true;
    function updateBadge(enStatus, faStatus, domCount = 0) {
        badge.innerHTML = `
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">
                ⚡ <b>Rubika V12:</b> <span style="color:#38bdf8;">${collectedMessages.size}</span> msgs 
                <span style="font-size: 11px; color:#94a3b8; font-weight: normal;">(DOM: ${domCount})</span>
            </div>
            <div style="font-size: 11px; color: #cbd5e1;">
                ${enStatus || "Fetching historical messages..."}
            </div>
            <div style="font-size: 11px; color: #94a3b8; direction: rtl; text-align: right; margin-top: 3px; font-family: 'Vazirmatn', Tahoma, sans-serif;">
                ${faStatus || "در حال دریافت پرسرعت پیام‌ها..."}
            </div>
            <div style="font-size: 10px; color: #38bdf8; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">
                👉 Click to Stop & Download TXT / برای توقف و دانلود کلیک کنید
            </div>
        `;
    }

    function stopAndExport() {
        isRunning = false;
        finishDownload();
    }
    badge.onclick = stopAndExport;
    window.stopExport = stopAndExport;

    function persistToDisk(force = false) {
        if (!force && unsavedCount < 500) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(collectedMessages)));
            unsavedCount = 0;
        } catch (e) {}
    }

    function parseDateBanner(text) {
        let m = text.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
        if (m) {
            const months = {
                january:'01', february:'02', march:'03', april:'04', may:'05', june:'06',
                july:'07', august:'08', september:'09', october:'10', november:'11', december:'12'
            };
            const mon = months[m[1].toLowerCase()];
            if (mon) return `${m[3]}-${mon}-${m[2].padStart(2, '0')}`;
        }
        return text || "";
    }

    // 9. Process DOM & Date Backfill
    function processAndPruneDOM() {
        purgeAndMarkMedia(chatScrollEl);

        let bubbles = Array.from(chatScrollEl.querySelectorAll('.bubble'));
        let newCount = 0;
        let activeDateStr = "";

        bubbles.forEach(b => {
            if (b.classList.contains('service') || b.classList.contains('is-date')) {
                let d = parseDateBanner(b.textContent.trim());
                if (d) activeDateStr = d;
                return;
            }

            if (b.dataset.extracted === 'full') return;
            if (b.dataset.extracted === 'partial' && activeDateStr && b.dataset.savedMid) {
                let mid = b.dataset.savedMid;
                let oldLine = collectedMessages.get(mid);
                if (oldLine && oldLine.startsWith('[')) {
                    collectedMessages.set(mid, `[${activeDateStr} ${oldLine.slice(1)}`);
                    pendingDateMids.delete(mid);
                    b.dataset.extracted = 'full';
                    unsavedCount++;
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
            let mediaType = b.dataset.mediaType;

            if (/Incoming Call|Outgoing Call|تماس/.test(rawText)) {
                let dur = rawText.match(/\d+:\d+/);
                rawText = dur ? `<Voice Call: ${dur[0]}>` : `<Voice Call>`;
            } else if (rawText === "GIF" || mediaType === 'video') {
                rawText = "<Video/GIF>" + (rawText !== "GIF" && rawText ? " " + rawText : "");
            } else if (mediaType === 'audio') {
                rawText = "<Audio>" + (rawText ? " " + rawText : "");
            } else if (!rawText && mediaType === 'photo') {
                rawText = "<Photo>";
            }

            let cleanMsg = rawText.split('\n').map(l => l.trim()).filter(Boolean).join(' ');
            if (!cleanMsg) return;

            let fullDate = activeDateStr ? `${activeDateStr} ${timeStr}`.trim() : timeStr;
            let finalLine = `[${fullDate}] ${sender}: ${cleanMsg}`;

            let mid = b.getAttribute('data-mid') || b.getAttribute('data-id') || b.dataset.mid || b.id || `${timeStr}_${sender}_${cleanMsg}`;
            b.dataset.savedMid = mid;

            if (!collectedMessages.has(mid)) {
                collectedMessages.set(mid, finalLine);
                if (!activeDateStr) pendingDateMids.add(mid);
                newCount++;
                unsavedCount++;
            } else if (activeDateStr && !collectedMessages.get(mid).startsWith(`[${activeDateStr}`)) {
                collectedMessages.set(mid, finalLine);
                pendingDateMids.delete(mid);
                newCount++;
                unsavedCount++;
            }

            b.dataset.extracted = activeDateStr ? 'full' : 'partial';
        });

        if (activeDateStr && pendingDateMids.size > 0) {
            for (const mid of pendingDateMids) {
                let line = collectedMessages.get(mid);
                if (line && !/^\[\d{4}-\d{2}-\d{2}/.test(line)) {
                    collectedMessages.set(mid, `[${activeDateStr} ${line.slice(1)}`);
                    unsavedCount++;
                }
            }
            pendingDateMids.clear();
        }

        // Strict Pruning: Keep only top 55 bubbles in DOM
        if (bubbles.length > 75) {
            const toRemove = bubbles.slice(55);
            toRemove.forEach(b => {
                if (!b.classList.contains('service') && b.dataset.extracted) {
                    b.remove();
                }
            });
        }

        if (unsavedCount >= 500) persistToDisk(false);
        return { newCount, domRemaining: chatScrollEl.querySelectorAll('.bubble').length };
    }

    // 10. Reactive Waiting (No rigid delay; resumes immediately when new messages appear)
    async function waitForNew(prevCount, maxMs = 2500) {
        const t0 = performance.now();
        while (performance.now() - t0 < maxMs) {
            await new Promise(r => setTimeout(r, 40));
            if (chatScrollEl.querySelectorAll('.bubble').length !== prevCount) return true;
        }
        return false;
    }

    // 11. Ultra-Fast Scroll Loop
    let stuckCount = 0;
    while (isRunning) {
        const { domRemaining } = processAndPruneDOM();
        updateBadge("Fast pulling historical messages...", "در حال دریافت پرسرعت پیام‌ها...", domRemaining);

        const before = chatScrollEl.querySelectorAll('.bubble').length;
        chatScrollEl.scrollTop = 0;
        chatScrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));

        const got = await waitForNew(before, 2500);

        const res = processAndPruneDOM();
        if (got || res.newCount > 0) {
            stuckCount = 0;
            chatScrollEl.scrollTop = 100;
        } else {
            stuckCount++;
            chatScrollEl.scrollTop = 150;
            await new Promise(r => setTimeout(r, 140));
            chatScrollEl.scrollTop = 0;
            if (stuckCount >= 8) {
                console.log("🎉 Reached the earliest historical message! / به ابتدایی‌ترین پیام تاریخچه چت رسیدید!");
                break;
            }
        }
    }

    // 12. Robust Chronological Sorting & Download
    // مرتب‌سازی زمانی دقیق بر اساس متن تاریخ [YYYY-MM-DD HH:MM] برای جلوگیری کامل از هرگونه به‌هم‌ریختگی
    function finishDownload() {
        window.onerror = origErrorHandler;
        persistToDisk(true);
        badge.innerHTML = `
            <div style="font-weight: bold; color: #4ade80; font-size: 14px;">
                ✅ Saved ${collectedMessages.size} messages!
            </div>
            <div style="font-size: 11px; color: #f8fafc; margin-top: 3px;">
                Sorting & Downloading TXT file...
            </div>
            <div style="font-size: 11px; color: #94a3b8; direction: rtl; text-align: right; margin-top: 2px;">
                ${collectedMessages.size} پیام ذخیره شد. در حال مرتب‌سازی و دانلود فایل...
            </div>
        `;
        badge.style.borderColor = "#4ade80";

        let lines = Array.from(collectedMessages.values());

        // Smart Timestamp-based Chronological Sorter:
        // Extracts [YYYY-MM-DD HH:MM] from the formatted line and sorts ascending
        lines.sort((a, b) => {
            let matchA = a.match(/^\[(\d{4}-\d{2}-\d{2})?\s*(\d{1,2}:\d{2})?\]/);
            let matchB = b.match(/^\[(\d{4}-\d{2}-\d{2})?\s*(\d{1,2}:\d{2})?\]/);
            
            let dateA = matchA ? (matchA[1] || "1970-01-01") : "1970-01-01";
            let timeA = matchA ? (matchA[2] || "00:00") : "00:00";
            let stampA = `${dateA} ${timeA.padStart(5, '0')}`;

            let dateB = matchB ? (matchB[1] || "1970-01-01") : "1970-01-01";
            let timeB = matchB ? (matchB[2] || "00:00") : "00:00";
            let stampB = `${dateB} ${timeB.padStart(5, '0')}`;

            return stampA.localeCompare(stampB);
        });

        let blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        let cleanName = partnerName.replace(/[\/\\?%*:|"<>]/g, '_');
        a.download = `rubika_chat_${cleanName}_full_history.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`✅ [Rubika Exporter] Export complete! Total messages saved: ${lines.length} / فرآیند استخراج با موفقیت به پایان رسید.`);
    }

    if (isRunning) finishDownload();
})();
