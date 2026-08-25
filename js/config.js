// Конфигурация — прокси захардкожен, пользователь вводит только ключ
export const CONFIG = {
  // Твой прокси на Render — меняй здесь если деплоишь новый
  proxyUrl: "https://herbarium-51iz.onrender.com",

  // AI-провайдер по умолчанию
  defaultProvider: "deepseek",

  // Модели
  models: {
    deepseek: "deepseek-chat",
    yandex: "yandexgpt-lite"
  }
};
