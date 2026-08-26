// app.js — Главный модуль

var pendingAIResult = null;
var pendingAIPageId = null;

function init() {
  var savedProvider = localStorage.getItem('herbarium_ai_provider');
  var savedKey = localStorage.getItem('herbarium_ai_key');
  if (savedProvider) document.getElementById('aiProvider').value = savedProvider;
  if (savedKey) document.getElementById('aiApiKey').value = savedKey;
  updateKeyStatus();

  addPage();
  bindGlobalEvents();
}

function bindGlobalEvents() {
  // === Управление ===
  document.getElementById('btnAddPage').addEventListener('click', addPage);
  document.getElementById('btnPrint').addEventListener('click', function() { window.print(); });
  document.getElementById('btnClear').addEventListener('click', clearAll);
  document.getElementById('btnSave').addEventListener('click', onSave);
  document.getElementById('btnLoadTrigger').addEventListener('click', function() {
    document.getElementById('loadProjectInput').click();
  });
  document.getElementById('loadProjectInput').addEventListener('change', onLoad);

  document.querySelectorAll('input[name="borderStyle"]').forEach(function(radio) {
    radio.addEventListener('change', applyBorderStyle);
  });

  // === AI ===
  document.getElementById('btnSaveKeys').addEventListener('click', saveKeys);
  document.getElementById('applyAiButton').addEventListener('click', applyAIResult);
  document.getElementById('cancelAiButton').addEventListener('click', closeAIPanel);

  // === Документ ===
  document.getElementById('btnAddCover').addEventListener('click', addCover);
  document.getElementById('btnAddConclusion').addEventListener('click', addConclusion);
  document.getElementById('btnBuildDocument').addEventListener('click', onBuildDocument);
  document.getElementById('btnRebuildToc').addEventListener('click', onRebuildToc);
  document.getElementById('btnGenerateDividers').addEventListener('click', onGenerateDividers);

  // === Порядок страниц + AI на herbarium ===
  document.getElementById('pagesContainer').addEventListener('click', function(e) {
    var btn = e.target.closest('.order-button');
    if (!btn) return;
    var id = parseInt(btn.dataset.id);
    var dir = parseInt(btn.dataset.dir);
    movePage(id, dir);
  });

  document.getElementById('pagesContainer').addEventListener('request-ai', function(e) {
    handleAIRequest(e.detail.id);
  });
}

// ===== HERBARIUM PAGE =====
function addPage() {
  var container = document.getElementById('pagesContainer');
  var page = createPage();
  container.appendChild(page);
  attachImageEditor(pageCounter);
  applyBorderStyle();
  updatePageOrderControls();
}

// ===== COVER PAGE =====
function addCover() {
  var container = document.getElementById('pagesContainer');
  var page = createCoverPage();
  if (!page) return;
  container.insertBefore(page, container.firstChild);
}

function applyBorderStyle() {
  var selected = document.querySelector('input[name="borderStyle"]:checked');
  if (!selected) return;
  var style = selected.value;
  document.querySelectorAll('.content-area').forEach(function(area) {
    area.className = 'content-area ' + style;
  });
}

function clearAll() {
  if (!confirm('Очистить все страницы?')) return;
  clearAllPages();
  pendingAIResult = null;
  pendingAIPageId = null;
  closeAIPanel();
  DocumentModel.reset();
  addPage();
}

