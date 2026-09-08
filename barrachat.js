// ==========================================================================
// BARRACAT MODULE (barrachat.js) - NATIVE GALLERY, FILES & AUDIO RECORDER
// Sphere v5.2 PRO | Native Device Gallery, File Picker & Smart Autocomplete
// ==========================================================================

(function (global) {
  'use strict';

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

  function renderizarBarraChat() {
    const container = document.getElementById('chat-input-container');
    if (!container) return;

    container.innerHTML = `
      <!-- Barra de Contexto/Preview (Resposta ou Edição) -->
      <div id="chat-input-reply-bar" class="chat-input-reply-bar"></div>

      <!-- Menu de Autocomplete de Menções (@) -->
      <div id="chat-mention-suggestions" class="chat-mention-suggestions-box" style="display: none;"></div>

      <!-- Previews de Mídia e Arquivos Anexados -->
      <div id="chat-attachment-preview-box" class="chat-attachment-preview-box" style="display: none;"></div>

      <!-- Barra de Gravação de Áudio Oculta -->
      <div id="chat-audio-recording-bar" class="chat-audio-recording-bar" style="display: none;">
        <div class="chat-audio-recording-indicator">
          <div class="chat-audio-rec-dot"></div>
          <span id="chat-audio-rec-timer">Gravando: 00:00</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn-barrachat-32 danger" onclick="window.cancelarGravacaoAudio()" title="Descartar"><i class="fa-solid fa-trash"></i></button>
          <button class="btn-barrachat-32 send-active" onclick="window.finalizarEEnviarAudio()" title="Enviar Áudio"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>

      <!-- Card Principal de Input -->
      <div class="chat-card-wrapper" id="chat-input-row-dropzone">
        <!-- Input 1: Galeria Nativa de Mídia (Fotos e Vídeos) -->
        <input 
          type="file" 
          id="chat-file-input-media" 
          accept="image/*,video/*" 
          multiple 
          style="display: none;" 
          onchange="window.processarAnexoChat(this)"
        >

        <!-- Input 2: Arquivos e Documentos do Dispositivo -->
        <input 
          type="file" 
          id="chat-file-input-docs" 
          accept="*/*" 
          multiple 
          style="display: none;" 
          onchange="window.processarAnexoChat(this)"
        >
        
        <!-- 1. Botão Galeria do Dispositivo -->
        <button class="btn-barrachat-32" id="btn-chat-gallery" onclick="window.abrirGaleriaDirecta()" title="Galeria do Dispositivo" disabled>
          <i class="fa-solid fa-image"></i>
        </button>

        <!-- 2. Botão Arquivos do Dispositivo (Documentos) -->
        <button class="btn-barrachat-32" id="btn-chat-files" onclick="window.abrirArquivosDispositivo()" title="Anexar Arquivo/Documento" disabled>
          <i class="fa-solid fa-paperclip"></i>
        </button>

        <!-- 3. Textarea Multilinha -->
        <textarea id="chat-text-input" class="chat-input-text" placeholder="Conversar..." oninput="window.tratarInputTexto(this)" onkeydown="window.checarTeclaChat(event)" onpaste="window.tratarColagemMidia(event)" disabled></textarea>

        <!-- 4. Botão Cancelar Rascunho/Ação (X) -->
        <button id="btn-cancel-chat" class="btn-barrachat-32 danger" onclick="window.cancelarAcaoChat()" title="Limpar" style="display: none;">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <!-- 5. Botão Dinâmico Principal (Envio/Mic) -->
        <button id="btn-action-chat-main" class="btn-barrachat-32" onclick="window.executarAcaoBoatoPrincipal()" title="Gravar Áudio" disabled>
          <i class="fa-solid fa-microphone" id="icon-action-chat-main"></i>
        </button>
      </div>
    `;

    configurarDragAndDropBarra();
    restaurarRascunhoSalvo();
  }

  // Invoca a Galeria / Rolo de Câmera do Dispositivo (Fotos e Vídeos)
  function abrirGaleriaDirecta() {
    const fileInput = document.getElementById('chat-file-input-media');
    if (!fileInput) return;
    fileInput.value = '';
    fileInput.click();
  }

  // Invoca o Gerenciador de Arquivos do Dispositivo (Qualquer documento)
  function abrirArquivosDispositivo() {
    const fileInput = document.getElementById('chat-file-input-docs');
    if (!fileInput) return;
    fileInput.value = '';
    fileInput.click();
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
          <div class="chat-mention-item" onclick="window.inserirMencaoUsuario('${u.username || u.nome}')">
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
    const btnGallery = document.getElementById('btn-chat-gallery');
    const btnFiles = document.getElementById('btn-chat-files');
    const btnAction = document.getElementById('btn-action-chat-main');
    const inputText = document.getElementById('chat-text-input');

    if (btnGallery) btnGallery.disabled = !ativo;
    if (btnFiles) btnFiles.disabled = !ativo;
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
      const nomeBase = file.name.substring(0, file.name.lastIndexOf('.')) || 'anexo';
      const randomId = Math.floor(10000 + Math.random() * 90000);
      const nomeOficial = `${nomeBase.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${randomId}.${ext}`;

      reader.onload = (e) => {
        let tipoCalculado = 'documento';
        if (file.type.startsWith('image/')) tipoCalculado = 'imagem';
        else if (file.type.startsWith('video/')) tipoCalculado = 'video';
        else if (file.type.startsWith('audio/')) tipoCalculado = 'audio';

        anexosListDataUrl.push({
          file: file,
          url: e.target.result,
          nome: nomeOficial,
          extensao: ext.toUpperCase(),
          tipo: tipoCalculado,
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
      box.innerHTML = anexosListDataUrl.map((item, idx) => {
        let previewHtml = '';

        if (item.tipo === 'video') {
          previewHtml = `<video src="${item.url}"></video>`;
        } else if (item.tipo === 'audio') {
          previewHtml = `<div class="audio-preview-thumb"><i class="fa-solid fa-microphone"></i></div>`;
        } else if (item.tipo === 'imagem') {
          previewHtml = `<img src="${item.url}" alt="${item.nome}">`;
        } else {
          previewHtml = `
            <div class="doc-preview-thumb">
              <i class="fa-solid fa-file-lines"></i>
              <span>${item.extensao || 'DOC'}</span>
            </div>`;
        }

        return `
          <div class="chat-preview-item ${item.isSpoiler ? 'is-spoiler' : ''}" title="${item.nome}">
            <button class="btn-toggle-media-spoiler ${item.isSpoiler ? 'active' : ''}" onclick="window.alternarSpoilerAnexo(${idx})" title="Marcar como Spoiler">
              <i class="fa-solid fa-eye-slash"></i>
            </button>
            ${previewHtml}
            <button class="btn-remove-attachment" onclick="window.removerAnexoUnico(${idx})" title="Remover"><i class="fa-solid fa-xmark"></i></button>
          </div>
        `;
      }).join('');
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
    const mediaInput = document.getElementById('chat-file-input-media');
    const docsInput = document.getElementById('chat-file-input-docs');
    if (mediaInput) mediaInput.value = '';
    if (docsInput) docsInput.value = '';
  }

  // Exportações Globais
  global.renderizarBarraChat = renderizarBarraChat;
  global.abrirGaleriaDirecta = abrirGaleriaDirecta;
  global.abrirArquivosDispositivo = abrirArquivosDispositivo;
  global.ativarInputChat = ativarInputChat;
  global.tratarInputTexto = tratarInputTexto;
  global.enviarMensagemChat = enviarMensagemChat;
  global.checarTeclaChat = checarTeclaChat;
  global.cancelarResposta = cancelarResposta;
  global.cancelarAcaoChat = cancelarAcaoChat;
  global.processarAnexoChat = processarAnexoChat;
  global.alternarSpoilerAnexo = alternarSpoilerAnexo;
  global.limparAnexoChat = limparAnexoChat;
  global.removerAnexoUnico = removerAnexoUnico;
  global.tratarColagemMidia = tratarColagemMidia;
  global.iniciarGravacaoAudio = iniciarGravacaoAudio;
  global.cancelarGravacaoAudio = cancelarGravacaoAudio;
  global.finalizarEEnviarAudio = finalizarEEnviarAudio;
  global.inserirMencaoUsuario = inserirMencaoUsuario;
  global.executarAcaoBoatoPrincipal = executarAcaoBoatoPrincipal;

})(typeof window !== 'undefined' ? window : this);
