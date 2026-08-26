// ==========================================================================
// NOTCHAT MODULE (notchat.js) - CENTRAL DE NOTIFICAÇÕES & AMIZADES PRO
// Project Z v5.0 | Mentions Tracker, Pending Friend Requests & Batch Read
// ==========================================================================

let abaAtualNotChat = 'mencoes';
let filtroLeituraNotChat = 'todas'; // 'todas' | 'nao_lidas'

// Helper para obtenção segura do Supabase Client
function obterSupabaseNotChat() {
  return window.supabaseClient || window.supabase || window.sb || null;
}

// Injeta o CSS dedicado do Módulo de Notificações
(function injetarCssNotChat() {
  if (document.getElementById('notchat-css')) return;
  const style = document.createElement('style');
  style.id = 'notchat-css';
  style.textContent = `
    .notchat-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 5, 12, 0.85);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      z-index: 3500;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      animation: fadeInNot 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes fadeInNot {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .notchat-modal-box {
      width: 100%;
      max-width: 480px;
      height: 85vh;
      max-height: 580px;
      background: #140a17;
      border: 1px solid rgba(255, 45, 85, 0.35);
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.85);
      box-sizing: border-box;
    }

    .notchat-header {
      padding: 12px 16px;
      background: rgba(25, 13, 29, 0.95);
      border-bottom: 1px solid rgba(255, 45, 85, 0.2);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .notchat-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .notchat-header h3 i {
      color: var(--chat-accent, #ff2d55);
    }

    .notchat-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .notchat-btn-readall {
      background: rgba(255, 45, 85, 0.15);
      border: 1px solid rgba(255, 45, 85, 0.3);
      color: var(--chat-accent, #ff2d55);
      font-size: 0.72rem;
      font-weight: 700;
      padding: 5px 10px;
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .notchat-btn-readall:hover {
      background: var(--chat-accent, #ff2d55);
      color: #ffffff;
    }

    /* Botão Circular Compacto (X) */
    .btn-notchat-close {
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

    .btn-notchat-close:hover {
      background: var(--chat-accent, #ff2d55);
      color: #ffffff;
      border-color: var(--chat-accent, #ff2d55);
      transform: scale(1.05);
    }

    /* Abas Principais */
    .notchat-tabs-bar {
      display: flex;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .notchat-tab-btn {
      flex: 1;
      padding: 10px 6px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #b3a5b8;
      font-size: 0.76rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      white-space: nowrap;
    }

    .notchat-tab-btn.active {
      color: var(--chat-accent, #ff2d55);
      border-bottom-color: var(--chat-accent, #ff2d55);
      background: rgba(255, 45, 85, 0.06);
    }

    /* Sub-barra de Filtros (Todas vs Não Lidas) */
    .notchat-subfilter-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: rgba(18, 9, 21, 0.8);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .notchat-filter-chip {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #b3a5b8;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .notchat-filter-chip.active {
      background: rgba(255, 45, 85, 0.2);
      border-color: var(--chat-accent, #ff2d55);
      color: #fff;
    }

    .notchat-tab-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-sizing: border-box;
    }

    .notchat-tab-content::-webkit-scrollbar {
      width: 6px;
    }
    .notchat-tab-content::-webkit-scrollbar-thumb {
      background: rgba(255, 45, 85, 0.3);
      border-radius: 4px;
    }

    /* Cards de Notificação / Pedidos */
    .notchat-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      gap: 10px;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }

    .notchat-card:hover {
      background: rgba(255, 45, 85, 0.08);
      border-color: rgba(255, 45, 85, 0.3);
      transform: translateY(-1px);
    }

    .notchat-card.unread {
      background: rgba(255, 45, 85, 0.12);
      border-color: rgba(255, 45, 85, 0.35);
    }

    .notchat-unread-dot {
      width: 8px;
      height: 8px;
      background: var(--chat-accent, #ff2d55);
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 8px var(--chat-accent, #ff2d55);
    }

    .notchat-card-left {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
      flex: 1;
    }

    .notchat-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid var(--chat-accent, #ff2d55);
      flex-shrink: 0;
    }

    .notchat-meta {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      gap: 2px;
      width: 100%;
    }

    .notchat-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .notchat-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notchat-timestamp {
      font-size: 0.68rem;
      color: #8e7f96;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .notchat-subtext {
      font-size: 0.74rem;
      color: #b3a5b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }

    .notchat-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .btn-notchat-accept {
      background: var(--chat-accent, #ff2d55);
      border: none;
      color: #fff;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-notchat-accept:hover {
      background: #e02648;
    }

    .btn-notchat-reject {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #ff4757;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-notchat-reject:hover {
      background: rgba(255, 71, 87, 0.25);
    }

    .notchat-empty {
      margin: auto;
      text-align: center;
      color: #8e7f96;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 40px 20px;
    }

    .notchat-empty i {
      font-size: 2.2rem;
      color: rgba(255, 45, 85, 0.4);
    }
  `;
  document.head.appendChild(style);
})();

