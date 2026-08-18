// src/hooks/useMotorRanking.js
import { useMemo } from 'react';

export function useMotorRanking(
  usuarios, 
  opsDoDia, 
  pedidosProcessados, 
  controlePausas, 
  ajustesDoDia, 
  dataOperacaoAtiva, 
  horaReferenciaAtual
) {
  return useMemo(() => {
    if (!usuarios || usuarios.length === 0) return [];
    
    const today = new Date();
    const dataHojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isHoje = dataOperacaoAtiva === dataHojeStr;

    const [anoR, mesR, diaR] = dataOperacaoAtiva.split('-');
    const limiteExpediente = new Date(Number(anoR), Number(mesR) - 1, Number(diaR), 17, 30, 0).getTime();
    
    // Se foi passado horaReferenciaAtual, usa diretamente; caso contrário, faz o corte das 17h30
    const relogioBase = horaReferenciaAtual || Date.now();
    const tempoReferencia = relogioBase > limiteExpediente ? limiteExpediente : relogioBase;
    const inicioDoDiaAtivo = new Date(Number(anoR), Number(mesR) - 1, Number(diaR), 0, 0, 0).getTime();

    const userStats = {};
    
    usuarios.forEach(u => {
      userStats[u.uid] = { 
        nome: u.email.split('@')[0], 
        skus: 0, pontosSku: 0, op: 0, pedidos: 0, 
        bonusPedidos: 0, decrescimo: 0, pontos: 0, eventos: [], pointEvents: [], uid: u.uid
      };
    });

    // 1. Ordens de Produção
    (opsDoDia || []).forEach(op => {
       if (op.responsavelUid && userStats[op.responsavelUid]) {
          userStats[op.responsavelUid].op += 1;
          userStats[op.responsavelUid].pontos += 50;
          let time = op.createdAt?.toMillis ? op.createdAt.toMillis() : tempoReferencia;
          time = Math.max(inicioDoDiaAtivo, Math.min(tempoReferencia, time));
          
          userStats[op.responsavelUid].eventos.push({ start: time, end: time });
          userStats[op.responsavelUid].pointEvents.push({ 
            time, delta: 50, label: '🏭 Ordem de Produção', detalhe: 'Registro rápido concluído', sourceId: op.id, sourceType: 'op'
          });
       }
    });

    // 2. Pedidos
    (pedidosProcessados || []).forEach(pedido => {
      let skusReais = 0;
      let pontosSKU = 0;

      (pedido.documentos || []).forEach(d => {
         (d.caixas || []).forEach(cx => {
            let skusNaCaixa = 0;
            (cx.produtos || []).forEach(p => skusNaCaixa += parseInt(p.quantidade) || 0);
            skusReais += skusNaCaixa;
            pontosSKU += Math.min(skusNaCaixa, 300); 
         });
      });

      const participantes = pedido.uidsVinculados || [pedido.criadorUid];
      const numParticipantes = participantes.length || 1; 
      
      const skusDivididos = Math.round(skusReais / numParticipantes);
      const pontosSkuDivididos = Math.round(pontosSKU / numParticipantes);
      const bonusDividido = Math.round(100 / numParticipantes);

      participantes.forEach(uid => {
         if (userStats[uid]) {
            if (pedido.efetivado) {
               userStats[uid].skus += skusDivididos;
               userStats[uid].pontosSku += pontosSkuDivididos;
               userStats[uid].pedidos += 1;
               userStats[uid].bonusPedidos += bonusDividido; 
               userStats[uid].pontos += pontosSkuDivididos + bonusDividido; 
            }
            
            let startRaw = pedido.createdAt?.toMillis ? pedido.createdAt.toMillis() : tempoReferencia;
            let endRaw = tempoReferencia; 
            
            if (pedido.efetivado && pedido.completedAt) {
               endRaw = pedido.completedAt?.toMillis ? pedido.completedAt.toMillis() : tempoReferencia;
            } else if (pedido.primeiraEfetivacao) {
               endRaw = pedido.primeiraEfetivacao?.toMillis ? pedido.primeiraEfetivacao.toMillis() : tempoReferencia;
            } else if (pedido.isPaused && pedido.lastPauseStart) {
               endRaw = pedido.lastPauseStart; 
            }
            
            let startClamped = Math.max(inicioDoDiaAtivo, startRaw);
            let endClamped = Math.min(tempoReferencia, endRaw);
            if (endClamped < startClamped) endClamped = startClamped;

            userStats[uid].eventos.push({ start: startClamped, end: endClamped });
            userStats[uid].pointEvents.push({ time: startClamped, delta: 0, label: `📦 Início: ${pedido.romaneio || 'S/N'}`, detalhe: 'Iniciou a separação' });

            if (pedido.efetivado) {
               userStats[uid].pointEvents.push({ time: endClamped, delta: pontosSkuDivididos + bonusDividido, label: `✅ Fim: ${pedido.romaneio || 'S/N'}`, detalhe: `+${pontosSkuDivididos} pts (SKUs) e +${bonusDividido} pts (Bônus)` });
            } else if (pedido.isPaused) {
               userStats[uid].pointEvents.push({ time: endClamped, delta: 0, label: `⏸️ Pausa: ${pedido.romaneio || 'S/N'}`, detalhe: pedido.motivoPausa || 'Cronômetro pausado' });
            }
         }
      });
    });

    // 3. Pausas da Liderança
    if (controlePausas) {
      Object.keys(controlePausas).forEach(nomeUsuario => {
        const u = usuarios.find(usr => usr.email.split('@')[0] === nomeUsuario);
        if (u && userStats[u.uid]) {
           const pausas = controlePausas[nomeUsuario].history || [];
           pausas.forEach(p => {
              const start = p.start;
              const end = p.end || tempoReferencia; 
              userStats[u.uid].eventos.push({ start, end });
              userStats[u.uid].pointEvents.push({ time: start, delta: 0, label: '☕ Pausa de Ociosidade', detalhe: 'Cronômetro pausado pela liderança', sourceType: 'pausa_adm' });
              if (p.end) userStats[u.uid].pointEvents.push({ time: end, delta: 0, label: '▶️ Retorno à Operação', detalhe: 'Contador de ociosidade reativado', sourceType: 'pausa_adm' });
           });
        }
      });
    }
// 4. Decréscimo (20 min)
       const LIMITE_OCIOSIDADE_MS = 20 * 60 * 1000; 
       
       Object.values(userStats).forEach(user => {
          user.eventos.sort((a, b) => a.start - b.start);
          
          const merged = [];
          user.eventos.forEach(ev => {
             if (merged.length === 0) { merged.push({...ev}); return; }
             const last = merged[merged.length - 1];
             if (ev.start <= last.end) last.end = Math.max(last.end, ev.end); 
             else merged.push({...ev});
          });

          for (let i = 1; i < merged.length; i++) {
             const gapMs = merged[i].start - merged[i-1].end;
             if (gapMs > LIMITE_OCIOSIDADE_MS) {
                const excessoMs = gapMs - LIMITE_OCIOSIDADE_MS;
                const penalidade = Math.floor(excessoMs / 60000) * 10;
                user.decrescimo += penalidade; 
                user.pontos -= penalidade; 
                user.pointEvents.push({ time: merged[i-1].end + LIMITE_OCIOSIDADE_MS, delta: 0, label: '⏱️ Fim da Tolerância', detalhe: 'A pausa permitida acabou. Iniciando perda de pontos.', sourceType: 'calculado' });
                user.pointEvents.push({ time: merged[i].start - 1000, delta: -penalidade, label: '❌ Multa Aplicada (Retorno)', detalhe: `Perdeu ${penalidade} pts`, sourceType: 'calculado' });
             }
          }
          
          // Sangramento em aberto: avaliado apenas até o tempoReferencia (17h30)
          if (merged.length > 0 && isHoje) {
             const ultimaTarefa = merged[merged.length - 1];
             if (ultimaTarefa.end < tempoReferencia) {
                const ociosidadeAtualMs = tempoReferencia - ultimaTarefa.end;
                if (ociosidadeAtualMs > LIMITE_OCIOSIDADE_MS) {
                   const excessoMs = ociosidadeAtualMs - LIMITE_OCIOSIDADE_MS;
                   const penalidade = Math.floor(excessoMs / 60000) * 10;
                   user.decrescimo += penalidade;
                   user.pontos -= penalidade;
                   user.pointEvents.push({ time: ultimaTarefa.end + LIMITE_OCIOSIDADE_MS, delta: 0, label: '⏱️ Fim da Tolerância', detalhe: 'A pausa permitida acabou. Iniciando sangramento.', sourceType: 'calculado' });
                   user.pointEvents.push({ time: tempoReferencia, delta: -penalidade, label: '⚠️ Sangramento Atual', detalhe: `Parado até o corte (${Math.floor(ociosidadeAtualMs / 60000)} min de intervalo).`, sourceType: 'calculado' });
                }
             }
          }

       user.eventosMesclados = merged;
       if (user.pontos < 0) user.pontos = 0;
       
       // 5. Ajustes ADM
       if (ajustesDoDia) {
         const ajustesDesteUsuario = ajustesDoDia.filter(a => a.usuarioNome === user.nome);
         ajustesDesteUsuario.forEach(ajuste => {
           if (ajuste.tipo === 'bonus') {
             user.pontos += ajuste.pontos;
             let time = ajuste.createdAt?.toMillis ? ajuste.createdAt.toMillis() : tempoReferencia;
             const motivoAdicional = ajuste.motivo ? ` - Motivo: ${ajuste.motivo}` : '';
             if (ajuste.isPerdao) {
               user.decrescimo = Math.max(0, user.decrescimo - ajuste.pontos);
               user.pointEvents.push({ time, delta: ajuste.pontos, label: '🛡️ Perdão de Ociosidade', detalhe: `A liderança devolveu ${ajuste.pontos} pts${motivoAdicional}`, sourceId: ajuste.id, sourceType: 'ajuste' });
             } else {
               user.pointEvents.push({ time, delta: ajuste.pontos, label: '⭐ Bônus / Ajuste ADM', detalhe: `${ajuste.pontos > 0 ? '+' : ''}${ajuste.pontos} pts${motivoAdicional}`, sourceId: ajuste.id, sourceType: 'ajuste' });
             }
           }
         });
       }

       // 6. Fechamento do Gráfico
       user.pointEvents.sort((a, b) => a.time - b.time);
       let pontuacaoCorrente = 0;
       user.chartData = [];
       if (user.pointEvents.length > 0) {
         const primeiroTempo = new Date(user.pointEvents[0].time - 60000);
         user.chartData.push({ timeStr: `${String(primeiroTempo.getHours()).padStart(2,'0')}:${String(primeiroTempo.getMinutes()).padStart(2,'0')}`, timestamp: primeiroTempo.getTime(), score: 0, label: 'Início', detalhe: 'Início da contagem', delta: 0, isEvent: false });
       }
       user.pointEvents.forEach(ev => {
         pontuacaoCorrente = Math.max(0, pontuacaoCorrente + ev.delta);
         const d = new Date(ev.time);
         user.chartData.push({ timeStr: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`, timestamp: ev.time, score: pontuacaoCorrente, label: ev.label, detalhe: ev.detalhe, delta: ev.delta, isEvent: true, sourceId: ev.sourceId, sourceType: ev.sourceType });
       });
       if (isHoje && user.chartData.length > 0) {
         const agora = new Date(tempoReferencia);
         user.chartData.push({ timeStr: `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`, timestamp: tempoReferencia, score: pontuacaoCorrente, label: 'Tempo Real', detalhe: 'Momento exato', delta: 0, isEvent: false });
       }
    });

    return Object.values(userStats).filter(u => u.pontos > 0 || u.pedidos > 0 || u.op > 0).sort((a, b) => b.pontos - a.pontos).map((u, idx) => ({ ...u, posicao: idx + 1 }));

  }, [usuarios, opsDoDia, pedidosProcessados, controlePausas, ajustesDoDia, dataOperacaoAtiva, horaReferenciaAtual]);
}