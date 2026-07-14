// --- СЕССИЯ: токен автоматически уходит со всеми /api-запросами ---
function getSessionToken() { return localStorage.getItem('session_token') || ''; }
(function () {
    const _fetch = window.fetch;
    window.fetch = function (input, init) {
        try {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            const token = getSessionToken();
            if (token && url.indexOf('/api/') !== -1 && url.indexOf('//') === -1) {
                init = init || {};
                init.headers = new Headers(init.headers || {});
                if (!init.headers.has('Authorization')) init.headers.set('Authorization', 'Bearer ' + token);
            }
        } catch (e) {}
        return _fetch(input, init);
    };
})();

// --- ПЕРЕХОД ПО СТРАНИЦАМ ---
function goToPage(url) {
    document.body.classList.add('fade-out'); 
    setTimeout(() => { window.location.href = url; }, 150); 
}
window.addEventListener('pageshow', (e) => {
    if (e.persisted || document.body.classList.contains('fade-out')) document.body.classList.remove('fade-out');
    if (e.persisted) hidePreloader();
});

// --- Прелоадер: прячем после полной загрузки страницы ---
function hidePreloader() { const p = document.getElementById('preloader'); if (p) p.classList.add('hidden'); }
window.addEventListener('load', () => setTimeout(hidePreloader, 300));
setTimeout(hidePreloader, 4000); // подстраховка, если load долго не наступает

// --- МЕНЮ И МОДАЛКИ ---
function toggleMobileMenu() { 
    document.getElementById('side-menu').classList.toggle('active'); 
    document.getElementById('menu-overlay').classList.toggle('active'); 
    document.getElementById('hamburger-btn').classList.toggle('active'); 
}
// Пока открыта модалка — сайт под ней не листается (особенно важно на iPhone).
// body фиксируется на текущей позиции, при закрытии позиция возвращается.
let _modalScrollY = 0;
function _lockPageScroll() {
    if (document.body.classList.contains('modal-open')) return;
    _modalScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.top = (-_modalScrollY) + 'px';
    document.body.classList.add('modal-open');
}
function _unlockPageScroll() {
    if (document.querySelector('.modal-overlay.active')) return; // открыта другая модалка
    if (!document.body.classList.contains('modal-open')) return;
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, _modalScrollY);
}
function showModal(id) {
    document.getElementById(id).classList.add('active');
    _lockPageScroll();
    if (id === 'support-modal') loadTickets();
}
function closeModal(id, e) {
    if (!e || e.target.id === id || e.target.classList.contains('close-modal-btn')) {
        document.getElementById(id).classList.remove('active');
        _unlockPageScroll();
    }
}
function toggleFaq(el) { el.classList.toggle('active'); }

// --- ИСТОРИЯ ЗАКАЗОВ ---
// --- Повтор заказа («Заказать снова») ---
const REORDER_PAGES = {
    'Genshin Impact': '/genshin',
    'Honkai: Star Rail': '/hsr',
    'Wuthering Waves': '/wuwa',
    'Zenless Zone Zero': '/zzz'
};
function reorder(game, method, items) {
    const page = REORDER_PAGES[game];
    if (!page) { toast('Эту игру пока нельзя заказать повторно', 'info'); return; }
    localStorage.setItem('reorder', JSON.stringify({ game, method: method || 'login', items: items || {} }));
    goToPage(page);
}
function reorderById(id) {
    const o = (window.__ordersHistory || []).find(x => x.id === id);
    if (!o) return;
    let items = o.items;
    if (typeof items === 'string') { try { items = JSON.parse(items); } catch (e) { items = {}; } }
    reorder(o.game, o.method, items);
}
// Вызывается на странице игры: возвращает данные повтора, если они для этой игры
function consumeReorder(gameName) {
    try {
        const r = JSON.parse(localStorage.getItem('reorder') || 'null');
        if (r && r.game === gameName) { localStorage.removeItem('reorder'); return r; }
    } catch (e) {}
    return null;
}

// Трекер статуса: Оплата → Выполняется → Готово
function orderTrackerHTML(status) {
    // step: сколько шагов пройдено (0..3); fail — заказ отменён/ошибка
    let step = 0, fail = false;
    if (status === 'Ожидает оплаты' || status === 'В обработке') step = 1;
    else if (status === 'Оплачен') step = 2;
    else if (status === 'Выполнен') step = 3;
    else if (status === 'Отменён' || status === 'Отменен' || status === 'Ошибка оплаты') { step = 1; fail = true; }
    const labels = ['Оплата', 'Выполняется', 'Готово'];
    const dots = labels.map((l, i) => {
        const done = !fail && step > i;
        const cls = fail && i === 0 ? 'ot-dot ot-fail' : (done ? 'ot-dot ot-done' : 'ot-dot');
        return `<div class="ot-step"><span class="${cls}">${fail && i === 0 ? '✕' : (done ? '✓' : i + 1)}</span><small>${l}</small></div>`;
    }).join('<div class="ot-line' + '"></div>');
    return `<div class="order-tracker${fail ? ' ot-tracker-fail' : ''}">${dots}</div>`;
}

