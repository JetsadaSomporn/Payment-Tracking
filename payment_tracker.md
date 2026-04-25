# Payment Tracker Web App Design

เวอร์ชันนี้แก้ตามที่กำหนดแล้ว: ใช้ **DeepSeek V4 Flash** เป็นโมเดลหลักในการอ่าน/แกะข้อมูลจากสลิป และใช้ **NVIDIA Nemotron Ultra** สำหรับสรุปรายรับรายจ่าย วิเคราะห์พฤติกรรม และตอบคำถามเชิงการเงิน

> หมายเหตุสำคัญแบบไม่หลอกตัวเอง: โครงสร้างนี้จะออกแบบให้ `deepseek-v4-flash` เป็น OCR/Slip Extraction Provider หลัก แต่ควรทำ adapter แยกไว้เสมอ เพราะถ้า endpoint ที่ใช้งานจริงรับภาพไม่ได้หรือ latency ไม่ดี จะสามารถสลับ provider ได้โดยไม่ต้องรื้อทั้งระบบ

---

## 1. เป้าหมายของระบบ

ระบบนี้คือ web app สำหรับติดตามรายรับรายจ่ายจากสลิป โดยเน้นความเร็ว ความง่าย และ UI แบบ minimal คล้าย ChatGPT, Gemini, Qwen, Grok

Core idea:

```text
อัปโหลดสลิป -> DeepSeek V4 Flash อ่านข้อมูล -> ผู้ใช้กรอกว่าจ่ายอะไร -> บันทึกเป็น transaction -> Nemotron Ultra สรุปวิเคราะห์รายวัน
```

สิ่งที่ระบบต้องทำได้ตั้งแต่ MVP:

1. Login ด้วย Google
2. อัปโหลดรูปสลิปธนาคาร
3. ใช้ DeepSeek V4 Flash แกะข้อมูลจากสลิป เช่น จำนวนเงิน วันที่ เวลา ธนาคาร ผู้รับ เลขอ้างอิง
4. ให้ผู้ใช้กรอกว่า “จ่ายอะไรไป” ก่อนบันทึก
5. บันทึกเป็นรายรับ/รายจ่ายในฐานข้อมูล
6. แสดงรายการล่าสุดและยอดรวมของวันนี้
7. สรุปรายวันด้วย NVIDIA Nemotron Ultra
8. Deploy ได้บน Vercel
9. ใช้ Supabase สำหรับ Auth, Database, Storage
10. UI ต้องเรียบ ใช้ง่าย และไม่รกเหมือน dashboard ราชการปี 2012

---

## 2. Tech Stack

| Layer | Technology | เหตุผล |
|---|---|---|
| Frontend | Next.js App Router + TypeScript | Deploy บน Vercel ง่าย เร็ว และเหมาะกับ web app |
| Styling | Tailwind CSS + shadcn/ui | ทำ minimal UI ได้เร็ว และ component สวยพอโดยไม่ต้องดิ้นเยอะ |
| Auth | Supabase Auth + Google OAuth | Login ง่าย ไม่ต้องทำระบบ password เอง |
| Database | Supabase Postgres | เก็บ transaction, slip, summary ได้ดี และ query analytics สะดวก |
| Storage | Supabase Storage | เก็บรูปสลิป |
| Slip AI | DeepSeek V4 Flash | ใช้แกะข้อมูลจากสลิปและคืน JSON |
| Summary AI | NVIDIA Nemotron Ultra | ใช้สรุปรายวัน รายเดือน วิเคราะห์ pattern และตอบคำถาม |
| Scheduler | Vercel Cron | สรุปรายวันอัตโนมัติ |
| Validation | Zod | กัน AI คืน JSON มั่วแล้วพังทั้งระบบ |
| Charts | Recharts หรือ Tremor | ใช้ทำกราฟสั้น ๆ เท่าที่จำเป็น |

---

## 3. System Architecture

```text
User
 |
 | Google Login
 v
Next.js Web App on Vercel
 |
 | Upload Slip Image
 v
Supabase Storage
 |
 | Create Slip Record
 v
Supabase Postgres
 |
 | Process Slip
 v
DeepSeek V4 Flash
 |
 | Extract structured slip data
 v
Slip Preview Form
 |
 | User confirms + adds payment purpose
 v
Transactions Table
 |
 | Daily Cron / Manual Summary
 v
NVIDIA Nemotron Ultra
 |
 | Daily financial insight
 v
Dashboard + Money Chat
```

