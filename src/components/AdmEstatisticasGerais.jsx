// src/components/AdmEstatisticasGerais.jsx
import React, { useMemo } from 'react';
import { Package, FileText, TrendingDown, Award, ShoppingCart, Boxes } from 'lucide-react';

export default function AdmEstatisticasGerais({ dados, dataFiltro, pedidos = [] }) {
  // Garantimos a leitura quer os dados venham direto do objeto ou de dentro de 'ranking'
  const arrayUsuarios = Object.values(dados?.ranking || dados || {});

  // O reduce passa por todos os funcionários somando as métricas gerais da operação
  const totais = arrayUsuarios.reduce((acc, user) => {
    return {
      skus: acc.skus + (user.skus || 0),
      op: acc.op + (user.op || 0),
      pontos: acc.pontos + (user.pontos || 0),
      decrescimo: acc.decrescimo + (user.decrescimo || 0),
    };
  }, { skus: 0, op: 0, pontos: 0, decrescimo: 0 });

  // Contagem em tempo real priorizando a lista ativa de pedidos (abertos e finalizados)
  const { totalPedidosValidos, totalCaixasGerais } = useMemo(() => {
    if (pedidos && pedidos.length > 0) {
      let nfsMinutas = 0;
      let caixas = 0;

      pedidos.forEach(p => {
        (p.documentos || []).forEach(docItem => {
          const tipo = String(docItem.tipo || '').trim();
          // Bonificações e outros tipos são ignorados na contagem de pedidos
          if (tipo === 'Nota Fiscal' || tipo === 'Minuta') {
            nfsMinutas++;
          }
          caixas += (docItem.caixas || []).length;
        });
      });

      return { totalPedidosValidos: nfsMinutas, totalCaixasGerais: caixas };
    }

    // Fallback: se não receber o array de pedidos, lê do consolidado gravado
    return {
      totalPedidosValidos: dados?.totalNfMinuta ?? dados?.totalPedidos ?? 0,
      totalCaixasGerais: dados?.totalCaixas ?? 0
    };
  }, [pedidos, dados]);

  const cardStyle = {
    background: 'var(--bg-card, #ffffff)',
    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
    padding: '14px 16px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.25s ease'
  };

  return (
    <div style={{ marginBottom: '15px' }}>
      
      {/* GRID COMPACTO REATIVO */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', 
        gap: '12px' 
      }}>
        
        {/* CARD 1: TOTAL PEDIDOS */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.4px' }}>PEDIDOS (NF/MIN)</p>
              <h2 style={{ margin: '4px 0 0 0', color: 'var(--text-main, #0f172a)', fontSize: '1.45rem', fontWeight: 800 }}>{totalPedidosValidos}</h2>
            </div>
            <div style={{ background: 'rgba(139, 92, 246, 0.12)', padding: '7px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={18} color="#8b5cf6" />
            </div>
          </div>
        </div>

        {/* CARD 2: TOTAL DE CAIXAS */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.4px' }}>TOTAL DE CAIXAS</p>
              <h2 style={{ margin: '4px 0 0 0', color: 'var(--text-main, #0f172a)', fontSize: '1.45rem', fontWeight: 800 }}>{totalCaixasGerais}</h2>
            </div>
            <div style={{ background: 'rgba(6, 182, 212, 0.12)', padding: '7px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Boxes size={18} color="#06b6d4" />
            </div>
          </div>
        </div>

        {/* CARD 3: TOTAL DE SKUs BIPADOS */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.4px' }}>SKUs BIPADOS</p>
              <h2 style={{ margin: '4px 0 0 0', color: 'var(--text-main, #0f172a)', fontSize: '1.45rem', fontWeight: 800 }}>{totais.skus}</h2>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.12)', padding: '7px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} color="#3b82f6" />
            </div>
          </div>
        </div>

        {/* CARD 4: ORDENS DE PRODUÇÃO */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.4px' }}>ORDENS DE PRODUÇÃO</p>
              <h2 style={{ margin: '4px 0 0 0', color: 'var(--text-main, #0f172a)', fontSize: '1.45rem', fontWeight: 800 }}>{totais.op}</h2>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '7px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#10b981" />
            </div>
          </div>
        </div>

        {/* CARD 5: PONTUAÇÃO DA EQUIPE */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.4px' }}>PONTUAÇÃO EQUIPE</p>
              <h2 style={{ margin: '4px 0 0 0', color: 'var(--text-main, #0f172a)', fontSize: '1.45rem', fontWeight: 800 }}>{totais.pontos.toFixed(0)}</h2>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '7px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} color="#f59e0b" />
            </div>
          </div>
        </div>

        {/* CARD 6: PONTOS PERDIDOS (OCIOSIDADE) */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.4px' }}>PONTOS PERDIDOS</p>
              <h2 style={{ margin: '4px 0 0 0', color: '#ef4444', fontSize: '1.45rem', fontWeight: 800 }}>{totais.decrescimo.toFixed(0)}</h2>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', padding: '7px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={18} color="#ef4444" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}