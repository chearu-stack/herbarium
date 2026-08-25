// AI-клиент — запросы через прокси

window.requestAI = async function(russianName, provider, apiKey) {
  if (!apiKey) {
    throw new Error("Не указан API-ключ. Введи его в настройках AI (боковая панель).");
  }

  var url = CONFIG.proxyUrl + "/api/ai/" + provider;
  var model = getModel(provider);

  var response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: "Русское название растения: " + russianName }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1200,
      stream: false
    })
  });

  if (!response.ok) {
    var errorText = "";
    try {
      var errorData = await response.json();
      errorText = errorData.error?.message || JSON.stringify(errorData);
    } catch(e) {
      errorText = await response.text();
    }
    throw new Error("AI HTTP " + response.status + ": " + errorText);
  }

  var data = await response.json();
  var content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error("AI вернул пустой ответ.");

  var result;
  try {
    result = JSON.parse(content);
  } catch(e) {
        throw new Error("AI вернул невалидный JSON:\n\n" + content);
  }

  var latinName = String(result.latin_name || "").trim();
  var description = String(result.description || "").trim();

  if (!latinName || !description) {
    throw new Error("В ответе AI отсутствует латинское название или описание.");
  }

  return {
    latin_name: latinName,
    class: String(result.class || "").trim(),
    family: String(result.family || "").trim(),
    genus: String(result.genus || "").trim(),
    species: String(result.species || "").trim(),
    description: description
  };
};