หลักคิดคือแยกงานเป็น 2 ส่วน:

```text
DeepSeek V4 Flash = อ่านและแปลงสลิปเป็นข้อมูลโครงสร้าง
NVIDIA Nemotron Ultra = วิเคราะห์และสรุปจากข้อมูลที่บันทึกแล้ว
```

อย่าเอา Nemotron Ultra ไปอ่านภาพถ้าไม่จำเป็น และอย่าให้ DeepSeek สรุปการเงินทั้งเดือนถ้ามึงเลือก Nemotron Ultra ไว้ทำสรุปแล้ว เดี๋ยวระบบมั่วหน้าที่กันเอง

---

## 4. Main User Flow

### 4.1 Login Flow

```text
Open app
 -> Click “Continue with Google”
 -> Supabase Auth
 -> Create or update profile
 -> Redirect to Dashboard
```

หลัง login สำเร็จ ระบบควรสร้าง row ใน `profiles` ให้อัตโนมัติ

---

### 4.2 Upload Slip Flow

```text
User uploads slip image
 -> Image preview appears immediately
 -> Upload image to Supabase Storage
 -> Create row in slips table
 -> Call /api/slips/process
 -> DeepSeek V4 Flash extracts slip data
 -> Show editable preview form
 -> User fills “จ่ายอะไรไป”
 -> User confirms
 -> Save transaction
```

ตัวอย่างข้อมูลจากสลิป:

```json
{
  "document_type": "thai_bank_slip",
  "bank_name": "Krungthai",
  "status": "success",
  "amount": 158.00,
  "fee": 0.00,
  "currency": "THB",
  "transaction_date_iso": "2026-04-24",
  "transaction_time": "17:42",
  "sender_name": "นาย เจษฎา สมพร",
  "receiver_name": "123 เซอร์วิส",
  "reference_no": "20260424742563860",
  "confidence": 0.92
}
```

ช่องที่ผู้ใช้ต้องกรอกเอง:

```text
จ่ายอะไรไป?
```

เช่น:

```text
ค่าบริการ 123 เซอร์วิส
```

เหตุผลที่ต้องให้ผู้ใช้กรอกเอง: AI เห็นว่าโอนไปหาใคร แต่ไม่รู้บริบทจริงว่ามึงจ่ายค่าอะไร ถ้าให้มันเดาเองหมด ระบบจะกลายเป็นหมอดูการเงิน

---

### 4.3 Confirm Transaction Flow

หลัง DeepSeek อ่านสลิปเสร็จ UI แสดงแบบนี้:

```text
จำนวนเงิน: 158.00 บาท
วันที่: 24 เม.ย. 2569
เวลา: 17:42
ธนาคาร: Krungthai
ผู้รับ: 123 เซอร์วิส
เลขอ้างอิง: 20260424742563860

จ่ายอะไรไป?
[ ค่าบริการ 123 เซอร์วิส ]

หมวดหมู่
[ บิล/บริการ ]

[แก้ไข] [บันทึกรายจ่าย]
```

ห้าม auto-save แบบไม่ให้ผู้ใช้ตรวจ เพราะ OCR/AI อ่านผิดได้ โดยเฉพาะชื่อร้าน ตัวเลข และวันที่ไทย

---

### 4.4 Daily Summary Flow

ทุกวันเวลา 23:55 หรือเมื่อผู้ใช้กด “สรุปวันนี้”:

```text
Query transactions ของวันนั้น
 -> Aggregate total income / expense / category breakdown
 -> ส่ง structured data ให้ NVIDIA Nemotron Ultra
 -> ได้ summary + insights + suggestions
 -> Save to daily_summaries
 -> Show on dashboard
```

ตัวอย่างผลสรุป:

```text
วันนี้ใช้ไปทั้งหมด 158.00 บาท
รายการหลักคือค่าบริการ 123 เซอร์วิส อยู่ในหมวดบิล/บริการ
วันนี้ยังไม่มีรายจ่ายผิดปกติ เพราะมีเพียง 1 รายการ
```

---

## 5. Database Design

### 5.1 profiles

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  avatar_url text,
  default_currency text not null default 'THB',
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

