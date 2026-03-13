const si = require('systeminformation');
const io = require('socket.io-client');
const psList = require('ps-list');

// ⚠️ IMPORTANTE: Coloque aqui o IP do seu PC Principal (visto no ipconfig)
const SERVER_URL = 'http://192.168.0.102:3000'; 
const socket = io(SERVER_URL);

async function coletarTudo() {
    try {
        // 1. Coleta de Hardware e Sistema
        const [cpu, mem, battery, os, net, wifi] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.battery(),
            si.osInfo(),
            si.networkStats(),
            si.wifiConnections()
        ]);

        // 2. Coleta de Processos (Apps Abertos)
        let topApps = "Apenas processos de fundo";
        try {
            const processes = await psList();
            
            // Filtro sensível: Pega apps que o usuário realmente está usando
            const filtrados = processes
                .filter(p => p.cpu > 0.1 || p.memory > 0.5) // Pega quase tudo que está "vivo"
                .sort((a, b) => b.cpu - a.cpu) // O que consome mais CPU fica no topo
                .map(p => p.name.replace('.exe', '')) // Limpa o nome do arquivo
                .filter(name => !['svchost', 'System', 'Idle', 'Registry'].includes(name)) // Remove lixo do sistema
                .slice(0, 8); // Pega os 8 principais

            if (filtrados.length > 0) {
                topApps = [...new Set(filtrados)].join(", "); // Remove duplicados e junta em texto
            }
        } catch (e) {
            topApps = "Sem permissão para listar apps";
        }

        // 3. Montagem do Pacote de Dados (Payload)
        const payload = {
            id: os.hostname,
            cpuUsage: cpu.currentLoad.toFixed(1),
            ramUsage: ((mem.active / mem.total) * 100).toFixed(1),
            
            // Rede e Wi-Fi
            netDownload: (net[0].rx_sec / 1024 / 1024).toFixed(1) + 'M',
            netUpload: (net[0].tx_sec / 1024 / 1024).toFixed(1) + 'M',
            wifiSsid: wifi[0]?.ssid || 'Conectado via Cabo',
            wifiSignal: wifi[0]?.signalLevel || 100,

            // Bateria
            batteryLevel: battery.percent,
            isCharging: battery.isCharging,

            // Atividade Atual
            janelaAtiva: "Monitoramento em Tempo Real", 
            appsAbertos: topApps
        };

        // 4. Envio para o seu Servidor
        socket.emit('vitals_update', payload);
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Dados enviados! Apps: ${topApps.substring(0, 30)}...`);

    } catch (error) {
        console.error("❌ Erro na coleta de dados:", error.message);
    }
}

// Configurações do Socket
socket.on('connect', () => {
    console.log("-----------------------------------------");
    console.log("📡 CONECTADO AO SERVIDOR CENTRAL (AYLEEN)");
    console.log("-----------------------------------------");
});

socket.on('connect_error', () => {
    console.log("⚠️ Tentando encontrar o servidor no IP: " + SERVER_URL);
});

// Inicia o loop: Envia dados a cada 5 segundos
setInterval(coletarTudo, 5000);
coletarTudo(); // Primeira execução imediata