// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: gray; icon-glyph: magic;
// icon-color: red; icon-glyph: exclamation-circle;
// וידג'ט: הזמן הקרוב (זמני היום)

await run();

async function run() {
  const loc = await safeLocation();
  const today = new Date();
  const dateStr = formatYMD(today);

  const url =
    `https://www.hebcal.com/zmanim?cfg=json&latitude=${loc.latitude}` +
    `&longitude=${loc.longitude}&tzid=Asia/Jerusalem&date=${dateStr}`;

  const data = await new Request(url).loadJSON();
  const times = data.times;

  const important = [
    { label: "סוף זמן ק״ש", key: "sofZmanShma" },
    { label: "סוף זמן תפילה", key: "sofZmanTfilla" },
    { label: "חצות", key: "chatzot" },
    { label: "מנחה גדולה", key: "minchaGedola" },
    { label: "מנחה קטנה", key: "minchaKetana" },
    { label: "שקיעה", key: "sunset" },
    { label: "צאת הכוכבים", key: "tzeit72min" }
  ];

  const now = new Date();
  let next = null;
  let minDiff = Infinity;

  for (const item of important) {
    const tStr = times[item.key];
    if (!tStr) continue;
    const t = new Date(tStr);
    const diff = t - now;
    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
      next = { ...item, time: t };
    }
  }

  const widget = new ListWidget();
  widget.setPadding(16, 16, 16, 16);

  if (!next) {
    widget.backgroundColor = new Color("#4A4A4A");
    const t = widget.addText("אין זמנים קרובים היום");
    t.textColor = Color.white();
    t.font = Font.mediumSystemFont(15);
    if (config.runsInWidget) Script.setWidget(widget);
    else widget.presentSmall();
    Script.complete();
    return;
  }

  const minutes = Math.round(minDiff / 60000);
  const bg = new LinearGradient();
  if (minutes <= 10) {
    bg.colors = [new Color("#C0392B"), new Color("#E74C3C")];
  } else if (minutes <= 30) {
    bg.colors = [new Color("#D68910"), new Color("#F5B041")];
  } else {
    bg.colors = [new Color("#145A32"), new Color("#27AE60")];
  }
  bg.locations = [0, 1];
  widget.backgroundGradient = bg;

  const title = widget.addText("הזמן הקרוב");
  title.textColor = Color.white();
  title.font = Font.semiboldSystemFont(16);
  widget.addSpacer(8);

  const main = widget.addText(next.label);
  main.textColor = Color.white();
  main.font = Font.boldSystemFont(20);
  widget.addSpacer(4);

  const tRow = widget.addText(formatTime(next.time));
  tRow.textColor = new Color("#FDFD96");
  tRow.font = Font.mediumSystemFont(16);
  widget.addSpacer(4);

  const mRow = widget.addText(`בעוד ${minutes} דקות`);
  mRow.textColor = Color.white();
  mRow.font = Font.mediumSystemFont(14);

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentSmall();
  Script.complete();
}

async function safeLocation() {
  try {
    Location.setAccuracyToThreeKilometers();
    return await Location.current();
  } catch {
    return { latitude: 31.778, longitude: 35.235 };
  }
}

function formatYMD(d) {
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatTime(d) {
  return d.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit"
  });
}