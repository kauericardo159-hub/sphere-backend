// ==========================================================================
// MÓDULO HOMECARD & PAINEL DE COMUNIDADE (homecard.js) - SPHERE v5.2 PRO
// Integrado com social-actions.js, status.js, verificados.js & Realtime CDC
// ==========================================================================

(function (global) {
  'use strict';

  let inscricaoRealtimeUsuarios = null;
  let filtroBuscaAtual = '';
  let timerDebounceBusca = null;

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

  // Mapeamento de Peso Numérico para Ordenação por Presença
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

  function obterSupabaseHomecard() {
    return global.supabaseClient || global.supabase || global.sb || null;
  }

  function obterUsuarioLocalHomecard() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error("[HomeCard] Erro ao carregar usuário local:", e);
    }
    return null;
  }

  // Helper para acionar a abertura da conversa garantindo que a tela/interface de chat esteja ativa
  function direcionarParaChatGarantido(usuarioAlvo) {
    if (!usuarioAlvo) return;
    const targetId = typeof usuarioAlvo === 'object' ? Number(usuarioAlvo.id) : Number(usuarioAlvo);

    // 1. Desoculta a conversa caso tenha sido deletada/ocultada localmente
    if (typeof global.restaurarChatOcultoSeNecessario === 'function') {
      global.restaurarChatOcultoSeNecessario(targetId);
    }

    // 2. Se a interface gráfica do chat não estiver montada no DOM, abre primeiro
    if (!document.getElementById('chat-main-container') && typeof global.abrirInterfaceChat === 'function') {
      global.abrirInterfaceChat();
    }

    // 3. Muda a aba principal do site se houver gerenciador de navegação (ex: bottombar)
    if (typeof global.alternarAbaNav === 'function') {
      global.alternarAbaNav('chat');
    } else if (typeof global.mudarAba === 'function') {
      global.mudarAba('chat');
    }

    // 4. Executa a seleção do chat utilizando os métodos disponíveis na aplicação
    setTimeout(() => {
      if (typeof global.seleccionarConversaDirect === 'function') {
        global.seleccionarConversaDirect(usuarioAlvo);
      } else if (typeof global.enviarMensagemParaUsuario === 'function') {
        global.enviarMensagemParaUsuario(usuarioAlvo);
      } else if (typeof global.abrirChatComUsuario === 'function') {
        global.abrirChatComUsuario(usuarioAlvo);
      } else if (typeof global.cliqueItemContato === 'function') {
        global.cliqueItemContato(targetId);
      }
    }, 50);
  }

  // Badge de Status (Ponto colorido)
  function renderizarBadgeStatusHomecard(usuarioId, statusAtual) {
    const st = statusAtual || 'offline';
    const htmlDot = typeof global.obterHtmlStatusDot === 'function'
      ? global.obterHtmlStatusDot(st, usuarioId)
      : `<span class="status-dot ${String(st).toLowerCase()}" data-user-status-id="${usuarioId}"></span>`;

    return `<div class="avatar-status-badge">${htmlDot}</div>`;
  }

  // Badges e Verificados (Integrado ao verificados.js)
  function renderizarBadgesVerificadosHomecard(usuario) {
    if (!usuario) return '';

    if (typeof global.obterHtmlBadgesUsuario === 'function') {
      return global.obterHtmlBadgesUsuario(usuario);
    }

    return '';
  }

  // Consulta a lista de IDs de amigos confirmados
  async function obterListaIdsAmigos(meuId) {
    const sb = obterSupabaseHomecard();
    if (!sb || !meuId) return new Set();

    try {
      const { data, error } = await sb
        .from('amizades')
        .select('usuario_id_1, usuario_id_2')
        .eq('status', 'aceito')
        .or(`usuario_id_1.eq.${meuId},usuario_id_2.eq.${meuId}`);

      if (error || !data) return new Set();

      const conjuntoAmigos = new Set();
      data.forEach(rel => {
        const idAmigo = Number(rel.usuario_id_1) === Number(meuId) ? Number(rel.usuario_id_2) : Number(rel.usuario_id_1);
        conjuntoAmigos.add(idAmigo);
      });

      return conjuntoAmigos;
    } catch (err) {
      console.error("[HomeCard] Erro ao obter lista de amigos:", err);
      return new Set();
    }
  }

  // Construtor do HTML do Recado Dinâmico (Sem ícone padrão forçado)
  function construirHtmlRecadoCustom(frase = '', emoji = '') {
    const temFrase = typeof frase === 'string' && frase.trim() !== '';
    const temEmoji = typeof emoji === 'string' && emoji.trim() !== '';

    if (!temFrase && !temEmoji) return '';

    if (typeof global.obterHtmlCustomStatus === 'function') {
      return global.obterHtmlCustomStatus(frase, emoji);
    }

    const fraseLimpa = temFrase ? sanitizarHtmlHomecard(frase.trim()) : '';
    const emojiHtml = temEmoji ? `<i class="custom-status-emoji">${sanitizarHtmlHomecard(emoji.trim())}</i>` : '';
    const textoHtml = temFrase ? `<span>${fraseLimpa}</span>` : '';

    return `<div class="custom-status-text" title="${fraseLimpa || 'Recado'}">${emojiHtml}${textoHtml}</div>`;
  }

  // Item de Usuário da Lista de Comunidade
  function criarElementoUsuarioLista(u, eUsuarioLogado = false) {
    const displayNameClean = sanitizarHtmlHomecard(u.display_name || u.nome || u.username || 'Usuário');
    const usernameClean = sanitizarHtmlHomecard(u.username || 'usuario');
    const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(u.username || 'usuario')}`;
    const avatarSrc = (u.avatar_url && u.avatar_url.trim() !== '') ? u.avatar_url : defaultAvatar;
    const molduraSrc = (u.moldura_url && u.moldura_url.trim() !== '') ? u.moldura_url : '';

    const htmlStatus = renderizarBadgeStatusHomecard(u.id, u.status || 'offline');
    const htmlBadgesMember = renderizarBadgesVerificadosHomecard(u);

    // Recado Customizado sem emoji padrão forçado
    const textoRecado = u.custom_status || u.recado || '';
    const emojiRecado = u.status_emoji || u.emoji || '';
    const recadoHtml = construirHtmlRecadoCustom(textoRecado, emojiRecado);

    const userItem = document.createElement('div');
    userItem.className = `server-user-item ${eUsuarioLogado ? 'is-self' : ''}`;
    userItem.setAttribute('role', 'button');
    userItem.setAttribute('tabindex', '0');

    userItem.onclick = () => {
      if (typeof global.abrirPerfil === 'function') {
        global.abrirPerfil(u);
      }
    };

    const chatBtnHtml = !eUsuarioLogado ? `
      <button class="server-user-chat-quick-btn" title="Enviar Mensagem Direta" id="btn-chat-user-${u.id}">
        <i class="fa-solid fa-paper-plane"></i>
      </button>
    ` : '';

    userItem.innerHTML = `
      <div class="server-user-avatar-wrapper">
        <img src="${avatarSrc}" class="server-user-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="${displayNameClean}">
        ${molduraSrc ? `<img src="${molduraSrc}" class="server-user-moldura" alt="Moldura">` : ''}
        ${htmlStatus}
      </div>
      <div class="server-user-info">
        <div class="server-user-names-row">
          <span class="server-user-display-name">${displayNameClean}</span>
          <span class="server-user-username">@${usernameClean}</span>
          ${htmlBadgesMember}
          ${eUsuarioLogado ? '<span class="badge-you" style="margin-left: 4px; font-size: 0.65rem; background: rgba(255,255,255,0.12); padding: 1px 6px; border-radius: 8px;">Você</span>' : ''}
        </div>
        ${recadoHtml}
      </div>
      ${chatBtnHtml}
    `;

    if (!eUsuarioLogado) {
      const btnChat = userItem.querySelector(`#btn-chat-user-${u.id}`);
      if (btnChat) {
        btnChat.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          direcionarParaChatGarantido(u);
        };
      }
    }

    return userItem;
  }

  // Renderizador Principal
  async function renderHomeCard(usuario) {
    const user = usuario || obterUsuarioLocalHomecard();
    if (!user || user.id === undefined) return;

    removerHomeCard();

    const wrapper = document.createElement('div');
    wrapper.id = 'homecard-wrapper-container';
    wrapper.className = 'homecard-wrapper-container';

    // DADOS DO USUÁRIO LOGADO
    const displayNameText = sanitizarHtmlHomecard(user.display_name || user.nome || user.username || 'Usuário');
    const usernameText = sanitizarHtmlHomecard(user.username || 'usuario');
    const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(user.username || 'usuario')}`;
    const avatarSrc = (user.avatar_url && user.avatar_url.trim() !== '') ? user.avatar_url : defaultAvatar;
    const bannerSrc = (user.banner_url && user.banner_url.trim() !== '') ? user.banner_url : '';
    const molduraSrc = (user.moldura_url && user.moldura_url.trim() !== '') ? user.moldura_url : '';

    const corBg1 = user.cor_bg1 || user.cor_tema || '#ff2d55';
    const corBg2 = user.cor_bg2 || user.cor_tema || '#ff7675';
    const corGradient = corBg1 !== corBg2 ? `linear-gradient(135deg, ${corBg1}, ${corBg2})` : corBg1;

    const eCriador = Boolean(user.is_creator || user.is_criador);
    const htmlBadgesUser = renderizarBadgesVerificadosHomecard(user);
    const htmlStatusBadge = renderizarBadgeStatusHomecard(user.id, user.status || 'offline');

    const textoRecadoUser = user.custom_status || user.recado || '';
    const emojiRecadoUser = user.status_emoji || user.emoji || '';
    
    let customStatusText = construirHtmlRecadoCustom(textoRecadoUser, emojiRecadoUser);
    if (!customStatusText) {
      customStatusText = `<div class="custom-status-text"><span class="perfil-bio-empty">Clique para abrir seu perfil</span></div>`;
    }

    // 1. MEU CARD DE DESTAQUE
    const userCard = document.createElement('div');
    userCard.id = 'home-user-card';
    userCard.className = `home-user-card ${eCriador ? 'is-creator' : ''}`;
    userCard.style.setProperty('--user-theme-color', corBg1);
    userCard.style.setProperty('--user-theme-gradient', corGradient);
    userCard.style.setProperty('--user-theme-glow', `${corBg1}40`);

    if (bannerSrc) {
      userCard.style.backgroundImage = `linear-gradient(rgba(10, 5, 14, 0.65), rgba(10, 5, 14, 0.90)), url('${bannerSrc}')`;
    }

    userCard.onclick = () => {
      if (typeof global.abrirPerfil === 'function') {
        global.abrirPerfil(user);
      }
    };

    userCard.innerHTML = `
      <div class="card-avatar-section">
        <div class="avatar-wrapper">
          <img src="${avatarSrc}" class="card-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="${displayNameText}">
          ${molduraSrc ? `<img src="${molduraSrc}" class="card-moldura" alt="Moldura">` : ''}
          ${htmlStatusBadge}
        </div>
      </div>
      <div class="card-info-section">
        <div class="card-main-row">
          <div class="card-display-name-group">
            <span class="card-display-name">${displayNameText}</span>
            <span class="card-username">@${usernameText}</span>
            ${htmlBadgesUser}
          </div>
        </div>
        <div class="card-stats-row">
          ${customStatusText}
        </div>
      </div>
      <button class="card-edit-quick-btn" id="btn-quick-edit-profile" title="Editar Perfil">
        <i class="fa-solid fa-pen-to-square"></i>
      </button>
    `;

    const btnEdit = userCard.querySelector('#btn-quick-edit-profile');
    if (btnEdit) {
      btnEdit.onclick = (e) => {
        e.stopPropagation();
        if (typeof global.abrirModalEditarPerfil === 'function') {
          global.abrirModalEditarPerfil();
        }
      };
    }

    // 2. PAINEL DA COMUNIDADE COM CAMPO DE BUSCA
    const serverUsersPanel = document.createElement('div');
    serverUsersPanel.className = 'server-users-panel';
    serverUsersPanel.innerHTML = `
      <div class="server-users-header">
        <div class="server-users-title" id="server-users-title-count">
          <i class="fa-solid fa-users"></i> Comunidade Sphere
        </div>
        <div class="homecard-search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input type="text" id="homecard-filter-input" placeholder="Buscar membros..." value="${sanitizarHtmlHomecard(filtroBuscaAtual)}">
        </div>
      </div>
      <div class="server-users-list" id="server-users-list">
        <div class="homecard-skeleton"></div>
        <div class="homecard-skeleton"></div>
        <div class="homecard-skeleton"></div>
      </div>
    `;

    wrapper.appendChild(userCard);
    wrapper.appendChild(serverUsersPanel);

    const homeContent = document.querySelector('.home-content') || document.getElementById('home-screen');
    if (homeContent) {
      homeContent.insertBefore(wrapper, homeContent.firstChild);
    } else {
      document.body.appendChild(wrapper);
    }

    const inputSearch = serverUsersPanel.querySelector('#homecard-filter-input');
    if (inputSearch) {
      inputSearch.addEventListener('input', (e) => {
        filtroBuscaAtual = e.target.value.toLowerCase().trim();
        clearTimeout(timerDebounceBusca);
        timerDebounceBusca = setTimeout(() => {
          carregarEIniciarRealtimeUsuarios(user.id);
        }, 200);
      });
    }

    await carregarEIniciarRealtimeUsuarios(user.id);
  }

  // Carregamento e Ordenação em Tempo Real
  async function carregarEIniciarRealtimeUsuarios(usuarioLogadoId) {
    const clientSupabase = obterSupabaseHomecard();

    async function atualizarLista() {
      const listContainer = document.getElementById('server-users-list');
      const titleContainer = document.getElementById('server-users-title-count');
      if (!listContainer) return;

      if (!clientSupabase) {
        listContainer.innerHTML = `
          <div class="homecard-error-msg">
            <i class="fa-solid fa-triangle-exclamation"></i> Conexão indisponível.
          </div>`;
        return;
      }

      try {
        const [resUsuarios, conjuntoAmigos] = await Promise.all([
          clientSupabase.from('usuarios').select('*'),
          obterListaIdsAmigos(usuarioLogadoId)
        ]);

        const usuarios = resUsuarios.data;
        if (resUsuarios.error || !usuarios) {
          listContainer.innerHTML = `
            <div class="homecard-error-msg">
              <i class="fa-solid fa-triangle-exclamation"></i> Falha ao sincronizar membros.
            </div>`;
          return;
        }

        // Métricas de Usuários Ativos
        const totalOnline = usuarios.filter(u => {
          const st = String(u.status || '').toLowerCase();
          return st === 'online' || st === 'ausente' || st === 'dnd' || st === 'ocupado';
        }).length;

        if (titleContainer) {
          titleContainer.innerHTML = `
            <i class="fa-solid fa-users"></i> Comunidade Sphere 
            <span class="online-count-badge" style="font-size: 0.72rem; opacity: 0.8; margin-left: 6px;">(${totalOnline} online de ${usuarios.length})</span>
          `;
        }

        let outrosUsuarios = usuarios.filter(u => Number(u.id) !== Number(usuarioLogadoId));

        if (filtroBuscaAtual) {
          outrosUsuarios = outrosUsuarios.filter(u => {
            const nome = (u.display_name || u.nome || '').toLowerCase();
            const nick = (u.username || '').toLowerCase();
            return nome.includes(filtroBuscaAtual) || nick.includes(filtroBuscaAtual);
          });
        }

        const listaAmigos = [];
        const listaMembros = [];

        outrosUsuarios.forEach(u => {
          if (conjuntoAmigos.has(Number(u.id))) {
            listaAmigos.push(u);
          } else {
            listaMembros.push(u);
          }
        });

        const ordenarComunidade = (a, b) => {
          const pesoA = obterPesoStatus(a.status);
          const pesoB = obterPesoStatus(b.status);
          if (pesoA !== pesoB) return pesoA - pesoB;

          const nomeA = (a.display_name || a.nome || a.username || '').toLowerCase();
          const nomeB = (b.display_name || b.nome || b.username || '').toLowerCase();
          return nomeA.localeCompare(nomeB);
        };

        listaAmigos.sort(ordenarComunidade);
        listaMembros.sort(ordenarComunidade);

        const fragmento = document.createDocumentFragment();

        // --- SEÇÃO 1: AMIGOS ---
        const tituloAmigos = document.createElement('div');
        tituloAmigos.className = 'homecard-section-header';
        tituloAmigos.innerHTML = `<i class="fa-solid fa-user-group"></i> Amigos (${listaAmigos.length})`;
        fragmento.appendChild(tituloAmigos);

        if (listaAmigos.length > 0) {
          listaAmigos.forEach(u => {
            fragmento.appendChild(criarElementoUsuarioLista(u, false));
          });
        } else {
          const vazioAmigos = document.createElement('div');
          vazioAmigos.className = 'homecard-empty-section';
          vazioAmigos.style.cssText = "padding: 8px 12px; font-size: 0.78rem; color: #8e7f96;";
          vazioAmigos.textContent = filtroBuscaAtual ? 'Nenhum amigo encontrado na busca.' : 'Nenhum amigo adicionado ainda.';
          fragmento.appendChild(vazioAmigos);
        }

        // --- DIVISOR ---
        const divisor = document.createElement('hr');
        divisor.className = 'homecard-section-divider';
        divisor.style.cssText = "border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 8px 0;";
        fragmento.appendChild(divisor);

        // --- SEÇÃO 2: MEMBROS DA COMUNIDADE ---
        const tituloMembros = document.createElement('div');
        tituloMembros.className = 'homecard-section-header';
        tituloMembros.innerHTML = `<i class="fa-solid fa-globe"></i> Outros Membros (${listaMembros.length})`;
        fragmento.appendChild(tituloMembros);

        if (listaMembros.length > 0) {
          listaMembros.forEach(u => {
            fragmento.appendChild(criarElementoUsuarioLista(u, false));
          });
        } else {
          const vazioMembros = document.createElement('div');
          vazioMembros.className = 'homecard-empty-section';
          vazioMembros.style.cssText = "padding: 8px 12px; font-size: 0.78rem; color: #8e7f96;";
          vazioMembros.textContent = filtroBuscaAtual ? 'Nenhum membro encontrado na busca.' : 'Nenhum outro membro encontrado.';
          fragmento.appendChild(vazioMembros);
        }

        listContainer.innerHTML = '';
        listContainer.appendChild(fragmento);

      } catch (err) {
        console.error("[HomeCard] Erro ao carregar membros:", err);
        listContainer.innerHTML = `<div class="homecard-error-msg">Erro ao carregar membros da comunidade.</div>`;
      }
    }

    await atualizarLista();

    // Sincronização em Tempo Real Segura (Realtime CDC Supabase)
    if (clientSupabase && typeof clientSupabase.channel === 'function') {
      if (inscricaoRealtimeUsuarios) {
        try {
          clientSupabase.removeChannel(inscricaoRealtimeUsuarios);
        } catch (e) {
          console.warn("[HomeCard] Erro ao limpar canal realtime:", e);
        }
      }

      inscricaoRealtimeUsuarios = clientSupabase
        .channel('public:usuarios_e_amizades_homecard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => {
          atualizarLista();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'amizades' }, () => {
          atualizarLista();
        })
        .subscribe();
    }
  }

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
      try {
        sb.removeChannel(inscricaoRealtimeUsuarios);
      } catch (e) {
        console.warn("[HomeCard] Erro ao remover canal realtime:", e);
      }
      inscricaoRealtimeUsuarios = null;
    }
  }

  // Exportações Globais
  global.renderHomeCard = renderHomeCard;
  global.ocultarHomeCard = ocultarHomeCard;
  global.exibirHomeCard = exibirHomeCard;
  global.removerHomeCard = removerHomeCard;

})(typeof window !== 'undefined' ? window : this);
