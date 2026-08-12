import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Medal, CheckCircle2, Factory, TrendingUp, Clock, Maximize2, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function RankingDiario({
  rankingCalculado,
  rankingExpandido,
  setRankingExpandido,
  currentTime,
  dataOperacaoAtiva,
  onDeleteEvent, // <-- NOVO
  isAdminMode    // <-- NOVO
}) {
  const [modalUser, setModalUser] = useState(null);
  const [eventoSelecionado, setEventoSelecionado] = useState(null); // <-- O NOVO MODAL DE CLIQUE

  const formatTime = (ms) => {
    if (!ms) return '';
    return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const EvolucaoTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: '#1e293b', color: '#fff', padding: '12px 15px', borderRadius: '8px', boxShadow: '0 10px 20px rgba(0,0,0,0.4)', border: '1px solid #334155', minWidth: '260px', zIndex: 1000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 'bold' }}><Clock size={12} style={{display: 'inline', marginRight: '4px'}}/>{data.timeStr}</span>
            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#38bdf8' }}>{data.score} pts</span>
          </div>
          {data.isEvent && (
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '6px', border: '1px solid #475569' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '6px' }}>{data.label}</div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                <span style={{ lineHeight: '1.4' }}>{data.detalhe}</span>
                {data.delta !== 0 && (
                  <span style={{ fontWeight: '900', color: data.delta > 0 ? '#10b981' : '#ef4444', background: data.delta > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                    {data.delta > 0 ? `+${data.delta}` : data.delta}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLabelDot = (props) => {
    const { cx, cy, payload, isAdminMode, isActive } = props;

    // Se for um evento, ele se torna clicável para podermos ver os detalhes
    const isClickable = isAdminMode && payload && payload.isEvent;
    const radius = isActive ? 8 : (isClickable ? 6 : 4);

    return (
      <g 
        onClick={(e) => {
          if (isClickable) {
            e.stopPropagation();
            setEventoSelecionado(payload); // Abre o modal bonito com os dados da bolinha!
          }
        }}
        style={{ cursor: isClickable ? 'pointer' : 'default', pointerEvents: 'all' }}
      >
        <circle cx={cx} cy={cy} r={radius} fill={isClickable ? "#f59e0b" : "#0ea5e9"} stroke="#fff" strokeWidth={isActive ? 2 : 1} />
      </g>
    );
  };

  const renderTimeline = (user) => {
    if (!user.eventosMesclados || user.eventosMesclados.length === 0) return null;

    const today = new Date();
    const dataHojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isHoje = dataOperacaoAtiva === dataHojeStr;

    const minTime = user.eventosMesclados[0].start;
    let maxTime = user.eventosMesclados[user.eventosMesclados.length - 1].end;

    if (isHoje && currentTime > maxTime) maxTime = currentTime;

    const totalMs = maxTime - minTime;
    if (totalMs <= 0) return null;

    // ATUALIZADO: A barra visual agora usa 20 minutos de tolerância
    const LIMITE_OCIOSIDADE_MS = 20 * 60 * 1000; 
    const segments = [];
    let lastEnd = minTime;

    user.eventosMesclados.forEach(ev => {
      const gap = ev.start - lastEnd;
      if (gap > 0) segments.push({ type: gap > LIMITE_OCIOSIDADE_MS ? 'idle' : 'gap', ms: gap });
      const active = ev.end - ev.start;
      if (active >= 0) segments.push({ type: 'active', ms: active });
      lastEnd = ev.end;
    });

    const finalGap = maxTime - lastEnd;
    if (finalGap > 0) segments.push({ type: (finalGap > LIMITE_OCIOSIDADE_MS && isHoje) ? 'idle' : 'gap', ms: finalGap });

    return (
      <div style={{ marginTop: '15px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14}/> Mapa de Atividade
          </span>
          <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><div style={{width: '8px', height: '8px', background: '#10b981', borderRadius: '2px'}}></div> Trabalhando</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><div style={{width: '8px', height: '8px', background: '#e2e8f0', borderRadius: '2px'}}></div> Tolerância (20m)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><div style={{width: '8px', height: '8px', background: '#ef4444', borderRadius: '2px'}}></div> Ocioso (Multa)</span>
          </div>
        </div>

        <div style={{ display: 'flex', width: '100%', height: '16px', borderRadius: '6px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          {segments.map((seg, i) => {
            const pct = (seg.ms / totalMs) * 100;
            let bg = '#e2e8f0';
            let title = `Pausa permitida: ${Math.floor(seg.ms/60000)} min`;
            if (seg.type === 'active') { bg = '#10b981'; title = `Atividade contínua: ${Math.floor(seg.ms/60000)} min`; } 
            else if (seg.type === 'idle') { bg = '#ef4444'; title = `Ociosidade: ${Math.floor(seg.ms/60000)} min totais (Gerou Multa!)`; }
            return (
              <div key={i} style={{ width: `${pct}%`, background: bg, minWidth: (seg.type === 'active' && pct < 1) ? '2px' : '0', transition: 'background 0.2s' }} title={title}></div>
            )
          })}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>
          <span>{formatTime(minTime)}</span>
          <span>{formatTime(maxTime)}</span>
        </div>
      </div>
    );
  };

  // LÓGICA DE ESPAÇAMENTO VISUAL PARA O GRÁFICO
  const dadosGraficoEspacados = useMemo(() => {
    if (!modalUser || !modalUser.chartData) return [];
    
    // Clona os dados para não mexer no banco real e garante a ordem
    const dados = JSON.parse(JSON.stringify(modalUser.chartData)).sort((a, b) => a.timestamp - b.timestamp);
    
    // Define um distanciamento visual mínimo de 3 minutos (180.000 ms)
    const DISTANCIA_MINIMA = 3 * 60 * 1000; 
    
    for (let i = 1; i < dados.length; i++) {
      const diferenca = dados[i].timestamp - dados[i-1].timestamp;
      if (diferenca < DISTANCIA_MINIMA) {
        // Empurra a bolinha no eixo X apenas visualmente
        dados[i].timestamp = dados[i-1].timestamp + DISTANCIA_MINIMA;
      }
    }
    
    return dados;
  }, [modalUser]);

  return (
    <>
      <div className="op-ranking-container">
        <div className="ranking-header">
          <h3><Trophy size={20} color="#eab308" style={{marginRight: '8px'}}/> Ranking Diário - Produtividade</h3>
          <span className="ranking-subtitle">Top Conferentes do Dia</span>
        </div>
        <div className="ranking-list">
          {rankingCalculado?.filter(user => user && user.uid).map((user, idx) => (
            <div key={`${user.uid}-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              <div 
                className={`ranking-item ${idx === 0 ? 'first-place' : ''}`}
                onClick={() => setRankingExpandido(rankingExpandido === user.uid ? null : user.uid)}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <div className="ranking-pos">{idx === 0 ? <Medal size={24} color="#eab308" /> : idx === 1 ? <Medal size={20} color="#94a3b8" /> : idx === 2 ? <Medal size={20} color="#b45309" /> : <span className="pos-number">{user.posicao}º</span>}</div>
                <div className="ranking-avatar"><div className="avatar-circle">{user.nome.charAt(0)}</div></div>
                <div className="ranking-info">
                  <strong className="ranking-name">{user.nome}</strong>
                  <div className="ranking-metrics">
                    <span><CheckCircle2 size={12}/> {user.skus} SKUs</span>
                    <span><Factory size={12}/> {user.op} O.P.s</span>
                  </div>
                </div>
                <div className="ranking-score">
                  <div className="score-value">{user.pontos.toLocaleString()} pts</div>
                  <div className="score-bar"><div className="score-fill" style={{width: `${(user.pontos / (rankingCalculado[0]?.pontos || 1)) * 100}%`}}></div></div>
                </div>
              </div>
              
              {rankingExpandido === user.uid && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px 12px 10px 12px', fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '35px', marginRight: '10px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📦 SKUs (Max 300 pts/cx):</span> 
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                       <strong>{user.pontosSku} pts</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🚀 Bônus (Pedidos):</span> 
                    <strong style={{ color: '#10b981' }}>+{user.bonusPedidos} pts</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🏭 O.P.s ({user.op}):</span> 
                    <strong style={{ color: '#3b82f6' }}>+{user.op * 50} pts</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>⏱️ Penalidade (Ociosidade):</span> 
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                       <strong style={{ color: '#ef4444' }}>-{user.decrescimo} pts</strong>
                       {user.decrescimo > 0 && <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{user.decrescimo / 10} min em atraso</span>}
                    </div>
                  </div>
                  
                  {renderTimeline(user)}
                  
                  {/* MINI-MAPA DE EVOLUÇÃO (Com botão de expandir) */}
                  {user.chartData && user.chartData.length > 0 && (
                    <div style={{ marginTop: '15px', borderTop: '1px dashed #cbd5e1', paddingTop: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#475569' }}>
                          <TrendingUp size={16} color="#3b82f6" /> Gráfico de Evolução Diária
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setModalUser(user); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                          title="Ampliar gráfico"
                        >
                          <Maximize2 size={12} /> Ampliar
                        </button>
                      </div>
                      
                      <div 
                        style={{ width: '100%', height: '180px', marginLeft: '-15px', cursor: 'zoom-in' }}
                        // ADICIONADO e.stopPropagation() para não fechar a sanfona!
                        onClick={(e) => { e.stopPropagation(); setModalUser(user); }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={user.chartData} margin={{ top: 25, right: 15, left: 0, bottom: 25 }}>
                            <defs>
                              <linearGradient id={`colorEvolucao_${user.uid}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} 
                              tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={20} 
                            />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                            
                            {/* ADICIONADO wrapperStyle={{ pointerEvents: 'none' }} PARA DEIXAR CLICAR NA BOLINHA */}
                            <RechartsTooltip content={<EvolucaoTooltip />} wrapperStyle={{ pointerEvents: 'none' }} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} />
                            
                            <Area 
                              type="linear" dataKey="score" stroke="#0284c7" strokeWidth={2} fillOpacity={1} 
                              fill={`url(#colorEvolucao_${user.uid})`} 
                              dot={(props) => <CustomLabelDot {...props} onDeleteEvent={onDeleteEvent} isAdminMode={isAdminMode} />}
                              activeDot={(props) => <CustomLabelDot {...props} onDeleteEvent={onDeleteEvent} isAdminMode={isAdminMode} isActive={true} />}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

     {/* 1. MODAL DE GRÁFICO EXPANDIDO (Forçado em Tela Cheia) */}
      {modalUser && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9998, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }} 
          onClick={() => setModalUser(null)}
        >
          <div 
            style={{ background: '#fff', width: '100%', maxWidth: '1200px', borderRadius: '12px', padding: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Evolução de {modalUser.nome}</h3>
              <button onClick={() => setModalUser(null)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}>X</button>
            </div>
            
            <div style={{ width: '100%', height: '400px' }}>
  <ResponsiveContainer width="100%" height="100%">
    {/* 👇 O gráfico agora consome os dados com espaçamento visual 👇 */}
    <AreaChart data={dadosGraficoEspacados} margin={{ top: 30, right: 30, left: 10, bottom: 20 }}>
      <defs>
        <linearGradient id={`colorEvolucaoModal_${modalUser.uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5}/>
          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#e2e8f0" opacity={0.5} />
      <XAxis 
        dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} 
        tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        tick={{ fontSize: 12, fill: '#64748b', fontWeight: '500' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} minTickGap={40} 
      />
      <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: '500' }} axisLine={false} tickLine={false} width={50} />
      <RechartsTooltip content={<EvolucaoTooltip />} wrapperStyle={{ pointerEvents: 'none' }} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} />
      <Area 
        type="linear" dataKey="score" stroke="#0284c7" strokeWidth={3} fillOpacity={1} 
        fill={`url(#colorEvolucaoModal_${modalUser.uid})`}
        dot={(props) => <CustomLabelDot {...props} isAdminMode={isAdminMode} />}
        activeDot={(props) => <CustomLabelDot {...props} isAdminMode={isAdminMode} isActive={true} />}
      />
    </AreaChart>
  </ResponsiveContainer>
</div>
          </div>
        </div>
      )}

      {/* 2. NOVO MODAL: INFORMAÇÕES DO EVENTO (Clique na Bolinha) */}
      {eventoSelecionado && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} 
          onClick={() => setEventoSelecionado(null)}
        >
          <div 
            style={{ background: '#fff', width: '90%', maxWidth: '400px', borderRadius: '12px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 15px 0', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Detalhes do Lançamento</h3>
            
            <div style={{ marginBottom: '20px', color: '#475569', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0 }}><strong>Horário:</strong> {eventoSelecionado.timeStr}</p>
              <p style={{ margin: 0 }}><strong>Ação:</strong> {eventoSelecionado.label}</p>
              <p style={{ margin: 0 }}><strong>Motivo/Detalhe:</strong> {eventoSelecionado.detalhe}</p>
              <p style={{ margin: 0 }}>
                <strong>Impacto:</strong> <span style={{ color: eventoSelecionado.delta > 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{eventoSelecionado.delta > 0 ? `+${eventoSelecionado.delta}` : eventoSelecionado.delta} pts</span>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setEventoSelecionado(null)} 
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontWeight: '600' }}
              >
                Voltar
              </button>
              <button 
                onClick={() => {
                  // A Trava de Segurança que te avisa do problema
                  if (!eventoSelecionado.sourceId || !eventoSelecionado.sourceType) {
                     alert("ERRO DE DADOS: O script que gerou o ranking esqueceu de salvar o 'sourceId' e 'sourceType' dentro desta bolinha. Sem eles, o botão não sabe qual documento apagar no Firebase!");
                  } else {
                     onDeleteEvent(eventoSelecionado);
                     setEventoSelecionado(null);
                  }
                }} 
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
              >
                Excluir Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}