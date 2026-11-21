// =============================================
// basemap.js — 地圖底圖切換（Leaflet 用）
//
// 預設使用 CARTO Positron（冷藍色調）。可用網址參數 ?basemap=xxx 臨時切換，方便並排比較：
//   （不帶參數）/ ?basemap=carto  CARTO Positron 點陣圖磚（淺灰白、安靜，需免費 key，見下方 CARTO_KEY）
//   ?basemap=osm    OpenStreetMap 官方點陣圖磚（原本的樣子）
//   ?basemap=voyager CARTO Voyager 點陣圖磚（有顏色、資訊較多，同一把 key）
//   ?basemap=ofm    OpenFreeMap 向量圖磚（免費、免 key、不限流量），載入後由前端改成暖色調
//
// ofm 模式靠 maplibre-gl + @maplibre/maplibre-gl-leaflet 外掛：地圖底圖由 WebGL 畫，
// 但標記／popup／事件仍然是原本的 Leaflet，所以 map.js 其餘程式不用動。
// 任何一步失敗（外掛載不到、沒有 WebGL、WebGL context 遺失）都會退回 OSM 點陣圖磚。
// =============================================

// 到 https://carto.com/basemaps/apikey 申請（免費、免 CARTO 帳號）。
// 這種 key 本來就會出現在前端程式碼裡，不是機密；留空時 carto 模式會自動退回 OSM。
const CARTO_KEY = 'cb1_5dg8_1_c5821778aa67d0794c2b1576';

const MAPLIBRE_JS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
const MAPLIBRE_LEAFLET_JS = 'https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js';
const OFM_STYLE = 'https://tiles.openfreemap.org/styles/positron';

// 暖米色色票（跟網站 UI 同一個調性：低飽和、偏暖灰）。想換風格只改這裡。
export const PALETTE = {
  land: '#efece4',
  landuse: '#ebe7dd',
  park: '#dfe3d2',
  water: '#c9d6d8',
  building: '#e4dfd3',
  roadFill: '#fdfcf8',
  roadCase: '#ddd8cc',
  rail: '#d2cdc1',
  boundary: '#c9c3b7',
  label: '#6b665c',
  labelHalo: '#efece4',
};

export function getBasemapMode() {
  try {
    const v = new URLSearchParams(location.search).get('basemap');
    return v === 'osm' || v === 'voyager' || v === 'ofm' ? v : 'carto';
  } catch (e) {
    return 'carto';
  }
}

function addOsm(map) {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19,
  }).addTo(map);
}

// CARTO 點陣圖磚：把「底圖（不含文字）」跟「地名標籤」拆成兩層，標籤可以單獨開關。
// style: 'light'（Positron，淺灰白）或 'voyager'（有顏色）
const LABELS_KEY = 'kado_map_labels';

function addCarto(map, style = 'light') {
  if (!CARTO_KEY) {
    console.warn('[basemap] CARTO_KEY 是空的，退回 OSM（到 carto.com/basemaps/apikey 申請免費 key）');
    return addOsm(map);
  }
  // {r} 在 Leaflet 高解析螢幕會變成 '@2x'：載入 2 倍大的圖，文字維持原大小又清晰
  // （不用 detectRetina，它會改載下一級縮放的圖，標籤文字會被縮成一半大）
  const url = v => `https://basemaps.cartocdn.com/rastertiles/${v}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`;
  const base = L.tileLayer(url(`${style}_nolabels`), {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/basemaps">CARTO</a>',
    maxZoom: 20,
  }).addTo(map);

  // 標籤放在自己的 pane：疊在底圖上（200）、標記下（600），不攔截點擊
  if (!map.getPane('labels')) map.createPane('labels');
  const labelsPane = map.getPane('labels');
  labelsPane.style.zIndex = 450;
  labelsPane.style.pointerEvents = 'none';
  const labels = L.tileLayer(url(`${style}_only_labels`), { pane: 'labels', maxZoom: 20 });

  // 底圖色調（只套在底圖 pane，標籤層不套濾鏡，文字才不會變色）
  //   Positron：冷藍調，降低飽和與亮度，放大後大片白底才不刺眼
  //   Voyager：本身有顏色，保持原色
  const pane = map.getPane('tilePane');
  if (pane && style === 'light') {
    pane.style.filter = 'sepia(0.3) hue-rotate(170deg) saturate(0.8) brightness(0.97)';
  }

  // 「字」按鈕：顯示／隱藏地名，記住使用者的選擇
  let showLabels = true;
  try { showLabels = localStorage.getItem(LABELS_KEY) !== '0'; } catch (e) { /* ignore */ }
  const apply = () => {
    if (showLabels) labels.addTo(map); else map.removeLayer(labels);
    if (btn) { btn.style.opacity = showLabels ? '1' : '0.45'; btn.setAttribute('aria-pressed', String(showLabels)); }
  };
  let btn = null;
  const Toggle = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const div = L.DomUtil.create('div', 'leaflet-bar');
      btn = L.DomUtil.create('a', '', div);
      btn.href = '#';
      btn.role = 'button';
      btn.title = '顯示／隱藏地名';
      btn.setAttribute('aria-label', '顯示或隱藏地名');
      btn.textContent = '字';
      btn.style.cssText = 'font:600 14px/30px sans-serif;text-align:center;cursor:pointer;';
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.on(btn, 'click', e => {
        L.DomEvent.preventDefault(e);
        showLabels = !showLabels;
        try { localStorage.setItem(LABELS_KEY, showLabels ? '1' : '0'); } catch (err) { /* ignore */ }
        apply();
      });
      return div;
    },
  });
  const ctrl = new Toggle().addTo(map);
  apply();

  // 底圖圖磚全部載入失敗（金鑰被擋、額度用完、網域沒加進白名單）→ 退回 OSM，避免整張底圖變空白
  let loaded = 0, failed = 0, fellBack = false;
  base.on('tileload', () => { loaded++; });
  base.on('tileerror', () => {
    failed++;
    if (fellBack || loaded > 0 || failed < 4) return;
    fellBack = true;
    console.warn('[basemap] CARTO 圖磚載入失敗（多半是金鑰的網域白名單沒包含目前網址，或額度已用完），退回 OSM');
    map.removeLayer(base);
    map.removeLayer(labels);
    map.removeControl(ctrl);
    if (pane) pane.style.filter = '';
    addOsm(map);
  });
  return base;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('載入失敗：' + src));
    document.head.appendChild(s);
  });
}

