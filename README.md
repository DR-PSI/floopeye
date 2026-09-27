# FloodEye — เฝ้าระวังน้ำท่วมสถานีไฟฟ้า กฟน. (ไม่ใช้เซนเซอร์)

ใช้ข้อมูลภายนอก 3 ชั้น
1. **ความเสี่ยงรอบสถานี** (อัตโนมัติทุก 15 นาที) — ThaiWater ระดับน้ำคลอง + ฝน 24 ชม., Traffy Fondue จุดแจ้งน้ำท่วม
2. **การยืนยัน** — AI (Claude) อ่าน infographic รายงานของ กฟน. แล้วอัปเดตสถานีที่น้ำท่วมขัง
3. **หน้างาน** — เจ้าหน้าที่กดสถานะการเข้าถึง / ปักหมุดพิกัดจากมือถือ

```
ThaiWater ─┐
Traffy ────┼─► n8n "Collect & Score" ─► Firestore flood_stations.risk ─┐
           │                                                          ├─► FloodEye PWA
ภาพ กฟน. ──► n8n "Infographic Reader" ─► flood_stations.confirmed ────┘      │
                         └──► LINE group ◄── (แจ้งเตือนเมื่อระดับเพิ่ม)          └─► ปักหมุด/สถานะเข้าถึง
```

## ไฟล์
| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `index.html`, `manifest.json`, `sw.js`, `icon.svg` | PWA — วางบน GitHub Pages (เช่น repo `DR-PSI/floodeye`) |
| `firestore.rules` | กฎ Firestore ทั้งไฟล์ของโปรเจกต์ motoreye (รวมของเดิม + FloodEye) |
| `n8n/floodeye-collect-score.n8n.json` | Workflow เก็บข้อมูล + คำนวณคะแนนเสี่ยง |
| `n8n/floodeye-infographic-reader.n8n.json` | Workflow อ่านภาพรายงาน กฟน. ด้วย AI |

Firebase ใช้โปรเจกต์ `motoreye-b8829` (collection `flood_stations`, `flood_reports`) และ n8n เดิม `n8n.jupetor-cmms.com`

## ขั้นตอนติดตั้ง

### 1. Firestore rules
Firebase Console → Firestore → Rules → แทนที่ทั้งหมดด้วย `firestore.rules` → Publish

### 2. Deploy แอป
1. สร้าง repo ใหม่ อัปโหลด 4 ไฟล์ของแอป
2. Settings → Pages → Branch `main` / root → Save
3. Firebase Console → Authentication → Settings → Authorized domains → เพิ่ม `dr-psi.github.io` (ถ้ายังไม่มี)
4. เปิดแอป → เข้าสู่ระบบ → แท็บ **สถานี** → กด **นำเข้า 6 สถานีจากรายงาน กฟน. 26 ก.ย. 69**

> พิกัด 6 สถานีตั้งต้นเป็น **ค่าประมาณระดับเขต** และ "คลองร้อย" ยังไม่มีพิกัด — เปิดแต่ละสถานีแล้วแก้พิกัด หรือกด "ใช้ตำแหน่งปัจจุบัน" ตอนอยู่หน้าสถานี คะแนนเสี่ยงจะแม่นเท่าที่พิกัดแม่น

### 3. Credential ใน n8n (สร้างครั้งเดียว)
| ชื่อ | ประเภท | ค่า |
|---|---|---|
| Firebase motoreye (Service Account) | Google Service Account API | key ใหม่จากโปรเจกต์ motoreye, scope `https://www.googleapis.com/auth/datastore` |
| LINE Channel Access Token | Header Auth | Name `Authorization`, Value `Bearer <channel token>` |
| Anthropic API Key | Header Auth | Name `x-api-key`, Value `<API key จาก console.anthropic.com>` |

### 4. Import workflows
1. n8n → Import from File → `floodeye-collect-score.n8n.json`
2. เปิดทุก HTTP node ที่มีกุญแจ → เลือก credential จริงในช่อง dropdown (ไฟล์มีแค่ placeholder)
3. กด **Execute workflow** 1 ครั้ง → ดู output ของ `ThaiWater Water Level`, `ThaiWater Rain 24h`, `Traffy Flood Reports`
4. ดู `Compute Risk` → ถ้า `sources` เป็น 0 ของแหล่งไหน แปลว่าชื่อ field ใน response ไม่ตรง แก้ตรงส่วน "ThaiWater ระดับน้ำ/ฝน" ใน Code node (โค้ดรองรับชื่อ field ที่พบบ่อยไว้แล้ว)
5. ทำเหมือนกันกับ `floodeye-infographic-reader.n8n.json`
6. Toggle ทั้ง 2 workflow เป็น **Active**
7. ในแอป แท็บ **รายงาน** → เลือกภาพ infographic กฟน. → **อ่านรายงานและอัปเดตสถานี**

## ตรวจก่อนใช้จริง
- **ThaiWater** ใช้ API เดิม `api-v3.thaiwater.net/.../thaiwater30/public/...` ซึ่งไม่ต้องใช้ key แต่ไม่มีเอกสารรับรอง ถ้าใช้ในงาน กฟน. จริง ควรขอใช้ข้อมูลกับ สสน. อย่างเป็นทางการ (API ของหน้าเว็บใหม่ต้องใช้ key ของ สสน. ไม่ควรนำมาใช้เอง)
- **Traffy** ใช้ endpoint สาธารณะ `publicapi.traffy.in.th/share/teamchadchart/search` ถ้าถูกจำกัด ให้สมัคร Exchange API กับ NECTEC
- **ข้อมูลเซนเซอร์น้ำท่วมถนนของ กทม.** (dds.bangkok.go.th) ยังไม่มี API สาธารณะที่ชัดเจน ถ้าต้องการ ต้องประสานสำนักการระบายน้ำ แล้วเพิ่มเป็น HTTP node อีกตัวก่อน `Compute Risk`
- คะแนนเสี่ยงคือ **ความเสี่ยงรอบสถานี** ไม่ใช่ระดับน้ำในรั้ว ปรับเกณฑ์ได้ที่หัวของ Code node `Compute Risk`

## Firestore schema
```
flood_stations/{id}
  name, type ("terminal"|"sub"), lat, lng, approx
  risk:      {score, level 0-3, rain24h, wlPercent, wlStation, wlDistKm, traffyCount, updatedAt, sources}   ← n8n
  confirmed: {flooded, reportAt, access, accessNote, accessAt, source, by}                               ← n8n (AI)
  access:    {status "normal"|"high_vehicle"|"no_access", at, by}                                        ← แอป

flood_reports/{auto}
  receivedAt, reportTime, valid, transmission, distribution, flooded[], pumpOutages[], unmatched[], notes, by
```

## ต่อยอด
- ส่งภาพเข้า LINE group แล้วให้อ่านอัตโนมัติ — ต้องแยก LINE channel ใหม่ เพราะ webhook ของ channel SubEye ใช้ path `line-events` อยู่แล้ว
- เก็บ `risk` เป็น history แล้วเทียบกับ `confirmed` เพื่อหาเกณฑ์ฝนเฉพาะของแต่ละสถานี (ข้อมูลเทรน AI)
- แก้ `sw.js` → เปลี่ยน `VERSION` ทุกครั้งที่แก้ `index.html`
