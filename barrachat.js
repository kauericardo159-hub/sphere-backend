// ==========================================================================
// BARRACAT MODULE (barrachat.js) - ADVANCED MEDIA, AUDIO RECORDER & MULTILINE
// Project Z v5.2 | Multi-line Support, Micro-Animations & Dynamic Discord Style
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

// CSS Otimizado com Animações e Glassmorphism
(function injetarCssBorraChat() {
  if (document.getElementById('borrachat-css-v52')) return;
  const style = document.createElement('style');
  style.id = 'borrachat-css-v52';
  style.textContent = `
    /* Keyframes de Animações */
    @keyframes pzPopIn {
      0% { transform: scale(0.8); opacity: 0; }
      70% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(1); }
    }

    @keyframes pzMicPulse {
      0% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.6); }
      70% { box-shadow: 0 0 0 10px rgba(255, 71, 87, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
    }

    @keyframes pzGlowFocus {
      0% { border-color: rgba(255, 45, 85, 0.3); }
      50% { border-color: rgba(255, 45, 85, 0.7); box-shadow: 0 0 16px rgba(255, 45, 85, 0.25); }
      100% { border-color: rgba(255, 45, 85, 0.3); }
    }

    .chat-input-container {
      padding: 10px 14px;
      background: var(--chat-header-bg, #110714);
      border-top: 1px solid rgba(255, 45, 85, 0.15);
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
      box-sizing: border-box;
      transition: all 0.25s ease;
    }

    .chat-input-container.drag-over {
      background: rgba(255, 45, 85, 0.12) !important;
      border-top-color: var(--chat-accent, #ff2d55) !important;
    }

    /* Card Estrutural Estilo Discord / Project Z */
    .chat-card-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 20px;
      padding: 6px 10px;
      width: 100%;
      box-sizing: border-box;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .chat-card-wrapper:focus-within {
      border-color: rgba(255, 45, 85, 0.55);
      background: rgba(255, 255, 255, 0.06);
      box-shadow: 0 0 18px rgba(255, 45, 85, 0.22);
    }

    /* Botões Circulares Padronizados em EXATOS 32px */
    .btn-barrachat-32 {
      width: 32px !important;
      height: 32px !important;
      min-width: 32px !important;
      max-width: 32px !important;
      min-height: 32px !important;
      max-height: 32px !important;
      border-radius: 50% !important;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #d1c4d6;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.88rem;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      padding: 0 !important;
      flex-shrink: 0;
      outline: none !important;
      box-shadow: none !important;
      box-sizing: border-box;
      margin-bottom: 1px;
    }

    .btn-barrachat-32:hover:not(:disabled) {
      background: var(--chat-accent, #ff2d55);
      color: #ffffff;
      border-color: var(--chat-accent, #ff2d55);
      transform: scale(1.1);
      box-shadow: 0 0 12px rgba(255, 45, 85, 0.45);
    }

    .btn-barrachat-32:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-barrachat-32.danger {
      color: #ff4757;
      border-color: rgba(255, 71, 87, 0.3);
      background: rgba(255, 71, 87, 0.12);
    }

    .btn-barrachat-32.danger:hover:not(:disabled) {
      background: #ff4757;
      color: #ffffff;
      border-color: #ff4757;
      box-shadow: 0 0 12px rgba(255, 71, 87, 0.45);
    }

    .btn-barrachat-32.send-active {
      background: linear-gradient(135deg, #ff2d55 0%, #d81b43 100%);
      border: none;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(255, 45, 85, 0.4);
      animation: pzPopIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .btn-barrachat-32.send-active:hover:not(:disabled) {
      background: linear-gradient(135deg, #ff4369 0%, #ff2d55 100%);
      transform: scale(1.12);
    }

    /* Textarea Multilinha Inteligente */
    .chat-input-text {
      flex: 1;
      background: transparent !important;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      color: #ffffff;
      font-size: 0.92rem;
      font-weight: 500;
      font-family: inherit;
      padding: 5px 4px;
      margin: 0;
      width: 100%;
      resize: none;
      height: 26px;
      min-height: 26px;
      max-height: 160px;
      line-height: 1.45;
      overflow-y: auto;
      display: block;
      box-sizing: border-box;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .chat-input-text::-webkit-scrollbar {
      width: 5px;
    }
    .chat-input-text::-webkit-scrollbar-thumb {
      background: rgba(255, 45, 85, 0.4);
      border-radius: 4px;
    }

    .chat-input-text::placeholder {
      color: #8c7e94;
      font-weight: 500;
    }

    /* Barra de Preview de Resposta/Edição */
    .chat-input-reply-bar {
      display: none;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 45, 85, 0.1);
      border-left: 3px solid var(--chat-accent, #ff2d55);
      padding: 6px 12px;
      border-radius: 8px;
      margin-bottom: 4px;
      animation: pzPopIn 0.2s ease-out;
    }

    /* Barra de Gravação de Áudio */
    .chat-audio-recording-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 45, 85, 0.12);
      border: 1px solid rgba(255, 45, 85, 0.4);
      border-radius: 20px;
      padding: 6px 12px;
      width: 100%;
      box-sizing: border-box;
      animation: pzPopIn 0.2s ease-out;
    }

    .chat-audio-recording-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #ff4757;
      font-weight: 800;
      font-size: 0.85rem;
    }

    .chat-audio-rec-dot {
      width: 12px;
      height: 12px;
      background: #ff4757;
      border-radius: 50%;
      animation: pzMicPulse 1.2s infinite;
    }

    /* Sugestão de Menção (@) */
    .chat-mention-suggestions-box {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 14px;
      background: #180b1b;
      border: 1px solid rgba(255, 45, 85, 0.35);
      border-radius: 16px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9);
      z-index: 100;
      max-width: 290px;
      max-height: 190px;
      overflow-y: auto;
      animation: pzPopIn 0.2s ease-out;
    }

    .chat-mention-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 10px;
      cursor: pointer;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 600;
      transition: background 0.15s;
    }

    .chat-mention-item:hover {
      background: rgba(255, 45, 85, 0.22);
    }

    .chat-mention-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
    }

    /* Previews de Mídia Anexada */
    .chat-attachment-preview-box {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 8px;
      background: rgba(0, 0, 0, 0.45);
      border-radius: 14px;
      border: 1px solid rgba(255, 45, 85, 0.3);
      animation: pzPopIn 0.2s ease-out;
    }

    .chat-preview-item {
      position: relative;
      width: 58px;
      height: 58px;
      flex-shrink: 0;
      border-radius: 12px;
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
      top: 3px;
      right: 3px;
      background: rgba(0, 0, 0, 0.85);
      color: #ff4757;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 0.7rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }

    .btn-toggle-media-spoiler {
      position: absolute;
      bottom: 3px;
      left: 3px;
      background: rgba(0, 0, 0, 0.85);
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 2px 5px;
      font-size: 0.65rem;
      cursor: pointer;
      z-index: 2;
    }

    .btn-toggle-media-spoiler.active {
      color: var(--chat-accent, #ff2d55);
    }

    @media (max-width: 480px) {
      .chat-input-container { padding: 8px 10px; }
      .chat-card-wrapper { padding: 5px 8px; }
    }
  `;
  document.head.appendChild(style);
})();

