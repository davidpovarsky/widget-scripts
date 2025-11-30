// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: magic;
// icon-color: navy; icon-glyph: chart-bar;
// וידג'ט: סטטיסטיקת דף יומי

const FILE = "shas_stats.json";
await run();

async function run() {
  const fm = FileManager.iCloud();
  const p = fm.joinPath(fm.documentsDirectory(), FILE);
  await fm.downloadFileFromiCloud(p);
  const s = JSON.parse(fm.readString(p));

  const perc = (s.learned_dafim / s.total_dafim) * 100;

  const widget = new ListWidget();
  widget.setPadding(16, 16, 16, 16);
  widget.backgroundGradient = gradient();

  const title = widget.addText("סטטיסטיקת דף יומי");
  title.textColor = Color.white();
  title.font = Font.semiboldSystemFont(16);
  widget.addSpacer(6);

  const line1 = widget.addText(`למדת ${s.learned_dafim} דפים`);
  line1.textColor = Color.white();
  line1.font = Font.mediumSystemFont(14);
  widget.addSpacer(2);

  const line2 = widget.addText(`${perc.toFixed(1)}% מהש\"ס`);
  line2.textColor = new Color("#F7DC6F");
  line2.font = Font.boldSystemFont(18);
  widget.addSpacer(8);

  drawProgressBar(widget, perc / 100);

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentMedium();
  Script.complete();
}

function drawProgressBar(widget, frac) {
  const bar = widget.addStack();
  bar.size = new Size(0, 10);
  bar.cornerRadius = 5;
  bar.backgroundColor = new Color("#1B2631");

  const filled = bar.addStack();
  filled.size = new Size(0, 10);
  filled.cornerRadius = 5;
  filled.backgroundColor = new Color("#F4D03F");

  bar.layoutHorizontally();
  bar.addSpacer(); // כדי שיתוחם לרוחב הווידג'ט

  filled.size = new Size(150 * frac, 10);
}

function gradient() {
  const g = new LinearGradient();
  g.colors = [new Color("#1F618D"), new Color("#154360")];
  g.locations = [0, 1];
  return g;
}