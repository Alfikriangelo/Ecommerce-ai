create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  bucket text not null default 'product-images',
  path text not null,
  public_url text,
  title text,
  content_type text,
  created_at timestamptz not null default now()
);

alter table public.product_images enable row level security;

create policy if not exists "Users can view own images"
  on public.product_images for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own images"
  on public.product_images for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own images"
  on public.product_images for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete own images"
  on public.product_images for delete
  using (auth.uid() = user_id);