### 5.2 categories

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
```

Default categories:

```text
อาหาร
เดินทาง
ช้อปปิ้ง
บิล/บริการ
สุขภาพ
งาน/ธุรกิจ
ครอบครัว
บันเทิง
การศึกษา
รายได้
โอนเงิน
อื่น ๆ
```

---

### 5.3 slips

```sql
create table slips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null,
  image_url text,
  image_hash text,

  ocr_provider text not null default 'deepseek',
  ocr_model text not null default 'deepseek-v4-flash',
  ocr_status text not null default 'pending'
    check (ocr_status in ('pending', 'processing', 'success', 'failed', 'needs_review')),

  raw_ocr_text text,
  extracted_json jsonb,
  confidence numeric(4,3),
  error_message text,

  created_at timestamptz not null default now(),
  processed_at timestamptz,

  unique (user_id, image_hash)
);
```

`image_hash` ใช้กัน upload รูปเดิมซ้ำ

---

### 5.4 transactions

```sql
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  slip_id uuid references slips(id) on delete set null,
  category_id uuid references categories(id) on delete set null,

  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(12,2) not null check (amount >= 0),
  fee numeric(12,2) not null default 0,
  currency text not null default 'THB',

  title text not null,
  note text,
  merchant_name text,
  sender_name text,
  receiver_name text,
  bank_name text,
  reference_no text,

  transaction_date date not null,
  transaction_time time,

  source text not null default 'slip'
    check (source in ('slip', 'manual', 'import', 'recurring')),
  status text not null default 'confirmed'
    check (status in ('draft', 'confirmed', 'rejected')),

  ai_category text,
  ai_confidence numeric(4,3),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, reference_no)
);
```

`unique (user_id, reference_no)` สำคัญมาก เพราะใช้กันสลิปซ้ำ ถ้าไม่มี ไอ้ยอดรวมเดือนจะเพี้ยนแบบโง่ ๆ

---

### 5.5 daily_summaries

```sql
create table daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  summary_date date not null,

  total_income numeric(12,2) not null default 0,
  total_expense numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null default 0,

  category_breakdown jsonb not null default '[]',
  top_transactions jsonb not null default '[]',
  ai_summary text,
  ai_insights jsonb,
  risk_level text check (risk_level in ('low', 'medium', 'high')),

  model_provider text not null default 'nvidia',
  model_name text not null default 'nemotron-ultra',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, summary_date)
);
```

ต้องใช้ `upsert` ไม่ใช่ `insert` เพราะ daily cron อาจรันซ้ำได้

---

### 5.6 budgets

```sql
create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  month date not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);
```

---

### 5.7 merchant_rules

```sql
create table merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  pattern text not null,
  category_id uuid references categories(id) on delete cascade,
  default_title text,
  created_at timestamptz not null default now()
);
```

ใช้จำ rule เช่น:

```text
ถ้า receiver_name มี "123 เซอร์วิส" -> หมวด บิล/บริการ
ถ้า receiver_name มี "BTS" -> หมวด เดินทาง
ถ้า receiver_name มี "7-ELEVEN" -> หมวด อาหาร/ของใช้
```

---

### 5.8 ai_logs

```sql
create table ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  task text not null,
  provider text not null,
  model text,
  input_hash text,
  input_preview text,
  output_json jsonb,
  latency_ms integer,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);
```

ตารางนี้เอาไว้ debug เวลามีปัญหา เช่น DeepSeek อ่านจำนวนเงินผิด หรือ Nemotron สรุปแปลก ๆ

---

## 6. Row Level Security

ทุก table ที่มี `user_id` ต้องเปิด RLS และบังคับให้ user เห็นเฉพาะข้อมูลตัวเอง

ตัวอย่างสำหรับ `transactions`:

```sql
alter table transactions enable row level security;

create policy "users can read own transactions"
on transactions for select
using (auth.uid() = user_id);

create policy "users can insert own transactions"
on transactions for insert
with check (auth.uid() = user_id);

create policy "users can update own transactions"
on transactions for update
using (auth.uid() = user_id);

