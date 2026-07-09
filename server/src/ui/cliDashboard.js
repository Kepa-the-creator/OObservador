function clearScreen() {
    process.stdout.write('\x1Bc');
}

function pad(str, len) {
    str = String(str ?? '');
    return str.length >= len ? str.slice(0, len - 1) + ' ' : str + ' '.repeat(len - str.length);
}

function render(deviceManager) {
    clearScreen();
    const devices = deviceManager.getAllDevices();

    console.log("=================== OObservador - Dashboard ===================");
    console.log(`Atualizado em: ${new Date().toLocaleTimeString()} | Dispositivos: ${devices.length}`);
    console.log("-----------------------------------------------------------------");
    console.log(pad("STATUS", 9) + pad("ID", 16) + pad("CPU%", 7) + pad("RAM%", 7) + pad("BAT%", 6) + "APPS ABERTOS");
    console.log("-----------------------------------------------------------------");

    if (devices.length === 0) {
        console.log("Aguardando conexão de agentes...");
    }

    for (const device of devices) {
        const statusIcon = device.status === "ONLINE" ? "🟢 ON " : "🔴 OFF";
        console.log(
            pad(statusIcon, 9) +
            pad(device.id, 16) +
            pad(device.cpuUsage, 7) +
            pad(device.ramUsage, 7) +
            pad(device.batteryLevel, 6) +
            (device.appsAbertos || '')
        );
    }
    console.log("===================================================================");
}

module.exports = { render };
