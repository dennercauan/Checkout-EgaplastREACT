// src/components/ModalOrdemProducao.jsx
import React, { useState, useEffect } from 'react';
import { Factory, X, Loader2, Plus, User, Trash2 } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function ModalOrdemProducao({
  showOpModal,
  setShowOpModal,
  opsDoDia,
  usuarios,
  localUser,
  dataOperacaoAtiva
}) {
  // Os estados vieram para dentro do componente!
  const [opForm, setOpForm] = useState({ numero: '', responsavelEmail: '' });
  const [isSavingOp, setIsSavingOp] = useState(false);

  // Auto-preenche o responsável ao abrir o modal
  useEffect(() => {
    if (showOpModal && localUser?.email) {
      setOpForm(prev => ({ ...prev, responsavelEmail: String(localUser.email).toLowerCase().trim() }));
    }
  }, [showOpModal, localUser]);

  if (!showOpModal) return null;

  const handleSaveOp = async () => {
    if (!opForm.numero || !opForm.responsavelEmail) { return alert("Preencha o Nº do Romaneio e o Responsável."); }
    setIsSavingOp(true);
    try {
      const targetUser = usuarios.find(u => u.email === opForm.responsavelEmail);
      const responsavelUid = targetUser ? targetUser.uid : null;
      const novaOp = { 
        numero: opForm.numero, 
        responsavelEmail: opForm.responsavelEmail, 
        responsavelUid: responsavelUid, 
        dataOperacao: dataOperacaoAtiva, 
        criadorUid: localUser.uid, 
        createdAt: serverTimestamp() 
      };
      await addDoc(collection(db, 'ordensProducao'), novaOp);
      setOpForm({ ...opForm, numero: '' }); 
    } catch (error) { 
      alert("Houve um erro ao registrar a Ordem de Produção."); 
    } finally { 
      setIsSavingOp(false); 
    }
  };

  const handleDeleteOp = async (op) => {
    if (!window.confirm("Deseja realmente excluir esta Ordem de Produção?")) return;
    try { 
      await deleteDoc(doc(db, 'ordensProducao', op.id)); 
    } catch (error) { 
      alert("Erro ao excluir O.P."); 
    }
  };

  return (
    <div className="op-modal-overlay" onClick={() => !isSavingOp && setShowOpModal(false)}>
      <div className="op-modal-content" style={{maxWidth: '650px', padding: '25px', boxSizing: 'border-box'}} onClick={(e) => e.stopPropagation()}>
        <div className="op-modal-header">
          <div className="op-modal-title">
            <div className="icon-wrap" style={{background: '#e0e7ff', color: '#4f46e5'}}><Factory size={24}/></div>
            <div><h2>Ordens de Produção (O.P.)</h2><p>Controle de montagem e produção do dia.</p></div>
          </div>
          <button className="btn-close-modal" onClick={() => setShowOpModal(false)}><X size={24}/></button>
        </div>
        
        <div className="op-modal-body" style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
          
          <div className="op-card-form" style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', boxSizing: 'border-box' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#334155', fontSize: '0.95rem' }}>Registrar Nova O.P.</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', alignItems: 'end' }}>
              <div className="input-group-op" style={{ margin: 0 }}>
                <label>Nº do Romaneio</label>
                <input type="text" placeholder="Ex: 20162" value={opForm.numero} onChange={(e) => setOpForm({...opForm, numero: e.target.value})} disabled={isSavingOp}/>
              </div>
              <div className="input-group-op" style={{ margin: 0 }}>
                <label>Responsável</label>
                <select value={opForm.responsavelEmail} onChange={(e) => setOpForm({...opForm, responsavelEmail: e.target.value})} disabled={isSavingOp}>
                  {usuarios.map(u => (<option key={u.uid} value={u.email}>{u.email.split('@')[0]}</option>))}
                </select>
              </div>
            </div>
            
            <button 
              style={{ width: '100%', marginTop: '15px', background: '#4f46e5', color: '#fff', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              onClick={handleSaveOp}
              disabled={isSavingOp}
            >
              {isSavingOp ? <Loader2 size={16} className="fa-spin" /> : <Plus size={16}/>} 
              {isSavingOp ? 'Salvando...' : 'Lançar O.P.'}
            </button>
          </div>

          <h4 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>O.P.s Registradas Hoje</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>
            {opsDoDia.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>Nenhuma O.P. lançada hoje.</div>
            ) : (
              opsDoDia.map(op => (
                <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>{op.numero}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}><User size={10} style={{ display: 'inline', marginRight: '2px' }}/> {op.responsavelEmail?.split('@')[0]}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => handleDeleteOp(op)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Excluir O.P."><Trash2 size={16}/></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}