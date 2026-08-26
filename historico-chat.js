// ==========================================================================
// HISTÓRICO DE MÍDIAS E MENSAGENS (historico-chat.js) - DISCORD ULTIMATE PRO
// Project Z v5.0 | Dynamic Media Indexing, Instant Search & Smooth Navigation
// ==========================================================================

let historicoCache = [];
let historicoFiltroAtual = 'tudo';

// Helper para obtenção segura do Supabase Client
function obterSupabaseHistorico() {
  return window.supabaseClient || window.supabase || window.sb || null;
}

// Injeção Dinâmica de CSS Otimizado
(function injetarCssHistoricoChat() {
  if (document.getElementById('historico-chat-css')) return;
  const style = document.createElement('style');
  style.id = 'historico-chat-css';
  style.textContent = `
    /* Modal Overlay de Histórico */
    .chat-history-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 5, 12, 0.85);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      z-index: 2900;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      animation: fadeInHist 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes fadeInHist {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }

    .chat-history-modal-card {
      width: 100%;
      max-width: 720px;
      height: 85vh;
      max-height: 750px;
      background: #150b1a;
      border: 1px solid rgba(255, 45, 85, 0.3);
      border-radius: 20px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Header Compacto */
    .chat-history-header {
      padding: 12px 16px;
      background: rgba(25, 13, 29, 0.95);
      border-bottom: 1px solid rgba(255, 45, 85, 0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .chat-history-title-box {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #ffffff;
    }

    .chat-history-title-box i {
      color: var(--chat-accent, #ff2d55);
      font-size: 1.15rem;
    }

    .chat-history-title-box h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      line-height: 1.2;
    }

    .chat-history-sub {
      font-size: 0.72rem;
      color: var(--chat-text-muted, #b3a5b8);
      display: block;
    }

    /* Botões Circulares Compactos */
    .btn-hist-icon {
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

    .btn-hist-icon:hover {
      background: var(--chat-accent, #ff2d55);
      color: #ffffff;
      border-color: var(--chat-accent, #ff2d55);
      transform: scale(1.05);
    }

    /* Barra de Navegação, Filtros e Pesquisa */
    .chat-history-toolbar {
      padding: 10px 14px;
      background: rgba(18, 9, 21, 0.75);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .chat-history-search-wrap {
      position: relative;
      width: 100%;
    }

    .chat-history-search-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 8px 12px 8px 34px;
      color: #ffffff;
      font-size: 0.82rem;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }

    .chat-history-search-input:focus {
      border-color: var(--chat-accent, #ff2d55);
    }

    .chat-history-search-wrap i {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #8e7f96;
      font-size: 0.8rem;
    }

    /* Rolagem Horizontal de Filtros */
    .chat-history-tabs {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 2px 0 4px 0;
      scrollbar-width: none;
    }

    .chat-history-tabs::-webkit-scrollbar {
      display: none;
    }

    .btn-hist-filter-pill {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #b3a5b8;
      padding: 5px 12px;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .btn-hist-filter-pill:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }

    .btn-hist-filter-pill.active {
      background: var(--chat-accent, #ff2d55);
      color: #ffffff;
      border-color: var(--chat-accent, #ff2d55);
      box-shadow: 0 2px 8px rgba(255, 45, 85, 0.35);
    }

    /* Feed do Histórico */
    .chat-history-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      box-sizing: border-box;
    }

    .chat-history-body::-webkit-scrollbar {
      width: 6px;
    }
    .chat-history-body::-webkit-scrollbar-thumb {
      background: rgba(255, 45, 85, 0.3);
      border-radius: 4px;
    }

    /* Grid de Mídias */
    .chat-history-media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
    }

    .chat-history-media-card {
      position: relative;
      aspect-ratio: 1 / 1;
      background: #0d0610;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .chat-history-media-card:hover {
      transform: scale(1.03);
      border-color: var(--chat-accent, #ff2d55);
    }

    .chat-history-media-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Thumbnails de Vídeo */
    .chat-history-video-thumb {
      width: 100%;
      height: 100%;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .chat-history-video-thumb video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.65;
      pointer-events: none;
    }

    .chat-history-badge-type {
      position: absolute;
      top: 6px;
      right: 6px;
      background: rgba(0, 0, 0, 0.75);
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 0.62rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 4px;
      backdrop-filter: blur(4px);
    }

    .chat-history-media-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%);
      opacity: 0;
      transition: opacity 0.2s ease;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 8px;
    }

    .chat-history-media-card:hover .chat-history-media-overlay {
      opacity: 1;
    }

    .chat-history-media-date {
      font-size: 0.68rem;
      color: #d1c4d6;
    }

    /* Visualização em Lista */
    .chat-history-list-view {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .chat-history-item-row {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .chat-history-item-row:hover {
      background: rgba(255, 45, 85, 0.1);
      border-color: rgba(255, 45, 85, 0.3);
    }

    .chat-history-item-info {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
      flex: 1;
    }

    .chat-history-item-icon {
      width: 34px;
      height: 34px;
      min-width: 34px;
      border-radius: 50%;
      background: rgba(255, 45, 85, 0.18);
      color: var(--chat-accent, #ff2d55);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .chat-history-item-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }

    .chat-history-item-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chat-history-item-sub {
      font-size: 0.7rem;
      color: #8e7f96;
    }

    /* Estado Vazio */
    .chat-history-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 200px;
      text-align: center;
      color: #8e7f96;
      gap: 8px;
    }

    .chat-history-empty i {
      font-size: 2.5rem;
      color: rgba(255, 45, 85, 0.3);
    }
  `;
  document.head.appendChild(style);
})();

