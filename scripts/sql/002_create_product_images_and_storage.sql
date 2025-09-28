-- Requires pgcrypto for gen_random_uuid in some stacks; fallback to uuid_generate_v4 if preferred
create extension if not exists pgcrypto;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  url text, -- optional signed/public URL
  created_at timestamptz default now()
);

alter table public.product_images enable row level security;

-- Only allow owners to insert/select/update/delete their own records
create policy if not exists "product_images_insert_own"
on public.product_images
for insert
to authenticated
with check (auth.uid() = user_id);

create policy if not exists "product_images_select_own"
on public.product_images
for select
to authenticated
using (auth.uid() = user_id);

create policy if not exists "product_images_update_own"
on public.product_images
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "product_images_delete_own"
on public.product_images
for delete
to authenticated
using (auth.uid() = user_id);

-- Create Storage bucket for product images if it doesn't exist
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'product-images') then
    insert into storage.buckets (id, name, public) values ('product-images', 'product-images', false);
  end if;
end
$$;

-- Storage Policies for the product-images bucket
-- Authenticated users can upload files to the bucket
create policy if not exists "storage_insert_images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (auth.uid() = owner) is not false -- owner is auto-set for authenticated users
);

-- Allow owners to read their own files (signed URLs are preferred)
create policy if not exists "storage_select_own_images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-images'
  and (auth.uid() = owner)
);

-- Allow owners to update/delete their own files
create policy if not exists "storage_update_own_images"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and (auth.uid() = owner))
with check (bucket_id = 'product-images' and (auth.uid() = owner));

create policy if not exists "storage_delete_own_images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and (auth.uid() = owner));
