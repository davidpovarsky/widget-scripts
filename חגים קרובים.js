// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: magic;
// icon-color: gold; icon-glyph: star-of-david;
// וידג'ט: האירוע הקרוב בלוח השנה העברי

await run();

async function run() {
  const url = "https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&s=on&nx=on&year=now";
  const data = await new Request(url).loadJSON();

  const now = new Date();
  let nextEvent = null;

  for (const item of data.items) {
    const d = new Date(item.date);
    if (d >= now && !nextEvent) nextEvent = item;
  }

  const widget = new ListWidget();
  widget.backgroundGradient = gradient();
  widget.setPadding(16,16,16,16);

  const title = widget.addText("האירוע הבא");
  title.font = Font.semiboldSystemFont(16);
  title.textColor = Color.white();

  widget.addSpacer(8);

  if (!nextEvent) {
    widget.addText("לא נמצאו אירועים קרובים").textColor = Color.white();
  } else {
    const name = widget.addText(nextEvent.hebrew);
    name.font = Font.boldSystemFont(20);
    name.textColor = new Color("#FFF3A3");
    
    widget.addSpacer(6);

    const days = Math.ceil((new Date(nextEvent.date) - now) / 86400000);

    const sub = widget.addText(`בעוד ${days} ימים`);
    sub.font = Font.mediumSystemFont(15);
    sub.textColor = Color.white();
  }

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentSmall();
  Script.complete();
}

function gradient() {
  const g = new LinearGradient();
  g.colors = [new Color("#B8860B"), new Color("#E7C45F")];
  g.locations = [0, 1];
  return g;
}