create policy "users can delete own transactions"
on transactions for delete
using (auth.uid() = user_id);
```

ทำแบบเดียวกันกับ:

```text
profiles
categories
slips
transactions
daily_summaries
budgets
merchant_rules
ai_logs
```

---

## 7. API Routes

```text
app/api/slips/create/route.ts
app/api/slips/process/route.ts
app/api/transactions/route.ts
app/api/summaries/daily/route.ts
app/api/cron/daily-summary/route.ts
app/api/chat/money/route.ts
app/api/export/csv/route.ts
```

---

### 7.1 POST /api/slips/create

หน้าที่:

1. ตรวจ auth
2. รับ metadata ของไฟล์
3. สร้าง `slips` row สถานะ `pending`
4. คืน upload path หรือ signed upload URL

Response:

```json
{
  "slip_id": "uuid",
  "storage_path": "slips/user-id/file-name.jpg"
}
```

---

### 7.2 POST /api/slips/process

หน้าที่:

1. ตรวจ auth
2. โหลด slip จาก DB
3. เปลี่ยน status เป็น `processing`
4. ส่งรูปไป DeepSeek V4 Flash
5. validate JSON ด้วย Zod
6. update `slips.extracted_json`
7. return data ให้ preview form

Response:

```json
{
  "ok": true,
  "slip": {
    "id": "uuid",
    "amount": 158.00,
    "fee": 0.00,
    "bank_name": "Krungthai",
    "transaction_date_iso": "2026-04-24",
    "transaction_time": "17:42",
    "receiver_name": "123 เซอร์วิส",
    "reference_no": "20260424742563860",
    "confidence": 0.92
  }
}
```

---

### 7.3 POST /api/transactions

หน้าที่:

1. ตรวจ auth
2. รับข้อมูลจาก confirm form
3. ตรวจ duplicate ด้วย `reference_no`
4. insert transaction
5. update slip status ถ้าจำเป็น

Input:

```json
{
  "slip_id": "uuid",
  "type": "expense",
  "amount": 158.00,
  "fee": 0.00,
  "title": "ค่าบริการ 123 เซอร์วิส",
  "category_id": "uuid",
  "transaction_date": "2026-04-24",
  "transaction_time": "17:42",
  "bank_name": "Krungthai",
  "receiver_name": "123 เซอร์วิส",
  "reference_no": "20260424742563860"
}
```

---

### 7.4 POST /api/summaries/daily

ใช้สำหรับกดสรุปวันนี้เอง

หน้าที่:

1. Query transactions ของ user ตามวันที่
2. Aggregate total
3. ส่งเข้า NVIDIA Nemotron Ultra
4. Upsert daily summary
5. Return summary

---

### 7.5 GET /api/cron/daily-summary

ใช้กับ Vercel Cron

หน้าที่:

1. หา user ที่มี transaction วันนี้
2. Generate daily summary ให้แต่ละ user
3. Upsert ลง `daily_summaries`

ต้องออกแบบให้ idempotent:

```text
รันซ้ำได้ ผลไม่ซ้ำ ไม่เบิ้ล transaction ไม่เบิ้ล summary
```

---

### 7.6 POST /api/chat/money

ใช้สำหรับ Money Chat

ตัวอย่างคำถาม:

```text
วันนี้กูใช้ไปเท่าไหร่
เดือนนี้กูหมดกับอะไรเยอะสุด
ค่าอาหารสัปดาห์นี้เกินปกติไหม
ร้านไหนกูจ่ายบ่อยสุด
```

Flow:

```text
User question
 -> classify intent
 -> query DB เฉพาะข้อมูลที่จำเป็น
 -> ส่งข้อมูลสรุปให้ Nemotron Ultra
 -> return answer
```

อย่าส่ง transaction ทั้งหมดมั่ว ๆ ให้ AI ถ้าไม่จำเป็น เสีย token และเสี่ยงเรื่อง privacy

---

## 8. DeepSeek V4 Flash Slip Extraction

### 8.1 Provider Interface

```ts
export type SlipExtractionResult = {
  documentType: 'thai_bank_slip' | 'receipt' | 'unknown'
  bankName: string | null
  status: 'success' | 'failed' | 'unknown'
  amount: number | null
  fee: number | null
  currency: 'THB'
  transactionDateIso: string | null
  transactionTime: string | null
  senderName: string | null
  receiverName: string | null
  receiverAccountHint: string | null
  referenceNo: string | null
  rawText: string
  confidence: number
}

