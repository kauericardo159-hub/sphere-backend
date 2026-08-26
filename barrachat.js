// ==========================================================================
// BARRACAT MODULE (barrachat.js) - ADVANCED MEDIA, AUDIO RECORDER & @MENTION
// Project Z v5.0 | Supabase Storage Integration, Smart Drafts & Mention Search
// ==========================================================================

let anexosListDataUrl = [];
let mensagemRespondendo = null;
let typingTimeout = null;

// Estados da Gravação de Áudio
let mediaRecorder = null;
let audioChunks = [];
let audioTimerInterval = null;
let audioSegundosGravados = 0;

// Helper para obtenção do Cliente Supabase
function obterSupabaseBarraChat() {
  return window.supabaseClient || window.supabase || window.sb || null;
}

// CSS Otimizado com Injeção Dinâmica
(function injetarCssBorraChat() {
  if (document.getElementById('borrachat-css')) return;
  const style = document.createElement('style');
  style.id = 'borrachat-css';
  style.textContent = `
    .chat-input-container {
      padding: 8px 12px;
      background: var(--chat-header-bg, #160d19);
      border-top: 1px solid rgba(255, 45, 85, 0.2);
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
      box-sizing: border-box;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    .chat-input-container.drag-over {
      background: rgba(255, 45, 85, 0.15) !important;
      border-top-color: var(--chat-accent, #ff2d55) !important;
    }

    /* Linha Superior: Botões (+) e Enviar/Cancelar */
    .chat-controls-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }

    .chat-controls-left,
    .chat-controls-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Botões Circulares Compactos */
    .btn-barrachat-icon {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #d1c4d6;
      width: 32px;
      height: 32px;
      min-width: 32px;
      max-width: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      transition: all 0.2s ease;
      padding: 0;
      flex-shrink: 0;
    }

    .btn-barrachat-icon:hover:not(:disabled) {
      background: var(--chat-accent, #ff2d55);
      color: #ffffff;
      border-color: var(--chat-accent, #ff2d55);
      transform: scale(1.05);
    }

    .btn-barrachat-icon:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      transform: none;
    }

    .btn-barrachat-icon.danger {
      color: #ff4757;
      border-color: rgba(255, 71, 87, 0.3);
      background: rgba(255, 71, 87, 0.15);
    }

    .btn-barrachat-icon.danger:hover:not(:disabled) {
      background: #ff4757;
      color: #ffffff;
      border-color: #ff4757;
    }

    .chat-btn-send-top {
      background: var(--chat-accent, #ff2d55);
      border: none;
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 18px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 8px rgba(255, 45, 85, 0.3);
      transition: all 0.2s ease;
    }

    .chat-btn-send-top:hover:not(:disabled) {
      background: #e02648;
      transform: translateY(-1px);
    }

    .chat-btn-send-top:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* Input Multilinha Flexível */
    .chat-input-row-full {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      padding: 6px 10px;
      width: 100%;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }

    .chat-input-row-full:focus-within {
      border-color: rgba(255, 45, 85, 0.6);
    }

    .chat-input-text {
      flex: 1;
      background: transparent !important;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      color: #ffffff;
      font-size: 0.88rem;
      font-family: inherit;
      padding: 0;
      margin: 0;
      width: 100%;
      resize: none;
      height: 22px;
      max-height: 110px;
      line-height: 1.35;
      overflow-y: auto;
      display: block;
    }

    .chat-input-text::-webkit-scrollbar {
      width: 4px;
    }
    .chat-input-text::-webkit-scrollbar-thumb {
      background: rgba(255, 45, 85, 0.3);
      border-radius: 4px;
    }

    .chat-input-text::placeholder {
      color: #8e7f96;
    }

    /* Barra de Gravação de Áudio */
    .chat-audio-recording-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 45, 85, 0.12);
      border: 1px solid rgba(255, 45, 85, 0.4);
      border-radius: 14px;
      padding: 6px 12px;
      width: 100%;
      box-sizing: border-box;
    }

    .chat-audio-recording-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #ff4757;
      font-weight: 800;
      font-size: 0.82rem;
    }

    .chat-audio-rec-dot {
      width: 8px;
      height: 8px;
      background: #ff4757;
      border-radius: 50%;
      animation: blinkRec 1s infinite;
      box-shadow: 0 0 8px #ff4757;
    }

    @keyframes blinkRec {
      0% { opacity: 1; }
      50% { opacity: 0.2; }
      100% { opacity: 1; }
    }

    .chat-audio-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Menu Flutuante de Sugestão de Menção (@) */
    .chat-mention-suggestions-box {
      position: absolute;
      bottom: calc(100% + 4px);
      left: 12px;
      background: #180c1b;
      border: 1px solid rgba(255, 45, 85, 0.35);
      border-radius: 12px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
      z-index: 100;
      max-width: 280px;
      max-height: 180px;
      overflow-y: auto;
    }

    .chat-mention-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      color: #ffffff;
      font-size: 0.8rem;
      transition: background 0.15s;
    }

    .chat-mention-item:hover {
      background: rgba(255, 45, 85, 0.2);
    }

    .chat-mention-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      object-fit: cover;
    }

    /* Mídias em Anexo */
    .chat-attachment-preview-box {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 6px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 10px;
      border: 1px solid rgba(255, 45, 85, 0.3);
    }

    .chat-preview-item {
      position: relative;
      width: 52px;
      height: 52px;
      flex-shrink: 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: #0d0610;
    }

    .chat-preview-item img, .chat-preview-item video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .btn-remove-attachment {
      position: absolute;
      top: 2px;
      right: 2px;
      background: rgba(0, 0, 0, 0.85);
      color: #ff4757;
      border: none;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 0.65rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }

    .btn-toggle-media-spoiler {
      position: absolute;
      bottom: 2px;
      left: 2px;
      background: rgba(0, 0, 0, 0.85);
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 2px 4px;
      font-size: 0.6rem;
      cursor: pointer;
      z-index: 2;
    }

    .btn-toggle-media-spoiler.active {
      color: var(--chat-accent, #ff2d55);
    }
  `;
  document.head.appendChild(style);
})();

