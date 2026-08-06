// src/components/ModalCaixasMaster.jsx
import React, { useState, useMemo } from 'react';
import { Package, X, Search, Plus, Edit, Trash2, Check, Copy, Loader2, CheckCircle2 } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase'; 

export default function ModalCaixasMaster({ 
  showMasterModal, 
  setShowMasterModal, 
  caixasMaster, 
  setCaixasMaster 
}) {
  
  const [modoEdicaoMaster, setModoEdicaoMaster] = useState(null);
  const [formMaster, setFormMaster] = useState({ ref: '', nome: '', variacoes: [] });
  const [buscaMaster, setBuscaMaster] = useState('');
  const [copiedEan, setCopiedEan] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // O filtro de busca agora roda apenas dentro do modal
  const caixasMasterFiltradas = useMemo(() => {
    if (!buscaMaster.trim()) return caixasMaster;
    const term = buscaMaster.toLowerCase();
    return caixasMaster.filter(m => 
      String(m.ref || '').toLowerCase().includes(term) ||
      String(m.nome || '').toLowerCase().includes(term) ||
      (m.variacoes && m.variacoes.some(v => String(v.caixa || '').toLowerCase().includes(term) || String(v.codigoBarras || '').toLowerCase().includes(term)))
    );
  }, [caixasMaster, buscaMaster]);

  const iniciarEdicaoMaster = (produto = null) => {
    if (produto) {
      setModoEdicaoMaster(produto.id || produto.ref);
      setFormMaster({
        ref: produto.ref || '',
        nome: produto.nome || '',
        variacoes: produto.variacoes ? JSON.parse(JSON.stringify(produto.variacoes)) : []
      });
    } else {
      setModoEdicaoMaster('NOVO');
      setFormMaster({ ref: '', nome: '', variacoes: [{ caixa: '', quantidade: '', peso: '', codigoBarras: '' }] });
    }
  };

  const cancelarEdicaoMaster = () => {
    setModoEdicaoMaster(null);
    setFormMaster({ ref: '', nome: '', variacoes: [] });
  };

  const salvarDicionarioMaster = async () => {
    if (!formMaster.ref.trim()) {
      alert("A Referência (REF) do produto é obrigatória!");
      return;
    }
    
    setIsSaving(true);
    try {
      const docRef = doc(db, 'caixasMaster', formMaster.ref);
      
      const dadosTratados = {
        ref: formMaster.ref.trim(),
        nome: formMaster.nome.trim(),
        variacoes: formMaster.variacoes.map(v => ({
          caixa: v.caixa ? String(v.caixa).toUpperCase().trim() : 'CAIXA',
          quantidade: parseInt(String(v.quantidade).replace(/\D/g, '')) || 0,
          peso: parseFloat(String(v.peso).replace(',', '.')) || 0,
          codigoBarras: (v.codigoBarras || '').trim()
        }))
      };

      await setDoc(docRef, dadosTratados, { merge: true });
      
      setCaixasMaster(prev => {
        const index = prev.findIndex(p => p.ref === dadosTratados.ref || p.id === dadosTratados.ref);
        if (index > -1) {
          const novaLista = [...prev];
          novaLista[index] = { ...novaLista[index], ...dadosTratados };
          return novaLista;
        } else {
          return [dadosTratados, ...prev]; 
        }
      });

      alert("Produto salvo no dicionário com sucesso!");
      cancelarEdicaoMaster();
      
    } catch (error) {
      alert("Erro ao salvar produto: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const excluirDicionarioMaster = async (ref) => {
    if (!window.confirm(`Tem certeza que deseja excluir definitivamente a REF ${ref} do dicionário?`)) return;
    try {
      await deleteDoc(doc(db, 'caixasMaster', ref)); // Corrigido de 'produtos' para 'caixasMaster'
      setCaixasMaster(prev => prev.filter(p => p.ref !== ref && p.id !== ref));
      alert("Produto removido do dicionário!");
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  };

  const handleCopyEan = (ean) => {
    if (!ean) return;
    navigator.clipboard.writeText(ean);
    setCopiedEan(ean);
    setTimeout(() => setCopiedEan(null), 2000);
  };

  if (!showMasterModal) return null;

  return (
    <div className="op-modal-overlay" onClick={() => { setShowMasterModal(false); cancelarEdicaoMaster(); }}>
      <div className="op-modal-content" style={{maxWidth: '950px', padding: '25px', boxSizing: 'border-box'}} onClick={(e) => e.stopPropagation()}>
        <div className="op-modal-header">
          <div className="op-modal-title">
            <div className="icon-wrap" style={{background: '#fce7f3', color: '#db2777'}}><Package size={24}/></div>
            <div><h2>Dicionário de Caixas Master</h2><p>Padrões de embalagem, quantidade e EAN por Produto.</p></div>
          </div>
          <button className="btn-close-modal" onClick={() => { setShowMasterModal(false); cancelarEdicaoMaster(); }}><X size={24}/></button>
        </div>
        
        <div className="op-modal-body" style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', minWidth: '300px' }}>
              <Search size={18} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Pesquisar por Cód. REF, Nome do Produto ou Tipo de Caixa..." 
                value={buscaMaster}
                onChange={(e) => setBuscaMaster(e.target.value)}
                style={{ flex: 1, padding: '12px 10px', border: 'none', background: 'transparent', outline: 'none', color: '#334155' }}
                disabled={modoEdicaoMaster !== null}
                autoFocus
              />
            </div>
            
            <button 
              onClick={() => iniciarEdicaoMaster()}
              disabled={modoEdicaoMaster !== null}
              style={{ background: '#db2777', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: modoEdicaoMaster !== null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: modoEdicaoMaster !== null ? 0.5 : 1 }}
            >
              <Plus size={18} /> Novo Produto
            </button>
          </div>

          <div style={{ maxHeight: '550px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px', paddingRight: '5px' }}>
            
            {modoEdicaoMaster && (
              <div style={{ gridColumn: '1 / -1', background: '#fff', padding: '25px', borderRadius: '12px', border: '2px solid #db2777', boxShadow: '0 10px 25px -5px rgba(219, 39, 119, 0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#db2777', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Edit size={20}/> {modoEdicaoMaster === 'NOVO' ? 'Cadastrar Novo Produto' : `Editando REF: ${formMaster.ref}`}
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', marginBottom: '6px' }}>Código REF</label>
                    <input type="text" value={formMaster.ref} onChange={(e) => setFormMaster({...formMaster, ref: e.target.value.toUpperCase()})} disabled={modoEdicaoMaster !== 'NOVO'} placeholder="Ex: 012131" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: modoEdicaoMaster !== 'NOVO' ? '#f1f5f9' : '#fff' }}/>
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', marginBottom: '6px' }}>Nome do Produto</label>
                    <input type="text" value={formMaster.nome} onChange={(e) => setFormMaster({...formMaster, nome: e.target.value})} placeholder="Ex: OBTURADOR PVC FLEXÍVEL" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}/>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <strong style={{ color: '#334155', fontSize: '0.95rem' }}>Variações e Embalagens</strong>
                    <button onClick={() => setFormMaster({...formMaster, variacoes: [...formMaster.variacoes, {caixa: '', quantidade: '', peso: '', codigoBarras: ''}]})} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Plus size={14}/> Add Variação
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {formMaster.variacoes.map((v, vIdx) => (
                      <div key={vIdx} style={{ display: 'flex', gap: '10px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Tipo (Ex: CAIXA 1)</label><input type="text" value={v.caixa} onChange={(e) => { const novas = [...formMaster.variacoes]; novas[vIdx].caixa = e.target.value; setFormMaster({...formMaster, variacoes: novas}); }} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}/></div>
                        <div style={{ width: '80px' }}><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Qtd</label><input type="number" value={v.quantidade} onChange={(e) => { const novas = [...formMaster.variacoes]; novas[vIdx].quantidade = e.target.value; setFormMaster({...formMaster, variacoes: novas}); }} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}/></div>
                        <div style={{ width: '80px' }}><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Peso (kg)</label><input type="number" step="0.1" value={v.peso} onChange={(e) => { const novas = [...formMaster.variacoes]; novas[vIdx].peso = e.target.value; setFormMaster({...formMaster, variacoes: novas}); }} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}/></div>
                        <div style={{ flex: 1.5 }}><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Cód. Barras (EAN)</label><input type="text" value={v.codigoBarras} onChange={(e) => { const novas = [...formMaster.variacoes]; novas[vIdx].codigoBarras = e.target.value; setFormMaster({...formMaster, variacoes: novas}); }} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}/></div>
                        <button onClick={() => { const novas = formMaster.variacoes.filter((_, i) => i !== vIdx); setFormMaster({...formMaster, variacoes: novas}); }} style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                      </div>
                    ))}
                    {formMaster.variacoes.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '10px' }}>Nenhuma variação adicionada. Adicione pelo menos uma.</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px' }}>
                  <button onClick={cancelarEdicaoMaster} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={salvarDicionarioMaster} disabled={isSaving} style={{ padding: '10px 25px', background: '#db2777', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                     {isSaving ? <Loader2 className="fa-spin" size={18}/> : <CheckCircle2 size={18}/>} Salvar Produto
                  </button>
                </div>
              </div>
            )}

            {caixasMasterFiltradas.length === 0 && modoEdicaoMaster === null ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                {buscaMaster ? 'Nenhum produto ou variação encontrada para essa busca.' : 'O dicionário de Caixas Master está vazio.'}
              </div>
            ) : (
              caixasMasterFiltradas.map(master => {
                if (modoEdicaoMaster === master.id || modoEdicaoMaster === master.ref) return null; 
                
                return (
                  <div key={master.id || master.ref} style={{ display: 'flex', flexDirection: 'column', background: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
                    
                    <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => iniciarEdicaoMaster(master)} disabled={modoEdicaoMaster !== null} style={{ background: '#f1f5f9', border: 'none', padding: '6px', borderRadius: '6px', color: '#0284c7', cursor: modoEdicaoMaster !== null ? 'not-allowed' : 'pointer', opacity: modoEdicaoMaster !== null ? 0.3 : 1 }} title="Editar"><Edit size={16}/></button>
                      <button onClick={() => excluirDicionarioMaster(master.ref || master.id)} disabled={modoEdicaoMaster !== null} style={{ background: '#fef2f2', border: 'none', padding: '6px', borderRadius: '6px', color: '#ef4444', cursor: modoEdicaoMaster !== null ? 'not-allowed' : 'pointer', opacity: modoEdicaoMaster !== null ? 0.3 : 1 }} title="Excluir"><Trash2 size={16}/></button>
                    </div>

                    <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px', paddingRight: '60px' }}>
                      <strong style={{ color: '#db2777', fontSize: '1.1rem', display: 'block' }}>
                        REF: {master.ref || 'S/N'}
                      </strong>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginTop: '4px', lineHeight: '1.3' }}>
                        {master.nome || 'Produto sem nome'}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {master.variacoes && master.variacoes.length > 0 ? (
                        master.variacoes.map((v, vIdx) => (
                          <div key={vIdx} style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#475569' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <strong style={{ color: '#334155' }}>{v.caixa || 'CX Padrão'}</strong>
                              <span style={{ fontWeight: 800, color: '#0ea5e9', fontSize: '0.9rem' }}>{v.quantidade || 'N/A'} un</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                EAN: <strong style={{ color: '#64748b' }}>{v.codigoBarras || 'N/A'}</strong>
                                {v.codigoBarras && (
                                  <button 
                                    onClick={() => handleCopyEan(v.codigoBarras)}
                                    title="Copiar EAN"
                                    style={{ background: '#fff', border: '1px solid #cbd5e1', cursor: 'pointer', color: copiedEan === v.codigoBarras ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }}
                                  >
                                    {copiedEan === v.codigoBarras ? <Check size={14} /> : <Copy size={14} />}
                                  </button>
                                )}
                              </span>
                              <strong style={{ color: '#64748b' }}>{v.peso || 0} kg</strong>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '10px', textAlign: 'center', background: '#f8fafc', borderRadius: '6px' }}>Nenhuma variação cadastrada.</span>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </div>
  );
}