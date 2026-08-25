// Создание и управление страницами гербария

import { attachImageEditor, initTransform, getTransformData, setTransformData } from './image-editor.js';
import { setAIButtonState, hasValidApiKey } from './utils.js';

let pageCounter = 0;

export function getPageCounter() { return pageCounter; }

export function createPage() {
  pageCounter++;
  const id = pageCounter;

  const page = document.createElement("div");
  page.className = "page";

  page.innerHTML = `
    <div class="content-area mode-full" id="area-${id}">
      <div class="header">
        <input type="text" class="title-rus" id="title-rus-${id}" placeholder="Русское название">
        <input type="text" class="title-lat" id="title-lat-${id}" placeholder="Латинское название">
        <div class="page-order-controls">
          <button type="button" class="order-button" id="order-up-${id}" data-id="${id}" data-dir="-1" title="Переместить лист выше">▲</button>
          <button type="button" class="order-button" id="order-down-${id}" data-id="${id}" data-dir="1" title="Переместить лист ниже">▼</button>
        </div>
        <button type="button" class="ai-page-button" id="ai-button-${id}" data-id="${id}">AI →</button>
      </div>

      <div class="top-section">
        <div class="left-half">
          <div class="image-box" id="imgBox-${id}">
            <div class="img-placeholder" id="imgPlaceholder-${id}">
              <div>Нажмите или перетащите изображение</div>
              <button type="button" class="btn-select-file" data-id="${id}">Выбрать файл</button>
            </div>
            <img id="img-${id}" alt="" draggable="false">
            <input type="file" class="file-input" id="file-${id}" accept="image/*" data-id="${id}">
            <div class="image-controls" id="imgControls-${id}">
              <button type="button" class="img-ctrl-btn img-zoom-out" data-id="${id}" title="Уменьшить">−</button>
              <button type="button" class="img-ctrl-btn img-reset" data-id="${id}" title="По размеру">□</button>
              <button type="button" class="img-ctrl-btn img-zoom-in" data-id="${id}" title="Увеличить">+</button>
            </div>
            <div class="img-ctrl-hint">Колёсико — зум, перетаскивание — сдвиг</div>
          </div>
        </div>

        <div class="right-half">
          <div class="taxonomy-block">
            <div class="taxonomy-row">
              <span class="taxonomy-label">КЛАСС:</span>
              <div class="taxonomy-input" id="tax-class-${id}" contenteditable="true" data-placeholder="..."></div>
            </div>
            <div class="taxonomy-row">
              <span class="taxonomy-label">СЕМЕЙСТВО:</span>
              <div class="taxonomy-input" id="tax-family-${id}" contenteditable="true" data-placeholder="..."></div>
            </div>
            <div class="taxonomy-row">
              <span class="taxonomy-label">РОД:</span>
              <div class="taxonomy-input" id="tax-genus-${id}" contenteditable="true" data-placeholder="..."></div>
            </div>
            <div class="taxonomy-row">
              <span class="taxonomy-label">ВИД:</span>
              <div class="taxonomy-input" id="tax-species-${id}" contenteditable="true" data-placeholder="..."></div>
            </div>
          </div>
          <div class="description-block">
            <div class="description-label">ОПИСАНИЕ</div>
            <textarea class="description-textarea" id="description-${id}" placeholder="Научное описание..."></textarea>
          </div>
        </div>
      </div>

      <div class="middle-section">
        <div class="middle-label">ЗДЕСЬ ВКЛЕИВАЕТСЯ<br>СУХОЦВЕТ</div>
      </div>

      <div class="footer-section">
        <div class="footer-group">
          <div class="footer-left">
            <span class="footer-label">Место сбора:</span>
            <input type="text" class="footer-input" id="collection-place-${id}" placeholder="...">
          </div>
          <div class="footer-right">
            <span class="footer-label">Дата:</span>
            <input type="text" class="footer-input" id="collection-date-${id}" placeholder="...">
          </div>
        </div>
      </div>
    </div>
  `;

  // Drag & Drop
  const imgBox = page.querySelector(`#imgBox-${id}`);
  imgBox.addEventListener("dragover", event => {
    event.preventDefault();
    imgBox.style.background = "#f8f8f8";
  });
  imgBox.addEventListener("dragleave", () => {
    imgBox.style.background = "transparent";
  });
  imgBox.addEventListener("drop", event => {
    event.preventDefault();
    imgBox.style.background = "transparent";
    const file = event.dataTransfer.files[0];
    if (file && file.type && file.type.startsWith("image/")) {
      loadImageFile(file, id);
    }
  });

  // Placeholder click
  const placeholder = page.querySelector(`#imgPlaceholder-${id}`);
  placeholder.addEventListener("click", () => {
    document.getElementById(`file-${id}`).click();
  });

  // File input
  const fileInput = page.querySelector(`#file-${id}`);
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) loadImageFile(file, id);
  });

  // Image editor (zoom, pan)
  attachImageEditor(id);

  // Image control buttons
  page.querySelector(`.img-zoom-out[data-id="${id}"]`).addEventListener("click", (e) => {
    e.stopPropagation();
    import('./image-editor.js').then(m => m.zoom(id, 0.85));
  });
  page.querySelector(`.img-zoom-in[data-id="${id}"]`).addEventListener("click", (e) => {
    e.stopPropagation();
    import('./image-editor.js').then(m => m.zoom(id, 1.15));
  });
  page.querySelector(`.img-reset[data-id="${id}"]`).addEventListener("click", (e) => {
    e.stopPropagation();
    import('./image-editor.js').then(m => m.reset(id));
  });

  // Select file button inside placeholder
  page.querySelector(`.btn-select-file[data-id="${id}"]`).addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById(`file-${id}`).click();
  });

  // Enter on russian name -> trigger AI
  const russianInput = page.querySelector(`#title-rus-${id}`);
  russianInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      page.dispatchEvent(new CustomEvent('request-ai', { detail: { id } }));
    }
  });

  // AI button
  const aiButton = page.querySelector(`#ai-button-${id}`);
  aiButton.addEventListener("click", () => {
    page.dispatchEvent(new CustomEvent('request-ai', { detail: { id } }));
  });
  setAIButtonState(aiButton, hasValidApiKey() ? "ready" : "nokey");

  return page;
}

