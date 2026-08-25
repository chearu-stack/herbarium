// Главный модуль — связывает всё воедино

import { CONFIG } from './config.js';
import { saveProject, loadProject } from './storage.js';
import { requestAI } from './ai-client.js';
import { setAIButtonState, hasValidApiKey } from './utils.js';
import { 
  createPage, movePage, updatePageOrderControls, 
  getAllPagesData, clearAllPages, restorePages 
} from './pages.js';

// ===== СОСТОЯНИЕ =====
let pendingAIResult = null;
let pendingAIPageId = null;

// ===== ИНИЦИАЛИЗАЦИЯ =====
function init() {
  // Загрузить настройки AI из localStorage
  const savedProvider = localStorage.getItem('herbarium_ai_provider');
  const savedKey = localStorage.getItem('herbarium_ai_key');

  if (savedProvider) document.getElementById('aiProvider').value = savedProvider;
  if (savedKey) document.getElementById('aiApiKey').value = savedKey;

  updateKeyStatus();

  // Первая страница
  addPage();

  // Глобальные обработчики
  bindGlobalEvents();
}

// ===== ГЛОБАЛЬНЫЕ СОБЫТИЯ =====
function bindGlobalEvents() {
  // Управление
  document.getElementById('btnAddPage').addEventListener('click', addPage);
  document.getElementById('btnPrint').addEventListener('click', () => window.print());
  document.getElementById('btnClear').addEventListener('click', clearAll);
  document.getElementById('btnSave').addEventListener('click', onSave);
  document.getElementById('btnLoadTrigger').addEventListener('click', () => {
    document.getElementById('loadProjectInput').click();
  });
  document.getElementById('loadProjectInput').addEventListener('change', onLoad);

  // Рамки
  document.querySelectorAll('input[name="borderStyle"]').forEach(radio => {
    radio.addEventListener('change', applyBorderStyle);
  });

  // AI настройки
  document.getElementById('btnSaveKeys').addEventListener('click', saveKeys);

  // AI панель
  document.getElementById('applyAiButton').addEventListener('click', applyAIResult);
  document.getElementById('cancelAiButton').addEventListener('click', closeAIPanel);

  // Перемещение страниц (делегирование)
  document.getElementById('pagesContainer').addEventListener('click', (e) => {
    const btn = e.target.closest('.order-button');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    const dir = parseInt(btn.dataset.dir);
    movePage(id, dir);
  });

  // AI запросы
  document.getElementById('pagesContainer').addEventListener('request-ai', (e) => {
    handleAIRequest(e.detail.id);
  });
}

// ===== СТРАНИЦЫ =====
function addPage() {
  const container = document.getElementById('pagesContainer');
  container.appendChild(createPage());
  applyBorderStyle();
  updatePageOrderControls();
}

function applyBorderStyle() {
  const selected = document.querySelector('input[name="borderStyle"]:checked');
  if (!selected) return;
  const style = selected.value;
  document.querySelectorAll('.content-area').forEach(area => {
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

// ===== СОХРАНЕНИЕ / ЗАГРУЗКА =====
function onSave() {
  const data = getAllPagesData();
  saveProject(data);
}

async function onLoad(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = await loadProject(file);
    const pagesData = parsed.pages || [];
    if (pagesData.length === 0) {
      alert('В файле не найдено ни одного листа.');
      return;
    }
    if (!confirm(`Загрузить проект (${pagesData.length} лист(ов))? Текущее содержимое будет заменено.`)) return;

    clearAllPages();
    pendingAIResult = null;
    pendingAIPageId = null;
    closeAIPanel();
    restorePages(pagesData);
    applyBorderStyle();
  } catch (err) {
    alert(err.message);
  }
  e.target.value = '';
}

// ===== AI НАСТРОЙКИ =====
function saveKeys() {
  const provider = document.getElementById('aiProvider').value;
  const key = document.getElementById('aiApiKey').value.trim();

  localStorage.setItem('herbarium_ai_provider', provider);
  localStorage.setItem('herbarium_ai_key', key);

  updateKeyStatus();

  // Обновить кнопки AI на всех страницах
  document.querySelectorAll('.ai-page-button').forEach(btn => {
    setAIButtonState(btn, hasValidApiKey() ? 'ready' : 'nokey');
  });

  alert('Ключ сохранён в этом браузере.');
}

function updateKeyStatus() {
  const el = document.getElementById('aiKeyStatus');
  if (hasValidApiKey()) {
    el.textContent = '✓ Ключ сохранён';
    el.style.color = '#2e8b3d';
  } else {
    el.textContent = 'Ключ не сохранён';
    el.style.color = '#888';
  }
}

// ===== AI ЗАПРОС =====
async function handleAIRequest(id) {
  const russianInput = document.getElementById(`title-rus-${id}`);
  const russianName = russianInput.value.trim();

  if (!russianName) {
    alert('Сначала введи русское название растения.');
    russianInput.focus();
    return;
  }

  const provider = localStorage.getItem('herbarium_ai_provider') || CONFIG.defaultProvider;
  const apiKey = localStorage.getItem('herbarium_ai_key') || '';

  if (!apiKey) {
    alert('Не указан API-ключ.\n\nВведи его в настройках AI (боковая панель).');
    return;
  }

  pendingAIPageId = id;
  pendingAIResult = null;

  const panel = document.getElementById('aiPanel');
  panel.classList.add('visible');

  document.getElementById('aiLatinResult').textContent = '';
  document.getElementById('aiTaxonomyResult').textContent = '';
  document.getElementById('aiDescriptionResult').textContent = '';
  document.getElementById('aiStatus').textContent = `AI (${provider}) определяет: «${russianName}»...`;
  document.getElementById('applyAiButton').disabled = true;

  const pageButton = document.getElementById(`ai-button-${id}`);
  if (pageButton) {
    setAIButtonState(pageButton, 'loading');
    pageButton.disabled = true;
  }

  try {
    const result = await requestAI(russianName, provider, apiKey);

    pendingAIResult = result;

    document.getElementById('aiLatinResult').textContent = result.latin_name;
    document.getElementById('aiTaxonomyResult').textContent =
      `Класс: ${result.class}\nСемейство: ${result.family}\nРод: ${result.genus}\nВид: ${result.species}`;
    document.getElementById('aiDescriptionResult').textContent = result.description;
    document.getElementById('aiStatus').textContent = 'Проверь результат. Если всё устраивает — нажми «ПРИМЕНИТЬ».';
    document.getElementById('applyAiButton').disabled = false;

  } catch (error) {
    console.error('AI error:', error);
    document.getElementById('aiStatus').textContent = 'Ошибка при обращении к AI.';
    alert('Не удалось получить данные от AI.\n\n' + error.message);
  } finally {
    const pageButton = document.getElementById(`ai-button-${id}`);
    if (pageButton) {
      setAIButtonState(pageButton, hasValidApiKey() ? 'ready' : 'nokey');
      pageButton.disabled = false;
    }
  }
}

function applyAIResult() {
  if (!pendingAIResult || !pendingAIPageId) return;
  const id = pendingAIPageId;

  document.getElementById(`title-lat-${id}`).value = pendingAIResult.latin_name;
  document.getElementById(`tax-class-${id}`).textContent  = pendingAIResult.class;
  document.getElementById(`tax-family-${id}`).textContent = pendingAIResult.family;
  document.getElementById(`tax-genus-${id}`).textContent  = pendingAIResult.genus;
  document.getElementById(`tax-species-${id}`).textContent = pendingAIResult.species;

  const descriptionField = document.getElementById(`description-${id}`);
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

// ===== СТАРТ =====
init();
