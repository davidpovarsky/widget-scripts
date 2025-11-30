// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: magic;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: star-of-david;

////////////////////////////////////////////////////////////
// וידג׳ט משולב - זמני היום + זמני שבת + לוח לימוד יומי
////////////////////////////////////////////////////////////

async function run() {
  const location = await getCurrentLocation();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // זמני היום ומחר
  const zmanimToday = await fetchHalachicTimes(
    location.latitude,
    location.longitude,
    formatYMD(today)
  );
  const zmanimTomorrow = await fetchHalachicTimes(
    location.latitude,
    location.longitude,
    formatYMD(tomorrow)
  );

  const hebrewDate = await getHebrewDate(today);
  const hebrewDateTomorrow = await getHebrewDate(tomorrow);
  const parasha = await getParasha(today);

  // Sefaria API
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const sefariaReq = new Request(
    `https://www.sefaria.org/api/calendars?timezone=${encodeURIComponent(
      timeZone
    )}`
  );
  sefariaReq.headers = { accept: "application/json" };
  const sefariaRes = await sefariaReq.loadJSON();

  // =============== זמני שבת (רק אם יום שישי) ===============
  const weekday = today.getDay(); // 5 = Friday
  let shabbatTimes = null;

  if (weekday === 5) {
    shabbatTimes = await fetchShabbatTimes(
      location.latitude,
      location.longitude,
      today
    );
  }

  // יצירת ווידג׳ט
  const widget = new ListWidget();
  widget.setPadding(16, 16, 16, 16);
  const gradient = new LinearGradient();
  gradient.colors = [new Color("#1A5276"), new Color("#2874A6")];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;

  // כותרת עליונה
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  header.addSpacer();
  const headerText = `${hebrewDate}${
    parasha ? " • " + parasha : ""
  }${zmanimToday.location?.name ? " • " + zmanimToday.location.name : ""}`;
  addText(header, headerText, 16, "semibold", "#FFFFFF");
  header.addSpacer();

  widget.addSpacer(10);

  const mainRows = widget.addStack();
  mainRows.layoutHorizontally();
  mainRows.spacing = 20;

  // ============ זמני היום + מחר + שבת ============
  const zmanimStack = mainRows.addStack();
  zmanimStack.layoutVertically();
  zmanimStack.spacing = 6;

  const zHeader = zmanimStack.addStack();
  zHeader.layoutHorizontally();
  zHeader.centerAlignContent();
  zHeader.spacing = 6;
  const sunSymbol = SFSymbol.named("sun.max.fill");
  const sunImg = zHeader.addImage(sunSymbol.image);
  sunImg.imageSize = new Size(18, 18);
  sunImg.tintColor = Color.white();
  addText(zHeader, "זמני היום", 16, "bold", "#FFFFFF");

  zmanimStack.addSpacer(6);
  await buildZmanimTable(
    zmanimStack,
    zmanimToday,
    zmanimTomorrow,
    hebrewDateTomorrow,
    shabbatTimes // חדש
  );

  mainRows.addSpacer();

  // ============ לוח לימוד יומי ============
  const limudStack = mainRows.addStack();
  limudStack.layoutVertically();
  limudStack.spacing = 6;

  const lHeader = limudStack.addStack();
  lHeader.layoutHorizontally();
  lHeader.centerAlignContent();
  lHeader.spacing = 6;
  const bookSymbol = SFSymbol.named("book.fill");
  const bookImg = lHeader.addImage(bookSymbol.image);
  bookImg.imageSize = new Size(18, 18);
  bookImg.tintColor = Color.white();
  addText(lHeader, "לוח לימוד יומי", 16, "bold", "#FFFFFF");

  limudStack.addSpacer(6);
  await buildSefariaTable(limudStack, sefariaRes);

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    widget.presentLarge();
  }
  Script.complete();
}

