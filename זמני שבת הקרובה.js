// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-brown; icon-glyph: magic;
// icon-color: deep-blue; icon-glyph: candle-holder;
// וידג'ט: זמני שבת הקרובה

await run();

async function run() {
  const today = new Date();
  const nextShabbat = new Date(today);
  const dow = today.getDay(); // 0=א
  const diff = (6 - dow + 7) % 7; // שבת הקרובה
  nextShabbat.setDate(today.getDate() + diff);

  const dateStr = formatYMD(nextShabbat);
  const url = `https://www.hebcal.com/shabbat?cfg=json&geonameid=293397&date=${dateStr}`; // ירושלים כגאונאם, תוכל לשנות

  const data = await new Request(url).loadJSON();

  let parasha = "";
  let candles = null;
  let havdalah = null;

  for (const item of data.items) {
    if (item.category === "parashat") parasha = item.hebrew;
    if (item.category === "candles") candles = new Date(item.date);
    if (item.category === "havdalah") havdalah = new Date(item.date);
  }

  const widget = new ListWidget();
  widget.setPadding(16, 16, 16, 16);
  const g = new LinearGradient();
  g.colors = [new Color("#1B4F72"), new Color("#2874A6")];
  g.locations = [0, 1];
  widget.backgroundGradient = g;

  const title = widget.addText("שבת הקרובה");
  title.font = Font.semiboldSystemFont(16);
  title.textColor = Color.white();
  widget.addSpacer(4);

  const p = widget.addText(parasha || "פרשת השבוע");
  p.font = Font.boldSystemFont(18);
  p.textColor = new Color("#F9E79F");
  widget.addSpacer(6);

  if (candles) {
    const r = widget.addText("🕯 הדלקת נרות: " + formatTime(candles));
    r.textColor = Color.white();
    r.font = Font.mediumSystemFont(14);
  }
  if (havdalah) {
    const r2 = widget.addText("✨ צאת שבת: " + formatTime(havdalah));
    r2.textColor = Color.white();
    r2.font = Font.mediumSystemFont(14);
  }

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentMedium();
  Script.complete();
}

function formatYMD(d) {
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatTime(d) {
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}