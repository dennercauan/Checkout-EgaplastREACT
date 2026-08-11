import React from 'react';
import { Trophy, Medal, CheckCircle2, Factory, TrendingUp, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function RankingDiario({
  rankingCalculado,
  rankingExpandido,
  setRankingExpandido,
  currentTime,
  dataOperacaoAtiva
}) {

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

 // ==========================================
  // NOVO: PONTOS PERSONALIZADOS DO GRÁFICO (Bolinha + Texto)
  // ==========================================
  const CustomLabelDot = (props) => {
    const { cx, cy, payload } = props;
    
    if (!payload || payload.delta === 0 || payload.delta === undefined) {
       // Adicionado pointerEvents: 'none'
       return <circle cx={cx} cy={cy} r={2} fill="#38bdf8" opacity={0.5} style={{ pointerEvents: 'none' }} />;
    }

    const isNegative = payload.delta < 0;
    
    return (
      // A MÁGICA AQUI: pointerEvents: 'none' faz o mouse "atravessar" os números e acionar o Tooltip!
      <g style={{ pointerEvents: 'none' }}>
        <circle cx={cx} cy={cy} r={4} fill={isNegative ? '#ef4444' : '#10b981'} stroke="#fff" strokeWidth={2} />
        
        <text x={cx} y={isNegative ? cy + 20 : cy - 12} fill="#fff" fontSize={11} fontWeight="900" textAnchor="middle" stroke="#fff" strokeWidth={4} strokeLinejoin="round">
          {isNegative ? payload.delta : `+${payload.delta}`}
        </text>
        
        <text x={cx} y={isNegative ? cy + 20 : cy - 12} fill={isNegative ? '#ef4444' : '#10b981'} fontSize={11} fontWeight="900" textAnchor="middle">
          {isNegative ? payload.delta : `+${payload.delta}`}
        </text>
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

    const DEZ_MINUTOS = 10 * 60 * 1000;
    const segments = [];
    let lastEnd = minTime;

    user.eventosMesclados.forEach(ev => {
      const gap = ev.start - lastEnd;
      if (gap > 0) segments.push({ type: gap > DEZ_MINUTOS ? 'idle' : 'gap', ms: gap });
      const active = ev.end - ev.start;
      if (active >= 0) segments.push({ type: 'active', ms: active });
      lastEnd = ev.end;
    });

    const finalGap = maxTime - lastEnd;
    if (finalGap > 0) segments.push({ type: (finalGap > DEZ_MINUTOS && isHoje) ? 'idle' : 'gap', ms: finalGap });

    return (
      <div style={{ marginTop: '15px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14}/> Mapa de Atividade
          </span>
          <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><div style={{width: '8px', height: '8px', background: '#10b981', borderRadius: '2px'}}></div> Trabalhando</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><div style={{width: '8px', height: '8px', background: '#e2e8f0', borderRadius: '2px'}}></div> Tolerância</span>
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

  return (
    <div className="op-ranking-container">
      <div className="ranking-header">
        <h3><Trophy size={20} color="#eab308" style={{marginRight: '8px'}}/> Ranking Diário - Produtividade</h3>
        <span className="ranking-subtitle">Top Conferentes do Dia</span>
      </div>
      <div className="ranking-list">
        {rankingCalculado.map((user, idx) => (
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
                
                {user.chartData && user.chartData.length > 0 && (
                  <div style={{ marginTop: '15px', borderTop: '1px dashed #cbd5e1', paddingTop: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontWeight: 'bold', color: '#475569' }}>
                      <TrendingUp size={16} color="#3b82f6" /> Gráfico de Evolução Diária
                    </div>
                    
                    <div style={{ width: '100%', height: '180px', marginLeft: '-15px' }}>
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
                            dataKey="timestamp" 
                            type="number" 
                            scale="time" 
                            domain={['dataMin', 'dataMax']} 
                            tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            tick={{ fontSize: 10, fill: '#94a3b8' }} 
                            axisLine={false} 
                            tickLine={false} 
                            minTickGap={20} 
                          />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                          <RechartsTooltip content={<EvolucaoTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} />
                          {/* INJEÇÃO DO NOVO COMPONENTE NA PROPRIEDADE DOT */}
                          <Area 
                            type="linear" 
                            dataKey="score" 
                            stroke="#0284c7" 
                            strokeWidth={2} 
                            fillOpacity={1} 
                            fill={`url(#colorEvolucao_${user.uid})`}
                            dot={<CustomLabelDot />}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#0ea5e9' }}
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
  );
}