let _ordersRefreshTimer = null;
async function openOrdersModal() {
    showModal('orders-modal');
    // Автообновление статусов, пока окно открыто (раз в 20 секунд)
    clearInterval(_ordersRefreshTimer);
    _ordersRefreshTimer = setInterval(() => {
        const m = document.getElementById('orders-modal');
        if (!m || !m.classList.contains('active')) { clearInterval(_ordersRefreshTimer); return; }
        refreshOrdersList();
    }, 20000);
    await refreshOrdersList();
}
async function refreshOrdersList() {
    const container = document.getElementById('orders-list');
    // История берётся по токену сессии (уходит с запросом автоматически)
    if (!getSessionToken()) {
        container.innerHTML = '<div style="color: #a097b0; text-align: center; padding: 20px;">Пожалуйста, войдите (через Telegram или почту), чтобы видеть свои заказы.</div>';
        return;
    }

    // «Загрузку» показываем только при первом открытии — фоновое обновление не мигает
    if (!window.__ordersHistory) {
        container.innerHTML = '<div style="text-align:center; color:#a097b0; padding: 20px;">⏳ Загрузка заказов...</div>';
    }

    try {
        const res = await fetch('/api/orders/history');
        const data = await res.json();
        
        if (data.orders && data.orders.length > 0) {
            window.__ordersHistory = data.orders;
            container.innerHTML = '';
            data.orders.forEach(o => {
                let statusColor = '#a097b0';
                if (o.status === 'Оплачен' || o.status === 'Выполнен') statusColor = '#4dff88';
                if (o.status === 'Ожидает оплаты' || o.status === 'В обработке') statusColor = '#ffcc00';
                if (o.status === 'Ошибка оплаты' || o.status === 'Отменен') statusColor = '#ff4d4d';
                const canReorder = REORDER_PAGES[o.game] && o.items && Object.keys(o.items).length;

                container.innerHTML += `
                    <div style="background: rgba(20, 15, 25, 0.8); border: 1px solid #3a2b4d; border-radius: 12px; padding: 15px; margin-bottom: 10px; transition: 0.3s;" onmouseover="this.style.borderColor='#ff7eb3'" onmouseout="this.style.borderColor='#3a2b4d'">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: bold; color: #fff; margin-bottom: 5px;">Заказ #S${o.id} <span style="color: #a097b0; font-size: 12px; margin-left: 5px;">${_escHtml(o.game)}</span></div>
                                <div style="color: #ff7eb3; font-weight: bold; font-size: 16px;">${o.total_price} ₽</div>
                            </div>
                            <div style="color: ${statusColor}; font-weight: bold; font-size: 13px; background: rgba(0,0,0,0.3); padding: 5px 10px; border-radius: 8px;">
                                ${_escHtml(o.status || 'В обработке')}
                            </div>
                        </div>
                        ${orderTrackerHTML(o.status)}
                        ${canReorder ? `<button onclick="reorderById(${o.id})" style="margin-top: 12px; width: 100%; background: transparent; border: 1px solid #ff7eb3; color: #ff7eb3; padding: 9px; border-radius: 9px; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,126,179,0.12)'" onmouseout="this.style.background='transparent'">🔁 Заказать снова</button>` : ''}
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<div style="color: #a097b0; text-align: center; padding: 20px;">У вас пока нет заказов. Выберите игру в каталоге, чтобы оформить первую покупку!</div>';
        }
    } catch (e) {
        container.innerHTML = '<div style="color: #ff4d4d; text-align: center; padding: 20px;">Ошибка при загрузке. Попробуйте позже.</div>';
    }
}

// --- ЛОГИКА ОТЗЫВОВ ---
// --- ЛОГИКА ОТЗЫВОВ ---
function openReviewsModal() {
    showModal('reviews-modal');
    const container = document.getElementById('reviews-list');
    if (container.querySelector('iframe')) return;
    
    container.innerHTML = '<div style="text-align:center; color:#a097b0; padding: 30px;">⏳ Загрузка реальных отзывов из Telegram...</div>';
    
    setTimeout(() => {
        container.innerHTML = '';
        const script = document.createElement('script');
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        
        // Вот здесь вставлен твой новый пост (donatsgenshin/1363)
        script.setAttribute("data-telegram-discussion", "donatsgenshin/1363"); 
        
        script.setAttribute("data-comments-limit", "10");
        script.setAttribute("data-dark", "1");
        script.async = true;
        container.appendChild(script);
    }, 400);
}

// --- ЧАСЫ РАБОТЫ ---
function openScheduleModal() {
    showModal('schedule-modal');
    loadSchedule();
}
async function loadSchedule() {
    const list = document.getElementById('schedule-list');
    if (!list) return;
    list.innerHTML = '<div style="color:#a097b0;text-align:center;padding:14px;">Загрузка…</div>';
    try {
        const s = await (await fetch('/api/schedule')).json();
        const tz = document.getElementById('schedule-tz');
        if (tz) tz.innerText = 'Часовой пояс: ' + (s.timezone || '—');
        const days = [['mon', 'Понедельник'], ['tue', 'Вторник'], ['wed', 'Среда'], ['thu', 'Четверг'], ['fri', 'Пятница'], ['sat', 'Суббота'], ['sun', 'Воскресенье']];
        const todayIdx = (new Date().getDay() + 6) % 7; // 0 = Пн
        list.innerHTML = days.map((d, i) => {
            const val = (s.days && s.days[d[0]]) || '';
            const today = i === todayIdx;
            return `<div class="sched-row${today ? ' today' : ''}"><span>${d[1]}${today ? ' <span class="sched-today">сегодня</span>' : ''}</span><b>${val || 'Выходной'}</b></div>`;
        }).join('');
        const note = document.getElementById('schedule-note');
        if (note) {
            if (s.note) { note.style.display = 'block'; note.innerText = '📌 ' + s.note; }
            else { note.style.display = 'none'; }
        }
    } catch (e) {
        list.innerHTML = '<div style="color:#ff4d4d;text-align:center;padding:14px;">Не удалось загрузить график</div>';
    }
}

// --- АКЦИИ И НОВОСТИ (управляются через бота) ---
function openPromosModal() {
    showModal('promos-modal');
    loadPromos();
}
async function loadPromos() {
    const grid = document.getElementById('promo-grid');
    if (!grid) return;
    grid.innerHTML = '<p style="grid-column:1/-1;color:#a097b0;text-align:center;padding:20px;">Загрузка…</p>';
    try {
        const promos = await (await fetch('/api/promos')).json();
        if (!promos.length) {
            grid.innerHTML = '<p style="grid-column:1/-1;color:#a097b0;text-align:center;padding:20px;">Пока нет акций — загляни позже 🌸</p>';
            return;
        }
        grid.innerHTML = promos.map(p => `
            <div class="promo-card">
                <span class="promo-tag ${p.type || 'sale'}">${p.tag || ''}</span>
                <div class="promo-icon">${p.icon || '🔥'}</div>
                <h3>${p.title || ''}</h3>
                <p>${p.text || ''}</p>
            </div>`).join('');
    } catch (e) {
        grid.innerHTML = '<p style="grid-column:1/-1;color:#ff4d4d;text-align:center;padding:20px;">Не удалось загрузить акции</p>';
    }
}

// --- ПОПАП-ОБЪЯВЛЕНИЕ (вкл/выкл через бота: подписка на канал и т.п.) ---
async function initAnnounce() {
    if (!document.getElementById('announce-modal')) return;
    try {
        const a = await (await fetch('/api/announce')).json();
        if (!a || !a.enabled) return;
        const sig = (a.title || '') + '|' + (a.text || '') + '|' + (a.link || '');
        if (sessionStorage.getItem('announce_seen') === sig) return; // раз за сессию (пока не изменили текст)
        document.getElementById('announce-title').innerText = a.title || 'Новости';
        document.getElementById('announce-text').innerText = a.text || '';
        const link = document.getElementById('announce-link');
        link.href = a.link || '#';
        link.innerText = a.button || 'Подписаться';
        setTimeout(() => showModal('announce-modal'), 1300);
        sessionStorage.setItem('announce_seen', sig);
    } catch (e) {}
}

// --- ЛОГИКА ТИКЕТОВ ---
function getDeviceId() {
    let id = localStorage.getItem('device_id');
    if (!id) { id = 'dev_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('device_id', id); }
    return id;
}

function toggleTicketForm() {
    const form = document.getElementById('ticket-form-section');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function submitTicket() {
    const text = document.getElementById('ticket-text').value;
    if (!text.trim()) return alert('Пожалуйста, опишите проблему.');
    
    const tgUser = JSON.parse(localStorage.getItem('tg_user') || '{}');
    const userIdent = tgUser.id ? String(tgUser.id) : getDeviceId();
    const firstName = tgUser.first_name || 'Гость';

    const btn = document.querySelector('#ticket-form-section button');
    const oldText = btn.innerText; btn.innerText = "Отправка ⏳..."; btn.disabled = true;

    try {
        const res = await fetch('/api/tickets/create', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_ident: userIdent, message: text, first_name: firstName })
        });
        const data = await res.json();
        if (data.status === 'success') {
            document.getElementById('ticket-text').value = '';
            toggleTicketForm();
            loadTickets();
            alert('Тикет отправлен! Ожидайте ответа от поддержки.');
        } else { alert('Ошибка: ' + data.detail); }
    } catch (e) { alert('Ошибка сети. Проверьте интернет.'); }
    
    btn.innerText = oldText; btn.disabled = false;
}

async function loadTickets() {
    const container = document.getElementById('tickets-history');
    if (!container) return;

    const tgUser = JSON.parse(localStorage.getItem('tg_user') || '{}');
    const userIdent = tgUser.id ? String(tgUser.id) : getDeviceId();

    try {
        const res = await fetch(`/api/tickets/history?user_ident=${userIdent}`);
        const data = await res.json();
        
        if (data.tickets && data.tickets.length > 0) {
            container.innerHTML = '';
            data.tickets.forEach(t => {
                const isResolved = t.is_resolved === 1;
                const statusColor = isResolved ? '#4dff88' : '#ff7eb3';
                const statusText = isResolved ? '✅ Отвечен' : '⏳ В обработке';
                
                let replyHtml = '';
                if (isResolved && t.admin_reply) {
                    replyHtml = `<div style="margin-top: 10px; background: rgba(77, 255, 136, 0.1); padding: 10px; border-radius: 8px; border-left: 3px solid #4dff88; font-size: 13px; color: #d8c3e0; text-align: left;">
                                    <b style="color: #4dff88;">Ответ поддержки:</b><br>${_escHtml(t.admin_reply)}
                                 </div>`;
                }

                container.innerHTML += `
                    <div style="background: rgba(20, 15, 25, 0.8); border: 1px solid #3a2b4d; border-radius: 12px; padding: 12px; margin-bottom: 10px; text-align: left;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
                            <span style="color: #a097b0;">Тикет #${t.id}</span>
                            <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
                        </div>
                        <div style="color: #fff; font-size: 14px; line-height: 1.4;">${_escHtml(t.message)}</div>
                        ${replyHtml}
                    </div>
                `;
            });
        } else {
            container.innerHTML = '<div style="color: #a097b0; text-align: center; font-size: 13px; padding: 20px 0;">У вас пока нет тикетов.</div>';
        }
    } catch (e) { console.warn('Не удалось загрузить историю тикетов'); }
}

// --- КАЧЕСТВО ЭФФЕКТОВ: max / mid / low ---
// Пользователь выбирает в настройках; режим «Авто» меряет FPS и решает сам.
function fxMode() {
    const v = localStorage.getItem('setting_fx');
    if (v === 'max' || v === 'mid' || v === 'low') return v;
    return localStorage.getItem('fx_auto') || 'mid'; // результат авто-замера (до замера — средний)
}
function updateFx(mode) {
    if (mode === 'auto') {
        localStorage.removeItem('setting_fx');
        localStorage.removeItem('fx_auto'); // перемерим при следующей загрузке
        toast('Авто-режим: качество подберётся при следующей загрузке страницы', 'info');
    } else {
        localStorage.setItem('setting_fx', mode);
    }
    applySettings();
    if (typeof highlightFxButtons === 'function') highlightFxButtons();
}
// Замер FPS (только в режиме «Авто» и если ещё не меряли)
function initAutoFx() {
    // миграция со старого тумблера «Слабое устройство»
    if (localStorage.getItem('setting_lowend') === 'true' && !localStorage.getItem('setting_fx')) {
        localStorage.setItem('setting_fx', 'low');
        localStorage.removeItem('setting_lowend');
    }
    if (localStorage.getItem('setting_fx') || localStorage.getItem('fx_auto')) return;
    let frames = 0;
    let start = null;
    function tick(ts) {
        if (document.hidden) { start = null; frames = 0; requestAnimationFrame(tick); return; }
        if (start === null) { start = ts; frames = 0; }
        frames++;
        const elapsed = ts - start;
        if (elapsed >= 2500) {
            const fps = frames / (elapsed / 1000);
            const mode = fps >= 50 ? 'max' : (fps >= 32 ? 'mid' : 'low');
            localStorage.setItem('fx_auto', mode);
            applySettings();
            if (mode === 'low') toast('⚡ Включён экономный режим для плавной работы. Изменить можно в настройках.', 'info');
            return;
        }
        requestAnimationFrame(tick);
    }
    window.addEventListener('load', () => setTimeout(() => requestAnimationFrame(tick), 2000));
}
initAutoFx();

// --- НАСТРОЙКИ ---
function applySettings() {
    const isTreeOff = localStorage.getItem('setting_tree') === 'false';
    const isPetalsOff = localStorage.getItem('setting_petals') === 'false';
    const fx = fxMode();
    document.body.classList.toggle('no-tree', isTreeOff);
    document.body.classList.toggle('no-petals', isPetalsOff);
    document.body.classList.toggle('low-end-mode', fx === 'low');
    document.body.classList.toggle('fx-max', fx === 'max');
}
function updateSetting(key, val) { localStorage.setItem('setting_' + key, val); applySettings(); }
function highlightFxButtons() {
    const chosen = localStorage.getItem('setting_fx') || 'auto';
    document.querySelectorAll('.fx-btn').forEach(b => b.classList.toggle('active', b.dataset.fx === chosen));
    const hint = document.getElementById('fx-auto-hint');
    if (hint) {
        const auto = localStorage.getItem('fx_auto');
        const names = { max: '✨ Максимум', mid: '⚖️ Средний', low: '🔋 Эконом' };
        hint.innerText = (chosen === 'auto' && auto) ? ('Авто выбрал: ' + names[auto]) : '';
    }
}
function openSettingsModal() {
    document.getElementById('toggle-tree').checked = localStorage.getItem('setting_tree') !== 'false';
    document.getElementById('toggle-petals').checked = localStorage.getItem('setting_petals') !== 'false';
    highlightFxButtons();
    showModal('settings-modal');
}

// --- АНИМАЦИЯ САКУРЫ ---
const PETAL_PALETTES = [
    'linear-gradient(135deg, #ffe0ee 0%, #ffb0d4 100%)', // светлый
    'linear-gradient(135deg, #ffb7d5 0%, #ff7eb3 100%)', // основной
    'linear-gradient(135deg, #ff9ec7 0%, #ff5fa2 100%)'  // насыщенный
];
function createPetal() {
    const fx = fxMode();
    if (localStorage.getItem('setting_petals') === 'false' || fx === 'low') return;
    if (document.hidden) return; // вкладка не видна — не плодим лепестки
    const container = document.getElementById('sakura-container');
    if (!container) return;
    // Лимит живых лепестков: максимум — как раньше (много), средний — умеренно
    const isMobile = window.innerWidth <= 768;
    const cap = fx === 'max' ? (isMobile ? 18 : 40) : (isMobile ? 8 : 16);
    if (container.childElementCount >= cap) return;

    const petal = document.createElement('div');
    petal.classList.add('petal');
    const inner = document.createElement('div');
    inner.classList.add('petal-inner');

    // Размер (6–15px), форма чуть вытянутая как настоящий лепесток
    const size = Math.random() * 9 + 6;
    petal.style.width = size + 'px';
    petal.style.height = (size * 0.85) + 'px';

    // По всей ширине экрана
    petal.style.left = (Math.random() * 100) + 'vw';

    // Случайный оттенок сакуры
    inner.style.background = PETAL_PALETTES[Math.floor(Math.random() * PETAL_PALETTES.length)];

    // Падение: ровная скорость вниз
    const duration = Math.random() * 6 + 9; // 9–15с
    petal.style.setProperty('--fall-duration', duration + 's');

    // Покачивание: плавное, со своей амплитудой и скоростью
    inner.style.setProperty('--petal-opacity', (Math.random() * 0.4 + 0.5).toFixed(2)); // 0.5–0.9 (глубина)
    inner.style.setProperty('--sway', (Math.random() * 25 + 15).toFixed(0) + 'px');     // 15–40px
    inner.style.setProperty('--sway-duration', (Math.random() * 1.5 + 2.5).toFixed(1) + 's'); // 2.5–4с

    petal.appendChild(inner);
    container.appendChild(petal);
    setTimeout(() => petal.remove(), duration * 1000);
}
// Частота появления: на «Максимуме» — как в оригинале, на «Среднем» — вдвое реже
let _petalTick = 0;
setInterval(() => {
    _petalTick++;
    if (fxMode() !== 'max' && _petalTick % 2) return;
    createPetal();
}, window.innerWidth <= 768 ? 600 : 330);

// --- АНИМАЦИЯ ЦЕНЫ (плавная прокрутка цифр) ---
function animateNumber(el, to, suffix = ' ₽') {
    if (!el) return;
    const from = parseInt((el.dataset.val !== undefined ? el.dataset.val : el.innerText).replace(/\D/g, '')) || 0;
    el.dataset.val = to;
    if (from === to) { el.innerText = to + suffix; return; }
    const start = performance.now();
    const dur = 450;
    function tick(now) {
        if (String(el.dataset.val) !== String(to)) return; // началась новая анимация — выходим
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3); // плавное замедление
        const val = Math.round(from + (to - from) * eased);
        el.innerText = val + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.innerText = to + suffix;
    }
    requestAnimationFrame(tick);
}

// --- 3D-НАКЛОН КАРТОЧЕК ИГР ЗА МЫШКОЙ ---
function initCardTilt() {
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            if (document.body.classList.contains('low-end-mode')) return;
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            card.style.transition = 'transform 0.08s ease';
            card.style.transform = `perspective(700px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-8px) scale(1.03)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transition = 'transform 0.4s ease';
            card.style.transform = '';
        });
    });
}

