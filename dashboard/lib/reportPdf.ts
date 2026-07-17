import PDFDocument from 'pdfkit';

const PAGE_MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4 em pontos
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const COLOR_TEXT = '#111111';
const COLOR_DIM = '#666666';
const COLOR_FAINT = '#999999';
const COLOR_BORDER = '#e5e5e5';
const COLOR_ACCENT = '#0891b2';
const COLOR_BOX_BG = '#f2f2f2';

function formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
}

export type ReportData = {
    deviceId: string;
    periodLabel: string;
    periodStart: string;
    periodEnd: string;
    totalOnlineSeconds: number;
    possibleSeconds: number;
    topApps: { app_name: string; seconds: number }[];
    generatedAt: string;
};

export function generateActivityReportPdf(data: ReportData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
    });

    const pct = data.possibleSeconds > 0
        ? Math.round((data.totalOnlineSeconds / data.possibleSeconds) * 100)
        : 0;

    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOR_TEXT)
        .text('OObservador — Relatório de Atividade');
    doc.font('Helvetica').fontSize(10).fillColor(COLOR_DIM)
        .text(`${data.deviceId} · ${data.periodLabel} · ${data.periodStart} a ${data.periodEnd}`);
    doc.moveDown(1.2);

    const boxY = doc.y;
    const boxWidth = (CONTENT_WIDTH - 12) / 2;
    const boxHeight = 52;

    doc.roundedRect(PAGE_MARGIN, boxY, boxWidth, boxHeight, 4).fill(COLOR_BOX_BG);
    doc.roundedRect(PAGE_MARGIN + boxWidth + 12, boxY, boxWidth, boxHeight, 4).fill(COLOR_BOX_BG);

    doc.font('Helvetica-Bold').fontSize(15).fillColor(COLOR_TEXT)
        .text(formatDuration(data.totalOnlineSeconds), PAGE_MARGIN + 10, boxY + 10, { width: boxWidth - 20 });
    doc.font('Helvetica').fontSize(8.5).fillColor(COLOR_DIM)
        .text(`Tempo total ligado (${pct}% do período)`, PAGE_MARGIN + 10, boxY + 30, { width: boxWidth - 20 });

    doc.font('Helvetica-Bold').fontSize(15).fillColor(COLOR_TEXT)
        .text(String(data.topApps.length), PAGE_MARGIN + boxWidth + 22, boxY + 10, { width: boxWidth - 20 });
    doc.font('Helvetica').fontSize(8.5).fillColor(COLOR_DIM)
        .text('Aplicativos distintos usados', PAGE_MARGIN + boxWidth + 22, boxY + 30, { width: boxWidth - 20 });

    doc.y = boxY + boxHeight + 20;

    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR_TEXT)
        .text('Aplicativos mais usados');
    doc.moveDown(0.5);

    if (data.topApps.length === 0) {
        doc.font('Helvetica').fontSize(10).fillColor(COLOR_FAINT)
            .text('Nenhum dado de uso de aplicativos nesse período.');
    } else {
        const maxSeconds = data.topApps[0].seconds || 1;
        const rankW = 20;
        const timeW = 65;
        const barW = 110;
        const nameW = CONTENT_WIDTH - rankW - timeW - barW - 16;

        const headerY = doc.y;
        doc.font('Helvetica').fontSize(8.5).fillColor(COLOR_FAINT);
        doc.text('#', PAGE_MARGIN, headerY, { width: rankW });
        doc.text('Aplicativo', PAGE_MARGIN + rankW, headerY, { width: nameW });
        doc.text('Tempo', PAGE_MARGIN + rankW + nameW, headerY, { width: timeW, align: 'right' });
        doc.moveDown(0.6);
        doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).strokeColor(COLOR_TEXT).lineWidth(0.75).stroke();
        doc.moveDown(0.4);

        data.topApps.forEach((app, i) => {
            const rowY = doc.y;
            doc.font('Helvetica').fontSize(10).fillColor(COLOR_FAINT)
                .text(String(i + 1), PAGE_MARGIN, rowY, { width: rankW });
            doc.fillColor(COLOR_TEXT)
                .text(app.app_name, PAGE_MARGIN + rankW, rowY, { width: nameW });
            doc.text(formatDuration(app.seconds), PAGE_MARGIN + rankW + nameW, rowY, { width: timeW, align: 'right' });

            const barX = PAGE_MARGIN + rankW + nameW + timeW + 8;
            const barFillWidth = Math.max(2, (app.seconds / maxSeconds) * (barW - 8));
            doc.roundedRect(barX, rowY + 2, barW - 8, 6, 3).fill(COLOR_BORDER);
            doc.roundedRect(barX, rowY + 2, barFillWidth, 6, 3).fill(COLOR_ACCENT);

            doc.y = rowY + 16;
            doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();
            doc.moveDown(0.4);
        });
    }

    // Escrever perto do rodapé da página faz o pdfkit achar que não cabe
    // e criar uma página nova vazia - zera a margem inferior antes de
    // escrever pra evitar isso (não tem mais nada depois, então não faz
    // diferença deixar assim).
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor(COLOR_FAINT)
        .text(`Gerado em ${data.generatedAt} · OObservador`, PAGE_MARGIN, doc.page.height - 30, {
            width: CONTENT_WIDTH,
            align: 'center'
        });

    doc.end();
    return done;
}
