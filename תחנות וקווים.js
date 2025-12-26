// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-gray; icon-glyph: magic;
// BusNearby Widget for Scriptable

const fm = FileManager.iCloud();

const dataDir = fm.joinPath(fm.documentsDirectory(), "data");
const dataPath = fm.joinPath(dataDir, "busnearby.json");
const stopsPath = fm.joinPath(dataDir, "stops.json");

// שם הקובץ כפי שמופיע אצלך (בלי תווי RTL נסתרים)
const imageName = "תמונת רקע ווידג׳ט תחבורה ציבורית.PNG";
let imagePath = fm.joinPath(dataDir, imageName);

// --- עוזר: ניקוי תווי RTL נסתרים משמות קבצים (כמו ⁨ ⁩ וכו') ---
function stripBidi(s) {
  return (s || "").replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
}

// --- עוזר: נסה למצוא קובץ בתיקייה גם אם השם “נראה אותו דבר” אבל מכיל תווי RTL ---
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

// --- טעינת קובץ stops.json וחישוב תחנות קרובות ---
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

async function getCurrentLocationSafe() {
  try {
    Location.setAccuracyToHundredMeters();
    return await Location.current();
  } catch (e) {
    console.error("שגיאה בקבלת מיקום: " + e);
    return null;
  }
}