// ===== SAVE =====
function onSave() {
  try {
    console.log('[onSave] Сборка всех страниц проекта...');

    var pageElements = document.querySelectorAll('#pagesContainer .page');
    var pages = [];

    pageElements.forEach(function(page, index) {

      // ---------------------------------------------------------
      // 1. Определяем тип страницы
      // ---------------------------------------------------------

      var type =
        page.dataset.pageType ||
        page.dataset.type ||
        page.getAttribute('data-page-type') ||
        page.getAttribute('data-type');

      // На случай, если тип задан классом
      if (!type) {
        if (page.classList.contains('cover-page')) {
          type = 'cover';
        } else if (page.classList.contains('toc-page')) {
          type = 'toc';
        } else if (page.classList.contains('divider-page')) {
          type = 'divider';
        } else if (page.classList.contains('conclusion-page')) {
          type = 'conclusion';
        }
      }

      // Старые страницы, которые не имеют type,
      // считаем обычными herbarium.
      if (!type) {
        type = 'herbarium';
      }

      console.log('[onSave] page', index, 'type =', type);

      // ---------------------------------------------------------
      // 2. COVER
      // ---------------------------------------------------------

      if (type === 'cover') {

        var coverData = {
          type: 'cover'
        };

        // Собираем все элементы формы по name / data-field / id
        page.querySelectorAll('input, textarea, select').forEach(function(el) {

          var key =
            el.dataset.field ||
            el.getAttribute('name') ||
            el.id;

          if (!key) return;

          coverData[key] = el.value || '';
        });

        // На случай, если данные хранятся непосредственно
        // в data-атрибутах страницы.
        if (page.dataset.cover) {
          try {
            Object.assign(coverData, JSON.parse(page.dataset.cover));
          } catch (e) {
            console.warn('[onSave] cover data JSON не разобран:', e);
          }
        }

        pages.push(coverData);
        return;
      }

      // ---------------------------------------------------------
      // 3. TOC
      // ---------------------------------------------------------

      if (type === 'toc') {

        var tocData = {
          type: 'toc'
        };

        var tocText =
          page.querySelector('[data-field="text"]') ||
          page.querySelector('[data-toc-text]') ||
          page.querySelector('.toc-content') ||
          page.querySelector('.toc-list');

        if (tocText) {
          tocData.text = tocText.value !== undefined
            ? tocText.value
            : tocText.innerHTML;
        }

        pages.push(tocData);
        return;
      }

      // ---------------------------------------------------------
      // 4. DIVIDER
      // ---------------------------------------------------------

      if (type === 'divider') {

        var dividerData = {
          type: 'divider'
        };

        // Сначала пробуем явно размеченные поля.
        page.querySelectorAll('input, textarea, select').forEach(function(el) {

          var key =
            el.dataset.field ||
            el.getAttribute('name') ||
            el.id;

          if (!key) return;

          dividerData[key] = el.value || '';
        });

        // Текстовые элементы, если они не являются input/textarea.
        var dividerFields = [
          'classRu',
          'classLatin',
          'history',
          'text'
        ];

        dividerFields.forEach(function(field) {

          if (dividerData[field] !== undefined) return;

          var el = page.querySelector(
            '[data-field="' + field + '"]'
          );

          if (el) {
            dividerData[field] =
              el.value !== undefined
                ? el.value
                : el.textContent.trim();
          }
        });

        // Дополнительная информация о классе
        if (page.dataset.classRu) {
          dividerData.classRu = page.dataset.classRu;
        }

        if (page.dataset.classLatin) {
          dividerData.classLatin = page.dataset.classLatin;
        }

        pages.push(dividerData);
        return;
      }

      // ---------------------------------------------------------
      // 5. CONCLUSION
      // ---------------------------------------------------------

      if (type === 'conclusion') {

        var conclusionData = {
          type: 'conclusion'
        };

        var conclusionText =
          page.querySelector('[data-field="text"]') ||
          page.querySelector('[data-conclusion-text]') ||
          page.querySelector('textarea') ||
          page.querySelector('.conclusion-text');

        if (conclusionText) {
          conclusionData.text =
            conclusionText.value !== undefined
              ? conclusionText.value
              : conclusionText.textContent.trim();
        } else {
          // Если текст просто находится в контентном блоке
          var content = page.querySelector('.content');
          if (content) {
            conclusionData.text = content.innerHTML;
          }
        }

        pages.push(conclusionData);
        return;
      }

      // ---------------------------------------------------------
      // 6. HERBARIUM
      // ---------------------------------------------------------

      if (type === 'herbarium') {

        var area = page.querySelector('.content-area');

        // Старый herbarium обязательно должен иметь area-N.
        if (!area || !area.id) {
          console.warn(
            '[onSave] Herbarium page без .content-area:',
            page
          );
          return;
        }

        var id = area.id.replace('area-', '');

        var borderMode = [
          'mode-full',
          'mode-left',
          'mode-none'
        ].find(function(m) {
          return area.classList.contains(m);
        }) || 'mode-full';

        var imgBox = document.getElementById('imgBox-' + id);
        var imgEl = document.getElementById('img-' + id);

        var hasImage =
          imgBox &&
          imgBox.classList.contains('has-image');

        var t = imageTransforms[id];

        var elTitleRus =
          document.getElementById('title-rus-' + id);

        var elTitleLat =
          document.getElementById('title-lat-' + id);

        var elTaxClass =
          document.getElementById('tax-class-' + id);

        var elTaxFamily =
          document.getElementById('tax-family-' + id);

        var elTaxGenus =
          document.getElementById('tax-genus-' + id);

        var elTaxSpecies =
          document.getElementById('tax-species-' + id);

        var elDesc =
          document.getElementById('description-' + id);

        var elPlace =
          document.getElementById('collection-place-' + id);

        var elDate =
          document.getElementById('collection-date-' + id);

        pages.push({
          type: 'herbarium',

          borderMode: borderMode,

          titleRus: elTitleRus
            ? elTitleRus.value
            : '',

          titleLat: elTitleLat
            ? elTitleLat.value
            : '',

          taxClass: elTaxClass
            ? elTaxClass.textContent
            : '',

          taxFamily: elTaxFamily
            ? elTaxFamily.textContent
            : '',

          taxGenus: elTaxGenus
            ? elTaxGenus.textContent
            : '',

          taxSpecies: elTaxSpecies
            ? elTaxSpecies.textContent
            : '',

          description: elDesc
            ? elDesc.value
            : '',

          collectionPlace: elPlace
            ? elPlace.value
            : '',

          collectionDate: elDate
            ? elDate.value
            : '',

          image:
            hasImage && imgEl
              ? imgEl.src
              : null,

          transform: t
            ? {
                scale: t.scale,
                x: t.x,
                y: t.y
              }
            : null
        });

        return;
      }

      // ---------------------------------------------------------
      // 7. Неизвестный тип
      // ---------------------------------------------------------

      console.warn(
        '[onSave] Неизвестный тип страницы:',
        type,
        page
      );
    });

    // ---------------------------------------------------------
    // 8. Сохраняем единый объект проекта
    // ---------------------------------------------------------

    var data = {
      schemaVersion: 2,
      savedAt: new Date().toISOString(),
      pages: pages
    };

    console.log(
      '[onSave] Собрано страниц:',
      pages.length
    );

    console.log(
      '[onSave] Типы:',
      pages.map(function(p) {
        return p.type;
      })
    );

    saveProject(data);

  } catch (e) {

    console.error('[onSave] ERROR:', e);

    alert(
      'Ошибка при подготовке проекта к сохранению:\n\n' +
      e.message
    );
  }
}

