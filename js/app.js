/* =========================================================
   РуСофт Навигатор — app.js
   ========================================================= */

function getDomain(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url.startsWith('http') ? url : 'https://' + url);
        return parsed.hostname.replace(/^www\./, '');
    } catch (e) {
        return '';
    }
}

function getCategoryInfo(category) {
    const categories = {
        office:   { name: 'Офис и документы',     className: 'office',   icon: '<i class="fa-solid fa-file-lines"></i>' },
        system:   { name: 'Операционные системы', className: 'system',   icon: '<i class="fa-solid fa-desktop"></i>' },
        design:   { name: 'Чертежи и дизайн',     className: 'design',   icon: '<i class="fa-solid fa-palette"></i>' },
        security: { name: 'Защита компьютера',    className: 'security', icon: '<i class="fa-solid fa-shield-halved"></i>' },
        remote:   { name: 'Удалённый доступ',     className: 'remote',   icon: '<i class="fa-solid fa-laptop"></i>' },
        business: { name: 'Бухгалтерия и бизнес', className: 'business', icon: '<i class="fa-solid fa-briefcase"></i>' },
        dev:      { name: 'Для IT и баз данных',  className: 'dev',      icon: '<i class="fa-solid fa-code"></i>' },
        media:    { name: 'Видео, фото, звук',    className: 'media',    icon: '<i class="fa-solid fa-film"></i>' }
    };
    return categories[category] || { name: 'Софт', className: '', icon: '<i class="fa-solid fa-cube"></i>' };
}

function appendLogo(container, item) {
    if (!container) return;
    container.innerHTML = '';
    const category = getCategoryInfo(item.category);
    const customLogo = item.logo || item.img || item.image;
    // logoDomain — если url реферальный (promo...), берём домен бренда для красивого лого
    const domain = (item.logoDomain || getDomain(item.url || item.site || item.link) || '').replace(/^www\./, '');

    const renderFallback = function () {
        container.innerHTML = '<div class="program-logo-fallback ' + category.className + '" aria-hidden="true">' + category.icon + '</div>';
    };

    if (customLogo && String(customLogo).trim()) {
        const img = document.createElement('img');
        img.className = 'program-logo';
        img.alt = item.name + ' — логотип';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = customLogo;
        img.onerror = function () {
            // если кастомный лого упал — пробуем цепочку по домену
            tryDomainLogos(domain, container, category, renderFallback, item.name);
        };
        container.appendChild(img);
        return;
    }
    if (!domain) { renderFallback(); return; }
    tryDomainLogos(domain, container, category, renderFallback, item.name);
}

function tryDomainLogos(domain, container, category, renderFallback, name) {
    // 1) Clearbit — цветные лого брендов
    // 2) Google favicon 128
    // 3) Яндекс favicon (РФ)
    const sources = [
        'https://logo.clearbit.com/' + encodeURIComponent(domain),
        'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=128',
        'https://favicon.yandex.net/favicon/v2/' + encodeURIComponent(domain) + '?size=120'
    ];
    const img = document.createElement('img');
    img.className = 'program-logo';
    img.alt = (name || '') + ' — логотип';
    img.loading = 'lazy';
    img.decoding = 'async';
    var idx = 0;
    function tryNext() {
        if (idx >= sources.length) { renderFallback(); return; }
        img.onerror = function () { idx++; tryNext(); };
        img.onload = function () {
            // отсекаем «пустые» 1x1
            if (img.naturalWidth < 8 || img.naturalHeight < 8) {
                idx++;
                tryNext();
            }
        };
        img.src = sources[idx];
        if (!img.parentNode) {
            container.innerHTML = '';
            container.appendChild(img);
        }
    }
    tryNext();
}

var currentCategory = 'all';
var searchQuery = '';
var onlyRegistry = false;

function getRawData() {
    if (typeof softwareData !== 'undefined') return softwareData;
    return [];
}

