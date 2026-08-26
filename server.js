require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota de Login usando RA, Dígito e Senha
app.post('/api/login', async (req, res) => {
  const { ra, digito, senha } = req.body;

  if (!ra || !digito || !senha) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  const { data, error } = await supabase
    .from('alunos')
    .select('id, nome, ra, digito, faltas, tarefas_pendentes, boletim')
    .eq('ra', ra)
    .eq('digito', digito)
    .eq('senha', senha)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: 'RA, Dígito ou Senha inválidos.' });
  }

  return res.json({ success: true, aluno: data });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
