import React from 'react';
import { PackagePlus, X, FileText, Plus, Trash2, User, Loader2 } from 'lucide-react';

export default function ModalCriarEditarPedido({
  showModal,
  isClosingModal,
  handleCloseModal,
  isSaving,
  editingId,
  romaneio, setRomaneio,
  loja, setLoja,
  local, setLocal,
  uf, setUf,
  isCaixaMaster, setIsCaixaMaster,
  observacoes, setObservacoes,
  docTipo, setDocTipo,
  docResponsavel, setDocResponsavel,
  localUser,
  usuarios,
  handleAddDoc,
  docsTemporarios,
  handleRemoveDoc,
  handleAddResponsavelToDoc,
  handleRemoveResponsavelFromDoc,
  handleSavePedido
}) {
  if (!showModal && !isClosingModal) return null;

  return (
    <div className={`op-modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={!isSaving ? handleCloseModal : null}>
      <div className="op-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="op-modal-header">
          <div className="op-modal-title">
            <div className="icon-wrap"><PackagePlus size={24} color="var(--primary)"/></div>
            <div><h2>{editingId ? 'Editar Pedido' : 'Configurar Novo Pedido'}</h2><p>Preencha os dados e atribua os documentos.</p></div>
          </div>
          {!isSaving && <button className="btn-close-modal" onClick={handleCloseModal}><X size={24}/></button>}
        </div>
        <div className="op-modal-body">
          <div className="form-grid-2">
            <div className="input-group-op">
              <label>Nº Romaneio</label>
              <input type="text" placeholder="Ex: 12345" autoFocus value={romaneio} onChange={(e) => setRomaneio(e.target.value)} disabled={isSaving}/>
            </div>
            <div className="input-group-op" style={{ flex: 1.5 }}>
              <label>Nome da Loja / Destino</label>
              <input type="text" placeholder="Ex: Loja Central" value={loja} onChange={(e) => setLoja(e.target.value)} disabled={isSaving}/>
            </div>
          </div>
          
          <div className="form-grid-3">
            <div className="input-group-op">
              <label>Local</label>
              <select value={local} onChange={(e) => setLocal(e.target.value)} disabled={isSaving}>
                <option value="DF">DF</option>
                <option value="Fora">Fora</option>
              </select>
            </div>
            <div className="input-group-op">
              <label>UF</label>
              <input type="text" placeholder="Ex: GO" maxLength="2" style={{ textTransform: 'uppercase' }} value={uf} onChange={(e) => setUf(e.target.value)} disabled={isSaving}/>
            </div>
            <div className="input-group-op master-toggle-group">
              <label className="master-toggle">
                <input type="checkbox" checked={isCaixaMaster} onChange={(e) => setIsCaixaMaster(e.target.checked)} disabled={isSaving}/>
                <span className="toggle-slider"></span>
                <span className="toggle-label">Caixa Master</span>
              </label>
            </div>
          </div>
          
          <div className="input-group-op">
            <label>Observações</label>
            <textarea placeholder="Alguma instrução especial?" rows="2" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={isSaving}></textarea>
          </div>
          
          <div className="docs-injection-area">
            <h4 className="docs-area-title"><FileText size={16}/> Documentos Vinculados</h4>
            <div className="docs-form-row">
              <div className="input-group-op">
                <label>Tipo de Doc.</label>
                <select value={docTipo} onChange={(e) => setDocTipo(e.target.value)} disabled={isSaving}>
                  <option value="Nota Fiscal">Nota Fiscal</option>
                  <option value="Minuta">Minuta</option>
                  <option value="Bonificação">Bonificação</option>
                  <option value="Troca">Troca</option>
                </select>
              </div>
              <div className="input-group-op" style={{ flex: 1.5 }}>
                <label>Responsável</label>
                <select value={docResponsavel} onChange={(e) => setDocResponsavel(e.target.value)} disabled={isSaving}>
                  <option value="">Selecione...</option>
                  {localUser?.email && !usuarios.some(u => u.email === String(localUser.email).toLowerCase().trim()) && (
                    <option value={String(localUser.email).toLowerCase().trim()}>{String(localUser.email).split('@')[0].toLowerCase()}</option>
                  )}
                  {usuarios.map(u => (<option key={u.uid} value={u.email}>{u.email.split('@')[0]}</option>))}
                </select>
              </div>
              <button className="btn-add-doc" onClick={handleAddDoc} disabled={isSaving}><Plus size={18}/> Add</button>
            </div>
            
            <div className="docs-list-preview">
              {docsTemporarios.length === 0 ? (
                <div className="empty-docs">Nenhum documento adicionado ainda.</div>
              ) : (
                docsTemporarios.map(doc => (
                  <div key={doc.idTemp} className="doc-preview-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#334155' }}>{doc.tipo}</strong>
                      <button className="btn-remove-doc" onClick={() => handleRemoveDoc(doc.idTemp)} disabled={isSaving} style={{ padding: '4px' }}>
                        <Trash2 size={16}/>
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {(doc.responsaveis || [doc.responsavel]).filter(Boolean).map(resp => (
                        <span key={resp} style={{ background: '#e2e8f0', color: '#475569', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={10}/> {resp.split('@')[0]}
                          <button onClick={() => handleRemoveResponsavelFromDoc(doc.idTemp, resp)} disabled={isSaving} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={12}/></button>
                        </span>
                      ))}
                      <select 
                        onChange={(e) => { handleAddResponsavelToDoc(doc.idTemp, e.target.value); e.target.value = ""; }} 
                        disabled={isSaving} 
                        style={{ fontSize: '0.75rem', padding: '3px 6px', borderRadius: '6px', border: '1px dashed #cbd5e1', outline: 'none', background: '#fff', color: '#64748b', cursor: 'pointer' }}
                      >
                        <option value="">+ Add Parceiro</option>
                        {usuarios.map(u => (<option key={u.uid} value={u.email}>{u.email.split('@')[0]}</option>))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="op-modal-footer">
          <button className="btn-cancel-op" onClick={handleCloseModal} disabled={isSaving}>Cancelar</button>
          <button className="btn-save-op" onClick={handleSavePedido} disabled={isSaving}>
            {isSaving ? <><Loader2 size={18} className="fa-spin" style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : (editingId ? 'Salvar Alterações' : 'Criar Pedido')}
          </button>
        </div>
      </div>
    </div>
  );
}