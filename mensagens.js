// ==========================================================================
// CHAT MESSAGES MODULE (mensagens.js) - RENDERING, PLAYERS & REALTIME
// Project Z v5.0 | Supabase Realtime Channel, Custom Players & Media Grids
// ==========================================================================

let supabaseSubscription = null;

// Helper para obtenção segura da instância do Supabase
function obterSupabaseMensagens() {
  return window.supabaseClient || window.supabase || window.sb || null;
}

// Helper Interno de Sanitização para Segurança Garantida
function sanitizarSeguro(str) {
  if (typeof window.sanitizarChat === 'function') return window.sanitizarChat(str);
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function processarEmojisTwemoji(texto) {
  if (!texto) return '';
  let parsed = texto
    .replace(/::-?\)/g, '😄')
    .replace(/:--?\)/g, '🙂')
    .replace(/<3/g, '❤️')
    .replace(/:fire:/g, '🔥')
    .replace(/:star:/g, '⭐')
    .replace(/:skull:/g, '💀');

  if (window.twemoji && typeof window.twemoji.parse === 'function') {
    return window.twemoji.parse(parsed, {
      folder: 'svg',
      ext: '.svg',
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
    });
  }
  return parsed;
}

function processarTextoChat(texto) {
  if (!texto) return '';
  let textoLimpo = texto.replace(/^\[reply:\d+\]\s*/, '');
  let formatado = sanitizarSeguro(textoLimpo);

  // Formatação de Spoilers ||texto||
  formatado = formatado.replace(/\|\|(.*?)\|\|/g, '<span class="chat-spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');

  // Suporte a Menções @username
  formatado = formatado.replace(/@([a-zA-Z0-9_]+)/g, '<span class="chat-mention-badge" onclick="if(typeof window.abrirPerfilPorUsername === \'function\') window.abrirPerfilPorUsername(\'$1\')">@$1</span>');

  // URLs e Embeds
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  formatado = formatado.replace(urlRegex, (url) => {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();

      if (pathname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return `<br><div class="chat-embed-media-box"><img src="${url}" class="chat-msg-media" onclick="abrirMidiaFull('${url}', 'imagem')" alt="Imagem"></div>`;
      }
      if (pathname.match(/\.(mp4|webm|mov)$/)) {
        return `<br>${criarHtmlVideoCard(url)}`;
      }
      if (pathname.match(/\.(mp3|wav|ogg)$/)) {
        return `<br>${criarHtmlAudioCard(url)}`;
      }

      return `
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link-embed-card">
          <div class="chat-link-embed-header">
            <img src="https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32" class="chat-link-favicon" alt="Icon">
            <span class="chat-link-embed-domain">${parsed.hostname}</span>
          </div>
          <span class="chat-link-embed-url">${url}</span>
        </a>`;
    } catch (e) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-simple-link">${url}</a>`;
    }
  });

  return processarEmojisTwemoji(formatado);
}

// Player Customizado de Vídeo
function criarHtmlVideoCard(url) {
  const vidId = 'vid_' + Math.random().toString(36).substring(2, 9);
  return `
    <div class="chat-video-custom-player" id="container_${vidId}">
      <video id="${vidId}" src="${url}" preload="metadata" onclick="alternarPlayVideoCustom('${vidId}')" ontimeupdate="atualizarProgressoVideo('${vidId}')"></video>
      <div class="chat-video-overlay-play" id="overlay_${vidId}" onclick="alternarPlayVideoCustom('${vidId}')">
        <i class="fa-solid fa-play"></i>
      </div>
      <div class="chat-video-controls-bar">
        <button onclick="alternarPlayVideoCustom('${vidId}')" class="btn-vid-control" id="btn_play_${vidId}">
          <i class="fa-solid fa-play"></i>
        </button>
        <span class="vid-time-display" id="time_${vidId}">00:00</span>
        <input type="range" class="vid-seekbar" id="seek_${vidId}" value="0" min="0" max="100" oninput="mudarProgressoVideo('${vidId}', this.value)">
        <button onclick="alternarMuteVideoCustom('${vidId}')" class="btn-vid-control" id="btn_mute_${vidId}">
          <i class="fa-solid fa-volume-high"></i>
        </button>
        <button onclick="alternarFullscreenVideoCustom('${vidId}')" class="btn-vid-control" title="Tela Cheia">
          <i class="fa-solid fa-expand"></i>
        </button>
        <a href="${url}" download class="btn-vid-control" title="Baixar Vídeo" onclick="event.stopPropagation();">
          <i class="fa-solid fa-download"></i>
        </a>
      </div>
    </div>
  `;
}

