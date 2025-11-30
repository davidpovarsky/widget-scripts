// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: brown; icon-glyph: magic;
// icon-color: deep-purple; icon-glyph: book.fill;
// ווידג'ט: לוח לימוד יומי בלבד

////////////////////////////////////////////////////////////
// הפעלה
////////////////////////////////////////////////////////////
await run();

async function run() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const req = new Request(
    `https://www.sefaria.org/api/calendars?timezone=${encodeURIComponent(
      timeZone
    )}`
  );
  req.headers = { accept: "application/json" };
  const sefariaRes = await req.loadJSON();

  const widget = new ListWidget();
  widget.setPadding(16, 16, 16, 16);

  const gradient = new LinearGradient();
  gradient.colors = [new Color("#4A235A"), new Color("#7D3C98")];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;

  const header = widget.addStack();
  header.centerAlignContent();
  header.addSpacer();

  addText(header, "לוח לימוד יומי", 20, "bold", "#FFFFFF");

  header.addSpacer();
  widget.addSpacer(10);

  await buildSefariaTable(widget, sefariaRes);

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentLarge();
  Script.complete();
}

////////////////////////////////////////////////////////////
// בניית טבלת פריטי הלימוד
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
      return (pr[a.category] || 999) - (pr[b.category] || 999);
    });

  const rows = parent.addStack();
  rows.layoutHorizontally();
  rows.spacing = 10;

  const rightCol = rows.addStack();
  rightCol.layoutVertically();
  rightCol.spacing = 10;

  const leftCol = rows.addStack();
  leftCol.layoutVertically();
  leftCol.spacing = 10;

  const limit =
    config.widgetFamily === "small"
      ? 6
      : config.widgetFamily === "medium"
      ? 10
      : 18;

  let currentCol = rightCol;
  const perCol = Math.ceil(limit / 2);

  for (let i = 0; i < Math.min(limit, items.length); i++) {
    if (i === perCol) currentCol = leftCol;
    await createItemRow(currentCol, items[i]);
  }
}

async function createItemRow(parent, item) {
  const row = parent.addStack();
  row.layoutVertically();
  row.spacing = 2;

  const titleRow = row.addStack();
  titleRow.centerAlignContent();

  const iconSymbol = SFSymbol.named(getCategoryIcon(item.category));
  const iconEl = titleRow.addImage(iconSymbol.image);
  iconEl.imageSize = new Size(14, 14);
  iconEl.tintColor = new Color("#D6EAF8");

  titleRow.addSpacer(4);
  addText(titleRow, item.title.he, 16, "semibold", "#FFFFFF");

  if (item.displayValue?.he || item.heRef) {
    const info = row.addStack();
    info.addSpacer(18);
    addText(info, item.displayValue?.he || item.heRef, 14, "regular", "#F7DC6F");
  }

  if (item.url) row.url = `https://www.sefaria.org/${item.url}`;
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

function addText(stack, text, size, weight, color) {
  const t = stack.addText(text);
  t.textColor = new Color(color);
  if (weight === "bold") t.font = Font.boldSystemFont(size);
  else if (weight === "semibold") t.font = Font.semiboldSystemFont(size);
  else t.font = Font.systemFont(size);
}