function renderizarBarraChat() {
  const container = document.getElementById('chat-input-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Barra de Contexto/Preview (Resposta ou Edição) -->
    <div id="chat-input-reply-bar" class="chat-input-reply-bar"></div>

    <!-- Menu de Autocomplete de Menções (@) -->
    <div id="chat-mention-suggestions" class="chat-mention-suggestions-box" style="display: none;"></div>

    <!-- Previews de Mídia Anexada -->
    <div id="chat-attachment-preview-box" class="chat-attachment-preview-box" style="display: none;"></div>

    <!-- Barra de Gravação de Áudio Oculta -->
    <div id="chat-audio-recording-bar" class="chat-audio-recording-bar" style="display: none;">
      <div class="chat-audio-recording-indicator">
        <div class="chat-audio-rec-dot"></div>
        <span id="chat-audio-rec-timer">Gravando: 00:00</span>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="btn-barrachat-32 danger" onclick="cancelarGravacaoAudio()" title="Descartar"><i class="fa-solid fa-trash"></i></button>
        <button class="btn-barrachat-32 send-active" onclick="finalizarEEnviarAudio()" title="Enviar Áudio"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
    </div>

    <!-- Card Principal -->
    <div class="chat-card-wrapper" id="chat-input-row-dropzone">
      <input type="file" id="chat-file-input" accept="image/*,video/*" multiple style="display: none;" onchange="processarAnexoChat(this)">
      
      <!-- 1. Botão Adicionar Mídia (+) -->
      <button class="btn-barrachat-32" id="btn-chat-plus" onclick="abrirGaleriaDirecta()" title="Enviar Mídia" disabled>
        <i class="fa-solid fa-plus"></i>
      </button>

      <!-- 2. Textarea Multilinha -->
      <textarea id="chat-text-input" class="chat-input-text" placeholder="Conversar..." oninput="tratarInputTexto(this)" onkeydown="checarTeclaChat(event)" onpaste="tratarColagemMidia(event)" disabled></textarea>

      <!-- 3. Botão Cancelar Rascunho/Ação (X) -->
      <button id="btn-cancel-chat" class="btn-barrachat-32 danger" onclick="cancelarAcaoChat()" title="Limpar" style="display: none;">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <!-- 4. Botão Dinâmico Principal (Envio/Mic) -->
      <button id="btn-action-chat-main" class="btn-barrachat-32" onclick="executarAcaoBoatoPrincipal()" title="Gravar Áudio" disabled>
        <i class="fa-solid fa-microphone" id="icon-action-chat-main"></i>
      </button>
    </div>
  `;

  configurarDragAndDropBarra();
  restaurarRascunhoSalvo();
}

function abrirGaleriaDirecta() {
  const fileInput = document.getElementById('chat-file-input');
  if (fileInput) fileInput.click();
}

function atualizarIconeAcaoEnvio() {
  const inputEl = document.getElementById('chat-text-input');
  const btnAction = document.getElementById('btn-action-chat-main');
  const iconAction = document.getElementById('icon-action-chat-main');

  if (!btnAction || !iconAction) return;

  const temTexto = inputEl && inputEl.value.trim().length > 0;
  const temAnexos = anexosListDataUrl.length > 0;
  const emEdicao = inputEl && inputEl.dataset.editingMsgId;

  if (temTexto || temAnexos || emEdicao) {
    if (!btnAction.classList.contains('send-active')) {
      btnAction.className = 'btn-barrachat-32 send-active';
      iconAction.className = 'fa-solid fa-paper-plane';
      btnAction.title = emEdicao ? 'Salvar Edição' : 'Enviar';
    }
  } else {
    btnAction.className = 'btn-barrachat-32';
    iconAction.className = 'fa-solid fa-microphone';
    btnAction.title = 'Gravar Áudio';
  }
}

function executarAcaoBoatoPrincipal() {
  const inputEl = document.getElementById('chat-text-input');
  const temTexto = inputEl && inputEl.value.trim().length > 0;
  const temAnexos = anexosListDataUrl.length > 0;
  const emEdicao = inputEl && inputEl.dataset.editingMsgId;

  if (temTexto || temAnexos || emEdicao) {
    enviarMensagemChat();
  } else {
    iniciarGravacaoAudio();
  }
}

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
    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
    const reader = new FileReader();
    reader.onload = (e) => {
      anexosListDataUrl.push({
        file: new File([audioBlob], `audio-${Date.now()}.mp3`, { type: 'audio/mp3' }),
        blob: audioBlob,
        url: e.target.result,
        nome: `nota-de-audio-${Date.now()}.mp3`,
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
          <span>@${u.username || u.nome}</span>
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

function configurarDragAndDropBarra() {
  const container = document.getElementById('chat-input-container');
  if (!container) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    container.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    container.addEventListener(eventName, () => container.classList.add('drag-over'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    container.addEventListener(eventName, () => container.classList.remove('drag-over'), false);
  });

  container.addEventListener('drop', e => {
    const dt = e.dataTransfer;
    if (dt.files && dt.files.length > 0) processarArquivosAnexos(dt.files);
  }, false);
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
  const btnAction = document.getElementById('btn-action-chat-main');
  const inputText = document.getElementById('chat-text-input');

  if (btnPlus) btnPlus.disabled = !ativo;
  if (btnAction) btnAction.disabled = !ativo;
  if (inputText) inputText.disabled = !ativo;

  if (inputText && window.chatTargetAtual) {
    inputText.placeholder = `Conversar com @${window.chatTargetAtual.username || window.chatTargetAtual.nome}...`;
  }

  if (ativo) restaurarRascunhoSalvo();
}

function tratarInputTexto(input) {
  input.style.height = '26px';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';

  const val = input.value;
  checarEExibirMencoes(input);

  if (window.chatTargetAtual) {
    const key = `chat_draft_${window.chatTargetAtual.id}`;
    if (val.trim()) localStorage.setItem(key, val);
    else localStorage.removeItem(key);
  }

  if (typeof window.emitirStatusDigitando === 'function') {
    window.emitirStatusDigitando(true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      window.emitirStatusDigitando(false);
    }, 2500);
  }

  checarExibicaoBotaoCancelar();
  atualizarIconeAcaoEnvio();
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

async function realizarUploadMidiaSupabase(anexo) {
  const sb = obterSupabaseBarraChat();
  if (!sb || !anexo.file) return anexo.url;

  try {
    const fileExt = anexo.nome.split('.').pop();
    const filePath = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

    const { data, error } = await sb.storage
      .from('chat-media')
      .upload(filePath, anexo.file, { cacheControl: '3600', upsert: false });

    if (error || !data) return anexo.url;

    const { data: publicUrlData } = sb.storage.from('chat-media').getPublicUrl(filePath);
    return publicUrlData ? publicUrlData.publicUrl : anexo.url;
  } catch (err) {
    return anexo.url;
  }
}

async function enviarMensagemChat() {
  const inputEl = document.getElementById('chat-text-input');
  const btnAction = document.getElementById('btn-action-chat-main');
  let texto = inputEl ? inputEl.value : '';

  if (inputEl && inputEl.dataset.editingMsgId) {
    const editingId = Number(inputEl.dataset.editingMsgId);
    if (typeof window.salvarEdicaoMensagemSupabase === 'function') {
      await window.salvarEdicaoMensagemSupabase(editingId, texto);
    }
    return;
  }

  if (!texto.trim() && anexosListDataUrl.length === 0) return;

  const usuarioLogado = typeof window.obterUsuarioLogadoChat === 'function' ? window.obterUsuarioLogadoChat() : null;
  const clientSupabase = obterSupabaseBarraChat();
  if (!usuarioLogado || !clientSupabase || !window.chatTargetAtual) return;

  if (btnAction) btnAction.disabled = true;

  try {
    let urlAnexo = null;
    if (anexosListDataUrl.length > 0) {
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

    if (inputEl && inputEl.dataset.replyMsgId) {
      const replyId = Number(inputEl.dataset.replyMsgId);
      payload.resposta_id = replyId;
      payload.conteudo = `[reply:${replyId}] ${texto}`;
    }

    localStorage.removeItem(`chat_draft_${window.chatTargetAtual.id}`);

    if (inputEl) {
      inputEl.value = '';
      inputEl.style.height = '26px';
    }
    limparAnexoChat();
    cancelarAcaoChat();

    if (typeof window.emitirStatusDigitando === 'function') {
      window.emitirStatusDigitando(false);
    }

    const { error } = await clientSupabase.from('mensagens').insert([payload]);
    if (error) throw error;

    if (typeof window.carregarListaConversas === 'function') window.carregarListaConversas();
  } catch (err) {
    console.error("[BarraChat] Erro ao enviar mensagem:", err);
  } finally {
    if (btnAction) btnAction.disabled = false;
    atualizarIconeAcaoEnvio();
  }
}

function checarTeclaChat(event) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (event.key === 'Enter') {
    if (!event.shiftKey && !isMobile) {
      event.preventDefault();
      enviarMensagemChat();
    }
  } else if (event.key === 'ArrowUp' && event.target.value === '') {
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

function cancelarResposta() {
  mensagemRespondendo = null;
  if (typeof window.cancelarRespostaMensagem === 'function') {
    window.cancelarRespostaMensagem();
  }
  checarExibicaoBotaoCancelar();
}

function cancelarAcaoChat() {
  if (typeof window.cancelarEdicaoMensagem === 'function') window.cancelarEdicaoMensagem();
  if (typeof window.cancelarRespostaMensagem === 'function') window.cancelarRespostaMensagem();
  
  limparAnexoChat();
  const inputEl = document.getElementById('chat-text-input');
  if (inputEl) {
    inputEl.value = '';
    inputEl.style.height = '26px';
  }
  if (window.chatTargetAtual) localStorage.removeItem(`chat_draft_${window.chatTargetAtual.id}`);
  checarExibicaoBotaoCancelar();
  atualizarIconeAcaoEnvio();
}

function checarExibicaoBotaoCancelar() {
  const btnCancel = document.getElementById('btn-cancel-chat');
  const inputEl = document.getElementById('chat-text-input');
  const temTexto = inputEl && inputEl.value.trim() !== '';
  const temAcaoAtiva = inputEl && (inputEl.dataset.editingMsgId || inputEl.dataset.replyMsgId);

  if (btnCancel) {
    btnCancel.style.display = (temAcaoAtiva || anexosListDataUrl.length > 0 || temTexto) ? 'inline-flex' : 'none';
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

function processarAnexoChat(input) {
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
  atualizarIconeAcaoEnvio();
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
window.executarAcaoBoatoPrincipal = executarAcaoBoatoPrincipal;
