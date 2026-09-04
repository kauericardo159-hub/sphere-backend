// ==========================================================================
// MÓDULO HOMECARD & PAINEL DE MEMBROS DA COMUNIDADE (homecard.js)
// Sphere v5.2 | Integração Nativa status.js (int8), verificados.js & Realtime CDC
// ==========================================================================

let inscricaoRealtimeUsuarios = null;

// Helper de Sanitização XSS estrita
function sanitizarHtmlHomecard(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Mapeamento de Peso Numérico para Ordenação na Lista
function obterPesoStatus(status) {
  const st = String(status || 'offline').toLowerCase();
  switch (st) {
    case 'online':
      return 1;
    case 'ausente':
    case 'idle':
    case 'ausente_auto':
      return 2;
    case 'dnd':
    case 'ocupado':
    case 'nao_perturbe':
      return 3;
    case 'offline':
    case 'invisivel':
    default:
      return 4;
  }
}

// Resolução Segura da Instância Global do Supabase
function obterSupabaseHomecard() {
  return window.supabaseClient || window.supabase || window.sb || null;
}

// Resolução do Usuário no LocalStorage
function obterUsuarioLocalHomecard() {
  try {
    const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("[HomeCard] Erro ao parsear usuário do localStorage:", e);
  }
  return null;
}

// Renderiza o indicador de status delegando a construção com data-user-status-id ao status.js
function renderizarBadgeStatusHomecard(usuarioId, statusAtual) {
  const st = statusAtual || 'offline';
  const htmlDot = typeof window.obterHtmlStatusDot === 'function'
    ? window.obterHtmlStatusDot(st, usuarioId)
    : `<span class="status-dot ${String(st).toLowerCase()}" data-user-status-id="${usuarioId}"></span>`;

  return `<div class="avatar-status-badge">${htmlDot}</div>`;
}

/**
 * Renderização de Badges e Verificados integrada ao verificados.js
 */
function renderizarBadgesVerificadosHomecard(usuario) {
  if (!usuario) return '';

  let listaBadges = [];
  if (usuario.verificados) {
    if (Array.isArray(usuario.verificados)) {
      listaBadges = [...usuario.verificados];
    } else if (typeof usuario.verificados === 'string') {
      listaBadges = usuario.verificados.split(/[,|]/).map(s => s.trim().toLowerCase());
    }
  }

  if ((usuario.is_creator || usuario.is_criador) && !listaBadges.includes('creator')) {
    listaBadges.unshift('creator');
  }

  if (usuario.is_verified && !listaBadges.includes('verified')) {
    listaBadges.push('verified');
  }

  if (listaBadges.length === 0) return '';

  if (typeof window.obterHtmlBadgesUsuario === 'function') {
    return window.obterHtmlBadgesUsuario(listaBadges);
  }

  return '';
}

// Renderizador Principal do Container Homecard
async function renderHomeCard(usuario) {
  const user = usuario || obterUsuarioLocalHomecard();
  if (!user || user.id === undefined) return;

  removerHomeCard();

  const wrapper = document.createElement('div');
  wrapper.id = 'homecard-wrapper-container';
  wrapper.className = 'homecard-wrapper-container';

  // 1. DADOS DE APRESENTAÇÃO DO USUÁRIO LOGADO
  const usernameText = sanitizarHtmlHomecard(user.username || 'usuario');
  const displayNameText = sanitizarHtmlHomecard(user.display_name || user.nome || usernameText);
  const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(user.username || 'usuario')}`;
  const avatarSrc = (user.avatar_url && user.avatar_url.trim() !== '') ? user.avatar_url : defaultAvatar;
  const bannerSrc = (user.banner_url && user.banner_url.trim() !== '') ? user.banner_url : '';
  const molduraSrc = (user.moldura_url && user.moldura_url.trim() !== '') ? user.moldura_url : '';

  const eCriador = Boolean(user.is_creator || user.is_criador);
  const htmlBadgesUser = renderizarBadgesVerificadosHomecard(user);
  const htmlStatusBadge = renderizarBadgeStatusHomecard(user.id, user.status || 'offline');

  const customStatusText = typeof window.obterHtmlCustomStatus === 'function' && user.custom_status
    ? window.obterHtmlCustomStatus(user.custom_status, user.status_emoji || '💬')
    : `<div class="custom-status-text"><span>${user.status_emoji || '💬'} ${user.custom_status ? sanitizarHtmlHomecard(user.custom_status) : 'Ver ou editar perfil'}</span></div>`;

  // 2. CONSTRUÇÃO DO CARD DO PRÓPRIO USUÁRIO (MEU CARD)
  const userCard = document.createElement('div');
  userCard.id = 'home-user-card';
  userCard.className = `home-user-card ${eCriador ? 'is-creator' : ''}`;
  userCard.title = 'Clique para ver ou editar seu perfil';
  userCard.setAttribute('role', 'button');
  userCard.setAttribute('tabindex', '0');

  if (bannerSrc) {
    userCard.style.backgroundImage = `linear-gradient(rgba(10, 5, 14, 0.65), rgba(10, 5, 14, 0.88)), url('${bannerSrc}')`;
  }

  userCard.onclick = () => {
    if (typeof window.abrirPerfil === 'function') {
      window.abrirPerfil(user);
    }
  };

  userCard.innerHTML = `
    <div class="card-avatar-section">
      <div class="avatar-wrapper">
        <img src="${avatarSrc}" class="card-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="${usernameText}">
        ${molduraSrc ? `<img src="${molduraSrc}" class="card-moldura" alt="Moldura">` : ''}
        ${htmlStatusBadge}
      </div>
    </div>
    <div class="card-info-section">
      <div class="card-stats-row">
        ${customStatusText}
      </div>
      <div class="card-main-row">
        <div class="card-display-name-group">
          <span class="card-display-name">${displayNameText}</span>
          ${htmlBadgesUser}
        </div>
        <span class="card-username">@${usernameText}</span>
      </div>
    </div>
    <button class="card-edit-quick-btn" id="btn-quick-edit-profile" title="Editar Perfil">
      <i class="fa-solid fa-pen-to-square"></i>
    </button>
  `;

  // Ação rápida de edição de perfil
  const btnEdit = userCard.querySelector('#btn-quick-edit-profile');
  if (btnEdit) {
    btnEdit.onclick = (e) => {
      e.stopPropagation();
      if (typeof window.abrirModalEditarPerfil === 'function') {
        window.abrirModalEditarPerfil();
      }
    };
  }

  // 3. ESTRUTURA DO PAINEL DE MEMBROS DA COMUNIDADE
  const serverUsersPanel = document.createElement('div');
  serverUsersPanel.className = 'server-users-panel';
  serverUsersPanel.innerHTML = `
    <div class="server-users-header">
      <div class="server-users-title" id="server-users-title-count">
        <i class="fa-solid fa-users"></i> Membros da Comunidade
      </div>
    </div>
    <div class="server-users-list" id="server-users-list">
      <div class="homecard-skeleton"></div>
      <div class="homecard-skeleton"></div>
      <div class="homecard-skeleton"></div>
      <div class="homecard-skeleton"></div>
    </div>
  `;

  wrapper.appendChild(userCard);
  wrapper.appendChild(serverUsersPanel);

  // Inserção no Container de Conteúdo
  const homeContent = document.querySelector('.home-content') || document.getElementById('home-screen');
  if (homeContent) {
    homeContent.insertBefore(wrapper, homeContent.firstChild);
  } else {
    document.body.appendChild(wrapper);
  }

  await carregarEIniciarRealtimeUsuarios(user.id);
}

// Carregamento da Lista de Membros e Inscrição em Tempo Real
async function carregarEIniciarRealtimeUsuarios(usuarioLogadoId) {
  const clientSupabase = obterSupabaseHomecard();

  async function atualizarLista() {
    const listContainer = document.getElementById('server-users-list');
    const titleContainer = document.getElementById('server-users-title-count');
    if (!listContainer) return;

    if (!clientSupabase) {
      listContainer.innerHTML = `
        <div class="homecard-error-msg">
          <i class="fa-solid fa-triangle-exclamation"></i> Conexão indisponível no momento.
        </div>`;
      return;
    }

    try {
      const { data: usuarios, error } = await clientSupabase
        .from('usuarios')
        .select('*');

      if (error || !usuarios) {
        listContainer.innerHTML = `
          <div class="homecard-error-msg">
            <i class="fa-solid fa-triangle-exclamation"></i> Falha ao sincronizar lista de membros.
          </div>`;
        return;
      }

      // Separa o próprio usuário logado dos demais membros
      const euMesmo = usuarios.find(u => String(u.id) === String(usuarioLogadoId));
      const outrosUsuarios = usuarios.filter(u => String(u.id) !== String(usuarioLogadoId));

      // Ordenação: Status (Online > Ausente > DND > Offline) e Nome
      outrosUsuarios.sort((a, b) => {
        const pesoA = obterPesoStatus(a.status);
        const pesoB = obterPesoStatus(b.status);
        if (pesoA !== pesoB) return pesoA - pesoB;

        const nomeA = (a.display_name || a.nome || a.username || '').toLowerCase();
        const nomeB = (b.display_name || b.nome || b.username || '').toLowerCase();
        return nomeA.localeCompare(nomeB);
      });

      const listaFinal = euMesmo ? [euMesmo, ...outrosUsuarios] : outrosUsuarios;

      // Métricas de Usuários Ativos
      const totalOnline = usuarios.filter(u => {
        const st = String(u.status || '').toLowerCase();
        return st === 'online' || st === 'ausente' || st === 'dnd' || st === 'ocupado';
      }).length;

      if (titleContainer) {
        titleContainer.innerHTML = `
          <i class="fa-solid fa-users"></i> Membros da Comunidade 
          <span class="online-count-badge">${totalOnline} Ativo${totalOnline === 1 ? '' : 's'} (${usuarios.length} total)</span>
        `;
      }

      const fragmento = document.createDocumentFragment();

      listaFinal.forEach(u => {
        const eUsuarioLogado = String(u.id) === String(usuarioLogadoId);
        const usernameClean = sanitizarHtmlHomecard(u.username || 'usuario');
        const displayNameClean = sanitizarHtmlHomecard(u.display_name || u.nome || usernameClean);

        const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(u.username || 'usuario')}`;
        const avatarSrc = (u.avatar_url && u.avatar_url.trim() !== '') ? u.avatar_url : defaultAvatar;
        const molduraSrc = (u.moldura_url && u.moldura_url.trim() !== '') ? u.moldura_url : '';

        const htmlStatus = renderizarBadgeStatusHomecard(u.id, u.status || 'offline');
        const htmlBadgesMember = renderizarBadgesVerificadosHomecard(u);

        const customStatusHtml = typeof window.obterHtmlCustomStatus === 'function' && u.custom_status
          ? window.obterHtmlCustomStatus(u.custom_status, u.status_emoji || '💬')
          : (u.custom_status ? `<div class="server-user-custom-status" title="${sanitizarHtmlHomecard(u.custom_status)}"><span>${u.status_emoji || '💬'}</span> <span>${sanitizarHtmlHomecard(u.custom_status)}</span></div>` : '');

        const userItem = document.createElement('div');
        userItem.className = `server-user-item ${eUsuarioLogado ? 'is-self' : ''}`;
        userItem.setAttribute('role', 'button');
        userItem.setAttribute('tabindex', '0');

        userItem.onclick = () => {
          if (typeof window.abrirPerfil === 'function') {
            window.abrirPerfil(u);
          }
        };

        const chatBtnHtml = !eUsuarioLogado ? `
          <button class="server-user-chat-quick-btn" title="Enviar Mensagem Direta" id="btn-chat-user-${u.id}">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        ` : '';

        userItem.innerHTML = `
          <div class="server-user-avatar-wrapper">
            <img src="${avatarSrc}" class="server-user-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="${usernameClean}">
            ${molduraSrc ? `<img src="${molduraSrc}" class="server-user-moldura" alt="Moldura">` : ''}
            ${htmlStatus}
          </div>
          <div class="server-user-info">
            <div class="server-user-names-row">
              <span class="server-user-display-name">${displayNameClean}</span>
              ${htmlBadgesMember}
              <span class="server-user-handle">@${usernameClean}</span>
            </div>
            ${customStatusHtml}
            <div class="server-user-tag-row">
              ${eUsuarioLogado ? '<span class="badge-you">Você</span>' : ''}
            </div>
          </div>
          ${chatBtnHtml}
        `;

        if (!eUsuarioLogado) {
          const btnChat = userItem.querySelector(`#btn-chat-user-${u.id}`);
          if (btnChat) {
            btnChat.onclick = (e) => {
              e.stopPropagation();
              if (typeof window.seleccionarConversaDirect === 'function') {
                window.seleccionarConversaDirect(u.id);
              } else if (typeof window.enviarMensagemParaUsuario === 'function') {
                window.enviarMensagemParaUsuario(u);
              } else if (typeof window.abrirChatComUsuario === 'function') {
                window.abrirChatComUsuario(u);
              } else if (typeof window.alternarAbaNav === 'function') {
                window.alternarAbaNav('chat');
              }
            };
          }
        }

        fragmento.appendChild(userItem);
      });

      listContainer.innerHTML = '';
      listContainer.appendChild(fragmento);

    } catch (err) {
      console.error("[HomeCard] Erro ao carregar membros da comunidade:", err);
      listContainer.innerHTML = `<div class="homecard-error-msg">Erro ao carregar membros da comunidade.</div>`;
    }
  }

  await atualizarLista();

  // Canal Realtime do Supabase para escutar alterações de usuários
  if (clientSupabase && typeof clientSupabase.channel === 'function') {
    if (inscricaoRealtimeUsuarios) {
      clientSupabase.removeChannel(inscricaoRealtimeUsuarios);
    }

    inscricaoRealtimeUsuarios = clientSupabase
      .channel('public:usuarios_homecard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => {
        atualizarLista();
      })
      .subscribe();
  }
}

// Ocultar, Exibir e Limpar Recursos do Homecard
function ocultarHomeCard() {
  const wrapper = document.getElementById('homecard-wrapper-container');
  if (wrapper) wrapper.classList.add('is-hidden');
}

function exibirHomeCard() {
  const wrapper = document.getElementById('homecard-wrapper-container');
  if (wrapper) wrapper.classList.remove('is-hidden');
}

function removerHomeCard() {
  const wrapper = document.getElementById('homecard-wrapper-container');
  if (wrapper) wrapper.remove();

  const sb = obtainingSupabaseHomecard();
  if (inscricaoRealtimeUsuarios && sb) {
    sb.removeChannel(inscricaoRealtimeUsuarios);
    inscricaoRealtimeUsuarios = null;
  }
}

// Helper seguro em escopo
function obtainingSupabaseHomecard() {
  return obterSupabaseHomecard();
}

// Exportações Globais
window.renderHomeCard = renderHomeCard;
window.ocultarHomeCard = ocultarHomeCard;
window.exibirHomeCard = exibirHomeCard;
window.removerHomeCard = removerHomeCard;
