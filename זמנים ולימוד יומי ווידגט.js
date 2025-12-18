// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: star-of-david;

////////////////////////////////////////////////////////////
// וידג׳ט משולב - זמני היום + זמני שבת + לוח לימוד יומי
// גרסה מותאמת לכל הגדלים (Small, Medium, Large, ExtraLarge)
////////////////////////////////////////////////////////////

const CACHE_VERSION = 1;
const CACHE_FILE = "zmanim_limud_daily_cache_v1.json";
const CACHE_KEEP_DAYS = 5;
const CACHE_FALLBACK_MAX_HOURS = 72;
const LOCATION_ROUND_DECIMALS = 3;

async function run() {
  const location = await getCurrentLocation();

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayStr = formatYMD(today);
  const cacheKey = buildDailyCacheKey(todayStr, location.latitude, location.longitude);

  let data = null;

  try {
    data = await fetchAllData(location, today, tomorrow);
    setCacheEntry(cacheKey, data);
  } catch (e) {
    const cachedToday = getCacheEntry(cacheKey);
    if (cachedToday) {
      data = cachedToday.payload;
    } else {
      const fallback = getNewestCacheEntryWithinHours(CACHE_FALLBACK_MAX_HOURS);
      if (fallback) {
        data = fallback.payload;
      } else {
        throw new Error("❌ אין אינטרנט ואין נתונים שמורים בקאש.");
      }
    }
  }

  const {
    zmanimToday,
    zmanimTomorrow,
    hebrewDate,
    hebrewDateTomorrow,
    parasha,
    sefariaRes,
    holidays,
    shabbatTimes
  } = data;

  // הגדרת הווידג׳ט
  const widget = new ListWidget();
  widget.setPadding(14, 14, 14, 14); // Padding מעט קטן יותר להתאמה לכל הגדלים
  const gradient = new LinearGradient();
  gradient.colors = [new Color("#1A5276"), new Color("#2874A6")];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;

  // --- חלק 1: כותרת עליונה (מוצגת בכל הגדלים) ---
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  header.addSpacer();

  let headerText = hebrewDate;
  // ב-Small נקצר את הכותרת כדי שלא תתפוס את כל המקום
  if (config.widgetFamily !== "small") {
      if (parasha) headerText += " • " + parasha;
      if (holidays && (holidays.today.length > 0 || holidays.tomorrow.length > 0)) {
        const holidayText = buildHolidayText(holidays);
        if (holidayText) headerText += " • " + holidayText;
      }
      if (zmanimToday?.location?.name) headerText += " • " + zmanimToday.location.name;
  } else {
      // ב-Small נציג רק תאריך ופרשה (בלי חגים ומיקום כדי לחסוך מקום)
      if (parasha) headerText += "\n" + parasha;
  }

  const headerLabel = addText(header, headerText, config.widgetFamily === "small" ? 13 : 14, "semibold", "#FFFFFF");
  if (config.widgetFamily === "small") headerLabel.centerAlignText();
  
  header.addSpacer();
  widget.addSpacer(config.widgetFamily === "small" ? 4 : 10);

  // --- חלק 2: תוכן לפי גודל הווידג׳ט ---
  const family = config.widgetFamily || "large"; // ברירת מחדל לדיבאג
  const wParam = (args.widgetParameter || "").toLowerCase();

  if (family === "small") {
    // === SMALL: הצגת הזמן הבא בלבד ===
    await buildFocusedZmanimTable(widget, zmanimToday, zmanimTomorrow, shabbatTimes, "single");

  } else if (family === "medium") {
    // === MEDIUM: הצגת רשימה ממוקדת (עכשיו +- 2) ===
    await buildFocusedZmanimTable(widget, zmanimToday, zmanimTomorrow, shabbatTimes, "list");

  } else if (family === "large") {
    // === LARGE: בחירה בין זמנים ללימוד לפי פרמטר ===
    if (wParam.includes("limud") || wParam.includes("לימוד")) {
        // הצגת לוח לימוד
        const lHeader = widget.addStack();
        lHeader.layoutHorizontally();
        lHeader.centerAlignContent();
        const bookSymbol = SFSymbol.named("book.fill");
        const bookImg = lHeader.addImage(bookSymbol.image);
        bookImg.imageSize = new Size(18, 18);
        bookImg.tintColor = Color.white();
        lHeader.addSpacer(6);
        addText(lHeader, "לוח לימוד יומי", 16, "bold", "#FFFFFF");
        widget.addSpacer(6);
        await buildSefariaTable(widget, sefariaRes);
    } else {
        // ברירת מחדל: זמני היום (הטבלה המלאה)
        const zHeader = widget.addStack();
        zHeader.layoutHorizontally();
        zHeader.centerAlignContent();
        const sunSymbol = SFSymbol.named("sun.max.fill");
        const sunImg = zHeader.addImage(sunSymbol.image);
        sunImg.imageSize = new Size(18, 18);
        sunImg.tintColor = Color.white();
        zHeader.addSpacer(6);
        addText(zHeader, "זמני היום", 16, "bold", "#FFFFFF");
        widget.addSpacer(6);
        
        // עוטפים ב-Stack כדי לשמור על המבנה של הפונקציה המקורית
        const container = widget.addStack();
        container.layoutVertically();
        await buildZmanimTable(container, zmanimToday, zmanimTomorrow, hebrewDateTomorrow, shabbatTimes);
    }

  } else {
    // === EXTRA LARGE: התצוגה המשולבת המקורית ===
    const mainRows = widget.addStack();
    mainRows.layoutHorizontally();
    mainRows.spacing = 20;

    // עמודה ימנית: זמנים
    const zmanimStack = mainRows.addStack();
    zmanimStack.layoutVertically();
    zmanimStack.spacing = 6;
    
    const zHeader = zmanimStack.addStack();
    zHeader.layoutHorizontally();
    zHeader.centerAlignContent();
    const sunSymbol = SFSymbol.named("sun.max.fill");
    const sunImg = zHeader.addImage(sunSymbol.image);
    sunImg.imageSize = new Size(18, 18);
    sunImg.tintColor = Color.white();
    zHeader.addSpacer(6);
    addText(zHeader, "זמני היום", 16, "bold", "#FFFFFF");
    zmanimStack.addSpacer(6);
    
    await buildZmanimTable(zmanimStack, zmanimToday, zmanimTomorrow, hebrewDateTomorrow, shabbatTimes);

    mainRows.addSpacer();

    // עמודה שמאלית: לימוד
    const limudStack = mainRows.addStack();
    limudStack.layoutVertically();
    limudStack.spacing = 6;

    const lHeader = limudStack.addStack();
    lHeader.layoutHorizontally();
    lHeader.centerAlignContent();
    const bookSymbol = SFSymbol.named("book.fill");
    const bookImg = lHeader.addImage(bookSymbol.image);
    bookImg.imageSize = new Size(18, 18);
    bookImg.tintColor = Color.white();
    lHeader.addSpacer(6);
    addText(lHeader, "לוח לימוד יומי", 16, "bold", "#FFFFFF");
    limudStack.addSpacer(6);
    
    await buildSefariaTable(limudStack, sefariaRes);
  }

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    // לצרכי בדיקה באפליקציה עצמה
    if (family === "small") widget.presentSmall();
    else if (family === "medium") widget.presentMedium();
    else widget.presentLarge();
  }
  Script.complete();
}

