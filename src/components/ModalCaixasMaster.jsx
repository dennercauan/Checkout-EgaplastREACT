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
      await deleteDoc(doc(db, 'caixasMaster', ref));
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
      <div 
        className="op-modal-content" 
        style={{
          maxWidth: '950px', 
          width: '95%',
          maxHeight: '90vh',
          borderRadius: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          boxSizing: 'border-box'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="op-modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div className="op-modal-title">
            <div className="icon-wrap" style={{ background: 'rgba(219, 39, 119, 0.15)', color: '#db2777', border: '1px solid rgba(219, 39, 119, 0.25)', borderRadius: '12px', padding: '10px', display: 'flex' }}>
              <Package size={24}/>
            </div>
            <div>
              <h2 style={{ color: 'var(--text-main)', margin: '0 0 2px 0', fontSize: '1.25rem', fontWeight: 800 }}>Dicionário de Caixas Master</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.82rem' }}>Padrões de embalagem, quantidade e EAN por Produto.</p>
            </div>
          </div>
          <button className="btn-close-modal" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => { setShowMasterModal(false); cancelarEdicaoMaster(); }}>
            <X size={24}/>
          </button>
        </div>
        
        {/* CORPO */}
        <div className="op-modal-body" style={{ background: 'var(--bg-main)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0 12px', minWidth: '280px' }}>
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Pesquisar por REF, Nome ou Tipo de Caixa..." 
                value={buscaMaster}
                onChange={(e) => setBuscaMaster(e.target.value)}
                style={{ flex: 1, padding: '12px 10px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-main)', fontSize: '0.88rem', fontFamily: 'inherit' }}
                disabled={modoEdicaoMaster !== null}
                autoFocus
              />
            </div>
            
            <button 
              onClick={() => iniciarEdicaoMaster()}
              disabled={modoEdicaoMaster !== null}
              style={{ background: '#db2777', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.88rem', cursor: modoEdicaoMaster !== null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: modoEdicaoMaster !== null ? 0.5 : 1, boxShadow: '0 4px 12px rgba(219, 39, 119, 0.25)' }}
            >
              <Plus size={18} /> Novo Produto
            </button>
          </div>

          <div style={{ maxHeight: '550px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px', paddingRight: '4px' }}>
            
            {modoEdicaoMaster && (
              <div style={{ gridColumn: '1 / -1', background: 'var(--bg-card)', padding: '22px', borderRadius: '14px', border: '2px solid #db2777', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#db2777', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 800 }}>
                    <Edit size={20}/> {modoEdicaoMaster === 'NOVO' ? 'Cadastrar Novo Produto' : `Editando REF: ${formMaster.ref}`}
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '18px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>Código REF</label>
                    <input type="text" value={formMaster.ref} onChange={(e) => setFormMaster({...formMaster, ref: e.target.value.toUpperCase()})} disabled={modoEdicaoMaster !== 'NOVO'} placeholder="Ex: 012131" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', background: modoEdicaoMaster !== 'NOVO' ? 'var(--bg-input)' : 'var(--bg-card)', color: 'var(--text-main)', boxSizing: 'border-box' }}/>
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>Nome do Produto</label>
                    <input type="text" value={formMaster.nome} onChange={(e) => setFormMaster({...formMaster, nome: e.target.value})} placeholder="Ex: OBTURADOR PVC FLEXÍVEL" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)', boxSizing: 'border-box' }}/>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem', fontWeight: 800 }}>Variações e Embalagens</strong>
                    <button onClick={() => setFormMaster({...formMaster, variacoes: [...formMaster.variacoes, {caixa: '', quantidade: '', peso: '', codigoBarras: ''}]})} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Plus size={14}/> Add Variação
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {formMaster.variacoes.map((v, vIdx) => (
                      <div key={vIdx} style={{ display: 'flex', gap: '10px', background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1.2, minWidth: '120px' }}><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Tipo (Ex: CAIXA 1)</label><input type="text" value={v.caixa} onChange={(e) => { const novas = [...formMaster.variacoes]; novas[vIdx].caixa = e.target.value; setFormMaster({...formMaster, variacoes: novas}); }} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }}/></div>
                        <div style={{ width: '80px' }}><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Qtd</label><input type="number" value={v.quantidade} onChange={(e) => { const novas = [...formMaster.variacoes]; novas[vIdx].quantidade = e.target.value; setFormMaster({...formMaster, variacoes: novas}); }} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }}/></div>
                        <div style={{ width: '80px' }}><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Peso (kg)</label><input type="number" step="0.1" value={v.peso} onChange={(e) => { const novas = [...formMaster.variacoes]; novas[vIdx].peso = e.target.value; setFormMaster({...formMaster, variacoes: novas}); }} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }}/></div>
                        <div style={{ flex: 1.5, minWidth: '150px' }}><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Cód. Barras (EAN)</label><input type="text" value={v.codigoBarras} onChange={(e) => { const novas = [...formMaster.variacoes]; novas[vIdx].codigoBarras = e.target.value; setFormMaster({...formMaster, variacoes: novas}); }} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }}/></div>
                        <button onClick={() => { const novas = formMaster.variacoes.filter((_, i) => i !== vIdx); setFormMaster({...formMaster, variacoes: novas}); }} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}><Trash2 size={16}/></button>
                      </div>
                    ))}
                    {formMaster.variacoes.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '10px' }}>Nenhuma variação adicionada.</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '18px' }}>
                  <button onClick={cancelarEdicaoMaster} style={{ padding: '10px 18px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={salvarDicionarioMaster} disabled={isSaving} style={{ padding: '10px 24px', background: '#db2777', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(219, 39, 119, 0.3)' }}>
                     {isSaving ? <Loader2 className="fa-spin" size={18}/> : <CheckCircle2 size={18}/>} Salvar Produto
                  </button>
                </div>
              </div>
            )}

            {caixasMasterFiltradas.length === 0 && modoEdicaoMaster === null ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                {buscaMaster ? 'Nenhum produto ou variação encontrada para essa busca.' : 'O dicionário de Caixas Master está vazio.'}
              </div>
            ) : (
              caixasMasterFiltradas.map(master => {
                if (modoEdicaoMaster === master.id || modoEdicaoMaster === master.ref) return null; 
                
                return (
                  <div key={master.id || master.ref} style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'relative' }}>
                    
                    <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '6px' }}>
                      <button onClick={() => iniciarEdicaoMaster(master)} disabled={modoEdicaoMaster !== null} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '6px', color: '#0ea5e9', cursor: modoEdicaoMaster !== null ? 'not-allowed' : 'pointer', opacity: modoEdicaoMaster !== null ? 0.3 : 1, display: 'flex' }} title="Editar"><Edit size={15}/></button>
                      <button onClick={() => excluirDicionarioMaster(master.ref || master.id)} disabled={modoEdicaoMaster !== null} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px', borderRadius: '6px', color: '#ef4444', cursor: modoEdicaoMaster !== null ? 'not-allowed' : 'pointer', opacity: modoEdicaoMaster !== null ? 0.3 : 1, display: 'flex' }} title="Excluir"><Trash2 size={15}/></button>
                    </div>

                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px', paddingRight: '60px' }}>
                      <strong style={{ color: '#db2777', fontSize: '1.05rem', display: 'block', fontWeight: 800 }}>
                        REF: {master.ref || 'S/N'}
                      </strong>
                      <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px', lineHeight: '1.3', fontWeight: 600 }}>
                        {master.nome || 'Produto sem nome'}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {master.variacoes && master.variacoes.length > 0 ? (
                        master.variacoes.map((v, vIdx) => (
                          <div key={vIdx} style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <strong style={{ color: 'var(--text-main)', fontWeight: 800 }}>{v.caixa || 'CX Padrão'}</strong>
                              <span style={{ fontWeight: 800, color: 'var(--text-highlight, #38bdf8)', fontSize: '0.9rem' }}>{v.quantidade || 'N/A'} un</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                EAN: <strong style={{ color: 'var(--text-main)' }}>{v.codigoBarras || 'N/A'}</strong>
                                {v.codigoBarras && (
                                  <button 
                                    onClick={() => handleCopyEan(v.codigoBarras)}
                                    title="Copiar EAN"
                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', cursor: 'pointer', color: copiedEan === v.codigoBarras ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }}
                                  >
                                    {copiedEan === v.codigoBarras ? <Check size={13} /> : <Copy size={13} />}
                                  </button>
                                )}
                              </span>
                              <strong style={{ color: 'var(--text-muted)' }}>{v.peso || 0} kg</strong>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px', textAlign: 'center', background: 'var(--bg-input)', borderRadius: '8px' }}>Nenhuma variação cadastrada.</span>
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