// --- ПРОФИЛЬ И АВТОРИЗАЦИЯ ---
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('tg_user') || 'null') || JSON.parse(localStorage.getItem('email_user') || 'null');
}
function openProfile() {
    const user = getCurrentUser();
    const loginView = document.getElementById('auth-login-view');
    const accView = document.getElementById('auth-account-view');
    if (user) {
        loginView.style.display = 'none';
        accView.style.display = 'block';
        document.getElementById('auth-account-name').innerText = user.first_name || 'Гость';
        loadReferral();
        _restorePromoUI();
    } else {
        loginView.style.display = 'block';
        accView.style.display = 'none';
    }
    showModal('auth-modal');
}
function switchAuthTab(tab) {
    const isEmail = tab === 'email';
    document.getElementById('auth-tab-email').classList.toggle('active', isEmail);
    document.getElementById('auth-tab-tg').classList.toggle('active', !isEmail);
    document.getElementById('auth-pane-email').style.display = isEmail ? 'block' : 'none';
    document.getElementById('auth-pane-tg').style.display = isEmail ? 'none' : 'block';
}
// --- СОХРАНЕНИЕ КОРЗИНЫ (переживает перезагрузку страницы, живёт 3 дня) ---
function saveCartState(game, method, cart) {
    try {
        if (cart && Object.keys(cart).length) {
            localStorage.setItem('saved_cart_' + game, JSON.stringify({ method, cart, ts: Date.now() }));
        } else {
            localStorage.removeItem('saved_cart_' + game);
        }
    } catch (e) {}
}
function loadCartState(game) {
    try {
        const d = JSON.parse(localStorage.getItem('saved_cart_' + game) || 'null');
        if (d && d.cart && Date.now() - (d.ts || 0) < 3 * 24 * 3600 * 1000) return d;
        localStorage.removeItem('saved_cart_' + game);
    } catch (e) {}
    return null;
}

