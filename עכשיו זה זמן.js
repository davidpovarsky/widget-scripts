// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: magic;
// icon-color: purple; icon-glyph: clock;
// וידג'ט: עכשיו זה זמן...

await run();

async function run() {
  const now = new Date();
  const h = now.getHours();

  const slot = pickSlot(h);

  const widget = new ListWidget();
  widget.setPadding(16, 16, 16, 16);
  const g = new LinearGradient();
  g.colors = [new Color("#4A148C"), new Color("#7E57C2")];
  g.locations = [0, 1];
  widget.backgroundGradient = g;

  const title = widget.addText("עכשיו זה זמן...");
  title.textColor = Color.white();
  title.font = Font.semiboldSystemFont(16);
  widget.addSpacer(8);

  const main = widget.addText(slot.title);
  main.textColor = Color.white();
  main.font = Font.boldSystemFont(22);
  widget.addSpacer(4);

  const sub = widget.addText(slot.subtitle);
  sub.textColor = new Color("#D1C4E9");
  sub.font = Font.mediumSystemFont(14);

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentSmall();
  Script.complete();
}

function pickSlot(h) {
  if (h >= 5 && h < 9)
    return {
      title: "תפילת שחרית",
      subtitle: "להתחיל את היום מחובר"
    };
  if (h >= 9 && h < 13)
    return {
      title: "לימוד בוקר",
      subtitle: "גמרא / הלכה בריכוז"
    };
  if (h >= 13 && h < 17)
    return {
      title: "עבודה + חזרת לימוד",
      subtitle: "להכניס תורה גם בשגרה"
    };
  if (h >= 17 && h < 21)
    return {
      title: "סדר ערב",
      subtitle: "חברותא / שיעור קבוע"
    };
  if (h >= 21 && h < 24)
    return {
      title: "סיכום יום",
      subtitle: "עוד כמה דקות של תורה"
    };
  return {
    title: "מנוחת הגוף",
    subtitle: "כדי שמחר תוכל ללמוד יותר"
  };
}