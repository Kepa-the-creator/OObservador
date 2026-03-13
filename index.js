const si = require('systeminformation');
const io = require('socket.io-client');

// Se estiver em casa: 'http://192.168.0.102:3000'
// Se estiver usando ngrok: 'https://sua-url.ngrok-free.app'
const SERVER_URL = 'http://192.168.18.150:3000'; 

const socket = io(SERVER_URL);

async function enviarDados() {
    try {
        const [cpu, mem, battery, temp, os, net, wifi] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.battery(),
            si.cpuTemperature(),
            si.osInfo(),
            si.networkStats(),
            si.wifiConnections()
        ]);

        const payload = {
            id: os.hostname,
            cpuUsage: cpu.currentLoad.toFixed(1),
            ramUsage: ((mem.active / mem.total) * 100).toFixed(1),
            temp: temp.main || 'N/A',
            
            // Rede (Opção 2)
            netDownload: (net[0].rx_sec / 1024 / 1024).toFixed(1) + 'M',
            netUpload: (net[0].tx_sec / 1024 / 1024).toFixed(1) + 'M',
            wifiSsid: wifi[0]?.ssid || 'Cabo',
            wifiSignal: wifi[0]?.signalLevel || 0,

            // Bateria (Opção 4)
            batteryLevel: battery.percent,
            batteryHealth: battery.capacityUnit || 'N/A',
            isCharging: battery.isCharging
        };

        socket.emit('vitals_update', payload);
    } catch (error) {
        console.error("Erro na coleta:", error);
    }
}

setInterval(enviarDados, 10000);
enviarDados();