-- =====================================================================
-- ব্যবসার খাতা (Business Khata) : Supabase ডাটাবেস স্কিমা
-- Supabase Dashboard > SQL Editor এ পুরোটা একবারে চালান।
-- বারবার চালালেও সমস্যা নেই (idempotent)।
-- =====================================================================

-- ---------- প্রোফাইল (প্রতিটি ইউজারের একটি) ----------
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  email            text,
  business_name    text not null default '',
  owner_name       text not null default '',
  phone            text not null default '',
  created_at       timestamptz not null default now(),
  trial_ends_at    timestamptz not null default (now() + interval '15 days'),
  activated        boolean not null default false,
  activated_at     timestamptz,
  activated_until  timestamptz            -- null + activated = মেয়াদ সীমাহীন
);

-- ---------- অ্যাডমিন তালিকা ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- ---------- স্টক ----------
create table if not exists public.stock_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  unit        text not null default 'পিস',
  quantity    numeric not null default 0,
  buy_price   numeric not null default 0 check (buy_price >= 0),
  sell_price  numeric not null default 0 check (sell_price >= 0),
  low_alert   numeric not null default 0 check (low_alert >= 0),
  created_at  timestamptz not null default now()
);

-- ---------- ক্লায়েন্ট / খদ্দের ----------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  phone       text not null default '',
  address     text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

-- ---------- বিক্রি ----------
create table if not exists public.sales (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sale_date   date not null default current_date,
  client_id   uuid references public.clients (id) on delete set null,
  stock_id    uuid references public.stock_items (id) on delete set null,
  description text not null default '',
  quantity    numeric not null default 0 check (quantity >= 0),
  amount      numeric not null check (amount >= 0),
  paid        numeric not null default 0 check (paid >= 0),
  created_at  timestamptz not null default now()
);

-- ---------- খরচ ----------
create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expense_date  date not null default current_date,
  category      text not null default 'অন্যান্য',
  description   text not null default '',
  amount        numeric not null check (amount >= 0),
  created_at    timestamptz not null default now()
);

-- ---------- বাকি EMI ----------
create table if not exists public.emis (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  direction           text not null default 'pay' check (direction in ('pay', 'receive')),
  party_name          text not null check (length(trim(party_name)) > 0),
  client_id           uuid references public.clients (id) on delete set null,
  emi_amount          numeric not null check (emi_amount >= 0),
  total_installments  int not null check (total_installments > 0),
  paid_installments   int not null default 0 check (paid_installments >= 0),
  next_due_date       date,
  notes               text not null default '',
  created_at          timestamptz not null default now(),
  check (paid_installments <= total_installments)
);

-- ---------- মতামত (ফিডব্যাক) ----------
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  message     text not null check (length(trim(message)) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index if not exists stock_user_idx    on public.stock_items (user_id);
create index if not exists clients_user_idx  on public.clients (user_id);
create index if not exists sales_user_idx    on public.sales (user_id, sale_date);
create index if not exists expenses_user_idx on public.expenses (user_id, expense_date);
create index if not exists emis_user_idx     on public.emis (user_id);
create index if not exists feedback_user_idx on public.feedback (user_id);

-- =====================================================================
-- সহায়ক ফাংশন
-- =====================================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ইউজার এখন অ্যাপ ব্যবহার করতে পারবেন কিনা (ফ্রি মেয়াদ বা অ্যাক্টিভেশন)
create or replace function public.has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and (
        now() < p.trial_ends_at
        or (p.activated and (p.activated_until is null or now() < p.activated_until))
      )
  );
$$;

-- ফ্রি মেয়াদ চলছে কিনা (ফিডব্যাকের জন্য)
create or replace function public.in_trial(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and now() < p.trial_ends_at);
$$;

