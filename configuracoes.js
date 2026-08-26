// ==========================================================================
// MÓDULO DE CONFIGURAÇÕES & GERENCIAMENTO DE CONTAS (configuracoes.js)
// Project Z Enhanced v4.0
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

// Mensagem Toast Elegante Interna do Painel
function mostrarToastConfig(mensagem, tipo = 'info', tempo = 3000) {
  const antigo = document.getElementById('config-toast-msg');
  if (antigo) antigo.remove();

  const toast = document.createElement('div');
  toast.id = 'config-toast-msg';
  toast.className = `config-toast config-toast-${tipo}`;
  toast.innerHTML = `<span>${mensagem}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast && document.body.contains(toast)) {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }
  }, tempo);
}

// Modal de Confirmação e Validação Nativa
function abrirModalConfirmacaoConfig({ titulo, subtitulo, campoSenha = false, textoBotao = 'Confirmar', acaoConfirmar }) {
  const modalAntigo = document.getElementById('config-modal-confirm');
  if (modalAntigo) modalAntigo.remove();

  const modal = document.createElement('div');
  modal.id = 'config-modal-confirm';
  modal.className = 'config-modal-overlay';

  modal.innerHTML = `
    <div class="config-modal-card">
      <div class="config-modal-header">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>${sanitizarConfig(titulo)}</span>
      </div>
      <p class="config-modal-desc">${sanitizarConfig(subtitulo)}</p>

      ${campoSenha ? `
        <div class="config-modal-input-group">
          <label>Confirme sua Senha Atual:</label>
          <input type="password" id="config-modal-senha-input" placeholder="Sua senha..." autocomplete="current-password">
        </div>
        <div class="config-modal-input-group">
          <label>Digite "DELETAR" para confirmar:</label>
          <input type="text" id="config-modal-deletar-input" placeholder="DELETAR">
        </div>
      ` : ''}

      <div id="config-modal-error" class="config-modal-error hidden"></div>

      <div class="config-modal-actions">
        <button class="btn-config-modal sec" id="btn-config-modal-cancelar">Cancelar</button>
        <button class="btn-config-modal danger" id="btn-config-modal-confirmar">${sanitizarConfig(textoBotao)}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('btn-config-modal-cancelar').onclick = () => modal.remove();

  document.getElementById('btn-config-modal-confirmar').onclick = async () => {
    const btnConfirmar = document.getElementById('btn-config-modal-confirmar');
    const msgErro = document.getElementById('config-modal-error');
    
    if (campoSenha) {
      const senhaInp = document.getElementById('config-modal-senha-input')?.value;
      const deletarInp = document.getElementById('config-modal-deletar-input')?.value.trim();

      if (!senhaInp) {
        msgErro.textContent = "Digite sua senha para prosseguir.";
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

      await acaoConfirmar(senhaInp, modal, msgErro, btnConfirmar);
    } else {
      await acaoConfirmar(modal);
    }
  };
}

// RENDERIZAÇÃO DO PAINEL DE CONFIGURAÇÕES
function abrirConfiguracoes() {
  let container = document.getElementById('configuracoes-view');

  if (!container) {
    container = document.createElement('div');
    container.id = 'configuracoes-view';
    container.className = 'config-container';
    document.body.appendChild(container);
  }

  const usuario = obterUsuarioLogadoLocal();
  const contasSalvas = obterContasSalvasLocal();
  const username = sanitizarConfig(usuario.username || 'usuario');
  const displayName = sanitizarConfig(usuario.display_name || usuario.nome || username);

  let htmlContas = '';
  if (contasSalvas.length > 0) {
    contasSalvas.forEach(c => {
      const eAtual = c.username === usuario.username;
      const avatar = c.avatar_url || `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(c.username)}`;
      
      htmlContas += `
        <div class="config-account-card ${eAtual ? 'active' : ''}" onclick="${!eAtual ? `trocarParaOutraConta('${sanitizarConfig(c.username)}')` : ''}">
          <img src="${avatar}" alt="${c.username}" class="config-account-avatar" onerror="this.src='https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(c.username)}'">
          <div class="config-account-info">
            <span class="config-account-name">@${sanitizarConfig(c.username)}</span>
            <span class="config-account-status">${eAtual ? 'Sessão Ativa' : 'Clique para alternar'}</span>
          </div>
          ${eAtual ? '<i class="fa-solid fa-circle-check config-account-check"></i>' : '<i class="fa-solid fa-arrow-right-to-bracket config-account-swap"></i>'}
        </div>
      `;
    });
  } else {
    htmlContas = `<div class="config-empty-msg">Nenhuma outra conta salva localmente.</div>`;
  }

  container.innerHTML = `
    <!-- Topo / Título Principal -->
    <div class="config-header-top">
      <div class="config-header-title">
        <i class="fa-solid fa-gear"></i>
        <span>Gerenciamento da Conta</span>
      </div>
    </div>

    <!-- Seção 1: Contas Salvas e Alternância -->
    <div class="config-section">
      <div class="config-section-title">
        <i class="fa-solid fa-users-gear"></i> Alternar de Conta
      </div>
      <div class="config-accounts-list">
        ${htmlContas}
      </div>
    </div>

    <!-- Seção 2: Ações de Sessão e Conta -->
    <div class="config-section">
      <div class="config-section-title">
        <i class="fa-solid fa-shield-halved"></i> Sessão Atual (@${username})
      </div>
      <div class="config-current-user-box">
        <div class="config-user-row">
          <span class="label">Usuário:</span>
          <span class="value">${displayName} (@${username})</span>
        </div>
      </div>

      <button class="btn-config-action secondary" onclick="confirmarSairSessao()">
        <i class="fa-solid fa-right-from-bracket"></i> Sair da Conta
      </button>

      <button class="btn-config-action danger" onclick="confirmarExcluirConta()">
        <i class="fa-solid fa-user-xmark"></i> Excluir Minha Conta Permantentemente
      </button>
    </div>
  `;

  container.style.display = 'block';
  container.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fecharConfiguracoes() {
  const container = document.getElementById('configuracoes-view');
  if (container) {
    container.style.display = 'none';
    container.classList.add('hidden');
  }
}

// Trocar de Conta Diretamente
function trocarParaOutraConta(targetUsername) {
  const contasSalvas = obterContasSalvasLocal();
  const contaAlvo = contasSalvas.find(c => c.username === targetUsername);

  if (contaAlvo) {
    mostrarToastConfig(`Alternando para @${targetUsername}...`, 'sucesso', 1500);
    
    setTimeout(() => {
      if (typeof window.selecionarContaSalva === 'function') {
        window.selecionarContaSalva(targetUsername);
      }
      if (typeof window.sair === 'function') {
        window.sair();
      } else {
        localStorage.removeItem('usuario_logado');
        location.reload();
      }
    }, 1000);
  }
}

// Sair da Sessão
function confirmarSairSessao() {
  abrirModalConfirmacaoConfig({
    titulo: 'Encerrar Sessão',
    subtitulo: 'Deseja realmente sair da sua conta atual?',
    textoBotao: 'Sair da Conta',
    acaoConfirmar: (modal) => {
      modal.remove();
      if (typeof window.sair === 'function') {
        window.sair();
      } else {
        localStorage.removeItem('usuario_logado');
        location.reload();
      }
    }
  });
}

// Exclusão Permanente da Conta
function confirmarExcluirConta() {
  const usuario = obterUsuarioLogadoLocal();
  if (!usuario || !usuario.id) return;

  abrirModalConfirmacaoConfig({
    titulo: 'EXCLUIR CONTA DEFINITIVAMENTE',
    subtitulo: 'Esta ação é irreversível. Todos os seus dados, mensagens e perfil serão apagados permanentemente.',
    campoSenha: true,
    textoBotao: 'Excluir Definitivamente',
    acaoConfirmar: async (senhaDigitada, modal, msgErro, btnConfirmar) => {
      const sb = window.supabaseClient || window.supabase || window.sb;

      if (!sb) {
        msgErro.textContent = "Conexão indisponível. Tente novamente mais tarde.";
        msgErro.classList.remove('hidden');
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = 'Excluir Definitivamente';
        return;
      }

      try {
        // Valida a senha do usuário
        const { data: validacao, error: errVal } = await sb
          .from('usuarios')
          .select('id, senha')
          .eq('id', usuario.id)
          .eq('senha', senhaDigitada)
          .maybeSingle();

        if (errVal || !validacao) {
          msgErro.textContent = "Senha incorreta. A exclusão foi cancelada.";
          msgErro.classList.remove('hidden');
          btnConfirmar.disabled = false;
          btnConfirmar.innerHTML = 'Excluir Definitivamente';
          return;
        }

        // Executa exclusão na tabela usuarios do Supabase
        const { error: errDel } = await sb
          .from('usuarios')
          .delete()
          .eq('id', usuario.id);

        if (errDel) {
          msgErro.textContent = "Erro ao apagar dados: " + errDel.message;
          msgErro.classList.remove('hidden');
          btnConfirmar.disabled = false;
          btnConfirmar.innerHTML = 'Excluir Definitivamente';
        } else {
          modal.remove();
          mostrarToastConfig('Sua conta foi excluída com sucesso.', 'sucesso', 3000);
          
          setTimeout(() => {
            if (typeof window.removerContaSalva === 'function') {
              window.removerContaSalva(usuario.username);
            }
            if (typeof window.sair === 'function') {
              window.sair();
            } else {
              localStorage.clear();
              location.reload();
            }
          }, 1500);
        }
      } catch (err) {
        msgErro.textContent = "Erro inesperado ao processar exclusão.";
        msgErro.classList.remove('hidden');
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = 'Excluir Definitivamente';
      }
    }
  });
}

// Exportações Globais
window.abrirConfiguracoes = abrirConfiguracoes;
window.fecharConfiguracoes = fecharConfiguracoes;
window.trocarParaOutraConta = trocarParaOutraConta;
window.confirmarSairSessao = confirmarSairSessao;
window.confirmarExcluirConta = confirmarExcluirConta;
