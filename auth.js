// ==========================================================================
// MÓDULO DE AUTENTICAÇÃO E REGISTRO (auth.js) - SPHERE PRO v5.2
// Turnstile Anti-Bot, Rate-Limiting Local, Reativação de Conta & Gestão
// ==========================================================================

const SUPABASE_URL = "https://phvnxlogznbplynwflch.supabase.co";
const SUPABASE_KEY = "sb_publishable_CvzU52jm8tRyWBE0g4UvKg_J_nVMIAQ";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
window.supabaseClient = supabaseClient;

let etapaCriacaoAtual = 1;
let usernameEstaLivre = false;
let timeoutDebounceUsername = null;
let avatarBase64Selecionado = null;
let turnstileToken = null;

// Configuração de Rate Limiting (Máximo de 5 tentativas a cada 60s)
const RATE_LIMIT_CONFIG = {
  MAX_TENTATIVAS: 5,
  JANELA_TEMPO_MS: 60 * 1000
};

// Callback global do Cloudflare Turnstile
window.onloadTurnstileCallback = function () {
  if (window.turnstile) {
    window.turnstile.render('#turnstile-container', {
      sitekey: '1x00000000000000000000AA',
      callback: function (token) {
        turnstileToken = token;
      }
    });
  }
};

function sanitizarHtmlAuth(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Rate Limiting Local contra Brute-Force
function verificarRateLimit() {
  const agora = Date.now();
  let tentativas = JSON.parse(localStorage.getItem('sphere_auth_attempts') || '[]');
  tentativas = tentativas.filter(t => agora - t < RATE_LIMIT_CONFIG.JANELA_TEMPO_MS);

  if (tentativas.length >= RATE_LIMIT_CONFIG.MAX_TENTATIVAS) {
    const tempoRestante = Math.ceil((RATE_LIMIT_CONFIG.JANELA_TEMPO_MS - (agora - tentativas[0])) / 1000);
    exibirMensagem(`Muitas tentativas registradas. Aguarde ${tempoRestante}s para tentar novamente.`);
    return false;
  }

  tentativas.push(agora);
  localStorage.setItem('sphere_auth_attempts', JSON.stringify(tentativas));
  return true;
}

function mostrarTela(tela) {
  const formLogin = document.getElementById('form-login');
  const formCriar = document.getElementById('form-criar');
  const telaInicialButtons = document.getElementById('auth-initial-buttons');
  
  limparMensagens();

  if (tela === 'criar') {
    if (telaInicialButtons) telaInicialButtons.classList.add('hidden');
    if (formLogin) formLogin.classList.add('hidden');
    if (formCriar) formCriar.classList.remove('hidden');
    resetarWizardCriacao();
  } else if (tela === 'login') {
    if (telaInicialButtons) telaInicialButtons.classList.add('hidden');
    if (formCriar) formCriar.classList.add('hidden');
    if (formLogin) formLogin.classList.remove('hidden');
  } else {
    if (formLogin) formLogin.classList.add('hidden');
    if (formCriar) formCriar.classList.add('hidden');
    if (telaInicialButtons) telaInicialButtons.classList.remove('hidden');
    carregarContasSalvas();
  }
}

function exibirMensagem(texto, tipo = 'error') {
  const msgErro = document.getElementById('msg-erro');
  if (msgErro) {
    msgErro.innerText = texto;
    msgErro.className = tipo === 'success' ? 'success-msg' : 'error-msg';
  }
}

function limparMensagens() {
  const msgErro = document.getElementById('msg-erro');
  if (msgErro) {
    msgErro.innerText = '';
    msgErro.className = 'error-msg';
  }
}

function alternarEstadoBotao(botao, carregando, textoPadrao) {
  if (!botao) return;
  if (carregando) {
    botao.disabled = true;
    if (!botao.dataset.originalHtml) {
      botao.dataset.originalHtml = botao.innerHTML;
    }
    botao.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processando...`;
  } else {
    botao.disabled = false;
    botao.innerHTML = botao.dataset.originalHtml || textoPadrao || 'Confirmar';
  }
}

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

function validarUsername(input) {
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

      if (data && data.length > 0) {
        if (feedback) {
          feedback.className = 'username-feedback error';
          feedback.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Este @username já está em uso';
        }
        usernameEstaLivre = false;
      } else {
        if (feedback) {
          feedback.className = 'username-feedback success';
          feedback.innerHTML = '<i class="fa-solid fa-circle-check"></i> @username disponível!';
        }
        usernameEstaLivre = true;
      }
    } catch (err) {
      console.error("Falha ao checar username:", err);
    }
  }, 350);
}

// Seleção de Avatar Local com Cropper
function abrirSeletorGaleriaAvatar() {
  const inputEl = document.getElementById('input-galeria-avatar');
  if (inputEl) inputEl.click();
}

function processarAvatarGaleriaAuth(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  if (file.size > 8 * 1024 * 1024) {
    exibirMensagem("A imagem de perfil deve ter no máximo 8MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const srcOriginal = e.target.result;
    
    if (file.type === 'image/gif') {
      avatarBase64Selecionado = srcOriginal;
      atualizarPreviewAvatarDOM(srcOriginal);
      return;
    }

    const modalCrop = document.createElement('div');
    modalCrop.id = 'auth-crop-modal';
    modalCrop.className = 'policy-modal-overlay';
    modalCrop.innerHTML = `
      <div class="policy-modal-card" style="max-width: 400px; text-align: center;">
        <div class="policy-modal-header">
          <h2><i class="fa-solid fa-crop-simple"></i> Recortar Foto de Perfil</h2>
        </div>
        <div style="max-height: 280px; overflow: hidden; margin: 12px 0;">
          <img id="auth-img-crop" src="${srcOriginal}" style="max-width: 100%; display: block;" />
        </div>
        <div class="policy-modal-actions">
          <button class="btn-policy-action sec" id="btn-cancel-auth-crop">Cancelar</button>
          <button class="btn-policy-action primary" id="btn-apply-auth-crop"><i class="fa-solid fa-check"></i> Recortar e Usar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalCrop);

    let cropper = null;
    const imgElem = document.getElementById('auth-img-crop');

    const carregarCropper = () => {
      if (window.Cropper) {
        cropper = new window.Cropper(imgElem, { aspectRatio: 1, viewMode: 1, background: false });
      } else {
        avatarBase64Selecionado = srcOriginal;
        atualizarPreviewAvatarDOM(srcOriginal);
        modalCrop.remove();
      }
    };

    if (!window.Cropper) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
      script.onload = carregarCropper;
      document.head.appendChild(script);
    } else {
      carregarCropper();
    }

    document.getElementById('btn-cancel-auth-crop').onclick = () => {
      if (cropper) cropper.destroy();
      modalCrop.remove();
    };

    document.getElementById('btn-apply-auth-crop').onclick = () => {
      if (cropper) {
        const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
        avatarBase64Selecionado = canvas.toDataURL('image/webp', 0.88);
        atualizarPreviewAvatarDOM(avatarBase64Selecionado);
        cropper.destroy();
      }
      modalCrop.remove();
    };
  };

  reader.readAsDataURL(file);
}

