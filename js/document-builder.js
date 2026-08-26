// document-builder.js — Оркестрация сборки документа

function extractLatin(str) {
  var m = String(str || '').match(/\(([^)]+)\)/);
  return m ? m[1] : String(str || '');
}

function readField(page, selector) {
  var el = page.querySelector(selector);
  if (!el) return '';
  var v = el.value !== undefined ? el.value : el.textContent;
  return (v || '').trim();
}

window.buildDocument = function() {
  var container = document.getElementById('pagesContainer');
  console.log('[buildDocument] Starting...');

  // 1. Собираем текущие данные из DOM
  var coverData = null;
  var conclusionData = null;
  var herbariumData = [];

  container.querySelectorAll('.page').forEach(function(page, idx) {
    var type = page.dataset.type || 'herbarium';

    if (type === 'cover') {
      coverData = readCoverPage(page);
    }
    else if (type === 'conclusion') {
      conclusionData = readConclusionPage(page);
    }
    else if (type === 'herbarium') {
      var hd = collectHerbariumData(page);
      if (hd) {
        console.log('[buildDocument] Herbarium #' + idx,
          'title:', hd.titleRus,
          '| family:', hd.taxFamily,
          '| class:', hd.taxClass);
        herbariumData.push(hd);
      } else {
        console.warn('[buildDocument] Failed to collect herbarium page', idx);
      }
    }
    // toc и divider игнорируем — пересоздадим
  });

  console.log('[buildDocument] Total herbarium:', herbariumData.length);

  // 2. Группируем по классам (ключ = латинское название в скобках)
  var groups = {};
  var groupMeta = {};

  herbariumData.forEach(function(h) {
    var rawCls = h.taxClass || 'Без класса';
    if (!rawCls) rawCls = 'Без класса';

    var match = rawCls.match(/\(([^)]+)\)/);
    var groupKey = match ? match[1] : rawCls;
    var classRu  = rawCls.replace(/\s*\([^)]+\)/, '').trim() || rawCls;
    var classLat = match ? match[1] : '';

    if (!groups[groupKey]) {
      groups[groupKey] = [];
      groupMeta[groupKey] = { classRu: classRu, classLat: classLat };
    }
    groups[groupKey].push(h);
  });

  // 2a. Внутри каждого класса сортируем по русскому названию семейства,
  //     затем по русскому названию растения
  Object.keys(groups).forEach(function(k) {
    groups[k].sort(function(a, b) {
      // Русское название семейства (до скобок)
      var fa = (a.taxFamily || '').replace(/\s*\([^)]+\)/, '').trim().toLowerCase();
      var fb = (b.taxFamily || '').replace(/\s*\([^)]+\)/, '').trim().toLowerCase();

      if (fa !== fb) {
        if (!fa) return 1;   // пустые в конец
        if (!fb) return -1;
        return fa < fb ? -1 : fa > fb ? 1 : 0;
      }

      // Фолбэк: если русские названия одинаковые — по латыни
      var la = extractLatin(a.taxFamily).toLowerCase();
      var lb = extractLatin(b.taxFamily).toLowerCase();
      if (la !== lb) {
        if (!la) return 1;
        if (!lb) return -1;
        return la < lb ? -1 : la > lb ? 1 : 0;
      }

      // Внутри одного семейства — по русскому названию растения
      var ra = (a.titleRus || '').toLowerCase();
      var rb = (b.titleRus || '').toLowerCase();
      return ra < rb ? -1 : ra > rb ? 1 : 0;
    });
    console.log('[buildDocument] Sorted class', k, ':',
      groups[k].map(function(x){ return x.titleRus + '(' + x.taxFamily + ')'; }).join(', '));
  });

  var classNames = Object.keys(groups);
  console.log('[buildDocument] Classes found:', classNames.length, JSON.stringify(classNames));

  // 3. Очищаем DOM
  clearAllPages();

  // 4. Cover
  if (coverData) {
    try {
      var cover = createCoverPage(coverData);
      if (cover) container.appendChild(cover);
    } catch (e) { console.error('Cover error:', e); }
  }

  // 5. TOC
  try {
    var toc = buildTocPage();
    if (toc) container.appendChild(toc);
  } catch (e) { console.error('TOC error:', e); }

  // 6. Dividers + Herbarium по классам
  classNames.forEach(function(groupKey) {
    console.log('[buildDocument] Building class:', groupKey, 'plants:', groups[groupKey].length);
    var meta = groupMeta[groupKey];

    try {
      var divider = createDividerPage({
        classRu: meta.classRu,
        classLat: meta.classLat,
        history: ''
      });
      if (divider) container.appendChild(divider);
    } catch (e) {
      console.error('[buildDocument] Divider error:', e);
    }

    try {
      restorePages(groups[groupKey]);
      console.log('[buildDocument] Restored', groups[groupKey].length, 'pages for', groupKey);
    } catch (e) {
      console.error('[buildDocument] Restore error for class', groupKey, ':', e);
    }
  });

  // 7. Conclusion
  if (conclusionData) {
    try {
      var conc = createConclusionPage(conclusionData.text);
      if (conc) container.appendChild(conc);
    } catch (e) { console.error('Conclusion error:', e); }
  }

  // 8. Пересчёт
  try {
    recalculatePageNumbers();
    applyBorderStyle();
  } catch (e) { console.error('Final cleanup error:', e); }

  console.log('[buildDocument] Done. Total DOM pages:', container.querySelectorAll('.page').length);
};

