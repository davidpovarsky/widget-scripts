// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: brown; icon-glyph: magic;
// === Widget: Current Time (Hebrew) ===
// מציג את השעה הנוכחית. בווידג'ט מוצג HH:mm.
// בתוך האפליקציה אפשר להציג גם שניות (אופציונלי).

const SHOW_SECONDS_IN_APP = true; // הצגת שניות כשמריצים באפליקציה (לא בווידג'ט)
const LOCALE = "he-IL";          // לוקאל להצגת השעה
const PADDING = 14;              // ריווח פנימי

// ---------- יצירת וידג'ט ----------
const w = new ListWidget();
w.setPadding(PADDING, PADDING, PADDING, PADDING);

// רקע עדין
const g = new LinearGradient();
g.colors = [
  new Color("#1c1c1e"), // כהה
  new Color("#2c2c2e")  // מעט בהיר יותר
];
g.locations = [0, 1];
w.backgroundGradient = g;

// כותרת קטנה (אופציונלית)
const title = w.addText("השעה עכשיו");
title.font = Font.semiboldSystemFont(12);
title.textOpacity = 0.75;
title.textColor = Color.white();
w.addSpacer(6);

// טקסט השעה
const now = new Date();
const runsInWidget = config.runsInWidget;

// בווידג'ט – ללא שניות (כדי לא להציג זמן ישן)
// באפליקציה – לפי ההגדרה למעלה
const timeOpts = {
  hour: "2-digit",
  minute: "2-digit",
  ...(SHOW_SECONDS_IN_APP && !runsInWidget ? { second: "2-digit" } : {})
};

const timeStr = new Intl.DateTimeFormat(LOCALE, timeOpts).format(now);
const timeText = w.addText(timeStr);
timeText.font = Font.heavySystemFont(runsInWidget ? 42 : 48);
timeText.centerAlignText();
timeText.textColor = Color.white();

// תאריך מתחת לשעה (קטן, אופציונלי)
w.addSpacer(4);
const dateStr = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "2-digit",
  month: "long"
}).format(now);
const dateText = w.addText(dateStr);
dateText.font = Font.mediumSystemFont(12);
dateText.textOpacity = 0.8;
dateText.centerAlignText();
dateText.textColor = Color.white();

// רענון לדקה הקרובה (כדי לעדכן :00)
// שים לב: iOS לא מבטיח רענון מדויק, אבל זה נותן "רמז" טוב.
const nextRefresh = new Date(now);
if (nextRefresh.getSeconds() === 0) nextRefresh.setMinutes(nextRefresh.getMinutes() + 1);
nextRefresh.setSeconds(0, 0);
w.refreshAfterDate = nextRefresh;

// הצגה
if (runsInWidget) {
  Script.setWidget(w);
  Script.complete();
} else {
  await w.presentSmall(); // אפשר לשנות ל-presentMedium/large לבחינה
  Script.complete();
}