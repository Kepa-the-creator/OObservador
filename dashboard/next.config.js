/** @type {import('next').NextConfig} */
const nextConfig = {
    // pdfkit lê os arquivos de métrica das fontes padrão (.afm) do disco
    // em tempo de execução - deixando o pacote de fora do bundling do
    // Next, ele vai inteiro (com esses arquivos) pro deploy, sem risco do
    // rastreador de dependências da Vercel deixar algum de fora.
    serverExternalPackages: ['pdfkit']
};

module.exports = nextConfig;
