/**
 * Rubika Web Chat Exporter / استخراج‌کننده پیام‌های روبیکا وب
 * 
 * Open Source Browser Tool to cleanly export full chat history from web.rubika.ir as a structured TXT file.
 * Safe & Non-invasive: Operates purely on rendered client DOM without sending automated bot requests.
 * 
 * License: MIT
 */

(async function exportRubikaChatHistory() {
    console.clear();
    console.log("🚀 [Rubika Chat Exporter] Initializing / در حال راه‌اندازی...");

    // 1. Identify active chat container (excluding sidebar)
    const chatScrollEl = Array.from(document.querySelectorAll('div.scrollable-y')).find(el => 
        !el.classList.contains('sidebar-slider-item') && 
        !el.closest('.sidebar') && 
        el.scrollHeight > 1500
    );

    if (!chatScrollEl) {
        alert("Chat window not detected! Please ensure a chat conversation is actively open on web.rubika.ir.\n\nپنجره چت پیدا نشد! لطفا مطمئن شوید که صفحه چت در روبیکا وب باز است.");
        return;
    }

    // 2. Automatically detect chat partner's name from header
    const partnerNameEl = document.querySelector('.top .peer-title, .chat-info .name, .user-title, .chat-title, .person-title');
    const partnerName = partnerNameEl ? partnerNameEl.innerText.trim() : "Partner";
    const myName = "You";

    console.log(`🎯 Active Chat: [${partnerName}] | Container Height: ${chatScrollEl.scrollHeight}px`);

    // 3. Create non-intrusive floating progress badge (English + Persian)
    let badge = document.getElementById('rubika-export-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'rubika-export-badge';
        badge.style.cssText = `
            position: fixed; top: 15px; right: 20px; z-index: 999999;
            background: #0f172a; color: #f8fafc; padding: 14px 22px;
            border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", sans-serif;
            font-size: 14px; cursor: pointer; border: 1.5px solid #38bdf8;
            direction: ltr; text-align: left;
        `;
        document.body.appendChild(badge);
    }

    let isRunning = true;
    badge.onclick = () => { isRunning = false; finishDownload(); };
    window.stopExport = () => { isRunning = false; finishDownload(); };

    function updateBadge(count, status) {
        badge.innerHTML = `
            <b>📥 Rubika Exporter:</b> <span style="color:#38bdf8;font-weight:bold;">${count}</span> msgs<br>
            <span style="font-size:12px;color:#94a3b8;">${status || "Click here to Stop & Download / برای دانلود کلیک کنید"}</span>
        `;
    }

    let collectedMessages = new Map();
    let currentDateStr = "";

    function parseDateBanner(text) {
        // English format: e.g. "Tuesday, October 27, 2026"
        let m = text.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
        if (m) {
            const months = { 
                january:'01', february:'02', march:'03', april:'04', 
                may:'05', june:'06', july:'07', august:'08', 
                september:'09', october:'10', november:'11', december:'12' 
            };
            let mon = months[m[1].toLowerCase()];
            if (mon) return `${m[3]}-${mon}-${m[2].padStart(2, '0')}`;
        }
        return text.trim();
    }

    // 4. Extract message elements
    function processDOM() {
        let bubbles = chatScrollEl.querySelectorAll('.bubble');
        
        bubbles.forEach(b => {
            // Service date banner
            if (b.classList.contains('service')) {
                let dText = b.innerText.trim();
                let parsedDate = parseDateBanner(dText);
                if (parsedDate) {
                    currentDateStr = parsedDate;
                }
                return;
            }

            let clone = b.cloneNode(true);

            // Strip time element
            let timeEl = clone.querySelector('.time, .bubble-time');
            let timeStr = timeEl ? timeEl.innerText.trim() : "";
            if (timeEl) timeEl.remove();

            // Strip quoted reply block
            let replyEl = clone.querySelector('.reply, .reply-wrapper, [class*="reply"]');
            if (replyEl) replyEl.remove();

            // Sender identification
            let isOut = b.classList.contains('is-out') || b.closest('.is-out');
            let sender = isOut ? myName : partnerName;

            // Content normalization
            let rawText = clone.innerText ? clone.innerText.trim() : "";

            if (rawText.includes("Incoming Call") || rawText.includes("Outgoing Call") || rawText.includes("تماس")) {
                let dur = rawText.match(/\d+:\d+/);
                rawText = dur ? `<Voice Call: ${dur[0]}>` : `<Voice Call>`;
            } else if (rawText === "GIF" || clone.querySelector('video')) {
                rawText = "<GIF>" + (rawText !== "GIF" && rawText ? " " + rawText : "");
            } else if (!rawText && clone.querySelector('img')) {
                rawText = "<Photo>";
            }

            let cleanMsg = rawText.split('\n').map(l => l.trim()).filter(Boolean).join(' ');
            if (!cleanMsg) return;

            let fullDate = currentDateStr ? `${currentDateStr} ${timeStr}`.trim() : timeStr;
            let finalLine = `[${fullDate}] ${sender}: ${cleanMsg}`;

            let key = `${fullDate}_${sender}_${cleanMsg}`;
            if (!collectedMessages.has(key)) {
                collectedMessages.set(key, finalLine);
            }
        });
    }

    // 5. Automated upward scroll loop
    let stuckCount = 0;
    let lastHeight = chatScrollEl.scrollHeight;

    while (isRunning) {
        processDOM();
        updateBadge(collectedMessages.size);

        // Scroll upward by 600px
        chatScrollEl.scrollTop = Math.max(0, chatScrollEl.scrollTop - 600);
        chatScrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));
        chatScrollEl.dispatchEvent(new WheelEvent('wheel', { deltaY: -500, bubbles: true }));

        // Reached top edge, wait for network lazy-load
        if (chatScrollEl.scrollTop === 0) {
            updateBadge(collectedMessages.size, "At top edge, loading older msgs... / در حال بارگذاری پیام‌های قدیمی");
            await new Promise(r => setTimeout(r, 2000));

            if (chatScrollEl.scrollHeight > lastHeight) {
                lastHeight = chatScrollEl.scrollHeight;
                stuckCount = 0;
            } else {
                stuckCount++;
                if (stuckCount >= 15) {
                    console.log("🎉 All chat history reached!");
                    break;
                }
            }
        } else {
            stuckCount = 0;
            lastHeight = chatScrollEl.scrollHeight;
            await new Promise(r => setTimeout(r, 900 + Math.random() * 300));
        }
    }

    // 6. Download file
    function finishDownload() {
        if (!badge) return;
        badge.innerHTML = `✅ Complete! / استخراج شد (${collectedMessages.size} msgs)`;
        badge.style.borderColor = "#4ade80";

        let lines = Array.from(collectedMessages.values());
        let blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        
        let sanitizedName = partnerName.replace(/[\/\\?%*:|"<>]/g, '_');
        a.download = `rubika_chat_${sanitizedName}_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`✅ Saved ${lines.length} messages.`);
    }

    if (isRunning) {
        finishDownload();
    }
})();
