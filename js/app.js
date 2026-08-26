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
  var container = document.getElementById('pagesContainer');
  var pages = [];

  container.querySelectorAll('.page').forEach(function(page) {
    var type = page.dataset.type || 'herbarium';

    if (type === 'cover') {
      var coverData = readCoverPage(page);
      if (coverData) pages.push(coverData);
    }
    else if (type === 'toc') {
      pages.push({ type: 'toc', auto: true });
    }
    else if (type === 'divider') {
      pages.push({
        type: 'divider',
        classRu: (page.querySelector('.divider-class-ru') || {}).textContent || '',
        classLat: (page.querySelector('.divider-class-lat') || {}).textContent || '',
        history: (page.querySelector('.divider-history') || {}).textContent || ''
      });
    }
    else if (type === 'conclusion') {
      pages.push({
        type: 'conclusion',
        text: (page.querySelector('.conclusion-text') || {}).textContent || ''
      });
    }
    else {
      // herbarium — через существующую функцию
      var area = page.querySelector('.content-area');
      if (!area) return;
      var id = area.id.replace('area-', '');
      pages.push({
        type: 'herbarium',
        borderMode: ['mode-full','mode-left','mode-none'].find(function(m){ return area.classList.contains(m); }) || 'mode-full',
        titleRus: (document.getElementById('title-rus-' + id) || {}).value || '',
        titleLat: (document.getElementById('title-lat-' + id) || {}).value || '',
        taxClass: (document.getElementById('tax-class-' + id) || {}).textContent || '',
        taxFamily: (document.getElementById('tax-family-' + id) || {}).textContent || '',
        taxGenus: (document.getElementById('tax-genus-' + id) || {}).textContent || '',
        taxSpecies: (document.getElementById('tax-species-' + id) || {}).textContent || '',
        description: (document.getElementById('description-' + id) || {}).value || '',
        collectionPlace: (document.getElementById('collection-place-' + id) || {}).value || '',
        collectionDate: (document.getElementById('collection-date-' + id) || {}).value || '',
        image: (function() {
          var img = document.getElementById('img-' + id);
          var box = document.getElementById('imgBox-' + id);
          return (box && box.classList.contains('has-image') && img) ? img.src : null;
        })(),
        transform: (function() {
          var t = imageTransforms[id];
          return t ? { scale: t.scale, x: t.x, y: t.y } : null;
        })()
      });
    }
  });

  DocumentModel.reset();
  DocumentModel.setDocument({}); // пустой, т.к. cover хранится как страница
  pages.forEach(function(p) { DocumentModel.addPage(p); });

  saveProject(DocumentModel.toJSON());
}

// ===== LOAD =====
function onLoad(e) {
  var file = e.target.files[0];
  if (!file) return;

  loadProjectFile(file, function(err, parsed) {
    if (err) { alert(err.message); e.target.value = ''; return; }

    if (!DocumentModel.fromJSON(parsed)) {
      alert('Не удалось загрузить проект: неподдерживаемый формат.');
      e.target.value = '';
      return;
    }

    var pagesData = DocumentModel.pages;
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
