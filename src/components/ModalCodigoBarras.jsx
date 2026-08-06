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
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', background: '#fff', padding: '35px', borderRadius: '16px', width: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        
        <button onClick={() => setModalCodigoBarras(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '5px' }}>
          <X size={24}/>
        </button>

        <h3 style={{ color: '#0f172a', fontSize: '1.4rem', margin: '0 0 10px 0' }}>Vincular Código de Barras</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.5' }}>
          Para registrar a embalagem <strong style={{color: '#ef4444'}}>CX{modalCodigoBarras.sku.qtdPadrao}</strong> do produto <strong>{modalCodigoBarras.sku.ref}</strong>, insira ou bipe o código de barras (EAN) abaixo:
        </p>
        
        <input 
          type="text" 
          placeholder="Bipar ou digitar EAN..." 
          autoFocus
          value={codigoBarrasInput}
          onChange={(e) => setCodigoBarrasInput(e.target.value)}
          style={{ width: '100%', padding: '14px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '1.1rem', outline: 'none', textAlign: 'center', marginBottom: '25px', color: '#1e293b', fontWeight: 'bold' }}
        />

        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => setModalCodigoBarras(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}>Cancelar</button>
          <button 
            onClick={salvarVariacaoBanco} 
            disabled={isSaving || !codigoBarrasInput.trim()} 
            style={{ flex: 1, padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: (!codigoBarrasInput.trim() || isSaving) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)', opacity: (!codigoBarrasInput.trim() || isSaving) ? 0.7 : 1 }}
          >
            {isSaving ? <Loader2 className="fa-spin" size={18}/> : <CheckCircle2 size={18}/>} Confirmar e Salvar
          </button>
        </div>
      </div>
    </div>
  );
}