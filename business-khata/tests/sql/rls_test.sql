-- RLS ও মেয়াদ লজিকের টেস্ট। কোনো assert ব্যর্থ হলে exception হবে।
\set ON_ERROR_STOP on

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.in', '{"business_name":"রহিম স্টোর"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.in', '{"business_name":"করিম ট্রেডার্স"}'),
  ('99999999-9999-9999-9999-999999999999', 'admin@test.in', '{}');
insert into public.admins values ('99999999-9999-9999-9999-999999999999');

-- ১. সাইনআপে প্রোফাইল তৈরি, ১৫ দিনের মেয়াদ
do $$ begin
  assert (select count(*) from public.profiles) = 3, 'profiles should be auto-created';
  assert (select business_name from public.profiles where email = 'a@test.in') = 'রহিম স্টোর', 'meta copied';
  assert (select abs(extract(epoch from (trial_ends_at - created_at)) - 15*86400) < 5
            from public.profiles where email = 'a@test.in'), 'trial is 15 days';
end $$;

-- ইউজার A হিসেবে কাজ
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into public.stock_items (name, quantity, sell_price) values ('চাল', 50, 60);
insert into public.clients (name, phone) values ('সুমন', '9876543210');
insert into public.sales (stock_id, description, quantity, amount, paid)
  select id, 'চাল বিক্রি', 5, 300, 300 from public.stock_items where name = 'চাল';
insert into public.expenses (category, amount) values ('ভাড়া', 2000);
insert into public.emis (party_name, emi_amount, total_installments) values ('ব্যাংক লোন', 1500, 12);
insert into public.feedback (message) values ('অ্যাপটা ভালো');

do $$ begin
  assert (select quantity from public.stock_items where name = 'চাল') = 45, 'sale should reduce stock';
  assert (select count(*) from public.clients) = 1, 'A sees own client';
end $$;

-- A নিজের মেয়াদ বাড়াতে পারবে না
do $$ begin
  begin
    update public.profiles set trial_ends_at = now() + interval '10 years';
    raise exception 'should have failed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set activated = true;
    raise exception 'should have failed';
  exception when insufficient_privilege then null;
  end;
end $$;
update public.profiles set business_name = 'রহিম স্টোর ২' where id = auth.uid();

-- A অ্যাডমিন ফাংশন চালাতে পারবে না
do $$ begin
  begin
    perform public.admin_activate('11111111-1111-1111-1111-111111111111', null);
    raise exception 'should have failed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ২. ইউজার B, A এর কিছুই দেখতে পাবে না
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  assert (select count(*) from public.clients) = 0, 'B must not see A clients';
  assert (select count(*) from public.stock_items) = 0, 'B must not see A stock';
  assert (select count(*) from public.sales) = 0, 'B must not see A sales';
  assert (select count(*) from public.feedback) = 0, 'B must not see A feedback';
  assert (select count(*) from public.profiles) = 1, 'B sees only own profile';
end $$;
-- B, A এর ডেটা মুছতে পারবে না
delete from public.clients;
-- B, A এর নামে ডেটা ঢোকাতে পারবে না
do $$ begin
  begin
    insert into public.clients (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'হ্যাক');
    raise exception 'should have failed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ৩. A এর মেয়াদ শেষ: লক, কিন্তু ডেটা থাকে
reset role;
update public.profiles set trial_ends_at = now() - interval '1 day' where email = 'a@test.in';
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  assert (select count(*) from public.clients) = 0, 'locked user sees no data';
  assert (select count(*) from public.profiles) = 1, 'locked user still sees own profile';
  begin
    insert into public.clients (name) values ('নতুন');
    raise exception 'should have failed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.feedback (message) values ('মেয়াদ শেষে');
    raise exception 'should have failed';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
do $$ begin
  assert (select count(*) from public.clients where user_id = '11111111-1111-1111-1111-111111111111') = 1,
    'data must remain stored while locked';
end $$;

-- ৪. অ্যাডমিন সব দেখে ও অ্যাক্টিভেট করে
set role authenticated;
select set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', false);
do $$ begin
  assert (select count(*) from public.admin_list_users()) = 3, 'admin sees all users';
  assert (select count(*) from public.admin_list_feedback()) = 1, 'admin sees feedback';
  assert (select not has_access from public.admin_list_users() where email = 'a@test.in'), 'A locked';
end $$;
select public.admin_activate('11111111-1111-1111-1111-111111111111', 30);
do $$ begin
  assert (select has_access from public.admin_list_users() where email = 'a@test.in'), 'A active after activation';
  assert (select count(*) from public.clients) = 0, 'admin does not see business data of others';
end $$;

-- ৫. অ্যাক্টিভেশনের পর A এর পুরনো ডেটা ফিরে আসে
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  assert (select count(*) from public.clients) = 1, 'data returns after activation';
  assert (select quantity from public.stock_items where name = 'চাল') = 45, 'stock intact';
end $$;
insert into public.clients (name) values ('নতুন খদ্দের');

-- ৬. বিক্রি মুছলে স্টক ফেরত
delete from public.sales;
do $$ begin
  assert (select quantity from public.stock_items where name = 'চাল') = 50, 'deleting sale restores stock';
end $$;

-- ৭. সীমাহীন অ্যাক্টিভেশন ও ডিঅ্যাক্টিভেশন
select set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', false);
select public.admin_activate('11111111-1111-1111-1111-111111111111', null);
do $$ begin
  assert (select activated_until is null and activated from public.admin_list_users() where email = 'a@test.in'), 'lifetime';
end $$;
select public.admin_deactivate('11111111-1111-1111-1111-111111111111');
do $$ begin
  assert (select not has_access from public.admin_list_users() where email = 'a@test.in'), 'deactivated';
end $$;

-- ৮. anon কিছুই পড়তে পারবে না
reset role;
set role anon;
do $$ begin
  begin
    perform count(*) from public.clients;
    raise exception 'should have failed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'ALL SQL TESTS PASSED' as result;