function expandQuery(q) {
    var map = {
        'фотошоп': 'photoshop', 'photoshop': 'photoshop фотошоп',
        'автокад': 'autocad', 'autocad': 'autocad автокад',
        'энидеск': 'anydesk', 'анидеск': 'anydesk', 'anydesk': 'anydesk энидеск анидеск',
        'тимвивер': 'teamviewer', 'тимвьюер': 'teamviewer', 'teamviewer': 'teamviewer тимвивер',
        'виндовс': 'windows', 'виндоус': 'windows', 'windows': 'windows виндовс',
        'эксель': 'excel', 'excel': 'excel эксель',
        'ворд': 'word', 'word': 'word ворд',
        'зум': 'zoom', 'zoom': 'zoom зум',
        'хром': 'chrome', 'chrome': 'chrome хром',
        'слак': 'slack', 'slack': 'slack слак',
        'ревит': 'revit', 'revit': 'revit ревит',
        'солидворкс': 'solidworks', 'solidworks': 'solidworks солидворкс'
    };
    var extra = map[q] || '';
    return (q + ' ' + extra).trim();
}

function getFilteredData() {
    var q = searchQuery.toLowerCase().trim();
    var qExpanded = expandQuery(q);
    var tokens = qExpanded.split(/\s+/).filter(Boolean);
    var list = getRawData().filter(function (item) {
        if (currentCategory !== 'all' && item.category !== currentCategory) return false;
        if (onlyRegistry && !item.registry) return false;
        if (!q) return true;
        var hay = [item.name, item.replaces, item.replace, item.shortDesc, item.fullDesc, item.registryInfo].join(' ').toLowerCase();
        for (var i = 0; i < tokens.length; i++) {
            if (hay.indexOf(tokens[i]) !== -1) return true;
        }
        return false;
    });
    // Меньше sortIndex — выше в сетке. Дальше featured, затем порядок в файле.
    list.sort(function (a, b) {
        var ia = (typeof a.sortIndex === 'number') ? a.sortIndex : 9999;
        var ib = (typeof b.sortIndex === 'number') ? b.sortIndex : 9999;
        if (ia !== ib) return ia - ib;
        var fa = a.featured ? 1 : 0;
        var fb = b.featured ? 1 : 0;
        if (fa !== fb) return fb - fa;
        return 0;
    });
    return list;
}

function updateView() {
    var data = getFilteredData();
    renderCards(data);
    var counter = document.getElementById('results-count');
    if (counter) {
        counter.textContent = data.length ? ('Найдено программ: ' + data.length) : 'Ничего не найдено';
    }
}

function renderCards(data) {
    var grid = document.getElementById('software-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!data.length) {
        grid.innerHTML = '<p class="empty-state">Ничего не найдено. Попробуйте другое название или категорию.</p>';
        return;
    }
    var all = getRawData();
    data.forEach(function (item) {
        var originalIndex = all.indexOf(item);
        var category = getCategoryInfo(item.category);
        var replacesText = item.replaces || item.replace || 'Аналог зарубежного ПО';
        var descText = item.shortDesc || '';
        var metaText = item.registryInfo || '';
        var itemUrl = item.url || '#';
        var regBadge = item.registry
            ? '<span class="reg-badge" title="В реестре российского ПО">В реестре</span>'
            : '<span class="reg-badge reg-badge--off" title="Не в реестре">Не в реестре</span>';

        var card = document.createElement('article');
        card.className = 'card';
        card.innerHTML =
            '<div class="card-header">' +
                '<div class="card-top-row">' +
                    '<span class="badge ' + category.className + '">' + category.icon + ' ' + category.name + '</span>' +
                    regBadge +
                '</div>' +
                '<div class="card-title-wrapper">' +
                    '<div class="logo-container"></div>' +
                    '<h2 class="card-title">' + item.name + '</h2>' +
                '</div>' +
                '<div class="card-replace">Замена: ' + replacesText + '</div>' +
                '<p class="card-desc">' + descText + '</p>' +
            '</div>' +
            '<div class="card-footer">' +
                '<div class="card-meta">' + metaText + '</div>' +
                '<button type="button" class="btn-details" data-index="' + originalIndex + '">' +
                    '<i class="fa-solid fa-circle-info"></i> Подробнее: плюсы и минусы' +
                '</button>' +
                '<a href="' + itemUrl + '" target="_blank" rel="noopener noreferrer" class="btn-link">' +
                    'Перейти на сайт <i class="fa-solid fa-arrow-right"></i>' +
                '</a>' +
            '</div>';

        appendLogo(card.querySelector('.logo-container'), item);
        card.querySelector('.btn-details').addEventListener('click', function () {
            openModal(parseInt(this.getAttribute('data-index'), 10));
        });
        grid.appendChild(card);
    });
}

