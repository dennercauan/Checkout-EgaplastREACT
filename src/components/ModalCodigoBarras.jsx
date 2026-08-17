// src/components/ModalCodigoBarras.jsx
import React from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';

export default function ModalCodigoBarras({
  modalCodigoBarras,
  setModalCodigoBarras,
  codigoBarrasInput,
  setCodigoBarrasInput,
  salvarVariacaoBanco,
  isSaving
}) {
  if (!modalCodigoBarras) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5, 5, 10, 0.75)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div style={{ position: 'relative', background: 'var(--bg-card)', color: 'var(--text-main)', padding: '35px', borderRadius: '16px', width: '450px', maxWidth: '95%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
        
        <button onClick={() => setModalCodigoBarras(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '5px' }}>
          <X size={24}/>
        </button>

        <h3 style={{ color: 'var(--text-main)', fontSize: '1.4rem', margin: '0 0 10px 0', fontWeight: 800 }}>Vincular Código de Barras</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.5' }}>
          Para registrar a embalagem <strong style={{color: '#ef4444'}}>CX{modalCodigoBarras.sku.qtdPadrao}</strong> do produto <strong style={{color: 'var(--text-highlight, #38bdf8)'}}>{modalCodigoBarras.sku.ref}</strong>, insira ou bipe o código de barras (EAN) abaixo:
        </p>
        
        <input 
          type="text" 
          placeholder="Bipar ou digitar EAN..." 
          autoFocus
          value={codigoBarrasInput}
          onChange={(e) => setCodigoBarrasInput(e.target.value)}
          style={{ width: '100%', padding: '14px', border: '2px solid var(--border-color)', borderRadius: '10px', fontSize: '1.1rem', outline: 'none', textAlign: 'center', marginBottom: '25px', color: 'var(--text-main)', background: 'var(--bg-input)', fontWeight: 'bold', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => setModalCodigoBarras(null)} style={{ flex: 1, padding: '12px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}>Cancelar</button>
          <button 
            onClick={salvarVariacaoBanco} 
            disabled={isSaving || !codigoBarrasInput.trim()} 
            style={{ flex: 1, padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: (!codigoBarrasInput.trim() || isSaving) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', opacity: (!codigoBarrasInput.trim() || isSaving) ? 0.7 : 1 }}
          >
            {isSaving ? <Loader2 className="fa-spin" size={18}/> : <CheckCircle2 size={18}/>} Confirmar e Salvar
          </button>
        </div>
      </div>
    </div>
  );
}