create table if not exists devices (
    id text primary key,
    hostname text,
    cpu_usage numeric,
    ram_usage numeric,
    disk_usage numeric,
    uptime_seconds bigint,
    net_download text,
    net_upload text,
    wifi_ssid text,
    battery_level numeric,
    is_charging boolean,
    janela_ativa text,
    apps_abertos text,
    tag text,
    last_seen timestamptz not null default now()
);

alter table devices enable row level security;

-- Leitura pública liberada (o dashboard le via essa policy se algum dia
-- consultar direto do browser); escrita só acontece pela API route da
-- Vercel usando a secret key, que ignora RLS por padrão.
create policy "Public read access"
    on devices for select
    using (true);

-- Série temporal para os gráficos de histórico. Cada POST /api/vitals
-- insere uma linha aqui; a própria rota apaga o que passar da janela de
-- retenção (sem precisar de cron job).
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

-- Eventos de alerta. "type" identifica a condição (offline, cpu_high,
-- ram_high, disk_high) - só existe um alerta em aberto (resolved_at null)
-- por combinação device_id+type de cada vez, pra não duplicar a cada
-- request enquanto a condição persiste.
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

-- Configuração dos limites de alerta - linha única (id sempre 1).
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

-- Uso acumulado por dia, pra alimentar o relatório semanal/mensal sem
-- precisar guardar cada leitura de 5 em 5 segundos por semanas a fio.
-- Cada POST /api/vitals soma o tempo decorrido (com teto de alguns
-- segundos, pra não contar um gap de reconexão como "tempo ligado").
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

-- Upsert-com-soma atômico, chamado pela rota /api/vitals a cada leitura.
create or replace function increment_device_daily_usage(p_device_id text, p_date date, p_seconds numeric)
returns void
language sql
as $$
    insert into device_daily_usage (device_id, date, seconds_online)
    values (p_device_id, p_date, p_seconds)
    on conflict (device_id, date)
    do update set seconds_online = device_daily_usage.seconds_online + excluded.seconds_online;
$$;

-- Mesma ideia, mas em lote pra todos os apps abertos numa leitura de uma vez
-- (evita 1 chamada por app a cada request).
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
