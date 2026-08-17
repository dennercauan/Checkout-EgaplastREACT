// src/components/ModalCaixaManual.jsx
import React from 'react';
import { X, PackagePlus, Loader2 } from 'lucide-react';

export default function ModalCaixaManual({
  showAddCaixaModal,
  setShowAddCaixaModal,
  addCaixaForm,
  setAddCaixaForm,
  handleSalvarCaixaManual,
  isSaving
}) {
  if (!showAddCaixaModal) return null;

  return (
    <div className="op-modal-overlay">
      <div 
        className="op-modal-content" 
        style={{
          maxWidth: '420px', 
          width: '90%', 
          borderRadius: '16px', 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="op-modal-header" style={{borderBottom: '1px solid var(--border-color)', padding: '20px 24px'}}>
          <div className="op-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="icon-wrap" style={{background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '10px', borderRadius: '10px', display: 'flex'}}>
              <PackagePlus size={24}/>
            </div>
            <div>
              <h2 style={{color: 'var(--text-main)', margin: '0 0 2px 0', fontSize: '1.2rem', fontWeight: 800}}>Caixa Manual</h2>
              <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem'}}>Inclusão de volume avulso.</p>
            </div>
          </div>
          <button className="btn-close-modal" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setShowAddCaixaModal(false)}>
            <X size={22}/>
          </button>
        </div>
        
        <div className="op-modal-body" style={{padding: '24px', background: 'var(--bg-card)'}}>
          <div className="input-group-op" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>Número/Tipo da Caixa</label>
            <input 
              type="text" 
              placeholder="Ex: CAIXA 10" 
              autoFocus 
              value={addCaixaForm.num} 
              onChange={(e) => setAddCaixaForm({...addCaixaForm, num: e.target.value})} 
              disabled={isSaving}
              style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div className="input-group-op" style={{ margin: 0 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>Peso Total (kg)</label>
            <input 
              type="text" 
              placeholder="Ex: 12.5" 
              value={addCaixaForm.peso} 
              onChange={(e) => setAddCaixaForm({...addCaixaForm, peso: e.target.value})} 
              disabled={isSaving}
              style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
        </div>

        <div className="op-modal-footer" style={{ padding: '16px 24px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn-cancel-op" style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setShowAddCaixaModal(false)} disabled={isSaving}>Cancelar</button>
          <button className="btn-save-op" style={{background: '#10b981', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'}} onClick={handleSalvarCaixaManual} disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="fa-spin" /> : 'Adicionar Volume'}
          </button>
        </div>
      </div>
    </div>
  );
}