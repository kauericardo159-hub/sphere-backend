// ==========================================================================
// CHAT SYSTEM CORE (chat.js) - CORE & STATE ORCHESTRATOR
// Project Z v5.0 | Supabase Realtime, Typing Smart Timeout & Anti-Memory Leak
// ==========================================================================

window.chatTargetAtual = null;
window.mensagemEmResposta = null;

let typingChannel = null;
let typingTimeoutId = null;
let requisicaoChatAtivaId = null;
const mensagensCacheMap = new Map();

// Helper para obtenção segura da instância do Supabase
function obterSupabaseChat() {
  return window.supabaseClient || window.supabase || window.sb || null;
}

function sanitizarChat(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function obterUsuarioLogadoChat() {
  try {
    const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('[Chat] Erro ao obter usuário logado:', e);
  }
  return null;
}

function formatarDataHoraChat(timestamp) {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    const hoje = new Date();
    const eHoje = date.toDateString() === hoje.toDateString();
    const hora = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return eHoje ? `Hoje às ${hora}` : `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`;
  } catch (e) { 
    return ''; 
  }
}

function abrirInterfaceChat() {
  fecharInterfaceChat();

  const container = document.createElement('div');
  container.id = 'chat-main-container';
  container.className = 'chat-main-container';

  if (typeof window.montarHtmlEstruturaChat === 'function') {
    container.innerHTML = window.montarHtmlEstruturaChat();
  }

  document.body.appendChild(container);

  if (typeof window.renderizarBarraChat === 'function') {
    window.renderizarBarraChat();
  }

  if (typeof window.carregarListaConversas === 'function') {
    window.carregarListaConversas().then(() => restaurarUltimoChatAberto());
  }

  if (typeof window.iniciarRealtimeGlobalChat === 'function') {
    window.iniciarRealtimeGlobalChat();
  }
}

function fecharInterfaceChat() {
  const container = document.getElementById('chat-main-container');
  if (container) container.remove();

  cancelarInscricaoTyping();
}

function iniciarChamadaVozHeader() {
  if (!window.chatTargetAtual) return;
  if (typeof window.iniciarChamadaVoz === 'function') {
    window.iniciarChamadaVoz(window.chatTargetAtual);
  }
}

