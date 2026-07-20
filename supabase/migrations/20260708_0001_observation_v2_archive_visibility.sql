drop policy if exists observation_v2_bundles_select_own_active on public.observation_v2_bundles;
create policy observation_v2_bundles_select_own
on public.observation_v2_bundles
for select
to authenticated
using (
  auth.uid() = user_id
);
