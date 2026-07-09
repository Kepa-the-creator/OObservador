require('dotenv').config();
const express = require('express');

const deviceManager = require('./state/deviceManager');
const cliDashboard = require('./ui/cliDashboard');

const PORT = process.env.PORT || 3000;
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'senha-padrao-insegura';
const HEARTBEAT_CHECK_MS = 3000;
const DASHBOARD_REFRESH_MS = 2000;

const app = express();
app.use(express.json());

function requireAgentToken(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token !== AGENT_TOKEN) return res.status(401).json({ error: 'unauthorized' });
    next();
}

app.post('/api/vitals', requireAgentToken, (req, res) => {
    const payload = req.body;
    if (!payload?.id) return res.status(400).json({ error: 'missing id' });
    deviceManager.updateDevice(payload);
    res.status(204).end();
});

app.get('/api/devices', (req, res) => {
    res.json(deviceManager.getAllDevices());
});

setInterval(() => deviceManager.checkHeartbeats(), HEARTBEAT_CHECK_MS);
setInterval(() => cliDashboard.render(deviceManager), DASHBOARD_REFRESH_MS);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🖥️  OObservador Server rodando em 0.0.0.0:${PORT}`);
});
