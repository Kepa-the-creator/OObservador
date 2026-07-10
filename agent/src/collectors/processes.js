const { exec } = require('child_process');

// Processos de interface do sistema que sempre têm janela mas não são
// "apps" que o usuário abriu de propósito.
const IGNORED_PROCESSES = new Set([
    'ApplicationFrameHost', 'SystemSettings', 'TextInputHost', 'ShellExperienceHost',
    'SearchHost', 'StartMenuExperienceHost', 'LockApp', 'ScreenClippingHost',
    'PickerHost', 'peopleexperiencehost', 'NVIDIA Overlay'
]);

// Apps cujo título de janela muda o tempo todo (aba, documento, canal) -
// preferimos sempre o nome fixo do app em vez do conteúdo da janela.
const DICTIONARY = {
    'msedge': 'Microsoft Edge',
    'chrome': 'Google Chrome',
    'brave': 'Brave',
    'firefox': 'Mozilla Firefox',
    'opera': 'Opera',
    'Code': 'VS Code',
    'devenv': 'Visual Studio',
    'discord': 'Discord',
    'Spotify': 'Spotify',
    'Telegram': 'Telegram',
    'WhatsApp': 'WhatsApp',
    'slack': 'Slack',
    'Teams': 'Microsoft Teams',
    'steam': 'Steam',
    'EpicGamesLauncher': 'Epic Games Launcher',
    'RiotClientUx': 'Riot Client',
    'Explorer': 'Explorador de Arquivos',
    'Notepad': 'Bloco de Notas',
    'Taskmgr': 'Gerenciador de Tarefas',
    'cmd': 'Terminal CMD',
    'powershell': 'PowerShell'
};

const PS_COMMAND = 'powershell -NoProfile -NonInteractive -Command '
    + '"[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; '
    + 'Get-Process | Where-Object { $_.MainWindowTitle } '
    + '| Select-Object ProcessName,MainWindowTitle | ConvertTo-Json -Compress"';

const IGNORED_LOWER = new Set([...IGNORED_PROCESSES].map((name) => name.toLowerCase()));
const DICTIONARY_LOWER = Object.fromEntries(
    Object.entries(DICTIONARY).map(([name, label]) => [name.toLowerCase(), label])
);

function getActiveApps() {
    return new Promise((resolve) => {
        exec(PS_COMMAND, { windowsHide: true, timeout: 5000 }, (err, stdout) => {
            if (err || !stdout || !stdout.trim()) return resolve("Área de Trabalho");

            try {
                let processes = JSON.parse(stdout);
                if (!Array.isArray(processes)) processes = [processes];

                const apps = processes
                    .filter((p) => !IGNORED_LOWER.has(p.ProcessName.toLowerCase()))
                    .map((p) => DICTIONARY_LOWER[p.ProcessName.toLowerCase()] || p.MainWindowTitle.trim())
                    .filter(Boolean)
                    .slice(0, 8);

                resolve([...new Set(apps)].join(", ") || "Área de Trabalho");
            } catch {
                resolve("Área de Trabalho");
            }
        });
    });
}

module.exports = { getActiveApps };
