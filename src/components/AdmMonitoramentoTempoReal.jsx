import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AdmMonitoramentoTempoReal({ dados }) {
  // Transforma o objeto de dados em um array e já ordena pelo maior pontuador
  const arrayUsuarios = Object.entries(dados || {})
    .map(([nome, stats]) => ({
      nome,
      pontos: stats.pontos || 0,
      skus: stats.skus || 0,
      op: stats.op || 0,
      decrescimo: stats.decrescimo || 0
    }))
    .sort((a, b) => b.pontos - a.pontos);

  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem' }}>Monitoramento Individual</h3>
        <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Desempenho da equipe e status de ociosidade</p>
      </div>

      {/* Container fluido para manter a tabela responsiva sem quebrar o layout */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '15px', color: '#475569', fontWeight: '700', fontSize: '0.85rem' }}>CONFERENTE</th>
              <th style={{ padding: '15px', color: '#475569', fontWeight: '700', fontSize: '0.85rem' }}>PONTOS</th>
              <th style={{ padding: '15px', color: '#475569', fontWeight: '700', fontSize: '0.85rem' }}>SKUs</th>
              <th style={{ padding: '15px', color: '#475569', fontWeight: '700', fontSize: '0.85rem' }}>O.Ps</th>
              <th style={{ padding: '15px', color: '#ef4444', fontWeight: '700', fontSize: '0.85rem' }}>PTS PERDIDOS (OCIOSIDADE)</th>
              <th style={{ padding: '15px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textAlign: 'center' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {arrayUsuarios.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  Nenhum dado registrado para esta data.
                </td>
              </tr>
            ) : (
              arrayUsuarios.map((user, index) => {
                // Identifica se o usuário perdeu pontos (acima da tolerância de 20 min)
                const estaOcioso = user.decrescimo > 0;
                
                return (
                  <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', hover: { background: '#f8fafc' } }}>
                    
                    <td style={{ padding: '15px', fontWeight: '600', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{index + 1}º</span>
                        {user.nome.toUpperCase()}
                      </div>
                    </td>
                    
                    <td style={{ padding: '15px', color: '#0f172a', fontWeight: '900', fontSize: '1.1rem' }}>
                      {user.pontos.toFixed(0)}
                    </td>
                    
                    <td style={{ padding: '15px', color: '#64748b' }}>{user.skus}</td>
                    
                    <td style={{ padding: '15px', color: '#64748b' }}>{user.op}</td>
                    
                    <td style={{ padding: '15px', color: estaOcioso ? '#ef4444' : '#64748b', fontWeight: estaOcioso ? 'bold' : 'normal' }}>
                      {user.decrescimo.toFixed(0)}
                    </td>
                    
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      {estaOcioso ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          <AlertCircle size={18} /> ALERTA
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          <CheckCircle2 size={18} /> ATIVO
                        </div>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}