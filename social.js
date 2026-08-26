// ==========================================================================
// MÓDULO DE REDE SOCIAL - AMIGOS / SEGUINDO / SEGUIDORES (social.js)
// Project Z v5.0 | Dynamic Connections Modal, Live Filter & Status Badges
// ==========================================================================

window._cacheUsuariosSocial = {};
window._usuariosAbaAtualSocial = [];

// Helper para Obtenção Segura do Supabase Client
function obterSupabaseSocial() {
  return window.supabaseClient || window.supabase || window.sb || (typeof supabase !== 'undefined' ? supabase : null);
}

// Obter ID do Usuário Logado via LocalStorage
function obterUsuarioLogadoId() {
  try {
    const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return Number(parsed.id);
    }
  } catch (e) {
    console.error('[Social] Erro ao obter usuário do localStorage:', e);
  }
  return null;
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

// Injeção de Estilos CSS do Módulo Social
(function injetarEstilosSocial() {
  if (document.getElementById('social-css')) return;

  const css = `
    .social-modal-container {
      position: fixed;
      inset: 0;
      background: rgba(8, 4, 10, 0.82);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      z-index: 999;
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
      max-width: 480px;
      height: 85vh;
      max-height: 640px;
      background: #140b18;
      border: 1px solid rgba(255, 45, 85, 0.25);
      border-radius: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 45, 85, 0.15);
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    /* Header e Botão (X) Padronizados */
    .social-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px 12px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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
      width: 32px;
      height: 32px;
      min-width: 32px;
      max-width: 32px;
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
      background: var(--chat-accent, #ff2d55);
      color: #ffffff;
      border-color: var(--chat-accent, #ff2d55);
      transform: scale(1.05) rotate(90deg);
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
      color: #8c7b94;
      font-size: 0.85rem;
    }

    .social-search-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 8px 12px 8px 34px;
      color: #ffffff;
      font-size: 0.84rem;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }

    .social-search-input::placeholder { color: #7e6f85; }

    .social-search-input:focus {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 45, 85, 0.5);
      box-shadow: 0 0 12px rgba(255, 45, 85, 0.15);
    }

    /* Navegação por Abas */
    .social-tabs-header {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.25);
      padding: 4px;
      margin: 8px 16px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      gap: 4px;
    }

    .btn-tab-social {
      flex: 1;
      padding: 8px 6px;
      background: transparent;
      border: none;
      border-radius: 10px;
      color: #9d8ea4;
      font-weight: 700;
      font-size: 0.8rem;
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
      background: rgba(255, 255, 255, 0.04);
    }

    .btn-tab-social.active {
      color: #ffffff;
      background: var(--chat-accent, #ff2d55);
      box-shadow: 0 4px 12px rgba(255, 45, 85, 0.35);
    }

    .tab-badge-count {
      background: rgba(0, 0, 0, 0.3);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 0.7rem;
    }

    /* Painel do Feed */
    .social-feed-container {
      padding: 8px 16px 16px 16px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .social-feed-container::-webkit-scrollbar { width: 5px; }
    .social-feed-container::-webkit-scrollbar-thumb { background: rgba(255, 45, 85, 0.25); border-radius: 10px; }

    /* Card de Usuário */
    .social-user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.04);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .social-user-card:hover {
      background: rgba(255, 45, 85, 0.08);
      border-color: rgba(255, 45, 85, 0.25);
      transform: translateX(2px);
    }

    .social-avatar-wrapper {
      position: relative;
      width: 44px;
      height: 44px;
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
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: block;
    }

    .social-user-moldura {
      position: absolute;
      inset: -4px;
      width: calc(100% + 8px);
      height: calc(100% + 8px);
      pointer-events: none;
      object-fit: contain;
      z-index: 2;
    }

    .social-status-container {
      position: absolute;
      bottom: -2px;
      right: -2px;
      z-index: 3;
      pointer-events: none;
    }

    .social-user-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .social-name-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .social-user-name {
      font-weight: 700;
      color: #ffffff;
      font-size: 0.88rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .social-user-handle {
      font-size: 0.76rem;
      color: rgba(255, 255, 255, 0.45);
      font-weight: 500;
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
    }

    .social-btn-action {
      background: rgba(255, 255, 255, 0.06);
      color: #d1c4d6;
      border: 1px solid rgba(255, 255, 255, 0.1);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.8rem;
      padding: 0;
    }

    .social-btn-action:hover {
      background: var(--chat-accent, #ff2d55);
      color: #ffffff;
      border-color: var(--chat-accent, #ff2d55);
      transform: scale(1.08);
    }

    .social-btn-action.chat-btn {
      background: rgba(255, 45, 85, 0.15);
      border-color: rgba(255, 45, 85, 0.3);
      color: #ff2d55;
    }

    .social-btn-action.chat-btn:hover {
      background: #ff2d55;
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
      color: rgba(255, 45, 85, 0.4);
    }

    .social-empty-state span {
      font-size: 0.88rem;
      font-weight: 500;
    }

    /* Ajustes Responsivos */
    @media (max-width: 480px) {
      .social-modal-container { padding: 12px; }
      .social-content-wrapper { height: 90vh; border-radius: 20px; }
      .btn-tab-social { font-size: 0.75rem; padding: 7px 4px; gap: 4px; }
    }
  `;

  const styleTag = document.createElement('style');
  styleTag.id = 'social-css';
  styleTag.innerHTML = css;
  document.head.appendChild(styleTag);
})();

