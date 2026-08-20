// src/components/ModalGerenciarRanking.jsx
import React, { useState } from 'react';
import { 
  X, Plus, Trash2, Edit2, Clock, Check, Loader2, 
  Award, Package, Factory, Coffee, Star, AlertTriangle 
} from 'lucide-react';
import { 
  doc, setDoc, deleteDoc, updateDoc, 
  collection, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export default function ModalGerenciarRanking({ 
  show, 
  onClose, 
  rankingData, 
  dataOperacaoAtiva 
}) {
  const [usuarioSelecionadoUid, setUsuarioSelecionadoUid] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Estados para Novo Evento / Edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [eventoEmEdicao, setEventoEmEdicao] = useState(null);
  const [formEvento, setFormEvento] = useState({
    tipo: 'bonus',
    label: '⭐ Ajuste Manual ADM',
    pontos: 50,
    hora: '08:00',
    motivo: ''
  });

  if (!show) return null;

  const usuarioAtivo = rankingData?.find(u => (u.uid || u.nome) === usuarioSelecionadoUid) || rankingData?.[0];
  const uidAtivo = usuarioAtivo?.uid || usuarioAtivo?.nome;

  const formatarHoraMs = (ms) => {
    if (!ms) return '--:--';
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getIconeTipo = (sourceType) => {
    switch (sourceType) {
      case 'pedido': return <Package size={16} color="#38bdf8" />;
      case 'op': return <Factory size={16} color="#a855f7" />;
      case 'pausa_adm': return <Coffee size={16} color="#f59e0b" />;
      case 'ajuste': return <Star size={16} color="#eab308" />;
      default: return <Clock size={16} color="#94a3b8" />;
    }
  };

  const handleAbrirCriar = () => {
    const agora = new Date();
    setFormEvento({
      tipo: 'bonus',
      label: '⭐ Ajuste Manual ADM',
      pontos: 50,
      hora: `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`,
      motivo: ''
    });
    setEventoEmEdicao(null);
    setModoEdicao(true);
  };

  const handleAbrirEditar = (evento) => {
    setEventoEmEdicao(evento);
    setFormEvento({
      tipo: evento.sourceType || 'ajuste',
      label: evento.label || 'Marcação',
      pontos: evento.delta || 0,
      hora: formatarHoraMs(evento.time),
      motivo: evento.detalhe || ''
    });
    setModoEdicao(true);
  };

  const handleSalvarEvento = async () => {
    if (!uidAtivo) return;
    setIsSaving(true);

    try {
      const [ano, mes, dia] = dataOperacaoAtiva.split('-').map(Number);
      const [hora, min] = formEvento.hora.split(':').map(Number);
      const dataTimestamp = new Date(ano, mes - 1, dia, hora, min, 0);
      const timestampFirebase = Timestamp.fromDate(dataTimestamp);

      if (eventoEmEdicao) {
        // EDIÇÃO DE EVENTO EXISTENTE
        if (eventoEmEdicao.sourceType === 'ajuste') {
          const refAjuste = doc(db, 'ajustesDiarios', eventoEmEdicao.sourceId);
          await updateDoc(refAjuste, {
            pontos: Number(formEvento.pontos) || 0,
            motivo: formEvento.motivo,
            createdAt: timestampFirebase,
            updatedAt: serverTimestamp()
          });
        } else if (eventoEmEdicao.sourceType === 'op') {
          const refOp = doc(db, 'ordensProducao', eventoEmEdicao.sourceId);
          await updateDoc(refOp, {
            createdAt: timestampFirebase,
            updatedAt: serverTimestamp()
          });
        } else if (eventoEmEdicao.sourceType === 'pedido') {
          const refPedido = doc(db, 'pedidos', eventoEmEdicao.sourceId);
          await updateDoc(refPedido, {
            createdAt: timestampFirebase,
            updatedAt: serverTimestamp()
          });
        }
      } else {
        // NOVO AJUSTE MANUAL
        const novoDocRef = doc(collection(db, 'ajustesDiarios'));
        await setDoc(novoDocRef, {
          usuarioUid: uidAtivo,
          usuarioNome: usuarioAtivo.nome,
          tipo: 'bonus',
          pontos: Number(formEvento.pontos) || 0,
          motivo: formEvento.motivo || formEvento.label,
          dataOperacao: dataOperacaoAtiva,
          createdAt: timestampFirebase,
          updatedAt: serverTimestamp()
        });
      }

      setModoEdicao(false);
      setEventoEmEdicao(null);
    } catch (error) {
      alert("Erro ao salvar marcação: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcluirEvento = async (evento) => {
    if (!window.confirm(`Deseja anular a marcação "${evento.label}"?`)) return;
    setIsSaving(true);
    
    try {
      if (evento.sourceType === 'ajuste') {
        await deleteDoc(doc(db, 'ajustesDiarios', evento.sourceId));
      } else if (evento.sourceType === 'op') {
        await deleteDoc(doc(db, 'ordensProducao', evento.sourceId));
      } else if (evento.sourceType === 'pedido') {
        await deleteDoc(doc(db, 'pedidos', evento.sourceId));
      } else if (evento.sourceType === 'calculado' && evento.delta < 0) {
        // ✅ ANULAÇÃO DE OCIOSIDADE: Injeta um perdão de pontos
        const pontosParaDevolver = Math.abs(evento.delta);
        const [ano, mes, dia] = dataOperacaoAtiva.split('-').map(Number);
        const d = new Date(evento.time || Date.now());
        const timestampFirebase = Timestamp.fromDate(new Date(ano, mes - 1, dia, d.getHours(), d.getMinutes(), 0));

        const refNovoAjuste = doc(collection(db, 'ajustesDiarios'));
        await setDoc(refNovoAjuste, {
          usuarioUid: uidAtivo,
          usuarioNome: usuarioAtivo.nome,
          tipo: 'perdao_ociosidade',
          isPerdao: true,
          pontos: pontosParaDevolver,
          motivo: 'Exclusão manual de multa de ociosidade',
          dataOperacao: dataOperacaoAtiva,
          createdAt: timestampFirebase,
          updatedAt: serverTimestamp()
        });
      } else {
        alert("Esta marcação não pode ser excluída diretamente.");
      }
    } catch (error) {
      alert("Erro ao excluir marcação: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 5, 10, 0.78)',
        zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center',
        backdropFilter: 'blur(8px)', fontFamily: "'Inter', sans-serif"
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-card, #1e293b)', width: '95%', maxWidth: '960px',
          maxHeight: '90vh', borderRadius: '18px', display: 'flex', flexDirection: 'column',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* CABEÇALHO */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '10px', borderRadius: '12px' }}>
              <Edit2 size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-main, #fff)', fontSize: '1.2rem', fontWeight: 800 }}>Gestão e Edição de Marcações</h3>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Ajuste timestamps, pontos e eventos da linha do tempo</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* CORPO DIVIDIDO: LISTA DE USUÁRIOS + TIMELINE DO USUÁRIO */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* LADO ESQUERDO: SELEÇÃO DE USUÁRIO */}
          <div style={{ width: '260px', borderRight: '1px solid var(--border-color)', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '6px 8px' }}>Conferentes</span>
            {(rankingData || []).map((user) => {
              const uidUser = user.uid || user.nome;
              const isSelected = uidUser === (usuarioSelecionadoUid || rankingData[0]?.uid || rankingData[0]?.nome);

              return (
                <div 
                  key={uidUser}
                  onClick={() => { setUsuarioSelecionadoUid(uidUser); setModoEdicao(false); }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: `1px solid ${isSelected ? '#3b82f6' : 'transparent'}`
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? 'var(--text-main, #fff)' : 'var(--text-muted)' }}>
                    {user.nome}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#38bdf8' }}>
                    {user.pontos} pts
                  </span>
                </div>
              );
            })}
          </div>

          {/* LADO DIREITO: LISTAGEM DE MARCAÇÕES / FORMULÁRIO */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px' }}>
            
            {modoEdicao ? (
              /* FORMULÁRIO DE CRIAÇÃO / EDIÇÃO */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: 800 }}>
                  {eventoEmEdicao ? 'Editar Marcação' : 'Adicionar Nova Marcação Manual'}
                </h4>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Horário da Marcação</label>
                  <input 
                    type="time" 
                    value={formEvento.hora} 
                    onChange={e => setFormEvento({...formEvento, hora: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '1.05rem' }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Pontuação (+ ou -)</label>
                  <input 
                    type="number" 
                    value={formEvento.pontos} 
                    onChange={e => setFormEvento({...formEvento, pontos: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '1rem' }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Motivo / Descrição</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Separação urgente, Bonificação, Ajuste..."
                    value={formEvento.motivo} 
                    onChange={e => setFormEvento({...formEvento, motivo: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem' }} 
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button 
                    onClick={() => setModoEdicao(false)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSalvarEvento}
                    disabled={isSaving}
                    style={{ flex: 1.4, padding: '10px', borderRadius: '8px', background: '#3b82f6', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                  >
                    {isSaving ? <Loader2 size={16} className="fa-spin" /> : <Check size={16} />} Salvar Marcação
                  </button>
                </div>
              </div>
            ) : (
              /* LISTAGEM DE MARCAÇÕES DO USUÁRIO */
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: 800 }}>Linha do Tempo: {usuarioAtivo?.nome}</h4>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total de {usuarioAtivo?.pointEvents?.length || 0} registros hoje</span>
                  </div>
                  
                  <button 
                    onClick={handleAbrirCriar}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: '#3b82f6', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    <Plus size={15} /> Nova Marcação
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '6px' }}>
                  {(!usuarioAtivo?.pointEvents || usuarioAtivo.pointEvents.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Nenhuma marcação encontrada para este conferente hoje.
                    </div>
                  ) : (
                    usuarioAtivo.pointEvents.map((ev, idx) => (
                      <div 
                        key={idx}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-input, rgba(255,255,255,0.03))',
                          border: '1px solid var(--border-color, rgba(255,255,255,0.08))'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.9rem', color: '#38bdf8' }}>
                            {formatarHoraMs(ev.time)}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {getIconeTipo(ev.sourceType)}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)' }}>{ev.label}</div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{ev.detalhe}</div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: ev.delta > 0 ? '#10b981' : (ev.delta < 0 ? '#ef4444' : 'var(--text-muted)') }}>
                            {ev.delta > 0 ? `+${ev.delta}` : ev.delta} pts
                          </span>

                          <div style={{ display: 'flex', gap: '6px' }}>
  {ev.sourceId && (
    <button 
      onClick={() => handleAbrirEditar(ev)}
      title="Editar Horário/Pontos"
      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
    >
      <Edit2 size={14} />
    </button>
  )}
  
  {(ev.sourceId || (ev.sourceType === 'calculado' && ev.delta < 0)) && (
    <button 
      onClick={() => handleExcluirEvento(ev)}
      title="Excluir Marcação / Perdoar Ociosidade"
      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
    >
      <Trash2 size={14} />
    </button>
  )}
</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}