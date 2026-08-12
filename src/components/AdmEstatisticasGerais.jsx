import React from 'react';
import { Package, FileText, TrendingDown, Award, ShoppingCart, Boxes } from 'lucide-react';

export default function AdmEstatisticasGerais({ dados, dataFiltro }) {
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

  // Busca totais de Pedidos e Caixas do documento geral do dia.
  // Se ainda não estiverem salvos na raiz de estatisticasDiarias, renderiza 0.
  const totalPedidos = dados?.totalNfMinuta || 0;
  const totalCaixas = dados?.totalCaixas || 0;

  return (
    <div style={{ marginBottom: '15px' }}>
      
      {/* GRID COMPACTO: minmax reduzido para 160px para caber até 6 cards na mesma linha em telas maiores */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
        gap: '12px' 
      }}>
        
        {/* CARD 1: TOTAL PEDIDOS (NFs e Minutas) */}
        <div style={{ background: '#fff', padding: '12px', borderRadius: '10px', borderLeft: '4px solid #8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold' }}>PEDIDOS (NF/MIN)</p>
              <h2 style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '1.4rem' }}>{totalPedidos}</h2>
            </div>
            <div style={{ background: '#ede9fe', padding: '6px', borderRadius: '6px' }}>
              <ShoppingCart size={18} color="#8b5cf6" />
            </div>
          </div>
        </div>

        {/* CARD 2: TOTAL DE CAIXAS */}
        <div style={{ background: '#fff', padding: '12px', borderRadius: '10px', borderLeft: '4px solid #06b6d4', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold' }}>TOTAL DE CAIXAS</p>
              <h2 style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '1.4rem' }}>{totalCaixas}</h2>
            </div>
            <div style={{ background: '#cffafe', padding: '6px', borderRadius: '6px' }}>
              <Boxes size={18} color="#06b6d4" />
            </div>
          </div>
        </div>

        {/* CARD 3: TOTAL DE SKUs BIPADOS */}
        <div style={{ background: '#fff', padding: '12px', borderRadius: '10px', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold' }}>SKUs BIPADOS</p>
              <h2 style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '1.4rem' }}>{totais.skus}</h2>
            </div>
            <div style={{ background: '#eff6ff', padding: '6px', borderRadius: '6px' }}>
              <Package size={18} color="#3b82f6" />
            </div>
          </div>
        </div>

        {/* CARD 4: ORDENS DE PRODUÇÃO */}
        <div style={{ background: '#fff', padding: '12px', borderRadius: '10px', borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold' }}>ORDENS DE PRODUÇÃO</p>
              <h2 style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '1.4rem' }}>{totais.op}</h2>
            </div>
            <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '6px' }}>
              <FileText size={18} color="#10b981" />
            </div>
          </div>
        </div>

        {/* CARD 5: PONTUAÇÃO DA EQUIPE */}
        <div style={{ background: '#fff', padding: '12px', borderRadius: '10px', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold' }}>PONTUAÇÃO EQUIPE</p>
              <h2 style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '1.4rem' }}>{totais.pontos.toFixed(0)}</h2>
            </div>
            <div style={{ background: '#fffbeb', padding: '6px', borderRadius: '6px' }}>
              <Award size={18} color="#f59e0b" />
            </div>
          </div>
        </div>

        {/* CARD 6: PONTOS PERDIDOS (OCIOSIDADE) */}
        <div style={{ background: '#fff', padding: '12px', borderRadius: '10px', borderLeft: '4px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold' }}>PONTOS PERDIDOS</p>
              <h2 style={{ margin: '4px 0 0 0', color: '#ef4444', fontSize: '1.4rem' }}>{totais.decrescimo.toFixed(0)}</h2>
            </div>
            <div style={{ background: '#fef2f2', padding: '6px', borderRadius: '6px' }}>
              <TrendingDown size={18} color="#ef4444" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}