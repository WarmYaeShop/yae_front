// === Картинки из БД ===
// Картинки, заменённые админом через бота, хранятся в БД и отдаются бэкендом
// (/api/image/<файл>). Сервер отдаёт карту {файл: ссылка?v=версия} по
// /api/images; здесь подменяем локальные images/<файл> на эту ссылку — и у уже
// вставленных <img>, и у создаваемых динамически (карточки товаров). Версия в
// ссылке меняется при перезаливке, поэтому обновлённая картинка видна сразу.
(function () {
    window.__imgMap = {};
    function fnameFromSrc(src) {
        var m = src && src.match(/images\/([^"'?)\s]+\.(?:webp|png|jpg|jpeg))/i);
        return m ? m[1] : null;
    }
    function swap(img) {
        if (!img || img.tagName !== 'IMG' || img.dataset.cdnDone) return;
        var localSrc = img.getAttribute('src') || '';
        var name = fnameFromSrc(localSrc);
        if (name && window.__imgMap[name]) {
            img.dataset.cdnDone = '1';
            var target = window.__imgMap[name];
            // /api/images отдаёт относительный images/<файл> — reverse-proxy сам
            // проксирует его на CDN. Если путь совпадает с текущим — не трогаем.
            if (target === localSrc) return;
            img.src = target;
        }
    }
    function sweep(root) {
        if (!root || !root.querySelectorAll) return;
        if (root.tagName === 'IMG') swap(root);
        root.querySelectorAll('img').forEach(swap);
    }
    // Наблюдаем за появлением новых <img> (карточки товаров рисуются после fetch)
    var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
            var nodes = muts[i].addedNodes;
            for (var j = 0; j < nodes.length; j++) {
                if (nodes[j].nodeType === 1) sweep(nodes[j]);
            }
        }
    });
    try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
    // Загружаем карту картинок с повтором: разовый сбой (напр. холодный старт
    // бэкенда) не должен оставить картинки неподменёнными
    function loadImgMap(attempt) {
        fetch('/api/images').then(function (r) {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        }).then(function (d) {
            window.__imgMap = (d && d.images) || {};
            sweep(document);
        }).catch(function () {
            if (attempt < 3) setTimeout(function () { loadImgMap(attempt + 1); }, 1500);
        });
    }
    loadImgMap(1);
    document.addEventListener('DOMContentLoaded', function () { sweep(document); });
})();

// Слой «зерна» поверх фона (премиум-полировка) — вставляем один раз на всех
// страницах, чтобы не дублировать в каждом HTML. Стили — #fx-grain в styles.css
(function () {
    function addGrain() {
        if (document.getElementById('fx-grain')) return;
        var g = document.createElement('div');
        g.id = 'fx-grain';
        document.body.appendChild(g);
    }
    if (document.body) addGrain();
    else document.addEventListener('DOMContentLoaded', addGrain);
})();

