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
  Trophy, Medal, Factory, Package, Copy, Info, AlignLeft, ListTree
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
  
  // ESTADOS DO MODAL UNIFICADO (DETALHES + WMS)
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [activeTab, setActiveTab] = useState('resumo'); // Controle das abas ('resumo' ou 'caixas')
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [docIndexSelecionado, setDocIndexSelecionado] = useState(0);
  const [caixasPrevia, setCaixasPrevia] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [pedidoToPause, setPedidoToPause] = useState(null);

  const [showOpModal, setShowOpModal] = useState(false);
  const [opsDoDia, setOpsDoDia] = useState([]);
  const [opForm, setOpForm] = useState({ numero: '', responsavelEmail: '' });
  const [isSavingOp, setIsSavingOp] = useState(false);

  const [showMasterModal, setShowMasterModal] = useState(false);
  const [caixasMaster, setCaixasMaster] = useState([]);
  const [buscaMaster, setBuscaMaster] = useState('');
  const [buscaRomaneio, setBuscaRomaneio] = useState('');
  const [copiedEan, setCopiedEan] = useState(null);
  const [rankingExpandido, setRankingExpandido] = useState(null);

// NOVOS ESTADOS: EXPANSÃO, BUSCA E ADIÇÃO MANUAL
  const [docsExpandidos, setDocsExpandidos] = useState({});
  const [buscasDocumentos, setBuscasDocumentos] = useState({});
  const [showAddCaixaModal, setShowAddCaixaModal] = useState(false);
  const [addCaixaForm, setAddCaixaForm] = useState({ docIdx: null, num: '', peso: '', sku: '', quantidade: '' });

  const toggleDocExpandido = (idx) => {
    setDocsExpandidos(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleBuscaDocumento = (idx, valor) => {
    setBuscasDocumentos(prev => ({ ...prev, [idx]: valor }));
  };

  const handleExcluirCaixa = async (docIdx, caixaOriginalIdx) => {
    if (!window.confirm("Deseja realmente excluir esta caixa e todo o seu conteúdo?")) return;
    setIsSaving(true);
    try {
      const ref = obterReferenciaDocumento(pedidoModal);
      const novosDocs = [...pedidoModal.documentos];
      novosDocs[docIdx].caixas.splice(caixaOriginalIdx, 1);
      await updateDoc(ref, { documentos: novosDocs });
    } catch (error) {
      alert("Erro ao excluir a caixa.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAbrirAddCaixa = (docIdx) => {
    setAddCaixaForm({ docIdx, num: '', peso: '' }); // Removemos sku e quantidade
    setShowAddCaixaModal(true);
  };

  const handleSalvarCaixaManual = async () => {
    if (!addCaixaForm.num) {
      return alert("Preencha o Número/Tipo da Caixa.");
    }
    setIsSaving(true);
    try {
      const ref = obterReferenciaDocumento(pedidoModal);
      const novosDocs = [...pedidoModal.documentos];
      if (!novosDocs[addCaixaForm.docIdx].caixas) novosDocs[addCaixaForm.docIdx].caixas = [];
      
      const numCaixaFormatado = addCaixaForm.num.toUpperCase().trim();
      const pesoNumerico = parseFloat(addCaixaForm.peso.replace(',', '.')) || 0;
      
      // REGRA NOVA: Não mescla! Apenas empurra uma nova caixa separada para a lista
      novosDocs[addCaixaForm.docIdx].caixas.push({
        num: numCaixaFormatado,
        peso: pesoNumerico.toFixed(2),
        produtos: [] // Deixa vazio para não obrigar digitação extensa
      });

      await updateDoc(ref, { documentos: novosDocs });
      setShowAddCaixaModal(false);
    } catch (error) {
      alert("Erro ao salvar a caixa manualmente.");
    } finally {
      setIsSaving(false);
    }
  };

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
  const [isEditingObs, setIsEditingObs] = useState(false);



  useEffect(() => {
    const timerInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timerInterval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setLocalUser(currentUser);
        setDocResponsavel(String(currentUser.email).toLowerCase().trim());
        setOpForm(prev => ({ ...prev, responsavelEmail: String(currentUser.email).toLowerCase().trim() }));
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
    const unsubMaster = onSnapshot(collection(db, 'caixasMaster'), (snap) => {
      const masters = [];
      snap.forEach(doc => { masters.push({ id: doc.id, ...doc.data() }); });
      masters.sort((a, b) => String(a.ref || '').localeCompare(String(b.ref || '')));
      setCaixasMaster(masters);
    });
    return () => unsubMaster();
  }, []);

  useEffect(() => {
    if (!localUser?.uid) return;

    const [ano, mes, dia] = dataOperacaoAtiva.split('-');
    const startOfDay = new Date(ano, mes - 1, dia, 0, 0, 0);
    const endOfDay = new Date(ano, mes - 1, dia, 23, 59, 59);

    // 1. Removemos a trava "where('uidsVinculados', 'array-contains', localUser.uid)"
    // Agora ele baixa TODOS os pedidos do dia para a tela!
    const qNovo = query(collection(db, 'pedidos'), where('dataOperacao', '==', dataOperacaoAtiva));
    const unsubNovo = onSnapshot(qNovo, (snap) => setPedidosNovos(snap.docs.map(doc => ({ id: doc.id, _isLegacy: false, ...doc.data() }))));

    const qLegado = query(collectionGroup(db, 'pedidosMultiDocumento'), where('createdAt', '>=', Timestamp.fromDate(startOfDay)), where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
    const unsubLegado = onSnapshot(qLegado, (snap) => {
      const legados = [];
      snap.forEach(doc => {
        const data = doc.data();
        // 2. Removemos o IF que bloqueava a visão de pedidos legados de outros usuários
        const pathSegments = doc.ref.path.split('/');
        const elemIdOriginal = pathSegments.length > 3 ? pathSegments[3] : null;
        legados.push({ id: doc.id, _isLegacy: true, elementoIdOriginal: elemIdOriginal, ...data });
      });
      setPedidosLegados(legados);
    });

    const qOp = query(collection(db, 'ordensProducao'), where('dataOperacao', '==', dataOperacaoAtiva));
    const unsubOp = onSnapshot(qOp, (snap) => {
      const ops = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      ops.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setOpsDoDia(ops);
    });

    return () => { unsubNovo(); unsubLegado(); unsubOp(); };
  }, [localUser, dataOperacaoAtiva]); // Removido o isAdmin daqui, pois a visão agora é global

  const pedidosProcessados = useMemo(() => {
    return [...pedidosNovos, ...pedidosLegados].sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  }, [pedidosNovos, pedidosLegados]);

  const pedidosFiltrados = useMemo(() => {
    if (!buscaRomaneio.trim()) return pedidosProcessados;
    const termo = buscaRomaneio.toLowerCase();
    return pedidosProcessados.filter(p => 
      String(p.romaneio || '').toLowerCase().includes(termo) ||
      String(p.loja || '').toLowerCase().includes(termo)
    );
  }, [pedidosProcessados, buscaRomaneio]);

  const pedidoModal = useMemo(() => {
    if (!pedidoSelecionado) return null;
    return pedidosProcessados.find(p => p.id === pedidoSelecionado.id) || pedidoSelecionado;
  }, [pedidoSelecionado, pedidosProcessados]);

  const totalCaixasHoje = useMemo(() => {
    let count = 0;
    pedidosProcessados.forEach(p => { (p.documentos || []).forEach(d => { count += (d.caixas || []).length; }); });
    return count;
  }, [pedidosProcessados]);

  const totalPedidosKPI = useMemo(() => {
    // Filtra apenas os pedidos que possuem pelo menos uma Nota Fiscal ou Minuta
    return pedidosProcessados.filter(pedido => {
      return (pedido.documentos || []).some(doc => 
        doc.tipo === 'Nota Fiscal' || doc.tipo === 'Minuta'
      );
    }).length;
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

  const caixasMasterFiltradas = useMemo(() => {
    if (!buscaMaster.trim()) return caixasMaster;
    const term = buscaMaster.toLowerCase();
    return caixasMaster.filter(m => 
      String(m.ref || '').toLowerCase().includes(term) ||
      String(m.nome || '').toLowerCase().includes(term) ||
      (m.variacoes && m.variacoes.some(v => String(v.caixa || '').toLowerCase().includes(term) || String(v.codigoBarras || '').toLowerCase().includes(term)))
    );
  }, [caixasMaster, buscaMaster]);

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

 const handleAbrirDetalhes = (pedido) => {
    setPedidoSelecionado(pedido);
    setDocIndexSelecionado(0);
    setCaixasPrevia([]); 
    setActiveTab('resumo');
    setIsEditingObs(false);
    
    setObservacoes(pedido.observacoes || '');
    setDocsTemporarios((pedido.documentos || []).map((doc, index) => ({ 
       ...doc, 
       idTemp: Date.now() + index,
       dbIndex: index, // O PULO DO GATO: Marcador rastreador do banco de dados
       responsaveis: doc.responsaveis || (doc.responsavel ? [doc.responsavel] : [])
    })));
    if (localUser?.email) setDocResponsavel(String(localUser.email).toLowerCase().trim());
    
    setShowDetalhesModal(true);
  };

 const handleRemoveDoc = (idTemp) => {
    setDocsTemporarios(docsTemporarios.filter(doc => doc.idTemp !== idTemp));
  };

  // NOVAS FUNÇÕES: Adicionar e remover múltiplos colaboradores
  const handleAddResponsavelToDoc = (idTemp, email) => {
     if(!email) return;
     setDocsTemporarios(docsTemporarios.map(d => {
        if(d.idTemp === idTemp) {
           const current = d.responsaveis || [];
           if(!current.includes(email)) return {...d, responsaveis: [...current, email]};
        }
        return d;
     }));
  };

  const handleRemoveResponsavelFromDoc = (idTemp, email) => {
     setDocsTemporarios(docsTemporarios.map(d => {
        if(d.idTemp === idTemp) {
           return {...d, responsaveis: (d.responsaveis || []).filter(r => r !== email)};
        }
        return d;
     }));
  };

  const handleSalvarEdicaoTab1 = async () => {
    if (docsTemporarios.length === 0) return alert("O pedido deve ter pelo menos um documento.");
    setIsSaving(true);
    try {
      const documentosLimpos = docsTemporarios.map(({ idTemp, dbIndex, ...rest }) => {
        // Resgata as caixas do banco de dados em tempo real para não sobrescrever a importação do WMS
        const caixasAtualizadas = (dbIndex !== undefined && pedidoModal.documentos[dbIndex]) 
            ? pedidoModal.documentos[dbIndex].caixas 
            : rest.caixas;
        return { ...rest, caixas: caixasAtualizadas || [] };
      });
      
      let emailsEnvolvidos = [String(pedidoModal.criadorEmail || localUser.email).toLowerCase().trim()];
      documentosLimpos.forEach(d => { 
          if(d.responsaveis && d.responsaveis.length > 0) {
              d.responsaveis.forEach(r => emailsEnvolvidos.push(String(r).toLowerCase().trim()));
          } else if (d.responsavel) {
              emailsEnvolvidos.push(String(d.responsavel).toLowerCase().trim());
          }
      });
      const emailsUnicos = [...new Set(emailsEnvolvidos)];
      const uidsVinculados = emailsUnicos.map(email => {
         const found = usuarios.find(u => u.email === email);
         return found ? found.uid : null;
      }).filter(Boolean);

      const ref = obterReferenciaDocumento(pedidoModal);
      await updateDoc(ref, { observacoes, documentos: documentosLimpos, uidsVinculados });
      setIsEditingObs(false);
      alert("Alterações salvas com sucesso!");
    } catch (error) {
      alert("Erro ao salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocSelectionChange = (e) => {
    const idx = parseInt(e.target.value);
    setDocIndexSelecionado(idx);
    setCaixasPrevia([]); 
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        // Divide por linhas e remove linhas vazias
        const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
        
        if (lines.length <= 1) { 
          alert("Arquivo vazio ou formato desconhecido."); 
          setIsUploading(false); 
          return; 
        }

        const headers = lines[0].split(';').map(h => h.trim().toUpperCase().replace(/"/g, ''));
        
        // Mapeamento Inteligente
        const idxCaixa = headers.findIndex(h => h.includes('TIPO EMBALAGEM') || h.includes('CAIXA') || h === 'DESCRIÇÃO TIPO EMBALAGEM EXPEDIÇÃO');
        const idxSKU = headers.findIndex(h => h === 'PRODUTO' || h.includes('SKU') || h.includes('CÓDIGO') || h === 'COD');
        const idxQtd = headers.findIndex(h => h === 'QUANTIDADE' || h.includes('QTD'));
        const idxPeso = headers.findIndex(h => h === 'PESO EMBALAGEM' || h.includes('PESO'));
        // NOVO: Busca o identificador único da caixa física
        const idxIdEmbalagem = headers.findIndex(h => h.includes('ID EMBALAGEM') || h === 'ID EMBALAGEM EXPEDIÇÃO');

        if (idxCaixa === -1 || idxSKU === -1 || idxQtd === -1) {
           alert("Formato inválido. Não localizamos as colunas de PRODUTO, QUANTIDADE ou DESCRIÇÃO TIPO EMBALAGEM.");
           setIsUploading(false); return;
        }

        const mapaCaixas = {};
        
        for (let i = 1; i < lines.length; i++) {
          const colunas = lines[i].split(';');
          if (colunas.length < 3) continue;
          
          let numCaixa = colunas[idxCaixa]?.trim() || '';
          numCaixa = numCaixa.replace(/"/g, '');
          
          let sku = colunas[idxSKU]?.trim() || '';
          sku = sku.replace(/"/g, '');
          
          const qtdStr = colunas[idxQtd]?.trim().replace(/"/g, '');
          const qtd = parseInt(qtdStr) || 0;
          
          let peso = 0;
          if (idxPeso !== -1 && colunas[idxPeso]) {
             const pesoStr = colunas[idxPeso].trim().replace(/"/g, '').replace(',', '.');
             peso = parseFloat(pesoStr) || 0;
          }

          let idEmbalagem = '';
          if (idxIdEmbalagem !== -1 && colunas[idxIdEmbalagem]) {
              idEmbalagem = colunas[idxIdEmbalagem].trim().replace(/"/g, '');
          }

          if (!numCaixa || !sku || qtd === 0) continue;
          
          // O SEGREDO: Agrupa pelo ID da Embalagem para respeitar caixas físicas diferentes.
          // Se o CSV por acaso não tiver ID, ele usa a linha para não fundir caixas indevidamente.
          const chaveCaixaFisica = idEmbalagem || `${numCaixa}-linha-${i}`;
          
          if (!mapaCaixas[chaveCaixaFisica]) { 
            mapaCaixas[chaveCaixaFisica] = { 
              idExpedicao: idEmbalagem, 
              num: numCaixa, 
              peso: peso, 
              produtos: [] 
            }; 
          }
          
          // Mantém o peso correto da embalagem sem somar bizarrices
          mapaCaixas[chaveCaixaFisica].peso = Math.max(mapaCaixas[chaveCaixaFisica].peso, peso);
          
          // Agrupador de SKU dentro da mesma caixa física:
          const prodExistente = mapaCaixas[chaveCaixaFisica].produtos.find(p => p.sku === sku);
          if (prodExistente) {
             prodExistente.quantidade += qtd;
          } else {
             mapaCaixas[chaveCaixaFisica].produtos.push({ sku, quantidade: qtd });
          }
        }

        // Converte para o array final
        const arrayCaixasFormatadas = Object.values(mapaCaixas).map(cx => ({ 
          ...cx, 
          peso: cx.peso.toFixed(2) 
        }));
        
        setCaixasPrevia(arrayCaixasFormatadas);
      } catch (error) { 
        alert("Ocorreu um erro ao ler o arquivo CSV. Verifique a formatação."); 
        console.error(error);
      } finally { 
        setIsUploading(false); 
      }
    };
    
    reader.readAsText(file, 'ISO-8859-1');
    e.target.value = null; 
  };

  const handleSalvarCaixasFirebase = async () => {
    if (!pedidoModal) return;
    setIsSaving(true);
    try {
      const ref = obterReferenciaDocumento(pedidoModal);
      const novosDocs = [...pedidoModal.documentos];
      novosDocs[docIndexSelecionado] = { ...novosDocs[docIndexSelecionado], caixas: caixasPrevia };
      await updateDoc(ref, { documentos: novosDocs });
      setCaixasPrevia([]); 
      alert("Caixas importadas com sucesso!");
      // O sistema agora permanece silenciosamente na ABA 2
    } catch (error) { 
      alert("Erro ao sincronizar caixas."); 
    } finally { 
      setIsSaving(false); 
    }
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
    const docsRemontados = (pedido.documentos || []).map((doc, index) => ({ 
       ...doc, 
       idTemp: Date.now() + index,
       dbIndex: index // <-- RASTREADOR AQUI TAMBÉM
    }));
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
    if (!docResponsavel) return alert("Selecione um responsável inicial.");
    const novoDoc = { 
      idTemp: Date.now(), 
      tipo: docTipo, 
      responsavel: docResponsavel, // Mantido pro legado
      responsaveis: [docResponsavel], // Novo formato de Array
      caixas: [] 
    };
    setDocsTemporarios([...docsTemporarios, novoDoc]);
  };

  const handleSavePedido = async () => {
    if (!romaneio) return alert("Informe o Nº do Romaneio.");
    if (docsTemporarios.length === 0) return alert("Adicione pelo menos um documento.");
    if (!localUser) return alert("Usuário não logado.");
    setIsSaving(true);
    try {
      const pedidoAlvo = editingId ? pedidosProcessados.find(p => p.id === editingId) : null;
      const documentosLimpos = docsTemporarios.map(({ idTemp, dbIndex, ...rest }) => {
         // Protege as caixas caso o usuário esteja apenas editando o cabeçalho do pedido na tabela
         let caixasAtualizadas = rest.caixas || [];
         if (editingId && pedidoAlvo && dbIndex !== undefined && pedidoAlvo.documentos[dbIndex]) {
            caixasAtualizadas = pedidoAlvo.documentos[dbIndex].caixas;
         }
         return { ...rest, caixas: caixasAtualizadas };
      });
      
      let emailsEnvolvidos = [String(localUser.email).toLowerCase().trim()]; 
      documentosLimpos.forEach(d => { 
        if(d.responsaveis && d.responsaveis.length > 0) {
            d.responsaveis.forEach(r => emailsEnvolvidos.push(String(r).toLowerCase().trim()));
        } else if (d.responsavel) {
            emailsEnvolvidos.push(String(d.responsavel).toLowerCase().trim());
        }
      });
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

  const handleSaveOp = async () => {
    if (!opForm.numero || !opForm.responsavelEmail) { return alert("Preencha o Nº do Romaneio e o Responsável."); }
    setIsSavingOp(true);
    try {
      const targetUser = usuarios.find(u => u.email === opForm.responsavelEmail);
      const responsavelUid = targetUser ? targetUser.uid : null;
      const novaOp = { numero: opForm.numero, responsavelEmail: opForm.responsavelEmail, responsavelUid: responsavelUid, dataOperacao: dataOperacaoAtiva, criadorUid: localUser.uid, createdAt: serverTimestamp() };
      await addDoc(collection(db, 'ordensProducao'), novaOp);
      setOpForm({ ...opForm, numero: '' }); 
    } catch (error) { alert("Houve um erro ao registrar a Ordem de Produção."); } finally { setIsSavingOp(false); }
  };

  const handleDeleteOp = async (op) => {
    if (!window.confirm("Deseja realmente excluir esta Ordem de Produção?")) return;
    try { await deleteDoc(doc(db, 'ordensProducao', op.id)); } catch (error) { alert("Erro ao excluir O.P."); }
  };

  const handleCopyEan = (ean) => {
    if (!ean) return;
    navigator.clipboard.writeText(ean);
    setCopiedEan(ean);
    setTimeout(() => setCopiedEan(null), 2000);
  };

  let detalheSkus = 0;
  const cxMapDetalhe = {};
  if (pedidoModal) {
    (pedidoModal.documentos || []).forEach(d => {
      (d.caixas || []).forEach(cx => {
         (cx.produtos || []).forEach(p => detalheSkus += parseInt(p.quantidade) || 0);
         let n = cx.num || "CX";
         if(!cxMapDetalhe[n]) cxMapDetalhe[n] = { qtd: 0, peso: 0 };
         cxMapDetalhe[n].qtd++; cxMapDetalhe[n].peso += parseFloat(cx.peso) || 0;
      });
    });
  }

  // ==========================================
  // NOVO MOTOR DO RANKING DIÁRIO (COM DECRÉSCIMO AO VIVO)
  // ==========================================
  const rankingCalculado = useMemo(() => {
    const userStats = {};
    
    // 1. Inicializa o painel para todos os usuários
    usuarios.forEach(u => {
      userStats[u.uid] = { 
        nome: u.email.split('@')[0], 
        skus: 0, 
        op: 0, 
        pedidos: 0, 
        bonusPedidos: 0, 
        decrescimo: 0,   
        pontos: 0, 
        eventos: [], 
        uid: u.uid
      };
    });

    // 2. Processa as Ordens de Produção (50 pontos cada)
    opsDoDia.forEach(op => {
       if (op.responsavelUid && userStats[op.responsavelUid]) {
          userStats[op.responsavelUid].op += 1;
          userStats[op.responsavelUid].pontos += 50;
          
          const time = op.createdAt?.toMillis ? op.createdAt.toMillis() : currentTime;
          userStats[op.responsavelUid].eventos.push({ start: time, end: time });
       }
    });

    // 3. Processa os Pedidos / Romaneios (SKUs + 100 Bônus)
    pedidosProcessados.forEach(pedido => {
      let skusCount = 0;
      (pedido.documentos || []).forEach(d => {
         (d.caixas || []).forEach(cx => {
            (cx.produtos || []).forEach(p => skusCount += parseInt(p.quantidade) || 0);
         });
      });

      const participantes = pedido.uidsVinculados || [pedido.criadorUid];
      
      participantes.forEach(uid => {
         if (userStats[uid]) {
            if (pedido.efetivado) {
               userStats[uid].skus += skusCount;
               userStats[uid].pedidos += 1;
               userStats[uid].bonusPedidos += 100; 
               userStats[uid].pontos += skusCount; 
               userStats[uid].pontos += 100; 
            }
            
            const start = pedido.createdAt?.toMillis ? pedido.createdAt.toMillis() : currentTime;
            
            // Se o pedido está em andamento, o tempo final avança junto com o relógio
            let end = currentTime; 
            
            if (pedido.efetivado && pedido.completedAt) {
               end = pedido.completedAt?.toMillis ? pedido.completedAt.toMillis() : currentTime;
            } else if (pedido.isPaused && pedido.lastPauseStart) {
               end = pedido.lastPauseStart; 
            }
            
            userStats[uid].eventos.push({ start, end });
         }
      });
    });

    // 4. Calcula o Decréscimo de Ociosidade (Buracos + Tempo Real)
    const DEZ_MINUTOS_MS = 10 * 60 * 1000;
    
    Object.values(userStats).forEach(user => {
       user.eventos.sort((a, b) => a.start - b.start);
       
       const merged = [];
       user.eventos.forEach(ev => {
          if (merged.length === 0) {
             merged.push({...ev});
             return;
          }
          const last = merged[merged.length - 1];
          if (ev.start <= last.end) {
             last.end = Math.max(last.end, ev.end);
          } else {
             merged.push({...ev});
          }
       });

       // 4.1 Penalidade dos buracos passados (entre tarefas já finalizadas)
       for (let i = 1; i < merged.length; i++) {
          const gapMs = merged[i].start - merged[i-1].end;
          
          if (gapMs > DEZ_MINUTOS_MS) {
             const excessoMs = gapMs - DEZ_MINUTOS_MS;
             const minutosExcedentes = Math.floor(excessoMs / 60000);
             const penalidade = minutosExcedentes * 10;
             user.decrescimo += penalidade; 
             user.pontos -= penalidade; 
          }
       }
       
       // 4.2 A MÁGICA AO VIVO: Penalidade do último evento até o exato momento
       if (merged.length > 0) {
          const ultimaTarefa = merged[merged.length - 1];
          
          // Se a última tarefa tem o 'end' menor que o currentTime, significa que ele está parado
          if (ultimaTarefa.end < currentTime) {
             const ociosidadeAtualMs = currentTime - ultimaTarefa.end;
             
             if (ociosidadeAtualMs > DEZ_MINUTOS_MS) {
                const excessoMs = ociosidadeAtualMs - DEZ_MINUTOS_MS;
                const minutosExcedentes = Math.floor(excessoMs / 60000);
                const penalidade = minutosExcedentes * 10;
                user.decrescimo += penalidade;
                user.pontos -= penalidade;
             }
          }
       }
       
       // Evita que a pontuação fique negativa
       if (user.pontos < 0) user.pontos = 0; 
    });

    return Object.values(userStats)
       .filter(u => u.pontos > 0 || u.pedidos > 0 || u.op > 0) 
       .sort((a, b) => b.pontos - a.pontos)
       .map((u, idx) => ({ ...u, posicao: idx + 1 }));

  // 👇 INSERÇÃO CHAVE: 'currentTime' obriga o cálculo a rodar a cada segundo
  }, [pedidosProcessados, opsDoDia, usuarios, currentTime]);


  return (
    <div className="op-wrapper">
      <header className="op-header">
        <div className="op-title-group">
          <button className="btn-back" onClick={() => navigate('/dashboard')} title="Voltar ao Painel"><ArrowLeft size={24} /></button>
          <div><h1>{titulo}</h1><span><FileText size={14}/> Gerenciamento de Romaneios</span></div>
        </div>
        <div className="op-actions">
          <div className="search-bar-op">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Buscar romaneio ou loja..." 
              value={buscaRomaneio}
              onChange={(e) => setBuscaRomaneio(e.target.value)}
            />
          </div>
          <button className="btn-new-order" onClick={handleOpenModal}><Plus size={18} /> Novo Pedido</button>
        </div>
      </header>

      <main className="op-main-content">
        <section className="op-live-section" style={{ display: 'flex', flexDirection: 'column' }}>
          {atividadeAtual ? (
            <div className={`live-tracker-card ${atividadeAtual.isPaused ? 'paused' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
                    <button className="btn-live-caixas" onClick={() => handleAbrirDetalhes(atividadeAtual)}><Boxes size={18}/> WMS</button>
                    <button className="btn-live-finish" onClick={() => handleToggleEfetivado(atividadeAtual)}><CheckCircle2 size={18}/> Finalizar</button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="live-tracker-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', background: '#f8fafc', borderStyle: 'dashed', flex: 1 }}>
               <CheckCircle2 size={48} color="#94a3b8" style={{ marginBottom: '15px' }} />
               <h3 style={{ color: '#475569', margin: '0 0 5px 0' }}>Tudo Limpo!</h3>
               <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>Não há nenhum pedido em<br/>andamento no momento.</p>
            </div>
          )}

          <div className="op-kpi-grid">
            <div className="op-kpi-card"><span className="kpi-label">Pedidos Hoje</span><span className="kpi-val">{totalPedidosKPI}</span></div>
            <div className="op-kpi-card"><span className="kpi-label">Caixas Fechadas</span><span className="kpi-val" style={{color: 'var(--secondary)'}}>{totalCaixasHoje}</span></div>
          </div>
        </section>

        <section className="op-history-section">
          <div className="history-header">
            <h3><CheckCircle2 size={18} color="var(--primary)"/> Romaneios Processados</h3>
            <span className="history-count">{pedidosProcessados.filter(p => p.efetivado).length} finalizados</span>
          </div>
          
          <div className="op-table-wrapper scrollable-table-wrapper">
            <table className="op-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Romaneio</th>
                  <th style={{ width: '25%' }}>Destino / UF</th>
                  <th style={{ width: '25%' }}>Observações</th>
                  <th style={{ width: '25%' }}>Resumo Rápido</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.length === 0 ? (
                  <tr><td colSpan="5" style={{textAlign: 'center', padding: '30px', color: '#94a3b8'}}>{buscaRomaneio ? 'Nenhum romaneio ou loja encontrada.' : 'Nenhum pedido processado hoje.'}</td></tr>
                ) : (
                  pedidosFiltrados.map(pedido => {
                    let docsCount = pedido.documentos?.length || 0;
                    let caixasCount = 0;
                    let skusCount = 0;
                    (pedido.documentos || []).forEach(d => {
                      caixasCount += (d.caixas || []).length;
                      (d.caixas || []).forEach(cx => { (cx.produtos || []).forEach(p => skusCount += parseInt(p.quantidade) || 0); });
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
                      <tr 
                        key={pedido.id} 
                        className={`clickable-row ${pedido.efetivado ? "efetivado" : ""}`} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleAbrirDetalhes(pedido)}
                        title="Clique para ver Detalhes"
                      >
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

                        <td style={{ verticalAlign: 'middle', padding: '16px 12px', whiteSpace: 'normal', fontSize: '12px', color: '#64748b' }}>
                           {pedido.observacoes ? pedido.observacoes : <span style={{opacity: 0.4, fontStyle: 'italic'}}>Nenhuma observação...</span>}
                        </td>
                        
                        <td style={{ verticalAlign: 'middle', padding: '16px 12px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            <span className="sku-badge" style={{ margin: 0, padding: '2px 6px', fontSize: '11px' }}>{docsCount} Docs</span>
                            <span className="sku-badge" style={{ margin: 0, padding: '2px 6px', fontSize: '11px', background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}>{caixasCount} Caixas</span>
                            <span className="sku-badge" style={{ margin: 0, padding: '2px 6px', fontSize: '11px', background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}>{skusCount} SKUs</span>
                          </div>
                        </td>

                        <td className="actions-cell" style={{ verticalAlign: 'middle', padding: '16px 12px' }}>
                          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <button className="action-btn btn-caixas" title="Painel do Romaneio" onClick={() => handleAbrirDetalhes(pedido)}>
                              <Info size={16}/>
                            </button>
                            <div style={{position: 'relative'}}>
                              <button className="action-btn btn-edit" title="Ações" onClick={() => setDropdownOpen(dropdownOpen === pedido.id ? null : pedido.id)}>
                                <MoreVertical size={16}/>
                              </button>
                              {dropdownOpen === pedido.id && (
                                <div className="table-dropdown-menu" style={{ right: 0, left: 'auto' }}>
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
                                      <button className="dropdown-item" onClick={() => handleEditPedido(pedido)}><Edit size={14}/> Editar Dados</button>
                                      <div className="dropdown-divider"></div>
                                      <button className="dropdown-item text-danger" onClick={() => handleDeletePedido(pedido)}><Trash2 size={14}/> Excluir Pedido</button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
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

        <section className="op-bottom-zone">
            <div className="op-ranking-container">
              <div className="ranking-header">
                <h3><Trophy size={20} color="#eab308" style={{marginRight: '8px'}}/> Ranking Diário - Produtividade</h3>
                <span className="ranking-subtitle">Top Conferentes do Dia</span>
              </div>
              <div className="ranking-list">
                {rankingCalculado.map((user, idx) => (
                  <div key={user.uid} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    
                    {/* CARD PRINCIPAL (CLICÁVEL) */}
                    <div 
                      className={`ranking-item ${idx === 0 ? 'first-place' : ''}`}
                      onClick={() => setRankingExpandido(rankingExpandido === user.uid ? null : user.uid)}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <div className="ranking-pos">{idx === 0 ? <Medal size={24} color="#eab308" /> : idx === 1 ? <Medal size={20} color="#94a3b8" /> : idx === 2 ? <Medal size={20} color="#b45309" /> : <span className="pos-number">{user.posicao}º</span>}</div>
                      <div className="ranking-avatar"><div className="avatar-circle">{user.nome.charAt(0)}</div></div>
                      <div className="ranking-info">
                        <strong className="ranking-name">{user.nome}</strong>
                        <div className="ranking-metrics">
                          <span><CheckCircle2 size={12}/> {user.skus} SKUs</span>
                          <span><Factory size={12}/> {user.op} O.P.s</span>
                        </div>
                      </div>
                      <div className="ranking-score">
                        <div className="score-value">{user.pontos.toLocaleString()} pts</div>
                        <div className="score-bar"><div className="score-fill" style={{width: `${(user.pontos / (rankingCalculado[0]?.pontos || 1)) * 100}%`}}></div></div>
                      </div>
                    </div>
                    
                    {/* DETALHAMENTO DA PONTUAÇÃO (EXPANSÍVEL) */}
                    {rankingExpandido === user.uid && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '35px', marginRight: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📦 Total de SKUs:</span> 
                          <strong>{user.skus} pts</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🚀 Bônus ({user.pedidos} Pedidos):</span> 
                          <strong style={{ color: '#10b981' }}>+{user.bonusPedidos} pts</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🏭 O.P.s ({user.op}):</span> 
                          <strong style={{ color: '#3b82f6' }}>+{user.op * 50} pts</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>⏱️ Penalidade (Ociosidade):</span> 
                          <strong style={{ color: '#ef4444' }}>-{user.decrescimo} pts</strong>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>

            <div className="op-side-indicators">
                <div className="indicator-card op-card">
                  <div className="indicator-icon" style={{background: '#e0e7ff', color: '#4f46e5'}}><Factory size={24}/></div>
                  <div className="indicator-content"><h4>Ordens de Produção</h4><span className="indicator-value">{opsDoDia.length} Registros</span><p>Controle de O.P.s hoje</p></div>
                  <button className="indicator-btn" onClick={() => setShowOpModal(true)}>Gerenciar O.P.s</button>
                </div>

                <div className="indicator-card master-card">
                  <div className="indicator-icon" style={{background: '#fce7f3', color: '#db2777'}}><Package size={24}/></div>
                  <div className="indicator-content"><h4>Caixas Master</h4><span className="indicator-value">{caixasMaster.length} Padrões</span><p>Dicionário de embalagens</p></div>
                  <button className="indicator-btn" onClick={() => setShowMasterModal(true)}>Consultar Base</button>
                </div>
            </div>
        </section>

      </main>


      {/* ==========================================
          MODAL ÚNICO: PAINEL DO ROMANEIO (DETALHES + WMS)
          COM SISTEMA DE ABAS (TABS)
          ========================================== */}
      {showDetalhesModal && pedidoModal && (
        <div className="op-modal-overlay" onClick={() => !isSaving && setShowDetalhesModal(false)}>
          {/* 👇 AQUI: Largura de 95vw e Altura de 90vh para ocupar a tela toda */}
          <div className="op-modal-content" style={{width: '95vw', height: '90vh', maxWidth: '1400px', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden'}} onClick={(e) => e.stopPropagation()}>
            
            {/* Header Fixo */}
            <div className="op-modal-header" style={{flexShrink: 0, padding: '20px 25px', borderBottom: 'none'}}>
              <div className="op-modal-title">
                <div className="icon-wrap" style={{background: 'var(--primary)', color: '#fff'}}><Info size={24}/></div>
                <div>
                  <h2>Painel do Romaneio: {pedidoModal.romaneio}</h2>
                  <p>{pedidoModal.loja || 'Destino Padrão'} {pedidoModal.uf ? `- ${pedidoModal.uf}` : ''}</p>
                </div>
              </div>
              <button className="btn-close-modal" onClick={() => setShowDetalhesModal(false)} disabled={isSaving || isUploading}><X size={24}/></button>
            </div>
            
            {/* Sistema de Abas */}
            <div className="modal-tabs-container" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 25px' }}>
              <button 
                className={`modal-tab-btn ${activeTab === 'resumo' ? 'active' : ''}`}
                onClick={() => setActiveTab('resumo')}
                style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: `3px solid ${activeTab === 'resumo' ? 'var(--primary)' : 'transparent'}`, color: activeTab === 'resumo' ? 'var(--primary)' : '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                Resumo Geral
              </button>
              <button 
                className={`modal-tab-btn ${activeTab === 'caixas' ? 'active' : ''}`}
                onClick={() => setActiveTab('caixas')}
                style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: `3px solid ${activeTab === 'caixas' ? 'var(--primary)' : 'transparent'}`, color: activeTab === 'caixas' ? 'var(--primary)' : '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                Detalhamento Completo & WMS
              </button>
            </div>
            
            {/* Corpo do Modal Rulável */}
            <div className="op-modal-body" style={{ flex: 1, padding: '25px', overflowY: 'auto', background: '#f8fafc' }}>
              
              {/* ABA 1: RESUMO GERAL (EDITÁVEL, REDESENHADO E MULTI-USERS) */}
              {activeTab === 'resumo' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', height: '100%' }}>
                  
                  {/* COLUNA ESQUERDA: Observações e Documentos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflow: 'hidden' }}>
                    
                    {/* OBSERVAÇÕES (Editável com trava) */}
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#334155' }}>
                          <AlignLeft size={18} color="#64748b"/> Observações
                        </strong>
                        <button onClick={() => setIsEditingObs(!isEditingObs)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                          <Edit size={14}/> {isEditingObs ? 'Travar Edição' : 'Editar Texto'}
                        </button>
                      </div>
                      
                      {isEditingObs ? (
                        <textarea 
                          value={observacoes} 
                          onChange={(e) => setObservacoes(e.target.value)} 
                          disabled={isSaving}
                          rows="3"
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', resize: 'none', fontSize: '0.85rem', color: '#475569', boxSizing: 'border-box' }}
                          placeholder="Adicione observações aqui..."
                          autoFocus
                        />
                      ) : (
                        <div style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, padding: '10px', background: '#f8fafc', borderRadius: '6px', minHeight: '50px' }}>
                          {observacoes || <span style={{fontStyle: 'italic', color: '#94a3b8'}}>Nenhuma observação informada.</span>}
                        </div>
                      )}
                    </div>

                    {/* DOCUMENTOS (Editável Multi-Colaboradores) */}
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#334155', marginBottom: '12px' }}>
                        <FileText size={18} color="#64748b"/> Documentos
                      </strong>
                      
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexShrink: 0 }}>
                        <select value={docTipo} onChange={(e) => setDocTipo(e.target.value)} disabled={isSaving} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}>
                          <option value="Nota Fiscal">Nota Fiscal</option>
                          <option value="Minuta">Minuta</option>
                          <option value="Bonificação">Bonificação</option>
                          <option value="Troca">Troca</option>
                        </select>
                        <select value={docResponsavel} onChange={(e) => setDocResponsavel(e.target.value)} disabled={isSaving} style={{ flex: 1.5, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}>
                          <option value="">Responsável...</option>
                          {localUser?.email && !usuarios.some(u => u.email === String(localUser.email).toLowerCase().trim()) && (<option value={String(localUser.email).toLowerCase().trim()}>{String(localUser.email).split('@')[0].toLowerCase()}</option>)}
                          {usuarios.map(u => (<option key={u.uid} value={u.email}>{u.email.split('@')[0]}</option>))}
                        </select>
                        <button onClick={handleAddDoc} disabled={isSaving} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Plus size={16}/>
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                        {docsTemporarios.length === 0 ? (
                          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Nenhum documento.</span>
                        ) : (
                          docsTemporarios.map(doc => (
                            <div key={doc.idTemp} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', padding: '10px 12px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>{doc.tipo}</span>
                                <button onClick={() => handleRemoveDoc(doc.idTemp)} disabled={isSaving} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
                                  <Trash2 size={16}/>
                                </button>
                              </div>
                              
                              {/* Lista de Responsaveis em Tags */}
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
                      
                      <button 
                        onClick={handleSalvarEdicaoTab1} 
                        disabled={isSaving}
                        style={{ marginTop: '15px', background: '#10b981', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexShrink: 0 }}
                      >
                        {isSaving ? <Loader2 size={16} className="fa-spin"/> : <CheckCircle2 size={16}/>}
                        Salvar Alterações
                      </button>
                    </div>
                  </div>

                  {/* COLUNA DIREITA: Listagem de Caixas (Altura Total) */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#334155' }}>
                        <CheckCircle2 size={18} color="#10b981"/> Resumo de Caixas 
                        <span style={{ marginLeft: '4px', fontSize: '0.75rem', background: '#ecfdf5', color: '#10b981', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                          {detalheSkus} SKUs processados
                        </span>
                      </strong>
                      
                      {Object.keys(cxMapDetalhe).length > 0 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const texto = Object.keys(cxMapDetalhe).map(k => `${k} (${cxMapDetalhe[k].peso.toFixed(2)} kg): ${cxMapDetalhe[k].qtd} Un`).join('\n');
                            navigator.clipboard.writeText(texto);
                            const btn = e.currentTarget;
                            const originalText = btn.innerHTML;
                            btn.innerHTML = 'Copiado!';
                            btn.style.color = '#10b981';
                            btn.style.borderColor = '#10b981';
                            btn.style.background = '#ecfdf5';
                            setTimeout(() => {
                              btn.innerHTML = originalText;
                              btn.style.color = '#475569';
                              btn.style.borderColor = '#cbd5e1';
                              btn.style.background = '#f8fafc';
                            }, 1500);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                          title="Copiar resumo no padrão WMS"
                        >
                          <Copy size={14} /> Copiar
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                      {Object.keys(cxMapDetalhe).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '25px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', fontSize: '0.9rem' }}>
                          Nenhuma caixa importada do WMS.
                        </div>
                      ) : (
                        Object.keys(cxMapDetalhe).map((k, idx) => (
                          <div key={idx} style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{color: 'var(--primary)'}}>{k}</strong> 
                              <span style={{color: '#94a3b8', fontSize: '0.8rem'}}>({cxMapDetalhe[k].peso.toFixed(2)} kg)</span>
                            </div>
                            <span style={{fontWeight: 700, color: '#334155'}}>{cxMapDetalhe[k].qtd} Un</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                </div>
              )}
              {/* ABA 2: CAIXAS COMPLETAS E WMS */}
              {activeTab === 'caixas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <h3 style={{ fontSize: '1.1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', margin: '0' }}>
                    <ListTree size={20}/> Caixas Registradas por Documento
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {(pedidoModal.documentos || []).map((doc, dIdx) => {
                      const termoBusca = (buscasDocumentos[dIdx] || '').toLowerCase();
                      const caixasFiltradas = (doc.caixas || []).filter(cx => {
                        if (!termoBusca) return true;
                        const matchNum = String(cx.num || cx.caixa || '').toLowerCase().includes(termoBusca);
                        const matchProd = cx.produtos?.some(p => {
                          const cod = typeof p === 'object' && p !== null ? (p.sku || p.referencia || p.produto || '') : String(p);
                          return cod.toLowerCase().includes(termoBusca);
                        });
                        return matchNum || matchProd;
                      });

                      return (
                        <div key={dIdx} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                          
                          {/* HEADER ACORDEON */}
                          <div 
                            onClick={() => toggleDocExpandido(dIdx)}
                            style={{ background: '#f1f5f9', padding: '12px 15px', borderBottom: docsExpandidos[dIdx] ? '1px solid #cbd5e1' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ transform: docsExpandidos[dIdx] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: '0.8rem', color: '#64748b' }}>▼</span>
                              <strong style={{ color: '#334155', fontSize: '0.95rem' }}>{doc.tipo}</strong>
                              
                              {/* 👇 NOVA BADGE DINÂMICA DE VOLUMES */}
                              <span style={{ background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', marginLeft: '5px' }}>
                                {caixasFiltradas.length} {caixasFiltradas.length === 1 ? 'Volume' : 'Volumes'}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Responsável: {doc.responsavel?.split('@')[0]}</span>
                          </div>
                          
                          {/* CORPO DO DOCUMENTO (EXPANSÍVEL) */}
                          {docsExpandidos[dIdx] && (
                            <div style={{ padding: '15px' }}>
                              
                              {/* BARRA DE FERRAMENTAS DO DOCUMENTO */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px dashed #cbd5e1', marginBottom: '15px' }}>
                                
                                {/* IMPORTAR CSV */}
                                <div>
                                  <input 
                                    type="file" accept=".csv" id={`csv-upload-${dIdx}`} style={{ display: 'none' }} disabled={isSaving || isUploading}
                                    onChange={(e) => { setDocIndexSelecionado(dIdx); handleFileUpload(e); }}
                                  />
                                  <label htmlFor={`csv-upload-${dIdx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: 600, transition: 'all 0.2s' }}>
                                    {isUploading && docIndexSelecionado === dIdx ? <Loader2 size={16} className="fa-spin"/> : <UploadCloud size={16} color="#0ea5e9"/>}
                                    {isUploading && docIndexSelecionado === dIdx ? 'Lendo CSV...' : 'Importar CSV'}
                                  </label>
                                </div>

                                {/* ADCIONAR MANUAL */}
                                <button 
                                  onClick={() => handleAbrirAddCaixa(dIdx)}
                                  disabled={isSaving || isUploading}
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', color: '#fff', border: 'none', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  <Plus size={16}/> Caixa Manual
                                </button>

                                {/* PESQUISA */}
                                <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 10px' }}>
                                  <Search size={16} color="#94a3b8"/>
                                  <input 
                                    type="text" placeholder="Buscar Caixa ou REF..." 
                                    value={buscasDocumentos[dIdx] || ''} onChange={(e) => handleBuscaDocumento(dIdx, e.target.value)}
                                    style={{ width: '100%', padding: '9px 8px', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: '#334155' }}
                                  />
                                </div>

                                {/* STATUS DE PRÉVIA CSV */}
                                {docIndexSelecionado === dIdx && caixasPrevia.length > 0 && (
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                                      <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px' }}><strong>{caixasPrevia.length}</strong> lidas</span>
                                      <button onClick={handleSalvarCaixasFirebase} disabled={isSaving} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>{isSaving ? <Loader2 size={14} className="fa-spin"/> : <CheckCircle2 size={14}/>} Salvar</button>
                                      <button onClick={() => setCaixasPrevia([])} disabled={isSaving} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><X size={14}/> Cancelar</button>
                                   </div>
                                )}
                              </div>

                              {/* LISTAGEM DAS CAIXAS */}
                              {caixasFiltradas.length === 0 ? (
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma caixa encontrada.</span>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                                  {caixasFiltradas.map((cx, cxIdx) => {
                                    const caixaOriginalIdx = doc.caixas.indexOf(cx); // Garante a exclusão da caixa correta mesmo com filtro
                                    
                                    return (
                                      <div key={cxIdx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                          <strong style={{ color: 'var(--primary)' }}>{cx.num || cx.caixa || 'CX'}</strong>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{cx.peso || 0} kg</span>
                                            <button onClick={() => handleExcluirCaixa(dIdx, caixaOriginalIdx)} title="Excluir Caixa" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}>
                                              <Trash2 size={14}/>
                                            </button>
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto', paddingRight: '4px' }}>
                                          {(!cx.produtos || cx.produtos.length === 0) ? (
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '4px', display: 'block', textAlign: 'center' }}>
                                              Volume avulso (sem detalhamento)
                                            </span>
                                          ) : (
                                            Object.values((cx.produtos || []).reduce((acc, p) => {
                                              const isObj = typeof p === 'object' && p !== null;
                                              const codProduto = isObj ? (p.sku || p.referencia || p.produto || 'S/N') : String(p);
                                              const qtdProduto = isObj ? (parseInt(p.quantidade) || 1) : 1;
                                              const descricao = isObj ? p.descricao : '';
                                              if (!acc[codProduto]) acc[codProduto] = { cod: codProduto, qtd: 0, desc: descricao };
                                              acc[codProduto].qtd += qtdProduto;
                                              if (!acc[codProduto].desc && descricao) acc[codProduto].desc = descricao;
                                              return acc;
                                            }, {})).map((item, pIdx) => (
                                              <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569', background: '#fff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                                                <span style={{fontWeight: 600}} title={item.desc || ''}>{item.cod}</span>
                                                <span style={{color: '#0ea5e9', fontWeight: 'bold'}}>{item.qtd} un</span>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          RESTANTE DOS MODAIS (O.P., MASTER)
          ========================================== */}

      {showOpModal && (
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
      )}

      {showMasterModal && (
        <div className="op-modal-overlay" onClick={() => setShowMasterModal(false)}>
          <div className="op-modal-content" style={{maxWidth: '900px', padding: '25px', boxSizing: 'border-box'}} onClick={(e) => e.stopPropagation()}>
            <div className="op-modal-header">
              <div className="op-modal-title">
                <div className="icon-wrap" style={{background: '#fce7f3', color: '#db2777'}}><Package size={24}/></div>
                <div><h2>Dicionário de Caixas Master</h2><p>Padrões de embalagem, quantidade e EAN por Produto.</p></div>
              </div>
              <button className="btn-close-modal" onClick={() => setShowMasterModal(false)}><X size={24}/></button>
            </div>
            
            <div className="op-modal-body" style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px' }}>
                <Search size={18} color="#94a3b8" />
                <input 
                  type="text" 
                  placeholder="Pesquisar por Cód. REF, Nome do Produto ou Tipo de Caixa..." 
                  value={buscaMaster}
                  onChange={(e) => setBuscaMaster(e.target.value)}
                  style={{ flex: 1, padding: '12px 10px', border: 'none', background: 'transparent', outline: 'none', color: '#334155' }}
                  autoFocus
                />
              </div>

              <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', paddingRight: '5px' }}>
                {caixasMasterFiltradas.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                    {buscaMaster ? 'Nenhum produto ou variação encontrada para essa busca.' : 'O dicionário de Caixas Master está vazio.'}
                  </div>
                ) : (
                  caixasMasterFiltradas.map(master => (
                    <div key={master.id} style={{ display: 'flex', flexDirection: 'column', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      
                      <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '10px' }}>
                        <strong style={{ color: '#db2777', fontSize: '1rem', display: 'block' }}>
                          REF: {master.ref || 'S/N'}
                        </strong>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '4px', lineHeight: '1.2' }}>
                          {master.nome || 'Produto sem nome'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {master.variacoes && master.variacoes.length > 0 ? (
                          master.variacoes.map((v, vIdx) => (
                            <div key={vIdx} style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#475569' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong style={{ color: '#334155' }}>{v.caixa || 'CX Padrão'}</strong>
                                <span style={{ fontWeight: 600, color: '#0ea5e9' }}>{v.quantidade || 'N/A'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  EAN: {v.codigoBarras || 'N/A'}
                                  {v.codigoBarras && (
                                    <button 
                                      onClick={() => handleCopyEan(v.codigoBarras)}
                                      title="Copiar EAN"
                                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedEan === v.codigoBarras ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}
                                    >
                                      {copiedEan === v.codigoBarras ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                  )}
                                </span>
                                <span>{v.peso || 0} kg</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma variação cadastrada.</span>
                        )}
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      )}

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
                        
                        {/* Lista de Responsaveis em Tags no Modal de Criação */}
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
            <div className="op-modal-footer"><button className="btn-cancel-op" onClick={handleCloseModal} disabled={isSaving}>Cancelar</button><button className="btn-save-op" onClick={handleSavePedido} disabled={isSaving}>{isSaving ? <><Loader2 size={18} className="fa-spin" style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : (editingId ? 'Salvar Alterações' : 'Criar Pedido')}</button></div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL DE ADIÇÃO DE CAIXA MANUAL (CORREÇÕES/BUGS)
          ========================================== */}
      {showAddCaixaModal && (
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
      )}

    </div>
  );
}