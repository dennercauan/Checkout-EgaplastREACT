// src/components/ModalRankingDetalhado.jsx
import React, { useState, useMemo } from 'react';
import { 
  X, Award, Trophy, Medal, Package, 
  Factory, Layers, User 
} from 'lucide-react';

const DATA_INICIO_OFICIAL = '2026-08-19';

export default function ModalRankingDetalhado({ showModal, setShowModal, rankingData, periodoInicio, periodoFim }) {
  const [isClosing, setIsClosing] = useState(false);
  const [hoveredUserUid, setHoveredUserUid] = useState(null);

  const formatarData = (dataStr) => {
    if (!dataStr) return '';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Trava a data de início para nunca ser anterior a 19/08/2026
  const dataInicioValida = useMemo(() => {
    if (!periodoInicio || periodoInicio < DATA_INICIO_OFICIAL) {
      return DATA_INICIO_OFICIAL;
    }
    return periodoInicio;
  }, [periodoInicio]);

  const periodoTexto = useMemo(() => {
    const fim = periodoFim || dataInicioValida;
    return `${formatarData(dataInicioValida)} até ${formatarData(fim)}`;
  }, [dataInicioValida, periodoFim]);

  const maxPontos = useMemo(() => {
    if (!rankingData || rankingData.length === 0) return 1;
    const top = Math.max(...rankingData.map(u => Number(u.pontos || 0)));
    return top > 0 ? top : 1;
  }, [rankingData]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
      setHoveredUserUid(null);
    }, 350);
  };

  if (!showModal && !isClosing) return null;

  const getBadgeRank = (index) => {
    if (index === 0) {
      return {
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.4)',
        icon: <Trophy size={18} color="#f59e0b" />,
        label: '1º Lugar',
        barColor: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
        rowBg: 'rgba(245, 158, 11, 0.08)',
        rowBorder: 'rgba(245, 158, 11, 0.3)'
      };
    }
    if (index === 1) {
      return {
        bg: 'rgba(148, 163, 184, 0.15)',
        color: 'var(--text-main)',
        border: 'var(--border-color)',
        icon: <Medal size={18} color="#94a3b8" />,
        label: '2º Lugar',
        barColor: 'linear-gradient(90deg, #64748b, #94a3b8)',
        rowBg: 'var(--bg-main)',
        rowBorder: 'var(--border-color)'
      };
    }
    if (index === 2) {
      return {
        bg: 'rgba(234, 88, 12, 0.15)',
        color: '#ea580c',
        border: 'rgba(234, 88, 12, 0.4)',
        icon: <Medal size={18} color="#ea580c" />,
        label: '3º Lugar',
        barColor: 'linear-gradient(90deg, #ea580c, #fb923c)',
        rowBg: 'var(--bg-main)',
        rowBorder: 'var(--border-color)'
      };
    }
    return {
      bg: 'var(--bg-card)',
      color: 'var(--text-muted)',
      border: 'var(--border-color)',
      icon: null,
      label: `${index + 1}º`,
      barColor: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
      rowBg: 'var(--bg-main)',
      rowBorder: 'var(--border-color)'
    };
  };

  return (
    <div 
      className={`modal-overlay ${isClosing ? 'modal-closing' : ''}`}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}
      onClick={handleClose}
    >
      <div 
        className="modal-container-window"
        style={{
          width: '92vw', maxWidth: '1080px', maxHeight: '88vh',
          background: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '20px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          border: '1px solid var(--border-color)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '22px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <Award size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: '900' }}>
                Classificação Geral da Equipe
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Período consolidado: <strong style={{ color: 'var(--text-main)' }}>{periodoTexto}</strong>
              </p>
            </div>
          </div>

          <button 
            onClick={handleClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: 'color 0.2s', display: 'flex' }}
          >
            <X size={26}/>
          </button>
        </div>

        <div style={{ flex: 1, padding: '30px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)' }}>
          {(!rankingData || rankingData.length === 0) ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Award size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>Nenhum dado registrado para o período.</p>
            </div>
          ) : (
            rankingData.map((userItem, index) => {
              const conf = getBadgeRank(index);
              const pontosNum = Number(userItem.pontos || 0);
              const porcentagemLargura = Math.max(8, (pontosNum / maxPontos) * 100);
              const userNome = userItem.nome || 'Conferente';
              const userFoto = userItem.photoURL || userItem.foto;
              const userIdKey = userItem.uid || userItem.email || userNome || String(index);
              const abreParaCima = index >= 2;

              return (
                <div 
                  key={userIdKey}
                  style={{
                    background: conf.rowBg,
                    border: `1px solid ${conf.rowBorder}`,
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: index === 0 ? '0 4px 15px rgba(245, 158, 11, 0.15)' : '0 2px 5px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div 
                        style={{
                          background: conf.bg,
                          color: conf.color,
                          border: `1px solid ${conf.border}`,
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '900',
                          fontSize: '1rem',
                          flexShrink: 0
                        }}
                      >
                        {conf.icon || `${index + 1}º`}
                      </div>

                      <div 
                        style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                        onMouseEnter={() => setHoveredUserUid(userIdKey)}
                        onMouseLeave={() => setHoveredUserUid(null)}
                      >
                        {userFoto ? (
                          <img 
                            src={userFoto} 
                            alt={userNome}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: index === 0 ? '2px solid #f59e0b' : '2px solid var(--border-color)',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                              display: 'block',
                              cursor: 'pointer'
                            }} 
                          />
                        ) : (
                          <div 
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: index === 0 ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-main)',
                              color: index === 0 ? '#f59e0b' : 'var(--text-main)',
                              border: index === 0 ? '2px solid #f59e0b' : '2px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '1.1rem',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                            }}
                          >
                            {userNome.charAt(0).toUpperCase() || <User size={20} />}
                          </div>
                        )}

                        {hoveredUserUid === userIdKey && userFoto && (
                          <div 
                            style={{
                              position: 'absolute',
                              top: abreParaCima ? 'auto' : 'calc(100% + 10px)',
                              bottom: abreParaCima ? 'calc(100% + 10px)' : 'auto',
                              left: 0,
                              zIndex: 99999,
                              background: 'var(--bg-card, #0f172a)',
                              padding: '8px',
                              borderRadius: '16px',
                              border: '2px solid var(--border-color, #334155)',
                              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
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
                              src={userFoto} 
                              alt="Perfil Expandido" 
                              style={{ 
                                width: '180px', 
                                height: '180px', 
                                borderRadius: '12px', 
                                objectFit: 'cover',
                                display: 'block'
                              }} 
                            />
                            <span style={{ 
                              fontSize: '0.82rem', 
                              fontWeight: 800, 
                              color: 'var(--text-main, #fff)', 
                              letterSpacing: '-0.2px',
                              textAlign: 'center',
                              maxWidth: '170px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {userNome}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                          {userNome}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                          {conf.label}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Package size={16} color="#38bdf8" />
                        <span><strong style={{ color: 'var(--text-main)' }}>{userItem.pedidos || 0}</strong> Romaneios</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Factory size={16} color="#a855f7" />
                        <span><strong style={{ color: 'var(--text-main)' }}>{userItem.op || 0}</strong> O.P.s</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Layers size={16} color="#ec4899" />
                        <span><strong style={{ color: 'var(--text-main)' }}>{(userItem.skus || 0).toLocaleString('pt-BR')}</strong> SKUs</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: '900', color: index === 0 ? '#f59e0b' : 'var(--text-main)' }}>
                        {pontosNum.toLocaleString('pt-BR')}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', marginLeft: '4px' }}>pts</span>
                    </div>
                  </div>

                  <div 
                    style={{
                      width: '100%',
                      height: '10px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <div 
                      style={{
                        width: `${porcentagemLargura}%`,
                        height: '100%',
                        background: conf.barColor,
                        borderRadius: '8px',
                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

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
    </div>
  );
}