// --- ПРОМОКОД ---
async function applyPromoCode() {
    const input = document.getElementById('promo-code-input');
    const msg = document.getElementById('promo-apply-msg');
    const btn = document.getElementById('promo-apply-btn');
    if (!input || !msg) return;
    const code = (input.value || '').trim().toUpperCase();
    if (!code) { msg.style.color = '#ff4d4d'; msg.innerText = 'Введите промокод'; return; }
    const oldText = btn.innerText; btn.innerText = '⏳...'; btn.disabled = true;
    try {
        const res = await fetch('/api/promo/check?code=' + encodeURIComponent(code));
        const data = await res.json();
        if (res.ok && data.valid) {
            localStorage.setItem('promo_code_applied', code);
            const discText = data.discount_type === 'percent'
                ? `−${data.discount_value}%`
                : `−${data.discount_value}₽`;
            msg.style.color = '#4dff88';
            msg.innerText = `✅ Применён! Скидка ${discText} на следующий заказ`;
            btn.innerText = 'Изменить';
            btn.disabled = false;
        } else {
            msg.style.color = '#ff4d4d';
            msg.innerText = data.detail || 'Промокод не действителен';
            btn.innerText = oldText; btn.disabled = false;
        }
    } catch (e) {
        msg.style.color = '#ff4d4d'; msg.innerText = 'Ошибка сети';
        btn.innerText = oldText; btn.disabled = false;
    }
}
function clearPromoCode() {
    localStorage.removeItem('promo_code_applied');
    const input = document.getElementById('promo-code-input');
    const msg = document.getElementById('promo-apply-msg');
    if (input) input.value = '';
    if (msg) { msg.style.color = ''; msg.innerText = ''; }
}
function _restorePromoUI() {
    const saved = localStorage.getItem('promo_code_applied');
    const input = document.getElementById('promo-code-input');
    const msg = document.getElementById('promo-apply-msg');
    const btn = document.getElementById('promo-apply-btn');
    if (!saved || !input) return;
    input.value = saved;
    if (msg) { msg.style.color = '#4dff88'; msg.innerText = `✅ Промокод активен: ${saved}`; }
    if (btn) btn.innerText = 'Изменить';
}

