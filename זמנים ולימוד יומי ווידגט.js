// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: star-of-david;

////////////////////////////////////////////////////////////
// וידג׳ט משולב - זמני היום + זמני שבת + לוח לימוד יומי
// גרסה מותאמת לכל הגדלים עם גרדיאנטים דינמיים
////////////////////////////////////////////////////////////

// === הגדרות גרדיאנטים (צבעים ועומק) ===
// ניתן לשנות את קודי הצבעים (Hex) כדי להתאים לטעם אישי
const ZMANIM_GRADIENTS = {
  // עלות השחר
  // background: linear-gradient(to right, #00223E, #FFA17F)
  alotHaShachar: { colors: ["#00223E", "#FFA17F"], locations: [0, 1] },

  // זמן ציצית (משיכיר) – התבהרות שמיים
  // background: linear-gradient(to right, #3B4371, #F3904F)
  misheyakir: { colors: ["#3B4371", "#F3904F"], locations: [0, 1] },

  // הנץ החמה (זריחה) – אופק בהיר-כחול
  // background: linear-gradient(to right, #E5E5BE, #003973)
  sunrise: { colors: ["#E5E5BE", "#003973"], locations: [0, 1] },

  // בוקר
  // background: linear-gradient(to right, #2B32B2, #1488CC)
  morning: {
  colors: ["#094685", "#154F8C", "#205A97", "#29659F", "#3371AA", "#3C78B4", "#437FBB", "#4A86C2"],
  locations: [0, 0.14, 0.28, 0.42, 0.57, 0.71, 0.85, 1],
},


  // חצות היום / צהריים
  // background: linear-gradient(to right, #363795, #005C97)
  chatzotalt: {
  colors: ["#1D4C8D", "#4D78AE", "#7EA7D4", "#6993C4"],
  locations: [0, 0.45, 0.55, 1],
},
chatzot: {
  colors: ["#094685", "#154F8C", "#205A97", "#29659F", "#3371AA", "#3C78B4", "#437FBB", "#4A86C2"],
  locations: [0, 0.14, 0.28, 0.42, 0.57, 0.71, 0.85, 1],
},

  // מנחה (אחה"צ)
  mincha: {
  colors: ["#094685", "#154F8C", "#205A97", "#29659F", "#3371AA", "#3C78B4", "#437FBB", "#4A86C2"],
  locations: [0, 0.14, 0.28, 0.42, 0.57, 0.71, 0.85, 1],
},


  // פלג המנחה / לקראת שקיעה
  // background: linear-gradient(to right, #F56217, #0B486B)
  plagHaMincha: {
  colors: ["#1E4A7D", "#2A5A94", "#3D6FA8", "#5083BC", "#6290B0", "#739CAA", "#85A8B8", "#96B3C5", "#A5BED0"],
  locations: [0, 0.2, 0.35, 0.48, 0.58, 0.68, 0.78, 0.9, 1],
},




  // שקיעה
  sunset: {
  colors: ["#5B6E99", "#848BA7", "#B8ABA3"],
  locations: [0, 0.5, 1],
},


  // שקיעה → צאת
  // background: linear-gradient(to right, #C06C84, #6C5B7B, #355C7D)
  tzeitalt: {
  colors: ["#10162E", "#181E36", "#1C223C", "#1E253F", "#1F2642", "#292E4B", "#2C304B", "#373B58"],
  locations: [0, 0.14, 0.28, 0.42, 0.57, 0.71, 0.85, 1],
},

  tzeit: {
  colors: ["#11172F", "#151F38", "#1C233D", "#252C48", "#2D314E", "#303751", "#3B3F5A"],
  locations: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1],
  },
  // לילה
  night: {
  colors: ["#11172F", "#151F38", "#1C233D", "#252C48", "#2D314E", "#303751", "#3B3F5A"],
  locations: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1],
},

};

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


  // בדיקה אם צריך רקע שקוף
        const widget = new ListWidget();
  widget.setPadding(14, 14, 14, 14);

  // קודם כל מגדירים את wParam
  const wParam = (args.widgetParameter || "").toLowerCase();
  
  // ואז משתמשים בו
  const isAccessory = ["accessoryRectangular", "accessoryInline", "accessoryCircular"].includes(config.widgetFamily);
  const forceTransparent = wParam.includes("שקוף") || wParam.includes("shakuf");
  const useTransparent = isAccessory || forceTransparent;

  if (useTransparent) {
    // רקע שקוף
    widget.backgroundColor = new Color("#000000", 0);
  } else {
    // === חישוב הגרדיאנט הדינמי ===
    const activeGradient = getZmanimGradient(zmanimToday);
    
    const bgGradient = new LinearGradient();
    bgGradient.colors = activeGradient.colors.map(c => new Color(c));
    bgGradient.locations = activeGradient.locations;
    widget.backgroundGradient = bgGradient;
  }



  // --- חלק 1: כותרת עליונה (מוצגת בכל הגדלים) ---
    // --- חלק 1: כותרת עליונה (מוצגת בכל הגדלים חוץ מ-accessory) ---
  if (!isAccessory) {
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
    headerLabel.shadowColor = new Color("#000000", 0.4);
    headerLabel.shadowRadius = 2;
    
    if (config.widgetFamily === "small") headerLabel.centerAlignText();
    
    header.addSpacer();
    widget.addSpacer(config.widgetFamily === "small" ? 4 : 10);
  }
  // סוגר את ה-if - עכשיו הכותרת לא תוצג ב-accessory

  // --- חלק 2: תוכן לפי גודל הווידג׳ט ---
  const family = config.widgetFamily || "large"; // ברירת מחדל לדיבאג


