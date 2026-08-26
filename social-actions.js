// ==========================================================================
// MÓDULO DE AÇÕES SOCIAIS (social-actions.js)
// Project Z v5.0 | Relationship Status, Follow Logic & Deleted User Filtering
// ==========================================================================

// Obtenção Segura e Resiliente do Cliente Supabase
function obterSupabase() {
  return window.supabaseClient || window.supabase || window.sb || null;
}

// Resolução do ID do Usuário Logado via LocalStorage
function obterIdUsuarioLogado() {
  try {
    const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
    if (!raw) return null;
    const usuario = JSON.parse(raw);
    return usuario && usuario.id ? Number(usuario.id) : null;
  } catch (e) {
    console.error('[SocialActions] Erro ao extrair usuário logado:', e);
    return null;
  }
}

// 1. ALTERNAR SEGUIR / DEIXAR DE SEGUIR
async function alternarSeguir(idAlvo) {
  const sb = obterSupabase();
  const meuId = obterIdUsuarioLogado();
  const alvo = Number(idAlvo);

  if (!sb) { 
    console.error('[SocialActions] Cliente Supabase não encontrado.');
    return { sucesso: false, erro: 'cliente_indisponivel' }; 
  }
  
  if (meuId === null || isNaN(alvo)) { 
    return { sucesso: false, erro: 'nao_autenticado' }; 
  }
  
  if (meuId === alvo) {
    return { sucesso: false, erro: 'auto_seguimento' };
  }

  try {
    const { data: existente, error: errConsulta } = await sb
      .from('seguidores')
      .select('id')
      .eq('seguidor_id', meuId)
      .eq('seguido_id', alvo)
      .maybeSingle();

    if (errConsulta) throw errConsulta;

    if (existente) {
      const { error: errDelete } = await sb
        .from('seguidores')
        .delete()
        .eq('id', existente.id);

      if (errDelete) throw errDelete;
      return { sucesso: true, estado: 'nao_seguindo' };
    } else {
      const { error: errInsert } = await sb
        .from('seguidores')
        .insert([{ seguidor_id: meuId, seguido_id: alvo }]);

      if (errInsert) throw errInsert;
      return { sucesso: true, estado: 'seguindo' };
    }
  } catch (err) {
    console.error('[SocialActions] Erro ao alternar seguir:', err);
    return { sucesso: false, erro: err.message };
  }
}

// 2. GERENCIAR SOLICITAÇÃO / AMIZADE
async function alternarSolicitacaoAmizade(idAlvo) {
  const sb = obterSupabase();
  const meuId = obterIdUsuarioLogado();
  const alvo = Number(idAlvo);

  if (!sb) { 
    console.error('[SocialActions] Cliente Supabase não encontrado.');
    return { sucesso: false, erro: 'cliente_indisponivel' }; 
  }
  
  if (meuId === null || isNaN(alvo)) { 
    return { sucesso: false, erro: 'nao_autenticado' }; 
  }
  
  if (meuId === alvo) {
    return { sucesso: false, erro: 'auto_amizade' };
  }

  try {
    const { data: vinculo, error: errConsulta } = await sb
      .from('amizades')
      .select('id, status, usuario_id_1, usuario_id_2')
      .or(`and(usuario_id_1.eq.${meuId},usuario_id_2.eq.${alvo}),and(usuario_id_1.eq.${alvo},usuario_id_2.eq.${meuId})`)
      .maybeSingle();

    if (errConsulta) throw errConsulta;

    // Caso 1: Nenhuma amizade vinculada - Criar solicitação pendente
    if (!vinculo) {
      await sb
        .from('amizades')
        .insert([{ usuario_id_1: meuId, usuario_id_2: alvo, status: 'pendente' }]);
      return { sucesso: true, estado: 'solicitado_por_mim' };
    }

    // Caso 2: Pedido feito por mim que está pendente - Cancelar solicitação
    if (vinculo.status === 'pendente' && vinculo.usuario_id_1 === meuId) {
      await sb.from('amizades').delete().eq('id', vinculo.id);
      return { sucesso: true, estado: 'nenhum' };
    }

    // Caso 3: Pedido feito pelo outro que está pendente - Aceitar solicitação
    if (vinculo.status === 'pendente' && vinculo.usuario_id_1 === alvo) {
      await sb.from('amizades').update({ status: 'aceito' }).eq('id', vinculo.id);
      return { sucesso: true, estado: 'amigos' };
    }

    // Caso 4: Já são amigos - Desfazer amizade
    if (vinculo.status === 'aceito') {
      await sb.from('amizades').delete().eq('id', vinculo.id);
      return { sucesso: true, estado: 'nenhum' };
    }

    return { sucesso: false, estado: 'desconhecido' };
  } catch (err) {
    console.error('[SocialActions] Erro ao alternar solicitação de amizade:', err);
    return { sucesso: false, erro: err.message };
  }
}

