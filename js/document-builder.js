// document-builder.js — Оркестрация сборки документа

window.buildDocument = function() {
  var container = document.getElementById('pagesContainer');
  console.log('[buildDocument] Starting...');

  // 1. Собираем текущие данные из DOM
  var coverData = null;
  var conclusionData = null;
  var herbariumData = [];

  container.querySelectorAll('.page').forEach(function(page, idx) {
    var type = page.dataset.type || 'herbarium';
    console.log('[buildDocument] Page', idx, 'type:', type);

    if (type === 'cover') {
      coverData = readCoverPage(page);
      console.log('[buildDocument] Cover found');
    }
    else if (type === 'conclusion') {
      conclusionData = readConclusionPage(page);
      console.log('[buildDocument] Conclusion found');
    }
    else if (type === 'herbarium') {
      var hd = collectHerbariumData(page);
      if (hd) {
        console.log('[buildDocument] Herbarium:', hd.titleRus, '| class:', hd.taxClass);
        herbariumData.push(hd);
      } else {
        console.warn('[buildDocument] Failed to collect herbarium page', idx);
      }
    }
    // toc и divider игнорируем — пересоздадим
  });

  console.log('[buildDocument] Total herbarium:', herbariumData.length);

  // 2. Группируем по классам (с trim)
  var groups = {};
  herbariumData.forEach(function(h) {
    var cls = (h.taxClass || 'Без класса').trim();
    if (!cls) cls = 'Без класса';
    if (!groups[cls]) groups[cls] = [];
    groups[cls].push(h);
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
  classNames.forEach(function(cls) {
    console.log('[buildDocument] Building class:', cls, 'plants:', groups[cls].length);

    var match = cls.match(/\(([^)]+)\)/);
    var classLat = match ? match[1] : '';
    var classRu = cls.replace(/\s*\([^)]+\)/, '').trim() || cls;

    try {
      var divider = createDividerPage({
        classRu: classRu,
        classLat: classLat,
        history: ''
      });
      if (divider) container.appendChild(divider);
    } catch (e) {
      console.error('[buildDocument] Divider error:', e);
    }

    try {
      restorePages(groups[cls]);
      console.log('[buildDocument] Restored', groups[cls].length, 'pages for', cls);
    } catch (e) {
      console.error('[buildDocument] Restore error for class', cls, ':', e);
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
      console.warn('collectHerbariumData: no .content-area');
      return null;
    }
    var id = area.id.replace('area-', '');
    if (!id || isNaN(parseInt(id))) {
      console.warn('collectHerbariumData: invalid id', id);
      return null;
    }

    var borderMode = ['mode-full','mode-left','mode-none'].find(function(m) {
      return area.classList.contains(m);
    }) || 'mode-full';

    var img = document.getElementById('img-' + id);
    var box = document.getElementById('imgBox-' + id);
    var hasImage = box && box.classList.contains('has-image');
    var t = imageTransforms[id];

    return {
      type: 'herbarium',
      borderMode: borderMode,
      titleRus: ((document.getElementById('title-rus-' + id) || {}).value || '').trim(),
      titleLat: ((document.getElementById('title-lat-' + id) || {}).value || '').trim(),
      taxClass: ((document.getElementById('tax-class-' + id) || {}).textContent || '').trim(),
      taxFamily: ((document.getElementById('tax-family-' + id) || {}).textContent || '').trim(),
      taxGenus: ((document.getElementById('tax-genus-' + id) || {}).textContent || '').trim(),
      taxSpecies: ((document.getElementById('tax-species-' + id) || {}).textContent || '').trim(),
      description: ((document.getElementById('description-' + id) || {}).value || '').trim(),
      collectionPlace: ((document.getElementById('collection-place-' + id) || {}).value || '').trim(),
      collectionDate: ((document.getElementById('collection-date-' + id) || {}).value || '').trim(),
      image: hasImage && img ? img.src : null,
      transform: t ? { scale: t.scale, x: t.x, y: t.y } : null
    };
  } catch (e) {
    console.error('collectHerbariumData error:', e);
    return null;
  }
}
