alter table devices add column if not exists disk_usage numeric;
alter table devices add column if not exists uptime_seconds bigint;