/* ===================== פונקציות תצוגה חדשות (Small/Medium) ===================== */

// פונקציה לבניית רשימה ממוקדת של זמנים (עבור Small ו-Medium)
async function buildFocusedZmanimTable(parent, zmanimToday, zmanimTomorrow, shabbatTimes, mode) {
    if (!zmanimToday || !zmanimToday.times) return;

    // 1. הגדרת רשימת כל הזמנים הרלוונטיים (היום + התחלה של מחר)
    const importantTimes = [
        { label: "עלות השחר", key: "alotHaShachar", icon: "sunrise" },
        { label: "זמן ציצית", key: "misheyakir", icon: "tshirt.fill" },
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

    // יצירת מערך שטוח של אובייקטים עם זמנים קונקרטיים
    let flatTimes = [];
    const now = new Date();

    // הוספת זמני היום
    importantTimes.forEach(t => {
        if (zmanimToday.times[t.key]) {
            flatTimes.push({ ...t, time: new Date(zmanimToday.times[t.key]), type: 'today' });
        }
    });

    // הוספת הדלקת נרות/הבדלה אם רלוונטי להיום (שישי/שבת) ועדיין לא עבר
    // הערה: בקוד המקורי זה מופרד, כאן נכניס לרצף אם זה Medium
    if (shabbatTimes) {
         if (shabbatTimes.candles) {
             // מכניסים לפי סדר כרונולוגי
             flatTimes.push({ label: "הדלקת נרות", key: "candles", icon: "flame.fill", time: new Date(shabbatTimes.candles.time), type: 'shabbat' });
         }
         if (shabbatTimes.havdalah) {
             flatTimes.push({ label: "הבדלה", key: "havdalah", icon: "moon.stars.fill", time: new Date(shabbatTimes.havdalah.time), type: 'shabbat' });
         }
    }

    // הוספת זמני מחר (התחלתיים) למקרה שגולשים
    if (zmanimTomorrow && zmanimTomorrow.times) {
        // מחר - נוסיף רק את ההתחלה
        const tmrwKeys = ["alotHaShachar", "sunrise", "sofZmanShma"];
        tmrwKeys.forEach(k => {
             const ref = importantTimes.find(x => x.key === k);
             if (ref && zmanimTomorrow.times[k]) {
                 flatTimes.push({ ...ref, label: ref.label + " (מחר)", time: new Date(zmanimTomorrow.times[k]), type: 'tomorrow' });
             }
        });
    }

    // מיון לפי זמן
    flatTimes.sort((a, b) => a.time - b.time);

    // מציאת האינדקס הבא
    let nextIndex = flatTimes.findIndex(item => item.time > now);
    if (nextIndex === -1) nextIndex = flatTimes.length - 1; // אם הכל עבר, נציג את האחרון או שנשאר בסוף

    // === מצב SMALL ===
    if (mode === "single") {
        const item = flatTimes[nextIndex];
        if (!item) return;
        
        parent.addSpacer();
        
        const stack = parent.addStack();
        stack.layoutVertically();
        stack.centerAlignContent();
        
        const iconSymbol = SFSymbol.named(item.icon);
        const iconImg = stack.addImage(iconSymbol.image);
        iconImg.imageSize = new Size(30, 30);
        iconImg.tintColor = new Color("#F39C12");
        iconImg.centerAlignImage();
        
        stack.addSpacer(8);
        
        const lbl = stack.addText(item.label);
        lbl.font = Font.boldSystemFont(16);
        lbl.textColor = Color.white();
        lbl.centerAlignText();
        
        stack.addSpacer(4);
        
        const timeLbl = stack.addText(formatTime(item.time));
        timeLbl.font = Font.systemFont(26);
        timeLbl.textColor = new Color("#F39C12");
        timeLbl.centerAlignText();
        
        parent.addSpacer();
        return;
    }

    // === מצב MEDIUM (רשימה ממוקדת) ===
    if (mode === "list") {
        // לוגיקה: 2 לפני, נוכחי, 2 אחרי
        // מוודאים גבולות
        let start = Math.max(0, nextIndex - 2);
        let end = Math.min(flatTimes.length, start + 5);
        
        // תיקון אם אנחנו ממש בסוף הרשימה
        if (end - start < 5 && start > 0) {
            start = Math.max(0, end - 5);
        }

        const subset = flatTimes.slice(start, end);

        const listStack = parent.addStack();
        listStack.layoutVertically();
        listStack.spacing = 5;

        for (let i = 0; i < subset.length; i++) {
            const item = subset[i];
            const isNext = (flatTimes.indexOf(item) === nextIndex);
            
            const row = listStack.addStack();
            row.layoutHorizontally();
            row.centerAlignContent();
            
            // אייקון
            const icon = SFSymbol.named(item.icon);
            const img = row.addImage(icon.image);
            img.imageSize = new Size(16, 16);
            img.tintColor = isNext ? new Color("#F39C12") : new Color("#D6EAF8");
            
            row.addSpacer(8);
            
            // שם הזמן
            addText(row, item.label, 16, isNext ? "bold" : "regular", isNext ? "#F39C12" : "#FFFFFF");
            
            row.addSpacer(); // דוחף את השעה שמאלה
            
            // שעה
            addText(row, formatTime(item.time), 16, isNext ? "bold" : "regular", isNext ? "#F39C12" : "#F7DC6F");
        }
    }
}

/* ===================== FETCH הכל (לריצה היומית) ===================== */

async function fetchAllData(location, today, tomorrow) {
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
    `https://www.sefaria.org/api/calendars?timezone=${encodeURIComponent(timeZone)}`
  );
  sefariaReq.headers = { accept: "application/json" };
  const sefariaRes = await sefariaReq.loadJSON();

  // חגים ואירועים
  const holidays = await fetchHolidaysAndEvents(
    location.latitude,
    location.longitude,
    today,
    tomorrow
  );

  // זמני שבת (רק אם יום שישי)
  const weekday = today.getDay(); // 5 = Friday
  let shabbatTimes = null;
  if (weekday === 5) {
    shabbatTimes = await fetchShabbatTimes(
      location.latitude,
      location.longitude,
      today
    );
  }

  return {
    zmanimToday,
    zmanimTomorrow,
    hebrewDate,
    hebrewDateTomorrow,
    parasha,
    sefariaRes,
    holidays,
    shabbatTimes
  };
}

