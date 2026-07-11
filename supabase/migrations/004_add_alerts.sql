create table if not exists alerts (
    id bigserial primary key,
    device_id text not null references devices(id) on delete cascade,
    type text not null,
    message text not null,
    created_at timestamptz not null default now(),
    resolved_at timestamptz
);

create index if not exists alerts_device_id_type_open_idx
    on alerts (device_id, type) where resolved_at is null;

create index if not exists alerts_created_at_idx
    on alerts (created_at desc);

alter table alerts enable row level security;

create policy "Public read access"
    on alerts for select
    using (true);
