import { useMotorRanking } from '../hooks/useMotorRanking';
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Clock, ShieldCheck, ClipboardList, Package, MapPin, Users, FileText, Settings, Play, Pause, CheckCircle2, Search, MoreVertical, X, Check, Trash2, Info, Activity, Coffee, Briefcase, AlertTriangle, Moon, PackagePlus, Edit, Factory } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, onSnapshot, deleteDoc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, collectionGroup, Timestamp, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '../firebase'; 

import AdmControlesManuais from '../components/AdmControlesManuais';
import AdmEstatisticasGerais from '../components/AdmEstatisticasGerais';
import RankingDiario from '../components/RankingDiario'; 
import ModalCriarEditarPedido from '../components/ModalCriarEditarPedido';
import ModalDetalhesPedido from '../components/ModalDetalhesPedido';
import ModalCaixasEfetivadas from '../components/ModalCaixasEfetivadas';
import ModalCaixasMaster from '../components/ModalCaixasMaster';
import ModalOrdemProducao from '../components/ModalOrdemProducao';
import AuditoriaWms from '../components/AuditoriaWms';
import ModalAlertaPeso from '../components/ModalAlertaPeso';
import ModalSucesso from '../components/ModalSucesso';
import '../css/Operacao.css'; 

export default function OperacaoAdm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [showOpModal, setShowOpModal] = useState(false);
  const [auditModalData, setAuditModalData] = useState(null);
  const [alertaPesoZero, setAlertaPesoZero] = useState(null);
  const [modalSucesso, setModalSucesso] = useState(null);
  const localUser = { uid: 'admin-god-mode', email: 'admin' };
  const queryParams = new URLSearchParams(location.search);
  const dataUrl = queryParams.get('date'); 
  const today = new Date();
  const dataHojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dataOperacaoAtiva = dataUrl || dataHojeStr;

  const [rankingExpandido, setRankingExpandido] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [dadosDeEstatisticasFirebase, setDadosDeEstatisticasFirebase] = useState({});
  const [rankingArrayFirebase, setRankingArrayFirebase] = useState([]);
  
  const [controlePausas, setControlePausas] = useState({});
  const [showModalIntervencao, setShowModalIntervencao] = useState(false);
  
  const [usuarios, setUsuarios] = useState([]);
  const [pedidosNovos, setPedidosNovos] = useState([]);
  const [pedidosLegados, setPedidosLegados] = useState([]);
  const [buscaRomaneio, setBuscaRomaneio] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(null);

  const [opsDoDia, setOpsDoDia] = useState([]);
  const [ajustesDoDia, setAjustesDoDia] = useState([]);

  // ==========================================
  // STATES PARA CONTROLE DE PEDIDOS E MODAIS
  // ==========================================
  const [showModalPedido, setShowModalPedido] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pedidoModal, setPedidoModal] = useState(null);
  const [caixasMaster, setCaixasMaster] = useState([]);
  
  const [editingId, setEditingId] = useState(null);
  const [romaneio, setRomaneio] = useState('');
  const [loja, setLoja] = useState('');
  const [local, setLocal] = useState('DF');
  const [uf, setUf] = useState('');
  const [isCaixaMaster, setIsCaixaMaster] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [docsTemporarios, setDocsTemporarios] = useState([]);
  const [docTipo, setDocTipo] = useState('Nota Fiscal');
  const [docResponsavel, setDocResponsavel] = useState('');

  const [activeTab, setActiveTab] = useState('resumo');
  const [wmsSessions, setWmsSessions] = useState({});
  const [buscasDocumentos, setBuscasDocumentos] = useState({});
  const [wmsPreResumoAberto, setWmsPreResumoAberto] = useState(null);
  const [docIndexSelecionado, setDocIndexSelecionado] = useState(null);
  const [skusExpandidos, setSkusExpandidos] = useState({});
  const [skusExpandidosComum, setSkusExpandidosComum] = useState({});
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

