create table if not exists device_metrics (
    id bigserial primary key,
    device_id text not null references devices(id) on delete cascade,
    cpu_usage numeric,
    ram_usage numeric,
    disk_usage numeric,
    recorded_at timestamptz not null default now()
);

create index if not exists device_metrics_device_id_recorded_at_idx
    on device_metrics (device_id, recorded_at desc);

alter table device_metrics enable row level security;

create policy "Public read access"
    on device_metrics for select
    using (true);
