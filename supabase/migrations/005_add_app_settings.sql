create table if not exists app_settings (
    id int primary key default 1,
    cpu_threshold numeric not null default 90,
    ram_threshold numeric not null default 90,
    disk_threshold numeric not null default 90,
    sustain_minutes int not null default 5,
    updated_at timestamptz not null default now(),
    constraint app_settings_singleton check (id = 1)
);

insert into app_settings (id) values (1) on conflict (id) do nothing;

alter table app_settings enable row level security;

create policy "Public read access"
    on app_settings for select
    using (true);
