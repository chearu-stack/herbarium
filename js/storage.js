// Сохранение и загрузка проекта

export function saveProject(pagesData) {
  const json = JSON.stringify({ 
    savedAt: new Date().toISOString(), 
    pages: pagesData 
  }, null, 2);

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 10);
  a.download = `гербарий_${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadProject(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        resolve(parsed);
      } catch (err) {
        reject(new Error("Не корректный JSON проекта"));
      }
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsText(file);
  });
}
