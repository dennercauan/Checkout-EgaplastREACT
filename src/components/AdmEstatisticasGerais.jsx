// src/components/AdmEstatisticasGerais.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Package, FileText, TrendingDown, Award, ShoppingCart, 
  Boxes, ChevronDown, Sparkles, Activity, X
} from 'lucide-react';

export default function AdmEstatisticasGerais({ dados, pedidos = [] }) {
  const [expandido, setExpandido] = useState(false);
  const popoverRef = useRef(null);
  const arrayUsuarios = Object.values(dados?.ranking || dados || {});

  // Fecha o menu flutuante automaticamente ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setExpandido(false);
      }
    };
    if (expandido) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expandido]);

  const totais = arrayUsuarios.reduce((acc, user) => ({
    skus: acc.skus + (user.skus || 0),
    op: acc.op + (user.op || 0),
    pontos: acc.pontos + (user.pontos || 0),
    decrescimo: acc.decrescimo + (user.decrescimo || 0),
  }), { skus: 0, op: 0, pontos: 0, decrescimo: 0 });

  const { totalPedidosValidos, totalCaixasGerais } = useMemo(() => {
    if (pedidos && pedidos.length > 0) {
      let nfsMinutas = 0;
      let caixas = 0;

      pedidos.forEach(p => {
        (p.documentos || []).forEach(docItem => {
          const tipo = String(docItem.tipo || '').trim();
          if (tipo === 'Nota Fiscal' || tipo === 'Minuta') nfsMinutas++;
          caixas += (docItem.caixas || []).length;
        });
      });

      return { totalPedidosValidos: nfsMinutas, totalCaixasGerais: caixas };
    }

    return {
      totalPedidosValidos: dados?.totalNfMinuta ?? dados?.totalPedidos ?? 0,
      totalCaixasGerais: dados?.totalCaixas ?? 0
    };
  }, [pedidos, dados]);

  return (
    <aside style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '14px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxSizing: 'border-box',
      gap: '10px',
      position: 'relative' // Base para o elemento flutuante
    }}>
      {/* CABEÇALHO */}
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-main)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Métricas do Dia
        </h4>
        <Activity size={15} color="var(--primary)" />
      </div>

      {/* BLOCO DOS 3 CARDS FIXOS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        
        {/* KPI 1: PEDIDOS */}
        <div style={{
          flex: 1,
          minHeight: '68px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(0,0,0,0.02) 100%)',
          borderLeft: '4px solid #8b5cf6',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Pedidos
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#a78bfa', lineHeight: 1.1, marginTop: '2px' }}>
              {totalPedidosValidos}
            </div>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '9px', borderRadius: '8px', color: '#a78bfa' }}>
            <ShoppingCart size={20} />
          </div>
        </div>

        {/* KPI 2: TOTAL CAIXAS */}
        <div style={{
          flex: 1,
          minHeight: '68px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(0,0,0,0.02) 100%)',
          borderLeft: '4px solid #06b6d4',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total de Caixas
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#22d3ee', lineHeight: 1.1, marginTop: '2px' }}>
              {totalCaixasGerais}
            </div>
          </div>
          <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '9px', borderRadius: '8px', color: '#22d3ee' }}>
            <Boxes size={20} />
          </div>
        </div>

        {/* KPI 3: ORDENS DE PRODUÇÃO */}
        <div style={{
          flex: 1,
          minHeight: '68px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(0,0,0,0.02) 100%)',
          borderLeft: '4px solid #10b981',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Ordens de Produção
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399', lineHeight: 1.1, marginTop: '2px' }}>
              {totais.op}
            </div>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '9px', borderRadius: '8px', color: '#34d399' }}>
            <FileText size={20} />
          </div>
        </div>

      </div>

      {/* ÂNCORA DO BOTÃO E POPOVER FLUTUANTE */}
      <div ref={popoverRef} style={{ position: 'relative', width: '100%', marginTop: 'auto' }}>
        
        <button
          onClick={() => setExpandido(!expandido)}
          style={{
            width: '100%',
            background: expandido ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-input)',
            border: `1px solid ${expandido ? 'var(--primary)' : 'var(--border-color)'}`,
            color: expandido ? 'var(--text-highlight, #38bdf8)' : 'var(--text-muted)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          <Sparkles size={12} color="var(--primary)" />
          <span>{expandido ? 'Ocultar Detalhes' : 'Outros Indicadores'}</span>
          <ChevronDown size={13} style={{ transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
        </button>

        {/* CARD FLUTUANTE QUE SOBREPÕE SEM EMPURRAR O LAYOUT */}
        {expandido && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 99999,
            background: 'var(--bg-card, #0f172a)',
            border: '2px solid var(--border-color, #334155)',
            borderRadius: '14px',
            padding: '12px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'popInStats 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Indicadores Extras
              </span>
              <button 
                onClick={() => setExpandido(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>SKUs Bipados</span>
              <strong style={{ fontSize: '0.95rem', color: '#38bdf8' }}>{totais.skus.toLocaleString('pt-BR')}</strong>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pontos Equipe</span>
              <strong style={{ fontSize: '0.95rem', color: '#f59e0b' }}>{totais.pontos.toFixed(0)}</strong>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: 600 }}>Penalidades</span>
              <strong style={{ fontSize: '0.95rem', color: '#ef4444' }}>-{totais.decrescimo.toFixed(0)}</strong>
            </div>

          </div>
        )}

      </div>

      <style>{`
        @keyframes popInStats {
          from { opacity: 0; transform: scale(0.95) translateY(-6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </aside>
  );
}