// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: magic;
// icon-color: red; icon-glyph: map-marker-alt;
// וידג'ט: תחבורה → מקומות קדושים

const FILE = "holy_places.json";
await run();

async function run() {
  const loc = await Location.current();

  const fm = FileManager.iCloud();
  const path = fm.joinPath(fm.documentsDirectory(), FILE);
  await fm.downloadFileFromiCloud(path);
  const places = JSON.parse(fm.readString(path));

  // מציאת מקום קדוש קרוב
  let best = null, bestDist = Infinity;

  for (let p of places) {
    const d = dist(loc.latitude, loc.longitude, p.lat, p.lon);
    if (d < bestDist) { bestDist = d; best = p; }
  }

  const widget = new ListWidget();
  widget.backgroundGradient = gradient();
  widget.setPadding(16,16,16,16);

  const title = widget.addText("יעד קדוש קרוב");
  title.font = Font.semiboldSystemFont(16);
  title.textColor = Color.white();

  widget.addSpacer(6);

  const name = widget.addText(best.name);
  name.font = Font.boldSystemFont(20);
  name.textColor = new Color("#FFDCDC");

  widget.addSpacer(6);

  const km = (bestDist / 1000).toFixed(1);
  const dtext = widget.addText(`מרחק: ~${km} ק\"מ`);
  dtext.textColor = Color.white();

  widget.addSpacer(6);

  widget.addText("קווים קרובים → (לוגיקה מתקדמת בהמשך)")
        .textColor = Color.white();

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentMedium();
  Script.complete();
}

function dist(lat1, lon1, lat2, lon2) {
  const R = 6371000; // מטרים
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function gradient() {
  const g = new LinearGradient();
  g.colors = [new Color("#7B241C"), new Color("#C0392B")];
  g.locations = [0, 1];
  return g;
}