function renderizarBarraChat() {
  const container = document.getElementById('chat-input-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Menu de Autocomplete de Menções (@) -->
    <div id="chat-mention-suggestions" class="chat-mention-suggestions-box" style="display: none;"></div>

    <!-- Controles do Topo -->
    <div class="chat-controls-top-row">
      <div class="chat-controls-left">
        <button class="btn-barrachat-icon" id="btn-chat-plus" onclick="abrirGaleriaDirecta()" title="Enviar Anexo" disabled>
          <i class="fa-solid fa-plus"></i>
        </button>
        <button class="btn-barrachat-icon" id="btn-chat-mic" onclick="iniciarGravacaoAudio()" title="Gravar Áudio" disabled>
          <i class="fa-solid fa-microphone"></i>
        </button>
      </div>
      
      <div class="chat-controls-right">
        <button id="btn-cancel-chat" class="btn-barrachat-icon danger" onclick="cancelarAcaoChat()" title="Cancelar" style="display: none;">
          <i class="fa-solid fa-xmark"></i>
        </button>
        
        <button id="btn-send-chat" class="chat-btn-send-top" onclick="enviarMensagemChat()" disabled title="Enviar">
          <i class="fa-solid fa-paper-plane"></i> Enviar
        </button>
      </div>
    </div>

    <!-- Barra de Gravação de Áudio (Oculta por Padrão) -->
    <div id="chat-audio-recording-bar" class="chat-audio-recording-bar" style="display: none;">
      <div class="chat-audio-recording-indicator">
        <div class="chat-audio-rec-dot"></div>
        <span id="chat-audio-rec-timer">Gravando: 00:00</span>
      </div>
      <div class="chat-audio-actions">
        <button class="btn-barrachat-icon danger" onclick="cancelarGravacaoAudio()" title="Descartar"><i class="fa-solid fa-trash"></i></button>
        <button class="chat-btn-send-top" onclick="finalizarEEnviarAudio()"><i class="fa-solid fa-paper-plane"></i> Enviar</button>
      </div>
    </div>

    <!-- Campo de Digitação Textarea -->
    <div class="chat-input-row-full" id="chat-input-row-dropzone">
      <input type="file" id="chat-file-input" accept="image/*,video/*" multiple style="display: none;" onchange="processarAnexoChat(this)">
      <textarea id="chat-text-input" class="chat-input-text" placeholder="Conversar..." oninput="tratarInputTexto(this)" onkeydown="checarTeclaChat(event)" onpaste="tratarColagemMidia(event)" disabled></textarea>
    </div>
  `;

  configurarDragAndDropBarra();
  restaurarRascunhoSalvo();
}

function abrirGaleriaDirecta() {
  const fileInput = document.getElementById('chat-file-input');
  if (fileInput) fileInput.click();
}

// Suporte a Gravação de Áudio
async function iniciarGravacaoAudio() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Seu navegador não suporta gravação de áudio.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.start();

    audioSegundosGravados = 0;
    const recBar = document.getElementById('chat-audio-recording-bar');
    const inputRow = document.getElementById('chat-input-row-dropzone');
    if (recBar) recBar.style.display = 'flex';
    if (inputRow) inputRow.style.display = 'none';

    audioTimerInterval = setInterval(() => {
      audioSegundosGravados++;
      const m = String(Math.floor(audioSegundosGravados / 60)).padStart(2, '0');
      const s = String(audioSegundosGravados % 60).padStart(2, '0');
      const timerEl = document.getElementById('chat-audio-rec-timer');
      if (timerEl) timerEl.innerText = `Gravando: ${m}:${s}`;
    }, 1000);

  } catch (err) {
    alert("Não foi possível acessar o microfone.");
  }
}

function cancelarGravacaoAudio() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
  }
  clearInterval(audioTimerInterval);
  const recBar = document.getElementById('chat-audio-recording-bar');
  const inputRow = document.getElementById('chat-input-row-dropzone');
  if (recBar) recBar.style.display = 'none';
  if (inputRow) inputRow.style.display = 'flex';
}

function finalizarEEnviarAudio() {
  if (!mediaRecorder) return;

  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.onload = (e) => {
      anexosListDataUrl.push({
        blob: audioBlob,
        url: e.target.result,
        nome: `nota-de-audio-${Date.now()}.webm`,
        tipo: 'audio',
        isSpoiler: false
      });
      enviarMensagemChat();
    };
    reader.readAsDataURL(audioBlob);
    cancelarGravacaoAudio();
  };

  mediaRecorder.stop();
  if (mediaRecorder.stream) {
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
  }
}

// Autocomplete de Menção (@)
function checarEExibirMencoes(input) {
  const val = input.value;
  const cursor = input.selectionStart;
  const textoAteCursor = val.slice(0, cursor);
  const match = textoAteCursor.match(/@([\w]*)$/);

  const box = document.getElementById('chat-mention-suggestions');
  if (!box) return;

  if (match) {
    const termo = match[1].toLowerCase();
    let listaCandidatos = [];

    if (window.chatTargetAtual) {
      listaCandidatos.push(window.chatTargetAtual);
    }
    if (window.listaContatosCache && Array.isArray(window.listaContatosCache)) {
      window.listaContatosCache.forEach(c => {
        if (!listaCandidatos.some(item => Number(item.id) === Number(c.id))) {
          listaCandidatos.push(c);
        }
      });
    }

    const filtrados = listaCandidatos.filter(u => {
      const uname = (u.username || '').toLowerCase();
      const dname = (u.display_name || u.nome || '').toLowerCase();
      return uname.includes(termo) || dname.includes(termo);
    }).slice(0, 5);

    if (filtrados.length > 0) {
      box.style.display = 'flex';
      box.innerHTML = filtrados.map(u => `
        <div class="chat-mention-item" onclick="inserirMencaoUsuario('${u.username || u.nome}')">
          <img src="${u.avatar_url || 'https://ui-avatars.com/api/?name=U'}" class="chat-mention-avatar" alt="Avatar">
          <span>@${u.username || u.nome} (${u.display_name || u.nome || 'Usuário'})</span>
        </div>
      `).join('');
      return;
    }
  }

  box.style.display = 'none';
}

function inserirMencaoUsuario(username) {
  const input = document.getElementById('chat-text-input');
  if (!input) return;

  const val = input.value;
  const cursor = input.selectionStart;
  const textoAntes = val.slice(0, cursor).replace(/@[\w]*$/, `@${username} `);
  const textoDepois = val.slice(cursor);

  input.value = textoAntes + textoDepois;
  input.focus();
  document.getElementById('chat-mention-suggestions').style.display = 'none';
  tratarInputTexto(input);
}

// Configuração do Drag and Drop de Mídias
function configurarDragAndDropBarra() {
  const container = document.getElementById('chat-input-container');
  if (!container) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    container.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    container.addEventListener(eventName, () => container.classList.add('drag-over'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    container.addEventListener(eventName, () => container.classList.remove('drag-over'), false);
  });

  container.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files && files.length > 0) {
      processarArquivosAnexos(files);
    }
  }
}

function tratarColagemMidia(event) {
  const items = (event.clipboardData || event.originalEvent.clipboardData).items;
  let filesToProcess = [];

  for (let index in items) {
    const item = items[index];
    if (item.kind === 'file') {
      const blob = item.getAsFile();
      if (blob) filesToProcess.push(blob);
    }
  }

  if (filesToProcess.length > 0) {
    event.preventDefault();
    processarArquivosAnexos(filesToProcess);
  }
}

function ativarInputChat(ativo) {
  const btnPlus = document.getElementById('btn-chat-plus');
  const btnMic = document.getElementById('btn-chat-mic');
  const inputText = document.getElementById('chat-text-input');
  const btnSend = document.getElementById('btn-send-chat');

  if (btnPlus) btnPlus.disabled = !ativo;
  if (btnMic) btnMic.disabled = !ativo;
  if (inputText) inputText.disabled = !ativo;
  if (btnSend) btnSend.disabled = !ativo;

  if (inputText && window.chatTargetAtual) {
    inputText.placeholder = `Conversar com @${window.chatTargetAtual.username || window.chatTargetAtual.nome}...`;
  }

  if (ativo) restaurarRascunhoSalvo();
}

function tratarInputTexto(input) {
  input.style.height = '22px';
  input.style.height = Math.min(input.scrollHeight, 110) + 'px';

  const val = input.value;
  checarEExibirMencoes(input);

  const draftBox = document.getElementById('chat-draft-reader-box');

  if (window.chatTargetAtual) {
    const key = `chat_draft_${window.chatTargetAtual.id}`;
    if (val.trim()) localStorage.setItem(key, val);
    else localStorage.removeItem(key);
  }

  if (draftBox) {
    if (val.length > 60 || val.includes('\n')) {
      draftBox.style.display = 'block';
      draftBox.innerText = `Rascunho salvo...`;
    } else {
      draftBox.style.display = 'none';
    }
  }

  if (typeof window.emitirStatusDigitando === 'function') {
    window.emitirStatusDigitando(true);

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      window.emitirStatusDigitando(false);
    }, 2500);
  }

  checarExibicaoBotaoCancelar();
}

function restaurarRascunhoSalvo() {
  if (!window.chatTargetAtual) return;
  const key = `chat_draft_${window.chatTargetAtual.id}`;
  const rascunho = localStorage.getItem(key);
  const inputEl = document.getElementById('chat-text-input');

  if (rascunho && inputEl) {
    inputEl.value = rascunho;
    tratarInputTexto(inputEl);
  }
}

// Upload seguro para o Supabase Storage com fallback DataURL
async function realizarUploadMidiaSupabase(anexo) {
  const sb = obterSupabaseBarraChat();
  if (!sb || !anexo.file) return anexo.url;

  try {
    const fileExt = anexo.nome.split('.').pop();
    const filePath = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

    const { data, error } = await sb.storage
      .from('chat-media')
      .upload(filePath, anexo.file, { cacheControl: '3600', upsert: false });

    if (error || !data) {
      console.warn("[BarraChat] Falha no upload do Storage, usando DataURL fallback:", error);
      return anexo.url;
    }

    const { data: publicUrlData } = sb.storage.from('chat-media').getPublicUrl(filePath);
    return publicUrlData ? publicUrlData.publicUrl : anexo.url;
  } catch (err) {
    console.error("[BarraChat] Erro ao enviar arquivo para o Storage:", err);
    return anexo.url;
  }
}

async function enviarMensagemChat() {
  const inputEl = document.getElementById('chat-text-input');
  const btnSend = document.getElementById('btn-send-chat');
  let texto = inputEl ? inputEl.value.trim() : '';
  
  if (!texto && anexosListDataUrl.length === 0) return;

  const usuarioLogado = typeof window.obterUsuarioLogadoChat === 'function' ? window.obterUsuarioLogadoChat() : null;
  const clientSupabase = obterSupabaseBarraChat();
  if (!usuarioLogado || !clientSupabase || !window.chatTargetAtual) return;

  if (btnSend) btnSend.disabled = true;

  try {
    let urlAnexo = null;
    if (anexosListDataUrl.length > 0) {
      // Processa o upload dos anexos
      const listaMidiasProcessadas = await Promise.all(
        anexosListDataUrl.map(async (item) => {
          const finalUrl = item.file ? await realizarUploadMidiaSupabase(item) : item.url;
          return {
            url: finalUrl,
            nome: item.nome,
            tipo: item.tipo,
            isSpoiler: item.isSpoiler
          };
        })
      );
      urlAnexo = JSON.stringify(listaMidiasProcessadas);
    }

    let payload = {
      remetente_id: Number(usuarioLogado.id),
      destinatario_id: Number(window.chatTargetAtual.id),
      conteudo: texto,
      imagem_url: urlAnexo
    };

    if (mensagemRespondendo) {
      payload.resposta_id = mensagemRespondendo.id;
      payload.conteudo = `[reply:${mensagemRespondendo.id}] ${texto}`;
    }

    localStorage.removeItem(`chat_draft_${window.chatTargetAtual.id}`);

    if (inputEl) {
      inputEl.value = '';
      inputEl.style.height = '22px';
    }
    limparAnexoChat();
    cancelarResposta();

    if (typeof window.emitirStatusDigitando === 'function') {
      window.emitirStatusDigitando(false);
    }

    const { error } = await clientSupabase.from('mensagens').insert([payload]);
    if (error) throw error;

    if (typeof window.carregarListaConversas === 'function') window.carregarListaConversas();
  } catch (err) {
    console.error("[BarraChat] Erro ao enviar mensagem:", err);
    alert("Falha ao enviar mensagem.");
  } finally {
    if (btnSend) btnSend.disabled = false;
  }
}

function checarTeclaChat(event) {
  const input = document.getElementById('chat-text-input');

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    enviarMensagemChat();
  } else if (event.key === 'ArrowUp' && input && input.value === '') {
    event.preventDefault();
    const feed = document.getElementById('chat-messages-feed');
    if (feed) {
      const rows = feed.querySelectorAll('.chat-msg-row');
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const msgId = lastRow.getAttribute('data-msg-id');
        const autor = lastRow.getAttribute('data-autor') || 'Contato';
        const bubble = lastRow.querySelector('.chat-msg-bubble');
        const texto = bubble ? bubble.innerText : '';
        if (msgId && typeof window.prepararRespostaMensagem === 'function') {
          window.prepararRespostaMensagem(Number(msgId), autor, texto);
        }
      }
    }
  }
}

function prepararRespostaMensagem(msgId, autor, conteudo) {
  const textoLimpo = conteudo ? conteudo.replace(/^\[reply:\d+\]\s*/, '') : '';
  mensagemRespondendo = { id: msgId, autor, conteudo: textoLimpo };
  const replyBar = document.getElementById('chat-reply-preview-bar');
  
  if (replyBar) {
    replyBar.style.display = 'flex';
    replyBar.innerHTML = `
      <div class="chat-reply-info">
        <span class="chat-reply-label"><i class="fa-solid fa-reply"></i> Respondendo a <strong>${autor}</strong></span>
        <span class="chat-reply-text">${textoLimpo}</span>
      </div>
      <button class="btn-barrachat-icon danger" onclick="cancelarResposta()" title="Cancelar Resposta"><i class="fa-solid fa-xmark"></i></button>
    `;
  }
  checarExibicaoBotaoCancelar();
  const inputEl = document.getElementById('chat-text-input');
  if (inputEl) inputEl.focus();
}

function cancelarResposta() {
  mensagemRespondendo = null;
  const replyBar = document.getElementById('chat-reply-preview-bar');
  if (replyBar) { replyBar.style.display = 'none'; replyBar.innerHTML = ''; }
  checarExibicaoBotaoCancelar();
}

function cancelarAcaoChat() {
  cancelarResposta();
  limparAnexoChat();
  const inputEl = document.getElementById('chat-text-input');
  if (inputEl) {
    inputEl.value = '';
    inputEl.style.height = '22px';
  }
  if (window.chatTargetAtual) localStorage.removeItem(`chat_draft_${window.chatTargetAtual.id}`);
  
  const draftBox = document.getElementById('chat-draft-reader-box');
  if (draftBox) draftBox.style.display = 'none';
  checarExibicaoBotaoCancelar();
}

function checarExibicaoBotaoCancelar() {
  const btnCancel = document.getElementById('btn-cancel-chat');
  const inputEl = document.getElementById('chat-text-input');
  const temTexto = inputEl && inputEl.value.trim() !== '';
  if (btnCancel) {
    btnCancel.style.display = (mensagemRespondendo || anexosListDataUrl.length > 0 || temTexto) ? 'inline-flex' : 'none';
  }
}

function processarArquivosAnexos(files) {
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    const ext = file.name.split('.').pop() || 'png';
    const nomeBase = file.name.substring(0, file.name.lastIndexOf('.')) || 'midia';
    const randomId = Math.floor(10000 + Math.random() * 90000);
    const nomeOficial = `${nomeBase.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${randomId}.${ext}`;

    reader.onload = (e) => {
      anexosListDataUrl.push({
        file: file,
        url: e.target.result,
        nome: nomeOficial,
        tipo: file.type.startsWith('video') ? 'video' : 'imagem',
        isSpoiler: false
      });
      atualizarPreviewAnexos();
    };
    reader.readAsDataURL(file);
  });
}

async function processarAnexoChat(input) {
  if (input.files && input.files.length > 0) {
    processarArquivosAnexos(input.files);
  }
}

function alternarSpoilerAnexo(index) {
  if (anexosListDataUrl[index]) {
    anexosListDataUrl[index].isSpoiler = !anexosListDataUrl[index].isSpoiler;
    atualizarPreviewAnexos();
  }
}

function atualizarPreviewAnexos() {
  const box = document.getElementById('chat-attachment-preview-box');
  if (!box) return;

  if (anexosListDataUrl.length === 0) {
    box.style.display = 'none';
    box.innerHTML = '';
  } else {
    box.style.display = 'flex';
    box.innerHTML = anexosListDataUrl.map((item, idx) => `
      <div class="chat-preview-item ${item.isSpoiler ? 'is-spoiler' : ''}" title="${item.nome}">
        <button class="btn-toggle-media-spoiler ${item.isSpoiler ? 'active' : ''}" onclick="alternarSpoilerAnexo(${idx})" title="Spoiler">
          <i class="fa-solid fa-eye-slash"></i>
        </button>
        ${item.tipo === 'video' 
          ? `<video src="${item.url}"></video>` 
          : `<img src="${item.url}" alt="${item.nome}">`}
        <button class="btn-remove-attachment" onclick="removerAnexoUnico(${idx})" title="Remover"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `).join('');
  }
  checarExibicaoBotaoCancelar();
}

function removerAnexoUnico(index) {
  anexosListDataUrl.splice(index, 1);
  atualizarPreviewAnexos();
}

function limparAnexoChat() {
  anexosListDataUrl = [];
  atualizarPreviewAnexos();
  const fileInput = document.getElementById('chat-file-input');
  if (fileInput) fileInput.value = '';
}

// Exportações Globais
window.renderizarBarraChat = renderizarBarraChat;
window.abrirGaleriaDirecta = abrirGaleriaDirecta;
window.ativarInputChat = ativarInputChat;
window.tratarInputTexto = tratarInputTexto;
window.enviarMensagemChat = enviarMensagemChat;
window.checarTeclaChat = checarTeclaChat;
window.prepararRespostaMensagem = prepararRespostaMensagem;
window.cancelarResposta = cancelarResposta;
window.cancelarAcaoChat = cancelarAcaoChat;
window.processarAnexoChat = processarAnexoChat;
window.alternarSpoilerAnexo = alternarSpoilerAnexo;
window.limparAnexoChat = limparAnexoChat;
window.removerAnexoUnico = removerAnexoUnico;
window.tratarColagemMidia = tratarColagemMidia;
window.iniciarGravacaoAudio = iniciarGravacaoAudio;
window.cancelarGravacaoAudio = cancelarGravacaoAudio;
window.finalizarEEnviarAudio = finalizarEEnviarAudio;
window.inserirMencaoUsuario = inserirMencaoUsuario;
