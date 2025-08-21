
// Basic helpers
const fmt = (n)=> (n||0).toLocaleString('ar-EG');
const $ = (sel, root=document)=> root.querySelector(sel);
const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));

// Tabs
function initTabs(){
  const tabs = $$('#tabs button');
  const panels = $$('.tab-panel');
  tabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabs.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const id = btn.dataset.tab;
      panels.forEach(p=> p.hidden = p.id!==id);
      if(id==='map' && window._mapInitOnce!==true){ initMap(); window._mapInitOnce=true; }
    });
  });
}

// Theme
function initTheme(){
  const root = document.documentElement;
  const t = localStorage.getItem('theme');
  if(t==='dark'){ root.setAttribute('data-theme','dark'); $('#themeToggle').checked = true; }
  $('#themeToggle').addEventListener('change', (e)=>{
    if(e.target.checked){ root.setAttribute('data-theme','dark'); localStorage.setItem('theme','dark'); }
    else { root.removeAttribute('data-theme'); localStorage.setItem('theme','light'); }
  });
}

// Load JSON
async function loadJSON(path){
  const res = await fetch(path);
  if(!res.ok) throw new Error('Failed to load '+path);
  return res.json();
}

// Charts
let charts = {};

function seriesFrom(official, key){
  const s = official.timeseries[key]||[];
  return { labels: s.map(i=>i.year), values: s.map(i=>i.value) };
}

function renderSeriesChart(official){
  const ctx = document.getElementById('seriesChart').getContext('2d');
  const key = $('#seriesSelect').value;
  const serie = seriesFrom(official, key);
  if(charts.series) charts.series.destroy();
  charts.series = new Chart(ctx, {
    type:'line',
    data:{ labels: serie.labels, datasets:[{ label: key, data: serie.values, fill:false, tension:0.3 }]},
    options:{ responsive:true, plugins:{ legend:{ display:false }}}
  });
}

function renderTopCities(official){
  const ctx = document.getElementById('servicesTopChart').getContext('2d');
  const merged = mergeDistribution(official.city_distribution);
  const top = merged.sort((a,b)=> (b.hotels+b.resorts+b.restaurants+b.cafes) - (a.hotels+a.resorts+a.restaurants+a.cafes)).slice(0,10);
  const labels = top.map(r=>r.city);
  const values = top.map(r=> (r.hotels+r.resorts+r.restaurants+r.cafes));
  if(charts.top) charts.top.destroy();
  charts.top = new Chart(ctx, {
    type:'bar',
    data:{ labels, datasets:[{ label:'إجمالي الخدمات', data: values }]},
    options:{ responsive:true, plugins:{ legend:{ display:false }}, scales:{ x:{ ticks:{ autoSkip:false }}}}
  });
}

function renderTourismType(official, filter='all'){
  const ctx = document.getElementById('tourismTypeChart').getContext('2d');
  const merged = mergeDistribution(official.city_distribution);
  const rows = merged.filter(r=> filter==='all' || r.tourism_type.split(' - ').includes(filter));
  const sum = rows.reduce((acc,r)=>{
    acc.hotels += r.hotels||0; acc.resorts += r.resorts||0; acc.restaurants += r.restaurants||0; acc.cafes += r.cafes||0;
    return acc;
  }, {hotels:0,resorts:0,restaurants:0,cafes:0});
  const labels = ['فنادق','منتجعات','مطاعم','مقاهي'];
  const values = [sum.hotels,sum.resorts,sum.restaurants,sum.cafes];
  if(charts.tt) charts.tt.destroy();
  charts.tt = new Chart(ctx, { type:'doughnut', data:{ labels, datasets:[{ data:values }]}, options:{ responsive:true } });
}

// Merge cities
function splitTypes(t){ if(!t || t==='NaN') return []; return String(t).split(/\/|،|,|-/).map(x=>x.trim()).filter(Boolean); }
function normalizeCityName(name){
  if(!name) return '';
  let s = String(name).trim().replace(/[\u200f\u200e\u202a\u202b]/g,'');
  const m = {"صبراته":"صبراتة","مصراته":"مصراتة","الخمس‎":"الخمس"};
  return m[s]||s;
}
function mergeDistribution(rows){
  const acc = new Map();
  rows.forEach(r=>{
    const key = normalizeCityName(r.city);
    if(!acc.has(key)) acc.set(key, { city:key, tourism_type:[], hotels:0,resorts:0,restaurants:0,cafes:0, tourists:0, revenue:0 });
    const o = acc.get(key);
    o.hotels += r.hotels||0; o.resorts += r.resorts||0; o.restaurants += r.restaurants||0; o.cafes += r.cafes||0;
    o.tourists += r.tourists||0; o.revenue += r.revenue||0;
    splitTypes(r.tourism_type).forEach(t=>{ if(!o.tourism_type.includes(t)) o.tourism_type.push(t); });
  });
  return Array.from(acc.values()).map(o=> ({...o, tourism_type:o.tourism_type.join(' - ')}));
}

