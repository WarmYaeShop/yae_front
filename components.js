// === Картинки с CDN ===
// Картинки, заменённые админом через бота, лежат на CDN (контейнеры на сервере
// эфемерны — файлы там не хранятся). Сервер отдаёт карту {файл: ссылка} по
// /api/images; здесь подменяем локальные images/<файл> на ссылку CDN — и у уже
// вставленных <img>, и у создаваемых динамически (карточки товаров).
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
            // Если CDN-ссылка не загрузится — возвращаем локальную картинку
            // (для дефолтных она есть в репо). Сайт не ломается при любом CDN.
            img.onerror = function () { img.onerror = null; img.src = localSrc; };
            img.src = window.__imgMap[name];
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
    fetch('/api/images').then(function (r) { return r.json(); }).then(function (d) {
        window.__imgMap = (d && d.images) || {};
        sweep(document);
    }).catch(function () {});
    document.addEventListener('DOMContentLoaded', function () { sweep(document); });
})();

function renderHeader(isGamePage = false) {
    let backBtnHTML = isGamePage ? `<a href="#" onclick="goToPage('/'); return false;" style="color: #d8c3e0; text-decoration: none; font-weight: bold; font-size: 16px; margin-right: 20px; transition: 0.3s; display: flex; align-items: center; z-index: 150;">← Назад</a>` : '';

    document.write(`
    <div id="preloader">
        <div class="preloader-logo">Donate by Yae Miko</div>
        <div class="preloader-bar"></div>
    </div>
    <div id="sakura-tree"></div>
    <div id="sakura-container"></div>

    <div class="modal-overlay" id="safety-modal" onclick="closeModal('safety-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()">
            <button class="close-modal-btn" onclick="closeModal('safety-modal')">×</button>
            <h2>🔒 Почему с нами безопасно?</h2>
            <p>Донат безопасен, проверен годами и тысячами успешных заказов. Ваш аккаунт в надежных руках!</p>
            <ul style="list-style: none; padding: 0; color: #d8c3e0; font-size: 14px;">
                <li style="margin-bottom: 10px;">🌸 <b>Официальные проверки:</b> Мы неоднократно обращались в официальную поддержку разработчиков и проверяли наши методы оплаты на полную безопасность.</li>
                <li style="margin-bottom: 10px;">🌸 <b>Надежные алгоритмы:</b> Транзакции проходят прозрачно, без использования сомнительных сервисов и рисков блокировки.</li>
                <li style="margin-bottom: 10px;">🌸 <b>Конфиденциальность:</b> Ваши данные полностью защищены и никогда не сохраняются дольше необходимого времени для выполнения заказа.</li>
            </ul>
            <p style="text-align: center; color: #ff7eb3; font-weight: bold;">Доверьтесь лисице! 🦊</p>
        </div>
    </div>

    <div class="modal-overlay" id="support-modal" onclick="closeModal('support-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()">
            <button class="close-modal-btn" onclick="closeModal('support-modal')">×</button>
            <h2>🎧 Центр поддержки</h2>
            <p style="color: #a097b0; font-size: 14px; margin-bottom: 20px;">Выберите удобный способ связи. История обращений привязана к вашему устройству.</p>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <a href="https://t.me/donate_oper" target="_blank" class="js-support-op" style="flex: 1; background: #2b5278; color: white; text-decoration: none; padding: 12px; border-radius: 12px; text-align: center; font-weight: bold; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.98 1.25-5.58 3.61-.53.36-1.01.54-1.44.53-.48-.01-1.41-.27-2.1-.5-.85-.28-1.52-.43-1.47-.9.03-.25.36-.51 1-.79 3.91-1.7 6.52-2.8 7.84-3.35 3.73-1.56 4.51-1.83 5.01-1.84.11 0 .36.03.49.14.11.09.14.22.15.34-.01.12-.01.27-.02.38z"/></svg>
                    Telegram
                </a>
                <button onclick="toggleTicketForm()" style="flex: 1; background: #ff7eb3; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: 0.3s; box-shadow: 0 0 15px rgba(255,126,179,0.3);">✍️ Создать тикет</button>
            </div>

            <div onclick="openScheduleModal()" style="text-align:center; color:#ff7eb3; font-size:13px; cursor:pointer; margin-bottom:18px; transition:0.2s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">🕓 Посмотреть часы работы →</div>

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
            <h2 style="margin-bottom: 5px;">💗 Отзывы наших клиентов</h2>
            <p style="color: #a097b0; font-size: 13px; margin-bottom: 15px;">Реальные комментарии из нашего Telegram-канала</p>

            <div style="background: rgba(20, 15, 25, 0.6); border-left: 3px solid #ff7eb3; padding: 12px 15px; border-radius: 0 12px 12px 0; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; color: #d8c3e0; line-height: 1.5;">
                    Вы можете нажать на аватарку любого пользователя и написать ему лично, чтобы убедиться в честности нашего магазина. 
                    <br><span style="color: #ff7eb3; font-weight: bold; font-size: 12px; display: inline-block; margin-top: 5px;">Пожалуйста, уважайте чужое личное пространство и не беспокойте людей в позднее время! 🌙</span>
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
            <h2>⚙️ Настройки сайта</h2>
            <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #3a2b4d;">
                <div><div style="color:#fff;font-weight:bold;">Дерево сакуры</div><div style="color:#a097b0;font-size:12px;">Показывать ветвь на фоне</div></div>
                <label class="switch"><input type="checkbox" id="toggle-tree" onchange="updateSetting('tree', this.checked)"><span class="slider"></span></label>
            </div>
            <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #3a2b4d;">
                <div><div style="color:#fff;font-weight:bold;">Лепестки</div><div style="color:#a097b0;font-size:12px;">Падающая сакура</div></div>
                <label class="switch"><input type="checkbox" id="toggle-petals" onchange="updateSetting('petals', this.checked)"><span class="slider"></span></label>
            </div>
            <div style="margin-top:14px;">
                <div style="color:#fff;font-weight:bold;margin-bottom:4px;">✨ Качество эффектов</div>
                <div style="color:#a097b0;font-size:12px;margin-bottom:10px;">«Авто» само подберёт под ваше устройство</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="fx-btn" data-fx="auto" onclick="updateFx('auto')">🤖 Авто</button>
                    <button class="fx-btn" data-fx="max" onclick="updateFx('max')">✨ Максимум</button>
                    <button class="fx-btn" data-fx="mid" onclick="updateFx('mid')">⚖️ Средний</button>
                    <button class="fx-btn" data-fx="low" onclick="updateFx('low')">🔋 Эконом</button>
                </div>
                <div id="fx-auto-hint" style="color:#7c7090;font-size:11px;margin-top:6px;min-height:14px;"></div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="orders-modal" onclick="closeModal('orders-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()" style="max-width: 500px; width: 90%;">
            <button class="close-modal-btn" onclick="closeModal('orders-modal')">×</button>
            <h2 style="margin-bottom: 5px;">🎁 Мои заказы</h2>
            <p style="color: #a097b0; font-size: 13px; margin-bottom: 15px;">История ваших покупок</p>
            
            <div id="orders-list" style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                </div>
        </div>
    </div>

    <div class="modal-overlay" id="promos-modal" onclick="closeModal('promos-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()" style="max-width: 600px; width: 95%;">
            <button class="close-modal-btn" onclick="closeModal('promos-modal')">×</button>
            <h2 style="margin-bottom: 5px;">🔥 Акции и новости</h2>
            <p style="color:#a097b0; font-size:13px; margin-bottom:18px;">Свежие предложения и обновления магазина</p>
            <div class="promo-grid" id="promo-grid"></div>
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
                    <button class="auth-tab active" id="auth-tab-email" onclick="switchAuthTab('email')">📧 По почте</button>
                    <button class="auth-tab" id="auth-tab-tg" onclick="switchAuthTab('tg')">✈️ Telegram</button>
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
                    <p class="auth-hint">🔒 Без пароля — просто введите почту, мы пришлём код</p>
                </div>

                <div id="auth-pane-tg" class="auth-pane" style="display:none;">
                    <p style="color: #d8c3e0; font-size: 13px; text-align: center; margin: 4px 0 16px;">Быстрый вход в один клик</p>
                    <div style="display:flex; justify-content:center; min-height: 48px;">
                        <script async src="https://telegram.org/js/telegram-widget.js?22" data-telegram-login="YaeDonateShop_Bot" data-size="large" data-radius="10" data-onauth="onTelegramAuth(user)"></script>
                    </div>
                    <!-- Подсказка только для локальной разработки: на боевом домене
                         кнопка Telegram работает, и напоминание клиентам ни к чему -->
                    <p class="auth-hint" style="display:none;" id="tg-login-hint">Кнопка появится на рабочем домене (на localhost Telegram её прячет).</p>
                    <script>
                        if (['localhost', '127.0.0.1'].indexOf(location.hostname) !== -1) {
                            var _h = document.getElementById('tg-login-hint');
                            if (_h) _h.style.display = '';
                        }
                    </script>
                </div>

                <div class="auth-privacy">Входя, вы соглашаетесь с <a href="/privacy" target="_blank">политикой конфиденциальности</a></div>
            </div>

            <div id="auth-account-view" style="display:none;">
                <div class="auth-avatar auth-avatar-on" id="auth-account-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#4dff88" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="34" height="34"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <h2 style="margin: 16px 0 2px; text-align: center; font-size: 22px;">С возвращением! 🌸</h2>
                <p id="auth-account-name" style="color: #ff7eb3; font-weight: bold; text-align: center; margin-bottom: 16px; word-break: break-all;">Имя</p>

                <div class="tier-box">
                    <div class="tier-badge"><span id="tier-icon">🌱</span> <span id="tier-name">Новичок</span> <span class="tier-disc" id="tier-disc"></span></div>
                    <div class="tier-progress"><div class="tier-progress-fill" id="tier-progress-fill"></div></div>
                    <div class="tier-next" id="tier-next">Загрузка…</div>
                </div>

                <div class="ref-panel">
                    <div class="ref-stats">
                        <div class="ref-stat"><b id="ref-invited">0</b><small>приглашено</small></div>
                    </div>
                    <div class="ref-label">🔗 Ваша реферальная ссылка</div>
                    <div class="ref-link-row">
                        <input id="ref-link" class="auth-input" readonly value="" style="margin-bottom:0;">
                        <button id="ref-copy-btn" onclick="copyRefLink()" class="ref-copy-btn">Копировать</button>
                    </div>
                    <p class="auth-hint" style="margin-top:8px;">Вы оба получите −3% скидку: друг — на первый заказ, вы — на следующий 🎁</p>
                </div>

                <div class="promo-panel" style="background: rgba(20,15,30,0.7); border: 1px solid #3a2b4d; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px;">
                    <div class="ref-label" style="margin-bottom: 8px;">🎟 Промокод</div>
                    <div class="ref-link-row">
                        <input id="promo-code-input" class="auth-input" placeholder="Введите промокод…" maxlength="50"
                            style="margin-bottom:0; text-transform:uppercase; letter-spacing:1px;"
                            oninput="this.value=this.value.toUpperCase()">
                        <button onclick="applyPromoCode()" id="promo-apply-btn" class="ref-copy-btn">Применить</button>
                    </div>
                    <div id="promo-apply-msg" style="font-size:12px; margin-top:6px; min-height:16px;"></div>
                </div>

                <button onclick="closeModal('auth-modal'); openOrdersModal();" class="auth-btn-primary">🎁 История заказов</button>
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
            <h2 style="margin: 18px 0 8px;">Заказ успешно оформлен! 🌸</h2>
            <p id="order-success-text" style="color:#d8c3e0; font-size:14px; line-height:1.6;"></p>
            <p style="color:#a097b0; font-size:12.5px; line-height:1.6; margin-top:14px;">Если в течение указанного времени ничего не пришло — напишите в <b style="color:#ff7eb3; cursor:pointer; text-decoration:underline;" onclick="closeModal('order-success-modal'); showModal('support-modal');">поддержку</b>, и мы быстро поможем 💜</p>
            <button class="auth-btn-primary" style="margin-top:20px;" onclick="closeModal('order-success-modal')">Отлично!</button>
        </div>
    </div>

    <div class="modal-overlay" id="announce-modal" onclick="closeModal('announce-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()" style="max-width: 400px; width: 92%; text-align: center;">
            <button class="close-modal-btn" onclick="closeModal('announce-modal')">×</button>
            <div style="font-size: 50px; margin: 4px 0 2px;">📢</div>
            <h2 id="announce-title" style="margin-bottom: 10px;">Новости</h2>
            <p id="announce-text" style="color: #d8c3e0; font-size: 14px; line-height: 1.6; margin-bottom: 22px;"></p>
            <a id="announce-link" href="#" target="_blank" rel="noopener" class="auth-btn-primary" style="display: block; text-decoration: none;" onclick="closeModal('announce-modal')">Подписаться</a>
        </div>
    </div>

    <div class="modal-overlay" id="schedule-modal" onclick="closeModal('schedule-modal', event)">
        <div class="custom-modal" onclick="event.stopPropagation()" style="max-width: 440px; width: 92%;">
            <button class="close-modal-btn" onclick="closeModal('schedule-modal')">×</button>
            <h2 style="margin-bottom:4px;">🕓 Часы работы</h2>
            <p id="schedule-tz" style="color:#a097b0; font-size:13px; margin-bottom:16px;">Часовой пояс: —</p>
            <div id="schedule-list"></div>
            <div id="schedule-note" style="display:none; margin-top:14px; background:rgba(255,126,179,0.08); border:1px solid #3a2b4d; border-radius:12px; padding:12px 14px; font-size:13px; color:#d8c3e0; line-height:1.5;"></div>
        </div>
    </div>

    <header>
        <div class="logo-container">
            <a href="#" onclick="goToPage('/'); return false;" class="logo-link">Donate by Yae Miko</a>
            <button class="header-btn" onclick="openPromosModal()">🔥 Акции</button>
            <button class="header-btn" onclick="showModal('safety-modal')">🔒 Безопасность</button>
            <button class="header-btn" onclick="openReviewsModal()">💗 Отзывы</button>
            <button class="header-btn" onclick="showModal('support-modal')">🎧 Поддержка</button>
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
                <span class="menu-item-ic">🔥</span>
                <span class="menu-item-txt"><b>Акции</b><small>Скидки и новости</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
            <a class="menu-item" onclick="openReviewsModal(); toggleMobileMenu();">
                <span class="menu-item-ic">💗</span>
                <span class="menu-item-txt"><b>Отзывы</b><small>Реальные комментарии</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
            <a class="menu-item" onclick="showModal('support-modal'); toggleMobileMenu();">
                <span class="menu-item-ic">🎧</span>
                <span class="menu-item-txt"><b>Поддержка</b><small>Поможем с заказом</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
            <a class="menu-item" onclick="openScheduleModal(); toggleMobileMenu();">
                <span class="menu-item-ic">🕓</span>
                <span class="menu-item-txt"><b>Часы работы</b><small>Когда мы на связи</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
            <a class="menu-item" onclick="showModal('safety-modal'); toggleMobileMenu();">
                <span class="menu-item-ic">🔒</span>
                <span class="menu-item-txt"><b>Безопасность</b><small>Почему нам доверяют</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
            <a class="menu-item" onclick="openSettingsModal(); toggleMobileMenu();">
                <span class="menu-item-ic">⚙️</span>
                <span class="menu-item-txt"><b>Настройки</b><small>Сакура, анимации</small></span>
                <span class="menu-item-arrow">›</span>
            </a>
        </div>
        <a class="side-menu-tg js-tg-channel" href="https://t.me/donatsgenshin" target="_blank" rel="noopener">✈️ Наш Telegram-канал</a>
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
        <div class="footer-copy" style="margin-bottom: 6px; line-height: 1.7;">ОсОО «Глобал Бридж» · ОГРН 309678-3301-ООО · ИНН 9909704508<br>Кыргызская Республика, г. Бишкек, Октябрьский район, ул. Юнусалиева 185/1<br>📧 donatebyyaemiko@gmail.com</div>
        <div class="footer-copy">© 2021-2026 Yae Shop. Все права защищены.</div>
    </footer>

    <div id="cookie-banner" class="cookie-banner">
        <span>🍪 Мы используем файлы cookie и обрабатываем данные для работы сайта. Продолжая пользоваться сайтом, вы соглашаетесь с <a href="/privacy" target="_blank">политикой конфиденциальности</a>.</span>
        <button onclick="acceptCookies()">Принять</button>
    </div>
    `);
}