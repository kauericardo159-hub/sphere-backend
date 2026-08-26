const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const app = express();

// Oculta a assinatura do servidor
app.disable('x-powered-by');

// Configuração de confiança para proxies reversos (Cloudflare, Nginx, Render, Heroku)
app.enable('trust proxy');

// -----------------------------------------------------------------------------
// 1. CONFIGURAÇÕES DE SEGURANÇA (HELMET & CORS)
// -----------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
          'https://unpkg.com',
          'https://*.supabase.co'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com',
          'https://cdn.jsdelivr.net'
        ],
        fontSrc: [
          "'self'",
          'data:',
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:',
          'http:'
        ],
        connectSrc: [
          "'self'",
          'https:',
          'wss:',
          'http:'
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'https:', 'blob:'],
        frameSrc: ["'self'", 'https:']
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  })
);

app.use(cors());

// -----------------------------------------------------------------------------
// 2. PARSERS E COMPRESSÃO DE DADOS
// -----------------------------------------------------------------------------
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Middleware de Log Minimalista de Requisições
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' || res.statusCode >= 400) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// -----------------------------------------------------------------------------
// 3. PROTEÇÃO E BLOQUEIO DE ARQUIVOS SENSÍVEIS
// -----------------------------------------------------------------------------
app.use((req, res, next) => {
  const normalizedPath = path.normalize(req.path).toLowerCase();

  // Padrão de bloqueio de diretórios ocultos, arquivos de configuração e código fonte
  const forbiddenPatterns = [
    /^\/server\.js$/i,
    /^\/package(-lock)?\.json$/i,
    /^\/\.env(\..*)?$/i,
    /^\/\.git/i,
    /^\/\.gitignore$/i,
    /^\/node_modules/i,
    /\.(md|yml|yaml|sh|bash|config|log|db|sqlite)$/i
  ];

  const isForbidden = forbiddenPatterns.some((pattern) => pattern.test(normalizedPath));

  if (isForbidden) {
    console.warn(`[SEGURANÇA] Tentativa de acesso bloqueada: ${req.ip} -> ${req.originalUrl}`);
    return res.status(403).json({
      error: 'Acesso proibido.',
      message: 'Você não tem permissão para acessar este recurso.'
    });
  }

  next();
});

// -----------------------------------------------------------------------------
// 4. SERVIDO DE ARQUIVOS ESTÁTICOS
// -----------------------------------------------------------------------------
app.use(
  express.static(__dirname, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Prevenção de cache para arquivos dinâmicos/front-end da aplicação
      if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate, max-age=0');
      } else if (filePath.match(/\.(png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/i)) {
        // Cache longo para assets estáticos imutáveis
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  })
);

// -----------------------------------------------------------------------------
// 5. ROTAS DA APLICAÇÃO
// -----------------------------------------------------------------------------

// Healthcheck e Monitoramento de Recursos
app.get('/status', (req, res) => {
  const memory = process.memoryUsage();
  
  res.status(200).json({
    status: 'online',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    pid: process.pid,
    memory: {
      rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`
    }
  });
});

// Rota para o Painel do Desenvolvedor
app.get('/servidor', (req, res) => {
  const servidorPath = path.join(__dirname, 'servidor.html');
  
  if (fs.existsSync(servidorPath)) {
    res.sendFile(servidorPath);
  } else {
    res.status(404).json({
      error: 'Painel do servidor não encontrado.',
      path: 'servidor.html'
    });
  }
});

// Bloqueio explícito de arquivos estáticos inexistentes (evita recair na SPA e retornar HTML 200)
app.get(/\.(js|css|png|jpg|jpeg|gif|ico|json|svg|woff2?|ttf|map)$/i, (req, res) => {
  res.status(404).json({
    error: 'Arquivo estático não encontrado.',
    resource: req.path
  });
});

// Rota genérica Fallback para Single Page Application (SPA)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Página principal (index.html) não encontrada.');
  }
});

// -----------------------------------------------------------------------------
// 6. TRATAMENTO GLOBAL DE ERROS E MIDDLES
// -----------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('❌ Erro interno no servidor:', err.stack || err);

  const statusCode = err.status || err.statusCode || 500;
  
  res.status(statusCode).json({
    error: 'Erro interno no servidor.',
    message: process.env.NODE_ENV === 'production' ? 'Ocorreu um erro inesperado no servidor.' : err.message
  });
});

// -----------------------------------------------------------------------------
// 7. INICIALIZAÇÃO DO SERVIDOR E ENCERRAMENTO GRACIOSO
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor ativo na porta ${PORT} [PID: ${process.pid}]`);
});

const gracefulShutdown = (signal) => {
  console.log(`\n⚠️ Sinal ${signal} recebido. Encerrando servidor HTTP...`);

  // Define um timeout limite para forçar a saída caso conexões fiquem presas
  const forceShutdownTimeout = setTimeout(() => {
    console.error('🚨 Forçando encerramento: O processo demorou muito para fechar as conexões.');
    process.exit(1);
  }, 10000);

  server.close(() => {
    clearTimeout(forceShutdownTimeout);
    console.log('✅ Servidor encerrado com sucesso. Conexões fechadas.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('🚨 Exceção Não Tratada (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Rejeição Não Tratada (Unhandled Rejection) em:', promise, 'motivo:', reason);
});