function atualizarPreviewAvatarDOM(src) {
  const preview = document.getElementById('criar-avatar-preview');
  if (preview) preview.src = src;
}

// Gerenciamento de Contas Salvas
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
      <div class="contas-salvas-title"><i class="fa-solid fa-users"></i> Alternar Conta Instantaneamente</div>
      <div class="contas-salvas-list">
    `;

    contas.forEach(c => {
      const avatar = c.avatar_url || `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(c.username)}`;
      html += `
        <div class="conta-chip" onclick="trocarContaDiretoLocal('${sanitizarHtmlAuth(c.username)}')" title="Clique para entrar como @${sanitizarHtmlAuth(c.username)}">
          <img src="${avatar}" alt="${c.username}" class="conta-chip-avatar" onerror="this.src='https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(c.username)}'">
          <span class="conta-chip-name">@${sanitizarHtmlAuth(c.username)}</span>
          <i class="fa-solid fa-xmark remove-chip-btn" onclick="event.stopPropagation(); removerContaSalva('${sanitizarHtmlAuth(c.username)}')" title="Remover da lista"></i>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  } catch (err) {
    console.error("Erro ao ler contas salvas:", err);
  }
}

async function trocarContaDiretoLocal(username) {
  try {
    const contas = JSON.parse(localStorage.getItem('contas_salvas_lista')) || [];
    const contaAlvo = contas.find(c => c.username === username);

    if (contaAlvo) {
      // Re-valida o status da conta no servidor
      if (supabaseClient) {
        const { data: dbUser } = await supabaseClient
          .from('usuarios')
          .select('*')
          .eq('id', contaAlvo.id)
          .maybeSingle();

        if (dbUser) {
          const autorizado = await validarStatusEGerenciarReativacao(dbUser);
          if (autorizado) {
            concluirAutenticacaoESessao(dbUser);
          }
          return;
        }
      }

      concluirAutenticacaoESessao(contaAlvo);
    }
  } catch (err) {
    console.error("Erro ao alternar conta:", err);
  }
}

