// ==========================================================================
// MÓDULO HOMECARD & PAINEL DE MEMBROS DA COMUNIDADE (homecard.js)
// Project Z Enhanced v5.0 | Alta Performance, Supabase Realtime & UI/UX Viva
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

// Mapeamento de Peso Numérico para Ordenação
function obterPesoStatus(status) {
  const st = (status || 'offline').toLowerCase();
  switch (st) {
    case 'online': 
      return 1;
    case 'ausente': 
    case 'idle': 
    case 'ausente_auto': 
      return 2;
    case 'dnd': 
    case 'ocupado': 
      return 3;
    case 'offline': 
    case 'invisivel':
    default: 
      return 4;
  }
}

// Resolução Segura do Instância Global do Supabase
function obterSupabaseHomecard() {
  return window.supabaseClient || window.supabase || window.sb || null;
}

// Resolução de Usuário do LocalStorage com Fallback
function obterUsuarioLocalHomecard() {
  try {
    const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("[HomeCard] Erro ao parsear usuário do localStorage:", e);
  }
  return null;
}

// Renders do Badge de Status em Sincronia com status.js
function extrairHtmlStatusBadge(usuarioId, statusAtual) {
  if (typeof window.obterHtmlStatusDot === 'function') {
    const htmlDot = window.obterHtmlStatusDot(statusAtual);
    // Injeta dinamicamente data-user-status-id na tag do indicador se status.js já não o tiver feito
    if (htmlDot.includes('data-user-status-id')) {
      return `<div class="avatar-status-badge">${htmlDot}</div>`;
    }
    return `<div class="avatar-status-badge">${htmlDot.replace('class="status-dot', `data-user-status-id="${usuarioId}" class="status-dot`)}</div>`;
  }
  
  // Fallback visual caso status.js não tenha carregado a tempo
  const info = window.obterInfoStatus ? window.obterInfoStatus(statusAtual) : { classe: (statusAtual || 'offline').toLowerCase(), label: 'Offline' };
  return `
    <div class="avatar-status-badge">
      <span class="status-dot ${info.classe}" data-user-status-id="${usuarioId}" title="${info.label}"></span>
    </div>
  `;
}

