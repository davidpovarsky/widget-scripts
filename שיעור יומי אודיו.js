// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: brown; icon-glyph: magic;
// icon-color: indigo; icon-glyph: headphones;
// וידג'ט: שיעור יומי בקול

const FILE = "audio_shiur.json";
await run();

async function run() {
  const fm = FileManager.iCloud();
  const path = fm.joinPath(fm.documentsDirectory(), FILE);
  await fm.downloadFileFromiCloud(path);
  const cfg = JSON.parse(fm.readString(path)).daf_yomi;

  const widget = new ListWidget();
  widget.setPadding(16, 16, 16, 16);
  widget.backgroundGradient = gradient();

  const title = widget.addText("שיעור היום (דף יומי)");
  title.font = Font.semiboldSystemFont(16);
  title.textColor = Color.white();

  widget.addSpacer(10);

  const shiurName = `${cfg.massechet} דף ${cfg.today_index}`;
  const row = widget.addText(shiurName);
  row.font = Font.boldSystemFont(18);
  row.textColor = new Color("#FFE9A3");

  widget.addSpacer(10);

  widget.addText("▶️ לחץ להאזנה").textColor = Color.white();

  const url = `${cfg.base_url}${cfg.today_index}.${cfg.file_format}`;
  widget.url = url;

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentMedium();
  Script.complete();
}

function gradient() {
  const g = new LinearGradient();
  g.colors = [new Color("#3F0E98"), new Color("#6A4FCB")];
  g.locations = [0, 1];
  return g;
}