-- নতুন সাইনআপ হলে স্বয়ংক্রিয়ভাবে প্রোফাইল তৈরি
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, business_name, owner_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'business_name', ''),
    coalesce(new.raw_user_meta_data ->> 'owner_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- বিক্রি হলে স্টক থেকে পরিমাণ কমে, বিক্রি মুছলে আবার ফেরত আসে
create or replace function public.sales_stock_sync()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.stock_id is not null and new.quantity > 0 then
      update public.stock_items set quantity = quantity - new.quantity
       where id = new.stock_id and user_id = new.user_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.stock_id is not null and old.quantity > 0 then
      update public.stock_items set quantity = quantity + old.quantity
       where id = old.stock_id and user_id = old.user_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists sales_stock_sync_trg on public.sales;
create trigger sales_stock_sync_trg
  after insert or delete on public.sales
  for each row execute function public.sales_stock_sync();

-- =====================================================================
-- Row Level Security: প্রত্যেকে শুধু নিজের ডেটা দেখবেন
-- মেয়াদ শেষ হলে ডেটা মুছে যায় না, শুধু অ্যাক্সেস বন্ধ থাকে।
-- =====================================================================

alter table public.profiles    enable row level security;
alter table public.admins      enable row level security;
alter table public.stock_items enable row level security;
alter table public.clients     enable row level security;
alter table public.sales       enable row level security;
alter table public.expenses    enable row level security;
alter table public.emis        enable row level security;
alter table public.feedback    enable row level security;

-- profiles: নিজের প্রোফাইল দেখা যাবে (লক অবস্থাতেও, যাতে মেয়াদ দেখানো যায়)
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- মেয়াদ/অ্যাক্টিভেশন কলাম ইউজার নিজে বদলাতে পারবেন না
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (business_name, owner_name, phone) on public.profiles to authenticated;

-- admins: কেউ সরাসরি পড়তে/লিখতে পারবে না (শুধু SQL Editor থেকে)
revoke all on public.admins from anon, authenticated;

-- ব্যবসার ডেটা টেবিল: নিজের ডেটা + মেয়াদ চালু থাকলে তবেই
do $$
declare t text;
begin
  foreach t in array array['stock_items', 'clients', 'sales', 'expenses', 'emis'] loop
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format(
      'create policy %I on public.%I for all
         using (user_id = auth.uid() and public.has_access(auth.uid()))
         with check (user_id = auth.uid() and public.has_access(auth.uid()))',
      t || '_own', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- feedback: ফ্রি মেয়াদে জমা দেওয়া যাবে; নিজেরটা দেখা যাবে; অ্যাডমিন সব দেখবেন
drop policy if exists feedback_insert_trial on public.feedback;
create policy feedback_insert_trial on public.feedback
  for insert with check (user_id = auth.uid() and public.in_trial(auth.uid()));

drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback
  for select using (user_id = auth.uid() or public.is_admin());

revoke all on public.feedback from anon;
grant select, insert on public.feedback to authenticated;

-- =====================================================================
-- অ্যাডমিন ফাংশন (শুধু admins টেবিলে থাকা ইউজার চালাতে পারবেন)
-- =====================================================================

create or replace function public.admin_list_users()
returns table (
  id uuid, email text, business_name text, owner_name text, phone text,
  created_at timestamptz, trial_ends_at timestamptz, activated boolean,
  activated_at timestamptz, activated_until timestamptz, has_access boolean,
  feedback_count bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query
    select p.id, p.email, p.business_name, p.owner_name, p.phone,
           p.created_at, p.trial_ends_at, p.activated, p.activated_at, p.activated_until,
           public.has_access(p.id),
           (select count(*) from public.feedback f where f.user_id = p.id)
      from public.profiles p
     order by p.created_at desc;
end;
$$;

-- days = null হলে সীমাহীন মেয়াদ, নাহলে আজ থেকে এত দিন
create or replace function public.admin_activate(target uuid, days int default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if days is not null and days <= 0 then
    raise exception 'days_must_be_positive';
  end if;
  update public.profiles
     set activated = true,
         activated_at = now(),
         activated_until = case when days is null then null else now() + make_interval(days => days) end
   where id = target;
  if not found then
    raise exception 'user_not_found';
  end if;
end;
$$;

create or replace function public.admin_deactivate(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  update public.profiles set activated = false, activated_until = null where id = target;
end;
$$;

create or replace function public.admin_list_feedback()
returns table (id uuid, user_id uuid, email text, business_name text, message text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query
    select f.id, f.user_id, p.email, p.business_name, f.message, f.created_at
      from public.feedback f join public.profiles p on p.id = f.user_id
     order by f.created_at desc;
end;
$$;

revoke execute on function public.admin_list_users()          from anon, public;
revoke execute on function public.admin_activate(uuid, int)   from anon, public;
revoke execute on function public.admin_deactivate(uuid)      from anon, public;
revoke execute on function public.admin_list_feedback()       from anon, public;
grant  execute on function public.admin_list_users()          to authenticated;
grant  execute on function public.admin_activate(uuid, int)   to authenticated;
grant  execute on function public.admin_deactivate(uuid)      to authenticated;
grant  execute on function public.admin_list_feedback()       to authenticated;
grant  execute on function public.is_admin()                  to authenticated;
grant  execute on function public.has_access(uuid)            to authenticated;
grant  execute on function public.in_trial(uuid)              to authenticated;
