import React from 'react';
import { Package, FileText, TrendingDown, Award } from 'lucide-react';

export default function AdmEstatisticasGerais({ dados, dataFiltro }) {
  // Como o Firebase nos entrega um objeto { "Nome": { skus: 10, ... } }, 
  // transformamos em array para facilitar a matemática.
  const arrayUsuarios = Object.values(dados || {});

  // O reduce passa por todos os funcionários somando as métricas gerais da operação
  const totais = arrayUsuarios.reduce((acc, user) => {
    return {
      skus: acc.skus + (user.skus || 0),
      op: acc.op + (user.op || 0),
      pontos: acc.pontos + (user.pontos || 0),
      decrescimo: acc.decrescimo + (user.decrescimo || 0),
    };
  }, { skus: 0, op: 0, pontos: 0, decrescimo: 0 });

  return (
    <div style={{ marginBottom: '10px' }}>
      
      {/* GRID RESPONSIVO: Os cards se adaptam sem criar scroll horizontal */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px' 
      }}>
        
        {/* CARD 1: TOTAL DE SKUs */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>SKUs BIPADOS</p>
              <h2 style={{ margin: '5px 0 0 0', color: '#0f172a', fontSize: '2rem' }}>{totais.skus}</h2>
            </div>
            <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px' }}>
              <Package size={24} color="#3b82f6" />
            </div>
          </div>
        </div>

        {/* CARD 2: TOTAL DE OPs */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>ORDENS DE PRODUÇÃO</p>
              <h2 style={{ margin: '5px 0 0 0', color: '#0f172a', fontSize: '2rem' }}>{totais.op}</h2>
            </div>
            <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '8px' }}>
              <FileText size={24} color="#10b981" />
            </div>
          </div>
        </div>

        {/* CARD 3: PONTUAÇÃO GLOBAL */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>PONTUAÇÃO DA EQUIPE</p>
              <h2 style={{ margin: '5px 0 0 0', color: '#0f172a', fontSize: '2rem' }}>{totais.pontos.toFixed(0)}</h2>
            </div>
            <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '8px' }}>
              <Award size={24} color="#f59e0b" />
            </div>
          </div>
        </div>

        {/* CARD 4: PONTOS PERDIDOS (OCIOSIDADE) */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>PONTOS PERDIDOS</p>
              <h2 style={{ margin: '5px 0 0 0', color: '#ef4444', fontSize: '2rem' }}>{totais.decrescimo.toFixed(0)}</h2>
            </div>
            <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px' }}>
              <TrendingDown size={24} color="#ef4444" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}