// Высота фиксированной шапки → CSS-переменная --header-h.
// Шапка вынута из потока, поэтому body отступает сверху ровно на её высоту.
// Меряем, а не хардкодим: высота меняется от ширины экрана и от того, успел ли
// подгрузиться Marck Script (логотип этим шрифтом выше запасного).
(function () {
    function measure() {
        var h = document.querySelector('header');
        if (!h) return;
        var px = Math.round(h.getBoundingClientRect().height);
        if (px > 0) document.documentElement.style.setProperty('--header-h', px + 'px');
    }
    function init() {
        measure();
        var h = document.querySelector('header');
        if (h && window.ResizeObserver) {
            try { new ResizeObserver(measure).observe(h); } catch (e) {}
        }
        window.addEventListener('resize', measure);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(measure).catch(function () {});
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

// === Бегающая лисичка (маскот) ===
// Раз в ~40 с пробегает по низу экрана. Только transform — не грузит слабые ПК.
// В «Экономе» и при системном «уменьшить движение» скрыта (см. #yae-fox в styles.css).
(function () {
    var SVG = '<svg viewBox="0 0 120 80" aria-hidden="true">' +
        '<defs>' +
        '<linearGradient id="fx-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff5fb"/><stop offset="1" stop-color="#ffcfe6"/></linearGradient>' +
        '<linearGradient id="fx-tail" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffe3f1"/><stop offset=".55" stop-color="#ffa9d4"/><stop offset="1" stop-color="#b98cff"/></linearGradient>' +
        '</defs>' +
        // хвост
        '<g class="fox-tail"><path d="M42 47C28 53 9 49 4 34 0 22 7 9 19 7c-3 9 0 19 8 26 5 4 10 8 15 14z" fill="url(#fx-tail)"/>' +
        '<path d="M19 7C9 9 3 18 5 28c3-8 8-14 14-21z" fill="#fff" opacity=".85"/></g>' +
        // дальние лапы (темнее)
        '<g class="fox-leg leg-b2"><rect x="40" y="56" width="7" height="16" rx="3.5" fill="#f2b6d6"/></g>' +
        '<g class="fox-leg leg-f2"><rect x="72" y="56" width="7" height="16" rx="3.5" fill="#f2b6d6"/></g>' +
        // тело
        '<ellipse cx="60" cy="52" rx="25" ry="14" fill="url(#fx-body)"/>' +
        '<path d="M48 45c3 2 6 2 9 0M52 50c2 1.4 4 1.4 6 0" stroke="#ff9ecd" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
        // ближние лапы
        '<g class="fox-leg leg-b1"><rect x="45" y="57" width="7.5" height="17" rx="3.7" fill="#fff0f7"/><rect x="45" y="70" width="7.5" height="4" rx="2" fill="#ff9ecd"/></g>' +
        '<g class="fox-leg leg-f1"><rect x="76" y="57" width="7.5" height="17" rx="3.7" fill="#fff0f7"/><rect x="76" y="70" width="7.5" height="4" rx="2" fill="#ff9ecd"/></g>' +
        // голова
        '<g class="fox-head">' +
        '<path d="M80 30L81 11 93 24z" fill="#fff0f7"/><path d="M83 26l.6-10 6.4 7z" fill="#ff9ecd"/>' +
        '<path d="M95 23l10-11 1 17z" fill="#fff0f7"/><path d="M98 23l6-6.5.6 9.5z" fill="#ff9ecd"/>' +
        '<ellipse cx="92" cy="38" rx="15" ry="13" fill="url(#fx-body)"/>' +
        '<path d="M102 36c7 1 11 4 11 6-3 3-9 3-13 1z" fill="#fff5fb"/>' +
        '<circle cx="112.5" cy="41.5" r="1.8" fill="#6b3a63"/>' +
        '<path d="M92 36q3-3 6 0" stroke="#6b3a63" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="95" cy="43" rx="3.2" ry="2" fill="#ff8fc6" opacity=".55"/>' +
        '<path d="M86 29l2 3 2-3" stroke="#ff7eb3" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
        '</g></svg>';
    // Пасхалка: нажали на лисичку — она останавливается, подпрыгивает, сыплет
    // лепестки и в облачке показывает текущую акцию (из /api/promos).
    var promoCache = null;
    function getPromo() {
        if (promoCache) return promoCache;
        promoCache = fetch('/api/promos').then(function (r) { return r.ok ? r.json() : []; })
            .then(function (list) { return (list && list[0]) || null; })
            .catch(function () { promoCache = null; return null; });
        return promoCache;
    }
    function burst(wrap) {
        for (var i = 0; i < 12; i++) {
            var s = document.createElement('span');
            s.className = 'fox-petal';
            var ang = Math.PI * (1.05 + Math.random() * 0.9); // веером вверх
            var dist = 40 + Math.random() * 45;
            s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
            s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
            s.style.setProperty('--r', Math.round(Math.random() * 360) + 'deg');
            s.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
            wrap.appendChild(s);
            setTimeout(function (el) { el.remove(); }, 1400, s);
        }
    }
    function onFoxClick(wrap) {
        if (wrap.classList.contains('fox-happy')) return;
        wrap.classList.add('fox-happy');
        burst(wrap);

        var bubble = document.createElement('div');
        bubble.className = 'fox-bubble';
        var title = document.createElement('b');
        title.textContent = 'Фыр!';
        var text = document.createElement('span');
        text.textContent = 'Секунду, проверю акции…';
        bubble.appendChild(title);
        bubble.appendChild(text);
        wrap.appendChild(bubble);
        // Облачко не должно вылезать за край экрана (лисичка бывает у самой кромки)
        requestAnimationFrame(function () {
            var r = bubble.getBoundingClientRect(), shift = 0;
            if (r.left < 8) shift = 8 - r.left;
            else if (r.right > window.innerWidth - 8) shift = window.innerWidth - 8 - r.right;
            bubble.style.setProperty('--shift', shift + 'px');
        });

        getPromo().then(function (p) {
            if (p && p.title) {
                text.textContent = p.title;
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = 'Смотреть акции →';
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (typeof openPromosModal === 'function') openPromosModal();
                });
                bubble.appendChild(btn);
            } else {
                text.textContent = 'Хорошего дня и удачных круток!';
            }
        });

        setTimeout(function () {
            bubble.classList.add('fox-bubble-out');
            setTimeout(function () { bubble.remove(); wrap.classList.remove('fox-happy'); }, 300);
        }, 4200);
    }
    function addFox() {
        if (document.getElementById('yae-fox') || !document.querySelector('header')) return;
        var wrap = document.createElement('div');
        wrap.id = 'yae-fox';
        wrap.title = 'Нажми на меня';
        wrap.innerHTML = '<div class="fox-bob">' + SVG + '</div>';
        wrap.addEventListener('click', function () { onFoxClick(wrap); });
        document.body.appendChild(wrap);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFox);
    else addFox();
})();

// === Иконки сайта (SVG-спрайт) ===
// Вместо системных эмодзи: линейные иконки с розово-фиолетовым градиентом,
// в одном стиле с иконкой профиля. Использование: icon('tag') → <svg><use/></svg>.
const ICON_SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <linearGradient id="ic-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffb3d6"/><stop offset="1" stop-color="#b98cff"/>
    </linearGradient>
  </defs>
  <symbol id="ic-tag" viewBox="0 0 24 24"><path d="M20.6 12.4l-8.2 8.2a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1-.6-1.6l.5-6.2a2 2 0 0 1 1.8-1.8l6.2-.5a2 2 0 0 1 1.6.6l6.2 6.2a2 2 0 0 1 0 2.8z"/><circle cx="8.3" cy="8.3" r="1.5"/></symbol>
  <symbol id="ic-bag" viewBox="0 0 24 24"><path d="M5.5 8h13l-1 11.2a2 2 0 0 1-2 1.8h-7a2 2 0 0 1-2-1.8z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></symbol>
  <symbol id="ic-gift" viewBox="0 0 24 24"><rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12M12 8v13"/><path d="M12 8C11 5 9.8 3.8 8.3 3.8a2.1 2.1 0 0 0 0 4.2zM12 8c1-3 2.2-4.2 3.7-4.2a2.1 2.1 0 0 1 0 4.2z"/></symbol>
  <symbol id="ic-heart" viewBox="0 0 24 24"><path d="M12 20.5l-7.3-7.1a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8a4.6 4.6 0 0 1 6.5 6.5z"/></symbol>
  <symbol id="ic-headset" viewBox="0 0 24 24"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><path d="M4 14.5h2.6a1 1 0 0 1 1 1v3.8a1 1 0 0 1-1 1H5.8A1.8 1.8 0 0 1 4 18.5zM20 14.5h-2.6a1 1 0 0 0-1 1v3.8a1 1 0 0 0 1 1h.8a1.8 1.8 0 0 0 1.8-1.8z"/></symbol>
  <symbol id="ic-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></symbol>
  <symbol id="ic-shield" viewBox="0 0 24 24"><path d="M12 3l7 2.8v5.6c0 4.5-3 8.1-7 9.6-4-1.5-7-5.1-7-9.6V5.8z"/><path d="M9 12.2l2.1 2.1 4-4.2"/></symbol>
  <symbol id="ic-sliders" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="#1c1526"/><circle cx="15.5" cy="12" r="2" fill="#1c1526"/><circle cx="8" cy="17" r="2" fill="#1c1526"/></symbol>
  <symbol id="ic-plane" viewBox="0 0 24 24"><path d="M21 3.5L2.8 10.6l6.4 2.3zM21 3.5l-11.8 9.4.7 6.6 3.1-4.4zM21 3.5l-3.4 16-4.7-4.6"/></symbol>
  <symbol id="ic-sakura" viewBox="0 0 24 24"><path d="M12 11.2c-2.3-2.2-2.6-5.2-.1-7.7 2.5 2.5 2.3 5.5.1 7.7z"/><path d="M12 11.2c-2.3-2.2-2.6-5.2-.1-7.7 2.5 2.5 2.3 5.5.1 7.7z" transform="rotate(72 12 12)"/><path d="M12 11.2c-2.3-2.2-2.6-5.2-.1-7.7 2.5 2.5 2.3 5.5.1 7.7z" transform="rotate(144 12 12)"/><path d="M12 11.2c-2.3-2.2-2.6-5.2-.1-7.7 2.5 2.5 2.3 5.5.1 7.7z" transform="rotate(216 12 12)"/><path d="M12 11.2c-2.3-2.2-2.6-5.2-.1-7.7 2.5 2.5 2.3 5.5.1 7.7z" transform="rotate(288 12 12)"/><circle cx="12" cy="12" r="1.3"/></symbol>
  <symbol id="ic-mail" viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.8 7.2l8.2 6 8.2-6"/></symbol>
  <symbol id="ic-lock" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2"/></symbol>
  <symbol id="ic-pen" viewBox="0 0 24 24"><path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/></symbol>
  <symbol id="ic-megaphone" viewBox="0 0 24 24"><path d="M4 10v4a1 1 0 0 0 1 1h2l9 4.5v-15L7 9H5a1 1 0 0 0-1 1z"/><path d="M7.5 15l1.5 5M19.5 9.5a3.2 3.2 0 0 1 0 5"/></symbol>
  <symbol id="ic-gamepad" viewBox="0 0 24 24"><path d="M7 8h10a4 4 0 0 1 4 4.4l-.5 3.6a2.5 2.5 0 0 1-4.3 1.3L14.5 15.5h-5l-1.7 1.8A2.5 2.5 0 0 1 3.5 16L3 12.4A4 4 0 0 1 7 8z"/><path d="M7.5 10.5v3.5M5.75 12.25h3.5"/><circle cx="15.5" cy="11.3" r=".9"/><circle cx="17.6" cy="13.3" r=".9"/></symbol>
  <symbol id="ic-card" viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3.5"/></symbol>
  <symbol id="ic-rocket" viewBox="0 0 24 24"><path d="M12 2.8c3.4 2 5 5.4 5 9.2l-2.4 3.2H9.4L7 12c0-3.8 1.6-7.2 5-9.2z"/><circle cx="12" cy="9.5" r="1.7"/><path d="M9.4 15.2L7 19.5l3.2-1.2M14.6 15.2L17 19.5l-3.2-1.2M12 18v3"/></symbol>
  <symbol id="ic-crown" viewBox="0 0 24 24"><path d="M3.5 8.5l4.2 3.8L12 5.5l4.3 6.8 4.2-3.8-1.8 10H5.3z"/><path d="M6 21h12"/></symbol>
  <symbol id="ic-chat" viewBox="0 0 24 24"><path d="M5 4.5h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z"/><path d="M8 9.5h8M8 12.5h5"/></symbol>
  <symbol id="ic-link" viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></symbol>
  <symbol id="ic-ticket" viewBox="0 0 24 24"><path d="M4 6h16a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4V7a1 1 0 0 1 1-1z"/><path d="M14.5 6v2.2M14.5 10.9v2.2M14.5 15.8V18"/></symbol>
  <symbol id="ic-sparkle" viewBox="0 0 24 24"><path d="M11 3.5l1.8 5.2 5.2 1.8-5.2 1.8L11 17.5l-1.8-5.2L4 10.5l5.2-1.8z"/><path d="M18.5 15.5v5M16 18h5"/></symbol>
  <symbol id="ic-wand" viewBox="0 0 24 24"><path d="M4.5 19.5L15 9M13.2 7.2l3.6 3.6"/><path d="M17.5 3v3M16 4.5h3M20 8.5v2M19 9.5h2M9.5 3.5v2M8.5 4.5h2"/></symbol>
  <symbol id="ic-gauge" viewBox="0 0 24 24"><path d="M4.2 17.5a8.5 8.5 0 1 1 15.6 0"/><path d="M12 14l3.8-4"/><circle cx="12" cy="14" r="1.2"/></symbol>
  <symbol id="ic-battery" viewBox="0 0 24 24"><rect x="2.5" y="7.5" width="17" height="9" rx="2"/><path d="M21.5 11v2M6 10.5v3M9 10.5v3"/></symbol>
  <symbol id="ic-moon" viewBox="0 0 24 24"><path d="M20 14.5A8.2 8.2 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z"/></symbol>
  <symbol id="ic-cookie" viewBox="0 0 24 24"><path d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3.5a3 3 0 0 0 4 3.5 3 3 0 0 0 5 5.5z"/><circle cx="8.5" cy="10" r=".9"/><circle cx="14" cy="15" r=".9"/><circle cx="9" cy="15.5" r=".9"/></symbol>
  <symbol id="ic-copy" viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/></symbol>
  <symbol id="ic-repeat" viewBox="0 0 24 24"><path d="M17 3.5l3 3-3 3M4 11V9.5a3 3 0 0 1 3-3h13M7 20.5l-3-3 3-3M20 13v1.5a3 3 0 0 1-3 3H4"/></symbol>
  <symbol id="ic-key" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3M16.5 6.5L19 9M14 9l2 2"/></symbol>
  <symbol id="ic-bolt" viewBox="0 0 24 24"><path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z"/></symbol>
  <symbol id="ic-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></symbol>
  <symbol id="ic-alert" viewBox="0 0 24 24"><path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.2v.3"/></symbol>
  <symbol id="ic-flame" viewBox="0 0 24 24"><path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-3.5-2.2-5.7-3.8-8.5-.6 2-1.6 3-2.7 3.2.3-2.6-.6-4.9-2.7-6.7 0 3.7-4.8 6.4-4.8 12A6.5 6.5 0 0 0 12 21z"/><path d="M12 21c-1.6 0-2.8-1.2-2.8-2.8 0-1.7 1.3-2.6 2.8-4.2 1.5 1.6 2.8 2.5 2.8 4.2 0 1.6-1.2 2.8-2.8 2.8z"/></symbol>
  <symbol id="ic-box" viewBox="0 0 24 24"><path d="M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9M7.8 5.2l8.5 4.6"/></symbol>
  <symbol id="ic-bow" viewBox="0 0 24 24"><path d="M12 11c-2.5-3.5-6-5.5-8-4.5s-1.5 7 1 8.5c2 1.2 5-1.5 7-4zM12 11c2.5-3.5 6-5.5 8-4.5s1.5 7-1 8.5c-2 1.2-5-1.5-7-4z"/><path d="M11 12.5L8.5 20M13 12.5l2.5 7.5"/><circle cx="12" cy="11.3" r="1.4"/></symbol>
</svg>`;
function icon(name, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#ic-' + name + '"></use></svg>';
}

function renderHeader(isGamePage = false) {
    if (document.body) document.body.classList.add('has-header');
    let backBtnHTML = isGamePage ? `<a href="#" onclick="goToPage('/'); return false;" class="header-back">← <span>Назад</span></a>` : '';

    document.write(`
    ${ICON_SPRITE}
    <div id="preloader">
        <div class="preloader-logo">Donate by Yae Miko</div>
        <div class="preloader-bar"></div>
    </div>
    <div id="sakura-tree"></div>
    <div id="sakura-container"></div>

    <div class="modal-overlay" id="safety-modal" onclick="closeModal('safety-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()">
            <button class="close-modal-btn" onclick="closeModal('safety-modal')">×</button>
            <h2>${icon('shield', 'ic-t')}Почему с нами безопасно?</h2>
            <p>Донат безопасен, проверен годами и тысячами успешных заказов. Ваш аккаунт в надежных руках!</p>
            <ul style="list-style: none; padding: 0; color: #d8c3e0; font-size: 14px;">
                <li style="margin-bottom: 10px;">${icon('sakura', 'ic-li')}<b>Официальные проверки:</b> Мы неоднократно обращались в официальную поддержку разработчиков и проверяли наши методы оплаты на полную безопасность.</li>
                <li style="margin-bottom: 10px;">${icon('sakura', 'ic-li')}<b>Надежные алгоритмы:</b> Транзакции проходят прозрачно, без использования сомнительных сервисов и рисков блокировки.</li>
                <li style="margin-bottom: 10px;">${icon('sakura', 'ic-li')}<b>Конфиденциальность:</b> Ваши данные полностью защищены и никогда не сохраняются дольше необходимого времени для выполнения заказа.</li>
            </ul>
            <p style="text-align: center; color: #ff7eb3; font-weight: bold;">Доверьтесь лисице!</p>
        </div>
    </div>

    <div class="modal-overlay" id="support-modal" onclick="closeModal('support-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()">
            <button class="close-modal-btn" onclick="closeModal('support-modal')">×</button>
            <h2>${icon('headset', 'ic-t')}Центр поддержки</h2>
            <p style="color: #a097b0; font-size: 14px; margin-bottom: 20px;">Выберите удобный способ связи. История обращений привязана к вашему устройству.</p>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <a href="https://t.me/donate_oper" target="_blank" class="js-support-op" style="flex: 1; background: #2b5278; color: white; text-decoration: none; padding: 12px; border-radius: 12px; text-align: center; font-weight: bold; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.98 1.25-5.58 3.61-.53.36-1.01.54-1.44.53-.48-.01-1.41-.27-2.1-.5-.85-.28-1.52-.43-1.47-.9.03-.25.36-.51 1-.79 3.91-1.7 6.52-2.8 7.84-3.35 3.73-1.56 4.51-1.83 5.01-1.84.11 0 .36.03.49.14.11.09.14.22.15.34-.01.12-.01.27-.02.38z"/></svg>
                    Telegram
                </a>
                <button onclick="toggleTicketForm()" style="flex: 1; background: #ff7eb3; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: 0.3s; box-shadow: 0 0 15px rgba(255,126,179,0.3); display: flex; align-items: center; justify-content: center; gap: 8px;">${icon('pen', 'ic-white')}Создать тикет</button>
            </div>

            <div onclick="openScheduleModal()" style="text-align:center; color:#ff7eb3; font-size:13px; cursor:pointer; margin-bottom:18px; transition:0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">${icon('clock', 'ic-in')}Посмотреть часы работы →</div>

            <div id="ticket-form-section" style="display: none; background: rgba(30,25,38,0.6); padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #3a2b4d; animation: fadeIn 0.3s;">
                <textarea id="ticket-text" placeholder="Опишите вашу проблему максимально подробно..." style="width: 100%; height: 90px; background: #120f18; border: 1px solid #4a3b5d; border-radius: 8px; color: white; padding: 10px; box-sizing: border-box; resize: none; margin-bottom: 10px; font-family: inherit; font-size: 14px; outline: none;"></textarea>
                <button onclick="submitTicket()" style="width: 100%; background: linear-gradient(90deg, #ff4dff, #b300b3); border: none; color: white; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s;">Отправить вопрос</button>
            </div>

            <h3 style="font-size: 16px; margin-top: 20px; border-bottom: 1px solid #3a2b4d; padding-bottom: 10px; color: #fff; text-align: left;">История обращений</h3>
            <div id="tickets-history" style="max-height: 200px; overflow-y: auto; padding-right: 5px;">
                <div style="color: #a097b0; text-align: center; font-size: 13px; padding: 20px 0;">У вас пока нет тикетов.</div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="reviews-modal" onclick="closeModal('reviews-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()" style="max-width: 600px; width: 95%;">
            <button class="close-modal-btn" onclick="closeModal('reviews-modal')">×</button>
            <h2 style="margin-bottom: 5px;">${icon('heart', 'ic-t')}Отзывы наших клиентов</h2>
            <p style="color: #a097b0; font-size: 13px; margin-bottom: 15px;">Реальные комментарии из нашего Telegram-канала</p>

            <div style="background: rgba(20, 15, 25, 0.6); border-left: 3px solid #ff7eb3; padding: 12px 15px; border-radius: 0 12px 12px 0; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; color: #d8c3e0; line-height: 1.5;">
                    Нажмите на любой отзыв — откроются комментарии в Telegram, где можно написать автору лично и убедиться в честности нашего магазина.
                    <br><span style="color: #ff7eb3; font-weight: bold; font-size: 12px; display: inline-block; margin-top: 5px;">Пожалуйста, уважайте чужое личное пространство и не беспокойте людей в позднее время! ${icon('moon', 'ic-in')}</span>
                </p>
            </div>
            
            <div class="reviews-container" id="reviews-list" style="background: #120f18; border-radius: 15px; border: 1px solid #3a2b4d; padding: 10px; min-height: 150px;">
                </div>

            <a href="https://t.me/donatsgenshin" target="_blank" class="js-tg-channel" style="display: block; background: transparent; border: 1px solid #ff7eb3; color: #ff7eb3; text-decoration: none; padding: 12px; border-radius: 12px; text-align: center; font-weight: bold; transition: 0.3s; margin-top: 15px;" onmouseover="this.style.background='rgba(255, 126, 179, 0.2)'" onmouseout="this.style.background='transparent'">
                Перейти в канал
            </a>
        </div>
    </div>

    <div class="modal-overlay" id="settings-modal" onclick="closeModal('settings-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()">
            <button class="close-modal-btn" onclick="closeModal('settings-modal')">×</button>
            <h2>${icon('sliders', 'ic-t')}Настройки сайта</h2>
            <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #3a2b4d;">
                <div><div style="color:#fff;font-weight:bold;">Дерево сакуры</div><div style="color:#a097b0;font-size:12px;">Показывать ветвь на фоне</div></div>
                <label class="switch"><input type="checkbox" id="toggle-tree" onchange="updateSetting('tree', this.checked)"><span class="slider"></span></label>
            </div>
            <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #3a2b4d;">
                <div><div style="color:#fff;font-weight:bold;">Лепестки</div><div style="color:#a097b0;font-size:12px;">Падающая сакура</div></div>
                <label class="switch"><input type="checkbox" id="toggle-petals" onchange="updateSetting('petals', this.checked)"><span class="slider"></span></label>
            </div>
            <div style="margin-top:14px;">
                <div style="color:#fff;font-weight:bold;margin-bottom:4px;">${icon('sparkle', 'ic-in')}Качество эффектов</div>
                <div style="color:#a097b0;font-size:12px;margin-bottom:10px;">«Авто» само подберёт под ваше устройство</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="fx-btn" data-fx="auto" onclick="updateFx('auto')">${icon('wand', 'ic-in')}Авто</button>
                    <button class="fx-btn" data-fx="max" onclick="updateFx('max')">${icon('sparkle', 'ic-in')}Максимум</button>
                    <button class="fx-btn" data-fx="mid" onclick="updateFx('mid')">${icon('gauge', 'ic-in')}Средний</button>
                    <button class="fx-btn" data-fx="low" onclick="updateFx('low')">${icon('battery', 'ic-in')}Эконом</button>
                </div>
                <div id="fx-auto-hint" style="color:#7c7090;font-size:11px;margin-top:6px;min-height:14px;"></div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="orders-modal" onclick="closeModal('orders-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()" style="max-width: 500px; width: 90%;">
            <button class="close-modal-btn" onclick="closeModal('orders-modal')">×</button>
            <h2 style="margin-bottom: 5px;">${icon('bag', 'ic-t')}Мои заказы</h2>
            <p style="color: #a097b0; font-size: 13px; margin-bottom: 15px;">История ваших покупок</p>
            
            <div id="orders-list" style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                </div>
        </div>
    </div>

    <div class="modal-overlay" id="promos-modal" onclick="closeModal('promos-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()" style="max-width: 600px; width: 95%;">
            <button class="close-modal-btn" onclick="closeModal('promos-modal')">×</button>
            <h2 style="margin-bottom: 5px;">${icon('tag', 'ic-t')}Акции и новости</h2>
            <p style="color:#a097b0; font-size:13px; margin-bottom:18px;">Свежие предложения и обновления магазина</p>
            <div class="promo-grid" id="promo-grid"></div>
        </div>
    </div>

    <div class="modal-overlay" id="gift-modal" onclick="closeModal('gift-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()" style="max-width: 460px; width: 94%;">
            <button class="close-modal-btn" onclick="closeModal('gift-modal')">×</button>
            <h2 style="margin-bottom: 4px;">${icon('gift', 'ic-t')}Подарочная карта</h2>
            <p style="color:#a097b0; font-size:13px; margin-bottom:16px;">Подарите баланс близкому — он потратит его на любой заказ 🌸</p>
            <div class="auth-tabs">
                <button class="auth-tab active" id="gift-tab-buy" onclick="switchGiftTab('buy')">${icon('gift', 'ic-in')}Подарить</button>
                <button class="auth-tab" id="gift-tab-redeem" onclick="switchGiftTab('redeem')">${icon('ticket', 'ic-in')}Активировать код</button>
            </div>
            <div id="gift-pane-buy" class="gift-pane">
                <div class="gift-amounts" id="gift-amounts">
                    <button class="gift-amt" onclick="giftPickAmount(this,300)">300 ₽</button>
                    <button class="gift-amt" onclick="giftPickAmount(this,500)">500 ₽</button>
                    <button class="gift-amt active" onclick="giftPickAmount(this,1000)">1000 ₽</button>
                    <button class="gift-amt" onclick="giftPickAmount(this,2000)">2000 ₽</button>
                </div>
                <input id="gift-amount-custom" type="number" min="100" max="50000" placeholder="Или своя сумма, ₽" class="auth-input" oninput="giftCustomAmount()" style="margin-bottom:10px;">
                <input id="gift-from" type="text" maxlength="64" placeholder="От кого (ваше имя)" class="auth-input" style="margin-bottom:10px;">
                <input id="gift-message" type="text" maxlength="200" placeholder="Короткое пожелание (необязательно)" class="auth-input" style="margin-bottom:14px;">
                <button onclick="giftCheckout(this)" class="auth-btn-primary" id="gift-buy-btn">Оплатить подарок →</button>
                <div id="gift-buy-msg" class="auth-msg"></div>
            </div>
            <div id="gift-pane-redeem" class="gift-pane" style="display:none;">
                <input id="gift-code-input" type="text" placeholder="YAE-XXXX-XXXX" class="auth-input" style="margin-bottom:12px; text-align:center; letter-spacing:2px; text-transform:uppercase;">
                <button onclick="giftRedeem(this)" class="auth-btn-primary" id="gift-redeem-btn">Активировать →</button>
                <div id="gift-redeem-msg" class="auth-msg"></div>
            </div>
            <div id="gift-card-view" style="display:none;"></div>
        </div>
    </div>

    <div class="modal-overlay" id="auth-modal" onclick="closeModal('auth-modal', event)">
        <div class="custom-modal auth-card" onclick="event.stopPropagation()" style="max-width: 400px; width: 92%;">
            <button class="close-modal-btn" onclick="closeModal('auth-modal')">×</button>

            <div id="auth-login-view">
                <div class="auth-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ff7eb3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="34" height="34"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <h2 style="margin: 16px 0 4px; text-align: center; font-size: 22px;">Вход в личный кабинет</h2>
                <p style="color: #a097b0; font-size: 13px; text-align: center; margin-bottom: 22px;">Заказы, история покупок и быстрое оформление</p>

                <div class="auth-tabs">
                    <button class="auth-tab active" id="auth-tab-email" onclick="switchAuthTab('email')">${icon('mail', 'ic-in')}По почте</button>
                    <button class="auth-tab" id="auth-tab-tg" onclick="switchAuthTab('tg')">${icon('plane', 'ic-in')}Telegram</button>
                </div>

                <div id="auth-pane-email" class="auth-pane">
                    <label class="auth-label">Ваша почта</label>
                    <input id="email-login-input" type="email" placeholder="example@mail.ru" class="auth-input">
                    <button onclick="requestEmailCode()" class="auth-btn-primary">Получить код →</button>
                    <div id="email-code-step" style="display:none;">
                        <label class="auth-label" style="margin-top: 16px;">Код из письма</label>
                        <input id="email-code-input" type="text" inputmode="numeric" maxlength="6" placeholder="• • • • • •" class="auth-input auth-code-input">
                        <button onclick="verifyEmailCode()" class="auth-btn-primary">Войти →</button>
                    </div>
                    <div id="email-login-msg" class="auth-msg"></div>
                    <p class="auth-hint">${icon('lock', 'ic-in')}Без пароля — просто введите почту, мы пришлём код</p>
                </div>

                <div id="auth-pane-tg" class="auth-pane" style="display:none;">
                    <p style="color: #d8c3e0; font-size: 13px; text-align: center; margin: 4px 0 16px;">Вход через нашего бота — быстро и надёжно</p>
                    <button onclick="startTgLogin(this)" class="auth-btn-primary" id="tg-login-btn">${icon('plane', 'ic-in')}Войти через Telegram</button>
                    <div id="tg-login-status" class="auth-msg" style="text-align:center;"></div>
                    <p class="auth-hint">Откроется наш бот — нажмите в нём «Старт», и вход выполнится автоматически</p>
                </div>

                <div class="auth-privacy">Входя, вы соглашаетесь с <a href="/privacy" target="_blank">политикой конфиденциальности</a></div>
            </div>

            <div id="auth-account-view" style="display:none;">
                <div class="auth-avatar auth-avatar-on" id="auth-account-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#4dff88" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="34" height="34"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <h2 style="margin: 16px 0 2px; text-align: center; font-size: 22px;">С возвращением!</h2>
                <p id="auth-account-name" style="color: #ff7eb3; font-weight: bold; text-align: center; margin-bottom: 16px; word-break: break-all;">Имя</p>

                <div class="tier-box">
                    <div class="tier-badge"><span id="tier-icon">🌱</span> <span id="tier-name">Новичок</span> <span class="tier-disc" id="tier-disc"></span><span onclick="toast('🏆 Ранг растёт от общей суммы ваших заказов и даёт автоматическую скидку на будущие покупки: 🥉 Бронза от 5 000 ₽ (−1%), 🥇 Золото от 10 000 ₽ (−2%), 💎 Алмаз от 50 000 ₽ (−3%).', 'info')" title="Как работают ранги?" style="cursor:pointer;margin-left:7px;background:rgba(255,126,179,0.25);color:#fff;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;flex-shrink:0;">?</span></div>
                    <div class="tier-progress"><div class="tier-progress-fill" id="tier-progress-fill"></div></div>
                    <div class="tier-next" id="tier-next">Загрузка…</div>
                </div>

                <div class="ref-panel">
                    <div class="ref-stats">
                        <div class="ref-stat"><b id="ref-invited">0</b><small>приглашено</small></div>
                    </div>
                    <div class="ref-label">${icon('link', 'ic-in')}Ваша реферальная ссылка</div>
                    <div class="ref-link-row">
                        <input id="ref-link" class="auth-input" readonly value="" style="margin-bottom:0;">
                        <button id="ref-copy-btn" onclick="copyRefLink()" class="ref-copy-btn">Копировать</button>
                    </div>
                    <p class="auth-hint" style="margin-top:8px;">Вы оба получите −3% скидку: друг — на первый заказ, вы — на следующий</p>
                </div>

                <div class="promo-panel" style="background: rgba(20,15,30,0.7); border: 1px solid #3a2b4d; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px;">
                    <div class="ref-label" style="margin-bottom: 8px;">${icon('ticket', 'ic-in')}Промокод</div>
                    <div class="ref-link-row">
                        <input id="promo-code-input" class="auth-input" placeholder="Введите промокод…" maxlength="50"
                            style="margin-bottom:0; text-transform:uppercase; letter-spacing:1px;"
                            oninput="this.value=this.value.toUpperCase()">
                        <button onclick="applyPromoCode()" id="promo-apply-btn" class="ref-copy-btn">Применить</button>
                    </div>
                    <div id="promo-apply-msg" style="font-size:12px; margin-top:6px; min-height:16px;"></div>
                </div>

                <button onclick="closeModal('auth-modal'); openOrdersModal();" class="auth-btn-primary">${icon('bag', 'ic-in')}История заказов</button>
                <button onclick="logout()" class="auth-btn-danger">Выйти</button>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="order-success-modal" onclick="closeModal('order-success-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()" style="max-width: 420px; width: 92%; text-align:center;">
            <button class="close-modal-btn" onclick="closeModal('order-success-modal')">×</button>
            <div class="success-check">
                <svg viewBox="0 0 52 52"><circle class="sc-circle" cx="26" cy="26" r="24"/><path class="sc-tick" d="M14 27 l8 8 l16 -16"/></svg>
            </div>
            <h2 style="margin: 18px 0 8px;">Заказ успешно оформлен!</h2>
            <p id="order-success-text" style="color:#d8c3e0; font-size:14px; line-height:1.6;"></p>
            <p style="color:#a097b0; font-size:12.5px; line-height:1.6; margin-top:14px;">Если в течение указанного времени ничего не пришло — напишите в <b style="color:#ff7eb3; cursor:pointer; text-decoration:underline;" onclick="closeModal('order-success-modal'); showModal('support-modal');">поддержку</b>, и мы быстро поможем 💜</p>
            <button class="auth-btn-primary" style="margin-top:20px;" onclick="closeModal('order-success-modal')">Отлично!</button>
        </div>
    </div>

    <div class="modal-overlay" id="announce-modal" onclick="closeModal('announce-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()" style="max-width: 400px; width: 92%; text-align: center;">
            <button class="close-modal-btn" onclick="closeModal('announce-modal')">×</button>
            <div style="margin: 4px 0 2px;">${icon('megaphone', 'ic-hero')}</div>
            <h2 id="announce-title" style="margin-bottom: 10px;">Новости</h2>
            <p id="announce-text" style="color: #d8c3e0; font-size: 14px; line-height: 1.6; margin-bottom: 22px;"></p>
            <a id="announce-link" href="#" target="_blank" rel="noopener" class="auth-btn-primary" style="display: block; text-decoration: none;" onclick="closeModal('announce-modal')">Подписаться</a>
        </div>
    </div>

    <div class="modal-overlay" id="schedule-modal" onclick="closeModal('schedule-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()" style="max-width: 440px; width: 92%;">
            <button class="close-modal-btn" onclick="closeModal('schedule-modal')">×</button>
            <h2 style="margin-bottom:4px;">${icon('clock', 'ic-t')}Часы работы</h2>
            <p id="schedule-tz" style="color:#a097b0; font-size:13px; margin-bottom:16px;">Часовой пояс: —</p>
            <div id="schedule-list"></div>
            <div id="schedule-note" style="display:none; margin-top:14px; background:rgba(255,126,179,0.08); border:1px solid #3a2b4d; border-radius:12px; padding:12px 14px; font-size:13px; color:#d8c3e0; line-height:1.5;"></div>
        </div>
    </div>

    <header>
        <div class="logo-container">
            <a href="#" onclick="goToPage('/'); return false;" class="logo-link">Donate by Yae Miko</a>
            <button class="header-btn" onclick="openPromosModal()">${icon('tag')}Акции</button>
            <button class="header-btn" onclick="showModal('safety-modal')">${icon('shield')}Безопасность</button>
            <button class="header-btn" onclick="openReviewsModal()">${icon('heart')}Отзывы</button>
            <button class="header-btn" onclick="showModal('support-modal')">${icon('headset')}Поддержка</button>
        </div>
        <div class="header-right">
            ${backBtnHTML}
            <div class="profile-wrapper">
                <button class="profile-btn" onclick="openProfile()" id="profile-btn-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </button>
            </div>
            <div class="hamburger" id="hamburger-btn" onclick="toggleMobileMenu()">
                <span></span><span></span><span></span>
            </div>
        </div>
    </header>

    <div class="menu-overlay" id="menu-overlay" onclick="toggleMobileMenu()"></div>
    <nav class="side-menu" id="side-menu">
        <div class="side-menu-header">
            <span class="side-menu-title">Меню</span>
            <button class="side-menu-close" onclick="toggleMobileMenu()">✕</button>
        </div>
        <div class="side-menu-items">
            <a class="menu-item" onclick="openPromosModal(); toggleMobileMenu();">
                <span class="menu-item-ic">${icon('tag')}</span>
                <span class="menu-item-txt"><b>Акции</b><small>Скидки и новости</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
            <a class="menu-item" onclick="goToShop(); toggleMobileMenu();">
                <span class="menu-item-ic">${icon('bag')}</span>
                <span class="menu-item-txt"><b>Магазин</b><small>Перейти к товарам</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
            <a class="menu-item" onclick="openGiftModal(); toggleMobileMenu();">
                <span class="menu-item-ic">${icon('gift')}</span>
                <span class="menu-item-txt"><b>Подарить</b><small>Подарочная карта</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
            <a class="menu-item" onclick="openReviewsModal(); toggleMobileMenu();">
                <span class="menu-item-ic">${icon('heart')}</span>
                <span class="menu-item-txt"><b>Отзывы</b><small>Реальные комментарии</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
            <a class="menu-item" onclick="showModal('support-modal'); toggleMobileMenu();">
                <span class="menu-item-ic">${icon('headset')}</span>
                <span class="menu-item-txt"><b>Поддержка</b><small>Поможем с заказом</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
            <a class="menu-item" onclick="openScheduleModal(); toggleMobileMenu();">
                <span class="menu-item-ic">${icon('clock')}</span>
                <span class="menu-item-txt"><b>Часы работы</b><small>Когда мы на связи</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
            <a class="menu-item" onclick="showModal('safety-modal'); toggleMobileMenu();">
                <span class="menu-item-ic">${icon('shield')}</span>
                <span class="menu-item-txt"><b>Безопасность</b><small>Почему нам доверяют</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
            <a class="menu-item" onclick="openSettingsModal(); toggleMobileMenu();">
                <span class="menu-item-ic">${icon('sliders')}</span>
                <span class="menu-item-txt"><b>Настройки</b><small>Сакура, анимации</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
        </div>
        <a class="side-menu-tg js-tg-channel" href="https://t.me/donatsgenshin" target="_blank" rel="noopener">${icon('plane', 'ic-white')}Наш Telegram-канал</a>
    </nav>
    `);
}

function renderFooter() {
    document.write(`
    <footer>
        <div class="footer-logo">Yae Media Group</div>
        <div class="footer-text">
            Профессиональный сервис пополнения игровых балансов. Все внутриигровые товары, названия и торговые марки принадлежат их соответствующим владельцам.
        </div>
        <div style="margin-bottom: 10px;">
            <a href="/offer" style="color: #a097b0; font-size: 13px; text-decoration: underline;">Публичная оферта</a>
            &nbsp;·&nbsp;
            <a href="/privacy" style="color: #a097b0; font-size: 13px; text-decoration: underline;">Политика конфиденциальности</a>
        </div>
        <div class="footer-copy" style="margin-bottom: 6px; line-height: 1.7;">ОсОО «Глобал Бридж» · ОГРН 309678-3301-ООО · ИНН 9909704508<br>Кыргызская Республика, г. Бишкек, Октябрьский район, ул. Юнусалиева 185/1<br>${icon('mail', 'ic-in')}donatebyyaemiko@gmail.com</div>
        <div class="footer-copy">© 2021-2026 Yae Shop. Все права защищены.</div>
    </footer>

    <div id="cookie-banner" class="cookie-banner">
        <span class="ck-long">${icon('cookie', 'ic-in')}Мы используем файлы cookie и обрабатываем данные для работы сайта. Продолжая пользоваться сайтом, вы соглашаетесь с <a href="/privacy" target="_blank">политикой конфиденциальности</a>.</span>
        <span class="ck-short">Сайт использует cookie. Продолжая, вы соглашаетесь с <a href="/privacy" target="_blank">политикой конфиденциальности</a>.</span>
        <button onclick="acceptCookies()">Принять</button>
    </div>
    `);
}