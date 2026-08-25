// Главный модуль

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

  document.getElementById('btnSaveKeys').addEventListener('click', saveKeys);
  document.getElementById('applyAiButton').addEventListener('click', applyAIResult);
  document.getElementById('cancelAiButton').addEventListener('click', closeAIPanel);

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

function addPage() {
  var container = document.getElementById('pagesContainer');
  var page = createPage();
  container.appendChild(page);
  // === ИСПРАВЛЕНО: attachImageEditor ПОСЛЕ appendChild, когда элементы в DOM ===
  attachImageEditor(pageCounter);
  applyBorderStyle();
  updatePageOrderControls();
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
  addPage();
}

function onSave() {
  var data = getAllPagesData();
  saveProject(data);
}

function onLoad(e) {
  var file = e.target.files[0];
  if (!file) return;
  loadProjectFile(file, function(err, parsed) {
    if (err) { alert(err.message); e.target.value = ''; return; }
    var pagesData = parsed.pages || [];
    if (pagesData.length === 0) { alert('В файле не найдено ни одного листа.'); e.target.value = ''; return; }
    if (!confirm('Загрузить проект (' + pagesData.length + ' лист(ов))? Текущее содержимое будет заменено.')) { e.target.value = ''; return; }
    clearAllPages();
    pendingAIResult = null;
    pendingAIPageId = null;
    closeAIPanel();
    restorePages(pagesData);
    applyBorderStyle();
    e.target.value = '';
  });
}

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

init();
