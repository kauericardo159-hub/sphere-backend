// ==========================================================================
// CHAT COMPONENTS MODULE (components-chat.js) - ESTRUTURA E CABEÇALHO
// Project Z v5.0 | Layout Orchestrator, Dynamic Header & Mobile Responsive
// ==========================================================================

// Injeção Dinâmica do CSS Estrutural do Componente
(function injetarCssComponentsChat() {
  if (document.getElementById('components-chat-css')) return;
  const style = document.createElement('style');
  style.id = 'components-chat-css';
  style.textContent = `
    .chat-sidebar-header {
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 45, 85, 0.12);
      background: var(--chat-header-bg, rgba(22, 13, 25, 0.95));
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
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      padding: 7px 12px;
      color: #ffffff;
      font-size: 0.82rem;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }

    .chat-search-input:focus {
      border-color: var(--chat-accent, #ff2d55);
    }

    .chat-search-input::placeholder {
      color: var(--chat-text-muted, #b3a5b8);
    }

    /* Ajustes dos Botões de Ação do Cabeçalho do Chat */
    .chat-header-actions-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-header-action-icon {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #d1c4d6;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.88rem;
      transition: all 0.2s ease;
      padding: 0;
    }

    .btn-header-action-icon:hover {
      background: var(--chat-accent, #ff2d55);
      color: #ffffff;
      border-color: var(--chat-accent, #ff2d55);
      transform: scale(1.05);
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
      <!-- Top Header Bar -->
      <div class="chat-window-header" id="chat-window-header">
        <div class="chat-target-info" onclick="if(typeof window.cliqueHeaderTarget === 'function') window.cliqueHeaderTarget()">
          <button class="btn-toggle-sidebar" onclick="event.stopPropagation(); if(typeof window.alternarSidebarChat === 'function') window.alternarSidebarChat(true)">
            <i class="fa-solid fa-bars"></i>
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
              <span id="chat-target-tags-row"></span>
            </div>
            <span class="chat-target-status-text" id="chat-target-status">Selecione um contato</span>
          </div>
        </div>

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

      <!-- Barra de Input (Injetada pelo barrachat.js) -->
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
  const tagsRow = document.getElementById('chat-target-tags-row');
  const actionsGroup = document.getElementById('chat-header-actions-group');

  if (!target) {
    if (titleEl) titleEl.innerText = 'Selecione uma conversa';
    if (statusEl) statusEl.innerText = 'Selecione um contato na lista ao lado';
    if (avatarBox) avatarBox.style.display = 'none';
    if (actionsGroup) actionsGroup.style.display = 'none';
    return;
  }

  if (titleEl) titleEl.innerText = target.nome;
  if (actionsGroup) actionsGroup.style.display = 'flex';

  if (statusEl) {
    const statusMap = { online: 'Online agora', ausente: 'Ausente', dnd: 'Ocupado', offline: 'Offline' };
    statusEl.innerText = statusMap[target.status] || 'Offline';
  }

  if (verifiedBadge) {
    verifiedBadge.innerHTML = target.is_verified ? '<i class="fa-solid fa-circle-check perfil-verified-icon" title="Conta Verificada" style="color:#ff0b5d; margin-left:4px;"></i>' : '';
  }

  if (avatarBox && avatarImg) {
    avatarImg.src = target.avatar_url;
    avatarBox.style.display = 'flex';

    if (molduraImg) {
      if (target.moldura_url) {
        molduraImg.src = target.moldura_url;
        molduraImg.style.display = 'block';
      } else { 
        molduraImg.style.display = 'none'; 
      }
    }

    if (statusDot && typeof window.obterHtmlStatusDot === 'function') {
      statusDot.innerHTML = window.obterHtmlStatusDot(target.status);
    }
  }

  if (tagsRow && typeof window.obterHtmlTag === 'function') {
    tagsRow.innerHTML = window.obterHtmlTag(target);
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
