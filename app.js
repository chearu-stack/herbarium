// ============================================================
// ГЕРБАРНЫЙ ЛИСТ — ПОЛНЫЙ JS-ФАЙЛ
// ============================================================

let pageCounter = 0;
let pendingAIResult = null;
let pendingAIPageId = null;

// ============================================================
// ПРОВЕРКА ЗАГРУЗКИ CROPPER.JS
// ============================================================
function isCropperLoaded() {
    return typeof Cropper !== 'undefined';
}

// ============================================================
// API KEY
// ============================================================
function hasValidApiKey() {
    const key = document.getElementById('apiKeyInput');
    return key ? Boolean(key.value.trim()) : false;
}

function setAIButtonState(button, state) {
    if (!button) return;
    button.classList.remove('state-nokey', 'state-ready', 'state-loading');
    button.classList.add('state-' + state);
    button.textContent = state === 'loading' ? 'Думает…' : 'AI →';
}

// ============================================================
// СОЗДАНИЕ СТРАНИЦЫ (ИСПРАВЛЕНО)
// ============================================================
function createPage() {
    pageCounter++;
    const id = pageCounter;

    const page = document.createElement('div');
    page.className = 'page';

    page.innerHTML = `
        <div class="content-area mode-full" id="area-${id}">
            <div class="header">
                <input type="text" class="title-rus" id="title-rus-${id}" placeholder="Русское название">
                <input type="text" class="title-lat" id="title-lat-${id}" placeholder="Латинское название">
                <div class="page-order-controls">
                    <button type="button" class="order-button" id="order-up-${id}" onclick="movePage(${id}, -1)" title="Переместить лист выше">▲</button>
                    <button type="button" class="order-button" id="order-down-${id}" onclick="movePage(${id}, 1)" title="Переместить лист ниже">▼</button>
                </div>
                <button type="button" class="ai-page-button" id="ai-button-${id}">AI →</button>
            </div>

            <div class="top-section">
                <div class="left-half">
                    <div class="image-box" id="imgBox-${id}">
                        <div class="img-placeholder" id="imgPlaceholder-${id}">
                            <div>Нажмите или перетащите изображение</div>
                            <button type="button" onclick="document.getElementById('file-${id}').click()">Выбрать файл</button>
                        </div>
                        <img id="img-${id}" alt="">
                        <input type="file" class="file-input" id="file-${id}" accept="image/*" onchange="loadImage(this, ${id})">
                        
                        <!-- Кнопки действий (скрываются/показываются динамически) -->
                        <div class="image-actions" id="imgActions-${id}" style="display:none; position:absolute; bottom:2mm; right:2mm; gap:5px; z-index:20;">
                            <button type="button" class="action-btn crop-btn" id="crop-btn-${id}" style="background:#fff; border:1px solid #777; padding:2mm 3mm; font-size:8pt; cursor:pointer;">✂ Кадрировать</button>
                            <button type="button" class="action-btn replace-btn" id="replace-btn-${id}" style="background:#fff; border:1px solid #777; padding:2mm 3mm; font-size:8pt; cursor:pointer;">⟳ Заменить</button>
                        </div>
                    </div>
                </div>

                <div class="right-half">
                    <div class="taxonomy-block">
                        <div class="taxonomy-row">
                            <span class="taxonomy-label">КЛАСС:</span>
                            <div class="taxonomy-input" id="tax-class-${id}" contenteditable="true" data-placeholder="..."></div>
                        </div>
                        <div class="taxonomy-row">
                            <span class="taxonomy-label">СЕМЕЙСТВО:</span>
                            <div class="taxonomy-input" id="tax-family-${id}" contenteditable="true" data-placeholder="..."></div>
                        </div>
                        <div class="taxonomy-row">
                            <span class="taxonomy-label">РОД:</span>
                            <div class="taxonomy-input" id="tax-genus-${id}" contenteditable="true" data-placeholder="..."></div>
                        </div>
                        <div class="taxonomy-row">
                            <span class="taxonomy-label">ВИД:</span>
                            <div class="taxonomy-input" id="tax-species-${id}" contenteditable="true" data-placeholder="..."></div>
                        </div>
                    </div>

                    <div class="description-block">
                        <div class="description-label">ОПИСАНИЕ</div>
                        <textarea class="description-textarea" id="description-${id}" placeholder="Научное описание..."></textarea>
                    </div>
                </div>
            </div>

            <div class="middle-section">
                <div class="middle-label">ЗДЕСЬ ВКЛЕИВАЕТСЯ<br>СУХОЦВЕТ</div>
            </div>

            <div class="footer-section">
                <div class="footer-group">
                    <div class="footer-left">
                        <span class="footer-label">Место сбора:</span>
                        <input type="text" class="footer-input" id="collection-place-${id}" placeholder="...">
                    </div>
                    <div class="footer-right">
                        <span class="footer-label">Дата:</span>
                        <input type="text" class="footer-input" id="collection-date-${id}" placeholder="...">
                    </div>
                </div>
            </div>
        </div>
    `;

    const imgBox = page.querySelector('#imgBox-' + id);
    const imgPlaceholder = page.querySelector('#imgPlaceholder-' + id);
    const imgEl = page.querySelector('#img-' + id);
    const imgActions = page.querySelector('#imgActions-' + id);
    const cropBtn = page.querySelector('#crop-btn-' + id);
    const replaceBtn = page.querySelector('#replace-btn-' + id);
    const fileInput = page.querySelector('#file-' + id);

    // Обработчик нажатия на плейсхолдер
    imgPlaceholder.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag & Drop
    imgBox.addEventListener('dragover', event => {
        event.preventDefault();
        imgBox.style.background = '#f8f8f8';
    });
    imgBox.addEventListener('dragleave', () => {
        imgBox.style.background = 'transparent';
    });
    imgBox.addEventListener('drop', event => {
        event.preventDefault();
        imgBox.style.background = 'transparent';
        const file = event.dataTransfer.files[0];
        if (file && file.type && file.type.startsWith('image/')) {
            loadImageFile(file, id);
        }
    });

    // Логика отображения кнопок
    function updateImageActions() {
        if (imgEl.src) {
            imgPlaceholder.style.display = 'none';
            imgActions.style.display = 'flex';
            cropBtn.style.display = 'inline-block';
            replaceBtn.style.display = 'inline-block';
        } else {
            imgPlaceholder.style.display = 'block';
            imgActions.style.display = 'none';
        }
    }

    // Клик по картинке (если уже есть) -> заменить
    imgEl.addEventListener('click', () => {
        if (imgEl.src) {
            fileInput.click();
        }
    });

    // Клик по кнопке "Кадрировать"
    cropBtn.addEventListener('click', () => {
        openCropper(id);
    });

    // Клик по кнопке "Заменить"
    replaceBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Enter в русском названии → AI
    const russianInput = page.querySelector('#title-rus-' + id);
    russianInput.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            requestAIForPage(id);
        }
    });

    // Кнопка AI
    const aiButton = page.querySelector('#ai-button-' + id);
    aiButton.addEventListener('click', () => {
        requestAIForPage(id);
    });
    setAIButtonState(aiButton, hasValidApiKey() ? 'ready' : 'nokey');

    return page;
}

