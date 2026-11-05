# ব্যবসার খাতা: সেটআপ গাইড

ছোট ব্যবসার জন্য বাংলা হিসাবের ওয়েব অ্যাপ। মোবাইলে ব্যবহারের জন্য বানানো।
স্টক, খদ্দের (কল ও WhatsApp বোতাম সহ), বিক্রি, খরচ, বাকি কিস্তি (EMI), মতামত এবং অ্যাডমিন প্যানেল আছে।

## কী কী লাগবে

- একটি ফ্রি Supabase অ্যাকাউন্ট (supabase.com)
- একটি ফ্রি Vercel অ্যাকাউন্ট (vercel.com), GitHub দিয়ে লগইন করলেই হবে

## ধাপ ১: Supabase প্রজেক্ট

1. supabase.com এ লগইন করে **New project** খুলুন। Region হিসেবে **Mumbai (ap-south-1)** বাছুন।
2. বাঁদিকের মেনু থেকে **SQL Editor** খুলুন, **New query** চাপুন।
3. এই রিপোজিটরির `business-khata/supabase/schema.sql` ফাইলের পুরো লেখা কপি করে পেস্ট করুন, তারপর **Run** চাপুন।
   "Success" দেখালে ডাটাবেস তৈরি।
4. **Authentication > Sign In / Providers > Email** এ যান।
   - সহজে শুরু করতে **Confirm email** বন্ধ রাখতে পারেন। চালু রাখলে নতুন ইউজারকে ইমেইলের লিংকে ক্লিক করে তারপর লগইন করতে হবে।
5. **Project Settings > API** থেকে দুটি জিনিস লিখে রাখুন:
   - **Project URL** (যেমন `https://abcd.supabase.co`)
   - **anon public** key
   > সাবধান: `service_role` key কোথাও দেবেন না। এই অ্যাপে তার দরকার নেই।

## ধাপ ২: Vercel এ ডিপ্লয়

1. vercel.com এ **Add New > Project** চাপুন, এই GitHub রিপোজিটরি বাছুন।
2. **Root Directory** এ `business-khata` দিন। Framework Preset: **Other**। Build Command খালি রাখুন।
3. **Environment Variables** এ যোগ করুন:

   | নাম | মান |
   |---|---|
   | `SUPABASE_URL` | ধাপ ১ এর Project URL |
   | `SUPABASE_ANON_KEY` | ধাপ ১ এর anon public key |
   | `ADMIN_WHATSAPP` | (ঐচ্ছিক) আপনার WhatsApp নম্বর, যেমন `9876543210`। মেয়াদ শেষ হলে ইউজার এই নম্বরে অ্যাক্টিভেশনের মেসেজ পাঠাতে পারবেন। |

4. **Deploy** চাপুন। কয়েক মিনিটে একটি লিংক পাবেন, যেমন `https://business-khata.vercel.app`।
5. Supabase এ **Authentication > URL Configuration** এ গিয়ে **Site URL** এ এই লিংকটি দিন (ইমেইল যাচাই ও পাসওয়ার্ড রিসেটের জন্য দরকার)।

## ধাপ ৩: নিজেকে অ্যাডমিন বানান

1. অ্যাপের লিংকে গিয়ে নিজের ইমেইল দিয়ে একটি অ্যাকাউন্ট খুলুন।
2. Supabase **SQL Editor** এ এটি চালান (ইমেইল বদলে নিজেরটা দিন):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'apnar-email@example.com';
   ```

3. এবার `https://আপনার-লিংক/admin` খুলে লগইন করুন।

## অ্যাডমিন প্যানেলে কী করা যায়

- সব ইউজারের তালিকা: ব্যবসার নাম, ইমেইল, ফোন, সাইনআপের তারিখ, মেয়াদের অবস্থা (ফ্রি / সক্রিয় / লক)
- ইউজারকে কল বা WhatsApp করা
- **অ্যাক্টিভেট**: ১ মাস, ৩ মাস, ৬ মাস, ১ বছর অথবা সীমাহীন মেয়াদ
- **ডিঅ্যাক্টিভেট**
- ইউজারদের পাঠানো সব মতামত পড়া

## মেয়াদের নিয়ম

