// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-gray; icon-glyph: magic;
// BusNearby Widget for Scriptable

const fm = FileManager.iCloud();

const dataDir = fm.joinPath(fm.documentsDirectory(), "data");
const dataPath = fm.joinPath(dataDir, "busnearby.json");

// רקע (כמו אצלך)
const imageName = "תמונת רקע ווידג׳ט תחבורה ציבורית.PNG";
let imagePath = fm.joinPath(dataDir, imageName);

/* ===================== OVERPASS CONFIG ===================== */
const SEARCH_RADIUS = 1500; // מטר

/* ===================== FILE HELPERS ===================== */

function stripBidi(s) {
  return (s || "").replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
}

function findFileInDirByDisplayName(dir, desiredName) {
  try {
    const list = fm.listContents(dir);
    const desiredClean = stripBidi(desiredName);
    for (const f of list) {
      if (stripBidi(f) === desiredClean) {
        return fm.joinPath(dir, f);
      }
    }
  } catch (e) {}
  return null;
}

async function readJsonFile(path, fallback) {
  try {
    if (!fm.fileExists(path)) return fallback;
    await fm.downloadFileFromiCloud(path);
    const jsonString = fm.readString(path);
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("שגיאה בקריאת JSON (" + path + "): " + e);
    return fallback;
  }
}

async function loadLocalImageByBaseName(dir, baseName) {
  try {
    const list = fm.listContents(dir);
    const baseClean = stripBidi(baseName);

    for (const f of list) {
      const clean = stripBidi(f);
      const noExt = clean.replace(/\.[^.]+$/, "");
      if (noExt === baseClean) {
        const p = fm.joinPath(dir, f);
        await fm.downloadFileFromiCloud(p);
        return Image.fromFile(p);
      }
    }

    const exts = ["png", "jpg", "jpeg", "webp"];
    for (const ext of exts) {
      const p = fm.joinPath(dir, `${baseName}.${ext}`);
      if (fm.fileExists(p)) {
        await fm.downloadFileFromiCloud(p);
        return Image.fromFile(p);
      }
    }

    const p2 = fm.joinPath(dir, baseName);
    if (fm.fileExists(p2)) {
      await fm.downloadFileFromiCloud(p2);
      return Image.fromFile(p2);
    }
  } catch (e) {
    console.error("שגיאה בטעינת תמונה: " + e);
  }
  return null;
}

/* ===================== LOCATION HELPERS ===================== */

async function getCurrentLocationSafe() {
  try {
    Location.setAccuracyToHundredMeters();
    return await Location.current();
  } catch (e) {
    console.error("שגיאה בקבלת מיקום: " + e);
    return null;
  }
}