// --- РЕФЕРАЛЬНАЯ ПРОГРАММА ---
function myRefCode() {
    const tg = JSON.parse(localStorage.getItem('tg_user') || 'null');
    const em = JSON.parse(localStorage.getItem('email_user') || 'null');
    if (tg && tg.id) return 't' + tg.id;
    if (em && em.id) return 'e' + em.id;
    return '';
}
async function loadReferral() {
    const code = myRefCode();
    const linkEl = document.getElementById('ref-link');
    if (!code || !linkEl) return;
    linkEl.value = location.origin + '/index.html?ref=' + code;
    try {
        const d = await (await fetch('/api/referral/info?code=' + encodeURIComponent(code))).json();
        document.getElementById('ref-invited').innerText = d.invited;
        renderTier(d.tier);
    } catch (e) {}
}
function renderTier(t) {
    if (!t || !document.getElementById('tier-name')) return;
    document.getElementById('tier-icon').innerText = t.icon || '🌱';
    document.getElementById('tier-name').innerText = t.name || 'Новичок';
    document.getElementById('tier-disc').innerText = t.discount ? ('−' + t.discount + '% на заказы') : '';
    const fill = document.getElementById('tier-progress-fill');
    const nextEl = document.getElementById('tier-next');
    if (t.next_at) {
        const pct = Math.min(100, Math.round((t.spent / t.next_at) * 100));
        fill.style.width = pct + '%';
        nextEl.innerHTML = `Потрачено <b>${t.spent}₽</b> из <b>${t.next_at}₽</b> до ${t.next_icon || ''} ${t.next_name}`;
    } else {
        fill.style.width = '100%';
        nextEl.innerHTML = `Максимальный уровень! 🎉 Потрачено <b>${t.spent}₽</b>`;
    }
}
function copyRefLink() {
    const i = document.getElementById('ref-link');
    if (!i) return;
    i.select();
    navigator.clipboard.writeText(i.value).then(() => {
        const b = document.getElementById('ref-copy-btn');
        if (b) { const t = b.innerText; b.innerText = '✓ Скопировано'; setTimeout(() => b.innerText = t, 1500); }
    });
}
async function initCheckoutReferral() {
    const box = document.getElementById('ref-checkout-box');
    if (!box) return;
    let show = false;

    // Активный промокод — показываем в корзине, что скидка применится
    const promoCode = localStorage.getItem('promo_code_applied');
    let promoNote = document.getElementById('promo-checkout-note');
    if (promoCode) {
        try {
            const pd = await (await fetch('/api/promo/check?code=' + encodeURIComponent(promoCode))).json();
            if (pd && pd.valid) {
                if (!promoNote) {
                    promoNote = document.createElement('div');
                    promoNote.id = 'promo-checkout-note';
                    box.insertBefore(promoNote, box.firstChild);
                }
                const discText = pd.discount_type === 'percent' ? `−${pd.discount_value}%` : `−${pd.discount_value}₽`;
                promoNote.innerHTML = `🎟 Промокод <b>${promoCode}</b> (${discText}) применится при оплате`;
                promoNote.style.display = 'block';
                show = true;
            } else {
                localStorage.removeItem('promo_code_applied'); // код протух — убираем
                if (promoNote) promoNote.style.display = 'none';
            }
        } catch (e) {}
    } else if (promoNote) promoNote.style.display = 'none';
    const myCode = myRefCode();
    const refCode = localStorage.getItem('ref_code');
    const note = document.getElementById('ref-discount-note');
    if (refCode && myCode && refCode !== myCode) { if (note) note.style.display = 'block'; show = true; }
    else if (note) note.style.display = 'none';
    const balRow = document.getElementById('ref-balance-row');
    const tierNote = document.getElementById('tier-discount-note');
    if (myCode) {
        try {
            const d = await (await fetch('/api/referral/info?code=' + encodeURIComponent(myCode))).json();
            if (tierNote && d.tier && d.tier.discount > 0) {
                tierNote.innerHTML = `${d.tier.icon} Скидка статуса <b>${d.tier.name}</b> −${d.tier.discount}% уже учтена`;
                tierNote.style.display = 'block'; show = true;
            } else if (tierNote) tierNote.style.display = 'none';
            if (balRow) balRow.style.display = 'none'; // баланс применяется автоматически, без чекбокса
        } catch (e) {}
    }
    box.style.display = show ? 'block' : 'none';
}
function onTelegramAuth(user) {
    fetch('/api/auth/telegram', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(user) })
    .then(res => res.json()).then(data => { if(data.status==='success'){ localStorage.setItem('tg_user', JSON.stringify(user)); if(data.token) localStorage.setItem('session_token', data.token); location.reload(); }});
}
// Подсветка кнопки профиля, когда пользователь вошёл
function showUserProfile(user) {
    const btn = document.getElementById('profile-btn-icon');
    if (!btn) return;
    if (user.photo_url) {
        btn.innerHTML = `<img src="${user.photo_url}" style="width:100%;height:100%;object-fit:cover;">`;
    }
    btn.classList.add('logged-in');
}
// --- ВХОД ПО ПОЧТЕ + КОД ---
async function requestEmailCode() {
    const email = (document.getElementById('email-login-input').value || '').trim();
    const msg = document.getElementById('email-login-msg');
    if (!email) { msg.style.color = '#ff4d4d'; msg.innerText = 'Введите почту'; return; }
    msg.style.color = '#a097b0'; msg.innerText = 'Отправляем код ⏳...';
    try {
        const res = await fetch('/api/auth/email/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('email-code-step').style.display = 'block';
            msg.style.color = '#4dff88'; msg.innerText = 'Код отправлен на почту ✉️';
        } else { msg.style.color = '#ff4d4d'; msg.innerText = data.detail || 'Ошибка'; }
    } catch (e) { msg.style.color = '#ff4d4d'; msg.innerText = 'Ошибка сети'; }
}
async function verifyEmailCode() {
    const email = (document.getElementById('email-login-input').value || '').trim();
    const code = (document.getElementById('email-code-input').value || '').trim();
    const msg = document.getElementById('email-login-msg');
    if (!code) { msg.style.color = '#ff4d4d'; msg.innerText = 'Введите код'; return; }
    msg.style.color = '#a097b0'; msg.innerText = 'Проверяем ⏳...';
    try {
        const res = await fetch('/api/auth/email/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('email_user', JSON.stringify({ first_name: data.user.masked, email: data.user.email, id: data.user.id, type: 'email' }));
            if (data.token) localStorage.setItem('session_token', data.token);
            location.reload();
        } else { msg.style.color = '#ff4d4d'; msg.innerText = data.detail || 'Неверный код'; }
    } catch (e) { msg.style.color = '#ff4d4d'; msg.innerText = 'Ошибка сети'; }
}