////////////////////////////////////////////////////////////
// טבלת זמני היום + מחר + זמני שבת
////////////////////////////////////////////////////////////
async function buildZmanimTable(parent, zmanimToday, zmanimTomorrow, hebrewDateTomorrow, shabbatTimes) {
  if (!zmanimToday || !zmanimToday.times) {
    addText(parent, "לא ניתן לקבל זמנים כרגע", 14, "regular", "#FFFFFF");
    return;
  }

  const timesToday = zmanimToday.times;
  const timesTomorrow = zmanimTomorrow?.times || null;

  const importantTimes = [
    { label: "עלות השחר", key: "alotHaShachar", icon: "sunrise" },
    { label: "זמן ציצית/תפילין", key: "misheyakir", icon: "tshirt.fill" },
    { label: "הנץ החמה", key: "sunrise", icon: "sun.min.fill" },
    { label: "סוף זמן ק״ש", key: "sofZmanShma", icon: "text.book.closed.fill" },
    { label: "סוף זמן תפילה", key: "sofZmanTfilla", icon: "person.fill.questionmark" },
    { label: "חצות", key: "chatzot", icon: "clock.fill" },
    { label: "מנחה גדולה", key: "minchaGedola", icon: "clock.badge.fill" },
    { label: "מנחה קטנה", key: "minchaKetana", icon: "clock.badge" },
    { label: "פלג המנחה", key: "plagHaMincha", icon: "timer" },
    { label: "שקיעה", key: "sunset", icon: "sunset.fill" },
    { label: "צאת הכוכבים", key: "tzeit72min", icon: "moon.stars.fill" }
  ];

  const now = new Date();

  // מציאת הזמן הבא
  let nextTimeIndex = -1,
    minDiff = Infinity;
  for (let i = 0; i < importantTimes.length; i++) {
    const t = timesToday[importantTimes[i].key];
    if (t) {
      const d = new Date(t);
      const diff = d - now;
      if (diff > 0 && diff < minDiff) {
        minDiff = diff;
        nextTimeIndex = i;
      }
    }
  }

  const rowsStack = parent.addStack();
  rowsStack.layoutHorizontally();
  rowsStack.spacing = 10;

  const rightCol = rowsStack.addStack();
  rightCol.layoutVertically();
  rightCol.spacing = 8;

  const leftCol = rowsStack.addStack();
  leftCol.layoutVertically();
  leftCol.spacing = 8;

  const displayLimit =
    config.widgetFamily === "small"
      ? 6
      : config.widgetFamily === "medium"
      ? 10
      : 11;

  let currentCol = rightCol;
  const perCol = Math.ceil(Math.min(displayLimit, importantTimes.length) / 2);

  for (let i = 0; i < Math.min(displayLimit, importantTimes.length); i++) {
    if (i === perCol) currentCol = leftCol;

    const info = importantTimes[i];
    const timeStack = currentCol.addStack();
    timeStack.layoutHorizontally();
    timeStack.centerAlignContent();

    const icon = SFSymbol.named(info.icon);
    const iconEl = timeStack.addImage(icon.image);
    iconEl.imageSize = new Size(14, 14);
    iconEl.tintColor =
      i === nextTimeIndex ? new Color("#F39C12") : new Color("#D6EAF8");

    timeStack.addSpacer(4);

    addText(
      timeStack,
      info.label,
      18,
      i === nextTimeIndex ? "bold" : "regular",
      i === nextTimeIndex ? "#F39C12" : "#FFFFFF"
    );

    timeStack.addSpacer(4);

    addText(
      timeStack,
      formatTime(timesToday[info.key]),
      18,
      i === nextTimeIndex ? "bold" : "semibold",
      i === nextTimeIndex ? "#F39C12" : "#F7DC6F"
    );
  }

  // בדיקה אם נגמר היום
  let endOfDay = null;
  if (timesToday.tzeit72min) endOfDay = new Date(timesToday.tzeit72min);
  else if (timesToday.sunset) endOfDay = new Date(timesToday.sunset);

  const isAfterEndOfDay = endOfDay && now > endOfDay;
  
  // מציגים את זמני מחר רק אם *לא* מדובר ביום שישי
  const showTomorrow = isAfterEndOfDay && timesTomorrow && !shabbatTimes;

  // --- חלק א: זמני מחר (רק בימי חול) ---
  // נכנס לתוך leftCol כדי לא לשבור את המבנה
  if (showTomorrow) {
    leftCol.addSpacer(6);
    const sep = leftCol.addStack();
    addText(sep, "──────", 10, "regular", "#D6EAF8"); // קו קצר יותר

    leftCol.addSpacer(2);

    const hdr = leftCol.addStack();
    addText(hdr, `מחר • ${hebrewDateTomorrow}`, 13, "semibold", "#F7DC6F");

    leftCol.addSpacer(2);

    const list = [
      { label: "עלות השחר", key: "alotHaShachar", icon: "sunrise" },
      { label: "הנץ", key: "sunrise", icon: "sun.min.fill" }
    ];

    for (const info of list) {
      if (!timesTomorrow[info.key]) continue;

      const row = leftCol.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();

      const icon = SFSymbol.named(info.icon);
      const img = row.addImage(icon.image);
      img.imageSize = new Size(14, 14);
      img.tintColor = new Color("#D6EAF8");

      row.addSpacer(4);
      addText(row, info.label, 15, "regular", "#FFFFFF");
      row.addSpacer(4);
      addText(row, formatTime(timesTomorrow[info.key]), 15, "semibold", "#F7DC6F");
    }
  }

  // --- חלק ב: זמני שבת (תיקון: נכנס לתוך העמודה השמאלית) ---
  if (shabbatTimes && (shabbatTimes.candles || shabbatTimes.havdalah)) {
    // מרווח קטן מהזמן האחרון בעמודה
    leftCol.addSpacer(8);

    // קו מפריד בתוך העמודה
    const sep = leftCol.addStack();
    // sep.addSpacer(); // הורדתי כדי שיהיה צמוד לימין/שמאל בהתאם ליישור
    addText(sep, "──────", 10, "regular", "#D6EAF8"); 
    
    leftCol.addSpacer(2);

    // כותרת
    const hdr = leftCol.addStack();
    addText(hdr, "זמני שבת", 14, "bold", "#F7DC6F");

    leftCol.addSpacer(2);

    // הדלקת נרות
    if (shabbatTimes.candles) {
      const row = leftCol.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();

      const ic = SFSymbol.named("flame.fill");
      const img = row.addImage(ic.image);
      img.imageSize = new Size(12, 12);
      img.tintColor = new Color("#F7DC6F");

      row.addSpacer(4);
      addText(row, "הדלקה", 14, "regular", "#FFFFFF");
      row.addSpacer(4);
      addText(row, formatTime(shabbatTimes.candles.time), 14, "bold", "#F7DC6F");
    }

    // יציאת שבת
    if (shabbatTimes.havdalah) {
      const row = leftCol.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();

      const ic = SFSymbol.named("moon.stars.fill");
      const img = row.addImage(ic.image);
      img.imageSize = new Size(12, 12);
      img.tintColor = new Color("#D6EAF8");

      row.addSpacer(4);
      addText(row, "הבדלה", 14, "regular", "#FFFFFF");
      row.addSpacer(4);
      addText(row, formatTime(shabbatTimes.havdalah.time), 14, "bold", "#F7DC6F");
    }
  }
}