// ===== LOAD =====
function onLoad(e) {
  var file = e.target.files[0];
  if (!file) return;

  loadProjectFile(file, function(err, parsed) {
    if (err) { alert(err.message); e.target.value = ''; return; }

    // Поддержка старого формата (массив) и нового (объект с pages)
    var pagesData;
    if (Array.isArray(parsed)) {
      pagesData = parsed;
    } else if (parsed && Array.isArray(parsed.pages)) {
      pagesData = parsed.pages;
    } else {
      alert('Не удалось загрузить проект: неподдерживаемый формат.');
      e.target.value = '';
      return;
    }

    if (pagesData.length === 0) {
      alert('В файле не найдено ни одной страницы.');
      e.target.value = '';
      return;
    }

    if (!confirm('Загрузить проект (' + pagesData.length + ' страниц)? Текущее содержимое будет заменено.')) {
      e.target.value = '';
      return;
    }

    clearAllPages();
    pendingAIResult = null;
    pendingAIPageId = null;
    closeAIPanel();

    // Восстанавливаем страницы по типам
    pagesData.forEach(function(pd) {
      var type = pd.type || 'herbarium';

      if (type === 'cover') {
        var page = createCoverPage(pd);
        if (page) document.getElementById('pagesContainer').appendChild(page);
      }
      else if (type === 'toc') {
        var tocPage = buildTocPage ? buildTocPage() : null;
        if (tocPage) document.getElementById('pagesContainer').appendChild(tocPage);
      }
      else if (type === 'divider') {
        var divPage = createDividerPage ? createDividerPage(pd.classRu, pd.classLat, pd.history) : null;
        if (divPage) document.getElementById('pagesContainer').appendChild(divPage);
      }
      else if (type === 'conclusion') {
        var concPage = createConclusionPage ? createConclusionPage(pd.text) : null;
        if (concPage) document.getElementById('pagesContainer').appendChild(concPage);
      }
      else {
        // herbarium — через restorePages, но по одному
        restorePages([pd]);
      }
    });

    applyBorderStyle();
    e.target.value = '';
  });
}

// ===== AI KEYS =====
function saveKeys() {
  var provider = document.getElementById('aiProvider').value;
  var key = document.getElementById('aiApiKey').value.trim();
  localStorage.setItem('herbarium_ai_provider', provider);
  localStorage.setItem('herbarium_ai_key', key);
  updateKeyStatus();
  document.querySelectorAll('.ai-page-button').forEach(function(btn) {
    setAIButtonState(btn, hasValidApiKey() ? 'ready' : 'nokey');
  });
  alert('Ключ сохранён в этом браузере.');
}

