// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: magic;
// icon-color: dark-gray; icon-glyph: search;
// וידג'ט: שורת חיפוש תורנית

// שנה ל-URL של דף החיפוש שלך (Scriptable WebView / אתר)
const SEARCH_URL = "https://www.sefaria.org/search?lang=he&q=";

await run();

async function run() {
  const widget = new ListWidget();
  widget.setPadding(14, 14, 14, 14);
  const g = new LinearGradient();
  g.colors = [new Color("#212121"), new Color("#424242")];
  g.locations = [0, 1];
  widget.backgroundGradient = g;

  const title = widget.addText("חיפוש במאגרי תורה");
  title.textColor = Color.white();
  title.font = Font.semiboldSystemFont(15);
  widget.addSpacer(8);

  const bar = widget.addStack();
  bar.layoutHorizontally();
  bar.cornerRadius = 10;
  bar.backgroundColor = new Color("#EEEEEE");
  bar.setPadding(6, 10, 6, 10);

  const icon = bar.addText("🔍");
  icon.font = Font.systemFont(14);
  bar.addSpacer(4);

  const txt = bar.addText("חפש בספריא / אל התורה…");
  txt.textColor = new Color("#616161");
  txt.font = Font.systemFont(13);

  widget.url = SEARCH_URL; // ייפתח, ואתה תקיש שם את הטקסט

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentMedium();
  Script.complete();
}