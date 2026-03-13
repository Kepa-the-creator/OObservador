const si = require('systeminformation');
const io = require('socket.io-client');
const psList = require('ps-list');

// ALTERE PARA O SEU IP ATUAL (Dê um ipconfig no seu PC principal)
const SERVER_URL = 'http://192.168.0.102:3000'; 
const socket = io(SERVER_URL);

async function coletarTudo() {
    try {
        // Coleta de Hardware e Rede
        const [cpu, mem, battery, os, net, wifi] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.battery(),
            si.osInfo(),
            si.networkStats(),
            si.wifiConnections()
        ]);

        // Coleta de Processos (Substituindo a janela ativa que dava erro)
        let topApps = "---";
        try {
            const processes = await psList();
            topApps = processes
                .filter(p => p.cpu > 1 || p.memory > 5) // Filtra apps ativos
                .map(p => p.name)
                .slice(0, 5)
                .join(", ");
        } catch (e) {
            topApps = "Erro ao listar apps";
        }

        const payload = {
            id: os.hostname,
            cpuUsage: cpu.currentLoad.toFixed(1),
            ramUsage: ((mem.active / mem.total) * 100).toFixed(1),
            
            // Rede
            netDownload: (net[0].rx_sec / 1024 / 1024).toFixed(1) + 'M',
            netUpload: (net[0].tx_sec / 1024 / 1024).toFixed(1) + 'M',
            wifiSsid: wifi[0]?.ssid || 'Cabo/Desconectado',
            wifiSignal: wifi[0]?.signalLevel || 0,

            // Bateria
            batteryLevel: battery.percent,
            batteryHealth: battery.capacityUnit || 'N/A',

            // Atividade (Simplificada para não dar erro de ffi-napi)
            janelaAtiva: "Monitoramento Ativo", 
            appsAbertos: topApps
        };

        socket.emit('vitals_update', payload);
        console.log(`[${new Date().toLocaleTimeString()}] Dados enviados para o servidor.`);

    } catch (error) {
        console.error("Erro na coleta:", error);
    }
}

// Envia dados a cada 5 segundos
setInterval(coletarTudo, 5000);
coletarTudo();

socket.on('connect', () => console.log("✅ Conectado ao Servidor Central!"));
socket.on('connect_error', (err) => console.log("❌ Erro de conexão: Verifique o IP do Servidor"));