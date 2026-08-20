// src/hooks/useMotorRanking.js
import { useMemo } from 'react';

export function useMotorRanking(
  usuarios, 
  opsDoDia, 
  pedidosProcessados, 
  controlePausas, 
  ajustesDoDia, 
  dataOperacaoAtiva, 
  horaReferenciaAtual,
  dadosExpediente
) {
  return useMemo(() => {
    if (!usuarios || usuarios.length === 0) return [];
    
    const [anoR, mesR, diaR] = dataOperacaoAtiva.split('-');
    
    // 1. Extração do Horário de Início e Fim do Expediente
    const horaInicioStr = dadosExpediente?.inicio || '07:30';
    const horaFimStr = dadosExpediente?.fim || '17:30';
    
    const [hIni, mIni] = horaInicioStr.split(':').map(Number);
    const [hFim, mFim] = horaFimStr.split(':').map(Number);
    
    const inicioExpedienteMs = new Date(Number(anoR), Number(mesR) - 1, Number(diaR), hIni, mIni, 0).getTime();
    const fimExpedienteMs = new Date(Number(anoR), Number(mesR) - 1, Number(diaR), hFim, mFim, 0).getTime();
    
    const relogioBase = horaReferenciaAtual || Date.now();
    
    // Se o ADM encerrou o dia, o teto congela na hora do fim do expediente
    const tempoReferencia = dadosExpediente?.status === 'encerrado' 
      ? Math.min(relogioBase, fimExpedienteMs) 
      : relogioBase;

    const userStats = {};
    
    // 2. Inicialização dos Conferentes
    usuarios.forEach(u => {
      userStats[u.uid] = { 
        nome: u.nickname || (u.email ? u.email.split('@')[0] : 'usuario'), 
        email: u.email || '',
        skus: 0, pontosSku: 0, op: 0, pedidos: 0, 
        bonusPedidos: 0, decrescimo: 0, pontos: 0, 
        eventos: [], pointEvents: [], eventosMesclados: [],
        uid: u.uid
      };
    });

    // 3. Ordens de Produção (+50 pts)
    (opsDoDia || []).forEach(op => {
       if (op.responsavelUid && userStats[op.responsavelUid]) {
          userStats[op.responsavelUid].op += 1;
          userStats[op.responsavelUid].pontos += 50;
          let time = op.createdAt?.toMillis ? op.createdAt.toMillis() : tempoReferencia;
          time = Math.max(inicioExpedienteMs, Math.min(tempoReferencia, time));
          
          userStats[op.responsavelUid].eventos.push({ start: time, end: time });
          userStats[op.responsavelUid].pointEvents.push({ 
            time, delta: 50, label: '🏭 Ordem de Produção', detalhe: 'Registro rápido concluído', sourceId: op.id, sourceType: 'op'
          });
       }
    });

    // 4. Pedidos Processados (SKUs e Bônus)
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

      const participantes = (pedido.uidsVinculados && pedido.uidsVinculados.length > 0) 
        ? pedido.uidsVinculados 
        : (pedido.criadorUid ? [pedido.criadorUid] : []);
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
            } else if (pedido.isPaused && pedido.lastPauseStart) {
               endRaw = pedido.lastPauseStart; 
            }
            
            let startClamped = Math.max(inicioExpedienteMs, startRaw);
            let endClamped = Math.min(tempoReferencia, endRaw);
            if (endClamped < startClamped) endClamped = startClamped;

            userStats[uid].eventos.push({ start: startClamped, end: endClamped });
            userStats[uid].pointEvents.push({ 
              time: startClamped, delta: 0, label: `📦 Início: ${pedido.romaneio || 'S/N'}`, detalhe: 'Iniciou a separação', sourceId: pedido.id, sourceType: 'pedido' 
            });

            if (pedido.efetivado) {
               userStats[uid].pointEvents.push({ 
                 time: endClamped, delta: pontosSkuDivididos + bonusDividido, label: `✅ Fim: ${pedido.romaneio || 'S/N'}`, detalhe: `+${pontosSkuDivididos} pts (SKUs) e +${bonusDividido} pts (Bônus)`, sourceId: pedido.id, sourceType: 'pedido' 
               });
            } else if (pedido.isPaused) {
               userStats[uid].pointEvents.push({ 
                 time: endClamped, delta: 0, label: `⏸️ Pausa: ${pedido.romaneio || 'S/N'}`, detalhe: pedido.motivoPausa || 'Cronômetro pausado', sourceId: pedido.id, sourceType: 'pedido' 
               });
            }
         }
      });
    });

    // 5. Pausas da Liderança (Proteção manual de ociosidade)
    if (controlePausas) {
      Object.entries(controlePausas).forEach(([chaveIdentificadora, dadosPausa]) => {
        if (!dadosPausa) return;

        const u = usuarios.find(usr => 
          usr.uid === chaveIdentificadora ||
          usr.nickname === chaveIdentificadora ||
          usr.email === chaveIdentificadora ||
          (usr.email && usr.email.split('@')[0] === chaveIdentificadora)
        );

        if (u && userStats[u.uid]) {
          const pausas = Array.isArray(dadosPausa.history) ? [...dadosPausa.history] : [];
          
          if (dadosPausa.isPaused) {
            const ultimoRegistro = pausas[pausas.length - 1];
            if (!ultimoRegistro || ultimoRegistro.end) {
              pausas.push({ start: tempoReferencia, end: tempoReferencia });
            }
          }

          pausas.forEach(p => {
            let start = Math.max(inicioExpedienteMs, Math.min(tempoReferencia, p.start || tempoReferencia));
            let end = Math.max(start, Math.min(tempoReferencia, p.end || tempoReferencia));

            const jaExiste = userStats[u.uid].eventos.some(e => e.start === start && e.end === end);
            if (!jaExiste) {
              userStats[u.uid].eventos.push({ start, end });
              userStats[u.uid].pointEvents.push({ 
                time: start, delta: 0, label: '☕ Pausa Operacional', detalhe: 'Parada autorizada pela liderança', sourceType: 'pausa_adm' 
              });
              if (p.end && end < tempoReferencia) {
                userStats[u.uid].pointEvents.push({ 
                  time: end, delta: 0, label: '▶️ Retorno à Operação', detalhe: 'Retomada das atividades', sourceType: 'pausa_adm' 
                });
              }
            }
          });
        }
      });
    }

    // 6. Cálculo da Ociosidade Automática (Tolerância de 20 min e -10 pts/min)
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

       // Penalidade nos intervalos entre tarefas
       for (let i = 1; i < merged.length; i++) {
          const gapMs = merged[i].start - merged[i-1].end;
          if (gapMs > LIMITE_OCIOSIDADE_MS) {
             const excessoMs = gapMs - LIMITE_OCIOSIDADE_MS;
             const penalidade = Math.floor(excessoMs / 60000) * 10;
             user.decrescimo += penalidade; 
             user.pontos -= penalidade; 
             user.pointEvents.push({ 
               time: merged[i-1].end + LIMITE_OCIOSIDADE_MS, delta: 0, label: '⏱️ Fim da Tolerância (20 min)', detalhe: 'Iniciando decréscimo de pontuação', sourceType: 'calculado' 
             });
             user.pointEvents.push({ 
               time: merged[i].start - 1000, delta: -penalidade, label: '❌ Multa de Ociosidade', detalhe: `Perdeu ${penalidade} pts (${Math.floor(excessoMs / 60000)} min ocioso)`, sourceType: 'calculado' 
             });
          }
       }
       
       // Penalidade da ociosidade atual (se o dia foi iniciado e a última tarefa terminou)
       if (merged.length > 0 && dadosExpediente?.status === 'aberto') {
          const ultimaTarefa = merged[merged.length - 1];
          if (ultimaTarefa.end < tempoReferencia) {
             const ociosidadeAtualMs = tempoReferencia - ultimaTarefa.end;
             if (ociosidadeAtualMs > LIMITE_OCIOSIDADE_MS) {
                const excessoMs = ociosidadeAtualMs - LIMITE_OCIOSIDADE_MS;
                const penalidade = Math.floor(excessoMs / 60000) * 10;
                user.decrescimo += penalidade;
                user.pontos -= penalidade;
                user.pointEvents.push({ 
                  time: ultimaTarefa.end + LIMITE_OCIOSIDADE_MS, delta: 0, label: '⏱️ Fim da Tolerância (20 min)', detalhe: 'Iniciando decréscimo de pontuação', sourceType: 'calculado' 
                });
                user.pointEvents.push({ 
                  time: tempoReferencia, delta: -penalidade, label: '⚠️ Ociosidade Ativa', detalhe: `Perdendo ${penalidade} pts (${Math.floor(ociosidadeAtualMs / 60000)} min sem demandas)`, sourceType: 'calculado' 
                });
             }
          }
       }

       user.eventosMesclados = merged;

       // 7. Ajustes ADM Manuais
       if (ajustesDoDia) {
         const ajustesDesteUsuario = ajustesDoDia.filter(a => 
           a.usuarioUid === user.uid ||
           a.usuarioNome === user.nome ||
           a.usuarioNome === user.email ||
           (user.email && a.usuarioNome === user.email.split('@')[0])
         );

         ajustesDesteUsuario.forEach(ajuste => {
           user.pontos += (ajuste.pontos || 0);
           let time = ajuste.createdAt?.toMillis ? ajuste.createdAt.toMillis() : tempoReferencia;
           const motivoAdicional = ajuste.motivo ? ` (${ajuste.motivo})` : '';
           
           if (ajuste.isPerdao) {
             user.decrescimo = Math.max(0, user.decrescimo - (ajuste.pontos || 0));
             user.pointEvents.push({ 
               time, delta: ajuste.pontos, label: '🛡️ Perdão de Ociosidade', detalhe: `A liderança anulou a perda de ${ajuste.pontos} pts${motivoAdicional}`, sourceId: ajuste.id, sourceType: 'ajuste' 
             });
           } else {
             user.pointEvents.push({ 
               time, delta: ajuste.pontos, label: '⭐ Ajuste ADM', detalhe: `${ajuste.pontos > 0 ? '+' : ''}${ajuste.pontos} pts${motivoAdicional}`, sourceId: ajuste.id, sourceType: 'ajuste' 
             });
           }
         });
       }

       // 8. Distanciamento Visual de 1 Minuto no Gráfico
       user.pointEvents.sort((a, b) => a.time - b.time);
       for (let i = 1; i < user.pointEvents.length; i++) {
         if (user.pointEvents[i].time <= user.pointEvents[i-1].time) {
           user.pointEvents[i].time = user.pointEvents[i-1].time + 60000; // +1 minuto garantido
         }
       }

       let pontuacaoCorrente = 0;
       user.chartData = [];
       
       if (user.pointEvents.length > 0) {
         const primeiroTempo = new Date(user.pointEvents[0].time - 60000);
         user.chartData.push({ 
           timeStr: `${String(primeiroTempo.getHours()).padStart(2,'0')}:${String(primeiroTempo.getMinutes()).padStart(2,'0')}`, 
           timestamp: primeiroTempo.getTime(), score: 0, label: 'Início', detalhe: 'Início da jornada', delta: 0, isEvent: false 
         });
       }

       user.pointEvents.forEach(ev => {
         pontuacaoCorrente = Math.max(0, pontuacaoCorrente + ev.delta);
         const d = new Date(ev.time);
         user.chartData.push({ 
           timeStr: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`, 
           timestamp: ev.time, score: pontuacaoCorrente, label: ev.label, detalhe: ev.detalhe, delta: ev.delta, isEvent: true, sourceId: ev.sourceId, sourceType: ev.sourceType 
         });
       });

       if (user.pontos < 0) user.pontos = 0;
    });

    // 9. Ordenação Final
    return Object.values(userStats)
      .filter(u => u.pontos > 0 || u.pedidos > 0 || u.op > 0 || u.decrescimo > 0)
      .sort((a, b) => b.pontos - a.pontos)
      .map((u, idx) => ({ ...u, posicao: idx + 1 }));

  }, [usuarios, opsDoDia, pedidosProcessados, controlePausas, ajustesDoDia, dataOperacaoAtiva, horaReferenciaAtual, dadosExpediente]);
}