const path = require('path');

// Empacotado (.exe) roda com cwd variável (duplo-clique, atalho, agendador de
// tarefas), então o .env é sempre lido ao lado do binário/script, não do cwd.
const baseDir = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
require('dotenv').config({ path: path.join(baseDir, '.env') });

const INSECURE_DEFAULT_TOKEN = 'senha-padrao-insegura';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const AGENT_TOKEN = process.env.AGENT_TOKEN || INSECURE_DEFAULT_TOKEN;

if (AGENT_TOKEN === INSECURE_DEFAULT_TOKEN) {
    console.warn('⚠️  AGENT_TOKEN não configurado — usando token padrão inseguro. Defina um token forte no .env.');
}

module.exports = {
    SERVER_URL,
    AGENT_TOKEN,
    COLLECT_INTERVAL_MS: 5000
};
