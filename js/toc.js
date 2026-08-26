// toc.js — Автоматическое оглавление

window.buildTocPage = function() {
  var tpl = document.getElementById('tpl-toc');
  if (!tpl) { console.error('toc.js: tpl-toc не найден'); return null; }
  var clone = tpl.content.cloneNode(true);
  var page = clone.querySelector('.page');
  if (!page) { console.error('toc.js: .page не найден'); return null; }

  rebuildTocBody(page);
  return page;
};

window.rebuildToc = function() {
  var tocPage = document.querySelector('#pagesContainer .page[data-type="toc"]');
  if (!tocPage) {
    console.log('rebuildToc: TOC не найден, создаём новую');
    var page = buildTocPage();
    if (page) {
      var container = document.getElementById('pagesContainer');
      var cover = container.querySelector('.page[data-type="cover"]');
      if (cover && cover.nextSibling) {
        container.insertBefore(page, cover.nextSibling);
      } else {
        container.insertBefore(page, container.firstChild);
      }
    }
    return;
  }
  rebuildTocBody(tocPage);
};

function rebuildTocBody(page) {
  var body = page.querySelector('.toc-body');
  if (!body) return;
  body.innerHTML = '';

  // Собираем herbarium-страницы из DOM для живого оглавления
  var container = document.getElementById('pagesContainer');
  var pages = container.querySelectorAll('.page');
  var currentClass = null;

  pages.forEach(function(p, idx) {
    var type = p.dataset.type || 'herbarium';
    var num = idx + 1;

    if (type === 'divider') {
      currentClass = p.querySelector('.divider-class-ru');
      currentClass = currentClass ? currentClass.textContent.trim() : 'Класс';
      var classDiv = document.createElement('div');
      classDiv.className = 'toc-class';
      classDiv.textContent = currentClass;
      body.appendChild(classDiv);
    }
    else if (type === 'herbarium') {
      var titleEl = p.querySelector('.title-rus');
      var title = titleEl ? titleEl.value.trim() : 'Без названия';
      var item = document.createElement('div');
      item.className = 'toc-item';
      item.innerHTML = '<span class="toc-item-name">' + escapeHtml(title) +
        '</span><span class="toc-item-dots"></span><span class="toc-item-page">' + num + '</span>';
      body.appendChild(item);
    }
    else if (type === 'conclusion') {
      var item = document.createElement('div');
      item.className = 'toc-item';
      item.style.marginTop = '8mm';
      item.innerHTML = '<span class="toc-item-name" style="font-weight:bold">Заключение</span>' +
        '<span class="toc-item-dots"></span><span class="toc-item-page">' + num + '</span>';
      body.appendChild(item);
    }
  });
}

window.recalculatePageNumbers = function() {
  var pages = document.querySelectorAll('#pagesContainer .page');
  pages.forEach(function(page, index) {
    page.dataset.pageNum = index + 1;
  });
};

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
