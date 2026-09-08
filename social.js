// ==========================================================================
// MÓDULO DE REDE SOCIAL - AMIGOS / SEGUINDO / SEGUIDORES (social.js) - SPHERE v5.2 PRO
// Dynamic Connections Modal, Dynamic Theme Sync, Live Realtime CDC & Status Badges
// ==========================================================================

(function (global) {
  'use strict';

  let cacheUsuariosSocial = {};
  let usuariosAbaAtualSocial = [];
  let canalRealtimeSocial = null;
  let targetSocialAtivoId = null;
  let abaSocialAtiva = 'amigos';
  let timerDebounceBusca = null;

  // Helper para Obtenção Segura do Supabase Client
  function obterSupabaseSocial() {
    return global.supabaseClient || global.supabase || global.sb || (typeof supabase !== 'undefined' ? supabase : null);
  }

  // Obter Usuário Logado Completo via LocalStorage
  function obterUsuarioLogadoCompleto() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('[Social] Erro ao obter usuário do localStorage:', e);
    }
    return null;
  }

  // Obter ID do Usuário Logado
  function obterUsuarioLogadoId() {
    const user = obterUsuarioLogadoCompleto();
    return user && user.id !== undefined && user.id !== null ? Number(user.id) : null;
  }

  // Sanitização de Texto Contra Injeções XSS
  function sanitizarSocial(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Injeção de Estilos CSS do Módulo Social (Com Suporte a Temas de Cor e Glassmorphism)
  (function injetarEstilosSocial() {
    if (document.getElementById('social-css-v52')) return;

    const css = `
      .social-modal-container {
        position: fixed;
        inset: 0;
        background: rgba(8, 4, 10, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 16px;
        box-sizing: border-box;
        animation: fadeInSocial 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes fadeInSocial {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }

      .social-content-wrapper {
        width: 100%;
        max-width: 490px;
        height: 85vh;
        max-height: 650px;
        background: #140b18;
        border: 1px solid var(--user-theme-border, rgba(255, 45, 85, 0.3));
        border-radius: 24px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85), 0 0 35px var(--user-theme-glow, rgba(255, 45, 85, 0.18));
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;
        transition: border-color 0.3s ease, box-shadow 0.3s ease;
      }

      /* Header e Botão (X) Padronizados */
      .social-header-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px 12px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(22, 13, 25, 0.6);
      }

      .social-modal-title {
        color: #ffffff;
        font-size: 1.08rem;
        font-weight: 800;
        letter-spacing: 0.3px;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .btn-fechar-social {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #d1c4d6;
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        max-width: 32px !important;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
        padding: 0;
        flex-shrink: 0;
      }

      .btn-fechar-social:hover {
        background: var(--user-theme-color, #ff2d55);
        color: #ffffff;
        border-color: var(--user-theme-color, #ff2d55);
        transform: scale(1.08) rotate(90deg);
        box-shadow: 0 0 12px var(--user-theme-glow, rgba(255, 45, 85, 0.5));
      }

      /* Caixa de Busca no Topo */
      .social-search-box {
        padding: 12px 16px 4px 16px;
      }

      .social-search-input-wrap {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
      }

      .social-search-input-wrap i {
        position: absolute;
        left: 12px;
        color: rgba(255, 255, 255, 0.45);
        font-size: 0.85rem;
      }

      .social-search-input {
        width: 100%;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 9px 12px 9px 36px;
        color: #ffffff;
        font-size: 0.84rem;
        outline: none;
        box-sizing: border-box;
        transition: all 0.2s ease;
      }

      .social-search-input::placeholder { color: rgba(255, 255, 255, 0.35); }

      .social-search-input:focus {
        background: rgba(255, 255, 255, 0.07);
        border-color: var(--user-theme-color, #ff2d55);
        box-shadow: 0 0 12px var(--user-theme-glow, rgba(255, 45, 85, 0.25));
      }

      /* Navegação por Abas */
      .social-tabs-header {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.3);
        padding: 4px;
        margin: 8px 16px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        gap: 4px;
      }

      .btn-tab-social {
        flex: 1;
        padding: 8px 6px;
        background: transparent;
        border: none;
        border-radius: 12px;
        color: #b3a5b8;
        font-weight: 800;
        font-size: 0.78rem;
        cursor: pointer;
        transition: all 0.22s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        white-space: nowrap;
      }

      .btn-tab-social:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.05);
      }

      .btn-tab-social.active {
        color: #ffffff;
        background: var(--user-theme-gradient, linear-gradient(135deg, #ff2d55, #ff7675));
        box-shadow: 0 4px 14px var(--user-theme-glow, rgba(255, 45, 85, 0.4));
      }

      .tab-badge-count {
        background: rgba(0, 0, 0, 0.35);
        padding: 1px 7px;
        border-radius: 10px;
        font-size: 0.7rem;
        font-weight: 800;
      }

      /* Painel do Feed */
      .social-feed-container {
        padding: 8px 16px 16px 16px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        -webkit-overflow-scrolling: touch;
      }

      .social-feed-container::-webkit-scrollbar { width: 5px; }
      .social-feed-container::-webkit-scrollbar-thumb { 
        background: var(--user-theme-color, #ff2d55); 
        border-radius: 10px; 
      }

      /* Card de Usuário */
      .social-user-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.028);
        border: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        box-sizing: border-box;
      }

      .social-user-card:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: var(--user-theme-color, rgba(255, 45, 85, 0.35));
        transform: translateX(4px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
      }

      .social-avatar-wrapper {
        position: relative;
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .social-user-avatar {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        background: #0d070f;
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        display: block;
        box-sizing: border-box;
      }

      .social-user-moldura {
        position: absolute;
        top: -12%;
        left: -12%;
        width: 124%;
        height: 124%;
        pointer-events: none;
        object-fit: contain;
        z-index: 2;
      }

      .social-status-container {
        position: absolute;
        bottom: 0px;
        right: 0px;
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }

      .social-user-info {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        gap: 2px;
      }

      .social-name-row {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .social-user-name {
        font-weight: 800;
        color: #ffffff;
        font-size: 0.88rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .social-user-handle {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Grupo de Botões de Ação no Card */
      .social-card-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
        margin-left: auto;
      }

      .social-btn-action {
        background: rgba(255, 255, 255, 0.08);
        color: #d1c4d6;
        border: 1px solid rgba(255, 255, 255, 0.12);
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        max-width: 32px !important;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        font-size: 0.8rem;
        padding: 0;
        box-sizing: border-box;
      }

      .social-btn-action:hover {
        background: var(--user-theme-color, #ff2d55);
        color: #ffffff;
        border-color: var(--user-theme-color, #ff2d55);
        transform: scale(1.1);
        box-shadow: 0 0 12px var(--user-theme-glow, rgba(255, 45, 85, 0.5));
      }

      .social-btn-action.chat-btn {
        background: rgba(255, 45, 85, 0.15);
        border-color: rgba(255, 45, 85, 0.35);
        color: #ff2d55;
      }

      .social-btn-action.chat-btn:hover {
        background: var(--user-theme-color, #ff2d55);
        color: #ffffff;
      }

      .social-empty-state {
        text-align: center;
        color: #9d8ea4;
        padding: 48px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin: auto;
      }

      .social-empty-state i {
        font-size: 2.2rem;
        color: var(--user-theme-color, rgba(255, 45, 85, 0.5));
      }

      .social-empty-state span {
        font-size: 0.88rem;
        font-weight: 600;
      }

      @media (max-width: 480px) {
        .social-modal-container { padding: 12px; }
        .social-content-wrapper { height: 90vh; border-radius: 20px; }
        .btn-tab-social { font-size: 0.74rem; padding: 7px 4px; gap: 4px; }
      }
    `;

    const styleTag = document.createElement('style');
    styleTag.id = 'social-css-v52';
    styleTag.innerHTML = css;
    document.head.appendChild(styleTag);
  })();

  // Redirecionamento e Navegação de Perfil de Forma Segura
  function redirecionarParaPerfil(usuario) {
    fecharListaSocial();
    if (!usuario) return;

    if (typeof global.abrirPerfil === 'function') {
      global.abrirPerfil(usuario);
    } else if (typeof global.abrirViewPerfil === 'function') {
      global.abrirViewPerfil(usuario);
    } else if (typeof global.visualizarPerfil === 'function') {
      global.visualizarPerfil(usuario);
    } else {
      console.error('[Social] Nenhuma função de navegação de perfil foi encontrada.');
    }
  }

  // Iniciar Chat Direto Garantido com Transição Fluida e Restauração
  function iniciarChatComUsuarioSocial(usuario) {
    if (!usuario) return;
    const targetId = typeof usuario === 'object' ? Number(usuario.id) : Number(usuario);

    fecharListaSocial();

    if (typeof global.restaurarChatOcultoSeNecessario === 'function') {
      global.restaurarChatOcultoSeNecessario(targetId);
    }

    if (!document.getElementById('chat-main-container') && typeof global.abrirInterfaceChat === 'function') {
      global.abrirInterfaceChat();
    }

    if (typeof global.alternarAbaNav === 'function') {
      global.alternarAbaNav('chat');
    } else if (typeof global.mudarAba === 'function') {
      global.mudarAba('chat');
    }

    setTimeout(() => {
      if (typeof global.seleccionarConversaDirect === 'function') {
        global.seleccionarConversaDirect(usuario);
      } else if (typeof global.enviarMensagemParaUsuario === 'function') {
        global.enviarMensagemParaUsuario(usuario);
      } else if (typeof global.abrirChatComUsuario === 'function') {
        global.abrirChatComUsuario(usuario);
      } else if (typeof global.cliqueItemContato === 'function') {
        global.cliqueItemContato(targetId);
      } else {
        redirecionarParaPerfil(usuario);
      }
    }, 60);
  }

  function tratarKeydownSocial(event) {
    if (event.key === 'Escape') {
      fecharListaSocial();
    }
  }

  // Aplicação Dinâmica de Variáveis de Tema de Cores do Usuário
  function aplicarCoresTemaModalSocial(usuarioObj) {
    const cardModal = document.querySelector('.social-content-wrapper');
    if (!cardModal) return;

    const user = usuarioObj || obterUsuarioLogadoCompleto();
    const corBg1 = user?.cor_bg1 || user?.cor_tema || '#ff2d55';
    const corBg2 = user?.cor_bg2 || user?.cor_tema || '#ff7675';
    const corGradient = corBg1 !== corBg2 ? `linear-gradient(135deg, ${corBg1}, ${corBg2})` : corBg1;

    cardModal.style.setProperty('--user-theme-color', corBg1);
    cardModal.style.setProperty('--user-theme-gradient', corGradient);
    cardModal.style.setProperty('--user-theme-glow', `${corBg1}45`);
    cardModal.style.setProperty('--user-theme-border', `${corBg1}38`);
  }

  // Modal Principal de Conexões Sociais
  function abrirListaSocial(usuarioId, abaInicial = 'amigos') {
    fecharListaSocial();

    const meuId = obterUsuarioLogadoId();
    const targetId = usuarioId ? Number(usuarioId) : meuId;
    targetSocialAtivoId = targetId;

    const container = document.createElement('div');
    container.id = 'social-modal-container';
    container.className = 'social-modal-container';

    container.onclick = (e) => {
      if (e.target === container) fecharListaSocial();
    };

    container.innerHTML = `
      <div class="social-content-wrapper" onclick="event.stopPropagation()">
        <div class="social-header-top">
          <span class="social-modal-title">
            <i class="fa-solid fa-users-rectangle" style="color: var(--user-theme-color, #ff2d55);"></i> Conexões
          </span>
          <button class="btn-fechar-social" onclick="window.fecharListaSocial()" title="Fechar (ESC)">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="social-search-box">
          <div class="social-search-input-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="social-search-input" class="social-search-input" placeholder="Buscar conexões..." oninput="window.filtrarUsuariosSocial(this.value)">
          </div>
        </div>

        <div class="social-tabs-header">
          <button id="tab-social-amigos" class="btn-tab-social" onclick="window.alternarAbaSocial('${targetId}', 'amigos')">
            <i class="fa-solid fa-user-group"></i> Amigos <span class="tab-badge-count" id="count-amigos">0</span>
          </button>
          <button id="tab-social-seguindo" class="btn-tab-social" onclick="window.alternarAbaSocial('${targetId}', 'seguindo')">
            <i class="fa-solid fa-user-right-long"></i> Seguindo <span class="tab-badge-count" id="count-seguindo">0</span>
          </button>
          <button id="tab-social-seguidores" class="btn-tab-social" onclick="window.alternarAbaSocial('${targetId}', 'seguidores')">
            <i class="fa-solid fa-users"></i> Seguidores <span class="tab-badge-count" id="count-seguidores">0</span>
          </button>
        </div>

        <div id="social-feed-container" class="social-feed-container">
          <div class="social-empty-state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Carregando conexões...</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    document.addEventListener('keydown', tratarKeydownSocial);

    aplicarCoresTemaModalSocial();
    alternarAbaSocial(targetId, abaInicial);
    iniciarRealtimeSocial(targetId);
  }

  function fecharListaSocial() {
    const container = document.getElementById('social-modal-container');
    if (container) container.remove();
    document.removeEventListener('keydown', tratarKeydownSocial);

    const sb = obterSupabaseSocial();
    if (canalRealtimeSocial && sb) {
      try {
        sb.removeChannel(canalRealtimeSocial);
      } catch (e) {
        console.warn('[Social] Erro ao desligar realtime social:', e);
      }
      canalRealtimeSocial = null;
    }
  }

  // Alternar entre Abas (Amigos, Seguindo, Seguidores)
  async function alternarAbaSocial(usuarioId, aba) {
    const meuId = obterUsuarioLogadoId();
    const targetId = usuarioId ? Number(usuarioId) : meuId;
    abaSocialAtiva = aba;

    document.querySelectorAll('.btn-tab-social').forEach(b => b.classList.remove('active'));
    const targetTab = document.getElementById(`tab-social-${aba}`);
    if (targetTab) targetTab.classList.add('active');

    const searchInput = document.getElementById('social-search-input');
    if (searchInput) searchInput.value = '';

    const feed = document.getElementById('social-feed-container');
    if (!feed) return;

    feed.innerHTML = `
      <div class="social-empty-state">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Buscando ${sanitizarSocial(aba)}...</span>
      </div>
    `;

    const sb = obterSupabaseSocial();
    if (!sb) {
      feed.innerHTML = `
        <div class="social-empty-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Erro de conexão com o servidor.</span>
        </div>
      `;
      return;
    }

    try {
      let idsParaBuscar = [];

      if (targetId) {
        if (aba === 'amigos') {
          const { data: res1 } = await sb.from('amizades').select('usuario_id_2').eq('usuario_id_1', targetId).eq('status', 'aceito');
          const { data: res2 } = await sb.from('amizades').select('usuario_id_1').eq('usuario_id_2', targetId).eq('status', 'aceito');

          if (res1) idsParaBuscar.push(...res1.map(item => item.usuario_id_2));
          if (res2) idsParaBuscar.push(...res2.map(item => item.usuario_id_1));

        } else if (aba === 'seguindo') {
          const { data } = await sb.from('seguidores').select('seguido_id').eq('seguidor_id', targetId);
          if (data) idsParaBuscar = data.map(item => item.seguido_id);

        } else if (aba === 'seguidores') {
          const { data } = await sb.from('seguidores').select('seguidor_id').eq('seguido_id', targetId);
          if (data) idsParaBuscar = data.map(item => item.seguidor_id);
        }
      }

      idsParaBuscar = [...new Set(idsParaBuscar.map(Number))].filter(Boolean);

      const badgeEl = document.getElementById(`count-${aba}`);
      if (badgeEl) badgeEl.innerText = idsParaBuscar.length;

      let usuarios = [];

      if (idsParaBuscar.length > 0) {
        const { data } = await sb
          .from('usuarios')
          .select('*')
          .in('id', idsParaBuscar);

        usuarios = data || [];
      }

      usuariosAbaAtualSocial = usuarios;
      renderizarListaUsuariosSocial(usuarios, aba);

    } catch (err) {
      console.error('[Social] Erro geral ao processar modal:', err);
      feed.innerHTML = `
        <div class="social-empty-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Ocorreu um erro ao carregar a lista.</span>
        </div>
      `;
    }
  }

  // Sincronização em Tempo Real (Realtime CDC Supabase)
  function iniciarRealtimeSocial(targetId) {
    const sb = obterSupabaseSocial();
    if (!sb || canalRealtimeSocial) return;

    try {
      canalRealtimeSocial = sb
        .channel(`public:social_connections_${targetId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'amizades' }, () => {
          alternarAbaSocial(targetId, abaSocialAtiva);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'seguidores' }, () => {
          alternarAbaSocial(targetId, abaSocialAtiva);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => {
          alternarAbaSocial(targetId, abaSocialAtiva);
        })
        .subscribe();
    } catch (e) {
      console.warn('[Social] Não foi possível iniciar canal realtime social:', e);
    }
  }

  // Renderizar Cards de Usuários
  function renderizarListaUsuariosSocial(usuarios, abaNome = '') {
    const feed = document.getElementById('social-feed-container');
    if (!feed) return;

    if (!usuarios || usuarios.length === 0) {
      feed.innerHTML = `
        <div class="social-empty-state">
          <i class="fa-solid fa-user-slash"></i>
          <span>Nenhum usuário em ${sanitizarSocial(abaNome || 'conexões')}.</span>
        </div>
      `;
      return;
    }

    feed.innerHTML = usuarios.map(u => {
      cacheUsuariosSocial[u.id] = u;

      const nomeExibicao = u.display_name || u.nome || u.username || 'Usuário';
      const usernameClean = u.username || 'usuario';
      const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(nomeExibicao)}`;
      const avatarSrc = u.avatar_url && String(u.avatar_url).trim() !== '' ? u.avatar_url : defaultAvatar;
      const molduraSrc = u.moldura_url && String(u.moldura_url).trim() !== '' ? u.moldura_url : '';

      // Badges
      let htmlBadges = '';
      if (typeof global.obterHtmlBadgesUsuario === 'function') {
        htmlBadges = global.obterHtmlBadgesUsuario(u);
      }

      // Status Dot
      let htmlStatusDot = '';
      if (typeof global.obterHtmlStatusDot === 'function') {
        htmlStatusDot = `<div class="social-status-container">${global.obterHtmlStatusDot(u.status || 'offline', u.id)}</div>`;
      } else {
        htmlStatusDot = `<div class="social-status-container"><span class="status-dot ${String(u.status || 'offline').toLowerCase()}"></span></div>`;
      }

      return `
        <div class="social-user-card" onclick="window.redirecionarParaPerfilSocial('${u.id}')">
          <div class="social-avatar-wrapper">
            <img src="${avatarSrc}" class="social-user-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="Avatar">
            ${molduraSrc ? `<img src="${molduraSrc}" class="social-user-moldura" alt="Moldura">` : ''}
            ${htmlStatusDot}
          </div>
          
          <div class="social-user-info">
            <div class="social-name-row">
              <span class="social-user-name">${sanitizarSocial(nomeExibicao)}</span>
              ${htmlBadges}
            </div>
            <span class="social-user-handle">@${sanitizarSocial(usernameClean)}</span>
          </div>

          <div class="social-card-actions">
            <button class="social-btn-action chat-btn" onclick="event.stopPropagation(); event.preventDefault(); window.iniciarChatSocial('${u.id}')" title="Enviar Mensagem">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
            <button class="social-btn-action" onclick="event.stopPropagation(); event.preventDefault(); window.redirecionarParaPerfilSocial('${u.id}')" title="Ver Perfil">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Filtro em Tempo Real com Debounce
  function filtrarUsuariosSocial(termo) {
    clearTimeout(timerDebounceBusca);
    timerDebounceBusca = setTimeout(() => {
      const t = termo.toLowerCase().trim();
      if (!t) {
        renderizarListaUsuariosSocial(usuariosAbaAtualSocial, abaSocialAtiva);
        return;
      }

      const filtrados = (usuariosAbaAtualSocial || []).filter(u => {
        const nome = (u.display_name || u.nome || u.username || '').toLowerCase();
        const handle = (u.username || '').toLowerCase();
        return nome.includes(t) || handle.includes(t);
      });

      renderizarListaUsuariosSocial(filtrados, abaSocialAtiva);
    }, 150);
  }

  // Wrappers de ação rápida usando cache local
  function redirecionarParaPerfilSocial(id) {
    const user = cacheUsuariosSocial[id];
    redirecionarParaPerfil(user || { id });
  }

  function iniciarChatSocial(id) {
    const user = cacheUsuariosSocial[id];
    iniciarChatComUsuarioSocial(user || { id });
  }

  // Exportações Globais
  global.abrirListaSocial = abrirListaSocial;
  global.fecharListaSocial = fecharListaSocial;
  global.alternarAbaSocial = alternarAbaSocial;
  global.redirecionarParaPerfil = redirecionarParaPerfil;
  global.redirecionarParaPerfilSocial = redirecionarParaPerfilSocial;
  global.iniciarChatComUsuarioSocial = iniciarChatComUsuarioSocial;
  global.iniciarChatSocial = iniciarChatSocial;
  global.filtrarUsuariosSocial = filtrarUsuariosSocial;

})(typeof window !== 'undefined' ? window : this);
