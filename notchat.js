// ==========================================================================
// NOTCHAT MODULE (notchat.js) - CENTRAL DE NOTIFICAÇÕES & AMIZADES PRO
// Sphere v5.2 | Mentions Tracker, Pending Requests & Dynamic Theme Sync
// ==========================================================================

(function (global) {
  'use strict';

  let abaAtualNotChat = 'mencoes';
  let filtroLeituraNotChat = 'todas'; // 'todas' | 'nao_lidas'
  let abaSubPendenteNotChat = 'recebidos'; // 'recebidos' | 'enviados'
  let canalRealtimeNotChat = null;

  // Helper para obtenção segura do Supabase Client
  function obterSupabaseNotChat() {
    return global.supabaseClient || global.supabase || global.sb || null;
  }

  // Sanitização de Texto Contra Injeções XSS
  function sanitizarNotChat(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Resolução do Usuário Logado
  function obterUsuarioLogadoLocalNotChat() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('[NotChat] Erro ao obter usuário logado:', e);
    }
    return null;
  }

  // Injeta o CSS dedicado do Módulo de Notificações com Suporte a Temas
  (function injetarCssNotChat() {
    if (document.getElementById('notchat-css-v52')) return;
    const style = document.createElement('style');
    style.id = 'notchat-css-v52';
    style.textContent = `
      .notchat-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(8, 4, 10, 0.85);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        animation: fadeInNot 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes fadeInNot {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }

      .notchat-modal-box {
        width: 100%;
        max-width: 480px;
        height: 85vh;
        max-height: 590px;
        background: #140b18;
        border: 1px solid var(--user-theme-border, rgba(255, 45, 85, 0.35));
        border-radius: 22px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.88), 0 0 30px var(--user-theme-glow, rgba(255, 45, 85, 0.15));
        box-sizing: border-box;
        transition: border-color 0.3s ease, box-shadow 0.3s ease;
      }

      .notchat-header {
        padding: 14px 18px;
        background: rgba(22, 13, 25, 0.95);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .notchat-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 800;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .notchat-header h3 i {
        color: var(--user-theme-color, #ff2d55);
      }

      .notchat-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .notchat-btn-readall {
        height: 32px !important;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--user-theme-color, rgba(255, 45, 85, 0.35));
        color: #ffffff;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0 12px;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .notchat-btn-readall:hover {
        background: var(--user-theme-color, #ff2d55);
        border-color: var(--user-theme-color, #ff2d55);
        color: #ffffff;
        box-shadow: 0 0 12px var(--user-theme-glow, rgba(255, 45, 85, 0.4));
      }

      /* Botão Circular Compacto (X) de 32px */
      .btn-notchat-close {
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        max-width: 32px !important;
        border-radius: 50% !important;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #d1c4d6;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        transition: all 0.2s ease;
        padding: 0;
        flex-shrink: 0;
      }

      .btn-notchat-close:hover {
        background: var(--user-theme-color, #ff2d55);
        color: #ffffff;
        border-color: var(--user-theme-color, #ff2d55);
        transform: scale(1.08) rotate(90deg);
        box-shadow: 0 0 12px var(--user-theme-glow, rgba(255, 45, 85, 0.4));
      }

      /* Abas Principais */
      .notchat-tabs-bar {
        display: flex;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding: 4px;
        gap: 4px;
      }

      .notchat-tab-btn {
        flex: 1;
        height: 32px;
        background: transparent;
        border: none;
        border-radius: 10px;
        color: #b3a5b8;
        font-size: 0.76rem;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        white-space: nowrap;
      }

      .notchat-tab-btn.active {
        color: #ffffff;
        background: var(--user-theme-gradient, linear-gradient(135deg, #ff2d55, #ff7675));
        box-shadow: 0 4px 12px var(--user-theme-glow, rgba(255, 45, 85, 0.35));
      }

      /* Sub-barra de Filtros */
      .notchat-subfilter-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        background: rgba(18, 9, 21, 0.8);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .notchat-filter-chip {
        height: 32px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #b3a5b8;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0 12px;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.15s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .notchat-filter-chip.active {
        background: rgba(255, 255, 255, 0.12);
        border-color: var(--user-theme-color, #ff2d55);
        color: #fff;
      }

      .notchat-tab-content {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-sizing: border-box;
      }

      .notchat-tab-content::-webkit-scrollbar {
        width: 5px;
      }
      .notchat-tab-content::-webkit-scrollbar-thumb {
        background: var(--user-theme-color, #ff2d55);
        border-radius: 4px;
      }

      /* Cards de Notificação / Pedidos */
      .notchat-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.028);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 14px;
        gap: 10px;
        cursor: pointer;
        position: relative;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .notchat-card:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: var(--user-theme-color, rgba(255, 45, 85, 0.35));
        transform: translateX(2px);
      }

      .notchat-card.unread {
        background: rgba(255, 255, 255, 0.05);
        border-color: var(--user-theme-color, rgba(255, 45, 85, 0.45));
      }

      .notchat-unread-dot {
        width: 8px;
        height: 8px;
        background: var(--user-theme-color, #ff2d55);
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 0 8px var(--user-theme-color, #ff2d55);
      }

      .notchat-card-left {
        display: flex;
        align-items: center;
        gap: 10px;
        overflow: hidden;
        flex: 1;
      }

      .notchat-avatar-wrapper {
        position: relative;
        width: 42px;
        height: 42px;
        min-width: 42px;
        min-height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .notchat-avatar {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        border: 1.5px solid var(--user-theme-color, #ff2d55);
        flex-shrink: 0;
      }

      .notchat-moldura {
        position: absolute;
        top: -12%;
        left: -12%;
        width: 124%;
        height: 124%;
        pointer-events: none;
        object-fit: contain;
        z-index: 2;
      }

      .notchat-meta {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        gap: 2px;
        width: 100%;
      }

      .notchat-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }

      .notchat-title {
        font-size: 0.85rem;
        font-weight: 800;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .notchat-timestamp {
        font-size: 0.68rem;
        color: #8e7f96;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .notchat-subtext {
        font-size: 0.75rem;
        color: #b3a5b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-top: 1px;
      }

      .notchat-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      /* Botões em 32px */
      .btn-notchat-accept {
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        max-width: 32px !important;
        border-radius: 50% !important;
        background: #2ed573;
        border: none;
        color: #000;
        font-size: 0.85rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease;
        padding: 0;
      }

      .btn-notchat-accept:hover {
        background: #26af5f;
        transform: scale(1.08);
      }

      .btn-notchat-reject {
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        max-width: 32px !important;
        border-radius: 50% !important;
        background: rgba(255, 71, 87, 0.18);
        border: 1px solid rgba(255, 71, 87, 0.4);
        color: #ff4757;
        font-size: 0.85rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease;
        padding: 0;
      }

      .btn-notchat-reject:hover {
        background: #ff4757;
        color: #ffffff;
        transform: scale(1.08);
      }

      .notchat-empty {
        margin: auto;
        text-align: center;
        color: #8e7f96;
        font-size: 0.85rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 40px 20px;
      }

      .notchat-empty i {
        font-size: 2.2rem;
        color: var(--user-theme-color, rgba(255, 45, 85, 0.4));
      }
    `;
    document.head.appendChild(style);
  })();

  function formatarDataRelativaNotChat(timestamp) {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const agora = new Date();
      const diffSeg = Math.floor((agora - date) / 1000);

      if (diffSeg < 60) return 'Agora';
      if (diffSeg < 3600) return `Há ${Math.floor(diffSeg / 60)}m`;
      if (diffSeg < 86400) return `Há ${Math.floor(diffSeg / 3600)}h`;

      const eHoje = date.toDateString() === agora.toDateString();
      const hora = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return eHoje 
        ? `Hoje às ${hora}` 
        : `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`;
    } catch (e) { 
      return ''; 
    }
  }

  function escFecharNotChat(e) {
    if (e.key === 'Escape') fecharPainelNotChat();
  }

  function aplicarCoresTemaModalNotChat() {
    const box = document.querySelector('.notchat-modal-box');
    if (!box) return;

    const user = obterUsuarioLogadoLocalNotChat();
    const corBg1 = user?.cor_bg1 || user?.cor_tema || '#ff2d55';
    const corBg2 = user?.cor_bg2 || user?.cor_tema || '#ff7675';
    const corGradient = corBg1 !== corBg2 ? `linear-gradient(135deg, ${corBg1}, ${corBg2})` : corBg1;

    box.style.setProperty('--user-theme-color', corBg1);
    box.style.setProperty('--user-theme-gradient', corGradient);
    box.style.setProperty('--user-theme-glow', `${corBg1}45`);
    box.style.setProperty('--user-theme-border', `${corBg1}38`);
  }

  function abrirPainelNotChat() {
    fecharPainelNotChat();

    const modal = document.createElement('div');
    modal.id = 'notchat-modal-overlay';
    modal.className = 'notchat-modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) fecharPainelNotChat(); };

    modal.innerHTML = `
      <div class="notchat-modal-box">
        <div class="notchat-header">
          <h3><i class="fa-solid fa-bell"></i> Central de Atividades</h3>
          <div class="notchat-header-actions">
            <button class="notchat-btn-readall" onclick="window.marcarTodasLidasNotChat()" title="Marcar todas como lidas">
              <i class="fa-solid fa-check-double"></i> Limpar Lidas
            </button>
            <button class="btn-notchat-close" onclick="window.fecharPainelNotChat()" title="Fechar (Esc)"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>

        <div class="notchat-tabs-bar">
          <button class="notchat-tab-btn active" id="tab-btn-mencoes" onclick="window.trocarAbaNotChat('mencoes')">
            <i class="fa-solid fa-at"></i> Menções
          </button>
          <button class="notchat-tab-btn" id="tab-btn-pendentes" onclick="window.trocarAbaNotChat('pendentes')">
            <i class="fa-solid fa-user-clock"></i> Pendentes
          </button>
          <button class="notchat-tab-btn" id="tab-btn-recentes" onclick="window.trocarAbaNotChat('recentes')">
            <i class="fa-solid fa-user-plus"></i> Recentes
          </button>
        </div>

        <!-- Sub-filtro Dinâmico -->
        <div class="notchat-subfilter-bar" id="notchat-subfilter-container">
          <!-- Renderizado Dinamicamente -->
        </div>

        <div class="notchat-tab-content" id="notchat-tab-content">
          <div class="notchat-empty"><i class="fa-solid fa-spinner fa-spin"></i> Carregando atividades...</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.addEventListener('keydown', escFecharNotChat);

    aplicarCoresTemaModalNotChat();
    trocarAbaNotChat('mencoes');
    iniciarRealtimeNotChat();
  }

  function fecharPainelNotChat() {
    const el = document.getElementById('notchat-modal-overlay');
    if (el) el.remove();
    document.removeEventListener('keydown', escFecharNotChat);

    const sb = obterSupabaseNotChat();
    if (canalRealtimeNotChat && sb) {
      try {
        sb.removeChannel(canalRealtimeNotChat);
      } catch (e) {
        console.warn('[NotChat] Erro ao desativar canal realtime:', e);
      }
      canalRealtimeNotChat = null;
    }
  }

  function renderizarSubfiltrosNotChat() {
    const filterContainer = document.getElementById('notchat-subfilter-container');
    if (!filterContainer) return;

    if (abaAtualNotChat === 'mencoes') {
      filterContainer.style.display = 'flex';
      filterContainer.innerHTML = `
        <button class="notchat-filter-chip ${filtroLeituraNotChat === 'todas' ? 'active' : ''}" id="filter-chip-todas" onclick="window.alternarFiltroLeituraNotChat('todas')">Todas</button>
        <button class="notchat-filter-chip ${filtroLeituraNotChat === 'nao_lidas' ? 'active' : ''}" id="filter-chip-nao_lidas" onclick="window.alternarFiltroLeituraNotChat('nao_lidas')">Não Lidas</button>
      `;
    } else if (abaAtualNotChat === 'pendentes') {
      filterContainer.style.display = 'flex';
      filterContainer.innerHTML = `
        <button class="notchat-filter-chip ${abaSubPendenteNotChat === 'recebidos' ? 'active' : ''}" id="subpendent-chip-recebidos" onclick="window.alternarSubPendenteNotChat('recebidos')"><i class="fa-solid fa-inbox"></i> Recebidos</button>
        <button class="notchat-filter-chip ${abaSubPendenteNotChat === 'enviados' ? 'active' : ''}" id="subpendent-chip-enviados" onclick="window.alternarSubPendenteNotChat('enviados')"><i class="fa-solid fa-paper-plane"></i> Enviados</button>
      `;
    } else {
      filterContainer.style.display = 'none';
      filterContainer.innerHTML = '';
    }
  }

  function trocarAbaNotChat(aba) {
    abaAtualNotChat = aba;
    document.querySelectorAll('.notchat-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-btn-${aba}`);
    if (activeBtn) activeBtn.classList.add('active');

    renderizarSubfiltrosNotChat();
    carregarConteudoAbaNotChat(aba);
  }

  function alternarFiltroLeituraNotChat(filtro) {
    filtroLeituraNotChat = filtro;
    renderizarSubfiltrosNotChat();
    carregarConteudoAbaNotChat(abaAtualNotChat);
  }

  function alternarSubPendenteNotChat(subAba) {
    abaSubPendenteNotChat = subAba;
    renderizarSubfiltrosNotChat();
    carregarConteudoAbaNotChat('pendentes');
  }

  // Sincronização Realtime CDC Supabase
  function iniciarRealtimeNotChat() {
    const sb = obterSupabaseNotChat();
    const user = obterUsuarioLogadoLocalNotChat();
    if (!sb || !user || canalRealtimeNotChat) return;

    try {
      canalRealtimeNotChat = sb
        .channel(`public:notchat_activity_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens' }, () => {
          carregarConteudoAbaNotChat(abaAtualNotChat);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'amizades' }, () => {
          carregarConteudoAbaNotChat(abaAtualNotChat);
        })
        .subscribe();
    } catch (e) {
      console.warn('[NotChat] Erro ao conectar ao realtime:', e);
    }
  }

  async function carregarConteudoAbaNotChat(aba) {
    const container = document.getElementById('notchat-tab-content');
    if (!container) return;

    const clientSupabase = obterSupabaseNotChat();
    const usuarioLogado = obterUsuarioLogadoLocalNotChat();

    if (!clientSupabase || !usuarioLogado) {
      container.innerHTML = `<div class="notchat-empty"><i class="fa-solid fa-triangle-exclamation"></i> Não foi possível sincronizar suas notificações.</div>`;
      return;
    }

    const meId = Number(usuarioLogado.id);

    try {
      if (aba === 'mencoes') {
        const usernameHandle = `@${usuarioLogado.username}`;
        
        let query = clientSupabase
          .from('mensagens')
          .select('id, conteudo, created_at, lida, remetente_id')
          .ilike('conteudo', `%${usernameHandle}%`);

        if (filtroLeituraNotChat === 'nao_lidas') {
          query = query.eq('lida', false);
        }

        const { data: mencoes, error } = await query
          .order('id', { ascending: false })
          .limit(20);

        if (error || !mencoes || mencoes.length === 0) {
          container.innerHTML = `<div class="notchat-empty"><i class="fa-solid fa-at"></i> Nenhuma menção ${filtroLeituraNotChat === 'nao_lidas' ? 'não lida' : 'encontrada'}.</div>`;
          return;
        }

        // Busca usuários dos remetentes
        const idsRemetentes = [...new Set(mencoes.map(m => Number(m.remetente_id)).filter(Boolean))];
        let mapaUsuarios = {};

        if (idsRemetentes.length > 0) {
          const { data: perfis } = await clientSupabase
            .from('usuarios')
            .select('*')
            .in('id', idsRemetentes);

          if (perfis) {
            perfis.forEach(u => { mapaUsuarios[u.id] = u; });
          }
        }

        container.innerHTML = mencoes.map(m => {
          const dataRelativa = formatarDataRelativaNotChat(m.created_at);
          const ehNaoLida = !m.lida;
          const uRemetente = mapaUsuarios[m.remetente_id] || {};
          const displayNameClean = sanitizarNotChat(uRemetente.display_name || uRemetente.nome || uRemetente.username || 'Usuário');
          const avatarUrl = uRemetente.avatar_url || `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(displayNameClean)}`;
          const molduraUrl = uRemetente.moldura_url || '';

          let htmlBadges = '';
          if (typeof global.obterHtmlBadgesUsuario === 'function') {
            htmlBadges = global.obterHtmlBadgesUsuario(uRemetente);
          }

          return `
            <div class="notchat-card ${ehNaoLida ? 'unread' : ''}" onclick="window.abrirConversaEMarcarLida(${m.remetente_id}, ${m.id})">
              <div class="notchat-card-left">
                <div class="notchat-avatar-wrapper">
                  <img src="${avatarUrl}" class="notchat-avatar" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=User';" alt="Avatar">
                  ${molduraUrl ? `<img src="${molduraUrl}" class="notchat-moldura" alt="Moldura">` : ''}
                </div>
                <div class="notchat-meta">
                  <div class="notchat-title-row">
                    <span class="notchat-title">${displayNameClean} ${htmlBadges}</span>
                    <span class="notchat-timestamp">${dataRelativa}</span>
                  </div>
                  <span class="notchat-subtext">${sanitizarNotChat(m.conteudo)}</span>
                </div>
              </div>
              ${ehNaoLida ? '<div class="notchat-unread-dot" title="Mensagem Não Lida"></div>' : ''}
            </div>
          `;
        }).join('');

      } else if (aba === 'pendentes') {
        let queryPendentes = clientSupabase.from('amizades').select('id, usuario_id_1, usuario_id_2, status');

        if (abaSubPendenteNotChat === 'recebidos') {
          queryPendentes = queryPendentes.eq('usuario_id_2', meId).eq('status', 'pendente');
        } else {
          queryPendentes = queryPendentes.eq('usuario_id_1', meId).eq('status', 'pendente');
        }

        const { data: pendentes, error: errPendentes } = await queryPendentes.order('id', { ascending: false });

        if (errPendentes || !pendentes || pendentes.length === 0) {
          const textoVazio = abaSubPendenteNotChat === 'recebidos' ? 'Nenhum pedido de amizade recebido.' : 'Nenhum pedido de amizade enviado.';
          container.innerHTML = `<div class="notchat-empty"><i class="fa-solid fa-user-clock"></i> ${textoVazio}</div>`;
          return;
        }

        // Mapeia os usuários correspondentes
        const idsChave = pendentes.map(p => Number(abaSubPendenteNotChat === 'recebidos' ? p.usuario_id_1 : p.usuario_id_2)).filter(Boolean);
        let mapaUsuarios = {};

        if (idsChave.length > 0) {
          const { data: perfis } = await clientSupabase
            .from('usuarios')
            .select('*')
            .in('id', idsChave);

          if (perfis) {
            perfis.forEach(u => { mapaUsuarios[u.id] = u; });
          }
        }

        container.innerHTML = pendentes.map(p => {
          const targetId = abaSubPendenteNotChat === 'recebidos' ? p.usuario_id_1 : p.usuario_id_2;
          const uAlvo = mapaUsuarios[targetId] || {};
          const displayNameClean = sanitizarNotChat(uAlvo.display_name || uAlvo.nome || uAlvo.username || 'Usuário');
          const usernameClean = sanitizarNotChat(uAlvo.username || 'usuario');
          const avatarUrl = uAlvo.avatar_url || `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(displayNameClean)}`;
          const molduraUrl = uAlvo.moldura_url || '';

          let htmlBadges = '';
          if (typeof global.obterHtmlBadgesUsuario === 'function') {
            htmlBadges = global.obterHtmlBadgesUsuario(uAlvo);
          }

          let htmlAcoes = '';
          if (abaSubPendenteNotChat === 'recebidos') {
            htmlAcoes = `
              <div class="notchat-actions">
                <button class="btn-notchat-accept" onclick="window.responderAmizadeNotChat(${p.id}, 'aceito')" title="Aceitar"><i class="fa-solid fa-check"></i></button>
                <button class="btn-notchat-reject" onclick="window.responderAmizadeNotChat(${p.id}, 'recusado')" title="Recusar"><i class="fa-solid fa-xmark"></i></button>
              </div>`;
          } else {
            htmlAcoes = `
              <div class="notchat-actions">
                <button class="btn-notchat-reject" onclick="window.responderAmizadeNotChat(${p.id}, 'cancelado')" title="Cancelar solicitação"><i class="fa-solid fa-trash"></i></button>
              </div>`;
          }

          const textoDescricao = abaSubPendenteNotChat === 'recebidos'
            ? `@${usernameClean} enviou um pedido de amizade`
            : `Solicitação enviada para @${usernameClean}`;

          return `
            <div class="notchat-card">
              <div class="notchat-card-left" onclick="if(typeof window.abrirPerfil === 'function') window.abrirPerfil({ id: ${targetId} });">
                <div class="notchat-avatar-wrapper">
                  <img src="${avatarUrl}" class="notchat-avatar" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=User';" alt="Avatar">
                  ${molduraUrl ? `<img src="${molduraUrl}" class="notchat-moldura" alt="Moldura">` : ''}
                </div>
                <div class="notchat-meta">
                  <div class="notchat-title-row">
                    <span class="notchat-title">${displayNameClean} ${htmlBadges}</span>
                  </div>
                  <span class="notchat-subtext">${textoDescricao}</span>
                </div>
              </div>
              ${htmlAcoes}
            </div>
          `;
        }).join('');

      } else if (aba === 'recentes') {
        const { data: recentes } = await clientSupabase
          .from('amizades')
          .select('id, usuario_id_1, usuario_id_2, status')
          .or(`usuario_id_1.eq.${meId},usuario_id_2.eq.${meId}`)
          .eq('status', 'aceito')
          .order('id', { ascending: false })
          .limit(15);

        if (!recentes || recentes.length === 0) {
          container.innerHTML = `<div class="notchat-empty"><i class="fa-solid fa-user-plus"></i> Nenhuma conexão recente.</div>`;
          return;
        }

        const idsAmigos = [...new Set(recentes.map(a => Number(a.usuario_id_1) === meId ? Number(a.usuario_id_2) : Number(a.usuario_id_1)).filter(Boolean))];
        let mapaUsuarios = {};

        if (idsAmigos.length > 0) {
          const { data: perfis } = await clientSupabase
            .from('usuarios')
            .select('*')
            .in('id', idsAmigos);

          if (perfis) {
            perfis.forEach(u => { mapaUsuarios[u.id] = u; });
          }
        }

        container.innerHTML = recentes.map(a => {
          const idAmigo = Number(a.usuario_id_1) === meId ? Number(a.usuario_id_2) : Number(a.usuario_id_1);
          const amigo = mapaUsuarios[idAmigo];
          if (!amigo) return '';

          const displayNameClean = sanitizarNotChat(amigo.display_name || amigo.nome || amigo.username || 'Usuário');
          const usernameClean = sanitizarNotChat(amigo.username || 'usuario');
          const avatarUrl = amigo.avatar_url || `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(displayNameClean)}`;
          const molduraUrl = amigo.moldura_url || '';

          let htmlBadges = '';
          if (typeof global.obterHtmlBadgesUsuario === 'function') {
            htmlBadges = global.obterHtmlBadgesUsuario(amigo);
          }

          return `
            <div class="notchat-card" onclick="window.redirecionarParaConversaDirectNotChat(${amigo.id})">
              <div class="notchat-card-left">
                <div class="notchat-avatar-wrapper">
                  <img src="${avatarUrl}" class="notchat-avatar" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=User';" alt="Avatar">
                  ${molduraUrl ? `<img src="${molduraUrl}" class="notchat-moldura" alt="Moldura">` : ''}
                </div>
                <div class="notchat-meta">
                  <div class="notchat-title-row">
                    <span class="notchat-title">${displayNameClean} ${htmlBadges}</span>
                  </div>
                  <span class="notchat-subtext">@${usernameClean} • Vocês são amigos</span>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.error("[NotChat] Erro ao carregar aba de notificações:", err);
    }
  }

  function redirecionarParaConversaDirectNotChat(idAmigo) {
    if (!idAmigo) return;
    const targetId = typeof idAmigo === 'object' ? Number(idAmigo.id) : Number(idAmigo);

    fecharPainelNotChat();

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
        global.seleccionarConversaDirect(idAmigo);
      } else if (typeof global.enviarMensagemParaUsuario === 'function') {
        global.enviarMensagemParaUsuario(idAmigo);
      } else if (typeof global.abrirChatComUsuario === 'function') {
        global.abrirChatComUsuario(idAmigo);
      } else if (typeof global.cliqueItemContato === 'function') {
        global.cliqueItemContato(targetId);
      }
    }, 60);
  }

  async function abrirConversaEMarcarLida(remetenteId, mensagemId) {
    const clientSupabase = obterSupabaseNotChat();
    if (clientSupabase && mensagemId) {
      try {
        await clientSupabase.from('mensagens').update({ lida: true }).eq('id', mensagemId);
      } catch (e) {
        console.error("[NotChat] Erro ao marcar leitura:", e);
      }
    }

    redirecionarParaConversaDirectNotChat(remetenteId);
  }

  async function marcarTodasLidasNotChat() {
    const clientSupabase = obterSupabaseNotChat();
    const usuarioLogado = obterUsuarioLogadoLocalNotChat();
    if (!clientSupabase || !usuarioLogado) return;

    try {
      await clientSupabase
        .from('mensagens')
        .update({ lida: true })
        .eq('destinatario_id', Number(usuarioLogado.id))
        .eq('lida', false);

      carregarConteudoAbaNotChat(abaAtualNotChat);
    } catch (e) {
      console.error("[NotChat] Erro ao marcar todas como lidas:", e);
    }
  }

  async function responderAmizadeNotChat(amizadeId, novoStatus) {
    const clientSupabase = obterSupabaseNotChat();
    if (!clientSupabase) return;

    try {
      if (novoStatus === 'aceito') {
        await clientSupabase.from('amizades').update({ status: 'aceito' }).eq('id', amizadeId);
      } else {
        await clientSupabase.from('amizades').delete().eq('id', amizadeId);
      }
      
      await carregarConteudoAbaNotChat('pendentes');
      
      if (typeof global.carregarListaConversas === 'function') global.carregarListaConversas();
      if (global._perfilUsuarioCache && typeof global.abrirPerfil === 'function') {
        global.abrirPerfil(global._perfilUsuarioCache, true);
      }
    } catch (e) {
      console.error("[NotChat] Erro ao responder pedido de amizade:", e);
    }
  }

  // Exportações Globais
  global.abrirPainelNotChat = abrirPainelNotChat;
  global.fecharPainelNotChat = fecharPainelNotChat;
  global.trocarAbaNotChat = trocarAbaNotChat;
  global.alternarFiltroLeituraNotChat = alternarFiltroLeituraNotChat;
  global.alternarSubPendenteNotChat = alternarSubPendenteNotChat;
  global.responderAmizadeNotChat = responderAmizadeNotChat;
  global.abrirConversaEMarcarLida = abrirConversaEMarcarLida;
  global.marcarTodasLidasNotChat = marcarTodasLidasNotChat;
  global.redirecionarParaConversaDirectNotChat = redirecionarParaConversaDirectNotChat;

})(typeof window !== 'undefined' ? window : this);
