// ==========================================================================
// LIST CHAT MODULE (listchat.js) - SPHERE v5.2
// Gerenciamento de Recentes, Solicitações, Presença & Integ. verificados.js
// ==========================================================================

window.listaContatosCache = [];
window.listaSolicitacoesCache = [];
let chatsFixadosIDs = JSON.parse(localStorage.getItem('chat_fixados_ids') || '[]');
let abaListaAtiva = 'todas'; // 'todas' ou 'solicitacoes'

// Helper para Obtenção Segura do Supabase Client
function obterSupabaseListChat() {
  return window.supabaseClient || window.supabase || window.sb || null;
}

// Obter Usuário Logado
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

/**
 * Renderização de Badges Limpa (Limitado a até 2 ícones)
 */
function renderizarBadgesLimposListChat(usuario) {
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

  // Trava para exibir NO MÁXIMO 2 ícones
  const badgesLimitadas = listaBadges.filter(Boolean).slice(0, 2);

  if (badgesLimitadas.length === 0) return '';

  if (typeof window.obterHtmlBadgesUsuario === 'function') {
    return window.obterHtmlBadgesUsuario(badgesLimitadas);
  }

  return '';
}

// Injeção Dinâmica dos Estilos da Sidebar e Abas
(function injetarCssListChat() {
  if (document.getElementById('listchat-css')) return;
  const style = document.createElement('style');
  style.id = 'listchat-css';
  style.textContent = `
    .chat-sidebar {
      width: 320px;
      min-width: 320px;
      background: rgba(18, 9, 21, 0.95);
      border-right: 1px solid rgba(255, 45, 85, 0.15);
      display: flex;
      flex-direction: column;
      height: 100%;
      z-index: 10;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }

    /* Abas Internas: Directs / Solicitações */
    .chat-list-tabs-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.25);
      border-bottom: 1px solid rgba(255, 45, 85, 0.1);
    }

    .chat-tab-btn {
      flex: 1;
      height: 32px;
      min-height: 32px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #b3a5b8;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0 10px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .chat-tab-btn:hover {
      background: rgba(255, 45, 85, 0.15);
      color: #ffffff;
    }

    .chat-tab-btn.active {
      background: linear-gradient(135deg, rgba(255, 45, 85, 0.85), rgba(216, 27, 67, 0.85));
      color: #ffffff;
      border-color: rgba(255, 45, 85, 0.5);
      box-shadow: 0 2px 10px rgba(255, 45, 85, 0.3);
    }

    .chat-tab-badge {
      background: #ff2d55;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 900;
      padding: 1px 5px;
      border-radius: 8px;
    }

    .chat-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .chat-list-section-title {
      font-size: 0.68rem;
      font-weight: 800;
      color: #8e7f96;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 10px 4px 10px;
    }

    /* Item de Conversa */
    .chat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      border-radius: 14px;
      background: transparent;
      cursor: pointer;
      transition: background 0.2s ease;
      position: relative;
      user-select: none;
    }

    .chat-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .chat-item.active {
      background: rgba(255, 45, 85, 0.18);
      border: 1px solid rgba(255, 45, 85, 0.3);
    }

    .chat-item.pinned {
      background: rgba(255, 255, 255, 0.02);
      border-left: 3px solid var(--chat-accent, #ff2d55);
    }

    .chat-item-avatar-wrapper {
      position: relative;
      width: 44px;
      height: 44px;
      min-width: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .chat-item-avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid rgba(255, 255, 255, 0.1);
    }

    .chat-item-moldura {
      position: absolute;
      inset: -5px;
      width: calc(100% + 10px);
      height: calc(100% + 10px);
      pointer-events: none;
      object-fit: contain;
    }

    .avatar-status-badge {
      position: absolute;
      bottom: -2px;
      right: -2px;
    }

    .chat-item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }

    .chat-item-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
    }

    .chat-item-title-group {
      display: flex;
      align-items: center;
      gap: 5px;
      max-width: 170px;
      overflow: hidden;
    }

    /* Truncamento Inteligente de Nomes Longos (...) */
    .chat-item-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 130px;
      display: inline-block;
    }

    .chat-item-date {
      font-size: 0.68rem;
      color: #8e7f96;
      white-space: nowrap;
      margin-left: auto;
    }

    .chat-item-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .chat-item-last-text {
      font-size: 0.78rem;
      color: #b3a5b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    /* Botões de Ação para Solicitações (Padronizados em 32px) */
    .request-actions-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
    }

    .btn-request-action {
      flex: 1;
      height: 32px;
      min-height: 32px;
      padding: 0 10px;
      border-radius: 8px;
      border: none;
      font-size: 0.72rem;
      font-weight: 800;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.15s ease;
      box-sizing: border-box;
    }

    .btn-request-action.accept {
      background: #2ed573;
      color: #000;
    }

    .btn-request-action.accept:hover {
      background: #26af5f;
      transform: scale(1.02);
    }

    .btn-request-action.reject {
      background: rgba(255, 71, 87, 0.2);
      color: #ff4757;
      border: 1px solid rgba(255, 71, 87, 0.4);
    }

    .btn-request-action.reject:hover {
      background: #ff4757;
      color: #fff;
    }

    .chat-unread-badge {
      background: var(--chat-accent, #ff2d55);
      color: #ffffff;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(255, 45, 85, 0.4);
    }

    .chat-list-empty, .chat-list-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px 14px;
      text-align: center;
      color: #8e7f96;
      font-size: 0.82rem;
      gap: 8px;
    }

    .chat-list-empty i, .chat-list-error i {
      font-size: 1.8rem;
      color: rgba(255, 45, 85, 0.4);
    }
  `;
  document.head.appendChild(style);
})();

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

  if (typeof window.sincronizarEstadoBarraNoChat === 'function') {
    window.sincronizarEstadoBarraNoChat();
  }
}

