// Конфигурация приложения
export const CONFIG = {
  // URL твоего бэкенд-прокси (Render / Railway / localhost)
  proxyUrl: localStorage.getItem('herbarium_proxy_url') || '',

  // Настройки по умолчанию
  defaultBorderStyle: 'mode-full',

  // AI
  aiProvider: localStorage.getItem('herbarium_ai_provider') || 'deepseek',
  aiApiKey: localStorage.getItem('herbarium_ai_key') || '',

  // Модели
  models: {
    deepseek: 'deepseek-chat',
    yandex: 'yandexgpt-lite'
  }
};

export function updateConfig(updates) {
  Object.assign(CONFIG, updates);
}