function logout() { localStorage.removeItem('tg_user'); localStorage.removeItem('email_user'); localStorage.removeItem('session_token'); location.reload(); }

// === Товары: категории + карточки (общий рендер для всех игр) ===
let PRODUCT_META = {};
let CATEGORY_ICONS = {};
let DISCOUNTS_DATA = {};
async function loadProductMeta() {
    // Все три запроса — параллельно (быстрее загрузка товаров)
    const [disc, meta, icons] = await Promise.all([
        fetch('/api/discounts').then(r => r.json()).catch(() => ({})),
        Object.keys(PRODUCT_META).length ? Promise.resolve(PRODUCT_META) : fetch('/api/product_meta').then(r => r.json()).catch(() => ({})),
        fetch('/api/category_icons').then(r => r.json()).catch(() => ({}))
    ]);
    DISCOUNTS_DATA = disc || {};
    PRODUCT_META = meta || {};
    CATEGORY_ICONS = icons || {};
}
function catLabel(cat) {
    const ic = CATEGORY_ICONS[cat];
    return ic ? (ic + ' ' + cat) : cat;
}
function productCardHTML(name, price, icon, nameDecorator, discounts) {
    // Экранируем ' для JS-строки и " для HTML-атрибута (иначе товары с кавычками в названии не кладутся в корзину)
    const safeName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const dataName = encodeURIComponent(name);
    const disc = DISCOUNTS_DATA[name] || (discounts && discounts[name]) || 0;
    let badge = '', priceHtml = price + ' ₽';
    if (disc > 0) {
        const oldP = Math.round(price / (1 - disc / 100));
        badge = `<div class="discount-badge">-${disc}%</div>`;
        priceHtml = `<span class="old-price">${oldP} ₽</span>${price} ₽`;
    }
    const disp = nameDecorator ? nameDecorator(name) : name;
    return `<div class="product-card">${badge}
        <div class="product-info-top"><div class="product-icon">${icon}</div><div class="product-name">${disp}</div></div>
        <div class="product-info-bottom">
            <div class="product-price">${priceHtml}</div>
            <div class="card-controls">
                <button class="minus-btn" data-name="${dataName}" onclick="removeFromCart('${safeName}')">−</button>
                <button class="buy-btn" data-name="${dataName}" onclick="addToCart(event, '${safeName}')">В корзину</button>
            </div>
        </div></div>`;
}
function renderGroupedProducts(gridId, serverPrices, method, game, getIcon, nameDecorator, discounts) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const meta = PRODUCT_META[game] || {};
    const cur = serverPrices[method] || {};
    const otherMethod = method === 'uid' ? 'login' : 'uid';
    const other = serverPrices[otherMethod] || {};
    const otherLabel = otherMethod === 'uid' ? 'по UID' : 'по входу';
    const availNow = n => cur[n] && cur[n] != 0;
    const availOther = n => other[n] && other[n] != 0;

    // Без меты — плоский список доступных
    if (!Object.keys(meta).length) {
        const names = Object.keys(cur).filter(availNow);
        grid.classList.remove('grouped');
        grid.innerHTML = names.length
            ? names.map(n => productCardHTML(n, cur[n], getIcon(n), nameDecorator, discounts)).join('')
            : '<p style="grid-column:1/-1;color:#a097b0;">Товары не загружены.</p>';
        return;
    }

    // Группируем ВСЕ товары (из обоих методов), порядок категорий — по первому появлению
    const order = [];
    const groups = {};
    const allKeys = Object.keys(cur).concat(Object.keys(other).filter(k => !(k in cur)));
    allKeys.forEach(n => {
        if (!availNow(n) && !availOther(n)) return;
        const cat = (meta[n] && meta[n].cat) || 'Другое';
        if (!groups[cat]) { groups[cat] = []; order.push(cat); }
        groups[cat].push(n);
    });
    const priceOf = n => availNow(n) ? cur[n] : (other[n] || 0);
    Object.values(groups).forEach(arr => arr.sort((a, b) => priceOf(a) - priceOf(b)));

    const allNow = order.reduce((acc, c) => acc.concat(groups[c].filter(availNow)), []);
    window.__catCtx = { groups, cur, getIcon, nameDecorator, discounts, allNow, availNow, otherLabel };

    grid.classList.add('grouped');
    const searchBox = `<input class="prod-search" id="prod-search" type="search" placeholder="🔍 Поиск товара…" autocomplete="off" oninput="searchProducts(this.value)">`;
    const chips = searchBox + `<div class="cat-tabs"><button class="cat-tab active" data-cat="__all" onclick="filterCategory(this)">Все <span class="cat-count">${allNow.length}</span></button>` +
        order.map(c => {
            const cnt = groups[c].filter(availNow).length;
            const badge = cnt > 0 ? `<span class="cat-count">${cnt}</span>` : `<span class="cat-count cat-locked">${otherLabel}</span>`;
            return `<button class="cat-tab${cnt === 0 ? ' cat-tab-locked' : ''}" data-cat="${encodeURIComponent(c)}" onclick="filterCategory(this)">${catLabel(c)} ${badge}</button>`;
        }).join('') +
        `</div>`;
    const cards = allNow.map(n => productCardHTML(n, cur[n], getIcon(n), nameDecorator, discounts)).join('');
    grid.innerHTML = chips + `<div class="prod-grid" id="prod-grid-main">${cards}</div>`;
}
function searchProducts(query) {
    const ctx = window.__catCtx;
    const grid = document.getElementById('prod-grid-main');
    if (!ctx || !grid) return;
    const q = (query || '').trim().toLowerCase();
    if (!q) {
        // Пустой запрос — возвращаем активную категорию
        const active = document.querySelector('.cat-tab.active');
        if (active) filterCategory(active);
        return;
    }
    // Ищем по ВСЕМ доступным товарам, независимо от выбранной категории
    const items = ctx.allNow.filter(n => n.toLowerCase().includes(q));
    grid.innerHTML = items.length
        ? items.map(n => productCardHTML(n, ctx.cur[n], ctx.getIcon(n), ctx.nameDecorator, ctx.discounts)).join('')
        : `<div class="cat-unavailable">😔 Ничего не нашлось по запросу «${_escHtml(q)}»</div>`;
    if (typeof updateCartUI === 'function') updateCartUI();
}
function filterCategory(el) {
    const ctx = window.__catCtx;
    if (!ctx) return;
    const search = document.getElementById('prod-search');
    if (search) search.value = ''; // выбор категории сбрасывает поиск
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const cat = (el.dataset.cat && el.dataset.cat !== '__all') ? decodeURIComponent(el.dataset.cat) : '__all';
    const grid = document.getElementById('prod-grid-main');
    if (!grid) return;
    grid.style.opacity = '0';
    setTimeout(() => {
        const items = (cat === '__all') ? ctx.allNow : (ctx.groups[cat] || []).filter(ctx.availNow);
        if (items.length) {
            grid.innerHTML = items.map(n => productCardHTML(n, ctx.cur[n], ctx.getIcon(n), ctx.nameDecorator, ctx.discounts)).join('');
        } else {
            grid.innerHTML = `<div class="cat-unavailable">🔒 Эти товары доступны при пополнении <b>${ctx.otherLabel}</b>.<br>Переключите метод вверху страницы ☝️</div>`;
        }
        grid.style.opacity = '1';
        if (typeof updateCartUI === 'function') updateCartUI();
    }, 150);
}

