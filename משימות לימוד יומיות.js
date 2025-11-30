// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: magic;
// icon-color: teal; icon-glyph: check-circle;
// וידג'ט: משימות לימוד יומיות

const FILE = "limud_tasks.json";
await run();

async function run() {
  const fm = FileManager.iCloud();
  const path = fm.joinPath(fm.documentsDirectory(), FILE);
  await fm.downloadFileFromiCloud(path);
  const data = JSON.parse(fm.readString(path));

  const widget = new ListWidget();
  widget.backgroundColor = new Color("#0D4D4D");
  widget.setPadding(14, 14, 14, 14);

  const title = widget.addText("משימות לימוד להיום");
  title.font = Font.semiboldSystemFont(16);
  title.textColor = Color.white();

  widget.addSpacer(8);

  for (let task of data) {
    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();

    const done = task.done ? "✔️" : "⬜️";

    const t = row.addText(`${done}  ${task.title}`);
    t.textColor = task.done ? new Color("#B2F2BB") : new Color("#FFFFFF");
    t.font = Font.mediumSystemFont(14);

    row.addSpacer();
    widget.addSpacer(5);
  }

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentMedium();
  Script.complete();
}