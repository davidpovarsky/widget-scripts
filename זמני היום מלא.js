// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: magic;
// icon-color: deep-blue; icon-glyph: sun.max.fill;
// ווידג'ט: זמני היום בלבד

////////////////////////////////////////////////////////////
// הפעלה
////////////////////////////////////////////////////////////
await run();

async function run() {
  const location = await getCurrentLocation();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

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

  let shabbatTimes = null;
  if (today.getDay() === 5) {
    shabbatTimes = await fetchShabbatTimes(
      location.latitude,
      location.longitude,
      today
    );
  }

  const widget = new ListWidget();
  widget.setPadding(16, 16, 16, 16);

  const gradient = new LinearGradient();
  gradient.colors = [new Color("#1A5276"), new Color("#2874A6")];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;

  const header = widget.addStack();
  header.centerAlignContent();
  header.addSpacer();

  const headerText = `${hebrewDate}${
    parasha ? " • " + parasha : ""
  }${zmanimToday.location?.name ? " • " + zmanimToday.location.name : ""}`;

  addText(header, headerText, 17, "semibold", "#FFFFFF");
  header.addSpacer();
  widget.addSpacer(10);

  await buildZmanimTable(
    widget,
    zmanimToday,
    zmanimTomorrow,
    hebrewDateTomorrow,
    shabbatTimes
  );

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentLarge();
  Script.complete();
}

////////////////////////////////////////////////////////////
// טבלת זמני היום
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

  let endOfDay = null;
  if (timesToday.tzeit72min) endOfDay = new Date(timesToday.tzeit72min);
  else if (timesToday.sunset) endOfDay = new Date(timesToday.sunset);

  const nowIsLate = endOfDay && now > endOfDay;

  if (nowIsLate && timesTomorrow) {
    leftCol.addSpacer(6);
    addText(leftCol, "──────", 10, "regular", "#D6EAF8");
    leftCol.addSpacer(2);

    addText(leftCol, `מחר • ${hebrewDateTomorrow}`, 13, "semibold", "#F7DC6F");

    const tomorrowList = [
      { label: "עלות השחר", key: "alotHaShachar", icon: "sunrise" },
      { label: "הנץ", key: "sunrise", icon: "sun.min.fill" }
    ];

    for (const info of tomorrowList) {
      if (!timesTomorrow[info.key]) continue;

      const row = leftCol.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();

      const ic = SFSymbol.named(info.icon);
      const img = row.addImage(ic.image);
      img.imageSize = new Size(14, 14);
      img.tintColor = new Color("#D6EAF8");

      row.addSpacer(4);
      addText(row, info.label, 15, "regular", "#FFFFFF");
      row.addSpacer(4);
      addText(row, formatTime(timesTomorrow[info.key]), 15, "semibold", "#F7DC6F");
    }
  }

  if (shabbatTimes) {
    leftCol.addSpacer(8);
    addText(leftCol, "──────", 10, "regular", "#D6EAF8");

    leftCol.addSpacer(2);
    addText(leftCol, "זמני שבת", 14, "bold", "#F7DC6F");

    if (shabbatTimes.candles) {
      const r = leftCol.addStack();
      r.centerAlignContent();
      const ic = SFSymbol.named("flame.fill");
      const img = r.addImage(ic.image);
      img.imageSize = new Size(12, 12);
      img.tintColor = new Color("#F7DC6F");

      r.addSpacer(4);
      addText(r, "הדלקה", 14, "regular", "#FFFFFF");
      r.addSpacer(4);
      addText(r, formatTime(shabbatTimes.candles.time), 14, "bold", "#F7DC6F");
    }

    if (shabbatTimes.havdalah) {
      const r = leftCol.addStack();
      r.centerAlignContent();
      const ic = SFSymbol.named("moon.stars.fill");
      const img = r.addImage(ic.image);
      img.imageSize = new Size(12, 12);
      img.tintColor = new Color("#D6EAF8");

      r.addSpacer(4);
      addText(r, "הבדלה", 14, "regular", "#FFFFFF");
      r.addSpacer(4);
      addText(r, formatTime(shabbatTimes.havdalah.time), 14, "bold", "#F7DC6F");
    }
  }
}

////////////////////////////////////////////////////////////
// לוגיקה חיצונית — כמו בקובץ המקורי
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
    if (item.category === "candles") candles = { time: item.date };
    if (item.category === "havdalah") havdalah = { time: item.date };
  }

  return { candles, havdalah };
}

async function fetchHalachicTimes(lat, lng, dateStr) {
  const url = `https://www.hebcal.com/zmanim?cfg=json&latitude=${lat}&longitude=${lng}&tzid=Asia/Jerusalem&date=${dateStr}`;
  const req = new Request(url);
  return await req.loadJSON();
}

function addText(stack, text, size, weight, color) {
  const t = stack.addText(text);
  t.textColor = new Color(color);
  if (weight === "bold") t.font = Font.boldSystemFont(size);
  else if (weight === "semibold") t.font = Font.semiboldSystemFont(size);
  else t.font = Font.systemFont(size);
}

function formatTime(str) {
  if (!str) return "--:--";
  const d = new Date(str);
  return d.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function getHebrewDate(date) {
  const req = new Request(
    `https://www.hebcal.com/converter?cfg=json&date=${formatYMD(
      date
    )}&g2h=1`
  );
  const res = await req.loadJSON();
  return res.hebrew;
}

async function getParasha(date) {
  const nextSat = new Date(date);
  const dow = date.getDay();
  if (dow !== 6) nextSat.setDate(date.getDate() + (6 - dow));
  const req = new Request(
    `https://www.hebcal.com/shabbat?cfg=json&date=${formatYMD(nextSat)}`
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

async function getCurrentLocation() {
  try {
    Location.setAccuracyToThreeKilometers();
    const loc = await Location.current();
    return { latitude: loc.latitude, longitude: loc.longitude };
  } catch {
    return { latitude: 31.778, longitude: 35.235 };
  }
}