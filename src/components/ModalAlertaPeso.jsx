import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ModalAlertaPeso({
  alertaPesoZero,
  handleResolvePesoZero
}) {
  if (!alertaPesoZero) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.85)', zIndex: 9999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '600px', maxWidth: '95%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ background: '#fef2f2', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto', color: '#ef4444' }}>
            <AlertTriangle size={36} />
          </div>
          <h2 style={{ color: '#0f172a', fontSize: '1.4rem', margin: '0 0 10px 0' }}>Atenção: Caixa com Peso Zero!</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
            O sistema identificou {alertaPesoZero.caixasProblematicas.length === 1 ? 'um volume' : 'alguns volumes'} com <strong>peso 0.0kg</strong> no arquivo.
          </p>
        </div>

        <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '25px', paddingRight: '5px' }}>
          {alertaPesoZero.caixasProblematicas.map((cx, idx) => (
            <div key={idx} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '15px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #fca5a5', paddingBottom: '8px', marginBottom: '8px' }}>
                <strong style={{ color: '#b91c1c', fontSize: '1.1rem' }}>{cx.num || cx.caixa || 'CX INDEFINIDA'}</strong>
                <span style={{ background: '#ef4444', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>Peso: 0.0 kg</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(cx.produtos || []).map((p, pIdx) => (
                   <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#7f1d1d' }}>
                     <span style={{ fontWeight: 600 }}>{p.referencia || p.ref}</span>
                     <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, margin: '0 10px' }}>{p.descricao || p.desc}</span>
                     <strong>{p.quantidade || p.qtd} un</strong>
                   </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => handleResolvePesoZero('excluir')} style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Trash2 size={18}/> Excluir Caixa(s)
          </button>
          <button onClick={() => handleResolvePesoZero('cancelar')} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <X size={18}/> Cancelar (Manter)
          </button>
        </div>
        
      </div>
    </div>
  );
}