export function loadImageFile(file, id) {
  if (!file.type || !file.type.startsWith("image/")) {
    alert("Можно загрузить только изображение.");
    return;
  }
  const reader = new FileReader();
  reader.onload = event => {
    const img = document.getElementById(`img-${id}`);
    const box = document.getElementById(`imgBox-${id}`);
    img.src = event.target.result;
    img.onload = () => {
      box.classList.add("has-image");
      initTransform(id);
    };
  };
  reader.readAsDataURL(file);
}

export function movePage(id, direction) {
  const container = document.getElementById("pagesContainer");
  const area = document.getElementById(`area-${id}`);
  if (!area) return;
  const page = area.closest(".page");
  if (!page) return;

  if (direction < 0 && page.previousElementSibling) {
    container.insertBefore(page, page.previousElementSibling);
  } else if (direction > 0 && page.nextElementSibling) {
    container.insertBefore(page.nextElementSibling, page);
  }
  updatePageOrderControls();
}

export function updatePageOrderControls() {
  const pages = document.querySelectorAll("#pagesContainer .page");
  pages.forEach((page, index) => {
    const up = page.querySelector(".order-button[data-dir='-1']");
    const down = page.querySelector(".order-button[data-dir='1']");
    if (up) up.disabled = (index === 0);
    if (down) down.disabled = (index === pages.length - 1);
  });
}

export function getAllPagesData() {
  const pages = document.querySelectorAll("#pagesContainer .page");
  const data = [];
  pages.forEach(page => {
    const area = page.querySelector(".content-area");
    const id = area.id.replace("area-", "");
    const borderMode = ["mode-full", "mode-left", "mode-none"]
      .find(m => area.classList.contains(m)) || "mode-full";

    const imgEl = document.getElementById(`img-${id}`);
    const hasImage = document.getElementById(`imgBox-${id}`).classList.contains("has-image");

    data.push({
      borderMode,
      titleRus: document.getElementById(`title-rus-${id}`)?.value || "",
      titleLat: document.getElementById(`title-lat-${id}`)?.value || "",
      taxClass: document.getElementById(`tax-class-${id}`)?.textContent || "",
      taxFamily: document.getElementById(`tax-family-${id}`)?.textContent || "",
      taxGenus: document.getElementById(`tax-genus-${id}`)?.textContent || "",
      taxSpecies: document.getElementById(`tax-species-${id}`)?.textContent || "",
      description: document.getElementById(`description-${id}`)?.value || "",
      collectionPlace: document.getElementById(`collection-place-${id}`)?.value || "",
      collectionDate: document.getElementById(`collection-date-${id}`)?.value || "",
      image: hasImage ? imgEl.src : null,
      transform: getTransformData(id)
    });
  });
  return data;
}

export function clearAllPages() {
  document.getElementById("pagesContainer").innerHTML = "";
  pageCounter = 0;
}

export function restorePages(pagesData) {
  const container = document.getElementById("pagesContainer");
  pagesData.forEach(pd => {
    const page = createPage();
    container.appendChild(page);
    const id = pageCounter;

    document.getElementById(`area-${id}`).classList.remove("mode-full", "mode-left", "mode-none");
    document.getElementById(`area-${id}`).classList.add(pd.borderMode || "mode-full");

    document.getElementById(`title-rus-${id}`).value = pd.titleRus || "";
    document.getElementById(`title-lat-${id}`).value = pd.titleLat || "";
    document.getElementById(`tax-class-${id}`).textContent = pd.taxClass || "";
    document.getElementById(`tax-family-${id}`).textContent = pd.taxFamily || "";
    document.getElementById(`tax-genus-${id}`).textContent = pd.taxGenus || "";
    document.getElementById(`tax-species-${id}`).textContent = pd.taxSpecies || "";
    document.getElementById(`description-${id}`).value = pd.description || "";
    document.getElementById(`collection-place-${id}`).value = pd.collectionPlace || "";
    document.getElementById(`collection-date-${id}`).value = pd.collectionDate || "";

    if (pd.image) {
      const img = document.getElementById(`img-${id}`);
      const box = document.getElementById(`imgBox-${id}`);
      img.src = pd.image;
      img.onload = () => {
        box.classList.add("has-image");
        if (pd.transform) {
          setTransformData(id, pd.transform);
        } else {
          initTransform(id);
        }
      };
    }

    const button = document.getElementById(`ai-button-${id}`);
    setAIButtonState(button, hasValidApiKey() ? "ready" : "nokey");
  });
  updatePageOrderControls();
}