function alternarPlayVideoCustom(vidId) {
  const video = document.getElementById(vidId);
  const btnPlay = document.getElementById(`btn_play_${vidId}`);
  const overlay = document.getElementById(`overlay_${vidId}`);
  if (!video) return;

  if (video.paused) {
    video.play();
    if (btnPlay) btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
    if (overlay) overlay.style.display = 'none';
  } else {
    video.pause();
    if (btnPlay) btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (overlay) overlay.style.display = 'flex';
  }
}

function atualizarProgressoVideo(vidId) {
  const video = document.getElementById(vidId);
  const seek = document.getElementById(`seek_${vidId}`);
  const timeEl = document.getElementById(`time_${vidId}`);
  if (!video || !seek || !timeEl) return;

  const pct = (video.currentTime / video.duration) * 100;
  seek.value = isNaN(pct) ? 0 : pct;

  const m = String(Math.floor(video.currentTime / 60)).padStart(2, '0');
  const s = String(Math.floor(video.currentTime % 60)).padStart(2, '0');
  timeEl.innerText = `${m}:${s}`;
}

function mudarProgressoVideo(vidId, valor) {
  const video = document.getElementById(vidId);
  if (!video || !video.duration) return;
  video.currentTime = (valor / 100) * video.duration;
}

function alternarMuteVideoCustom(vidId) {
  const video = document.getElementById(vidId);
  const btnMute = document.getElementById(`btn_mute_${vidId}`);
  if (!video) return;
  video.muted = !video.muted;
  if (btnMute) {
    btnMute.innerHTML = video.muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
  }
}

function alternarFullscreenVideoCustom(vidId) {
  const video = document.getElementById(vidId);
  if (!video) return;
  if (video.requestFullscreen) video.requestFullscreen();
  else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
}

// Player Customizado de Nota de Áudio
function criarHtmlAudioCard(url) {
  const audioId = 'aud_' + Math.random().toString(36).substring(2, 9);
  return `
    <div class="chat-audio-custom-player">
      <audio id="${audioId}" src="${url}" preload="metadata" ontimeupdate="atualizarProgressoAudio('${audioId}')" onended="finalizarAudioCustom('${audioId}')"></audio>
      <button onclick="alternarPlayAudioCustom('${audioId}')" class="btn-audio-play" id="btn_audioplay_${audioId}">
        <i class="fa-solid fa-play"></i>
      </button>
      <div class="chat-audio-body">
        <input type="range" class="audio-seekbar" id="seek_${audioId}" value="0" min="0" max="100" oninput="mudarProgressoAudio('${audioId}', this.value)">
        <div class="chat-audio-time-row">
          <span id="time_${audioId}">00:00</span>
          <button class="btn-audio-speed" id="speed_${audioId}" onclick="mudarVelocidadeAudio('${audioId}')">1x</button>
        </div>
      </div>
    </div>
  `;
}

function alternarPlayAudioCustom(audioId) {
  const audio = document.getElementById(audioId);
  const btn = document.getElementById(`btn_audioplay_${audioId}`);
  if (!audio) return;

  if (audio.paused) {
    document.querySelectorAll('audio').forEach(a => { if (a !== audio) a.pause(); });
    audio.play();
    if (btn) btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    audio.pause();
    if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i>';
  }
}

