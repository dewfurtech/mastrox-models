// Mastrox lineup, from "D:\work\machine docs".
// Prices come from Mastrox_Product_range_check 2026 V6 unless `priceNote` says otherwise.
// Sizes are L × W × H in mm, as printed in each brochure.

export const CATEGORIES = [
  { id: 'nesting', name: 'CNC Nesting', series: 'Rakete' },
  { id: 'edge', name: 'Edge Banding', series: 'Booster / Moon' },
  { id: 'drill', name: 'CNC Drilling', series: 'Nova' },
  { id: 'other', name: 'งานเสริม', series: 'เลื่อย · เมมเบรน · อัด · ทากาว · ปั๊มลม' },
  { id: 'extra', name: 'นอก lineup V6', series: 'มีโบรชัวร์ ไม่อยู่ใน lineup' },
];

export const MACHINES = [
  // CNC Nesting
  {
    id: 'rakete-3500a', model3d: 'index.html?m=rakete-3500a', modelNote: 'ด้านหลัง ใต้คานกระเช้า และกลไกหัว ATC วาดจากรูปโบรชัวร์มุมเดียว', cat: 'nesting', name: 'Rakete 3500A', tier: 'Built-in Startup', price: 780000,
    size: [3350, 1960, 2210], weight: 2700,
    summary: 'เครื่องเดี่ยว เปลี่ยนทูลอัตโนมัติ 12 ตัว',
    look: 'โต๊ะ 1220×2450, ตู้คอนโทรลแยก (ตู้สูงมีไฟสัญญาณ), หัว ATC ฝาส้ม, ท่อดูดฝุ่น, แม็กกาซีนทูลเรียงเส้น 12 ตัว, หมุดดันขึ้น (popup pin)',
    specs: { 'Working area': '1320×2550×200 mm', 'Spindle': 'ATC 9 kW 24,000 rpm', 'Servo': '1000 W ×4', 'Control': 'Industrial PC / Windows', 'Total power': '26 kW' },
  },
  {
    id: 'rakete-3500ant', model3d: 'index.html?m=rakete-3500ant', modelNote: 'โต๊ะยก X-lift และสายพานขาออกวาดจากรูปเล็ก ด้านหลังเดา', cat: 'nesting', name: 'Rakete 3500Ant', tier: 'Built-in Startup', price: 1180000,
    size: [10335, 2260, 2150], weight: 3800,
    summary: 'Automation line: โต๊ะยกขาเข้า → CNC → สายพานขาออก',
    look: 'โต๊ะยกกรรไกร (X-lift) ขาเข้า, เครื่อง CNC, สายพานอลูมิเนียมขาออก, โต๊ะ 1220×2500',
    specs: { 'Working area': '1320×2800×200 mm', 'Spindle': '9 kW 24,000 rpm', 'Vacuum table': 'Single layer / 6 zone', 'Control': 'Syntec', 'Total power': '31 kW' },
  },
  {
    id: 'rakete-4800ant', model3d: 'index.html?m=rakete-4800ant', modelNote: 'คานกล่อง แม็กกาซีนจาน โต๊ะยก และสายพานวาดจากรูปเล็ก ด้านหลังเดา', cat: 'nesting', name: 'Rakete 4800Ant', tier: 'Professional', price: 1580000,
    size: [10335, 2260, 2150], weight: 4300,
    summary: 'Automation line โต๊ะใหญ่ขึ้น ติด Auto Label ได้',
    look: 'เหมือน 3500Ant แต่โต๊ะ 1220×2800, gantry แบบกล่องปิด, แม็กกาซีนทูลแบบจาน',
    specs: { 'Working area': '1320×2900×200 mm', 'Spindle': '9 kW ISO30', 'Servo': 'Innovance 850 W ×4', 'Vacuum table': 'Double layer 210 point / 6 zone', 'Total power': '31 kW' },
  },
  {
    id: 'rakete-5000af', model3d: 'index.html?m=rakete-5000af', modelNote: 'หัวคู่ / Auto Label วาดคร่าวๆ ยังไม่มีกลไก Auto Flip ด้านหลังเดา', cat: 'nesting', name: 'Rakete 5000AF', tier: 'Premium', price: 2150000,
    size: [10335, 2260, 2150], weight: 4300,
    summary: 'Fully Auto + Auto Label + Auto Flip',
    look: 'หัวคู่ ท่อดูดฝุ่น 2 ชุด, suction cup, X-lift table, สายพานขาออก',
    specs: { 'Working area': '1320×2900×200 mm', 'Spindle': '9 kW ISO30', 'Servo': 'Innovance 850 W ×4', 'Vacuum table': 'Double layer 210 point / 6 zone', 'Total power': '31 kW' },
  },

  // Edge banding
  {
    id: 'booster-e6', model3d: 'index.html?m=booster-e6', cat: 'edge', name: 'Booster e6', tier: 'Built-in Startup', price: 299000,
    size: [2540, 536, 1316], weight: 500,
    summary: '6 สถานี หม้อกาวล่าง EVA (ชื่อเดิม Booster 05)',
    look: 'ตู้เตี้ยยาว ฝาอะคริลิกส้มครึ่งบน, จอทัชสกรีนหัวเครื่อง, จานวางม้วนขอบกลม, รางลูกกลิ้งส้มฝั่งป้อน',
    stations: ['Gluing (EVA lower glue pot)', 'Press roller', 'End trimming', 'Fine trimming', 'Radius scraping', 'Buffing'],
    specs: { 'Feed': '9 m/min', 'Edge thickness': '0.4–3 mm', 'Panel': 'ยาว ≥150, กว้าง ≥90 mm', 'Air': '>0.6 MPa', 'Total power': '6.5 kW' },
  },
  {
    id: 'booster-e7', model3d: 'index.html?m=booster-e7', cat: 'edge', name: 'Booster e7', tier: 'Built-in Startup', price: 390000,
    size: [2850, 536, 1316], weight: 620,
    summary: '7 สถานี เพิ่ม Pre-milling (ชื่อเดิม Booster 06)',
    look: 'หน้าตาเหมือน e6 แต่ยาวขึ้น 310 mm',
    stations: ['Pre-milling', 'Gluing', 'Press roller', 'End trimming', 'Fine trimming', 'Radius scraping', 'Buffing'],
    specs: { 'Feed': '9 m/min', 'Edge thickness': '0.4–3 mm', 'Panel': 'ยาว ≥150, กว้าง ≥120 mm', 'Total power': '6.5 kW' },
  },
  {
    id: 'booster-e10', model3d: 'index.html?m=booster-e10', cat: 'edge', name: 'Booster e10', tier: 'Built-in Startup', price: 599000,
    size: [3550, 640, 1316], weight: 830,
    summary: '10 สถานี ตัวท็อป Booster (ชื่อเดิม Booster 08)',
    look: 'ฝาส้ม 2 ท่อน, มีช่องดูดด้านบน, จาน + จอแบบเดียวกับ e6',
    stations: ['Pre-milling', 'Gluing', 'Press roller', 'End trimming', 'Fine trimming', 'Contour', 'Radius scraping', 'Flat scraping', 'Cleaning spray', 'Buffing'],
    specs: { 'Feed': '9 m/min', 'Edge thickness': '0.4–3 mm', 'Panel thickness': '10–50 mm', 'Total power': '12 kW' },
  },
  {
    id: 'moon-10', model3d: 'index.html?m=moon-10', modelNote: 'โบรชัวร์เห็นแค่ฝั่งกระจก ฝั่งป้อนแผ่น หัว-ท้าย และรูปร่างแต่ละสถานีเดาจาก Booster', cat: 'edge', name: 'Moon 10', tier: 'Professional', price: 650000, priceNote: 'ราคาจาก Playbook เก่า ไม่อยู่ใน V6',
    size: [4500, 1000, 1680], weight: 2000,
    summary: '9 สถานี หม้อกาวบน, ลูกกลิ้งกด 6 ลูก',
    look: 'ยาว แบ่ง 2 ท่อน, จอบนแขนยื่น, มอเตอร์ใหญ่ท้ายเครื่อง',
    specs: { 'Feed': '12–23 m/min', 'Glue pot': '180–210 °C', 'Air': '6.5 bar', 'Dust ports': '100 mm ×3' },
  },
  {
    id: 'moon-40', model3d: 'index.html?m=moon-40', modelNote: 'โบรชัวร์เห็นแค่ฝั่งกระจก ฝั่งป้อนแผ่น หัว-ท้าย และรูปร่างแต่ละสถานีเดาจาก Booster', cat: 'edge', name: 'Moon 40', tier: 'Professional', price: 1150000,
    size: [6500, 1000, 1600], weight: 2500,
    summary: '12 สถานี Pre-milling PCD 65 + Contour + Flat scraping',
    look: 'ส่วนหน้าเปิดโล่ง ส่วนหลังฝาส้ม 3–4 บาน, ลูกกลิ้งรางป้อนด้านบน',
    stations: ['Separation spray', 'Pre-milling (PCD 65 mm)', 'Upper glue pot', 'Press roller', 'End cut', 'Rough trimming', 'Fine trimming', 'Contour / Corner rounding', 'Radius scraping', 'Flat scraping', 'Cleaning spray', 'Buffing'],
    specs: { 'Feed': '12–23 m/min', 'Edge thickness': '0.4–3 mm', 'Pre-milling': 'PCD 65 mm 18,000 rpm', 'Dust ports': '100 mm ×4' },
  },
  {
    id: 'moon-40d', model3d: 'index.html?m=moon-40d', modelNote: 'โบรชัวร์เห็นแค่ฝั่งกระจก ฝั่งป้อนแผ่น หัว-ท้าย และรูปร่างแต่ละสถานีเดาจาก Booster', cat: 'edge', name: 'Moon 40d', tier: 'Premium', price: 1550000, priceNote: 'ราคาของ Moon 60 ใน Playbook เก่า ไม่อยู่ใน V6',
    size: [8000, 1000, 1600], weight: 3000,
    summary: '14 สถานี หม้อกาวคู่ + Hot Air (Zero Line) — เดิมชื่อ Moon 60',
    look: 'ยาวที่สุดในกลุ่ม Moon',
    stations: ['Separation spray', 'Pre-milling (PCD 65 mm)', 'Upper glue pot #1', 'Upper glue pot #2', 'Press roller', 'End trimming', 'Rough trimming', 'Fine trimming', 'Contour / Corner rounding', 'Radius scraping', 'Flat scraping', 'Cleaning spray', 'Buffing', 'Hot air (Zero Line)'],
    specs: { 'Feed': '12–23 m/min', 'Glue pot': '180–210 °C', 'Dust ports': '100 mm ×5' },
  },
  {
    id: 'moon-80', model3d: 'index.html?m=moon-80', modelNote: 'ลำดับ 13 สถานีเดาเอง (โบรชัวร์ไม่ได้ระบุ) ฝั่งป้อนแผ่นและหัว-ท้ายเดาจาก Booster', cat: 'edge', name: 'Moon 80', tier: 'Premium', price: 1650000,
    size: [6500, 1000, 1600], weight: 3100,
    summary: 'Belt type, 4 Round Corner, 13 unit',
    look: 'โครงเดียวกับ Moon 40',
    specs: { 'Feed': '12–20 m/min', 'Edge width': '15–60 mm', 'Edge thickness': '0.4–3 mm', 'Panel thickness': '10–60 mm', 'Power': '21 kW' },
  },
  {
    id: 'stella', noModel: 'ไม่ปั้นโมเดล: ไม่มีข้อมูล', cat: 'edge', name: 'Stella', tier: 'Premium', price: null,
    size: null, weight: null,
    summary: 'มีแค่รูปใน lineup V6 ยังไม่มีโบรชัวร์',
  },

  // CNC Drilling
  {
    id: 'nova-x2', model3d: 'index.html?m=nova-x2', modelNote: 'ตำแหน่งหัวเจาะ ด้านหลัง และชุดหัวเจาะปลายซ้ายเดาจากรูป', cat: 'drill', name: 'Nova X2', tier: 'Built-in Startup', price: 290000,
    size: [3500, 1200, 1450], weight: 1000,
    summary: 'เจาะข้าง หัวแนวนอน 2',
    look: 'คานบน (gantry), โต๊ะลายตาราง, ปีกโต๊ะยื่นซ้าย, จอ 8"',
    specs: { 'Working size': 'แผ่นยาว 2800 mm', 'Servo': '750 W ×3', 'Spindle': '2 × 2.2 kW 18,000 rpm', 'Total power': '5.9 kW' },
  },
  {
    id: 'nova-x4', model3d: 'index.html?m=nova-x4', modelNote: 'ตำแหน่งหัวเจาะและด้านหลังเดาจากรูป', cat: 'drill', name: 'Nova X4', tier: 'Professional', price: 480000,
    size: [3800, 1500, 1500], weight: 1100,
    summary: 'หัวแนวนอน 2 + แนวตั้ง 2',
    look: 'เหมือน X2 แต่จอ 15" บนคาน',
    specs: { 'Panel': 'กว้างสุด 2800, หนาสุด 60 mm', 'Spindle': '3.5 kW ×4', 'Servo': '750 W ×3', 'Total power': '20 kW' },
  },
  {
    id: 'nova-x6', model3d: 'index.html?m=nova-x6', modelNote: 'ตำแหน่งหัวเจาะและด้านหลังเดาจากรูป', cat: 'drill', name: 'Nova X6', tier: 'Professional', price: 550000,
    size: [3800, 1200, 1450], weight: 1000,
    summary: '6 หัว (นอน 2, ตั้ง 2, ทแยง 2) + laser sensor',
    look: 'เหมือน X4 + หัวทแยง, panel press',
    specs: { 'Working size': 'แผ่นยาว 2800 mm', 'Spindle': '2.2 kW 18,000 rpm', 'Servo': '750 W ×3', 'Total power': '13.65 kW' },
  },
  {
    id: 'nova-xs', model3d: 'index.html?m=nova-xs', modelNote: 'มีรูปเดียว ห้องหัวเจาะ โต๊ะป้อน และด้านหลังเดาเกือบทั้งหมด', cat: 'drill', name: 'Nova XS', tier: 'Premium', price: 990000,
    priceNote: '+ dual top 1,150,000 · + ATC 1,350,000',
    size: [5350, 2800, 2150], weight: null,
    summary: 'เจาะ 6 ด้าน หัวบนคู่',
    look: 'ตู้ปิดฝาส้ม + โต๊ะยื่นยาว, จอแขนยื่น',
    specs: { 'Panel': 'หนา 5–55, เล็กสุด 40×210, กว้างสุด 1200 mm', 'Heads': 'Top 9V 8H + 9V 8H, Bottom 9V', 'Total power': '11.3 kW' },
  },

  // Other lineup machines
  {
    id: 'nebula', model3d: 'index.html?m=nebula', modelNote: 'โบรชัวร์ไม่มีขนาดรวมของเครื่อง ขนาดตัวเครื่อง แขนรั้วตัดขวาง และแขนฝาครอบประมาณจากรูป', cat: 'other', name: 'Nebula', kind: 'Panel Saw', price: 185000,
    size: null, weight: 750,
    summary: 'เลื่อยโต๊ะเลื่อน ใบเอียง 0–46°',
    look: 'โต๊ะเลื่อนยาว 3200, รั้วขวา 1300, ฝาครอบดูดฝุ่นแขวน',
    specs: { 'Main blade': '300 mm, 5.5 kW', 'Scoring blade': '120 mm, 1.1 kW', 'Cutting height': '75 mm' },
  },
  {
    id: 'aurora-open', model3d: 'index.html?m=aurora-open', cat: 'other', name: 'Aurora OpenShell', kind: 'Membrane', price: 380000,
    size: [2603, 1372, 1308], weight: 1200,
    summary: 'เมมเบรนสุญญากาศ ฝาเปิด ถาดเดี่ยว',
    look: 'ฝายกด้วยกระบอกลม, ไฟส่อง 2 ดวง, มือจับส้ม',
    specs: { 'Table': '2550×1300×50 mm', 'Heating': '18.7 kW', 'Vacuum pump': '3 kW / 100 m³/h', 'Control': 'Manual' },
  },
  {
    id: 'aurora-slide', model3d: 'index.html?m=aurora-slide', modelNote: 'รางเลื่อน ชุดขับ ราวแขวนฟิล์มที่ปลาย และด้านหลังเดาจากรูป', cat: 'other', name: 'Aurora SlideShell', kind: 'Membrane', price: 650000,
    size: [8000, 2030, 1320], weight: 2300,
    summary: 'เมมเบรนสุญญากาศ 2 ถาด ตู้ความร้อนเลื่อน',
    look: 'ตู้ความร้อนวิ่งบนรางระหว่าง 2 ถาด',
    specs: { 'Table': '3000×1300×50 mm', 'Heating': '36 kW', 'Total power': '42 kW', 'Control': 'PLC + Touchscreen' },
  },
  {
    id: 'cold-presso', model3d: 'index.html?m=cold-presso', cat: 'other', name: 'Cold Presso 60T', kind: 'Cold Press', price: 230000,
    size: [2950, 1270, 2280], weight: 2000,
    summary: 'เครื่องอัดเย็น 60 ตัน',
    look: 'โครงเหล็กประตู, กระบอกไฮดรอลิก 4, ขอบลายเหลือง-ดำ',
    specs: { 'Table': '2500×1250 mm', 'Max opening': '1000 mm', 'Motor': '5.5 kW' },
  },
  {
    id: 'glue-spreader', model3d: 'index.html?m=glue-spreader', cat: 'other', name: 'Glue Spreader 1300', kind: 'Double-side Gluing', price: 186000,
    size: [2040, 850, 1350], weight: 550,
    summary: 'ทากาว 2 หน้า กว้าง 1350',
    look: 'ลูกกลิ้งคู่, ฝาส้มเจาะรู, พวงมาลัยปรับ 2 ข้าง',
    specs: { 'Working width': '1350 mm', 'Speed': '18 m/min', 'Wood height': '0–60 mm', 'Motor': '1.5 kW' },
  },
  {
    id: 'vair-10', model3d: 'index.html?m=vair-10', cat: 'other', name: 'VAir 10HP set', kind: 'Air Compressor', price: 125000,
    size: [800, 550, 740], weight: 145,
    summary: 'ปั๊มลมสกรูอินเวอร์เตอร์ + ถัง 600 L + dryer + filter ×2',
    look: 'สีเขียวมะนาว ลาย V ขาว (ขนาดคือตัวปั๊ม VDSD10)',
    specs: { 'FAD': '0.54–1.35 m³/min', 'Power': '7.5 kW' },
  },
  {
    id: 'vair-20', model3d: 'index.html?m=vair-20', cat: 'other', name: 'VAir 20HP set', kind: 'Air Compressor', price: 165000,
    size: [940, 630, 840], weight: 235,
    summary: 'ปั๊มลมสกรูอินเวอร์เตอร์ + ถัง 600 L + dryer + filter ×2',
    look: 'สีเขียวมะนาว ลาย V ขาว (ขนาดคือตัวปั๊ม VDSD20)',
    specs: { 'FAD': '1.04–2.6 m³/min', 'Power': '15 kW' },
  },

  // Not in lineup V6
  {
    id: 'smooth-flat', noModel: 'ไม่ปั้นโมเดล: ไม่มีขนาดเครื่อง', cat: 'extra', name: 'Smooth Flat', kind: 'Wide Belt Sander', price: null,
    size: null, weight: 2000,
    summary: 'เครื่องขัดสายพานกว้าง 1300',
    specs: { 'Width': '1300 mm', 'Belt': 'Single', 'Total power': '35.37 kW' },
  },
  {
    id: 'smooth-60', noModel: 'ไม่ปั้นโมเดล: ไม่มีขนาดเครื่อง', cat: 'extra', name: 'Smooth 60', kind: 'Brush Sander', price: null,
    size: null, weight: null,
    summary: 'เครื่องขัดแปรง 6 สถานี กว้าง 1300',
    specs: { 'Width': '1300 mm', 'Stations': '6', 'Lift': 'Motorized' },
  },
  {
    id: 'becker-vtlf', noModel: 'ไม่ปั้นโมเดล: เป็นอุปกรณ์เสริม', cat: 'extra', name: 'Becker VTLF 2.250', kind: 'Vacuum Pump', price: null,
    size: null, weight: null,
    summary: 'ปั๊มสุญญากาศใบพัดแบบไม่ใช้น้ำมัน (อุปกรณ์เสริม)',
    specs: { 'Power': '5.5 kW 380 V 3P' },
  },
];

export const NOTES = [
  'Booster e6/e7/e10 คือชื่อใหม่ของ Booster 05/06/08 (หน้าจอเครื่องจริงยังขึ้น "BOOSTER 05")',
  'โบรชัวร์ Moon 10/40d เขียน "Edge Thickness 10–60 mm" น่าจะหมายถึงความหนาแผ่น',
  'ตาราง Booster e10 ในเล่ม (เล่ม/0801.jpg) ค่าเป็น placeholder ใช้ค่าจากโบรชัวร์แทน',
  'Nebula, Stella, Smooth และ Becker ไม่มีขนาดรวมของเครื่อง',
];
