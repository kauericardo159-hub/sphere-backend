// ==========================================================================
// LIST CHAT MODULE (listchat.js) - SPHERE v5.2 PRO
// Gerenciamento de Recentes, Solicitações, Presença & Integ. verificados.js
// Desocultamento Automático, Filtro de Contas Banidas/Desativadas e CDC
// ==========================================================================

(function (global) {
  'use strict';

  global.listaContatosCache = [];
  global.listaSolicitacoesCache = [];
  let chatsFixadosIDs = JSON.parse(localStorage.getItem('chat_fixados_ids') || '[]');
  let abaListaAtiva = 'todas'; // 'todas' ou 'solicitacoes'
  let canalRealtimeListChat = null;
  let timerDebounceBusca = null;

  // Helper para Obtenção Segura do Supabase Client
  function obterSupabaseListChat() {
    return global.supabaseClient || global.supabase || global.sb || null;
  }

  // Obter Usuário Logado via LocalStorage
  function obterUsuarioLogadoListChat() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('[ListChat] Erro ao carregar usuário logado:', e);
    }
    return null;
  }

  // Sanitização Contra Injeções XSS
  function sanitizarTexto(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Formatação de Data Compacta
  function formatarDataCurta(timestamp) {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      const hoje = new Date();
      const eHoje = d.toDateString() === hoje.toDateString();
      return eHoje 
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  // Trata e formata a exibição do preview de última mensagem
  function formatarPreviewUltimaMsg(msgRaw, eMinha = false) {
    if (!msgRaw) return 'Inicie a conversa...';
    
    let textoClean = sanitizarTexto(msgRaw);
    const prefixo = eMinha ? '<span style="color: var(--chat-user-bg1, #ff2d55); font-weight:700;">Você:</span> ' : '';

    // Detecção de URLs de imagens / mídias enviadas
    if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(msgRaw) || msgRaw.includes('data:image')) {
      return `${prefixo}<i class="fa-solid fa-camera"></i> Imagem`;
    }
    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(msgRaw)) {
      return `${prefixo}<i class="fa-solid fa-video"></i> Vídeo`;
    }
    if (/\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(msgRaw)) {
      return `${prefixo}<i class="fa-solid fa-microphone"></i> Áudio`;
    }

    return `${prefixo}${textoClean}`;
  }

  /**
   * Renderização de Badges Limpa (Limitado a até 2 ícones)
   */
  function renderizarBadgesLimposListChat(usuario) {
    if (!usuario) return '';

    if (typeof global.obterHtmlBadgesUsuario === 'function') {
      return global.obterHtmlBadgesUsuario(usuario);
    }

    if (typeof global.renderizarBadgesLimposHeaderChat === 'function') {
      return global.renderizarBadgesLimposHeaderChat(usuario);
    }

    return '';
  }

  function alternarSidebarChat(forcarAbertura) {
    const sidebar = document.getElementById('chat-sidebar');
    const overlay = document.getElementById('chat-sidebar-overlay');
    const feed = document.getElementById('chat-messages-feed');
    if (!sidebar) return;

    const deveAbrir = typeof forcarAbertura === 'boolean' ? forcarAbertura : !sidebar.classList.contains('open');

    if (deveAbrir) {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('open');
      if (feed) feed.classList.add('chat-feed-paused');
    } else {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      if (feed) feed.classList.remove('chat-feed-paused');
    }

    if (typeof global.sincronizarEstadoBarraNoChat === 'function') {
      global.sincronizarEstadoBarraNoChat();
    }
  }

  // ========================================================================
  // RESTAURAÇÃO DE CHATS OCULTOS / DELETADOS
  // ========================================================================
  function restaurarChatOcultoSeNecessario(idAlvo) {
    if (!idAlvo) return;
    const alvoNum = Number(idAlvo);
    let removidos = JSON.parse(localStorage.getItem('chat_removidos_ids') || '[]');

    if (removidos.includes(alvoNum)) {
      removidos = removidos.filter(id => Number(id) !== alvoNum);
      localStorage.setItem('chat_removidos_ids', JSON.stringify(removidos));
    }
  }

  // ========================================================================
  // CARREGAMENTO DA LISTA DE CONVERSAS (DIRECTS E SOLICITAÇÕES)
  // ========================================================================
  async function carregarListaConversas() {
    const listContainer = document.getElementById('chat-list-container');
    if (!listContainer) return;

    const usuarioLogado = obterUsuarioLogadoListChat();
    const clientSupabase = obterSupabaseListChat();

    if (!usuarioLogado || !clientSupabase) {
      listContainer.innerHTML = `<div class="chat-list-error"><i class="fa-solid fa-triangle-exclamation"></i><span>Conexão indisponível.</span></div>`;
      return;
    }

    try {
      const meId = Number(usuarioLogado.id);

      // Header com Botão Notificação
      const headerSidebar = document.querySelector('.chat-sidebar-header');
      if (headerSidebar) {
        headerSidebar.innerHTML = `
          <h3><i class="fa-solid fa-comments"></i> Mensagens</h3>
          <button class="btn-header-action-icon" onclick="if(typeof window.abrirPainelNotChat === 'function') window.abrirPainelNotChat()" title="Central de Notificações">
            <i class="fa-solid fa-bell"></i>
          </button>
        `;
      }

      // Buscar mensagens enviadas e recebidas simultaneamente
      const [resEnviadas, resRecebidas, resAmizades1, resAmizades2] = await Promise.all([
        clientSupabase.from('mensagens').select('destinatario_id, conteudo, created_at').eq('remetente_id', meId).order('created_at', { ascending: false }),
        clientSupabase.from('mensagens').select('remetente_id, conteudo, created_at, lida').eq('destinatario_id', meId).order('created_at', { ascending: false }),
        clientSupabase.from('amizades').select('usuario_id_2').eq('usuario_id_1', meId).eq('status', 'aceito'),
        clientSupabase.from('amizades').select('usuario_id_1').eq('usuario_id_2', meId).eq('status', 'aceito')
      ]);

      const msgsEnviadas = resEnviadas.data || [];
      const msgsRecebidas = resRecebidas.data || [];

      // Conjunto de Amizades Confirmadas
      let amizadesIDs = new Set();
      if (resAmizades1.data) resAmizades1.data.forEach(a => amizadesIDs.add(Number(a.usuario_id_2)));
      if (resAmizades2.data) resAmizades2.data.forEach(a => amizadesIDs.add(Number(a.usuario_id_1)));

      let idsContatosMap = new Map();
      let totalNaoLidasGeral = 0;

      // 1. Processa mensagens enviadas por mim
      if (msgsEnviadas) {
        msgsEnviadas.forEach(m => {
          const id = Number(m.destinatario_id);
          const atual = idsContatosMap.get(id);

          if (!atual || new Date(m.created_at) > new Date(atual.data)) {
            idsContatosMap.set(id, { 
              ultimaMsg: m.conteudo, 
              data: m.created_at, 
              naoLidas: atual ? atual.naoLidas : 0, 
              eMinha: true,
              euInicieiConversa: true
            });
          }
        });
      }

      // 2. Processa mensagens recebidas por mim
      if (msgsRecebidas) {
        msgsRecebidas.forEach(m => {
          const id = Number(m.remetente_id);
          const atual = idsContatosMap.get(id) || { naoLidas: 0, euInicieiConversa: false };
          const qtdNaoLidas = (!m.lida ? (atual.naoLidas || 0) + 1 : atual.naoLidas || 0);

          if (!m.lida) {
            totalNaoLidasGeral++;
            restaurarChatOcultoSeNecessario(id);
          }

          if (!atual.data || new Date(m.created_at) > new Date(atual.data)) {
            idsContatosMap.set(id, { 
              ultimaMsg: m.conteudo, 
              data: m.created_at, 
              naoLidas: qtdNaoLidas, 
              eMinha: false,
              euInicieiConversa: atual.euInicieiConversa
            });
          } else {
            idsContatosMap.set(id, { ...atual, naoLidas: qtdNaoLidas });
          }
        });
      }

      // Adiciona amigos mesmo sem histórico prévio de mensagens
      amizadesIDs.forEach(id => {
        if (!idsContatosMap.has(id)) {
          idsContatosMap.set(id, { ultimaMsg: 'Inicie a conversa...', data: null, naoLidas: 0, eMinha: false, euInicieiConversa: false });
        }
      });

      // Se existir um chat alvo recém-selecionado (ex: via perfil), garante que esteja presente no mapa
      if (global.chatTargetAtual && global.chatTargetAtual.id) {
        const targetId = Number(global.chatTargetAtual.id);
        if (targetId && targetId !== meId && !idsContatosMap.has(targetId)) {
          idsContatosMap.set(targetId, { ultimaMsg: 'Inicie a conversa...', data: null, naoLidas: 0, eMinha: false, euInicieiConversa: true });
        }
      }

      const idsValidos = Array.from(idsContatosMap.keys()).filter(id => !isNaN(id) && id > 0 && id !== meId);
      let chatsRemovidosIDs = JSON.parse(localStorage.getItem('chat_removidos_ids') || '[]');
      const aceitosManualmenteIDs = JSON.parse(localStorage.getItem('chat_aceitos_manual_ids') || '[]');

      // Filtra os ocultos (que não tiveram novas mensagens)
      const idsFinais = idsValidos.filter(id => !chatsRemovidosIDs.includes(id));

      if (idsFinais.length === 0) {
        global.listaContatosCache = [];
        global.listaSolicitacoesCache = [];
        renderizarAbaEListaChat();
        return;
      }

      const { data: usuarios } = await clientSupabase.from('usuarios').select('*').in('id', idsFinais);
      
      let normais = [];
      let solicitacoes = [];

      if (usuarios) {
        usuarios.forEach(u => {
          // Filtra contas desativadas, suspensas ou banidas para não poluir a listagem
          const estaBanido = Boolean(u.is_banned) || u.status_conta === 'banida' || u.status_conta === 'suspensa';
          const estaDesativado = u.status_conta === 'desativada';

          if (estaBanido || estaDesativado) return;

          const idNum = Number(u.id);
          const info = idsContatosMap.get(idNum);
          const eAmigo = amizadesIDs.has(idNum);
          const euInicieiConversa = info ? info.euInicieiConversa : false;
          const aceitoManual = aceitosManualmenteIDs.includes(idNum);

          const itemData = {
            ...u,
            ultimaMsgRaw: info?.ultimaMsg || '',
            dataUltimaMsg: info?.data || null,
            naoLidas: info?.naoLidas || 0,
            eMinha: info?.eMinha || false
          };

          if (!eAmigo && !euInicieiConversa && !aceitoManual) {
            solicitacoes.push(itemData);
          } else {
            normais.push(itemData);
          }
        });
      }

      global.listaContatosCache = normais;
      global.listaSolicitacoesCache = solicitacoes;

      // Atualiza a badge vermelha na pílula flutuante
      if (typeof global.atualizarBadgeNotificacaoChat === 'function') {
        global.atualizarBadgeNotificacaoChat(totalNaoLidasGeral + solicitacoes.length);
      }

      renderizarAbaEListaChat();
      iniciarRealtimeListChat(meId);

    } catch (err) {
      console.error("[ListChat] Erro ao carregar contatos:", err);
    }
  }

  function alternarAbaListaChat(aba) {
    abaListaAtiva = aba;
    renderizarAbaEListaChat();
  }

  function renderizarAbaEListaChat() {
    const sidebar = document.getElementById('chat-sidebar');
    if (!sidebar) return;

    let tabsRow = document.getElementById('chat-list-tabs-row');
    if (!tabsRow) {
      tabsRow = document.createElement('div');
      tabsRow.id = 'chat-list-tabs-row';
      tabsRow.className = 'chat-list-tabs-row';
      const searchBox = sidebar.querySelector('.chat-sidebar-search');
      if (searchBox) searchBox.after(tabsRow);
    }

    const qtdSolicitacoes = global.listaSolicitacoesCache ? global.listaSolicitacoesCache.length : 0;

    tabsRow.innerHTML = `
      <button class="chat-tab-btn ${abaListaAtiva === 'todas' ? 'active' : ''}" onclick="window.alternarAbaListaChat('todas')">
        Directs
      </button>
      <button class="chat-tab-btn ${abaListaAtiva === 'solicitacoes' ? 'active' : ''}" onclick="window.alternarAbaListaChat('solicitacoes')">
        Solicitações ${qtdSolicitacoes > 0 ? `<span class="chat-tab-badge">${qtdSolicitacoes}</span>` : ''}
      </button>
    `;

    if (abaListaAtiva === 'solicitacoes') {
      renderizarListaSolicitacoes(global.listaSolicitacoesCache);
    } else {
      renderizarListaContatos(global.listaContatosCache);
    }
  }

  function renderizarListaSolicitacoes(solicitacoes) {
    const listContainer = document.getElementById('chat-list-container');
    if (!listContainer) return;

    if (!solicitacoes || solicitacoes.length === 0) {
      listContainer.innerHTML = `
        <div class="chat-list-empty">
          <i class="fa-solid fa-user-clock"></i>
          <span>Nenhuma solicitação de conversa pendente.</span>
        </div>`;
      return;
    }

    const userLogado = obterUsuarioLogadoListChat();
    const avatarFallbackColor = userLogado?.cor_bg1 ? userLogado.cor_bg1.replace('#', '') : 'ff2d55';

    listContainer.innerHTML = `
      <div class="chat-list-section-title">Pedidos de Conversa (${solicitacoes.length})</div>
      ` + solicitacoes.map(u => {
        const idNum = Number(u.id);
        const usernameClean = sanitizarTexto(u.username || u.nome || 'user');
        const nameDisplay = sanitizarTexto(u.display_name || u.nome || u.username || 'Usuário');
        const defaultAvatar = `https://ui-avatars.com/api/?background=${avatarFallbackColor}&color=fff&name=${encodeURIComponent(usernameClean)}`;
        const avatar = (u.avatar_url && u.avatar_url.trim() !== '') ? u.avatar_url : defaultAvatar;
        const horaFormatada = formatarDataCurta(u.dataUltimaMsg);
        const htmlBadges = renderizarBadgesLimposListChat(u);
        const previewMsg = formatarPreviewUltimaMsg(u.ultimaMsgRaw, u.eMinha);

        return `
          <div class="chat-item">
            <div class="chat-item-avatar-wrapper">
              <img src="${avatar}" class="chat-item-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="${usernameClean}">
            </div>

            <div class="chat-item-info">
              <div class="chat-item-top">
                <div class="chat-item-title-group">
                  <span class="chat-item-name" title="${nameDisplay}">${nameDisplay}</span>
                  ${htmlBadges}
                </div>
                ${horaFormatada ? `<span class="chat-item-date">${horaFormatada}</span>` : ''}
              </div>
              <div class="chat-item-bottom">
                <span class="chat-item-last-text">${previewMsg}</span>
              </div>
              <div class="request-actions-row">
                <button class="btn-request-action accept" onclick="window.aceitarSolicitacaoChat(${idNum})"><i class="fa-solid fa-check"></i> Aceitar</button>
                <button class="btn-request-action reject" onclick="window.recusarSolicitacaoChat(${idNum})"><i class="fa-solid fa-xmark"></i> Recusar</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
  }

  function aceitarSolicitacaoChat(idAlvo) {
    let aceitos = JSON.parse(localStorage.getItem('chat_aceitos_manual_ids') || '[]');
    if (!aceitos.includes(idAlvo)) aceitos.push(idAlvo);
    localStorage.setItem('chat_aceitos_manual_ids', JSON.stringify(aceitos));

    restaurarChatOcultoSeNecessario(idAlvo);

    carregarListaConversas().then(() => {
      if (typeof global.seleccionarConversaDirect === 'function') {
        global.seleccionarConversaDirect(idAlvo);
      }
    });
  }

  function recusarSolicitacaoChat(idAlvo) {
    let removidos = JSON.parse(localStorage.getItem('chat_removidos_ids') || '[]');
    if (!removidos.includes(idAlvo)) removidos.push(idAlvo);
    localStorage.setItem('chat_removidos_ids', JSON.stringify(removidos));

    carregarListaConversas();
  }

  function verificarStatusSilencioso(idNum) {
    const mutesMap = JSON.parse(localStorage.getItem('chat_mutes_map') || '{}');
    const expiraEm = mutesMap[idNum];
    if (!expiraEm) return false;
    if (expiraEm === 'sempre') return true;
    return Date.now() < Number(expiraEm);
  }

  function renderizarListaContatos(usuarios) {
    const listContainer = document.getElementById('chat-list-container');
    if (!listContainer) return;

    if (!usuarios || usuarios.length === 0) {
      listContainer.innerHTML = `
        <div class="chat-list-empty">
          <i class="fa-solid fa-comments"></i>
          <span>Nenhuma conversa recente encontrada.</span>
        </div>`;
      return;
    }

    const userLogado = obterUsuarioLogadoListChat();
    const avatarFallbackColor = userLogado?.cor_bg1 ? userLogado.cor_bg1.replace('#', '') : 'ff2d55';

    const ordenados = [...usuarios].sort((a, b) => {
      const aFixado = chatsFixadosIDs.includes(Number(a.id));
      const bFixado = chatsFixadosIDs.includes(Number(b.id));

      if (aFixado && !bFixado) return -1;
      if (!aFixado && bFixado) return 1;

      const dataA = a.dataUltimaMsg ? new Date(a.dataUltimaMsg).getTime() : 0;
      const dataB = b.dataUltimaMsg ? new Date(b.dataUltimaMsg).getTime() : 0;
      return dataB - dataA;
    });

    const targetIdAtivo = global.chatTargetAtual ? Number(global.chatTargetAtual.id) : null;

    listContainer.innerHTML = `
      <div class="chat-list-section-title">Conversas Recentes</div>
      ` + ordenados.map(u => {
        const idNum = Number(u.id);
        const usernameClean = sanitizarTexto(u.username || u.nome || 'user');
        const nameDisplay = sanitizarTexto(u.display_name || u.nome || u.username || 'Usuário');
        const defaultAvatar = `https://ui-avatars.com/api/?background=${avatarFallbackColor}&color=fff&name=${encodeURIComponent(usernameClean)}`;
        const avatar = (u.avatar_url && u.avatar_url.trim() !== '') ? u.avatar_url : defaultAvatar;
        const moldura = (u.moldura_url && u.moldura_url.trim() !== '') ? u.moldura_url : '';
        
        const isSelected = targetIdAtivo === idNum;
        const isFixado = chatsFixadosIDs.includes(idNum);
        const estaSilenciado = verificarStatusSilencioso(idNum);
        const horaFormatada = formatarDataCurta(u.dataUltimaMsg);
        const previewMsg = formatarPreviewUltimaMsg(u.ultimaMsgRaw, u.eMinha);

        const htmlStatusDot = typeof global.obterHtmlStatusDot === 'function' 
          ? `<div class="avatar-status-badge">${global.obterHtmlStatusDot(u.status || 'offline', u.id)}</div>` 
          : `<div class="avatar-status-badge"><span class="status-dot offline"></span></div>`;

        const htmlBadges = renderizarBadgesLimposListChat(u);

        return `
          <div class="chat-item ${isSelected ? 'active' : ''} ${isFixado ? 'pinned' : ''}" 
               onclick="window.cliqueItemContato(${idNum})" 
               oncontextmenu="event.preventDefault(); window.abrirMenuContextoContato(event, ${idNum}, '${nameDisplay}')">
            
            <div class="chat-item-avatar-wrapper">
              <img src="${avatar}" class="chat-item-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="${usernameClean}">
              ${moldura ? `<img src="${moldura}" class="chat-item-moldura" alt="Moldura">` : ''}
              ${htmlStatusDot}
            </div>

            <div class="chat-item-info">
              <div class="chat-item-top">
                <div class="chat-item-title-group">
                  <span class="chat-item-name" title="${nameDisplay}">${nameDisplay}</span>
                  ${htmlBadges}
                </div>
                ${horaFormatada ? `<span class="chat-item-date">${horaFormatada}</span>` : ''}
                ${isFixado ? '<i class="fa-solid fa-thumbtack chat-pin-icon" title="Fixado"></i>' : ''}
                ${estaSilenciado ? '<i class="fa-solid fa-bell-slash chat-mute-icon" title="Silenciado"></i>' : ''}
              </div>
              <div class="chat-item-bottom">
                <span class="chat-item-last-text" id="contact-last-msg-${idNum}">${previewMsg}</span>
                ${(u.naoLidas > 0 && !estaSilenciado && !isSelected) ? `<span class="chat-unread-badge">${u.naoLidas > 99 ? '99+' : u.naoLidas}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
  }

  function cliqueItemContato(idAlvo) {
    restaurarChatOcultoSeNecessario(idAlvo);

    if (typeof global.seleccionarConversaDirect === 'function') {
      global.seleccionarConversaDirect(idAlvo);
    } else if (typeof global.abrirChatComUsuario === 'function') {
      global.abrirChatComUsuario(idAlvo);
    }
  }

  function filtrarContatosChat(termo) {
    clearTimeout(timerDebounceBusca);
    timerDebounceBusca = setTimeout(() => {
      const t = termo.toLowerCase().trim();
      const alvo = abaListaAtiva === 'solicitacoes' ? global.listaSolicitacoesCache : global.listaContatosCache;
      
      const filtrados = (alvo || []).filter(u => {
        const nome = (u.display_name || u.nome || u.username || '').toLowerCase();
        const handle = (u.username || '').toLowerCase();
        return nome.includes(t) || handle.includes(t);
      });

      if (abaListaAtiva === 'solicitacoes') renderizarListaSolicitacoes(filtrados);
      else renderizarListaContatos(filtrados);
    }, 150);
  }

  // Menu de Contexto
  function abrirMenuContextoContato(event, idAlvo, nomeAlvo) {
    const antigo = document.getElementById('chat-context-menu');
    if (antigo) antigo.remove();

    const isFixado = chatsFixadosIDs.includes(idAlvo);
    const estaSilenciado = verificarStatusSilencioso(idAlvo);

    const menu = document.createElement('div');
    menu.id = 'chat-context-menu';
    menu.className = 'chat-context-menu';
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${Math.min(event.clientX, window.innerWidth - 180)}px`;

    menu.innerHTML = `
      <button onclick="window.alternarFixarChat(${idAlvo})"><i class="fa-solid fa-thumbtack"></i> ${isFixado ? 'Desafixar Conversa' : 'Fixar no Topo'}</button>
      <button onclick="window.abrirSubmenuSilenciar(event, ${idAlvo})"><i class="fa-solid fa-bell-slash"></i> ${estaSilenciado ? 'Desmutar Chat' : 'Silenciar Chat'}</button>
      <button class="danger" onclick="window.removerChatDaLista(${idAlvo})"><i class="fa-solid fa-trash"></i> Ocultar Conversa</button>
    `;

    document.body.appendChild(menu);
    const fecharMenu = () => { menu.remove(); document.removeEventListener('click', fecharMenu); };
    setTimeout(() => document.addEventListener('click', fecharMenu), 10);
  }

  function abrirSubmenuSilenciar(event, idAlvo) {
    event.stopPropagation();
    const menuAntigo = document.getElementById('chat-context-menu');
    if (menuAntigo) menuAntigo.remove();

    const submenu = document.createElement('div');
    submenu.id = 'chat-context-menu';
    submenu.className = 'chat-context-menu';
    submenu.style.top = `${event.clientY}px`;
    submenu.style.left = `${Math.min(event.clientX, window.innerWidth - 180)}px`;

    submenu.innerHTML = `
      <div class="chat-menu-title">Silenciar notificações:</div>
      <button onclick="window.aplicarMuteChat(${idAlvo}, 30 * 60 * 1000)">30 Minutos</button>
      <button onclick="window.aplicarMuteChat(${idAlvo}, 60 * 60 * 1000)">1 Hora</button>
      <button onclick="window.aplicarMuteChat(${idAlvo}, 2 * 60 * 60 * 1000)">2 Horas</button>
      <button onclick="window.aplicarMuteChat(${idAlvo}, 24 * 60 * 60 * 1000)">1 Dia</button>
      <button onclick="window.aplicarMuteChat(${idAlvo}, 7 * 24 * 60 * 60 * 1000)">1 Semana</button>
      <button onclick="window.aplicarMuteChat(${idAlvo}, 'sempre')">Sempre</button>
      <button class="danger" onclick="window.aplicarMuteChat(${idAlvo}, 0)">Desmutar</button>
    `;

    document.body.appendChild(submenu);
    const fecharSubmenu = () => { submenu.remove(); document.removeEventListener('click', fecharSubmenu); };
    setTimeout(() => document.addEventListener('click', fecharSubmenu), 10);
  }

  function aplicarMuteChat(idAlvo, duracao) {
    let mutesMap = JSON.parse(localStorage.getItem('chat_mutes_map') || '{}');
    if (duracao === 0) delete mutesMap[idAlvo];
    else if (duracao === 'sempre') mutesMap[idAlvo] = 'sempre';
    else mutesMap[idAlvo] = Date.now() + duracao;

    localStorage.setItem('chat_mutes_map', JSON.stringify(mutesMap));
    renderizarListaContatos(global.listaContatosCache);
  }

  function alternarFixarChat(idAlvo) {
    if (chatsFixadosIDs.includes(idAlvo)) chatsFixadosIDs = chatsFixadosIDs.filter(id => id !== idAlvo);
    else chatsFixadosIDs.push(idAlvo);

    localStorage.setItem('chat_fixados_ids', JSON.stringify(chatsFixadosIDs));
    renderizarListaContatos(global.listaContatosCache);
  }

  function removerChatDaLista(idAlvo) {
    let removidos = JSON.parse(localStorage.getItem('chat_removidos_ids') || '[]');
    if (!removidos.includes(idAlvo)) removidos.push(idAlvo);
    localStorage.setItem('chat_removidos_ids', JSON.stringify(removidos));

    if (global.chatTargetAtual && Number(global.chatTargetAtual.id) === idAlvo) {
      global.chatTargetAtual = null;
      localStorage.removeItem('chat_ultimo_target_id');
      if (typeof global.redefinirEstadoChatVazio === 'function') global.redefinirEstadoChatVazio();
    }

    carregarListaConversas();
  }

  // Realtime de Mensagens para sincronização automática da sidebar
  function iniciarRealtimeListChat(meId) {
    const sb = obterSupabaseListChat();
    if (!sb || canalRealtimeListChat) return;

    canalRealtimeListChat = sb
      .channel('public:mensagens_listchat')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'mensagens',
        filter: `destinatario_id=eq.${meId}`
      }, (payload) => {
        if (payload.new) {
          restaurarChatOcultoSeNecessario(payload.new.remetente_id);
          carregarListaConversas();
        }
      })
      .subscribe();
  }

  // Interceptador Global para forçar o desocultamento ao abrir um chat diretamente
  const acaoAbrirChatOriginal = global.seleccionarConversaDirect;
  global.seleccionarConversaDirect = function (idTarget) {
    restaurarChatOcultoSeNecessario(idTarget);
    if (typeof acaoAbrirChatOriginal === 'function' && acaoAbrirChatOriginal !== global.seleccionarConversaDirect) {
      acaoAbrirChatOriginal(idTarget);
    }
  };

  // Exportações Globais
  global.carregarListaConversas = carregarListaConversas;
  global.renderizarListaContatos = renderizarListaContatos;
  global.filtrarContatosChat = filtrarContatosChat;
  global.alternarSidebarChat = alternarSidebarChat;
  global.alternarFixarChat = alternarFixarChat;
  global.removerChatDaLista = removerChatDaLista;
  global.cliqueItemContato = cliqueItemContato;
  global.abrirSubmenuSilenciar = abrirSubmenuSilenciar;
  global.aplicarMuteChat = aplicarMuteChat;
  global.alternarAbaListaChat = alternarAbaListaChat;
  global.aceitarSolicitacaoChat = aceitarSolicitacaoChat;
  global.recusarSolicitacaoChat = recusarSolicitacaoChat;
  global.restaurarChatOcultoSeNecessario = restaurarChatOcultoSeNecessario;
  global.abrirMenuContextoContato = abrirMenuContextoContato;

})(typeof window !== 'undefined' ? window : this);
