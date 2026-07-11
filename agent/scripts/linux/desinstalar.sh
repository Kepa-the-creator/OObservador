#!/usr/bin/env bash
# Desfaz o que instalar.sh fez: para o serviço, remove a unit do systemd
# e apaga os arquivos copiados.
INSTALL_DIR="$HOME/.local/share/oobservador"
SERVICE_DIR="$HOME/.config/systemd/user"

systemctl --user disable --now oobservador-agent.service 2>/dev/null || true
rm -f "$SERVICE_DIR/oobservador-agent.service"
systemctl --user daemon-reload

rm -rf "$INSTALL_DIR"

echo "OObservador removido e serviço encerrado."
