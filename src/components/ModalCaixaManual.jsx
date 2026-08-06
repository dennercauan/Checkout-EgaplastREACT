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
      <div className="op-modal-content" style={{maxWidth: '400px'}} onClick={(e) => e.stopPropagation()}>
        <div className="op-modal-header" style={{borderBottom: 'none', paddingBottom: '10px'}}>
          <div className="op-modal-title">
            <div className="icon-wrap" style={{background: '#d1fae5', color: '#10b981'}}><PackagePlus size={24}/></div>
            <div><h2 style={{color: '#059669'}}>Caixa Manual</h2><p>Inclusão de volume avulso.</p></div>
          </div>
          <button className="btn-close-modal" onClick={() => setShowAddCaixaModal(false)}><X size={24}/></button>
        </div>
        <div className="op-modal-body" style={{paddingTop: '0'}}>
          
          <div className="input-group-op" style={{ marginBottom: '12px' }}>
            <label>Número/Tipo da Caixa</label>
            <input type="text" placeholder="Ex: CAIXA 10" autoFocus value={addCaixaForm.num} onChange={(e) => setAddCaixaForm({...addCaixaForm, num: e.target.value})} disabled={isSaving}/>
          </div>

          <div className="input-group-op" style={{ margin: 0 }}>
            <label>Peso Total (kg)</label>
            <input type="text" placeholder="Ex: 12.5" value={addCaixaForm.peso} onChange={(e) => setAddCaixaForm({...addCaixaForm, peso: e.target.value})} disabled={isSaving}/>
          </div>

        </div>
        <div className="op-modal-footer">
          <button className="btn-cancel-op" onClick={() => setShowAddCaixaModal(false)} disabled={isSaving}>Cancelar</button>
          <button className="btn-save-op" style={{background: '#10b981'}} onClick={handleSalvarCaixaManual} disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="fa-spin" /> : 'Adicionar Volume'}
          </button>
        </div>
      </div>
    </div>
  );
}