// Desoculta automaticamente uma conversa caso exista nova atividade
function restaurarChatOcultoSeNecessario(idAlvo) {
  let removidos = JSON.parse(localStorage.getItem('chat_removidos_ids') || '[]');
  if (removidos.includes(Number(idAlvo))) {
    removidos = removidos.filter(id => Number(id) !== Number(idAlvo));
    localStorage.setItem('chat_removidos_ids', JSON.stringify(removidos));
  }
}

// Carregar Lista de Conversas e Separar Solicitações Ponto a Ponto
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

    // Buscar mensagens enviadas e recebidas
    const { data: msgsEnviadas } = await clientSupabase
      .from('mensagens')
      .select('destinatario_id, conteudo, created_at')
      .eq('remetente_id', meId)
      .order('created_at', { ascending: false });

    const { data: msgsRecebidas } = await clientSupabase
      .from('mensagens')
      .select('remetente_id, conteudo, created_at, lida')
      .eq('destinatario_id', meId)
      .order('created_at', { ascending: false });

    // Buscar Amizades Confirmadas
    const { data: amizades1 } = await clientSupabase.from('amizades').select('usuario_id_2').eq('usuario_id_1', meId).eq('status', 'aceito');
    const { data: amizades2 } = await clientSupabase.from('amizades').select('usuario_id_1').eq('usuario_id_2', meId).eq('status', 'aceito');

    let amizadesIDs = new Set();
    if (amizades1) amizades1.forEach(a => amizadesIDs.add(Number(a.usuario_id_2)));
    if (amizades2) amizades2.forEach(a => amizadesIDs.add(Number(a.usuario_id_1)));

    let idsContatosMap = new Map();
    let totalNaoLidasGeral = 0;

    if (msgsEnviadas) {
      msgsEnviadas.forEach(m => {
        const id = Number(m.destinatario_id);
        if (!idsContatosMap.has(id)) {
          idsContatosMap.set(id, { ultimaMsg: `Você: ${m.conteudo}`, data: m.created_at, naoLidas: 0, euIniciei: true });
        }
      });
    }

    if (msgsRecebidas) {
      msgsRecebidas.forEach(m => {
        const id = Number(m.remetente_id);
        const atual = idsContatosMap.get(id) || { naoLidas: 0, euIniciei: false };
        const qtdNaoLidas = (!m.lida ? (atual.naoLidas || 0) + 1 : atual.naoLidas || 0);

        if (!m.lida) {
          totalNaoLidasGeral++;
          // Se recebeu mensagem não lida, força a desocultação automática do chat
          restaurarChatOcultoSeNecessario(id);
        }

        if (!atual.data || new Date(m.created_at) > new Date(atual.data)) {
          idsContatosMap.set(id, { ultimaMsg: m.conteudo, data: m.created_at, naoLidas: qtdNaoLidas, euIniciei: atual.euIniciei });
        } else {
          idsContatosMap.set(id, { ...atual, naoLidas: qtdNaoLidas });
        }
      });
    }

    amizadesIDs.forEach(id => {
      if (!idsContatosMap.has(id)) {
        idsContatosMap.set(id, { ultimaMsg: 'Inicie a conversa...', data: null, naoLidas: 0, euIniciei: false });
      }
    });

    const idsValidos = Array.from(idsContatosMap.keys()).filter(id => !isNaN(id) && id > 0 && id !== meId);
    let chatsRemovidosIDs = JSON.parse(localStorage.getItem('chat_removidos_ids') || '[]');
    const aceitosManualmenteIDs = JSON.parse(localStorage.getItem('chat_aceitos_manual_ids') || '[]');
    
    const idsFinais = idsValidos.filter(id => !chatsRemovidosIDs.includes(id));

    if (idsFinais.length === 0) {
      listContainer.innerHTML = `<div class="chat-list-empty"><i class="fa-solid fa-comments"></i><span>Nenhuma conversa recente.</span></div>`;
      return;
    }

    const { data: usuarios } = await clientSupabase.from('usuarios').select('*').in('id', idsFinais);
    if (!usuarios) return;

    let normais = [];
    let solicitacoes = [];

    usuarios.forEach(u => {
      const idNum = Number(u.id);
      const info = idsContatosMap.get(idNum);
      const eAmigo = amizadesIDs.has(idNum);
      const euIniciei = info ? info.euIniciei : false;
      const aceitoManual = aceitosManualmenteIDs.includes(idNum);

      const itemData = {
        ...u,
        ultimaMsg: info?.ultimaMsg || 'Inicie a conversa...',
        dataUltimaMsg: info?.data || null,
        naoLidas: info?.naoLidas || 0
      };

      if (!eAmigo && !euIniciei && !aceitoManual) {
        solicitacoes.push(itemData);
      } else {
        normais.push(itemData);
      }
    });

    window.listaContatosCache = normais;
    window.listaSolicitacoesCache = solicitacoes;

    // Atualiza a badge vermelha na pílula flutuante
    if (typeof window.atualizarBadgeNotificacaoChat === 'function') {
      window.atualizarBadgeNotificacaoChat(totalNaoLidasGeral + solicitacoes.length);
    }

    renderizarAbaEListaChat();

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

  const qtdSolicitacoes = window.listaSolicitacoesCache ? window.listaSolicitacoesCache.length : 0;

  tabsRow.innerHTML = `
    <button class="chat-tab-btn ${abaListaAtiva === 'todas' ? 'active' : ''}" onclick="alternarAbaListaChat('todas')">
      Directs
    </button>
    <button class="chat-tab-btn ${abaListaAtiva === 'solicitacoes' ? 'active' : ''}" onclick="alternarAbaListaChat('solicitacoes')">
      Solicitações ${qtdSolicitacoes > 0 ? `<span class="chat-tab-badge">${qtdSolicitacoes}</span>` : ''}
    </button>
  `;

  if (abaListaAtiva === 'solicitacoes') {
    renderizarListaSolicitacoes(window.listaSolicitacoesCache);
  } else {
    renderizarListaContatos(window.listaContatosCache);
  }
}

