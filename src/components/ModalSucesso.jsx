import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function ModalSucesso({
  modalSucesso,
  setModalSucesso
}) {
  if (!modalSucesso) return null;

  return (
    <div className="animate-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.85)', zIndex: 9999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-modal" style={{ background: '#fff', padding: '35px', borderRadius: '16px', width: '450px', maxWidth: '95%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', textAlign: 'center', position: 'relative' }}>
        
        <div style={{ background: '#ecfdf5', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#10b981', boxShadow: '0 0 0 10px #f0fdf4' }}>
          <CheckCircle2 size={40} />
        </div>
        
        <h2 style={{ color: '#0f172a', fontSize: '1.5rem', margin: '0 0 10px 0', fontWeight: '900' }}>{modalSucesso.titulo}</h2>
        <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.5', marginBottom: '30px' }}>
          {modalSucesso.mensagem}
        </p>

        <button 
          onClick={() => setModalSucesso(null)} 
          style={{ width: '100%', padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.05rem', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}