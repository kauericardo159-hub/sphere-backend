// ==========================================================================
// CHAT VOZ & TELA MODULE (chatvoz.js) - WEBRTC ENGINE & GIF VAD REACTION
// Project Z v5.0 | Peer-to-Peer Mesh, Supabase Signaling & Dynamic DSP
// ==========================================================================

(function () {
  'use strict';

  // Configuração Padrão dos Servidores ICE (STUN/TURN)
  const RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ],
    iceCandidatePoolSize: 10
  };

  // Estado Global Unificado e Reativo da Chamada
  window.chatVozState = {
    ativo: false,
    chamando: false,
    recebendoChamada: false,
    alvoId: null,
    alvoNome: '',
    alvoUsername: '',
    alvoAvatar: '',
    alvoAvatarGif: '',
    myAvatar: '',
    myAvatarGif: '',
    localStream: null,
    remoteStream: null,
    screenStream: null,
    peerConnection: null,
    signalingChannel: null,
    micMutado: false,
    foneMutado: false,
    transmitindoTela: false,
    audioContext: null,
    analyserLocal: null,
    analyserRemote: null,
    vadAnimationId: null,
    minimizado: false,
    dispositivoMicAtual: '',
    dispositivoSaidaAtual: '',
    posicaoWidget: { top: null, left: null }
  };

  // Obtenção Segura do Supabase Client
  function obterSupabaseVoz() {
    return window.supabaseClient || window.supabase || window.sb || null;
  }

  // Injeção Dinâmica do CSS Avançado
  (function injetarCssChatVoz() {
    if (document.getElementById('chatvoz-css')) return;
    const style = document.createElement('style');
    style.id = 'chatvoz-css';
    style.textContent = `
      .chatvoz-widget {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 360px;
        background: rgba(15, 8, 18, 0.96);
        border: 1px solid rgba(255, 45, 85, 0.35);
        border-radius: 24px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 45, 85, 0.15);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        z-index: 4500;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        user-select: none;
        touch-action: none;
        transition: box-shadow 0.25s ease, border-color 0.25s ease, width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        will-change: transform;
      }

      .chatvoz-widget.dragging {
        box-shadow: 0 24px 70px rgba(255, 45, 85, 0.4);
        border-color: rgba(255, 45, 85, 0.8);
      }

      .chatvoz-widget.minimized {
        width: 230px;
        border-radius: 18px;
      }

      .chatvoz-widget.minimized .chatvoz-body {
        display: none !important;
      }

      .chatvoz-header {
        padding: 12px 16px;
        background: linear-gradient(90deg, rgba(255, 45, 85, 0.18), rgba(22, 11, 26, 0.8));
        border-bottom: 1px solid rgba(255, 45, 85, 0.2);
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: grab;
      }

      .chatvoz-header:active {
        cursor: grabbing;
      }

      .chatvoz-status-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.85rem;
        font-weight: 800;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .chatvoz-status-dot {
        width: 10px;
        height: 10px;
        min-width: 10px;
        background: #2ed573;
        border-radius: 50%;
        box-shadow: 0 0 12px #2ed573;
        animation: pulseGreen 1.6s infinite;
      }

      .chatvoz-status-dot.connecting {
        background: #eccc68;
        box-shadow: 0 0 12px #eccc68;
        animation: pulseYellow 1.2s infinite;
      }

      @keyframes pulseGreen {
        0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(46, 213, 115, 0.8); }
        70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(46, 213, 115, 0); }
        100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(46, 213, 115, 0); }
      }

      @keyframes pulseYellow {
        0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(236, 204, 104, 0.8); }
        70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(236, 204, 104, 0); }
        100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(236, 204, 104, 0); }
      }

      .chatvoz-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn-chatvoz-icon {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #d1c4d6;
        width: 30px;
        height: 30px;
        min-width: 30px;
        max-width: 30px;
        border-radius: 50%;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        transition: all 0.2s ease;
        padding: 0;
        flex-shrink: 0;
      }

      .btn-chatvoz-icon:hover {
        background: var(--chat-accent, #ff2d55);
        color: #ffffff;
        border-color: var(--chat-accent, #ff2d55);
        transform: scale(1.08);
      }

      .chatvoz-body {
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }

      /* Compartilhamento de Tela Video Display */
      .chatvoz-screenshare-container {
        width: 100%;
        height: 190px;
        background: #000000;
        border-radius: 16px;
        overflow: hidden;
        display: none;
        position: relative;
        border: 1px solid rgba(255, 45, 85, 0.4);
        box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
      }

      .chatvoz-screenshare-video {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .chatvoz-screenshare-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(255, 45, 85, 0.9);
        color: #ffffff;
        font-size: 0.68rem;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
      }

      .chatvoz-screenshare-fullscreen-btn {
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(10, 5, 12, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #ffffff;
        padding: 5px 8px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.82rem;
        transition: background 0.2s ease;
      }

      .chatvoz-screenshare-fullscreen-btn:hover {
        background: var(--chat-accent, #ff2d55);
      }

      /* Grid dos Participantes e Reatividade VAD GIF */
      .chatvoz-participants-grid {
        display: flex;
        align-items: center;
        justify-content: space-around;
        width: 100%;
        padding: 8px 0 18px 0;
      }

      .chatvoz-avatar-box {
        position: relative;
        width: 72px;
        height: 72px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .chatvoz-avatar-img-wrap {
        width: 72px;
        height: 72px;
        position: relative;
        border-radius: 50%;
      }

      .chatvoz-avatar-img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid rgba(255, 255, 255, 0.2);
        transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
      }

      .chatvoz-avatar-box.speaking .chatvoz-avatar-img {
        border-color: #2ed573;
        box-shadow: 0 0 20px #2ed573, inset 0 0 10px #2ed573;
        transform: scale(1.06);
      }

      .chatvoz-avatar-box.muted .chatvoz-avatar-img {
        border-color: #ff4757;
        opacity: 0.7;
      }

      .chatvoz-mute-badge {
        position: absolute;
        top: 0;
        right: 0;
        background: #ff4757;
        color: #ffffff;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.65rem;
        border: 2px solid #0f0812;
      }

      .chatvoz-participant-label {
        position: absolute;
        bottom: -22px;
        font-size: 0.75rem;
        font-weight: 700;
        color: #e6d8eb;
        white-space: nowrap;
        max-width: 90px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Controles de Mídia */
      .chatvoz-controls-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        width: 100%;
      }

      .chatvoz-btn-ctrl {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .chatvoz-btn-ctrl:hover {
        background: rgba(255, 45, 85, 0.25);
        border-color: var(--chat-accent, #ff2d55);
        transform: scale(1.06);
      }

      .chatvoz-btn-ctrl.active {
        background: #ff4757;
        border-color: #ff4757;
        color: #ffffff;
      }

      .chatvoz-btn-ctrl.disconnect {
        background: #ff4757;
        border-color: #ff4757;
        width: 48px;
        height: 48px;
        font-size: 1.15rem;
      }

      .chatvoz-btn-ctrl.disconnect:hover {
        background: #e02448;
        box-shadow: 0 0 16px rgba(255, 45, 85, 0.6);
        transform: scale(1.08);
      }

      /* Painel de Dispositivos e Sensibilidade VAD */
      .chatvoz-settings-panel {
        width: 100%;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 10px 12px;
        display: none;
        flex-direction: column;
        gap: 8px;
        box-sizing: border-box;
      }

      .chatvoz-settings-panel label {
        font-size: 0.68rem;
        font-weight: 800;
        color: #b3a5b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .chatvoz-select-device {
        width: 100%;
        background: #180c1e;
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 0.78rem;
        outline: none;
      }

      /* Modal de Chamada Recebida */
      .chatvoz-incoming-overlay {
        position: fixed;
        inset: 0;
        background: rgba(8, 4, 10, 0.88);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        z-index: 5000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeInCall 0.3s ease;
      }

      @keyframes fadeInCall {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }

      .chatvoz-incoming-card {
        width: 100%;
        max-width: 340px;
        background: #160d1b;
        border: 1px solid rgba(255, 45, 85, 0.4);
        border-radius: 24px;
        padding: 28px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.9);
      }

      .chatvoz-incoming-avatar {
        width: 88px;
        height: 88px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid var(--chat-accent, #ff2d55);
        box-shadow: 0 0 24px rgba(255, 45, 85, 0.5);
        animation: pulseAvatarCall 1.4s infinite;
      }

      @keyframes pulseAvatarCall {
        0% { transform: scale(0.96); }
        50% { transform: scale(1.04); }
        100% { transform: scale(0.96); }
      }

      .chatvoz-incoming-actions {
        display: flex;
        align-items: center;
        gap: 20px;
        width: 100%;
        justify-content: center;
        margin-top: 8px;
      }

      .btn-call-action {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        color: #ffffff;
        font-size: 1.3rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .btn-call-action.accept {
        background: #2ed573;
        box-shadow: 0 4px 20px rgba(46, 213, 115, 0.4);
      }

      .btn-call-action.accept:hover {
        transform: scale(1.1);
        background: #26af5f;
      }

      .btn-call-action.decline {
        background: #ff4757;
        box-shadow: 0 4px 20px rgba(255, 71, 87, 0.4);
      }

      .btn-call-action.decline:hover {
        transform: scale(1.1);
        background: #e02448;
      }
    `;
    document.head.appendChild(style);
  })();

  // Elemento Áudio Remoto Oculto
  function obterAudioRemotoElemento() {
    let audio = document.getElementById('chatvoz-remote-audio-player');
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'chatvoz-remote-audio-player';
      audio.autoplay = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);
    }
    return audio;
  }

  // Inicialização e Entrada na Chamada de Voz
  async function iniciarChamadaVoz(usuarioTarget) {
    if (window.chatVozState.ativo || window.chatVozState.chamando) {
      alert("Você já possui uma chamada ou solicitação de áudio em andamento.");
      return;
    }

    const me = typeof window.obterUsuarioLogadoChat === 'function'
      ? window.obterUsuarioLogadoChat()
      : JSON.parse(localStorage.getItem('usuario_logado') || '{}');

    if (!me || !me.id) {
      alert("Sessão inválida. Faça login novamente.");
      return;
    }

    window.chatVozState.ativo = true;
    window.chatVozState.chamando = true;
    window.chatVozState.alvoId = Number(usuarioTarget.id);
    window.chatVozState.alvoNome = usuarioTarget.nome || usuarioTarget.display_name || usuarioTarget.username || 'Contato';
    window.chatVozState.alvoUsername = usuarioTarget.username || 'user';

    const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(window.chatVozState.alvoNome)}`;
    window.chatVozState.alvoAvatar = (usuarioTarget.avatar_url && usuarioTarget.avatar_url.trim() !== '') ? usuarioTarget.avatar_url : defaultAvatar;
    window.chatVozState.alvoAvatarGif = usuarioTarget.avatar_gif_url || usuarioTarget.avatar_url || window.chatVozState.alvoAvatar;

    window.chatVozState.myAvatar = me.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(me.username || 'Eu')}`;
    window.chatVozState.myAvatarGif = me.avatar_gif_url || me.avatar_url || window.chatVozState.myAvatar;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      window.chatVozState.localStream = stream;
      renderizarWidgetVoz();
      tornarWidgetArrastavel();
      inicializarAudioContextEVAD(stream);
      popularDispositivosEntrada();
      iniciarSinalizacaoWebRTC(me.id, window.chatVozState.alvoId, true);

    } catch (err) {
      console.error("[ChatVoz] Falha ao obter microfone:", err);
      alert("Não foi possível acessar seu microfone. Verifique as permissões do seu navegador.");
      desconectarChamadaVoz();
    }
  }

  // Sinalização WebRTC via Supabase Realtime Channels
  function iniciarSinalizacaoWebRTC(meId, targetId, souIniciador) {
    const sb = obterSupabaseVoz();
    if (!sb) {
      console.error("[ChatVoz] Cliente Supabase não encontrado.");
      return;
    }

    const minId = Math.min(meId, targetId);
    const maxId = Math.max(meId, targetId);
    const channelName = `realtime_call_${minId}_${maxId}`;

    if (window.chatVozState.signalingChannel) {
      sb.removeChannel(window.chatVozState.signalingChannel);
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    window.chatVozState.peerConnection = pc;

    // Adiciona tracks locais ao PeerConnection
    if (window.chatVozState.localStream) {
      window.chatVozState.localStream.getTracks().forEach(track => {
        pc.addTrack(track, window.chatVozState.localStream);
      });
    }

    // Recebe tracks remotos
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        window.chatVozState.remoteStream = event.streams[0];
        const audioPlayer = obterAudioRemotoElemento();
        audioPlayer.srcObject = event.streams[0];

        // Processa VAD do áudio remoto
        analisarAudioRemoto(event.streams[0]);

        const statusDot = document.getElementById('chatvoz-status-dot');
        const statusTitle = document.getElementById('chatvoz-status-title-text');
        if (statusDot) statusDot.className = 'chatvoz-status-dot';
        if (statusTitle) statusTitle.innerText = `@${window.chatVozState.alvoNome}`;
      }
    };

    // Envia Candidatos ICE para o outro Peer
    pc.onicecandidate = (event) => {
      if (event.candidate && window.chatVozState.signalingChannel) {
        window.chatVozState.signalingChannel.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            remetente_id: meId,
            ice: event.candidate
          }
        });
      }
    };

    const channel = sb.channel(channelName);
    window.chatVozState.signalingChannel = channel;

    channel.on('broadcast', { event: 'signal' }, async (payload) => {
      const data = payload.payload;
      if (!data || Number(data.remetente_id) === Number(meId)) return;

      try {
        if (data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

          if (data.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: { remetente_id: meId, sdp: pc.localDescription }
            });
          }
        } else if (data.ice) {
          await pc.addIceCandidate(new RTCIceCandidate(data.ice));
        } else if (data.callEnd) {
          desconectarChamadaVoz(false);
        }
      } catch (e) {
        console.error("[ChatVoz] Erro no processamento SDP/ICE:", e);
      }
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && souIniciador) {
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          await pc.setLocalDescription(offer);

          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { remetente_id: meId, sdp: pc.localDescription }
          });
        } catch (e) {
          console.error("[ChatVoz] Erro ao criar oferta WebRTC:", e);
        }
      }
    });
  }

  // Renderizar Widget da Chamada
  function renderizarWidgetVoz() {
    const antigo = document.getElementById('chatvoz-widget');
    if (antigo) antigo.remove();

    const widget = document.createElement('div');
    widget.id = 'chatvoz-widget';
    widget.className = 'chatvoz-widget';

    widget.innerHTML = `
      <div class="chatvoz-header" id="chatvoz-header-drag">
        <div class="chatvoz-status-title">
          <div class="chatvoz-status-dot connecting" id="chatvoz-status-dot"></div>
          <span id="chatvoz-status-title-text">Conectando a @${window.chatVozState.alvoNome}...</span>
        </div>
        <div class="chatvoz-header-actions" onclick="event.stopPropagation()">
          <button class="btn-chatvoz-icon" onclick="window.alternarPainelAjustesVoz()" title="Ajustes de Áudio">
            <i class="fa-solid fa-gear"></i>
          </button>
          <button class="btn-chatvoz-icon" onclick="window.alternarMinimizarVoz()" title="Minimizar">
            <i class="fa-solid fa-minus"></i>
          </button>
          <button class="btn-chatvoz-icon" onclick="window.desconectarChamadaVoz()" title="Desconectar">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="chatvoz-body">
        <div class="chatvoz-screenshare-container" id="chatvoz-screenshare-box">
          <div class="chatvoz-screenshare-badge"><i class="fa-solid fa-desktop"></i> TRANSMISSÃO AO VIVO</div>
          <video id="chatvoz-screen-video" autoplay playsinline class="chatvoz-screenshare-video"></video>
          <button class="chatvoz-screenshare-fullscreen-btn" onclick="window.expandirTelaCheiaStream()" title="Tela Cheia">
            <i class="fa-solid fa-expand"></i>
          </button>
        </div>

        <div class="chatvoz-participants-grid">
          <div class="chatvoz-avatar-box" id="avatar-box-me">
            <div class="chatvoz-avatar-img-wrap">
              <img src="${window.chatVozState.myAvatar}" class="chatvoz-avatar-img" id="avatar-img-me" alt="Eu">
              <div class="chatvoz-mute-badge" id="badge-mute-me" style="display:none;"><i class="fa-solid fa-microphone-slash"></i></div>
            </div>
            <span class="chatvoz-participant-label">Você</span>
          </div>

          <div class="chatvoz-avatar-box" id="avatar-box-target">
            <div class="chatvoz-avatar-img-wrap">
              <img src="${window.chatVozState.alvoAvatar}" class="chatvoz-avatar-img" id="avatar-img-target" alt="Target">
              <div class="chatvoz-mute-badge" id="badge-mute-target" style="display:none;"><i class="fa-solid fa-volume-xmark"></i></div>
            </div>
            <span class="chatvoz-participant-label">${window.chatVozState.alvoNome}</span>
          </div>
        </div>

        <div class="chatvoz-settings-panel" id="chatvoz-settings-panel">
          <label>Microfone de Entrada</label>
          <select class="chatvoz-select-device" id="chatvoz-select-mic" onchange="window.trocarDispositivoAudio('input', this.value)"></select>
          
          <label>Dispositivo de Saída</label>
          <select class="chatvoz-select-device" id="chatvoz-select-speaker" onchange="window.trocarDispositivoAudio('output', this.value)"></select>
        </div>

        <div class="chatvoz-controls-bar">
          <button class="chatvoz-btn-ctrl" id="btn-chatvoz-mic" onclick="window.alternarMuteMic()" title="Mutar Microfone">
            <i class="fa-solid fa-microphone"></i>
          </button>
          <button class="chatvoz-btn-ctrl" id="btn-chatvoz-fone" onclick="window.alternarMuteFone()" title="Ensurdecer">
            <i class="fa-solid fa-headphones"></i>
          </button>
          <button class="chatvoz-btn-ctrl" id="btn-chatvoz-screen" onclick="window.alternarTransmissaoTela()" title="Compartilhar Tela">
            <i class="fa-solid fa-desktop"></i>
          </button>
          <button class="chatvoz-btn-ctrl disconnect" onclick="window.desconectarChamadaVoz()" title="Desconectar">
            <i class="fa-solid fa-phone-slash"></i>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    if (window.chatVozState.posicaoWidget.top && window.chatVozState.posicaoWidget.left) {
      widget.style.top = window.chatVozState.posicaoWidget.top;
      widget.style.left = window.chatVozState.posicaoWidget.left;
      widget.style.bottom = 'auto';
      widget.style.right = 'auto';
    }
  }

  // Tornar Widget Arrastável com Suporte Touch/Mouse e Hardware Acceleration
  function tornarWidgetArrastavel() {
    const widget = document.getElementById('chatvoz-widget');
    const header = document.getElementById('chatvoz-header-drag');
    if (!widget || !header) return;

    let posX = 0, posY = 0, initialX = 0, initialY = 0;

    header.onmousedown = dragMouseDown;
    header.ontouchstart = dragTouchStart;

    function dragMouseDown(e) {
      if (e.target.closest('.chatvoz-header-actions')) return;
      e.preventDefault();
      initialX = e.clientX;
      initialY = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
      widget.classList.add('dragging');
    }

    function elementDrag(e) {
      e.preventDefault();
      posX = initialX - e.clientX;
      posY = initialY - e.clientY;
      initialX = e.clientX;
      initialY = e.clientY;

      const top = Math.max(10, Math.min(window.innerHeight - 80, widget.offsetTop - posY));
      const left = Math.max(10, Math.min(window.innerWidth - 120, widget.offsetLeft - posX));

      widget.style.top = `${top}px`;
      widget.style.left = `${left}px`;
      widget.style.bottom = 'auto';
      widget.style.right = 'auto';

      window.chatVozState.posicaoWidget = { top: `${top}px`, left: `${left}px` };
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
      widget.classList.remove('dragging');
    }

    function dragTouchStart(e) {
      if (e.target.closest('.chatvoz-header-actions')) return;
      const touch = e.touches[0];
      initialX = touch.clientX;
      initialY = touch.clientY;
      document.ontouchend = closeTouchDrag;
      document.ontouchmove = touchDrag;
      widget.classList.add('dragging');
    }

    function touchDrag(e) {
      const touch = e.touches[0];
      posX = initialX - touch.clientX;
      posY = initialY - touch.clientY;
      initialX = touch.clientX;
      initialY = touch.clientY;

      const top = Math.max(10, Math.min(window.innerHeight - 80, widget.offsetTop - posY));
      const left = Math.max(10, Math.min(window.innerWidth - 120, widget.offsetLeft - posX));

      widget.style.top = `${top}px`;
      widget.style.left = `${left}px`;
      widget.style.bottom = 'auto';
      widget.style.right = 'auto';

      window.chatVozState.posicaoWidget = { top: `${top}px`, left: `${left}px` };
    }

    function closeTouchDrag() {
      document.ontouchend = null;
      document.ontouchmove = null;
      widget.classList.remove('dragging');
    }
  }

  // Inicialização do Web Audio API & Detecção VAD Local
  function inicializarAudioContextEVAD(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;

      window.chatVozState.audioContext = audioContext;
      window.chatVozState.analyserLocal = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const boxMe = document.getElementById('avatar-box-me');
      const imgMe = document.getElementById('avatar-img-me');

      function LoopVADLocal() {
        if (!window.chatVozState.ativo) return;

        analyser.getByteFrequencyData(dataArray);
        let soma = 0;
        for (let i = 0; i < bufferLength; i++) soma += dataArray[i];
        let media = soma / bufferLength;

        if (boxMe && imgMe) {
          if (media > 14 && !window.chatVozState.micMutado) {
            boxMe.classList.add('speaking');
            if (imgMe.src !== window.chatVozState.myAvatarGif) {
              imgMe.src = window.chatVozState.myAvatarGif;
            }
          } else {
            boxMe.classList.remove('speaking');
            if (imgMe.src !== window.chatVozState.myAvatar) {
              imgMe.src = window.chatVozState.myAvatar;
            }
          }
        }
        window.chatVozState.vadAnimationId = requestAnimationFrame(LoopVADLocal);
      }

      LoopVADLocal();
    } catch (e) {
      console.warn("[ChatVoz] Erro no analisador de áudio local:", e);
    }
  }

  // Análise de Áudio Remoto para Alternância de GIF VAD
  function analisarAudioRemoto(stream) {
    try {
      if (!window.chatVozState.audioContext) return;
      const analyser = window.chatVozState.audioContext.createAnalyser();
      const source = window.chatVozState.audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;

      window.chatVozState.analyserRemote = analyser;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const boxTarget = document.getElementById('avatar-box-target');
      const imgTarget = document.getElementById('avatar-img-target');

      function LoopVADRemoto() {
        if (!window.chatVozState.ativo) return;

        analyser.getByteFrequencyData(dataArray);
        let soma = 0;
        for (let i = 0; i < bufferLength; i++) soma += dataArray[i];
        let media = soma / bufferLength;

        if (boxTarget && imgTarget) {
          if (media > 14 && !window.chatVozState.foneMutado) {
            boxTarget.classList.add('speaking');
            if (imgTarget.src !== window.chatVozState.alvoAvatarGif) {
              imgTarget.src = window.chatVozState.alvoAvatarGif;
            }
          } else {
            boxTarget.classList.remove('speaking');
            if (imgTarget.src !== window.chatVozState.alvoAvatar) {
              imgTarget.src = window.chatVozState.alvoAvatar;
            }
          }
        }
        requestAnimationFrame(LoopVADRemoto);
      }

      LoopVADRemoto();
    } catch (e) {
      console.warn("[ChatVoz] Erro na análise do áudio remoto:", e);
    }
  }

  // Alternar Mute do Microfone Local
  function alternarMuteMic() {
    if (!window.chatVozState.localStream) return;
    const audioTrack = window.chatVozState.localStream.getAudioTracks()[0];

    if (audioTrack) {
      window.chatVozState.micMutado = !window.chatVozState.micMutado;
      audioTrack.enabled = !window.chatVozState.micMutado;

      const btn = document.getElementById('btn-chatvoz-mic');
      const badge = document.getElementById('badge-mute-me');
      const boxMe = document.getElementById('avatar-box-me');

      if (btn) {
        btn.classList.toggle('active', window.chatVozState.micMutado);
        btn.innerHTML = window.chatVozState.micMutado 
          ? '<i class="fa-solid fa-microphone-slash"></i>' 
          : '<i class="fa-solid fa-microphone"></i>';
      }

      if (badge) badge.style.display = window.chatVozState.micMutado ? 'flex' : 'none';
      if (boxMe) boxMe.classList.toggle('muted', window.chatVozState.micMutado);
    }
  }

  // Alternar Ensurdecer Áudio Remoto
  function alternarMuteFone() {
    window.chatVozState.foneMutado = !window.chatVozState.foneMutado;
    const audioPlayer = obterAudioRemotoElemento();
    audioPlayer.muted = window.chatVozState.foneMutado;

    const btn = document.getElementById('btn-chatvoz-fone');
    const badge = document.getElementById('badge-mute-target');
    const boxTarget = document.getElementById('avatar-box-target');

    if (btn) {
      btn.classList.toggle('active', window.chatVozState.foneMutado);
      btn.innerHTML = window.chatVozState.foneMutado 
        ? '<i class="fa-solid fa-volume-xmark"></i>' 
        : '<i class="fa-solid fa-headphones"></i>';
    }

    if (badge) badge.style.display = window.chatVozState.foneMutado ? 'flex' : 'none';
    if (boxTarget) boxTarget.classList.toggle('muted', window.chatVozState.foneMutado);
  }

  // Compartilhamento e Transmissão de Tela
  async function alternarTransmissaoTela() {
    const boxVideo = document.getElementById('chatvoz-screenshare-box');
    const videoEl = document.getElementById('chatvoz-screen-video');

    if (window.chatVozState.transmitindoTela) {
      if (window.chatVozState.screenStream) {
        window.chatVozState.screenStream.getTracks().forEach(t => t.stop());
      }
      window.chatVozState.transmitindoTela = false;
      if (boxVideo) boxVideo.style.display = 'none';
      document.getElementById('btn-chatvoz-screen')?.classList.remove('active');
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true
        });

        window.chatVozState.screenStream = screenStream;
        window.chatVozState.transmitindoTela = true;

        if (videoEl) videoEl.srcObject = screenStream;
        if (boxVideo) boxVideo.style.display = 'block';
        document.getElementById('btn-chatvoz-screen')?.classList.add('active');

        const videoTrack = screenStream.getVideoTracks()[0];
        
        // Se houver conexão WebRTC, troca o track no Sender
        if (window.chatVozState.peerConnection) {
          const sender = window.chatVozState.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          } else {
            window.chatVozState.peerConnection.addTrack(videoTrack, screenStream);
          }
        }

        videoTrack.onended = () => {
          alternarTransmissaoTela();
        };

      } catch (err) {
        console.warn("[ChatVoz] Transmissão de tela cancelada:", err);
      }
    }
  }

  function expandirTelaCheiaStream() {
    const videoEl = document.getElementById('chatvoz-screen-video');
    if (!videoEl) return;
    if (videoEl.requestFullscreen) videoEl.requestFullscreen();
    else if (videoEl.webkitRequestFullscreen) videoEl.webkitRequestFullscreen();
  }

  // Enumerar Dispositivos de Áudio
  async function popularDispositivosEntrada() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const selectMic = document.getElementById('chatvoz-select-mic');
      const selectSpeaker = document.getElementById('chatvoz-select-speaker');

      if (selectMic) selectMic.innerHTML = '';
      if (selectSpeaker) selectSpeaker.innerHTML = '';

      devices.forEach(dev => {
        const option = document.createElement('option');
        option.value = dev.deviceId;
        option.text = dev.label || `${dev.kind === 'audioinput' ? 'Microfone' : 'Saída'} (${dev.deviceId.slice(0, 5)})`;

        if (dev.kind === 'audioinput' && selectMic) selectMic.appendChild(option);
        if (dev.kind === 'audiooutput' && selectSpeaker) selectSpeaker.appendChild(option);
      });
    } catch (e) {
      console.error("[ChatVoz] Erro ao enumerar dispositivos:", e);
    }
  }

  // Trocar Dispositivo Ativo em Tempo Real
  async function trocarDispositivoAudio(tipo, deviceId) {
    if (tipo === 'input') {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } }
        });

        const newTrack = newStream.getAudioTracks()[0];
        if (window.chatVozState.peerConnection) {
          const sender = window.chatVozState.peerConnection.getSenders().find(s => s.track && s.track.kind === 'audio');
          if (sender) sender.replaceTrack(newTrack);
        }

        window.chatVozState.localStream = newStream;
        inicializarAudioContextEVAD(newStream);
      } catch (e) {
        console.error("[ChatVoz] Erro ao trocar microfone:", e);
      }
    } else if (tipo === 'output') {
      const audioPlayer = obterAudioRemotoElemento();
      if (typeof audioPlayer.setSinkId === 'function') {
        try {
          await audioPlayer.setSinkId(deviceId);
        } catch (e) {
          console.error("[ChatVoz] Erro ao trocar saída de áudio:", e);
        }
      }
    }
  }

  function alternarPainelAjustesVoz() {
    const p = document.getElementById('chatvoz-settings-panel');
    if (p) p.style.display = p.style.display === 'flex' ? 'none' : 'flex';
  }

  function alternarMinimizarVoz() {
    const w = document.getElementById('chatvoz-widget');
    if (w) {
      window.chatVozState.minimizado = !window.chatVozState.minimizado;
      w.classList.toggle('minimized', window.chatVozState.minimizado);
    }
  }

  // Desconexão Limpa e Fechamento Geral
  function desconectarChamadaVoz(notificarOutroPeer = true) {
    if (notificarOutroPeer && window.chatVozState.signalingChannel) {
      const me = typeof window.obterUsuarioLogadoChat === 'function' ? window.obterUsuarioLogadoChat() : null;
      if (me) {
        window.chatVozState.signalingChannel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { remetente_id: me.id, callEnd: true }
        });
      }
    }

    if (window.chatVozState.vadAnimationId) {
      cancelAnimationFrame(window.chatVozState.vadAnimationId);
    }

    if (window.chatVozState.localStream) {
      window.chatVozState.localStream.getTracks().forEach(t => t.stop());
    }

    if (window.chatVozState.screenStream) {
      window.chatVozState.screenStream.getTracks().forEach(t => t.stop());
    }

    if (window.chatVozState.audioContext) {
      window.chatVozState.audioContext.close().catch(() => {});
    }

    if (window.chatVozState.peerConnection) {
      window.chatVozState.peerConnection.close();
    }

    const sb = obterSupabaseVoz();
    if (sb && window.chatVozState.signalingChannel) {
      sb.removeChannel(window.chatVozState.signalingChannel);
    }

    const audioPlayer = document.getElementById('chatvoz-remote-audio-player');
    if (audioPlayer) audioPlayer.remove();

    window.chatVozState.ativo = false;
    window.chatVozState.chamando = false;
    window.chatVozState.recebendoChamada = false;
    window.chatVozState.localStream = null;
    window.chatVozState.remoteStream = null;
    window.chatVozState.screenStream = null;
    window.chatVozState.peerConnection = null;
    window.chatVozState.signalingChannel = null;

    const widget = document.getElementById('chatvoz-widget');
    if (widget) widget.remove();
  }

  // Exportações Globais
  window.iniciarChamadaVoz = iniciarChamadaVoz;
  window.desconectarChamadaVoz = desconectarChamadaVoz;
  window.alternarMuteMic = alternarMuteMic;
  window.alternarMuteFone = alternarMuteFone;
  window.alternarTransmissaoTela = alternarTransmissaoTela;
  window.expandirTelaCheiaStream = expandirTelaCheiaStream;
  window.alternarMinimizarVoz = alternarMinimizarVoz;
  window.alternarPainelAjustesVoz = alternarPainelAjustesVoz;
  window.trocarDispositivoAudio = trocarDispositivoAudio;
})();