function renderizarListaSolicitacoes(solicitacoes) {
  const listContainer = document.getElementById('chat-list-container');
  if (!listContainer) return;

  if (!solicitacoes || solicitacoes.length === 0) {
    listContainer.innerHTML = `
      <div class="chat-list-empty">
        <i class="fa-solid fa-user-clock"></i>
        <span>Nenhuma solicitação de mensagem pendente.</span>
      </div>`;
    return;
  }

  listContainer.innerHTML = `
    <div class="chat-list-section-title">Pedidos de Conversa (${solicitacoes.length})</div>
    ` + solicitacoes.map(u => {
      const idNum = Number(u.id);
      const usernameClean = sanitizarTexto(u.username || u.nome || 'user');
      const nameDisplay = sanitizarTexto(u.display_name || u.nome || u.username || 'Usuário');
      const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(usernameClean)}`;
      const avatar = (u.avatar_url && u.avatar_url.trim() !== '') ? u.avatar_url : defaultAvatar;
      const horaFormatada = formatarDataCurta(u.dataUltimaMsg);
      const htmlBadges = renderizarBadgesLimposListChat(u);

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
              <span class="chat-item-last-text">${sanitizarTexto(u.ultimaMsg)}</span>
            </div>
            <div class="request-actions-row">
              <button class="btn-request-action accept" onclick="aceitarSolicitacaoChat(${idNum})"><i class="fa-solid fa-check"></i> Aceitar</button>
              <button class="btn-request-action reject" onclick="recusarSolicitacaoChat(${idNum})"><i class="fa-solid fa-xmark"></i> Recusar</button>
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
    if (typeof window.seleccionarConversaDirect === 'function') {
      window.seleccionarConversaDirect(idAlvo);
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
    listContainer.innerHTML = `<div class="chat-list-empty"><i class="fa-solid fa-comments"></i><span>Nenhum contato encontrado.</span></div>`;
    return;
  }

  const ordenados = [...usuarios].sort((a, b) => {
    const aFixado = chatsFixadosIDs.includes(Number(a.id));
    const bFixado = chatsFixadosIDs.includes(Number(b.id));

    if (aFixado && !bFixado) return -1;
    if (!aFixado && bFixado) return 1;

    const dataA = a.dataUltimaMsg ? new Date(a.dataUltimaMsg).getTime() : 0;
    const dataB = b.dataUltimaMsg ? new Date(b.dataUltimaMsg).getTime() : 0;
    return dataB - dataA;
  });

  const targetIdAtivo = window.chatTargetAtual ? Number(window.chatTargetAtual.id) : null;

  listContainer.innerHTML = `
    <div class="chat-list-section-title">Conversas Recentes</div>
    ` + ordenados.map(u => {
      const idNum = Number(u.id);
      const usernameClean = sanitizarTexto(u.username || u.nome || 'user');
      const nameDisplay = sanitizarTexto(u.display_name || u.nome || u.username || 'Usuário');
      const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(usernameClean)}`;
      const avatar = (u.avatar_url && u.avatar_url.trim() !== '') ? u.avatar_url : defaultAvatar;
      const moldura = (u.moldura_url && u.moldura_url.trim() !== '') ? u.moldura_url : '';
      
      const isSelected = targetIdAtivo === idNum;
      const isFixado = chatsFixadosIDs.includes(idNum);
      const estaSilenciado = verificarStatusSilencioso(idNum);
      const horaFormatada = formatarDataCurta(u.dataUltimaMsg);

      const htmlStatusDot = typeof window.obterHtmlStatusDot === 'function' 
        ? `<div class="avatar-status-badge">${window.obterHtmlStatusDot(u.status || 'offline', u.id)}</div>` 
        : `<div class="avatar-status-badge"><span class="status-dot offline"></span></div>`;

      // Injeção de no máximo 2 badges pelo verificados.js
      const htmlBadges = renderizarBadgesLimposListChat(u);

      return `
        <div class="chat-item ${isSelected ? 'active' : ''} ${isFixado ? 'pinned' : ''}" 
             onclick="cliqueItemContato(${idNum})" 
             oncontextmenu="event.preventDefault(); abrirMenuContextoContato(event, ${idNum}, '${nameDisplay}')">
          
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
              <span class="chat-item-last-text" id="contact-last-msg-${idNum}">${sanitizarTexto(u.ultimaMsg)}</span>
              ${(u.naoLidas > 0 && !estaSilenciado && !isSelected) ? `<span class="chat-unread-badge">${u.naoLidas > 99 ? '99+' : u.naoLidas}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
}

function cliqueItemContato(idAlvo) {
  restaurarChatOcultoSeNecessario(idAlvo);
  if (typeof window.seleccionarConversaDirect === 'function') {
    window.seleccionarConversaDirect(idAlvo);
  }
}

function filtrarContatosChat(termo) {
  const t = termo.toLowerCase().trim();
  const alvo = abaListaAtiva === 'solicitacoes' ? window.listaSolicitacoesCache : window.listaContatosCache;
  const filtrados = (alvo || []).filter(u => {
    const nome = (u.display_name || u.nome || u.username || '').toLowerCase();
    const handle = (u.username || '').toLowerCase();
    return nome.includes(t) || handle.includes(t);
  });

  if (abaListaAtiva === 'solicitacoes') renderizarListaSolicitacoes(filtrados);
  else renderizarListaContatos(filtrados);
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
    <button onclick="alternarFixarChat(${idAlvo})"><i class="fa-solid fa-thumbtack"></i> ${isFixado ? 'Desafixar Conversa' : 'Fixar no Topo'}</button>
    <button onclick="abrirSubmenuSilenciar(event, ${idAlvo})"><i class="fa-solid fa-bell-slash"></i> ${estaSilenciado ? 'Desmutar Chat' : 'Silenciar Chat'}</button>
    <button class="danger" onclick="removerChatDaLista(${idAlvo})"><i class="fa-solid fa-trash"></i> Ocultar Conversa</button>
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
    <button onclick="aplicarMuteChat(${idAlvo}, 30 * 60 * 1000)">30 Minutos</button>
    <button onclick="aplicarMuteChat(${idAlvo}, 60 * 60 * 1000)">1 Hora</button>
    <button onclick="aplicarMuteChat(${idAlvo}, 2 * 60 * 60 * 1000)">2 Horas</button>
    <button onclick="aplicarMuteChat(${idAlvo}, 24 * 60 * 60 * 1000)">1 Dia</button>
    <button onclick="aplicarMuteChat(${idAlvo}, 7 * 24 * 60 * 60 * 1000)">1 Semana</button>
    <button onclick="aplicarMuteChat(${idAlvo}, 'sempre')">Sempre</button>
    <button class="danger" onclick="aplicarMuteChat(${idAlvo}, 0)">Desmutar</button>
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
  renderizarListaContatos(window.listaContatosCache);
}

function alternarFixarChat(idAlvo) {
  if (chatsFixadosIDs.includes(idAlvo)) chatsFixadosIDs = chatsFixadosIDs.filter(id => id !== idAlvo);
  else chatsFixadosIDs.push(idAlvo);

  localStorage.setItem('chat_fixados_ids', JSON.stringify(chatsFixadosIDs));
  renderizarListaContatos(window.listaContatosCache);
}

function removerChatDaLista(idAlvo) {
  let removidos = JSON.parse(localStorage.getItem('chat_removidos_ids') || '[]');
  if (!removidos.includes(idAlvo)) removidos.push(idAlvo);
  localStorage.setItem('chat_removidos_ids', JSON.stringify(removidos));

  if (window.chatTargetAtual && Number(window.chatTargetAtual.id) === idAlvo) {
    window.chatTargetAtual = null;
    localStorage.removeItem('chat_ultimo_target_id');
    if (typeof window.redefinirEstadoChatVazio === 'function') window.redefinirEstadoChatVazio();
  }

  carregarListaConversas();
}

// Exportações Globais
window.carregarListaConversas = carregarListaConversas;
window.renderizarListaContatos = renderizarListaContatos;
window.filtrarContatosChat = filtrarContatosChat;
window.alternarSidebarChat = alternarSidebarChat;
window.alternarFixarChat = alternarFixarChat;
window.removerChatDaLista = removerChatDaLista;
window.cliqueItemContato = cliqueItemContato;
window.abrirSubmenuSilenciar = abrirSubmenuSilenciar;
window.aplicarMuteChat = aplicarMuteChat;
window.alternarAbaListaChat = alternarAbaListaChat;
window.aceitarSolicitacaoChat = aceitarSolicitacaoChat;
window.recusarSolicitacaoChat = recusarSolicitacaoChat;
window.restaurarChatOcultoSeNecessario = restaurarChatOcultoSeNecessario;
