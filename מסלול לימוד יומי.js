// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: magic;
// icon-color: green; icon-glyph: book;
// וידג'ט: תחנת הלימוד הבאה במסלול

const FILE = "limud_path.json";
await run();

async function run() {
  const fm = FileManager.iCloud();
  const p = fm.joinPath(fm.documentsDirectory(), FILE);
  await fm.downloadFileFromiCloud(p);
  const data = JSON.parse(fm.readString(p)).daf_yomi;

  const nextIndex = (data.index + 1) % data.items.length;
  const nextItem = data.items[nextIndex];

  const widget = new ListWidget();
  widget.backgroundGradient = gradient();
  widget.setPadding(16,16,16,16);

  const title = widget.addText("התחנה הבאה");
  title.font = Font.semiboldSystemFont(16);
  title.textColor = Color.white();

  widget.addSpacer(10);

  const txt = widget.addText(nextItem);
  txt.font = Font.boldSystemFont(20);
  txt.textColor = new Color("#C7FFA3");

  widget.addSpacer(10);

  widget.addText(`${nextIndex + 1} / ${data.items.length}`)
    .textColor = Color.white();

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentSmall();
  Script.complete();
}

function gradient() {
  const g = new LinearGradient();
  g.colors = [new Color("#145A32"), new Color("#2ECC71")];
  g.locations = [0, 1];
  return g;
}