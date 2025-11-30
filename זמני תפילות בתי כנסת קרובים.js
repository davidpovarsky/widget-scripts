// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: synagogue;
// icon-color: blue; icon-glyph: synagogue;
// וידג'ט: זמני תפילות לפי בית הכנסת הקרוב (גרסה מתוקנת)

const FILE = "shuls_times.json";
await run();

async function run() {
  const loc = await Location.current();

  const fm = FileManager.iCloud();
  const path = fm.joinPath(fm.documentsDirectory(), FILE);
  await fm.downloadFileFromiCloud(path);
  const list = JSON.parse(fm.readString(path));

  // מציאת בית הכנסת הקרוב
  let best = null;
  let bestDist = Infinity;

  for (let shul of list) {
    const d = distance(
      loc.latitude,
      loc.longitude,
      shul.lat,
      shul.lon
    );
    if (d < bestDist) {
      bestDist = d;
      best = shul;
    }
  }

  const now = new Date();
  let next = null;

  // חישוב תפילה קרובה היום
  for (let [name, timeStr] of Object.entries(best.times)) {
    const [h, m] = timeStr.split(":");
    const t = new Date();
    t.setHours(h, m, 0, 0);

    if (t > now && (!next || t < next.t)) {
      next = { label: name, t };
    }
  }

  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1F3A93");
  widget.setPadding(16, 16, 16, 16);

  const title = widget.addText("תפילה קרובה");
  title.font = Font.semiboldSystemFont(16);
  title.textColor = Color.white();

  widget.addSpacer(6);

  const n = widget.addText(best.name);
  n.font = Font.mediumSystemFont(14);
  n.textColor = Color.white();

  const dist = Math.round(bestDist);
  const d = widget.addText(`מרחק: ~${dist} מ׳`);
  d.font = Font.mediumSystemFont(12);
  d.textColor = Color.lightGray();

  widget.addSpacer(10);

  // 🔥 טיפול במקרה שאין תפילה קרובה היום
  if (!next) {
    const noMore = widget.addText("אין תפילות נוספות היום");
    noMore.font = Font.boldSystemFont(16);
    noMore.textColor = new Color("#FFE28A");

    // מציג את שחרית של מחר (אם מוגדר)
    if (best.times.shacharit) {
      const [h, m] = best.times.shacharit.split(":");
      const tmr = new Date();
      tmr.setDate(tmr.getDate() + 1);
      tmr.setHours(h, m, 0, 0);

      widget.addSpacer(6);

      const z = widget.addText(`מחר: שחרית ${format(tmr)}`);
      z.font = Font.mediumSystemFont(14);
      z.textColor = Color.white();
    }

    if (config.runsInWidget) Script.setWidget(widget);
    else widget.presentSmall();
    Script.complete();
    return;
  }

  // 🔔 תפילה קרובה תקינה
  const row = widget.addText(
    `→ ${labelHeb(next.label)}: ${format(next.t)}`
  );
  row.textColor = new Color("#FFF79A");
  row.font = Font.boldSystemFont(17);

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentSmall();
  Script.complete();
}

// ============ פונקציות עזר ============

function labelHeb(en) {
  return {
    shacharit: "שחרית",
    mincha: "מנחה",
    arvit: "ערבית"
  }[en] || en;
}

function format(d) {
  return d.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}