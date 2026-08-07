// src/pages/Operacao.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  collection, addDoc, serverTimestamp, getDocs, doc,
  query, where, onSnapshot, collectionGroup, Timestamp, deleteField 
} from 'firebase/firestore';
import { updateDoc, setDoc, arrayUnion, deleteDoc, getDoc, increment, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase'; 
import { 
  ArrowLeft, Plus, FileText, CheckCircle2, 
  Clock, MoreVertical, Search, Boxes, X, User, Trash2, PackagePlus, Loader2, Edit, Check, Pause, Play, AlertCircle, MapPin, UploadCloud,
  Trophy, Medal, Factory, Package, Copy, Info, AlignLeft, ListTree, ChevronDown, Layers, ArrowUpDown, RefreshCcw, PieChart, ArrowRightLeft, AlertTriangle, Gift} from 'lucide-react';
import '../css/Operacao.css';
import AuditoriaWms from '../components/AuditoriaWms';
import ModalCaixasEfetivadas from '../components/ModalCaixasEfetivadas';
import ModalCaixasMaster from '../components/ModalCaixasMaster';
import ModalOrdemProducao from '../components/ModalOrdemProducao';
import ModalPausa from '../components/ModalPausa';
import ModalCodigoBarras from '../components/ModalCodigoBarras';
import ModalCaixaManual from '../components/ModalCaixaManual';
import ModalAlertaPeso from '../components/ModalAlertaPeso';
import ModalSucesso from '../components/ModalSucesso';
import ModalCriarEditarPedido from '../components/ModalCriarEditarPedido';
import ModalDetalhesPedido from '../components/ModalDetalhesPedido';
import RankingDiario from '../components/RankingDiario';


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
  const [pedidoToPause, setPedidoToPause] = useState(null);

  const [showOpModal, setShowOpModal] = useState(false);
  const [opsDoDia, setOpsDoDia] = useState([]);

  const [showMasterModal, setShowMasterModal] = useState(false);
  const [caixasMaster, setCaixasMaster] = useState([]);
  const [buscaRomaneio, setBuscaRomaneio] = useState('');
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
  const [abaAtivaComum, setAbaAtivaComum] = useState({}); // Controla a aba por documento { [dIdx]: 0 ou 1 }
  const [skusExpandidosComum, setSkusExpandidosComum] = useState({}); // Controla as gavetas { [`${dIdx}-${ref}`]: boolean }
  const [modalSucesso, setModalSucesso] = useState(null); // Vai guardar { titulo, mensagem }

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

  // SALVA A NOVA VARIAÇÃO NO BANCO DE DADOS (COM PROTEÇÃO ANTI-DUPLICIDADE E AUTO-UPDATE)
  const salvarVariacaoBanco = async () => {
    if (!codigoBarrasInput.trim()) {
      alert("Por favor, insira o código de barras.");
      return;
    }
    
    const { dIdx, sku } = modalCodigoBarras;
    setIsSaving(true);
    
    try {
      const produtoRef = doc(db, 'caixasMaster', sku.ref);
      
      const novaVariacao = {
        caixa: sku.caixaNome || 'CAIXA',
        quantidade: sku.qtdPadrao,
        peso: sku.pesoPadrao,
        codigoBarras: codigoBarrasInput
      };

      // 1. LÊ O BANCO ANTES DE SALVAR (Para evitar duplicidade)
      const docSnap = await getDoc(produtoRef);
      let novasVariacoes = [];
      let nomeProduto = sku.desc || '';

      if (docSnap.exists()) {
        const dadosAtuais = docSnap.data();
        nomeProduto = dadosAtuais.nome || nomeProduto;
        const variacoesAtuais = dadosAtuais.variacoes || [];

        // Procura se já existe uma variação com a mesma Quantidade e Tipo de Caixa
        const indexExistente = variacoesAtuais.findIndex(v => v.quantidade === novaVariacao.quantidade && v.caixa === novaVariacao.caixa);

        if (indexExistente > -1) {
          variacoesAtuais[indexExistente] = novaVariacao; // Substitui a antiga (atualiza o EAN/Peso)
        } else {
          variacoesAtuais.push(novaVariacao); // Adiciona como nova
        }
        novasVariacoes = variacoesAtuais;
      } else {
        novasVariacoes = [novaVariacao]; // Cria a primeira variação
      }

  

      const dadosParaSalvar = {
        ref: sku.ref,
        nome: nomeProduto,
        variacoes: novasVariacoes
      };

      // 2. SALVA NO FIREBASE
      await setDoc(produtoRef, dadosParaSalvar, { merge: true });

      // 3. ATUALIZA A TELA DE PLANEJAMENTO (Tira o vermelho)
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

      // 4. ATUALIZA O DICIONÁRIO NA MESMA HORA (Sem precisar de F5)
      setCaixasMaster(prev => {
        if (!prev) return prev;
        const index = prev.findIndex(p => p.ref === sku.ref || p.id === sku.ref);
        if (index > -1) {
          const novaLista = [...prev];
          novaLista[index] = { ...novaLista[index], ...dadosParaSalvar };
          return novaLista;
        } else {
          return [dadosParaSalvar, ...prev];
        }
      });

      alert("Variação cadastrada e vinculada com sucesso!");
      setModalCodigoBarras(null);

    } catch (error) {
      alert("Erro ao salvar variação: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // UPLOAD DE CSV - PEDIDOS COMUNS (WMS DIRETO)
  // ==========================================
  const handleUploadWMSComum = (e, dIdx) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const linhas = text.trim().split(/\r\n|\n|\r/);
        if (linhas.length <= 1) throw new Error("Arquivo vazio");

        let separador = linhas[0].includes(';') ? ';' : ',';
        const cabecalho = linhas[0].split(separador).map(c => c.trim().toUpperCase().replace(/"/g, ''));
        
        // Mapeamento otimizado para as colunas do seu WMS
        const idxCaixa = cabecalho.findIndex(c => c.includes("TIPO EMBALAGEM") || c.includes("CAIXA") || c.includes("VOLUME"));
        const idxPeso = cabecalho.findIndex(c => c.includes("PESO"));
        const idxIdUnico = cabecalho.findIndex(c => c.includes("ID EMBALAGEM") || c === "ID" || c.includes("RASTREIO"));
        const idxRef = cabecalho.findIndex(c => c === "PRODUTO" || c.includes("CÓDIGO") || c === "REF");
        const idxDesc = cabecalho.findIndex(c => c.includes("DESCRIÇÃO") || c.includes("DESCRICAO"));
        const idxQtd = cabecalho.findIndex(c => c.includes("QUANTIDADE") || c.includes("QTDE"));

        if (idxRef === -1 || idxQtd === -1 || idxCaixa === -1) {
          throw new Error("Colunas obrigatórias (Caixa, Código Produto, Quantidade) não encontradas.");
        }

        const caixasMap = {};

        for (let i = 1; i < linhas.length; i++) {
          const cols = linhas[i].split(separador).map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length <= idxRef) continue;
          
          const nomeCaixa = cols[idxCaixa] || `CAIXA S/N`;
          const pesoCaixa = idxPeso !== -1 ? parseFloat(String(cols[idxPeso]).replace(',', '.')) || 0 : 0;
          
          const idUnico = idxIdUnico !== -1 && cols[idxIdUnico] ? cols[idxIdUnico] : `S/N-linha-${i}`;
          
          const ref = cols[idxRef];
          const desc = idxDesc !== -1 ? cols[idxDesc] : "Produto";
          const qtd = parseInt(String(cols[idxQtd]).replace(/\D/g, '')) || 0;

          if (!ref || qtd <= 0) continue;

          if (!caixasMap[idUnico]) {
            caixasMap[idUnico] = { num: nomeCaixa, peso: pesoCaixa, idUnico: idUnico, produtos: [] };
          } else {
            caixasMap[idUnico].peso = Math.max(caixasMap[idUnico].peso, pesoCaixa);
          }
          
          const prodExistente = caixasMap[idUnico].produtos.find(p => p.referencia === ref);
          
          if (prodExistente) {
            prodExistente.quantidade += qtd; 
          } else {
            caixasMap[idUnico].produtos.push({ referencia: ref, descricao: desc, quantidade: qtd }); 
          }
        }

        const caixasFinais = Object.values(caixasMap);

        // 👇 TRAVA DE SEGURANÇA: Peso 0.0
        const caixasComZero = caixasFinais.filter(c => parseFloat(c.peso) === 0);
        if (caixasComZero.length > 0) {
          setAlertaPesoZero({
            origem: 'comum',
            dIdx,
            caixasProblematicas: caixasComZero,
            caixasNormais: caixasFinais.filter(c => parseFloat(c.peso) > 0),
            caixasOriginais: caixasFinais
          });
          setIsUploading(false);
          if (e.target) e.target.value = null; 
          return; // Interrompe o fluxo para exibir o Alerta
        }

        // Se passar limpo, salva normalmente
        await finalizarImportacaoComum(dIdx, caixasFinais);

      } catch (error) {
      console.error("Erro completo na importação:", error);
      alert("Erro ao salvar caixas importadas: " + error.message);
    } finally {
        setIsUploading(false);
        if (e.target) e.target.value = null; 
      }
    };
    reader.readAsText(file, 'ISO-8859-1'); 
  };

  // ==========================================
  // ESTADOS E FUNÇÕES DO CRUD DE CAIXAS MANUAIS
  // ==========================================
  const [edicaoCaixa, setEdicaoCaixa] = useState(null); // Guarda { dIdx, cIdx (ou -1 pra nova) }
  const [formCaixa, setFormCaixa] = useState({ num: '', peso: '', produtos: [] });
  const [forceRender, setForceRender] = useState(0); // Força a tela a atualizar após edição

  const abrirFormCaixa = (dIdx, cIdx, caixaAtual = null) => {
    setEdicaoCaixa({ dIdx, cIdx });
    if (caixaAtual) {
      setFormCaixa(JSON.parse(JSON.stringify(caixaAtual))); // Clone profundo
    } else {
      // Puxa o último número de caixa para sugerir o próximo
      const totalCaixas = (pedidoModal.documentos[dIdx]?.caixas || []).length;
      setFormCaixa({ num: `CAIXA ${totalCaixas + 1}`, peso: '', produtos: [] });
    }
  };

  const salvarCaixaManual = async () => {
    if (!formCaixa.num) return alert("O nome/número da caixa é obrigatório.");
    setIsSaving(true);
    try {
      const { dIdx, cIdx } = edicaoCaixa;
      const novosDocs = [...pedidoModal.documentos];
      const docAlvo = { ...novosDocs[dIdx] };
      const caixas = [...(docAlvo.caixas || [])];

      const caixaPronta = {
        ...formCaixa,
        num: formCaixa.num.toUpperCase().trim(),
        peso: parseFloat(String(formCaixa.peso).replace(',', '.')) || 0,
        produtos: formCaixa.produtos.map(p => ({ ...p, quantidade: parseInt(p.quantidade) || 0 }))
      };

      if (cIdx === -1) caixas.push(caixaPronta); 
      else caixas[cIdx] = caixaPronta;           

      docAlvo.caixas = caixas;
      novosDocs[dIdx] = docAlvo;

      const refFinal = pedidoModal._isLegacy ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) : doc(db, 'pedidos', pedidoModal.id);
      await updateDoc(refFinal, { documentos: novosDocs });
      
      setEdicaoCaixa(null);
      setForceRender(prev => prev + 1);
      
    } catch (error) {
      console.error("Erro ao salvar caixa manual:", error);
      alert("Erro ao salvar caixa: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const excluirCaixaManual = async (dIdx, cIdx) => {
    if (!window.confirm("Tem certeza que deseja excluir esta caixa permanentemente?")) return;
    try {
      const novosDocs = [...pedidoModal.documentos];
      novosDocs[dIdx].caixas.splice(cIdx, 1);
      
      const refFinal = pedidoModal._isLegacy ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) : doc(db, 'pedidos', pedidoModal.id);
      await updateDoc(refFinal, { documentos: novosDocs });
      
      setForceRender(prev => prev + 1);
    } catch (error) {
      console.error("Erro ao excluir caixa:", error);
      alert("Erro ao excluir: " + error.message);
    }
  };

  const toggleBonificacaoCaixa = async (dIdx, cIdx) => {
    try {
      const novosDocs = [...pedidoModal.documentos];
      const caixa = novosDocs[dIdx].caixas[cIdx];
      // Inverte o status de bonificação da caixa específica
      caixa.isBonificacao = !caixa.isBonificacao;
      
      const refFinal = pedidoModal._isLegacy ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) : doc(db, 'pedidos', pedidoModal.id);
      await updateDoc(refFinal, { documentos: novosDocs });
      
      setForceRender(prev => prev + 1); // Atualiza a tela na mesma hora
    } catch(e) {
      alert("Erro ao alterar o status da caixa.");
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
    
    // 👇 GATILHO NOVO AQUI:
    await atualizarEstatisticasMensais(pedido, novoStatus);
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
            // 👇 AQUI: String(v.quantidade)
            const qtdPadrao = parseInt(String(v.quantidade).replace(/\D/g, '')) || 0;
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
            // 👇 AQUI: String(variacoesValidas[0].quantidade)
            qtdPadrao: !isMissing ? parseInt(String(variacoesValidas[0].quantidade).replace(/\D/g, '')) : 0, 
            // 👇 Aproveitamos para blindar o peso também!
            pesoPadrao: !isMissing ? parseFloat(String(variacoesValidas[0].peso).replace(',', '.')) || 0 : 0,
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

  // ==========================================
  // LÊ O CSV FINAL DE CAIXAS DO WMS (AUDITORIA)
  // ==========================================
  const handleAuditoriaUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !auditModalData) return;
    const currentIdx = auditModalData.dIdx;

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

        // 👇 TRAVA DE SEGURANÇA: Peso 0.0 (Para Pedidos Master)
        const caixasComZero = caixasReais.filter(c => parseFloat(c.peso) === 0);
        if (caixasComZero.length > 0) {
          setAlertaPesoZero({
            origem: 'auditoria',
            dIdx: currentIdx,
            fileName: file.name,
            caixasProblematicas: caixasComZero,
            caixasNormais: caixasReais.filter(c => parseFloat(c.peso) > 0),
            caixasOriginais: caixasReais
          });
          if (e.target) e.target.value = null;
          return; // Interrompe o fluxo e chama o alerta
        }

        // Se passar limpo, abre o relatório de auditoria direto
        setAuditModalData({ dIdx: currentIdx, fileName: file.name, caixasReais: caixasReais });

      } catch (error) {
        alert("Erro ao ler caixas efetivadas: " + error.message);
      } finally {
        if (e.target) e.target.value = null; 
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
      
      // 👇 GATILHO NOVO AQUI: Evita somar duas vezes caso o pedido já estivesse efetivado antes de auditar
      if (!pedidoModal.efetivado) {
        const pedidoAtualizado = { ...pedidoModal, documentos: novosDocumentos };
        await atualizarEstatisticasMensais(pedidoAtualizado, true);
      }
      
      setAuditModalData(null);
      setShowCaixasEfetivadasModal(dIdx); 
      
      // 👇 SAÍDA SUAVE COM MODAL ANIMADO EM VEZ DE ALERT
      setModalSucesso({
        titulo: "Auditoria Validada!",
        mensagem: "O arquivo do WMS foi processado, cruzado com o planejamento e salvo no histórico com sucesso!"
      });
      
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
    setShowPauseModal(true); 
    setDropdownOpen(null);
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

  // ==========================================
  // ESTADOS E FUNÇÕES DO ALERTA DE PESO ZERO
  // ==========================================
  const [alertaPesoZero, setAlertaPesoZero] = useState(null);

  // ==========================================
  // MOTOR DE ESTATÍSTICAS (GRÁFICO DO DASHBOARD)
  // ==========================================
  const atualizarEstatisticasMensais = async (pedido, isEfetivando) => {
    try {
      const temNfOuMinuta = (pedido.documentos || []).some(doc => 
        doc.tipo === 'Nota Fiscal' || doc.tipo === 'Minuta'
      );
      
      if (!temNfOuMinuta) return; 

      let totalCaixas = 0;
      (pedido.documentos || []).forEach(doc => {
        totalCaixas += (doc.caixas || []).length;
      });

      const mult = isEfetivando ? 1 : -1;
      const idMes = pedido.dataOperacao ? String(pedido.dataOperacao).substring(0, 7) : dataOperacaoAtiva.substring(0, 7);

      const mesRef = doc(db, 'estatisticasMensais', idMes);
      await setDoc(mesRef, {
        totalNfMinuta: increment(1 * mult),
        totalCaixas: increment(totalCaixas * mult)
      }, { merge: true });
      
    } catch (error) {
      console.error("Aviso: Falha ao gravar estatística mensal.", error);
    }
  };

  const finalizarImportacaoComum = async (dIdx, caixasFinais) => {
    setIsSaving(true);
    try {
      const novosDocs = [...pedidoModal.documentos];
      novosDocs[dIdx] = { ...novosDocs[dIdx], caixas: caixasFinais };
      
      const todosPossuemCaixas = novosDocs.every(doc => doc.caixas && doc.caixas.length > 0);
      const payload = { documentos: novosDocs };
      
      if (todosPossuemCaixas) {
        payload.efetivado = true;
        payload.completedAt = serverTimestamp();
      }

      const refFinal = pedidoModal._isLegacy ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) : doc(db, 'pedidos', pedidoModal.id);
      
      await updateDoc(refFinal, payload);
      
      // O GATILHO DA ESTATÍSTICA FICA AQUI (Lê a variável recém montada em vez de mutar a antiga)
      if (todosPossuemCaixas && !pedidoModal.efetivado) {
        const pedidoAtualizado = { ...pedidoModal, documentos: novosDocs };
        await atualizarEstatisticasMensais(pedidoAtualizado, true);
      }

      if (todosPossuemCaixas) {
        setModalSucesso({
          titulo: "Romaneio Efetivado!",
          mensagem: "Todos os documentos foram importados e o romaneio foi finalizado automaticamente."
        });
      } else {
        setModalSucesso({
          titulo: "Caixas Importadas!",
          mensagem: "As caixas deste documento foram carregadas com sucesso. Faltam outros documentos para finalizar o romaneio."
        });
      }
      
      setForceRender(prev => prev + 1); 
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("Erro ao salvar caixas: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolvePesoZero = async (acao) => {
    if (!alertaPesoZero) return;
    const { origem, dIdx, caixasNormais, caixasOriginais, fileName } = alertaPesoZero;
    const caixasEscolhidas = acao === 'excluir' ? caixasNormais : caixasOriginais;

    if (acao === 'excluir') {
       if (!window.confirm("Tem certeza? A caixa será excluída permanentemente da listagem.")) return;
    } else {
       if (!window.confirm("Tem certeza? Certifique-se que essa caixa existe fisicamente.")) return;
    }

    if (origem === 'comum') {
       await finalizarImportacaoComum(dIdx, caixasEscolhidas);
    } else if (origem === 'auditoria') {
       setAuditModalData({ dIdx, fileName, caixasReais: caixasEscolhidas });
    }
    
    setAlertaPesoZero(null);
  };

  

  // 👇 O SEU RETURN ORIGINAL FICA LOGO AQUI EMBAIXO
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

                    const migrarPedidosParaRaizLote = async () => {
    if (!window.confirm("Deseja iniciar a migração DEFINITIVA dos pedidos legados para a raiz em lotes?")) return;
    
    try {
      console.log("Iniciando leitura dos pedidos legados...");
      // Busca todos os pedidos legados de todas as subpastas
      const snapLegados = await getDocs(collectionGroup(db, 'pedidosMultiDocumento'));
      const totalDocs = snapLegados.docs.length;
      console.log(`Encontrados ${totalDocs} pedidos para migrar.`);

      if (totalDocs === 0) {
        alert("Nenhum pedido legado encontrado. Tudo já está na raiz!");
        return;
      }

      const tamanhoLote = 250; // Limite máximo do Firebase é 500 por lote
      let lotesProcessados = 0;
      let totalMigrados = 0;

      // Loop para quebrar os 2.400 documentos em lotes menores
      for (let i = 0; i < totalDocs; i += tamanhoLote) {
        const lote = snapLegados.docs.slice(i, i + tamanhoLote);
        const batch = writeBatch(db); 

        lote.forEach(docSnap => {
          const data = docSnap.data();
          // Define que o destino será a pasta raiz 'pedidos' com o mesmo ID
          const novoDocRef = doc(db, 'pedidos', docSnap.id);
          
          // Adiciona as informações no lote
          batch.set(novoDocRef, {
            ...data,
            _migradoDoLegado: true,
            elementoIdOriginal: docSnap.ref.path.split('/')[3] || 'desconhecido'
          }, { merge: true });
        });

        console.log(`Enviando lote ${lotesProcessados + 1}... (${i + lote.length}/${totalDocs})`);
        
        // Dispara o lote para a nuvem
        await batch.commit();
        
        totalMigrados += lote.length;
        lotesProcessados++;

        // MÁGICA: Pausa a execução por 1.5 segundos para não afogar o Firebase
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      console.log("Migração concluída com sucesso!");
      alert(`Migração Definitiva concluída! ${totalMigrados} pedidos foram movidos para a raiz.`);
    } catch (error) {
      console.error("Erro crítico na migração em lotes:", error);
      alert("Erro ao migrar dados: " + error.message);
    }
  };

  // Expõe para o console
  window.rodarMigracaoDefinitiva = migrarPedidosParaRaizLote;

  const padronizarDatasLegadas = async () => {
    if (!window.confirm("Deseja padronizar o campo dataOperacao de todos os pedidos legados?")) return;
    
    try {
      console.log("Iniciando padronização de datas nos pedidos legados...");
      const snap = await getDocs(collection(db, 'pedidos'));
      console.log(`Verificando ${snap.size} documentos...`);

      const tamanhoLote = 250;
      let alterados = 0;
      let batch = writeBatch(db);
      let emLote = 0;

      for (const docSnap of snap.docs) {
        const data = docSnap.data();

        // Se já possui dataOperacao válida no formato YYYY-MM-DD, ignora
        if (data.dataOperacao && String(data.dataOperacao).length >= 10) continue;

        let dataFormatada = null;
        if (data.completedAt?.toDate) {
          const d = data.completedAt.toDate();
          dataFormatada = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (data.createdAt?.toDate) {
          const d = data.createdAt.toDate();
          dataFormatada = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        if (dataFormatada) {
          batch.update(docSnap.ref, { dataOperacao: dataFormatada });
          alterados++;
          emLote++;

          if (emLote === tamanhoLote) {
            await batch.commit();
            console.log(`Lote de ${emLote} atualizações gravado...`);
            batch = writeBatch(db);
            emLote = 0;
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }

      if (emLote > 0) {
        await batch.commit();
      }

      console.log("Padronização concluída com sucesso!");
      alert(`Padronização concluída! ${alterados} pedidos receberam a dataOperacao.`);
    } catch (error) {
      console.error("Erro na padronização:", error);
      alert("Erro ao padronizar datas: " + error.message);
    }
  };

  window.rodarPadronizacao = padronizarDatasLegadas;

  const sincronizarEstatisticasDiarias = async () => {
    if (!window.confirm("Deseja gerar as estatísticas diárias a partir dos pedidos na raiz?")) return;
    
    try {
      console.log("Calculando volume diário...");
      const q = query(collection(db, 'pedidos'), where('efetivado', '==', true));
      const snap = await getDocs(q);
      const diasMap = {};

      // Conta todos os pedidos válidos e agrupa por dia
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const temNfOuMinuta = (data.documentos || []).some(d => d.tipo === 'Nota Fiscal' || d.tipo === 'Minuta');
        if (!temNfOuMinuta || !data.dataOperacao) return;

        const dataFormatada = String(data.dataOperacao).substring(0, 10);
        if (!diasMap[dataFormatada]) diasMap[dataFormatada] = 0;
        diasMap[dataFormatada]++;
      });

      // Salva na coleção estatisticasDiarias
      const batch = writeBatch(db);
      let count = 0;

      for (const [dia, total] of Object.entries(diasMap)) {
        const docRef = doc(db, 'estatisticasDiarias', dia);
        // Usamos merge para não apagar o ranking, caso ele já exista lá!
        batch.set(docRef, { totalPedidos: total, totalNfMinuta: total }, { merge: true });
        count++;
      }

      await batch.commit();
      console.log("Sincronização concluída!");
      alert(`Sucesso! ${count} dias de operação foram salvos nas estatísticas diárias.`);
    } catch (error) {
      console.error("Erro na sincronização:", error);
      alert("Erro: " + error.message);
    }
  };

  window.rodarSincronizacaoDiaria = sincronizarEstatisticasDiarias;

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
            {/* RANKING DIÁRIO DE PRODUTIVIDADE */}
            <RankingDiario 
              rankingCalculado={rankingCalculado}
              rankingExpandido={rankingExpandido}
              setRankingExpandido={setRankingExpandido}
            />

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


     {/* MODAL PRINCIPAL: PAINEL DO ROMANEIO (DETALHES + WMS) */}
      <ModalDetalhesPedido 
        showDetalhesModal={showDetalhesModal}
        setShowDetalhesModal={setShowDetalhesModal}
        pedidoModal={pedidoModal}
        isSaving={isSaving}
        isUploading={isUploading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wmsSessions={wmsSessions}
        setWmsSessions={setWmsSessions}
        buscasDocumentos={buscasDocumentos}
        handleBuscaDocumento={handleBuscaDocumento}
        wmsPreResumoAberto={wmsPreResumoAberto}
        setWmsPreResumoAberto={setWmsPreResumoAberto}
        setShowCaixasEfetivadasModal={setShowCaixasEfetivadasModal}
        setAuditModalData={setAuditModalData}
        handlePlanejamentoUpload={handlePlanejamentoUpload}
        handleUploadWMSComum={handleUploadWMSComum}
        docIndexSelecionado={docIndexSelecionado}
        setDocIndexSelecionado={setDocIndexSelecionado}
        skusExpandidos={skusExpandidos}
        setSkusExpandidos={setSkusExpandidos}
        skusExpandidosComum={skusExpandidosComum}
        setSkusExpandidosComum={setSkusExpandidosComum}
        handleInputManual={handleInputManual}
        abrirModalSalvarManual={abrirModalSalvarManual}
        handleMudarVariacao={handleMudarVariacao}
        isEditingObs={isEditingObs}
        setIsEditingObs={setIsEditingObs}
        observacoes={observacoes}
        setObservacoes={setObservacoes}
        docTipo={docTipo}
        setDocTipo={setDocTipo}
        docResponsavel={docResponsavel}
        setDocResponsavel={setDocResponsavel}
        localUser={localUser}
        usuarios={usuarios}
        handleAddDoc={handleAddDoc}
        docsTemporarios={docsTemporarios}
        handleRemoveDoc={handleRemoveDoc}
        handleAddResponsavelToDoc={handleAddResponsavelToDoc}
        handleRemoveResponsavelFromDoc={handleRemoveResponsavelFromDoc}
        handleSalvarEdicaoTab1={handleSalvarEdicaoTab1}
      />

      {/* SUB-MODAL 1: AUDITORIA WMS (Upload -> Relatório) */}
      <AuditoriaWms 
        auditModalData={auditModalData}
        setAuditModalData={setAuditModalData}
        wmsSessions={wmsSessions}
        handleAuditoriaUpload={handleAuditoriaUpload}
        confirmarAuditoriaWms={confirmarAuditoriaWms}
        isSaving={isSaving}
      />


    {/* MODAL DE ORDEM DE PRODUÇÃO */}
      <ModalOrdemProducao 
        showOpModal={showOpModal}
        setShowOpModal={setShowOpModal}
        opsDoDia={opsDoDia}
        usuarios={usuarios}
        localUser={localUser}
        dataOperacaoAtiva={dataOperacaoAtiva}
      />

      {/* MODAL DE PAUSA DO CRONÔMETRO */}
      <ModalPausa 
        showPauseModal={showPauseModal}
        setShowPauseModal={setShowPauseModal}
        pedidoToPause={pedidoToPause}
        setPedidoToPause={setPedidoToPause}
      />

      {/* MODAL: DICIONÁRIO DE CAIXAS MASTER */}
      <ModalCaixasMaster 
        showMasterModal={showMasterModal}
        setShowMasterModal={setShowMasterModal}
        caixasMaster={caixasMaster}
        setCaixasMaster={setCaixasMaster}
      />

      {/* MODAL: CÓDIGO DE BARRAS (NOVA VARIAÇÃO) */}
      <ModalCodigoBarras 
        modalCodigoBarras={modalCodigoBarras}
        setModalCodigoBarras={setModalCodigoBarras}
        codigoBarrasInput={codigoBarrasInput}
        setCodigoBarrasInput={setCodigoBarrasInput}
        salvarVariacaoBanco={salvarVariacaoBanco}
        isSaving={isSaving}
      />

      {/* MODAL: CAIXA MANUAL */}
      <ModalCaixaManual 
        showAddCaixaModal={showAddCaixaModal}
        setShowAddCaixaModal={setShowAddCaixaModal}
        addCaixaForm={addCaixaForm}
        setAddCaixaForm={setAddCaixaForm}
        handleSalvarCaixaManual={handleSalvarCaixaManual}
        isSaving={isSaving}
      />

      {/* MODAL: ALERTA DE PESO ZERO */}
      <ModalAlertaPeso 
        alertaPesoZero={alertaPesoZero}
        handleResolvePesoZero={handleResolvePesoZero}
      />

      {/* MODAL: CRIAR / EDITAR PEDIDO */}
      <ModalCriarEditarPedido
        showModal={showModal}
        isClosingModal={isClosingModal}
        handleCloseModal={handleCloseModal}
        isSaving={isSaving}
        editingId={editingId}
        romaneio={romaneio} setRomaneio={setRomaneio}
        loja={loja} setLoja={setLoja}
        local={local} setLocal={setLocal}
        uf={uf} setUf={setUf}
        isCaixaMaster={isCaixaMaster} setIsCaixaMaster={setIsCaixaMaster}
        observacoes={observacoes} setObservacoes={setObservacoes}
        docTipo={docTipo} setDocTipo={setDocTipo}
        docResponsavel={docResponsavel} setDocResponsavel={setDocResponsavel}
        localUser={localUser}
        usuarios={usuarios}
        handleAddDoc={handleAddDoc}
        docsTemporarios={docsTemporarios}
        handleRemoveDoc={handleRemoveDoc}
        handleAddResponsavelToDoc={handleAddResponsavelToDoc}
        handleRemoveResponsavelFromDoc={handleRemoveResponsavelFromDoc}
        handleSavePedido={handleSavePedido}
      />

      {/* ANIMAÇÕES GLOBAIS */}
      <style>
        {`
          @keyframes fadeInOverlay { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(4px); } }
          @keyframes popInModal { from { opacity: 0; transform: scale(0.90) translateY(15px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          .animate-overlay { animation: fadeInOverlay 0.25s ease-out forwards; }
          .animate-modal { animation: popInModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        `}
      </style>

      {/* MODAL: SUCESSO ANIMADO */}
      <ModalSucesso 
        modalSucesso={modalSucesso}
        setModalSucesso={setModalSucesso}
      />

    </div>
  );
}

