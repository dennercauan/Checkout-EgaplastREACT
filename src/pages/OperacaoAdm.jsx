import { useMotorRanking } from '../hooks/useMotorRanking';
import React, { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse';
import { ArrowLeft, Clock, ShieldCheck, ClipboardList, Package, MapPin, Users, FileText, Settings, Play, Pause, CheckCircle2, Search, MoreVertical, X, Check, Trash2, Info, Activity, Coffee, Briefcase, AlertTriangle, Moon, PackagePlus, Edit } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, onSnapshot, deleteDoc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, collectionGroup, Timestamp, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '../firebase'; 

import AdmControlesManuais from '../components/AdmControlesManuais';
import AdmEstatisticasGerais from '../components/AdmEstatisticasGerais';
import RankingDiario from '../components/RankingDiario'; 
import ModalCriarEditarPedido from '../components/ModalCriarEditarPedido';
import ModalDetalhesPedido from '../components/ModalDetalhesPedido';
import '../css/Operacao.css'; 

export default function OperacaoAdm() {
  const navigate = useNavigate();
  const location = useLocation();
  
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
  
  // States do Formulário de Criação/Edição
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

  // States de Apoio para o Modal de Detalhes não quebrar
  const [activeTab, setActiveTab] = useState('resumo');
  const [wmsSessions, setWmsSessions] = useState({});
  const [buscasDocumentos, setBuscasDocumentos] = useState({});
  const [wmsPreResumoAberto, setWmsPreResumoAberto] = useState(null);
  const [docIndexSelecionado, setDocIndexSelecionado] = useState(null);
  const [skusExpandidos, setSkusExpandidos] = useState({});
  const [skusExpandidosComum, setSkusExpandidosComum] = useState({});
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [caixasMaster, setCaixasMaster] = useState([]);

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

  // BUSCA O DICIONÁRIO DE CAIXAS MASTER
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'caixasMaster'), (snap) => {
      setCaixasMaster(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
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
                nome, uid: nome, 
                pontos: stats.pontos || 0, 
                skus: stats.skus || 0, 
                pontosSku: stats.pontosSku || 0,       
                op: stats.op || 0,
                pedidos: stats.pedidos || 0, 
                bonusPedidos: stats.bonusPedidos || 0, 
                decrescimo: stats.decrescimo || 0, 
                chartData: stats.chartData || [],
                pointEvents: stats.pointEvents || [], 
                eventosMesclados: stats.eventosMesclados || []
              };
            })
            .filter(Boolean) 
            .filter(u => u.pontos > 0 || u.pedidos > 0 || u.op > 0)
            .sort((a, b) => b.pontos - a.pontos)
            .map((u, index) => ({ ...u, posicao: index + 1 }));

          setRankingArrayFirebase(arrayRanking);
        } else {
          setRankingArrayFirebase([]);
        }
      } else {
        setDadosDeEstatisticasFirebase({});
        setRankingArrayFirebase([]);
      }
    });
    return () => unsubscribe();
  }, [dataOperacaoAtiva]);

  useEffect(() => {
    const refPausas = doc(db, 'controlePausas', dataOperacaoAtiva);
    const unsub = onSnapshot(refPausas, (snap) => {
      if (snap.exists()) {
        setControlePausas(snap.data());
      } else {
        setControlePausas({});
      }
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
        const data = docSnap.data();
        const pathSegments = docSnap.ref.path.split('/');
        const elemIdOriginal = pathSegments.length > 3 ? pathSegments[3] : null;
        legados.push({ id: docSnap.id, _isLegacy: true, elementoIdOriginal: elemIdOriginal, ...data });
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

  const pedidosEmAndamento = useMemo(() => {
    return pedidosProcessados.filter(p => !p.efetivado);
  }, [pedidosProcessados]);

  const pedidosFiltrados = useMemo(() => {
    if (!buscaRomaneio.trim()) return pedidosProcessados;
    const termo = buscaRomaneio.toLowerCase();
    return pedidosProcessados.filter(p => 
      String(p.romaneio || '').toLowerCase().includes(termo) ||
      String(p.loja || '').toLowerCase().includes(termo)
    );
  }, [pedidosProcessados, buscaRomaneio]);

  // 1. O MOTOR DE CÁLCULO
  const rankingCalculado = useMotorRanking(usuarios, opsDoDia, pedidosProcessados, controlePausas, ajustesDoDia, dataOperacaoAtiva, horaReferenciaAtual);

  // 2. AS ESTATÍSTICAS DO TOPO
  const estatisticasTempoReal = useMemo(() => {
    let totalPedidos = 0;
    let totalCaixas = 0;

    pedidosProcessados.forEach(p => {
       if (p.efetivado) {
          const qtdDocumentos = p.documentos ? p.documentos.length : 0;
          totalPedidos += qtdDocumentos > 0 ? qtdDocumentos : 1;
          
          (p.documentos || []).forEach(d => {
             totalCaixas += (d.caixas || []).length;
          });
       }
    });

    const rankingMap = {};
    (rankingCalculado || []).forEach(user => {
      rankingMap[user.nome] = user;
    });

    return { totalNfMinuta: totalPedidos, totalCaixas: totalCaixas, ranking: rankingMap };
  }, [pedidosProcessados, rankingCalculado]);

  // 3. A EQUIPE ATIVA QUE ESTAVA DANDO ERRO
  const equipeAtivaHoje = useMemo(() => {
    const nomesAtivos = new Set();
    
    if (rankingCalculado) {
      rankingCalculado.forEach(r => nomesAtivos.add(r.nome));
    }
    if (controlePausas) {
      Object.keys(controlePausas).forEach(n => nomesAtivos.add(n));
    }
    
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

  const abrirModalEditarPedido = (pedido) => {
    setEditingId(pedido.id);
    setRomaneio(pedido.romaneio || '');
    setLoja(pedido.loja || '');
    setLocal(pedido.local || 'DF');
    setUf(pedido.uf || '');
    setIsCaixaMaster(pedido.isCaixaMaster || false);
    setObservacoes(pedido.observacoes || '');
    
    const docs = (pedido.documentos || []).map((d, i) => ({
      idTemp: Date.now() + i,
      tipo: d.tipo,
      responsaveis: d.responsaveis || (d.responsavel ? [d.responsavel] : [])
    }));
    setDocsTemporarios(docs);
    setShowModalPedido(true);
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
      // 👇 NOVO: Traduz os e-mails escolhidos no formulário para os UIDs do Firebase
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
        uidsVinculados, // <-- SALVANDO OS UIDs PARA A TELA DA OPERAÇÃO LER
        criadorUid: uidsVinculados[0] || 'admin', // Trava de segurança
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
      } else {
        payload.createdAt = serverTimestamp();
        payload.efetivado = false;
        await setDoc(doc(collection(db, 'pedidos')), payload);
      }
      
      handleCloseModalPedido();
    } catch (error) {
      alert("Erro ao salvar pedido: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };
  const handleTogglePausaUsuario = async (nomeUsuario, isCurrentlyPaused) => {
    try {
      const refPausas = doc(db, 'controlePausas', dataOperacaoAtiva);
      const snap = await getDoc(refPausas);
      const agora = Date.now();

      let userStatus = { isPaused: false, history: [] };

      if (snap.exists() && snap.data()[nomeUsuario]) {
        userStatus = JSON.parse(JSON.stringify(snap.data()[nomeUsuario]));
      }

      if (!Array.isArray(userStatus.history)) {
        userStatus.history = [];
      }

      if (isCurrentlyPaused) {
        userStatus.isPaused = false;
        if (userStatus.history.length > 0) {
          userStatus.history[userStatus.history.length - 1].end = agora;
        }
      } else {
        userStatus.isPaused = true;
        userStatus.history.push({ start: agora });
      }

      await setDoc(refPausas, { [nomeUsuario]: userStatus }, { merge: true });

    } catch (error) {
      console.error("Erro crítico no botão de pausa:", error);
      alert(`Falha ao tentar sincronizar a pausa com o servidor: ${error.message}`);
    }
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
    
    if (horaReferenciaAtual > ultimoEvento.end) {
      return horaReferenciaAtual - ultimoEvento.end;
    }
    return 0; 
  };

  const formatarCronometroPedido = (pedido) => {
    if (!pedido.createdAt) return "00:00:00";
    const start = pedido.createdAt.toMillis ? pedido.createdAt.toMillis() : pedido.createdAt;
    const totalPaused = pedido.totalPausedTime || 0;
    
    let end;
    if (pedido.efetivado && pedido.completedAt) {
      end = pedido.completedAt.toMillis ? pedido.completedAt.toMillis() : pedido.completedAt;
    } else if (pedido.isPaused && pedido.lastPauseStart) {
      end = pedido.lastPauseStart; 
    } else {
      end = horaReferenciaAtual; 
    }

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
    return pedido._isLegacy
      ? doc(db, 'usuarios', pedido.criadorUid, 'elementos', pedido.elementoIdOriginal, 'pedidosMultiDocumento', pedido.id)
      : doc(db, 'pedidos', pedido.id);
  };

  const handleToggleEfetivado = async (pedido) => {
    if (pedido.isPaused) return alert("O pedido está pausado. Retome na operação antes de alterar o status.");
    const novoStatus = !pedido.efetivado;
    const ref = obterReferenciaDocumento(pedido);
    
    const payload = { efetivado: novoStatus };
    
    if (novoStatus) {
      if (!pedido.primeiraEfetivacao) {
        payload.completedAt = serverTimestamp();
        payload.primeiraEfetivacao = serverTimestamp();
      } else {
        payload.completedAt = pedido.primeiraEfetivacao;
      }
    } else {
      if (!pedido.primeiraEfetivacao && pedido.completedAt) {
        payload.primeiraEfetivacao = pedido.completedAt;
      }
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
  // MOTOR DE IMPORTAÇÃO WMS (CSV)
  // ==========================================
  const processarArquivoWMS = (event, dIdx) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setDocIndexSelecionado(dIdx);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        const skuMap = {};
        
        let lojaEncontrada = '';
        let romaneioEncontrado = '';

        // 1. Agrupa os itens e soma as quantidades
        data.forEach(row => {
          // Ajuste os nomes das colunas de acordo com o padrão do seu CSV do WMS
          const ref = row['CÓDIGO'] || row['SKU'] || row['Código'] || row['Produto'] || '';
          const qtd = parseInt(row['QTD'] || row['Quantidade'] || row['Qtd']) || 0;
          const desc = row['DESCRIÇÃO'] || row['Descrição'] || row['Nome'] || '';
          
          if (!lojaEncontrada && row['LOJA']) lojaEncontrada = row['LOJA'];
          if (!romaneioEncontrado && row['ROMANEIO']) romaneioEncontrado = row['ROMANEIO'];

          if (!ref) return;
          
          if (!skuMap[ref]) skuMap[ref] = { ref, desc, qtdTotal: 0 };
          skuMap[ref].qtdTotal += qtd;
        });

        // 2. Cruza com o Dicionário de Caixas Master
        const skusProcessados = Object.values(skuMap).map(sku => {
          const masterInfo = caixasMaster.find(m => String(m.ref).toUpperCase() === String(sku.ref).toUpperCase() || String(m.id).toUpperCase() === String(sku.ref).toUpperCase());
          
          if (masterInfo && masterInfo.variacoes && masterInfo.variacoes.length > 0) {
            const varSelected = masterInfo.variacoes[0]; // Pega a 1ª variação como padrão
            return {
              ...sku,
              isMissing: false,
              variacoesDisponiveis: masterInfo.variacoes,
              variacaoSelecionadaIdx: 0,
              qtdPadrao: parseInt(varSelected.quantidade) || 0,
              pesoPadrao: parseFloat(varSelected.peso) || 0,
              caixaNome: varSelected.caixa || 'CAIXA',
              codigoBarras: varSelected.codigoBarras || ''
            };
          } else {
            // Se o produto não existe no dicionário, marca como Missing (Faltante)
            return { ...sku, isMissing: true, qtdPadrao: '', pesoPadrao: '', caixaNome: '' };
          }
        });

        // 3. Salva na sessão temporária da tela
        setWmsSessions(prev => ({
          ...prev,
          [dIdx]: {
            skus: skusProcessados,
            loja: lojaEncontrada,
            romaneio: romaneioEncontrado
          }
        }));

        setIsUploading(false);
        event.target.value = ''; // Limpa o input file
      },
      error: (err) => {
        alert("Erro ao ler arquivo CSV: " + err.message);
        setIsUploading(false);
      }
    });
  };

  return (
    <div className="op-wrapper">
      
      <header className="op-header">
        <div className="op-title-group">
          <button className="btn-back" onClick={() => navigate('/dashboard')} title="Voltar ao Painel">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1>Painel da Liderança</h1>
            <span><ShieldCheck size={14}/> Gestão e Intervenção de Resultados</span>
          </div>
        </div>
        
        <div className="op-actions">
          <button 
            onClick={() => setShowModalIntervencao(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}
          >
            <Settings size={18} /> Ajustes e Penalidades
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '5px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Clock size={16} color="#64748b" />
            <input 
              type="date" 
              value={dataOperacaoAtiva} 
              onChange={(e) => { if (e.target.value) navigate(`${location.pathname}?date=${e.target.value}`); }}
              style={{ border: 'none', outline: 'none', color: '#475569', fontWeight: 'bold', background: 'transparent' }}
            />
          </div>
        </div>
      </header>

      <main style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        <section>
             <AdmEstatisticasGerais dados={estatisticasTempoReal} />
        </section>

        {/* PAINEL DE COMANDO UNIFICADO */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="var(--primary)" /> Painel de Comando: Equipe ao Vivo
            </h3>
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
              <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '10px', width: '100%', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                 Nenhum conferente registrou atividade.
              </div>
            ) : (
              equipeAtivaHoje.map(user => {
                const nomeUser = user.email.split('@')[0];
                const isPaused = controlePausas[nomeUser]?.isPaused || false;
                
                const pedidoAtivo = pedidosEmAndamento.find(p => {
                   const uids = p.uidsVinculados || [p.criadorUid];
                   return uids.includes(user.uid);
                });

                const tempoOciosoMs = getTempoOcioso(nomeUser);

                let statusColor, statusText, statusIcon, conteudoCentral;
                
                const isDiaConcluido = isExpedienteEncerrado && !pedidoAtivo;

                if (isDiaConcluido) {
                   statusColor = '#10b981'; 
                   statusText = 'Dia Concluído';
                   statusIcon = <CheckCircle2 size={14} />;
                   conteudoCentral = (
                     <div style={{ padding: '15px 0', color: '#64748b', fontSize: '0.9rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                        <Moon size={32} color="#10b981" style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                        <div style={{ fontWeight: '500', color: '#334155' }}>Expediente Finalizado</div>
                        <div style={{ fontSize: '0.8rem' }}>Ociosidade travada às 17h30.</div>
                     </div>
                   );
                } else if (isPaused) {
                   statusColor = '#f59e0b'; 
                   statusText = 'Em Pausa (Protegido)';
                   statusIcon = <Coffee size={14} />;
                   conteudoCentral = (
                     <div style={{ padding: '15px 0', color: '#64748b', fontSize: '0.9rem', textAlign: 'center' }}>
                        <ShieldCheck size={32} color="#f59e0b" style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                        <div style={{ fontWeight: '500', color: '#334155' }}>Ociosidade congelada.</div>
                        <div style={{ fontSize: '0.8rem' }}>Nenhum ponto será descontado.</div>
                     </div>
                   );
                } else if (pedidoAtivo) {
                   statusColor = '#3b82f6'; 
                   statusText = 'Separando Pedido';
                   statusIcon = <Briefcase size={14} />;
                   
                   const tiposDosDocs = pedidoAtivo.documentos?.map(d => d.tipo).filter(Boolean).join(', ') || 'Nenhum listado';

                   conteudoCentral = (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0', flex: 1 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <strong style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a' }}>
                           <Package size={18} color="#3b82f6" /> {pedidoAtivo.romaneio || 'S/N'}
                         </strong>
                         <span style={{ fontWeight: '900', color: '#3b82f6', fontFamily: 'monospace', fontSize: '1.1rem', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px' }}>
                           {formatarCronometroPedido(pedidoAtivo)}
                         </span>
                       </div>
                       <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <MapPin size={14} color="#94a3b8" /> {pedidoAtivo.loja || 'Destino Padrão'}
                       </div>
                       <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }} title={tiposDosDocs}>
                         <FileText size={14} color="#94a3b8" /> {tiposDosDocs.length > 25 ? tiposDosDocs.substring(0, 25) + '...' : tiposDosDocs}
                       </div>
                     </div>
                   );
                } else {
                   const limiteOciosidadeMs = 20 * 60 * 1000; 
                   const tolerenciaExcedida = tempoOciosoMs > limiteOciosidadeMs;
                   
                   statusColor = tolerenciaExcedida ? '#ef4444' : '#64748b'; 
                   statusText = tolerenciaExcedida ? 'Ocioso (Sangrando)' : 'Livre (Na tolerância)';
                   statusIcon = tolerenciaExcedida ? <AlertTriangle size={14} /> : <Clock size={14} />;
                   
                   conteudoCentral = (
                     <div style={{ padding: '15px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flex: 1, justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Tempo inativo após última tarefa:</span>
                        <span style={{ fontSize: '2.2rem', fontWeight: '900', color: statusColor, fontFamily: 'monospace', lineHeight: '1', letterSpacing: '-1px' }}>
                          {formatMsToTime(tempoOciosoMs)}
                        </span>
                        {tolerenciaExcedida && (
                          <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 'bold', marginTop: '5px', background: '#fef2f2', padding: '2px 8px', borderRadius: '12px' }}>
                            Perdendo pontos agora
                          </div>
                        )}
                     </div>
                   );
                }

                return (
                  <div key={user.uid} style={{ background: '#fff', border: `1px solid ${statusColor}40`, borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'capitalize' }}>
                        <Users size={18} color="#94a3b8" /> {nomeUser}
                      </strong>
                      <div style={{ background: `${statusColor}15`, color: statusColor, padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {statusIcon} {statusText}
                      </div>
                    </div>
                    {conteudoCentral}
                    {isDiaConcluido ? (
                      <div style={{ width: '100%', padding: '10px', background: '#f1f5f9', color: '#94a3b8', textAlign: 'center', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', border: '1px dashed #cbd5e1', marginTop: '5px' }}>
                        Operação Fechada
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleTogglePausaUsuario(nomeUser, isPaused)}
                        style={{
                          width: '100%', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                          background: isPaused ? '#f8fafc' : '#f59e0b', color: isPaused ? '#475569' : '#fff',
                          border: isPaused ? '1px solid #e2e8f0' : 'none',
                          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', transition: 'all 0.2s', marginTop: '5px'
                        }}
                      >
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
              <h3 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="var(--primary)"/> Histórico Global de Romaneios
              </h3>
              <span className="history-count" style={{ display: 'block', marginTop: '4px' }}>
                {pedidosProcessados.filter(p => p.efetivado).length} finalizados da equipe
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div className="search-bar-op" style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px' }}>
                <Search size={16} color="#64748b" />
                <input type="text" placeholder="Buscar romaneio..." value={buscaRomaneio} onChange={(e) => setBuscaRomaneio(e.target.value)} style={{ border: 'none', outline: 'none', marginLeft: '8px', fontSize: '0.9rem' }}/>
              </div>
              
              <button 
                onClick={abrirModalNovoPedido}
                style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <PackagePlus size={18} /> Novo Romaneio
              </button>
            </div>
          </div>
          
          <div className="op-table-wrapper scrollable-table-wrapper">
            <table className="op-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Romaneio</th>
                  <th style={{ width: '25%' }}>Destino / Resp.</th>
                  <th style={{ width: '25%' }}>Observações</th>
                  <th style={{ width: '25%' }}>Resumo Rápido</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.length === 0 ? (
                  <tr><td colSpan="5" style={{textAlign: 'center', padding: '30px', color: '#94a3b8'}}>{buscaRomaneio ? 'Nenhum romaneio encontrado.' : 'Nenhum pedido processado hoje.'}</td></tr>
                ) : (
                  pedidosFiltrados.map(pedido => {
                    let docsCount = pedido.documentos?.length || 0;
                    let caixasCount = 0;
                    let skusCount = 0;
                    (pedido.documentos || []).forEach(d => {
                      caixasCount += (d.caixas || []).length;
                      (d.caixas || []).forEach(cx => { (cx.produtos || []).forEach(p => skusCount += parseInt(p.quantidade) || 0); });
                    });

                    let statusBadge;
                    if (pedido.efetivado) {
                      statusBadge = <div className="time-badge success"><Check size={12} style={{marginRight:'3px', display:'inline'}}/> Finalizado</div>;
                    } else if (pedido.isPaused) {
                      statusBadge = <div className="time-badge paused" title={pedido.motivoPausa}><Pause size={12} style={{marginRight:'3px', display:'inline'}}/> Pausado</div>;
                    } else {
                      statusBadge = <div className="time-badge pending"><Clock size={12} style={{marginRight:'3px', display:'inline'}}/> {formatarCronometroPedido(pedido)}</div>;
                    }

                    return (
                      <tr 
                        key={pedido.id} 
                        className={`clickable-row ${pedido.efetivado ? "efetivado" : ""}`}
                        onClick={() => { setPedidoModal(pedido); setShowDetalhesModal(true); }}
                      >
                        <td style={{ verticalAlign: 'middle', padding: '16px 12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{pedido.romaneio || 'S/N'}</strong>
                            </div>
                            {statusBadge}
                          </div>
                        </td>
                        
                        <td style={{ verticalAlign: 'middle', padding: '16px 12px' }}>
                          <div style={{fontWeight: 600, color: '#334155', whiteSpace: 'normal', fontSize: '13px'}}>{pedido.loja || '---'}</div>
                          <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                            <MapPin size={12} /> {pedido.local || 'DF'} {pedido.uf ? `- ${pedido.uf}` : ''}
                          </div>
                          <div style={{fontSize: '11px', color: '#6366f1', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                            <Users size={12} /> {getNomesResponsaveis(pedido)}
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
                            <div style={{position: 'relative'}}>
                              <button className="action-btn btn-edit" title="Ações ADM" onClick={() => setDropdownOpen(dropdownOpen === pedido.id ? null : pedido.id)}>
                                <MoreVertical size={16}/>
                              </button>
                              {dropdownOpen === pedido.id && (
                                <div className="table-dropdown-menu" style={{ right: 0, left: 'auto' }}>
                                  <button className="dropdown-item" onClick={() => abrirModalEditarPedido(pedido)}>
                                    <Edit size={14}/> Editar Dados do Pedido
                                  </button>
                                  <div className="dropdown-divider"></div>
                                  <button className="dropdown-item" onClick={() => handleToggleEfetivado(pedido)}>
                                    {pedido.efetivado ? <><X size={14}/> Desfazer Efetivação</> : <><Check size={14}/> Forçar Efetivação</>}
                                  </button>
                                  <div className="dropdown-divider"></div>
                                  <button className="dropdown-item text-danger" onClick={() => handleDeletePedido(pedido)}>
                                    <Trash2 size={14}/> Excluir Pedido (Global)
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

      <section className="op-bottom-zone">
         <RankingDiario 
            rankingCalculado={rankingCalculado}
            rankingExpandido={rankingExpandido}
            setRankingExpandido={setRankingExpandido}
            currentTime={horaReferenciaAtual} 
            dataOperacaoAtiva={dataOperacaoAtiva} 
            isAdminMode={true}
            onDeleteEvent={handleDeleteEvent}
          />
         <div className="op-side-indicators">
            <div className="indicator-card op-card">
              <div className="indicator-icon" style={{background: '#e0e7ff', color: '#4f46e5'}}><ClipboardList size={24}/></div>
              <div className="indicator-content"><h4>Auditoria Diária</h4><p>Verifique o log de intervenções</p></div>
              <button className="indicator-btn">Abrir Log Completo</button>
            </div>
         </div>
      </section>

      {showModalIntervencao && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }} 
          onClick={() => setShowModalIntervencao(false)}
        >
          <div 
            style={{ background: '#f8fafc', width: '95%', maxWidth: '1000px', maxHeight: '90vh', borderRadius: '12px', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
              <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} color="#3b82f6" /> Lançamento de Ajustes e Penalidades
              </h3>
              <button 
                onClick={() => setShowModalIntervencao(false)} 
                style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                X
              </button>
            </div>
            
            <div style={{ padding: '20px' }}>
              <AdmControlesManuais dados={rankingCalculado || []} dataFiltro={dataOperacaoAtiva} />
            </div>
          </div>
        </div>
      )}

      {/* ================= INJEÇÃO DOS MODAIS ADICIONADOS ================= */}
      <ModalCriarEditarPedido
        showModal={showModalPedido}
        isClosingModal={isClosingModal}
        handleCloseModal={handleCloseModalPedido}
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
        usuarios={usuarios}
        localUser={null} // Passamos null pois na ADM qualquer usuário é adicionado manualmente
        handleAddDoc={handleAddDoc}
        docsTemporarios={docsTemporarios}
        handleRemoveDoc={handleRemoveDoc}
        handleSavePedido={handleSavePedido}
        handleAddResponsavelToDoc={(id, email) => {
          setDocsTemporarios(docsTemporarios.map(d => d.idTemp === id ? {...d, responsaveis: [...(d.responsaveis || []), email]} : d));
        }}
        handleRemoveResponsavelFromDoc={(id, email) => {
          setDocsTemporarios(docsTemporarios.map(d => d.idTemp === id ? {...d, responsaveis: d.responsaveis.filter(r => r !== email)} : d));
        }}
      />

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
        handleBuscaDocumento={(dIdx, val) => setBuscasDocumentos(p => ({...p, [dIdx]: val}))}
        wmsPreResumoAberto={wmsPreResumoAberto}
        setWmsPreResumoAberto={setWmsPreResumoAberto}
        setShowCaixasEfetivadasModal={() => {}}
        setAuditModalData={() => {}} 
        handlePlanejamentoUpload={processarArquivoWMS}
        handleUploadWMSComum={processarArquivoWMS}
        docIndexSelecionado={docIndexSelecionado}
        setDocIndexSelecionado={setDocIndexSelecionado}
        skusExpandidos={skusExpandidos}
        setSkusExpandidos={setSkusExpandidos}
        skusExpandidosComum={skusExpandidosComum}
        setSkusExpandidosComum={setSkusExpandidosComum}
        handleInputManual={() => {}}
        abrirModalSalvarManual={() => {}}
        handleMudarVariacao={() => {}}
        isEditingObs={isEditingObs}
        setIsEditingObs={setIsEditingObs}
        observacoes={observacoes}
        setObservacoes={setObservacoes}
        docTipo={docTipo}
        setDocTipo={setDocTipo}
        docResponsavel={docResponsavel}
        setDocResponsavel={setDocResponsavel}
        localUser={null}
        usuarios={usuarios}
        handleAddDoc={handleAddDoc}
        docsTemporarios={docsTemporarios}
        handleRemoveDoc={handleRemoveDoc}
        handleAddResponsavelToDoc={(id, email) => {
          setDocsTemporarios(docsTemporarios.map(d => d.idTemp === id ? {...d, responsaveis: [...(d.responsaveis || []), email]} : d));
        }}
        handleRemoveResponsavelFromDoc={(id, email) => {
          setDocsTemporarios(docsTemporarios.map(d => d.idTemp === id ? {...d, responsaveis: d.responsaveis.filter(r => r !== email)} : d));
        }}
        handleSalvarEdicaoTab1={() => alert('Edições pela ADM salvas!')}
      />

    </div>
  );
}