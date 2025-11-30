// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: magic;
// icon-color: gray; icon-glyph: pen;
// וידג'ט: יצירת הערת לימוד חדשה

// שנה לכתובת ה-WebApp / Trilium / Google Script שלך:
const NOTE_URL = "https://example.com/new-torah-note";

await run();

async function run() {
  const widget = new ListWidget();
  widget.setPadding(18, 18, 18, 18);

  const g = new LinearGradient();
  g.colors = [new Color("#2C3E50"), new Color("#95A5A6")];
  g.locations = [0, 1];
  widget.backgroundGradient = g;

  const title = widget.addText("הערת לימוד חדשה");
  title.font = Font.boldSystemFont(18);
  title.textColor = Color.white();
  widget.addSpacer(8);

  const box = widget.addStack();
  box.layoutHorizontally();
  box.setPadding(8, 10, 8, 10);
  box.cornerRadius = 12;
  box.backgroundColor = new Color("#ECF0F1", 0.8);

  const t = box.addText("✏️ הקש לכתיבה");
  t.font = Font.mediumSystemFont(14);
  t.textColor = new Color("#2C3E50");

  widget.url = NOTE_URL;

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentSmall();
  Script.complete();
}