// חישוב מרחק מקורב ומהיר (במטרים) בין שתי נקודות (מתאים למציאת הקרובים ביותר)
function approxDistanceMeters(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const x = (lon2 - lon1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  const y = (lat2 - lat1) * rad;
  return Math.sqrt(x * x + y * y) * 6371000;
}

function normalizeStopItem(s) {
  if (!s) return null;
  const stopId = String(s.stopId ?? s.id ?? "");
  if (!stopId) return null;
  const name = String(s.stopName ?? s.name ?? "");
  const code = String(s.stopCode ?? s.code ?? "");
  return { stopId, name, code };
}

async function getNearbyStopsFromFile(maxResults, excludeIdsSet) {
  const loc = await getCurrentLocationSafe();
  if (!loc) return [];

  const raw = await readJsonFile(stopsPath, []);
  const stopsArray = Array.isArray(raw) ? raw : (Array.isArray(raw?.stops) ? raw.stops : []);
  if (!Array.isArray(stopsArray) || stopsArray.length === 0) return [];

  const best = []; // [{item, d}]
  const lat0 = loc.latitude;
  const lon0 = loc.longitude;

  for (const s of stopsArray) {
    // סינון תחנות לא פעילות (אם קיים שדה כזה)
    if (s && String(s.special || "") === "INACTIVE_STOP") continue;

    const item = normalizeStopItem(s);
    if (!item) continue;
    if (excludeIdsSet && excludeIdsSet.has(item.stopId)) continue;

    const lat = Number(s.lat);
    const lon = Number(s.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const d = approxDistanceMeters(lat0, lon0, lat, lon);

    // הכנסה לרשימת "הכי קרובים" בגודל קבוע
    if (best.length < maxResults) {
      best.push({ item, d });
      best.sort((a, b) => a.d - b.d);
    } else if (d < best[best.length - 1].d) {
      best[best.length - 1] = { item, d };
      best.sort((a, b) => a.d - b.d);
    }
  }

  return best.map(x => x.item);
}

// --- קריאת JSON ---
let data;
try {
  if (fm.fileExists(dataPath)) {
    await fm.downloadFileFromiCloud(dataPath);
  }
  const jsonString = fm.readString(dataPath);
  data = JSON.parse(jsonString);
} catch (e) {
  console.error("שגיאה בקריאת הקובץ: " + e);
  data = { stops: { favorites: [] }, lines: { favorites: [] } };
}

// יצירת הווידג'ט
const widget = new ListWidget();

// --- תמונת רקע ---
try {
  if (!fm.fileExists(imagePath)) {
    // נסה למצוא את הקובץ גם אם יש תווי RTL נסתרים בשם
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

// padding
widget.setPadding(18, 18, 18, 18);

// קונטיינר מרכזי עם רקע חצי שקוף
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

const title = titleStack.addText("בטמית בפמיר");
title.font = Font.boldSystemFont(20);
title.textColor = new Color("#2C3E50");

titleStack.addSpacer();
containerStack.addSpacer(16);

// פונקציה ליצירת אייקון עם צבע ורקע
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

// קטע תחנות (מועדפים + תחנות קרובות לפי מיקום)
const MAX_STOPS_TO_SHOW = 4;

const favoriteStopsRaw = Array.isArray(data?.stops?.favorites) ? data.stops.favorites : [];
const stopsToShow = [];
const usedStopIds = new Set();

// 1) מועדפים קודמים בראש
for (const fav of favoriteStopsRaw) {
  const item = normalizeStopItem(fav);
  if (!item) continue;
  if (usedStopIds.has(item.stopId)) continue;
  usedStopIds.add(item.stopId);
  stopsToShow.push(item);
  if (stopsToShow.length >= MAX_STOPS_TO_SHOW) break;
}

// 2) השלמה עם תחנות קרובות מהקובץ stops.json
if (stopsToShow.length < MAX_STOPS_TO_SHOW) {
  const nearby = await getNearbyStopsFromFile(MAX_STOPS_TO_SHOW - stopsToShow.length, usedStopIds);
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

  // הצגת עד 4 תחנות (מועדפים קודם, ואז קרובות)
  for (let i = 0; i < Math.min(MAX_STOPS_TO_SHOW, stopsToShow.length); i++) {
    const stop = stopsToShow[i];

    const rowStack = containerStack.addStack();
    rowStack.layoutHorizontally();
    rowStack.centerAlignContent();
    rowStack.spacing = 12;
    rowStack.url = `https://busnearby.co.il/stop/${stop.stopId}`;

    // אייקון
    createIconWithSymbol(rowStack, "bus.fill", stopColors[i] || "#95A5A6");

    // טקסט
    const textStack = rowStack.addStack();
    textStack.layoutVertically();
    textStack.spacing = 2;

    const nameText = textStack.addText(stop.name);
    nameText.font = Font.semiboldSystemFont(16);
    nameText.textColor = new Color("#2C3E50");
    nameText.lineLimit = 1;

    const codeText = textStack.addText(`קוד: ${stop.code}`);
    codeText.font = Font.regularSystemFont(13);
    codeText.textColor = new Color("#7F8C8D");

    rowStack.addSpacer();

    containerStack.addSpacer(10);
  }

  containerStack.addSpacer(6);
}

// קו מפריד
const separator = containerStack.addStack();
separator.size = new Size(0, 1);
separator.backgroundColor = new Color("#DCDCDC");
containerStack.addSpacer(10);

// קטע קווים
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

  // הצגת קווים אהובים
  for (let i = 0; i < Math.min(2, data.lines.favorites.length); i++) {
    const line = data.lines.favorites[i];

    const rowStack = containerStack.addStack();
    rowStack.layoutHorizontally();
    rowStack.centerAlignContent();
    rowStack.spacing = 12;
    rowStack.url = `https://busnearby.co.il/shareRoute/${line.routeId}`;

    // אייקון
    createIconWithSymbol(rowStack, "bus", i === 0 ? "#3498DB" : "#9B59B6");

    // טקסט
    const textStack = rowStack.addStack();
    textStack.layoutVertically();
    textStack.spacing = 2;

    const lineText = textStack.addText(`קו ${line.lineNumber}`);
    lineText.font = Font.semiboldSystemFont(16);
    lineText.textColor = new Color("#2C3E50");

    const destText = textStack.addText(line.destination);
    destText.font = Font.regularSystemFont(13);
    destText.textColor = new Color("#7F8C8D");
    destText.lineLimit = 1;

    rowStack.addSpacer();

    containerStack.addSpacer(10);
  }
}

// footer
containerStack.addSpacer();
const footerStack = containerStack.addStack();
footerStack.layoutHorizontally();
footerStack.addSpacer();

const updated = footerStack.addText("עודכן לאחרונה");
updated.font = Font.regularSystemFont(10);
updated.textColor = new Color("#95A5A6");
footerStack.addSpacer();

// הצגה
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();