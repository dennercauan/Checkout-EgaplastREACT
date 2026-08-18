// src/components/PersonalDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  collection, query, where, onSnapshot, addDoc, 
  serverTimestamp, documentId, getDocs, doc, getDoc, 
  collectionGroup, Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Calendar as CalendarIcon, ChevronRight, ChevronLeft, ChevronDown, 
  LayoutDashboard, Clock, TrendingUp, Package, Award, BarChart2, 
  Loader2, X, DollarSign 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid 
} from 'recharts';

import ModalVolumeDetalhado from './ModalVolumeDetalhado';
import ModalFaturamento from './ModalFaturamento';
import ModalRankingDetalhado from './ModalRankingDetalhado';
import TransicaoDashboardOverlay from './TransicaoDashboardOverlay';
import '../css/PersonalDashboard.css';

export default function PersonalDashboard({ user, isAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ==========================================
  // TRANSIÇÃO DE ENTRADA SUAVE (OPERAÇÃO -> DASHBOARD)
  // ==========================================
  const veioDeTransicao = Boolean(location.state?.fromTransition);
  const [overlayAtivo, setOverlayAtivo] = useState(veioDeTransicao);
  const [overlaySaindo, setOverlaySaindo] = useState(false);
  const [revelarCascata, setRevelarCascata] = useState(!veioDeTransicao);

  useEffect(() => {
    if (veioDeTransicao) {
      // 1. Inicia o fade-out do Overlay
      const t1 = setTimeout(() => {
        setOverlaySaindo(true);
      }, 800);

      // 2. Dispara as animações em cascata no meio do fade-out do overlay
      const t2 = setTimeout(() => {
        setRevelarCascata(true);
      }, 950);

      // 3. Remove o overlay completamente da memória
      const t3 = setTimeout(() => {
        setOverlayAtivo(false);
        window.history.replaceState({}, document.title);
      }, 1500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [veioDeTransicao]);

  const [estatisticasPeriodo, setEstatisticasPeriodo] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Modais de Controle
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isClosingHistory, setIsClosingHistory] = useState(false);
  const [modalVolumeAberto, setModalVolumeAberto] = useState(false);
  const [modalFaturamentoAberto, setModalFaturamentoAberto] = useState(false);
  const [modalRankingAberto, setModalRankingAberto] = useState(false);
  
  const [isModalTopOrdersOpen, setIsModalTopOrdersOpen] = useState(false);
  const [isClosingTopOrders, setIsClosingTopOrders] = useState(false);

  const handleCloseTopOrders = () => {
    if (isClosingTopOrders) return;
    setIsClosingTopOrders(true);
    setTimeout(() => {
      setIsModalTopOrdersOpen(false);
      setIsClosingTopOrders(false);
    }, 350);
  };

  // Estados de Hover dos Cards
  const [isTopOrdersExpanded, setIsTopOrdersExpanded] = useState(false);
  const [isRankingHovered, setIsRankingHovered] = useState(false);

  // ==========================================
  // MARCO ZERO DO RANKING OFICIAL
  // ==========================================
  const DATA_INICIO_NOVO_SISTEMA = '2026-08-14';

  // ==========================================
  // FILTROS DE DATA
  // ==========================================
  const today = new Date();
  const ano = today.getFullYear();
  const mes = String(today.getMonth() + 1).padStart(2, '0');
  const dia = String(today.getDate()).padStart(2, '0');
  
  const dataHojeLocal = `${ano}-${mes}-${dia}`;
  const dataPrimeiroDia = `${ano}-${mes}-01`;

  const [startDate, setStartDate] = useState(dataPrimeiroDia);
  const [endDate, setEndDate] = useState(dataHojeLocal);
  
  const [viewMonth, setViewMonth] = useState(new Date(ano, today.getMonth(), 1));
  const [loadingDate, setLoadingDate] = useState(false);

  const [todayElement, setTodayElement] = useState(null);
  const todayTitle = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  // Maiores Pedidos
  const [maioresPedidosBrutos, setMaioresPedidosBrutos] = useState([]);
  const [loadingTopOrders, setLoadingTopOrders] = useState(false);

  const top5MaioresPedidos = useMemo(() => {
    return maioresPedidosBrutos.slice(0, 5);
  }, [maioresPedidosBrutos]);

  // Card Principal (Pedidos de Hoje)
  const [meusPedidosCount, setMeusPedidosCount] = useState(0);
  const [loadingOperacao, setLoadingOperacao] = useState(true);

  const [pedidosRaizDia, setPedidosRaizDia] = useState([]);
  const [pedidosLegadosDia, setPedidosLegadosDia] = useState([]);

  // Faturamento e Volume Mensal
  const [dadosFaturamento, setDadosFaturamento] = useState([]);
  const [volumeDataCompleto, setVolumeDataCompleto] = useState([]);

  // ==========================================
  // MAPA GLOBAL DE USUÁRIOS
  // ==========================================
  const [mapaUsuarios, setMapaUsuarios] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
      const mapa = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const info = {
          photoURL: data.photoURL || '',
          nickname: data.nickname || '',
          nome: data.nickname || data.nome || data.displayName || (data.email ? data.email.split('@')[0] : '')
        };

        const emailCompleto = (data.email || '').toLowerCase().trim();
        const emailPrefix = emailCompleto.split('@')[0];
        const nickKey = (data.nickname || '').toLowerCase().trim();
        const docIdKey = docSnap.id.toLowerCase().trim();

        mapa[docSnap.id] = info;
        if (docIdKey) mapa[docIdKey] = info;
        if (emailCompleto) mapa[emailCompleto] = info;
        if (emailPrefix) mapa[emailPrefix] = info;
        if (nickKey) mapa[nickKey] = info;
      });
      setMapaUsuarios(mapa);
    });

    return () => unsub();
  }, []);

  // ==========================================
  // NAVEGAÇÃO DIRETA (DISPARA TRANSIÇÃO NA OPERAÇÃO / ADM)
  // ==========================================
  const handleHeroNavigation = (destino) => {
    navigate(destino, { state: { fromTransition: true } });
  };

  // ==========================================
  // BUSCA DADOS DE FATURAMENTO DIÁRIO
  // ==========================================
  useEffect(() => {
    const qFat = query(collection(db, 'faturamentoDiario'));
    const unsub = onSnapshot(qFat, (snap) => {
      setDadosFaturamento(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Erro ao buscar faturamento:", error));
    return () => unsub();
  }, []);

  const resumoFaturamentoAtual = useMemo(() => {
    const mesAtualPrefix = `${ano}-${mes}`;
    const totalDiasNoMes = new Date(ano, today.getMonth() + 1, 0).getDate();

    let totalValor = 0;
    let totalPedidos = 0;
    const mapaDias = {};

    dadosFaturamento.forEach(item => {
      if (item.id && item.id.startsWith(mesAtualPrefix)) {
        mapaDias[item.id] = item;
        totalValor += Number(item.valorFaturado) || 0;
        totalPedidos += Number(item.pedidosFaturados) || 0;
      }
    });

    const sparkline = [];
    for (let d = 1; d <= totalDiasNoMes; d++) {
      const dataStr = `${mesAtualPrefix}-${String(d).padStart(2, '0')}`;
      sparkline.push({
        dia: d,
        valor: Number(mapaDias[dataStr]?.valorFaturado) || 0
      });
    }

    return { totalValor, totalPedidos, sparkline };
  }, [dadosFaturamento, ano, mes, today]);

  // ==========================================
  // ESCUTA DE PEDIDOS DO DIA
  // ==========================================
  useEffect(() => {
    if (!user) return;

    const [anoStr, mesStr, diaStr] = dataHojeLocal.split('-');
    const startOfDay = new Date(Number(anoStr), Number(mesStr) - 1, Number(diaStr), 0, 0, 0);
    const endOfDay = new Date(Number(anoStr), Number(mesStr) - 1, Number(diaStr), 23, 59, 59);

    const qRaiz = query(
      collection(db, 'pedidos'), 
      where('dataOperacao', '==', dataHojeLocal)
    );
    const unsubRaiz = onSnapshot(qRaiz, (snap) => {
      setPedidosRaizDia(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Erro busca pedidos raiz:", err));

    const qLegado = query(
      collectionGroup(db, 'pedidosMultiDocumento'),
      where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
      where('createdAt', '<=', Timestamp.fromDate(endOfDay))
    );
    const unsubLegado = onSnapshot(qLegado, (snap) => {
      setPedidosLegadosDia(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Erro busca pedidos legados:", err));

    return () => {
      unsubRaiz();
      unsubLegado();
    };
  }, [user, dataHojeLocal]);

  // ==========================================
  // CONSOLIDAÇÃO DOS DADOS
  // ==========================================
  useEffect(() => {
    if (!user) return;

    const meuEmail = String(user?.email || '').toLowerCase().trim();
    const meuPrefixoEmail = meuEmail.split('@')[0];
    const meuNome = String(user?.displayName || meuPrefixoEmail || '').toLowerCase().trim();

    const mapaUnico = new Map();
    [...pedidosRaizDia, ...pedidosLegadosDia].forEach(p => {
      if (p && p.id) mapaUnico.set(p.id, p);
    });

    let contagemNfMinuta = 0;

    mapaUnico.forEach(pedido => {
      const docs = pedido.documentos || [];
      
      docs.forEach(docItem => {
        const tipo = String(docItem.tipo || '').trim();
        const isDocValido = tipo === 'Nota Fiscal' || tipo === 'Minuta';
        if (!isDocValido) return;

        if (isAdmin) {
          contagemNfMinuta++;
        } else {
          const responsaveisLista = (docItem.responsaveis || []).map(r => String(r).toLowerCase().trim());
          const responsavelUnico = String(docItem.responsavel || docItem.conferente || docItem.separador || '').toLowerCase().trim();

          const ehResponsavelPeloDoc = 
            responsaveisLista.includes(meuEmail) ||
            responsaveisLista.includes(meuPrefixoEmail) ||
            responsaveisLista.includes(meuNome) ||
            responsavelUnico === meuEmail ||
            responsavelUnico === meuPrefixoEmail ||
            responsavelUnico === meuNome;

          const ehCriadorOuVinculado = 
            pedido.criadorUid === user?.uid ||
            (pedido.uidsVinculados && pedido.uidsVinculados.includes(user?.uid));

          if (ehResponsavelPeloDoc || (docs.length === 1 && ehCriadorOuVinculado)) {
            contagemNfMinuta++;
          }
        }
      });
    });

    if (isAdmin && contagemNfMinuta === 0 && estatisticasPeriodo && estatisticasPeriodo.length > 0) {
      const estHoje = estatisticasPeriodo.find(e => e.id === dataHojeLocal);
      if (estHoje) {
        contagemNfMinuta = Number(estHoje.totalNfMinuta || estHoje.totalPedidos || 0);
      }
    }

    setMeusPedidosCount(contagemNfMinuta);
    setLoadingOperacao(false);
  }, [pedidosRaizDia, pedidosLegadosDia, isAdmin, estatisticasPeriodo, dataHojeLocal, user]);

  // ==========================================
  // BUSCA MAIORES PEDIDOS
  // ==========================================
  useEffect(() => {
    const fetchMaioresPedidos = async () => {
      if (!startDate || !endDate) return;
      setLoadingTopOrders(true);
      
      try {
        const qPedidos = query(
          collection(db, 'pedidos'),
          where('efetivado', '==', true),
          where('dataOperacao', '>=', startDate),
          where('dataOperacao', '<=', endDate)
        );
        
        const snap = await getDocs(qPedidos);
        const pedidosMap = {};

        snap.forEach(docSnap => {
          const data = docSnap.data();
          const temNfOuMinuta = (data.documentos || []).some(d => d.tipo === 'Nota Fiscal' || d.tipo === 'Minuta');
          if (!temNfOuMinuta) return;

          let totalCaixas = 0;
          (data.documentos || []).forEach(d => {
            totalCaixas += (d.caixas || []).length;
          });

          if (totalCaixas > 0) {
            const nomeLoja = data.cliente || data.loja || data.nomeLoja || 'Loja não informada';
            const numRomaneio = data.romaneio || data.numeroRomaneio || docSnap.id.substring(0, 6);
            const romaneioCurto = `Rom. ${numRomaneio}`;
            const nomeCompleto = `${nomeLoja} (${romaneioCurto})`;
            const idUnico = docSnap.id; 

            if (!pedidosMap[idUnico]) {
              pedidosMap[idUnico] = { 
                romaneioCurto, 
                nomeCompleto, 
                caixas: 0, 
                responsaveis: new Set(), 
                totalItens: 0 
              };
            }
            
            pedidosMap[idUnico].caixas += totalCaixas;

            (data.documentos || []).forEach(d => {
              if (d.conferente) pedidosMap[idUnico].responsaveis.add(d.conferente);
              if (d.separador) pedidosMap[idUnico].responsaveis.add(d.separador);
              if (d.responsavel) pedidosMap[idUnico].responsaveis.add(d.responsavel);

              (d.caixas || []).forEach(caixa => {
                (caixa.produtos || []).forEach(item => {
                  const qtd = parseInt(item.quantidade, 10) || 0;
                  pedidosMap[idUnico].totalItens += qtd;
                });
              });
            });
          }
        });

        const arrayOrdenado = Object.keys(pedidosMap)
          .map(id => ({ 
            romaneioCurto: pedidosMap[id].romaneioCurto,
            nomeCompleto: pedidosMap[id].nomeCompleto, 
            caixas: pedidosMap[id].caixas,
            responsaveis: Array.from(pedidosMap[id].responsaveis).join(', ') || 'N/A',
            totalItens: pedidosMap[id].totalItens 
          }))
          .sort((a, b) => b.caixas - a.caixas);

        setMaioresPedidosBrutos(arrayOrdenado);
      } catch (error) {
        console.error("Erro ao buscar maiores pedidos:", error);
      } finally {
        setLoadingTopOrders(false);
      }
    };

    fetchMaioresPedidos();
  }, [startDate, endDate]);

  // ==========================================
  // BUSCA DADOS DE HISTÓRICO
  // ==========================================
  useEffect(() => {
    if (!user) return;
    const elementsRef = collection(db, 'usuarios', user.uid, 'elementos');
    const qToday = query(elementsRef, where('titulo', '==', todayTitle));
    const unsubscribe = onSnapshot(qToday, (snapshot) => {
      if (!snapshot.empty) setTodayElement({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      else setTodayElement(null);
    });
    return () => unsubscribe();
  }, [user, todayTitle]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    setLoading(true);
    
    const qEstatisticas = query(
      collection(db, 'estatisticasDiarias'), 
      where(documentId(), '>=', startDate), 
      where(documentId(), '<=', endDate + '\uf8ff')
    );
    
    const unsub = onSnapshot(qEstatisticas, (snap) => {
      setEstatisticasPeriodo(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar estatisticasPeriodo:", error);
      setLoading(false);
    });
    
    return () => unsub();
  }, [startDate, endDate]);

  // ==========================================
  // VOLUME MENSAL HISTÓRICO
  // ==========================================
  useEffect(() => {
    const fetchVolumeMensal = async () => {
      const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const ultimosMeses = [];
      const dataAtual = new Date();

      for (let i = 2; i >= 0; i--) {
        const d = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - i, 1);
        const idMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        ultimosMeses.push({ id: idMes, chaveBusca: idMes, mes: mesesNomes[d.getMonth()], ano: d.getFullYear(), pedidos: 0, caixas: 0 });
      }

      try {
        const promessas = ultimosMeses.map(m => getDoc(doc(db, 'estatisticasMensais', m.id)));
        const snaps = await Promise.all(promessas);

        snaps.forEach((snap, index) => {
          if (snap.exists()) {
            const data = snap.data();
            ultimosMeses[index].pedidos = data.totalNfMinuta || 0;
            ultimosMeses[index].caixas = data.totalCaixas || 0;
          }
        });

        setVolumeDataCompleto(ultimosMeses);
      } catch (error) { console.error("Erro ao buscar estatísticas mensais:", error); }
    };

    fetchVolumeMensal();
  }, []);

  // ==========================================
  // RANKING CALCULADO DO PERÍODO
  // ==========================================
  const rankingDataCompleto = useMemo(() => {
    const mapa = {};
    const corteInicial = String(DATA_INICIO_NOVO_SISTEMA).trim();

    estatisticasPeriodo.forEach(dia => {
      const idDia = String(dia.id).trim();
      if (idDia < corteInicial) return;

      const rawRanking = dia.ranking;
      if (!rawRanking) return;

      if (Array.isArray(rawRanking)) {
        rawRanking.forEach(item => {
          if (!item || (!item.nome && !item.uid)) return;
          const nomeChave = String(item.nome || item.uid).toLowerCase().trim();

          if (!mapa[nomeChave]) {
            mapa[nomeChave] = { 
              nome: nomeChave, 
              originalKey: item.nome || item.uid,
              uid: item.uid || '',
              pontos: 0, 
              pedidos: 0, 
              op: 0, 
              skus: 0 
            };
          }
          
          mapa[nomeChave].pontos += Number(item.pontos || item.totalPontos || item.score || 0);
          mapa[nomeChave].pedidos += Number(item.pedidos || 0);
          mapa[nomeChave].op += Number(item.op || 0);
          mapa[nomeChave].skus += Number(item.skus || item.pontosSku || 0);
        });
      } 
      else if (typeof rawRanking === 'object') {
        Object.entries(rawRanking).forEach(([chave, stats]) => {
          if (stats === null || stats === undefined) return;

          const nomeRaw = (typeof stats === 'object' && stats.nome) ? stats.nome : chave;
          if (!nomeRaw) return;
          
          const nomeChave = String(nomeRaw).toLowerCase().trim();

          if (!mapa[nomeChave]) {
            mapa[nomeChave] = { 
              nome: nomeChave, 
              originalKey: nomeRaw,
              uid: (typeof stats === 'object' && stats.uid) ? stats.uid : '',
              pontos: 0, 
              pedidos: 0, 
              op: 0, 
              skus: 0 
            };
          }

          if (typeof stats === 'number') {
            mapa[nomeChave].pontos += stats;
          } else if (typeof stats === 'object') {
            mapa[nomeChave].pontos += Number(stats.pontos || stats.totalPontos || stats.score || 0);
            mapa[nomeChave].pedidos += Number(stats.pedidos || 0);
            mapa[nomeChave].op += Number(stats.op || 0);
            mapa[nomeChave].skus += Number(stats.skus || stats.pontosSku || 0);
          }
        });
      }
    });

    return Object.values(mapa).map(userItem => {
      const chaveBusca = userItem.nome.toLowerCase().trim();
      const userDoc = mapaUsuarios[userItem.uid] || mapaUsuarios[chaveBusca] || {};

      const nomeExibicao = userDoc.nickname || userDoc.nome || userItem.originalKey || userItem.nome;
      const fotoPerfil = userDoc.photoURL || '';

      return {
        ...userItem,
        nome: nomeExibicao,
        photoURL: fotoPerfil
      };
    }).sort((a, b) => b.pontos - a.pontos);
  }, [estatisticasPeriodo, DATA_INICIO_NOVO_SISTEMA, mapaUsuarios]);

  // ==========================================
  // NAVEGAÇÃO E CALENDÁRIO
  // ==========================================
  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  const handleDateClick = async (day) => {
    if (!day) return;
    setLoadingDate(true);

    const dataIsoFormatada = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    try {
      setShowHistoryModal(false);
      const destino = isAdmin 
        ? `/operacao-adm?date=${dataIsoFormatada}` 
        : `/operacao?date=${dataIsoFormatada}`;
        
      navigate(destino, { state: { fromTransition: true } });
    } catch (error) {
      alert("Erro ao buscar histórico.");
    } finally {
      setLoadingDate(false);
    }
  };

  const handleCloseHistory = () => {
    if (isClosingHistory) return;
    setIsClosingHistory(true);
    setTimeout(() => { setShowHistoryModal(false); setIsClosingHistory(false); }, 400); 
  };

  const renderCalendar = () => {
    const days = [];
    const totalDays = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);

    return (
      <div className="custom-calendar">
        <div className="calendar-header">
          <button onClick={prevMonth}><ChevronLeft size={20} /></button>
          <h4>{meses[viewMonth.getMonth()]} {viewMonth.getFullYear()}</h4>
          <button onClick={nextMonth}><ChevronRight size={20} /></button>
        </div>
        <div className="calendar-weekdays">
          <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
        </div>
        <div className="calendar-grid">
          {days.map((d, i) => {
            const isToday = d === today.getDate() && viewMonth.getMonth() === today.getMonth() && viewMonth.getFullYear() === today.getFullYear();
            return (
              <div key={i} className={`calendar-day ${d ? 'active' : 'empty'} ${isToday ? 'is-today' : ''}`} onClick={() => handleDateClick(d)}>
                {d}
              </div>
            );
          })}
        </div>
        {loadingDate && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px', color: 'var(--primary)' }}>
            <Loader2 size={24} className="fa-spin" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
      </div>
    );
  };

  const getDayOfWeek = () => ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][today.getDay()];

  return (
    <>
      <TransicaoDashboardOverlay isVisible={overlayAtivo} isExiting={overlaySaindo} />

      <div className={`dashboard-wrapper ${revelarCascata ? 'dash-cascata-ativa' : 'dash-oculto'}`}>
        
        <div className="dash-header-container">
          <div className="dash-title-area">
            <LayoutDashboard size={28} className="title-icon" />
            <h2>Central de Conferência</h2>
          </div>
          <div className="dash-actions-area">
            <div className="dash-period-filter">
              <CalendarIcon size={16} className="filter-icon" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="date-input" />
              <span className="date-separator">até</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="date-input" />
            </div>
            
            <button className="btn-history" onClick={() => setShowHistoryModal(true)}>
              <Clock size={16} /> Ver Histórico
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <Loader2 className="fa-spin" size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} /> Processando inteligência de dados...
          </div>
        ) : (
          <div className="dashboard-free-layout">
            
            {/* HERO CARD PRINCIPAL */}
            <div 
              className="hero-card"
              style={{ cursor: 'pointer', ...(isAdmin ? { boxShadow: 'var(--hero-shadow, 0 10px 25px rgba(0, 0, 0, 0.4))' } : {}) }}
              onClick={() => {
                const destino = isAdmin ? `/operacao-adm?date=${dataHojeLocal}` : `/operacao?date=${dataHojeLocal}`;
                handleHeroNavigation(destino);
              }}
            >
              <div className="hero-content">
                <div className="hero-badge" style={isAdmin ? { background: 'rgba(242, 101, 34, 0.9)' } : {}}>
                  {isAdmin ? 'OPERAÇÃO DO CHECKOUT - HOJE' : 'SUA OPERAÇÃO - HOJE'}
                </div>
                <h2 className="hero-title">{getDayOfWeek()}</h2>
                <div className="hero-stats">
                  <div className="stat-box">
                    <h1 style={{ fontSize: '4rem', margin: '0', lineHeight: '1.2' }}>
                      {loadingOperacao ? (
                        <Loader2 className="fa-spin" size={48} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        meusPedidosCount
                      )}
                    </h1>
                    <span className="stat-label">{isAdmin ? 'Total de Pedidos Conferidos' : 'Meus Pedidos Hoje'}</span>
                  </div>
                </div>
                <div className="hero-footer">
                  <div className="hero-date">{todayTitle}/{today.getFullYear()}</div>
                  <button 
                    className="btn-access hero-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      const destino = isAdmin 
                        ? `/operacao-adm?date=${dataHojeLocal}` 
                        : `/operacao?date=${dataHojeLocal}`;
                      handleHeroNavigation(destino);
                    }}
                  >
                    {isAdmin ? 'Gestão da Operação' : 'Acessar Minha Pasta'} <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* BLOCO 1: VOLUME ESTATÍSTICO MENSAL */}
            <div 
              className="free-block volume-zone expandable-card" 
              onClick={() => setModalVolumeAberto(true)} 
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
            >
              <div className="block-header">
                <h3>Volume Mensal</h3>
                <span className="block-action">Ver Detalhes</span>
              </div>
              <div style={{ flex: 1, width: '100%', height: '150px', marginTop: '15px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeDataCompleto} layout="vertical" margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" opacity={0.5} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="mes" type="category" tick={{ fill: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={60} />
                    <RechartsTooltip 
                      cursor={false} 
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                    />
                    <Bar 
                      dataKey="caixas" 
                      name="Caixas" 
                      fill="#c4709d" 
                      barSize={8} 
                      radius={[0, 4, 4, 0]} 
                      isAnimationActive={true}
                      animationBegin={200}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                    <Bar 
                      dataKey="pedidos" 
                      name="Pedidos" 
                      fill="#0273a3" 
                      barSize={8} 
                      radius={[0, 4, 4, 0]} 
                      isAnimationActive={true}
                      animationBegin={400}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BLOCO 2: FATURAMENTO & PEDIDOS */}
            <div 
              className="free-block media-zone expandable-card" 
              onClick={() => setModalFaturamentoAberto(true)}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div className="block-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={20} className="kpi-icon" style={{ color: '#10b981' }} />
                  <h3>Faturamento</h3>
                </div>
                <span className="block-action">Preencher / Ver</span>
              </div>

              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#10b981', lineHeight: '1.2' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumoFaturamentoAtual.totalValor)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <strong>{resumoFaturamentoAtual.totalPedidos}</strong> pedidos faturados este mês
                </div>
              </div>

              <div style={{ width: '100%', height: '70px', marginTop: '10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={resumoFaturamentoAtual.sparkline} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cardFatGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <RechartsTooltip 
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', padding: '4px 8px' }}
                      formatter={(v) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v), 'Faturado']}
                      labelFormatter={(dia) => `Dia ${dia}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="valor" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#cardFatGrad)" 
                      isAnimationActive={true}
                      animationBegin={500}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BLOCO 3: RANKING GERAL */}
            <div 
              className="free-block ranking-zone" 
              style={{ position: 'relative', cursor: 'pointer' }}
              onMouseEnter={() => setIsRankingHovered(true)}
              onMouseLeave={() => setIsRankingHovered(false)}
              onClick={() => setModalRankingAberto(true)}
            >
              <div className="kpi-header free-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} className="kpi-icon gold" />
                  <h4>Ranking Geral</h4>
                </div>
                <ChevronDown 
                  size={18} 
                  color="#a0aec0" 
                  style={{ transform: isRankingHovered ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} 
                />
              </div>

              <div className="ranking-list free-list" style={{ marginTop: '10px' }}>
                {rankingDataCompleto.slice(0, 5).length === 0 ? (
                  <div style={{ color: '#999', fontSize: '13px', textAlign: 'center', padding: '15px 0' }}>
                    Nenhum dado a partir de {DATA_INICIO_NOVO_SISTEMA.split('-').reverse().join('/')}.
                  </div>
                ) : (
                  rankingDataCompleto.slice(0, 5).map((u, i) => (
                    <div key={`${u.nome}-${i}`} className={`ranking-row ${i === 0 ? 'first' : 'shadow-sm'}`}>
                      <span className="rank-pos">{i + 1}º</span>
                      <span className="rank-name" style={{ textTransform: 'capitalize' }}>{u.nome}</span>
                      <span className="rank-points">{Number(u.pontos || 0).toLocaleString('pt-BR')} pts</span>
                    </div>
                  ))
                )}
              </div>

              {isRankingHovered && (
                <div 
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '108%',
                    marginBottom: '10px',
                    zIndex: 150,
                    background: 'var(--bg-card)',
                    boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.4)',
                    borderRadius: '14px',
                    padding: '16px',
                    border: '1px solid var(--border-color)',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    animation: 'fadeIn 0.2s ease-out'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>CLASSIFICAÇÃO COMPLETA</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 'bold' }}>Clique p/ tabela</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {rankingDataCompleto.map((u, i) => (
                      <div 
                        key={`${u.nome}-${i}`} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '10px 12px', 
                          background: i === 0 ? 'var(--primary)' : 'var(--bg-main)', 
                          color: i === 0 ? '#ffffff' : 'var(--text-main)', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px', 
                          fontWeight: 'bold', 
                          fontSize: '0.85rem' 
                        }}
                      >
                        <span style={{ display: 'flex', gap: '8px', textTransform: 'capitalize' }}>
                          <span style={{ opacity: 0.7 }}>{i + 1}º</span> {u.nome}
                        </span>
                        <span style={{ color: i === 0 ? '#ffffff' : 'var(--text-main)' }}>
                          {Number(u.pontos || 0).toLocaleString('pt-BR')} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* BLOCO 4: MAIORES PEDIDOS */}
            <div 
              className="free-block bottom-zone" 
              style={{ position: 'relative', cursor: 'pointer' }}
              onMouseEnter={() => setIsTopOrdersExpanded(true)}
              onMouseLeave={() => setIsTopOrdersExpanded(false)}
              onClick={() => setIsModalTopOrdersOpen(true)}
            >
              <div className="kpi-header free-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={20} className="kpi-icon green" />
                  <h4>Maiores Pedidos</h4>
                </div>
                <ChevronDown 
                  size={18} 
                  color="#a0aec0" 
                  style={{ transform: isTopOrdersExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} 
                />
              </div>
              
              {loadingTopOrders ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '220px', color: 'var(--primary)' }}>
                  <Loader2 size={32} className="fa-spin" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : maioresPedidosBrutos.length === 0 ? (
                <div style={{ height: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#999', fontSize: '13px' }}>
                  Nenhum romaneio com caixas no período.
                </div>
              ) : (
                <>
                  <div style={{ height: '220px', width: '100%', marginTop: '10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={top5MaioresPedidos} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="romaneioCurto" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4a5568', fontWeight: 600}} width={85} />
                        <RechartsTooltip cursor={{fill: 'rgba(242, 101, 34, 0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Bar 
                          dataKey="caixas" 
                          fill="var(--secondary)" 
                          radius={[0, 6, 6, 0]} 
                          barSize={24}
                          isAnimationActive={true}
                          animationBegin={300}
                          animationDuration={1200}
                          animationEasing="ease-out"
                        >
                          {top5MaioresPedidos.map((e, i) => (
                            <Cell 
                              key={`top-order-${e.romaneioCurto}`} 
                              fill={i === 0 ? 'var(--secondary)' : 'rgba(242, 101, 34, 0.6)'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {isTopOrdersExpanded && (
                    <div style={{
                        position: 'absolute', bottom: '100%', left: '0', width: '100%', marginBottom: '10px',
                        zIndex: 100, background: 'var(--bg-card)', boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.4)',
                        borderRadius: '12px', padding: '15px', border: '1px solid var(--border-color)',
                        maxHeight: '350px', overflowY: 'auto'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 'bold' }}>
                        TOP 5 PEDIDOS (CLIQUE PARA DETALHES)
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {top5MaioresPedidos.map((p, i) => (
                           <div 
                             key={`${p.romaneioCurto}-${i}`} 
                             style={{ 
                               display: 'flex', 
                               justifyContent: 'space-between', 
                               padding: '12px', 
                               background: 'var(--bg-main)', 
                               color: 'var(--text-main)', 
                               border: '1px solid var(--border-color)',
                               borderRadius: '8px', 
                               fontWeight: 'bold', 
                               fontSize: '0.95rem' 
                             }}
                           >
                              <span style={{ display: 'flex', gap: '10px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{i + 1}º</span> {p.romaneioCurto}
                              </span>
                              <span style={{ color: 'var(--secondary)' }}>{p.caixas} cx</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        )}

        {/* MODAL DE HISTÓRICO */}
        {showHistoryModal && (
          <div className={`modal-overlay ${isClosingHistory ? 'modal-closing' : ''}`} onClick={() => !loadingDate && handleCloseHistory()}>
            <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><CalendarIcon size={20} color="var(--primary)" /> Histórico de Separação</h3>
                {!loadingDate && <button className="btn-close" onClick={handleCloseHistory}>×</button>}
              </div>
              {renderCalendar()}
            </div>
          </div>
        )}

        {/* MODAL DE MAIORES PEDIDOS */}
        {isModalTopOrdersOpen && (
          <div 
            className={`modal-overlay ${isClosingTopOrders ? 'modal-closing' : ''}`}
            onClick={handleCloseTopOrders}
            style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
              zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
          >
            <div 
              className="modal-container-window"
              style={{ 
                width: '90vw', height: '85vh', background: 'var(--bg-main)', 
                borderRadius: '16px', display: 'flex', flexDirection: 'column', 
                overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
              }} 
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: '20px 30px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}>TOP 10 PERÍODO</div>
                  <h2 style={{ marginTop: '8px', fontSize: '1.4rem', color: 'var(--text-main)', margin: 0 }}>Detalhamento de Maiores Pedidos</h2>
                </div>
                <button 
                  onClick={handleCloseTopOrders}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}
                >
                  <X size={28}/>
                </button>
              </div>

              <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ 
                      background: 'var(--bg-main)', 
                      color: 'var(--text-muted)', 
                      borderBottom: '2px solid var(--border-color)' 
                    }}>
                      <tr>
                        <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>Rank</th>
                        <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Cliente & Romaneio</th>
                        <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>Total Caixas</th>
                        <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>Total Produtos</th>
                        <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Responsáveis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maioresPedidosBrutos.slice(0, 10).map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '15px 20px', textAlign: 'center', fontWeight: 'bold', color: '#a0aec0' }}>{i + 1}º</td>
                          <td style={{ padding: '15px 20px', fontWeight: 'bold', color: 'var(--text-main)' }}>{p.nomeCompleto}</td>
                          <td style={{ padding: '15px 20px', textAlign: 'center', fontWeight: '900', color: 'var(--secondary)' }}>{p.caixas}</td>
                          <td style={{ padding: '15px 20px', textAlign: 'center', fontWeight: 'bold', color: '#3b82f6' }}>{p.totalItens}</td>
                          <td style={{ padding: '15px 20px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>{p.responsaveis}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE VOLUME ESTATÍSTICO */}
        <ModalVolumeDetalhado 
          showModal={modalVolumeAberto}
          setShowModal={setModalVolumeAberto}
          mesesResumo={volumeDataCompleto}
        />

        {/* MODAL DE FATURAMENTO DIÁRIO & ANUAL */}
        <ModalFaturamento 
          showModal={modalFaturamentoAberto}
          setShowModal={setModalFaturamentoAberto}
          dadosFaturamento={dadosFaturamento}
          isAdmin={isAdmin}
          user={user}
        />

        {/* MODAL DE RANKING GERAL DETALHADO */}
        <ModalRankingDetalhado 
          showModal={modalRankingAberto}
          setShowModal={setModalRankingAberto}
          rankingData={rankingDataCompleto}
          periodoInicio={startDate}
          periodoFim={endDate}
        />

      </div>
    </>
  );
}