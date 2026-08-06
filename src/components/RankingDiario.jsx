import React from 'react';
import { Trophy, Medal, CheckCircle2, Factory } from 'lucide-react';

export default function RankingDiario({
  rankingCalculado,
  rankingExpandido,
  setRankingExpandido
}) {
  return (
    <div className="op-ranking-container">
      <div className="ranking-header">
        <h3><Trophy size={20} color="#eab308" style={{marginRight: '8px'}}/> Ranking Diário - Produtividade</h3>
        <span className="ranking-subtitle">Top Conferentes do Dia</span>
      </div>
      <div className="ranking-list">
        {rankingCalculado.map((user, idx) => (
          <div key={user.uid} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {/* CARD PRINCIPAL (CLICÁVEL) */}
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
                  <span><CheckCircle2 size={12}/> {user.skus} SKUs (Real)</span>
                  <span><Factory size={12}/> {user.op} O.P.s</span>
                </div>
              </div>
              <div className="ranking-score">
                <div className="score-value">{user.pontos.toLocaleString()} pts</div>
                <div className="score-bar"><div className="score-fill" style={{width: `${(user.pontos / (rankingCalculado[0]?.pontos || 1)) * 100}%`}}></div></div>
              </div>
            </div>
            
            {/* DETALHAMENTO DA PONTUAÇÃO (EXPANSÍVEL) */}
            {rankingExpandido === user.uid && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '35px', marginRight: '10px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📦 SKUs (Max 300 pts/caixa):</span> 
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                     <strong>{user.pontosSku} pts</strong>
                     <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>de {user.skus} unidades processadas</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🚀 Bônus ({user.pedidos} Pedidos):</span> 
                  <strong style={{ color: '#10b981' }}>+{user.bonusPedidos} pts</strong>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🏭 O.P.s ({user.op}):</span> 
                  <strong style={{ color: '#3b82f6' }}>+{user.op * 50} pts</strong>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>⏱️ Penalidade (Ociosidade):</span> 
                  <strong style={{ color: '#ef4444' }}>-{user.decrescimo} pts</strong>
                </div>
                
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}