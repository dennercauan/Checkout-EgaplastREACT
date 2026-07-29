// src/pages/Operacao.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, updateDoc,
  query, where, onSnapshot, collectionGroup, Timestamp, deleteField 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase'; 
import { 
  ArrowLeft, Plus, FileText, CheckCircle2, 
  Clock, MoreVertical, Search, Boxes, X, User, Trash2, PackagePlus, Loader2, Edit, Check, Pause, Play, AlertCircle, MapPin, UploadCloud,
  Trophy, Medal, Factory, Package // <-- Novos ícones importados
} from 'lucide-react';
import '../css/Operacao.css';

export default function Operacao({ isAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const dataUrl = queryParams.get('date'); 
  const today = new Date();
  const dataHojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dataOperacaoAtiva = dataUrl || dataHojeStr;

  const [titulo, setTitulo] = useState('Carregando...');
  const [localUser, setLocalUser] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null); 
  
  const [showCaixasModal, setShowCaixasModal] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [docIndexSelecionado, setDocIndexSelecionado] = useState(0);
  const [caixasPrevia, setCaixasPrevia] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [pedidoToPause, setPedidoToPause] = useState(null);

  const [currentTime, setCurrentTime] = useState(Date.now());

  const [pedidosNovos, setPedidosNovos] = useState([]);
  const [pedidosLegados, setPedidosLegados] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [romaneio, setRomaneio] = useState('');
  const [loja, setLoja] = useState('');
  const [local, setLocal] = useState('DF');
  const [uf, setUf] = useState('');
  const [isCaixaMaster, setIsCaixaMaster] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [docTipo, setDocTipo] = useState('Nota Fiscal');
  const [docResponsavel, setDocResponsavel] = useState(''); 
  const [docsTemporarios, setDocsTemporarios] = useState([]);

  // ==========================================
  // DADOS FICTÍCIOS PARA O ESBOÇO DO RANKING
  // ==========================================
  const rankingMock = [
    { posicao: 1, nome: 'Wanderson', skus: 3450, op: 12, pontos: 15420 },
    { posicao: 2, nome: 'Denner', skus: 3120, op: 9, pontos: 12890 },
    { posicao: 3, nome: 'Carlos', skus: 2100, op: 5, pontos: 9400 },
    { posicao: 4, nome: 'Ana', skus: 1850, op: 2, pontos: 7100 },
  ];

  useEffect(() => {
    const timerInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timerInterval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setLocalUser(currentUser);
        setDocResponsavel(String(currentUser.email).toLowerCase().trim());
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const [ano, mes, dia] = dataOperacaoAtiva.split('-');
    setTitulo(`Operação (${dia}/${mes})`);
    
    const fetchUsuarios = async () => {
      try {
        const snap = await getDocs(collection(db, 'usuarios'));
        const lista = [];
        snap.forEach(doc => {
          if(doc.data().email) lista.push({ uid: doc.id, email: String(doc.data().email).toLowerCase().trim() });
        });
        setUsuarios(lista);
      } catch (error) { console.error("Erro ao buscar usuários:", error); }
    };
    fetchUsuarios();
  }, [dataOperacaoAtiva]);

  useEffect(() => {
    if (!localUser?.uid) return;

    const [ano, mes, dia] = dataOperacaoAtiva.split('-');
    const startOfDay = new Date(ano, mes - 1, dia, 0, 0, 0);
    const endOfDay = new Date(ano, mes - 1, dia, 23, 59, 59);

    const qNovo = query(collection(db, 'pedidos'), where('dataOperacao', '==', dataOperacaoAtiva), where('uidsVinculados', 'array-contains', localUser.uid));
    const unsubNovo = onSnapshot(qNovo, (snap) => {
      setPedidosNovos(snap.docs.map(doc => ({ id: doc.id, _isLegacy: false, ...doc.data() })));
    });

    const qLegado = query(collectionGroup(db, 'pedidosMultiDocumento'), where('createdAt', '>=', Timestamp.fromDate(startOfDay)), where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
    const unsubLegado = onSnapshot(qLegado, (snap) => {
      const legados = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (isAdmin || data.uidsVinculados?.includes(localUser.uid) || data.criadorUid === localUser.uid) {
          const pathSegments = doc.ref.path.split('/');
          const elemIdOriginal = pathSegments.length > 3 ? pathSegments[3] : null;
          legados.push({ id: doc.id, _isLegacy: true, elementoIdOriginal: elemIdOriginal, ...data });
        }
      });
      setPedidosLegados(legados);
    });

    return () => { unsubNovo(); unsubLegado(); };
  }, [localUser, dataOperacaoAtiva, isAdmin]);

  const pedidosProcessados = useMemo(() => {
    return [...pedidosNovos, ...pedidosLegados].sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  }, [pedidosNovos, pedidosLegados]);

  const totalCaixasHoje = useMemo(() => {
    let count = 0;
    pedidosProcessados.forEach(p => { (p.documentos || []).forEach(d => { count += (d.caixas || []).length; }); });
    return count;
  }, [pedidosProcessados]);

  const atividadeAtual = useMemo(() => {
    const pendente = pedidosProcessados.find(p => !p.efetivado);
    if (!pendente) return null;
    let skus = 0;
    (pendente.documentos || []).forEach(d => {
      (d.caixas || []).forEach(cx => { (cx.produtos || []).forEach(prod => { skus += parseInt(prod.quantidade) || 0; }); });
    });
    return { ...pendente, totalSkus: skus };
  }, [pedidosProcessados]);

  useEffect(() => {
    const closeMenu = () => setDropdownOpen(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  const formatarCronometro = (pedido) => {
    if (!pedido.createdAt) return "00:00:00";
    const start = pedido.createdAt.toMillis ? pedido.createdAt.toMillis() : pedido.createdAt;
    const totalPaused = pedido.totalPausedTime || 0;
    
    let end;
    if (pedido.efetivado && pedido.completedAt) {
      end = pedido.completedAt.toMillis ? pedido.completedAt.toMillis() : pedido.completedAt;
    } else if (pedido.isPaused && pedido.lastPauseStart) {
      end = pedido.lastPauseStart; 
    } else {
      end = currentTime; 
    }

    const diff = Math.max(0, end - start - totalPaused);
    const hh = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const obterReferenciaDocumento = (pedido) => {
    return pedido._isLegacy
      ? doc(db, 'usuarios', pedido.criadorUid, 'elementos', pedido.elementoIdOriginal, 'pedidosMultiDocumento', pedido.id)
      : doc(db, 'pedidos', pedido.id);
  };

  const handleToggleEfetivado = async (pedido) => {
    if (pedido.isPaused) return alert("Retome o pedido antes de finalizá-lo.");
    const novoStatus = !pedido.efetivado;
    const ref = obterReferenciaDocumento(pedido);
    const payload = { efetivado: novoStatus };
    if (novoStatus) payload.completedAt = serverTimestamp();
    else payload.completedAt = deleteField(); 
    await updateDoc(ref, payload);
  };

  const handleDeletePedido = async (pedido) => {
    if (!window.confirm("Tem certeza que deseja excluir este pedido definitivamente?")) return;
    const ref = obterReferenciaDocumento(pedido);
    await deleteDoc(ref);
  };

  const handleAbrirCaixas = (pedido) => {
    setPedidoSelecionado(pedido);
    setDocIndexSelecionado(0); 
    const caixasExistentes = pedido.documentos?.[0]?.caixas || [];
    setCaixasPrevia(caixasExistentes);
    setShowCaixasModal(true);
  };

  const handleDocSelectionChange = (e) => {
    const idx = parseInt(e.target.value);
    setDocIndexSelecionado(idx);
    setCaixasPrevia(pedidoSelecionado.documentos?.[idx]?.caixas || []);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length <= 1) { alert("Arquivo vazio."); setIsUploading(false); return; }

        const headers = lines[0].split(';').map(h => h.trim().toUpperCase());
        const idxCaixa = headers.findIndex(h => h.includes('CAIXA') || h.includes('EMBALAGEM'));
        const idxSKU = headers.findIndex(h => h.includes('SKU') || h.includes('CÓDIGO') || h.includes('COD'));
        const idxQtd = headers.findIndex(h => h.includes('QTD') || h.includes('QUANTIDADE'));
        const idxPeso = headers.findIndex(h => h.includes('PESO'));

        if (idxCaixa === -1 || idxSKU === -1 || idxQtd === -1) {
           alert("Formato inválido. Precisa de Caixa, SKU e Quantidade (por ponto e vírgula).");
           setIsUploading(false); return;
        }

        const mapaCaixas = {};

        for (let i = 1; i < lines.length; i++) {
          const colunas = lines[i].split(';');
          if (colunas.length < 3) continue;

          const numCaixa = colunas[idxCaixa]?.trim();
          const sku = colunas[idxSKU]?.trim();
          const qtd = parseInt(colunas[idxQtd]?.trim()) || 0;
          const pesoStr = idxPeso !== -1 ? colunas[idxPeso]?.trim().replace(',', '.') : "0";
          const peso = parseFloat(pesoStr) || 0;

          if (!numCaixa || !sku || qtd === 0) continue;

          if (!mapaCaixas[numCaixa]) { mapaCaixas[numCaixa] = { num: numCaixa, peso: 0, produtos: [] }; }
          mapaCaixas[numCaixa].produtos.push({ sku, quantidade: qtd });
          mapaCaixas[numCaixa].peso += peso;
        }

        const arrayCaixasFormatadas = Object.values(mapaCaixas).map(cx => ({ ...cx, peso: cx.peso.toFixed(2) }));
        setCaixasPrevia(arrayCaixasFormatadas);
        
      } catch (error) { alert("Ocorreu um erro ao ler o arquivo."); } finally { setIsUploading(false); }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const handleSalvarCaixasFirebase = async () => {
    if (!pedidoSelecionado) return;
    setIsSaving(true);
    try {
      const ref = obterReferenciaDocumento(pedidoSelecionado);
      const novosDocs = [...pedidoSelecionado.documentos];
      novosDocs[docIndexSelecionado] = { ...novosDocs[docIndexSelecionado], caixas: caixasPrevia };
      await updateDoc(ref, { documentos: novosDocs });
      setShowCaixasModal(false);
    } catch (error) { alert("Erro ao sincronizar caixas."); } finally { setIsSaving(false); }
  };

  const handleOpenPauseModal = (pedido) => {
    setPedidoToPause(pedido);
    setPauseReason(pedido.motivoPausa || '');
    setShowPauseModal(true); setDropdownOpen(null);
  };

  const handleConfirmPause = async () => {
    if (!pauseReason.trim()) return alert("Informe o motivo da pausa.");
    const ref = obterReferenciaDocumento(pedidoToPause);
    await updateDoc(ref, { isPaused: true, motivoPausa: pauseReason, lastPauseStart: Date.now() });
    setShowPauseModal(false); setPedidoToPause(null); setPauseReason('');
  };

  const handleResumePedido = async (pedido) => {
    const ref = obterReferenciaDocumento(pedido);
    const lastPause = pedido.lastPauseStart || Date.now();
    const timePaused = Date.now() - lastPause;
    const newTotalPaused = (pedido.totalPausedTime || 0) + timePaused;
    await updateDoc(ref, { isPaused: false, motivoPausa: deleteField(), lastPauseStart: deleteField(), totalPausedTime: newTotalPaused });
    setDropdownOpen(null);
  };

  const handleEditPedido = (pedido) => {
    if (pedido._isLegacy) return alert("Pedidos legados não podem ser editados. Recrie no novo formato.");
    setEditingId(pedido.id);
    setRomaneio(pedido.romaneio || ''); setLoja(pedido.loja || ''); setLocal(pedido.local || 'DF');
    setUf(pedido.uf || ''); setIsCaixaMaster(pedido.isCaixaMaster || false); setObservacoes(pedido.observacoes || '');
    const docsRemontados = (pedido.documentos || []).map((doc, index) => ({ ...doc, idTemp: Date.now() + index }));
    setDocsTemporarios(docsRemontados);
    setShowModal(true); setDropdownOpen(null);
  };

  const handleOpenModal = () => {
    if (localUser?.email) setDocResponsavel(String(localUser.email).toLowerCase().trim());
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => { setShowModal(false); setIsClosingModal(false); resetForm(); }, 350); 
  };

  const resetForm = () => {
    setEditingId(null); setRomaneio(''); setLoja(''); setLocal('DF'); setUf('');
    setIsCaixaMaster(false); setObservacoes(''); setDocsTemporarios([]); setDocTipo('Nota Fiscal');
    setDocResponsavel(localUser?.email ? String(localUser.email).toLowerCase().trim() : ''); 
  };

  const handleAddDoc = () => {
    if (!docResponsavel) return alert("Selecione um responsável.");
    const novoDoc = { idTemp: Date.now(), tipo: docTipo, responsavel: docResponsavel, responsaveis: [docResponsavel], caixas: [] };
    setDocsTemporarios([...docsTemporarios, novoDoc]);
  };

  const handleSavePedido = async () => {
    if (!romaneio) return alert("Informe o Nº do Romaneio.");
    if (docsTemporarios.length === 0) return alert("Adicione pelo menos um documento.");
    if (!localUser) return alert("Usuário não logado.");

    setIsSaving(true);
    try {
      const documentosLimpos = docsTemporarios.map(({ idTemp, ...rest }) => rest);
      let emailsEnvolvidos = [String(localUser.email).toLowerCase().trim()]; 
      documentosLimpos.forEach(d => { if (d.responsavel) emailsEnvolvidos.push(String(d.responsavel).toLowerCase().trim()); });
      const emailsUnicos = [...new Set(emailsEnvolvidos)];
      const uidsVinculados = emailsUnicos.map(email => {
         const found = usuarios.find(u => u.email === email);
         return found ? found.uid : null;
      }).filter(Boolean); 

      if (editingId) {
        const ref = doc(db, 'pedidos', editingId);
        await updateDoc(ref, { romaneio, loja, local, uf, observacoes, isCaixaMaster, documentos: documentosLimpos, uidsVinculados });
      } else {
        const novoPedido = {
          romaneio, loja, local, uf, observacoes, isCaixaMaster, documentos: documentosLimpos,
          criadorUid: localUser.uid, criadorEmail: localUser.email, dataOperacao: dataOperacaoAtiva, 
          uidsVinculados, createdAt: serverTimestamp(), efetivado: false, isPaused: false, totalPausedTime: 0
        };
        await addDoc(collection(db, 'pedidos'), novoPedido);
      }
      handleCloseModal();
    } catch (error) { alert("Houve um erro ao salvar o pedido."); } finally { setIsSaving(false); }
  };

  return (
    <div className="op-wrapper">
      <header className="op-header">
        <div className="op-title-group">
          <button className="btn-back" onClick={() => navigate('/dashboard')} title="Voltar ao Painel"><ArrowLeft size={24} /></button>
          <div><h1>{titulo}</h1><span><FileText size={14}/> Gerenciamento de Romaneios</span></div>
        </div>
        <div className="op-actions">
          <div className="search-bar-op"><Search size={16} /><input type="text" placeholder="Buscar romaneio..." /></div>
          <button className="btn-new-order" onClick={handleOpenModal}><Plus size={18} /> Novo Pedido</button>
        </div>
      </header>

      <main className="op-main-content">
        <section className="op-live-section">
          {atividadeAtual ? (
            <div className={`live-tracker-card ${atividadeAtual.isPaused ? 'paused' : ''}`}>
              <div className="live-badge">
                {atividadeAtual.isPaused ? <><AlertCircle size={14}/> PAUSADO</> : <><div className="pulse-dot"></div> EM SEPARAÇÃO</>}
              </div>
              <h2 className="live-romaneio">{atividadeAtual.romaneio}</h2>
              <p className="live-loja">{atividadeAtual.loja || 'Destino Padrão'}</p>
              {atividadeAtual.isPaused && <div className="pause-reason-box"><strong>Motivo da Pausa:</strong> {atividadeAtual.motivoPausa}</div>}
              <div className="live-timer"><Clock size={40} className="timer-icon" /><div className="timer-display">{formatarCronometro(atividadeAtual)}</div></div>
              <div className="live-stats">
                <div><strong>{atividadeAtual.totalSkus}</strong> SKUs Mapeados</div>
                <div><strong>{atividadeAtual.documentos?.reduce((acc, d) => acc + (d.caixas?.length || 0), 0)}</strong> Caixas</div>
              </div>
              <div className="live-actions">
                {atividadeAtual.isPaused ? (
                  <button className="btn-live-resume" onClick={() => handleResumePedido(atividadeAtual)}><Play size={18}/> Retomar Separação</button>
                ) : (
                  <>
                    <button className="btn-live-pause" onClick={() => handleOpenPauseModal(atividadeAtual)}><Pause size={18}/> Pausar</button>
                    <button className="btn-live-caixas" onClick={() => handleAbrirCaixas(atividadeAtual)}><Boxes size={18}/> Caixas</button>
                    <button className="btn-live-finish" onClick={() => handleToggleEfetivado(atividadeAtual)}><CheckCircle2 size={18}/> Finalizar</button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="live-tracker-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', background: '#f8fafc', borderStyle: 'dashed' }}>
               <CheckCircle2 size={48} color="#94a3b8" style={{ marginBottom: '15px' }} />
               <h3 style={{ color: '#475569', margin: '0 0 5px 0' }}>Tudo Limpo!</h3>
               <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>Não há nenhum pedido em<br/>andamento no momento.</p>
            </div>
          )}

          <div className="op-kpi-grid">
            <div className="op-kpi-card"><span className="kpi-label">Pedidos Hoje</span><span className="kpi-val">{pedidosProcessados.length}</span></div>
            <div className="op-kpi-card"><span className="kpi-label">Caixas Fechadas</span><span className="kpi-val" style={{color: 'var(--secondary)'}}>{totalCaixasHoje}</span></div>
          </div>
        </section>

        <section className="op-history-section">
          <div className="history-header">
            <h3><CheckCircle2 size={18} color="var(--primary)"/> Romaneios Processados</h3>
            <span className="history-count">{pedidosProcessados.filter(p => p.efetivado).length} finalizados</span>
          </div>
          
          {/* TABELA COM SCROLL FIXO */}
          <div className="op-table-wrapper scrollable-table-wrapper">
            <table className="op-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '100px' }}>Romaneio</th>
                  <th style={{ minWidth: '160px' }}>Destino / UF</th>
                  <th style={{ minWidth: '180px' }}>Documentos</th>
                  <th style={{ minWidth: '200px' }}>Observações</th>
                  <th style={{ minWidth: '220px' }}>Resumo Caixas</th>
                  <th style={{ textAlign: 'right', minWidth: '80px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidosProcessados.length === 0 ? (
                  <tr><td colSpan="6" style={{textAlign: 'center', padding: '30px', color: '#94a3b8'}}>Nenhum pedido processado hoje.</td></tr>
                ) : (
                  pedidosProcessados.map(pedido => {
                    let totalSkus = 0;
                    const cxMap = {};

                    (pedido.documentos || []).forEach(d => {
                      (d.caixas || []).forEach(cx => {
                         (cx.produtos || []).forEach(p => totalSkus += parseInt(p.quantidade) || 0);
                         let n = cx.num || "CX";
                         if(!cxMap[n]) cxMap[n] = { qtd: 0, peso: 0 };
                         cxMap[n].qtd++; cxMap[n].peso += parseFloat(cx.peso) || 0;
                      });
                    });

                    const temPermissao = isAdmin || pedido.criadorUid === localUser?.uid;

                    let statusBadge;
                    if (pedido.efetivado) {
                      statusBadge = <div className="time-badge success"><Check size={12} style={{marginRight:'3px', display:'inline'}}/> Finalizado</div>;
                    } else if (pedido.isPaused) {
                      statusBadge = <div className="time-badge paused" title={pedido.motivoPausa}><Pause size={12} style={{marginRight:'3px', display:'inline'}}/> Pausado</div>;
                    } else {
                      statusBadge = <div className="time-badge pending"><Clock size={12} style={{marginRight:'3px', display:'inline'}}/> {formatarCronometro(pedido)}</div>;
                    }

                    return (
                      <tr key={pedido.id} className={pedido.efetivado ? "efetivado" : ""} style={{ verticalAlign: 'middle' }}>
                        <td style={{ verticalAlign: 'middle', padding: '16px 12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{pedido.romaneio || 'S/N'}</strong>
                              {pedido._isLegacy && <span style={{fontSize: '10px', color: '#cbd5e1', marginLeft: '4px'}}>(Legado)</span>}
                            </div>
                            {statusBadge}
                          </div>
                        </td>
                        
                        <td style={{ verticalAlign: 'middle', padding: '16px 12px' }}>
                          <div style={{fontWeight: 600, color: '#334155', whiteSpace: 'normal', fontSize: '13px'}}>{pedido.loja || '---'}</div>
                          <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                            <MapPin size={12} /> 
                            {pedido.local || 'DF'} {pedido.uf ? `- ${pedido.uf}` : ''}
                          </div>
                        </td>
                        
                        <td style={{ verticalAlign: 'middle', padding: '16px 12px' }}>
                          <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                            {(pedido.documentos || []).map((d, i) => (
                              <div key={i} style={{ 
                                background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', 
                                padding: '3px 6px', borderRadius: '4px', display: 'flex', 
                                justifyContent: 'space-between', alignItems: 'center', gap: '8px', lineHeight: '1.2'
                              }}>
                                <span style={{ fontWeight: 600 }}>{d.tipo}</span>
                                <span style={{ opacity: 0.7 }}>{d.responsavel?.split('@')[0]}</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td style={{ verticalAlign: 'middle', padding: '16px 12px', whiteSpace: 'normal', fontSize: '12px', color: '#64748b' }}>
                           {pedido.observacoes ? pedido.observacoes : <span style={{opacity: 0.4, fontStyle: 'italic'}}>Nenhuma observação...</span>}
                        </td>
                        
                        <td style={{ verticalAlign: 'middle', padding: '16px 12px' }}>
                          <div style={{ marginBottom: '6px' }}>
                            <span className="sku-badge" style={{ margin: 0, padding: '2px 6px', fontSize: '11px' }}>
                              {totalSkus} SKUs Mapeados
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {Object.keys(cxMap).length === 0 ? (
                              <span style={{color: '#94a3b8', fontSize: '11px', fontStyle: 'italic'}}>Sem caixas finalizadas</span>
                            ) : (
                              Object.keys(cxMap).map((k, idx) => (
                                <div key={idx} style={{ 
                                  fontSize: '11px', color: '#475569', display: 'flex', justifyContent: 'space-between', 
                                  alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '2px 6px', 
                                  borderRadius: '4px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', lineHeight: '1.2'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <strong style={{color: 'var(--primary)'}}>{k}</strong> 
                                    <span style={{color: '#94a3b8', fontSize: '10px'}}>({cxMap[k].peso.toFixed(1)}kg)</span>
                                  </div>
                                  <span style={{fontWeight: 700, color: '#334155'}}>{cxMap[k].qtd} Un</span>
                                </div>
                              ))
                            )}
                          </div>
                        </td>

                        <td className="actions-cell" style={{ verticalAlign: 'middle', padding: '16px 12px', position: 'relative' }}>
                          <button className="action-btn btn-caixas" title="Abrir Caixas" onClick={() => handleAbrirCaixas(pedido)}><Boxes size={16}/></button>
                          
                          <div style={{position: 'relative', display: 'inline-block'}}>
                            <button className="action-btn btn-edit" title="Ações" onClick={(e) => { e.stopPropagation(); setDropdownOpen(dropdownOpen === pedido.id ? null : pedido.id); }}>
                              <MoreVertical size={16}/>
                            </button>
                            
                            {dropdownOpen === pedido.id && (
                              <div className="table-dropdown-menu">
                                {!pedido.efetivado && (
                                  <>
                                    {pedido.isPaused ? (
                                      <button className="dropdown-item" style={{color: '#10b981'}} onClick={() => handleResumePedido(pedido)}><Play size={14}/> Retomar</button>
                                    ) : (
                                      <button className="dropdown-item" style={{color: '#f59e0b'}} onClick={() => handleOpenPauseModal(pedido)}><Pause size={14}/> Pausar Timer</button>
                                    )}
                                    <div className="dropdown-divider"></div>
                                  </>
                                )}
                                <button className="dropdown-item" onClick={() => handleToggleEfetivado(pedido)}>
                                  {pedido.efetivado ? <><X size={14}/> Desfazer Efetivação</> : <><Check size={14}/> Forçar Efetivação</>}
                                </button>
                                {temPermissao && (
                                  <>
                                    <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); handleEditPedido(pedido); }}><Edit size={14}/> Editar Dados</button>
                                    <div className="dropdown-divider"></div>
                                    <button className="dropdown-item text-danger" onClick={() => handleDeletePedido(pedido)}><Trash2 size={14}/> Excluir Pedido</button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ==========================================
            ZONA INFERIOR: RANKING E INDICADORES (NOVO)
            ========================================== */}
        <section className="op-bottom-zone">
            
            {/* RANKING DIÁRIO (Destaque Principal) */}
            <div className="op-ranking-container">
              <div className="ranking-header">
                <h3><Trophy size={20} color="#eab308" style={{marginRight: '8px'}}/> Ranking Diário - Produtividade</h3>
                <span className="ranking-subtitle">Top Conferentes do Dia</span>
              </div>
              
              <div className="ranking-list">
                {rankingMock.map((user, idx) => (
                  <div key={idx} className={`ranking-item ${idx === 0 ? 'first-place' : ''}`}>
                    <div className="ranking-pos">
                      {idx === 0 ? <Medal size={24} color="#eab308" /> : 
                       idx === 1 ? <Medal size={20} color="#94a3b8" /> : 
                       idx === 2 ? <Medal size={20} color="#b45309" /> : 
                       <span className="pos-number">{user.posicao}º</span>}
                    </div>
                    
                    <div className="ranking-avatar">
                      <div className="avatar-circle">{user.nome.charAt(0)}</div>
                    </div>
                    
                    <div className="ranking-info">
                      <strong className="ranking-name">{user.nome}</strong>
                      <div className="ranking-metrics">
                         <span><CheckCircle2 size={12}/> {user.skus} SKUs</span>
                         <span><Factory size={12}/> {user.op} O.P.s</span>
                      </div>
                    </div>
                    
                    <div className="ranking-score">
                      <div className="score-value">{user.pontos.toLocaleString()} pts</div>
                      <div className="score-bar"><div className="score-fill" style={{width: `${(user.pontos / rankingMock[0].pontos) * 100}%`}}></div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CARDS LATERAIS (O.P. e Master) */}
            <div className="op-side-indicators">
                
                <div className="indicator-card op-card">
                  <div className="indicator-icon" style={{background: '#e0e7ff', color: '#4f46e5'}}><Factory size={24}/></div>
                  <div className="indicator-content">
                    <h4>Ordens de Produção</h4>
                    <span className="indicator-value">Em breve</span>
                    <p>Controle e pesagem de O.P.s</p>
                  </div>
                  <button className="indicator-btn">Gerenciar</button>
                </div>

                <div className="indicator-card master-card">
                  <div className="indicator-icon" style={{background: '#fce7f3', color: '#db2777'}}><Package size={24}/></div>
                  <div className="indicator-content">
                    <h4>Caixas Master</h4>
                    <span className="indicator-value">Em breve</span>
                    <p>Agrupamento e logística</p>
                  </div>
                  <button className="indicator-btn">Detalhes</button>
                </div>

            </div>
        </section>

      </main>

      {/* ==========================================
          MODAIS GERAIS (PAUSA, NOVO PEDIDO, WMS)
          ========================================== */}
      
      {showPauseModal && (
        <div className="op-modal-overlay">
          <div className="op-modal-content" style={{maxWidth: '400px'}} onClick={(e) => e.stopPropagation()}>
            <div className="op-modal-header" style={{borderBottom: 'none', paddingBottom: '10px'}}>
              <div className="op-modal-title"><div className="icon-wrap" style={{background: '#fef3c7', color: '#d97706'}}><Pause size={24}/></div><div><h2 style={{color: '#d97706'}}>Pausar Separação</h2><p>O tempo será congelado.</p></div></div>
              <button className="btn-close-modal" onClick={() => setShowPauseModal(false)}><X size={24}/></button>
            </div>
            <div className="op-modal-body" style={{paddingTop: '0'}}>
              <div className="input-group-op"><label>Motivo da Pausa</label><input type="text" placeholder="Ex: Queda de energia, Aguardando empilhadeira..." autoFocus value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} /></div>
            </div>
            <div className="op-modal-footer">
              <button className="btn-cancel-op" onClick={() => setShowPauseModal(false)}>Cancelar</button>
              <button className="btn-save-op" style={{background: '#f59e0b'}} onClick={handleConfirmPause}>Confirmar Pausa</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className={`op-modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={!isSaving ? handleCloseModal : null}>
          <div className="op-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="op-modal-header">
              <div className="op-modal-title"><div className="icon-wrap"><PackagePlus size={24} color="var(--primary)"/></div><div><h2>{editingId ? 'Editar Pedido' : 'Configurar Novo Pedido'}</h2><p>Preencha os dados e atribua os documentos.</p></div></div>
              {!isSaving && <button className="btn-close-modal" onClick={handleCloseModal}><X size={24}/></button>}
            </div>
            <div className="op-modal-body">
              <div className="form-grid-2"><div className="input-group-op"><label>Nº Romaneio</label><input type="text" placeholder="Ex: 12345" autoFocus value={romaneio} onChange={(e) => setRomaneio(e.target.value)} disabled={isSaving}/></div><div className="input-group-op" style={{ flex: 1.5 }}><label>Nome da Loja / Destino</label><input type="text" placeholder="Ex: Loja Central" value={loja} onChange={(e) => setLoja(e.target.value)} disabled={isSaving}/></div></div>
              <div className="form-grid-3"><div className="input-group-op"><label>Local</label><select value={local} onChange={(e) => setLocal(e.target.value)} disabled={isSaving}><option value="DF">DF</option><option value="Fora">Fora</option></select></div><div className="input-group-op"><label>UF</label><input type="text" placeholder="Ex: GO" maxLength="2" style={{ textTransform: 'uppercase' }} value={uf} onChange={(e) => setUf(e.target.value)} disabled={isSaving}/></div><div className="input-group-op master-toggle-group"><label className="master-toggle"><input type="checkbox" checked={isCaixaMaster} onChange={(e) => setIsCaixaMaster(e.target.checked)} disabled={isSaving}/><span className="toggle-slider"></span><span className="toggle-label">Caixa Master</span></label></div></div>
              <div className="input-group-op"><label>Observações</label><textarea placeholder="Alguma instrução especial?" rows="2" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={isSaving}></textarea></div>
              <div className="docs-injection-area">
                <h4 className="docs-area-title"><FileText size={16}/> Documentos Vinculados</h4>
                <div className="docs-form-row"><div className="input-group-op"><label>Tipo de Doc.</label><select value={docTipo} onChange={(e) => setDocTipo(e.target.value)} disabled={isSaving}><option value="Nota Fiscal">Nota Fiscal</option><option value="Minuta">Minuta</option><option value="Bonificação">Bonificação</option><option value="Troca">Troca</option></select></div><div className="input-group-op" style={{ flex: 1.5 }}><label>Responsável</label><select value={docResponsavel} onChange={(e) => setDocResponsavel(e.target.value)} disabled={isSaving}><option value="">Selecione...</option>{localUser?.email && !usuarios.some(u => u.email === String(localUser.email).toLowerCase().trim()) && (<option value={String(localUser.email).toLowerCase().trim()}>{String(localUser.email).split('@')[0].toLowerCase()}</option>)}{usuarios.map(u => (<option key={u.uid} value={u.email}>{u.email.split('@')[0]}</option>))}</select></div><button className="btn-add-doc" onClick={handleAddDoc} disabled={isSaving}><Plus size={18}/> Add</button></div>
                <div className="docs-list-preview">{docsTemporarios.length === 0 ? (<div className="empty-docs">Nenhum documento adicionado ainda.</div>) : (docsTemporarios.map(doc => (<div key={doc.idTemp} className="doc-preview-item"><div className="doc-info"><strong>{doc.tipo}</strong><span><User size={12}/> {doc.responsavel}</span></div><button className="btn-remove-doc" onClick={() => handleRemoveDoc(doc.idTemp)} disabled={isSaving}><Trash2 size={16}/></button></div>)))}</div>
              </div>
            </div>
            <div className="op-modal-footer"><button className="btn-cancel-op" onClick={handleCloseModal} disabled={isSaving}>Cancelar</button><button className="btn-save-op" onClick={handleSavePedido} disabled={isSaving}>{isSaving ? <><Loader2 size={18} className="fa-spin" style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : (editingId ? 'Salvar Alterações' : 'Criar Pedido')}</button></div>
          </div>
        </div>
      )}

      {showCaixasModal && (
        <div className="op-modal-overlay">
          <div className="op-modal-content wms-modal-content" style={{maxWidth: '900px', height: 'auto', maxHeight: '90vh'}} onClick={(e) => e.stopPropagation()}>
            <div className="op-modal-header">
              <div className="op-modal-title"><div className="icon-wrap" style={{background: 'var(--primary)'}}><Boxes size={24} color="#fff"/></div><div><h2>Painel de Conferência WMS</h2><p>Importe o CSV do sistema para o Romaneio: <strong>{pedidoSelecionado?.romaneio}</strong></p></div></div>
              <button className="btn-close-modal" onClick={() => setShowCaixasModal(false)} disabled={isSaving}><X size={24}/></button>
            </div>
            <div className="op-modal-body wms-modal-body">
              <div className="wms-doc-selector"><label>Vincular arquivo CSV a qual documento?</label><select value={docIndexSelecionado} onChange={handleDocSelectionChange} disabled={isSaving || isUploading}>{pedidoSelecionado?.documentos?.map((doc, idx) => (<option key={idx} value={idx}>{doc.tipo} (Resp: {doc.responsavel?.split('@')[0]})</option>))}</select></div>
              <div className="wms-upload-zone"><input type="file" accept=".csv" onChange={handleFileUpload} id="csv-upload" disabled={isSaving || isUploading}/><label htmlFor="csv-upload" className={`upload-label ${isUploading ? 'uploading' : ''}`}>{isUploading ? (<><Loader2 size={48} className="fa-spin" style={{ color: 'var(--primary)' }} /> <p>Lendo arquivo...</p></>) : (<><UploadCloud size={48} color="#94a3b8" /> <p>Clique para importar o <strong>CSV do WMS</strong><br/><small>(Separado por ponto e vírgula)</small></p></>)}</label></div>
              <div className="wms-preview-area"><h4><CheckCircle2 size={16}/> Prévia das Caixas Importadas</h4><div className="wms-caixas-grid">{caixasPrevia.length === 0 ? (<div className="wms-empty-state">Nenhuma caixa vinculada a este documento ainda. Importe o CSV acima.</div>) : (caixasPrevia.map((cx, idx) => { const totalSkus = cx.produtos?.reduce((acc, p) => acc + (p.quantidade || 0), 0) || 0; return (<div key={idx} className="wms-caixa-card"><div className="wms-caixa-header"><strong>{cx.num}</strong><span className="wms-peso-badge">{cx.peso} kg</span></div><div className="wms-caixa-body"><span><strong>{cx.produtos?.length || 0}</strong> Itens Únicos</span><span><strong>{totalSkus}</strong> Unid. Totais</span></div></div>); }))}</div></div>
            </div>
            <div className="op-modal-footer"><button className="btn-cancel-op" onClick={() => setShowCaixasModal(false)} disabled={isSaving || isUploading}>Cancelar</button><button className="btn-save-op" onClick={handleSalvarCaixasFirebase} disabled={isSaving || isUploading || caixasPrevia.length === 0}>{isSaving ? <><Loader2 size={18} className="fa-spin" style={{ animation: 'spin 1s linear infinite' }} /> Sincronizando...</> : 'Salvar Importação WMS'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}