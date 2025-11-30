// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: magic;
// icon-color: dark-green; icon-glyph: scroll;
// וידג'ט: הלכה יומית

const FILE = "halacha_yomit.json";
await run();

async function run() {
  const fm = FileManager.iCloud();
  const p = fm.joinPath(fm.documentsDirectory(), FILE);
  await fm.downloadFileFromiCloud(p);
  const list = JSON.parse(fm.readString(p));

  const idx = dayIndex() % list.length;
  const item = list[idx];

  const widget = new ListWidget();
  widget.setPadding(16, 16, 16, 16);
  widget.backgroundGradient = gradient();

  const title = widget.addText("הלכה יומית");
  title.font = Font.semiboldSystemFont(16);
  title.textColor = Color.white();
  widget.addSpacer(6);

  const t = widget.addText(item.title);
  t.font = Font.boldSystemFont(18);
  t.textColor = new Color("#D4EFDF");
  widget.addSpacer(4);

  const body = widget.addText(item.text);
  body.font = Font.systemFont(14);
  body.textColor = Color.white();
  body.lineLimit = 4;
  body.minimumScaleFactor = 0.6;
  widget.addSpacer(4);

  const s = widget.addText(item.source);
  s.font = Font.mediumSystemFont(12);
  s.textColor = new Color("#ABEBC6");

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentMedium();
  Script.complete();
}

function dayIndex() {
  const msPerDay = 24 * 60 * 60 * 1000;
  const base = new Date(2025, 0, 1); // בסיס
  const now = new Date();
  return Math.floor((now - base) / msPerDay);
}

function gradient() {
  const g = new LinearGradient();
  g.colors = [new Color("#145A32"), new Color("#27AE60")];
  g.locations = [0, 1];
  return g;
}