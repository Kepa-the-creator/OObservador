create table if not exists devices (
    id text primary key,
    hostname text,
    cpu_usage numeric,
    ram_usage numeric,
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
