// ==========================================================================
// LIST CHAT MODULE (listchat.js) - GERENCIAMENTO DE RECENTES, PAUSA & PRESENÇA
// Project Z v5.0 | Realtime Thread Indexing, Pinned Conversations & Mute Rules
// ==========================================================================

window.listaContatosCache = [];
let chatsFixadosIDs = JSON.parse(localStorage.getItem('chat_fixados_ids') || '[]');

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
    .replace(/"/g, '&quot;');
}

// Formatação de Data Compacta para Lista
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

// Injeção Dinâmica de Estilos da Sidebar e Lista de Conversas
(function injetarCssListChat() {
  if (document.getElementById('listchat-css')) return;
  const style = document.createElement('style');
  style.id = 'listchat-css';
  style.textContent = `
    /* Container do Canal e Sidebar */
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

    /* Item Individual de Conversa */
    .chat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      border-radius: 14px;
      background: transparent;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.15s ease;
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

    /* Wrapper do Avatar e Moldura */
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

    /* Informações do Contato */
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
    }

    .chat-item-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chat-item-date {
      font-size: 0.68rem;
      color: #8e7f96;
      white-space: nowrap;
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

    .chat-pin-icon, .chat-mute-icon {
      font-size: 0.7rem;
      color: #8e7f96;
    }

    /* Mensagem de Estado Vazio ou Erro */
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

    /* Menu de Contexto Flutuante */
    .chat-context-menu {
      position: fixed;
      background: #180c1e;
      border: 1px solid rgba(255, 45, 85, 0.35);
      border-radius: 14px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9);
      z-index: 3500;
      min-width: 180px;
      animation: fadeInCtx 0.15s ease;
    }

    @keyframes fadeInCtx {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .chat-context-menu button {
      background: transparent;
      border: none;
      color: #d1c4d6;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .chat-context-menu button:hover {
      background: rgba(255, 45, 85, 0.2);
      color: #ffffff;
    }

    .chat-context-menu button.danger:hover {
      background: rgba(255, 71, 87, 0.25);
      color: #ff4757;
    }

    .chat-menu-title {
      font-size: 0.65rem;
      font-weight: 800;
      color: #8e7f96;
      text-transform: uppercase;
      padding: 6px 10px;
    }
  `;
  document.head.appendChild(style);
})();

// Alterna a sidebar e aplica modo de otimização/pausa no feed quando aberta
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
}

