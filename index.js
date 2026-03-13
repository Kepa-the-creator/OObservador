const activeWin = require('active-win');
const psList = require('ps-list');

async function monitorarAtividade() {
    try {
        // 1. Pega a janela que está na cara do usuário agora
        const window = await activeWin();
        
        // 2. Pega os processos que estão usando mais memória (arquivos/apps abertos)
        const processes = await psList();
        const topApps = processes
            .filter(p => p.cpu > 0.5 || p.memory > 1) // Filtra só o que está "vivo"
            .map(p => p.name)
            .slice(0, 5); // Pega os 5 principais

        const atividade = {
            id: (await si.osInfo()).hostname,
            janelaAtiva: window ? `${window.title} (${window.owner.name})` : "Nenhuma",
            appsAbertos: [...new Set(topApps)].join(", ") // Remove duplicados
        };

        socket.emit('activity_update', atividade);
    } catch (err) {
        console.error("Erro ao monitorar atividade:", err);
    }
}

// Chame a função no seu intervalo
setInterval(monitorarAtividade, 5000); // Checa a cada 5 segundos