// Navegação para Perfil do Usuário
function redirecionarParaPerfil(usuario) {
  fecharListaSocial();
  if (!usuario) return;

  if (typeof window.abrirViewPerfil === 'function') {
    window.abrirViewPerfil(usuario);
  } else if (typeof window.visualizarPerfil === 'function') {
    window.visualizarPerfil(usuario);
  } else if (typeof window.abrirPerfil === 'function') {
    window.abrirPerfil(usuario);
  } else if (typeof window.abrirPerfilUsuario === 'function') {
    window.abrirPerfilUsuario(usuario.id || usuario);
  } else {
    console.error('[Social] Nenhuma função de navegação de perfil foi encontrada.');
  }
}

// Iniciar Chat Direto com Usuário
function iniciarChatComUsuarioSocial(usuario) {
  fecharListaSocial();
  if (!usuario) return;

  const targetId = typeof usuario === 'object' ? usuario.id : usuario;

  if (typeof window.seleccionarConversaDirect === 'function') {
    window.seleccionarConversaDirect(targetId);
  } else {
    redirecionarParaPerfil(usuario);
  }
}

// Listener de Teclado (Tecla Escape)
function tratarKeydownSocial(event) {
  if (event.key === 'Escape') {
    fecharListaSocial();
  }
}

// Modal Principal de Conexões Sociais
function abrirListaSocial(usuarioId, abaInicial = 'amigos') {
  fecharListaSocial();

  let targetId = usuarioId || obterUsuarioLogadoId();

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
          <i class="fa-solid fa-users-rectangle" style="color: #ff2d55;"></i> Conexões
        </span>
        <button class="btn-fechar-social" onclick="fecharListaSocial()" title="Fechar (ESC)">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Campo de Busca em Tempo Real -->
      <div class="social-search-box">
        <div class="social-search-input-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="social-search-input" class="social-search-input" placeholder="Buscar conexões..." oninput="filtrarUsuariosSocial(this.value)">
        </div>
      </div>

      <div class="social-tabs-header">
        <button id="tab-social-amigos" class="btn-tab-social" onclick="alternarAbaSocial('${targetId}', 'amigos')">
          <i class="fa-solid fa-user-group"></i> Amigos <span class="tab-badge-count" id="count-amigos">0</span>
        </button>
        <button id="tab-social-seguindo" class="btn-tab-social" onclick="alternarAbaSocial('${targetId}', 'seguindo')">
          <i class="fa-solid fa-user-right-long"></i> Seguindo <span class="tab-badge-count" id="count-seguindo">0</span>
        </button>
        <button id="tab-social-seguidores" class="btn-tab-social" onclick="alternarAbaSocial('${targetId}', 'seguidores')">
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

  alternarAbaSocial(targetId, abaInicial);
}

