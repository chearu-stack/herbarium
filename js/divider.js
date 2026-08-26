// divider.js — Разделитель таксономического класса

window.createDividerPage = function(data, classLat, history) {
  // Универсально: (data) или (classRu, classLat, history)
  if (typeof data === "string") {
    data = { classRu: data, classLat: classLat, history: history };
  }
  data = data || {};

  var tpl = document.getElementById('tpl-divider');
  if (!tpl) { console.error('divider.js: tpl-divider не найден'); return null; }
  var clone = tpl.content.cloneNode(true);
  var page = clone.querySelector('.page');
  if (!page) { console.error('divider.js: .page не найден'); return null; }

  fillDividerPage(page, data);
  attachDividerAI(page);
  return page;
};

window.fillDividerPage = function(page, data) {
  if (!page || !data) return;
  var ru = page.querySelector('.divider-class-ru');
  var lat = page.querySelector('.divider-class-lat');
  var hist = page.querySelector('.divider-history');
  if (ru)  ru.textContent  = data.classRu  || data.title_ru  || '';
  if (lat) lat.textContent = data.classLat || data.title_latin || '';
  if (hist) hist.textContent = data.history || '';
};

window.readDividerPage = function(page) {
  if (!page) return null;
  return {
    type: 'divider',
    classRu: (page.querySelector('.divider-class-ru') || {}).textContent || '',
    classLat: (page.querySelector('.divider-class-lat') || {}).textContent || '',
    history: (page.querySelector('.divider-history') || {}).textContent || ''
  };
};

function attachDividerAI(page) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ai-page-button';
  btn.textContent = 'AI →';
  btn.title = 'Сгенерировать историю класса через AI';

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    handleDividerAI(page, btn);
  });

  page.appendChild(btn);
}

async function handleDividerAI(page, btn) {
  var ru = page.querySelector('.divider-class-ru').textContent.trim();
  var lat = page.querySelector('.divider-class-lat').textContent.trim();
  if (!ru) { alert('Сначала введи название класса.'); return; }

  var provider = localStorage.getItem('herbarium_ai_provider') || CONFIG.defaultProvider;
  var apiKey = localStorage.getItem('herbarium_ai_key') || '';
  if (!apiKey) { alert('Не указан API-ключ. Сохрани ключ в настройках AI.'); return; }

  setAIButtonState(btn, 'loading');
  btn.disabled = true;

  try {
    var result = await requestDividerAI(ru, lat, provider, apiKey);
    fillDividerPage(page, {
      classRu: result.title_ru,
      classLat: result.title_latin,
      history: result.history
    });
  } catch (err) {
    console.error('Divider AI error:', err);
    alert('Не удалось получить данные.\n' + err.message);
  } finally {
    setAIButtonState(btn, hasValidApiKey() ? 'ready' : 'nokey');
    btn.disabled = false;
  }
}

// ===== МАССОВАЯ ГЕНЕРАЦИЯ ВСЕХ РАЗДЕЛИТЕЛЕЙ =====
window.generateAllDividers = async function() {
  var dividers = document.querySelectorAll('#pagesContainer .page[data-type="divider"]');
  if (dividers.length === 0) {
    alert('Разделители не найдены. Сначала нажми «Собрать документ».');
    return;
  }

  var provider = localStorage.getItem('herbarium_ai_provider') || CONFIG.defaultProvider;
  var apiKey = localStorage.getItem('herbarium_ai_key') || '';
  if (!apiKey) { alert('Не указан API-ключ.'); return; }

  var statusEl = document.getElementById('aiKeyStatus');
  var originalStatus = statusEl ? statusEl.textContent : '';

  for (var i = 0; i < dividers.length; i++) {
    var page = dividers[i];
    var ru = page.querySelector('.divider-class-ru').textContent.trim();
    var lat = page.querySelector('.divider-class-lat').textContent.trim();

    if (!ru) continue;
    if (page.querySelector('.divider-history').textContent.trim()) continue; // уже есть

    if (statusEl) {
      statusEl.textContent = 'AI пишет «' + ru + '»... (' + (i+1) + '/' + dividers.length + ')';
      statusEl.style.color = '#c99a12';
    }

    try {
      var result = await requestDividerAI(ru, lat, provider, apiKey);
      fillDividerPage(page, {
        classRu: result.title_ru,
        classLat: result.title_latin,
        history: result.history
      });
    } catch (err) {
      console.error('Divider AI error for', ru, ':', err);
    }
  }

  if (statusEl) {
    statusEl.textContent = originalStatus || '✓ Ключ сохранён';
    statusEl.style.color = hasValidApiKey() ? '#2e8b3d' : '#888';
  }
};
