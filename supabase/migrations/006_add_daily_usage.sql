create table if not exists device_daily_usage (
    device_id text not null references devices(id) on delete cascade,
    date date not null,
    seconds_online numeric not null default 0,
    primary key (device_id, date)
);

alter table device_daily_usage enable row level security;

create policy "Public read access"
    on device_daily_usage for select
    using (true);

create table if not exists app_daily_usage (
    device_id text not null references devices(id) on delete cascade,
    date date not null,
    app_name text not null,
    seconds_seen numeric not null default 0,
    primary key (device_id, date, app_name)
);

alter table app_daily_usage enable row level security;

create policy "Public read access"
    on app_daily_usage for select
    using (true);

create index if not exists app_daily_usage_device_date_idx
    on app_daily_usage (device_id, date);

create or replace function increment_device_daily_usage(p_device_id text, p_date date, p_seconds numeric)
returns void
language sql
as $$
    insert into device_daily_usage (device_id, date, seconds_online)
    values (p_device_id, p_date, p_seconds)
    on conflict (device_id, date)
    do update set seconds_online = device_daily_usage.seconds_online + excluded.seconds_online;
$$;

create or replace function increment_app_daily_usage_bulk(p_device_id text, p_date date, p_app_names text[], p_seconds numeric)
returns void
language sql
as $$
    insert into app_daily_usage (device_id, date, app_name, seconds_seen)
    select p_device_id, p_date, app_name, p_seconds
    from unnest(p_app_names) as app_name
    on conflict (device_id, date, app_name)
    do update set seconds_seen = app_daily_usage.seconds_seen + excluded.seconds_seen;
$$;
