/**
 * Rubika Chat Exporter (DOM-Pruning & Anti-Freeze Engine)
 * استخراج‌کننده رسمی، سبک و ضد فریز تاریخچه چت روبیکا وب
 * 
 * Languages: English & فارسی (Persian)
 * License: MIT
 */
(function runExporter() {
    window.__RUBIKA_STOP__ = true;
    document.querySelectorAll('#rubika-ui-badge').forEach(e => e.remove());

    // 1. Prevent WebMediaPlayer limits by replacing video/audio creation
    const origCreate = document.createElement;
    document.createElement = function(tag, opt) {
        if (typeof tag === 'string' && (tag.toLowerCase() === 'video' || tag.toLowerCase() === 'audio')) {
            let fake = origCreate.call(document, 'div');
            fake.play = () => Promise.resolve();
            fake.pause = () => {};
            fake.load = () => {};
            return fake;
        }
        return origCreate.apply(this, arguments);
    };
    document.querySelectorAll('video, audio').forEach(el => el.remove());
    HTMLMediaElement.prototype.play = function() { return Promise.resolve(); };

    // 2. Locate active chat scroll container
    const chatScrollEl = Array.from(document.querySelectorAll('.scrollable-y, .bubbles-inner, .bubbles'))
        .find(el => el.querySelector('.bubble') && el.scrollHeight > el.clientHeight);

    if (!chatScrollEl) {
        alert("⚠️ Please open a chat window first! / لطفاً ابتدا پنجره چت را باز کنید.");
        return;
    }

    // 3. Initialize state
    window.__RUBIKA_STOP__ = false;
    const store = new Map();
    let pendingDateMids = new Set();
    let currentDate = "Scanning...";
    let partnerName = "Zari";
    let myName = "Difei";

    // 4. Bilingual Floating Status Window (English & Persian)
    const badge = origCreate.call(document, 'div');
    badge.id = 'rubika-ui-badge';
    badge.style.cssText = `
        position: fixed; top: 15px; right: 20px; z-index: 999999;
        background: #0f172a; color: #f8fafc; padding: 14px 22px;
        border-radius: 12px; box-shadow: 0 6px 30px rgba(0,0,0,0.7);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", sans-serif;
        font-size: 13px; cursor: pointer; border: 1.5px solid #38bdf8;
        direction: ltr; text-align: left; line-height: 1.5;
    `;
    document.body.appendChild(badge);

    let lastTime = performance.now();
    let lastCount = 0;
    let speed = 0;

    function renderUI(domCount) {
        const now = performance.now();
        const diff = (now - lastTime) / 1000;
        if (diff >= 1.5) {
            speed = Math.max(0, (store.size - lastCount) / diff);
            lastTime = now;
            lastCount = store.size;
        }
        badge.innerHTML = `
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px;">
                ⚡ <b>Rubika Exporter:</b> <span style="color:#38bdf8;">${store.size}</span> msgs
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
        chatScrollEl.querySelectorAll('video, audio').forEach(el => el.remove());
        chatScrollEl.querySelectorAll('.bubble img:not(.emoji)').forEach(img => img.removeAttribute('src'));

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
            } else if (rawText === "GIF" || b.querySelector('video')) {
                rawText = "<Video/GIF>" + (rawText !== "GIF" && rawText ? " " + rawText : "");
            } else if (!rawText && b.querySelector('img')) {
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

        // Maintain 50 bubbles to keep DOM reflow fast
        if (bubbles.length > 60) {
            bubbles.slice(40).forEach(b => { if (!b.classList.contains('service') && b.dataset.extracted) b.remove(); });
        }

        return { newFound, domCount: chatScrollEl.querySelectorAll('.bubble').length };
    }

    function exportFile() {
        window.__RUBIKA_STOP__ = true;
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
        let a = origCreate.call(document, 'a');
        a.href = url;
        a.download = `rubika_chat_export_${lines.length}_msgs.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    badge.onclick = exportFile;

    // 5. Scroll Loop
    (async function loop() {
        let stuck = 0;
        while (!window.__RUBIKA_STOP__) {
            let { newFound, domCount } = scrapeDOM();
            renderUI(domCount);

            if (currentDate && (currentDate.startsWith('2026-02-0') || currentDate.startsWith('2026-01') || currentDate < '2026-02-08')) {
                console.log("🎯 Target date reached! Exporting file...");
                break;
            }

            chatScrollEl.scrollTop = 0;
            chatScrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));

            await new Promise(r => setTimeout(r, 400));
            let after = scrapeDOM();

            if (newFound > 0 || after.newFound > 0) {
                stuck = 0;
                chatScrollEl.scrollTop = 80;
            } else {
                stuck++;
                chatScrollEl.scrollTop = 120;
                await new Promise(r => setTimeout(r, 150));
                chatScrollEl.scrollTop = 0;
                if (stuck >= 12) break;
            }
        }
        if (!window.__RUBIKA_STOP__) exportFile();
    })();
})();
