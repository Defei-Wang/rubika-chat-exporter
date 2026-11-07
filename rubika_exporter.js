/**
 * Rubika Full-Timeline Exporter V11 (Anti-Lag, Zero-Error & Smart Date Backfill)
 * استخراج‌کننده فوق‌سریع و بدون خطا تاریخچه چت روبیکا (نسخه ۱۱)
 * 
 * Languages: English & فارسی (Persian)
 * License: MIT
 */
(async function exportRubikaV11() {
    console.clear();
    console.log("🚀 [Rubika V11] Initializing Ultra-Fast Exporter / در حال راه‌اندازی استخراج‌کننده فوق‌سریع...");

    // 1. Suppress Angular's async checkMedia/addPreload2 appendChild errors on pruned DOM nodes
    const origErrorHandler = window.onerror;
    window.onerror = function(msg) {
        if (typeof msg === 'string' && msg.includes('appendChild')) return true;
        return origErrorHandler ? origErrorHandler.apply(this, arguments) : false;
    };

    // 2. Hide media & disable animations/transitions via CSS
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

    // 3. Prevent media elements from auto-playing
    HTMLMediaElement.prototype.play = function() {
        this.muted = true;
        this.pause();
        return Promise.resolve();
    };

    // 4. Strip media sources safely (keep img shells so Angular's checkMedia won't throw null errors)
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
                el.remove(); // Must remove video/audio to avoid Chrome 7844 WebMediaPlayer limit
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

    // 5. Locate active chat scrollable container
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

    // 6. Persistent LocalStorage Checkpointing (Compatible with V10 key)
    const STORAGE_KEY = `rubika_saved_chat_v10_${partnerName}`;
    let savedLocal = {};
    try { savedLocal = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch (e) {}
    let collectedMessages = new Map(Object.entries(savedLocal));
    let pendingDateMids = new Set(); // Track messages waiting for upper date banner
    let unsavedCount = 0;

    // 7. Floating Bilingual Status UI (English & Persian)
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
                ⚡ <b>Rubika V11:</b> <span style="color:#38bdf8;">${collectedMessages.size}</span> msgs 
                <span style="font-size: 11px; color:#94a3b8; font-weight: normal;">(DOM: ${domCount})</span>
            </div>
            <div style="font-size: 11px; color: #cbd5e1;">
                ${enStatus || "Fetching historical messages..."}
            </div>
            <div style="font-size: 11px; color: #94a3b8; direction: rtl; text-align: right; margin-top: 3px; font-family: 'Vazirmatn', Tahoma, sans-serif;">
                ${faStatus || "در حال واکشی پیام‌های قبلی..."}
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

    // Throttled disk persistence: only save every 500 messages or on finish to prevent JSON.stringify lag at 7000+ msgs
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

    // 8. Parse text, backfill dates & strictly prune DOM
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

            // If we now have a date banner and this bubble was previously extracted without date, update it
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

        // Backfill any pruned partial messages once their upper date banner finally scrolls into view
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

        // Strict Pruning: Remove ALL processed bubbles beyond top 55 (even 'partial' ones, preventing DOM 155+ buildup)
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

    // 9. Constant-speed upward scroll loop
    let stuckCount = 0;
    let lastTopBubbleSignature = "";

    while (isRunning) {
        let { newCount, domRemaining } = processAndPruneDOM();
        updateBadge(
            "Fetching historical messages...", 
            "در حال واکشی پیام‌های قبلی...", 
            domRemaining
        );

        chatScrollEl.scrollTop = 0;
        chatScrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));

        await new Promise(r => setTimeout(r, 700));

        let resAfter = processAndPruneDOM();
        let firstBubble = chatScrollEl.querySelector('.bubble:not(.service)');
        let currentTopSig = firstBubble ? (firstBubble.getAttribute('data-mid') || firstBubble.textContent.trim().slice(0, 30)) : "";

        if (newCount > 0 || resAfter.newCount > 0 || (currentTopSig && currentTopSig !== lastTopBubbleSignature)) {
            lastTopBubbleSignature = currentTopSig;
            stuckCount = 0;
            chatScrollEl.scrollTop = 100;
            chatScrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));
        } else {
            stuckCount++;
            chatScrollEl.scrollTop = 150;
            chatScrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));
            await new Promise(r => setTimeout(r, 140));
            chatScrollEl.scrollTop = 0;
            chatScrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));

            if (stuckCount >= 10) {
                console.log("🎉 Reached the earliest historical message! / به ابتدایی‌ترین پیام تاریخچه چت رسیدید!");
                break;
            }
        }
    }

    // 10. Download output file with bilingual status
    function finishDownload() {
        window.onerror = origErrorHandler;
        persistToDisk(true); // Force final save to localStorage
        badge.innerHTML = `
            <div style="font-weight: bold; color: #4ade80; font-size: 14px;">
                ✅ Saved ${collectedMessages.size} messages!
            </div>
            <div style="font-size: 11px; color: #f8fafc; margin-top: 3px;">
                Downloading TXT file...
            </div>
            <div style="font-size: 11px; color: #94a3b8; direction: rtl; text-align: right; margin-top: 2px;">
                ${collectedMessages.size} پیام ذخیره شد. در حال شروع دانلود فایل...
            </div>
        `;
        badge.style.borderColor = "#4ade80";

        let entries = Array.from(collectedMessages.entries());
        entries.sort((a, b) => {
            let numA = Number(a[0]), numB = Number(b[0]);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return 0;
        });

        let lines = entries.map(e => e[1]);
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