// Map
let map, markers;
function initMap(){
  map = L.map('regionMap').setView([27.1, 17.0], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom:18, attribution:'&copy; OpenStreetMap' }).addTo(map);
  markers = L.markerClusterGroup({ maxClusterRadius:40, spiderfyOnMaxZoom:true, showCoverageOnHover:false });
  map.addLayer(markers);
  updateMapMarkers();
}
function valueColor(v){
  if(v===0) return '#ccc';
  if(v<=10) return '#ff6b6b';
  if(v<=50) return '#ffa500';
  if(v<=100) return '#4cd964';
  return '#007aff';
}
function dotIcon(v){
  const c = valueColor(v);
  const size = (v===0?10:Math.min(28, 8 + Math.sqrt(v)*2));
  const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${c};border:2px solid #00000022"></div>`;
  return L.divIcon({html, iconSize:[size,size], className:'dot'});
}
async function updateMapMarkers(){
  const official = await loadJSON('data/official_data.json');
  const coords = await loadJSON('data/city_coords.json');
  markers.clearLayers();
  const merged = mergeDistribution(official.city_distribution);
  merged.forEach(r=>{
    const c = coords[r.city];
    const v = (r.hotels||0)+(r.resorts||0)+(r.restaurants||0)+(r.cafes||0);
    if(c && c.length===2) {
      const mk = L.marker([c[0], c[1]], {icon: dotIcon(v)})
        .bindPopup(`<b>${r.city}</b><br>نوع: ${r.tourism_type||'—'}<br>إجمالي الخدمات: ${v}`);
      markers.addLayer(mk);
    }
  });
}

// KPIs
function initKPIs(official){
  document.getElementById('kpiYear').textContent = official.latest.year||'—';
  document.getElementById('kpiFacilities').textContent = fmt(official.latest.facilities);
  document.getElementById('kpiRooms').textContent = fmt(official.latest.rooms);
  document.getElementById('kpiBeds').textContent = fmt(official.latest.beds);
  document.getElementById('kpiGuests').textContent = fmt(official.latest.guests);
  document.getElementById('kpiCompanies').textContent = fmt(official.latest.companies);
}

// Cities table
function initCitiesTable(official){
  const merged = mergeDistribution(official.city_distribution);
  const rows = merged.map((r,i)=> [i+1, r.city, r.tourism_type||'—', r.hotels||0, r.resorts||0, r.restaurants||0, r.cafes||0, (r.hotels||0)+(r.resorts||0)+(r.restaurants||0)+(r.cafes||0)]);
  const table = new DataTable('#citiesTable', {
    data: rows,
    columns: [{title:'#'},{title:'المدينة'},{title:'نوع السياحة'},{title:'فنادق'},{title:'منتجعات'},{title:'مطاعم'},{title:'مقاهي'},{title:'الإجمالي'}],
    pageLength: 12,
    order: [[7,'desc']],
    language: { search:'بحث:', lengthMenu:'عرض _MENU_', info:'إظهار _START_–_END_ من _TOTAL_', paginate:{ previous:'السابق', next:'التالي' }, emptyTable:'لا توجد بيانات' }
  });
  // Filters
  $('#citySearch').addEventListener('input', function(){ table.search(this.value).draw(); });
  $('#sortBySelect').addEventListener('change', function(){
    const idx = {total:7, hotels:3, resorts:4, restaurants:5, cafes:6}[this.value] || 7;
    table.order([idx,'desc']).draw();
  });
}

// Export helpers
function download(name, content, mime='text/plain'){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], {type:mime}));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

// Main init
document.addEventListener('DOMContentLoaded', async ()=>{
  initTabs(); initTheme();
  const official = await loadJSON('data/official_data.json');
  initKPIs(official);

  // charts
  renderSeriesChart(official);
  $('#seriesSelect').addEventListener('change', ()=> renderSeriesChart(official));
  renderTopCities(official);
  renderTourismType(official, 'all');
  $$('#tourismTypeFilter .pill').forEach(btn=> btn.addEventListener('click', ()=>{
    $$('#tourismTypeFilter .pill').forEach(b=> b.classList.remove('active'));
    btn.classList.add('active');
    renderTourismType(official, btn.dataset.type);
  }));

  // cities table
  initCitiesTable(official);

  // export buttons
  $('#exportOfficialJson').addEventListener('click', async()=>{
    const json = await loadJSON('data/official_data.json');
    download('official_data.json', JSON.stringify(json, null, 2), 'application/json');
  });
});

