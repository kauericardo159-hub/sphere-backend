// ==========================================================================
// MÓDULO DE CONFIGURAÇÕES & GERENCIAMENTO DE CONTAS (configuracoes.js)
// Sphere Pro v5.2 - Structured Layout, Cache Control & Account Switching
// ==========================================================================

(function (global) {
  'use strict';

  function sanitizarConfig(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function obterSupabaseConfig() {
    return global.supabaseClient || global.supabase || global.sb || null;
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

  // GERENCIAMENTO AVANÇADO DE CACHE
  async function limparCacheAplicativo() {
    try {
      const usuarioLogado = localStorage.getItem('usuario_logado');
      const usuario = localStorage.getItem('usuario');
      const user = localStorage.getItem('user');
      const contasSalvas = localStorage.getItem('contas_salvas_lista');

      sessionStorage.clear();

      // Limpa os caches de recursos estáticos e Service Workers
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      localStorage.clear();

      if (usuarioLogado) localStorage.setItem('usuario_logado', usuarioLogado);
      if (usuario) localStorage.setItem('usuario', usuario);
      if (user) localStorage.setItem('user', user);
      if (contasSalvas) localStorage.setItem('contas_salvas_lista', contasSalvas);

      mostrarToastConfig("Cache local e arquivos temporários limpos!", "sucesso");
    } catch (e) {
      mostrarToastConfig("Falha ao limpar cache completo.", "erro");
    }
  }

  // DESATIVAR CONTA (Temporário)
  async function desativarConta() {
    if (!confirm("Sua conta será desativada temporariamente e seu perfil ficará oculto. Deseja continuar?")) return;
    const usuario = obterUsuarioLogadoLocal();
    const sb = obterSupabaseConfig();
    if (!usuario || !sb) return;

    const { error } = await sb.from('usuarios').update({ status_conta: 'desativada' }).eq('id', usuario.id);
    if (error) {
      mostrarToastConfig("Erro ao desativar conta: " + error.message, "erro");
    } else {
      mostrarToastConfig("Sua conta foi desativada.", "sucesso");
      setTimeout(() => confirmarSairSessao(), 1500);
    }
  }

  // EXCLUSÃO DEFINITIVA COM RE-AUTENTICAÇÃO
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
        <p class="config-modal-desc">Esta ação apaga permanentemente seus dados do Sphere. Informe sua senha para prosseguir.</p>

        <div class="config-modal-input-group">
          <label>Senha Atual:</label>
          <input type="password" id="config-modal-senha-input" placeholder="Sua senha...">
        </div>

        ${emailAtual ? `
          <div class="config-modal-input-group">
            <label>E-mail registrado (${sanitizarConfig(emailAtual)}):</label>
            <input type="email" id="config-modal-email-input" placeholder="Digite seu e-mail">
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
      const btn = document.getElementById('btn-config-modal-confirmar');
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

      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Excluindo...`;

      const sb = obterSupabaseConfig();
      if (!sb) return;

      try {
        const { data: validacao } = await sb.from('usuarios').select('id, senha').eq('id', usuario.id).eq('senha', senhaInp).maybeSingle();

        if (!validacao) {
          msgErro.textContent = "Senha incorreta. Exclusão cancelada.";
          msgErro.classList.remove('hidden');
          btn.disabled = false;
          btn.textContent = 'Excluir Minha Conta';
          return;
        }

        await sb.from('usuarios').delete().eq('id', usuario.id);

        modal.remove();
        mostrarToastConfig('Sua conta foi excluída permanentemente.', 'sucesso', 3000);
        
        setTimeout(() => {
          removerContaListaSalva(usuario.username);
          localStorage.clear();
          location.reload();
        }, 1200);

      } catch (err) {
        msgErro.textContent = "Erro ao processar exclusão.";
        msgErro.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Excluir Minha Conta';
      }
    };
  }

  // RENDERIZAÇÃO DA TELA DE CONFIGURAÇÕES
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

    // Verifica se houve alteração de username ou requisição de re-login por troca de senha
    const sb = obterSupabaseConfig();
    if (sb) {
      const { data: dbUser } = await sb.from('usuarios').select('username, requer_relog, email').eq('id', usuario.id).maybeSingle();
      if (dbUser) {
        if (dbUser.requer_relog || (dbUser.username && dbUser.username !== usuario.username)) {
          mostrarToastConfig("Seus dados de acesso mudaram. Faça login novamente.", "info", 4000);
          await sb.from('usuarios').update({ requer_relog: false }).eq('id', usuario.id);
          confirmarSairSessao();
          return;
        }
      }
    }

    atualizarContaNaListaSalva(usuario);

    const contasSalvas = obterContasSalvasLocal();
    const username = sanitizarConfig(usuario.username || 'usuario');
    const emailAtual = usuario.email || '';
    const emailMascarado = global.mascararEmail ? global.mascararEmail(emailAtual) : emailAtual;

    const eCriador = Boolean(usuario.is_creator || usuario.is_criador);
    const eStaff = usuario.role === 'mod' || usuario.role === 'admin' || Boolean(usuario.is_admin) || Boolean(usuario.is_mod);

    // Cards de Troca de Conta (Avatar | @username)
    let htmlContas = '';
    if (contasSalvas.length > 0) {
      contasSalvas.forEach(c => {
        const eAtual = c.username === usuario.username;
        const avatar = c.avatar_url || `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(c.username)}`;
        
        htmlContas += `
          <div class="config-account-card ${eAtual ? 'active' : ''}">
            <div class="config-account-left" onclick="${!eAtual ? `window.trocarParaOutraConta('${sanitizarConfig(c.username)}')` : ''}">
              <img src="${avatar}" alt="${c.username}" class="config-account-avatar" onerror="this.src='https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(c.username)}'">
              <div class="config-account-info">
                <span class="config-account-name">@${sanitizarConfig(c.username)}</span>
                <span class="config-account-status">${eAtual ? 'Sessão Ativa' : 'Alternar sem pedir senha'}</span>
              </div>
            </div>
            <div class="config-account-right">
              ${eAtual ? '<i class="fa-solid fa-circle-check config-account-check" title="Conta Atual"></i>' : `
                <button class="btn-config-mini-swap" onclick="window.trocarParaOutraConta('${sanitizarConfig(c.username)}')" title="Alternar">
                  <i class="fa-solid fa-arrow-right-to-bracket"></i>
                </button>
                <button class="btn-config-mini-remove" onclick="window.removerContaListaSalva('${sanitizarConfig(c.username)}')" title="Remover da Lista">
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

    const htmlNotificacoes = global.renderizarSecaoNotificacoes ? global.renderizarSecaoNotificacoes() : '';

    container.innerHTML = `
      <div class="config-header-top">
        <div class="config-header-title">
          <i class="fa-solid fa-gear"></i>
          <span>Configurações</span>
        </div>
      </div>

      <!-- Seção: Moderação de Devs e Servidor -->
      ${(eCriador || eStaff) ? `
        <div class="config-section staff-section-small">
          <div class="config-section-title gold">
            <i class="fa-solid fa-shield-halved"></i> Moderação de Devs e Servidor
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

      <!-- Seção: E-mail com Mascaramento -->
      <div class="config-section">
        <div class="config-section-title">
          <i class="fa-solid fa-envelope"></i> Gerenciamento de E-mail
        </div>
        <div class="config-form-box">
          <div class="config-email-view-box">
            <span id="config-email-display-text" data-revelado="false" data-email-real="${sanitizarConfig(emailAtual)}">${emailMascarado}</span>
            <button class="btn-eye-toggle" onclick="window.alternarVisibilidadeEmail()" title="Exibir/Ocultar E-mail">
              <i class="fa-solid fa-eye" id="btn-toggle-email-eye"></i>
            </button>
          </div>

          <div class="config-input-row" style="margin-top: 12px;">
            <input type="email" id="config-novo-email-input" placeholder="Digite o novo e-mail...">
            <button class="btn-config-save-inline" onclick="window.solicitarTrocaEmail()">
              <i class="fa-solid fa-floppy-disk"></i> Alterar E-mail
            </button>
          </div>
          <small class="config-help-txt">Ao trocar ou adicionar, um e-mail de confirmação é enviado para o seu endereço principal.</small>
        </div>
      </div>

      <!-- Seção: Senha -->
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

          <div class="config-btn-row">
            <button class="btn-config-action secondary" onclick="window.cancelarAlteracaoSenha()">Cancelar</button>
            <button class="btn-config-action primary" onclick="window.alterarSenha()">Confirmar</button>
          </div>

          <div class="config-forgot-link">
            <a href="javascript:void(0)" onclick="window.solicitarRecuperacaoSenha()">Esqueceu a sua senha?</a>
          </div>
        </div>
      </div>

      <!-- Seção: Notificações -->
      ${htmlNotificacoes}

      <!-- Seção: Limpar Cache -->
      <div class="config-section">
        <div class="config-section-title">
          <i class="fa-solid fa-database"></i> Armazenamento & Cache
        </div>
        <p class="config-section-desc">Limpe arquivos temporários, Service Workers e imagens salvas no navegador.</p>
        <button class="btn-config-action secondary" onclick="window.limparCacheAplicativo()">
          <i class="fa-solid fa-broom"></i> Limpar Cache
        </button>
      </div>

      <!-- Seção: Trocar de Conta -->
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
          <i class="fa-solid fa-right-from-bracket"></i> Sair da Conta
        </div>
        <button class="btn-config-action secondary" onclick="window.confirmarSairSessao()">
          <i class="fa-solid fa-power-off"></i> Sair (@${username})
        </button>
      </div>

      <!-- Seção: Desativar / Excluir Conta -->
      <div class="config-section danger-zone">
        <div class="config-section-title danger">
          <i class="fa-solid fa-user-xmark"></i> Gestão da Conta
        </div>
        <div class="config-btn-row">
          <button class="btn-config-action secondary" onclick="window.desativarConta()">
            <i class="fa-solid fa-user-slash"></i> Desativar a conta
          </button>
          <button class="btn-config-action danger" onclick="window.abrirModalExclusaoConta()">
            <i class="fa-solid fa-trash-can"></i> Excluir a conta
          </button>
        </div>
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

      setTimeout(() => location.reload(), 600);
    }
  }

  function removerContaListaSalva(targetUsername) {
    let contasSalvas = obterContasSalvasLocal();
    contasSalvas = contasSalvas.filter(c => c.username !== targetUsername);
    salvarContasSalvasLocal(contasSalvas);
    mostrarToastConfig(`Conta @${targetUsername} removida.`, 'info');
    abrirConfiguracoes();
  }

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
  global.abrirConfiguracoes = abrirConfiguracoes;
  global.fecharConfiguracoes = fecharConfiguracoesSilencioso;
  global.trocarParaOutraConta = trocarParaOutraConta;
  global.removerContaListaSalva = removerContaListaSalva;
  global.limparCacheAplicativo = limparCacheAplicativo;
  global.confirmarSairSessao = confirmarSairSessao;
  global.abrirModalExclusaoConta = abrirModalExclusaoConta;
  global.desativarConta = desativarConta;
  global.mostrarToastConfig = mostrarToastConfig;

})(typeof window !== 'undefined' ? window : this);
