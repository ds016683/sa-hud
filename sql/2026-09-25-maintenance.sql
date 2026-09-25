-- 9/25: Maintenance pills (Health, Hygiene, Spiritual, Family) and health logs
alter table maintenance_items drop constraint if exists maintenance_items_category_check;
alter table maintenance_items add constraint maintenance_items_category_check
  check (category in ('health','hygiene','spiritual','family','content','exercise','other'));
alter table daily_logs drop constraint if exists daily_logs_kind_check;
alter table daily_logs add constraint daily_logs_kind_check
  check (kind in ('discomfort','hygiene','exercise','sleep','note','activity','medication','diet'));
alter table meeting_sessions add column if not exists agenda_touched_at timestamptz;
-- HUD quick-adds on the Health pills write daily_logs directly
create policy "owner write" on daily_logs for insert to authenticated with check (true);
