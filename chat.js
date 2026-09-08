// ==========================================================================
// CHAT SYSTEM CORE (chat.js) - SPHERE V5.2 PRO CORE & STATE ORCHESTRATOR
// Supabase Realtime, Dynamic Title, Restricted User Handling & State Sync
// ==========================================================================

(function (global) {
  'use strict';

  global.chatTargetAtual = null;
  global.mensagemEmResposta = null;

  let typingChannel = null;
  let typingTimeoutId = null;
  let requisicaoChatAtivaId = null;
  let emProcessamentoTrocaChat = false;
  const mensagensCacheMap = new Map();

  // Helper para obtenção segura da instância do Supabase
  function obterSupabaseChat() {
    return global.supabaseClient || global.supabase || global.sb || null;
  }

  // Sanitização estrita contra ataques XSS
  function sanitizarChat(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Resolução do Usuário Logado via LocalStorage
  function obterUsuarioLogadoChat() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('[Chat] Erro ao obter usuário logado:', e);
    }
    return null;
  }

  // Formatação de Data e Hora para o Chat
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

  // Aplicação Dinâmica de Cores do Tema com Base EXCLUSIVA no Usuário Logado
  function aplicarTemaCoresChat(usuarioEspecifico) {
    const root = document.documentElement;
    if (!root) return;

    // Garante que o tema aplicado na interface seja o do PRÓPRIO usuário logado
    const userLogado = obterUsuarioLogadoChat();
    if (!userLogado) return;

    const cor1 = userLogado.cor_bg1 || userLogado.cor_tema || '#ff2d55';
    const cor2 = userLogado.cor_bg2 || userLogado.cor_tema || '#ff7675';
    const gradient = cor1 !== cor2 ? `linear-gradient(135deg, ${cor1}, ${cor2})` : cor1;

    root.style.setProperty('--chat-user-bg1', cor1);
    root.style.setProperty('--chat-user-bg2', cor2);
    root.style.setProperty('--chat-user-gradient', gradient);
    root.style.setProperty('--chat-user-glow', `${cor1}45`);
    root.style.setProperty('--chat-user-border', `${cor1}38`);

    root.style.setProperty('--user-theme-color', cor1);
    root.style.setProperty('--user-theme-color-2', cor2);
    root.style.setProperty('--user-theme-gradient', gradient);
    root.style.setProperty('--user-theme-glow', `${cor1}45`);
    root.style.setProperty('--user-theme-border', `${cor1}38`);
  }

  // Abertura e Montagem da Interface Principal de Chat
  function abrirInterfaceChat() {
    fecharInterfaceChat();

    const container = document.createElement('div');
    container.id = 'chat-main-container';
    container.className = 'chat-main-container';

    if (typeof global.montarHtmlEstruturaChat === 'function') {
      container.innerHTML = global.montarHtmlEstruturaChat();
    }

    document.body.appendChild(container);
    aplicarTemaCoresChat();

    if (typeof global.renderizarBarraChat === 'function') {
      global.renderizarBarraChat();
    }

    if (typeof global.carregarListaConversas === 'function') {
      global.carregarListaConversas().then(() => restaurarUltimoChatAberto());
    }

    if (typeof global.iniciarRealtimeGlobalChat === 'function') {
      global.iniciarRealtimeGlobalChat();
    }
  }

  // Encerramento da Interface do Chat e Restauração da UI Global
  function fecharInterfaceChat() {
    const container = document.getElementById('chat-main-container');
    if (container) container.remove();

    cancelarInscricaoTyping();

    if (typeof global.sincronizarEstadoBarraNoChat === 'function') {
      global.sincronizarEstadoBarraNoChat();
    } else if (typeof global.alternarVisibilidadeBottomBar === 'function') {
      global.alternarVisibilidadeBottomBar(true);
    }

    if (typeof global.atualizarTituloAbaSite === 'function') {
      global.atualizarTituloAbaSite();
    }
  }

  function iniciarChamadaVozHeader() {
    if (!global.chatTargetAtual || global.chatTargetAtual.restricted) return;
    if (typeof global.iniciarChamadaVoz === 'function') {
      global.iniciarChamadaVoz(global.chatTargetAtual);
    }
  }

  // Seleção e Abertura de Conversa Direta (Tratada contra loops concorrentes)
  async function seleccionarConversaDirect(usuarioInput) {
    let u = null;

    if (typeof usuarioInput === 'object' && usuarioInput !== null) { 
      u = usuarioInput; 
    } else if (global.listaContatosCache && Array.isArray(global.listaContatosCache)) { 
      u = global.listaContatosCache.find(item => Number(item.id) === Number(usuarioInput)); 
    }

    const idNum = typeof usuarioInput === 'number' || typeof usuarioInput === 'string' ? Number(usuarioInput) : (u ? Number(u.id) : null);
    if (!idNum || isNaN(idNum)) return;

    // Evita reiniciar a interface se já estivermos na mesma conversa
    if (global.chatTargetAtual && Number(global.chatTargetAtual.id) === idNum && !emProcessamentoTrocaChat) {
      if (typeof global.alternarSidebarChat === 'function') global.alternarSidebarChat(false);
      return;
    }

    if (emProcessamentoTrocaChat && requisicaoChatAtivaId === idNum) return;
    emProcessamentoTrocaChat = true;

    try {
      if (typeof global.restaurarChatOcultoSeNecessario === 'function') {
        global.restaurarChatOcultoSeNecessario(idNum);
      }

      requisicaoChatAtivaId = idNum;
      const clientSupabase = obterSupabaseChat();

      // Sincroniza preferências e dados do usuário logado
      if (typeof global.sincronizarUsuarioComSupabase === 'function') {
        await global.sincronizarUsuarioComSupabase();
      }

      if (clientSupabase && (!u || !u.username)) {
        try {
          const { data: dadosUsuario } = await clientSupabase
            .from('usuarios')
            .select('*')
            .eq('id', idNum)
            .maybeSingle();

          if (dadosUsuario) u = dadosUsuario;
        } catch (e) {
          console.warn("[Chat] Falha ao atualizar dados em tempo real do destinatário:", e);
        }
      }

      const usernameClean = sanitizarChat(u?.username || u?.nome || 'user');
      const nameDisplay = sanitizarChat(u?.display_name || u?.nome || u?.username || 'Usuário');
      const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(usernameClean)}`;

      // Detecção de status de restrição (Banida / Suspensa / Desativada)
      const estaBanido = Boolean(u?.is_banned) || u?.status_conta === 'banida' || u?.status_conta === 'suspensa';
      const estaDesativado = u?.status_conta === 'desativada';
      const ehRestrito = estaBanido || estaDesativado;

      global.chatTargetAtual = {
        id: idNum,
        nome: nameDisplay,
        username: usernameClean,
        avatar_url: (u?.avatar_url && u.avatar_url.trim() !== '') ? u.avatar_url : defaultAvatar,
        moldura_url: (u?.moldura_url && u.moldura_url.trim() !== '') ? u.moldura_url : '',
        status: u?.status || 'offline',
        status_emoji: u?.status_emoji || '',
        custom_status: u?.custom_status || '',
        is_creator: Boolean(u?.is_creator || u?.is_criador),
        is_verified: Boolean(u?.is_verified),
        verificados: u?.verificados || null,
        verificados_exibir: u?.verificados_exibir || null,
        estilo_balao: u?.estilo_balao || {},
        wallpapers_chat: u?.wallpapers_chat || {},
        restricted: ehRestrito,
        restriction_type: estaBanido ? 'banida' : (estaDesativado ? 'desativada' : null)
      };

      localStorage.setItem('chat_ultimo_target_id', String(idNum));
      aplicarTemaCoresChat();

      if (typeof global.atualizarTituloAbaSite === 'function') {
        global.atualizarTituloAbaSite(`Sphere - Conversando com @${usernameClean}`);
      }

      if (typeof global.sincronizarEstadoBarraNoChat === 'function') {
        global.sincronizarEstadoBarraNoChat();
      }

      if (typeof global.atualizarHeaderTargetChat === 'function') {
        global.atualizarHeaderTargetChat(global.chatTargetAtual);
      }

      // Se a conta de destino estiver restrita (desativada ou banida), renderiza tela de aviso e desativa entrada
      if (ehRestrito) {
        if (typeof global.ativarInputChat === 'function') {
          global.ativarInputChat(false);
        }

        const feed = document.getElementById('chat-messages-feed');
        if (feed) {
          const iconeAviso = estaBanido ? 'fa-user-xmark' : 'fa-user-clock';
          const tituloAviso = estaBanido ? 'Conta Indisponível' : 'Conta Desativada';
          const mensagemAviso = estaBanido 
            ? `A conta de @${usernameClean} foi suspensa ou banida por violar as diretrizes da comunidade.` 
            : `@${usernameClean} desativou temporariamente sua conta. Não é possível enviar mensagens no momento.`;

          feed.innerHTML = `
            <div class="chat-restricted-warning-box" style="margin: auto; text-align: center; padding: 30px 20px; max-width: 420px; background: rgba(22, 12, 26, 0.85); border: 1px solid rgba(255, 45, 85, 0.25); border-radius: 20px; backdrop-filter: blur(12px);">
              <div style="font-size: 2.8rem; color: #ff4757; margin-bottom: 12px;">
                <i class="fa-solid ${iconeAviso}"></i>
              </div>
              <h3 style="color: #ffffff; font-weight: 800; font-size: 1.1rem; margin-bottom: 8px;">${tituloAviso}</h3>
              <p style="color: #b3a5b8; font-size: 0.88rem; line-height: 1.4;">${mensagemAviso}</p>
            </div>
          `;
        }

        if (typeof global.alternarSidebarChat === 'function') global.alternarSidebarChat(false);
        cancelarInscricaoTyping();
        return;
      }

      const feed = document.getElementById('chat-messages-feed');
      const cacheKey = `chat_msgs_${idNum}`;

      if (feed) {
        if (mensagensCacheMap.has(cacheKey) && typeof global.renderizarMensagensFeed === 'function') {
          global.renderizarMensagensFeed(mensagensCacheMap.get(cacheKey));
        } else {
          feed.innerHTML = `
            <div class="chat-loading-feed" style="margin: auto; text-align: center; color: #8e7f96; padding: 20px;">
              <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: var(--chat-user-bg1, #ff2d55);"></i>
            </div>`;
        }
      }

      if (typeof global.ativarInputChat === 'function') {
        global.ativarInputChat(true);
      }

      if (typeof global.alternarSidebarChat === 'function') global.alternarSidebarChat(false);
      
      if (typeof global.renderizarListaContatos === 'function' && global.listaContatosCache) {
        global.renderizarListaContatos(global.listaContatosCache);
      }

      if (typeof global.aplicarAjustesChatSalvos === 'function') {
        global.aplicarAjustesChatSalvos();
      }
      
      if (typeof global.cancelarResposta === 'function') global.cancelarResposta();

      await carregarMensagensFeedSilencioso(idNum);
      iniciarInscricaoTyping();

    } finally {
      emProcessamentoTrocaChat = false;
    }
  }

  function redefinirEstadoChatVazio() {
    global.chatTargetAtual = null;
    requisicaoChatAtivaId = null;

    cancelarInscricaoTyping();

    if (typeof global.atualizarHeaderTargetChat === 'function') {
      global.atualizarHeaderTargetChat(null);
    }

    if (typeof global.ativarInputChat === 'function') global.ativarInputChat(false);

    const feed = document.getElementById('chat-messages-feed');
    if (feed) {
      feed.innerHTML = `
        <div class="chat-empty-selection">
          <i class="fa-solid fa-comments chat-empty-icon"></i>
          <p>Selecione um amigo ou conversa para começar a interagir.</p>
        </div>`;
    }

    if (typeof global.atualizarTituloAbaSite === 'function') {
      global.atualizarTituloAbaSite('Sphere - Mensagens');
    }

    if (typeof global.sincronizarEstadoBarraNoChat === 'function') {
      global.sincronizarEstadoBarraNoChat();
    } else if (typeof global.alternarVisibilidadeBottomBar === 'function') {
      global.alternarVisibilidadeBottomBar(true);
    }

    if (typeof global.aplicarAjustesChatSalvos === 'function') global.aplicarAjustesChatSalvos();
  }

  function voltarParaListaConversas() {
    localStorage.removeItem('chat_ultimo_target_id');
    redefinirEstadoChatVazio();
    if (typeof global.alternarSidebarChat === 'function') {
      global.alternarSidebarChat(true);
    }
  }

  function restaurarUltimoChatAberto() {
    const ultimoID = localStorage.getItem('chat_ultimo_target_id');
    if (ultimoID) seleccionarConversaDirect(Number(ultimoID));
    else redefinirEstadoChatVazio();
  }

  function cliqueHeaderTarget() {
    if (!global.chatTargetAtual) return;
    if (typeof global.abrirPerfil === 'function') global.abrirPerfil(global.chatTargetAtual);
  }

  function cancelarInscricaoTyping() {
    const clientSupabase = obterSupabaseChat();
    if (typingChannel && clientSupabase) {
      try {
        clientSupabase.removeChannel(typingChannel);
      } catch (e) {
        console.warn('[Chat] Erro ao remover canal de typing:', e);
      }
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
    if (!clientSupabase || !global.chatTargetAtual || global.chatTargetAtual.restricted) return;

    const usuarioLogado = obterUsuarioLogadoChat();
    if (!usuarioLogado) return;

    const meId = Number(usuarioLogado.id);
    const targetId = Number(global.chatTargetAtual.id);

    const channelName = `typing_${Math.min(meId, targetId)}_${Math.max(meId, targetId)}`;

    typingChannel = clientSupabase.channel(channelName);
    typingChannel.on('broadcast', { event: 'typing' }, payload => {
      if (payload.payload && Number(payload.payload.remetente_id) === targetId && requisicaoChatAtivaId === targetId) {
        exibirIndicadorDigitando(Boolean(payload.payload.isTyping));
      }
    }).subscribe();
  }

  function emitirStatusDigitando(isTyping) {
    if (!typingChannel || (global.chatTargetAtual && global.chatTargetAtual.restricted)) return;
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

    if (isTyping && global.chatTargetAtual && !global.chatTargetAtual.restricted) {
      indicator.style.display = 'flex';
      indicator.innerHTML = `
        <img src="${global.chatTargetAtual.avatar_url}" class="typing-avatar" alt="Avatar">
        <span><strong>@${global.chatTargetAtual.username}</strong> está digitando...</span>
      `;

      typingTimeoutId = setTimeout(() => {
        indicator.style.display = 'none';
      }, 3500);
    } else {
      indicator.style.display = 'none';
    }
  }

  async function carregarMensagensFeedSilencioso(targetIdEsperado) {
    const targetId = targetIdEsperado || (global.chatTargetAtual ? Number(global.chatTargetAtual.id) : null);
    if (!targetId) return;

    if (global.chatTargetAtual && global.chatTargetAtual.restricted) return;

    const usuarioLogado = obterUsuarioLogadoChat();
    const clientSupabase = obterSupabaseChat();
    if (!usuarioLogado || !clientSupabase) return;

    try {
      const meId = Number(usuarioLogado.id);

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
        let htmlBadgesTarget = '';
        if (typeof global.renderizarBadgesLimposHeaderChat === 'function') {
          htmlBadgesTarget = global.renderizarBadgesLimposHeaderChat(global.chatTargetAtual);
        } else if (typeof global.obterHtmlBadgesUsuario === 'function') {
          htmlBadgesTarget = global.obterHtmlBadgesUsuario(global.chatTargetAtual);
        }

        feed.innerHTML = `
          <div class="chat-welcome-card">
            <div class="chat-welcome-avatar-wrap">
              <img src="${global.chatTargetAtual.avatar_url}" class="chat-welcome-avatar" alt="Avatar">
              ${global.chatTargetAtual.moldura_url ? `<img src="${global.chatTargetAtual.moldura_url}" class="chat-welcome-moldura" alt="Moldura">` : ''}
            </div>
            <h2>${sanitizarChat(global.chatTargetAtual.nome)} ${htmlBadgesTarget}</h2>
            <span class="chat-welcome-handle">@${sanitizarChat(global.chatTargetAtual.username)}</span>
            <p>Este é o início do seu histórico de conversa privada com <strong>${sanitizarChat(global.chatTargetAtual.nome)}</strong>.</p>
          </div>
        `;

        if (typeof global.aplicarAjustesChatSalvos === 'function') {
          global.aplicarAjustesChatSalvos();
        }
        return;
      }

      if (typeof global.renderizarMensagensFeed === 'function') {
        global.renderizarMensagensFeed(mensagens);
      }
    } catch (err) {
      console.error("[Chat] Erro ao carregar feed silencioso:", err);
    }
  }

  // Exportações Globais
  global.sanitizarChat = sanitizarChat;
  global.obterUsuarioLogadoChat = obterUsuarioLogadoChat;
  global.formatarDataHoraChat = formatarDataHoraChat;
  global.aplicarTemaCoresChat = aplicarTemaCoresChat;
  global.abrirInterfaceChat = abrirInterfaceChat;
  global.fecharInterfaceChat = fecharInterfaceChat;
  global.seleccionarConversaDirect = seleccionarConversaDirect;
  global.cliqueHeaderTarget = cliqueHeaderTarget;
  global.redefinirEstadoChatVazio = redefinirEstadoChatVazio;
  global.voltarParaListaConversas = voltarParaListaConversas;
  global.carregarMensagensFeedSilencioso = carregarMensagensFeedSilencioso;
  global.emitirStatusDigitando = emitirStatusDigitando;
  global.iniciarChamadaVozHeader = iniciarChamadaVozHeader;

})(typeof window !== 'undefined' ? window : this);
