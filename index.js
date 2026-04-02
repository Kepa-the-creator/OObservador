require('dotenv').config();
const si = require('systeminformation');
const io = require('socket.io-client');
const { exec } = require('child_process');

// 1. SEGURANÇA: Puxando o IP e uma senha do arquivo .env
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000'; 
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'senha-padrao-insegura';

// 2. AUTENTICAÇÃO: O Socket agora envia o token para provar que é um agente real
const socket = io(SERVER_URL, {
    auth: {
        token: AGENT_TOKEN
    }
});

function getWindowsApps() {
    return new Promise((resolve) => {
        exec('tasklist /FI "STATUS eq RUNNING" /NH', (err, stdout) => {
            if (err) return resolve("Erro ao listar apps");

            const linhas = stdout.split('\n');
            
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
                .map(linha => linha.split(/\s+/)[0])
                .filter(name => name && name.includes('.exe'))
                .map(name => name.replace('.exe', ''))
                .filter(name => ![
                    'svchost', 'System', 'Idle', 'conhost', 'taskhostw', 'RuntimeBroker', 
                    'SearchHost', 'sihost', 'fontdrvhost', 'smartscreen', 'tasklist',
                    'ApplicationFrameHost', 'ctfmon', 'dllhost', 'WmiPrvSE', 'lsass', 
                    'services', 'wininit', 'winlogon', 'smss', 'csrss', 'CompPkgSrv'
                ].includes(name))
                .map(name => nomesBonitos[name] || name.charAt(0).toUpperCase() + name.slice(1))
                .slice(0, 5);

            resolve([...new Set(apps)].join(", ") || "Área de Trabalho");
        });
    });
}

async function coletarTudo() {
    try {
        const [cpu, mem, battery, os, net, wifi] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.battery(),
            si.osInfo(),
            si.networkStats(),
            si.wifiConnections()
        ]);

        const topApps = await getWindowsApps();

        const payload = {
            id: os.hostname,
            cpuUsage: cpu.currentLoad.toFixed(1),
            ramUsage: ((mem.active / mem.total) * 100).toFixed(1),
            
            netDownload: (net[0].rx_sec / 1024 / 1024).toFixed(1) + 'M',
            netUpload: (net[0].tx_sec / 1024 / 1024).toFixed(1) + 'M',
            wifiSsid: wifi[0]?.ssid || 'Cabo/Desconectado',

            batteryLevel: battery.percent,
            isCharging: battery.isCharging,

            janelaAtiva: "Monitoramento Ativo", 
            appsAbertos: topApps
        };

        socket.emit('vitals_update', payload);
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Dados enviados! Apps: ${topApps}`);

    } catch (error) {
        console.error("❌ Erro na coleta:", error.message);
    }
}

// Mensagens Dinâmicas e Seguras
socket.on('connect', () => {
    console.log("-----------------------------------------");
    console.log(`📡 AGENTE ON: Conectado em ${SERVER_URL}`);
    console.log("-----------------------------------------");
});

socket.on('connect_error', (erro) => {
    console.log(`⚠️ Erro de conexão: ${erro.message}`);
});

setInterval(coletarTudo, 5000);
coletarTudo();
