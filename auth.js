// ==========================================================================
// MÓDULO DE AUTENTICAÇÃO E REGISTRO (auth.js) - PROJECT Z ENHANCED
// ==========================================================================

const SUPABASE_URL = "https://phvnxlogznbplynwflch.supabase.co";
const SUPABASE_KEY = "sb_publishable_CvzU52jm8tRyWBE0g4UvKg_J_nVMIAQ";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
window.supabaseClient = supabaseClient;

let etapaCriacaoAtual = 1;
let usernameEstaLivre = false;
let timeoutDebounceUsername = null;

// Sanitização de HTML
function sanitizarHtmlAuth(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Alterna entre as telas principais (Login / Criar)
function mostrarTela(tela) {
  const formLogin = document.getElementById('form-login');
  const formCriar = document.getElementById('form-criar');
  
  limparMensagens();

  if (tela === 'criar') {
    if (formLogin) formLogin.classList.add('hidden');
    if (formCriar) formCriar.classList.remove('hidden');
    resetarWizardCriacao();
  } else {
    if (formCriar) formCriar.classList.add('hidden');
    if (formLogin) formLogin.classList.remove('hidden');
    carregarContasSalvas();
  }
}

function exibirMensagem(texto, tipo = 'error') {
  const msgErro = document.getElementById('msg-erro');
  if (msgErro) {
    msgErro.innerText = texto;
    msgErro.className = tipo === 'success' ? 'success-msg' : 'error';
  }
}

function limparMensagens() {
  const msgErro = document.getElementById('msg-erro');
  if (msgErro) {
    msgErro.innerText = '';
    msgErro.className = 'error';
  }
}

function alternarEstadoBotao(botao, carregando, textoPadrao) {
  if (!botao) return;
  if (carregando) {
    botao.disabled = true;
    if (!botao.dataset.originalHtml) {
      botao.dataset.originalHtml = botao.innerHTML;
    }
    botao.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Aguarde...`;
  } else {
    botao.disabled = false;
    botao.innerHTML = botao.dataset.originalHtml || textoPadrao || 'Confirmar';
  }
}

// Alternar Visibilidade da Senha
function alternarVisibilidadeSenha(inputId, iconeId) {
  const input = document.getElementById(inputId);
  const icone = document.getElementById(iconeId);
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    if (icone) {
      icone.classList.remove('fa-eye');
      icone.classList.add('fa-eye-slash');
    }
  } else {
    input.type = 'password';
    if (icone) {
      icone.classList.remove('fa-eye-slash');
      icone.classList.add('fa-eye');
    }
  }
}

// Validar e Checar Username Único em Tempo Real no Supabase
function validarUsername(input) {
  // Limpa caracteres especiais, permite apenas letras, números, _ e -
  input.value = input.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const username = input.value.trim();
  const feedback = document.getElementById('username-check-feedback');

  usernameEstaLivre = false;

  if (timeoutDebounceUsername) clearTimeout(timeoutDebounceUsername);

  if (!username) {
    if (feedback) feedback.innerHTML = '';
    return;
  }

  if (username.length < 3) {
    if (feedback) {
      feedback.className = 'username-feedback error';
      feedback.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> O @username deve ter pelo menos 3 caracteres';
    }
    return;
  }

  if (feedback) {
    feedback.className = 'username-feedback checking';
    feedback.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checando disponibilidade...';
  }

  timeoutDebounceUsername = setTimeout(async () => {
    if (!supabaseClient) {
      usernameEstaLivre = true;
      if (feedback) feedback.innerHTML = '';
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('usuarios')
        .select('username')
        .eq('username', username);

      if (error) {
        console.error("Erro ao validar username:", error);
        return;
      }

      // Se encontrou algum registro, o nome já existe
      if (data && data.length > 0) {
        if (feedback) {
          feedback.className = 'username-feedback error';
          feedback.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Este @username já está em uso';
        }
        usernameEstaLivre = false;
      } else {
        if (feedback) {
          feedback.className = 'username-feedback success';
          feedback.innerHTML = '<i class="fa-solid fa-circle-check"></i> @username livre e disponível!';
        }
        usernameEstaLivre = true;
      }
    } catch (err) {
      console.error("Falha ao conectar no Supabase para checar username:", err);
    }
  }, 350);
}

// ==========================================================================
// CONTAS SALVAS NO LOCALSTORAGE
// ==========================================================================

function carregarContasSalvas() {
  const container = document.getElementById('contas-salvas-container');
  if (!container) return;

  try {
    const contas = JSON.parse(localStorage.getItem('contas_salvas_lista')) || [];
    container.innerHTML = '';

    if (contas.length === 0) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    let html = `
      <div class="contas-salvas-title"><i class="fa-solid fa-users"></i> Contas Salvas</div>
      <div class="contas-salvas-list">
    `;

    contas.forEach(c => {
      const avatar = c.avatar_url || `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(c.username)}`;
      html += `
        <div class="conta-chip" onclick="selecionarContaSalva('${sanitizarHtmlAuth(c.username)}')">
          <img src="${avatar}" alt="${c.username}" class="conta-chip-avatar" onerror="this.src='https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(c.username)}'">
          <span class="conta-chip-name">@${sanitizarHtmlAuth(c.username)}</span>
          <i class="fa-solid fa-xmark remove-chip-btn" onclick="event.stopPropagation(); removerContaSalva('${sanitizarHtmlAuth(c.username)}')" title="Remover conta"></i>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  } catch (err) {
    console.error("Erro ao ler contas salvas:", err);
  }
}

