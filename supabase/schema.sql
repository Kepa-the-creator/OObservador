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