function updateKeyStatus() {
  var el = document.getElementById('aiKeyStatus');
  if (hasValidApiKey()) {
    el.textContent = '✓ Ключ сохранён';
    el.style.color = '#2e8b3d';
  } else {
    el.textContent = 'Ключ не сохранён';
    el.style.color = '#888';
  }
}

// ===== AI REQUEST (herbarium) =====
async function handleAIRequest(id) {
  var russianInput = document.getElementById('title-rus-' + id);
  var russianName = russianInput.value.trim();
  if (!russianName) { alert('Сначала введи русское название растения.'); russianInput.focus(); return; }

  var provider = localStorage.getItem('herbarium_ai_provider') || CONFIG.defaultProvider;
  var apiKey = localStorage.getItem('herbarium_ai_key') || '';
  if (!apiKey) { alert('Не указан API-ключ.\n\nВведи его в настройках AI (боковая панель).'); return; }

  pendingAIPageId = id;
  pendingAIResult = null;
  var panel = document.getElementById('aiPanel');
  panel.classList.add('visible');
  document.getElementById('aiLatinResult').textContent = '';
  document.getElementById('aiTaxonomyResult').textContent = '';
  document.getElementById('aiDescriptionResult').textContent = '';
  document.getElementById('aiStatus').textContent = 'AI (' + provider + ') определяет: «' + russianName + '»...';
  document.getElementById('applyAiButton').disabled = true;

  var pageButton = document.getElementById('ai-button-' + id);
  if (pageButton) { setAIButtonState(pageButton, 'loading'); pageButton.disabled = true; }

  try {
    var result = await requestAI(russianName, provider, apiKey);
    pendingAIResult = result;
    document.getElementById('aiLatinResult').textContent = result.latin_name;
    document.getElementById('aiTaxonomyResult').textContent =
      'Класс: ' + result.class + '\nСемейство: ' + result.family + '\nРод: ' + result.genus + '\nВид: ' + result.species;
    document.getElementById('aiDescriptionResult').textContent = result.description;
    document.getElementById('aiStatus').textContent = 'Проверь результат. Если всё устраивает — нажми «ПРИМЕНИТЬ».';
    document.getElementById('applyAiButton').disabled = false;
  } catch (error) {
    console.error('AI error:', error);
    document.getElementById('aiStatus').textContent = 'Ошибка при обращении к AI.';
    alert('Не удалось получить данные от AI.\n\n' + error.message);
  } finally {
    var pageButton = document.getElementById('ai-button-' + id);
    if (pageButton) { setAIButtonState(pageButton, hasValidApiKey() ? 'ready' : 'nokey'); pageButton.disabled = false; }
  }
}

function applyAIResult() {
  if (!pendingAIResult || !pendingAIPageId) return;
  var id = pendingAIPageId;
  document.getElementById('title-lat-' + id).value = pendingAIResult.latin_name;
  document.getElementById('tax-class-' + id).textContent = pendingAIResult.class;
  document.getElementById('tax-family-' + id).textContent = pendingAIResult.family;
  document.getElementById('tax-genus-' + id).textContent = pendingAIResult.genus;
  document.getElementById('tax-species-' + id).textContent = pendingAIResult.species;
  var descriptionField = document.getElementById('description-' + id);
  descriptionField.value = pendingAIResult.description;
  closeAIPanel();
  descriptionField.focus();
  descriptionField.setSelectionRange(descriptionField.value.length, descriptionField.value.length);
}

function closeAIPanel() {
  document.getElementById('aiPanel').classList.remove('visible');
  pendingAIResult = null;
  pendingAIPageId = null;
}

// ===== DOCUMENT BUILDER =====
function onBuildDocument() {
  if (!confirm('Собрать документ?\n\nСтраницы будут перегруппированы по классам.\nТитул, оглавление и заключение встанут на места.')) return;
  if (typeof buildDocument === 'function') {
    buildDocument();
  } else {
    alert('Модуль сборки документа ещё не готов.');
  }
}

function onRebuildToc() {
  if (typeof rebuildToc === 'function') {
    rebuildToc();
  } else {
    alert('Модуль оглавления ещё не готов.');
  }
}
function onGenerateDividers() {
  if (!hasValidApiKey()) { alert('Сначала сохрани API-ключ в настройках AI.'); return; }
  if (!confirm('Сгенерировать историю для всех разделителей через AI?\n\nЭто отправит ' + document.querySelectorAll('#pagesContainer .page[data-type="divider"]').length + ' запрос(ов).')) return;
  generateAllDividers();
}

function addConclusion() {
  var container = document.getElementById('pagesContainer');
  var page = createConclusionPage();
  if (!page) return;
  container.appendChild(page);
}

init();