function selecionarContaSalva(username) {
  const inputUsername = document.getElementById('login-username');
  const inputSenha = document.getElementById('login-senha');
  if (inputUsername) inputUsername.value = username;
  if (inputSenha) inputSenha.focus();
}

function salvarContaLocal(usuario) {
  try {
    let contas = JSON.parse(localStorage.getItem('contas_salvas_lista')) || [];
    contas = contas.filter(c => c.username !== usuario.username);
    contas.unshift({
      username: usuario.username,
      avatar_url: usuario.avatar_url,
      id: usuario.id
    });
    if (contas.length > 5) contas.pop();
    localStorage.setItem('contas_salvas_lista', JSON.stringify(contas));
  } catch (err) {
    console.error("Erro ao salvar conta no localStorage:", err);
  }
}

function removerContaSalva(username) {
  try {
    let contas = JSON.parse(localStorage.getItem('contas_salvas_lista')) || [];
    contas = contas.filter(c => c.username !== username);
    localStorage.setItem('contas_salvas_lista', JSON.stringify(contas));
    carregarContasSalvas();
  } catch (err) {
    console.error("Erro ao remover conta salva:", err);
  }
}

// ==========================================================================
// FLUXO DE CRIAÇÃO EM ETAPAS (WIZARD)
// ==========================================================================

function resetarWizardCriacao() {
  etapaCriacaoAtual = 1;
  usernameEstaLivre = false;
  const inputs = document.querySelectorAll('#form-criar input');
  inputs.forEach(i => {
    if (i.type === 'checkbox') i.checked = false;
    else i.value = '';
  });

  const feedback = document.getElementById('username-check-feedback');
  if (feedback) feedback.innerHTML = '';

  const avatarPreview = document.getElementById('criar-avatar-preview');
  if (avatarPreview) avatarPreview.src = 'https://ui-avatars.com/api/?background=ff2d55&color=fff&name=PZ';

  atualizarExibicaoEtapas();
}