function seleccionarConversaDirect(usuarioInput) {
  let u = null;
  if (typeof usuarioInput === 'object' && usuarioInput !== null) { 
    u = usuarioInput; 
  } else if (window.listaContatosCache && Array.isArray(window.listaContatosCache)) { 
    u = window.listaContatosCache.find(item => Number(item.id) === Number(usuarioInput)); 
  }

  if (!u) return;

  const idNum = Number(u.id);
  requisicaoChatAtivaId = idNum;

  const usernameClean = sanitizarChat(u.username || u.nome || 'user');
  const nameDisplay = sanitizarChat(u.display_name || u.nome || u.username || 'Usuário');
  const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(usernameClean)}`;
  
  window.chatTargetAtual = {
    id: idNum,
    nome: nameDisplay,
    username: usernameClean,
    avatar_url: (u.avatar_url && u.avatar_url.trim() !== '') ? u.avatar_url : defaultAvatar,
    moldura_url: (u.moldura_url && u.moldura_url.trim() !== '') ? u.moldura_url : '',
    status: u.status || 'offline',
    is_creator: Boolean(u.is_creator),
    is_verified: Boolean(u.is_verified),
    estilo_balao: u.estilo_balao || {}
  };

  localStorage.setItem('chat_ultimo_target_id', String(idNum));

  const feed = document.getElementById('chat-messages-feed');
  if (feed) {
    feed.innerHTML = `
      <div class="chat-loading-feed" style="margin: auto; text-align: center; color: #8e7f96; padding: 20px;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: #ff2d55;"></i>
      </div>`;
  }

  if (typeof window.atualizarHeaderTargetChat === 'function') {
    window.atualizarHeaderTargetChat(window.chatTargetAtual);
  }

  if (typeof window.ativarInputChat === 'function') {
    window.ativarInputChat(true);
  }

  if (typeof window.alternarSidebarChat === 'function') window.alternarSidebarChat(false);
  if (typeof window.renderizarListaContatos === 'function' && window.listaContatosCache) {
    window.renderizarListaContatos(window.listaContatosCache);
  }

  if (typeof window.aplicarAjustesChatSalvos === 'function') window.aplicarAjustesChatSalvos();
  if (typeof window.cancelarResposta === 'function') window.cancelarResposta();
  
  const cacheKey = `chat_msgs_${idNum}`;
  if (mensagensCacheMap.has(cacheKey) && requisicaoChatAtivaId === idNum && typeof window.renderizarMensagensFeed === 'function') {
    window.renderizarMensagensFeed(mensagensCacheMap.get(cacheKey));
  }
  
  carregarMensagensFeedSilencioso(idNum);
  iniciarInscricaoTyping();
}

function redefinirEstadoChatVazio() {
  window.chatTargetAtual = null;
  requisicaoChatAtivaId = null;

  cancelarInscricaoTyping();

  if (typeof window.atualizarHeaderTargetChat === 'function') {
    window.atualizarHeaderTargetChat(null);
  }

  if (typeof window.ativarInputChat === 'function') window.ativarInputChat(false);

  const feed = document.getElementById('chat-messages-feed');
  if (feed) {
    feed.innerHTML = `
      <div class="chat-empty-selection">
        <i class="fa-solid fa-comments chat-empty-icon"></i>
        <p>Selecione um amigo ou conversa para começar a interagir.</p>
      </div>`;
  }
}

function restaurarUltimoChatAberto() {
  const ultimoID = localStorage.getItem('chat_ultimo_target_id');
  if (ultimoID) seleccionarConversaDirect(Number(ultimoID));
  else redefinirEstadoChatVazio();
}

function cliqueHeaderTarget() {
  if (!window.chatTargetAtual) return;
  if (typeof window.abrirPerfil === 'function') window.abrirPerfil(window.chatTargetAtual);
}

function cancelarInscricaoTyping() {
  const clientSupabase = obterSupabaseChat();
  if (typingChannel && clientSupabase) {
    clientSupabase.removeChannel(typingChannel);
    typingChannel = null;
  }
  if (typingTimeoutId) {
    clearTimeout(typingTimeoutId);
    typingTimeoutId = null;
  }
  exibirIndicadorDigitando(false);
}

function iniciarInscricaoTyping() {
  cancelarInscricaoTyping();

  const clientSupabase = obterSupabaseChat();
  if (!clientSupabase || !window.chatTargetAtual) return;

  const usuarioLogado = obterUsuarioLogadoChat();
  if (!usuarioLogado) return;

  const meId = Number(usuarioLogado.id);
  const targetId = Number(window.chatTargetAtual.id);

  const channelName = `typing_${Math.min(meId, targetId)}_${Math.max(meId, targetId)}`;
  
  typingChannel = clientSupabase.channel(channelName);
  typingChannel.on('broadcast', { event: 'typing' }, payload => {
    if (payload.payload && Number(payload.payload.remetente_id) === targetId && requisicaoChatAtivaId === targetId) {
      exibirIndicadorDigitando(Boolean(payload.payload.isTyping));
    }
  }).subscribe();
}

function emitirStatusDigitando(isTyping) {
  if (!typingChannel) return;
  const usuarioLogado = obterUsuarioLogadoChat();
  if (!usuarioLogado) return;

  typingChannel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { remetente_id: Number(usuarioLogado.id), isTyping: Boolean(isTyping) }
  });
}

function exibirIndicadorDigitando(isTyping) {
  const indicator = document.getElementById('chat-typing-indicator');
  if (!indicator) return;

  if (typingTimeoutId) {
    clearTimeout(typingTimeoutId);
    typingTimeoutId = null;
  }

  if (isTyping && window.chatTargetAtual) {
    indicator.style.display = 'flex';
    indicator.innerHTML = `
      <img src="${window.chatTargetAtual.avatar_url}" class="typing-avatar" alt="Avatar">
      <span><strong>@${window.chatTargetAtual.username}</strong> está digitando...</span>
    `;

    // Timeout de segurança: Esconde o indicador se não houver novos eventos em 3.5s
    typingTimeoutId = setTimeout(() => {
      indicator.style.display = 'none';
    }, 3500);
  } else {
    indicator.style.display = 'none';
  }
}

async function carregarMensagensFeedSilencioso(targetIdEsperado) {
  const targetId = targetIdEsperado || (window.chatTargetAtual ? Number(window.chatTargetAtual.id) : null);
  if (!targetId) return;

  const usuarioLogado = obterUsuarioLogadoChat();
  const clientSupabase = obterSupabaseChat();
  if (!usuarioLogado || !clientSupabase) return;

  try {
    const meId = Number(usuarioLogado.id);

    // Marca as mensagens do remetente como lidas
    await clientSupabase
      .from('mensagens')
      .update({ lida: true })
      .eq('remetente_id', targetId)
      .eq('destinatario_id', meId)
      .eq('lida', false);

    const { data: mensagens, error } = await clientSupabase
      .from('mensagens')
      .select('*')
      .or(`and(remetente_id.eq.${meId},destinatario_id.eq.${targetId}),and(remetente_id.eq.${targetId},destinatario_id.eq.${meId})`)
      .order('created_at', { ascending: true });

    if (error) return;
    if (requisicaoChatAtivaId !== targetId) return;

    mensagensCacheMap.set(`chat_msgs_${targetId}`, mensagens);

    const feed = document.getElementById('chat-messages-feed');
    if (!feed) return;

    if (!mensagens || mensagens.length === 0) {
      feed.innerHTML = `
        <div class="chat-welcome-card">
          <div class="chat-welcome-avatar-wrap">
            <img src="${window.chatTargetAtual.avatar_url}" class="chat-welcome-avatar" alt="Avatar">
            ${window.chatTargetAtual.moldura_url ? `<img src="${window.chatTargetAtual.moldura_url}" class="chat-welcome-moldura" alt="Moldura">` : ''}
          </div>
          <h2>${sanitizarChat(window.chatTargetAtual.nome)} ${window.chatTargetAtual.is_verified ? '<i class="fa-solid fa-circle-check" style="color:#ff2d55;"></i>' : ''}</h2>
          <span class="chat-welcome-handle">@${sanitizarChat(window.chatTargetAtual.username)}</span>
          <p>Este é o início do seu histórico de conversa privada com <strong>${sanitizarChat(window.chatTargetAtual.nome)}</strong>.</p>
        </div>
      `;
      return;
    }

    if (typeof window.renderizarMensagensFeed === 'function') {
      window.renderizarMensagensFeed(mensagens);
    }
  } catch (err) {
    console.error("[Chat] Erro ao carregar feed silencioso:", err);
  }
}

// Exportações Globais
window.sanitizarChat = sanitizarChat;
window.obterUsuarioLogadoChat = obterUsuarioLogadoChat;
window.formatarDataHoraChat = formatarDataHoraChat;
window.abrirInterfaceChat = abrirInterfaceChat;
window.fecharInterfaceChat = fecharInterfaceChat;
window.seleccionarConversaDirect = seleccionarConversaDirect;
window.cliqueHeaderTarget = cliqueHeaderTarget;
window.redefinirEstadoChatVazio = redefinirEstadoChatVazio;
window.carregarMensagensFeedSilencioso = carregarMensagensFeedSilencioso;
window.emitirStatusDigitando = emitirStatusDigitando;
window.iniciarChamadaVozHeader = iniciarChamadaVozHeader;
