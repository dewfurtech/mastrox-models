# Mastrox 3D Models

โมเดล 3 มิติของเครื่องจักร Mastrox (Rakete, Booster, Moon, Nova, Nebula, Aurora, Cold Presso, Glue Spreader, VAir) สร้างด้วย three.js

## เปิดดู
```
npx http-server -p 5181 -c-1
```
- `index.html`: ดูโมเดล ดูแอนิเมชัน และ export ไป SketchUp / Blender / OBJ / STL
- `editor.html`: แก้ไขชิ้นส่วน (ย้าย หมุน สเกล สี ซ่อน ลบ ทำซ้ำ) แล้วบันทึกเป็น `edits-<รุ่น>.json`
- `list.html`: รายการเครื่องทั้งหมด

## โครงสร้าง
- `machines/`: โค้ดสร้างโมเดลแต่ละรุ่น (`registry.js` คือรายชื่อรุ่น)
- `data/machines.js`: ข้อมูลรุ่น ราคา และขนาดจากโบรชัวร์
- `edits.js`: ระบบเก็บการแก้ไขจาก editor
- `export.js`: export เป็น .dae / .obj / .glb / .stl
- `FIXES.md`: บันทึกสิ่งที่แก้