function approxDistanceMeters(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const x = (lon2 - lon1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  const y = (lat2 - lat1) * rad;
  return Math.sqrt(x * x + y * y) * 6371000;
}

/* ===================== DATA NORMALIZATION ===================== */

function normalizeStopItem(s) {
  if (!s) return null;

  const stopId = String(s.stopId ?? s.id ?? "");
  if (!stopId) return null;

  const name = String(s.stopName ?? s.name ?? "");
  const code = String(s.stopCode ?? s.code ?? "");

  const osmId = String(s.osmId ?? s.osmID ?? s.osm_id ?? "");
  const osmNodeId = String(s.osmNodeId ?? s.osm_node_id ?? "");

  return { stopId, name, code, osmId, osmNodeId };
}

function pickStopNameFromTags(tags) {
  return tags?.name || tags?.["name:he"] || tags?.["name:en"] || "תחנה ללא שם";
}

/* ===================== NEARBY STOPS VIA OVERPASS ===================== */

async function getNearbyStopsFromOverpass(maxResults, excludeIdsSet) {
  const loc = await getCurrentLocationSafe();
  if (!loc) return [];

  const lat0 = Number(loc.latitude);
  const lon0 = Number(loc.longitude);

  const query = `
[out:json][timeout:25];
(
  node[highway=bus_stop](around:${SEARCH_RADIUS},${lat0},${lon0});
  node[public_transport=platform](around:${SEARCH_RADIUS},${lat0},${lon0});
);
out body;`;

  const url =
    "https://overpass-api.de/api/interpreter?data=" +
    encodeURIComponent(query);

  let data = null;
  try {
    data = await new Request(url).loadJSON();
  } catch (e) {
    try {
      const txt = await new Request(url).loadString();
      console.error(
        "Overpass החזיר לא-JSON. התחלה: " +
          (txt || "").replace(/\s+/g, " ").slice(0, 220)
      );
    } catch {}
    console.error("שגיאה ב-Overpass: " + e);
    return [];
  }

  if (!data?.elements || !Array.isArray(data.elements)) return [];

  const results = [];

  for (const el of data.elements) {
    try {
      const tags = el.tags || {};
      const name = pickStopNameFromTags(tags);

      const code = tags?.ref ? String(tags.ref) : "";
      const gtfsId = tags?.["gtfs:stop_id:IL-MO"] ? String(tags["gtfs:stop_id:IL-MO"]) : "";
      const osmNodeId = el?.id != null ? String(el.id) : "";

      const stopId = code || gtfsId || osmNodeId;
      if (!stopId) continue;

      if (excludeIdsSet && excludeIdsSet.has(stopId)) continue;

      const lat = Number(el.lat);
      const lon = Number(el.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const d = approxDistanceMeters(lat0, lon0, lat, lon);

      results.push({
        stopId,
        name,
        code,
        osmId: gtfsId,
        osmNodeId,
        distance: Math.round(d),
      });
    } catch {}
  }

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, maxResults);
}

/* ===================== URL BUILDERS ===================== */

function busNearbyStopUrl(stopId) {
  return `https://busnearby.co.il/stop/${stopId}`;
}

function busNearbyRouteUrl(routeId) {
  return `https://busnearby.co.il/shareRoute/${routeId}`;
}

// ✅ הרצה ישירה בלי Safari
function runScriptUrl(scriptName, paramsObj) {
  const base = `scriptable:///run/${encodeURIComponent(scriptName)}`;
  const qs = Object.entries(paramsObj || {})
    .filter(([_, v]) => v !== undefined && v !== null && String(v).length > 0)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `${base}?${qs}` : base;
}

/* ===================== WIDGET UI HELPERS ===================== */

// ✅ זה האייקון המקורי (SFSymbol בתוך ריבוע צבעוני)
function createIconWithSymbol(parent, symbolName, bgColor) {
  const iconStack = parent.addStack();
  iconStack.size = new Size(34, 34);
  iconStack.backgroundColor = new Color(bgColor);
  iconStack.cornerRadius = 9;
  iconStack.centerAlignContent();

  const symbol = SFSymbol.named(symbolName);
  const iconImage = iconStack.addImage(symbol.image);
  iconImage.imageSize = new Size(24, 24);
  iconImage.tintColor = Color.white();

  return iconStack;
}

// ✅ שני אייקונים בצד השני של השורה (ימין): אוטובוס קרוב + 🚏
function addActionIconsRight(parentRow, busIconImage, busUrl, stationUrl) {
  const icons = parentRow.addStack();
  icons.layoutHorizontally();
  icons.centerAlignContent();
  icons.spacing = 8;

  // 1) "אוטובוס קרוב" - תמונה מה-data (או fallback)
  const busImg = icons.addImage(busIconImage ?? SFSymbol.named("bus.fill").image);
  busImg.imageSize = new Size(24, 24);
  busImg.url = busUrl;

  // 2) "תחנה" - אימוג׳י
  const stationStack = icons.addStack();
  stationStack.size = new Size(24, 24);
  stationStack.centerAlignContent();
  stationStack.url = stationUrl || null;

  const t = stationStack.addText("🚏");
  t.font = Font.systemFont(18);

  return icons;
}

/* ===================== MAIN ===================== */

// --- קריאת JSON ---
let data = await readJsonFile(dataPath, { stops: { favorites: [] }, lines: { favorites: [] } });
if (!data || typeof data !== "object") data = { stops: { favorites: [] }, lines: { favorites: [] } };
if (!data.stops) data.stops = { favorites: [] };
if (!data.lines) data.lines = { favorites: [] };
if (!Array.isArray(data.stops.favorites)) data.stops.favorites = [];
if (!Array.isArray(data.lines.favorites)) data.lines.favorites = [];

// תמונת "אוטובוס קרוב"
const busNearbyImg = await loadLocalImageByBaseName(dataDir, "אוטובוס קרוב");

// יצירת הווידג'ט
const widget = new ListWidget();

// --- תמונת רקע ---
try {
  if (!fm.fileExists(imagePath)) {
    const found = findFileInDirByDisplayName(dataDir, imageName);
    if (found) imagePath = found;
  }
  if (fm.fileExists(imagePath)) {
    await fm.downloadFileFromiCloud(imagePath);
    const bg = Image.fromFile(imagePath);
    widget.backgroundImage = bg;
  } else {
    widget.backgroundColor = new Color("#ECF0F1");
  }
} catch (e) {
  widget.backgroundColor = new Color("#ECF0F1");
}

widget.setPadding(18, 18, 18, 18);

// קונטיינר מרכזי
const containerStack = widget.addStack();
containerStack.layoutVertically();
containerStack.backgroundColor = new Color("#FFFFFF", 0.85);
containerStack.cornerRadius = 16;
containerStack.setPadding(14, 14, 14, 14);

// כותרת
const titleStack = containerStack.addStack();
titleStack.layoutHorizontally();
titleStack.centerAlignContent();
titleStack.addSpacer();

const title = titleStack.addText("תחבורה ציבורית");
title.font = Font.boldSystemFont(20);
title.textColor = new Color("#2C3E50");

titleStack.addSpacer();
containerStack.addSpacer(16);

/* ===================== STOPS SECTION ===================== */

const MAX_STOPS_TO_SHOW = 4;

const favoriteStopsRaw = Array.isArray(data?.stops?.favorites) ? data.stops.favorites : [];
const stopsToShow = [];
const usedStopIds = new Set();

// 1) מועדפים
for (const fav of favoriteStopsRaw) {
  const item = normalizeStopItem(fav);
  if (!item) continue;
  if (usedStopIds.has(item.stopId)) continue;
  usedStopIds.add(item.stopId);
  stopsToShow.push(item);
  if (stopsToShow.length >= MAX_STOPS_TO_SHOW) break;
}

// 2) השלמה מ-Overpass
if (stopsToShow.length < MAX_STOPS_TO_SHOW) {
  const nearby = await getNearbyStopsFromOverpass(
    MAX_STOPS_TO_SHOW - stopsToShow.length,
    usedStopIds
  );
  for (const item of nearby) {
    if (!item) continue;
    if (usedStopIds.has(item.stopId)) continue;
    usedStopIds.add(item.stopId);
    stopsToShow.push(item);
    if (stopsToShow.length >= MAX_STOPS_TO_SHOW) break;
  }
}

if (stopsToShow.length > 0) {
  const stopsHeaderStack = containerStack.addStack();
  stopsHeaderStack.layoutHorizontally();
  stopsHeaderStack.centerAlignContent();
  stopsHeaderStack.addSpacer();

  const stopsHeader = stopsHeaderStack.addText("תחנות");
  stopsHeader.font = Font.semiboldSystemFont(14);
  stopsHeader.textColor = new Color("#7F8C8D");

  stopsHeaderStack.addSpacer();
  containerStack.addSpacer(10);

  const stopColors = ["#E74C3C", "#27AE60", "#F39C12", "#3498DB"];

  for (let i = 0; i < Math.min(MAX_STOPS_TO_SHOW, stopsToShow.length); i++) {
    const stop = stopsToShow[i];

    const rowStack = containerStack.addStack();
    rowStack.layoutHorizontally();
    rowStack.centerAlignContent();
    rowStack.spacing = 12;
    rowStack.url = null; // כדי שהאייקונים יהיו לחיצים בנפרד

    // ✅ (1) האייקון המקורי בצד שמאל (ריבוע צבעוני עם bus.fill)
    createIconWithSymbol(rowStack, "bus.fill", stopColors[i] || "#95A5A6");

    // ✅ (2) טקסט באמצע - לחיץ ל-BusNearby כמו קודם
    const busUrl = busNearbyStopUrl(stop.stopId);
    const textStack = rowStack.addStack();
    textStack.layoutVertically();
    textStack.spacing = 2;
    textStack.url = busUrl;

    const nameText = textStack.addText(stop.name || "");
    nameText.font = Font.semiboldSystemFont(16);
    nameText.textColor = new Color("#2C3E50");
    nameText.lineLimit = 1;

    const stopCodeToSend = (stop.code && String(stop.code).trim()) ? String(stop.code).trim() : "";
    const codeLine =
      `קוד: ${stopCodeToSend || "-"}` +
      ((stop.osmId && String(stop.osmId).trim()) ? `  •  GTFS: ${String(stop.osmId).trim()}` : "");

    const codeText = textStack.addText(codeLine);
    codeText.font = Font.regularSystemFont(13);
    codeText.textColor = new Color("#7F8C8D");
    codeText.lineLimit = 1;

    // ✅ דוחפים את האייקונים החדשים לצד השני (ימין)
    rowStack.addSpacer();

    const stationUrl = stopCodeToSend
      ? runScriptUrl("תחנות קרובות זמן אמת", { stopCodes: stopCodeToSend })
      : null;

    addActionIconsRight(rowStack, busNearbyImg, busUrl, stationUrl);

    containerStack.addSpacer(10);
  }

  containerStack.addSpacer(6);
}

/* ===================== SEPARATOR ===================== */

const separator = containerStack.addStack();
separator.size = new Size(0, 1);
separator.backgroundColor = new Color("#DCDCDC");
containerStack.addSpacer(10);

/* ===================== LINES SECTION ===================== */

if (data.lines.favorites.length > 0) {
  const linesHeaderStack = containerStack.addStack();
  linesHeaderStack.layoutHorizontally();
  linesHeaderStack.centerAlignContent();
  linesHeaderStack.addSpacer();

  const linesHeader = linesHeaderStack.addText("קווים");
  linesHeader.font = Font.semiboldSystemFont(14);
  linesHeader.textColor = new Color("#7F8C8D");

  linesHeaderStack.addSpacer();
  containerStack.addSpacer(10);

  for (let i = 0; i < Math.min(2, data.lines.favorites.length); i++) {
    const line = data.lines.favorites[i];

    const rowStack = containerStack.addStack();
    rowStack.layoutHorizontally();
    rowStack.centerAlignContent();
    rowStack.spacing = 12;
    rowStack.url = null;

    // ✅ (1) האייקון המקורי של קו בצד שמאל (כמו היה: bus)
    createIconWithSymbol(rowStack, "bus", i === 0 ? "#3498DB" : "#9B59B6");

    // ✅ (2) טקסט לחיץ ל-busnearby כמו קודם
    const busUrl = busNearbyRouteUrl(line.routeId);

    const textStack = rowStack.addStack();
    textStack.layoutVertically();
    textStack.spacing = 2;
    textStack.url = busUrl;

    const lineText = textStack.addText(`קו ${line.lineNumber}`);
    lineText.font = Font.semiboldSystemFont(16);
    lineText.textColor = new Color("#2C3E50");

    const destText = textStack.addText(line.destination);
    destText.font = Font.regularSystemFont(13);
    destText.textColor = new Color("#7F8C8D");
    destText.lineLimit = 1;

    // ✅ (3) אייקונים חדשים בצד ימין
    rowStack.addSpacer();

    const routeIdToSend = String(line.routeId || "").trim();
    const stationUrl = routeIdToSend
      ? runScriptUrl("תחנות קרובות זמן אמת", {
          stopCodes: routeIdToSend, // זמני עד שתוסיף תמיכה
          routeId: routeIdToSend,
        })
      : null;

    addActionIconsRight(rowStack, busNearbyImg, busUrl, stationUrl);

    containerStack.addSpacer(10);
  }
}

/* ===================== FOOTER ===================== */

containerStack.addSpacer();
const footerStack = containerStack.addStack();
footerStack.layoutHorizontally();
footerStack.addSpacer();

const updated = footerStack.addText("עודכן לאחרונה");
updated.font = Font.regularSystemFont(10);
updated.textColor = new Color("#95A5A6");
footerStack.addSpacer();

/* ===================== PRESENT ===================== */

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();