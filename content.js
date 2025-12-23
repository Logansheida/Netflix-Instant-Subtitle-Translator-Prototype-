const TARGET_LANG = "fr";

/* ---------- CACHE ---------- */
const translationCache = new Map();
let shownSegments = new Set();

let buffer = "";
let lastRawText = "";
let hideTimeout;
let observer;

/* ---------- UI ---------- */
function getBox() {
    let box = document.getElementById("netflix-translation");
    if (!box) {
        box = document.createElement("div");
        box.id = "netflix-translation";
        Object.assign(box.style, {
            position: "fixed",
            bottom: "12%",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "80%",
            padding: "8px 16px",
            background: "rgba(0,0,0,0.65)",
            color: "#fff",
            fontSize: "22px",
            fontFamily: "Arial, sans-serif",
            borderRadius: "6px",
            textAlign: "center",
            zIndex: "9999",
            opacity: "0",
            transition: "opacity 0.15s ease"
        });
        document.body.appendChild(box);
    }
    return box;
}

/* ---------- UTILS ---------- */
const clean = t => t.replace(/\s+/g, " ").trim();
const SEGMENT_REGEX = /(.+?(?:[.!?…]|,(?=\s)|—))/;

/* ---------- TRANSLATION ---------- */
async function translate(text) {
    if (translationCache.has(text)) return translationCache.get(text);

    const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${TARGET_LANG}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    const translated = data[0].map(x => x[0]).join("");
    translationCache.set(text, translated);
    return translated;
}

/* ---------- DISPLAY ---------- */
function showSegment(segment) {
    translate(segment).then(translated => {
        const box = getBox();
        box.innerText = translated;
        box.style.opacity = "1";

        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            box.style.opacity = "0";
        }, 2000);
    });
}

/* ---------- CORE ---------- */
function handleSubtitleChange() {
    const spans = document.querySelectorAll("[class*='player-timedtext'] span");
    if (!spans.length) return;

    const rawText = clean([...spans].map(s => s.innerText).join(" "));
    if (!rawText || rawText === lastRawText) return;

    // RESET intelligent quand Netflix change brutalement
    if (!rawText.startsWith(lastRawText)) {
        buffer = "";
        shownSegments.clear();
    }

    lastRawText = rawText;
    buffer = clean(buffer + " " + rawText);

    let match;
    while ((match = buffer.match(SEGMENT_REGEX))) {
        const segment = match[1].trim();

        if (segment.endsWith(",") && segment.length < 25) break;

        buffer = buffer.slice(segment.length).trim();

        if (shownSegments.has(segment)) continue;
        shownSegments.add(segment);

        showSegment(segment);
    }
}

/* ---------- OBSERVER ---------- */
function attachObserver() {
    const container = document.querySelector("[class*='player-timedtext']");
    if (!container) return;

    if (observer) observer.disconnect();

    observer = new MutationObserver(handleSubtitleChange);
    observer.observe(container, { childList: true, subtree: true });
}

/* ---------- NETFLIX DOM WATCH ---------- */
setInterval(() => {
    attachObserver();
}, 1000);
