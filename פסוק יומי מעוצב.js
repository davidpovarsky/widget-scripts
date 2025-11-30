// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: magic;
// icon-color: cyan; icon-glyph: bible;
// וידג'ט: פסוק יומי מעוצב

const FILE = "pasuk_yomi.json";
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
  const g = new LinearGradient();
  g.colors = [new Color("#74ABE2"), new Color("#5563DE")];
  g.locations = [0, 1];
  widget.backgroundGradient = g;

  const top = widget.addText("פסוק יומי");
  top.textColor = Color.white();
  top.font = Font.semiboldSystemFont(15);
  widget.addSpacer(6);

  const verse = widget.addText("“" + item.text + "”");
  verse.textColor = Color.white();
  verse.font = Font.boldSystemFont(20);
  verse.lineLimit = 3;
  verse.minimumScaleFactor = 0.5;
  widget.addSpacer(6);

  const ref = widget.addText(item.ref);
  ref.textColor = new Color("#E3F2FD");
  ref.font = Font.mediumSystemFont(13);

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentMedium();
  Script.complete();
}

function dayIndex() {
  const msPerDay = 86400000;
  const base = new Date(2025, 0, 1);
  const now = new Date();
  return Math.floor((now - base) / msPerDay);
}