function formatarDataRelativaNotChat(timestamp) {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    const agora = new Date();
    const diffSeg = Math.floor((agora - date) / 1000);

    if (diffSeg < 60) return 'Agora';
    if (diffSeg < 3600) return `Há ${Math.floor(diffSeg / 60)}m`;
    if (diffSeg < 86400) return `Há ${Math.floor(diffSeg / 3600)}h`;

    const eHoje = date.toDateString() === agora.toDateString();
    const hora = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return eHoje 
      ? `Hoje às ${hora}` 
      : `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`;
  } catch (e) { 
    return ''; 
  }
}

function escFecharNotChat(e) {
  if (e.key === 'Escape') fecharPainelNotChat();
}

function abrirPainelNotChat() {
  fecharPainelNotChat();

  const modal = document.createElement('div');
  modal.id = 'notchat-modal-overlay';
  modal.className = 'notchat-modal-overlay';
  modal.onclick = (e) => { if (e.target === modal) fecharPainelNotChat(); };

  modal.innerHTML = `
    <div class="notchat-modal-box">
      <div class="notchat-header">
        <h3><i class="fa-solid fa-bell"></i> Central de Atividades</h3>
        <div class="notchat-header-actions">
          <button class="notchat-btn-readall" onclick="marcarTodasLidasNotChat()" title="Marcar todas como lidas">
            <i class="fa-solid fa-check-double"></i> Limpar Lidas
          </button>
          <button class="btn-notchat-close" onclick="fecharPainelNotChat()" title="Fechar (Esc)"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>

      <div class="notchat-tabs-bar">
        <button class="notchat-tab-btn active" id="tab-btn-mencoes" onclick="trocarAbaNotChat('mencoes')">
          <i class="fa-solid fa-at"></i> Menções
        </button>
        <button class="notchat-tab-btn" id="tab-btn-pendentes" onclick="trocarAbaNotChat('pendentes')">
          <i class="fa-solid fa-user-clock"></i> Pendentes
        </button>
        <button class="notchat-tab-btn" id="tab-btn-recentes" onclick="trocarAbaNotChat('recentes')">
          <i class="fa-solid fa-user-plus"></i> Recentes
        </button>
      </div>

      <div class="notchat-subfilter-bar" id="notchat-subfilter-container">
        <button class="notchat-filter-chip active" id="filter-chip-todas" onclick="alternarFiltroLeituraNotChat('todas')">Todas</button>
        <button class="notchat-filter-chip" id="filter-chip-nao_lidas" onclick="alternarFiltroLeituraNotChat('nao_lidas')">Não Lidas</button>
      </div>

      <div class="notchat-tab-content" id="notchat-tab-content">
        <div class="notchat-empty"><i class="fa-solid fa-spinner fa-spin"></i> Carregando atividades...</div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.addEventListener('keydown', escFecharNotChat);
  carregarConteudoAbaNotChat('mencoes');
}

function fecharPainelNotChat() {
  const el = document.getElementById('notchat-modal-overlay');
  if (el) el.remove();
  document.removeEventListener('keydown', escFecharNotChat);
}

function trocarAbaNotChat(aba) {
  abaAtualNotChat = aba;
  document.querySelectorAll('.notchat-tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-btn-${aba}`);
  if (activeBtn) activeBtn.classList.add('active');

  const filterContainer = document.getElementById('notchat-subfilter-container');
  if (filterContainer) {
    filterContainer.style.display = (aba === 'mencoes') ? 'flex' : 'none';
  }

  carregarConteudoAbaNotChat(aba);
}

