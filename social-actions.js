// ==========================================================================
// MÓDULO DE AÇÕES SOCIAIS (social-actions.js) - SPHERE v5.2 PRO
// Relationship Engine | Follow, Friends & Active Users Querying
// ==========================================================================

(function (global) {
  'use strict';

  // Obtenção Segura e Resiliente do Cliente Supabase
  function obterSupabase() {
    return global.supabaseClient || global.supabase || global.sb || null;
  }

  // Resolução do ID do Usuário Logado via LocalStorage
  function obterIdUsuarioLogado() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      if (!raw) return null;
      const usuario = JSON.parse(raw);
      return usuario && usuario.id !== undefined && usuario.id !== null ? Number(usuario.id) : null;
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
      return { sucesso: false, erro: err.message || 'falha_processamento' };
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
        const { error: errInsert } = await sb
          .from('amizades')
          .insert([{ usuario_id_1: meuId, usuario_id_2: alvo, status: 'pendente' }]);

        if (errInsert) throw errInsert;
        return { sucesso: true, estado: 'solicitado_por_mim' };
      }

      // Caso 2: Pedido feito por mim que está pendente - Cancelar solicitação
      if (vinculo.status === 'pendente' && Number(vinculo.usuario_id_1) === meuId) {
        const { error: errDelete } = await sb.from('amizades').delete().eq('id', vinculo.id);
        if (errDelete) throw errDelete;
        return { sucesso: true, estado: 'nenhum' };
      }

      // Caso 3: Pedido feito pelo outro que está pendente - Aceitar solicitação
      if (vinculo.status === 'pendente' && Number(vinculo.usuario_id_1) === alvo) {
        const { error: errUpdate } = await sb.from('amizades').update({ status: 'aceito' }).eq('id', vinculo.id);
        if (errUpdate) throw errUpdate;
        return { sucesso: true, estado: 'amigos' };
      }

      // Caso 4: Já são amigos - Desfazer amizade
      if (vinculo.status === 'aceito') {
        const { error: errDelete } = await sb.from('amizades').delete().eq('id', vinculo.id);
        if (errDelete) throw errDelete;
        return { sucesso: true, estado: 'nenhum' };
      }

      return { sucesso: false, estado: 'desconhecido' };
    } catch (err) {
      console.error('[SocialActions] Erro ao alternar solicitação de amizade:', err);
      return { sucesso: false, erro: err.message || 'falha_processamento' };
    }
  }

  // 3. CONSULTA DE STATUS E MÉTRICAS (Resiliente a Schema sem FKs explícitas)
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
      const promises = [
        // Total Amigos Confirmados
        sb.from('amizades')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'aceito')
          .or(`usuario_id_1.eq.${alvo},usuario_id_2.eq.${alvo}`),

        // Total Pessoas que este usuário Segue
        sb.from('seguidores')
          .select('id', { count: 'exact', head: true })
          .eq('seguidor_id', alvo),

        // Total Seguidores que acompanham este usuário
        sb.from('seguidores')
          .select('id', { count: 'exact', head: true })
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

      const resultados = await Promise.allSettled(promises);

      if (resultados[0].status === 'fulfilled' && resultados[0].value) {
        retorno.totalAmigos = resultados[0].value.count || 0;
      }
      if (resultados[1].status === 'fulfilled' && resultados[1].value) {
        retorno.totalSeguindo = resultados[1].value.count || 0;
      }
      if (resultados[2].status === 'fulfilled' && resultados[2].value) {
        retorno.totalSeguidores = resultados[2].value.count || 0;
      }

      if (resultados[3] && resultados[3].status === 'fulfilled' && resultados[3].value?.data) {
        retorno.seguindo = true;
      }

      if (resultados[4] && resultados[4].status === 'fulfilled' && resultados[4].value?.data) {
        const rel = resultados[4].value.data;
        if (rel.status === 'aceito') {
          retorno.statusAmizade = 'amigos';
        } else if (rel.status === 'pendente') {
          retorno.statusAmizade = (Number(rel.usuario_id_1) === meuId) ? 'solicitado_por_mim' : 'recebido_do_outro';
        }
      }

      return retorno;
    } catch (err) {
      console.error('[SocialActions] Erro ao obter métricas sociais do usuário:', err);
      return retorno;
    }
  }

  // Exportações Globais Seguras
  global.alternarSeguir = alternarSeguir;
  global.alternarSolicitacaoAmizade = alternarSolicitacaoAmizade;
  global.obterStatusRelacionamentoESocial = obterStatusRelacionamentoESocial;

})(typeof window !== 'undefined' ? window : this);
