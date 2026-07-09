const { SERVER_URL, AGENT_TOKEN, COLLECT_INTERVAL_MS } = require('./config');
const { getVitals } = require('./collectors/hardware');
const { getActiveApps } = require('./collectors/processes');

const VITALS_ENDPOINT = `${SERVER_URL.replace(/\/$/, '')}/api/vitals`;

async function coletarTudo() {
    try {
        const vitals = await getVitals();
        const appsAbertos = await getActiveApps();

        const payload = {
            id: vitals.hostname,
            ...vitals,
            janelaAtiva: "Monitoramento Ativo",
            appsAbertos
        };

        const res = await fetch(VITALS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AGENT_TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`Servidor respondeu ${res.status}`);

        console.log(`[${new Date().toLocaleTimeString()}] ✅ Dados enviados! Apps: ${appsAbertos}`);
    } catch (error) {
        console.error("❌ Erro na coleta/envio:", error.message);
    }
}

console.log("-----------------------------------------");
console.log(`📡 AGENTE ON: Enviando para ${VITALS_ENDPOINT}`);
console.log("-----------------------------------------");

setInterval(coletarTudo, COLLECT_INTERVAL_MS);
coletarTudo();
