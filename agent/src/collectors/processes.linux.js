const { exec } = require('child_process');

// Processos/daemons do sistema que não são "apps" que o usuário abriu.
// Cobre GNOME, KDE, XFCE, i3/sway, COSMIC (Pop!_OS) e serviços comuns.
const IGNORED = new Set([
    'systemd', 'dbus-daemon', 'dbus-broker', 'NetworkManager', 'wpa_supplicant',
    'pulseaudio', 'pipewire', 'pipewire-pulse', 'wireplumber', 'sshd', 'cron',
    'cupsd', 'avahi-daemon', 'bluetoothd', 'polkitd', 'accounts-daemon',
    'upowerd', 'rtkit-daemon', 'gvfsd', 'ibus-daemon', 'ibus-x11',
    'at-spi2-registryd', 'at-spi-bus-laun', 'gnome-shell', 'gnome-session-b',
    'gnome-session-c', 'gnome-session', 'Xorg', 'Xwayland', 'kwin_x11',
    'kwin_wayland', 'plasmashell', 'xfwm4', 'xfce4-panel', 'i3', 'sway',
    'tracker-extract', 'tracker-miner', 'gjs', 'xdg-desktop-porta',
    'xdg-document-por', 'xdg-permission-s', 'bash', 'sh', 'zsh', 'ps',
    'grep', 'cat', 'sleep', 'env', 'timeout'
]);

// wmClass ou nome do processo -> nome amigável. Apps não listados aqui
// aparecem com o título real da janela (wmctrl) ou o nome capitalizado
// do processo (fallback via ps).
const DICTIONARY = {
    'google-chrome': 'Google Chrome',
    'chrome': 'Google Chrome',
    'chromium': 'Chromium',
    'firefox': 'Mozilla Firefox',
    'firefox-esr': 'Mozilla Firefox',
    'brave': 'Brave',
    'brave-browser': 'Brave',
    'code': 'VS Code',
    'discord': 'Discord',
    'spotify': 'Spotify',
    'telegram-desktop': 'Telegram',
    'slack': 'Slack',
    'steam': 'Steam',
    'nautilus': 'Arquivos',
    'gnome-terminal': 'Terminal',
    'gnome-terminal-': 'Terminal',
    'konsole': 'Terminal',
    'org.gnome.termi': 'Terminal'
};

// Prioridade 1: wmctrl lista janelas reais abertas (funciona em X11, que é
// a sessão padrão do Pop!_OS/GNOME na maioria das instalações). Requer o
// pacote wmctrl instalado (`sudo apt install wmctrl`). Se não existir ou a
// sessão for Wayland puro sem suporte, retorna null e cai no fallback.
function listViaWmctrl() {
    return new Promise((resolve) => {
        exec('wmctrl -lx', { timeout: 5000 }, (err, stdout) => {
            if (err || !stdout || !stdout.trim()) return resolve(null);

            const apps = stdout
                .trim()
                .split('\n')
                .map((line) => {
                    const parts = line.trim().split(/\s+/);
                    const wmClass = (parts[2] || '').split('.').pop() || '';
                    const title = parts.slice(4).join(' ').trim();
                    return DICTIONARY[wmClass.toLowerCase()] || title;
                })
                .filter(Boolean);

            resolve(apps);
        });
    });
}

// Fallback sem dependências extras: lista processos rodando via `ps`. Menos
// preciso que wmctrl (não distingue o que tem janela do que não tem), mas
// funciona em qualquer distro/sessão X11 ou Wayland.
function listViaPs() {
    return new Promise((resolve) => {
        exec('ps -eo comm= --sort=-pcpu', { timeout: 5000 }, (err, stdout) => {
            if (err || !stdout) return resolve([]);

            const apps = stdout
                .trim()
                .split('\n')
                .map((name) => name.trim())
                .filter((name) => name && !name.startsWith('[') && !IGNORED.has(name))
                .slice(0, 40)
                .map((name) => DICTIONARY[name.toLowerCase()] || (name.charAt(0).toUpperCase() + name.slice(1)));

            resolve(apps);
        });
    });
}

async function getActiveApps() {
    let apps = await listViaWmctrl();

    if (!apps || apps.length === 0) {
        apps = await listViaPs();
    }

    apps = apps.filter(Boolean).slice(0, 8);
    return [...new Set(apps)].join(', ') || 'Área de Trabalho';
}

module.exports = { getActiveApps };
