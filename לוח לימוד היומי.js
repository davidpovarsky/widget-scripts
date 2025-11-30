// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: magic;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: magic;
// Sefaria Daily Learning Widget - עם עיצוב דומה לווידג'ט זמני היום
// 1. הוסף פונקציה חדשה לקבלת התאריך העברי
async function getHebrewDate() {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const request = new Request(`https://www.hebcal.com/converter?cfg=json&gy=${year}&gm=${month}&gd=${day}&g2h=1`);
    const response = await request.loadJSON();
    
    if (response && response.hebrew) {
      return response.hebrew;
    }
    
    // גיבוי - אם לא הצליח לקבל מהAPI
    return formatHebrewDateFallback();
    
  } catch (error) {
    console.log("Error fetching Hebrew date:", error);
    return formatHebrewDateFallback();
  }
}

// 2. פונקציית גיבוי לתאריך עברי בסיסי
function formatHebrewDateFallback() {
  const date = new Date();
  const hebrewDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const hebrewMonths = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
  ];
  
  const dayOfWeek = hebrewDays[date.getDay()];
  const day = date.getDate();
  const month = hebrewMonths[date.getMonth()];
  
  return `${dayOfWeek}, ${day} ב${month}`;
}
async function createWidget() {
  const widget = new ListWidget()
  
  // הגדרת רקע הווידג'ט - דומה לזמני היום
  try {
    // רקע גרדיאנט כמו בזמני היום
    const gradient = new LinearGradient();
    gradient.colors = [
      new Color("#1A5276"),
      new Color("#2874A6")
    ];
    gradient.locations = [0, 1];
    widget.backgroundGradient = gradient;
  } catch (error) {
    // רקע גרדיאנט כגיבוי
    const gradient = new LinearGradient();
    gradient.colors = [
      new Color("#1A5276"),
      new Color("#2874A6")
    ];
    gradient.locations = [0, 1];
    widget.backgroundGradient = gradient;
  }
  
  // הוספת שכבת צל כהה לשיפור קריאות הטקסט - כמו בזמני היום
  widget.backgroundColor = new Color("#000000", 0.3);
  widget.setPadding(16, 16, 16, 16);
  
  try {
    // Fetch data from Sefaria API
// זיהוי אזור הזמן המקומי ושליחה לשרת
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const request = new Request(`https://www.sefaria.org/api/calendars?timezone=${encodeURIComponent(timeZone)}`)
    request.headers = { "accept": "application/json" }
    const response = await request.loadJSON()
    
    // כותרת הווידג'ט - כמו בזמני היום
    const headerStack = widget.addStack();
    headerStack.layoutHorizontally();
    headerStack.centerAlignContent();
    headerStack.spacing = 6;
    
    // אייקון ספר תורה
    const sfSymbol = SFSymbol.named("book.fill");
    const imageElement = headerStack.addImage(sfSymbol.image);
    imageElement.imageSize = new Size(22, 22);
    imageElement.tintColor = Color.white();
    
    // כותרת
    addText(headerStack, "לוח לימוד יומי", 18, "bold", "#FFFFFF");
    
    widget.addSpacer(6);
    
    // תאריך עברי
    const dateStack = widget.addStack();
    dateStack.layoutHorizontally();
    dateStack.centerAlignContent();
    dateStack.spacing = 4;
    
    // אייקון לוח שנה
    const calendarSymbol = SFSymbol.named("calendar");
    const calendarImage = dateStack.addImage(calendarSymbol.image);
    calendarImage.imageSize = new Size(14, 14);
    calendarImage.tintColor = new Color("#F4D03F");
    
    // תאריך עברי
const hebrewDateText = await getHebrewDate();
addText(dateStack, hebrewDateText, 14, "semibold", "#FFFFFF", 0.95);
    
    widget.addSpacer(10);
    
    // Sort items by category first, then by order
    const sortedItems = response.calendar_items
      .filter(item => item.title && item.title.he)
      .sort((a, b) => {
        // First sort by category priority
        const categoryPriority = {
          "Tanakh": 1,
          "Talmud": 2, 
          "Halakha": 3,
          "Midrash": 4,
          "Liturgy": 5,
          "Parshanut": 6,
          "Philosophy": 7,
          "Chasidut": 8,
          "Musar": 9,
          "Kabbalah": 10,
          "Responsa": 11
        }
        
        const aPriority = categoryPriority[a.category] || 999
        const bPriority = categoryPriority[b.category] || 999
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }
        
        // Then sort by order within category
        return (a.order || 0) - (b.order || 0)
      })
    
    // Determine layout based on widget size
    const widgetFamily = config.widgetFamily || "medium"
    
    if (widgetFamily === "small") {
      // Small widget - single column, show first items
      await createSmallWidgetLayout(widget, sortedItems)
    } else {
      // Medium/Large widget - two columns like זמני היום
      await createMediumWidgetLayout(widget, sortedItems)
    }
    
  } catch (error) {
    // Error handling - בסגנון זמני היום
    addText(widget, "לא ניתן לקבל נתונים כרגע", 14, "regular", "#FFFFFF");
  }
  
  return widget
}