export interface SlipExtractionProvider {
  extractFromImage(imageUrl: string): Promise<SlipExtractionResult>
}
```

Implementation หลัก:

```text
deepseekV4FlashSlipProvider.extractFromImage()
```

Fallback ที่ควรเตรียมไว้:

```text
mockSlipProvider.extractFromImage()
manualSlipProvider.extractFromImage()
```

ช่วง dev ให้ใช้ mock ก่อน ไม่งั้นมึงจะเผา API token ทุกครั้งที่ refresh หน้าเว็บ โคตรไม่คุ้ม

---

### 8.2 Prompt สำหรับ DeepSeek V4 Flash

```text
You are a slip extraction engine for Thai bank transfer slips.

Extract only information that is visible in the image.
Do not guess missing values.
Return only valid JSON.
No markdown.
No explanation.

Schema:
{
  "document_type": "thai_bank_slip" | "receipt" | "unknown",
  "bank_name": string | null,
  "status": "success" | "failed" | "unknown",
  "amount": number | null,
  "fee": number | null,
  "currency": "THB",
  "transaction_date_iso": string | null,
  "transaction_time": string | null,
  "sender_name": string | null,
  "receiver_name": string | null,
  "receiver_account_hint": string | null,
  "reference_no": string | null,
  "raw_text": string,
  "confidence": number
}

Rules:
- Convert Buddhist year to Gregorian year.
- If the year is 2569, convert to 2026.
- Amount must be numeric.
- Fee must be numeric.
- If the slip says "จำนวนเงิน 158.00 บาท", amount must be 158.00.
- Do not invent category.
- Do not infer what the payment was for.
- If unsure, use null.
- confidence must be between 0 and 1.
```

---

### 8.3 Zod Schema

```ts
import { z } from 'zod'

export const slipExtractionSchema = z.object({
  document_type: z.enum(['thai_bank_slip', 'receipt', 'unknown']),
  bank_name: z.string().nullable(),
  status: z.enum(['success', 'failed', 'unknown']),
  amount: z.number().nullable(),
  fee: z.number().nullable(),
  currency: z.literal('THB'),
  transaction_date_iso: z.string().nullable(),
  transaction_time: z.string().nullable(),
  sender_name: z.string().nullable(),
  receiver_name: z.string().nullable(),
  receiver_account_hint: z.string().nullable(),
  reference_no: z.string().nullable(),
  raw_text: z.string(),
  confidence: z.number().min(0).max(1),
})
```

---

## 9. NVIDIA Nemotron Ultra Summary

### 9.1 Daily Summary Prompt

```text
You are a personal finance analyst for a Thai user.

Summarize daily spending from structured transaction data.
Be factual.
Do not invent transactions.
Do not give investment advice.
Return Thai language output.
Return only valid JSON.

Schema:
{
  "summary": string,
  "total_income": number,
  "total_expense": number,
  "net_amount": number,
  "top_categories": [
    {
      "category": string,
      "amount": number,
      "percentage": number
    }
  ],
  "notable_items": [
    {
      "title": string,
      "amount": number,
      "reason": string
    }
  ],
  "insights": string[],
  "suggestions": string[],
  "risk_level": "low" | "medium" | "high"
}