// Carregar e Indexar Lista de Conversas Recentes
async function carregarListaConversas() {
  const listContainer = document.getElementById('chat-list-container');
  if (!listContainer) return;

  const usuarioLogado = obterUsuarioLogadoListChat();
  const clientSupabase = obterSupabaseListChat();

  if (!usuarioLogado || !clientSupabase) {
    listContainer.innerHTML = `
      <div class="chat-list-error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Conexão indisponível.</span>
      </div>`;
    return;
  }

  try {
    const meId = Number(usuarioLogado.id);

    // Header da Sidebar com Botão Circular Uniforme
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

    // Buscar amizades confirmadas
    const { data: amizades1 } = await clientSupabase
      .from('amizades')
      .select('usuario_id_2')
      .eq('usuario_id_1', meId)
      .eq('status', 'aceito');

    const { data: amizades2 } = await clientSupabase
      .from('amizades')
      .select('usuario_id_1')
      .eq('usuario_id_2', meId)
      .eq('status', 'aceito');

    let idsContatosMap = new Map();

    if (msgsEnviadas) {
      msgsEnviadas.forEach(m => {
        const id = Number(m.destinatario_id);
        if (!idsContatosMap.has(id)) {
          idsContatosMap.set(id, { ultimaMsg: `Você: ${m.conteudo}`, data: m.created_at, naoLidas: 0 });
        }
      });
    }

    if (msgsRecebidas) {
      msgsRecebidas.forEach(m => {
        const id = Number(m.remetente_id);
        const atual = idsContatosMap.get(id) || { naoLidas: 0 };
        const qtdNaoLidas = (!m.lida ? (atual.naoLidas || 0) + 1 : atual.naoLidas || 0);

        if (!atual.data || new Date(m.created_at) > new Date(atual.data)) {
          idsContatosMap.set(id, { ultimaMsg: m.conteudo, data: m.created_at, naoLidas: qtdNaoLidas });
        } else {
          idsContatosMap.set(id, { ...atual, naoLidas: qtdNaoLidas });
        }
      });
    }

    if (amizades1) amizades1.forEach(a => { if (!idsContatosMap.has(Number(a.usuario_id_2))) idsContatosMap.set(Number(a.usuario_id_2), { ultimaMsg: 'Inicie a conversa...', data: null, naoLidas: 0 }); });
    if (amizades2) amizades2.forEach(a => { if (!idsContatosMap.has(Number(a.usuario_id_1))) idsContatosMap.set(Number(a.usuario_id_1), { ultimaMsg: 'Inicie a conversa...', data: null, naoLidas: 0 }); });

    if (window.chatTargetAtual && window.chatTargetAtual.id) {
      const targetActiveId = Number(window.chatTargetAtual.id);
      if (!idsContatosMap.has(targetActiveId)) {
        idsContatosMap.set(targetActiveId, { ultimaMsg: 'Inicie a conversa...', data: new Date().toISOString(), naoLidas: 0 });
      }
    }

    const idsValidos = Array.from(idsContatosMap.keys()).filter(id => !isNaN(id) && id > 0 && id !== meId);
    const chatsRemovidosIDs = JSON.parse(localStorage.getItem('chat_removidos_ids') || '[]');
    const idsFinais = idsValidos.filter(id => !chatsRemovidosIDs.includes(id));

    if (idsFinais.length === 0) {
      listContainer.innerHTML = `
        <div class="chat-list-empty">
          <i class="fa-solid fa-comments"></i>
          <span>Nenhuma conversa recente.</span>
        </div>`;
      return;
    }

    const { data: usuarios, error } = await clientSupabase
      .from('usuarios')
      .select('*')
      .in('id', idsFinais);

    if (error || !usuarios) {
      listContainer.innerHTML = `<div class="chat-list-error">Falha ao carregar conversas.</div>`;
      return;
    }

    window.listaContatosCache = usuarios.map(u => ({
      ...u,
      ultimaMsg: idsContatosMap.get(Number(u.id))?.ultimaMsg || 'Inicie a conversa...',
      dataUltimaMsg: idsContatosMap.get(Number(u.id))?.data || null,
      naoLidas: idsContatosMap.get(Number(u.id))?.naoLidas || 0
    }));

    renderizarListaContatos(window.listaContatosCache);

  } catch (err) {
    console.error("[ListChat] Erro ao carregar contatos:", err);
  }
}

// Verificar se o Chat Está Silenciado
function verificarStatusSilencioso(idNum) {
  const mutesMap = JSON.parse(localStorage.getItem('chat_mutes_map') || '{}');
  const expiraEm = mutesMap[idNum];
  if (!expiraEm) return false;
  if (expiraEm === 'sempre') return true;
  return Date.now() < Number(expiraEm);
}