function loadCss(href) {
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  document.head.appendChild(l);
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) {
    return false;
  }
}

// 依 OpenFreeMap positron 樣式的圖層 id / type 上色
function recolor(gl, P) {
  const set = (id, prop, val) => { try { gl.setPaintProperty(id, prop, val); } catch (e) { /* 圖層沒有這個屬性就略過 */ } };
  const zh = ['coalesce', ['get', 'name:zh-Hant'], ['get', 'name:zh'], ['get', 'name'], ['get', 'name_en']];
  for (const layer of gl.getStyle().layers || []) {
    const { id, type } = layer;
    if (type === 'background') {
      set(id, 'background-color', P.land);
    } else if (type === 'fill') {
      let c = null;
      if (id === 'water') c = P.water;
      else if (id === 'park' || id.startsWith('landcover_wood')) c = P.park;
      else if (id.startsWith('landcover')) c = P.land;
      else if (id.startsWith('landuse') || id.startsWith('aeroway') || id.startsWith('road_area')) c = P.landuse;
      else if (id === 'building') c = P.building;
      if (c) { set(id, 'fill-color', c); set(id, 'fill-outline-color', P.roadCase); }
    } else if (type === 'line') {
      let c = null;
      if (id.startsWith('waterway')) c = P.water;
      else if (id.startsWith('boundary')) c = P.boundary;
      else if (id.startsWith('railway')) c = P.rail;
      else if (id.includes('casing')) c = P.roadCase;
      else if (id.startsWith('highway') || id.startsWith('tunnel') || id.startsWith('aeroway') || id.startsWith('road_pier')) c = P.roadFill;
      if (c) set(id, 'line-color', c);
    } else if (type === 'symbol') {
      set(id, 'text-color', P.label);
      set(id, 'text-halo-color', P.labelHalo);
      // 路牌圖示（shield）不動；其餘文字優先顯示中文名
      if (!/shield/.test(id)) {
        try { gl.setLayoutProperty(id, 'text-field', zh); } catch (e) { /* ignore */ }
      }
    }
  }
}

async function addOpenFreeMap(map) {
  if (!hasWebGL()) throw new Error('這個瀏覽器沒有 WebGL');
  loadCss(MAPLIBRE_CSS);
  if (!window.maplibregl) await loadScript(MAPLIBRE_JS);
  if (!(L.maplibreGL || L.MaplibreGL)) await loadScript(MAPLIBRE_LEAFLET_JS);

  const glLayer = L.maplibreGL({ style: OFM_STYLE, padding: 0.1 }).addTo(map);
  const gl = glLayer.getMaplibreMap();
  map.getContainer().style.background = PALETTE.land;
  map.attributionControl.addAttribution('<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>');

  const apply = () => recolor(gl, PALETTE);
  if (gl.isStyleLoaded()) apply(); else gl.once('style.load', apply);

  // WebGL context 被瀏覽器回收（手機記憶體吃緊）→ 退回點陣圖磚，避免整張底圖變空白
  gl.getCanvas().addEventListener('webglcontextlost', () => {
    console.warn('[basemap] WebGL context lost，退回 OSM');
    map.removeLayer(glLayer);
    map.getContainer().style.background = '';
    addOsm(map);
  });
  return glLayer;
}

// 給 map.js 呼叫：把底圖加到 Leaflet map 上。同步回傳（ofm 模式會在背景載入，失敗就補 OSM）。
export function addBasemap(map) {
  const mode = getBasemapMode();
  if (mode === 'carto') return addCarto(map, 'light');
  if (mode === 'voyager') return addCarto(map, 'voyager');
  if (mode === 'ofm') {
    addOpenFreeMap(map).catch(err => {
      console.warn('[basemap] OpenFreeMap 不可用，退回 OSM：', err.message);
      addOsm(map);
    });
    return null;
  }
  return addOsm(map);
}