function collectHerbariumData(page) {
  try {
    var area = page.querySelector('.content-area');
    if (!area) {
      console.warn('collectHerbariumData: no .content-area in page');
      return null;
    }

    // Ищем ID страницы: либо из area.id, либо из data-атрибута
    var rawId = area.id || page.dataset.pageId || '';
    var id = rawId.replace(/^area-/, '');
    if (!id) {
      // Пробуем вытащить id из любого элемента с id вида title-rus-N
      var anyIdEl = page.querySelector('[id^="title-rus-"]');
      if (anyIdEl) id = anyIdEl.id.replace('title-rus-', '');
    }
    if (!id || isNaN(parseInt(id))) {
      console.warn('collectHerbariumData: invalid id', id, 'raw:', rawId);
      return null;
    }

    var borderMode = ['mode-full','mode-left','mode-none'].find(function(m) {
      return area.classList.contains(m);
    }) || 'mode-full';

    // Читаем поля: сначала по id, если не нашли — по классам
    var titleRus = readField(page, '#title-rus-' + id) || readField(page, '.title-rus');
    var titleLat = readField(page, '#title-lat-' + id) || readField(page, '.title-lat');
    var taxClass = readField(page, '#tax-class-' + id) || readField(page, '.tax-class');
    var taxFamily = readField(page, '#tax-family-' + id) || readField(page, '.tax-family');
    var taxGenus = readField(page, '#tax-genus-' + id) || readField(page, '.tax-genus');
    var taxSpecies = readField(page, '#tax-species-' + id) || readField(page, '.tax-species');
    var description = readField(page, '#description-' + id) || readField(page, '.description');
    var collectionPlace = readField(page, '#collection-place-' + id) || readField(page, '.collection-place');
    var collectionDate = readField(page, '#collection-date-' + id) || readField(page, '.collection-date');

    // Изображение
    var img = document.getElementById('img-' + id);
    var box = document.getElementById('imgBox-' + id);
    var hasImage = box && box.classList.contains('has-image');
    var t = imageTransforms[id];

    var result = {
      type: 'herbarium',
      borderMode: borderMode,
      titleRus: titleRus,
      titleLat: titleLat,
      taxClass: taxClass,
      taxFamily: taxFamily,
      taxGenus: taxGenus,
      taxSpecies: taxSpecies,
      description: description,
      collectionPlace: collectionPlace,
      collectionDate: collectionDate,
      image: hasImage && img ? img.src : null,
      transform: t ? { scale: t.scale, x: t.x, y: t.y } : null
    };

    console.log('[collectHerbariumData] id=' + id,
      'title=' + result.titleRus,
      'family=' + result.taxFamily,
      'class=' + result.taxClass);

    return result;

  } catch (e) {
    console.error('collectHerbariumData error:', e);
    return null;
  }
}