////////////////////////////////////////////////////////////
// חגים ואירועים
////////////////////////////////////////////////////////////
async function fetchHolidaysAndEvents(lat, lon, today, tomorrow) {
  const startDate = formatYMD(today);
  const endDate = new Date(tomorrow);
  endDate.setDate(endDate.getDate() + 1);
  const endDateStr = formatYMD(endDate);

  const url = `https://www.hebcal.com/hebcal?cfg=json&geo=pos&latitude=${lat}&longitude=${lon}&tzid=Asia/Jerusalem&maj=on&min=on&mf=on&ss=on&c=on&start=${startDate}&end=${endDateStr}`;

  try {
    const req = new Request(url);
    const res = await req.loadJSON();

    const todayStr = formatYMD(today);
    const tomorrowStr = formatYMD(tomorrow);

    const todayEvents = [];
    const tomorrowEvents = [];

    for (const item of res.items) {
      // מתעלמים מהדלקת נרות והבדלה (כבר מוצגים בסעיף זמני שבת)
      if (item.category === "candles" || item.category === "havdalah") continue;

      const itemDate = item.date ? item.date.split("T")[0] : null;

      if (itemDate === todayStr) {
        todayEvents.push(item);
      } else if (itemDate === tomorrowStr) {
        tomorrowEvents.push(item);
      }
    }

    return { today: todayEvents, tomorrow: tomorrowEvents };
  } catch (e) {
    console.error("Error fetching holidays:", e);
    return { today: [], tomorrow: [] };
  }
}