// 3. CONSULTA DE STATUS E MÉTRICAS (Desconsidera contas excluídas/invalidadas)
async function obterStatusRelacionamentoESocial(idAlvo) {
  const sb = obterSupabase();
  const meuId = obterIdUsuarioLogado();
  const alvo = Number(idAlvo);

  const retorno = { 
    seguindo: false, 
    statusAmizade: 'nenhum', 
    totalAmigos: 0, 
    totalSeguindo: 0, 
    totalSeguidores: 0 
  };

  if (!sb || isNaN(alvo)) return retorno;

  try {
    // INNER JOINs garantem que apenas relacionamentos ativos com usuários existentes sejam contados
    const promises = [
      // Total Amigos Confirmados
      sb.from('amizades')
        .select('id, usuario_1:usuarios!amizades_usuario_id_1_fkey!inner(id), usuario_2:usuarios!amizades_usuario_id_2_fkey!inner(id)', { count: 'exact', head: true })
        .eq('status', 'aceito')
        .or(`usuario_id_1.eq.${alvo},usuario_id_2.eq.${alvo}`),

      // Total Pessoas que este usuário Segue
      sb.from('seguidores')
        .select('id, usuarios!seguidores_seguido_id_fkey!inner(id)', { count: 'exact', head: true })
        .eq('seguidor_id', alvo),

      // Total Seguidores que acompanham este usuário
      sb.from('seguidores')
        .select('id, usuarios!seguidores_seguidor_id_fkey!inner(id)', { count: 'exact', head: true })
        .eq('seguido_id', alvo)
    ];

    // Checa relação pessoal entre o usuário logado e o perfil visualizado
    if (meuId !== null && meuId !== alvo) {
      promises.push(
        sb.from('seguidores')
          .select('id')
          .eq('seguidor_id', meuId)
          .eq('seguido_id', alvo)
          .maybeSingle()
      );
      
      promises.push(
        sb.from('amizades')
          .select('id, status, usuario_id_1')
          .or(`and(usuario_id_1.eq.${meuId},usuario_id_2.eq.${alvo}),and(usuario_id_1.eq.${alvo},usuario_id_2.eq.${meuId})`)
          .maybeSingle()
      );
    }

    const res = await Promise.all(promises);

    retorno.totalAmigos = res[0].count || 0;
    retorno.totalSeguindo = res[1].count || 0;
    retorno.totalSeguidores = res[2].count || 0;

    if (res[3] && res[3].data) retorno.seguindo = true;
    if (res[4] && res[4].data) {
      const rel = res[4].data;
      if (rel.status === 'aceito') {
        retorno.statusAmizade = 'amigos';
      } else if (rel.status === 'pendente') {
        retorno.statusAmizade = (rel.usuario_id_1 === meuId) ? 'solicitado_por_mim' : 'recebido_do_outro';
      }
    }

    return retorno;
  } catch (err) {
    console.error('[SocialActions] Erro ao obter métricas sociais do usuário:', err);
    return retorno;
  }
}

// Exportações Globais
window.alternarSeguir = alternarSeguir;
window.alternarSolicitacaoAmizade = alternarSolicitacaoAmizade;
window.obterStatusRelacionamentoESocial = obterStatusRelacionamentoESocial;
