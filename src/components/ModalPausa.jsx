// src/components/ModalPausa.jsx
import React, { useState, useEffect } from 'react';
import { Pause, X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ModalPausa({
  showPauseModal,
  setShowPauseModal,
  pedidoToPause,
  setPedidoToPause
}) {
  const [pauseReason, setPauseReason] = useState('');

  // Ao abrir o modal, preenche o campo com o motivo anterior (se houver)
  useEffect(() => {
    if (showPauseModal && pedidoToPause) {
      setPauseReason(pedidoToPause.motivoPausa || '');
    }
  }, [showPauseModal, pedidoToPause]);

  if (!showPauseModal) return null;

  const obterReferenciaDocumento = (pedido) => {
    return pedido._isLegacy
      ? doc(db, 'usuarios', pedido.criadorUid, 'elementos', pedido.elementoIdOriginal, 'pedidosMultiDocumento', pedido.id)
      : doc(db, 'pedidos', pedido.id);
  };

  const handleConfirmPause = async () => {
    if (!pauseReason.trim()) return alert("Informe o motivo da pausa.");
    const ref = obterReferenciaDocumento(pedidoToPause);
    await updateDoc(ref, { isPaused: true, motivoPausa: pauseReason, lastPauseStart: Date.now() });
    
    setShowPauseModal(false); 
    setPedidoToPause(null); 
    setPauseReason('');
  };

  return (
    <div className="op-modal-overlay">
      <div className="op-modal-content" style={{maxWidth: '400px'}} onClick={(e) => e.stopPropagation()}>
        <div className="op-modal-header" style={{borderBottom: 'none', paddingBottom: '10px'}}>
          <div className="op-modal-title">
            <div className="icon-wrap" style={{background: '#fef3c7', color: '#d97706'}}><Pause size={24}/></div>
            <div><h2 style={{color: '#d97706'}}>Pausar Separação</h2><p>O tempo será congelado.</p></div>
          </div>
          <button className="btn-close-modal" onClick={() => setShowPauseModal(false)}><X size={24}/></button>
        </div>
        <div className="op-modal-body" style={{paddingTop: '0'}}>
          <div className="input-group-op">
            <label>Motivo da Pausa</label>
            <input 
              type="text" 
              placeholder="Ex: Queda de energia, Aguardando empilhadeira..." 
              autoFocus 
              value={pauseReason} 
              onChange={(e) => setPauseReason(e.target.value)} 
            />
          </div>
        </div>
        <div className="op-modal-footer">
          <button className="btn-cancel-op" onClick={() => setShowPauseModal(false)}>Cancelar</button>
          <button className="btn-save-op" style={{background: '#f59e0b'}} onClick={handleConfirmPause}>Confirmar Pausa</button>
        </div>
      </div>
    </div>
  );
}