function atualizarProgressoAudio(audioId) {
  const audio = document.getElementById(audioId);
  const seek = document.getElementById(`seek_${audioId}`);
  const timeEl = document.getElementById(`time_${audioId}`);
  if (!audio || !seek || !timeEl) return;

  const pct = (audio.currentTime / audio.duration) * 100;
  seek.value = isNaN(pct) ? 0 : pct;

  const m = String(Math.floor(audio.currentTime / 60)).padStart(2, '0');
  const s = String(Math.floor(audio.currentTime % 60)).padStart(2, '0');
  timeEl.innerText = `${m}:${s}`;
}

function mudarProgressoAudio(audioId, valor) {
  const audio = document.getElementById(audioId);
  if (!audio || !audio.duration) return;
  audio.currentTime = (valor / 100) * audio.duration;
}

function finalizarAudioCustom(audioId) {
  const btn = document.getElementById(`btn_audioplay_${audioId}`);
  const seek = document.getElementById(`seek_${audioId}`);
  if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i>';
  if (seek) seek.value = 0;
}

function mudarVelocidadeAudio(audioId) {
  const audio = document.getElementById(audioId);
  const btn = document.getElementById(`speed_${audioId}`);
  if (!audio || !btn) return;

  if (audio.playbackRate === 1.0) {
    audio.playbackRate = 1.5;
    btn.innerText = '1.5x';
  } else if (audio.playbackRate === 1.5) {
    audio.playbackRate = 2.0;
    btn.innerText = '2x';
  } else {
    audio.playbackRate = 1.0;
    btn.innerText = '1x';
  }
}

function processarECriarHtmlMidias(imagemUrlPayload) {
  if (!imagemUrlPayload) return '';

  let listaMídias = [];
  try {
    const parsed = JSON.parse(imagemUrlPayload);
    if (Array.isArray(parsed)) listaMídias = parsed;
    else listaMídias = [imagemUrlPayload];
  } catch (e) {
    listaMídias = [imagemUrlPayload];
  }

  if (listaMídias.length === 0) return '';

  const total = listaMídias.length;
  let gridClass = 'grid-1';
  if (total === 2) gridClass = 'grid-2';
  else if (total === 3) gridClass = 'grid-3';
  else if (total >= 4) gridClass = 'grid-4';

  const htmlItens = listaMídias.map(itemStr => {
    let urlReal = typeof itemStr === 'object' ? itemStr.url : itemStr;
    let isSpoiler = typeof itemStr === 'object' ? Boolean(itemStr.isSpoiler) : false;

    if (typeof urlReal === 'string' && urlReal.startsWith('||') && urlReal.endsWith('||')) {
      isSpoiler = true;
      urlReal = urlReal.substring(2, urlReal.length - 2);
    }

    const urlLower = String(urlReal).toLowerCase();
    const ehVideo = urlLower.endsWith('.mp4') || urlLower.endsWith('.webm') || urlLower.startsWith('data:video');
    const ehAudio = urlLower.endsWith('.wav') || urlLower.endsWith('.mp3') || urlLower.endsWith('.webm') || urlLower.startsWith('data:audio');

    let elementoMidia = '';
    if (ehVideo) elementoMidia = criarHtmlVideoCard(urlReal);
    else if (ehAudio) elementoMidia = criarHtmlAudioCard(urlReal);
    else elementoMidia = `<img src="${urlReal}" class="chat-msg-media" onclick="abrirMidiaFull('${urlReal}', 'imagem')" alt="Anexo">`;

    if (isSpoiler) {
      return `
        <div class="chat-spoiler-media-wrapper" onclick="this.classList.toggle('revealed')">
          <span class="spoiler-media-badge"><i class="fa-solid fa-eye-slash"></i> SPOILER</span>
          ${elementoMidia}
        </div>`;
    }
    return `<div class="chat-media-item-wrap">${elementoMidia}</div>`;
  }).join('');

  return `<div class="chat-media-grid-container ${gridClass}">${htmlItens}</div>`;
}

