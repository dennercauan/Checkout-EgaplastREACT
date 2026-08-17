// src/components/ModalCriarEditarPedido.jsx
import React, { useState, useEffect, useRef } from 'react';
import { PackagePlus, X, FileText, Plus, Trash2, User, Loader2, ChevronDown, Check } from 'lucide-react';

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!showModal && !isClosingModal) return null;

  // Lista de usuários formatada
  const listaUsuarios = [];
  if (localUser?.email && !usuarios.some(u => u.email === String(localUser.email).toLowerCase().trim())) {
    listaUsuarios.push({
      email: String(localUser.email).toLowerCase().trim(),
      nome: String(localUser.email).split('@')[0].toLowerCase()
    });
  }
  usuarios.forEach(u => {
    listaUsuarios.push({
      email: u.email,
      nome: u.email.split('@')[0]
    });
  });

  const usuarioSelecionado = listaUsuarios.find(u => u.email === docResponsavel);

  return (
    <div className={`op-modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={!isSaving ? handleCloseModal : null}>
      <div 
        className="op-modal-content" 
        style={{
          background: 'var(--bg-card, #0f172a)',
          color: 'var(--text-main, #f8fafc)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '16px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="op-modal-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="op-modal-title">
            <div className="icon-wrap" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--text-highlight, #38bdf8)' }}>
              <PackagePlus size={24} />
            </div>
            <div>
              <h2 style={{ color: 'var(--text-main)', margin: '0 0 2px 0' }}>
                {editingId ? 'Editar Pedido' : 'Configurar Novo Pedido'}
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Preencha os dados e atribua os documentos.</p>
            </div>
          </div>
          {!isSaving && (
            <button className="btn-close-modal" onClick={handleCloseModal} style={{ color: 'var(--text-muted)' }}>
              <X size={24}/>
            </button>
          )}
        </div>

        <div className="op-modal-body">
          <div className="form-grid-2">
            <div className="input-group-op">
              <label style={{ color: 'var(--text-muted)' }}>Nº Romaneio</label>
              <input 
                type="text" 
                placeholder="Ex: 12345" 
                autoFocus 
                value={romaneio} 
                onChange={(e) => setRomaneio(e.target.value)} 
                disabled={isSaving}
                style={{ background: 'var(--bg-input)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              />
            </div>
            <div className="input-group-op" style={{ flex: 1.5 }}>
              <label style={{ color: 'var(--text-muted)' }}>Nome da Loja / Destino</label>
              <input 
                type="text" 
                placeholder="Ex: Loja Central" 
                value={loja} 
                onChange={(e) => setLoja(e.target.value)} 
                disabled={isSaving}
                style={{ background: 'var(--bg-input)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              />
            </div>
          </div>
          
          <div className="form-grid-3">
            <div className="input-group-op">
              <label style={{ color: 'var(--text-muted)' }}>Local</label>
              <select 
                value={local} 
                onChange={(e) => setLocal(e.target.value)} 
                disabled={isSaving}
                style={{ background: 'var(--bg-input)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              >
                <option value="DF">DF</option>
                <option value="Fora">Fora</option>
              </select>
            </div>
            <div className="input-group-op">
              <label style={{ color: 'var(--text-muted)' }}>UF</label>
              <input 
                type="text" 
                placeholder="Ex: GO" 
                maxLength="2" 
                style={{ textTransform: 'uppercase', background: 'var(--bg-input)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }} 
                value={uf} 
                onChange={(e) => setUf(e.target.value)} 
                disabled={isSaving}
              />
            </div>
            <div className="input-group-op master-toggle-group">
              <label className="master-toggle">
                <input type="checkbox" checked={isCaixaMaster} onChange={(e) => setIsCaixaMaster(e.target.checked)} disabled={isSaving}/>
                <span className="toggle-slider"></span>
                <span className="toggle-label" style={{ color: 'var(--text-main)' }}>Caixa Master</span>
              </label>
            </div>
          </div>
          
          <div className="input-group-op">
            <label style={{ color: 'var(--text-muted)' }}>Observações</label>
            <textarea 
              placeholder="Alguma instrução especial?" 
              rows="2" 
              value={observacoes} 
              onChange={(e) => setObservacoes(e.target.value)} 
              disabled={isSaving}
              style={{ background: 'var(--bg-input)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
            />
          </div>
          
          <div className="docs-injection-area" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
            <h4 className="docs-area-title" style={{ color: 'var(--text-main)' }}>
              <FileText size={16} color="var(--text-highlight, #38bdf8)"/> Documentos Vinculados
            </h4>
            <div className="docs-form-row">
              <div className="input-group-op">
                <label style={{ color: 'var(--text-muted)' }}>Tipo de Doc.</label>
                <select 
                  value={docTipo} 
                  onChange={(e) => setDocTipo(e.target.value)} 
                  disabled={isSaving}
                  style={{ background: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                >
                  <option value="Nota Fiscal">Nota Fiscal</option>
                  <option value="Minuta">Minuta</option>
                  <option value="Bonificação">Bonificação</option>
                  <option value="Troca">Troca</option>
                </select>
              </div>

              {/* DROPDOWN CUSTOMIZADO COM ALTO CONTRASTE */}
              <div className="input-group-op" style={{ flex: 1.5, position: 'relative' }} ref={dropdownRef}>
                <label style={{ color: 'var(--text-muted)' }}>Responsável</label>
                
                <div 
                  onClick={() => !isSaving && setDropdownOpen(!dropdownOpen)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: usuarioSelecionado ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '0.88rem'
                  }}
                >
                  <span>{usuarioSelecionado ? usuarioSelecionado.nome : 'Selecione...'}</span>
                  <ChevronDown size={16} color="var(--text-muted)" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>

                {dropdownOpen && (
                  <div 
                    className="custom-scrollbar"
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-card, #0f172a)',
                      border: '1px solid var(--border-color, #334155)',
                      borderRadius: '10px',
                      boxShadow: '0 -12px 30px rgba(0,0,0,0.7)',
                      zIndex: 1000,
                      maxHeight: '320px', /* Altura expandida */
                      overflowY: 'auto',
                      padding: '6px'
                    }}
                  >
                    {listaUsuarios.map(u => {
                      const isSelected = u.email === docResponsavel;
                      return (
                        <div
                          key={u.email}
                          onClick={() => {
                            setDocResponsavel(u.email);
                            setDropdownOpen(false);
                          }}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isSelected ? 'var(--primary, #0d3269)' : 'transparent',
                            color: isSelected ? '#ffffff' : 'var(--text-main, #f8fafc)',
                            fontSize: '0.88rem',
                            fontWeight: isSelected ? '700' : 'normal',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'var(--bg-input, rgba(255,255,255,0.06))';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <span>{u.nome}</span>
                          {isSelected && <Check size={14} color="#10b981" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button className="btn-add-doc" onClick={handleAddDoc} disabled={isSaving} style={{ background: 'var(--primary, #0ea5e9)', color: '#fff' }}>
                <Plus size={18}/> Add
              </button>
            </div>
            
            <div className="docs-list-preview">
              {docsTemporarios.length === 0 ? (
                <div className="empty-docs" style={{ color: 'var(--text-muted)' }}>Nenhum documento adicionado ainda.</div>
              ) : (
                docsTemporarios.map(doc => (
                  <div key={doc.idTemp} className="doc-preview-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '12px', background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text-main)' }}>{doc.tipo}</strong>
                      <button className="btn-remove-doc" onClick={() => handleRemoveDoc(doc.idTemp)} disabled={isSaving} style={{ padding: '4px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16}/>
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {(doc.responsaveis || [doc.responsavel]).filter(Boolean).map(resp => (
                        <span key={resp} style={{ background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={10}/> {resp.split('@')[0]}
                          <button onClick={() => handleRemoveResponsavelFromDoc(doc.idTemp, resp)} disabled={isSaving} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={12}/></button>
                        </span>
                      ))}
                      
                      <select 
                        onChange={(e) => { handleAddResponsavelToDoc(doc.idTemp, e.target.value); e.target.value = ""; }} 
                        disabled={isSaving} 
                        style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '8px', border: '1px dashed var(--border-color)', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <option value="" style={{ background: '#0f172a', color: '#f8fafc' }}>+ Add Parceiro</option>
                        {usuarios.map(u => (<option key={u.uid} value={u.email} style={{ background: '#0f172a', color: '#f8fafc' }}>{u.email.split('@')[0]}</option>))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="op-modal-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button className="btn-cancel-op" onClick={handleCloseModal} disabled={isSaving} style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
            Cancelar
          </button>
          <button className="btn-save-op" onClick={handleSavePedido} disabled={isSaving} style={{ background: 'var(--primary, #0d3269)', color: '#fff' }}>
            {isSaving ? <><Loader2 size={18} className="fa-spin" style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : (editingId ? 'Salvar Alterações' : 'Criar Pedido')}
          </button>
        </div>
      </div>
    </div>
  );
}