////////////////////////////////////////////////////////////
// לוח לימוד יומי
////////////////////////////////////////////////////////////
async function buildSefariaTable(parent, sefariaRes) {
  const items = sefariaRes.calendar_items
    .filter((item) => item.title && item.title.he)
    .sort((a, b) => {
      const pr = {
        Tanakh: 1,
        Talmud: 2,
        Halakha: 3,
        Midrash: 4,
        Liturgy: 5,
        Parshanut: 6,
        Philosophy: 7,
        Chasidut: 8,
        Musar: 9,
        Kabbalah: 10,
        Responsa: 11
      };
      const ap = pr[a.category] || 999,
        bp = pr[b.category] || 999;
      return ap !== bp ? ap - bp : (a.order || 0) - (b.order || 0);
    });

  const rowsStack = parent.addStack();
  rowsStack.layoutHorizontally();
  rowsStack.spacing = 10;

  const rightCol = rowsStack.addStack();
  rightCol.layoutVertically();
  rightCol.spacing = 8;

  const leftCol = rowsStack.addStack();
  leftCol.layoutVertically();
  leftCol.spacing = 8;

  const displayLimit =
    config.widgetFamily === "small"
      ? 6
      : config.widgetFamily === "medium"
      ? 10
      : 11;

  let currentCol = rightCol;
  const perCol = Math.ceil(Math.min(displayLimit, items.length) / 2);

  for (let i = 0; i < Math.min(displayLimit, items.length); i++) {
    if (i === perCol) currentCol = leftCol;
    await createItemRow(currentCol, items[i]);
  }
}