function renderizarMensagensFeed(mensagens) {
  const feed = document.getElementById('chat-messages-feed');
  if (!feed) return;

  const usuarioLogado = typeof window.obterUsuarioLogadoChat === 'function' ? window.obterUsuarioLogadoChat() : null;
  if (!usuarioLogado) return;

  const meId = Number(usuarioLogado.id);
  const mapaMensagens = new Map(mensagens.map(m => [m.id, m]));

  const esteveNoFim = (feed.scrollHeight - feed.scrollTop - feed.clientHeight) < 120;

  feed.innerHTML = mensagens.map(m => {
    return montarHtmlMensagemUnica(m, meId, usuarioLogado, mapaMensagens);
  }).join('');

  if (esteveNoFim || feed.children.length < 20) {
    feed.scrollTop = feed.scrollHeight;
  }
}

function montarHtmlMensagemUnica(m, meId, usuarioLogado, mapaMensagens) {
  const eMeu = Number(m.remetente_id) === meId;
  const autorName = eMeu 
    ? sanitizarSeguro(usuarioLogado.display_name || usuarioLogado.nome || usuarioLogado.username) 
    : sanitizarSeguro(window.chatTargetAtual ? window.chatTargetAtual.nome : 'Contato');
    
  const autorHandle = eMeu 
    ? sanitizarSeguro(usuarioLogado.username || 'voce') 
    : sanitizarSeguro(window.chatTargetAtual ? window.chatTargetAtual.username : 'contato');
  
  const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(autorHandle)}`;
  const avatarSrc = eMeu 
    ? ((usuarioLogado.avatar_url && usuarioLogado.avatar_url.trim() !== '') ? usuarioLogado.avatar_url : defaultAvatar) 
    : (window.chatTargetAtual ? window.chatTargetAtual.avatar_url : defaultAvatar);
    
  const molduraSrc = eMeu 
    ? ((usuarioLogado.moldura_url && usuarioLogado.moldura_url.trim() !== '') ? usuarioLogado.moldura_url : '') 
    : (window.chatTargetAtual ? window.chatTargetAtual.moldura_url : '');
    
  const dataFormatada = typeof window.formatarDataHoraChat === 'function' ? window.formatarDataHoraChat(m.created_at) : '';

  let estiloUsado = {};
  if (eMeu) {
    const rawLocal = localStorage.getItem(`chat_style_me_${meId}`);
    estiloUsado = rawLocal ? JSON.parse(rawLocal) : (usuarioLogado.estilo_balao || {});
  } else {
    estiloUsado = window.chatTargetAtual ? (window.chatTargetAtual.estilo_balao || {}) : {};
  }

  const corBg = estiloUsado.bg || (eMeu ? 'var(--chat-me-bubble-color)' : 'rgba(32, 20, 36, 0.92)');
  const corText = estiloUsado.text || '#ffffff';
  const corBorder = estiloUsado.border || '';
  const tipoRadius = estiloUsado.radius || '16px';
  const fonteOpcao = estiloUsado.font || 'inherit';

  let inlineStyleBubble = `background: ${corBg}; color: ${corText}; border-radius: ${tipoRadius}; font-family: ${fonteOpcao};`;
  if (corBorder) inlineStyleBubble += ` border: 1px solid ${corBorder}; box-shadow: 0 0 10px ${corBorder}66;`;

  let htmlHeaderResposta = '';
  let targetReplyId = m.resposta_id;

  if (!targetReplyId && m.conteudo && m.conteudo.startsWith('[reply:')) {
    const match = m.conteudo.match(/^\[reply:(\d+)\]/);
    if (match) targetReplyId = Number(match[1]);
  }

  if (targetReplyId) {
    const msgAlvo = mapaMensagens ? mapaMensagens.get(targetReplyId) : null;
    let autorAlvo = 'Mensagem';
    let textoAlvoPuro = '';

    if (msgAlvo) {
      autorAlvo = Number(msgAlvo.remetente_id) === meId ? sanitizarSeguro(usuarioLogado.display_name || usuarioLogado.nome || 'Você') : sanitizarSeguro(window.chatTargetAtual ? window.chatTargetAtual.nome : 'Contato');
      textoAlvoPuro = msgAlvo.conteudo ? msgAlvo.conteudo.replace(/^\[reply:\d+\]\s*/, '') : '';
    }

    const trechoAlvo = msgAlvo && msgAlvo.excluido ? 'Mensagem excluída' : (textoAlvoPuro ? sanitizarSeguro(textoAlvoPuro).slice(0, 35) : 'Mensagem original');

    htmlHeaderResposta = `
      <div class="chat-msg-reply-reference" onclick="rolarParaMensagem(${targetReplyId})">
        <i class="fa-solid fa-reply"></i>
        <span class="chat-reply-ref-author">@${autorAlvo}:</span>
        <span class="chat-reply-ref-text">${trechoAlvo}${textoAlvoPuro.length > 35 ? '...' : ''}</span>
      </div>
    `;
  }

  const conteudoProcessado = m.excluido ? '<em><i class="fa-solid fa-ban"></i> Mensagem excluída</em>' : processarTextoChat(m.conteudo);
  const htmlMidiasGrid = m.excluido ? '' : processarECriarHtmlMidias(m.imagem_url);

  let htmlReacoes = '';
  if (m.reacoes && typeof m.reacoes === 'object' && !m.excluido) {
    const reacoesEntries = Object.entries(m.reacoes);
    if (reacoesEntries.length > 0) {
      htmlReacoes = `<div class="chat-msg-reactions-list">` + reacoesEntries.map(([emoji, usuariosArr]) => {
        const qtd = Array.isArray(usuariosArr) ? usuariosArr.length : Number(usuariosArr);
        const euReagi = Array.isArray(usuariosArr) && usuariosArr.includes(meId);
        if (qtd <= 0) return '';
        return `<button class="chat-reaction-chip ${euReagi ? 'reacted' : ''}" onclick="alternarReacaoMensagem(${m.id}, '${emoji}')"><span>${processarEmojisTwemoji(emoji)}</span><small>${qtd}</small></button>`;
      }).join('') + `</div>`;
    }
  }

  let readReceiptHtml = '';
  if (m.isSending) {
    readReceiptHtml = `<span class="chat-sending-status" title="Enviando..."><i class="fa-solid fa-spinner fa-spin"></i></span>`;
  } else if (m.isError) {
    readReceiptHtml = `<span class="chat-error-status" onclick="reenviarMensagemComErro(${m.id})" title="Erro ao enviar. Clique para reenviar!"><i class="fa-solid fa-triangle-exclamation"></i> Falha</span>`;
  } else if (eMeu) {
    readReceiptHtml = `
      <span class="chat-read-receipt ${m.lida ? 'read' : ''}" title="${m.lida ? 'Lido' : 'Enviado'}">
        <i class="fa-solid ${m.lida ? 'fa-check-double' : 'fa-check'}"></i>
      </span>
    `;
  }

  return `
    <div class="chat-msg-row ${eMeu ? 'me' : ''} ${m.excluido ? 'deleted' : ''} ${m.isSending ? 'sending' : ''}" id="msg-row-${m.id}" data-msg-id="${m.id}" data-autor="${autorName}">
      <div class="chat-msg-avatar-container">
        <img src="${avatarSrc}" class="chat-msg-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="Avatar">
        ${molduraSrc ? `<img src="${molduraSrc}" class="chat-msg-moldura" alt="Moldura">` : ''}
      </div>

      <div class="chat-msg-content">
        ${htmlHeaderResposta}

        <div class="chat-msg-header-info">
          <span class="chat-msg-author-name">${autorName}</span>
        </div>

        <div class="chat-msg-bubble-wrapper">
          <div class="chat-msg-bubble" style="${inlineStyleBubble}">
            ${conteudoProcessado}
            ${htmlMidiasGrid}
          </div>

          ${(!m.excluido && !m.isSending) ? `
            <div class="chat-msg-quick-actions">
              <button onclick="if(typeof window.prepararRespostaMensagem === 'function') window.prepararRespostaMensagem(${m.id}, '${autorName}', '${m.conteudo ? m.conteudo.replace(/^\[reply:\d+\]\s*/, '').replace(/'/g, "\\'") : ''}')" title="Responder"><i class="fa-solid fa-reply"></i></button>
              <button onclick="abrirBarraReacoesRapidas(event, ${m.id})" title="Reagir"><i class="fa-solid fa-face-smile"></i></button>
              ${eMeu ? `<button onclick="excluirPropriaMensagem(${m.id})" title="Excluir" style="color:#ff4757;"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
          ` : ''}
        </div>

        ${htmlReacoes}
        <div class="chat-msg-footer-info">
          <span class="chat-msg-timestamp">${dataFormatada}</span>
          ${readReceiptHtml}
        </div>
      </div>
    </div>
  `;
}

