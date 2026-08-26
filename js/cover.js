// cover.js — Титульная страница А4
// Создание из template, чтение данных, inline-редактирование

window.createCoverPage = function(data) {
  data = data || {};

  var tpl = document.getElementById('tpl-cover');
  if (!tpl) {
    console.error('cover.js: tpl-cover не найден');
    return null;
  }

  var clone = tpl.content.cloneNode(true);
  var page = clone.querySelector('.page');
  if (!page) {
    console.error('cover.js: .page не найден в шаблоне');
    return null;
  }

  // Заполняем данными
  fillCoverPage(page, data);

  return page;
};

window.fillCoverPage = function(page, data) {
  if (!page || !data) return;

  var org      = page.querySelector('.cover-org');
  var city     = page.querySelector('.cover-city');
  var title    = page.querySelector('.cover-title');
  var subject  = page.querySelector('.cover-subject');
  var year     = page.querySelector('.cover-year');
  var bottomValues = page.querySelectorAll('.cover-bottom .cover-value');

  if (org)     org.textContent     = data.organization || '';
  if (city)    city.textContent    = data.city || '';
  if (title)   title.textContent   = data.title || '';
  if (subject) subject.textContent = data.subject || '';
  if (year)    year.textContent    = data.year || '';

  if (bottomValues[0]) bottomValues[0].textContent = data.studentName || '';
  if (bottomValues[1]) bottomValues[1].textContent = data.studentClass || '';
  if (bottomValues[2]) bottomValues[2].textContent = data.supervisor || '';
};

window.readCoverPage = function(page) {
  if (!page) return null;

  var bottomValues = page.querySelectorAll('.cover-bottom .cover-value');
  return {
    type: 'cover',
    organization: (page.querySelector('.cover-org')    || {}).textContent || '',
    city:         (page.querySelector('.cover-city')   || {}).textContent || '',
    title:        (page.querySelector('.cover-title')  || {}).textContent || '',
    subject:      (page.querySelector('.cover-subject')|| {}).textContent || '',
    studentName:  (bottomValues[0] || {}).textContent || '',
    studentClass: (bottomValues[1] || {}).textContent || '',
    supervisor:   (bottomValues[2] || {}).textContent || '',
    year:         (page.querySelector('.cover-year')  || {}).textContent || ''
  };
};
