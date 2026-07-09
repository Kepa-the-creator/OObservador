const si = require('systeminformation');

async function getVitals() {
    const [cpu, mem, battery, osInfo, net, wifi] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.battery(),
        si.osInfo(),
        si.networkStats(),
        si.wifiConnections()
    ]);

    return {
        hostname: osInfo.hostname,
        cpuUsage: cpu.currentLoad.toFixed(1),
        ramUsage: ((mem.active / mem.total) * 100).toFixed(1),

        netDownload: (net[0].rx_sec / 1024 / 1024).toFixed(1) + 'M',
        netUpload: (net[0].tx_sec / 1024 / 1024).toFixed(1) + 'M',
        wifiSsid: wifi[0]?.ssid || 'Cabo/Desconectado',

        batteryLevel: battery.percent,
        isCharging: battery.isCharging
    };
}

module.exports = { getVitals };