// ==========================================
  // CONTROLE DE CAIXAS (MODAL DE RESUMO)
  // ==========================================
  const [showCaixasEfetivadasModal, setShowCaixasEfetivadasModal] = useState(null);
  const [edicaoCaixa, setEdicaoCaixa] = useState(null);
  const [formCaixa, setFormCaixa] = useState({ num: '', peso: '', produtos: [] });

  const abrirFormCaixa = (dIdx, cIdx, caixaAtual = null) => {
    setEdicaoCaixa({ dIdx, cIdx });
    if (caixaAtual) {
      setFormCaixa(JSON.parse(JSON.stringify(caixaAtual)));
    } else {
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
      
      setPedidoModal(prev => ({...prev, documentos: novosDocs}));
      setEdicaoCaixa(null);
    } catch (error) {
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
      
      setPedidoModal(prev => ({...prev, documentos: novosDocs}));
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  };

  const toggleBonificacaoCaixa = async (dIdx, cIdx) => {
    try {
      const novosDocs = [...pedidoModal.documentos];
      const caixa = novosDocs[dIdx].caixas[cIdx];
      caixa.isBonificacao = !caixa.isBonificacao;
      
      const refFinal = pedidoModal._isLegacy ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) : doc(db, 'pedidos', pedidoModal.id);
      await updateDoc(refFinal, { documentos: novosDocs });
      
      setPedidoModal(prev => ({...prev, documentos: novosDocs}));
    } catch(e) {
      alert("Erro ao alterar o status da caixa.");
    }
  };

  // ==========================================
  // TRAVA DE EXPEDIENTE (17h30)
  // ==========================================
  const limiteExpediente = useMemo(() => {
    const [ano, mes, dia] = dataOperacaoAtiva.split('-');
    return new Date(ano, mes - 1, dia, 17, 30, 0).getTime();
  }, [dataOperacaoAtiva]);

  const isExpedienteEncerrado = currentTime >= limiteExpediente;
  const horaReferenciaAtual = isExpedienteEncerrado ? limiteExpediente : currentTime;

  useEffect(() => {
    const closeMenu = () => setDropdownOpen(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  useEffect(() => {
    const timerInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timerInterval);
  }, []);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const snap = await getDocs(collection(db, 'usuarios'));
        const lista = [];
        snap.forEach(docSnap => {
          if(docSnap.data().email) lista.push({ uid: docSnap.id, email: String(docSnap.data().email).toLowerCase().trim() });
        });
        setUsuarios(lista);
      } catch (error) { console.error("Erro ao buscar usuários:", error); }
    };
    fetchUsuarios();
  }, []);

  // Busca do Dicionário de Caixas Master
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
    const refDia = doc(db, 'estatisticasDiarias', dataOperacaoAtiva);
    const unsubscribe = onSnapshot(refDia, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDadosDeEstatisticasFirebase(data); 

        if (data.ranking) {
          const arrayRanking = Object.entries(data.ranking)
            .map(([nome, stats]) => {
              if (!stats) return null;
              return {
                nome, uid: nome, pontos: stats.pontos || 0, skus: stats.skus || 0, pontosSku: stats.pontosSku || 0,       
                op: stats.op || 0, pedidos: stats.pedidos || 0, bonusPedidos: stats.bonusPedidos || 0, 
                decrescimo: stats.decrescimo || 0, chartData: stats.chartData || [], pointEvents: stats.pointEvents || [], 
                eventosMesclados: stats.eventosMesclados || []
              };
            })
            .filter(Boolean).filter(u => u.pontos > 0 || u.pedidos > 0 || u.op > 0)
            .sort((a, b) => b.pontos - a.pontos).map((u, index) => ({ ...u, posicao: index + 1 }));

          setRankingArrayFirebase(arrayRanking);
        } else {
          setRankingArrayFirebase([]);
        }
      }
    });
    return () => unsubscribe();
  }, [dataOperacaoAtiva]);

  useEffect(() => {
    const refPausas = doc(db, 'controlePausas', dataOperacaoAtiva);
    const unsub = onSnapshot(refPausas, (snap) => {
      if (snap.exists()) setControlePausas(snap.data()); else setControlePausas({});
    });
    return () => unsub();
  }, [dataOperacaoAtiva]);

  useEffect(() => {
    const [ano, mes, dia] = dataOperacaoAtiva.split('-');
    const startOfDay = new Date(ano, mes - 1, dia, 0, 0, 0);
    const endOfDay = new Date(ano, mes - 1, dia, 23, 59, 59);

    const qNovo = query(collection(db, 'pedidos'), where('dataOperacao', '==', dataOperacaoAtiva));
    const unsubNovo = onSnapshot(qNovo, (snap) => setPedidosNovos(snap.docs.map(d => ({ id: d.id, _isLegacy: false, ...d.data() }))));

    const qLegado = query(collectionGroup(db, 'pedidosMultiDocumento'), where('createdAt', '>=', Timestamp.fromDate(startOfDay)), where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
    const unsubLegado = onSnapshot(qLegado, (snap) => {
      const legados = [];
      snap.forEach(docSnap => {
        const pathSegments = docSnap.ref.path.split('/');
        const elemIdOriginal = pathSegments.length > 3 ? pathSegments[3] : null;
        legados.push({ id: docSnap.id, _isLegacy: true, elementoIdOriginal: elemIdOriginal, ...docSnap.data() });
      });
      setPedidosLegados(legados);
    });

    const qOp = query(collection(db, 'ordensProducao'), where('dataOperacao', '==', dataOperacaoAtiva));
    const unsubOp = onSnapshot(qOp, (snap) => setOpsDoDia(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    
    const qAjustes = query(collection(db, 'ajustesDiarios'), where('dataOperacao', '==', dataOperacaoAtiva));
    const unsubAjustes = onSnapshot(qAjustes, (snap) => setAjustesDoDia(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

    return () => { unsubNovo(); unsubLegado(); unsubOp(); unsubAjustes(); };
  }, [dataOperacaoAtiva]);

  const pedidosProcessados = useMemo(() => {
    return [...pedidosNovos, ...pedidosLegados].sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  }, [pedidosNovos, pedidosLegados]);

  const pedidosEmAndamento = useMemo(() => pedidosProcessados.filter(p => !p.efetivado), [pedidosProcessados]);

  const pedidosFiltrados = useMemo(() => {
    if (!buscaRomaneio.trim()) return pedidosProcessados;
    const termo = buscaRomaneio.toLowerCase();
    return pedidosProcessados.filter(p => 
      String(p.romaneio || '').toLowerCase().includes(termo) || String(p.loja || '').toLowerCase().includes(termo)
    );
  }, [pedidosProcessados, buscaRomaneio]);

  const rankingCalculado = useMotorRanking(usuarios, opsDoDia, pedidosProcessados, controlePausas, ajustesDoDia, dataOperacaoAtiva, horaReferenciaAtual);

  const estatisticasTempoReal = useMemo(() => {
    let totalPedidos = 0;
    let totalCaixas = 0;

    pedidosProcessados.forEach(p => {
       if (p.efetivado) {
          const qtdDocumentos = p.documentos ? p.documentos.length : 0;
          totalPedidos += qtdDocumentos > 0 ? qtdDocumentos : 1;
          (p.documentos || []).forEach(d => { totalCaixas += (d.caixas || []).length; });
       }
    });

    const rankingMap = {};
    (rankingCalculado || []).forEach(user => { rankingMap[user.nome] = user; });

    return { totalNfMinuta: totalPedidos, totalCaixas: totalCaixas, ranking: rankingMap };
  }, [pedidosProcessados, rankingCalculado]);

  const equipeAtivaHoje = useMemo(() => {
    const nomesAtivos = new Set();
    
    if (rankingCalculado) rankingCalculado.forEach(r => nomesAtivos.add(r.nome));
    if (controlePausas) Object.keys(controlePausas).forEach(n => nomesAtivos.add(n));
    
    pedidosEmAndamento.forEach(p => {
      const uids = p.uidsVinculados || [p.criadorUid];
      uids.forEach(uid => {
        const user = usuarios.find(u => u.uid === uid);
        if (user) nomesAtivos.add(user.email.split('@')[0]);
      });
    });

    return usuarios.filter(u => nomesAtivos.has(u.email.split('@')[0]));
  }, [rankingCalculado, controlePausas, pedidosEmAndamento, usuarios]);

  // ==========================================
  // FUNÇÕES DE LEITURA CSV DO WMS (BASEADAS NO OPERACAO.JSX)
  // ==========================================
  
  // 1. Planejamento (Caixa Master)
  const handlePlanejamentoUpload = (e, dIdx) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setDocIndexSelecionado(dIdx);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const linhas = text.trim().split(/\r\n|\n|\r/);
        if (linhas.length <= 1) throw new Error("Arquivo vazio");

        let separador = linhas[0].includes(';') ? ';' : ',';
        const cabecalho = linhas[0].split(separador).map(c => c.trim().toUpperCase().replace(/"/g, ''));
        
        let idxRef = cabecalho.findIndex(c => c.includes("CÓDIGO PRODUTO") || c === "PRODUTO" || c === "REF" || c === "SKU" || c.includes("CÓDIGO"));
        let idxQtd = cabecalho.findIndex(c => c.includes("QTDE CONFERIDA") || c.includes("QUANTIDADE") || c === "QTD");
        let idxDesc = cabecalho.findIndex(c => c.includes("DESCRIÇÃO") || c.includes("DESCRICAO") || c === "NOME");

        if (idxRef === -1 || idxQtd === -1) throw new Error("Colunas 'Código/Produto' e 'Quantidade' não encontradas.");

        let skusProcessados = [];
        
        for (let i = 1; i < linhas.length; i++) {
          const cols = linhas[i].split(separador).map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length <= idxRef) continue;
          
          const ref = cols[idxRef];
          const qtd = parseInt(String(cols[idxQtd]).replace(/\D/g, '')) || 0;
          if (!ref || qtd <= 0) continue;

          const masterRef = caixasMaster.find(m => 
            String(m.ref).trim().toUpperCase() === String(ref).trim().toUpperCase() || 
            String(m.ref).trim().replace(/^0+/, '') === String(ref).trim().replace(/^0+/, '')
          );

          const variacoesValidas = masterRef ? masterRef.variacoes.filter(v => {
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
            qtdPadrao: !isMissing ? parseInt(String(variacoesValidas[0].quantidade).replace(/\D/g, '')) : 0, 
            pesoPadrao: !isMissing ? parseFloat(String(variacoesValidas[0].peso).replace(',', '.')) || 0 : 0,
            codigoBarras: !isMissing ? variacoesValidas[0].codigoBarras : "",
            isMissing: isMissing, 
            isOriginalMissing: isMissing
          });
        }

        const novaSessao = { skus: skusProcessados, fileName: file.name };
        setWmsSessions(prev => ({ ...prev, [dIdx]: novaSessao }));

        // Auto-save no Firebase
        if (pedidoModal) {
            const refFinal = doc(db, 'pedidos', pedidoModal.id);
            const novosDocumentos = [...pedidoModal.documentos];
            novosDocumentos[dIdx] = { ...novosDocumentos[dIdx], planejamentoWms: novaSessao };
            updateDoc(refFinal, { documentos: novosDocumentos })
              .then(() => setPedidoModal(prev => ({...prev, documentos: novosDocumentos}))) // <-- CORRIGIDO AQUI
              .catch(err => console.error("Erro Auto-Save:", err));
        }

      } catch (error) {
        alert("Erro ao ler CSV de planejamento: " + error.message);
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = null;
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  // 2. Importação Comum (Direto em Caixas)
  const handleUploadWMSComum = (e, dIdx) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setDocIndexSelecionado(dIdx);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const linhas = text.trim().split(/\r\n|\n|\r/);
        if (linhas.length <= 1) throw new Error("Arquivo vazio");

        let separador = linhas[0].includes(';') ? ';' : ',';
        const cabecalho = linhas[0].split(separador).map(c => c.trim().toUpperCase().replace(/"/g, ''));
        
        const idxCaixa = cabecalho.findIndex(c => c.includes("TIPO EMBALAGEM") || c.includes("CAIXA") || c.includes("VOLUME"));
        const idxPeso = cabecalho.findIndex(c => c.includes("PESO"));
        const idxIdUnico = cabecalho.findIndex(c => c.includes("ID EMBALAGEM") || c === "ID" || c.includes("RASTREIO"));
        const idxRef = cabecalho.findIndex(c => c === "PRODUTO" || c.includes("CÓDIGO") || c === "REF" || c === "SKU");
        const idxDesc = cabecalho.findIndex(c => c.includes("DESCRIÇÃO") || c.includes("DESCRICAO"));
        const idxQtd = cabecalho.findIndex(c => c.includes("QUANTIDADE") || c.includes("QTDE") || c === "QTD");

        if (idxRef === -1 || idxQtd === -1 || idxCaixa === -1) {
          throw new Error("Colunas obrigatórias (Caixa, Código Produto, Quantidade) não encontradas no CSV.");
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

        // 👇 A MÁGICA RESTAURADA: Salva, efetiva automático e força o render!
        if (pedidoModal) {
            const refFinal = pedidoModal._isLegacy 
              ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) 
              : doc(db, 'pedidos', pedidoModal.id);
            
            const novosDocs = [...pedidoModal.documentos];
            novosDocs[dIdx] = { ...novosDocs[dIdx], caixas: caixasFinais };

            // Verifica se todos os documentos agora possuem caixas
            const todosPossuemCaixas = novosDocs.every(doc => doc.caixas && doc.caixas.length > 0);
            const payload = { documentos: novosDocs };

            // Se sim, bate o martelo da efetivação na mesma hora
            if (todosPossuemCaixas) {
              payload.efetivado = true;
              payload.completedAt = serverTimestamp();
              if (!pedidoModal.primeiraEfetivacao) {
                payload.primeiraEfetivacao = serverTimestamp();
              }
            }

            await updateDoc(refFinal, payload);

           // GATILHO VISUAL: Força a tela a piscar os dados novos sem precisar de F5
            setPedidoModal(prev => ({
              ...prev,
              documentos: novosDocs,
              efetivado: todosPossuemCaixas ? true : prev.efetivado
            }));

            if (todosPossuemCaixas) {
               alert("Caixas importadas! Como todos os documentos têm caixas, o romaneio foi finalizado automaticamente.");
            } else {
               alert("Caixas importadas com sucesso! Faltam outros documentos para finalizar o romaneio.");
            }
        }

      } catch (error) {
        console.error("Erro na leitura CSV Comum:", error);
        alert("Erro ao processar arquivo: " + error.message);
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = null; 
      }
    };
    reader.readAsText(file, 'ISO-8859-1'); 
  };

// ==========================================
  // LÊ O CSV FINAL DE CAIXAS DO WMS (AUDITORIA MASTER)
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

        // Trava contra caixas sem peso
        const caixasComZero = caixasReais.filter(c => parseFloat(c.peso) === 0);
        if (caixasComZero.length > 0) {
          setAlertaPesoZero({
            origem: 'auditoria', dIdx: currentIdx, fileName: file.name,
            caixasProblematicas: caixasComZero, caixasNormais: caixasReais.filter(c => parseFloat(c.peso) > 0), caixasOriginais: caixasReais
          });
          if (e.target) e.target.value = null;
          return; 
        }

        setAuditModalData({ dIdx: currentIdx, fileName: file.name, caixasReais: caixasReais });

      } catch (error) { alert("Erro ao ler caixas efetivadas: " + error.message); } 
      finally { if (e.target) e.target.value = null; }
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  const confirmarAuditoriaWms = async () => {
    if (!auditModalData || !auditModalData.caixasReais) return;
    setIsSaving(true);
    
    try {
      const { dIdx, caixasReais, fileName } = auditModalData;
      const session = wmsSessions[dIdx] || { skus: [] };
      
      const pedidoRef = pedidoModal._isLegacy 
        ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) 
        : doc(db, 'pedidos', pedidoModal.id);

      let planejado = 0;
      session.skus.forEach(sku => { if (sku.qtdPadrao > 0) planejado += Math.ceil(sku.qtdTotal / sku.qtdPadrao); });
      const totalReais = caixasReais.length;
      
      const novosDocs = [...pedidoModal.documentos];
      novosDocs[dIdx] = { 
        ...novosDocs[dIdx], caixas: caixasReais,
        auditoria: { arquivo: fileName, planejado: planejado, efetivado: totalReais, diferenca: planejado - totalReais, data: new Date().toISOString() }
      };
      
      const todosPossuemCaixas = novosDocs.every(doc => doc.caixas && doc.caixas.length > 0);
      const payload = { documentos: novosDocs };
      
      if (todosPossuemCaixas) {
        payload.efetivado = true;
        payload.completedAt = serverTimestamp();
        if (!pedidoModal.primeiraEfetivacao) payload.primeiraEfetivacao = serverTimestamp();
      }
      
      await updateDoc(pedidoRef, payload);
      setPedidoModal(prev => ({ ...prev, documentos: novosDocs, efetivado: todosPossuemCaixas ? true : prev.efetivado }));
      
      setAuditModalData(null);
      setShowCaixasEfetivadasModal(dIdx); 
      setModalSucesso({ titulo: "Auditoria Validada!", mensagem: "O arquivo do WMS foi processado e salvo no histórico com sucesso!" });
      
    } catch (error) { alert("Erro ao salvar auditoria no banco: " + error.message); } 
    finally { setIsSaving(false); }
  };

  const handleResolvePesoZero = async (acao) => {
    if (!alertaPesoZero) return;
    const { origem, dIdx, caixasNormais, caixasOriginais, fileName } = alertaPesoZero;
    const caixasEscolhidas = acao === 'excluir' ? caixasNormais : caixasOriginais;

    if (origem === 'auditoria') setAuditModalData({ dIdx, fileName, caixasReais: caixasEscolhidas });
    setAlertaPesoZero(null);
  };

  // ==========================================
  // FUNÇÕES DE GERENCIAMENTO DE PEDIDOS (CRUD)
  // ==========================================
  const resetForm = () => {
    setEditingId(null); setRomaneio(''); setLoja(''); setLocal('DF'); 
    setUf(''); setIsCaixaMaster(false); setObservacoes(''); setDocsTemporarios([]);
  };

  const handleCloseModalPedido = () => {
    setIsClosingModal(true);
    setTimeout(() => { setShowModalPedido(false); setIsClosingModal(false); resetForm(); }, 300);
  };

  const abrirModalNovoPedido = () => {
    resetForm();
    setShowModalPedido(true);
  };

  const abrirModalDetalhes = (pedido) => {
    // 1. Define o pedido alvo
    setPedidoModal(pedido);
    
    // 2. Limpa todos os estados residuais do WMS e UI
    setWmsSessions({});
    setBuscasDocumentos({});
    setSkusExpandidos({});
    setSkusExpandidosComum({});
    setWmsPreResumoAberto(null);
    setAuditModalData(null);
    
    // 3. Prepara as abas e edições
    setObservacoes(pedido.observacoes || '');
    setDocsTemporarios(pedido.documentos || []);
    setIsEditingObs(false);
    setActiveTab('resumo');
    
    // 4. Exibe o modal limpo
    setShowDetalhesModal(true);
  };

  const abrirModalEditarPedido = (pedido) => {
    setEditingId(pedido.id);
    setRomaneio(pedido.romaneio || ''); setLoja(pedido.loja || ''); setLocal(pedido.local || 'DF');
    setUf(pedido.uf || ''); setIsCaixaMaster(pedido.isCaixaMaster || false); setObservacoes(pedido.observacoes || '');
    const docs = (pedido.documentos || []).map((d, i) => ({
      idTemp: Date.now() + i, tipo: d.tipo, responsaveis: d.responsaveis || (d.responsavel ? [d.responsavel] : [])
    }));
    setDocsTemporarios(docs); setShowModalPedido(true);
  };

  const handleAddDoc = () => {
    if (!docTipo) return alert("Selecione o tipo de documento.");
    setDocsTemporarios([...docsTemporarios, { idTemp: Date.now(), tipo: docTipo, responsaveis: docResponsavel ? [docResponsavel] : [] }]);
    setDocResponsavel('');
  };

  const handleRemoveDoc = (idTemp) => setDocsTemporarios(docsTemporarios.filter(d => d.idTemp !== idTemp));

  const handleSavePedido = async () => {
    if (!romaneio.trim()) return alert("O número do romaneio é obrigatório!");
    setIsSaving(true);
    
    try {
      const uidsSet = new Set();
      docsTemporarios.forEach(d => {
        (d.responsaveis || []).forEach(email => {
          const user = usuarios.find(u => u.email === email);
          if (user) uidsSet.add(user.uid);
        });
      });
      const uidsVinculados = Array.from(uidsSet);

      const payload = {
        romaneio: romaneio.trim(), loja: loja.trim(), local, uf: uf.trim().toUpperCase(),
        isCaixaMaster, observacoes: observacoes.trim(), uidsVinculados,
        criadorUid: uidsVinculados[0] || 'admin',
        documentos: docsTemporarios.map(d => ({
          tipo: d.tipo, responsaveis: d.responsaveis, responsavel: d.responsaveis[0] || '', caixas: [] 
        })),
        dataOperacao: dataOperacaoAtiva, updatedAt: serverTimestamp()
      };

      if (editingId) {
        const ref = doc(db, 'pedidos', editingId); await updateDoc(ref, payload);
      } else {
        payload.createdAt = serverTimestamp(); payload.efetivado = false;
        await setDoc(doc(collection(db, 'pedidos')), payload);
      }
      handleCloseModalPedido();
    } catch (error) { alert("Erro ao salvar pedido: " + error.message); } finally { setIsSaving(false); }
  };

  const handleTogglePausaUsuario = async (nomeUsuario, isCurrentlyPaused) => {
    try {
      const refPausas = doc(db, 'controlePausas', dataOperacaoAtiva);
      const snap = await getDoc(refPausas);
      const agora = Date.now();
      let userStatus = { isPaused: false, history: [] };

      if (snap.exists() && snap.data()[nomeUsuario]) userStatus = JSON.parse(JSON.stringify(snap.data()[nomeUsuario]));
      if (!Array.isArray(userStatus.history)) userStatus.history = [];

      if (isCurrentlyPaused) {
        userStatus.isPaused = false;
        if (userStatus.history.length > 0) userStatus.history[userStatus.history.length - 1].end = agora;
      } else {
        userStatus.isPaused = true;
        userStatus.history.push({ start: agora });
      }
      await setDoc(refPausas, { [nomeUsuario]: userStatus }, { merge: true });
    } catch (error) { alert(`Falha ao sincronizar pausa: ${error.message}`); }
  };

  const formatMsToTime = (ms) => {
    if (ms <= 0) return "00:00:00";
    const hh = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const getTempoOcioso = (nomeUser) => {
    const userStats = rankingCalculado.find(u => u.nome === nomeUser); 
    if (!userStats || !userStats.eventosMesclados || userStats.eventosMesclados.length === 0) return 0;
    const ultimoEvento = userStats.eventosMesclados[userStats.eventosMesclados.length - 1];
    if (horaReferenciaAtual > ultimoEvento.end) return horaReferenciaAtual - ultimoEvento.end;
    return 0; 
  };

  const formatarCronometroPedido = (pedido) => {
    if (!pedido.createdAt) return "00:00:00";
    const start = pedido.createdAt.toMillis ? pedido.createdAt.toMillis() : pedido.createdAt;
    const totalPaused = pedido.totalPausedTime || 0;
    let end = (pedido.efetivado && pedido.completedAt) ? (pedido.completedAt.toMillis ? pedido.completedAt.toMillis() : pedido.completedAt) : (pedido.isPaused && pedido.lastPauseStart ? pedido.lastPauseStart : horaReferenciaAtual);
    const diff = Math.max(0, end - start - totalPaused);
    return formatMsToTime(diff);
  };

  const getNomesResponsaveis = (pedido) => {
    const uids = pedido.uidsVinculados || [pedido.criadorUid];
    if (!uids || uids.length === 0) return 'Não atribuído';
    return uids.map(uid => {
      const user = usuarios.find(u => u.uid === uid);
      return user ? user.email.split('@')[0] : 'Desconhecido';
    }).join(', ');
  };

  const obterReferenciaDocumento = (pedido) => {
    return pedido._isLegacy ? doc(db, 'usuarios', pedido.criadorUid, 'elementos', pedido.elementoIdOriginal, 'pedidosMultiDocumento', pedido.id) : doc(db, 'pedidos', pedido.id);
  };

  const handleToggleEfetivado = async (pedido) => {
    if (pedido.isPaused) return alert("O pedido está pausado. Retome na operação antes de alterar o status.");
    const novoStatus = !pedido.efetivado;
    const ref = obterReferenciaDocumento(pedido);
    const payload = { efetivado: novoStatus };
    
    if (novoStatus) {
      if (!pedido.primeiraEfetivacao) { payload.completedAt = serverTimestamp(); payload.primeiraEfetivacao = serverTimestamp(); } 
      else { payload.completedAt = pedido.primeiraEfetivacao; }
    } else {
      if (!pedido.primeiraEfetivacao && pedido.completedAt) payload.primeiraEfetivacao = pedido.completedAt;
      payload.completedAt = deleteField(); 
    }
    try { await updateDoc(ref, payload); } catch (e) { alert("Erro ao alterar o status do pedido."); }
  };

  const handleDeletePedido = async (pedido) => {
    if (!window.confirm("Atenção: Tem certeza que deseja excluir este pedido de toda a operação definitivamente?")) return;
    try { await deleteDoc(obterReferenciaDocumento(pedido)); } catch (e) { alert("Erro ao excluir pedido."); }
  };

  const handleDeleteEvent = async (evento) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente este registro de ${evento.delta} pontos?`)) return;
    if (!evento.sourceId || !evento.sourceType) return alert("Erro crítico: O ID deste evento não foi encontrado.");

    const colecaoAlvo = evento.sourceType === 'op' ? 'ordensProducao' : 'ajustesDiarios';
    try {
      await deleteDoc(doc(db, colecaoAlvo, evento.sourceId));
      
      const refDia = doc(db, 'estatisticasDiarias', dataOperacaoAtiva);
      const snapDia = await getDoc(refDia);
      
      if (snapDia.exists()) {
        const dadosAtuais = snapDia.data();
        const rankingAtual = dadosAtuais.ranking || {};
        let atualizou = false;
        
        Object.keys(rankingAtual).forEach(uid => {
          const userStats = rankingAtual[uid];
          if (userStats && userStats.pointEvents) {
            const temEvento = userStats.pointEvents.some(e => e.sourceId === evento.sourceId);
            if (temEvento) {
              userStats.pointEvents = userStats.pointEvents.filter(e => e.sourceId !== evento.sourceId);
              userStats.chartData = userStats.chartData.filter(e => e.sourceId !== evento.sourceId);
              userStats.pontos = Math.max(0, userStats.pontos - evento.delta);
              if (evento.sourceType === 'op') userStats.op = Math.max(0, userStats.op - 1);
              
              let scoreAcumulado = 0;
              userStats.chartData.forEach(ponto => {
                scoreAcumulado = Math.max(0, scoreAcumulado + (ponto.delta || 0));
                ponto.score = scoreAcumulado;
              });
              rankingAtual[uid] = userStats;
              atualizou = true;
            }
          }
        });
        if (atualizou) await updateDoc(refDia, { ranking: rankingAtual });
      }
      alert("Registro apagado com sucesso!");
    } catch (error) { alert("Erro de permissão ou conexão ao tentar excluir."); }
  };

  // ==========================================
  // LISTA COMPLETA DE USUÁRIOS PARA O MODAL DE AJUSTES
  // ==========================================
  const usuariosParaIntervencao = useMemo(() => {
    if (!usuarios || usuarios.length === 0) return rankingCalculado || [];
    
    return usuarios.map(u => {
      const nomeUser = String(u.email).split('@')[0];
      const statsExistentes = (rankingCalculado || []).find(r => r.nome === nomeUser);
      
      // Se ele já tem dados no ranking de hoje, retorna os dados dele
      if (statsExistentes) return statsExistentes;
      
      // Se não fez nada hoje, cria um "fantasma" zerado para podermos intervir
      return {
        nome: nomeUser,
        uid: u.uid,
        pontos: 0,
        skus: 0,
        pontosSku: 0,
        op: 0,
        pedidos: 0,
        bonusPedidos: 0,
        decrescimo: 0,
        pointEvents: [],
        chartData: [],
        eventosMesclados: []
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome)); // Organiza em ordem alfabética para facilitar
  }, [usuarios, rankingCalculado]);

  return (
    <div className="op-wrapper">
      
      <header className="op-header">
        <div className="op-title-group">
          <button className="btn-back" onClick={() => navigate('/dashboard')} title="Voltar ao Painel"><ArrowLeft size={24} /></button>
          <div><h1>Painel da Liderança</h1><span><ShieldCheck size={14}/> Gestão e Intervenção de Resultados</span></div>
        </div>
        
        <div className="op-actions">
          <button onClick={() => setShowModalIntervencao(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}>
            <Settings size={18} /> Ajustes e Penalidades
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '5px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Clock size={16} color="#64748b" />
            <input type="date" value={dataOperacaoAtiva} onChange={(e) => { if (e.target.value) navigate(`${location.pathname}?date=${e.target.value}`); }} style={{ border: 'none', outline: 'none', color: '#475569', fontWeight: 'bold', background: 'transparent' }}/>
          </div>
        </div>
      </header>

      <main style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        <section>
             <AdmEstatisticasGerais dados={estatisticasTempoReal} />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={20} color="var(--primary)" /> Painel de Comando: Equipe ao Vivo</h3>
            {pedidosEmAndamento.length > 0 && (
              <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div className="pulse-dot" style={{ background: '#fff' }}></div> {pedidosEmAndamento.length} Romaneios sendo separados
              </span>
            )}
            {isExpedienteEncerrado && (
              <span style={{ background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                <Moon size={14} /> Expediente Encerrado (17h30)
              </span>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', width: '100%' }}>
            {equipeAtivaHoje.length === 0 ? (
              <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '10px', width: '100%', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>Nenhum conferente registrou atividade.</div>
            ) : (
              equipeAtivaHoje.map(user => {
                const nomeUser = user.email.split('@')[0];
                const isPaused = controlePausas[nomeUser]?.isPaused || false;
                const pedidoAtivo = pedidosEmAndamento.find(p => { const uids = p.uidsVinculados || [p.criadorUid]; return uids.includes(user.uid); });
                const tempoOciosoMs = getTempoOcioso(nomeUser);

                let statusColor, statusText, statusIcon, conteudoCentral;
                const isDiaConcluido = isExpedienteEncerrado && !pedidoAtivo;

                if (isDiaConcluido) {
                   statusColor = '#10b981'; statusText = 'Dia Concluído'; statusIcon = <CheckCircle2 size={14} />;
                   conteudoCentral = (<div style={{ padding: '15px 0', color: '#64748b', fontSize: '0.9rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Moon size={32} color="#10b981" style={{ margin: '0 auto 8px auto', opacity: 0.5 }} /><div style={{ fontWeight: '500', color: '#334155' }}>Expediente Finalizado</div><div style={{ fontSize: '0.8rem' }}>Ociosidade travada às 17h30.</div></div>);
                } else if (isPaused) {
                   statusColor = '#f59e0b'; statusText = 'Em Pausa (Protegido)'; statusIcon = <Coffee size={14} />;
                   conteudoCentral = (<div style={{ padding: '15px 0', color: '#64748b', fontSize: '0.9rem', textAlign: 'center' }}><ShieldCheck size={32} color="#f59e0b" style={{ margin: '0 auto 8px auto', opacity: 0.5 }} /><div style={{ fontWeight: '500', color: '#334155' }}>Ociosidade congelada.</div><div style={{ fontSize: '0.8rem' }}>Nenhum ponto será descontado.</div></div>);
                } else if (pedidoAtivo) {
                   statusColor = '#3b82f6'; statusText = 'Separando Pedido'; statusIcon = <Briefcase size={14} />;
                   const tiposDosDocs = pedidoAtivo.documentos?.map(d => d.tipo).filter(Boolean).join(', ') || 'Nenhum listado';
                   conteudoCentral = (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0', flex: 1 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <strong style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a' }}><Package size={18} color="#3b82f6" /> {pedidoAtivo.romaneio || 'S/N'}</strong>
                         <span style={{ fontWeight: '900', color: '#3b82f6', fontFamily: 'monospace', fontSize: '1.1rem', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px' }}>{formatarCronometroPedido(pedidoAtivo)}</span>
                       </div>
                       <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} color="#94a3b8" /> {pedidoAtivo.loja || 'Destino Padrão'}</div>
                       <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }} title={tiposDosDocs}><FileText size={14} color="#94a3b8" /> {tiposDosDocs.length > 25 ? tiposDosDocs.substring(0, 25) + '...' : tiposDosDocs}</div>
                     </div>
                   );
                } else {
                   const limiteOciosidadeMs = 20 * 60 * 1000; const tolerenciaExcedida = tempoOciosoMs > limiteOciosidadeMs;
                   statusColor = tolerenciaExcedida ? '#ef4444' : '#64748b'; statusText = tolerenciaExcedida ? 'Ocioso (Sangrando)' : 'Livre (Na tolerância)'; statusIcon = tolerenciaExcedida ? <AlertTriangle size={14} /> : <Clock size={14} />;
                   conteudoCentral = (
                     <div style={{ padding: '15px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flex: 1, justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Tempo inativo após última tarefa:</span>
                        <span style={{ fontSize: '2.2rem', fontWeight: '900', color: statusColor, fontFamily: 'monospace', lineHeight: '1', letterSpacing: '-1px' }}>{formatMsToTime(tempoOciosoMs)}</span>
                        {tolerenciaExcedida && (<div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 'bold', marginTop: '5px', background: '#fef2f2', padding: '2px 8px', borderRadius: '12px' }}>Perdendo pontos agora</div>)}
                     </div>
                   );
                }

                return (
                  <div key={user.uid} style={{ background: '#fff', border: `1px solid ${statusColor}40`, borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'capitalize' }}><Users size={18} color="#94a3b8" /> {nomeUser}</strong>
                      <div style={{ background: `${statusColor}15`, color: statusColor, padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>{statusIcon} {statusText}</div>
                    </div>
                    {conteudoCentral}
                    {isDiaConcluido ? (
                      <div style={{ width: '100%', padding: '10px', background: '#f1f5f9', color: '#94a3b8', textAlign: 'center', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', border: '1px dashed #cbd5e1', marginTop: '5px' }}>Operação Fechada</div>
                    ) : (
                      <button onClick={() => handleTogglePausaUsuario(nomeUser, isPaused)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: isPaused ? '#f8fafc' : '#f59e0b', color: isPaused ? '#475569' : '#fff', border: isPaused ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', transition: 'all 0.2s', marginTop: '5px' }}>
                        {isPaused ? <><Play size={16} /> Retomar Operação</> : <><Pause size={16} /> Pausar Ociosidade</>}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="op-history-section" style={{ margin: 0 }}>
          <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={18} color="var(--primary)"/> Histórico Global de Romaneios</h3>
              <span className="history-count" style={{ display: 'block', marginTop: '4px' }}>{pedidosProcessados.filter(p => p.efetivado).length} finalizados da equipe</span>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div className="search-bar-op" style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px' }}>
                <Search size={16} color="#64748b" />
                <input type="text" placeholder="Buscar romaneio..." value={buscaRomaneio} onChange={(e) => setBuscaRomaneio(e.target.value)} style={{ border: 'none', outline: 'none', marginLeft: '8px', fontSize: '0.9rem' }}/>
              </div>
              <button onClick={abrirModalNovoPedido} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <PackagePlus size={18} /> Novo Romaneio
              </button>
            </div>
          </div>
          
          <div className="op-table-wrapper scrollable-table-wrapper">
            <table className="op-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Romaneio</th><th style={{ width: '25%' }}>Destino / Resp.</th><th style={{ width: '25%' }}>Observações</th><th style={{ width: '25%' }}>Resumo Rápido</th><th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.length === 0 ? (
                  <tr><td colSpan="5" style={{textAlign: 'center', padding: '30px', color: '#94a3b8'}}>{buscaRomaneio ? 'Nenhum romaneio encontrado.' : 'Nenhum pedido processado hoje.'}</td></tr>
                ) : (
                  pedidosFiltrados.map(pedido => {
                    let caixasCount = 0; 
let skusCount = 0;
const listaDocumentos = []; // Agora guardamos cada documento em uma lista

(pedido.documentos || []).forEach(d => {
  // Adiciona o tipo de documento na lista toda vez que encontra um
  listaDocumentos.push(d.tipo || 'S/N');
  
  caixasCount += (d.caixas || []).length;
  (d.caixas || []).forEach(cx => { 
    (cx.produtos || []).forEach(p => skusCount += parseInt(p.quantidade) || 0); 
  });
});
                    let statusBadge;
                    if (pedido.efetivado) statusBadge = <div className="time-badge success"><Check size={12} style={{marginRight:'3px', display:'inline'}}/> Finalizado</div>;
                    else if (pedido.isPaused) statusBadge = <div className="time-badge paused" title={pedido.motivoPausa}><Pause size={12} style={{marginRight:'3px', display:'inline'}}/> Pausado</div>;
                    else statusBadge = <div className="time-badge pending"><Clock size={12} style={{marginRight:'3px', display:'inline'}}/> {formatarCronometroPedido(pedido)}</div>;

                    return (
                      <tr key={pedido.id} className={`clickable-row ${pedido.efetivado ? "efetivado" : ""}`} onClick={() => abrirModalDetalhes(pedido)}>
                        <td style={{ verticalAlign: 'middle', padding: '16px 12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                            <div><strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{pedido.romaneio || 'S/N'}</strong></div>
                            {statusBadge}
                          </div>
                        </td>
                        <td style={{ verticalAlign: 'middle', padding: '16px 12px' }}>
                          <div style={{fontWeight: 600, color: '#334155', whiteSpace: 'normal', fontSize: '13px'}}>{pedido.loja || '---'}</div>
                          <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px'}}><MapPin size={12} /> {pedido.local || 'DF'} {pedido.uf ? `- ${pedido.uf}` : ''}</div>
                          <div style={{fontSize: '11px', color: '#6366f1', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px'}}><Users size={12} /> {getNomesResponsaveis(pedido)}</div>
                        </td>
                        <td style={{ verticalAlign: 'middle', padding: '16px 12px', whiteSpace: 'normal', fontSize: '12px', color: '#64748b' }}>
                           {pedido.observacoes ? pedido.observacoes : <span style={{opacity: 0.4, fontStyle: 'italic'}}>Nenhuma observação...</span>}
                        </td>
                        <td style={{ verticalAlign: 'middle', padding: '16px 12px' }}>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
    
    {/* Gera um badge colorido individual para CADA documento do romaneio */}
    {listaDocumentos.map((tipo, idx) => {
      let corFundo = '#3b82f6'; // Azul padrão (Nota Fiscal)
      if (tipo === 'Minuta') corFundo = '#8b5cf6'; // Roxo
      if (tipo === 'Bonificação') corFundo = '#ec4899'; // Rosa
      if (tipo === 'Troca') corFundo = '#f59e0b'; // Laranja
      
      return (
        <span key={idx} className="sku-badge" style={{ margin: 0, padding: '2px 6px', fontSize: '11px', background: corFundo, color: '#fff', border: 'none', fontWeight: 'bold' }}>
          {tipo}
        </span>
      );
    })}

    <span className="sku-badge" style={{ margin: 0, padding: '2px 6px', fontSize: '11px', background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}>{caixasCount} Caixas</span>
    <span className="sku-badge" style={{ margin: 0, padding: '2px 6px', fontSize: '11px', background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}>{skusCount} SKUs</span>
  </div>
</td>
                        <td className="actions-cell" style={{ verticalAlign: 'middle', padding: '16px 12px' }}>
                          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <div style={{position: 'relative'}}>
                              <button className="action-btn btn-edit" title="Ações ADM" onClick={() => setDropdownOpen(dropdownOpen === pedido.id ? null : pedido.id)}><MoreVertical size={16}/></button>
                              {dropdownOpen === pedido.id && (
                                <div className="table-dropdown-menu" style={{ right: 0, left: 'auto' }}>
                                  <button className="dropdown-item" onClick={() => abrirModalEditarPedido(pedido)}><Edit size={14}/> Editar Dados do Pedido</button>
                                  <div className="dropdown-divider"></div>
                                  <button className="dropdown-item" onClick={() => handleToggleEfetivado(pedido)}>{pedido.efetivado ? <><X size={14}/> Desfazer Efetivação</> : <><Check size={14}/> Forçar Efetivação</>}</button>
                                  <div className="dropdown-divider"></div>
                                  <button className="dropdown-item text-danger" onClick={() => handleDeletePedido(pedido)}><Trash2 size={14}/> Excluir Pedido (Global)</button>
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

      </main>

      <section className="op-bottom-zone">
         <RankingDiario 
            rankingCalculado={rankingCalculado} rankingExpandido={rankingExpandido} setRankingExpandido={setRankingExpandido}
            currentTime={horaReferenciaAtual} dataOperacaoAtiva={dataOperacaoAtiva} isAdminMode={true} onDeleteEvent={handleDeleteEvent}
          />
         <div className="op-side-indicators">
            
            {/* NOVO CARD: ORDENS DE PRODUÇÃO */}
            <div className="indicator-card op-card">
              <div className="indicator-icon" style={{background: '#e0e7ff', color: '#4f46e5'}}><Factory size={24}/></div>
              <div className="indicator-content">
                <h4>Ordens de Produção</h4>
                <span className="indicator-value">{opsDoDia.length} Registros</span>
                <p>Controle de O.P.s de toda equipe</p>
              </div>
              <button className="indicator-btn" onClick={() => setShowOpModal(true)}>Gerenciar O.P.s</button>
            </div>

            {/* NOVO CARD: CAIXAS MASTER */}
            <div className="indicator-card master-card">
              <div className="indicator-icon" style={{background: '#fce7f3', color: '#db2777'}}><Package size={24}/></div>
              <div className="indicator-content">
                <h4>Caixas Master</h4>
                <span className="indicator-value">{caixasMaster.length} Padrões</span>
                <p>Dicionário de embalagens</p>
              </div>
              <button className="indicator-btn" onClick={() => setShowMasterModal(true)}>Consultar Base</button>
            </div>

         </div>
      </section>

      {showModalIntervencao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setShowModalIntervencao(false)}>
          <div style={{ background: '#f8fafc', width: '95%', maxWidth: '1000px', maxHeight: '90vh', borderRadius: '12px', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
              <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} color="#3b82f6" /> Lançamento de Ajustes e Penalidades</h3>
              <button onClick={() => setShowModalIntervencao(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
            </div>
            <div style={{ padding: '20px' }}>
              <AdmControlesManuais dados={usuariosParaIntervencao} dataFiltro={dataOperacaoAtiva} />
            </div>
          </div>
        </div>
      )}

      {/* ================= INJEÇÃO DOS MODAIS ADICIONADOS ================= */}
      <ModalCriarEditarPedido
        showModal={showModalPedido} isClosingModal={isClosingModal} handleCloseModal={handleCloseModalPedido} isSaving={isSaving} editingId={editingId}
        romaneio={romaneio} setRomaneio={setRomaneio} loja={loja} setLoja={setLoja} local={local} setLocal={setLocal} uf={uf} setUf={setUf}
        isCaixaMaster={isCaixaMaster} setIsCaixaMaster={setIsCaixaMaster} observacoes={observacoes} setObservacoes={setObservacoes}
        docTipo={docTipo} setDocTipo={setDocTipo} docResponsavel={docResponsavel} setDocResponsavel={setDocResponsavel}
        usuarios={usuarios} localUser={null} handleAddDoc={handleAddDoc} docsTemporarios={docsTemporarios} handleRemoveDoc={handleRemoveDoc} handleSavePedido={handleSavePedido}
        handleAddResponsavelToDoc={(id, email) => setDocsTemporarios(docsTemporarios.map(d => d.idTemp === id ? {...d, responsaveis: [...(d.responsaveis || []), email]} : d))}
        handleRemoveResponsavelFromDoc={(id, email) => setDocsTemporarios(docsTemporarios.map(d => d.idTemp === id ? {...d, responsaveis: d.responsaveis.filter(r => r !== email)} : d))}
      />

      <ModalDetalhesPedido 
        showDetalhesModal={showDetalhesModal} setShowDetalhesModal={setShowDetalhesModal} pedidoModal={pedidoModal} isSaving={isSaving} isUploading={isUploading}
        activeTab={activeTab} setActiveTab={setActiveTab} wmsSessions={wmsSessions} setWmsSessions={setWmsSessions} buscasDocumentos={buscasDocumentos}
        handleBuscaDocumento={(dIdx, val) => setBuscasDocumentos(p => ({...p, [dIdx]: val}))} wmsPreResumoAberto={wmsPreResumoAberto} setWmsPreResumoAberto={setWmsPreResumoAberto}
        setShowCaixasEfetivadasModal={setShowCaixasEfetivadasModal}
        handlePlanejamentoUpload={handlePlanejamentoUpload} handleUploadWMSComum={handleUploadWMSComum}
        docIndexSelecionado={docIndexSelecionado} setDocIndexSelecionado={setDocIndexSelecionado} skusExpandidos={skusExpandidos} setSkusExpandidos={setSkusExpandidos}
        skusExpandidosComum={skusExpandidosComum} setSkusExpandidosComum={setSkusExpandidosComum}
        handleInputManual={() => {}} abrirModalSalvarManual={() => {}} handleMudarVariacao={() => {}}
        isEditingObs={isEditingObs} setIsEditingObs={setIsEditingObs} observacoes={observacoes} setObservacoes={setObservacoes} docTipo={docTipo} setDocTipo={setDocTipo}
        docResponsavel={docResponsavel} setDocResponsavel={setDocResponsavel} localUser={null} usuarios={usuarios}
        handleAddDoc={handleAddDoc} docsTemporarios={docsTemporarios} handleRemoveDoc={handleRemoveDoc}
        handleAddResponsavelToDoc={(id, email) => setDocsTemporarios(docsTemporarios.map(d => d.idTemp === id ? {...d, responsaveis: [...(d.responsaveis || []), email]} : d))}
        handleRemoveResponsavelFromDoc={(id, email) => setDocsTemporarios(docsTemporarios.map(d => d.idTemp === id ? {...d, responsaveis: d.responsaveis.filter(r => r !== email)} : d))}
        setAuditModalData={setAuditModalData}
        handleSalvarEdicaoTab1={() => alert('Edições pela ADM salvas!')}
      />

      <ModalCaixasEfetivadas 
        showCaixasEfetivadasModal={showCaixasEfetivadasModal}
        setShowCaixasEfetivadasModal={setShowCaixasEfetivadasModal}
        pedidoModal={pedidoModal}
        edicaoCaixa={edicaoCaixa}
        setEdicaoCaixa={setEdicaoCaixa}
        formCaixa={formCaixa}
        setFormCaixa={setFormCaixa}
        salvarCaixaManual={salvarCaixaManual}
        isSaving={isSaving}
        toggleBonificacaoCaixa={toggleBonificacaoCaixa}
        abrirFormCaixa={abrirFormCaixa}
        excluirCaixaManual={excluirCaixaManual}
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

      {/* MODAL: ALERTA DE PESO ZERO */}
      <ModalAlertaPeso 
        alertaPesoZero={alertaPesoZero}
        handleResolvePesoZero={handleResolvePesoZero}
      />

      {/* MODAL: SUCESSO ANIMADO */}
      <ModalSucesso 
        modalSucesso={modalSucesso}
        setModalSucesso={setModalSucesso}
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

      {/* MODAL: DICIONÁRIO DE CAIXAS MASTER */}
      <ModalCaixasMaster 
        showMasterModal={showMasterModal}
        setShowMasterModal={setShowMasterModal}
        caixasMaster={caixasMaster}
        setCaixasMaster={setCaixasMaster}
      />

    </div>
  );
}