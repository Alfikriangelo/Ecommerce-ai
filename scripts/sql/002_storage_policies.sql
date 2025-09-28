create policy if not exists "Public read product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy if not exists "Users insert product-images"
  on storage.objects for insert
  with check (bucket_id = 'product-images');

create policy if not exists "Users update product-images"
  on storage.objects for update
  using (bucket_id = 'product-images');

create policy if not exists "Users delete product-images"
  on storage.objects for delete
  using (bucket_id = 'product-images');
