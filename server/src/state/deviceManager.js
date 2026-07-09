class DeviceManager {
    constructor(timeoutMs = 12000) {
        this.devices = new Map();
        this.timeoutMs = timeoutMs;
    }

    updateDevice(payload) {
        this.devices.set(payload.id, {
            ...payload,
            status: "ONLINE",
            lastSeen: Date.now()
        });
    }

    checkHeartbeats() {
        const now = Date.now();
        for (const [id, device] of this.devices.entries()) {
            if (device.status === "ONLINE" && now - device.lastSeen > this.timeoutMs) {
                device.status = "OFFLINE";
                this.devices.set(id, device);
            }
        }
    }

    getAllDevices() {
        return Array.from(this.devices.values());
    }
}

module.exports = new DeviceManager();