function buildHolidayText(holidays) {
  const parts = [];

  // אירועי היום - מקסימום 2
  if (holidays.today.length > 0) {
    for (const event of holidays.today.slice(0, 2)) {
      const text = event.hebrew || event.title;
      parts.push(text);
    }
  }

  // אירועי מחר - מקסימום 1
  if (holidays.tomorrow.length > 0 && parts.length < 2) {
    for (const event of holidays.tomorrow.slice(0, 1)) {
      const text = event.hebrew || event.title;
      parts.push("מחר: " + text);
    }
  }

  return parts.join(" • ");
}

////////////////////////////////////////////////////////////
// טבלת זמני היום + מחר + זמני שבת (עבור LARGE / EXTRA LARGE)
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
  let nextTimeIndex = -1, minDiff = Infinity;
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

  // חישוב כמה שורות להציג בכל עמודה
  // הוספתי תנאי ל-Large שיהיה דומה ל-Extra Large מבחינת כמות פריטים
  const displayLimit = 11;

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
  if (showTomorrow) {
    leftCol.addSpacer(6);
    const sep = leftCol.addStack();
    addText(sep, "──────", 10, "regular", "#D6EAF8");

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

  // --- חלק ב: זמני שבת ---
  if (shabbatTimes && (shabbatTimes.candles || shabbatTimes.havdalah)) {
    leftCol.addSpacer(8);

    const sep = leftCol.addStack();
    addText(sep, "──────", 10, "regular", "#D6EAF8");

    leftCol.addSpacer(2);

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
  const items = (sefariaRes?.calendar_items || [])
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

  // ב-Large רגיל נציג כמו ב-XL
  const displayLimit = 11;

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
  return await req.loadJSON().then((res) => {
    let candles = null;
    let havdalah = null;

    for (const item of res.items || []) {
      if (item.category === "candles") candles = { title: item.hebrew, time: item.date };
      if (item.category === "havdalah") havdalah = { title: item.hebrew, time: item.date };
    }
    return { candles, havdalah };
  });
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
  if (typeof str === 'object' && str instanceof Date) {
      return str.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }
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
  const item = (res.items || []).find((i) => i.category === "parashat");
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

/* ===================== CACHE HELPERS ===================== */

function roundCoord(x, decimals) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(decimals));
}

