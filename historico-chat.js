// ==========================================================================
// HISTÓRICO DE MÍDIAS E MENSAGENS (historico-chat.js) - SPHERE v5.2 PRO
// Project Z / Sphere Core | Multi-Category Indexer & Synchronized User Theme
// Categories: Mensagens | Mídia | Áudios | Arquivos
// ==========================================================================

(function (global) {
  'use strict';

  let historicoCache = [];
  let historicoFiltroAtual = 'mensagens'; // 'mensagens', 'midia', 'audios', 'arquivos'
  let termoBuscaCache = '';

  // Helper para obtenção segura do Supabase Client
  function obterSupabaseHistorico() {
    return global.supabaseClient || global.supabase || global.sb || null;
  }

  // Sanitização estrita contra ataques XSS
  function sanitizarHist(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Processamento de Emojis e Twemoji
  function processarTwemojiHist(str) {
    if (!str) return '';
    if (global.twemoji && typeof global.twemoji.parse === 'function') {
      return global.twemoji.parse(String(str), {
        folder: 'svg',
        ext: '.svg',
        base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
      });
    }
    return str;
  }

  // Injeção Dinâmica de CSS Otimizado com Suporte ao Tema do Usuário
  (function injetarCssHistoricoChat() {
    if (document.getElementById('historico-chat-css')) return;
    const style = document.createElement('style');
    style.id = 'historico-chat-css';
    style.textContent = `
      /* Overlay Principal do Modal de Histórico */
      .chat-history-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(10, 5, 12, 0.85);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        z-index: 2900;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        animation: fadeInHist 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes fadeInHist {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }

      .chat-history-modal-card {
        width: 100%;
        max-width: 820px;
        height: 85vh;
        max-height: 780px;
        background: var(--chat-header-bg, rgba(22, 13, 25, 0.98));
        border: 1px solid var(--chat-user-border, rgba(255, 45, 85, 0.25));
        border-radius: 20px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 20px var(--chat-user-glow, rgba(255, 45, 85, 0.15));
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* Header do Histórico */
      .chat-history-header {
        padding: 12px 18px;
        background: rgba(25, 13, 29, 0.95);
        border-bottom: 1px solid var(--chat-user-border, rgba(255, 45, 85, 0.18));
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-shrink: 0;
      }

      .chat-history-title-box {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #ffffff;
      }

      .chat-history-title-box i {
        color: var(--chat-user-bg1, #ff2d55);
        font-size: 1.2rem;
        filter: drop-shadow(0 0 8px var(--chat-user-glow, rgba(255, 45, 85, 0.4)));
      }

      .chat-history-title-box h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 800;
        line-height: 1.2;
      }

      .chat-history-sub {
        font-size: 0.74rem;
        color: #b3a5b8;
        display: block;
      }

      /* Botões de Ação Padronizados (32px) */
      .btn-hist-icon {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #d1c4d6;
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        max-width: 32px !important;
        border-radius: 50% !important;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        padding: 0;
        flex-shrink: 0;
        box-sizing: border-box;
      }

      .btn-hist-icon:hover {
        background: var(--chat-user-bg1, #ff2d55);
        color: #ffffff;
        border-color: var(--chat-user-bg1, #ff2d55);
        transform: scale(1.08);
        box-shadow: 0 0 12px var(--chat-user-glow, rgba(255, 45, 85, 0.4));
      }

      /* Barra de Ferramentas e Abas */
      .chat-history-toolbar {
        padding: 12px 16px;
        background: rgba(18, 9, 21, 0.85);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        flex-direction: column;
        gap: 12px;
        flex-shrink: 0;
      }

      .chat-history-search-wrap {
        position: relative;
        width: 100%;
      }

      .chat-history-search-input {
        width: 100%;
        height: 36px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        padding: 0 14px 0 36px;
        color: #ffffff;
        font-size: 0.84rem;
        outline: none;
        box-sizing: border-box;
        transition: all 0.2s ease;
      }

      .chat-history-search-input:focus {
        border-color: var(--chat-user-bg1, #ff2d55);
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 0 10px var(--chat-user-glow, rgba(255, 45, 85, 0.25));
      }

      .chat-history-search-wrap i {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #8e7f96;
        font-size: 0.85rem;
      }

      /* Abas: Mensagens | Mídia | Áudios | Arquivos */
      .chat-history-tabs-row {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 2px;
        scrollbar-width: none;
      }

      .chat-history-tabs-row::-webkit-scrollbar {
        display: none;
      }

      .btn-hist-tab {
        flex: 1;
        height: 32px;
        min-height: 32px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #b3a5b8;
        font-size: 0.78rem;
        font-weight: 700;
        padding: 0 12px;
        border-radius: 10px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        white-space: nowrap;
        transition: all 0.2s ease;
        box-sizing: border-box;
      }

      .btn-hist-tab:hover {
        background: rgba(255, 255, 255, 0.09);
        color: #ffffff;
      }

      .btn-hist-tab.active {
        background: var(--chat-user-gradient, var(--chat-user-bg1, #ff2d55)) !important;
        color: #ffffff !important;
        border-color: var(--chat-user-bg1, #ff2d55) !important;
        box-shadow: 0 4px 14px var(--chat-user-glow, rgba(255, 45, 85, 0.4)) !important;
      }

      .hist-tab-count {
        background: rgba(0, 0, 0, 0.35);
        color: #ffffff;
        font-size: 0.65rem;
        font-weight: 900;
        padding: 1px 6px;
        border-radius: 8px;
        line-height: 1.2;
      }

      /* Feed Interno */
      .chat-history-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        box-sizing: border-box;
      }

      .chat-history-body::-webkit-scrollbar {
        width: 5px;
      }
      .chat-history-body::-webkit-scrollbar-thumb {
        background: var(--chat-user-border, rgba(255, 45, 85, 0.3));
        border-radius: 4px;
      }

      /* Grid de Mídias (Fotos, GIFs e Vídeos) */
      .chat-history-media-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 14px;
      }

      .chat-history-media-card {
        position: relative;
        display: flex;
        flex-direction: column;
        background: #0d0610;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
      }

      .chat-history-media-card:hover {
        transform: translateY(-3px);
        border-color: var(--chat-user-bg1, #ff2d55);
        box-shadow: 0 8px 24px var(--chat-user-glow, rgba(255, 45, 85, 0.3));
      }

      /* Header do Autor (Avatar + Moldura + Nome + Badges) */
      .chat-history-media-card-header {
        padding: 8px 10px;
        background: rgba(18, 9, 22, 0.92);
        display: flex;
        align-items: center;
        gap: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        z-index: 5;
      }

      .chat-history-author-avatar-wrap {
        position: relative;
        width: 28px;
        height: 28px;
        min-width: 28px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .chat-history-author-avatar-wrap img.chat-history-avatar-img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .chat-history-author-avatar-wrap img.chat-history-moldura-img {
        position: absolute;
        inset: -3px;
        width: calc(100% + 6px);
        height: calc(100% + 6px);
        pointer-events: none;
        object-fit: contain;
        z-index: 2;
      }

      .chat-history-media-author-meta {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        flex: 1;
        overflow: hidden;
      }

      .chat-history-media-author-name {
        font-size: 0.74rem;
        font-weight: 800;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Área Visual da Mídia */
      .chat-history-media-body-preview {
        position: relative;
        width: 100%;
        aspect-ratio: 1 / 1;
        background: #000000;
        cursor: pointer;
        overflow: hidden;
      }

      .chat-history-media-body-preview img,
      .chat-history-media-body-preview video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }

      .chat-history-media-card:hover .chat-history-media-body-preview img,
      .chat-history-media-card:hover .chat-history-media-body-preview video {
        transform: scale(1.04);
      }

      .chat-history-badge-type {
        position: absolute;
        top: 6px;
        right: 6px;
        background: rgba(0, 0, 0, 0.8);
        color: #ffffff;
        padding: 2px 7px;
        border-radius: 6px;
        font-size: 0.62rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 4px;
        backdrop-filter: blur(4px);
        z-index: 3;
      }

      /* Footer do Card de Mídia */
      .chat-history-media-card-footer {
        padding: 6px 10px;
        background: rgba(18, 9, 22, 0.92);
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        z-index: 5;
      }

      .chat-history-media-date {
        font-size: 0.65rem;
        color: #d1c4d6;
        font-weight: 600;
      }

      /* Sistema Estritamente Corrigido de Spoiler em Mídia */
      .chat-history-media-spoiler-overlay {
        position: absolute;
        inset: 0;
        background: rgba(14, 7, 18, 0.96);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: var(--chat-user-bg1, #ff2d55);
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 1px;
        z-index: 10;
        cursor: pointer;
        transition: opacity 0.25s ease, visibility 0.25s ease;
      }

      .chat-history-media-spoiler-overlay i {
        font-size: 1.2rem;
      }

      .chat-history-media-spoiler-overlay.revealed {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }

      /* Lista de Mensagens, Áudios e Arquivos */
      .chat-history-list-view {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .chat-history-item-row {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        transition: all 0.2s ease;
      }

      .chat-history-item-row:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: var(--chat-user-border, rgba(255, 45, 85, 0.35));
        transform: translateX(2px);
      }

      .chat-history-item-info {
        display: flex;
        align-items: center;
        gap: 12px;
        overflow: hidden;
        flex: 1;
      }

      .chat-history-item-details {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        flex: 1;
        gap: 3px;
      }

      .chat-history-item-meta-header {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .chat-history-item-author-name {
        font-size: 0.78rem;
        font-weight: 800;
        color: #ffffff;
      }

      .chat-history-item-title {
        font-size: 0.86rem;
        font-weight: 600;
        color: #e0d0e6;
        word-break: break-word;
        line-height: 1.35;
      }

      .chat-history-item-title mark {
        background: var(--chat-user-bg1, #ff2d55);
        color: #ffffff;
        border-radius: 3px;
        padding: 0 3px;
      }

      .chat-history-item-sub {
        font-size: 0.7rem;
        color: #8e7f96;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      /* Player do Histórico de Áudios */
      .chat-history-audio-player {
        width: 100%;
        max-width: 300px;
        height: 32px;
        margin-top: 4px;
        outline: none;
      }

      /* Spoiler de Texto Corrigido */
      .chat-spoiler-text {
        background: #2a1b30;
        color: transparent;
        border-radius: 4px;
        padding: 0 5px;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s ease;
      }

      .chat-spoiler-text.revealed {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
      }

      /* Estado Vazio e Loading */
      .chat-history-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 220px;
        text-align: center;
        color: #8e7f96;
        gap: 10px;
      }

      .chat-history-empty i {
        font-size: 2.8rem;
        color: var(--chat-user-border, rgba(255, 45, 85, 0.35));
        filter: drop-shadow(0 0 12px var(--chat-user-glow, rgba(255, 45, 85, 0.2)));
      }

      .chat-history-empty p {
        margin: 0;
        font-size: 0.88rem;
        font-weight: 600;
      }

      @media (max-width: 600px) {
        .chat-history-modal-card {
          height: 92vh;
          border-radius: 16px;
        }
        .chat-history-media-grid {
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        }
      }
    `;
    document.head.appendChild(style);
  })();

  // Abertura do Modal Principal de Histórico
  async function abrirHistoricoChat(targetUsuario) {
    if (!targetUsuario) return;

    const modalAntigo = document.getElementById('chat-history-modal');
    if (modalAntigo) modalAntigo.remove();

    const nomeAlvo = sanitizarHist(targetUsuario.nome || targetUsuario.display_name || targetUsuario.username || 'Usuário');
    const handleAlvo = sanitizarHist(targetUsuario.username || 'usuario');

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
              <h3>Histórico do Chat</h3>
              <span class="chat-history-sub">Registros e anexos com <strong>${nomeAlvo}</strong> (@${handleAlvo})</span>
            </div>
          </div>
          <button class="btn-hist-icon" onclick="window.fecharHistoricoChat()" title="Fechar (Esc)">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="chat-history-toolbar">
          <div class="chat-history-search-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" class="chat-history-search-input" id="chat-history-search-input" placeholder="Buscar em conversas e mídias..." oninput="window.buscarNoHistorico(this.value)">
          </div>

          <div class="chat-history-tabs-row">
            <button class="btn-hist-tab active" id="tab-hist-mensagens" onclick="window.filtrarAbasHistorico('mensagens')">
              <i class="fa-solid fa-comments"></i> Mensagens <span class="hist-tab-count" id="count-hist-mensagens">0</span>
            </button>
            <button class="btn-hist-tab" id="tab-hist-midia" onclick="window.filtrarAbasHistorico('midia')">
              <i class="fa-solid fa-photo-film"></i> Mídia <span class="hist-tab-count" id="count-hist-midia">0</span>
            </button>
            <button class="btn-hist-tab" id="tab-hist-audios" onclick="window.filtrarAbasHistorico('audios')">
              <i class="fa-solid fa-microphone"></i> Áudios <span class="hist-tab-count" id="count-hist-audios">0</span>
            </button>
            <button class="btn-hist-tab" id="tab-hist-arquivos" onclick="window.filtrarAbasHistorico('arquivos')">
              <i class="fa-solid fa-folder-open"></i> Arquivos <span class="hist-tab-count" id="count-hist-arquivos">0</span>
            </button>
          </div>
        </div>

        <div class="chat-history-body" id="chat-history-body-feed">
          <div class="chat-history-empty">
            <i class="fa-solid fa-spinner fa-spin" style="color: var(--chat-user-bg1, #ff2d55);"></i>
            <p>Carregando histórico privado...</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.addEventListener('keydown', escFecharHistorico);

    await carregarDadosHistorico(targetUsuario);
  }

  function fecharHistoricoChat() {
    const modal = document.getElementById('chat-history-modal');
    if (modal) modal.remove();
    document.removeEventListener('keydown', escFecharHistorico);
  }

  function escFecharHistorico(e) {
    if (e.key === 'Escape') fecharHistoricoChat();
  }

  // Busca e Indexação do Supabase com Dados Completos dos Autores
  async function carregarDadosHistorico(targetUsuario) {
    const clientSupabase = obterSupabaseHistorico();
    const usuarioLogado = typeof global.obterUsuarioLogadoChat === 'function' ? global.obterUsuarioLogadoChat() : null;
    if (!clientSupabase || !usuarioLogado || !targetUsuario) return;

    const meId = Number(usuarioLogado.id);
    const targetIdNum = Number(targetUsuario.id);

    try {
      const { data: mensagens, error } = await clientSupabase
        .from('mensagens')
        .select('id, remetente_id, conteudo, imagem_url, created_at, excluido')
        .or(`and(remetente_id.eq.${meId},destinatario_id.eq.${targetIdNum}),and(remetente_id.eq.${targetIdNum},destinatario_id.eq.${meId})`)
        .eq('excluido', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      historicoCache = [];

      const infoMeu = {
        id: meId,
        nome: usuarioLogado.display_name || usuarioLogado.nome || usuarioLogado.username || 'Você',
        username: usuarioLogado.username || 'voce',
        avatar_url: usuarioLogado.avatar_url || `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=Você`,
        moldura_url: usuarioLogado.moldura_url || '',
        badgesHtml: typeof global.obterHtmlBadgesUsuario === 'function' ? global.obterHtmlBadgesUsuario(usuarioLogado) : ''
      };

      const infoTarget = {
        id: targetIdNum,
        nome: targetUsuario.nome || targetUsuario.display_name || targetUsuario.username || 'Contato',
        username: targetUsuario.username || 'contato',
        avatar_url: targetUsuario.avatar_url || `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(targetUsuario.username || 'C')}`,
        moldura_url: targetUsuario.moldura_url || '',
        badgesHtml: typeof global.renderizarBadgesLimposHeaderChat === 'function' 
          ? global.renderizarBadgesLimposHeaderChat(targetUsuario) 
          : (typeof global.obterHtmlBadgesUsuario === 'function' ? global.obterHtmlBadgesUsuario(targetUsuario) : '')
      };

      (mensagens || []).forEach(msg => {
        const eMeu = Number(msg.remetente_id) === meId;
        const autorMeta = eMeu ? infoMeu : infoTarget;
        const conteudoRaw = msg.conteudo ? msg.conteudo.replace(/^\[reply:\d+\]\s*/, '').trim() : '';

        let conteudoLimpo = conteudoRaw;

        // 1. Categoria: Mensagens de Texto
        if (conteudoLimpo) {
          historicoCache.push({
            msgId: msg.id,
            categoria: 'mensagens',
            conteudo: conteudoLimpo,
            data: msg.created_at,
            autor: autorMeta,
            eMeu
          });
        }

        // 2. Processamento de Anexos / Mídias / Áudios / Arquivos
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
            let nomeOriginal = typeof item === 'object' ? item.nome : 'Arquivo Anexo';
            let isSpoilerAnexo = typeof item === 'object' ? Boolean(item.isSpoiler) : false;

            if (typeof urlReal === 'string' && urlReal.startsWith('||') && urlReal.endsWith('||')) {
              isSpoilerAnexo = true;
              urlReal = urlReal.substring(2, urlReal.length - 2);
            }

            const urlLower = String(urlReal).toLowerCase();

            let cat = 'arquivos';
            let subTipo = 'documento';

            if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(urlLower) || urlLower.startsWith('data:image')) {
              cat = 'midia';
              subTipo = 'imagem';
            } else if (/\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(urlLower) || urlLower.startsWith('data:video')) {
              cat = 'midia';
              subTipo = 'video';
            } else if (/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(urlLower) || urlLower.startsWith('data:audio')) {
              cat = 'audios';
              subTipo = 'audio';
            }

            historicoCache.push({
              msgId: msg.id,
              categoria: cat,
              subTipo: subTipo,
              url: urlReal,
              nomeArquivo: nomeOriginal,
              isSpoiler: isSpoilerAnexo,
              conteudo: conteudoLimpo || (subTipo === 'video' ? 'Vídeo Anexado' : subTipo === 'audio' ? 'Mensagem de Voz' : subTipo === 'imagem' ? 'Imagem Anexada' : 'Arquivo / Documento'),
              data: msg.created_at,
              autor: autorMeta,
              eMeu
            });
          });
        }
      });

      atualizarContadoresAbas();
      renderizarFeedHistorico();

    } catch (err) {
      console.error("[Histórico] Erro ao carregar histórico privado:", err);
      const feed = document.getElementById('chat-history-body-feed');
      if (feed) {
        feed.innerHTML = `
          <div class="chat-history-empty">
            <i class="fa-solid fa-triangle-exclamation" style="color: #ff4757;"></i>
            <p>Não foi possível carregar o histórico no momento.</p>
          </div>`;
      }
    }
  }

  function atualizarContadoresAbas() {
    const counts = { mensagens: 0, midia: 0, audios: 0, arquivos: 0 };
    historicoCache.forEach(i => {
      if (counts[i.categoria] !== undefined) counts[i.categoria]++;
    });

    ['mensagens', 'midia', 'audios', 'arquivos'].forEach(cat => {
      const el = document.getElementById(`count-hist-${cat}`);
      if (el) el.innerText = counts[cat];
    });
  }

  function filtrarAbasHistorico(categoria) {
    historicoFiltroAtual = categoria;
    document.querySelectorAll('.btn-hist-tab').forEach(btn => btn.classList.remove('active'));
    
    const btnActive = document.getElementById(`tab-hist-${categoria}`);
    if (btnActive) btnActive.classList.add('active');

    renderizarFeedHistorico();
  }

  function buscarNoHistorico(termo) {
    termoBuscaCache = termo.trim().toLowerCase();
    renderizarFeedHistorico();
  }

  function processarSpoilersEHighlight(texto, busca) {
    if (!texto) return '';
    let sanitizado = sanitizarHist(texto);

    // Processa spoilers do tipo ||texto||
    sanitizado = sanitizado.replace(/\|\|(.*?)\|\|/g, '<span class="chat-spoiler-text" onclick="this.classList.toggle(\'revealed\')">$1</span>');

    if (busca) {
      const regex = new RegExp(`(${busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      sanitizado = sanitizado.replace(regex, '<mark>$1</mark>');
    }

    return processarTwemojiHist(sanitizado);
  }

  function renderizarFeedHistorico() {
    const feed = document.getElementById('chat-history-body-feed');
    if (!feed) return;

    let filtrados = historicoCache.filter(item => item.categoria === historicoFiltroAtual);

    if (termoBuscaCache) {
      filtrados = filtrados.filter(item => {
        const txt = item.conteudo ? item.conteudo.toLowerCase() : '';
        const url = item.url ? item.url.toLowerCase() : '';
        const nome = item.nomeArquivo ? item.nomeArquivo.toLowerCase() : '';
        const autorNome = item.autor ? item.autor.nome.toLowerCase() : '';
        return txt.includes(termoBuscaCache) || url.includes(termoBuscaCache) || nome.includes(termoBuscaCache) || autorNome.includes(termoBuscaCache);
      });
    }

    if (filtrados.length === 0) {
      feed.innerHTML = `
        <div class="chat-history-empty">
          <i class="fa-solid fa-folder-open"></i>
          <p>Nenhum registro encontrado nesta categoria.</p>
        </div>`;
      return;
    }

    // 1. Renderização em Grid Otimizada para 'Mídia' (Foto/GIF/Vídeo + Spoiler Corrigido + Header do Autor)
    if (historicoFiltroAtual === 'midia') {
      feed.innerHTML = `<div class="chat-history-media-grid">` + filtrados.map(item => {
        const dataStr = typeof global.formatarDataHoraChat === 'function' ? global.formatarDataHoraChat(item.data) : '';
        const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(item.autor.username)}`;
        const avatarAutor = item.autor.avatar_url || defaultAvatar;
        const molduraAutor = item.autor.moldura_url || '';

        const htmlAutorHeaderCard = `
          <div class="chat-history-media-card-header">
            <div class="chat-history-author-avatar-wrap">
              <img src="${avatarAutor}" class="chat-history-avatar-img" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="Avatar">
              ${molduraAutor ? `<img src="${molduraAutor}" class="chat-history-moldura-img" alt="Moldura">` : ''}
            </div>
            <div class="chat-history-media-author-meta">
              <span class="chat-history-media-author-name" title="${sanitizarHist(item.autor.nome)}">${sanitizarHist(item.autor.nome)}</span>
              ${item.autor.badgesHtml || ''}
            </div>
          </div>
        `;

        const htmlOverlaySpoiler = item.isSpoiler ? `
          <div class="chat-history-media-spoiler-overlay" onclick="event.stopPropagation(); this.classList.add('revealed');">
            <i class="fa-solid fa-eye-slash"></i>
            <span>SPOILER</span>
          </div>
        ` : '';

        if (item.subTipo === 'video') {
          return `
            <div class="chat-history-media-card">
              ${htmlAutorHeaderCard}
              <div class="chat-history-media-body-preview" onclick="window.irParaMensagemEVisualizar(${item.msgId}, '${item.url}', 'video')">
                ${htmlOverlaySpoiler}
                <span class="chat-history-badge-type"><i class="fa-solid fa-video"></i> VÍDEO</span>
                <video src="${item.url}#t=0.5" preload="metadata" onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\'chat-history-empty\' style=\'min-height:100%;\'><i class=\'fa-solid fa-file-video\'></i></div>';"></video>
              </div>
              <div class="chat-history-media-card-footer">
                <span class="chat-history-media-date">${dataStr}</span>
                <button class="btn-hist-icon" style="width:24px!important; height:24px!important; font-size:0.68rem;" onclick="window.irParaMensagemEVisualizar(${item.msgId});" title="Ir para a mensagem no chat">
                  <i class="fa-solid fa-location-arrow"></i>
                </button>
              </div>
            </div>`;
        } else {
          return `
            <div class="chat-history-media-card">
              ${htmlAutorHeaderCard}
              <div class="chat-history-media-body-preview" onclick="window.irParaMensagemEVisualizar(${item.msgId}, '${item.url}', 'imagem')">
                ${htmlOverlaySpoiler}
                <img src="${item.url}" alt="Mídia" loading="lazy" onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\'chat-history-empty\' style=\'min-height:100%;\'><i class=\'fa-solid fa-image-broken\'></i></div>';">
              </div>
              <div class="chat-history-media-card-footer">
                <span class="chat-history-media-date">${dataStr}</span>
                <button class="btn-hist-icon" style="width:24px!important; height:24px!important; font-size:0.68rem;" onclick="window.irParaMensagemEVisualizar(${item.msgId});" title="Ir para a mensagem no chat">
                  <i class="fa-solid fa-location-arrow"></i>
                </button>
              </div>
            </div>`;
        }
      }).join('') + `</div>`;
      return;
    }

    // 2. Renderização em Lista para 'Mensagens', 'Áudios' e 'Arquivos'
    feed.innerHTML = `<div class="chat-history-list-view">` + filtrados.map(item => {
      const dataStr = typeof global.formatarDataHoraChat === 'function' ? global.formatarDataHoraChat(item.data) : '';
      const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(item.autor.username)}`;
      const avatarAutor = item.autor.avatar_url || defaultAvatar;
      const molduraAutor = item.autor.moldura_url || '';

      const avatarHtmlList = `
        <div class="chat-history-author-avatar-wrap" style="width:36px; height:36px; min-width:36px;">
          <img src="${avatarAutor}" class="chat-history-avatar-img" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="Avatar">
          ${molduraAutor ? `<img src="${molduraAutor}" class="chat-history-moldura-img" alt="Moldura">` : ''}
        </div>
      `;

      if (historicoFiltroAtual === 'audios') {
        return `
          <div class="chat-history-item-row">
            <div class="chat-history-item-info">
              ${avatarHtmlList}
              <div class="chat-history-item-details">
                <div class="chat-history-item-meta-header">
                  <span class="chat-history-item-author-name">${sanitizarHist(item.autor.nome)}</span>
                  ${item.autor.badgesHtml || ''}
                </div>
                <span class="chat-history-item-sub">${dataStr}</span>
                <audio src="${item.url}" controls class="chat-history-audio-player"></audio>
              </div>
            </div>
            <button class="btn-hist-icon" onclick="window.irParaMensagemEVisualizar(${item.msgId})" title="Ir para a mensagem">
              <i class="fa-solid fa-location-arrow"></i>
            </button>
          </div>`;
      }

      if (historicoFiltroAtual === 'arquivos') {
        return `
          <div class="chat-history-item-row">
            <div class="chat-history-item-info">
              ${avatarHtmlList}
              <div class="chat-history-item-details">
                <div class="chat-history-item-meta-header">
                  <span class="chat-history-item-author-name">${sanitizarHist(item.autor.nome)}</span>
                  ${item.autor.badgesHtml || ''}
                </div>
                <span class="chat-history-item-title">${processarSpoilersEHighlight(item.nomeArquivo || 'Arquivo Anexo', termoBuscaCache)}</span>
                <span class="chat-history-item-sub">${dataStr}</span>
              </div>
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
              <a href="${item.url}" target="_blank" download class="btn-hist-icon" title="Baixar Arquivo">
                <i class="fa-solid fa-download"></i>
              </a>
              <button class="btn-hist-icon" onclick="window.irParaMensagemEVisualizar(${item.msgId})" title="Ir para a mensagem">
                <i class="fa-solid fa-location-arrow"></i>
              </button>
            </div>
          </div>`;
      }

      // Categoria Padrão: Mensagens de Texto
      return `
        <div class="chat-history-item-row" onclick="window.irParaMensagemEVisualizar(${item.msgId})">
          <div class="chat-history-item-info">
            ${avatarHtmlList}
            <div class="chat-history-item-details">
              <div class="chat-history-item-meta-header">
                <span class="chat-history-item-author-name">${sanitizarHist(item.autor.nome)}</span>
                ${item.autor.badgesHtml || ''}
              </div>
              <span class="chat-history-item-title">${processarSpoilersEHighlight(item.conteudo, termoBuscaCache)}</span>
              <span class="chat-history-item-sub">${dataStr}</span>
            </div>
          </div>
          <button class="btn-hist-icon" title="Ir para a mensagem">
            <i class="fa-solid fa-location-arrow"></i>
          </button>
        </div>`;
    }).join('') + `</div>`;
  }

  function irParaMensagemEVisualizar(msgId, url, tipo) {
    fecharHistoricoChat();

    if ((tipo === 'video' || tipo === 'imagem') && url) {
      if (typeof global.abrirMidiaFull === 'function') global.abrirMidiaFull(url, tipo);
    }

    if (typeof global.rolarParaMensagem === 'function') {
      global.rolarParaMensagem(msgId);
    }
  }

  // Exportações Globais
  global.abrirHistoricoChat = abrirHistoricoChat;
  global.fecharHistoricoChat = fecharHistoricoChat;
  global.filtrarAbasHistorico = filtrarAbasHistorico;
  global.buscarNoHistorico = buscarNoHistorico;
  global.irParaMensagemEVisualizar = irParaMensagemEVisualizar;

})(typeof window !== 'undefined' ? window : this);
