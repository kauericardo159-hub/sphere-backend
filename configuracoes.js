// ==========================================================================
// MÓDULO DE CONFIGURAÇÕES & GERENCIAMENTO DE CONTAS (configuracoes.js)
// Sphere Pro v5.2 - Structured Layout, Cache Control & Sync
// ==========================================================================

function sanitizarConfig(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function obterSupabaseConfig() {
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    const SUPABASE_URL = "https://phvnxlogznbplynwflch.supabase.co";
    const SUPABASE_KEY = "sb_publishable_CvzU52jm8tRyWBE0g4UvKg_J_nVMIAQ";
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return window.supabaseClient;
  }
  return null;
}

function obterUsuarioLogadoLocal() {
  try {
    const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('[Config] Erro ao carregar usuário logado:', e);
  }
  return null;
}

function obterContasSalvasLocal() {
  try {
    return JSON.parse(localStorage.getItem('contas_salvas_lista')) || [];
  } catch (e) {
    return [];
  }
}

function salvarContasSalvasLocal(lista) {
  try {
    localStorage.setItem('contas_salvas_lista', JSON.stringify(lista));
  } catch (e) {
    console.error('[Config] Erro ao salvar lista de contas:', e);
  }
}

// Atualiza informações da conta ativa dentro da lista de contas salvas
function atualizarContaNaListaSalva(usuarioAtualizado) {
  if (!usuarioAtualizado || !usuarioAtualizado.username) return;
  let contas = obterContasSalvasLocal();
  const idx = contas.findIndex(c => c.username === usuarioAtualizado.username);
  if (idx !== -1) {
    contas[idx] = { ...contas[idx], ...usuarioAtualizado };
  } else {
    contas.push(usuarioAtualizado);
  }
  salvarContasSalvasLocal(contas);
}