// --- Глазок на пароле + «видно пока печатаешь» ---
const PW_EYE_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const PW_EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
function enhancePasswordFields() {
    document.querySelectorAll('input[type="password"]').forEach(inp => {
        if (inp.dataset.pwEnhanced) return;
        inp.dataset.pwEnhanced = '1';
        const wrap = document.createElement('div');
        wrap.className = 'pw-wrap';
        inp.parentNode.insertBefore(wrap, inp);
        wrap.appendChild(inp);
        inp.style.paddingRight = '42px';
        const eye = document.createElement('button');
        eye.type = 'button'; eye.className = 'pw-eye'; eye.setAttribute('tabindex', '-1');
        eye.setAttribute('aria-label', 'Показать пароль');
        eye.innerHTML = PW_EYE_OPEN;
        wrap.appendChild(eye);
        eye.addEventListener('click', () => {
            const show = inp.type === 'password';
            inp.type = show ? 'text' : 'password';
            eye.innerHTML = show ? PW_EYE_OFF : PW_EYE_OPEN;
            inp.focus();
        });
    });
}
function bindEnter(id, fn) {
    const el = document.getElementById(id);
    if (el && !el.dataset.enterBound) {
        el.dataset.enterBound = '1';
        el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); fn(); } });
    }
}

// --- Cookie-баннер (152-ФЗ) ---
function acceptCookies() {
    localStorage.setItem('cookie_ok', '1');
    const b = document.getElementById('cookie-banner');
    if (b) b.classList.remove('show');
}
function initCookieBanner() {
    if (localStorage.getItem('cookie_ok')) return;
    const b = document.getElementById('cookie-banner');
    if (b) setTimeout(() => b.classList.add('show'), 800);
}

// --- Плавающая кнопка корзины (только на страницах игр) ---
function initFloatingCartBtn() {
    const totalEl = document.getElementById('checkout-total-price');
    if (!totalEl) return; // не страница игры — выходим

    const btn = document.createElement('div');
    btn.id = 'cart-float-btn';
    btn.title = 'Перейти к корзине';
    btn.innerHTML = '<span class="cfb-icon">🛒</span><span class="cfb-sum" id="cfb-sum-text">0 ₽</span>';
    btn.addEventListener('click', () => {
        const cart = document.querySelector('.cart-right');
        if (!cart) return;
        // Скроллим так, чтобы верх корзины оказался сразу под липкой шапкой
        // (scrollIntoView на телефоне промахивался ниже корзины)
        const head = document.querySelector('header');
        const offset = (head ? head.offsetHeight : 0) + 12;
        const y = cart.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    });
    document.body.appendChild(btn);

    function updateBtn() {
        const text = totalEl.innerText || '0';
        const total = parseInt(text.replace(/\D/g, '')) || 0;
        btn.style.display = total > 0 ? 'flex' : 'none';
        const sumEl = document.getElementById('cfb-sum-text');
        if (sumEl) sumEl.innerText = total + ' ₽';
    }

    new MutationObserver(updateBtn).observe(totalEl, { childList: true, characterData: true, subtree: true });
    updateBtn();
}

// --- PWA: регистрация service worker (установка как приложение) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}