Transactions:
{{transactions_json}}
```

---

### 9.2 ตัวอย่าง Output

```json
{
  "summary": "วันนี้มีรายจ่ายทั้งหมด 158.00 บาท จาก 1 รายการ โดยเป็นค่าบริการ 123 เซอร์วิสในหมวดบิล/บริการ",
  "total_income": 0,
  "total_expense": 158,
  "net_amount": -158,
  "top_categories": [
    {
      "category": "บิล/บริการ",
      "amount": 158,
      "percentage": 100
    }
  ],
  "notable_items": [
    {
      "title": "ค่าบริการ 123 เซอร์วิส",
      "amount": 158,
      "reason": "เป็นรายการเดียวของวันนี้และคิดเป็น 100% ของรายจ่าย"
    }
  ],
  "insights": [
    "วันนี้ยังไม่มีรูปแบบการใช้จ่ายผิดปกติ เพราะมีข้อมูลเพียง 1 รายการ"
  ],
  "suggestions": [
    "ถ้ารายการนี้เกิดซ้ำทุกเดือน ควรจัดเป็นค่าใช้จ่ายประจำเพื่อให้วางงบง่ายขึ้น"
  ],
  "risk_level": "low"
}
```

---

## 10. UI Design

### 10.1 Design Direction

สไตล์หลัก:

```text
Minimal
Fast
Calm
Chat-first
Dashboard-light
```

แรงบันดาลใจ:

```text
ChatGPT: เรียบ โล่ง ใช้ง่าย
Gemini: card สวย นุ่ม
Qwen: สะอาด ไม่รก
Grok: modern dark mode
```

โทนสี:

```text
Light background: #FAFAFA
Dark background: #0B0B0C
Card light: #FFFFFF
Card dark: #151518
Text primary: #111111 / #F5F5F5
Text muted: #666666 / #A1A1AA
Accent: #2563EB หรือ #10B981
Border: #E5E7EB / #27272A
```

ฟอนต์:

```text
Inter
Noto Sans Thai
```

Radius:

```text
16px ถึง 24px
```

---

### 10.2 Main Layout

```text
┌────────────────────────────────────────────────────┐
│ Sidebar             Main Content                   │
│                                                    │
│ Today               สวัสดี New                    │
│ Upload              วันนี้ใช้ไป 158.00 บาท        │
│ Transactions        [ Upload Slip Card ]           │
│ Summary             [ Recent Transactions ]        │
│ Budgets             [ AI Insight ]                 │
│ Settings                                           │
└────────────────────────────────────────────────────┘
```

---

### 10.3 Dashboard Page

บนสุด:

```text
สวัสดี New
วันนี้ใช้ไป 158.00 บาท
```

Cards:

```text
รายจ่ายวันนี้     158.00
รายรับวันนี้      0.00
สุทธิวันนี้       -158.00
รายการวันนี้      1 รายการ
```

Upload card:

```text
[ + อัปโหลดสลิป ]
ลากรูปมาวาง หรือคลิกเพื่อเลือกไฟล์
รองรับ JPG, PNG, WEBP
```

Recent transactions:

```text
ค่าบริการ 123 เซอร์วิส      -158.00
บิล/บริการ                  24 เม.ย. 17:42
```

AI Insight:

```text
วันนี้มีรายจ่าย 1 รายการ รวม 158.00 บาท
ยังไม่มี pattern ผิดปกติ
```

---

### 10.4 Upload Page

```text
อัปโหลดสลิป

[ Image Preview ]

DeepSeek อ่านได้:
จำนวนเงิน: 158.00 บาท
วันที่: 24 เม.ย. 2569
เวลา: 17:42
ผู้รับ: 123 เซอร์วิส
เลขอ้างอิง: 20260424742563860

จ่ายอะไรไป?
[ ค่าบริการ 123 เซอร์วิส ]

หมวดหมู่
[ บิล/บริการ v ]

โน้ต
[ optional ]

[บันทึกรายจ่าย]
```

Form ต้องสั้น อย่ายัด field 30 อันตั้งแต่แรก คนใช้หนีหมด

---

### 10.5 Money Chat Page

```text
ถามเรื่องเงินของมึง...

[ เดือนนี้กูหมดกับอะไรเยอะสุด? ]
[ วันนี้ใช้ไปเท่าไหร่? ]
[ ค่าอาหารสัปดาห์นี้เกินปกติไหม? ]
```

คำตอบควรเป็นภาษาคน ไม่ใช่รายงานบัญชีแห้ง ๆ

---

## 11. Feature เพิ่มเติมที่ควรมี

### 11.1 Duplicate Slip Detection

ใช้ `reference_no` และ `image_hash`

ถ้าสลิปซ้ำ:

```text
สลิปนี้เคยบันทึกแล้ว
จำนวนเงิน: 158.00 บาท
วันที่: 24 เม.ย. 2569

