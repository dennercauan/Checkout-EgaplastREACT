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
    
    const relogioBase = horaReferenciaAtual || Date.now();
    const tempoReferencia = relogioBase > limiteExpediente ? limiteExpediente : relogioBase;
    const inicioDoDiaAtivo = new Date(Number(anoR), Number(mesR) - 1, Number(diaR), 0, 0, 0).getTime();

    const userStats = {};
    
    usuarios.forEach(u => {
      userStats[u.uid] = { 
        nome: u.nickname || (u.email ? u.email.split('@')[0] : 'usuario'), 
        email: u.email || '',
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

    // 3. Pausas da Liderança (Busca flexível por UID, Nickname ou E-mail)
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
          
          // Se o usuário está pausado no momento, garante o fechamento do evento até o tempo de referência atual
          if (dadosPausa.isPaused) {
            const ultimoRegistro = pausas[pausas.length - 1];
            if (!ultimoRegistro || ultimoRegistro.end) {
              pausas.push({ start: tempoReferencia, end: tempoReferencia });
            }
          }

          pausas.forEach(p => {
            let startRaw = p.start || tempoReferencia;
            let endRaw = p.end || tempoReferencia;

            // Clamping para manter os horários dentro do expediente válido
            let start = Math.max(inicioDoDiaAtivo, Math.min(tempoReferencia, startRaw));
            let end = Math.max(start, Math.min(tempoReferencia, endRaw));

            const jaExiste = userStats[u.uid].eventos.some(e => e.start === start && e.end === end);
            if (!jaExiste) {
              userStats[u.uid].eventos.push({ start, end });
              userStats[u.uid].pointEvents.push({ 
                time: start, 
                delta: 0, 
                label: '☕ Pausa de Ociosidade', 
                detalhe: 'Cronômetro pausado pela liderança', 
                sourceType: 'pausa_adm' 
              });
              
              if (p.end && end < tempoReferencia) {
                userStats[u.uid].pointEvents.push({ 
                  time: end, 
                  delta: 0, 
                  label: '▶️ Retorno à Operação', 
                  detalhe: 'Contador de ociosidade reativado', 
                  sourceType: 'pausa_adm' 
                });
              }
            }
          });
        }
      });
    }

    // 4. Decréscimo (Tolerância de 20 min)
    const LIMITE_OCIOSIDADE_MS = 20 * 60 * 1000; 
       
    Object.values(userStats).forEach(user => {
       // Ordena todos os eventos combinados cronologicamente
       user.eventos.sort((a, b) => a.start - b.start);
       
       // Mescla eventos sobrepostos (ex: pedidos paralelos + pausas)
       const merged = [];
       user.eventos.forEach(ev => {
          if (merged.length === 0) { 
            merged.push({ ...ev }); 
            return; 
          }
          const last = merged[merged.length - 1];
          if (ev.start <= last.end) {
            last.end = Math.max(last.end, ev.end); 
          } else {
            merged.push({ ...ev });
          }
       });

       // Penalidade nos intervalos entre tarefas concluídas
       for (let i = 1; i < merged.length; i++) {
          const gapMs = merged[i].start - merged[i-1].end;
          if (gapMs > LIMITE_OCIOSIDADE_MS) {
             const excessoMs = gapMs - LIMITE_OCIOSIDADE_MS;
             const penalidade = Math.floor(excessoMs / 60000) * 10;
             user.decrescimo += penalidade; 
             user.pontos -= penalidade; 
             user.pointEvents.push({ 
               time: merged[i-1].end + LIMITE_OCIOSIDADE_MS, 
               delta: 0, 
               label: '⏱️ Fim da Tolerância', 
               detalhe: 'A pausa permitida acabou. Iniciando perda de pontos.', 
               sourceType: 'calculado' 
             });
             user.pointEvents.push({ 
               time: merged[i].start - 1000, 
               delta: -penalidade, 
               label: '❌ Multa Aplicada (Retorno)', 
               detalhe: `Perdeu ${penalidade} pts`, 
               sourceType: 'calculado' 
             });
          }
       }
       
       // Penalidade da ociosidade ativa (apenas se a última atividade terminou antes do tempo atual)
       if (merged.length > 0 && isHoje) {
          const ultimaTarefa = merged[merged.length - 1];
          if (ultimaTarefa.end < tempoReferencia) {
             const ociosidadeAtualMs = tempoReferencia - ultimaTarefa.end;
             if (ociosidadeAtualMs > LIMITE_OCIOSIDADE_MS) {
                const excessoMs = ociosidadeAtualMs - LIMITE_OCIOSIDADE_MS;
                const penalidade = Math.floor(excessoMs / 60000) * 10;
                user.decrescimo += penalidade;
                user.pontos -= penalidade;
                user.pointEvents.push({ 
                  time: ultimaTarefa.end + LIMITE_OCIOSIDADE_MS, 
                  delta: 0, 
                  label: '⏱️ Fim da Tolerância', 
                  detalhe: 'A pausa permitida acabou. Iniciando perda de pontos.', 
                  sourceType: 'calculado' 
                });
                user.pointEvents.push({ 
                  time: tempoReferencia, 
                  delta: -penalidade, 
                  label: '⚠️ Ociosidade Atual', 
                  detalhe: `Parado até o corte (${Math.floor(ociosidadeAtualMs / 60000)} min de intervalo).`, 
                  sourceType: 'calculado' 
                });
             }
          }
       }

       user.eventosMesclados = merged;
       if (user.pontos < 0) user.pontos = 0;
       
       // 5. Ajustes ADM (Busca flexível)
       if (ajustesDoDia) {
         const ajustesDesteUsuario = ajustesDoDia.filter(a => 
           a.usuarioUid === user.uid ||
           a.usuarioNome === user.nome ||
           a.usuarioNome === user.email ||
           (user.email && a.usuarioNome === user.email.split('@')[0])
         );

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