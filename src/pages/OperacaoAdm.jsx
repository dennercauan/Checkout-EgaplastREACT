// src/pages/OperacaoAdm.jsx
import { useMotorRanking } from '../hooks/useMotorRanking';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Clock, ShieldCheck, ClipboardList, Package, MapPin, 
  Users, FileText, Settings, Play, Pause, CheckCircle2, Search, 
  MoreVertical, X, Check, Trash2, Info, Activity, Coffee, 
  Briefcase, AlertTriangle, Moon, PackagePlus, Edit, Factory,
  Layers, SearchX, Plus, PlayCircle, PauseCircle, CalendarDays, ArrowRight, Loader2, UserCheck, CheckSquare, Square
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  doc, onSnapshot, deleteDoc, getDoc, updateDoc, setDoc, 
  collection, query, where, getDocs, collectionGroup, 
  Timestamp, serverTimestamp, deleteField 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase'; 

import NavbarOperacao from '../components/NavbarOperacao';
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
import AnimacaoCriacaoPedido from '../components/AnimacaoCriacaoPedido';
import ModalConfirmarExclusao from '../components/ModalConfirmarExclusao';
import ModalFluxoImportacaoWMS from '../components/ModalFluxoImportacaoWMS';
import ModalImprimirEtiqueta from '../components/ModalImprimirEtiqueta';
import { Tag } from 'lucide-react';
import TransicaoAdmOverlay from '../components/TransicaoAdmOverlay';
import ModalGerenciarRanking from '../components/ModalGerenciarRanking';
import '../css/Operacao.css'; 

