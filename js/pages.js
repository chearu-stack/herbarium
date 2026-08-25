// Создание и управление страницами

window.pageCounter = 0;

window.createPage = function() {
  pageCounter++;
  var id = pageCounter;

  var page = document.createElement("div");
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
            <div class="taxonomy-row"><span class="taxonomy-label">КЛАСС:</span><div class="taxonomy-input" id="tax-class-${id}" contenteditable="true" data-placeholder="..."></div></div>
            <div class="taxonomy-row"><span class="taxonomy-label">СЕМЕЙСТВО:</span><div class="taxonomy-input" id="tax-family-${id}" contenteditable="true" data-placeholder="..."></div></div>
            <div class="taxonomy-row"><span class="taxonomy-label">РОД:</span><div class="taxonomy-input" id="tax-genus-${id}" contenteditable="true" data-placeholder="..."></div></div>
            <div class="taxonomy-row"><span class="taxonomy-label">ВИД:</span><div class="taxonomy-input" id="tax-species-${id}" contenteditable="true" data-placeholder="..."></div></div>
          </div>
          <div class="description-block">
            <div class="description-label">ОПИСАНИЕ</div>
            <textarea class="description-textarea" id="description-${id}" placeholder="Научное описание..."></textarea>
          </div>
        </div>
      </div>

      <div class="middle-section"><div class="middle-label">ЗДЕСЬ ВКЛЕИВАЕТСЯ<br>СУХОЦВЕТ</div></div>

      <div class="footer-section">
        <div class="footer-group">
          <div class="footer-left"><span class="footer-label">Место сбора:</span><input type="text" class="footer-input" id="collection-place-${id}" placeholder="..."></div>
          <div class="footer-right"><span class="footer-label">Дата:</span><input type="text" class="footer-input" id="collection-date-${id}" placeholder="..."></div>
        </div>
      </div>
    </div>
  `;

  var imgBox = page.querySelector("#imgBox-" + id);

  imgBox.addEventListener("dragover", function(event) {
    event.preventDefault();
    imgBox.style.background = "#f8f8f8";
  });
  imgBox.addEventListener("dragleave", function() {
    imgBox.style.background = "transparent";
  });
  imgBox.addEventListener("drop", function(event) {
    event.preventDefault();
    imgBox.style.background = "transparent";
    var file = event.dataTransfer.files[0];
    if (file && file.type && file.type.startsWith("image/")) loadImageFile(file, id);
  });

  var placeholder = page.querySelector("#imgPlaceholder-" + id);
  placeholder.addEventListener("click", function() {
    document.getElementById("file-" + id).click();
  });

  var fileInput = page.querySelector("#file-" + id);
  fileInput.addEventListener("change", function(e) {
    var file = e.target.files[0];
    if (file) loadImageFile(file, id);
  });

  // === attachImageEditor ВЫНЕСЕН отсюда — вызывается ПОСЛЕ appendChild ===

  page.querySelector(".img-zoom-out[data-id='" + id + "']").addEventListener("click", function(e) {
    e.stopPropagation();
    zoomImage(id, 0.85);
  });
  page.querySelector(".img-zoom-in[data-id='" + id + "']").addEventListener("click", function(e) {
    e.stopPropagation();
    zoomImage(id, 1.15);
  });
  page.querySelector(".img-reset[data-id='" + id + "']").addEventListener("click", function(e) {
    e.stopPropagation();
    resetImageTransform(id);
  });

  page.querySelector(".btn-select-file[data-id='" + id + "']").addEventListener("click", function(e) {
    e.stopPropagation();
    document.getElementById("file-" + id).click();
  });

  var russianInput = page.querySelector("#title-rus-" + id);
  russianInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      page.dispatchEvent(new CustomEvent("request-ai", { detail: { id: id }, bubbles: true }));
    }
  });

  var aiButton = page.querySelector("#ai-button-" + id);
  aiButton.addEventListener("click", function() {
    page.dispatchEvent(new CustomEvent("request-ai", { detail: { id: id }, bubbles: true }));
  });
  setAIButtonState(aiButton, hasValidApiKey() ? "ready" : "nokey");

  return page;
};

window.loadImageFile = function(file, id) {
  if (!file.type || !file.type.startsWith("image/")) {
    alert("Можно загрузить только изображение.");
    return;
  }
  var reader = new FileReader();
  reader.onload = function(event) {
    var img = document.getElementById("img-" + id);
    var box = document.getElementById("imgBox-" + id);
    img.src = event.target.result;
    img.onload = function() {
      box.classList.add("has-image");
      delete imageTransforms[id];
      initImageTransform(id);
    };
  };
  reader.readAsDataURL(file);
};

window.movePage = function(id, direction) {
  var container = document.getElementById("pagesContainer");
  var area = document.getElementById("area-" + id);
  if (!area) return;
  var page = area.closest(".page");
  if (!page) return;
  if (direction < 0 && page.previousElementSibling) {
    container.insertBefore(page, page.previousElementSibling);
  } else if (direction > 0 && page.nextElementSibling) {
    container.insertBefore(page.nextElementSibling, page);
  }
  updatePageOrderControls();
};

window.updatePageOrderControls = function() {
  var pages = document.querySelectorAll("#pagesContainer .page");
  pages.forEach(function(page, index) {
    var area = page.querySelector(".content-area");
    var pid = area.id.replace("area-", "");
    var up = page.querySelector("#order-up-" + pid);
    var down = page.querySelector("#order-down-" + pid);
    if (up) up.disabled = (index === 0);
    if (down) down.disabled = (index === pages.length - 1);
  });
};

window.getAllPagesData = function() {
  var pages = document.querySelectorAll("#pagesContainer .page");
  var data = [];
  pages.forEach(function(page) {
    var area = page.querySelector(".content-area");
    var id = area.id.replace("area-", "");
    var borderMode = ["mode-full", "mode-left", "mode-none"].find(function(m) {
      return area.classList.contains(m);
    }) || "mode-full";

    var imgEl = document.getElementById("img-" + id);
    var hasImage = document.getElementById("imgBox-" + id).classList.contains("has-image");
    var t = imageTransforms[id];

    var elTitleRus = document.getElementById("title-rus-" + id);
    var elTitleLat = document.getElementById("title-lat-" + id);
    var elTaxClass = document.getElementById("tax-class-" + id);
    var elTaxFamily = document.getElementById("tax-family-" + id);
    var elTaxGenus = document.getElementById("tax-genus-" + id);
    var elTaxSpecies = document.getElementById("tax-species-" + id);
    var elDesc = document.getElementById("description-" + id);
    var elPlace = document.getElementById("collection-place-" + id);
    var elDate = document.getElementById("collection-date-" + id);

    data.push({
      borderMode: borderMode,
      titleRus: elTitleRus ? elTitleRus.value : "",
      titleLat: elTitleLat ? elTitleLat.value : "",
      taxClass: elTaxClass ? elTaxClass.textContent : "",
      taxFamily: elTaxFamily ? elTaxFamily.textContent : "",
      taxGenus: elTaxGenus ? elTaxGenus.textContent : "",
      taxSpecies: elTaxSpecies ? elTaxSpecies.textContent : "",
      description: elDesc ? elDesc.value : "",
      collectionPlace: elPlace ? elPlace.value : "",
      collectionDate: elDate ? elDate.value : "",
      image: hasImage ? imgEl.src : null,
      transform: t ? { scale: t.scale, x: t.x, y: t.y } : null
    });
  });
  return data;
};

window.clearAllPages = function() {
  document.getElementById("pagesContainer").innerHTML = "";
  pageCounter = 0;
};

window.restorePages = function(pagesData) {
  var container = document.getElementById("pagesContainer");
  pagesData.forEach(function(pd) {
    var page = createPage();
    container.appendChild(page);
    // === ИСПРАВЛЕНО: attachImageEditor ПОСЛЕ appendChild ===
    attachImageEditor(pageCounter);

    var id = pageCounter;

    document.getElementById("area-" + id).classList.remove("mode-full", "mode-left", "mode-none");
    document.getElementById("area-" + id).classList.add(pd.borderMode || "mode-full");

    document.getElementById("title-rus-" + id).value = pd.titleRus || "";
    document.getElementById("title-lat-" + id).value = pd.titleLat || "";
    document.getElementById("tax-class-" + id).textContent = pd.taxClass || "";
    document.getElementById("tax-family-" + id).textContent = pd.taxFamily || "";
    document.getElementById("tax-genus-" + id).textContent = pd.taxGenus || "";
    document.getElementById("tax-species-" + id).textContent = pd.taxSpecies || "";
    document.getElementById("description-" + id).value = pd.description || "";
    document.getElementById("collection-place-" + id).value = pd.collectionPlace || "";
    document.getElementById("collection-date-" + id).value = pd.collectionDate || "";

    if (pd.image) {
      var img = document.getElementById("img-" + id);
      var box = document.getElementById("imgBox-" + id);
      img.src = pd.image;
      img.onload = function() {
        box.classList.add("has-image");
        if (pd.transform) {
          imageTransforms[id] = {
            scale: pd.transform.scale || 1,
            x: pd.transform.x || 0,
            y: pd.transform.y || 0,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
          };
          applyImageTransform(id);
        } else {
          initImageTransform(id);
        }
      };
    }

    var button = document.getElementById("ai-button-" + id);
    setAIButtonState(button, hasValidApiKey() ? "ready" : "nokey");
  });
  updatePageOrderControls();
};
