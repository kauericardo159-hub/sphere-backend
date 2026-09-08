const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Inicializa o Socket.io com suporte a CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.enable('trust proxy');

// 1. SEGURANÇA E PROTEÇÃO BASE
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(cors());
app.use(xss()); // Sanitização de inputs contra injeção XSS

// Limitador de requisições para evitar abusos/DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // limite de 300 requisições por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições enviadas deste IP. Tente novamente mais tarde.' }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 2. BLOQUEIO DE ARQUIVOS SENSÍVEIS DA RAIZ
app.use((req, res, next) => {
  const reqPath = req.path.toLowerCase();
  const forbiddenList = [
    '/server.js', 
    '/package.json', 
    '/package-lock.json', 
    '/.env', 
    '/.gitignore',
    '/.git'
  ];

  if (forbiddenList.some(item => reqPath.startsWith(item))) {
    return res.status(403).send('Acesso proibido à infraestrutura do servidor.');
  }
  next();
});

// 3. ARQUIVOS ESTÁTICOS COM CACHE INTELIGENTE
app.use(express.static(__dirname, {
  maxAge: '1h',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// 4. ROTAS DE INFRAESTRUTURA E PAINÉIS
app.get('/status', (req, res) => {
  res.json({
    app: 'Sphere - Chat & RP Platform',
    status: 'online',
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

app.get('/servidor', (req, res) => {
  const servidorPath = path.join(__dirname, 'servidor.html');
  if (fs.existsSync(servidorPath)) {
    res.sendFile(servidorPath);
  } else {
    res.status(404).send('Painel do servidor (servidor.html) não encontrado.');
  }
});

app.get('/dev', (req, res) => {
  const devPath = path.join(__dirname, 'dev.html');
  if (fs.existsSync(devPath)) {
    res.sendFile(devPath);
  } else {
    res.status(404).send('Painel de desenvolvedor (dev.html) não encontrado.');
  }
});

// Rota de reinício remoto enviada do painel /servidor
app.post('/restart', (req, res) => {
  res.json({ status: 'ok', message: 'Instância do Sphere reiniciando...' });
  setTimeout(() => process.exit(0), 1000);
});

// 5. SUPORTE A EVENTOS DO SOCKET.IO (CHAT EM TEMPO REAL)
io.on('connection', (socket) => {
  console.log(`[Sphere Socket] Novo cliente conectado: ${socket.id}`);

  // Entrar em uma sala de Chat / RP
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user_joined_room', { socketId: socket.id });
  });

  // Notificação de Digitando...
  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('user_typing', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Sphere Socket] Cliente desconectado: ${socket.id}`);
  });
});

// 6. BLOQUEIO DE RECURSOS INEXISTENTES & FALLBACK SPA
app.get(/\.(js|css|png|jpg|jpeg|gif|ico|json|svg|woff2?|ttf)$/, (req, res) => {
  res.status(404).send('Arquivo estático não encontrado.');
});

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Página principal (index.html) não encontrada.');
  }
});

// 7. TRATAMENTO GLOBAL DE ERROS
app.use((err, req, res, next) => {
  console.error('[Sphere Engine Error]:', err.stack);
  res.status(500).json({ error: 'Erro interno na instância do Sphere.' });
});

// 8. INICIALIZAÇÃO DO SERVIDOR
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 SPHERE PLATFORM RUNNING ON PORT: ${PORT}`);
  console.log(`🌐 System URL: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});

// ENCERRAMENTO GRACIOSO
const gracefulShutdown = (signal) => {
  console.log(`\nRecebido o sinal ${signal}. Encerrando servidor do Sphere graciosamente...`);
  server.close(() => {
    console.log('Conexões HTTP e WebSocket encerradas com sucesso.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[Sphere Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Sphere Unhandled Rejection]:', promise, 'motivo:', reason);
});