[ดูรายการเดิม] [บันทึกซ้ำอยู่ดี]
```

---

### 11.2 Smart Category Memory

ถ้าผู้ใช้เคยจัด:

```text
123 เซอร์วิส -> บิล/บริการ
```

ครั้งต่อไปเจอ receiver เดิม ให้เดาหมวดให้อัตโนมัติ

---

### 11.3 Confidence Warning

ถ้า confidence ต่ำกว่า 0.75:

```text
ระบบไม่มั่นใจ กรุณาตรวจยอดก่อนบันทึก
```

ถ้า amount เป็น null:

```text
อ่านจำนวนเงินไม่สำเร็จ กรุณากรอกเอง
```

---

### 11.4 Manual Transaction

ต้องมี เพราะบางรายการไม่มีสลิป เช่น เงินสด

```text
[ + เพิ่มรายการเอง ]
```

Fields:

```text
จำนวนเงิน
รายรับ/รายจ่าย
จ่ายอะไร
หมวดหมู่
วันที่
โน้ต
```

---

### 11.5 Budget

ตั้งงบรายเดือนตามหมวด:

```text
อาหาร 6,000
เดินทาง 2,000
บิล/บริการ 3,000
ช้อปปิ้ง 4,000
```

Dashboard แสดง:

```text
อาหาร ใช้ไป 3,200 / 6,000
เหลือ 2,800
```

---

### 11.6 Spending Heatmap

ปฏิทินรายเดือนที่แสดงว่าวันไหนใช้เยอะ

```text
เม.ย. 2569
24 เม.ย. ใช้ไป 158 บาท
```

ยังไม่ต้องทำละเอียดใน MVP แต่ควรเตรียมไว้ใน Phase 3

---

### 11.7 CSV Export

ควรมีเร็วกว่า PDF เพราะง่ายและเอาไปใช้ต่อได้จริง

Columns:

```text
date,time,type,title,category,amount,fee,bank,receiver,reference_no,note
```

---

### 11.8 Monthly AI Review

ทุกสิ้นเดือนให้ Nemotron Ultra สรุป:

```text
เดือนนี้ใช้ไปทั้งหมดเท่าไหร่
หมวดไหนหนักสุด
รายการไหนซ้ำบ่อย
มีค่าใช้จ่ายประจำอะไรบ้าง
ควรลดตรงไหนแบบไม่ทรมานชีวิต
```

---

### 11.9 Recurring Expense Detection

ระบบตรวจว่า item ไหนเกิดซ้ำ เช่น:

```text
Spotify
Netflix
ค่ามือถือ
ค่าอินเทอร์เน็ต
ค่าสมาชิกต่าง ๆ
```

แล้วแสดง:

```text
มีโอกาสว่า "ค่าบริการ 123 เซอร์วิส" เป็นรายจ่ายประจำ
ต้องการตั้งเป็น recurring expense ไหม?
```

---

### 11.10 Receipt Mode

อนาคตอาจรองรับใบเสร็จร้านค้า ไม่ใช่แค่สลิปโอนเงิน

เพิ่ม `document_type`:

```text
thai_bank_slip
receipt
invoice
unknown
```

---

## 12. Folder Structure

```text
src/
  app/
    (auth)/
      login/
        page.tsx
    (dashboard)/
      dashboard/
        page.tsx
      upload/
        page.tsx
      transactions/
        page.tsx
      summaries/
        page.tsx
      budgets/
        page.tsx
      chat/
        page.tsx
      settings/
        page.tsx
    api/
      slips/
        create/
          route.ts
        process/
          route.ts
      transactions/
        route.ts
      summaries/
        daily/
          route.ts
      cron/
        daily-summary/
          route.ts
      chat/
        money/
          route.ts
      export/
        csv/
          route.ts

  components/
    ui/
    app-sidebar.tsx
    upload-slip-card.tsx
    slip-preview.tsx
    transaction-form.tsx
    daily-summary-card.tsx
    money-chat.tsx
    category-picker.tsx
    budget-card.tsx
    transaction-list.tsx

  lib/
    supabase/
      client.ts
      server.ts
      middleware.ts
    ai/
      deepseek-v4-flash-slip.ts
      nvidia-nemotron-summary.ts
      schemas.ts
      prompts.ts
    db/
      categories.ts
      slips.ts
      transactions.ts
      summaries.ts
      budgets.ts
    utils/
      date.ts
      money.ts
      thai-year.ts
      image-hash.ts

  types/
    database.ts
    slip.ts
    transaction.ts
    summary.ts