function avancarEtapa() {
  limparMensagens();

  if (etapaCriacaoAtual === 1) {
    const displayName = document.getElementById('criar-display-name')?.value.trim();
    const username = document.getElementById('criar-username')?.value.trim();
    const senha = document.getElementById('criar-senha')?.value;
    const confirmar = document.getElementById('criar-confirmar')?.value;

    if (!displayName || !username || !senha) {
      exibirMensagem("Preencha todos os campos obrigatórios para prosseguir.");
      return;
    }
    if (username.length < 3) {
      exibirMensagem("O @username deve possuir no mínimo 3 caracteres.");
      return;
    }
    if (!usernameEstaLivre) {
      exibirMensagem("Escolha um @username válido e disponível.");
      return;
    }
    if (senha.length < 4) {
      exibirMensagem("A senha precisa ter no mínimo 4 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      exibirMensagem("As senhas informadas não coincidem.");
      return;
    }
  } else if (etapaCriacaoAtual === 2) {
    const nascimento = document.getElementById('criar-nascimento')?.value;
    if (!nascimento) {
      exibirMensagem("Por favor, preencha sua data de nascimento.");
      return;
    }
  }

  if (etapaCriacaoAtual < 3) {
    etapaCriacaoAtual++;
    atualizarExibicaoEtapas();
  }
}

function voltarEtapa() {
  limparMensagens();
  if (etapaCriacaoAtual > 1) {
    etapaCriacaoAtual--;
    atualizarExibicaoEtapas();
  } else {
    mostrarTela('login');
  }
}

function atualizarExibicaoEtapas() {
  document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
  const stepAtual = document.getElementById(`step-${etapaCriacaoAtual}`);
  if (stepAtual) stepAtual.classList.remove('hidden');

  document.querySelectorAll('.step-dot').forEach((dot, index) => {
    if (index + 1 <= etapaCriacaoAtual) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  const btnAvancar = document.getElementById('btn-step-avancar');
  const btnCriarFinal = document.getElementById('btn-step-criar');

  if (etapaCriacaoAtual === 3) {
    if (btnAvancar) btnAvancar.classList.add('hidden');
    if (btnCriarFinal) btnCriarFinal.classList.remove('hidden');
  } else {
    if (btnAvancar) btnAvancar.classList.remove('hidden');
    if (btnCriarFinal) btnCriarFinal.classList.add('hidden');
  }
}

// Suporte a Upload do Avatar pela Galeria / Arquivo Local
function processarAvatarArquivoAuth(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  if (file.size > 8 * 1024 * 1024) {
    exibirMensagem("A foto escolhida deve ser menor que 8MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    const avatarPreview = document.getElementById('criar-avatar-preview');
    const avatarInput = document.getElementById('avatar-url');

    if (avatarPreview) avatarPreview.src = base64;
    if (avatarInput) avatarInput.value = base64;
  };
  reader.readAsDataURL(file);
}

// Atualizar Preview quando digitar URL de Avatar
function atualizarAvatarUrlPreview(input) {
  const url = input.value.trim();
  const avatarPreview = document.getElementById('criar-avatar-preview');
  if (avatarPreview && url !== '') {
    avatarPreview.src = url;
  }
}

// Criar Conta e Entrar Direto no Sistema
async function criarConta() {
  limparMensagens();
  const btnCriar = document.getElementById('btn-step-criar');
  const termosCheck = document.getElementById('aceitar-termos');

  if (termosCheck && !termosCheck.checked) {
    exibirMensagem("Você deve concordar com os Termos e Condições para continuar.");
    return;
  }

  const displayName = document.getElementById('criar-display-name')?.value.trim();
  const username = document.getElementById('criar-username')?.value.trim().toLowerCase();
  const senha = document.getElementById('criar-senha')?.value;
  const dataNascimento = document.getElementById('criar-nascimento')?.value;
  const avatar = document.getElementById('avatar-url')?.value.trim();

  alternarEstadoBotao(btnCriar, true);

  try {
    // Checagem final de segurança no banco de dados
    const { data: usuarioExistente } = await supabaseClient
      .from('usuarios')
      .select('username')
      .eq('username', username);

    if (usuarioExistente && usuarioExistente.length > 0) {
      exibirMensagem("Este @username já foi cadastrado por outro usuário.");
      etapaCriacaoAtual = 1;
      atualizarExibicaoEtapas();
      return;
    }

    const novoUsuario = { 
      display_name: displayName,
      username: username, 
      senha: senha,
      data_nascimento: dataNascimento,
      avatar_url: avatar || null,
      status: 'online',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from('usuarios')
      .insert([novoUsuario])
      .select('*')
      .single();

    if (error) {
      exibirMensagem("Erro ao registrar conta: " + error.message);
    } else if (data) {
      exibirMensagem("Conta criada com sucesso! Redirecionando...", "success");

      // LOGIN DIRETO - Sem passar pela tela de login
      setTimeout(() => {
        concluirAutenticacaoESessao(data);
      }, 1000);
    }
  } catch (err) {
    exibirMensagem("Erro de comunicação com o servidor.");
  } finally {
    alternarEstadoBotao(btnCriar, false);
  }
}

// ==========================================================================
// LOGIN & LOGOUT
// ==========================================================================

async function entrar() {
  limparMensagens();
  const btnEntrar = document.getElementById('btn-entrar');
  const usernameInput = document.getElementById('login-username');
  const senhaInput = document.getElementById('login-senha');

  const username = usernameInput ? usernameInput.value.trim().toLowerCase() : '';
  const senha = senhaInput ? senhaInput.value : '';

  if (!username || !senha) {
    exibirMensagem("Por favor, informe seu usuário e senha.");
    return;
  }

  alternarEstadoBotao(btnEntrar, true);

  try {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .eq('senha', senha)
      .maybeSingle();

    if (error || !data) {
      exibirMensagem("Usuário ou senha incorretos.");
    } else if (data.is_banned) {
      exibirMensagem("Sua conta está suspensa por violar as regras da comunidade.");
    } else {
      concluirAutenticacaoESessao(data);
    }
  } catch (err) {
    exibirMensagem("Falha ao tentar conectar ao servidor.");
  } finally {
    alternarEstadoBotao(btnEntrar, false);
  }
}

function concluirAutenticacaoESessao(usuario) {
  // Salva a sessão ativa e histórico de contas
  localStorage.setItem('usuario_logado', JSON.stringify(usuario));
  salvarContaLocal(usuario);

  // Atualiza status local para Online
  if (typeof window.atualizarStatusLocal === 'function') {
    window.atualizarStatusLocal('online');
  }

  // Esconde o modal/card de autenticação
  const authCard = document.getElementById('auth-card');
  if (authCard) authCard.classList.add('hidden');

  if (typeof atualizarComponentesVisiveis === 'function') {
    atualizarComponentesVisiveis();
  }

  // Renderiza o novo HomeCard
  if (typeof window.renderHomeCard === 'function') {
    window.renderHomeCard(usuario);
  }

  if (typeof carregarHome === 'function') {
    carregarHome(usuario);
  } else {
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.classList.remove('hidden');
  }
}

function sair() {
  localStorage.removeItem('usuario_logado');

  if (typeof window.atualizarStatusLocal === 'function') {
    window.atualizarStatusLocal('offline');
  }

  if (typeof window.removerHomeCard === 'function') {
    window.removerHomeCard();
  }

  if (typeof atualizarComponentesVisiveis === 'function') {
    atualizarComponentesVisiveis();
  }

  const homeScreen = document.getElementById('home-screen');
  if (homeScreen) homeScreen.classList.add('hidden');

  const authCard = document.getElementById('auth-card');
  if (authCard) authCard.classList.remove('hidden');

  mostrarTela('login');
}

// Inicialização de Escutadores
document.addEventListener('DOMContentLoaded', () => {
  carregarContasSalvas();

  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        entrar();
      }
    });
  }

  const usuarioSalvo = localStorage.getItem('usuario_logado');
  if (usuarioSalvo) {
    try {
      const parsedUser = JSON.parse(usuarioSalvo);
      const authCard = document.getElementById('auth-card');
      if (authCard) authCard.classList.add('hidden');
      
      if (typeof window.renderHomeCard === 'function') {
        window.renderHomeCard(parsedUser);
      }

      if (typeof carregarHome === 'function') {
        carregarHome(parsedUser);
      }
    } catch (e) {
      localStorage.removeItem('usuario_logado');
    }
  }
});

// Exportações Globais
window.mostrarTela = mostrarTela;
window.validarUsername = validarUsername;
window.alternarVisibilidadeSenha = alternarVisibilidadeSenha;
window.avancarEtapa = avancarEtapa;
window.voltarEtapa = voltarEtapa;
window.processarAvatarArquivoAuth = processarAvatarArquivoAuth;
window.atualizarAvatarUrlPreview = atualizarAvatarUrlPreview;
window.criarConta = criarConta;
window.entrar = entrar;
window.sair = sair;
window.selecionarContaSalva = selecionarContaSalva;
window.removerContaSalva = removerContaSalva;