export default function OperacaoAdm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [showOpModal, setShowOpModal] = useState(false);
  const [auditModalData, setAuditModalData] = useState(null);
  const [alertaPesoZero, setAlertaPesoZero] = useState(null);
  const [modalSucesso, setModalSucesso] = useState(null);
  const [localUser, setLocalUser] = useState({ uid: 'admin-god-mode', email: 'admin' });
  const [transferenciaSucesso, setTransferenciaSucesso] = useState(false);
  const [pedidoParaEtiqueta, setPedidoParaEtiqueta] = useState(null);
  
  // Data local segura (Evita divergência de UTC)
  const getHojeFormatado = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };
  
  const dataOperacaoAtiva = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('date') || getHojeFormatado();
  }, [location.search]);

  const [rankingExpandido, setRankingExpandido] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [dadosDeEstatisticasFirebase, setDadosDeEstatisticasFirebase] = useState({});
  const [rankingArrayFirebase, setRankingArrayFirebase] = useState([]);
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState(null);
  const [isExcluindoPedido, setIsExcluindoPedido] = useState(false);
  const [fluxoImportacao, setFluxoImportacao] = useState(null);
  const [showModalGerenciarRanking, setShowModalGerenciarRanking] = useState(false);

  const [pedidoParaTransferir, setPedidoParaTransferir] = useState(null);
  const [novaDataTransferencia, setNovaDataTransferencia] = useState('');
  const [isTransferindo, setIsTransferindo] = useState(false);

  const handleAbrirTransferencia = (pedido) => {
    setPedidoParaTransferir(pedido);
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`;
    setNovaDataTransferencia(amanhaStr);
    setDropdownOpen(null);
  };

  // ESTADOS DO EXPEDIENTE
  const [showModalExpediente, setShowModalExpediente] = useState(false);
  const [dadosExpediente, setDadosExpediente] = useState({ inicio: '', fim: '', status: 'aguardando' });
  const [formExpediente, setFormExpediente] = useState({ horaInicio: '07:30', horaFim: '17:30' });

  // ESTADOS DA EQUIPE FIXA
  const [equipeFixaUids, setEquipeFixaUids] = useState([]);
  const [showModalEquipe, setShowModalEquipe] = useState(false);
  const [tempEquipeUids, setTempEquipeUids] = useState([]);
  const [isSalvandoEquipe, setIsSalvandoEquipe] = useState(false);

  // Carrega a equipe fixa configurada no Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'configuracoes', 'equipeCheckout'), (snap) => {
      if (snap.exists() && Array.isArray(snap.data().uids)) {
        setEquipeFixaUids(snap.data().uids);
      } else {
        setEquipeFixaUids([]);
      }
    });
    return () => unsub();
  }, []);

  const abrirModalEquipe = () => {
    setTempEquipeUids(equipeFixaUids);
    setShowModalEquipe(true);
  };

  const toggleUserNaEquipe = (uid) => {
    setTempEquipeUids(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSalvarEquipeFixa = async () => {
    setIsSalvandoEquipe(true);
    try {
      await setDoc(doc(db, 'configuracoes', 'equipeCheckout'), {
        uids: tempEquipeUids,
        updatedAt: serverTimestamp()
      });
      setShowModalEquipe(false);
    } catch (e) {
      alert("Erro ao salvar equipe: " + e.message);
    } finally {
      setIsSalvandoEquipe(false);
    }
  };

  const handleConfirmarTransferencia = async () => {
    if (!pedidoParaTransferir || !novaDataTransferencia) return;
    setIsTransferindo(true);
    try {
      const agora = Date.now();
      const dataOrig = pedidoParaTransferir.dataOperacao || dataOperacaoAtiva;

      // Start real do romaneio original
      const startOriginal = pedidoParaTransferir.createdAt?.toMillis 
        ? pedidoParaTransferir.createdAt.toMillis() 
        : (typeof pedidoParaTransferir.createdAt === 'number' ? pedidoParaTransferir.createdAt : agora);
      
      const totalPausedOriginal = pedidoParaTransferir.totalPausedTime || 0;
      
      // Resgata se já houve alguma transferência anterior neste mesmo romaneio
      const tempoAnteriorJaAcumulado = pedidoParaTransferir.tempoTrabalhadoAnterior || 0;
      
      // Fim real no momento da transferência
      let momentoFinalOriginal = agora;
      if (pedidoParaTransferir.isPaused && pedidoParaTransferir.lastPauseStart) {
        momentoFinalOriginal = pedidoParaTransferir.lastPauseStart;
      } 
      // REMOVIDA A TRAVA DE 17h30 AQUI. O romaneio ativo continua gerando tempo na hora extra.

      // Calcula o tempo limpo trabalhado APENAS hoje
      const tempoTrabalhadoNesteDia = Math.max(0, momentoFinalOriginal - startOriginal - totalPausedOriginal);
      
      // Soma o que trabalhou hoje com o que já vinha de dias anteriores (se houver transferências múltiplas)
      const novoTempoTrabalhadoAnterior = tempoAnteriorJaAcumulado + tempoTrabalhadoNesteDia;

      // =========================================================
      // 1. PROTEGER O TEMPO TRABALHADO NO DIA DE ORIGEM 
      // =========================================================
      const refPausasOrigem = doc(db, 'controlePausas', dataOrig);
      const snapPausas = await getDoc(refPausasOrigem);
      const dadosPausas = snapPausas.exists() ? snapPausas.data() : {};
      
      const uidsEnvolvidos = (pedidoParaTransferir.uidsVinculados && pedidoParaTransferir.uidsVinculados.length > 0) 
        ? pedidoParaTransferir.uidsVinculados 
        : (pedidoParaTransferir.criadorUid ? [pedidoParaTransferir.criadorUid] : []);

      uidsEnvolvidos.forEach(uid => {
        const user = usuarios.find(u => u.uid === uid);
        if (user) {
          let userStatus = dadosPausas[uid] || { isPaused: false, history: [] };
          if (!Array.isArray(userStatus.history)) userStatus.history = [];
          
          // Anexa a atividade na timeline do dia passado
          userStatus.history.push({ 
            start: startOriginal, 
            end: momentoFinalOriginal 
          });

          dadosPausas[uid] = userStatus;
        }
      });
      
      await setDoc(refPausasOrigem, dadosPausas, { merge: true });

      // =========================================================
      // 2. TRANSFERÊNCIA LIMPA PARA O NOVO DIA
      // =========================================================
      const [anoD, mesD, diaD] = novaDataTransferencia.split('-');
      const dataAlvoBase = new Date(Number(anoD), Number(mesD) - 1, Number(diaD), 7, 30, 0).getTime();
      
      // O pedido agora nasce limpo, pontualmente no início do novo dia
      const novoCreatedAtTimestamp = Timestamp.fromDate(new Date(dataAlvoBase));

      let ref = obterReferenciaDocumento(pedidoParaTransferir);

      await updateDoc(ref, {
        dataOperacao: novaDataTransferencia,
        createdAt: novoCreatedAtTimestamp, 
        tempoTrabalhadoAnterior: novoTempoTrabalhadoAnterior, // <- SALVA O BANCO DE HORAS AQUI
        isPaused: true,
        lastPauseStart: dataAlvoBase,
        totalPausedTime: 0,
        motivoPausa: "Transferido do dia anterior",
        efetivado: false,
        completedAt: deleteField(),
        updatedAt: serverTimestamp()
      });

      setPedidosNovos(prev => prev.filter(p => p.id !== pedidoParaTransferir.id));
      setPedidosLegados(prev => prev.filter(p => p.id !== pedidoParaTransferir.id));
      
      setTransferenciaSucesso(true);
      setTimeout(() => {
        setTransferenciaSucesso(false);
        setPedidoParaTransferir(null);
      }, 1800);

    } catch (error) {
      console.error("Erro ao transferir:", error);
      alert("Erro ao transferir romaneio: " + error.message);
    } finally {
      setIsTransferindo(false);
    }
  };

  const [controlePausas, setControlePausas] = useState({});
  const [showModalIntervencao, setShowModalIntervencao] = useState(false);
  
  const [usuarios, setUsuarios] = useState([]);
  const [pedidosNovos, setPedidosNovos] = useState([]);
  const [pedidosLegados, setPedidosLegados] = useState([]);
  const [buscaRomaneio, setBuscaRomaneio] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  const [opsDoDia, setOpsDoDia] = useState([]);
  const [ajustesDoDia, setAjustesDoDia] = useState([]);
  const [pedidoRecemCriado, setPedidoRecemCriado] = useState(null);

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

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setLocalUser(currentUser);
      }
    });
    return () => unsubAuth();
  }, []);

  const veioDeTransicao = Boolean(location.state?.fromTransition);
  const [overlayAtivo, setOverlayAtivo] = useState(veioDeTransicao);
  const [overlaySaindo, setOverlaySaindo] = useState(false);
  const [paginaVisivel, setPaginaVisivel] = useState(!veioDeTransicao);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    if (veioDeTransicao) {
      // 1. Inicia o fade-out do Overlay
      const t1 = setTimeout(() => {
        setOverlaySaindo(true);
      }, 750);

      // 2. Revela a página suavemente enquanto o overlay desaparece
      const t2 = setTimeout(() => {
        setPaginaVisivel(true);
      }, 900);

      // 3. Destrói o overlay da memória
      const t3 = setTimeout(() => {
        setOverlayAtivo(false);
        window.history.replaceState({}, document.title);
      }, 1400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [veioDeTransicao]);

 const horaReferenciaAtual = currentTime;

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
    const unsubUsers = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
      const list = snapshot.docs.map(d => ({
        uid: d.id,
        ...d.data()
      }));
      setUsuarios(list);
    });
    return () => unsubUsers();
  }, []);

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
                nome, uid: stats.uid || nome, pontos: stats.pontos || 0, skus: stats.skus || 0, pontosSku: stats.pontosSku || 0,       
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
    setPedidosNovos([]);

    const qNovo = query(collection(db, 'pedidos'), where('dataOperacao', '==', dataOperacaoAtiva));
    const unsubNovo = onSnapshot(qNovo, (snap) => {
      setPedidosNovos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qOp = query(collection(db, 'ordensProducao'), where('dataOperacao', '==', dataOperacaoAtiva));
    const unsubOp = onSnapshot(qOp, (snap) => setOpsDoDia(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    
    const qAjustes = query(collection(db, 'ajustesDiarios'), where('dataOperacao', '==', dataOperacaoAtiva));
    const unsubAjustes = onSnapshot(qAjustes, (snap) => setAjustesDoDia(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

    return () => { unsubNovo(); unsubOp(); unsubAjustes(); };
  }, [dataOperacaoAtiva]);

  const pedidosProcessados = useMemo(() => {
    return pedidosNovos
      .map(pedido => {
        if (Array.isArray(pedido.uidsVinculados) && pedido.uidsVinculados.length > 0) {
          return pedido;
        }

        const uidsSet = new Set();
        if (pedido.criadorUid) uidsSet.add(pedido.criadorUid);

        (pedido.documentos || []).forEach(d => {
          const lista = d.responsaveis || (d.responsavel ? [d.responsavel] : []);
          lista.forEach(identificador => {
            if (!identificador) return;
            const user = (usuarios || []).find(u => 
              u.uid === identificador ||
              u.email === identificador ||
              u.nickname === identificador ||
              (u.email && u.email.split('@')[0] === identificador)
            );
            if (user) uidsSet.add(user.uid);
          });
        });

        return {
          ...pedido,
          uidsVinculados: Array.from(uidsSet)
        };
      })
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
  }, [pedidosNovos, usuarios]);

  const pedidosEmAndamento = useMemo(() => pedidosProcessados.filter(p => !p.efetivado), [pedidosProcessados]);

  const pedidosFiltrados = useMemo(() => {
    if (!buscaRomaneio.trim()) return pedidosProcessados;
    const termo = buscaRomaneio.toLowerCase();
    return pedidosProcessados.filter(p => 
      String(p.romaneio || '').toLowerCase().includes(termo) || 
      String(p.loja || '').toLowerCase().includes(termo) ||
      String(p.uf || '').toLowerCase().includes(termo)
    );
  }, [pedidosProcessados, buscaRomaneio]);

  const totalNfsMinutasFinalizadas = useMemo(() => {
    let contagem = 0;
    pedidosProcessados.forEach(p => {
      if (p.efetivado) {
        (p.documentos || []).forEach(docItem => {
          const tipo = String(docItem.tipo || '').trim();
          if (tipo === 'Nota Fiscal' || tipo === 'Minuta') {
            contagem++;
          }
        });
      }
    });
    return contagem;
  }, [pedidosProcessados]);

  const rankingCalculadoBruto = useMotorRanking(
    usuarios, 
    opsDoDia, 
    pedidosProcessados, 
    controlePausas, 
    ajustesDoDia, 
    dataOperacaoAtiva, 
    horaReferenciaAtual
  );

  const rankingCalculado = useMemo(() => {
    if (!rankingCalculadoBruto || !Array.isArray(rankingCalculadoBruto)) return [];

    return rankingCalculadoBruto.map(user => {
      const emailLimpo = String(user.email || '').toLowerCase().trim();
      const nomeLimpo = String(user.nome || '').toLowerCase().trim();

      const userDoc = (usuarios || []).find(u => {
        const uEmail = String(u.email || '').toLowerCase().trim();
        const uNome = String(u.nickname || u.email?.split('@')[0] || '').toLowerCase().trim();
        return (
          (user.uid && u.uid === user.uid) ||
          (uEmail && emailLimpo && uEmail === emailLimpo) ||
          (uNome && nomeLimpo && uNome === nomeLimpo) ||
          (u.email && String(u.email).split('@')[0].toLowerCase().trim() === nomeLimpo)
        );
      });

      return {
        ...user,
        nome: userDoc?.nickname || user.nome || (user.email ? user.email.split('@')[0] : 'Usuário'),
        photoURL: userDoc?.photoURL || null,
        uid: user.uid || userDoc?.uid || null,
        email: user.email || userDoc?.email || null
      };
    });
  }, [rankingCalculadoBruto, usuarios]);

  const estatisticasTempoReal = useMemo(() => {
    let totalNfMinuta = 0;
    let totalCaixas = 0;

    pedidosProcessados.forEach(p => {
      (p.documentos || []).forEach(docItem => {
        const tipo = String(docItem.tipo || '').trim();
        if (tipo === 'Nota Fiscal' || tipo === 'Minuta') {
          totalNfMinuta++;
        }
        totalCaixas += (docItem.caixas || []).length;
      });
    });

    const rankingMap = {};
    (rankingCalculado || []).forEach(user => { rankingMap[user.nome] = user; });

    return { totalNfMinuta, totalCaixas, ranking: rankingMap };
  }, [pedidosProcessados, rankingCalculado]);

  const equipeAtivaHoje = useMemo(() => {
    if (equipeFixaUids.length > 0) {
      return usuarios
        .filter(u => equipeFixaUids.includes(u.uid))
        .sort((a, b) => {
          const nomeA = a.nickname || a.email.split('@')[0];
          const nomeB = b.nickname || b.email.split('@')[0];
          return nomeA.localeCompare(nomeB);
        });
    }

    const nomesAtivos = new Set();
    if (rankingCalculado) rankingCalculado.forEach(r => nomesAtivos.add(r.nome));
    if (controlePausas) Object.keys(controlePausas).forEach(n => nomesAtivos.add(n));
    
    pedidosEmAndamento.forEach(p => {
      const uids = p.uidsVinculados || [p.criadorUid];
      uids.forEach(uid => {
        const user = usuarios.find(u => u.uid === uid);
        if (user) nomesAtivos.add(user.nickname || user.email.split('@')[0]);
      });
    });

    return usuarios.filter(u => nomesAtivos.has(u.nickname || u.email.split('@')[0]));
  }, [equipeFixaUids, usuarios, rankingCalculado, controlePausas, pedidosEmAndamento]);

  const abrirModalDetalhes = (pedido) => {
    setPedidoModal(pedido);
    setWmsSessions({});
    setBuscasDocumentos({});
    setSkusExpandidos({});
    setSkusExpandidosComum({});
    setWmsPreResumoAberto(null);
    setAuditModalData(null);
    setObservacoes(pedido.observacoes || '');
    setDocsTemporarios(pedido.documentos || []);
    setIsEditingObs(false);
    setActiveTab('resumo');
    setShowDetalhesModal(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const romaneioParaAbrir = params.get('openRomaneio');

    if (romaneioParaAbrir && pedidosProcessados.length > 0) {
      const termoLimpo = decodeURIComponent(romaneioParaAbrir).trim().toLowerCase();
      
      const pedidoAlvo = pedidosProcessados.find(p => 
        String(p.romaneio || p.numero || '').trim().toLowerCase() === termoLimpo
      );

      if (pedidoAlvo) {
        abrirModalDetalhes(pedidoAlvo);
        const novaUrl = `${location.pathname}?date=${dataOperacaoAtiva}`;
        window.history.replaceState({}, '', novaUrl);
      }
    }
  }, [location.search, pedidosProcessados, dataOperacaoAtiva]);

  // UPLOAD WMS COMUM COM PRÉVIA
  const handleUploadWMSComum = (e, dIdx) => {
    const file = e.target.files[0];
    if (!file) return;

    setFluxoImportacao({
      tipo: 'comum',
      etapa: 'lendo',
      dIdx,
      fileName: file.name,
      totalCaixas: 0,
      totalSkus: 0,
      pesoTotal: 0,
      amostraNomes: [],
      auditoriaData: null
    });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const linhas = text.trim().split(/\r\n|\n|\r/);
        if (linhas.length <= 1) throw new Error("Arquivo vazio");

        let separador = linhas[0].includes(';') ? ';' : ',';
        const cabecalho = linhas[0].split(separador).map(c => 
          c.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/"/g, '')
        );
        
        const idxCaixa = cabecalho.findIndex(c => c.includes("TIPO EMBALAGEM") || c.includes("CAIXA") || c.includes("VOLUME"));
        const idxPeso = cabecalho.findIndex(c => c.includes("PESO"));
        const idxIdUnico = cabecalho.findIndex(c => c.includes("ID EMBALAGEM") || c === "ID" || c.includes("RASTREIO") || c.includes("EXPEDICAO"));
        const idxRef = cabecalho.findIndex(c => c === "PRODUTO" || c.includes("CODIGO") || c === "REF" || c === "SKU");
        const idxDesc = cabecalho.findIndex(c => c.includes("DESCRICAO") || c.includes("NOME"));
        const idxQtd = cabecalho.findIndex(c => c.includes("QUANTIDADE") || c.includes("QTDE") || c === "QTD");

        if (idxRef === -1 || idxQtd === -1 || idxCaixa === -1) {
          throw new Error("Colunas obrigatórias não encontradas no CSV.");
        }

        const caixasMap = {};
        let totalUnidadesSkus = 0;
        let pesoBruto = 0;

        for (let i = 1; i < linhas.length; i++) {
          const cols = linhas[i].split(separador).map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length <= idxRef) continue;
          
          const nomeCaixa = cols[idxCaixa] || `CAIXA S/N`;
          const pesoCaixa = idxPeso !== -1 ? parseFloat(String(cols[idxPeso]).replace(',', '.')) || 0 : 0;
          
          let idUnicoStr = `S/N-linha-${i}`;
          if (idxIdUnico !== -1 && cols[idxIdUnico] && cols[idxIdUnico].trim() !== '') {
            idUnicoStr = cols[idxIdUnico].trim();
          }
          
          const ref = cols[idxRef];
          const desc = idxDesc !== -1 ? cols[idxDesc] : "Produto";
          const qtd = parseInt(String(cols[idxQtd]).replace(/\D/g, '')) || 0;

          if (!ref || qtd <= 0) continue;

          totalUnidadesSkus += qtd;

          if (!caixasMap[idUnicoStr]) {
            caixasMap[idUnicoStr] = { num: nomeCaixa, peso: pesoCaixa, idUnico: idUnicoStr, idExpedicao: idUnicoStr, produtos: [] };
            pesoBruto += pesoCaixa;
          } else {
            caixasMap[idUnicoStr].peso = Math.max(caixasMap[idUnicoStr].peso, pesoCaixa);
          }
          
          const prodExistente = caixasMap[idUnicoStr].produtos.find(p => p.referencia === ref);
          if (prodExistente) {
            prodExistente.quantidade += qtd; 
          } else {
            caixasMap[idUnicoStr].produtos.push({ referencia: ref, descricao: desc, quantidade: qtd }); 
          }
        }

        const caixasFinais = Object.values(caixasMap);

        const resumoContagem = {};
        caixasFinais.forEach(c => {
          const k = `${c.num} (${c.peso.toFixed(2)} kg)`;
          resumoContagem[k] = (resumoContagem[k] || 0) + 1;
        });
        const resumoTextoGerado = Object.entries(resumoContagem).map(([k, v]) => `${k}: ${v} Un`).join('\n');

        setTimeout(() => {
          setFluxoImportacao({
            tipo: 'comum',
            etapa: 'previa',
            dIdx,
            fileName: file.name,
            caixasFinais,
            totalCaixas: caixasFinais.length,
            totalSkus: totalUnidadesSkus,
            pesoTotal: pesoBruto,
            amostraNomes: caixasFinais.slice(0, 8).map(c => c.num),
            resumoTexto: resumoTextoGerado,
            auditoriaData: null
          });
        }, 900);

      } catch (error) {
        setFluxoImportacao(null);
        alert("Erro ao ler o CSV: " + error.message);
      } finally {
        if (e.target) e.target.value = null;
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  // UPLOAD PLANEJAMENTO MASTER
  const handlePlanejamentoUpload = (e, dIdx) => {
    const file = e.target.files[0];
    if (!file) return;

    setFluxoImportacao({
      tipo: 'master_planejamento',
      etapa: 'lendo',
      dIdx,
      fileName: file.name,
      totalSkusCount: 0,
      totalUnidades: 0,
      volumesEstimados: 0,
      skusPendentes: 0
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const linhas = text.trim().split(/\r\n|\n|\r/);
        if (linhas.length <= 1) throw new Error("Arquivo vazio");

        let separador = linhas[0].includes(';') ? ';' : ',';
        const cabecalho = linhas[0].split(separador).map(c => c.trim().toUpperCase().replace(/"/g, ''));
        
        let idxRef = cabecalho.findIndex(c => c.includes("CÓDIGO PRODUTO") || c === "PRODUTO" || c === "REF");
        let idxQtd = cabecalho.findIndex(c => c.includes("QTDE CONFERIDA") || c.includes("QUANTIDADE"));
        let idxDesc = cabecalho.findIndex(c => c.includes("DESCRIÇÃO") || c.includes("DESCRICAO"));

        if (idxRef === -1 || idxQtd === -1) {
          throw new Error("Colunas 'Código Produto' e 'Qtde Conferida' não encontradas.");
        }

        let skusProcessados = [];
        let totalUnidades = 0;
        let volumesEstimados = 0;
        let skusPendentes = 0;

        for (let i = 1; i < linhas.length; i++) {
          const cols = linhas[i].split(separador).map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length <= idxRef) continue;
          
          const ref = cols[idxRef];
          const qtd = parseInt(cols[idxQtd] || "0");
          if (!ref || qtd <= 0) continue;

          totalUnidades += qtd;

          const masterRef = caixasMaster.find(m => 
            String(m.ref).trim() === String(ref).trim() || 
            String(m.ref).trim().replace(/^0+/, '') === String(ref).trim().replace(/^0+/, '')
          );

          const variacoesValidas = masterRef ? masterRef.variacoes.filter(v => {
            const qtdPadrao = parseInt(String(v.quantidade).replace(/\D/g, '')) || 0;
            return qtdPadrao > 0 && qtd % qtdPadrao === 0;
          }) : [];

          const isMissing = variacoesValidas.length === 0;
          if (isMissing) skusPendentes++;

          const qtdPadrao = !isMissing ? parseInt(String(variacoesValidas[0].quantidade).replace(/\D/g, '')) : 0;
          const pesoPadrao = !isMissing ? parseFloat(String(variacoesValidas[0].peso).replace(',', '.')) || 0 : 0;

          if (qtdPadrao > 0) {
            volumesEstimados += Math.ceil(qtd / qtdPadrao);
          }

          skusProcessados.push({
            ref, 
            desc: idxDesc !== -1 ? cols[idxDesc] : "Produto", 
            qtdTotal: qtd, 
            variacoesDisponiveis: variacoesValidas, 
            selectedVar: 0,
            caixaNome: !isMissing ? variacoesValidas[0].caixa : "", 
            qtdPadrao: qtdPadrao, 
            pesoPadrao: pesoPadrao,
            isMissing: isMissing, 
            isOriginalMissing: isMissing
          });
        }

        setTimeout(() => {
          setFluxoImportacao({
            tipo: 'master_planejamento',
            etapa: 'previa',
            dIdx,
            fileName: file.name,
            skusProcessados,
            totalSkusCount: skusProcessados.length,
            totalUnidades,
            volumesEstimados,
            skusPendentes
          });
        }, 900);

      } catch (error) {
        setFluxoImportacao(null);
        alert("Erro ao ler planejamento: " + error.message);
      } finally {
        if (e.target) e.target.value = null;
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  // CONFIRMAR GRAVAÇÃO NO FIREBASE
  const handleConfirmarGravacaoWMS = async () => {
    if (!fluxoImportacao) return;
    const { tipo, dIdx, fileName } = fluxoImportacao;

    if (tipo === 'master_planejamento') {
      const { skusProcessados } = fluxoImportacao;
      setFluxoImportacao(prev => ({ ...prev, etapa: 'gravando' }));
      setIsSaving(true);

      try {
        const novaSessao = { skus: skusProcessados, fileName: fileName };
        setWmsSessions(prev => ({ ...prev, [dIdx]: novaSessao }));

        const refFinal = pedidoModal._isLegacy 
          ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) 
          : doc(db, 'pedidos', pedidoModal.id);
          
        const novosDocumentos = [...pedidoModal.documentos];
        novosDocumentos[dIdx] = { ...novosDocumentos[dIdx], planejamentoWms: novaSessao };
        
        await updateDoc(refFinal, { documentos: novosDocumentos });
        setPedidoModal(prev => ({ ...prev, documentos: novosDocumentos }));

        setTimeout(() => {
          setIsSaving(false);
          setFluxoImportacao(prev => ({ 
            ...prev, 
            etapa: 'sucesso',
            auditoriaData: prev?.auditoriaData
          }));
        }, 700);

      } catch (error) {
        setIsSaving(false);
        setFluxoImportacao(null);
        alert("Erro ao salvar planejamento: " + error.message);
      }
      return;
    }

    const { caixasFinais } = fluxoImportacao;
    const caixasComZero = caixasFinais.filter(c => parseFloat(c.peso) === 0);
    if (caixasComZero.length > 0) {
      setAlertaPesoZero({
        origem: tipo === 'master_auditoria' ? 'auditoria' : 'comum',
        dIdx,
        fileName,
        caixasProblematicas: caixasComZero,
        caixasNormais: caixasFinais.filter(c => parseFloat(c.peso) > 0),
        caixasOriginais: caixasFinais
      });
      setFluxoImportacao(null);
      return;
    }

    setFluxoImportacao(prev => ({ ...prev, etapa: 'gravando' }));
    setIsSaving(true);

    try {
      const novosDocs = [...pedidoModal.documentos];

      if (tipo === 'master_auditoria') {
        const auditoriaPayload = {
          arquivo: fileName,
          data: new Date().toISOString(),
          totalPlanejado: fluxoImportacao.auditoriaData?.reduce((acc, i) => acc + i.qtdPlanejada, 0) || 0,
          totalEfetivado: caixasFinais.length,
          divergencias: fluxoImportacao.divergenciasCount || 0,
          itens: fluxoImportacao.auditoriaData || []
        };

        novosDocs[dIdx] = { 
          ...novosDocs[dIdx], 
          caixas: caixasFinais,
          auditoria: auditoriaPayload
        };
      } else {
        novosDocs[dIdx] = { ...novosDocs[dIdx], caixas: caixasFinais };
      }

      const todosPossuemCaixas = novosDocs.every(doc => doc.caixas && doc.caixas.length > 0);
      const payload = { 
        documentos: novosDocs,
        efetivado: todosPossuemCaixas ? true : pedidoModal.efetivado,
        completedAt: todosPossuemCaixas ? serverTimestamp() : (pedidoModal.completedAt || null)
      };

      const refFinal = pedidoModal._isLegacy
        ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id)
        : doc(db, 'pedidos', pedidoModal.id);

      await updateDoc(refFinal, payload);
      setPedidoModal(prev => ({ ...prev, documentos: novosDocs, efetivado: todosPossuemCaixas ? true : prev.efetivado }));

      setTimeout(() => {
        setIsSaving(false);
        setFluxoImportacao(prev => ({ ...prev, etapa: 'sucesso' }));
      }, 700);

    } catch (error) {
      setIsSaving(false);
      setFluxoImportacao(null);
      alert("Erro ao gravar caixas: " + error.message);
    }
  };

  // Sincronização inteligente com o Firebase (Sem flood a cada segundo)
  useEffect(() => {
    if (!dataOperacaoAtiva || !rankingCalculadoBruto || rankingCalculadoBruto.length === 0) return;

    // Aguarda 3 segundos de estabilidade antes de enviar para o banco
    const timerSync = setTimeout(async () => {
      try {
        const rankingMap = {};
        rankingCalculadoBruto.forEach((user) => {
          rankingMap[user.nome] = JSON.parse(JSON.stringify(user));
        });

        let totalNfMinuta = 0;
        let totalCaixas = 0;

        pedidosProcessados.forEach(p => {
          (p.documentos || []).forEach(docItem => {
            const tipo = String(docItem.tipo || '').trim();
            if (tipo === 'Nota Fiscal' || tipo === 'Minuta') {
              totalNfMinuta++;
            }
            totalCaixas += (docItem.caixas || []).length;
          });
        });

        const refDia = doc(db, 'estatisticasDiarias', dataOperacaoAtiva);
        const payload = {
          ranking: rankingMap,
          totalNfMinuta,
          totalCaixas,
          updatedAt: serverTimestamp()
        };

        try {
          await updateDoc(refDia, payload);
        } catch (err) {
          await setDoc(refDia, payload);
        }
      } catch (error) {
        console.error("Erro na sincronização de estatísticas:", error);
      }
    }, 3000);

    return () => clearTimeout(timerSync);
  }, [
    // ATENÇÃO ÀS DEPENDÊNCIAS: removemos currentTime e rankingCalculado!
    pedidosProcessados,
    opsDoDia,
    ajustesDoDia,
    controlePausas,
    dadosExpediente,
    dataOperacaoAtiva
  ]);

  const handleConcluirFluxoWMS = () => {
    const { tipo, dIdx } = fluxoImportacao || {};
    setFluxoImportacao(null);
    
    if (tipo === 'master_planejamento') {
      return;
    }

    if (dIdx !== undefined) {
      setShowCaixasEfetivadasModal(dIdx);
    }
  };

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
        romaneio: romaneio.trim(),
        loja: loja.trim(),
        local,
        uf: uf.trim().toUpperCase(),
        isCaixaMaster,
        observacoes: observacoes.trim(),
        uidsVinculados,
        criadorUid: uidsVinculados[0] || localUser.uid,
        documentos: docsTemporarios.map(d => ({
          tipo: d.tipo,
          responsaveis: d.responsaveis,
          responsavel: d.responsaveis[0] || '',
          caixas: [] 
        })),
        dataOperacao: dataOperacaoAtiva,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        const ref = doc(db, 'pedidos', editingId);
        await updateDoc(ref, payload);
        handleCloseModalPedido();
      } else {
        payload.createdAt = serverTimestamp();
        payload.efetivado = false;

        handleCloseModalPedido();
        setPedidoRecemCriado({ romaneio: payload.romaneio, loja: payload.loja });

        setTimeout(async () => {
          try {
            await setDoc(doc(collection(db, 'pedidos')), payload);
          } catch (err) {
            console.error("Erro ao salvar pedido após animação:", err);
          }
        }, 2100);

        setTimeout(() => {
          setPedidoRecemCriado(null);
        }, 2800);
      }
    } catch (error) {
      alert("Erro ao salvar pedido: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePausaUsuario = async (uid, isCurrentlyPaused) => {
  try {
    const refPausas = doc(db, 'controlePausas', dataOperacaoAtiva);
    const snap = await getDoc(refPausas);
    const agora = Date.now();
    let userStatus = { isPaused: false, history: [] };

    // Busca o status usando o UID do usuário para garantir exatidão
    if (snap.exists() && snap.data()[uid]) {
      userStatus = JSON.parse(JSON.stringify(snap.data()[uid]));
    }
    
    if (!Array.isArray(userStatus.history)) userStatus.history = [];

    if (isCurrentlyPaused) {
      userStatus.isPaused = false;
      if (userStatus.history.length > 0) {
        userStatus.history[userStatus.history.length - 1].end = agora;
      }
    } else {
      userStatus.isPaused = true;
      userStatus.history.push({ start: agora });
    }
    
    // Salva no banco usando a chave correta
    await setDoc(refPausas, { [uid]: userStatus }, { merge: true });
  } catch (error) { 
    alert(`Falha ao sincronizar pausa: ${error.message}`); 
  }
};
  const handleTogglePausaRomaneio = async (pedido) => {
    if (pedido.efetivado) return;
    try {
      const ref = obterReferenciaDocumento(pedido);
      const agora = Date.now();

      if (pedido.isPaused) {
        const lastStart = pedido.lastPauseStart || agora;
        const totalP = pedido.totalPausedTime || 0;
        const diffPausa = Math.max(0, agora - lastStart);

        await updateDoc(ref, {
          isPaused: false,
          lastPauseStart: deleteField(),
          motivoPausa: deleteField(),
          totalPausedTime: totalP + diffPausa,
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(ref, {
          isPaused: true,
          lastPauseStart: agora,
          motivoPausa: "Contratempo / Intervalo (ADM)",
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      alert("Erro ao alterar o estado de pausa do romaneio.");
    }
  };

  const formatMsToTime = (ms) => {
    if (ms <= 0) return "00:00:00";
    const hh = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };


  const formatarCronometroPedido = (pedido) => {
    if (!pedido.createdAt) return "00:00:00";
    const start = pedido.createdAt.toMillis ? pedido.createdAt.toMillis() : pedido.createdAt;
    const totalPaused = pedido.totalPausedTime || 0;
    
    // Resgata o tempo de dias anteriores
    const tempoAnterior = pedido.tempoTrabalhadoAnterior || 0;
    
    let end = (pedido.efetivado && pedido.completedAt) 
      ? (pedido.completedAt.toMillis ? pedido.completedAt.toMillis() : pedido.completedAt) 
      : (pedido.isPaused && pedido.lastPauseStart ? pedido.lastPauseStart : currentTime);
      
    // Soma o tempo limpo atual com o histórico herdado
    const diff = Math.max(0, end - start - totalPaused) + tempoAnterior;
    return formatMsToTime(diff);
  };

  const getTempoOcioso = (nomeUser, uidUser) => {
    // Só conta ociosidade se o expediente foi iniciado pela liderança
    if (dadosExpediente?.status !== 'aberto') return 0;

    const [ano, mes, dia] = dataOperacaoAtiva.split('-').map(Number);
    const [hIni, mIni] = (dadosExpediente?.inicio || '07:30').split(':').map(Number);
    const inicioExpedienteMs = new Date(ano, mes - 1, dia, hIni, mIni, 0).getTime();

    const userStats = rankingCalculado.find(u => u.uid === uidUser || u.nome === nomeUser);
    
    // Se o usuário não fez nenhuma tarefa hoje, a ociosidade conta desde o início do expediente
    if (!userStats || !userStats.eventosMesclados || userStats.eventosMesclados.length === 0) {
      return Math.max(0, currentTime - inicioExpedienteMs);
    }
    
    // Pega o término da última atividade/pausa registrada
    const ultimoEvento = userStats.eventosMesclados[userStats.eventosMesclados.length - 1];
    const momentoCorte = Math.max(inicioExpedienteMs, ultimoEvento.end);
    
    if (currentTime > momentoCorte) {
      return currentTime - momentoCorte;
    }
    return 0;
  };

  const getNomesResponsaveis = (pedido) => {
    const identificadoresSet = new Set();

    // 1. Coleta UIDs da raiz
    if (Array.isArray(pedido.uidsVinculados) && pedido.uidsVinculados.length > 0) {
      pedido.uidsVinculados.forEach(id => id && identificadoresSet.add(String(id).trim()));
    } else if (pedido.criadorUid) {
      identificadoresSet.add(String(pedido.criadorUid).trim());
    }

    if (pedido.criadorEmail) {
      identificadoresSet.add(String(pedido.criadorEmail).trim().toLowerCase());
    }

    // 2. Coleta responsáveis definidos dentro de cada documento do romaneio
    (pedido.documentos || []).forEach(docItem => {
      if (Array.isArray(docItem.responsaveis)) {
        docItem.responsaveis.forEach(r => r && identificadoresSet.add(String(r).trim().toLowerCase()));
      }
      if (docItem.responsavel) {
        identificadoresSet.add(String(docItem.responsavel).trim().toLowerCase());
      }
    });

    if (identificadoresSet.size === 0) return 'Não atribuído';

    // 3. Resolve os identificadores contra a lista de usuários cadastrados
    const nomesEncontrados = new Set();

    identificadoresSet.forEach(identificador => {
      const user = (usuarios || []).find(u => {
        const uUid = String(u.uid || '').trim();
        const uEmail = String(u.email || '').toLowerCase().trim();
        const uPrefix = uEmail.split('@')[0];
        const uNickname = String(u.nickname || '').toLowerCase().trim();

        return (
          uUid === identificador ||
          uEmail === identificador ||
          uPrefix === identificador ||
          uNickname === identificador
        );
      });

      if (user) {
        nomesEncontrados.add(user.nickname || user.email.split('@')[0]);
      } else {
        // Se for um e-mail direto não associado, usa o prefixo
        if (identificador.includes('@')) {
          nomesEncontrados.add(identificador.split('@')[0]);
        } else if (identificador.length < 20) {
          nomesEncontrados.add(identificador);
        }
      }
    });

    return nomesEncontrados.size > 0 
      ? Array.from(nomesEncontrados).join(', ') 
      : 'Não atribuído';
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

  const handleDeletePedido = (pedido) => {
    setPedidoParaExcluir(pedido);
    setDropdownOpen(null);
  };

  const handleConfirmarExclusaoDefinitiva = async () => {
    if (!pedidoParaExcluir) return;
    setIsExcluindoPedido(true);
    try {
      const ref = obterReferenciaDocumento(pedidoParaExcluir);
      await deleteDoc(ref);
      setPedidoParaExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      alert("Houve um erro ao excluir o pedido.");
    } finally {
      setIsExcluindoPedido(false);
    }
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

  const usuariosParaIntervencao = useMemo(() => {
    if (!usuarios || usuarios.length === 0) return rankingCalculado || [];
    
    return usuarios.map(u => {
      const nomeUser = u.nickname || String(u.email).split('@')[0];
      const statsExistentes = (rankingCalculado || []).find(r => r.nome === nomeUser);
      
      if (statsExistentes) return statsExistentes;
      
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
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [usuarios, rankingCalculado]);

  // ESCUTA O EXPEDIENTE DO DIA
  useEffect(() => {
    const refExpediente = doc(db, 'expedienteDiario', dataOperacaoAtiva);
    const unsub = onSnapshot(refExpediente, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDadosExpediente(data);
        setFormExpediente({ 
          horaInicio: data.inicio || '07:30', 
          horaFim: data.fim || '17:30' 
        });
      } else {
        setDadosExpediente({ inicio: '', fim: '', status: 'aguardando' });
        setFormExpediente({ horaInicio: '07:30', horaFim: '17:30' });
      }
    });
    return () => unsub();
  }, [dataOperacaoAtiva]);

const handleSalvarExpediente = async (statusAcao) => {
    setIsSaving(true);
    try {
      const refExpediente = doc(db, 'expedienteDiario', dataOperacaoAtiva);
      await setDoc(refExpediente, {
        inicio: formExpediente.horaInicio,
        fim: formExpediente.horaFim,
        status: statusAcao, // 'aberto' ou 'encerrado'
        updatedAt: serverTimestamp()
      }, { merge: true });
      setShowModalExpediente(false);
    } catch (error) {
      alert("Erro ao salvar expediente: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <TransicaoAdmOverlay isVisible={overlayAtivo} isExiting={overlaySaindo} />

      <div 
        className="operacao-adm-container" 
        style={{
          opacity: paginaVisivel ? 1 : 0,
          transform: paginaVisivel ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          margin: 0,
          padding: '0 0 40px 0',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ width: '100%' }}>
          <NavbarOperacao 
            user={localUser} 
            isAdmin={true} 
            dataOperacaoAtiva={dataOperacaoAtiva} 
            buscaRomaneio={buscaRomaneio} 
            setBuscaRomaneio={setBuscaRomaneio} 
          />
        </div>

        <div className="op-wrapper" style={{ width: '100%', maxWidth: '1500px', margin: '0 auto', padding: '0 15px', boxSizing: 'border-box' }}>
          <main style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '25px', width: '100%', boxSizing: 'border-box' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.35rem', fontWeight: 800 }}>Painel de Gestão da Liderança</h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Monitoramento de produtividade e fluxo da equipe em tempo real.</span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowModalExpediente(true)} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', 
                  background: dadosExpediente.status === 'aberto' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-input)', 
                  color: dadosExpediente.status === 'aberto' ? '#10b981' : 'var(--text-main)', 
                  border: `1px solid ${dadosExpediente.status === 'aberto' ? '#10b981' : 'var(--border-color)'}`, 
                  padding: '9px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' 
                }}
              >
                <Clock size={16} /> 
                {dadosExpediente.status === 'aberto' ? 'Dia em Andamento' : dadosExpediente.status === 'encerrado' ? 'Dia Encerrado' : 'Iniciar Dia'}
              </button>

              <button 
  onClick={() => setShowModalGerenciarRanking(true)} 
  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s' }}
>
  <Settings size={16} /> Gerenciar Ranking
</button>
            </div>
          </div>

          {/* ESTRUTURA DIVIDIDA: 80% ATIVIDADES EM FAIXAS / 20% MÉTRICAS VERTICAIS */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', width: '100%' }}>
            
            {/* LADO ESQUERDO: 80% DA TELA */}
            <section style={{ flex: '0 0 78%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.1rem' }}>
                    <Activity size={18} color="var(--primary)" /> Atividades em Execução
                  </h3>
                  {pedidosEmAndamento.length > 0 && (
                    <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#38bdf8', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="radar-spinner"></div> {pedidosEmAndamento.length} em separação
                    </span>
                  )}
                </div>

                <button 
                  onClick={abrirModalEquipe}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: 'var(--bg-input)', 
                    color: 'var(--text-main)', 
                    border: '1px solid var(--border-color)', 
                    padding: '6px 12px', 
                    borderRadius: '8px', 
                    fontSize: '0.78rem', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  <UserCheck size={14} color="var(--primary, #3b82f6)" />
                  <span>Equipe Fixa ({equipeFixaUids.length > 0 ? `${equipeFixaUids.length}` : 'Auto'})</span>
                </button>
              </div>

              {/* LISTAGEM EM FAIXAS LINEARES (SUBSTITUTO DOS CARDS) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                {equipeAtivaHoje.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '24px', width: '100%', background: 'var(--bg-card)', borderRadius: '12px', textAlign: 'center', border: '1px dashed var(--border-color)' }}>
                    Nenhum conferente na equipe. Clique em <strong>Equipe Fixa</strong> acima.
                  </div>
                ) : (
                  equipeAtivaHoje.map((user, idx) => {
                    const nomeUser = user.nickname || user.email.split('@')[0];
                    const emailPrefix = user.email ? user.email.split('@')[0] : '';
                    const statusPausa = controlePausas[user.uid] || controlePausas[nomeUser] || controlePausas[emailPrefix];
                    const isPaused = statusPausa?.isPaused || false;

                    const pedidoAtivo = pedidosEmAndamento.find(p => { 
                      const uids = (p.uidsVinculados && p.uidsVinculados.length > 0) 
                        ? p.uidsVinculados 
                        : (p.criadorUid ? [p.criadorUid] : []);
                      return uids.includes(user.uid) || (p.criadorEmail && user.email && p.criadorEmail === user.email); 
                    });

                    let borderLeftColor = '#64748b';
                    let statusBadge = null;
                    let detalhesTarefa = null;

                    if (pedidoAtivo) {
                      if (pedidoAtivo.isPaused) {
                        borderLeftColor = '#818cf8';
                        statusBadge = <span className="badge-status-pausado"><Pause size={11}/> Pausado</span>;
                        detalhesTarefa = (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <strong style={{ color: '#818cf8', fontSize: '0.85rem' }}>ROM {pedidoAtivo.romaneio || 'S/N'}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{pedidoAtivo.loja || 'Destino'}</span>
                          </div>
                        );
                      } else {
                        borderLeftColor = '#0ea5e9';
                        statusBadge = (
                          <span className="badge-status-separando">
                            <div className="radar-spinner"></div> Separando
                          </span>
                        );
                        detalhesTarefa = (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                            <strong style={{ color: 'var(--text-highlight, #38bdf8)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Package size={14} /> {pedidoAtivo.romaneio || 'S/N'}
                            </strong>
                            <span style={{ color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 600 }}>{pedidoAtivo.loja || 'Destino'}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({(pedidoAtivo.documentos || []).map(d => d.tipo).filter(Boolean).join(', ')})</span>
                            <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontWeight: 900, color: '#38bdf8', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                              {formatarCronometroPedido(pedidoAtivo)}
                            </span>
                          </div>
                        );
                      }
                    } else if (isPaused) {
                      borderLeftColor = '#f59e0b';
                      statusBadge = <span className="badge-status-pausa-protegida"><Coffee size={12}/> Em Pausa</span>;
                      detalhesTarefa = <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>Operação pausada</span>;
                    } else {
                      const tempoOciosoMs = getTempoOcioso(nomeUser, user.uid);
                      const limiteToleranciaMs = 20 * 60 * 1000;
                      const ultrapassouTolerancia = tempoOciosoMs > limiteToleranciaMs;

                      borderLeftColor = ultrapassouTolerancia ? '#ef4444' : '#475569';
                      statusBadge = ultrapassouTolerancia ? (
                        <span className="badge-status-multa" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '3px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12}/> Ocioso (-10/min)
                        </span>
                      ) : (
                        <span className="badge-status-livre">
                          <Clock size={11}/> Disponível
                        </span>
                      );

                      detalhesTarefa = (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Última demanda finalizada há:</span>
                          <strong style={{ 
                            fontFamily: 'monospace', 
                            fontSize: '0.95rem', 
                            color: ultrapassouTolerancia ? '#ef4444' : 'var(--text-main)',
                            fontWeight: 800
                          }}>
                            {formatMsToTime(tempoOciosoMs)}
                          </strong>
                          {ultrapassouTolerancia && (
                            <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 700 }}>
                              (Tolerância esgotada)
                            </span>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={user.uid}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderLeft: `5px solid ${borderLeftColor}`,
                          borderRadius: '10px',
                          padding: '10px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* COLUNA 1: IDENTIFICAÇÃO DO CONFERENTE */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '150px' }}>
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={nomeUser} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                              {nomeUser.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)' }}>{nomeUser}</span>
                        </div>

                        {/* COLUNA 2: STATUS BADGE */}
                        <div style={{ minWidth: '110px' }}>
                          {statusBadge}
                        </div>

                        {/* COLUNA 3: DETALHES OPERACIONAIS */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                          {detalhesTarefa}
                        </div>

                        {/* COLUNA 4: AÇÃO DE CONTROLE */}
                        <button 
                          onClick={() => handleTogglePausaUsuario(user.uid, isPaused)}
                          style={{
                            background: isPaused ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-input)',
                            color: isPaused ? '#fbbf24' : 'var(--text-muted)',
                            border: `1px solid ${isPaused ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-color)'}`,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontFamily: 'inherit',
                            flexShrink: 0
                          }}
                        >
                          {isPaused ? <Play size={12} color="#fbbf24" /> : <Pause size={12} />}
                          <span>{isPaused ? 'Retomar' : 'Pausar'}</span>
                        </button>
                    
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* LADO DIREITO: 22% (SEMPRE ACOMPANHANDO 100% DA ALTURA) */}
            <section style={{ flex: '0 0 22%', width: '22%', display: 'flex', flexDirection: 'column' }}>
              <AdmEstatisticasGerais 
                dados={estatisticasTempoReal} 
                pedidos={pedidosProcessados} 
              />
            </section>

          </div>

          {/* TABELA DE ROMANEIOS */}
          <section className="op-history-section">
            <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="history-title-area">
                <div className="history-icon-badge">
                  <Layers size={22} />
                </div>
                <div>
                  <h3>Romaneios Conferidos</h3>
                  <span className="history-subtitle">Lista de pedidos da operação geral</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    background: isSearchExpanded ? 'var(--bg-input, rgba(0, 0, 0, 0.02))' : 'transparent',
                    border: isSearchExpanded ? '1px solid var(--border-color, #cbd5e1)' : '1px solid transparent',
                    borderRadius: '12px',
                    width: isSearchExpanded ? '280px' : '40px',
                    height: '40px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <button 
                    onClick={() => setIsSearchExpanded(true)}
                    title="Buscar Romaneio"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      minWidth: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isSearchExpanded ? 'default' : 'pointer',
                      color: isSearchExpanded ? 'var(--primary)' : 'var(--text-muted, #94a3b8)',
                      transition: 'color 0.2s'
                    }}
                  >
                    <Search size={18} />
                  </button>
                  
                  <input 
                    type="text" 
                    placeholder="Filtrar por romaneio, loja ou UF..." 
                    value={buscaRomaneio} 
                    onChange={(e) => setBuscaRomaneio(e.target.value)}
                    style={{ 
                      border: 'none', 
                      background: 'transparent', 
                      color: 'var(--text-main, #0f172a)',
                      outline: 'none',
                      width: '100%',
                      opacity: isSearchExpanded ? 1 : 0,
                      transition: 'opacity 0.2s',
                      pointerEvents: isSearchExpanded ? 'auto' : 'none',
                      fontFamily: 'inherit',
                      fontSize: '0.88rem'
                    }}
                  />
                  
                  {isSearchExpanded && (
                    <button 
                      onClick={() => {
                        setIsSearchExpanded(false);
                        setBuscaRomaneio('');
                      }}
                      title="Fechar Busca"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        minWidth: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-muted, #94a3b8)',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted, #94a3b8)'}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <button 
                  onClick={abrirModalNovoPedido}
                  style={{ 
                    padding: '9px 16px', 
                    borderRadius: '10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontWeight: 700, 
                    fontSize: '0.85rem', 
                    background: 'var(--primary)', 
                    color: '#fff', 
                    border: 'none', 
                    cursor: 'pointer', 
                    boxShadow: '0 4px 12px rgba(13, 50, 105, 0.2)', 
                    transition: 'all 0.25s ease', 
                    fontFamily: 'inherit',
                    flexShrink: 0
                  }}
                >
                  <Plus size={16} /> Novo Pedido
                </button>
              </div>
            </div>
            
            <div className="op-table-wrapper scrollable-table-wrapper" style={{ minHeight: '380px', paddingBottom: '90px' }}>
              <table className="op-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Romaneio & Status</th>
                    <th style={{ width: '27%' }}>Destino / Local</th>
                    <th style={{ width: '22%' }}>Observações</th>
                    <th style={{ width: '23%' }}>Documentos & Caixas</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-table-row" style={{ height: '280px', verticalAlign: 'middle' }}>
                        <SearchX size={36} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <p>{buscaRomaneio ? `Nenhum romaneio correspondente a "${buscaRomaneio}"` : 'Nenhum pedido processado nesta data.'}</p>
                      </td>
                    </tr>
                  ) : (
                    pedidosFiltrados.map(pedido => {
                      let caixasCount = 0; 
                      let skusCount = 0;
                      const listaDocumentos = []; 

                      (pedido.documentos || []).forEach(d => {
                        listaDocumentos.push(d.tipo || 'S/N');
                        caixasCount += (d.caixas || []).length;
                        (d.caixas || []).forEach(cx => { 
                          (cx.produtos || []).forEach(p => skusCount += parseInt(p.quantidade) || 0); 
                        });
                      });

                      let statusClass = "status-running";
                      let statusBadge;

                      if (pedido.efetivado) {
                        statusClass = "status-finished";
                        statusBadge = (
                          <div className="time-badge success">
                            <Check size={12} /> Finalizado
                          </div>
                        );
                      } else if (pedido.isPaused) {
                        statusClass = "status-paused";
                        statusBadge = (
                          <div className="time-badge paused" title={pedido.motivoPausa}>
                            <Pause size={12} /> Pausado
                          </div>
                        );
                      } else {
                        statusClass = "status-running";
                        statusBadge = (
                          <div className="time-badge running">
                            <Clock size={12} /> {formatarCronometroPedido(pedido)}
                          </div>
                        );
                      }

                      return (
                        <tr 
                          key={pedido.id} 
                          className={`clickable-row ${statusClass} ${dropdownOpen === pedido.id ? 'row-dropdown-open' : ''}`}
                          onClick={() => abrirModalDetalhes(pedido)}
                          title="Clique para ver Detalhes"
                        >
                          <td>
                            <div className="table-romaneio-cell">
                              <div className="romaneio-title-wrap">
                                <strong className="romaneio-number">{pedido.romaneio || 'S/N'}</strong>
                                {pedido._isLegacy && <span className="legacy-tag">Legado</span>}
                              </div>
                              {statusBadge}
                            </div>
                          </td>
                          
                          <td>
                            <div className="table-store-name">{pedido.loja || 'Destino não especificado'}</div>
                            <div className="table-location-sub">
                              <MapPin size={13} /> 
                              <span>{pedido.local || 'DF'} {pedido.uf ? `• ${pedido.uf}` : ''}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-highlight, #38bdf8)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Users size={12} /> {getNomesResponsaveis(pedido)}
                            </div>
                          </td>

                          <td>
                            <div className="table-obs-text">
                              {pedido.observacoes ? pedido.observacoes : <span className="obs-empty">Sem observações...</span>}
                            </div>
                          </td>
                          
                          <td>
                            <div className="table-docs-container">
                              <div className="doc-pills-row">
                                {listaDocumentos.map((tipo, idx) => {
                                  let corFundo = '#3b82f6'; 
                                  if (tipo === 'Minuta') corFundo = '#8b5cf6'; 
                                  if (tipo === 'Bonificação') corFundo = '#ec4899'; 
                                  if (tipo === 'Troca') corFundo = '#f59e0b'; 
                                  
                                  return (
                                    <span key={idx} className="doc-micro-pill" style={{ background: corFundo }}>
                                      {tipo}
                                    </span>
                                  );
                                })}
                              </div>
                              <div className="volume-metrics-row">
                                <span><strong>{caixasCount}</strong> cx</span>
                                <span className="metric-dot">•</span>
                                <span><strong>{skusCount}</strong> SKUs</span>
                              </div>
                            </div>
                          </td>

                          <td className="actions-cell">
                            <div onClick={(e) => e.stopPropagation()} className="action-buttons-wrap">
                              <button className="action-btn btn-caixas" title="Painel do Romaneio" onClick={() => abrirModalDetalhes(pedido)}>
                                <Info size={16}/>
                              </button>
                              
                              <div style={{ position: 'relative' }}>
                                <button className="action-btn btn-edit" title="Opções" onClick={() => setDropdownOpen(dropdownOpen === pedido.id ? null : pedido.id)}>
                                  <MoreVertical size={16}/>
                                </button>
                                
                                {dropdownOpen === pedido.id && (
                                  <div className="table-dropdown-menu">
                                    <button className="dropdown-item" onClick={() => abrirModalEditarPedido(pedido)}>
                                      <Edit size={14}/> Editar Dados
                                    </button>
                                    
                                    {!pedido.efetivado && (
                                      <button className="dropdown-item" onClick={() => handleTogglePausaRomaneio(pedido)}>
                                        {pedido.isPaused ? <><PlayCircle size={14}/> Retomar Separação</> : <><PauseCircle size={14}/> Pausar Separação</>}
                                      </button>
                                    )}
                                    
                                    <div className="dropdown-divider"></div>
                                    <button className="dropdown-item" onClick={() => handleAbrirTransferencia(pedido)} style={{ color: 'var(--text-highlight, #38bdf8)' }}>
                                      <CalendarDays size={14}/> Transferir para outro dia
                                    </button>

                                    {/* OPÇÃO DE IMPRESSÃO DE ETIQUETA */}
                                    <button 
                                      className="dropdown-item" 
                                      onClick={() => {
                                        setPedidoParaEtiqueta(pedido);
                                        setDropdownOpen(null);
                                      }}
                                      style={{ color: '#f59e0b' }}
                                    >
                                      <Tag size={14}/> Imprimir Etiqueta (90x40)
                                    </button>
                                    <div className="dropdown-divider"></div>

                                    <div className="dropdown-divider"></div>
                                    <button className="dropdown-item" onClick={() => handleToggleEfetivado(pedido)}>
                                      {pedido.efetivado ? <><X size={14}/> Desfazer Efetivação</> : <><Check size={14}/> Forçar Efetivação</>}
                                    </button>
                                    <div className="dropdown-divider"></div>
                                    <button className="dropdown-item text-danger" onClick={() => handleDeletePedido(pedido)}>
                                      <Trash2 size={14}/> Excluir Pedido
                                    </button>
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

        <section className="op-bottom-zone" style={{ padding: '0 20px 20px 20px', boxSizing: 'border-box' }}>
          <RankingDiario 
            rankingCalculado={rankingCalculado} 
            rankingExpandido={rankingExpandido} 
            setRankingExpandido={setRankingExpandido}
            currentTime={horaReferenciaAtual} 
            dataOperacaoAtiva={dataOperacaoAtiva} 
            isAdminMode={true} 
            onDeleteEvent={handleDeleteEvent}
            usuarios={usuarios}
          />
          <div className="op-side-indicators">
            
            <div className="indicator-card op-card">
              <div className="indicator-icon" style={{background: '#e0e7ff', color: '#4f46e5'}}><Factory size={24}/></div>
              <div className="indicator-content">
                <h4>Ordens de Produção</h4>
                <span className="indicator-value">{opsDoDia.length} Registros</span>
                <p>Controle de O.P.s de toda equipe</p>
              </div>
              <button className="indicator-btn" onClick={() => setShowOpModal(true)}>Gerenciar O.P.s</button>
            </div>

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
      </div> {/* <-- Fecha op-wrapper */}

      </div> {/* ✅ FECHA operacao-adm-container AQUI ANTES DOS MODAIS! */}

      {showModalIntervencao && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(5, 5, 10, 0.75)', 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }} 
          onClick={() => setShowModalIntervencao(false)}
        >
          <div 
            style={{ 
              background: 'var(--bg-card, #1e293b)', 
              width: '95%', 
              maxWidth: '920px', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)' 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '18px 24px', 
              borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))', 
              background: 'rgba(0,0,0,0.02)' 
            }}>
              <h3 style={{ 
                margin: 0, 
                color: 'var(--text-main, #f8fafc)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                fontSize: '1.15rem',
                fontWeight: 800,
                letterSpacing: '-0.3px'
              }}>
                <Settings size={20} color="var(--primary, #3b82f6)" /> Lançamento de Ajustes 
              </h3>
              
              <button 
                onClick={() => setShowModalIntervencao(false)} 
                style={{ 
                  background: 'var(--bg-input, rgba(255, 255, 255, 0.05))', 
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  color: 'var(--text-muted, #94a3b8)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted, #94a3b8)'}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <AdmControlesManuais dados={usuariosParaIntervencao} dataFiltro={dataOperacaoAtiva} />
            </div>
          </div>
        </div>
      )}

      {/* MODAIS */}
      <ModalCriarEditarPedido
        showModal={showModalPedido} isClosingModal={isClosingModal} handleCloseModal={handleCloseModalPedido} isSaving={isSaving} editingId={editingId}
        romaneio={romaneio} setRomaneio={setRomaneio} loja={loja} setLoja={setLoja} local={local} setLocal={setLocal} uf={uf} setUf={setUf}
        isCaixaMaster={isCaixaMaster} setIsCaixaMaster={setIsCaixaMaster} observacoes={observacoes} setObservacoes={setObservacoes}
        docTipo={docTipo} setDocTipo={setDocTipo} docResponsavel={docResponsavel} setDocResponsavel={setDocResponsavel}
        usuarios={usuarios} localUser={localUser} handleAddDoc={handleAddDoc} docsTemporarios={docsTemporarios} handleRemoveDoc={handleRemoveDoc} handleSavePedido={handleSavePedido}
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
        docResponsavel={docResponsavel} setDocResponsavel={setDocResponsavel} localUser={localUser} usuarios={usuarios}
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

      <AuditoriaWms 
        auditModalData={auditModalData}
        setAuditModalData={setAuditModalData}
        wmsSessions={wmsSessions}
        handleAuditoriaUpload={handleAuditoriaUpload}
        confirmarAuditoriaWms={confirmarAuditoriaWms}
        isSaving={isSaving}
      />

      <ModalAlertaPeso 
        alertaPesoZero={alertaPesoZero}
        handleResolvePesoZero={handleResolvePesoZero}
      />

      <ModalSucesso 
        modalSucesso={modalSucesso}
        setModalSucesso={setModalSucesso}
      />

      <ModalOrdemProducao 
        showOpModal={showOpModal}
        setShowOpModal={setShowOpModal}
        opsDoDia={opsDoDia}
        usuarios={usuarios}
        localUser={localUser}
        dataOperacaoAtiva={dataOperacaoAtiva}
      />

      <ModalCaixasMaster 
        showMasterModal={showMasterModal}
        setShowMasterModal={setShowMasterModal}
        caixasMaster={caixasMaster}
        setCaixasMaster={setCaixasMaster}
      />

      <AnimacaoCriacaoPedido dadosPedido={pedidoRecemCriado} />

      {/* FLUXO UNIFICADO DE IMPORTAÇÃO WMS */}
      <ModalFluxoImportacaoWMS 
        etapa={fluxoImportacao?.etapa}
        dadosPrevia={fluxoImportacao}
        resumoTexto={fluxoImportacao?.resumoTexto}
        onConfirmarGravacao={handleConfirmarGravacaoWMS}
        onConcluirFluxo={handleConcluirFluxoWMS}
        onCancelar={() => setFluxoImportacao(null)}
      />

      <ModalConfirmarExclusao 
        pedidoParaExcluir={pedidoParaExcluir}
        onConfirmar={handleConfirmarExclusaoDefinitiva}
        onCancelar={() => setPedidoParaExcluir(null)}
        isExcluindo={isExcluindoPedido}
      />

      {/* MODAL DE IMPRESSÃO DE ETIQUETA TÉRMICA */}
      <ModalImprimirEtiqueta 
        pedido={pedidoParaEtiqueta} 
        isOpen={Boolean(pedidoParaEtiqueta)} 
        onClose={() => setPedidoParaEtiqueta(null)} 
      />

      {/* MODAL DE SELEÇÃO DA EQUIPE FIXA */}
      {showModalEquipe && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(5, 5, 10, 0.75)', 
            zIndex: 99999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            backdropFilter: 'blur(8px)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }} 
          onClick={() => setShowModalEquipe(false)}
        >
          <div 
            style={{ 
              background: 'var(--bg-card, #1e293b)', 
              width: '95%', 
              maxWidth: '460px', 
              borderRadius: '16px', 
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', 
              padding: '24px', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '10px', color: '#3b82f6' }}>
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-main, #f8fafc)', fontSize: '1.15rem', fontWeight: 800 }}>Equipe Fixa do Checkout</h3>
                  <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.82rem' }}>Selecione os conferentes fixos no monitoramento</span>
                </div>
              </div>
              <button 
                onClick={() => setShowModalEquipe(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', margin: '16px 0', paddingRight: '4px' }}>
              {usuarios.map(u => {
                const nomeUser = u.nickname || u.email.split('@')[0];
                const isSelected = tempEquipeUids.includes(u.uid);

                return (
                  <div 
                    key={u.uid}
                    onClick={() => toggleUserNaEquipe(u.uid)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '10px 14px', 
                      borderRadius: '10px', 
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-input, rgba(255, 255, 255, 0.03))',
                      border: `1px solid ${isSelected ? '#3b82f6' : 'var(--border-color, rgba(255, 255, 255, 0.08))'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={nomeUser} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <Users size={18} color="var(--text-muted)" />
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? 'var(--text-main, #fff)' : 'var(--text-muted)' }}>{nomeUser}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                    {isSelected ? <CheckSquare size={18} color="#3b82f6" /> : <Square size={18} color="var(--text-muted)" />}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button 
                onClick={() => setShowModalEquipe(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSalvarEquipeFixa}
                disabled={isSalvandoEquipe}
                style={{ flex: 1.4, padding: '10px', borderRadius: '8px', background: '#3b82f6', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                {isSalvandoEquipe ? <Loader2 size={16} className="fa-spin"/> : <Check size={16}/>}
                Salvar Equipe ({tempEquipeUids.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONTROLE DE EXPEDIENTE */}
      {showModalExpediente && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 5, 10, 0.75)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }} 
          onClick={() => setShowModalExpediente(false)}
        >
          <div 
            style={{ background: 'var(--bg-card, #1e293b)', width: '95%', maxWidth: '420px', borderRadius: '16px', border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '10px', color: '#10b981' }}>
                  <Clock size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-main, #f8fafc)', fontSize: '1.15rem', fontWeight: 800 }}>Controle de Expediente</h3>
                  <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.82rem' }}>Defina o limite de tempo da operação</span>
                </div>
              </div>
              <button onClick={() => setShowModalExpediente(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>Hora de Início</label>
                <input 
                  type="time" 
                  value={formExpediente.horaInicio} 
                  onChange={e => setFormExpediente({...formExpediente, horaInicio: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '1.1rem', textAlign: 'center' }} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>Hora de Fim (Corte)</label>
                <input 
                  type="time" 
                  value={formExpediente.horaFim} 
                  onChange={e => setFormExpediente({...formExpediente, horaFim: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '1.1rem', textAlign: 'center' }} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => handleSalvarExpediente('aberto')}
                disabled={isSaving}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#10b981', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                {isSaving ? <Loader2 size={16} className="fa-spin"/> : <Play size={16}/>} Iniciar Operação
              </button>
              
              <button 
                onClick={() => handleSalvarExpediente('encerrado')}
                disabled={isSaving}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                {isSaving ? <Loader2 size={16} className="fa-spin"/> : <Check size={16}/>} Encerrar Dia
              </button>
            </div>
            
            <p style={{ marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Você pode alterar esses horários depois. O cálculo de ociosidade respeitará este intervalo de tempo.
            </p>
          </div>
        </div>
      )}

      <ModalGerenciarRanking 
  show={showModalGerenciarRanking}
  onClose={() => setShowModalGerenciarRanking(false)}
  rankingData={rankingCalculado}
  dataOperacaoAtiva={dataOperacaoAtiva}
/>

      {/* MODAL DE TRANSFERÊNCIA DE DIA */}
      {pedidoParaTransferir && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(5, 5, 10, 0.78)', 
            zIndex: 999999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            backdropFilter: 'blur(8px)', 
            padding: '20px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }} 
          onClick={() => !isTransferindo && !transferenciaSucesso && setPedidoParaTransferir(null)}
        >
          <div 
            style={{ 
              background: 'var(--bg-card, #1e293b)', 
              width: '100%', 
              maxWidth: '440px', 
              borderRadius: '16px', 
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', 
              padding: '24px', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
              position: 'relative',
              fontFamily: 'inherit'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {transferenciaSucesso ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', textAlign: 'center', fontFamily: 'inherit' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <CheckCircle2 size={32} color="#10b981" />
                </div>
                <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-main, #f8fafc)', fontSize: '1.2rem', fontWeight: 800 }}>
                  Transferência Concluída!
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted, #94a3b8)', fontSize: '0.88rem' }}>
                  Romaneio <strong>{pedidoParaTransferir.romaneio}</strong> transferido para o dia <strong>{novaDataTransferencia}</strong> preservando o tempo decorrido.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '10px', color: '#3b82f6' }}>
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--text-main, #f8fafc)', fontSize: '1.15rem', fontWeight: 800 }}>Transferir Romaneio</h3>
                      <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.82rem' }}>Mover separação para outro dia mantendo o progresso</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setPedidoParaTransferir(null)}
                    disabled={isTransferindo}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ background: 'var(--bg-input, rgba(255, 255, 255, 0.03))', border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Romaneio Selecionado:</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>{pedidoParaTransferir.romaneio || 'Sem número'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
                    {
                      pedidoParaTransferir.cliente || 
                      pedidoParaTransferir.loja || 
                      pedidoParaTransferir.destinatario || 
                      pedidoParaTransferir.razaoSocial || 
                      (pedidoParaTransferir.documentos && pedidoParaTransferir.documentos[0]?.cliente) ||
                      (pedidoParaTransferir.documentos && pedidoParaTransferir.documentos[0]?.destinatario) ||
                      'Cliente não informado'
                    }
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Nova Data da Operação:
                  </label>
                  <input 
                    type="date"
                    value={novaDataTransferencia}
                    onChange={(e) => setNovaDataTransferencia(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      background: 'var(--bg-input, #0f172a)', 
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))', 
                      color: 'var(--text-main, #fff)', 
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => setPedidoParaTransferir(null)}
                    disabled={isTransferindo}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmarTransferencia}
                    disabled={isTransferindo || !novaDataTransferencia}
                    style={{ flex: 1.4, padding: '10px', borderRadius: '8px', background: '#3b82f6', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}
                  >
                    {isTransferindo ? <Loader2 size={16} className="fa-spin" /> : <ArrowRight size={16} />}
                    Confirmar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

  </>
  );
}