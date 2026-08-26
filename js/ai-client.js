window.requestAI = async function(russianName, provider, apiKey) {
  if (!apiKey) throw new Error("Не указан API-ключ.");
  var url = CONFIG.proxyUrl + "/api/ai/" + provider;
  var model = getModel(provider);
  var response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: "Русское название растения: " + russianName }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, max_tokens: 1200, stream: false
    })
  });
  if (!response.ok) {
    var errorText = "";
    try { var d = await response.json(); errorText = d.error?.message || JSON.stringify(d); }
    catch(e) { errorText = await response.text(); }
    throw new Error("AI HTTP " + response.status + ": " + errorText);
  }
  var data = await response.json();
  var content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI вернул пустой ответ.");
  var result;
  try { result = JSON.parse(content); }
  catch(e) { throw new Error("AI вернул невалидный JSON:\n" + content); }
  var latinName = String(result.latin_name || "").trim();
  var description = String(result.description || "").trim();
  if (!latinName || !description) throw new Error("В ответе AI отсутствует латинское название или описание.");
  return {
    latin_name: latinName,
    class: String(result.class || "").trim(),
    family: String(result.family || "").trim(),
    genus: String(result.genus || "").trim(),
    species: String(result.species || "").trim(),
    description: description
  };
};

window.requestDividerAI = async function(classRu, classLat, provider, apiKey) {
  if (!apiKey) throw new Error("Не указан API-ключ.");
  var url = CONFIG.proxyUrl + "/api/ai/" + provider;
  var model = getModel(provider);
  var response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: DIVIDER_PROMPT },
        { role: "user", content: "Класс: " + classRu + (classLat ? " (" + classLat + ")" : "") }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, max_tokens: 800, stream: false
    })
  });
  if (!response.ok) {
    var errorText = "";
    try { var d = await response.json(); errorText = d.error?.message || JSON.stringify(d); }
    catch(e) { errorText = await response.text(); }
    throw new Error("AI HTTP " + response.status + ": " + errorText);
  }
  var data = await response.json();
  var content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI вернул пустой ответ.");
  var result;
  try { result = JSON.parse(content); }
  catch(e) { throw new Error("AI вернул невалидный JSON:\n" + content); }
  return {
    title_ru: String(result.title_ru || classRu).trim(),
    title_latin: String(result.title_latin || classLat).trim(),
    history: String(result.history || "").trim()
  };
};

window.requestConclusionAI = async function(context, provider, apiKey) {
  if (!apiKey) throw new Error("Не указан API-ключ.");
  var url = CONFIG.proxyUrl + "/api/ai/" + provider;
  var model = getModel(provider);
  var response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: CONCLUSION_PROMPT },
        { role: "user", content: "Состав гербария:\n" + JSON.stringify(context, null, 2) }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4, max_tokens: 1200, stream: false
    })
  });
  if (!response.ok) {
    var errorText = "";
    try { var d = await response.json(); errorText = d.error?.message || JSON.stringify(d); }
    catch(e) { errorText = await response.text(); }
    throw new Error("AI HTTP " + response.status + ": " + errorText);
  }
  var data = await response.json();
  var content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI вернул пустой ответ.");
  var result;
  try { result = JSON.parse(content); }
  catch(e) { throw new Error("AI вернул невалидный JSON:\n" + content); }
  return {
    text: String(result.text || "").trim()
  };
};