function alternarFiltroLeituraNotChat(filtro) {
  filtroLeituraNotChat = filtro;
  document.querySelectorAll('.notchat-filter-chip').forEach(chip => chip.classList.remove('active'));
  const activeChip = document.getElementById(`filter-chip-${filtro}`);
  if (activeChip) activeChip.classList.add('active');

  carregarConteudoAbaNotChat(abaAtualNotChat);
}

async function carregarConteudoAbaNotChat(aba) {
  const container = document.getElementById('notchat-tab-content');
  if (!container) return;

  const clientSupabase = obterSupabaseNotChat();
  const usuarioLogado = typeof window.obterUsuarioLogadoChat === 'function' 
    ? window.obterUsuarioLogadoChat() 
    : (typeof window.obterUsuarioLogadoListChat === 'function' ? window.obterUsuarioLogadoListChat() : null);

  if (!clientSupabase || !usuarioLogado) {
    container.innerHTML = `<div class="notchat-empty"><i class="fa-solid fa-triangle-exclamation"></i> Não foi possível sincronizar suas notificações.</div>`;
    return;
  }

  const meId = Number(usuarioLogado.id);

  try {
    if (aba === 'mencoes') {
      const usernameHandle = `@${usuarioLogado.username}`;
      
      let query = clientSupabase
        .from('mensagens')
        .select('*, usuarios:remetente_id(id, display_name, username, avatar_url)')
        .ilike('conteudo', `%${usernameHandle}%`);

      if (filtroLeituraNotChat === 'nao_lidas') {
        query = query.eq('lida', false);
      }

      const { data: mencoes, error } = await query
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !mencoes || mencoes.length === 0) {
        container.innerHTML = `<div class="notchat-empty"><i class="fa-solid fa-at"></i> Nenhuma menção ${filtroLeituraNotChat === 'nao_lidas' ? 'não lida' : 'encontrada'}.</div>`;
        return;
      }

      container.innerHTML = mencoes.map(m => {
        const dataRelativa = formatarDataRelativaNotChat(m.created_at);
        const ehNaoLida = !m.lida;

        return `
          <div class="notchat-card ${ehNaoLida ? 'unread' : ''}" onclick="abrirConversaEMarcarLida(${m.remetente_id}, ${m.id})">
            <div class="notchat-card-left">
              <img src="${m.usuarios?.avatar_url || 'https://ui-avatars.com/api/?name=User'}" class="notchat-avatar" alt="Avatar">
              <div class="notchat-meta">
                <div class="notchat-title-row">
                  <span class="notchat-title">${m.usuarios?.display_name || m.usuarios?.username}</span>
                  <span class="notchat-timestamp">${dataRelativa}</span>
                </div>
                <span class="notchat-subtext">${m.conteudo}</span>
              </div>
            </div>
            ${ehNaoLida ? '<div class="notchat-unread-dot" title="Mensagem Não Lida"></div>' : ''}
          </div>
        `;
      }).join('');

    } else if (aba === 'pendentes') {
      const { data: pendentes } = await clientSupabase
        .from('amizades')
        .select('*, usuarios:usuario_id_1(id, display_name, username, avatar_url, created_at)')
        .eq('usuario_id_2', meId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (!pendentes || pendentes.length === 0) {
        container.innerHTML = `<div class="notchat-empty"><i class="fa-solid fa-user-clock"></i> Nenhum pedido de amizade pendente.</div>`;
        return;
      }

      container.innerHTML = pendentes.map(p => {
        const dataRelativa = formatarDataRelativaNotChat(p.created_at);
        return `
          <div class="notchat-card">
            <div class="notchat-card-left">
              <img src="${p.usuarios?.avatar_url || 'https://ui-avatars.com/api/?name=User'}" class="notchat-avatar" alt="Avatar">
              <div class="notchat-meta">
                <div class="notchat-title-row">
                  <span class="notchat-title">${p.usuarios?.display_name || p.usuarios?.username}</span>
                  <span class="notchat-timestamp">${dataRelativa}</span>
                </div>
                <span class="notchat-subtext">@${p.usuarios?.username} enviou um pedido de amizade</span>
              </div>
            </div>
            <div class="notchat-actions">
              <button class="btn-notchat-accept" onclick="responderAmizadeNotChat(${p.id}, 'aceito')"><i class="fa-solid fa-check"></i></button>
              <button class="btn-notchat-reject" onclick="responderAmizadeNotChat(${p.id}, 'recusado')"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>
        `;
      }).join('');

    } else if (aba === 'recentes') {
      const { data: recentes } = await clientSupabase
        .from('amizades')
        .select('*, u1:usuario_id_1(id, display_name, username, avatar_url), u2:usuario_id_2(id, display_name, username, avatar_url)')
        .or(`usuario_id_1.eq.${meId},usuario_id_2.eq.${meId}`)
        .eq('status', 'aceito')
        .order('created_at', { ascending: false })
        .limit(15);

      if (!recentes || recentes.length === 0) {
        container.innerHTML = `<div class="notchat-empty"><i class="fa-solid fa-user-plus"></i> Nenhuma conexão recente.</div>`;
        return;
      }

      container.innerHTML = recentes.map(a => {
        const amigo = Number(a.usuario_id_1) === meId ? a.u2 : a.u1;
        const dataRelativa = formatarDataRelativaNotChat(a.created_at);

        return `
          <div class="notchat-card" onclick="if(typeof window.seleccionarConversaDirect === 'function') { window.seleccionarConversaDirect(${amigo.id}); fecharPainelNotChat(); }">
            <div class="notchat-card-left">
              <img src="${amigo?.avatar_url || 'https://ui-avatars.com/api/?name=User'}" class="notchat-avatar" alt="Avatar">
              <div class="notchat-meta">
                <div class="notchat-title-row">
                  <span class="notchat-title">${amigo?.display_name || amigo?.username}</span>
                  <span class="notchat-timestamp">${dataRelativa}</span>
                </div>
                <span class="notchat-subtext">@${amigo?.username} • Vocês agora são amigos</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error("[NotChat] Erro ao carregar aba de notificações:", err);
  }
}

async function abrirConversaEMarcarLida(remetenteId, mensagemId) {
  const clientSupabase = obterSupabaseNotChat();
  if (clientSupabase && mensagemId) {
    try {
      await clientSupabase.from('mensagens').update({ lida: true }).eq('id', mensagemId);
    } catch (e) {
      console.error("[NotChat] Erro ao marcar leitura:", e);
    }
  }

  if (typeof window.seleccionarConversaDirect === 'function') {
    window.seleccionarConversaDirect(remetenteId);
  }
  fecharPainelNotChat();
}

async function marcarTodasLidasNotChat() {
  const clientSupabase = obterSupabaseNotChat();
  const usuarioLogado = typeof window.obterUsuarioLogadoChat === 'function' ? window.obterUsuarioLogadoChat() : null;
  if (!clientSupabase || !usuarioLogado) return;

  try {
    await clientSupabase
      .from('mensagens')
      .update({ lida: true })
      .eq('destinatario_id', Number(usuarioLogado.id))
      .eq('lida', false);

    carregarConteudoAbaNotChat(abaAtualNotChat);
  } catch (e) {
    console.error("[NotChat] Erro ao marcar todas como lidas:", e);
  }
}

async function responderAmizadeNotChat(amizadeId, novoStatus) {
  const clientSupabase = obterSupabaseNotChat();
  if (!clientSupabase) return;

  try {
    if (novoStatus === 'aceito') {
      await clientSupabase.from('amizades').update({ status: 'aceito' }).eq('id', amizadeId);
    } else {
      await clientSupabase.from('amizades').delete().eq('id', amizadeId);
    }
    carregarConteudoAbaNotChat('pendentes');
    if (typeof window.carregarListaConversas === 'function') window.carregarListaConversas();
  } catch (e) {
    console.error("[NotChat] Erro ao responder pedido de amizade:", e);
  }
}

// Exportações Globais
window.abrirPainelNotChat = abrirPainelNotChat;
window.fecharPainelNotChat = fecharPainelNotChat;
window.trocarAbaNotChat = trocarAbaNotChat;
window.alternarFiltroLeituraNotChat = alternarFiltroLeituraNotChat;
window.responderAmizadeNotChat = responderAmizadeNotChat;
window.abrirConversaEMarcarLida = abrirConversaEMarcarLida;
window.marcarTodasLidasNotChat = marcarTodasLidasNotChat;