function salvarContaLocal(usuario) {
  try {
    let contas = JSON.parse(localStorage.getItem('contas_salvas_lista')) || [];
    contas = contas.filter(c => c.username !== usuario.username);
    contas.unshift({
      username: usuario.username,
      display_name: usuario.display_name || usuario.nome || usuario.username,
      avatar_url: usuario.avatar_url,
      id: usuario.id
    });
    if (contas.length > 5) contas.pop();
    localStorage.setItem('contas_salvas_lista', JSON.stringify(contas));
  } catch (err) {
    console.error("Erro ao salvar conta:", err);
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

// Wizard em Etapas
function resetarWizardCriacao() {
  etapaCriacaoAtual = 1;
  usernameEstaLivre = false;
  avatarBase64Selecionado = null;
  turnstileToken = null;

  const inputs = document.querySelectorAll('#form-criar input');
  inputs.forEach(i => {
    if (i.type === 'checkbox') i.checked = false;
    else i.value = '';
  });

  const feedback = document.getElementById('username-check-feedback');
  if (feedback) feedback.innerHTML = '';

  atualizarPreviewAvatarDOM('https://ui-avatars.com/api/?background=ff2d55&color=fff&name=Sphere');
  atualizarExibicaoEtapas();
}

function avancarEtapa() {
  limparMensagens();

  if (etapaCriacaoAtual === 1) {
    const displayName = document.getElementById('criar-display-name')?.value.trim();
    const username = document.getElementById('criar-username')?.value.trim();
    const email = document.getElementById('criar-email')?.value.trim();
    const senha = document.getElementById('criar-senha')?.value;
    const confirmar = document.getElementById('criar-confirmar')?.value;

    if (!displayName || !username || !senha) {
      exibirMensagem("Preencha todos os campos obrigatórios.");
      return;
    }

    if (email && (!email.includes('@') || !email.includes('.'))) {
      exibirMensagem("Por favor, informe um endereço de e-mail válido.");
      return;
    }

    if (username.length < 3) {
      exibirMensagem("O @username precisa ter no mínimo 3 caracteres.");
      return;
    }

    if (!usernameEstaLivre) {
      exibirMensagem("Escolha um @username válido e disponível.");
      return;
    }

    if (senha.length < 4) {
      exibirMensagem("A senha deve ter no mínimo 4 caracteres.");
      return;
    }

    if (senha !== confirmar) {
      exibirMensagem("As senhas não coincidem.");
      return;
    }
  } else if (etapaCriacaoAtual === 2) {
    const nascimento = document.getElementById('criar-nascimento')?.value;
    if (!nascimento) {
      exibirMensagem("Informe sua data de nascimento para prosseguir.");
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
    mostrarTela('inicial');
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

function abrirVerificacaoTermos(tipo) {
  if (tipo === 'termos' && typeof window.abrirTermosDeUso === 'function') {
    window.abrirTermosDeUso();
  } else if (tipo === 'privacidade' && typeof window.abrirPoliticaPrivacidade === 'function') {
    window.abrirPoliticaPrivacidade();
  } else if (tipo === 'seguranca' && typeof window.abrirDiretrizesSeguranca === 'function') {
    window.abrirDiretrizesSeguranca();
  }
}

// Modal de Reativação de Conta Desativada
function abrirModalReativacaoConta(usuario, aoConfirmar) {
  const modalAntigo = document.getElementById('modal-reativar-conta');
  if (modalAntigo) modalAntigo.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-reativar-conta';
  modal.className = 'config-modal-overlay';
  modal.style.zIndex = '10000';

  modal.innerHTML = `
    <div class="config-modal-card">
      <div class="config-modal-header" style="color: #00d2ff;">
        <i class="fa-solid fa-user-check"></i>
        <span>Sua conta está desativada</span>
      </div>
      <p class="config-modal-desc">
        Identificamos que a conta de <strong>@${sanitizarHtmlAuth(usuario.username)}</strong> está desativada. Deseja reativar sua conta e voltar a usar o Sphere agora?
      </p>

      <div class="config-modal-actions">
        <button class="btn-config-modal sec" id="btn-cancelar-reativacao">Cancelar</button>
        <button class="btn-config-modal primary" id="btn-confirmar-reativacao" style="background:#00d2ff; color:#000;">Reativar Minha Conta</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('btn-cancelar-reativacao').onclick = () => modal.remove();

  document.getElementById('btn-confirmar-reativacao').onclick = async () => {
    const btn = document.getElementById('btn-confirmar-reativacao');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Reativando...`;

    try {
      if (supabaseClient) {
        await supabaseClient
          .from('usuarios')
          .update({ status_conta: 'ativa' })
          .eq('id', usuario.id);
      }

      usuario.status_conta = 'ativa';
      modal.remove();
      if (typeof aoConfirmar === 'function') aoConfirmar(usuario);
    } catch (e) {
      exibirMensagem("Erro ao reativar conta. Tente novamente.");
      btn.disabled = false;
      btn.textContent = 'Reativar Minha Conta';
    }
  };
}

// Validador Geral de Status da Conta
async function validarStatusEGerenciarReativacao(usuario) {
  if (!usuario) return false;

  if (usuario.is_banned || usuario.status_conta === 'banida') {
    exibirMensagem("Esta conta foi banida permanentemente por violar as diretrizes.");
    return false;
  }

  if (usuario.status_conta === 'suspensa') {
    exibirMensagem("Esta conta está temporariamente suspensa.");
    return false;
  }

  if (usuario.status_conta === 'desativada') {
    return new Promise((resolve) => {
      abrirModalReativacaoConta(usuario, (usuarioAtualizado) => {
        resolve(true);
      });
    });
  }

  return true;
}

// Registro de Conta
async function criarConta() {
  limparMensagens();
  if (!verificarRateLimit()) return;

  const btnCriar = document.getElementById('btn-step-criar');
  const termosCheck = document.getElementById('aceitar-termos');

  if (termosCheck && !termosCheck.checked) {
    exibirMensagem("Você deve aceitar os Termos, Privacidade e Segurança para criar uma conta.");
    return;
  }

  const displayName = document.getElementById('criar-display-name')?.value.trim();
  const username = document.getElementById('criar-username')?.value.trim().toLowerCase();
  const email = document.getElementById('criar-email')?.value.trim();
  const senha = document.getElementById('criar-senha')?.value;
  const dataNascimento = document.getElementById('criar-nascimento')?.value;

  alternarEstadoBotao(btnCriar, true);

  try {
    const { data: usuarioExistente } = await supabaseClient
      .from('usuarios')
      .select('username')
      .eq('username', username);

    if (usuarioExistente && usuarioExistente.length > 0) {
      exibirMensagem("Este @username já está em uso.");
      etapaCriacaoAtual = 1;
      atualizarExibicaoEtapas();
      return;
    }

    const novoUsuario = { 
      display_name: displayName,
      username: username, 
      email: email || null,
      senha: senha,
      data_nascimento: dataNascimento,
      avatar_url: avatarBase64Selecionado || null,
      status: 'online',
      status_conta: 'ativa',
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
      localStorage.setItem('sphere_termos_aceitos', 'true');
      localStorage.setItem('sphere_privacidade_aceita', 'true');
      localStorage.setItem('sphere_seguranca_aceita', 'true');

      exibirMensagem("Conta criada com sucesso! Entrando...", "success");

      setTimeout(() => {
        concluirAutenticacaoESessao(data);
      }, 800);
    }
  } catch (err) {
    exibirMensagem("Erro de comunicação com o servidor.");
  } finally {
    alternarEstadoBotao(btnCriar, false);
  }
}

// Login
async function entrar() {
  limparMensagens();
  if (!verificarRateLimit()) return;

  const btnEntrar = document.getElementById('btn-entrar');
  const loginInput = document.getElementById('login-username')?.value.trim().toLowerCase();
  const senhaInput = document.getElementById('login-senha')?.value;

  if (!loginInput || !senhaInput) {
    exibirMensagem("Informe seu e-mail ou @username e sua senha.");
    return;
  }

  alternarEstadoBotao(btnEntrar, true);

  try {
    const ehEmail = loginInput.includes('@');
    let query = supabaseClient.from('usuarios').select('*').eq('senha', senhaInput);

    if (ehEmail) {
      query = query.eq('email', loginInput);
    } else {
      query = query.eq('username', loginInput);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      exibirMensagem("Credenciais incorretas. Verifique seu login e senha.");
    } else {
      const eValido = await validarStatusEGerenciarReativacao(data);
      if (eValido) {
        // Limpa flag de relog caso exista
        if (data.requer_relog) {
          await supabaseClient.from('usuarios').update({ requer_relog: false }).eq('id', data.id);
        }
        concluirAutenticacaoESessao(data);
      }
    }
  } catch (err) {
    exibirMensagem("Falha de conexão com o servidor.");
  } finally {
    alternarEstadoBotao(btnEntrar, false);
  }
}

// Login via Google OAuth
async function entrarComGoogle() {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) exibirMensagem("Erro ao conectar com Google: " + error.message);
  } catch (err) {
    exibirMensagem("Falha ao iniciar autenticação com o Google.");
  }
}

function concluirAutenticacaoESessao(usuario) {
  localStorage.setItem('usuario_logado', JSON.stringify(usuario));
  salvarContaLocal(usuario);

  if (typeof window.atualizarStatusLocal === 'function') {
    window.atualizarStatusLocal('online');
  }

  const authCard = document.getElementById('auth-card');
  if (authCard) authCard.classList.add('hidden');

  if (typeof atualizarComponentesVisiveis === 'function') {
    atualizarComponentesVisiveis();
  }

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

  mostrarTela('inicial');
}

// Inicialização DOM
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
window.abrirSeletorGaleriaAvatar = abrirSeletorGaleriaAvatar;
window.processarAvatarGaleriaAuth = processarAvatarGaleriaAuth;
window.abrirVerificacaoTermos = abrirVerificacaoTermos;
window.trocarContaDiretoLocal = trocarContaDiretoLocal;
window.criarConta = criarConta;
window.entrar = entrar;
window.entrarComGoogle = entrarComGoogle;
window.sair = sair;
window.removerContaSalva = removerContaSalva;
window.validarStatusEGerenciarReativacao = validarStatusEGerenciarReativacao;
