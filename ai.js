/* =========================================================
   КОНФИГУРАЦИЯ НЕЙРОСЕТЕЙ
   ========================================================= */

let pendingAIPageId = null;
let pendingAIResult = null;

const AI_PROVIDERS = {
  deepseek: {
    name: "DeepSeek",
    api: "https://api.deepseek.com/chat/completions",
    model: "deepseek-chat", // Стабильная модель с поддержкой JSON
    prompt: `
Ты — ботанический справочник и научный редактор для создания гербарных карточек.

Пользователь сообщает русское название растения.

Твоя задача:
1. Определить наиболее вероятное растение, соответствующее русскому названию.
2. Дать корректное современное латинское название (полное биноминальное).
3. Указать таксономию в формате «Русское название (латинское)» для каждого уровня:
   - класс (class)
   - семейство (family)
   - род (genus)
   - вид (species)
4. Составить краткое научное описание растения, пригодное для печатной гербарной карточки.

Описание должно быть информативным, но компактным.
Можно включать:
- характерные морфологические признаки;
- жизненную форму;
- особенности стебля, листьев, цветков, плодов;
- характерные отличительные признаки.

НЕ включай:
- место сбора, дату сбора, имя собирателя;
- сведения о конкретном экземпляре;
- рекламные или разговорные фразы.

Не используй Markdown. Не добавляй приветствие. Не добавляй пояснение о своей работе.

Ответ ОБЯЗАТЕЛЬНО верни в JSON следующего вида:
{
  "latin_name": "Полное латинское название",
  "class": "Русское название класса (латинское название класса)",
  "family": "Русское название семейства (латинское название семейства)",
  "genus": "Русское название рода (латинское название рода)",
  "species": "Русское название вида (латинское название вида)",
  "description": "Научное описание растения"
}

Если русское название неоднозначно, выбери наиболее вероятное соответствие.
Если есть существенная неоднозначность, кратко укажи её в самом описании.
`
  },
  yandex: {
    name: "YandexGPT",
    api: "https://llm.api.cloud.yandex.net/foundationModels/v1/chatCompletions",
    model: "yandexgpt-lite",
    prompt: `
Ты — ботанический справочник и научный редактор для создания гербарных карточек.

Пользователь сообщает русское название растения.

Твоя задача:
1. Определить наиболее вероятное растение, соответствующее русскому названию.
2. Дать корректное современное латинское название (полное биноминальное).
3. Указать таксономию в формате «Русское название (латинское)» для каждого уровня:
   - класс (class)
   - семейство (family)
   - род (genus)
   - вид (species)
4. Составить краткое научное описание растения, пригодное для печатной гербарной карточки.

Описание должно быть информативным, но компактным.
Можно включать:
- характерные морфологические признаки;
- жизненную форму;
- особенности стебля, листьев, цветков, плодов;
- характерные отличительные признаки.

НЕ включай:
- место сбора, дату сбора, имя собирателя;
- сведения о конкретном экземпляре;
- рекламные или разговорные фразы.

Не используй Markdown. Не добавляй приветствие. Не добавляй пояснение о своей работе.

Ответ ОБЯЗАТЕЛЬНО верни в JSON следующего вида:
{
  "latin_name": "Полное латинское название",
  "class": "Русское название класса (латинское название класса)",
  "family": "Русское название семейства (латинское название семейства)",
  "genus": "Русское название рода (латинское название рода)",
  "species": "Русское название вида (латинское название вида)",
  "description": "Научное описание растения"
}

Если русское название неоднозначно, выбери наиболее вероятное соответствие.
Если есть существенная неоднозначность, кратко укажи её в самом описании.
`
  }
};

/* =========================================================
   УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ И КОНФИГУРАЦИЕЙ
   ========================================================= */

function loadProviderConfig() {
  const providerSelect = document.getElementById('aiProviderSelect');
  const yandexGroup = document.getElementById('yandexFolderGroup');
  
  if (providerSelect && yandexGroup) {
    yandexGroup.style.display = (providerSelect.value === 'yandex') ? 'block' : 'none';
  }
}

// Делаем функцию глобально доступной для инлайнового onchange в HTML
window.loadProviderConfig = loadProviderConfig;

function getProviderConfig() {
  const providerKey = document.getElementById('aiProviderSelect').value;
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  const folderInput = document.getElementById('folderIdInput');
  const folderId = folderInput ? folderInput.value.trim() : '';

  if (!apiKey) {
    alert("Пожалуйста, введите API-ключ.");
    return null;
  }

  if (providerKey === 'yandex' && !folderId) {
    alert("Для YandexGPT обязательно укажите Folder ID (Идентификатор каталога).");
    return null;
  }

  const config = AI_PROVIDERS[providerKey];
  if (!config) {
    alert("Неизвестный провайдер.");
    return null;
  }

  return {
    ...config,
    apiKey: apiKey,
    folderId: folderId
  };
}

function hasValidApiKey() {
  const apiKey = document.getElementById('apiKeyInput')?.value.trim();
  const providerKey = document.getElementById('aiProviderSelect')?.value;
  const folderId = document.getElementById('folderIdInput')?.value.trim();

  if (!apiKey) return false;
  if (providerKey === 'yandex' && !folderId) return false;
  return true;
}

function setAIButtonState(button, state) {
  if (!button) return;
  button.classList.remove('state-nokey', 'state-ready', 'state-loading');
  button.classList.add(`state-${state}`);
}

/* =========================================================
   ЗАПРОС К НЕЙРОСЕТИ
   ========================================================= */

