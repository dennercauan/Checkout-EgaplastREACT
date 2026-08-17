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
  const [opForm, setOpForm] = useState({ numero: '', responsavelEmail: '' });
  const [isSavingOp, setIsSavingOp] = useState(false);

  useEffect(() => {
    if (showOpModal) {
      if (localUser?.email && localUser.email !== 'admin') {
        setOpForm(prev => ({ ...prev, responsavelEmail: String(localUser.email).toLowerCase().trim() }));
      } else {
        setOpForm(prev => ({ ...prev, responsavelEmail: '' }));
      }
    }
  }, [showOpModal, localUser]);

  if (!showOpModal) return null;

  const handleSaveOp = async () => {
    if (!opForm.numero || !opForm.responsavelEmail) { 
      return alert("Preencha o Nº do Romaneio e selecione um Responsável."); 
    }
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
      <div 
        className="op-modal-content" 
        style={{
          maxWidth: '620px', 
          width: '95%', 
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
            <div className="icon-wrap" style={{ background: 'rgba(79, 70, 229, 0.15)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '12px', padding: '10px', display: 'flex' }}>
              <Factory size={24}/>
            </div>
            <div>
              <h2 style={{ color: 'var(--text-main)', margin: '0 0 2px 0', fontSize: '1.25rem', fontWeight: 800 }}>Ordens de Produção (O.P.)</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.82rem' }}>Controle de montagem e produção do dia.</p>
            </div>
          </div>
          <button className="btn-close-modal" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setShowOpModal(false)}>
            <X size={24}/>
          </button>
        </div>
        
        {/* CORPO */}
        <div className="op-modal-body" style={{ background: 'var(--bg-main)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="op-card-form" style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-color)', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 800 }}>Registrar Nova O.P.</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'end' }}>
              <div className="input-group-op" style={{ margin: 0 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>Nº do Romaneio</label>
                <input 
                  type="text" 
                  placeholder="Ex: 20162" 
                  value={opForm.numero} 
                  onChange={(e) => setOpForm({...opForm, numero: e.target.value})} 
                  disabled={isSavingOp}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>
              <div className="input-group-op" style={{ margin: 0 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>Responsável</label>
                <select 
                  value={opForm.responsavelEmail} 
                  onChange={(e) => setOpForm({...opForm, responsavelEmail: e.target.value})} 
                  disabled={isSavingOp} 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', outline: 'none', fontSize: '0.88rem' }}
                >
                  <option value="">Selecione o Conferente...</option>
                  {usuarios.map(u => (<option key={u.uid} value={u.email}>{u.email.split('@')[0]}</option>))}
                </select>
              </div>
            </div>
            
            <button 
              style={{ width: '100%', marginTop: '16px', background: '#4f46e5', color: '#fff', padding: '11px', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
              onClick={handleSaveOp}
              disabled={isSavingOp}
            >
              {isSavingOp ? <Loader2 size={16} className="fa-spin" /> : <Plus size={16}/>} 
              {isSavingOp ? 'Salvando...' : 'Lançar O.P.'}
            </button>
          </div>

          <h4 style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800 }}>O.P.s Registradas Hoje</h4>
          
          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {opsDoDia.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '10px', fontSize: '0.88rem' }}>
                Nenhuma O.P. lançada hoje.
              </div>
            ) : (
              opsDoDia.map(op => (
                <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: 'rgba(79, 70, 229, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '5px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.9rem' }}>
                      {op.numero}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                        <User size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: 'var(--text-muted)' }}/> 
                        {op.responsavelEmail?.split('@')[0] || 'Desconhecido'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => handleDeleteOp(op)} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }} title="Excluir O.P.">
                      <Trash2 size={15}/>
                    </button>
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