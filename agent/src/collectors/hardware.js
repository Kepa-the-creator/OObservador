const si = require('systeminformation');

function pickPrimaryDisk(disks) {
    if (!disks || disks.length === 0) return null;
    return disks.find((d) => d.mount === '/' || d.mount === 'C:') || disks[0];
}

async function getVitals() {
    const [cpu, mem, battery, osInfo, net, wifi, fsSize, time] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.battery(),
        si.osInfo(),
        si.networkStats(),
        si.wifiConnections(),
        si.fsSize(),
        si.time()
    ]);

    const primaryDisk = pickPrimaryDisk(fsSize);

    return {
        hostname: osInfo.hostname,
        cpuUsage: cpu.currentLoad.toFixed(1),
        ramUsage: ((mem.active / mem.total) * 100).toFixed(1),
        diskUsage: primaryDisk ? primaryDisk.use.toFixed(1) : null,

        netDownload: (net[0].rx_sec / 1024 / 1024).toFixed(1) + 'M',
        netUpload: (net[0].tx_sec / 1024 / 1024).toFixed(1) + 'M',
        wifiSsid: wifi[0]?.ssid || 'Cabo/Desconectado',

        batteryLevel: battery.percent,
        isCharging: battery.isCharging,

        uptimeSeconds: Math.floor(time.uptime)
    };
}

module.exports = { getVitals };
