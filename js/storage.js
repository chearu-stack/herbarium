// Сохранение / загрузка проекта

window.saveProject = function(pagesData) {
  var json = JSON.stringify({ savedAt: new Date().toISOString(), pages: pagesData }, null, 2);
  var blob = new Blob([json], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "гербарий_" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(url);
};

window.loadProjectFile = function(file, callback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var parsed = JSON.parse(e.target.result);
      callback(null, parsed);
    } catch (err) {
      callback(new Error("Не корректный JSON проекта"));
    }
  };
  reader.onerror = function() { callback(new Error("Ошибка чтения файла")); };
  reader.readAsText(file);
};