// Renderizador Principal do Container Homecard
async function renderHomeCard(usuario) {
  const user = usuario || obterUsuarioLocalHomecard();
  if (!user || !user.id) return;

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
  
  const eCriador = Boolean(user.is_creator);
  const htmlTag = typeof window.obterHtmlTag === 'function' ? window.obterHtmlTag(user) : '';
  const htmlStatusBadge = extrairHtmlStatusBadge(user.id, user.status);

  const statusEmoji = user.status_emoji || '💬';
  const customStatusText = user.custom_status ? sanitizarHtmlHomecard(user.custom_status) : 'Ver ou editar perfil';
  const statsText = `${statusEmoji} ${customStatusText}`;

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
        <span class="card-stats-text" title="Seu recado atual">${statsText}</span>
      </div>
      <div class="card-main-row">
        <span class="card-display-name">${displayNameText}</span>
        <span class="card-username">@${usernameText}</span>
        ${htmlTag}
      </div>
    </div>
    <button class="card-edit-quick-btn" id="btn-quick-edit-profile" title="Editar Perfil">
      <i class="fa-solid fa-pen-to-square"></i>
    </button>
  `;

  // Previne que a ação rápida de edição abra o perfil e dispara o modal
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

  // Inserção Inteligente no topo do Container de Conteúdo
  const homeContent = document.querySelector('.home-content') || document.getElementById('home-screen');
  if (homeContent) {
    homeContent.insertBefore(wrapper, homeContent.firstChild);
  } else {
    document.body.appendChild(wrapper);
  }

  await carregarEIniciarRealtimeUsuarios(user.id);
}

// Carregamento de Lista com Supabase Realtime e Otimização DOM
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

      // Separa o próprio usuário logado dos demais membros da comunidade
      const euMesmo = usuarios.find(u => String(u.id) === String(usuarioLogadoId));
      const outrosUsuarios = usuarios.filter(u => String(u.id) !== String(usuarioLogadoId));

      // Ordenação Primária por Status (Online > Ausente > DND > Offline) e Secundária por Display Name / Username
      outrosUsuarios.sort((a, b) => {
        const pesoA = obterPesoStatus(a.status);
        const pesoB = obterPesoStatus(b.status);
        if (pesoA !== pesoB) return pesoA - pesoB;
        
        const nomeA = (a.display_name || a.nome || a.username || '').toLowerCase();
        const nomeB = (b.display_name || b.nome || b.username || '').toLowerCase();
        return nomeA.localeCompare(nomeB);
      });

      const listaFinal = euMesmo ? [euMesmo, ...outrosUsuarios] : outrosUsuarios;

      // Cálculo de Métricas (Contagem Real de Ativos vs Total)
      const totalOnline = usuarios.filter(u => {
        const st = (u.status || '').toLowerCase();
        return st === 'online' || st === 'ausente' || st === 'dnd';
      }).length;

      if (titleContainer) {
        titleContainer.innerHTML = `
          <i class="fa-solid fa-users"></i> Membros da Comunidade 
          <span class="online-count-badge">${totalOnline} Ativo${totalOnline === 1 ? '' : 's'} (${usuarios.length} total)</span>
        `;
      }

      // Fragmento para minimização de Reflows no DOM
      const fragmento = document.createDocumentFragment();

      listaFinal.forEach(u => {
        const eUsuarioLogado = String(u.id) === String(usuarioLogadoId);
        const usernameClean = sanitizarHtmlHomecard(u.username || 'usuario');
        const displayNameClean = sanitizarHtmlHomecard(u.display_name || u.nome || usernameClean);
        
        const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(u.username || 'usuario')}`;
        const avatarSrc = (u.avatar_url && u.avatar_url.trim() !== '') ? u.avatar_url : defaultAvatar;
        const molduraSrc = (u.moldura_url && u.moldura_url.trim() !== '') ? u.moldura_url : '';
        
        const htmlStatus = extrairHtmlStatusBadge(u.id, u.status);
        const htmlTag = typeof window.obterHtmlTag === 'function' ? window.obterHtmlTag(u) : '';

        const emojiRecado = u.status_emoji || '💬';
        const recadoTexto = u.custom_status ? sanitizarHtmlHomecard(u.custom_status) : '';

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
              <span class="server-user-handle">@${usernameClean}</span>
            </div>
            ${recadoTexto ? `
              <div class="server-user-custom-status" title="${recadoTexto}">
                <span>${emojiRecado}</span> <span>${recadoTexto}</span>
              </div>
            ` : ''}
            <div class="server-user-tag-row">
              ${eUsuarioLogado ? '<span class="badge-you">Você</span>' : ''}
              ${htmlTag}
            </div>
          </div>
          ${chatBtnHtml}
        `;

        // Atribuição isolada de evento de chat sem acionar a abertura do perfil
        if (!eUsuarioLogado) {
          const btnChat = userItem.querySelector(`#btn-chat-user-${u.id}`);
          if (btnChat) {
            btnChat.onclick = (e) => {
              e.stopPropagation();
              if (typeof window.enviarMensagemParaUsuario === 'function') {
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

  // Gerenciamento de Canal Realtime no Supabase
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

// Funções de Visibilidade e Limpeza de Recursos
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

  const sb = obterSupabaseHomecard();
  if (inscricaoRealtimeUsuarios && sb) {
    sb.removeChannel(inscricaoRealtimeUsuarios);
    inscricaoRealtimeUsuarios = null;
  }
}

// Exportações Globais
window.renderHomeCard = renderHomeCard;
window.ocultarHomeCard = ocultarHomeCard;
window.exibirHomeCard = exibirHomeCard;
window.removerHomeCard = removerHomeCard;
