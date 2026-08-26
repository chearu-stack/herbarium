// conclusion.js — Заключение (А4-страница)

window.createConclusionPage = function(text) {
  var tpl = document.getElementById('tpl-conclusion');
  if (!tpl) { console.error('conclusion.js: tpl-conclusion не найден'); return null; }
  var clone = tpl.content.cloneNode(true);
  var page = clone.querySelector('.page');
  if (!page) { console.error('conclusion.js: .page не найден'); return null; }

  var textEl = page.querySelector('.conclusion-text');
  if (textEl) textEl.textContent = text || '';

  attachConclusionAI(page);
  return page;
};

window.readConclusionPage = function(page) {
  if (!page) return null;
  return {
    type: 'conclusion',
    text: (page.querySelector('.conclusion-text') || {}).textContent || ''
  };
};

function attachConclusionAI(page) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ai-page-button';
  btn.textContent = 'AI →';
  btn.title = 'Сгенерировать заключение через AI';

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    handleConclusionAI(page, btn);
  });

  page.appendChild(btn);
}

async function handleConclusionAI(page, btn) {
  var provider = localStorage.getItem('herbarium_ai_provider') || CONFIG.defaultProvider;
  var apiKey = localStorage.getItem('herbarium_ai_key') || '';
  if (!apiKey) { alert('Не указан API-ключ. Сохрани ключ в настройках AI.'); return; }

  setAIButtonState(btn, 'loading');
  btn.disabled = true;

  try {
    var context = buildConclusionContext();
    var result = await requestConclusionAI(context, provider, apiKey);
    var textEl = page.querySelector('.conclusion-text');
    if (textEl) textEl.textContent = result.text || '';
  } catch (err) {
    console.error('Conclusion AI error:', err);
    alert('Не удалось сгенерировать заключение.\n' + err.message);
  } finally {
    setAIButtonState(btn, hasValidApiKey() ? 'ready' : 'nokey');
    btn.disabled = false;
  }
}

window.buildConclusionContext = function() {
  var container = document.getElementById('pagesContainer');
  var classes = [];
  var currentClass = null;
  var currentPlants = [];

  container.querySelectorAll('.page').forEach(function(page) {
    var type = page.dataset.type || 'herbarium';

    if (type === 'divider') {
      if (currentClass && currentPlants.length > 0) {
        classes.push({ name_ru: currentClass, plants: currentPlants });
      }
      currentClass = page.querySelector('.divider-class-ru');
      currentClass = currentClass ? currentClass.textContent.trim() : 'Без класса';
      currentPlants = [];
    }
    else if (type === 'herbarium') {
      var titleRus = page.querySelector('.title-rus');
      var titleLat = page.querySelector('.title-lat');
      currentPlants.push({
        name_ru: titleRus ? titleRus.value.trim() : '',
        name_lat: titleLat ? titleLat.value.trim() : ''
      });
    }
  });

  if (currentClass && currentPlants.length > 0) {
    classes.push({ name_ru: currentClass, plants: currentPlants });
  }

  return { title: 'Гербарий растений', classes: classes };
};
