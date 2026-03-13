const si = require('systeminformation');
const io = require('socket.io-client');
const { exec } = require('child_process');

// IP FIXO DEFINIDO
const SERVER_URL = 'http://192.168.18.150:3000'; 
const socket = io(SERVER_URL);

// Função para listar e "traduzir" os apps abertos
function getWindowsApps() {
    return new Promise((resolve) => {
        // Tasklist /FI "STATUS eq RUNNING" /NH pega apenas processos ativos e sem cabeçalho
        exec('tasklist /FI "STATUS eq RUNNING" /NH', (err, stdout) => {
            if (err) return resolve("Erro ao listar apps");

            const linhas = stdout.split('\n');
            
            // Dicionário de Tradução (Adicione mais aqui se quiser!)
            const nomesBonitos = {
                'msedge': 'Microsoft Edge',
                'chrome': 'Google Chrome',
                'Code': 'VS Code',
                'discord': 'Discord',
                'Spotify': 'Spotify',
                'Notepad': 'Bloco de Notas',
                'Explorer': 'Arquivos',
                'Taskmgr': 'Gerenciador de Tarefas',
                'cmd': 'Terminal CMD'
            };

            const apps = linhas
                .map(linha => linha.split(/\s+/)[0]) // Pega o nome do processo
                .filter(name => name && name.includes('.exe'))
                .map(name => name.replace('.exe', ''))
                // Filtra processos "fantasmas" do Windows que poluem a lista
                .filter(name => ![
                    'svchost', 'System', 'Idle', 'conhost', 'taskhostw', 'RuntimeBroker', 
                    'SearchHost', 'sihost', 'fontdrvhost', 'smartscreen', 'tasklist',
                    'ApplicationFrameHost', 'ctfmon', 'dllhost', 'WmiPrvSE', 'lsass', 
                    'services', 'wininit', 'winlogon', 'smss', 'csrss', 'CompPkgSrv'
                ].includes(name))
                // Traduz ou coloca a primeira letra em Maiúsculo
                .map(name => nomesBonitos[name] || name.charAt(0).toUpperCase() + name.slice(1))
                .slice(0, 5); // Pega os 5 mais relevantes

            resolve([...new Set(apps)].join(", ") || "Área de Trabalho");
        });
    });
}

async function coletarTudo() {
    try {
        // Coleta de Hardware e Rede em paralelo para ganhar tempo
        const [cpu, mem, battery, os, net, wifi] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.battery(),
            si.osInfo(),
            si.networkStats(),
            si.wifiConnections()
        ]);

        // Pega a lista de apps limpa
        const topApps = await getWindowsApps();

        const payload = {
            id: os.hostname,
            cpuUsage: cpu.currentLoad.toFixed(1),
            ramUsage: ((mem.active / mem.total) * 100).toFixed(1),
            
            // Rede
            netDownload: (net[0].rx_sec / 1024 / 1024).toFixed(1) + 'M',
            netUpload: (net[0].tx_sec / 1024 / 1024).toFixed(1) + 'M',
            wifiSsid: wifi[0]?.ssid || 'Cabo/Desconectado',

            // Energia
            batteryLevel: battery.percent,
            isCharging: battery.isCharging,

            // Atividade
            janelaAtiva: "Monitoramento Ativo", 
            appsAbertos: topApps
        };

        // Envia para o seu PC Principal
        socket.emit('vitals_update', payload);
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Dados enviados! Apps: ${topApps}`);

    } catch (error) {
        console.error("❌ Erro na coleta:", error.message);
    }
}

// Mensagens de Status do Socket
socket.on('connect', () => {
    console.log("-----------------------------------------");
    console.log("📡 AGENTE ON: Conectado em 192.168.18.150");
    console.log("-----------------------------------------");
});

socket.on('connect_error', () => {
    console.log("⚠️ Tentando conectar ao servidor...");
});

// Loop de 5 segundos
setInterval(coletarTudo, 5000);
coletarTudo();