async function requestAIForPage(id) {
  const config = getProviderConfig();
  if (!config) return;

  const russianInput = document.getElementById(`title-rus-${id}`);
  const russianName = russianInput ? russianInput.value.trim() : "";

  if (!russianName) {
    alert("Сначала введи русское название растения.");
    if (russianInput) russianInput.focus();
    return;
  }

  pendingAIPageId = id;
  pendingAIResult = null;

  const panel = document.getElementById("aiPanel");
  panel.classList.add("visible");

  document.getElementById("aiLatinResult").textContent = "";
  document.getElementById("aiTaxonomyResult").textContent = "";
  document.getElementById("aiDescriptionResult").textContent = "";
  document.getElementById("aiStatus").textContent = `${config.name} определяет растение: «${russianName}»...`;
  document.getElementById("applyAiButton").disabled = true;

  const pageButton = document.getElementById(`ai-button-${id}`);
  if (pageButton) {
    setAIButtonState(pageButton, "loading");
    pageButton.disabled = true;
  }

  try {
    let response;
    let requestData;
    let headers = { "Content-Type": "application/json" };

    if (config.name === "DeepSeek") {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
      requestData = {
        model: config.model,
        messages: [
          { role: "system", content: config.prompt },
          { role: "user", content: `Русское название растения: ${russianName}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1200,
        stream: false
      };
      
      response = await fetch(config.api, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestData)
      });

    } else if (config.name === "YandexGPT") {
      headers["Authorization"] = `Api-Key ${config.apiKey}`;
      headers["x-folder-id"] = config.folderId;

      requestData = {
        modelUri: `gpt://${config.folderId}/yandexgpt-lite/latest`,
        completionOptions: {
          stream: false,
          temperature: 0.2,
          maxTokens: "1200"
        },
        messages: [
          { role: "system", text: config.prompt },
          { role: "user", text: `Русское название растения: ${russianName}` }
        ]
      };

      response = await fetch(config.api, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestData)
      });
    }

    if (!response.ok) {
      let errorText = "";
      try {
        const errorData = await response.json();
        errorText = errorData?.error?.message || errorData?.message || JSON.stringify(errorData);
      } catch {
        errorText = await response.text();
      }
      throw new Error(`${config.name} HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    let content = "";

    if (config.name === "DeepSeek") {
      content = data?.choices?.[0]?.message?.content;
    } else if (config.name === "YandexGPT") {
      content = data?.result?.alternatives?.[0]?.message?.text || data?.result?.message?.text;
    }

    if (!content) {
      throw new Error(`${config.name} вернул пустой ответ.`);
    }

    // Чистка от markdown-оберток ```json ... ```
    let cleanJson = content.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    let result;
    try {
      result = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON parse error:", e, "Content:", content);
      throw new Error(`${config.name} вернул невалидный JSON:\n\n${content.substring(0, 200)}...`);
    }

    const latinName = String(result?.latin_name || "").trim();
    const taxClass  = String(result?.class  || "").trim();
    const taxFamily = String(result?.family || "").trim();
    const taxGenus  = String(result?.genus  || "").trim();
    const taxSpecies= String(result?.species|| "").trim();
    const description = String(result?.description || "").trim();

    if (!latinName || !description) {
      throw new Error(`В ответе ${config.name} отсутствует латинское название или описание.`);
    }

    pendingAIResult = {
      latin_name: latinName,
      class: taxClass,
      family: taxFamily,
      genus: taxGenus,
      species: taxSpecies,
      description: description
    };

    document.getElementById("aiLatinResult").textContent = latinName;
    document.getElementById("aiTaxonomyResult").textContent =
      `Класс: ${taxClass}\nСемейство: ${taxFamily}\nРод: ${taxGenus}\nВид: ${taxSpecies}`;
    document.getElementById("aiDescriptionResult").textContent = description;
    document.getElementById("aiStatus").textContent = "Проверь результат. Если всё устраивает — нажми «ПРИМЕНИТЬ».";
    document.getElementById("applyAiButton").disabled = false;

  } catch (error) {
    console.error(`${config.name} error:`, error);
    document.getElementById("aiStatus").textContent = `Ошибка при обращении к ${config.name}.`;
    alert(`Не удалось получить данные от ${config.name}.\n\n${error.message}`);
  } finally {
    const pageButton = document.getElementById(`ai-button-${id}`);
    if (pageButton) {
      setAIButtonState(pageButton, hasValidApiKey() ? "ready" : "nokey");
      pageButton.disabled = false;
    }
  }
}

/* =========================================================
   ПРИМЕНЕНИЕ РЕЗУЛЬТАТА И ЗАКРЫТИЕ
   ========================================================= */

function applyAIResult() {
  if (!pendingAIResult || !pendingAIPageId) return;
  const id = pendingAIPageId;

  document.getElementById(`title-lat-${id}`).value = pendingAIResult.latin_name;
  document.getElementById(`tax-class-${id}`).textContent  = pendingAIResult.class;
  document.getElementById(`tax-family-${id}`).textContent = pendingAIResult.family;
  document.getElementById(`tax-genus-${id}`).textContent  = pendingAIResult.genus;
  document.getElementById(`tax-species-${id}`).textContent= pendingAIResult.species;

  const descriptionField = document.getElementById(`description-${id}`);
  descriptionField.value = pendingAIResult.description;

  closeAIPanel();
  descriptionField.focus();
  descriptionField.setSelectionRange(descriptionField.value.length, descriptionField.value.length);
}

function closeAIPanel() {
  document.getElementById("aiPanel").classList.remove("visible");
  pendingAIResult = null;
  pendingAIPageId = null;
}

// Инициализируем UI при загрузке документа
document.addEventListener('DOMContentLoaded', () => {
  loadProviderConfig();
  
  const select = document.getElementById('aiProviderSelect');
  if (select) {
    select.addEventListener('change', loadProviderConfig);
  }
});