function rolarParaMensagem(msgId) {
  const el = document.getElementById(`msg-row-${msgId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('chat-msg-highlight');
  setTimeout(() => el.classList.remove('chat-msg-highlight'), 2000);
}

async function alternarReacaoMensagem(msgId, emoji) {
  const clientSupabase = obterSupabaseMensagens();
  const usuarioLogado = typeof window.obterUsuarioLogadoChat === 'function' ? window.obterUsuarioLogadoChat() : null;
  if (!clientSupabase || !usuarioLogado) return;
  const meId = Number(usuarioLogado.id);

  try {
    const { data: msg } = await clientSupabase.from('mensagens').select('reacoes').eq('id', msgId).single();
    let reacoesObj = msg && msg.reacoes && typeof msg.reacoes === 'object' ? { ...msg.reacoes } : {};
    let listaUsuarios = Array.isArray(reacoesObj[emoji]) ? [...reacoesObj[emoji]] : [];

    if (listaUsuarios.includes(meId)) listaUsuarios = listaUsuarios.filter(id => id !== meId);
    else listaUsuarios.push(meId);

    if (listaUsuarios.length > 0) reacoesObj[emoji] = listaUsuarios;
    else delete reacoesObj[emoji];

    await clientSupabase.from('mensagens').update({ reacoes: reacoesObj }).eq('id', msgId);
  } catch (err) { 
    console.error("[Chat] Erro ao aplicar reação:", err); 
  }
}

function abrirBarraReacoesRapidas(event, msgId) {
  event.stopPropagation();
  const antigo = document.getElementById('chat-quick-reaction-bar');
  if (antigo) antigo.remove();

  const barra = document.createElement('div');
  barra.id = 'chat-quick-reaction-bar';
  barra.className = 'chat-quick-reaction-bar';

  const emojisBase = ['👍', '❤️', '🔥', '😂', '🎉', '💀'];
  barra.innerHTML = emojisBase.map(e => `<button onclick="alternarReacaoMensagem(${msgId}, '${e}'); document.getElementById('chat-quick-reaction-bar')?.remove();">${processarEmojisTwemoji(e)}</button>`).join('');
  document.body.appendChild(barra);

  const rect = event.currentTarget.getBoundingClientRect();
  barra.style.top = `${Math.max(10, rect.top - 45)}px`;
  barra.style.left = `${Math.min(window.innerWidth - 200, rect.left - 80)}px`;

  const fechar = () => { barra.remove(); document.removeEventListener('click', fechar); };
  setTimeout(() => document.addEventListener('click', fechar), 10);
}

async function excluirPropriaMensagem(msgId) {
  if (!confirm("Deseja apagar esta mensagem?")) return;
  const clientSupabase = obterSupabaseMensagens();
  if (!clientSupabase) return;

  try {
    await clientSupabase.from('mensagens').update({ conteudo: 'Mensagem excluída', imagem_url: null, excluido: true, reacoes: {} }).eq('id', msgId);
  } catch (err) { 
    console.error("[Chat] Erro ao excluir mensagem:", err); 
  }
}

function iniciarRealtimeGlobalChat() {
  const clientSupabase = obterSupabaseMensagens();
  if (!clientSupabase) return;

  if (supabaseSubscription) {
    clientSupabase.removeChannel(supabaseSubscription);
  }

  supabaseSubscription = clientSupabase.channel('realtime_mensagens_global')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens' }, payload => {
      const msg = payload.new || payload.old;
      const usuarioLogado = typeof window.obterUsuarioLogadoChat === 'function' ? window.obterUsuarioLogadoChat() : null;
      if (!usuarioLogado || !msg) return;

      const meId = String(usuarioLogado.id);
      const targetId = window.chatTargetAtual ? String(window.chatTargetAtual.id) : null;

      if (targetId) {
        const eDaConversa = (String(msg.remetente_id) === meId && String(msg.destinatario_id) === targetId) || (String(msg.remetente_id) === targetId && String(msg.destinatario_id) === meId);
        
        if (eDaConversa && typeof window.carregarMensagensFeedSilencioso === 'function') {
          window.carregarMensagensFeedSilencioso(Number(targetId));
        }
      }
      if (typeof window.carregarListaConversas === 'function') window.carregarListaConversas();
    }).subscribe();
}

function abrirMidiaFull(url, tipo = 'imagem') {
  const modal = document.createElement('div');
  modal.className = 'chat-media-full-modal';
  modal.onclick = (e) => {
    if (e.target === modal || e.target.classList.contains('chat-modal-close-btn')) {
      modal.remove();
    }
  };

  const isVid = tipo === 'video' || url.endsWith('.mp4') || url.endsWith('.webm');

  modal.innerHTML = `
    <div class="chat-modal-content-wrapper">
      <div class="chat-modal-header-bar">
        <a href="${url}" download class="chat-modal-download-btn"><i class="fa-solid fa-download"></i> Baixar Arquivo</a>
        <button class="chat-modal-close-btn">&times;</button>
      </div>
      ${isVid 
        ? `<video src="${url}" controls autoPlay class="chat-modal-video"></video>` 
        : `<img src="${url}" alt="Mídia" class="chat-modal-img">`}
    </div>
  `;
  document.body.appendChild(modal);
}

// Exportações Globais
window.processarTextoChat = processarTextoChat;
window.renderizarMensagensFeed = renderizarMensagensFeed;
window.rolarParaMensagem = rolarParaMensagem;
window.alternarReacaoMensagem = alternarReacaoMensagem;
window.abrirBarraReacoesRapidas = abrirBarraReacoesRapidas;
window.excluirPropriaMensagem = excluirPropriaMensagem;
window.iniciarRealtimeGlobalChat = iniciarRealtimeGlobalChat;
window.abrirMidiaFull = abrirMidiaFull;

window.criarHtmlVideoCard = criarHtmlVideoCard;
window.alternarPlayVideoCustom = alternarPlayVideoCustom;
window.atualizarProgressoVideo = atualizarProgressoVideo;
window.mudarProgressoVideo = mudarProgressoVideo;
window.alternarMuteVideoCustom = alternarMuteVideoCustom;
window.alternarFullscreenVideoCustom = alternarFullscreenVideoCustom;

window.criarHtmlAudioCard = criarHtmlAudioCard;
window.alternarPlayAudioCustom = alternarPlayAudioCustom;
window.atualizarProgressoAudio = atualizarProgressoAudio;
window.mudarProgressoAudio = mudarProgressoAudio;
window.finalizarAudioCustom = finalizarAudioCustom;
window.mudarVelocidadeAudio = mudarVelocidadeAudio;
