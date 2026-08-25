// Интерактивное кадрирование изображений

const transforms = {}; // id -> { scale, x, y, naturalWidth, naturalHeight }

let panState = { active: false, startX: 0, startY: 0, initialX: 0, initialY: 0, id: null };
let clickStartPos = null;

export function getTransform(id) {
  if (!transforms[id]) {
    transforms[id] = { scale: 1, x: 0, y: 0, naturalWidth: 0, naturalHeight: 0 };
  }
  return transforms[id];
}

export function applyTransform(id) {
  const img = document.getElementById(`img-${id}`);
  const t = getTransform(id);
  if (img && t) {
    img.style.transform = `translate(-50%, -50%) translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
  }
}

export function initTransform(id) {
  const img = document.getElementById(`img-${id}`);
  const box = document.getElementById(`imgBox-${id}`);
  if (!img || !box || !img.naturalWidth) return;

  const boxRect = box.getBoundingClientRect();
  const t = getTransform(id);
  t.naturalWidth = img.naturalWidth;
  t.naturalHeight = img.naturalHeight;

  const scaleW = boxRect.width / img.naturalWidth;
  const scaleH = boxRect.height / img.naturalHeight;
  t.scale = Math.min(scaleW, scaleH);
  t.x = 0;
  t.y = 0;

  applyTransform(id);
}

export function zoom(id, factor) {
  const t = getTransform(id);
  t.scale = Math.max(0.05, Math.min(10, t.scale * factor));
  applyTransform(id);
}

export function reset(id) {
  initTransform(id);
}

export function getTransformData(id) {
  const t = transforms[id];
  return t ? { scale: t.scale, x: t.x, y: t.y } : null;
}

export function setTransformData(id, data) {
  if (!data) return;
  transforms[id] = {
    scale: data.scale || 1,
    x: data.x || 0,
    y: data.y || 0,
    naturalWidth: 0,
    naturalHeight: 0
  };
  applyTransform(id);
}

function startPan(id, clientX, clientY) {
  const t = getTransform(id);
  panState = {
    active: true,
    startX: clientX,
    startY: clientY,
    initialX: t.x,
    initialY: t.y,
    id: id
  };
  const img = document.getElementById(`img-${id}`);
  if (img) img.style.cursor = "grabbing";
}

function movePan(clientX, clientY) {
  if (!panState.active) return;
  const dx = clientX - panState.startX;
  const dy = clientY - panState.startY;
  const t = getTransform(panState.id);
  t.x = panState.initialX + dx;
  t.y = panState.initialY + dy;
  applyTransform(panState.id);
}

function endPan() {
  if (panState.id) {
    const img = document.getElementById(`img-${panState.id}`);
    if (img) img.style.cursor = "grab";
  }
  panState = { active: false, startX: 0, startY: 0, initialX: 0, initialY: 0, id: null };
  setTimeout(() => { clickStartPos = null; }, 50);
}

// Глобальные обработчики
document.addEventListener("mousemove", e => movePan(e.clientX, e.clientY));
document.addEventListener("mouseup", endPan);
document.addEventListener("touchmove", e => {
  if (panState.active && e.touches.length === 1) {
    e.preventDefault();
    movePan(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: false });
document.addEventListener("touchend", endPan);

export function attachImageEditor(id) {
  const imgBox = document.getElementById(`imgBox-${id}`);
  const img = document.getElementById(`img-${id}`);

  if (!imgBox || !img) return;

  // Wheel zoom
  imgBox.addEventListener("wheel", event => {
    if (!imgBox.classList.contains("has-image")) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 0.88;
    zoom(id, factor);
  }, { passive: false });

  // Mouse pan
  img.addEventListener("mousedown", event => {
    if (!imgBox.classList.contains("has-image")) return;
    event.preventDefault();
    clickStartPos = { x: event.clientX, y: event.clientY };
    startPan(id, event.clientX, event.clientY);
  });

  // Touch pan
  img.addEventListener("touchstart", event => {
    if (!imgBox.classList.contains("has-image")) return;
    if (event.touches.length === 1) {
      clickStartPos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      startPan(id, event.touches[0].clientX, event.touches[0].clientY);
    }
  }, { passive: false });

  // Click to replace (if not panned)
  imgBox.addEventListener("click", (e) => {
    if (!imgBox.classList.contains("has-image")) return;
    if (e.target.closest(".image-controls")) return;
    if (clickStartPos) {
      const cx = e.clientX || e.changedTouches?.[0]?.clientX || clickStartPos.x;
      const cy = e.clientY || e.changedTouches?.[0]?.clientY || clickStartPos.y;
      const dx = cx - clickStartPos.x;
      const dy = cy - clickStartPos.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) return;
    }
    document.getElementById(`file-${id}`).click();
  });
}
