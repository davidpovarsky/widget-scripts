// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: magic;
// icon-color: purple; icon-glyph: compass;
// וידג'ט: כיוון ירושלים

const JERUSALEM = { lat: 31.778, lon: 35.235 };
await run();

async function run() {
  const loc = await Location.current();

  const bearing = getBearing(
    loc.latitude,
    loc.longitude,
    JERUSALEM.lat,
    JERUSALEM.lon
  );

  const widget = new ListWidget();
  widget.backgroundGradient = gradient();
  widget.setPadding(16, 16, 16, 16);

  const title = widget.addText("כיוון ירושלים");
  title.textColor = Color.white();
  title.font = Font.semiboldSystemFont(16);

  widget.addSpacer(8);

  const arrow = arrowForBearing(bearing);
  const arr = widget.addText(arrow);
  arr.font = Font.boldSystemFont(50);
  arr.textColor = Color.white();
  arr.centerAlignText();

  widget.addSpacer(4);

  const txt = widget.addText(`${bearing.toFixed(0)}°`);
  txt.textColor = new Color("#FFE394");
  txt.font = Font.mediumSystemFont(15);
  txt.centerAlignText();

  if (config.runsInWidget) Script.setWidget(widget);
  else widget.presentSmall();
  Script.complete();
}

function arrowForBearing(b) {
  const arrows = [
    {deg:0, s:"⬆️"},
    {deg:45, s:"↗️"},
    {deg:90, s:"➡️"},
    {deg:135, s:"↘️"},
    {deg:180, s:"⬇️"},
    {deg:225, s:"↙️"},
    {deg:270, s:"⬅️"},
    {deg:315, s:"↖️"},
  ];
  return arrows.reduce((a,c)=> Math.abs(c.deg-b)<Math.abs(a.deg-b)?c:a).s;
}

function getBearing(lat1, lon1, lat2, lon2) {
  const toRad = x => (x*Math.PI/180);
  const y = Math.sin(toRad(lon2-lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2-lon1));
  return (Math.atan2(y,x)*180/Math.PI + 360) % 360;
}

function gradient() {
  const g = new LinearGradient();
  g.colors = [new Color("#3A0CA3"), new Color("#7209B7")];
  g.locations = [0, 1];
  return g;
}