// --- «Запомнить мои данные» (контакт + UID, только локально в браузере) ---
function initRememberContact() {
    const contact = document.getElementById('contact-input');
    if (!contact || document.getElementById('remember-me')) return; // только на странице игры
    const uid = document.getElementById('uid-input');

    const lbl = document.createElement('label');
    lbl.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer;font-size:12px;color:#a097b0;';
    lbl.innerHTML = '<input type="checkbox" id="remember-me" style="accent-color:#ff7eb3;width:16px;height:16px;flex-shrink:0;"> Запомнить мои данные на этом устройстве';
    (contact.closest('.input-field') || contact).insertAdjacentElement('afterend', lbl);
    const cb = document.getElementById('remember-me');

    const saved = JSON.parse(localStorage.getItem('saved_contact') || 'null');
    cb.checked = true; // по умолчанию включено
    if (saved) {
        if (saved.contact && !contact.value) contact.value = saved.contact;
        if (uid && saved.uid && !uid.value) uid.value = saved.uid;
        if (saved.contactMethod === 'vk' && typeof switchContact === 'function') switchContact('vk');
    }

    function save() {
        if (!cb.checked) { localStorage.removeItem('saved_contact'); return; }
        localStorage.setItem('saved_contact', JSON.stringify({
            contact: contact.value || '',
            uid: uid ? (uid.value || '') : '',
            contactMethod: (typeof currentContact !== 'undefined') ? currentContact : 'tg'
        }));
    }
    contact.addEventListener('input', save);
    if (uid) uid.addEventListener('input', save);
    cb.addEventListener('change', save);
}

// --- Красивые toast-уведомления (заменяют системный alert) ---
function toast(msg, type) {
    const m = String(msg);
    if (!type) {
        if (/✅|успешн/i.test(m)) type = 'success';
        else if (/❌|ошибк|пожалуйста|пуст|неверн|не удал|укажите/i.test(m)) type = 'error';
        else type = 'info';
    }
    let box = document.getElementById('toast-box');
    if (!box) { box = document.createElement('div'); box.id = 'toast-box'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : '🔔');
    t.innerHTML = `<span class="toast-ic">${icon}</span><span class="toast-msg">${m.replace(/^\s*[✅❌⚠️🔔]\s*/, '')}</span><button class="toast-close" aria-label="Закрыть">×</button>`;
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    let closed = false;
    const hide = () => { if (closed) return; closed = true; t.classList.remove('show'); setTimeout(() => t.remove(), 400); };
    t.querySelector('.toast-close').addEventListener('click', hide);
    setTimeout(hide, 6000);
}
// Все вызовы alert() по всему сайту теперь показывают красивый тост
window.alert = function (m) { toast(m); };

// --- Конфетти (вау-эффект при успешном заказе) ---
function confetti() {
    const colors = ['#ff7eb3', '#ff4dff', '#b300b3', '#4dff88', '#ffd24d', '#ffffff'];
    for (let i = 0; i < 90; i++) {
        const c = document.createElement('div');
        c.className = 'confetti-piece';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.animationDelay = (Math.random() * 0.35) + 's';
        c.style.animationDuration = (2 + Math.random() * 1.6) + 's';
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 4200);
    }
}

// --- Окно «Заказ оформлен» (вместо конфетти) ---
function showOrderSuccess(method) {
    const txt = document.getElementById('order-success-text');
    if (txt) {
        if (method === 'uid') {
            txt.innerHTML = 'Пополнение по <b>UID</b> придёт <b>в течение 15 минут</b> после поступления оплаты. Можно ни о чём не беспокоиться 💫';
        } else {
            txt.innerHTML = 'Вы выбрали пополнение <b>по входу</b> — наш менеджер свяжется с вами для входа в аккаунт. Обычно это занимает <b>15–30 минут</b>. Ожидайте 🌸';
        }
    }
    showModal('order-success-modal');
    const check = document.querySelector('#order-success-modal .success-check');
    if (check) { check.classList.remove('play'); void check.offsetWidth; check.classList.add('play'); }
}

// --- Контент сайта (управляется через бота: заголовок, FAQ, значки, контакты) ---
function _escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
async function applySiteContent() {
    let c;
    try { c = await (await fetch('/api/site_content')).json(); } catch (e) { return; }
    if (!c) return;
    // Заголовок главной (только на index)
    if (c.hero_title) { const h = document.getElementById('hero-title'); if (h) h.innerText = c.hero_title; }
    // Значки доверия (только на index)
    const badges = document.getElementById('trust-badges');
    if (badges && Array.isArray(c.badges)) {
        badges.innerHTML = c.badges.map(b => `<div class="badge">${_escHtml(b)}</div>`).join('');
    }
    // FAQ (только на index); пустой FAQ — прячем секцию, чтобы не висел голый заголовок
    const list = document.getElementById('faq-list');
    if (list) {
        const sec = list.closest('.faq-section');
        if (sec) sec.style.display = (Array.isArray(c.faq) && c.faq.length) ? '' : 'none';
    }
    if (list && Array.isArray(c.faq)) {
        list.innerHTML = c.faq.map(item => `
            <div class="faq-item" onclick="toggleFaq(this)">
                <div class="faq-question">${_escHtml(item.q)} <span class="faq-icon">▼</span></div>
                <div class="faq-answer-wrapper"><div class="faq-answer">
                    <div class="faq-answer-inner">${_escHtml(item.a)}</div>
                </div></div>
            </div>`).join('');
    }
    // Предзаказы Genshin (галочка в корзине; включается в боте — /preorder)
    const preorderBox = document.getElementById('preorder-box');
    if (preorderBox) preorderBox.style.display = c.preorder_genshin ? 'flex' : 'none';
    // Контакты/ссылки (на всех страницах — в шапке/футере/модалках)
    if (c.tg_channel) document.querySelectorAll('.js-tg-channel').forEach(a => { a.href = c.tg_channel; });
    if (c.support_operator) document.querySelectorAll('.js-support-op').forEach(a => { a.href = c.support_operator; });
    // Яндекс.Метрика — включается когда в контенте сайта задан номер счётчика
    if (c.metrika_id && !window.__ymLoaded) {
        window.__ymLoaded = true;
        const id = parseInt(c.metrika_id, 10);
        if (id) {
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],
            k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
            ym(id, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Запоминаем реферальный код из ссылки ?ref=...
    const refParam = new URLSearchParams(location.search).get('ref');
    if (refParam) localStorage.setItem('ref_code', refParam.slice(0, 50));

    const savedUser = localStorage.getItem('tg_user') || localStorage.getItem('email_user');
    if (savedUser) showUserProfile(JSON.parse(savedUser));
    initCheckoutReferral();
    enhancePasswordFields();
    initRememberContact();
    bindEnter('email-login-input', requestEmailCode);
    bindEnter('email-code-input', verifyEmailCode);
    initCookieBanner();
    initAnnounce();
    applySiteContent();
    applySettings();
    initCardTilt();
    initFloatingCartBtn();
});