if (isAccessory) {
    // === ACCESSORY: הצגת הזמן הבא בלבד (ללא כותרת) ===
    await buildFocusedZmanimTable(widget, zmanimToday, zmanimTomorrow, shabbatTimes, "single");

  } else if (family === "small") {
    // === SMALL: הצגת הזמן הבא בלבד (עם כותרת) ===
    await buildFocusedZmanimTable(widget, zmanimToday, zmanimTomorrow, shabbatTimes, "single");


  } else if (family === "large") {
    // === LARGE: בחירה בין זמנים ללימוד לפי פרמטר ===
    if (wParam.includes("limud") || wParam.includes("פרמטר לימוד")) {
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

/* ===================== פונקציות לוגיקת גרדיאנט ===================== */

// פונקציה ראשית לחישוב הגרדיאנט המתאים
function getZmanimGradient(zmanimToday) {
  // ברירת מחדל: יום רגיל
  let defaultGradient = ZMANIM_GRADIENTS.morning; 
  
  if (!zmanimToday || !zmanimToday.times) return defaultGradient;

  const times = zmanimToday.times;
  const now = new Date();

  // יצירת ציר זמן של טריגרים (Trigger Time = Time - 30 minutes)
  let timeline = [];

  // פונקציית עזר להוספה
  const addTrigger = (keyName, gradientObj) => {
      if (times[keyName]) {
          const zTime = new Date(times[keyName]);
          const trigger = new Date(zTime.getTime() - 30 * 60000); // 30 דקות לפני
          timeline.push({ trigger: trigger, gradient: gradientObj });
      }
  };

  // מיפוי זמנים לגרדיאנטים
  addTrigger("alotHaShachar", ZMANIM_GRADIENTS.alotHaShachar);
  addTrigger("misheyakir", ZMANIM_GRADIENTS.misheyakir);
  addTrigger("sunrise", ZMANIM_GRADIENTS.sunrise);
  addTrigger("sofZmanShma", ZMANIM_GRADIENTS.morning);
  addTrigger("chatzot", ZMANIM_GRADIENTS.chatzot);
  addTrigger("minchaGedola", ZMANIM_GRADIENTS.mincha);
  addTrigger("minchaKetana", ZMANIM_GRADIENTS.mincha);
  addTrigger("plagHaMincha", ZMANIM_GRADIENTS.plagHaMincha);
  addTrigger("sunset", ZMANIM_GRADIENTS.sunset);
  addTrigger("tzeit72min", ZMANIM_GRADIENTS.tzeit);

  // טיפול מיוחד ללילה: 30 דקות *אחרי* צאת הכוכבים
  if (times.tzeit72min) {
      const tzeitTime = new Date(times.tzeit72min);
      const nightTrigger = new Date(tzeitTime.getTime() + 30 * 60000);
      timeline.push({ trigger: nightTrigger, gradient: ZMANIM_GRADIENTS.night });
  } else if (times.sunset) {
     // גיבוי ללילה אם אין צאת 72
     const sunsetTime = new Date(times.sunset);
     const nightTrigger = new Date(sunsetTime.getTime() + 90 * 60000);
     timeline.push({ trigger: nightTrigger, gradient: ZMANIM_GRADIENTS.night });
  }

  // מיון לפי זמן
  timeline.sort((a, b) => a.trigger - b.trigger);

  // מציאת הגרדיאנט הפעיל האחרון
  let activeGradientResult = null;
  
  // בדיקה אם עכשיו זה לפני הבוקר (אחרי חצות הלילה ולפני עלות השחר)
  // במקרה כזה, אנחנו עדיין ב"לילה"
  if (timeline.length > 0 && now < timeline[0].trigger) {
      return ZMANIM_GRADIENTS.night;
  }

  for (let i = 0; i < timeline.length; i++) {
      if (now >= timeline[i].trigger) {
          activeGradientResult = timeline[i].gradient;
      } else {
          break;
      }
  }

  return activeGradientResult || defaultGradient;
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
    if (shabbatTimes) {
         if (shabbatTimes.candles) {
             // מכניסים לפי סדר כרונולוגי
             flatTimes.push({ label: "הדלקת נרות", key: "candles", icon: "flame.fill", time: new Date(shabbatTimes.candles.time), type: 'shabbat' });
         }
         if (shabbatTimes.havdalah) {
             flatTimes.push({ label: "הבדלה", key: "havdalah", icon: "moon.stars.fill", time: new Date(shabbatTimes.havdalah.time), type: 'shabbat' });
         }
    }

    // הוספת זמנים מרכזיים של מחר (עלות, הנץ, סוף זמן ק״ש) למקרה שהיום כבר הסתיים
    if (zmanimTomorrow && zmanimTomorrow.times) {
        const tmrwKeys = ["alotHaShachar", "sunrise", "sofZmanShma"];
        tmrwKeys.forEach(k => {
             const ref = importantTimes.find(x => x.key === k);
             if (ref && zmanimTomorrow.times[k]) {
                 flatTimes.push({ ...ref, label: ref.label + " (מחר)", time: new Date(zmanimTomorrow.times[k]), type: 'tomorrow' });
             }
        });
    }

    // מיון לפי סדר כרונולוגי
    flatTimes.sort((a, b) => a.time - b.time);

    // מציאת הזמן הבא
    let nextIndex = flatTimes.findIndex(item => item.time > now);
    if (nextIndex === -1) nextIndex = flatTimes.length - 1; // אם כל הזמנים עברו, מציג את האחרון

    // === SINGLE MODE: הצגת הזמן הבא בלבד (למכשיר קטן) ===
if (mode === "single") {
    const item = flatTimes[nextIndex];
    if (!item) return;
    
// בדיקה אם זה accessoryInline או accessoryRectangular (פריסה אופקית)
const isInline = config.widgetFamily === "accessoryInline" || config.widgetFamily === "accessoryRectangular";

    
    if (isInline) {
        // פריסה אופקית עבור accessoryInline
        const mainStack = parent.addStack();
        mainStack.layoutHorizontally();
        mainStack.centerAlignContent();
        
        const iconSymbol = SFSymbol.named(item.icon);
        const iconImg = mainStack.addImage(iconSymbol.image);
        iconImg.imageSize = new Size(20, 20);
        iconImg.tintColor = new Color("#F39C12");
        
        mainStack.addSpacer(6);
        
        const textStack = mainStack.addStack();
        textStack.layoutVertically();
        textStack.centerAlignContent();
        
        const lbl = addText(textStack, item.label, 14, "semibold", "#FFFFFF");
        lbl.lineLimit = 1;
        
        const timeLbl = addText(textStack, formatTime(item.time), 18, "bold", "#F39C12");
        
    } else {
        // פריסה אנכית עבור small ו-accessoryCircular
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
        const lbl = addText(stack, item.label, 16, "bold", "#FFFFFF");
        lbl.centerAlignText();
        lbl.shadowColor = new Color("#000000", 0.3);
        lbl.shadowRadius = 2;
        
        stack.addSpacer(4);
        const timeLbl = addText(stack, formatTime(item.time), 26, "regular", "#F39C12");
        timeLbl.centerAlignText();
        timeLbl.shadowColor = new Color("#000000", 0.3);
        timeLbl.shadowRadius = 2;
        
        parent.addSpacer();
    }
    return;
}


    // === LIST MODE: הצגת רשימה ממוקדת (עכשיו +- 2) למכשיר בינוני ===
    if (mode === "list") {
        // מציאת חלון של 5 זמנים: הזמן הבא ועוד 2 לפניו ו-2 אחריו
        let start = Math.max(0, nextIndex - 2);
        let end = Math.min(flatTimes.length, start + 5);
        
        // אם לא מספיק זמנים אחרי, נמשוך עוד לפני
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
            
            const icon = SFSymbol.named(item.icon);
            const img = row.addImage(icon.image);
            img.imageSize = new Size(16, 16);
            img.tintColor = isNext ? new Color("#F39C12") : new Color("#D6EAF8");
            
            row.addSpacer(8);
            
            const txt = addText(row, item.label, 16, isNext ? "bold" : "regular", isNext ? "#F39C12" : "#FFFFFF");
            // הוספת צל
            txt.shadowColor = new Color("#000000", 0.2);
            txt.shadowRadius = 1;
            
            row.addSpacer();
            
            const timeText = addText(row, formatTime(item.time), 16, isNext ? "bold" : "regular", isNext ? "#F39C12" : "#FFFFFF");
            // הוספת צל
            timeText.shadowColor = new Color("#000000", 0.2);
            timeText.shadowRadius = 1;
        }
    }
}

/* ===================== פונקציות תצוגה (Large/ExtraLarge) ===================== */


// החלף את הפונקציה buildZmanimTable בקוד שלך עם הגרסה המתוקנת הזו:

async function buildZmanimTable(parent, zmanimToday, zmanimTomorrow, hebrewDateTomorrow, shabbatTimes) {
  if (!zmanimToday || !zmanimToday.times) return;

  const now = new Date();
  const times = zmanimToday.times;

  const zmanimList = [
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

  // מערך עזר למציאת הזמן הבא
  const timeArray = zmanimList
    .map(z => ({ ...z, time: times[z.key] ? new Date(times[z.key]) : null }))
    .filter(z => z.time !== null);

  let nextZman = timeArray.find(z => z.time > now);

  // ** חישוב דינמי של התוכן הכולל **
  let totalItems = zmanimList.length; // 11 זמנים רגילים
  
  // הוספת זמני מחר אם רלוונטי
  if (!nextZman && zmanimTomorrow && hebrewDateTomorrow) {
    totalItems += 4; // כותרת + 3 זמנים של מחר
  }
  
  // הוספת זמני שבת אם קיימים
  if (shabbatTimes) {
    if (shabbatTimes.candles) totalItems += 1;
    if (shabbatTimes.havdalah) totalItems += 1;
  }
  
  // חלוקה לחצי - העמודה הימנית מקבלת את השארית
  const midpoint = Math.ceil(totalItems / 2);

  // בניית הטבלה
  const rows = parent.addStack();
  rows.layoutHorizontally();
  rows.spacing = 10;

  // עמודה ימנית
  const rightCol = rows.addStack();
  rightCol.layoutVertically();
  rightCol.spacing = 6;

  // עמודה שמאלית
  const leftCol = rows.addStack();
  leftCol.layoutVertically();
  leftCol.spacing = 6;

  let itemCounter = 0;

  // הוספת זמני היום
  for (let i = 0; i < zmanimList.length; i++) {
    const z = zmanimList[i];
    const isNext = nextZman && nextZman.key === z.key;
    const container = itemCounter < midpoint ? rightCol : leftCol;
    
    await createZmanRow(container, z.label, times[z.key], z.icon, isNext);
    itemCounter++;
  }

  // הוספת שורת מחר אם כל הזמנים של היום עברו
  if (!nextZman && zmanimTomorrow && hebrewDateTomorrow) {
    const container = itemCounter < midpoint ? rightCol : leftCol;
    
    container.addSpacer(8);
    const tmrwHeader = container.addStack();
    tmrwHeader.layoutHorizontally();
    tmrwHeader.centerAlignContent();
    const calIcon = SFSymbol.named("calendar");
    const calImg = tmrwHeader.addImage(calIcon.image);
    calImg.imageSize = new Size(14, 14);
    calImg.tintColor = new Color("#F39C12");
    tmrwHeader.addSpacer(4);
    const tmrwTxt = addText(tmrwHeader, hebrewDateTomorrow, 14, "semibold", "#F39C12");
    tmrwTxt.shadowColor = new Color("#000000", 0.2);
    tmrwTxt.shadowRadius = 1;
    itemCounter++;
    
    container.addSpacer(4);
    const tmrwZmanimList = [
      { label: "עלות השחר", key: "alotHaShachar", icon: "sunrise" },
      { label: "הנץ החמה", key: "sunrise", icon: "sun.min.fill" },
      { label: "סוף זמן ק״ש", key: "sofZmanShma", icon: "text.book.closed.fill" }
    ];
    for (const z of tmrwZmanimList) {
      const tContainer = itemCounter < midpoint ? rightCol : leftCol;
      await createZmanRow(tContainer, z.label, zmanimTomorrow.times[z.key], z.icon, false);
      itemCounter++;
    }
  }

// הוספת שורת שבת
if (shabbatTimes) {
  const container = itemCounter < midpoint ? rightCol : leftCol;
  
  // כותרת "זמני שבת"
  container.addSpacer(8);
  const shabbatHeader = container.addStack();
  shabbatHeader.layoutHorizontally();
  shabbatHeader.centerAlignContent();
  const shabbatIcon = SFSymbol.named("star.fill");
  const shabbatImg = shabbatHeader.addImage(shabbatIcon.image);
  shabbatImg.imageSize = new Size(14, 14);
  shabbatImg.tintColor = new Color("#F39C12");
  shabbatHeader.addSpacer(4);
  const shabbatTxt = addText(shabbatHeader, "זמני שבת", 14, "semibold", "#F39C12");
  shabbatTxt.shadowColor = new Color("#000000", 0.2);
  shabbatTxt.shadowRadius = 1;
  itemCounter++;
  container.addSpacer(4);
  
  if (shabbatTimes.candles) {
    const cContainer = itemCounter < midpoint ? rightCol : leftCol;
    const row = cContainer.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    const sym = SFSymbol.named("flame.fill");
    const img = row.addImage(sym.image);
    img.imageSize = new Size(12, 12);
    img.tintColor = new Color("#D6EAF8");
    row.addSpacer(4);
    const t1 = addText(row, "הדלקת נרות", 14, "regular", "#FFFFFF");
    t1.shadowColor = new Color("#000000", 0.2);
    t1.shadowRadius = 1;
    row.addSpacer(4);
    const t2 = addText(row, formatTime(shabbatTimes.candles.time), 14, "bold", "#F7DC6F");
    t2.shadowColor = new Color("#000000", 0.2);
    t2.shadowRadius = 1;
    itemCounter++;
  }
  
  if (shabbatTimes.havdalah) {
    const hContainer = itemCounter < midpoint ? rightCol : leftCol;
    const row = hContainer.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    const sym = SFSymbol.named("moon.stars.fill");
    const img = row.addImage(sym.image);
    img.imageSize = new Size(12, 12);
    img.tintColor = new Color("#D6EAF8");
    row.addSpacer(4);
    const t1 = addText(row, "הבדלה", 14, "regular", "#FFFFFF");
    t1.shadowColor = new Color("#000000", 0.2);
    t1.shadowRadius = 1;
    row.addSpacer(4);
    const t2 = addText(row, formatTime(shabbatTimes.havdalah.time), 14, "bold", "#F7DC6F");
    t2.shadowColor = new Color("#000000", 0.2);
    t2.shadowRadius = 1;
        itemCounter++;
  }
}
}

    

async function createZmanRow(parent, label, timeStr, iconName, isNext) {
  if (!timeStr) return;

  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const iconSymbol = SFSymbol.named(iconName);
  const iconEl = row.addImage(iconSymbol.image);
  iconEl.imageSize = new Size(12, 12);
  iconEl.tintColor = isNext ? new Color("#F39C12") : new Color("#D6EAF8");

  row.addSpacer(4);
  
  const lblTxt = addText(row, label, 18, isNext ? "bold" : "regular", isNext ? "#F39C12" : "#FFFFFF");
  // הוספת צל
  lblTxt.shadowColor = new Color("#000000", 0.2);
  lblTxt.shadowRadius = 1;
  
  row.addSpacer();
  
  const timeTxt = addText(row, formatTime(timeStr), 18, isNext ? "bold" : "regular", isNext ? "#F39C12" : "#FFFFFF");
  // הוספת צל
  timeTxt.shadowColor = new Color("#000000", 0.2);
  timeTxt.shadowRadius = 1;
}

////////////////////////////////////////////////////////////
// בניית טבלת לימוד יומי
////////////////////////////////////////////////////////////

function buildHolidayText(holidays) {
  const parts = [];
  
  if (holidays.today && holidays.today.length > 0) {
    const todayNames = holidays.today.map(h => h.hebrew).join(", ");
    parts.push(todayNames);
  }
  
  if (holidays.tomorrow && holidays.tomorrow.length > 0) {
    const tmrwNames = holidays.tomorrow.map(h => h.hebrew).join(", ");
    parts.push("מחר: " + tmrwNames);
  }
  
  return parts.join(" • ");
}

async function fetchAllData(location, today, tomorrow) {
  const todayStr = formatYMD(today);
  const tomorrowStr = formatYMD(tomorrow);

  const [zmanimToday, zmanimTomorrow, hebrewDate, hebrewDateTomorrow, parasha, sefariaRes, holidays, shabbatTimes] =
    await Promise.all([
      fetchHalachicTimes(location.latitude, location.longitude, todayStr),
      fetchHalachicTimes(location.latitude, location.longitude, tomorrowStr),
      getHebrewDate(today),
      getHebrewDate(tomorrow),
      getParasha(today),
      fetchSefariaCalendar(todayStr),
      fetchHolidays(location.latitude, location.longitude, today),
      fetchShabbatTimes(location.latitude, location.longitude, today)
    ]);

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

async function fetchSefariaCalendar(dateStr) {
  const url = `https://www.sefaria.org/api/calendars?diaspora=1`;
  const req = new Request(url);
  const res = await req.loadJSON();
  return res;
}

async function fetchHolidays(lat, lon, date) {
  const start = formatYMD(date);
  const end = formatYMD(new Date(date.getTime() + 2 * 24 * 60 * 60 * 1000)); // +2 ימים

  const url = `https://www.hebcal.com/hebcal?cfg=json&v=1&c=on&M=on&s=on&latitude=${lat}&longitude=${lon}&tzid=Asia/Jerusalem&start=${start}&end=${end}`;
  const req = new Request(url);
  const res = await req.loadJSON();

  const todayStart = new Date(date);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(date);
  todayEnd.setHours(23, 59, 59, 999);

  const tomorrowStart = new Date(date);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const today = [];
  const tomorrow = [];

  for (const item of res.items || []) {
    if (item.category === "holiday" && item.hebrew) {
      const itemDate = new Date(item.date);
      if (itemDate >= todayStart && itemDate <= todayEnd) {
        today.push(item);
      } else if (itemDate >= tomorrowStart && itemDate <= tomorrowEnd) {
        tomorrow.push(item);
      }
    }
  }

  return { today, tomorrow };
}

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
      const ap = pr[a.category] || 999;
      const bp = pr[b.category] || 999;
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
  const t1 = addText(titleRow, item.title.he || item.title.en, 16, "semibold", "#FFFFFF");
  // הוספת צל
  t1.shadowColor = new Color("#000000", 0.2);
  t1.shadowRadius = 1;

  let displayInfo = item.displayValue?.he || item.heRef || "";

  if (displayInfo) {
    const infoRow = itemStack.addStack();
    infoRow.layoutHorizontally();
    infoRow.addSpacer(18);
    const t2 = addText(infoRow, displayInfo, 14, "regular", "#F7DC6F");
    // הוספת צל
    t2.shadowColor = new Color("#000000", 0.2);
    t2.shadowRadius = 1;
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