function buildDailyCacheKey(dateYMD, lat, lon) {
  const rLat = roundCoord(lat, LOCATION_ROUND_DECIMALS);
  const rLon = roundCoord(lon, LOCATION_ROUND_DECIMALS);
  return `${CACHE_VERSION}|${dateYMD}|${rLat},${rLon}`;
}

function extractDateFromKey(key) {
  // format: "1|YYYY-MM-DD|lat,lon"
  const parts = String(key || "").split("|");
  return parts.length >= 3 ? parts[1] : "";
}

function getCachePath() {
  const fm = FileManager.local();
  return fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
}

function loadCacheStore() {
  const fm = FileManager.local();
  const path = getCachePath();
  if (!fm.fileExists(path)) return { version: CACHE_VERSION, entries: {} };

  try {
    const raw = fm.readString(path);
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return { version: CACHE_VERSION, entries: {} };
    if (obj.version !== CACHE_VERSION) return { version: CACHE_VERSION, entries: {} };
    if (!obj.entries || typeof obj.entries !== "object") return { version: CACHE_VERSION, entries: {} };
    return obj;
  } catch {
    return { version: CACHE_VERSION, entries: {} };
  }
}

function saveCacheStore(store) {
  const fm = FileManager.local();
  const path = getCachePath();
  fm.writeString(path, JSON.stringify(store));
}

function pruneOldEntries(store) {
  const now = Date.now();
  const maxAgeMs = CACHE_KEEP_DAYS * 24 * 60 * 60 * 1000;
  for (const [k, v] of Object.entries(store.entries || {})) {
    const t = Date.parse(v?.savedAt || "");
    if (!t || now - t > maxAgeMs) delete store.entries[k];
  }
}

function getCacheEntry(key) {
  const store = loadCacheStore();
  const entry = store.entries[key];
  if (!entry) return null;
  return { key, savedAt: entry.savedAt, payload: entry.payload };
}

function setCacheEntry(key, payload) {
  const store = loadCacheStore();
  store.entries[key] = {
    savedAt: new Date().toISOString(),
    payload
  };
  pruneOldEntries(store);
  saveCacheStore(store);
}

function getNewestCacheEntryWithinHours(maxHours) {
  const store = loadCacheStore();
  const entries = Object.entries(store.entries || {})
    .map(([key, v]) => ({ key, savedAt: v.savedAt, payload: v.payload }))
    .filter((e) => e.savedAt && e.payload);

  if (entries.length === 0) return null;

  entries.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
  const newest = entries[0];
  const ageMs = Date.now() - Date.parse(newest.savedAt);
  const maxMs = maxHours * 60 * 60 * 1000;

  return ageMs <= maxMs ? newest : null;
}

////////////////////////////////////////////////////////////
// הפעלה
////////////////////////////////////////////////////////////
await run();