async function createItemRow(parent, item) {
  const itemStack = parent.addStack();
  itemStack.layoutVertically();
  itemStack.spacing = 2;

  const titleRow = itemStack.addStack();
  titleRow.layoutHorizontally();
  titleRow.centerAlignContent();

  const iconSymbol = SFSymbol.named(getCategoryIcon(item.category));
  const iconEl = titleRow.addImage(iconSymbol.image);
  iconEl.imageSize = new Size(14, 14);
  iconEl.tintColor = new Color("#D6EAF8");

  titleRow.addSpacer(4);
  addText(titleRow, item.title.he || item.title.en, 16, "semibold", "#FFFFFF");

  let displayInfo = item.displayValue?.he || item.heRef || "";

  if (displayInfo) {
    const infoRow = itemStack.addStack();
    infoRow.layoutHorizontally();
    infoRow.addSpacer(18);
    addText(infoRow, displayInfo, 14, "regular", "#F7DC6F");
  }

  if (item.url) itemStack.url = `https://www.sefaria.org/${item.url}`;
}

function getCategoryIcon(category) {
  const icons = {
    Tanakh: "book.closed.fill",
    Talmud: "books.vertical.fill",
    Halakha: "scale.3d",
    Midrash: "text.book.closed.fill",
    Kabbalah: "sparkles",
    Liturgy: "person.2.fill",
    Philosophy: "brain.head.profile",
    Parshanut: "magnifyingglass",
    Chasidut: "heart.fill",
    Musar: "lightbulb.fill",
    Responsa: "questionmark.circle.fill"
  };
  return icons[category] || "book.fill";
}

////////////////////////////////////////////////////////////
// פונקציות עזר
////////////////////////////////////////////////////////////

async function getCurrentLocation() {
  try {
    Location.setAccuracyToThreeKilometers();
    const loc = await Location.current();
    return { latitude: loc.latitude, longitude: loc.longitude };
  } catch {
    return { latitude: 31.778, longitude: 35.235 }; // ברירת מחדל: ירושלים
  }
}

////////////////////////////////////////////////////////////
// זמני שבת — JSON אמיתי
////////////////////////////////////////////////////////////
async function fetchShabbatTimes(lat, lon, date) {
  const start = formatYMD(date);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);
  const end = formatYMD(endDate);

  const url =
    `https://www.hebcal.com/hebcal?cfg=json&v=1&c=on&M=on&s=on` +
    `&latitude=${lat}&longitude=${lon}&tzid=Asia/Jerusalem` +
    `&start=${start}&end=${end}`;

  const req = new Request(url);
  const res = await req.loadJSON();

  let candles = null;
  let havdalah = null;

  for (const item of res.items) {
    if (item.category === "candles") {
      candles = { title: item.hebrew, time: item.date };
    }
    if (item.category === "havdalah") {
      havdalah = { title: item.hebrew, time: item.date };
    }
  }

  return { candles, havdalah };
}

////////////////////////////////////////////////////////////
// זמני היום (Zmanim)
////////////////////////////////////////////////////////////
async function fetchHalachicTimes(lat, lng, dateStr) {
  const dateParam = `&date=${encodeURIComponent(dateStr)}`;
  const url = `https://www.hebcal.com/zmanim?cfg=json&latitude=${lat}&longitude=${lng}&tzid=Asia/Jerusalem${dateParam}`;
  const req = new Request(url);
  return await req.loadJSON();
}

function formatTime(str) {
  if (!str) return "--:--";
  const d = new Date(str);
  return d.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function addText(stack, text, size, weight, color, opacity = 1) {
  const t = stack.addText(text);
  t.textColor = new Color(color, opacity);
  if (weight === "bold") t.font = Font.boldSystemFont(size);
  else if (weight === "semibold") t.font = Font.semiboldSystemFont(size);
  else t.font = Font.systemFont(size);
  return t;
}

async function getHebrewDate(date) {
  const dateStr = formatYMD(date);
  const req = new Request(
    `https://www.hebcal.com/converter?cfg=json&date=${dateStr}&g2h=1`
  );
  const res = await req.loadJSON();
  return res.hebrew;
}

async function getParasha(date) {
  const nextSat = new Date(date);
  const dow = date.getDay();
  if (dow !== 6) nextSat.setDate(date.getDate() + (6 - dow));
  const dateStr = formatYMD(nextSat);
  const req = new Request(
    `https://www.hebcal.com/shabbat?cfg=json&date=${dateStr}`
  );
  const res = await req.loadJSON();
  const item = res.items.find((i) => i.category === "parashat");
  return item ? item.hebrew : "";
}

function formatYMD(date) {
  return (
    date.getFullYear() +
    "-" +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    "-" +
    date.getDate().toString().padStart(2, "0")
  );
}

////////////////////////////////////////////////////////////
// הפעלה
////////////////////////////////////////////////////////////
await run();