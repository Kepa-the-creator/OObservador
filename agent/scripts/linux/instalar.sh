#!/usr/bin/env bash
# Instala o OObservador Agent como serviço systemd --user: roda em
# background (sem terminal), inicia sozinho a cada login, e o
# "loginctl enable-linger" abaixo faz ele iniciar até sem login ativo.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$HOME/.local/share/oobservador"
SERVICE_DIR="$HOME/.config/systemd/user"

if [ ! -f "$SCRIPT_DIR/oobservador-agent" ]; then
    echo "oobservador-agent não encontrado nesta pasta."
    exit 1
fi

mkdir -p "$INSTALL_DIR" "$SERVICE_DIR"

cp "$SCRIPT_DIR/oobservador-agent" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/oobservador-agent"

if [ -f "$SCRIPT_DIR/.env" ]; then
    cp "$SCRIPT_DIR/.env" "$INSTALL_DIR/"
else
    echo "Aviso: nenhum .env encontrado nesta pasta - o agent vai usar os valores padrão (provavelmente errado para produção)."
fi

cp "$SCRIPT_DIR/oobservador-agent.service" "$SERVICE_DIR/"

systemctl --user daemon-reload
systemctl --user enable --now oobservador-agent.service

if ! loginctl enable-linger "$USER" 2>/dev/null; then
    echo "Aviso: não consegui habilitar linger automaticamente."
    echo "Rode 'sudo loginctl enable-linger $USER' para o agent iniciar no boot mesmo sem login."
fi

echo "Instalado! OObservador rodando em background (systemctl --user status oobservador-agent para conferir)."
