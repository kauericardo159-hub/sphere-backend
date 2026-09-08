// ==========================================================================
// CHAT COMPONENTS MODULE (components-chat.js) - SPHERE V5.2 PRO
// Dynamic Header, Verified Badges Engine, Custom Recado & Theme Sync
// ==========================================================================

(function (global) {
  'use strict';

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

  // Resolução do Usuário Logado para injeção de temas
  function obterUsuarioLogadoLocalComp() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('[ComponentsChat] Erro ao obter usuário logado:', e);
    }
    return null;
  }

  // Aplicação das Variáveis de Tema do Usuário Logado
  function aplicarCoresTemaHeaderChat() {
    const user = obterUsuarioLogadoLocalComp();
    if (!user) return;

    const corBg1 = user.cor_bg1 || user.cor_tema || '#ff2d55';
    const corBg2 = user.cor_bg2 || user.cor_tema || '#ff7675';
    const corGradient = corBg1 !== corBg2 ? `linear-gradient(135deg, ${corBg1}, ${corBg2})` : corBg1;

    document.documentElement.style.setProperty('--chat-user-bg1', corBg1);
    document.documentElement.style.setProperty('--chat-user-bg2', corBg2);
    document.documentElement.style.setProperty('--chat-user-gradient', corGradient);
    document.documentElement.style.setProperty('--chat-user-glow', `${corBg1}45`);
    document.documentElement.style.setProperty('--chat-user-border', `${corBg1}38`);
  }

  // Engine Oficial e Padronizado de Verificados (Exibe no máximo 2 selos)
  function renderizarBadgesLimposHeaderChat(target) {
    if (!target) return '';

    // 1. Tenta acionar a função global oficial de renderização de badges/verificados caso exista
    if (typeof global.obterHtmlBadgesUsuario === 'function') {
      return global.obterHtmlBadgesUsuario(target);
    }

    // 2. Parser local padronizado com restrição estrita a 2 selos
    let listaBadges = [];

    if (target.verificados) {
      if (Array.isArray(target.verificados)) {
        listaBadges = [...target.verificados];
      } else if (typeof target.verificados === 'string') {
        try {
          const parsed = JSON.parse(target.verificados);
          if (Array.isArray(parsed)) listaBadges = [...parsed];
          else listaBadges = target.verificados.split(/[,|]/).map(s => s.trim().toLowerCase());
        } catch (e) {
          listaBadges = target.verificados.split(/[,|]/).map(s => s.trim().toLowerCase());
        }
      }
    }

    if ((target.is_creator || target.is_criador) && !listaBadges.includes('creator') && !listaBadges.includes('criador')) {
      listaBadges.unshift('creator');
    }

    if (target.is_verified && !listaBadges.includes('verified') && !listaBadges.includes('verificado')) {
      listaBadges.push('verified');
    }

    // Filtra itens inválidos e limita ESTRITAMENTE a 2 selos
    const badgesLimitadas = listaBadges.filter(Boolean).slice(0, 2);
    if (badgesLimitadas.length === 0) return '';

    const corIcone = target.cor_verificados || target.cor_tema || 'var(--chat-user-bg1, #ff2d55)';

    return `<span class="chat-header-badges-container">` + badgesLimitadas.map(b => {
      const bClean = String(b).toLowerCase().trim();
      if (bClean === 'verified' || bClean === 'verificado') {
        return `<i class="fa-solid fa-circle-check verified-badge-icon" title="Verificado Oficial"></i>`;
      }
      if (bClean === 'creator' || bClean === 'criador') {
        return `<i class="fa-solid fa-crown creator-badge-icon" style="color: ${corIcone};" title="Criador de Conteúdo"></i>`;
      }
      return `<i class="fa-solid fa-shield-halved custom-badge-icon" title="${sanitizarTextoCompChat(bClean)}"></i>`;
    }).join('') + `</span>`;
  }

  function montarHtmlEstruturaChat() {
    aplicarCoresTemaHeaderChat();

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
            
            <!-- Botão Voltar para a Lista -->
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

          <!-- Botões de Ação do Topo -->
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
    aplicarCoresTemaHeaderChat();

    const titleEl = document.getElementById('chat-target-title');
    const statusEl = document.getElementById('chat-target-status');
    const avatarBox = document.getElementById('chat-target-avatar-container');
    const avatarImg = document.getElementById('chat-target-avatar-img');
    const molduraImg = document.getElementById('chat-target-moldura-img');
    const statusDot = document.getElementById('chat-target-status-dot');
    const verifiedBadge = document.getElementById('chat-target-verified-badge');
    const actionsGroup = document.getElementById('chat-header-actions-group');
    const btnBackNav = document.getElementById('btn-back-chat-nav');

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

    // Status e Recado Customizado
    if (statusEl) {
      const statusMap = { online: 'Online agora', ausente: 'Ausente', dnd: 'Ocupado', offline: 'Offline' };
      const labelPadrao = statusMap[(target.status || '').toLowerCase()] || 'Offline';

      const emojiRecado = target.status_emoji ? target.status_emoji.trim() : (target.emoji ? target.emoji.trim() : '');
      const textoRecado = target.custom_status ? target.custom_status.trim() : (target.recado ? target.recado.trim() : '');

      if (emojiRecado || textoRecado) {
        const emojiSpan = emojiRecado ? `<span class="custom-status-emoji-header">${sanitizarTextoCompChat(emojiRecado)}</span>` : '';
        const textoSpan = textoRecado ? `<span class="custom-status-txt-header">${sanitizarTextoCompChat(textoRecado)}</span>` : '';
        
        statusEl.innerHTML = `<span class="status-custom-pill" title="${sanitizarTextoCompChat(textoRecado || emojiRecado)}">${emojiSpan}${textoSpan}</span>`;
      } else {
        statusEl.innerText = labelPadrao;
      }
    }

    // Renderização dos selos (máximo 2)
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

      if (statusDot && typeof global.obterHtmlStatusDot === 'function') {
        statusDot.innerHTML = global.obterHtmlStatusDot(target.status || 'offline', target.id);
      }
    }
  }

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
  global.montarHtmlEstruturaChat = montarHtmlEstruturaChat;
  global.atualizarHeaderTargetChat = atualizarHeaderTargetChat;
  global.alternarSidebarChat = alternarSidebarChat;
  global.renderizarBadgesLimposHeaderChat = renderizarBadgesLimposHeaderChat;

})(typeof window !== 'undefined' ? window : this);