function openModal(index) {
    var item = getRawData()[index];
    if (!item) return;
    var modal = document.getElementById('modal-box');
    var content = document.getElementById('modal-body-content');
    if (!modal || !content) return;

    var adv = item.pros || '—';
    var disadv = item.cons || '—';
    var text = item.fullDesc || item.shortDesc || '';
    var replacesText = item.replaces || 'Аналог зарубежного ПО';
    var price = item.price || 'Уточняйте у разработчика';

    content.innerHTML =
        '<div class="modal-title-wrapper">' +
            '<div class="modal-logo-container"></div>' +
            '<div><h2 class="modal-name">' + item.name + '</h2>' +
            '<p class="modal-replaces">Замена: ' + replacesText + '</p></div>' +
        '</div>' +
        '<div class="modal-section-title">Обзор</div><p class="modal-text">' + text + '</p>' +
        '<div class="modal-section-title">Стоимость</div><p class="modal-text">' + price + '</p>' +
        '<div class="modal-section-title"><i class="fa-solid fa-circle-check" style="color:#16a34a"></i> Плюсы</div>' +
        '<div class="box-pros">' + adv + '</div>' +
        '<div class="modal-section-title"><i class="fa-solid fa-circle-xmark" style="color:#dc2626"></i> Минусы / ограничения</div>' +
        '<div class="box-cons">' + disadv + '</div>' +
        '<div class="modal-section-title">Реестр и статус</div><p class="modal-text">' + (item.registryInfo || '—') + '</p>' +
        '<a href="' + (item.url || '#') + '" target="_blank" rel="noopener noreferrer" class="btn-link modal-site-btn">' +
            'Открыть официальный сайт <i class="fa-solid fa-arrow-right"></i></a>';

    appendLogo(content.querySelector('.modal-logo-container'), item);
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

window.openModal = openModal;

function closeModal() {
    var modal = document.getElementById('modal-box');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    var allBtn = document.getElementById('btn-all');
    if (allBtn) {
        allBtn.innerHTML = '<i class="fa-solid fa-list" aria-hidden="true"></i> Показать всё (' + getRawData().length + ')';
    }

    var closeBtn = document.getElementById('close-modal-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', function (e) {
        if (e.target === document.getElementById('modal-box')) closeModal();
    });
    window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });

    var searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            searchQuery = e.target.value.trim();
            updateView();
        });
    }

    document.querySelectorAll('.cat-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            document.querySelectorAll('.cat-btn').forEach(function (b) { b.classList.remove('active'); });
            e.currentTarget.classList.add('active');
            currentCategory = e.currentTarget.getAttribute('data-category') || 'all';
            updateView();
            var grid = document.getElementById('software-grid');
            if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    var regToggle = document.getElementById('only-registry');
    if (regToggle) {
        regToggle.addEventListener('change', function (e) {
            onlyRegistry = e.target.checked;
            updateView();
        });
    }

    document.querySelectorAll('.chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
            if (searchInput) {
                searchInput.value = chip.getAttribute('data-q') || chip.textContent;
                searchQuery = searchInput.value.trim();
                updateView();
                searchInput.focus();
            }
        });
    });

    updateView();
});
