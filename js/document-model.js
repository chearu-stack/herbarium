// document-model.js — Единая модель данных документа
// schemaVersion: 2
// Cover хранится как страница type: 'cover', не как отдельный объект document.

window.DocumentModel = {
  schemaVersion: 2,
  pages: [],

  reset: function() {
    this.pages = [];
  },

  addPage: function(pageData) {
    if (!pageData.type) pageData.type = 'herbarium';
    this.pages.push(pageData);
  },

  clearPages: function() {
    this.pages = [];
  },

  getPagesByType: function(type) {
    return this.pages.filter(function(p) { return p.type === type; });
  },

  getHerbariumPages: function() {
    return this.getPagesByType('herbarium');
  },

  // ===== ГРУППИРОВКА ПО КЛАССАМ =====
  groupByClass: function() {
    var groups = {};
    this.getHerbariumPages().forEach(function(p) {
      var cls = p.taxClass || 'Без класса';
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(p);
    });
    return groups;
  },

  getUniqueClasses: function() {
    var classes = [];
    this.getHerbariumPages().forEach(function(p) {
      var cls = p.taxClass || 'Без класса';
      if (classes.indexOf(cls) === -1) classes.push(cls);
    });
    return classes;
  },

  // ===== СЕРИАЛИЗАЦИЯ =====
  toJSON: function() {
    return {
      schemaVersion: this.schemaVersion,
      savedAt: new Date().toISOString(),
      pages: JSON.parse(JSON.stringify(this.pages))
    };
  },

  fromJSON: function(data) {
    if (!data || typeof data !== 'object') return false;

    // СТАРАЯ СХЕМА: { savedAt, pages: [...] } — все herbarium
    if (!data.schemaVersion && Array.isArray(data.pages)) {
      this.reset();
      this.pages = data.pages.map(function(p) {
        p.type = 'herbarium';
        return p;
      });
      return true;
    }

    // НОВАЯ СХЕМА
    if (data.schemaVersion >= 2) {
      this.reset();
      this.pages = (data.pages || []).map(function(p) {
        if (!p.type) p.type = 'herbarium';
        return p;
      });
      return true;
    }

    return false;
  }
};
