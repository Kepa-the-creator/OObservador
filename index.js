const si = require('systeminformation');
const io = require('socket.io-client');
const { exec } = require('child_process'); // Para rodar comandos do Windows

const SERVER_URL = 'http://192.168.18.150:3000'; 
const socket = io(SERVER_URL);

// Função auxiliar para pegar os apps via comando nativo do Windows
function getWindowsApps() {
    return new Promise((resolve) => {
        // Tasklist /FI "STATUS eq RUNNING" filtra apenas o que está rodando
        // /NH remove o cabeçalho para facilitar a leitura
        exec('tasklist /FI "STATUS eq RUNNING" /NH', (err, stdout) => {
            if (err) return resolve("Erro ao listar apps");

            const linhas = stdout.split('\n');
            const apps = linhas
                .map(linha => linha.split(/\s+/)[0]) // Pega a primeira coluna (nome do processo)
                .filter(name => name && name.includes('.exe')) // Garante que é um executável
                .map(name => name.replace('.exe', '')) // Limpa o nome
                // Filtro para tirar processos chatos do Windows que sempre aparecem
                .filter(name => !['svchost', 'System', 'Idle', 'conhost', 'taskhostw', 'RuntimeBroker', 'SearchHost', 'sihost'].includes(name))
                .slice(0, 8); // Pega os 8 principais

            resolve([...new Set(apps)].join(", ") || "Apenas processos de fundo");
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

        // Pegando os apps usando o novo método Tasklist
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

socket.on('connect', () => {
    console.log("-----------------------------------------");
    console.log("📡 CONECTADO AO SERVIDOR (.150)");
    console.log("-----------------------------------------");
});

setInterval(coletarTudo, 5000);
coletarTudo();