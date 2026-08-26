// Сохранение и загрузка проекта. Сборка полного состояния — в app.js, здесь только сериализация.

window.saveProject = function(fullState) {
  var json = JSON.stringify(fullState, null, 2);
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
    try { callback(null, JSON.parse(e.target.result)); }
    catch(err) { callback(new Error("Некорректный JSON")); }
  };
  reader.onerror = function() { callback(new Error("Ошибка чтения файла")); };
  reader.readAsText(file);
};
