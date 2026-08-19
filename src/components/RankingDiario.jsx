// src/components/RankingDiario.jsx
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Medal, CheckCircle2, Factory, TrendingUp, Clock, Maximize2, X, User } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function RankingDiario({
  rankingCalculado,
  rankingExpandido,
  setRankingExpandido,
  currentTime,
  dataOperacaoAtiva,
  onDeleteEvent,
  isAdminMode,
  usuarios = []
}) {
  const [modalUser, setModalUser] = useState(null);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [hoveredAvatarKey, setHoveredAvatarKey] = useState(null);

  const formatTime = (ms) => {
    if (!ms) return '';
    return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const EvolucaoTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: '#0f172a', color: 'var(--text-main, #fff)', padding: '12px 15px', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.45)', border: '1px solid var(--border-color, #334155)', minWidth: '260px', zIndex: 1000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 'bold' }}><Clock size={12} style={{display: 'inline', marginRight: '4px'}}/>{data.timeStr}</span>
            <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-highlight, #38bdf8)' }}>{data.score} pts</span>
          </div>
          {data.isEvent && (
            <div style={{ background: 'var(--bg-input, rgba(0,0,0,0.2))', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--text-main, #f8fafc)', marginBottom: '6px' }}>{data.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #cbd5e1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                <span style={{ lineHeight: '1.4' }}>{data.detalhe}</span>
                {data.delta !== 0 && (
                  <span style={{ fontWeight: '900', color: data.delta > 0 ? '#10b981' : '#ef4444', background: data.delta > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
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
    const isClickable = isAdminMode && payload && payload.isEvent;
    const radius = isActive ? 8 : (isClickable ? 6 : 4);

    return (
      <g 
        onClick={(e) => {
          if (isClickable) {
            e.stopPropagation();
            setEventoSelecionado(payload);
          }
        }}
        style={{ cursor: isClickable ? 'pointer' : 'default', pointerEvents: 'all' }}
      >
        <circle cx={cx} cy={cy} r={radius} fill={isClickable ? "#f59e0b" : "var(--text-highlight, #0ea5e9)"} stroke="var(--bg-card, #fff)" strokeWidth={isActive ? 2 : 1} />
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
      <div style={{ marginTop: '15px', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} color="var(--text-muted)" /> Mapa de Atividade
          </span>
          <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width: '8px', height: '8px', background: '#10b981', borderRadius: '2px'}}></div> Trabalhando</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width: '8px', height: '8px', background: 'var(--border-color)', borderRadius: '2px'}}></div> Tolerância (20m)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width: '8px', height: '8px', background: '#ef4444', borderRadius: '2px'}}></div> Ocioso (Multa)</span>
          </div>
        </div>

        <div style={{ display: 'flex', width: '100%', height: '16px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
          {segments.map((seg, i) => {
            const pct = (seg.ms / totalMs) * 100;
            let bg = 'var(--border-color)';
            let title = `Pausa permitida: ${Math.floor(seg.ms/60000)} min`;
            if (seg.type === 'active') { bg = '#10b981'; title = `Atividade contínua: ${Math.floor(seg.ms/60000)} min`; } 
            else if (seg.type === 'idle') { bg = '#ef4444'; title = `Ociosidade: ${Math.floor(seg.ms/60000)} min totais (Gerou Multa!)`; }
            return (
              <div key={i} style={{ width: `${pct}%`, background: bg, minWidth: (seg.type === 'active' && pct < 1) ? '2px' : '0', transition: 'background 0.2s' }} title={title}></div>
            )
          })}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
          <span>{formatTime(minTime)}</span>
          <span>{formatTime(maxTime)}</span>
        </div>
      </div>
    );
  };

  const dadosGraficoEspacados = useMemo(() => {
    if (!modalUser || !modalUser.chartData) return [];
    const dados = JSON.parse(JSON.stringify(modalUser.chartData)).sort((a, b) => a.timestamp - b.timestamp);
    const DISTANCIA_MINIMA = 3 * 60 * 1000; 
    
    for (let i = 1; i < dados.length; i++) {
      const diferenca = dados[i].timestamp - dados[i-1].timestamp;
      if (diferenca < DISTANCIA_MINIMA) {
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
          {rankingCalculado?.filter(user => user && (user.uid || user.email || user.nome)).map((user, idx) => {
            const userKey = `${user.uid || user.email || idx}-${idx}`;
            const abreParaCima = idx >= 3;
            const isHovered = hoveredAvatarKey === userKey;

            const emailLimpo = String(user.email || '').toLowerCase().trim();
            const nomeLimpo = String(user.nome || '').toLowerCase().trim();
            
            const userRef = (usuarios || []).find(u => {
              const uEmail = String(u.email || '').toLowerCase().trim();
              const uPrefix = uEmail.split('@')[0];
              const uNome = String(u.nickname || '').toLowerCase().trim();

              return (
                (user.uid && u.uid === user.uid) ||
                (emailLimpo && uEmail === emailLimpo) ||
                (nomeLimpo && uEmail === nomeLimpo) ||
                (nomeLimpo && uPrefix === nomeLimpo) ||
                (nomeLimpo && uNome === nomeLimpo)
              );
            });

            const fotoFinal = user.photoURL || userRef?.photoURL || userRef?.foto;

            return (
              <div 
                key={userKey} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  position: 'relative',
                  zIndex: isHovered ? 9999 : (rankingCalculado.length - idx) // Eleva a linha inteira acima de todas as outras
                }}
              >
                <div 
                  className={`ranking-item ${idx === 0 ? 'first-place' : ''}`}
                  onClick={() => setRankingExpandido(rankingExpandido === user.uid ? null : user.uid)}
                  style={{ cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                >
                  <div className="ranking-pos">
                    {idx === 0 ? <Medal size={24} color="#eab308" /> : idx === 1 ? <Medal size={20} color="#94a3b8" /> : idx === 2 ? <Medal size={20} color="#b45309" /> : <span className="pos-number">{user.posicao}º</span>}
                  </div>
                  
                  {/* AVATAR COM FOTO / FALLBACK E PREVIEW EXPANDIDO */}
                  <div 
                    className="ranking-avatar" 
                    style={{ width: '38px', height: '38px', position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      setHoveredAvatarKey(userKey);
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      setHoveredAvatarKey(null);
                    }}
                  >
                    {fotoFinal ? (
                      <img 
                        src={fotoFinal} 
                        alt={user.nome || 'Avatar'} 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextSibling) {
                            e.currentTarget.nextSibling.style.display = 'flex';
                          }
                        }}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          borderRadius: '50%', 
                          objectFit: 'cover', 
                          border: `2px solid ${idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'var(--border-color, rgba(255,255,255,0.15))'}`,
                          display: 'block'
                        }} 
                      />
                    ) : (
                      <div 
                        className="avatar-circle" 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          borderRadius: '50%', 
                          display: 'flex',
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 800 
                        }}
                      >
                        {user.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}

                    {/* CARD FLUTUANTE 100% OPACO E SOBREPOSTO */}
                    {isHovered && fotoFinal && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: abreParaCima ? 'auto' : 'calc(100% + 10px)',
                          bottom: abreParaCima ? 'calc(100% + 10px)' : 'auto',
                          left: 0,
                          zIndex: 999999,
                          backgroundColor: '#0f172a', // Fundo 100% sólido sem transparência
                          padding: '8px',
                          borderRadius: '16px',
                          border: '2px solid #334155',
                          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.15)',
                          animation: abreParaCima 
                            ? 'popInAvatarUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards' 
                            : 'popInAvatar 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                          pointerEvents: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <img 
                          src={fotoFinal} 
                          alt="Perfil Expandido" 
                          style={{ 
                            width: '180px', 
                            height: '180px', 
                            borderRadius: '12px', 
                            objectFit: 'cover',
                            display: 'block',
                            backgroundColor: '#020617'
                          }} 
                        />
                        <span style={{ 
                          fontSize: '0.82rem', 
                          fontWeight: 800, 
                          color: '#ffffff', 
                          letterSpacing: '-0.2px',
                          textAlign: 'center',
                          maxWidth: '170px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {user.nome}
                        </span>
                      </div>
                    )}
                  </div>

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
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 14px 12px 14px', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '35px', marginRight: '10px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>📦 SKUs (Max 300 pts/cx):</span> 
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <strong>{user.pontosSku || 0} pts</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>🚀 Bônus (Pedidos):</span> 
                      <strong style={{ color: '#10b981' }}>+{user.bonusPedidos || 0} pts</strong>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>🏭 O.P.s ({user.op}):</span> 
                      <strong style={{ color: 'var(--text-highlight, #38bdf8)' }}>+{user.op * 50} pts</strong>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-main)' }}>⏱️ Penalidade (Ociosidade):</span> 
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <strong style={{ color: '#ef4444' }}>-{user.decrescimo} pts</strong>
                        {user.decrescimo > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.decrescimo / 10} min em atraso</span>}
                      </div>
                    </div>
                    
                    {renderTimeline(user)}
                    
                    {user.chartData && user.chartData.length > 0 && (
                      <div style={{ marginTop: '15px', borderTop: '1px dashed var(--border-color)', paddingTop: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            <TrendingUp size={16} color="var(--text-highlight, #38bdf8)" /> Gráfico de Evolução Diária
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setModalUser(user); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', color: 'var(--text-highlight, #38bdf8)', border: '1px solid var(--border-color)', padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer' }}
                            title="Ampliar gráfico"
                          >
                            <Maximize2 size={12} /> Ampliar
                          </button>
                        </div>
                        
                        <div 
                          style={{ width: '100%', height: '180px', marginLeft: '-15px', cursor: 'zoom-in' }}
                          onClick={(e) => { e.stopPropagation(); setModalUser(user); }}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={user.chartData} margin={{ top: 25, right: 15, left: 0, bottom: 25 }}>
                              <defs>
                                <linearGradient id={`colorEvolucao_${user.uid}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--text-highlight, #38bdf8)" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="var(--text-highlight, #38bdf8)" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.6} />
                              <XAxis 
                                dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} 
                                tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} minTickGap={20} 
                              />
                              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40} />
                              <RechartsTooltip content={<EvolucaoTooltip />} wrapperStyle={{ pointerEvents: 'none' }} cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                              
                              <Area 
                                type="linear" dataKey="score" stroke="var(--text-highlight, #0284c7)" strokeWidth={2} fillOpacity={1} 
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
            );
          })}
        </div>
      </div>

      {/* MODAL DE GRÁFICO EXPANDIDO COM PORTAL */}
      {modalUser && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            backgroundColor: 'rgba(5, 10, 20, 0.82)', 
            zIndex: 999999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '20px',
            boxSizing: 'border-box',
            backdropFilter: 'blur(8px)', 
            WebkitBackdropFilter: 'blur(8px)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }} 
          onClick={() => setModalUser(null)}
        >
          <div 
            style={{ 
              background: 'var(--bg-card, #1e293b)', 
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', 
              color: 'var(--text-main, #f8fafc)', 
              width: '100%', 
              maxWidth: '1100px', 
              borderRadius: '20px', 
              padding: '26px', 
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <TrendingUp size={22} color="var(--text-highlight, #38bdf8)" />
                <h3 style={{ margin: 0, color: 'var(--text-main, #f8fafc)', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.3px' }}>
                  Evolução de {modalUser.nome}
                </h3>
              </div>
              <button 
                onClick={() => setModalUser(null)} 
                style={{ 
                  background: 'var(--bg-input, rgba(255, 255, 255, 0.05))', 
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', 
                  width: '34px', 
                  height: '34px', 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  color: 'var(--text-muted, #94a3b8)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted, #94a3b8)'}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ width: '100%', height: '420px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosGraficoEspacados} margin={{ top: 30, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id={`colorEvolucaoModal_${modalUser.uid}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--text-highlight, #38bdf8)" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="var(--text-highlight, #38bdf8)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="var(--border-color)" opacity={0.5} />
                  <XAxis 
                    dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} 
                    tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    tick={{ fontSize: 12, fill: 'var(--text-muted)', fontWeight: '500' }} axisLine={{ stroke: 'var(--border-color)' }} tickLine={false} minTickGap={40} 
                  />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)', fontWeight: '500' }} axisLine={false} tickLine={false} width={50} />
                  <RechartsTooltip content={<EvolucaoTooltip />} wrapperStyle={{ pointerEvents: 'none' }} cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Area 
                    type="linear" dataKey="score" stroke="var(--text-highlight, #0284c7)" strokeWidth={3} fillOpacity={1} 
                    fill={`url(#colorEvolucaoModal_${modalUser.uid})`}
                    dot={(props) => <CustomLabelDot {...props} isAdminMode={isAdminMode} />}
                    activeDot={(props) => <CustomLabelDot {...props} isAdminMode={isAdminMode} isActive={true} />}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE INFORMAÇÕES DO EVENTO COM PORTAL */}
      {eventoSelecionado && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            backgroundColor: 'rgba(5, 10, 20, 0.82)', 
            zIndex: 9999999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '20px',
            boxSizing: 'border-box',
            backdropFilter: 'blur(8px)', 
            WebkitBackdropFilter: 'blur(8px)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }} 
          onClick={() => setEventoSelecionado(null)}
        >
          <div 
            style={{ 
              background: 'var(--bg-card, #1e293b)', 
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', 
              color: 'var(--text-main, #f8fafc)', 
              width: '100%', 
              maxWidth: '430px', 
              borderRadius: '16px', 
              padding: '24px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              boxSizing: 'border-box'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-main, #f8fafc)', borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', paddingBottom: '12px', fontWeight: 800, fontSize: '1.2rem' }}>
              Detalhes do Lançamento
            </h3>
            
            <div style={{ marginBottom: '22px', color: 'var(--text-main, #f8fafc)', fontSize: '0.92rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Horário:</span> <strong>{eventoSelecionado.timeStr}</strong>
              </p>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ação:</span> <strong>{eventoSelecionado.label}</strong>
              </p>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Motivo/Detalhe:</span> <strong>{eventoSelecionado.detalhe}</strong>
              </p>
              <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Impacto:</span> 
                <span style={{ color: eventoSelecionado.delta > 0 ? '#10b981' : (eventoSelecionado.delta < 0 ? '#ef4444' : 'var(--text-muted)'), fontWeight: '900', background: eventoSelecionado.delta > 0 ? 'rgba(16, 185, 129, 0.15)' : (eventoSelecionado.delta < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)'), padding: '2px 8px', borderRadius: '6px' }}>
                  {eventoSelecionado.delta > 0 ? `+${eventoSelecionado.delta}` : eventoSelecionado.delta} pts
                </span>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setEventoSelecionado(null)} 
                style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}
              >
                {eventoSelecionado.sourceId ? 'Voltar' : 'Fechar'}
              </button>

              {/* Só exibe exclusão se for um documento real (OP, Bônus, etc.) */}
              {isAdminMode && eventoSelecionado.sourceId && (
                <button 
                  onClick={() => {
                    onDeleteEvent(eventoSelecionado);
                    setEventoSelecionado(null);
                  }} 
                  style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)' }}
                >
                  Excluir Registro
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>
        {`
          @keyframes popInAvatar { 
            0% { opacity: 0; transform: scale(0.85) translateY(-8px); } 
            100% { opacity: 1; transform: scale(1) translateY(0); } 
          }
          @keyframes popInAvatarUp { 
            0% { opacity: 0; transform: scale(0.85) translateY(8px); } 
            100% { opacity: 1; transform: scale(1) translateY(0); } 
          }
        `}
      </style>
    </>
  );
}