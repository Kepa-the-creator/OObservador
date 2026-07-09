const { exec } = require('child_process');

const DICTIONARY = {
    'msedge': 'Microsoft Edge',
    'chrome': 'Google Chrome',
    'Code': 'VS Code',
    'discord': 'Discord',
    'Spotify': 'Spotify',
    'Notepad': 'Bloco de Notas',
    'Explorer': 'Explorador de Arquivos',
    'Taskmgr': 'Gerenciador de Tarefas',
    'cmd': 'Terminal CMD'
};

const IGNORED_PROCESSES = new Set([
    'svchost', 'System', 'Idle', 'conhost', 'taskhostw', 'RuntimeBroker',
    'SearchHost', 'sihost', 'fontdrvhost', 'smartscreen', 'tasklist',
    'ApplicationFrameHost', 'ctfmon', 'dllhost', 'WmiPrvSE', 'lsass',
    'services', 'wininit', 'winlogon', 'smss', 'csrss', 'CompPkgSrv'
]);

function getActiveApps() {
    return new Promise((resolve) => {
        exec('tasklist /FI "STATUS eq RUNNING" /NH', { windowsHide: true }, (err, stdout) => {
            if (err || !stdout) return resolve("Área de Trabalho");

            const apps = stdout
                .split('\n')
                .map(line => line.split(/\s+/)[0]?.replace('.exe', ''))
                .filter(name => name && !IGNORED_PROCESSES.has(name))
                .map(name => DICTIONARY[name] || (name.charAt(0).toUpperCase() + name.slice(1)))
                .slice(0, 5);

            resolve([...new Set(apps)].join(", ") || "Área de Trabalho");
        });
    });
}

module.exports = { getActiveApps };