async function createSmallWidgetLayout(widget, items) {
  // הגדרת מספר הפריטים להצגה
  const displayLimit = Math.min(6, items.length);
  
  for (let i = 0; i < displayLimit; i++) {
    const item = items[i]
    await createItemRow(widget, item)
  }
}

async function createMediumWidgetLayout(widget, items) {
  // חלוקת הפריטים לשתי עמודות - כמו בזמני היום
  const rowsStack = widget.addStack();
  rowsStack.layoutHorizontally();
  rowsStack.spacing = 10;
  
  // עמודה ימנית
  const rightColumnStack = rowsStack.addStack();
  rightColumnStack.layoutVertically();
  rightColumnStack.spacing = 8;
  rightColumnStack.size = new Size(widget.width / 2 - 15, 0);
  
  // עמודה שמאלית
  const leftColumnStack = rowsStack.addStack();
  leftColumnStack.layoutVertically();
  leftColumnStack.spacing = 8;
  leftColumnStack.size = new Size(widget.width / 2 - 15, 0);
  
  // הגדרת מספר הפריטים בהתאם לגודל הווידג'ט
  const displayLimit = config.widgetFamily === "small" ? 6 : 
                       (config.widgetFamily === "medium" ? 10 : 11);
  
  // מציין איזה עמודה להשתמש
  let currentColumn = rightColumnStack;
  
  // מספר הפריטים בכל עמודה
  const itemsPerColumn = Math.ceil(Math.min(displayLimit, items.length) / 2);
  
  // הוספת הפריטים
  for (let i = 0; i < Math.min(displayLimit, items.length); i++) {
    // בדיקה אם צריך לעבור לעמודה השנייה
    if (i === itemsPerColumn) {
      currentColumn = leftColumnStack;
    }
    
    await createItemRow(currentColumn, items[i])
  }
}

async function createItemRow(parentStack, item) {
  const itemStack = parentStack.addStack();
  itemStack.layoutVertically(); // שינוי מ-layoutHorizontally ל-layoutVertically
  itemStack.spacing = 2; // מרווח קטן בין השורות
  
  // שורה ראשונה - כותרת עם אייקון
  const titleRow = itemStack.addStack();
  titleRow.layoutHorizontally();
  titleRow.centerAlignContent();
  
  // אייקון מתאים לקטגוריה
  const iconSymbol = SFSymbol.named(getCategoryIcon(item.category));
  const iconElement = titleRow.addImage(iconSymbol.image);
  iconElement.imageSize = new Size(14, 14);
  iconElement.tintColor = new Color("#D6EAF8");
  
  titleRow.addSpacer(4);
  
  // שם הפריט (כותרת)
  addText(titleRow, item.title.he || item.title.en, 16, "semibold", "#FFFFFF");
  
  // שורה שנייה - מידע נוסף (מקור)
let displayInfo = "";
if (item.displayValue && item.displayValue.he) {
  displayInfo = item.displayValue.he;
} else if (item.heRef) {
  displayInfo = item.heRef;
}

if (displayInfo) {
  const infoRow = itemStack.addStack();
  infoRow.layoutHorizontally();
  infoRow.addSpacer(18); // הזחה כדי ליישר עם הטקסט מעל
  addText(infoRow, displayInfo, 14, "regular", "#F7DC6F");
}
  
  // Make entire item clickable
  if (item.url) {
    const fullUrl = `https://www.sefaria.org/${item.url}`;
    itemStack.url = fullUrl;
  }
}

function getCategoryIcon(category) {
  const categoryIcons = {
    "Tanakh": "book.closed.fill",
    "Talmud": "books.vertical.fill", 
    "Halakha": "scale.3d",
    "Midrash": "text.book.closed.fill",
    "Kabbalah": "sparkles",
    "Liturgy": "person.2.fill",
    "Philosophy": "brain.head.profile",
    "Parshanut": "magnifyingglass",
    "Chasidut": "heart.fill",
    "Musar": "lightbulb.fill",
    "Responsa": "questionmark.circle.fill"
  }
  
  return categoryIcons[category] || "book.fill";
}

function formatHebrewDate(dateString) {
  const date = new Date(dateString)
  const hebrewDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
  const hebrewMonths = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
  ]
  
  const dayOfWeek = hebrewDays[date.getDay()]
  const day = date.getDate()
  const month = hebrewMonths[date.getMonth()]
  
  return `${dayOfWeek}, ${day} ב${month}`
}

// פונקציית עזר לעיצוב טקסט בווידג'ט - זהה לזמני היום
function addText(stack, text, fontSize, fontWeight, textColor, textOpacity = 1) {
  const textElement = stack.addText(text);
  textElement.font = Font.systemFont(fontSize);
  textElement.textColor = new Color(textColor, textOpacity);
  
  if (fontWeight === "bold") {
    textElement.font = Font.boldSystemFont(fontSize);
  } else if (fontWeight === "semibold") {
    textElement.font = Font.semiboldSystemFont(fontSize);
  }
  
  return textElement;
}

// Main execution
if (config.runsInWidget) {
  const widget = await createWidget()
  Script.setWidget(widget)
} else {
  const widget = await createWidget()
  if (config.widgetFamily === "small") {
    widget.presentSmall()
  } else {
    widget.presentMedium()
  }
}

Script.complete()