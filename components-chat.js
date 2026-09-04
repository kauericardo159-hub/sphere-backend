// ==========================================================================
// CHAT COMPONENTS MODULE (components-chat.js) - ESTRUTURA E CABEÇALHO
// Sphere v5.2 | Dynamic Header, Status Sync, Custom Recado & 32px Actions
// ==========================================================================

// Helper para sanitização rápida contra XSS
function sanitizarTextoCompChat(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Renderização de Badges Limpa (Até 2 ícones)
function renderizarBadgesLimposHeaderChat(target) {
  if (!target) return '';

  let listaBadges = [];
  if (target.verificados) {
    if (Array.isArray(target.verificados)) {
      listaBadges = [...target.verificados];
    } else if (typeof target.verificados === 'string') {
      listaBadges = target.verificados.split(/[,|]/).map(s => s.trim().toLowerCase());
    }
  }

  if ((target.is_creator || target.is_criador) && !listaBadges.includes('creator')) {
    listaBadges.unshift('creator');
  }

  if (target.is_verified && !listaBadges.includes('verified')) {
    listaBadges.push('verified');
  }

  // Trava estrita para NO MÁXIMO 2 ícones no cabeçalho
  const badgesLimitadas = listaBadges.filter(Boolean).slice(0, 2);

  if (badgesLimitadas.length === 0) return '';

  if (typeof window.obterHtmlBadgesUsuario === 'function') {
    return window.obterHtmlBadgesUsuario(badgesLimitadas);
  }

  return '';
}

// Injeção Dinâmica do CSS Estrutural do Componente
(function injetarCssComponentsChat() {
  if (document.getElementById('components-chat-css')) return;
  const style = document.createElement('style');
  style.id = 'components-chat-css';
  style.textContent = `
    .chat-sidebar-header {
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 45, 85, 0.12);
      background: var(--chat-header-bg, rgba(22, 13, 25, 0.95));
      height: 52px;
      box-sizing: border-box;
    }

    .chat-sidebar-header h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chat-sidebar-header h3 i {
      color: var(--chat-accent, #ff2d55);
    }

    .chat-sidebar-search {
      padding: 10px 14px;
      background: rgba(18, 9, 21, 0.8);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .chat-search-input {
      width: 100%;
      height: 34px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      padding: 0 12px;
      color: #ffffff;
      font-size: 0.82rem;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s ease, background 0.2s ease;
    }

    .chat-search-input:focus {
      border-color: var(--chat-accent, #ff2d55);
      background: rgba(255, 255, 255, 0.08);
    }

    .chat-search-input::placeholder {
      color: var(--chat-text-muted, #b3a5b8);
    }

    /* Botão de Voltar no Header (Estritamente 32px) */
    .btn-back-chat-header {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      width: 32px;
      height: 32px;
      min-width: 32px;
      max-width: 32px;
      min-height: 32px;
      max-height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      padding: 0;
      flex-shrink: 0;
      margin-right: 6px;
      box-sizing: border-box;
    }

    .btn-back-chat-header:hover {
      background: var(--chat-accent, #ff2d55);
      border-color: var(--chat-accent, #ff2d55);
      color: #ffffff;
      transform: scale(1.08);
      box-shadow: 0 0 10px rgba(255, 45, 85, 0.4);
    }

    /* Grupo de Botões de Ação do Cabeçalho (Estritamente 32px) */
    .chat-header-actions-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .btn-header-action-icon {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #d1c4d6;
      width: 32px;
      height: 32px;
      min-width: 32px;
      max-width: 32px;
      min-height: 32px;
      max-height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      transition: all 0.2s ease;
      padding: 0;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .btn-header-action-icon:hover {
      background: var(--chat-accent, #ff2d55);
      color: #ffffff;
      border-color: var(--chat-accent, #ff2d55);
      transform: scale(1.06);
    }

    .btn-header-action-icon.call-btn {
      background: rgba(46, 213, 115, 0.15);
      border-color: rgba(46, 213, 115, 0.3);
      color: #2ed573;
    }

    .btn-header-action-icon.call-btn:hover {
      background: #2ed573;
      color: #000000;
      border-color: #2ed573;
      box-shadow: 0 0 10px rgba(46, 213, 115, 0.4);
    }

    /* Estrutura de Informações do Usuário Alvo */
    .chat-target-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
      flex: 1;
    }

    .chat-target-name-row {
      display: flex;
      align-items: center;
      gap: 5px;
      max-width: 100%;
      overflow: hidden;
    }

    .chat-target-name {
      font-size: 0.92rem;
      font-weight: 800;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }

    /* Recado/Custom Status do Alvo com Truncamento elegante (...) */
    .chat-target-status-text {
      font-size: 0.74rem;
      color: #b3a5b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .chat-target-status-text .status-custom-pill {
      color: #e0d0e6;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    .chat-target-status-text .custom-status-emoji-header {
      font-size: 0.85rem;
      flex-shrink: 0;
      line-height: 1;
    }

    .chat-target-status-text .custom-status-txt-header {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 600px) {
      .chat-target-name {
        max-width: 130px;
      }
      .chat-target-status-text {
        max-width: 140px;
      }
    }
  `;
  document.head.appendChild(style);
})();

function montarHtmlEstruturaChat() {
  return `
    <div class="chat-sidebar-overlay" id="chat-sidebar-overlay" onclick="if(typeof window.alternarSidebarChat === 'function') window.alternarSidebarChat(false)"></div>

    <div class="chat-sidebar open" id="chat-sidebar">
      <div class="chat-sidebar-header">
        <h3><i class="fa-solid fa-comments"></i> Mensagens</h3>
        <button class="btn-header-action-icon" onclick="if(typeof window.abrirPainelNotChat === 'function') window.abrirPainelNotChat()" title="Central de Notificações">
          <i class="fa-solid fa-bell"></i>
        </button>
      </div>
      <div class="chat-sidebar-search">
        <input type="text" class="chat-search-input" placeholder="Buscar conversas..." oninput="if(typeof window.filtrarContatosChat === 'function') window.filtrarContatosChat(this.value)">
      </div>
      <div class="chat-list" id="chat-list-container"></div>
    </div>

    <div class="chat-window" id="chat-window-box">
      <!-- Top Header Bar com Botão de Voltar -->
      <div class="chat-window-header" id="chat-window-header">
        <div class="chat-target-info" onclick="if(typeof window.cliqueHeaderTarget === 'function') window.cliqueHeaderTarget()">
          
          <!-- Botão Voltar para a Lista (Estritamente 32px) -->
          <button class="btn-back-chat-header" id="btn-back-chat-nav" onclick="event.stopPropagation(); if(typeof window.voltarParaListaConversas === 'function') window.voltarParaListaConversas()" title="Voltar para a Lista">
            <i class="fa-solid fa-chevron-left"></i>
          </button>

          <div class="chat-target-avatar-wrapper" id="chat-target-avatar-container" style="display: none;">
            <img id="chat-target-avatar-img" class="chat-target-avatar" src="" alt="Avatar">
            <img id="chat-target-moldura-img" class="chat-target-moldura" src="" style="display:none;" alt="Moldura">
            <div id="chat-target-status-dot" class="chat-target-status-dot"></div>
          </div>
          <div class="chat-target-meta">
            <div class="chat-target-name-row">
              <span class="chat-target-name" id="chat-target-title">Selecione uma conversa</span>
              <span id="chat-target-verified-badge"></span>
            </div>
            <span class="chat-target-status-text" id="chat-target-status">Selecione um contato</span>
          </div>
        </div>

        <!-- Botões de Ação do Topo (Estritamente 32px) -->
        <div class="chat-header-actions-group" id="chat-header-actions-group" style="display: none;">
          <button class="btn-header-action-icon" onclick="if(typeof window.abrirHistoricoChat === 'function') window.abrirHistoricoChat(window.chatTargetAtual)" title="Histórico da Conversa">
            <i class="fa-solid fa-clock-rotate-left"></i>
          </button>
          <button class="btn-header-action-icon call-btn" onclick="if(typeof window.iniciarChamadaVozHeader === 'function') window.iniciarChamadaVozHeader()" title="Iniciar Chamada de Voz">
            <i class="fa-solid fa-phone"></i>
          </button>
          <button class="btn-header-action-icon" onclick="if(typeof window.abrirModalAjustesChat === 'function') window.abrirModalAjustesChat()" title="Ajustes">
            <i class="fa-solid fa-sliders"></i>
          </button>
        </div>
      </div>

      <!-- Feed de Mensagens -->
      <div class="chat-messages-feed" id="chat-messages-feed">
        <div class="chat-empty-selection">
          <i class="fa-solid fa-comments chat-empty-icon"></i>
          <p>Selecione uma conversa para começar a interagir.</p>
        </div>
      </div>

      <div id="chat-draft-reader-box" class="chat-draft-reader-box" style="display: none;"></div>
      <div id="chat-typing-indicator" class="chat-typing-indicator" style="display: none;"></div>
      
      <div id="chat-reply-preview-bar" class="chat-reply-preview-bar" style="display: none;"></div>
      <div id="chat-attachment-preview-box" class="chat-attachment-preview-box" style="display: none;"></div>

      <!-- Barra de Input -->
      <div class="chat-input-container" id="chat-input-container"></div>
    </div>
  `;
}

function atualizarHeaderTargetChat(target) {
  const titleEl = document.getElementById('chat-target-title');
  const statusEl = document.getElementById('chat-target-status');
  const avatarBox = document.getElementById('chat-target-avatar-container');
  const avatarImg = document.getElementById('chat-target-avatar-img');
  const molduraImg = document.getElementById('chat-target-moldura-img');
  const statusDot = document.getElementById('chat-target-status-dot');
  const verifiedBadge = document.getElementById('chat-target-verified-badge');
  const actionsGroup = document.getElementById('chat-header-actions-group');
  const btnBackNav = document.getElementById('btn-back-chat-nav');

  // Caso nenhum chat esteja selecionado -> Esconde verificados, ações e reseta o cabeçalho
  if (!target) {
    if (titleEl) titleEl.innerText = 'Selecione uma conversa';
    if (statusEl) statusEl.innerText = 'Selecione um contato na lista ao lado';
    if (avatarBox) avatarBox.style.display = 'none';
    if (actionsGroup) actionsGroup.style.display = 'none';
    if (btnBackNav) btnBackNav.style.display = 'none';
    if (verifiedBadge) verifiedBadge.innerHTML = '';
    return;
  }

  const nomeDisplay = target.display_name || target.nome || target.username || 'Usuário';

  if (btnBackNav) btnBackNav.style.display = 'inline-flex';
  if (titleEl) {
    titleEl.innerText = nomeDisplay;
    titleEl.title = nomeDisplay;
  }
  if (actionsGroup) actionsGroup.style.display = 'flex';

  // Exibição Inteligente do Status e Recado Customizado (Emoji, Texto ou Ambos)
  if (statusEl) {
    const statusMap = { online: 'Online agora', ausente: 'Ausente', dnd: 'Ocupado', offline: 'Offline' };
    const labelPadrao = statusMap[(target.status || '').toLowerCase()] || 'Offline';

    const emojiRecado = target.status_emoji ? target.status_emoji.trim() : '';
    const textoRecado = target.custom_status ? target.custom_status.trim() : '';

    if (emojiRecado || textoRecado) {
      const emojiSpan = emojiRecado ? `<span class="custom-status-emoji-header">${emojiRecado}</span>` : '';
      const textoSpan = textoRecado ? `<span class="custom-status-txt-header">${sanitizarTextoCompChat(textoRecado)}</span>` : '';
      
      statusEl.innerHTML = `<span class="status-custom-pill" title="${sanitizarTextoCompChat(textoRecado || emojiRecado)}">${emojiSpan}${textoSpan}</span>`;
    } else {
      statusEl.innerText = labelPadrao;
    }
  }

  // Injeta até 2 verificados oficiais
  if (verifiedBadge) {
    verifiedBadge.innerHTML = renderizarBadgesLimposHeaderChat(target);
  }

  if (avatarBox && avatarImg) {
    const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(target.username || 'user')}`;
    avatarImg.src = (target.avatar_url && target.avatar_url.trim() !== '') ? target.avatar_url : defaultAvatar;
    avatarBox.style.display = 'flex';

    if (molduraImg) {
      if (target.moldura_url && target.moldura_url.trim() !== '') {
        molduraImg.src = target.moldura_url;
        molduraImg.style.display = 'block';
      } else { 
        molduraImg.style.display = 'none'; 
      }
    }

    if (statusDot && typeof window.obterHtmlStatusDot === 'function') {
      statusDot.innerHTML = window.obterHtmlStatusDot(target.status || 'offline', target.id);
    }
  }
}

// Alternar visibilidade da Sidebar em telas mobile
function alternarSidebarChat(forcarExibicao) {
  const sidebar = document.getElementById('chat-sidebar');
  const overlay = document.getElementById('chat-sidebar-overlay');
  if (!sidebar) return;

  const estadoAtual = sidebar.classList.contains('open');
  const proximoEstado = typeof forcarExibicao === 'boolean' ? forcarExibicao : !estadoAtual;

  if (proximoEstado) {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
  } else {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }
}

// Exportações Globais
window.montarHtmlEstruturaChat = montarHtmlEstruturaChat;
window.atualizarHeaderTargetChat = atualizarHeaderTargetChat;
window.alternarSidebarChat = alternarSidebarChat;
