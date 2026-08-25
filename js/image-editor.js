// Интерактивное кадрирование изображений

window.imageTransforms = {};

var panState = { active: false, startX: 0, startY: 0, initialX: 0, initialY: 0, id: null };
var clickStartPos = null;

window.getImageTransform = function(id) {
  if (!imageTransforms[id]) {
    imageTransforms[id] = { scale: 1, x: 0, y: 0, naturalWidth: 0, naturalHeight: 0 };
  }
  return imageTransforms[id];
};

window.applyImageTransform = function(id) {
  var img = document.getElementById("img-" + id);
  var t = getImageTransform(id);
  if (img && t) {
    img.style.transform = "translate(-50%, -50%) translate(" + t.x + "px, " + t.y + "px) scale(" + t.scale + ")";
  }
};

window.initImageTransform = function(id) {
  var img = document.getElementById("img-" + id);
  var box = document.getElementById("imgBox-" + id);
  if (!img || !box || !img.naturalWidth) return;

  var boxRect = box.getBoundingClientRect();
  var t = getImageTransform(id);
  t.naturalWidth = img.naturalWidth;
  t.naturalHeight = img.naturalHeight;

  var scaleW = boxRect.width / img.naturalWidth;
  var scaleH = boxRect.height / img.naturalHeight;
  t.scale = Math.min(scaleW, scaleH);
  t.x = 0;
  t.y = 0;

  applyImageTransform(id);
};

window.zoomImage = function(id, factor) {
  var t = getImageTransform(id);
  t.scale = Math.max(0.05, Math.min(10, t.scale * factor));
  applyImageTransform(id);
};

window.resetImageTransform = function(id) {
  initImageTransform(id);
};

window.getTransformData = function(id) {
  var t = imageTransforms[id];
  return t ? { scale: t.scale, x: t.x, y: t.y } : null;
};

window.setTransformData = function(id, data) {
  if (!data) return;
  imageTransforms[id] = {
    scale: data.scale || 1,
    x: data.x || 0,
    y: data.y || 0,
    naturalWidth: 0,
    naturalHeight: 0
  };
  applyImageTransform(id);
};

function startPan(id, clientX, clientY) {
  var t = getImageTransform(id);
  panState = {
    active: true,
    startX: clientX,
    startY: clientY,
    initialX: t.x,
    initialY: t.y,
    id: id
  };
  var img = document.getElementById("img-" + id);
  if (img) img.style.cursor = "grabbing";
}

function movePan(clientX, clientY) {
  if (!panState.active) return;
  var dx = clientX - panState.startX;
  var dy = clientY - panState.startY;
  var t = getImageTransform(panState.id);
  t.x = panState.initialX + dx;
  t.y = panState.initialY + dy;
  applyImageTransform(panState.id);
}

function endPan() {
  if (panState.id) {
    var img = document.getElementById("img-" + panState.id);
    if (img) img.style.cursor = "grab";
  }
  panState = { active: false, startX: 0, startY: 0, initialX: 0, initialY: 0, id: null };
  setTimeout(function() { clickStartPos = null; }, 50);
}

document.addEventListener("mousemove", function(e) { movePan(e.clientX, e.clientY); });
document.addEventListener("mouseup", endPan);
document.addEventListener("touchmove", function(e) {
  if (panState.active && e.touches.length === 1) {
    e.preventDefault();
    movePan(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: false });
document.addEventListener("touchend", endPan);

window.attachImageEditor = function(id) {
  var imgBox = document.getElementById("imgBox-" + id);
  var img = document.getElementById("img-" + id);
  if (!imgBox || !img) return;

  imgBox.addEventListener("wheel", function(event) {
    if (!imgBox.classList.contains("has-image")) return;
    event.preventDefault();
    var factor = event.deltaY < 0 ? 1.12 : 0.88;
    zoomImage(id, factor);
  }, { passive: false });

  img.addEventListener("mousedown", function(event) {
    if (!imgBox.classList.contains("has-image")) return;
    event.preventDefault();
    clickStartPos = { x: event.clientX, y: event.clientY };
    startPan(id, event.clientX, event.clientY);
  });

  img.addEventListener("touchstart", function(event) {
    if (!imgBox.classList.contains("has-image")) return;
    if (event.touches.length === 1) {
      clickStartPos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      startPan(id, event.touches[0].clientX, event.touches[0].clientY);
    }
  }, { passive: false });

  imgBox.addEventListener("click", function(e) {
    if (!imgBox.classList.contains("has-image")) return;
    if (e.target.closest(".image-controls")) return;
    if (clickStartPos) {
      var cx = e.clientX || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : clickStartPos.x);
      var cy = e.clientY || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : clickStartPos.y);
      if (Math.abs(cx - clickStartPos.x) > 4 || Math.abs(cy - clickStartPos.y) > 4) return;
    }
    document.getElementById("file-" + id).click();
  });
};
