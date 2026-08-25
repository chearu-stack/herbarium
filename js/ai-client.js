// Универсальный клиент для AI через прокси

import { CONFIG } from './config.js';
import { SYSTEM_PROMPT, getModel } from './ai-providers.js';

export async function requestAI(russianName, provider, apiKey) {
  if (!apiKey) {
    throw new Error('Не указан API-ключ. Введи его в настройках AI (боковая панель).');
  }

  const url = `${CONFIG.proxyUrl}/api/ai/${provider}`;
  const model = getModel(provider);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Русское название растения: ${russianName}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1200,
      stream: false
    })
  });

  if (!response.ok) {
    let errorText = "";
    try {
      const errorData = await response.json();
      errorText = errorData?.error?.message || JSON.stringify(errorData);
    } catch {
      errorText = await response.text();
    }
    throw new Error(`AI HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI вернул пустой ответ.");
  }

  let result;
  try {
    result = JSON.parse(content);
  } catch {
    throw new Error("AI вернул невалидный JSON:\n\n" + content);
  }

  const latinName = String(result?.latin_name || "").trim();
  const description = String(result?.description || "").trim();

  if (!latinName || !description) {
    throw new Error("В ответе AI отсутствует латинское название или описание.");
  }

  return {
    latin_name: latinName,
    class: String(result?.class || "").trim(),
    family: String(result?.family || "").trim(),
    genus: String(result?.genus || "").trim(),
    species: String(result?.species || "").trim(),
    description: description
  };
}