```

---

## 13. Helper Functions ที่ต้องมี

### 13.1 Buddhist Year Converter

```ts
export function buddhistYearToGregorian(year: number) {
  return year > 2400 ? year - 543 : year
}
```

---

### 13.2 Money Parser

```ts
export function parseThaiMoney(value: string) {
  const cleaned = value
    .replace(/บาท/g, '')
    .replace(/,/g, '')
    .trim()

  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : null
}
```

---

### 13.3 Image Hash

```ts
export async function createImageHash(file: File) {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
```

---

## 14. MVP Scope

### Phase 1: ใช้ได้จริงก่อน

```text
Google Login
Upload slip
Supabase Storage
DeepSeek V4 Flash extraction
Confirm form
Save transaction
Today dashboard
Manual daily summary
```

### Phase 2: ฉลาดขึ้น

```text
Duplicate detection
Smart category memory
Vercel Cron daily summary
Budget
Money Chat
CSV Export
```

### Phase 3: น่าใช้ขึ้น

```text
Monthly AI Review
Spending Heatmap
Recurring Expense Detection
Receipt Mode
Batch Upload
Dark Mode
Mobile PWA
```

---

## 15. สิ่งที่ไม่ควรทำใน MVP

อย่าเพิ่งทำ:

```text
LINE notification
Bank API integration
Multi-user team account
ระบบบัญชีภาษีเต็มรูปแบบ
PDF export ขั้นสูง
เชื่อม prompt agent หลายตัว
Auto financial advice
ระบบ subscription billing
```

เหตุผล: มึงจะสร้างระบบที่ใหญ่เกินไปก่อน core flow ใช้ได้จริง โง่แบบ classic startup มาก อย่าทำ

---

## 16. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

NVIDIA_API_KEY=
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_SLIP_MODEL=deepseek-ai/deepseek-v4-flash
NVIDIA_SUMMARY_MODEL=nemotron-ultra

INTERNAL_ENCRYPTION_SECRET=
INTERNAL_ENCRYPTION_SALT=
CRON_SECRET=
```

---

## 17. Prompt สำหรับสั่ง Claude Code / Codex สร้างโปรเจกต์

```text
Build a minimal personal finance web app using Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase Auth, Supabase Postgres, and Supabase Storage.

The app must deploy to Vercel.

Use DeepSeek V4 Flash as the main slip extraction model.
Use NVIDIA Nemotron Ultra as the daily and monthly financial summary model.

Core features:
1. Google login via Supabase Auth.
2. User can upload Thai bank transfer slip images.
3. Store slip images in Supabase Storage.
4. Create slip records in Postgres.
5. Send uploaded slip image to DeepSeek V4 Flash through a provider interface.
6. DeepSeek V4 Flash must return structured JSON:
   document_type, bank_name, status, amount, fee, currency, transaction_date_iso, transaction_time, sender_name, receiver_name, receiver_account_hint, reference_no, raw_text, confidence.
7. Validate all AI output with Zod.
8. User must enter what the payment was for before saving.
9. User can confirm or edit extracted data.
10. Save confirmed data as a transaction.
11. Dashboard shows today's total expense, income, net amount, and recent transactions.
12. Add duplicate detection using user_id + reference_no and user_id + image_hash.
13. Add daily summary generation endpoint using NVIDIA Nemotron Ultra from structured transaction data.
14. Add Vercel Cron route for daily summary and make it idempotent.
15. Add Row Level Security policies for all user-owned tables.
16. Add minimal UI inspired by ChatGPT/Gemini/Qwen/Grok: clean sidebar, large upload card, simple transaction list, calm typography.
17. Keep the architecture simple.

Do not add LINE notification, team management, bank API integration, subscription billing, or complex accounting features.
```

---

## 18. Final Recommendation

ให้ทำตามนี้:

```text
Next.js + Vercel
Supabase Auth Google Login
Supabase Postgres
Supabase Storage
DeepSeek V4 Flash สำหรับอ่าน/แกะข้อมูลสลิป
NVIDIA Nemotron Ultra สำหรับสรุปรายวัน รายเดือน และ Money Chat
Vercel Cron สำหรับ daily summary
Minimal UI แบบ chat-first dashboard
```

สิ่งที่ต้องระวังที่สุด:

1. ห้ามเชื่อ AI 100% ต้องมีหน้า confirm
2. ต้องกันสลิปซ้ำด้วย reference_no และ image_hash
3. ต้อง validate JSON ด้วย Zod
4. ต้องเปิด RLS ทุก table
5. ต้องแยก DeepSeek slip extraction กับ Nemotron summary ให้ชัด
6. ต้องทำ UI ให้ง่าย ไม่ใช่ยัดกราฟเหมือนเครื่องบินรบ

เวอร์ชันที่ควรเริ่มจริงคือ:

```text
Login -> Upload Slip -> DeepSeek Extract -> Confirm -> Save -> Today Summary
```

แค่นี้ก่อน ถ้า flow นี้เร็วและไม่ห่วย ค่อยต่อยอด Budget, Money Chat, Monthly Review ทีหลัง
