const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

app.enable('trust proxy');

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(cors());

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Bloqueia acesso a arquivos sensíveis da raiz (Node/Git) por segurança
app.use((req, res, next) => {
  const forbiddenFiles = ['/server.js', '/package.json', '/package-lock.json', '/.env', '/.gitignore'];
  if (forbiddenFiles.includes(req.path.toLowerCase())) {
    return res.status(403).send('Acesso proibido.');
  }
  next();
});

// Serve arquivos estáticos direto da RAIZ do projeto (__dirname)
app.use(express.static(__dirname, {
  maxAge: '1h',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// Rota de Healthcheck / Status do Servidor
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Rota para o Painel do Desenvolvedor
app.get('/servidor', (req, res) => {
  const servidorPath = path.join(__dirname, 'servidor.html');
  if (fs.existsSync(servidorPath)) {
    res.sendFile(servidorPath);
  } else {
    res.status(404).send('Painel do servidor (servidor.html) não encontrado.');
  }
});

// Bloqueia arquivos estáticos não encontrados para evitar redirecionar para a index
app.get(/\.(js|css|png|jpg|jpeg|gif|ico|json|svg|woff2?|ttf)$/, (req, res) => {
  res.status(404).send('Arquivo não encontrado.');
});

// Rota principal e fallback SPA
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Página principal (index.html) não encontrada.');
  }
});

// Tratamento de erros globais
app.use((err, req, res, next) => {
  console.error("Erro interno no servidor:", err.stack);
  res.status(500).json({ error: "Erro interno no servidor." });
});

const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// Encerramento gracioso
const gracefulShutdown = (signal) => {
  console.log(`\nRecebido o sinal ${signal}. Encerrando servidor graciosamente...`);
  server.close(() => {
    console.log('Conexões encerradas com sucesso.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('Exceção Não Tratada:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Rejeição Não Tratada:', promise, 'motivo:', reason);
});