// Abertura do Histórico de Conversas e Mídias
async function abrirHistoricoChat(targetUsuario) {
  if (!targetUsuario) return;

  const modalAntigo = document.getElementById('chat-history-modal');
  if (modalAntigo) modalAntigo.remove();

  const modal = document.createElement('div');
  modal.id = 'chat-history-modal';
  modal.className = 'chat-history-modal-overlay';
  modal.onclick = (e) => {
    if (e.target === modal) fecharHistoricoChat();
  };

  modal.innerHTML = `
    <div class="chat-history-modal-card">
      <div class="chat-history-header">
        <div class="chat-history-title-box">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <div>
            <h3>Histórico de Mensagens</h3>
            <span class="chat-history-sub">Conversas e mídias com @${targetUsuario.username || targetUsuario.nome}</span>
          </div>
        </div>
        <button class="btn-hist-icon" onclick="fecharHistoricoChat()" title="Fechar (Esc)">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="chat-history-toolbar">
        <div class="chat-history-search-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" class="chat-history-search-input" placeholder="Buscar mensagens, links ou mídias..." oninput="buscarNoHistorico(this.value)">
        </div>

        <div class="chat-history-tabs">
          <button class="btn-hist-filter-pill active" id="tab-hist-tudo" onclick="filtrarAbasHistorico('tudo')">
            <i class="fa-solid fa-border-all"></i> Tudo
          </button>
          <button class="btn-hist-filter-pill" id="tab-hist-texto" onclick="filtrarAbasHistorico('texto')">
            <i class="fa-solid fa-comment-dots"></i> Mensagens
          </button>
          <button class="btn-hist-filter-pill" id="tab-hist-midia" onclick="filtrarAbasHistorico('midia')">
            <i class="fa-solid fa-photo-film"></i> Fotos & GIFs
          </button>
          <button class="btn-hist-filter-pill" id="tab-hist-video" onclick="filtrarAbasHistorico('video')">
            <i class="fa-solid fa-video"></i> Vídeos
          </button>
          <button class="btn-hist-filter-pill" id="tab-hist-audio" onclick="filtrarAbasHistorico('audio')">
            <i class="fa-solid fa-microphone"></i> Áudios
          </button>
          <button class="btn-hist-filter-pill" id="tab-hist-link" onclick="filtrarAbasHistorico('link')">
            <i class="fa-solid fa-link"></i> Links
          </button>
        </div>
      </div>

      <div class="chat-history-body" id="chat-history-body-feed">
        <div class="chat-history-empty">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <p>Carregando histórico completo...</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.addEventListener('keydown', escFecharHistorico);

  await carregarDadosHistorico(targetUsuario.id);
}

function fecharHistoricoChat() {
  const modal = document.getElementById('chat-history-modal');
  if (modal) modal.remove();
  document.removeEventListener('keydown', escFecharHistorico);
}

function escFecharHistorico(e) {
  if (e.key === 'Escape') fecharHistoricoChat();
}

async function carregarDadosHistorico(targetId) {
  const clientSupabase = obterSupabaseHistorico();
  const usuarioLogado = typeof window.obterUsuarioLogadoChat === 'function' ? window.obterUsuarioLogadoChat() : null;
  if (!clientSupabase || !usuarioLogado) return;

  const meId = Number(usuarioLogado.id);

  try {
    const { data: mensagens, error } = await clientSupabase
      .from('mensagens')
      .select('id, remetente_id, conteudo, imagem_url, created_at, excluido')
      .or(`and(remetente_id.eq.${meId},destinatario_id.eq.${targetId}),and(remetente_id.eq.${targetId},destinatario_id.eq.${meId})`)
      .eq('excluido', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    historicoCache = [];

    mensagens.forEach(msg => {
      const eMeu = Number(msg.remetente_id) === meId;
      const conteudoLimpo = msg.conteudo ? msg.conteudo.replace(/^\[reply:\d+\]\s*/, '').trim() : '';

      // Processar Mensagens de Texto
      if (conteudoLimpo) {
        const contemLink = /(https?:\/\/[^\s]+)/g.test(conteudoLimpo);
        historicoCache.push({
          msgId: msg.id,
          tipo: contemLink ? 'link' : 'texto',
          conteudo: conteudoLimpo,
          data: msg.created_at,
          eMeu
        });
      }

      // Processar Mídias / Anexos
      if (msg.imagem_url) {
        let lista = [];
        try {
          const parsed = JSON.parse(msg.imagem_url);
          lista = Array.isArray(parsed) ? parsed : [msg.imagem_url];
        } catch (e) {
          lista = [msg.imagem_url];
        }

        lista.forEach(item => {
          let urlReal = typeof item === 'object' ? item.url : item;
          if (typeof urlReal === 'string' && urlReal.startsWith('||') && urlReal.endsWith('||')) {
            urlReal = urlReal.substring(2, urlReal.length - 2);
          }

          const urlLower = String(urlReal).toLowerCase();
          let tipoMidia = 'midia';
          if (urlLower.endsWith('.mp4') || urlLower.endsWith('.webm') || urlLower.startsWith('data:video')) tipoMidia = 'video';
          else if (urlLower.endsWith('.wav') || urlLower.endsWith('.mp3') || urlLower.endsWith('.ogg') || urlLower.startsWith('data:audio')) tipoMidia = 'audio';

          historicoCache.push({
            msgId: msg.id,
            tipo: tipoMidia,
            url: urlReal,
            conteudo: conteudoLimpo || (tipoMidia === 'video' ? 'Vídeo Anexado' : tipoMidia === 'audio' ? 'Nota de Áudio' : 'Imagem Anexada'),
            data: msg.created_at,
            eMeu
          });
        });
      }
    });

    renderizarFeedHistorico();

  } catch (err) {
    console.error("[Histórico] Erro ao carregar histórico:", err);
    const feed = document.getElementById('chat-history-body-feed');
    if (feed) {
      feed.innerHTML = `
        <div class="chat-history-empty">
          <i class="fa-solid fa-triangle-exclamation" style="color: #ff4757;"></i>
          <p>Erro ao obter o histórico da conversa.</p>
        </div>`;
    }
  }
}

function filtrarAbasHistorico(tipo) {
  historicoFiltroAtual = tipo;
  document.querySelectorAll('.btn-hist-filter-pill').forEach(btn => btn.classList.remove('active'));
  const btnActive = document.getElementById(`tab-hist-${tipo}`);
  if (btnActive) btnActive.classList.add('active');
  renderizarFeedHistorico();
}

function buscarNoHistorico(termo) {
  renderizarFeedHistorico(termo.trim().toLowerCase());
}

function renderizarFeedHistorico(termoBusca = '') {
  const feed = document.getElementById('chat-history-body-feed');
  if (!feed) return;

  let itensFiltrados = historicoCache.filter(item => {
    if (historicoFiltroAtual === 'texto') return item.tipo === 'texto';
    if (historicoFiltroAtual === 'midia') return item.tipo === 'midia';
    if (historicoFiltroAtual === 'video') return item.tipo === 'video';
    if (historicoFiltroAtual === 'audio') return item.tipo === 'audio';
    if (historicoFiltroAtual === 'link') return item.tipo === 'link';
    return true;
  });

  if (termoBusca) {
    itensFiltrados = itensFiltrados.filter(item => {
      const txt = item.conteudo ? item.conteudo.toLowerCase() : '';
      const url = item.url ? item.url.toLowerCase() : '';
      return txt.includes(termoBusca) || url.includes(termoBusca);
    });
  }

  if (itensFiltrados.length === 0) {
    feed.innerHTML = `
      <div class="chat-history-empty">
        <i class="fa-solid fa-folder-open"></i>
        <p>Nenhum resultado encontrado.</p>
      </div>`;
    return;
  }

  const soMidias = historicoFiltroAtual === 'midia' || historicoFiltroAtual === 'video';

  if (soMidias) {
    feed.innerHTML = `<div class="chat-history-media-grid">` + itensFiltrados.map(item => {
      const dataStr = typeof window.formatarDataHoraChat === 'function' ? window.formatarDataHoraChat(item.data) : '';

      if (item.tipo === 'video') {
        return `
          <div class="chat-history-media-card" onclick="irParaMensagemEVisualizar(${item.msgId}, '${item.url}', 'video')">
            <span class="chat-history-badge-type"><i class="fa-solid fa-video"></i> VÍDEO</span>
            <div class="chat-history-video-thumb">
              <video src="${item.url}#t=0.5" preload="metadata"></video>
            </div>
            <div class="chat-history-media-overlay">
              <span class="chat-history-media-date">${dataStr}</span>
            </div>
          </div>`;
      } else {
        return `
          <div class="chat-history-media-card" onclick="irParaMensagemEVisualizar(${item.msgId}, '${item.url}', 'imagem')">
            <img src="${item.url}" alt="Anexo" loading="lazy">
            <div class="chat-history-media-overlay">
              <span class="chat-history-media-date">${dataStr}</span>
            </div>
          </div>`;
      }
    }).join('') + `</div>`;
  } else {
    feed.innerHTML = `<div class="chat-history-list-view">` + itensFiltrados.map(item => {
      const dataStr = typeof window.formatarDataHoraChat === 'function' ? window.formatarDataHoraChat(item.data) : '';
      
      let icone = 'fa-comment';
      if (item.tipo === 'midia') icone = 'fa-image';
      else if (item.tipo === 'video') icone = 'fa-video';
      else if (item.tipo === 'audio') icone = 'fa-microphone';
      else if (item.tipo === 'link') icone = 'fa-link';

      const autorPrefix = item.eMeu ? 'Você' : 'Contato';

      return `
        <div class="chat-history-item-row" onclick="irParaMensagemEVisualizar(${item.msgId}, '${item.url || ''}', '${item.tipo}')">
          <div class="chat-history-item-info">
            <div class="chat-history-item-icon">
              <i class="fa-solid ${icone}"></i>
            </div>
            <div class="chat-history-item-details">
              <span class="chat-history-item-title">${item.conteudo}</span>
              <span class="chat-history-item-sub">${autorPrefix} • ${dataStr}</span>
            </div>
          </div>
          <button class="btn-hist-icon" title="Ir até a mensagem">
            <i class="fa-solid fa-location-arrow"></i>
          </button>
        </div>`;
    }).join('') + `</div>`;
  }
}

function irParaMensagemEVisualizar(msgId, url, tipo) {
  fecharHistoricoChat();

  if ((tipo === 'midia' || tipo === 'video' || tipo === 'imagem') && url) {
    if (typeof window.abrirMidiaFull === 'function') window.abrirMidiaFull(url, tipo === 'video' ? 'video' : 'imagem');
  }

  if (typeof window.rolarParaMensagem === 'function') {
    window.rolarParaMensagem(msgId);
  }
}

// Exportações Globais
window.abrirHistoricoChat = abrirHistoricoChat;
window.fecharHistoricoChat = fecharHistoricoChat;
window.filtrarAbasHistorico = filtrarAbasHistorico;
window.buscarNoHistorico = buscarNoHistorico;
window.irParaMensagemEVisualizar = irParaMensagemEVisualizar;