// Toast Interno
function mostrarToastConfig(mensagem, tipo = 'info', tempo = 3200) {
  const antigo = document.getElementById('config-toast-msg');
  if (antigo) antigo.remove();

  const toast = document.createElement('div');
  toast.id = 'config-toast-msg';
  toast.className = `config-toast config-toast-${tipo}`;
  toast.innerHTML = `<i class="fa-solid ${tipo === 'sucesso' ? 'fa-circle-check' : 'fa-circle-info'}"></i> <span>${mensagem}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast && document.body.contains(toast)) {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }
  }, tempo);
}

// Modal de Confirmação para Exclusão
function abrirModalExclusaoConta() {
  const modalAntigo = document.getElementById('config-modal-confirm');
  if (modalAntigo) modalAntigo.remove();

  const usuario = obterUsuarioLogadoLocal();
  const emailAtual = usuario?.email || '';

  const modal = document.createElement('div');
  modal.id = 'config-modal-confirm';
  modal.className = 'config-modal-overlay';

  modal.innerHTML = `
    <div class="config-modal-card">
      <div class="config-modal-header">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Excluir Conta Definitivamente</span>
      </div>
      <p class="config-modal-desc">Esta ação é irreversível. Informe sua senha atual para confirmar a exclusão permanente dos seus dados.</p>

      <div class="config-modal-input-group">
        <label>Senha Atual:</label>
        <input type="password" id="config-modal-senha-input" placeholder="Sua senha..." autocomplete="current-password">
      </div>

      ${emailAtual ? `
        <div class="config-modal-input-group">
          <label>Confirme o E-mail de Recuperação (${sanitizarConfig(emailAtual)}):</label>
          <input type="email" id="config-modal-email-input" placeholder="Digite seu e-mail para confirmar">
        </div>
      ` : ''}

      <div class="config-modal-input-group">
        <label>Digite "DELETAR" em maiúsculas:</label>
        <input type="text" id="config-modal-deletar-input" placeholder="DELETAR">
      </div>

      <div id="config-modal-error" class="config-modal-error hidden"></div>

      <div class="config-modal-actions">
        <button class="btn-config-modal sec" id="btn-config-modal-cancelar">Cancelar</button>
        <button class="btn-config-modal danger" id="btn-config-modal-confirmar">Excluir Minha Conta</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('btn-config-modal-cancelar').onclick = () => modal.remove();

  document.getElementById('btn-config-modal-confirmar').onclick = async () => {
    const btnConfirmar = document.getElementById('btn-config-modal-confirmar');
    const msgErro = document.getElementById('config-modal-error');

    const senhaInp = document.getElementById('config-modal-senha-input')?.value;
    const emailInp = document.getElementById('config-modal-email-input')?.value.trim();
    const deletarInp = document.getElementById('config-modal-deletar-input')?.value.trim();

    if (!senhaInp) {
      msgErro.textContent = "Digite sua senha para prosseguir.";
      msgErro.classList.remove('hidden');
      return;
    }

    if (emailAtual && emailInp.toLowerCase() !== emailAtual.toLowerCase()) {
      msgErro.textContent = "O e-mail informado não coincide com o e-mail cadastrado.";
      msgErro.classList.remove('hidden');
      return;
    }

    if (deletarInp !== 'DELETAR') {
      msgErro.textContent = "Digite a palavra DELETAR exatamente como exibida.";
      msgErro.classList.remove('hidden');
      return;
    }

    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Excluindo...`;

    const sb = obterSupabaseConfig();
    if (!sb) {
      msgErro.textContent = "Conexão indisponível com o servidor.";
      msgErro.classList.remove('hidden');
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Excluir Minha Conta';
      return;
    }

    try {
      const { data: validacao, error: errVal } = await sb
        .from('usuarios')
        .select('id, senha')
        .eq('id', usuario.id)
        .eq('senha', senhaInp)
        .maybeSingle();

      if (errVal || !validacao) {
        msgErro.textContent = "Senha incorreta. Exclusão cancelada.";
        msgErro.classList.remove('hidden');
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Excluir Minha Conta';
        return;
      }

      const { error: errDel } = await sb
        .from('usuarios')
        .delete()
        .eq('id', usuario.id);

      if (errDel) {
        msgErro.textContent = "Erro ao apagar dados: " + errDel.message;
        msgErro.classList.remove('hidden');
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Excluir Minha Conta';
      } else {
        modal.remove();
        mostrarToastConfig('Sua conta foi excluída com sucesso.', 'sucesso', 3000);
        
        setTimeout(() => {
          removerContaListaSalva(usuario.username);
          localStorage.clear();
          location.reload();
        }, 1200);
      }
    } catch (err) {
      msgErro.textContent = "Erro na requisição de exclusão.";
      msgErro.classList.remove('hidden');
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Excluir Minha Conta';
    }
  };
}

// RENDERIZAÇÃO DO PAINEL DE CONFIGURAÇÕES
async function abrirConfiguracoes() {
  let container = document.getElementById('configuracoes-view');

  if (!container) {
    container = document.createElement('div');
    container.id = 'configuracoes-view';
    container.className = 'config-container';
    document.body.appendChild(container);
  }

  const usuario = obterUsuarioLogadoLocal();
  if (!usuario) {
    mostrarToastConfig("Sessão inválida. Faça login novamente.", "erro");
    return;
  }

  // Sincroniza estado da conta ativa no array salvo localmente
  atualizarContaNaListaSalva(usuario);

  const contasSalvas = obterContasSalvasLocal();
  const username = sanitizarConfig(usuario.username || 'usuario');
  const emailAtual = sanitizarConfig(usuario.email || '');

  const eCriador = Boolean(usuario.is_creator || usuario.is_criador);
  const eStaff = usuario.role === 'mod' || usuario.role === 'admin' || Boolean(usuario.is_admin) || Boolean(usuario.is_mod);

  // Renderização da lista de alternância rápida de conta
  let htmlContas = '';
  if (contasSalvas.length > 0) {
    contasSalvas.forEach(c => {
      const eAtual = c.username === usuario.username;
      const avatar = c.avatar_url || `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(c.username)}`;
      
      htmlContas += `
        <div class="config-account-card ${eAtual ? 'active' : ''}">
          <div class="config-account-left" onclick="${!eAtual ? `trocarParaOutraConta('${sanitizarConfig(c.username)}')` : ''}">
            <img src="${avatar}" alt="${c.username}" class="config-account-avatar" onerror="this.src='https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(c.username)}'">
            <div class="config-account-info">
              <span class="config-account-name">@${sanitizarConfig(c.username)}</span>
              <span class="config-account-status">${eAtual ? 'Sessão Ativa' : 'Alternar sem pedir senha'}</span>
            </div>
          </div>
          <div class="config-account-right">
            ${eAtual ? '<i class="fa-solid fa-circle-check config-account-check" title="Conta Atual"></i>' : `
              <button class="btn-config-mini-swap" onclick="trocarParaOutraConta('${sanitizarConfig(c.username)}')" title="Alternar">
                <i class="fa-solid fa-arrow-right-to-bracket"></i>
              </button>
              <button class="btn-config-mini-remove" onclick="removerContaListaSalva('${sanitizarConfig(c.username)}')" title="Remover da Lista">
                <i class="fa-solid fa-xmark"></i>
              </button>
            `}
          </div>
        </div>
      `;
    });
  } else {
    htmlContas = `<div class="config-empty-msg">Nenhuma outra conta salva localmente.</div>`;
  }

  container.innerHTML = `
    <!-- Topo / Título Principal (Sem Botão de Fechar) -->
    <div class="config-header-top">
      <div class="config-header-title">
        <i class="fa-solid fa-gear"></i>
        <span>Configurações</span>
      </div>
    </div>

    <!-- Seção: Painéis Dev e Servidor (Compacto) -->
    ${(eCriador || eStaff) ? `
      <div class="config-section staff-section-small">
        <div class="config-section-title gold">
          <i class="fa-solid fa-shield-halved"></i> Moderação & Sistema
        </div>
        <div class="config-staff-row-small">
          ${eCriador ? `
            <a href="servidor.html" class="btn-staff-mini server">
              <i class="fa-solid fa-server"></i> Servidor
            </a>
          ` : ''}
          <a href="dev.html" class="btn-staff-mini dev">
            <i class="fa-solid fa-code"></i> Painel Dev
          </a>
        </div>
      </div>
    ` : ''}

    <!-- Seção: E-mail de Recuperação -->
    <div class="config-section">
      <div class="config-section-title">
        <i class="fa-solid fa-envelope"></i> E-mail de Recuperação
      </div>
      <div class="config-form-box">
        <div class="config-input-row">
          <input type="email" id="config-email-input" value="${emailAtual}" placeholder="seuemail@exemplo.com">
          <button class="btn-config-save-inline" onclick="salvarEmailConta()">
            <i class="fa-solid fa-floppy-disk"></i> Salvar
          </button>
        </div>
        <div class="config-email-badge">
          <i class="fa-solid fa-shield-cat"></i> Utilizado para recuperar acesso e validar exclusão.
        </div>
      </div>
    </div>

    <!-- Seção: Alteração de Senha -->
    <div class="config-section">
      <div class="config-section-title">
        <i class="fa-solid fa-key"></i> Alterar Senha
      </div>
      <div class="config-form-box">
        <div class="config-form-group">
          <label>Senha Atual:</label>
          <input type="password" id="config-senha-atual" placeholder="••••••••">
        </div>
        <div class="config-form-group">
          <label>Nova Senha:</label>
          <input type="password" id="config-senha-nova" placeholder="Nova senha...">
        </div>
        <div class="config-form-group">
          <label>Confirmar Nova Senha:</label>
          <input type="password" id="config-senha-confirmar" placeholder="Repita a nova senha...">
        </div>
        <button class="btn-config-action primary" onclick="alterarSenhaConta()">
          <i class="fa-solid fa-lock"></i> Atualizar Senha
        </button>
      </div>
    </div>

    <!-- Seção: Gerenciamento de Cache -->
    <div class="config-section">
      <div class="config-section-title">
        <i class="fa-solid fa-database"></i> Armazenamento & Cache Local
      </div>
      <p class="config-section-desc">Limpe dados temporários do aplicativo sem perder seu login atual.</p>
      <button class="btn-config-action secondary" onclick="limparCacheAplicativo()">
        <i class="fa-solid fa-broom"></i> Limpar Cache Local
      </button>
    </div>

    <!-- Seção: Alternar de Conta -->
    <div class="config-section">
      <div class="config-section-title">
        <i class="fa-solid fa-users-gear"></i> Trocar de Conta
      </div>
      <div class="config-accounts-list">
        ${htmlContas}
      </div>
    </div>

    <!-- Seção: Encerramento de Sessão -->
    <div class="config-section">
      <div class="config-section-title">
        <i class="fa-solid fa-right-from-bracket"></i> Sair do Aplicativo
      </div>
      <button class="btn-config-action secondary" onclick="confirmarSairSessao()">
        <i class="fa-solid fa-power-off"></i> Sair da Conta (@${username})
      </button>
    </div>

    <!-- Seção: Exclusão Permanente -->
    <div class="config-section danger-zone">
      <div class="config-section-title danger">
        <i class="fa-solid fa-user-xmark"></i> Zona de Perigo
      </div>
      <button class="btn-config-action danger" onclick="abrirModalExclusaoConta()">
        <i class="fa-solid fa-trash-can"></i> Excluir Minha Conta Permanentemente
      </button>
    </div>
  `;

  container.style.display = 'block';
  container.classList.remove('hidden');
}

function fecharConfiguracoesSilencioso() {
  const container = document.getElementById('configuracoes-view');
  if (container) {
    container.style.display = 'none';
    container.classList.add('hidden');
  }
}

// TROCAR DE CONTA INSTANTANEAMENTE
function trocarParaOutraConta(targetUsername) {
  const contasSalvas = obterContasSalvasLocal();
  const contaAlvo = contasSalvas.find(c => c.username === targetUsername);

  if (contaAlvo) {
    mostrarToastConfig(`Alternando para @${targetUsername}...`, 'sucesso', 1500);

    const usuarioAtual = obterUsuarioLogadoLocal();
    if (usuarioAtual) {
      atualizarContaNaListaSalva(usuarioAtual);
    }

    localStorage.setItem('usuario_logado', JSON.stringify(contaAlvo));
    localStorage.setItem('usuario', JSON.stringify(contaAlvo));
    localStorage.setItem('user', JSON.stringify(contaAlvo));

    setTimeout(() => {
      location.reload();
    }, 600);
  }
}

function removerContaListaSalva(targetUsername) {
  let contasSalvas = obterContasSalvasLocal();
  contasSalvas = contasSalvas.filter(c => c.username !== targetUsername);
  salvarContasSalvasLocal(contasSalvas);
  mostrarToastConfig(`Conta @${targetUsername} removida.`, 'info');
  abrirConfiguracoes();
}

// ADICIONAR OU ATUALIZAR E-MAIL
async function salvarEmailConta() {
  const emailInput = document.getElementById('config-email-input')?.value.trim();
  const usuario = obterUsuarioLogadoLocal();
  const sb = obterSupabaseConfig();

  if (!usuario || !usuario.id) return;

  if (!emailInput || !emailInput.includes('@')) {
    mostrarToastConfig("Informe um e-mail válido.", "erro");
    return;
  }

  if (sb) {
    const { error } = await sb
      .from('usuarios')
      .update({ email: emailInput })
      .eq('id', usuario.id);

    if (error) {
      mostrarToastConfig("Erro ao salvar e-mail: " + error.message, "erro");
      return;
    }
  }

  usuario.email = emailInput;
  localStorage.setItem('usuario_logado', JSON.stringify(usuario));
  atualizarContaNaListaSalva(usuario);
  mostrarToastConfig("E-mail atualizado com sucesso!", "sucesso");
}

// ALTERAR SENHA DA CONTA
async function alterarSenhaConta() {
  const atual = document.getElementById('config-senha-atual')?.value;
  const nova = document.getElementById('config-senha-nova')?.value;
  const confirmar = document.getElementById('config-senha-confirmar')?.value;

  const usuario = obterUsuarioLogadoLocal();
  const sb = obterSupabaseConfig();

  if (!atual || !nova || !confirmar) {
    mostrarToastConfig("Preencha todos os campos de senha.", "erro");
    return;
  }

  if (nova.length < 4) {
    mostrarToastConfig("A nova senha deve ter no mínimo 4 caracteres.", "erro");
    return;
  }

  if (nova !== confirmar) {
    mostrarToastConfig("A nova senha e a confirmação não coincidem.", "erro");
    return;
  }

  if (!sb) {
    mostrarToastConfig("Conexão indisponível com o servidor.", "erro");
    return;
  }

  const { data: usuarioValido, error: errVal } = await sb
    .from('usuarios')
    .select('id, senha')
    .eq('id', usuario.id)
    .eq('senha', atual)
    .maybeSingle();

  if (errVal || !usuarioValido) {
    mostrarToastConfig("Senha atual incorreta.", "erro");
    return;
  }

  const { error: errUpdate } = await sb
    .from('usuarios')
    .update({ senha: nova })
    .eq('id', usuario.id);

  if (errUpdate) {
    mostrarToastConfig("Erro ao alterar senha: " + errUpdate.message, "erro");
  } else {
    usuario.senha = nova;
    localStorage.setItem('usuario_logado', JSON.stringify(usuario));
    atualizarContaNaListaSalva(usuario);
    mostrarToastConfig("Senha alterada com sucesso!", "sucesso");

    document.getElementById('config-senha-atual').value = '';
    document.getElementById('config-senha-nova').value = '';
    document.getElementById('config-senha-confirmar').value = '';
  }
}

// GERENCIAMENTO DE CACHE LOCAL
function limparCacheAplicativo() {
  try {
    const usuarioLogado = localStorage.getItem('usuario_logado');
    const usuario = localStorage.getItem('usuario');
    const user = localStorage.getItem('user');
    const contasSalvas = localStorage.getItem('contas_salvas_lista');

    // Limpa sessionStorage
    sessionStorage.clear();

    // Preserva apenas sessões ativas no localStorage
    localStorage.clear();
    if (usuarioLogado) localStorage.setItem('usuario_logado', usuarioLogado);
    if (usuario) localStorage.setItem('usuario', usuario);
    if (user) localStorage.setItem('user', user);
    if (contasSalvas) localStorage.setItem('contas_salvas_lista', contasSalvas);

    mostrarToastConfig("Cache local limpo com sucesso!", "sucesso");
  } catch (e) {
    mostrarToastConfig("Falha ao limpar cache.", "erro");
  }
}

// SAIR DA SESSÃO
function confirmarSairSessao() {
  if (typeof window.sair === 'function') {
    window.sair();
  } else {
    localStorage.removeItem('usuario_logado');
    localStorage.removeItem('usuario');
    localStorage.removeItem('user');
    location.reload();
  }
}

// Exportações Globais
window.abrirConfiguracoes = abrirConfiguracoes;
window.fecharConfiguracoes = fecharConfiguracoesSilencioso;
window.trocarParaOutraConta = trocarParaOutraConta;
window.removerContaListaSalva = removerContaListaSalva;
window.salvarEmailConta = salvarEmailConta;
window.alterarSenhaConta = alterarSenhaConta;
window.limparCacheAplicativo = limparCacheAplicativo;
window.confirmarSairSessao = confirmarSairSessao;
window.abrirModalExclusaoConta = abrirModalExclusaoConta;