// Renderizar Lista de Contatos
function renderizarListaContatos(usuarios) {
  const listContainer = document.getElementById('chat-list-container');
  if (!listContainer) return;

  if (!usuarios || usuarios.length === 0) {
    listContainer.innerHTML = `<div class="chat-list-empty">Nenhum contato encontrado.</div>`;
    return;
  }

  // Ordenação: Fixados primeiro, depois por data mais recente
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

      // Renderizadores com Suporte Nativo ao status.js
      const htmlStatusDot = typeof window.obterHtmlStatusDot === 'function' 
        ? `<div class="avatar-status-badge">${window.obterHtmlStatusDot(u.status || 'offline')}</div>` 
        : `<div class="avatar-status-badge"><span class="status-dot offline"></span></div>`;

      const htmlTagUser = typeof window.obterHtmlTag === 'function' ? window.obterHtmlTag(u) : '';
      
      const textoCustomStatus = u.custom_status || u.frase_status || '';
      const htmlCustomStatus = (typeof window.obterHtmlCustomStatus === 'function' && textoCustomStatus) 
        ? window.obterHtmlCustomStatus(textoCustomStatus, u.custom_status_emoji || '💬') 
        : '';

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
              <span class="chat-item-name">${nameDisplay}</span>
              ${htmlTagUser}
              ${horaFormatada ? `<span class="chat-item-date">${horaFormatada}</span>` : ''}
              ${isFixado ? '<i class="fa-solid fa-thumbtack chat-pin-icon" title="Fixado"></i>' : ''}
              ${estaSilenciado ? '<i class="fa-solid fa-bell-slash chat-mute-icon" title="Silenciado"></i>' : ''}
            </div>
            ${htmlCustomStatus}
            <div class="chat-item-bottom">
              <span class="chat-item-last-text" id="contact-last-msg-${idNum}">${sanitizarTexto(u.ultimaMsg)}</span>
              ${(u.naoLidas > 0 && !estaSilenciado && !isSelected) ? `<span class="chat-unread-badge">${u.naoLidas > 99 ? '99+' : u.naoLidas}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
}

// Evento de Clique em um Contato da Lista
function cliqueItemContato(idAlvo) {
  if (typeof window.seleccionarConversaDirect === 'function') {
    window.seleccionarConversaDirect(idAlvo);
  }
}

// Filtro Instantâneo por Texto
function filtrarContatosChat(termo) {
  const t = termo.toLowerCase().trim();
  const filtrados = (window.listaContatosCache || []).filter(u => {
    const nome = (u.display_name || u.nome || u.username || '').toLowerCase();
    const handle = (u.username || '').toLowerCase();
    return nome.includes(t) || handle.includes(t);
  });
  renderizarListaContatos(filtrados);
}

// Menu de Contexto (Botão Direito)
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
    <button onclick="alternarFixarChat(${idAlvo})">
      <i class="fa-solid fa-thumbtack"></i> ${isFixado ? 'Desafixar Conversa' : 'Fixar no Topo'}
    </button>
    <button onclick="abrirSubmenuSilenciar(event, ${idAlvo})">
      <i class="fa-solid fa-bell-slash"></i> ${estaSilenciado ? 'Desmutar Chat' : 'Silenciar Chat'}
    </button>
    <button class="danger" onclick="removerChatDaLista(${idAlvo})">
      <i class="fa-solid fa-trash"></i> Ocultar Conversa
    </button>
  `;

  document.body.appendChild(menu);

  const fecharMenu = () => {
    menu.remove();
    document.removeEventListener('click', fecharMenu);
  };
  setTimeout(() => document.addEventListener('click', fecharMenu), 10);
}

// Submenu para Mute com Opções de Duração
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

  const fecharSubmenu = () => {
    submenu.remove();
    document.removeEventListener('click', fecharSubmenu);
  };
  setTimeout(() => document.addEventListener('click', fecharSubmenu), 10);
}

// Aplicar Regra de Mute Temporário ou Permanente
function aplicarMuteChat(idAlvo, duracao) {
  let mutesMap = JSON.parse(localStorage.getItem('chat_mutes_map') || '{}');
  
  if (duracao === 0) {
    delete mutesMap[idAlvo];
  } else if (duracao === 'sempre') {
    mutesMap[idAlvo] = 'sempre';
  } else {
    mutesMap[idAlvo] = Date.now() + duracao;
  }

  localStorage.setItem('chat_mutes_map', JSON.stringify(mutesMap));
  renderizarListaContatos(window.listaContatosCache);
}

// Alternar Estado de Conversa Fixada
function alternarFixarChat(idAlvo) {
  if (chatsFixadosIDs.includes(idAlvo)) {
    chatsFixadosIDs = chatsFixadosIDs.filter(id => id !== idAlvo);
  } else {
    chatsFixadosIDs.push(idAlvo);
  }
  localStorage.setItem('chat_fixados_ids', JSON.stringify(chatsFixadosIDs));
  renderizarListaContatos(window.listaContatosCache);
}

// Remover/Ocultar Conversa da Lista Recente
function removerChatDaLista(idAlvo) {
  let removidos = JSON.parse(localStorage.getItem('chat_removidos_ids') || '[]');
  if (!removidos.includes(idAlvo)) {
    removidos.push(idAlvo);
    localStorage.setItem('chat_removidos_ids', JSON.stringify(removidos));
  }
  
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
