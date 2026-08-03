// src/pages/Operacao.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  collection, addDoc, serverTimestamp, getDocs, doc,
  query, where, onSnapshot, collectionGroup, Timestamp, deleteField 
} from 'firebase/firestore';
import { updateDoc, setDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase'; 
import { 
  ArrowLeft, Plus, FileText, CheckCircle2, 
  Clock, MoreVertical, Search, Boxes, X, User, Trash2, PackagePlus, Loader2, Edit, Check, Pause, Play, AlertCircle, MapPin, UploadCloud,
  Trophy, Medal, Factory, Package, Copy, Info, AlignLeft, ListTree, ChevronDown, Layers, ArrowUpDown, RefreshCcw, PieChart, ArrowRightLeft, AlertTriangle } from 'lucide-react';
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
  const [wmsSessions, setWmsSessions] = useState({});
  // NOVOS ESTADOS PARA O WMS MASTER
  const [wmsPreResumoAberto, setWmsPreResumoAberto] = useState(null);
  const [showCaixasEfetivadasModal, setShowCaixasEfetivadasModal] = useState(null);
  const [auditModalData, setAuditModalData] = useState(null);
  const [buscaCaixasSalvas, setBuscaCaixasSalvas] = useState('');

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
  const [skusExpandidos, setSkusExpandidos] = useState({});

  // ==========================================
  // ESTADOS PARA CADASTRO MANUAL DE VARIAÇÃO
  // ==========================================
  const [modalCodigoBarras, setModalCodigoBarras] = useState(null); // Guarda os dados do SKU que será salvo
  const [codigoBarrasInput, setCodigoBarrasInput] = useState('');

  // ATUALIZA OS CAMPOS MANUAIS EM TEMPO REAL
  const handleInputManual = (dIdx, skuRef, campo, valor) => {
    setWmsSessions(prev => {
      const novoEstado = { ...prev };
      const sessao = { ...novoEstado[dIdx] };
      const skus = [...sessao.skus];
      const skuIndex = skus.findIndex(s => s.ref === skuRef);
      if (skuIndex === -1) return prev;

      const sku = { ...skus[skuIndex] };
      if (campo === 'qtdPadrao') sku.qtdPadrao = parseInt(valor) || 0;
      if (campo === 'caixaNome') sku.caixaNome = valor.toUpperCase();
      if (campo === 'pesoPadrao') sku.pesoPadrao = parseFloat(valor.replace(',', '.')) || 0;

      skus[skuIndex] = sku;
      sessao.skus = skus;
      novoEstado[dIdx] = sessao;
      return novoEstado;
    });
  };

  // ABRE O MODAL DE CÓDIGO DE BARRAS
  const abrirModalSalvarManual = (dIdx, sku) => {
    setModalCodigoBarras({ dIdx, sku });
    setCodigoBarrasInput('');
  };

  // SALVA A NOVA VARIAÇÃO NO BANCO DE DADOS
  const salvarVariacaoBanco = async () => {
    if (!codigoBarrasInput.trim()) {
      alert("Por favor, insira o código de barras.");
      return;
    }
    
    const { dIdx, sku } = modalCodigoBarras;
    setIsSaving(true);
    
    try {
      // 👇 AQUI: Ajustado para apontar corretamente para a coleção 'caixasMaster'
      const produtoRef = doc(db, 'caixasMaster', sku.ref);
      
      const novaVariacao = {
        caixa: sku.caixaNome || 'CAIXA',
        quantidade: sku.qtdPadrao,
        peso: sku.pesoPadrao,
        codigoBarras: codigoBarrasInput
      };

      // Tenta atualizar o banco adicionando a variação ao array existente
      await updateDoc(produtoRef, {
        variacoes: arrayUnion(novaVariacao)
      }).catch(async (e) => {
         // Se o documento não existir, cria ele com a estrutura correta
         await setDoc(produtoRef, { 
           ref: sku.ref,
           nome: sku.desc || '', // Salva a descrição do arquivo como nome
           variacoes: [novaVariacao] 
         }, { merge: true });
      });

      // Atualiza a tela atual, removendo o status de "Missing"
      setWmsSessions(prev => {
        const novo = { ...prev };
        const sIndex = novo[dIdx].skus.findIndex(s => s.ref === sku.ref);
        novo[dIdx].skus[sIndex].isMissing = false;
        novo[dIdx].skus[sIndex].codigoBarras = codigoBarrasInput;
        
        // Dispara o Auto-save do planejamento
        const refFinal = pedidoModal._isLegacy ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) : doc(db, 'pedidos', pedidoModal.id);
        const novosDocs = [...pedidoModal.documentos];
        novosDocs[dIdx] = { ...novosDocs[dIdx], planejamentoWms: novo[dIdx] };
        updateDoc(refFinal, { documentos: novosDocs });
        
        return novo;
      });

      alert("Variação cadastrada com sucesso!");
      setModalCodigoBarras(null);

    } catch (error) {
      alert("Erro ao salvar variação: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };
  // ==========================================
  // ESTADOS E FUNÇÕES DO DICIONÁRIO MASTER
  // ==========================================
  const [modoEdicaoMaster, setModoEdicaoMaster] = useState(null); // 'NOVO' ou o ID/Ref do produto
  const [formMaster, setFormMaster] = useState({ ref: '', nome: '', variacoes: [] });

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

      // 1. Salva na nuvem (Firebase)
      await setDoc(docRef, dadosTratados, { merge: true });
      
      // 2. ATUALIZA A TELA NA MESMA HORA (Sem precisar de F5)
      // Obs: Se o seu estado principal não se chamar 'setCaixasMaster', 
      // troque esse nome abaixo para o correto (ex: setProdutos, setDicionario, etc).
      setCaixasMaster(prev => {
        const index = prev.findIndex(p => p.ref === dadosTratados.ref || p.id === dadosTratados.ref);
        if (index > -1) {
          const novaLista = [...prev];
          novaLista[index] = { ...novaLista[index], ...dadosTratados };
          return novaLista;
        } else {
          return [dadosTratados, ...prev]; // Adiciona o novo no topo da lista
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
      // 1. Apaga da nuvem (Firebase)
      await deleteDoc(doc(db, 'produtos', ref));
      
      // 2. Remove da tela na mesma hora
      setCaixasMaster(prev => prev.filter(p => p.ref !== ref && p.id !== ref));
      
      alert("Produto removido do dicionário!");
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  };
  

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

  // 1. O "ÓCULOS" DO USUÁRIO: Separa apenas os pedidos que pertencem a ele (ou tudo, se for Admin)
  const pedidosVisiveis = useMemo(() => {
    if (isAdmin) return pedidosProcessados;
    return pedidosProcessados.filter(p => 
       p.criadorUid === localUser?.uid || 
       (p.uidsVinculados && p.uidsVinculados.includes(localUser?.uid))
    );
  }, [pedidosProcessados, isAdmin, localUser]);

  // 2. A Tabela usa os pedidos visíveis e aplica a barra de busca
  const pedidosFiltrados = useMemo(() => {
    if (!buscaRomaneio.trim()) return pedidosVisiveis;
    const termo = buscaRomaneio.toLowerCase();
    return pedidosVisiveis.filter(p => 
      String(p.romaneio || '').toLowerCase().includes(termo) ||
      String(p.loja || '').toLowerCase().includes(termo)
    );
  }, [pedidosVisiveis, buscaRomaneio]);

  // 3. O KPI de Pedidos conta apenas NFs e Minutas dentro dos pedidos VISÍVEIS
  const totalPedidosKPI = useMemo(() => {
    return pedidosVisiveis.filter(pedido => {
      return (pedido.documentos || []).some(doc => 
        doc.tipo === 'Nota Fiscal' || doc.tipo === 'Minuta'
      );
    }).length;
  }, [pedidosVisiveis]);

  // 4. O KPI de Caixas soma apenas as caixas dos pedidos VISÍVEIS
  const totalCaixasHoje = useMemo(() => {
    let count = 0;
    pedidosVisiveis.forEach(p => { 
      (p.documentos || []).forEach(d => { count += (d.caixas || []).length; }); 
    });
    return count;
  }, [pedidosVisiveis]);

  // 5. O Rastreador ao Vivo procura o pendente dentro dos pedidos VISÍVEIS
  const atividadeAtual = useMemo(() => {
    const pendente = pedidosVisiveis.find(p => !p.efetivado);
    if (!pendente) return null;
    
    let skus = 0;
    (pendente.documentos || []).forEach(d => {
      (d.caixas || []).forEach(cx => { 
        (cx.produtos || []).forEach(prod => { skus += parseInt(prod.quantidade) || 0; }); 
      });
    });
    return { ...pendente, totalSkus: skus };
  }, [pedidosVisiveis]);

  const pedidoModal = useMemo(() => {
    if (!pedidoSelecionado) return null;
    return pedidosProcessados.find(p => p.id === pedidoSelecionado.id) || pedidoSelecionado;
  }, [pedidoSelecionado, pedidosProcessados]);


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

// ==========================================
  // AUTO-LOAD DO WMS (Evita perda no F5 e limpa cache entre pedidos)
  // ==========================================
  useEffect(() => {
    if (showDetalhesModal && pedidoModal?.isCaixaMaster) {
      // Se abrir um pedido Master, busca apenas os dados dele
      const sessoesSalvas = {};
      (pedidoModal.documentos || []).forEach((doc, dIdx) => {
        if (doc.planejamentoWms) {
          sessoesSalvas[dIdx] = doc.planejamentoWms;
        }
      });
      // SUBSTITUI completamente a memória (sem usar o prev)
      setWmsSessions(sessoesSalvas);
      
    } else if (!showDetalhesModal) {
      // Quando o modal fechar, "formata" a memória para não vazar pro próximo pedido
      setWmsSessions({});
      setAuditModalData(null);
      setShowCaixasEfetivadasModal(null);
      setWmsPreResumoAberto(null);
    }
  }, [showDetalhesModal, pedidoModal]);

const handlePlanejamentoUpload = (e, dIdx) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const linhas = text.trim().split(/\r\n|\n|\r/);
        if (linhas.length <= 1) throw new Error("Arquivo vazio");

        // Identifica o separador (o seu exemplo usa ;)
        let separador = linhas[0].includes(';') ? ';' : ',';
        const cabecalho = linhas[0].split(separador).map(c => c.trim().toUpperCase().replace(/"/g, ''));
        
        let idxRef = cabecalho.findIndex(c => c.includes("CÓDIGO PRODUTO") || c === "PRODUTO" || c === "REF");
        let idxQtd = cabecalho.findIndex(c => c.includes("QTDE CONFERIDA") || c.includes("QUANTIDADE"));
        let idxDesc = cabecalho.findIndex(c => c.includes("DESCRIÇÃO") || c.includes("DESCRICAO"));

        if (idxRef === -1 || idxQtd === -1) {
          throw new Error("Colunas 'Código Produto' e 'Qtde Conferida' não encontradas.");
        }

        let skusProcessados = [];
        
        for (let i = 1; i < linhas.length; i++) {
          const cols = linhas[i].split(separador).map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length <= idxRef) continue;
          
          const ref = cols[idxRef];
          const qtd = parseInt(cols[idxQtd] || "0");
          if (!ref || qtd <= 0) continue;

          // Cruza com o Dicionário Master carregado na memória
          const masterRef = caixasMaster.find(m => 
            String(m.ref).trim() === String(ref).trim() || 
            String(m.ref).trim().replace(/^0+/, '') === String(ref).trim().replace(/^0+/, '')
          );

          // Busca a variação que encaixa perfeitamente na divisão
          const variacoesValidas = masterRef ? masterRef.variacoes.filter(v => {
            const qtdPadrao = parseInt(v.quantidade.replace(/\D/g, ''));
            return qtdPadrao > 0 && qtd % qtdPadrao === 0;
          }) : [];

          const isMissing = variacoesValidas.length === 0;

          skusProcessados.push({
            ref, 
            desc: idxDesc !== -1 ? cols[idxDesc] : "Produto", 
            qtdTotal: qtd, 
            variacoesDisponiveis: variacoesValidas, 
            selectedVar: 0,
            caixaNome: !isMissing ? variacoesValidas[0].caixa : "", 
            qtdPadrao: !isMissing ? parseInt(variacoesValidas[0].quantidade.replace(/\D/g, '')) : 0, 
            pesoPadrao: !isMissing ? variacoesValidas[0].peso : 0,
            isMissing: isMissing, 
            isOriginalMissing: isMissing
          });
        }

        // Salva na sessão específica do documento
        setWmsSessions(prev => ({
          ...prev,
          [dIdx]: { skus: skusProcessados, fileName: file.name }
        }));

        
// Salva na sessão específica do documento
        const novaSessao = { skus: skusProcessados, fileName: file.name };
        setWmsSessions(prev => ({ ...prev, [dIdx]: novaSessao }));

        // 👇 SALVAMENTO AUTOMÁTICO NO BANCO (BACKGROUND)
        const refFinal = pedidoModal._isLegacy 
          ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) 
          : doc(db, 'pedidos', pedidoModal.id);
          
        const novosDocumentos = [...pedidoModal.documentos];
        novosDocumentos[dIdx] = { ...novosDocumentos[dIdx], planejamentoWms: novaSessao };
        
        updateDoc(refFinal, { documentos: novosDocumentos }).catch(e => console.error("Erro Auto-Save:", e));

      } catch (error) {
        alert("Erro ao ler planejamento: " + error.message);
      } finally {
        setIsUploading(false);
        e.target.value = null;
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  // LÊ O CSV FINAL DE CAIXAS DO WMS (AUDITORIA)
  const handleAuditoriaUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !auditModalData) return;
    const currentIdx = auditModalData.dIdx; // Puxa o ID do documento pelo modal que já está aberto

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const linhas = text.trim().split(/\r\n|\n|\r/);
        if (linhas.length < 2) throw new Error("Arquivo CSV inválido ou vazio.");

        const cabecalho = linhas.shift().split(';').map(c => c.trim().replace(/"/g, ''));
        const map = {};

        linhas.forEach(l => {
          const cols = l.split(';');
          const status = cols[cabecalho.indexOf("Estado Conferência")]?.trim();
          if (status !== "EFETIVADO") return;

          const idEmbalagem = cols[cabecalho.indexOf("ID Embalagem Expedição")];
          if (!idEmbalagem) return;
          
          if (!map[idEmbalagem]) map[idEmbalagem] = [];
          
          map[idEmbalagem].push({
            num: cols[cabecalho.indexOf("Descrição Tipo Embalagem Expedição")],
            peso: parseFloat(cols[cabecalho.indexOf("Peso Embalagem")]?.replace(',', '.')) || 0,
            ref: cols[cabecalho.indexOf("Produto")],
            desc: cols[cabecalho.indexOf("Descrição Produto")],
            qtd: cols[cabecalho.indexOf("Quantidade")]
          });
        });

        const caixasReais = Object.keys(map).map(id => {
          const prods = map[id];
          return {
            num: prods[0].num || 'CX',
            peso: prods[0].peso || 0,
            isBonificacao: false,
            produtos: prods.map(p => ({
              referencia: p.ref,
              descricao: p.desc,
              quantidade: p.qtd
            }))
          };
        });

        // Atualiza o modal que já estava aberto para agora mostrar o relatório!
        setAuditModalData({ dIdx: currentIdx, fileName: file.name, caixasReais: caixasReais });

      } catch (error) {
        alert("Erro ao ler caixas efetivadas: " + error.message);
      } finally {
        e.target.value = null; 
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  // TROCA A VARIAÇÃO DA CAIXA E SALVA AUTOMATICAMENTE
  const handleMudarVariacao = (dIdx, skuRef, indexVariacao) => {
    setWmsSessions(prev => {
      const novoEstado = { ...prev };
      const sessao = { ...novoEstado[dIdx] };
      const skus = [...sessao.skus];
      
      const skuIndex = skus.findIndex(s => s.ref === skuRef);
      if (skuIndex === -1) return prev;

      const sku = { ...skus[skuIndex] };
      const novaVariacao = sku.variacoesDisponiveis[indexVariacao];

      if (novaVariacao) {
        // MÁGICA AQUI: Arranca as letras "CX" e deixa só os números para a matemática não zerar
        const qtdBruta = String(novaVariacao.quantidade || novaVariacao.qtdPadrao || novaVariacao.qtd || '0');
        const qtdLimpa = parseInt(qtdBruta.replace(/\D/g, '')) || 0;

        // Trata o peso removendo "kg" e trocando vírgula por ponto
        const pesoBruto = String(novaVariacao.peso || novaVariacao.pesoPadrao || '0');
        const pesoLimpo = parseFloat(pesoBruto.replace(',', '.').replace(/[^\d.]/g, '')) || 0;

        sku.caixaNome = novaVariacao.caixa || novaVariacao.caixaNome || "CAIXA";
        sku.qtdPadrao = qtdLimpa;
        sku.pesoPadrao = pesoLimpo;
        sku.variacaoSelecionadaIdx = indexVariacao; 
      }

      skus[skuIndex] = sku;
      sessao.skus = skus;
      novoEstado[dIdx] = sessao;

      // -----------------------------------------------------
      // AUTO-SAVE EM BACKGROUND (Salva a escolha no Firebase)
      // -----------------------------------------------------
      const refFinal = pedidoModal._isLegacy 
        ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) 
        : doc(db, 'pedidos', pedidoModal.id);
        
      const novosDocs = [...pedidoModal.documentos];
      novosDocs[dIdx] = { ...novosDocs[dIdx], planejamentoWms: sessao };
      updateDoc(refFinal, { documentos: novosDocs }).catch(e => console.error("Erro Auto-Save Variação", e));

      return novoEstado;
    });
  };
  // SALVA A AUDITORIA FINAL NO BANCO DE DADOS
  const confirmarAuditoriaWms = async () => {
    if (!auditModalData || !auditModalData.caixasReais) return;
    setIsSaving(true);
    
    try {
      const { dIdx, caixasReais, fileName } = auditModalData;
      const session = wmsSessions[dIdx] || { skus: [] };
      
      let pedidoRef;
      if (pedidoModal._isLegacy) {
        pedidoRef = doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id);
      } else {
        pedidoRef = doc(db, 'pedidos', pedidoModal.id);
      }

      // Gera o resumo rápido para o histórico
      let planejado = 0;
      session.skus.forEach(sku => {
        if (sku.qtdPadrao > 0) planejado += Math.ceil(sku.qtdTotal / sku.qtdPadrao);
      });
      const totalReais = caixasReais.length;
      
      const novosDocumentos = [...pedidoModal.documentos];
      novosDocumentos[dIdx] = { 
        ...novosDocumentos[dIdx], 
        caixas: caixasReais,
        // 👇 AQUI: SALVA O RELATÓRIO DEFINITIVO PARA HISTÓRICO!
        auditoria: {
          arquivo: fileName,
          planejado: planejado,
          efetivado: totalReais,
          diferenca: planejado - totalReais,
          data: new Date().toISOString()
        }
      };
      
      await updateDoc(pedidoRef, {
        documentos: novosDocumentos,
        efetivado: true, 
        completedAt: serverTimestamp()
      });
      
      alert("Auditoria validada e histórico salvo com sucesso!");
      setAuditModalData(null);
      setShowCaixasEfetivadasModal(dIdx); 
      
    } catch (error) {
      alert("Erro ao salvar auditoria no banco: " + error.message);
    } finally {
      setIsSaving(false);
    }
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
    // 👇 ADICIONADO: Reseta TUDO antes de abrir o modal
    resetForm();
    
    // Opcional: já define o responsável inicial com o email do usuário logado (facilita)
    if (localUser?.email) setDocResponsavel(String(localUser.email).toLowerCase().trim());
    
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => { setShowModal(false); setIsClosingModal(false); resetForm(); }, 350); 
  };

  const resetForm = () => {
    setEditingId(null); 
    setRomaneio(''); 
    setLoja(''); 
    setLocal('DF'); 
    setUf('');
    setIsCaixaMaster(false); 
    setObservacoes(''); 
    setDocsTemporarios([]); 
    setDocTipo('Nota Fiscal');
    // Força a limpeza ou pré-preenchimento
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
  // NOVO MOTOR DO RANKING DIÁRIO (LIMITADO A 300 PTS/CAIXA)
  // ==========================================
  const rankingCalculado = useMemo(() => {
    const userStats = {};
    
    // 1. Inicializa o painel para todos os usuários
    usuarios.forEach(u => {
      userStats[u.uid] = { 
        nome: u.email.split('@')[0], 
        skus: 0,         // Quantidade BRUTA de produtos (Visual)
        pontosSku: 0,    // Quantidade CAPADA de pontos gerados pelas caixas
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

    // 3. Processa os Pedidos / Romaneios (SKUs Limitados + 100 Bônus)
    pedidosProcessados.forEach(pedido => {
      let skusReais = 0;
      let pontosSKU = 0;

      // O PULO DO GATO: Conta e limita a pontuação por CAIXA, não pelo pedido todo
      (pedido.documentos || []).forEach(d => {
         (d.caixas || []).forEach(cx => {
            let skusNaCaixa = 0;
            (cx.produtos || []).forEach(p => skusNaCaixa += parseInt(p.quantidade) || 0);
            
            skusReais += skusNaCaixa;
            pontosSKU += Math.min(skusNaCaixa, 300); // Limita os pontos a 300 por caixa
         });
      });

      const participantes = pedido.uidsVinculados || [pedido.criadorUid];
      
      participantes.forEach(uid => {
         if (userStats[uid]) {
            if (pedido.efetivado) {
               userStats[uid].skus += skusReais; // Mantém histórico da volumetria real
               userStats[uid].pontosSku += pontosSKU; // Guarda os pontos filtrados pela regra
               userStats[uid].pedidos += 1;
               userStats[uid].bonusPedidos += 100; 
               userStats[uid].pontos += pontosSKU; // Aplica no total apenas os pontos permitidos
               userStats[uid].pontos += 100; // Aplica o bônus de corrida
            }
            
            const start = pedido.createdAt?.toMillis ? pedido.createdAt.toMillis() : currentTime;
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
       
       if (merged.length > 0) {
          const ultimaTarefa = merged[merged.length - 1];
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
       
       if (user.pontos < 0) user.pontos = 0; 
    });

    return Object.values(userStats)
       .filter(u => u.pontos > 0 || u.pedidos > 0 || u.op > 0) 
       .sort((a, b) => b.pontos - a.pontos)
       .map((u, idx) => ({ ...u, posicao: idx + 1 }));

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
                          <span><CheckCircle2 size={12}/> {user.skus} SKUs (Real)</span>
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
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📦 SKUs (Max 300 pts/caixa):</span> 
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                             <strong>{user.pontosSku} pts</strong>
                             <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>de {user.skus} unidades processadas</span>
                          </div>
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
          ========================================== */}
      {showDetalhesModal && pedidoModal && (
        <div className="op-modal-overlay" onClick={() => !isSaving && setShowDetalhesModal(false)}>
          <div className="op-modal-content" style={{width: '98vw', height: '95vh', maxWidth: '1600px', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '12px'}} onClick={(e) => e.stopPropagation()}>
            
            {/* HEADER FIXO - ADAPTADO PARA O DESIGN DA IMAGEM */}
            <div className="op-modal-header" style={{flexShrink: 0, padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {pedidoModal.isCaixaMaster ? (
                   <>
                     <Boxes size={26} color="#1e3a8a"/>
                     <h2 style={{ color: '#1e3a8a', fontSize: '1.4rem', margin: 0, fontWeight: 'bold' }}>
                       Caixas do Pedido <span style={{ color: '#cbd5e1', fontWeight: '300', marginLeft: '8px' }}>{pedidoModal.romaneio}</span>
                     </h2>
                   </>
                ) : (
                   <>
                     <div className="icon-wrap" style={{background: 'var(--primary)', color: '#fff'}}><Info size={24}/></div>
                     <div>
                       <h2>Painel do Romaneio: {pedidoModal.romaneio}</h2>
                       <p>{pedidoModal.loja || 'Destino Padrão'} {pedidoModal.uf ? `- ${pedidoModal.uf}` : ''}</p>
                     </div>
                   </>
                )}
              </div>
              <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }} onClick={() => setShowDetalhesModal(false)} disabled={isSaving || isUploading}><X size={24}/></button>
            </div>
            
            {/* Sistema de Abas (OCULTO SE FOR CAIXA MASTER) */}
            {!pedidoModal.isCaixaMaster && (
              <div className="modal-tabs-container" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 25px', flexShrink: 0 }}>
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
            )}
            
            {/* Corpo do Modal Rolável */}
            <div className="op-modal-body" style={{ flex: 1, padding: '25px', overflowY: 'auto', background: '#f8fafc' }}>
              
              {/* ======================================================= */}
              {/* LAYOUT EXCLUSIVO: ESTAÇÃO WMS CAIXA MASTER (TELA CHEIA) */}
              {/* ======================================================= */}
              {pedidoModal.isCaixaMaster ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', height: '100%', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    {(pedidoModal.documentos || []).map((doc, dIdx) => {
                      
                      // =========================================================
                      // CÁLCULOS MATEMÁTICOS PARA O PRÉ-RESUMO E FILTRO
                      // =========================================================
                      let totalVolumesGeral = 0;
                      let resumoTiposCaixa = {};
                      const termoBuscaWms = (buscasDocumentos[dIdx] || '').toLowerCase();
                      
                      const skusFiltrados = wmsSessions[dIdx] ? wmsSessions[dIdx].skus.filter(sku => {
                        // Calcula o pré-resumo
                        if (sku.qtdPadrao > 0) {
                          const cxsDesteSku = Math.ceil(sku.qtdTotal / sku.qtdPadrao);
                          totalVolumesGeral += cxsDesteSku;
                          let tKey = sku.caixaNome || "INDEFINIDO";
                          if (!resumoTiposCaixa[tKey]) resumoTiposCaixa[tKey] = { qtd: 0, peso: 0 };
                          resumoTiposCaixa[tKey].qtd += cxsDesteSku;
                          resumoTiposCaixa[tKey].peso += cxsDesteSku * parseFloat(sku.pesoPadrao || 0);
                        }
                        // Aplica o filtro de pesquisa
                        if (!termoBuscaWms) return true;
                        return sku.ref.toLowerCase().includes(termoBuscaWms) || sku.desc.toLowerCase().includes(termoBuscaWms);
                      }) : [];

                      return (
                        <div key={dIdx} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', overflow: 'hidden', padding: '25px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                            <h4 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Layers size={22} color="#1e3a8a" /> {doc.tipo} 
                              <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'normal' }}>({doc.responsavel?.split('@')[0]})</span>
                            </h4>
                          </div>

                          {!wmsSessions[dIdx] ? (
                            /* ESTÁGIO 1: DROPZONE */
                            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px' }}>
                              <FileText size={64} color="#94a3b8" style={{ marginBottom: '20px' }} />
                              <h3 style={{ color: 'var(--primary)', margin: '0 0 10px 0', fontSize: '1.5rem' }}>Planejamento de Caixas Master</h3>
                              <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '30px' }}>Faça o upload do arquivo CSV extraído do WMS para iniciar o cruzamento de dados de embalagem.</p>
                              
                              <input 
                                type="file" accept=".csv" id={`plan-upload-${dIdx}`} style={{ display: 'none' }} 
                                onChange={(e) => handlePlanejamentoUpload(e, dIdx)} disabled={isUploading}
                              />
                              <label htmlFor={`plan-upload-${dIdx}`} style={{ background: 'var(--primary)', color: '#fff', padding: '14px 35px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                {isUploading ? <Loader2 size={20} className="fa-spin"/> : <UploadCloud size={20}/>}
                                {isUploading ? 'Analisando Base de Dados...' : 'Selecionar Arquivo CSV WMS'}
                              </label>
                            </div>
                          ) : (
                            /* ESTÁGIO 2: TABELA DE GERENCIAMENTO (DESIGN FIEL À IMAGEM) */
                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                              
                              {/* TOOLBAR CONECTADA E FUNCIONAL */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '15px' }}>
                                <div>
                                  <div style={{ fontSize: '1.3rem', color: '#1e3a8a', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                                    {wmsSessions[dIdx].loja || pedidoModal.loja || 'LOJA NÃO DEFINIDA'}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                    Romaneio WMS: <strong style={{ color: '#ea580c' }}>{wmsSessions[dIdx].romaneio || pedidoModal.romaneio}</strong>
                                  </div>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  
                                  {/* BUSCA */}
                                  <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }}/>
                                    <input type="text" 
                                      placeholder="Buscar Produto ou SKU..." 
                                      value={buscasDocumentos[dIdx] || ''} 
                                      onChange={(e) => handleBuscaDocumento(dIdx, e.target.value)}
                                      style={{ padding: '8px 10px 8px 32px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', width: '220px', color: '#334155' }}/>
                                  </div>
                                  
                                  {/* PRÉ-RESUMO (POPOVER) */}
                                  <div style={{ position: 'relative' }}>
                                    <button 
                                      onClick={() => setWmsPreResumoAberto(wmsPreResumoAberto === dIdx ? null : dIdx)}
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#1e3a8a', fontWeight: 'bold', cursor: 'pointer' }}>
                                      <FileText size={14} color="#ea580c"/> Pré-Resumo 
                                      <span style={{ background: '#1e3a8a', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem' }}>
                                        {totalVolumesGeral}
                                      </span>
                                    </button>
                                    
                                    {wmsPreResumoAberto === dIdx && (
                                      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '15px', width: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50 }}>
                                        <h4 style={{ margin: '0 0 10px 0', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px', color: 'var(--primary)', fontSize: '0.95rem' }}>Volumes Estimados</h4>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                          {Object.keys(resumoTiposCaixa).length === 0 ? <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>Nenhuma caixa projetada.</span> : ''}
                                          {Object.keys(resumoTiposCaixa).map(k => (
                                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                              <strong style={{ color: '#334155' }}>{k}</strong>
                                              <span>{resumoTiposCaixa[k].qtd} un <span style={{ color: '#cbd5e1', margin: '0 4px' }}>|</span> <strong style={{ color: '#10b981' }}>{resumoTiposCaixa[k].peso.toFixed(1)}kg</strong></span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* VER CAIXAS EFETIVADAS */}
                                    <button onClick={() => setShowCaixasEfetivadasModal(dIdx)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', color: '#1e3a8a', cursor: 'pointer', display: 'flex' }} title="Estrutura de Caixas Salvas">
                                      <Boxes size={16}/>
                                    </button>
                                    
                                    {/* DESCARTAR PLANEJAMENTO E LIMPAR BANCO */}
                                    <button onClick={async () => {
                                      if(!window.confirm("Deseja realmente descartar este planejamento?")) return;
                                      setWmsSessions(prev => { const n = {...prev}; delete n[dIdx]; return n; });
                                      
                                      const refFinal = pedidoModal._isLegacy ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) : doc(db, 'pedidos', pedidoModal.id);
                                      const novosDocs = [...pedidoModal.documentos];
                                      novosDocs[dIdx] = { ...novosDocs[dIdx] };
                                      delete novosDocs[dIdx].planejamentoWms;
                                      updateDoc(refFinal, { documentos: novosDocs });
                                    }} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', display: 'flex' }} title="Descartar Planejamento">
                                      <Trash2 size={16}/>
                                    </button>
                                    
                                    {/* IMPORTAR CAIXAS (ABRE O MODAL INTELIGENTE) */}
                                    <button onClick={() => {
                                      const docDb = pedidoModal.documentos[dIdx];
                                      if (docDb.caixas && docDb.caixas.length > 0) {
                                        setAuditModalData({ dIdx: dIdx, fileName: docDb.auditoria?.arquivo || 'Arquivo Salvo', caixasReais: docDb.caixas });
                                      } else {
                                        setAuditModalData({ dIdx: dIdx });
                                      }
                                    }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: pedidoModal.documentos[dIdx].caixas?.length > 0 ? '#0ea5e9' : '#22c55e', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', margin: 0 }}>
                                      {pedidoModal.documentos[dIdx].caixas?.length > 0 ? <PieChart size={16}/> : <CheckCircle2 size={16}/>}
                                      {pedidoModal.documentos[dIdx].caixas?.length > 0 ? 'Ver Auditoria' : 'Importar Caixas'}
                                    </button>
                                </div>
                              </div>
                              
                              {/* TABELA DE DADOS (USANDO SKUS FILTRADOS) */}
                              <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                  <thead style={{ background: '#e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                      <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>PRODUTO <ArrowUpDown size={10} style={{marginLeft: '4px', opacity: 0.5}}/></th>
                                      <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>QTD PEDIDO <ArrowUpDown size={10} style={{marginLeft: '4px', opacity: 0.5}}/></th>
                                      <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>TIPO UC</th>
                                      <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>TIPO CAIXA</th>
                                      <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>PESO</th>
                                      <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>SELECIONAR VARIAÇÃO</th>
                                      <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>TOTAL CX</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {skusFiltrados.length === 0 ? (
                                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum SKU encontrado.</td></tr>
                                    ) : (
                                      skusFiltrados.map((sku, i) => {
                                        const isExpanded = skusExpandidos[`${dIdx}-${sku.ref}`];

                                        return (
                                          <React.Fragment key={i}>
                                            <tr style={{ borderBottom: '1px solid #f1f5f9', background: sku.isMissing ? '#fef2f2' : (isExpanded ? '#f8fafc' : '#fff'), transition: 'background 0.2s' }}>
                                              <td style={{ padding: '15px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                  
                                                  {/* SETINHA ANIMADA DE EXPANSÃO */}
                                                  <div 
                                                    onClick={() => setSkusExpandidos(prev => ({...prev, [`${dIdx}-${sku.ref}`]: !prev[`${dIdx}-${sku.ref}`]}))}
                                                    style={{ marginTop: '2px', cursor: 'pointer', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease', padding: '2px' }}
                                                    title="Ver caixas deste produto"
                                                  >
                                                    <ChevronDown size={18} color={isExpanded ? "#ea580c" : "#0284c7"} />
                                                  </div>
                                                  
                                                  <div>
                                                    <strong style={{ color: '#0284c7', fontSize: '0.9rem' }}>{sku.ref}</strong><br/>
                                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>{sku.desc}</span>
                                                  </div>
                                                </div>
                                              </td>
                                              <td style={{ padding: '15px', textAlign: 'center', fontWeight: '900', fontSize: '1.05rem', color: '#1e293b' }}>{sku.qtdTotal}</td>
                                              <td style={{ padding: '15px', textAlign: 'center' }}>
                                                {sku.isMissing ? (
                                                  <input type="number" placeholder="Qtd" value={sku.qtdPadrao || ''} onChange={(e) => handleInputManual(dIdx, sku.ref, 'qtdPadrao', e.target.value)} style={{ width: '60px', padding: '6px', border: '1px solid #ef4444', borderRadius: '4px', outline: 'none', textAlign: 'center', fontSize: '0.8rem', background: '#fff' }}/>
                                                ) : (
                                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#475569', fontSize: '0.9rem' }}>
                                                    CX{sku.qtdPadrao} 
                                                    <span title="Copiar Código de Barras da Embalagem" onClick={(e) => {
                                                        const variacao = sku.variacoesDisponiveis && sku.variacoesDisponiveis[sku.variacaoSelecionadaIdx || 0];
                                                        const eanToCopy = variacao?.codigoBarras || sku.codigoBarras || variacao?.ean || sku.ean || 'EAN-NÃO-CADASTRADO';
                                                        if (eanToCopy !== 'EAN-NÃO-CADASTRADO') { navigator.clipboard.writeText(eanToCopy); } else { alert('O campo "codigoBarras" não foi encontrado nesta variação ou produto no banco de dados.'); }
                                                        const spanRef = e.currentTarget;
                                                        spanRef.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                                                        setTimeout(() => { spanRef.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'; }, 1500);
                                                      }} style={{ cursor: 'pointer', display: 'flex', padding: '4px', background: '#f1f5f9', borderRadius: '4px' }}>
                                                      <Copy size={15} color="#ea580c" />
                                                    </span>
                                                  </div>
                                                )}
                                              </td>
                                              <td style={{ padding: '15px', textAlign: 'center' }}>
                                                {sku.isMissing ? (
                                                  <input type="text" placeholder="Ex: CAIXA 1" value={sku.caixaNome || ''} onChange={(e) => handleInputManual(dIdx, sku.ref, 'caixaNome', e.target.value)} style={{ width: '90px', padding: '6px', border: '1px solid #ef4444', borderRadius: '4px', outline: 'none', textAlign: 'center', fontSize: '0.8rem', background: '#fff' }}/>
                                                ) : (
                                                  <span style={{ color: '#475569', fontSize: '0.9rem' }}>{sku.caixaNome}</span>
                                                )}
                                              </td>
                                              <td style={{ padding: '15px', textAlign: 'center' }}>
                                                {sku.isMissing ? (
                                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                    <input type="number" step="0.1" placeholder="0.0" value={sku.pesoPadrao || ''} onChange={(e) => handleInputManual(dIdx, sku.ref, 'pesoPadrao', e.target.value)} style={{ width: '60px', padding: '6px', border: '1px solid #ef4444', borderRadius: '4px', outline: 'none', textAlign: 'center', fontSize: '0.8rem', background: '#fff' }}/>
                                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>kg</span>
                                                  </div>
                                                ) : (
                                                  <span style={{ color: '#475569', fontSize: '0.9rem' }}>{sku.pesoPadrao}kg</span>
                                                )}
                                              </td>
                                              <td style={{ padding: '15px', textAlign: 'center' }}>
                                                {sku.isMissing ? (
                                                  <button 
                                                    disabled={!sku.qtdPadrao || !sku.caixaNome || !sku.pesoPadrao}
                                                    onClick={() => abrirModalSalvarManual(dIdx, sku)}
                                                    style={{ background: (!sku.qtdPadrao || !sku.caixaNome || !sku.pesoPadrao) ? '#fca5a5' : '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: (!sku.qtdPadrao || !sku.caixaNome || !sku.pesoPadrao) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '0 auto' }}
                                                  >
                                                    <CheckCircle2 size={14}/> Salvar UC
                                                  </button>
                                                ) : (
                                                  sku.variacoesDisponiveis && sku.variacoesDisponiveis.length > 1 ? (
                                                    <select value={sku.variacaoSelecionadaIdx || 0} onChange={(e) => handleMudarVariacao(dIdx, sku.ref, parseInt(e.target.value))} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', outline: 'none', color: '#475569', width: '100%', maxWidth: '200px', background: '#f8fafc', cursor: 'pointer' }}>
                                                      {sku.variacoesDisponiveis.map((v, vIdx) => ( <option key={vIdx} value={vIdx}> {v.caixa} / {v.quantidade} un / {v.peso}kg </option> ))}
                                                    </select>
                                                  ) : (
                                                    <span style={{ background: '#f1f5f9', color: '#94a3b8', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>Padrão Único</span>
                                                  )
                                                )}
                                              </td>
                                              <td style={{ padding: '15px', textAlign: 'center', background: isExpanded ? '#f1f5f9' : '#f8fafc', borderLeft: '1px solid #e2e8f0', transition: 'background 0.2s' }}>
                                                <div style={{ fontWeight: '900', color: '#1e3a8a', fontSize: '1.25rem' }}>
                                                  {sku.qtdPadrao > 0 ? Math.ceil(sku.qtdTotal / sku.qtdPadrao) : 0}
                                                </div>
                                              </td>
                                            </tr>

                                            {/* ======================================================== */}
                                            {/* GAVETA OCULTA: LISTAGEM DE CAIXAS (PROJEÇÃO OU REAL) */}
                                            {/* ======================================================== */}
                                            {isExpanded && (() => {
                                              const caixasEfetivadasDb = pedidoModal.documentos[dIdx]?.caixas || [];
                                              const caixasEfetivadasDesteSku = caixasEfetivadasDb.filter(cx => cx.produtos?.some(p => p.referencia === sku.ref));

                                              let caixasParaExibir = [];
                                              let isProjecao = false;

                                              if (caixasEfetivadasDesteSku.length > 0) {
                                                  // Puxa as caixas reais do arquivo importado
                                                  caixasParaExibir = caixasEfetivadasDesteSku.map((cx) => {
                                                      const p = cx.produtos.find(prod => prod.referencia === sku.ref);
                                                      return { titulo: cx.num || 'CX', qtd: p.quantidade, peso: cx.peso, real: true };
                                                  });
                                              } else if (sku.qtdPadrao > 0) {
                                                  // Gera a projeção matemática de fracionamento
                                                  isProjecao = true;
                                                  let restante = sku.qtdTotal;
                                                  let vol = 1;
                                                  while(restante > 0) {
                                                      const qtdNestaCaixa = Math.min(restante, sku.qtdPadrao);
                                                      // Calcula o peso proporcional (ex: se a última caixa tem metade dos itens, terá metade do peso)
                                                      const pesoProp = (sku.pesoPadrao * (qtdNestaCaixa / sku.qtdPadrao)).toFixed(1);
                                                      caixasParaExibir.push({ titulo: `${sku.caixaNome || 'CAIXA'} (Vol ${vol})`, qtd: qtdNestaCaixa, peso: pesoProp, real: false });
                                                      restante -= qtdNestaCaixa;
                                                      vol++;
                                                  }
                                              }

                                              return (
                                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', boxShadow: 'inset 0 4px 6px -4px rgba(0,0,0,0.05)' }}>
                                                  <td colSpan="7" style={{ padding: '20px 25px' }}>
                                                    
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                                       <Boxes size={18} color={isProjecao ? "#d97706" : "#10b981"}/>
                                                       <h5 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.95rem' }}>
                                                         {isProjecao ? 'Projeção de Fracionamento (Pré-WMS)' : 'Caixas Efetivadas no WMS'}
                                                       </h5>
                                                       {isProjecao && <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #fde68a' }}>Estimativa Baseada na Variação</span>}
                                                    </div>

                                                    {caixasParaExibir.length === 0 ? (
                                                      <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nenhum dado matemático para gerar caixas.</div>
                                                    ) : (
                                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                                                         {caixasParaExibir.map((cx, cIdx) => (
                                                           <div key={cIdx} style={{ background: '#fff', border: `1px solid ${cx.real ? '#cbd5e1' : '#e2e8f0'}`, borderLeft: `4px solid ${cx.real ? '#10b981' : '#0ea5e9'}`, borderRadius: '6px', padding: '12px 15px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                             <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', marginBottom: '6px' }}>{cx.titulo}</div>
                                                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                               <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#334155', lineHeight: '1' }}>{cx.qtd} <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8'}}>un</span></div>
                                                               <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>{cx.peso}kg</div>
                                                             </div>
                                                           </div>
                                                         ))}
                                                      </div>
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            })()}
                                          </React.Fragment>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>

                            
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                
                /* ======================================================= */
                /* LAYOUT PADRÃO: PEDIDO COMUM (COM ABAS)                  */
                /* ======================================================= */
                <>
                  {/* ABA 1: RESUMO GERAL (EDITÁVEL) */}
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

                  {/* ABA 2: CAIXAS COMPLETAS E WMS (ACORDEON COMUM) */}
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
                                        const caixaOriginalIdx = doc.caixas.indexOf(cx); 
                                        
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 1: AUDITORIA WMS (Upload -> Relatório) */}
            {auditModalData && (() => {
              const { dIdx, fileName, caixasReais } = auditModalData;

              // =========================================================
              // TELA 1: AGUARDANDO O UPLOAD DO ARQUIVO
              // =========================================================
              // =========================================================
              // TELA 1: AGUARDANDO O UPLOAD DO ARQUIVO
              // =========================================================
              if (!caixasReais) {
                return (
                  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(248, 250, 252, 0.95)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    
                    {/* ADICIONADO position: 'relative' AQUI NESTA DIV 👇 */}
                    <div style={{ position: 'relative', background: '#fff', padding: '40px', borderRadius: '16px', width: '550px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      
                      {/* 👇 NOVO BOTÃO DE FECHAR (X) */}
                      <button onClick={() => setAuditModalData(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '5px' }}>
                        <X size={24}/>
                      </button>

                      <div style={{ background: '#e0f2fe', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#0ea5e9' }}>
                        <UploadCloud size={40} />
                      </div>
                      <h3 style={{ color: '#0f172a', fontSize: '1.6rem', margin: '0 0 10px 0' }}>Importar Caixas Efetivadas</h3>
                      <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '30px', lineHeight: '1.5' }}>
                        Importe o arquivo CSV contendo os volumes consolidados no WMS. O sistema fará o cruzamento automático com o seu planejamento antes de efetivar o fechamento.
                      </p>

                      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        <button onClick={() => setAuditModalData(null)} style={{ padding: '12px 25px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', flex: 1 }}>Cancelar</button>
                        
                        <label htmlFor="audit-upload-modal" style={{ padding: '12px 25px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flex: 1, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                          <FileText size={18}/> Escolher CSV
                          <input type="file" accept=".csv" id="audit-upload-modal" style={{ display: 'none' }} onChange={handleAuditoriaUpload}/>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              }

              // =========================================================
              // TELA 2: RELATÓRIO DE AUDITORIA GERADO
              // =========================================================
              const session = wmsSessions[dIdx] || { skus: [] };
              
              let planejado = 0;
              let planSummary = {};
              session.skus.forEach(sku => {
                if (sku.qtdPadrao > 0) {
                  const cxs = Math.ceil(sku.qtdTotal / sku.qtdPadrao);
                  planejado += cxs;
                  const key = sku.caixaNome || "INDEFINIDA";
                  if (!planSummary[key]) planSummary[key] = { qtd: 0, pesoTotal: 0 };
                  planSummary[key].qtd += cxs;
                  planSummary[key].pesoTotal += cxs * parseFloat(sku.pesoPadrao || 0);
                }
              });

              const totalReais = caixasReais.length;
              let realSummary = {};
              caixasReais.forEach(cx => {
                const key = cx.num || cx.caixa || "INDEFINIDA";
                if (!realSummary[key]) realSummary[key] = { qtd: 0, pesoTotal: 0 };
                realSummary[key].qtd += 1;
                realSummary[key].pesoTotal += parseFloat(cx.peso || 0);
              });

              const diff = planejado - totalReais;
              const isPerfect = (planejado === totalReais);
              const cor = isPerfect ? '#155724' : '#721c24';
              const bg = isPerfect ? '#d4edda' : '#f8d7da';
              const allTypes = Array.from(new Set([...Object.keys(planSummary), ...Object.keys(realSummary)])).sort();

              return (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(248, 250, 252, 0.95)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  
                  {/* ADICIONADO position: 'relative' AQUI NESTA DIV 👇 */}
                  <div style={{ position: 'relative', background: '#fff', padding: '30px', borderRadius: '12px', width: '850px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }}>
                    
                    {/* 👇 NOVO BOTÃO DE FECHAR (X) */}
                    <button onClick={() => setAuditModalData(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '5px' }}>
                      <X size={24}/>
                    </button>

                    <div style={{ textAlign: 'center', marginBottom: '20px', flexShrink: 0 }}>
                      <h2 style={{ margin: '0 0 5px 0', color: 'var(--primary)', fontSize: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <PieChart size={28} /> Relatório de Auditoria e Fechamento
                      </h2>
                      <small style={{ color: '#64748b', fontSize: '0.9rem' }}>Arquivo Analisado: <strong>{fileName}</strong></small>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: bg, color: cor, padding: '20px', borderRadius: '10px', border: `1px solid ${isPerfect ? '#c3e6cb' : '#f5c6cb'}`, marginBottom: '20px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <small style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem', opacity: 0.8 }}>Planejado pela Plataforma</small>
                          <div style={{ fontSize: '2.2rem', fontWeight: 900 }}>{planejado} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>volumes</span></div>
                        </div>
                        <div style={{ fontSize: '2rem', opacity: 0.2 }}><ArrowRightLeft size={32}/></div>
                        <div style={{ textAlign: 'center' }}>
                          <small style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem', opacity: 0.8 }}>Efetivado na Expedição</small>
                          <div style={{ fontSize: '2.2rem', fontWeight: 900 }}>{totalReais} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>volumes</span></div>
                        </div>
                      </div>
                      
                      {!isPerfect && (
                        <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', padding: '12px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <AlertTriangle size={18}/> Discrepância de {Math.abs(diff)} caixa(s) detectada! Verifique o fracionamento na tabela.
                        </div>
                      )}

                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff', marginBottom: '10px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.85rem' }}>
                          <thead style={{ background: '#f8fafc' }}>
                            <tr>
                              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>TIPO EMBALAGEM</th>
                              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>PLANEJADO</th>
                              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>REAL (WMS)</th>
                              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>PESO ESTIMADO</th>
                              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>PESO REAL</th>
                              <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>CONFERÊNCIA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allTypes.map(type => {
                              const p = planSummary[type] || { qtd: 0, pesoTotal: 0 };
                              const r = realSummary[type] || { qtd: 0, pesoTotal: 0 };
                              const matchQtd = p.qtd === r.qtd;
                              const matchPeso = Math.abs(p.pesoTotal - r.pesoTotal) < 0.05; 
                              
                              return (
                                <tr key={type} style={{ borderBottom: '1px solid #f1f5f9', background: matchQtd && matchPeso ? '#fff' : '#fef2f2' }}>
                                  <td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: 'var(--primary)' }}>{type}</td>
                                  <td style={{ padding: '12px' }}>{p.qtd}</td>
                                  <td style={{ padding: '12px', color: matchQtd ? 'inherit' : '#ef4444', fontWeight: matchQtd ? 'normal' : 'bold' }}>{r.qtd}</td>
                                  <td style={{ padding: '12px' }}>{p.pesoTotal.toFixed(1)} kg</td>
                                  <td style={{ padding: '12px', color: matchPeso ? 'inherit' : '#ef4444', fontWeight: matchPeso ? 'normal' : 'bold' }}>{r.pesoTotal.toFixed(1)} kg</td>
                                  <td style={{ padding: '12px' }}>
                                    {matchQtd && matchPeso ? 
                                      <span style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><CheckCircle2 size={14}/> OK</span> : 
                                      <span style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><X size={14}/> Erro</span>
                                    }
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                      <button onClick={() => setAuditModalData({dIdx: dIdx})} style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Voltar e Trocar Arquivo</button>
                      <button onClick={confirmarAuditoriaWms} disabled={isSaving} style={{ flex: 1, padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>
                        {isSaving ? <Loader2 className="fa-spin"/> : <CheckCircle2/>} Confirmar Efetivação
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* SUB-MODAL 2: CAIXAS EFETIVADAS (Prévia do Banco) */}
            {showCaixasEfetivadasModal !== null && (() => {
              const dIdx = showCaixasEfetivadasModal;
              const docEfetivado = pedidoModal.documentos[dIdx];
              const caixas = docEfetivado?.caixas || [];

              // 1. Aplica o Filtro de Busca
              const termo = buscaCaixasSalvas.toLowerCase();
              const caixasFiltradas = caixas.filter(cx => {
                if (!termo) return true;
                const matchNum = String(cx.num || cx.caixa || '').toLowerCase().includes(termo);
                const matchProd = cx.produtos?.some(p => {
                  const cod = typeof p === 'object' && p !== null ? (p.sku || p.referencia || p.produto || '') : String(p);
                  return cod.toLowerCase().includes(termo);
                });
                return matchNum || matchProd;
              });

              // 2. Calcula o Resumo para a Coluna da Direita e Botão Copiar
              const cxMapDetalhe = caixasFiltradas.reduce((acc, cx) => {
                const nome = cx.num || cx.caixa || 'CAIXA';
                if (!acc[nome]) acc[nome] = { qtd: 0, peso: 0 };
                acc[nome].qtd += 1;
                acc[nome].peso += parseFloat(cx.peso || 0);
                return acc;
              }, {});

              return (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.6)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: '#f8fafc', padding: '0', borderRadius: '12px', width: '95%', maxWidth: '1200px', height: '90%', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                    
                    {/* HEADER DO MODAL */}
                    <div style={{ padding: '20px 25px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', fontSize: '1.4rem' }}>
                        <Boxes size={26}/> Caixas Efetivadas e Salvas
                      </h3>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, justifyContent: 'flex-end' }}>
                        {/* BARRA DE BUSCA */}
                        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }}/>
                          <input type="text" placeholder="Buscar Caixa ou SKU..." value={buscaCaixasSalvas} onChange={(e) => setBuscaCaixasSalvas(e.target.value)} style={{ width: '100%', padding: '9px 10px 9px 36px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}/>
                        </div>

                        {/* BOTÃO COPIAR */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const texto = Object.keys(cxMapDetalhe).map(k => `${k} (${cxMapDetalhe[k].peso.toFixed(2)} kg): ${cxMapDetalhe[k].qtd} Un`).join('\n');
                            navigator.clipboard.writeText(texto);
                            const btn = e.currentTarget;
                            const originalHTML = btn.innerHTML;
                            btn.innerHTML = '<span style="display:flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copiado!</span>';
                            btn.style.color = '#10b981';
                            btn.style.borderColor = '#10b981';
                            btn.style.background = '#ecfdf5';
                            setTimeout(() => {
                              btn.innerHTML = originalHTML;
                              btn.style.color = '#475569';
                              btn.style.borderColor = '#cbd5e1';
                              btn.style.background = '#f8fafc';
                            }, 1500);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', padding: '9px 15px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                          title="Copiar resumo no padrão WMS"
                        >
                          <Copy size={16} /> Copiar Resumo
                        </button>
                        
                        {/* FECHAR */}
                        <button onClick={() => { setShowCaixasEfetivadasModal(null); setBuscaCaixasSalvas(''); }} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '6px' }}><X size={24}/></button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                      
                      {/* COLUNA ESQUERDA: LISTAGEM DE CAIXAS */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '25px' }}>
                        {caixas.length === 0 ? (
                          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Nenhuma caixa importada ainda. Realize a auditoria.</div>
                        ) : caixasFiltradas.length === 0 ? (
                          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Nenhuma caixa corresponde à busca.</div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                            {caixasFiltradas.map((cx, idx) => (
                              <div key={idx} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '15px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '10px' }}>
                                   <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{cx.num || 'CX'} <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>(Vol {caixas.indexOf(cx) + 1})</span></strong>
                                   <span style={{ fontWeight: 'bold', color: '#64748b' }}>{parseFloat(cx.peso).toFixed(1)}kg</span>
                                 </div>
                                 <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                   {cx.produtos.map((p, pIdx) => (
                                     <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569', padding: '4px 0', borderBottom: '1px dashed #f1f5f9' }}>
                                       <span style={{flex:1}}>{p.referencia}</span>
                                       <span style={{flex:2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '0 10px'}}>{p.descricao}</span>
                                       <strong style={{color: '#0ea5e9'}}>{p.quantidade} un</strong>
                                     </div>
                                   ))}
                                 </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* COLUNA DIREITA: RESUMO GERAL */}
                      <div style={{ width: '320px', background: '#fff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ListTree size={18}/> Resumo Geral
                          </h4>
                        </div>
                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                          {Object.keys(cxMapDetalhe).length === 0 ? (
                             <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>Nenhum dado para resumir.</div>
                          ) : (
                            Object.keys(cxMapDetalhe).map((k, idx) => (
                              <div key={idx} style={{ fontSize: '0.9rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong style={{color: 'var(--primary)'}}>{k}</strong> 
                                  <span style={{color: '#94a3b8', fontSize: '0.8rem'}}>({cxMapDetalhe[k].peso.toFixed(1)} kg)</span>
                                </div>
                                <span style={{fontWeight: 700, color: '#334155'}}>{cxMapDetalhe[k].qtd} Un</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })()}
      {/* ==========================================
          RESTANTE DOS MODAIS (O.P., MASTER)
          ========================================== */}

          {/* ======================================================= */}
            {/* MODAL: INSERIR CÓDIGO DE BARRAS DA NOVA VARIAÇÃO          */}
            {/* ======================================================= */}
            {modalCodigoBarras && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'relative', background: '#fff', padding: '35px', borderRadius: '16px', width: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  
                  <button onClick={() => setModalCodigoBarras(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '5px' }}>
                    <X size={24}/>
                  </button>

                  <h3 style={{ color: '#0f172a', fontSize: '1.4rem', margin: '0 0 10px 0' }}>Vincular Código de Barras</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.5' }}>
                    Para registrar a embalagem <strong style={{color: '#ef4444'}}>CX{modalCodigoBarras.sku.qtdPadrao}</strong> do produto <strong>{modalCodigoBarras.sku.ref}</strong>, insira ou bipe o código de barras (EAN) abaixo:
                  </p>
                  
                  <input 
                    type="text" 
                    placeholder="Bipar ou digitar EAN..." 
                    autoFocus
                    value={codigoBarrasInput}
                    onChange={(e) => setCodigoBarrasInput(e.target.value)}
                    style={{ width: '100%', padding: '14px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '1.1rem', outline: 'none', textAlign: 'center', marginBottom: '25px', color: '#1e293b', fontWeight: 'bold' }}
                  />

                  <div style={{ display: 'flex', gap: '15px' }}>
                    <button onClick={() => setModalCodigoBarras(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}>Cancelar</button>
                    <button 
                      onClick={salvarVariacaoBanco} 
                      disabled={isSaving || !codigoBarrasInput.trim()} 
                      style={{ flex: 1, padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: (!codigoBarrasInput.trim() || isSaving) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)', opacity: (!codigoBarrasInput.trim() || isSaving) ? 0.7 : 1 }}
                    >
                      {isSaving ? <Loader2 className="fa-spin" size={18}/> : <CheckCircle2 size={18}/>} Confirmar e Salvar
                    </button>
                  </div>
                </div>
              </div>
            )}

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
              
              {/* BARRA DE FERRAMENTAS E BUSCA */}
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

              {/* LISTAGEM E FORMULÁRIOS */}
              <div style={{ maxHeight: '550px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px', paddingRight: '5px' }}>
                
                {/* FORMULÁRIO DE CRIAÇÃO/EDIÇÃO (Renderiza no topo quando ativo) */}
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

                {/* RENDERIZAÇÃO DOS CARDS NORMAIS (Oculta durante criação de NOVO, mostra os outros durante edição) */}
                {caixasMasterFiltradas.length === 0 && modoEdicaoMaster === null ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                    {buscaMaster ? 'Nenhum produto ou variação encontrada para essa busca.' : 'O dicionário de Caixas Master está vazio.'}
                  </div>
                ) : (
                  caixasMasterFiltradas.map(master => {
                    if (modoEdicaoMaster === master.id || modoEdicaoMaster === master.ref) return null; // Não renderiza o card normal se ele estiver sendo editado acima
                    
                    return (
                      <div key={master.id || master.ref} style={{ display: 'flex', flexDirection: 'column', background: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
                        
                        {/* BOTÕES DE AÇÃO DO CARD */}
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