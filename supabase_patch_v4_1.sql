-- ============================================================
-- ae Optics CRM — Patch v4.1 (Required Modifications)
-- تشغيل هذا الملف في Supabase SQL Editor
-- ============================================================

-- ── 1. إضافة phone2 للعملاء (رقم الهاتف الاحتياطي) ───────────────────
alter table customers add column if not exists phone2 text;
create index if not exists idx_customers_phone2 on customers(phone2);

-- ── 2. إضافة حقول الدفع الجزئي للطلبات ───────────────────────────────
alter table orders add column if not exists amount_paid numeric(10,2) default 0;

-- ملاحظة: amount_remaining يُحسب تلقائياً في التطبيق (total_final - amount_paid)
-- لا يمكن إضافة عمود generated إذا كانت total_final نفسها generated
-- لذا نُحسبها في التطبيق

-- ── 3. إضافة ربط العدسات بالطلبات ────────────────────────────────────
alter table orders add column if not exists lens_brand_id   uuid references lens_brands(id);
alter table orders add column if not exists lens_variant_id uuid references lens_variants(id);

-- ── 4. إضافة ربط المخزون بالطلبات ────────────────────────────────────
alter table orders add column if not exists frame_id         uuid references inventory(id);
alter table orders add column if not exists frame_variant_id uuid references inventory_variants(id);

-- ── 5. دالة get_or_create_customer_v2 مع دعم phone2 ──────────────────
create or replace function get_or_create_customer_v2(
  p_phone  text,
  p_name   text,
  p_phone2 text default null
)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  -- البحث بالهاتف الأساسي أو الاحتياطي
  select id into v_id from customers
  where phone = p_phone
     or (p_phone2 is not null and phone2 = p_phone2)
  limit 1;

  if v_id is null then
    insert into customers (phone, name, phone2)
    values (p_phone, p_name, p_phone2)
    returning id into v_id;
  else
    update customers set
      name   = p_name,
      phone2 = coalesce(p_phone2, phone2),
      updated_at = now()
    where id = v_id;
  end if;
  return v_id;
end;
$$;
grant execute on function get_or_create_customer_v2(text, text, text) to authenticated;

-- ── 6. View مساعدة للمخزون مع الكمية المتاحة ──────────────────────────
create or replace view inventory_with_qty as
select
  i.*,
  coalesce(sum(v.qty_available), 0) as total_qty_available,
  coalesce(sum(v.qty_total), 0)     as total_qty
from inventory i
left join inventory_variants v on v.frame_id = i.id
group by i.id;

-- ── 7. Indexes إضافية للأداء ──────────────────────────────────────────
create index if not exists idx_orders_lens_brand    on orders(lens_brand_id);
create index if not exists idx_orders_frame_id      on orders(frame_id);
create index if not exists idx_orders_payment       on orders(payment_status);
create index if not exists idx_orders_amount_paid   on orders(amount_paid);

-- ── 8. دالة خصم المخزون عند إنشاء الطلب ─────────────────────────────
create or replace function deduct_inventory_variant(
  p_variant_id uuid,
  p_qty        integer default 1
)
returns void language plpgsql as $$
begin
  update inventory_variants
  set qty_reserved = qty_reserved + p_qty
  where id = p_variant_id
    and (qty_total - qty_reserved) >= p_qty;

  if not found then
    raise exception 'الكمية المتاحة غير كافية لهذا المنتج';
  end if;
end;
$$;
grant execute on function deduct_inventory_variant(uuid, integer) to authenticated;

-- ── 9. دالة استرداد المخزون عند إلغاء الطلب ──────────────────────────
create or replace function restore_inventory_variant(
  p_variant_id uuid,
  p_qty        integer default 1
)
returns void language plpgsql as $$
begin
  update inventory_variants
  set qty_reserved = greatest(0, qty_reserved - p_qty)
  where id = p_variant_id;
end;
$$;
grant execute on function restore_inventory_variant(uuid, integer) to authenticated;

-- ============================================================
-- ✅ Patch v4.1 — انتهى بنجاح
-- ============================================================