// Fechar Modal
function fecharListaSocial() {
  const container = document.getElementById('social-modal-container');
  if (container) container.remove();
  document.removeEventListener('keydown', tratarKeydownSocial);
}

// Alternar entre Abas (Amigos, Seguindo, Seguidores)
async function alternarAbaSocial(usuarioId, aba) {
  let targetId = usuarioId || obterUsuarioLogadoId();

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
        <span>Erro ao conectar com o banco.</span>
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

    idsParaBuscar = [...new Set(idsParaBuscar)].filter(Boolean);

    // Atualiza Badge da Aba
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

    window._usuariosAbaAtualSocial = usuarios;
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

// Renderizar Cards de Usuários
function renderizarListaUsuariosSocial(usuarios, abaNome = '') {
  const feed = document.getElementById('social-feed-container');
  if (!feed) return;

  if (!usuarios || usuarios.length === 0) {
    feed.innerHTML = `
      <div class="social-empty-state">
        <i class="fa-solid fa-user-slash"></i>
        <span>Nenhum usuário encontrado em ${sanitizarSocial(abaNome || 'conexões')}.</span>
      </div>
    `;
    return;
  }

  feed.innerHTML = usuarios.map(u => {
    window._cacheUsuariosSocial[u.id] = u;

    const nomeExibicao = u.display_name || u.nome || u.username || 'Usuário';
    const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(nomeExibicao)}`;
    const avatarSrc = u.avatar_url && String(u.avatar_url).trim() !== '' ? u.avatar_url : defaultAvatar;
    const molduraSrc = u.moldura_url && String(u.moldura_url).trim() !== '' ? u.moldura_url : '';

    const htmlTag = typeof window.obterHtmlTag === 'function' ? window.obterHtmlTag(u) : '';
    const htmlStatusDot = typeof window.obterHtmlStatusDot === 'function' 
      ? `<div class="social-status-container">${window.obterHtmlStatusDot(u.status || 'offline')}</div>` 
      : '';

    return `
      <div class="social-user-card" onclick="redirecionarParaPerfil(window._cacheUsuariosSocial['${u.id}'])">
        <div class="social-avatar-wrapper">
          <img src="${avatarSrc}" class="social-user-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="Avatar">
          ${molduraSrc ? `<img src="${molduraSrc}" class="social-user-moldura" alt="Moldura">` : ''}
          ${htmlStatusDot}
        </div>
        
        <div class="social-user-info">
          <div class="social-name-row">
            <span class="social-user-name">${sanitizarSocial(nomeExibicao)}</span>
            ${htmlTag}
          </div>
          <span class="social-user-handle">@${sanitizarSocial(u.username || 'usuario')}</span>
        </div>

        <div class="social-card-actions">
          <button class="social-btn-action chat-btn" onclick="event.stopPropagation(); iniciarChatComUsuarioSocial(window._cacheUsuariosSocial['${u.id}'])" title="Conversar Privadamente">
            <i class="fa-solid fa-comment"></i>
          </button>
          <button class="social-btn-action" onclick="event.stopPropagation(); redirecionarParaPerfil(window._cacheUsuariosSocial['${u.id}'])" title="Ver Perfil">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Filtro em Tempo Real
function filtrarUsuariosSocial(termo) {
  const t = termo.toLowerCase().trim();
  if (!t) {
    renderizarListaUsuariosSocial(window._usuariosAbaAtualSocial);
    return;
  }

  const filtrados = (window._usuariosAbaAtualSocial || []).filter(u => {
    const nome = (u.display_name || u.nome || u.username || '').toLowerCase();
    const handle = (u.username || '').toLowerCase();
    return nome.includes(t) || handle.includes(t);
  });

  renderizarListaUsuariosSocial(filtrados);
}

// Exportações Globais
window.abrirListaSocial = abrirListaSocial;
window.fecharListaSocial = fecharListaSocial;
window.alternarAbaSocial = alternarAbaSocial;
window.redirecionarParaPerfil = redirecionarParaPerfil;
window.iniciarChatComUsuarioSocial = iniciarChatComUsuarioSocial;
window.filtrarUsuariosSocial = filtrarUsuariosSocial;
