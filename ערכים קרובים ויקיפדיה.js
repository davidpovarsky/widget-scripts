// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: map-marked-alt;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: map-marked-alt;
// Variables used by Scriptable.
// icon-color: dark-blue; icon-glyph: wikipedia-w;

const LANG = "he";
const RADIUS_METERS = 3000;

await run();

async function run() {
  const widget = new ListWidget();
  widget.setPadding(12, 12, 12, 12);
  widget.backgroundGradient = makeGradient();

  // כותרת - גובה קבוע
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const logo = await getWikiLogo();
  const img = header.addImage(logo);
  img.imageSize = new Size(20, 20);
  header.addSpacer(6);
  const title = header.addText("סביבך בוויקיפדיה");
  title.font = Font.boldSystemFont(16);
  title.textColor = Color.white();
  widget.addSpacer(10);

  // מיקום
  const loc = await getSafeLocation();
  if (!loc) return showError(widget, "אין מיקום");

  // נתונים
  const allItems = await fetchWikipediaData(loc.latitude, loc.longitude);
  if (!allItems.length) return showError(widget, "אין תוצאות");

  // ---- חלוקה לשתי עמודות עם גובה מוגבל ----
  const mainContainer = widget.addStack();
  mainContainer.layoutVertically();
  
  const row = mainContainer.addStack();
  row.layoutHorizontally();

  const rightCol = row.addStack(); // ימין (עברית)
  rightCol.layoutVertically();

  row.addSpacer(12);

  const leftCol = row.addStack(); // שמאל
  leftCol.layoutVertically();

  // ---- כמה פריטים יכולים להיכנס ----
  const limit =
    config.widgetFamily === "small" ? 2 :
    config.widgetFamily === "medium" ? 4 :
    8;

  const items = allItems.slice(0, limit);

  // ---- חלוקה מדויקת לשתי עמודות ----
  const half = Math.ceil(items.length / 2);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (i < half) {
      await addCard(rightCol, item);
      if (i < half - 1) rightCol.addSpacer(10);
    } else {
      await addCard(leftCol, item);
      if (i < items.length - 1) leftCol.addSpacer(10);
    }
  }

  finish(widget);
}

// ======== כרטיס ========

async function addCard(parent, item) {
  const box = parent.addStack();
  box.layoutHorizontally();
  box.backgroundColor = new Color("#ffffff", 0.15);
  box.cornerRadius = 12;
  box.setPadding(10, 10, 10, 10);

  // רוחב קבוע לכל הכרטיסים
  const cardWidth = config.widgetFamily === "small" ? 150 : 
                    config.widgetFamily === "medium" ? 150 : 170;

  // תמונה - גודל קבוע
  const imageSize = 70;
  
  if (item.thumbnail) {
    try {
      const req = new Request(item.thumbnail);
      const img = await req.loadImage();
      const imNode = box.addImage(img);
      imNode.imageSize = new Size(imageSize, imageSize);
      imNode.cornerRadius = 6;
      imNode.contentMode = ContentMode.scaleAspectFill;
      box.addSpacer(8);
    } catch (e) {}
  }

  const col = box.addStack();
  col.layoutVertically();

  // כותרת - גודל קבוע
  const t = col.addText(item.title);
  t.font = Font.boldSystemFont(14);
  t.textColor = Color.white();
  t.lineLimit = 2;

  // תקציר - מוגבל ל-3 שורות
  if (item.extract) {
    col.addSpacer(4);
    const desc = col.addText(item.extract);
    desc.font = Font.systemFont(12);
    desc.textColor = new Color("#E0E0E0");
    desc.lineLimit = 3; // מקסימום 3 שורות
  }

  col.addSpacer(4);

  // מרחק - תמיד באותו גודל
  const dRow = col.addStack();
  dRow.layoutHorizontally();
  const pin = dRow.addImage(SFSymbol.named("location.fill").image);
  pin.imageSize = new Size(11, 11);
  pin.tintColor = Color.yellow();
  dRow.addSpacer(3);
  const d = dRow.addText(formatDistance(item.dist));
  d.font = Font.mediumSystemFont(11);
  d.textColor = Color.yellow();

  box.url = item.url;
}

// ======== API ========

async function fetchWikipediaData(lat, lon) {
  const geoUrl =
    `https://${LANG}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=` +
    `${lat}|${lon}&gsradius=${RADIUS_METERS}&gslimit=30&format=json`;

  const g = await new Request(geoUrl).loadJSON();
  if (!g.query?.geosearch?.length) return [];

  const ids = g.query.geosearch.map(p => p.pageid).join("|");

  const dUrl =
    `https://${LANG}.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts` +
    `&pageids=${ids}&pithumbsize=300&explaintext=1&exintro=1&format=json`;

  const d = await new Request(dUrl).loadJSON();
  const pages = d.query.pages;

  return g.query.geosearch.map(i => ({
    title: i.title,
    dist: i.dist,
    url: `https://${LANG}.wikipedia.org/wiki/${encodeURIComponent(i.title)}`,
    thumbnail: pages[i.pageid].thumbnail?.source ?? null,
    extract: pages[i.pageid].extract ?? ""
  }));
}

// ======== עזרים ========

async function getSafeLocation() {
  try {
    Location.setAccuracyToThreeKilometers();
    return await Location.current();
  } catch {
    return null;
  }
}

function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)} מ׳`;
  return `${(m / 1000).toFixed(1)} ק״מ`;
}

function makeGradient() {
  const g = new LinearGradient();
  g.colors = [new Color("#141E30"), new Color("#243B55")];
  g.locations = [0, 1];
  return g;
}

async function getWikiLogo() {
  const url = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/200px-Wikipedia-logo-v2.svg.png";
  return await new Request(url).loadImage();
}

function showError(w, msg) {
  const t = w.addText(msg);
  t.font = Font.mediumSystemFont(13);
  t.textColor = Color.white();
}

function finish(w) {
  if (config.runsInWidget) Script.setWidget(w);
  else w.presentLarge();
  Script.complete();
}