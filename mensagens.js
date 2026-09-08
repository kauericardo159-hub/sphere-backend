// ==========================================================================
// CHAT MESSAGES MODULE (mensagens.js) - SPHERE V5.2 PRO
// Fluid Gesture Mechanics, Mobile Haptics, Unread Separator & Day Dividers
// ==========================================================================

(function (global) {
  'use strict';

  let supabaseSubscription = null;
  global.mensagemAlvoReacaoDireta = null;

  function obterSupabaseMensagens() {
    return global.supabaseClient || global.supabase || global.sb || null;
  }

  function acionarVibracaoTatil(ms = 15) {
    if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
      try { window.navigator.vibrate(ms); } catch (e) {}
    }
  }

  function sanitizarSeguro(str) {
    if (typeof global.sanitizarChat === 'function') return global.sanitizarChat(str);
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
    let parsed = String(texto)
      .replace(/::-?\)/g, '😄')
      .replace(/:--?\)/g, '🙂')
      .replace(/<3/g, '❤️')
      .replace(/:fire:/g, '🔥')
      .replace(/:star:/g, '⭐')
      .replace(/:skull:/g, '💀');

    if (global.DiscordEmojiSystem && typeof global.DiscordEmojiSystem.converter === 'function') {
      return global.DiscordEmojiSystem.converter(parsed);
    }

    if (global.twemoji && typeof global.twemoji.parse === 'function') {
      return global.twemoji.parse(parsed, {
        folder: 'svg',
        ext: '.svg',
        base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
      });
    }
    return parsed;
  }

  function processarTextoChat(texto) {
    if (!texto) return '';
    let textoLimpo = String(texto).replace(/^\[reply:\d+\]\s*/, '');
    let formatado = sanitizarSeguro(textoLimpo);

    formatado = formatado.replace(/\|\|(.*?)\|\|/g, '<span class="chat-spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
    formatado = formatado.replace(/@([a-zA-Z0-9_]+)/g, '<span class="chat-mention-badge" onclick="if(typeof window.abrirPerfilPorUsername === \'function\') window.abrirPerfilPorUsername(\'$1\')">@$1</span>');

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formatado = formatado.replace(urlRegex, (url) => {
      try {
        const parsed = new URL(url);
        const pathname = parsed.pathname.toLowerCase();

        if (pathname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return `<br><div class="chat-embed-media-box"><img src="${url}" class="chat-msg-media" onclick="window.abrirMidiaFull('${url}', 'imagem')" alt="Imagem"></div>`;
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

  function criarHtmlVideoCard(url) {
    const vidId = 'vid_' + Math.random().toString(36).substring(2, 9);
    return `
      <div class="chat-video-custom-player" id="container_${vidId}">
        <video id="${vidId}" src="${url}" preload="metadata" onclick="window.alternarPlayVideoCustom('${vidId}')" ontimeupdate="window.atualizarProgressoVideo('${vidId}')" onended="window.aoEncerrarVideoCustom('${vidId}')"></video>
        <div class="chat-video-overlay-play" id="overlay_${vidId}" onclick="window.alternarPlayVideoCustom('${vidId}')">
          <i class="fa-solid fa-play"></i>
        </div>
        <div class="chat-video-controls-bar">
          <button onclick="window.alternarPlayVideoCustom('${vidId}')" class="btn-chat-action-32" id="btn_play_${vidId}">
            <i class="fa-solid fa-play"></i>
          </button>
          <span class="vid-time-display" id="time_${vidId}">00:00</span>
          <input type="range" class="vid-seekbar" id="seek_${vidId}" value="0" min="0" max="100" oninput="window.mudarProgressoVideo('${vidId}', this.value)">
          <button onclick="window.alternarMuteVideoCustom('${vidId}')" class="btn-chat-action-32" id="btn_mute_${vidId}">
            <i class="fa-solid fa-volume-high"></i>
          </button>
          <button onclick="window.alternarFullscreenVideoCustom('${vidId}')" class="btn-chat-action-32" title="Tela Cheia">
            <i class="fa-solid fa-expand"></i>
          </button>
          <a href="${url}" download class="btn-chat-action-32" title="Baixar Vídeo" onclick="event.stopPropagation();">
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
      document.querySelectorAll('video, audio').forEach(m => { if (m !== video) m.pause(); });
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

  function aoEncerrarVideoCustom(vidId) {
    const btnPlay = document.getElementById(`btn_play_${vidId}`);
    const overlay = document.getElementById(`overlay_${vidId}`);
    const seek = document.getElementById(`seek_${vidId}`);
    if (btnPlay) btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (overlay) overlay.style.display = 'flex';
    if (seek) seek.value = 0;
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

  function criarHtmlAudioCard(url) {
    const audioId = 'aud_' + Math.random().toString(36).substring(2, 9);
    return `
      <div class="chat-audio-custom-player">
        <audio id="${audioId}" src="${url}" preload="metadata" ontimeupdate="window.atualizarProgressoAudio('${audioId}')" onended="window.finalizarAudioCustom('${audioId}')"></audio>
        <button onclick="window.alternarPlayAudioCustom('${audioId}')" class="btn-chat-action-32" id="btn_audioplay_${audioId}">
          <i class="fa-solid fa-play"></i>
        </button>
        <div class="chat-audio-body">
          <input type="range" class="audio-seekbar" id="seek_${audioId}" value="0" min="0" max="100" oninput="window.mudarProgressoAudio('${audioId}', this.value)">
          <div class="chat-audio-time-row">
            <span id="time_${audioId}">00:00</span>
            <button class="btn-chat-action-32" style="width: auto !important; height: 24px !important; border-radius: 8px !important; font-size: 0.65rem !important; padding: 0 6px !important;" id="speed_${audioId}" onclick="window.mudarVelocidadeAudio('${audioId}')">1x</button>
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
      document.querySelectorAll('audio, video').forEach(a => { if (a !== audio) a.pause(); });
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

    let listaMidias = [];
    try {
      const parsed = JSON.parse(imagemUrlPayload);
      if (Array.isArray(parsed)) listaMidias = parsed;
      else listaMidias = [imagemUrlPayload];
    } catch (e) {
      listaMidias = [imagemUrlPayload];
    }

    if (listaMidias.length === 0) return '';

    const total = listaMidias.length;
    let gridClass = 'grid-1';
    if (total === 2) gridClass = 'grid-2';
    else if (total === 3) gridClass = 'grid-3';
    else if (total >= 4) gridClass = 'grid-4';

    const htmlItens = listaMidias.map(itemStr => {
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
      else elementoMidia = `<img src="${urlReal}" class="chat-msg-media" onclick="window.abrirMidiaFull('${urlReal}', 'imagem')" alt="Anexo">`;

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

  // Formata o Divisor de Dias
  function formatarDivisorData(dataIso) {
    const d = new Date(dataIso);
    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(hoje.getDate() - 1);

    if (d.toDateString() === hoje.toDateString()) return 'Hoje';
    if (d.toDateString() === ontem.toDateString()) return 'Ontem';

    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: d.getFullYear() !== hoje.getFullYear() ? 'numeric' : undefined });
  }

  function renderizarMensagensFeed(mensagens) {
    const feed = document.getElementById('chat-messages-feed');
    if (!feed || !Array.isArray(mensagens)) return;

    const usuarioLogado = typeof global.obterUsuarioLogadoChat === 'function' ? global.obterUsuarioLogadoChat() : null;
    if (!usuarioLogado) return;

    const meId = Number(usuarioLogado.id);
    const mapaMensagens = new Map(mensagens.map(m => [m.id, m]));
    const esteveNoFim = (feed.scrollHeight - feed.scrollTop - feed.clientHeight) < 140;

    let htmlResult = '';
    const LIMITE_SEQUENCIA_MS = 15 * 60 * 1000;
    const HORAS_24_MS = 24 * 60 * 60 * 1000;

    let exibiudivisorNovaMsg = false;

    for (let i = 0; i < mensagens.length; i++) {
      const mAtual = mensagens[i];
      const mProxima = mensagens[i + 1];
      const mAnterior = mensagens[i - 1];

      // 1. Divisor de Data / 24 Horas
      if (!mAnterior) {
        htmlResult += `<div class="chat-day-divider"><span>${formatarDivisorData(mAtual.created_at)}</span></div>`;
      } else {
        const dataAnterior = new Date(mAnterior.created_at);
        const dataAtual = new Date(mAtual.created_at);
        const diffMs = dataAtual.getTime() - dataAnterior.getTime();

        if (dataAnterior.toDateString() !== dataAtual.toDateString() || diffMs >= HORAS_24_MS) {
          htmlResult += `<div class="chat-day-divider"><span>${formatarDivisorData(mAtual.created_at)}</span></div>`;
        }
      }

      // 2. Divisor de Nova Mensagem Não Lida
      const eMinha = Number(mAtual.remetente_id) === meId;
      if (!exibiudivisorNovaMsg && !eMinha && !mAtual.lida) {
        htmlResult += `
          <div class="chat-unread-divider" id="chat-unread-mark">
            <div class="chat-unread-line"></div>
            <span class="chat-unread-badge"><i class="fa-solid fa-angle-down"></i> Nova Mensagem</span>
            <div class="chat-unread-line"></div>
          </div>`;
        exibiudivisorNovaMsg = true;
      }

      const mesmoRemetenteProximo = mProxima && (Number(mAtual.remetente_id) === Number(mProxima.remetente_id));
      let tempoDiferenca = 0;
      if (mesmoRemetenteProximo) {
        tempoDiferenca = new Date(mProxima.created_at).getTime() - new Date(mAtual.created_at).getTime();
      }

      const mesmoRemetenteAnterior = mAnterior && (Number(mAtual.remetente_id) === Number(mAnterior.remetente_id));
      let diferencaComAnterior = 0;
      if (mesmoRemetenteAnterior) {
        diferencaComAnterior = new Date(mAtual.created_at).getTime() - new Date(mAnterior.created_at).getTime();
      }

      const ehTopoBloco = !mesmoRemetenteAnterior || diferencaComAnterior > LIMITE_SEQUENCIA_MS;
      const ehFimBloco = !mesmoRemetenteProximo || tempoDiferenca > LIMITE_SEQUENCIA_MS;

      htmlResult += montarHtmlMensagemUnica(mAtual, meId, usuarioLogado, mapaMensagens, ehTopoBloco, ehFimBloco);
    }

    feed.innerHTML = htmlResult;
    
    if (typeof global.aplicarAjustesChatSalvos === 'function') {
      global.aplicarAjustesChatSalvos();
    }

    aplicarGestosNasMensagens();
    vincularInterceptadorDeEnvio();

    if (esteveNoFim || feed.children.length < 20) {
      feed.scrollTop = feed.scrollHeight;
    }
  }

  function montarHtmlMensagemUnica(m, meId, usuarioLogado, mapaMensagens, ehTopoBloco, ehFimBloco) {
    const eMeu = Number(m.remetente_id) === meId;
    const autorName = eMeu 
      ? sanitizarSeguro(usuarioLogado.display_name || usuarioLogado.nome || usuarioLogado.username) 
      : sanitizarSeguro(global.chatTargetAtual ? global.chatTargetAtual.nome : 'Contato');
      
    const autorHandle = eMeu 
      ? sanitizarSeguro(usuarioLogado.username || 'voce') 
      : sanitizarSeguro(global.chatTargetAtual ? global.chatTargetAtual.username : 'contato');
    
    const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(autorHandle)}`;
    const avatarSrc = eMeu 
      ? ((usuarioLogado.avatar_url && usuarioLogado.avatar_url.trim() !== '') ? usuarioLogado.avatar_url : defaultAvatar) 
      : (global.chatTargetAtual ? global.chatTargetAtual.avatar_url : defaultAvatar);
      
    const molduraSrc = eMeu 
      ? ((usuarioLogado.moldura_url && usuarioLogado.moldura_url.trim() !== '') ? usuarioLogado.moldura_url : '') 
      : (global.chatTargetAtual ? global.chatTargetAtual.moldura_url : '');
      
    const dataFormatada = typeof global.formatarDataHoraChat === 'function' ? global.formatarDataHoraChat(m.created_at) : '';

    let estiloUsado = {};
    if (eMeu) {
      const rawLocal = localStorage.getItem(`chat_style_me_${meId}`);
      estiloUsado = rawLocal ? JSON.parse(rawLocal) : (usuarioLogado.estilo_balao || {});
    } else {
      estiloUsado = global.chatTargetAtual ? (global.chatTargetAtual.estilo_balao || {}) : {};
    }

    const corBg = estiloUsado.bg || (eMeu ? 'var(--chat-me-bubble-color)' : 'rgba(32, 20, 36, 0.92)');
    const corText = estiloUsado.text || '#ffffff';
    const corBorder = estiloUsado.border || '';
    const tipoBorderStyle = estiloUsado.border_style || 'solid';

    const radiusOriginal = estiloUsado.radius || '16px';
    const tipoRadius = typeof global.obterRadiusEspelhado === 'function' 
      ? global.obterRadiusEspelhado(radiusOriginal, eMeu) 
      : radiusOriginal;

    const fonteOpcao = estiloUsado.font || 'inherit';

    let inlineStyleBubble = `background: ${corBg}; color: ${corText}; border-radius: ${tipoRadius}; font-family: ${fonteOpcao};`;
    
    if (tipoBorderStyle === 'glow') {
      inlineStyleBubble += ` border: none; box-shadow: 0 0 16px ${corBorder || '#ff2d55'};`;
    } else if (corBorder) {
      inlineStyleBubble += ` border: 1.5px ${tipoBorderStyle} ${corBorder}; box-shadow: 0 0 10px ${corBorder}55;`;
    }

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
        autorAlvo = Number(msgAlvo.remetente_id) === meId ? sanitizarSeguro(usuarioLogado.display_name || usuarioLogado.nome || 'Você') : sanitizarSeguro(global.chatTargetAtual ? global.chatTargetAtual.nome : 'Contato');
        textoAlvoPuro = msgAlvo.conteudo ? msgAlvo.conteudo.replace(/^\[reply:\d+\]\s*/, '') : '';
      }

      const trechoAlvo = msgAlvo && msgAlvo.excluido ? 'Mensagem excluída' : (textoAlvoPuro ? sanitizarSeguro(textoAlvoPuro).slice(0, 35) : 'Mensagem original');

      htmlHeaderResposta = `
        <div class="chat-msg-reply-reference" onclick="window.rolarParaMensagem(${targetReplyId})">
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
        htmlReacoes = `<div class="chat-msg-reactions-list" id="reactions-container-${m.id}">` + reacoesEntries.map(([emoji, usuariosArr]) => {
          const qtd = Array.isArray(usuariosArr) ? usuariosArr.length : Number(usuariosArr);
          const euReagi = Array.isArray(usuariosArr) && usuariosArr.includes(meId);
          if (qtd <= 0) return '';
          return `<button type="button" class="chat-reaction-chip ${euReagi ? 'reacted' : ''}" onclick="window.alternarReacaoMensagem(${m.id}, '${emoji}')"><span>${processarEmojisTwemoji(emoji)}</span><small>${qtd}</small></button>`;
        }).join('') + `</div>`;
      }
    } else if (!m.excluido) {
      htmlReacoes = `<div class="chat-msg-reactions-list" id="reactions-container-${m.id}"></div>`;
    }

    let readReceiptHtml = '';
    if (m.isSending) {
      readReceiptHtml = `<span class="chat-sending-status" title="Enviando..."><i class="fa-solid fa-spinner fa-spin"></i></span>`;
    } else if (m.isError) {
      readReceiptHtml = `<span class="chat-error-status" onclick="window.reenviarMensagemComErro(${m.id})" title="Erro ao enviar."><i class="fa-solid fa-triangle-exclamation"></i> Falha</span>`;
    } else if (eMeu) {
      readReceiptHtml = `
        <span class="chat-read-receipt ${m.lida ? 'read' : ''}" title="${m.lida ? 'Lido' : 'Enviado'}">
          <i class="fa-solid ${m.lida ? 'fa-check-double' : 'fa-check'}"></i>
        </span>
      `;
    }

    const editadoBadge = m.editado ? `<span class="chat-edited-indicator" style="font-size:0.65rem; opacity:0.75; margin-left:4px;">(editado)</span>` : '';
    const sequenceClass = `${ehTopoBloco ? 'seq-top' : 'seq-middle'} ${ehFimBloco ? 'seq-bottom' : ''}`;
    
    const textoLimpoEscapado = m.conteudo 
      ? m.conteudo.replace(/^\[reply:\d+\]\s*/, '').replace(/[\r\n]+/g, ' ').replace(/"/g, '&quot;').replace(/'/g, '&#39;') 
      : '';

    return `
      <div class="chat-msg-row ${eMeu ? 'me' : ''} ${sequenceClass} ${m.excluido ? 'deleted' : ''} ${m.isSending ? 'sending' : ''}" id="msg-row-${m.id}" data-msg-id="${m.id}" data-autor="${autorName}" data-conteudo="${textoLimpoEscapado}">
        
        ${ehTopoBloco ? `
          <div class="chat-msg-avatar-container">
            <img src="${avatarSrc}" class="chat-msg-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="Avatar">
            ${molduraSrc ? `<img src="${molduraSrc}" class="chat-msg-moldura" alt="Moldura">` : ''}
          </div>
        ` : `<div class="chat-msg-avatar-spacer"></div>`}

        <div class="chat-msg-content">
          ${htmlHeaderResposta}

          ${ehTopoBloco ? `
            <div class="chat-msg-header-info">
              <span class="chat-msg-author-name">${autorName}</span>
            </div>
          ` : ''}

          <div class="chat-msg-bubble-wrapper">
            <div class="chat-msg-bubble" style="${inlineStyleBubble}">
              ${conteudoProcessado}
              ${htmlMidiasGrid}
            </div>
          </div>

          ${htmlReacoes}
          
          ${ehFimBloco ? `
            <div class="chat-msg-footer-info">
              <span class="chat-msg-timestamp">${dataFormatada} ${editadoBadge}</span>
              ${readReceiptHtml}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function aplicarGestosNasMensagens() {
    const rows = document.querySelectorAll('.chat-msg-row:not(.deleted)');

    rows.forEach(row => {
      const bubble = row.querySelector('.chat-msg-bubble');
      if (!bubble || bubble.dataset.gesturesApplied) return;
      bubble.dataset.gesturesApplied = 'true';

      const msgId = Number(row.dataset.msgId);
      const autorName = row.dataset.autor;
      const conteudo = row.dataset.conteudo;

      let lastTap = 0;
      let pressTimer = null;

      bubble.addEventListener('click', (e) => {
        e.stopPropagation();
        acionarVibracaoTatil(15);
        abrirMenuOpcoesMensagem(e, msgId, autorName, conteudo, row.classList.contains('me'));
      });

      bubble.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => {
          acionarVibracaoTatil(25);
          abrirMenuOpcoesMensagem(e, msgId, autorName, conteudo, row.classList.contains('me'));
        }, 500);
      }, { passive: true });

      bubble.addEventListener('touchend', (e) => {
        clearTimeout(pressTimer);
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
          e.preventDefault();
          acionarVibracaoTatil(15);
          abrirMenuOpcoesMensagem(e, msgId, autorName, conteudo, row.classList.contains('me'));
        }
        lastTap = currentTime;
      });

      bubble.addEventListener('touchmove', () => clearTimeout(pressTimer), { passive: true });

      bubble.addEventListener('dblclick', (e) => {
        e.preventDefault();
        acionarVibracaoTatil(15);
        abrirMenuOpcoesMensagem(e, msgId, autorName, conteudo, row.classList.contains('me'));
      });

      let startX = 0;
      let currentX = 0;
      let isSwiping = false;

      bubble.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        currentX = startX;
        isSwiping = true;
      }, { passive: true });

      bubble.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        currentX = e.touches[0].clientX;
        const diffX = currentX - startX;

        if (diffX > 15 && diffX < 90) {
          bubble.style.transform = `translateX(${diffX}px)`;
          bubble.style.transition = 'none';
        }
      }, { passive: true });

      bubble.addEventListener('touchend', () => {
        if (!isSwiping) return;
        isSwiping = false;
        const diffX = currentX - startX;

        if (diffX >= 60) {
          acionarVibracaoTatil(20);
          prepararRespostaMensagem(msgId, autorName, conteudo);
        }

        bubble.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        bubble.style.transform = 'translateX(0px)';
        startX = 0;
        currentX = 0;
      });
    });
  }

  function abrirMenuOpcoesMensagem(e, msgId, autor, conteudo, eMeu) {
    fecharMenuContextoMsg();

    const menu = document.createElement('div');
    menu.id = 'chat-msg-context-menu';
    menu.className = 'chat-context-menu';

    const autorSeguro = sanitizarSeguro(autor);
    const conteudoEscapadoJs = (conteudo || '').replace(/'/g, "\\'").replace(/"/g, '\\"');

    menu.innerHTML = `
      <div class="chat-menu-title">${autorSeguro}</div>
      <button onclick="window.prepararRespostaMensagem(${msgId}, '${autorSeguro}', '${conteudoEscapadoJs}'); window.fecharMenuContextoMsg();"><i class="fa-solid fa-reply"></i> Responder</button>
      <button onclick="window.abrirPickerParaReacao(event, ${msgId}); window.fecharMenuContextoMsg();"><i class="fa-solid fa-face-smile"></i> Reagir com Emoji</button>
      <button onclick="window.copiarTextoMensagem('${conteudoEscapadoJs}'); window.fecharMenuContextoMsg();"><i class="fa-solid fa-copy"></i> Copiar Texto</button>
      ${eMeu ? `<button onclick="window.prepararEdicaoMensagem(${msgId}, '${conteudoEscapadoJs}'); window.fecharMenuContextoMsg();"><i class="fa-solid fa-pen"></i> Editar</button>` : ''}
      ${eMeu ? `<button class="danger" onclick="window.excluirPropriaMensagem(${msgId}); window.fecharMenuContextoMsg();"><i class="fa-solid fa-trash"></i> Excluir</button>` : ''}
    `;

    document.body.appendChild(menu);

    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : window.innerWidth / 2);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : window.innerHeight / 2);

    const menuWidth = 200;
    const menuHeight = 220;

    const posX = Math.min(window.innerWidth - menuWidth - 16, Math.max(16, clientX));
    const posY = Math.min(window.innerHeight - menuHeight - 16, Math.max(16, clientY));

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;

    const fechar = (ev) => {
      if (!menu.contains(ev.target)) {
        fecharMenuContextoMsg();
        document.removeEventListener('click', fechar);
      }
    };
    setTimeout(() => document.addEventListener('click', fechar), 10);
  }

  function fecharMenuContextoMsg() {
    const el = document.getElementById('chat-msg-context-menu');
    if (el) el.remove();
  }

  async function alternarReacaoMensagem(msgId, emoji) {
    acionarVibracaoTatil(10);
    const clientSupabase = obterSupabaseMensagens();
    const usuarioLogado = typeof global.obterUsuarioLogadoChat === 'function' ? global.obterUsuarioLogadoChat() : null;
    if (!clientSupabase || !usuarioLogado) return;
    const meId = Number(usuarioLogado.id);

    const container = document.getElementById(`reactions-container-${msgId}`);
    if (container) {
      let chipExistente = null;
      const chips = container.querySelectorAll('.chat-reaction-chip');
      chips.forEach(chip => {
        if (chip.innerHTML.includes(emoji)) chipExistente = chip;
      });

      if (chipExistente) {
        const euJaReagi = chipExistente.classList.contains('reacted');
        const small = chipExistente.querySelector('small');
        let qtd = Number(small ? small.innerText : 1);

        if (euJaReagi) {
          qtd--;
          chipExistente.classList.remove('reacted');
          if (qtd <= 0) chipExistente.remove();
          else if (small) small.innerText = qtd;
        } else {
          qtd++;
          chipExistente.classList.add('reacted');
          if (small) small.innerText = qtd;
        }
      } else {
        const novoChip = document.createElement('button');
        novoChip.type = 'button';
        novoChip.className = 'chat-reaction-chip reacted';
        novoChip.onclick = () => alternarReacaoMensagem(msgId, emoji);
        novoChip.innerHTML = `<span>${processarEmojisTwemoji(emoji)}</span><small>1</small>`;
        container.appendChild(novoChip);
      }
    }

    try {
      const { data: msg } = await clientSupabase.from('mensagens').select('reacoes').eq('id', msgId).single();
      let reacoesObj = msg && msg.reacoes && typeof msg.reacoes === 'object' ? { ...msg.reacoes } : {};
      let listaUsuarios = Array.isArray(reacoesObj[emoji]) ? [...reacoesObj[emoji]] : [];

      if (listaUsuarios.includes(meId)) {
        listaUsuarios = listaUsuarios.filter(id => id !== meId);
      } else {
        listaUsuarios.push(meId);
      }

      if (listaUsuarios.length > 0) reacoesObj[emoji] = listaUsuarios;
      else delete reacoesObj[emoji];

      await clientSupabase.from('mensagens').update({ reacoes: reacoesObj }).eq('id', msgId);
    } catch (err) { 
      console.error("[Chat] Erro ao sincronizar reação no Supabase:", err); 
    }
  }

  function abrirBarraReacoesRapidas(event, msgId) {
    event.stopPropagation();
    acionarVibracaoTatil(10);
    const antigo = document.getElementById('chat-quick-reaction-bar');
    if (antigo) antigo.remove();

    const barra = document.createElement('div');
    barra.id = 'chat-quick-reaction-bar';
    barra.className = 'chat-quick-reaction-bar';

    const emojisBase = ['👍', '❤️', '🔥', '😂', '🎉', '💀'];
    barra.innerHTML = emojisBase.map(e => `
      <button type="button" onclick="window.alternarReacaoMensagem(${msgId}, '${e}'); document.getElementById('chat-quick-reaction-bar')?.remove();">
        ${processarEmojisTwemoji(e)}
      </button>
    `).join('') + `
      <button type="button" class="btn-more-reactions" onclick="window.abrirPickerParaReacao(event, ${msgId})" title="Mais reações">
        <i class="fa-solid fa-plus" style="font-size:0.85rem; color:#d1c4d6;"></i>
      </button>
    `;

    document.body.appendChild(barra);

    const rect = event.currentTarget.getBoundingClientRect();
    const barraWidth = 270;
    
    const posX = Math.min(window.innerWidth - barraWidth - 12, Math.max(12, rect.left - (barraWidth / 2)));
    const posY = Math.max(12, rect.top - 52);

    barra.style.top = `${posY}px`;
    barra.style.left = `${posX}px`;

    const fechar = (e) => {
      if (!barra.contains(e.target)) {
        barra.remove();
        document.removeEventListener('click', fechar);
      }
    };
    setTimeout(() => document.addEventListener('click', fechar), 10);
  }

  function abrirPickerParaReacao(event, msgId) {
    event.stopPropagation();
    global.mensagemAlvoReacaoDireta = msgId;

    if (global.DiscordEmojiSystem && typeof global.DiscordEmojiSystem.alternarSeletor === 'function') {
      global.DiscordEmojiSystem.alternarSeletor('chat-text-input', true);
    }
  }

  function prepararRespostaMensagem(msgId, autor, texto) {
    const inputEl = document.getElementById('chat-text-input') || document.querySelector('.chat-input-text');
    if (!inputEl) return;

    cancelarEdicaoMensagem();

    inputEl.dataset.replyMsgId = msgId;

    const bar = document.getElementById('chat-input-reply-bar') || document.querySelector('.chat-reply-preview');
    if (bar) {
      bar.style.display = 'flex';
      bar.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; font-size:0.78rem; color:#ff2d55; overflow:hidden;">
          <i class="fa-solid fa-reply"></i>
          <span>Respondendo <strong>@${sanitizarSeguro(autor)}</strong>: "${sanitizarSeguro(texto).slice(0, 30)}${texto.length > 30 ? '...' : ''}"</span>
        </div>
        <button type="button" onclick="window.cancelarRespostaMensagem()" style="background:transparent; border:none; color:#a898b0; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
      `;
    }
    inputEl.focus();
  }

  function cancelarRespostaMensagem() {
    const inputEl = document.getElementById('chat-text-input') || document.querySelector('.chat-input-text');
    if (inputEl) delete inputEl.dataset.replyMsgId;

    const bar = document.getElementById('chat-input-reply-bar') || document.querySelector('.chat-reply-preview');
    if (bar) bar.style.display = 'none';
  }

  function prepararEdicaoMensagem(msgId, textoAtual) {
    const inputEl = document.getElementById('chat-text-input') || document.querySelector('.chat-input-text');
    if (!inputEl) return;

    cancelarRespostaMensagem();

    inputEl.value = textoAtual;
    inputEl.focus();
    inputEl.dataset.editingMsgId = msgId;

    const bar = document.getElementById('chat-input-reply-bar') || document.querySelector('.chat-reply-preview');
    if (bar) {
      bar.style.display = 'flex';
      bar.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; font-size:0.78rem; color:#ff2d55;">
          <i class="fa-solid fa-pen"></i> Editando mensagem... (Pressione Enter para Salvar)
        </div>
        <button type="button" onclick="window.cancelarEdicaoMensagem()" style="background:transparent; border:none; color:#a898b0; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
      `;
    }
  }

  function cancelarEdicaoMensagem() {
    const inputEl = document.getElementById('chat-text-input') || document.querySelector('.chat-input-text');
    if (inputEl) {
      delete inputEl.dataset.editingMsgId;
      inputEl.value = '';
    }
    const bar = document.getElementById('chat-input-reply-bar') || document.querySelector('.chat-reply-preview');
    if (bar) bar.style.display = 'none';
  }

  async function salvarEdicaoMensagemSupabase(msgId, novoTexto) {
    const clientSupabase = obterSupabaseMensagens();
    if (!clientSupabase || !msgId || !novoTexto.trim()) return;

    try {
      await clientSupabase
        .from('mensagens')
        .update({ conteudo: novoTexto.trim(), editado: true, edited_at: new Date().toISOString() })
        .eq('id', msgId);

      cancelarEdicaoMensagem();

      if (global.chatTargetAtual && typeof global.carregarMensagensFeedSilencioso === 'function') {
        global.carregarMensagensFeedSilencioso(Number(global.chatTargetAtual.id));
      }
    } catch (err) {
      console.error("[Chat] Erro ao salvar edição no Supabase:", err);
    }
  }

  function vincularInterceptadorDeEnvio() {
    const inputEl = document.getElementById('chat-text-input') || document.querySelector('.chat-input-text');
    if (!inputEl || inputEl.dataset.interceptorBound) return;

    inputEl.dataset.interceptorBound = 'true';

    const tratarEnvioSubmissao = async (e) => {
      if (e.type === 'keydown' && (e.key !== 'Enter' || e.shiftKey)) return;

      const texto = inputEl.value.trim();
      const editingId = inputEl.dataset.editingMsgId;
      const replyId = inputEl.dataset.replyMsgId;

      if (!texto) return;

      if (editingId) {
        e.preventDefault();
        e.stopPropagation();
        await salvarEdicaoMensagemSupabase(Number(editingId), texto);
        return;
      }

      if (replyId && e.type === 'keydown') {
        inputEl.value = `[reply:${replyId}] ${texto}`;
        delete inputEl.dataset.replyMsgId;
        cancelarRespostaMensagem();
      }
    };

    inputEl.addEventListener('keydown', tratarEnvioSubmissao, true);

    const btnSend = document.getElementById('btn-chat-send') || document.querySelector('.chat-btn-send') || document.querySelector('button[type="submit"]');
    if (btnSend && !btnSend.dataset.interceptorBound) {
      btnSend.dataset.interceptorBound = 'true';
      btnSend.addEventListener('click', tratarEnvioSubmissao, true);
    }
  }

  function rolarParaMensagem(msgId) {
    const el = document.getElementById(`msg-row-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('chat-msg-highlight');
    setTimeout(() => el.classList.remove('chat-msg-highlight'), 2000);
  }

  function copiarTextoMensagem(texto) {
    if (!texto) return;
    navigator.clipboard.writeText(texto).then(() => {
      acionarVibracaoTatil(15);
      if (typeof global.mostrarToastChat === 'function') {
        global.mostrarToastChat("Texto copiado!");
      } else {
        alert("Texto copiado!");
      }
    });
  }

  async function excluirPropriaMensagem(msgId) {
    if (!confirm("Deseja apagar esta mensagem?")) return;
    const clientSupabase = obterSupabaseMensagens();
    if (!clientSupabase) return;

    try {
      await clientSupabase.from('mensagens').update({ conteudo: 'Mensagem excluída', imagem_url: null, excluido: true, reacoes: {} }).eq('id', msgId);
      if (global.chatTargetAtual && typeof global.carregarMensagensFeedSilencioso === 'function') {
        global.carregarMensagensFeedSilencioso(Number(global.chatTargetAtual.id));
      }
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
        const usuarioLogado = typeof global.obterUsuarioLogadoChat === 'function' ? global.obterUsuarioLogadoChat() : null;
        if (!usuarioLogado || !msg) return;

        const meId = String(usuarioLogado.id);
        const targetId = global.chatTargetAtual ? String(global.chatTargetAtual.id) : null;

        if (targetId) {
          const eDaConversa = (String(msg.remetente_id) === meId && String(msg.destinatario_id) === targetId) || (String(msg.remetente_id) === targetId && String(msg.destinatario_id) === meId);
          
          if (eDaConversa && typeof global.carregarMensagensFeedSilencioso === 'function') {
            global.carregarMensagensFeedSilencioso(Number(targetId));
          }
        }
        if (typeof global.carregarListaConversas === 'function') global.carregarListaConversas();
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
          <button type="button" class="chat-modal-close-btn btn-chat-action-32" style="background: rgba(255, 255, 255, 0.2); border: none; color: #fff;">&times;</button>
        </div>
        ${isVid 
          ? `<video src="${url}" controls autoPlay class="chat-modal-video"></video>` 
          : `<img src="${url}" alt="Mídia" class="chat-modal-img">`}
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Exportações Globais
  global.processarTextoChat = processarTextoChat;
  global.renderizarMensagensFeed = renderizarMensagensFeed;
  global.rolarParaMensagem = rolarParaMensagem;
  global.alternarReacaoMensagem = alternarReacaoMensagem;
  global.abrirBarraReacoesRapidas = abrirBarraReacoesRapidas;
  global.abrirPickerParaReacao = abrirPickerParaReacao;
  global.prepararRespostaMensagem = prepararRespostaMensagem;
  global.cancelarRespostaMensagem = cancelarRespostaMensagem;
  global.copiarTextoMensagem = copiarTextoMensagem;
  global.prepararEdicaoMensagem = prepararEdicaoMensagem;
  global.cancelarEdicaoMensagem = cancelarEdicaoMensagem;
  global.salvarEdicaoMensagemSupabase = salvarEdicaoMensagemSupabase;
  global.excluirPropriaMensagem = excluirPropriaMensagem;
  global.iniciarRealtimeGlobalChat = iniciarRealtimeGlobalChat;
  global.abrirMidiaFull = abrirMidiaFull;
  global.fecharMenuContextoMsg = fecharMenuContextoMsg;

  global.criarHtmlVideoCard = criarHtmlVideoCard;
  global.alternarPlayVideoCustom = alternarPlayVideoCustom;
  global.atualizarProgressoVideo = atualizarProgressoVideo;
  global.mudarProgressoVideo = mudarProgressoVideo;
  global.aoEncerrarVideoCustom = aoEncerrarVideoCustom;
  global.alternarMuteVideoCustom = alternarMuteVideoCustom;
  global.alternarFullscreenVideoCustom = alternarFullscreenVideoCustom;

  global.criarHtmlAudioCard = criarHtmlAudioCard;
  global.alternarPlayAudioCustom = alternarPlayAudioCustom;
  global.atualizarProgressoAudio = atualizarProgressoAudio;
  global.mudarProgressoAudio = mudarProgressoAudio;
  global.finalizarAudioCustom = finalizarAudioCustom;
  global.mudarVelocidadeAudio = mudarVelocidadeAudio;

})(typeof window !== 'undefined' ? window : this);
