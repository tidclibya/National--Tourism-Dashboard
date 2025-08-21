
📦 Tourism Dashboard (HTML + CSS + JS + JSON)
============================================
> نسخة جاهزة للعمل محليًا: افتح الملف `index.html` مباشرة وسيتم تحميل JSON من مجلد `data/`.

الهيكل:
- index.html
- assets/
  - css/styles.css
  - js/app.js
- data/
  - official.json            ← أحدث القيم (KPIs) + معلومات عامة
  - timeseries.json          ← السلاسل الزمنية لكل مؤشر
  - cities.json              ← توزيع الخدمات حسب المدينة (خام)
  - city_coords.json         ← إحداثيات المدن
  - investment_projects.json ← أمثلة لمشاريع الاستثمار

الوظائف:
- تحميل البيانات من JSON بدل ترميزها داخل HTML.
- مؤشرات (KPIs) + 3 رسوم أساسية (سلاسل زمنية / أعلى المدن / أنواع السياحة).
- جدول ديناميكي للمدن مع بحث وفرز (DataTables).
- خريطة تفاعلية للمدن (Leaflet + MarkerCluster).
- قسم الاستثمار: خريطة + جدول من investment_projects.json.
- تصدير: JSON/CSV/PNG.
- ثيم داكن/فاتح يحفظ في LocalStorage.

التشغيل:
- افتح `index.html` مباشرة في المتصفح (لا حاجة لسيرفر).
- لتعديل القيم عدّل ملفات JSON في `data/`.

ملاحظات:
- يمكنك استبدال محتوى JSON ببياناتك الرسمية فورًا.
- إذا أردت إضافة مؤشرات، أضف سلاسل جديدة في `timeseries.json` وعدّل القوائم في `index.html` (قائمة select) وفي `app.js` إذا لزم.
