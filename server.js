require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do cliente Supabase no backend
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO: SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// -------------------------------------------------------------
// Middlewares Globais de Segurança
// -------------------------------------------------------------
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Configuração do CORS (Ajuste o origin quando tiver a URL do Frontend)
const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pelo CORS'));
    }
  },
  credentials: true
}));

// -------------------------------------------------------------
// Middleware de Autenticação Segura (Verifica Token JWT)
// -------------------------------------------------------------
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acesso negado: Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1];

    // Valida o JWT diretamente na API de Auth do Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    // Injeta os dados do usuário autenticado na requisição
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao validar autenticação.' });
  }
};

// -------------------------------------------------------------
// Rotas de Exemplo / Health Check
// -------------------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Sphere API' });
});

// Rota protegida: Retorna os dados da sessão do usuário autenticado
app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({
    message: 'Usuário autenticado com sucesso!',
    user: {
      id: req.user.id,
      email: req.user.email,
      created_at: req.user.created_at
    }
  });
});

// Inicialização do Servidor
app.listen(PORT, () => {
  console.log(`🚀 Sphere Backend rodando com segurança na porta ${PORT}`);
});