- সাইনআপের মুহূর্ত থেকে **১৫ দিন** ফ্রি। প্রথম দিন থেকেই অ্যাপের ওপরে কত দিন বাকি ও শেষের তারিখ দেখায়। শেষ ৩ দিন রঙ বদলে সতর্ক করে।
- ১৫ দিন পরে অ্যাপ লক হয়ে যায়। ইউজারের **কোনো তথ্য মোছে না**, শুধু দেখা ও লেখা বন্ধ থাকে।
- অ্যাডমিন অ্যাক্টিভেট করলে ইউজার "অ্যাক্টিভেট হয়েছে কিনা দেখুন" চাপলেই সব পুরনো তথ্য ফিরে পান।
- এই নিয়ম ডাটাবেসেই (Row Level Security) বসানো, তাই ব্রাউজারে কারসাজি করে এড়ানো যায় না।
- প্রত্যেক ইউজার শুধু নিজের তথ্য দেখতে পান। অ্যাডমিনও কারো ব্যবসার হিসাব দেখতে পান না, শুধু ইউজার তালিকা ও মতামত।
- মতামত পাঠানো যায় ফ্রি মেয়াদের ১৫ দিনের মধ্যে।

## লোকাল কম্পিউটারে চালানো ও টেস্ট

Node.js 18 বা তার বেশি লাগবে।

```bash
cd business-khata
npm run dev
```

ব্রাউজারে `http://127.0.0.1:5173` খুলুন। Supabase এর তথ্য না দিলে অ্যাপ **ডেমো মোডে** চলে (তথ্য শুধু ব্রাউজারে থাকে, `admin@` দিয়ে শুরু ইমেইল হলে অ্যাডমিন)। আসল Supabase দিয়ে চালাতে:

```bash
SUPABASE_URL=https://abcd.supabase.co SUPABASE_ANON_KEY=xxxx npm run dev
```

টেস্ট:

```bash
npm test
```

```bash
npm run test:sql
```

```bash
npm run test:e2e
```

- `npm test`: হিসাব, তারিখ, মেয়াদ, ফোন নম্বর ইত্যাদির ইউনিট টেস্ট
- `npm run test:sql`: লোকাল PostgreSQL এ `schema.sql` চালিয়ে দেখে যে এক ইউজার অন্যের তথ্য দেখতে পায় না, মেয়াদ শেষে লক হয়, ডেটা থাকে, অ্যাক্টিভেশনে ফিরে আসে (PostgreSQL ইনস্টল থাকতে হবে)
- `npm run test:e2e`: ৩৬০ ও ৩৯০ পিক্সেল চওড়া ফোনের মাপে পুরো অ্যাপ চালিয়ে দেখে (Playwright লাগবে)। স্ক্রিনশট থাকে `tests/screenshots/` ফোল্ডারে।

## ফোল্ডারের গঠন

```
business-khata/
  api/config.js         Vercel ফাংশন: ব্রাউজারকে Supabase URL ও anon key দেয়
  public/               অ্যাপের সব পাতা (কোনো বিল্ড লাগে না)
    index.html          মূল অ্যাপ
    admin.html          অ্যাডমিন প্যানেল (/admin)
    js/logic.js         হিসাব ও মেয়াদের লজিক
    js/backend.js       Supabase ও ডেমো ডেটা লেয়ার
    vendor/supabase.js  Supabase JS লাইব্রেরি (v2.45.4, MIT)
  supabase/schema.sql   টেবিল, নিরাপত্তা নিয়ম ও অ্যাডমিন ফাংশন
  tests/                ইউনিট, SQL ও ফোন মাপের টেস্ট
```

## সমস্যা হলে

- **"সেটআপ বাকি আছে" দেখাচ্ছে**: Vercel এ Environment Variables দেওয়ার পর **Redeploy** করুন।
- **সাইনআপের পর লগইন হচ্ছে না**: Supabase এ Confirm email চালু থাকলে আগে ইমেইলের লিংকে ক্লিক করতে হবে।
- **অ্যাডমিন প্যানেলে "অনুমতি নেই"**: ধাপ ৩ এর SQL ঠিক ইমেইল দিয়ে চালানো হয়েছে কিনা দেখুন।
- **নিজের সময়ে কাউকে অ্যাক্টিভেট করতে চান SQL দিয়ে**:
  ```sql
  update public.profiles set activated = true, activated_at = now(), activated_until = null
  where email = 'user@example.com';
  ```