// ============================================================
// ЗАГРУЗКА ИЗОБРАЖЕНИЙ
// ============================================================
function loadImage(input, id) {
    const file = input.files[0];
    if (!file) return;
    loadImageFile(file, id);
}

function loadImageFile(file, id) {
    if (!file.type || !file.type.startsWith('image/')) {
        alert('Можно загрузить только изображение.');
        return;
    }
    const reader = new FileReader();
    reader.onload = event => {
        const img = document.getElementById('img-' + id);
        const box = document.getElementById('imgBox-' + id);
        const imgActions = document.getElementById('imgActions-' + id);
        
        img.src = event.target.result;
        box.classList.add('has-image');
        
        // Показываем весь контейнер с кнопками действий, а не только саму кнопку
        if (imgActions) imgActions.style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

// ============================================================
// КРОППИНГ (CROPPER.JS С ЖЕСТКОЙ ПРОПОРЦИЕЙ БЛОКА)
// ============================================================
function openCropper(id) {
    if (!isCropperLoaded()) {
        alert('Библиотека Cropper.js ещё не загрузилась. Пожалуйста, подождите пару секунд и попробуйте снова.');
        return;
    }

    const img = document.getElementById('img-' + id);
    const box = document.getElementById('imgBox-' + id);
    if (!img.src) return;

    // Высчитываем точную пропорцию целевого контейнера на листе
    const targetRatio = box.clientWidth / box.clientHeight;

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.85); z-index: 2000; display: flex;
        align-items: center; justify-content: center; padding: 20px;
    `;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        background: #fff; padding: 15px; border-radius: 8px; 
        max-width: 90vw; max-height: 85vh; display: flex; 
        flex-direction: column; align-items: center;
    `;

    const cropperImg = img.cloneNode();
    cropperImg.style.maxWidth = '100%';
    cropperImg.style.maxHeight = '65vh';
    cropperImg.style.display = 'block';

    wrapper.appendChild(cropperImg);
    modal.appendChild(wrapper);
    document.body.appendChild(modal);

    let cropper;

    // Небольшая задержка для корректного расчета размеров в DOM
    setTimeout(() => {
        cropper = new Cropper(cropperImg, {
            viewMode: 1,
            aspectRatio: targetRatio, // Жесткая пропорция под целевой блок!
            autoCropArea: 0.9,
            responsive: true,
            dragMode: 'move',
            background: true
        });
    }, 50);

    const actions = document.createElement('div');
    actions.style.cssText = 'margin-top: 15px; display: flex; gap: 10px; justify-content: center;';

    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Применить кадр';
    applyBtn.style.cssText = 'padding: 8px 18px; cursor: pointer; background: #2e8b3d; color: white; border: none; border-radius: 4px; font-weight: bold;';
    applyBtn.onclick = () => {
        if (!cropper) return;
        
        try {
            const croppedCanvas = cropper.getCroppedCanvas({
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            
            if (croppedCanvas) {
                img.src = croppedCanvas.toDataURL('image/jpeg', 0.92);
                box.classList.remove('has-image');
                void box.offsetWidth;
                box.classList.add('has-image');
            }
        } catch (e) {
            alert('Ошибка при кадрировании: ' + e.message);
        } finally {
            modal.remove();
            cropper.destroy();
        }
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Отмена';
    cancelBtn.style.cssText = 'padding: 8px 18px; cursor: pointer; background: #777; color: white; border: none; border-radius: 4px;';
    cancelBtn.onclick = () => {
        modal.remove();
        if (cropper) cropper.destroy();
    };

    actions.appendChild(applyBtn);
    actions.appendChild(cancelBtn);
    wrapper.appendChild(actions);
}

// ============================================================
// СОХРАНЕНИЕ ПРОЕКТА
// ============================================================
function saveProject() {
    const pages = document.querySelectorAll('#pagesContainer .page');
    const data = [];

    pages.forEach(page => {
        const area = page.querySelector('.content-area');
        const id = area.id.replace('area-', '');
        const borderMode = ['mode-full', 'mode-left', 'mode-none']
            .find(m => area.classList.contains(m)) || 'mode-full';

        const imgEl = document.getElementById('img-' + id);
        const hasImage = document.getElementById('imgBox-' + id).classList.contains('has-image');

        data.push({
            borderMode: borderMode,
            titleRus: document.getElementById('title-rus-' + id).value,
            titleLat: document.getElementById('title-lat-' + id).value,
            taxClass: document.getElementById('tax-class-' + id).textContent,
            taxFamily: document.getElementById('tax-family-' + id).textContent,
            taxGenus: document.getElementById('tax-genus-' + id).textContent,
            taxSpecies: document.getElementById('tax-species-' + id).textContent,
            description: document.getElementById('description-' + id).value,
            collectionPlace: document.getElementById('collection-place-' + id).value,
            collectionDate: document.getElementById('collection-date-' + id).value,
            image: hasImage ? imgEl.src : null
        });
    });

    const json = JSON.stringify({ savedAt: new Date().toISOString(), pages: data }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = 'гербарий_' + stamp + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================================
// ЗАГРУЗКА ПРОЕКТА
// ============================================================
function loadProject(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        let parsed;
        try {
            parsed = JSON.parse(e.target.result);
        } catch (err) {
            alert('Не удалось прочитать файл — это не корректный JSON проекта.');
            return;
        }

        const pagesData = parsed.pages || [];
        if (pagesData.length === 0) {
            alert('В файле не найдено ни одного листа.');
            return;
        }

        if (!confirm('Загрузить проект (' + pagesData.length + ' лист(ов))? Текущее содержимое будет заменено.')) return;

        document.getElementById('pagesContainer').innerHTML = '';
        pageCounter = 0;

        const container = document.getElementById('pagesContainer');

        pagesData.forEach(pd => {
            const page = createPage();
            container.appendChild(page);
            const id = pageCounter;

            document.getElementById('area-' + id).classList.remove('mode-full', 'mode-left', 'mode-none');
            document.getElementById('area-' + id).classList.add(pd.borderMode || 'mode-full');

            document.getElementById('title-rus-' + id).value = pd.titleRus || '';
            document.getElementById('title-lat-' + id).value = pd.titleLat || '';
            document.getElementById('tax-class-' + id).textContent = pd.taxClass || '';
            document.getElementById('tax-family-' + id).textContent = pd.taxFamily || '';
            document.getElementById('tax-genus-' + id).textContent = pd.taxGenus || '';
            document.getElementById('tax-species-' + id).textContent = pd.taxSpecies || '';
            document.getElementById('description-' + id).value = pd.description || '';
            document.getElementById('collection-place-' + id).value = pd.collectionPlace || '';
            document.getElementById('collection-date-' + id).value = pd.collectionDate || '';

            if (pd.image) {
                const img = document.getElementById('img-' + id);
                const box = document.getElementById('imgBox-' + id);
                const imgActions = document.getElementById('imgActions-' + id);
                
                img.src = pd.image;
                box.classList.add('has-image');
                
                // Показываем весь контейнер действий при загрузке сохраненной картинки
                if (imgActions) imgActions.style.display = 'flex';
            }

            const button = document.getElementById('ai-button-' + id);
            setAIButtonState(button, hasValidApiKey() ? 'ready' : 'nokey');
        });

        updatePageOrderControls();
        input.value = '';
    };
    reader.readAsText(file);
}

// ============================================================
// УПРАВЛЕНИЕ СТРАНИЦАМИ
// ============================================================
function addPage() {
    const container = document.getElementById('pagesContainer');
    container.appendChild(createPage());
    applyBorderStyle();
    updatePageOrderControls();
}

function movePage(id, direction) {
    const container = document.getElementById('pagesContainer');
    const page = document.getElementById('area-' + id).closest('.page');
    if (!page) return;

    if (direction < 0 && page.previousElementSibling) {
        container.insertBefore(page, page.previousElementSibling);
    } else if (direction > 0 && page.nextElementSibling) {
        container.insertBefore(page.nextElementSibling, page);
    }
    updatePageOrderControls();
}

function updatePageOrderControls() {
    const pages = document.querySelectorAll('#pagesContainer .page');
    pages.forEach((page, index) => {
        const upButton = page.querySelector(".order-button[id^='order-up-']");
        const downButton = page.querySelector(".order-button[id^='order-down-']");
        if (upButton) upButton.disabled = (index === 0);
        if (downButton) downButton.disabled = (index === pages.length - 1);
    });
}

function clearAll() {
    if (!confirm('Очистить все страницы?')) return;
    document.getElementById('pagesContainer').innerHTML = '';
    pageCounter = 0;
    pendingAIResult = null;
    pendingAIPageId = null;
    closeAIPanel();
    addPage();
}

// ============================================================
// СТИЛЬ РАМКИ
// ============================================================
function applyBorderStyle() {
    const selected = document.querySelector('input[name="borderStyle"]:checked');
    if (!selected) return;
    const style = selected.value;
    document.querySelectorAll('.content-area').forEach(area => {
        area.className = 'content-area ' + style;
    });
}

// ============================================================
// AI ПАНЕЛЬ (заглушка)
// ============================================================
function requestAIForPage(id) {
    if (!hasValidApiKey()) {
        alert('Пожалуйста, введите API-ключ в поле справа вверху.');
        return;
    }
    const button = document.getElementById('ai-button-' + id);
    setAIButtonState(button, 'loading');

    // Имитация запроса к AI (заглушка)
    setTimeout(() => {
        const titleRus = document.getElementById('title-rus-' + id).value.trim();
        if (titleRus) {
            // Простая имитация — заполняем таксономию
            document.getElementById('tax-class-' + id).textContent = 'Magnoliopsida';
            document.getElementById('tax-family-' + id).textContent = 'Rosaceae';
            document.getElementById('tax-genus-' + id).textContent = 'Rosa';
            document.getElementById('tax-species-' + id).textContent = titleRus.toLowerCase().replace(/ /g, '_');
            document.getElementById('description-' + id).value = 'Научное описание для ' + titleRus + '.';
        }
        setAIButtonState(button, 'ready');
    }, 1500);
}

function closeAIPanel() {
    const panel = document.getElementById('aiPanel');
    if (panel) panel.classList.remove('visible');
    pendingAIResult = null;
    pendingAIPageId = null;
}

// ============================================================
// ЗАГРУЗКА КОНФИГУРАЦИИ (заглушка)
// ============================================================
function loadProviderConfig() {
    // Заглушка — в реальном проекте здесь загрузка настроек провайдера
}

// ============================================================
// СТАРТ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    addPage();
});