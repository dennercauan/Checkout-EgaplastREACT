// src/components/PersonalDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, documentId, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
// Adicionamos o ChevronDown aqui
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, ChevronDown, LayoutDashboard, Clock, TrendingUp, Package, Award, BarChart2, Loader2, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import '../css/PersonalDashboard.css';
import { doc, getDoc } from 'firebase/firestore';
import ModalVolumeDetalhado from './ModalVolumeDetalhado'; // <-- Importe aqui
import { Tooltip as RechartsTooltip } from 'recharts';
import { CartesianGrid } from 'recharts';



export default function PersonalDashboard({ user, isAdmin }) {
  const navigate = useNavigate();
  const [estatisticasPeriodo, setEstatisticasPeriodo] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Modais (Mantivemos apenas o Histórico, pois calendário no hover seria ruim de usar)
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isClosingHistory, setIsClosingHistory] = useState(false);

  // Dentro do seu componente PersonalDashboard, crie o estado:
const [modalVolumeAberto, setModalVolumeAberto] = useState(false);
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [loadingDate, setLoadingDate] = useState(false);

  const [todayElement, setTodayElement] = useState(null);
  const todayTitle = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  // Estado para controlar o hover flutuante do card de média
  const [isMediaExpanded, setIsMediaExpanded] = useState(false);
  // Estado para controlar o hover flutuante do card de Maiores Pedidoss
  const [isTopOrdersExpanded, setIsTopOrdersExpanded] = useState(false);

  const [isModalTopOrdersOpen, setIsModalTopOrdersOpen] = useState(false);

  // --- NOVA LÓGICA: BUSCA DIRETA DOS MAIORES PEDIDOS ---
  const [maioresPedidosBrutos, setMaioresPedidosBrutos] = useState([]);
  const [loadingTopOrders, setLoadingTopOrders] = useState(false);

  // Estado para guardar o número do Card Principal
  const [meusPedidosCount, setMeusPedidosCount] = useState(0);
  const [loadingOperacao, setLoadingOperacao] = useState(false);

  // useEffect DO CARD PRINCIPAL
  useEffect(() => {
    const fetchOperacaoPrincipal = async () => {
      setLoadingOperacao(true);

      try {
        const dataHojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const qPedidos = query(
          collection(db, 'pedidos'),
          where('dataOperacao', '==', dataHojeStr) 
        );

        const snap = await getDocs(qPedidos);
        let contagem = 0;

        const meuNome = (user?.displayName || user?.email?.split('@')[0] || '').toLowerCase().trim();

        snap.forEach(docSnap => {
          const data = docSnap.data();

          if (isAdmin) {
            contagem++;
          } else {
            let souResponsavel = false;

            // Transforma o documento inteiro em texto minúsculo para buscar o seu nome ONDE QUER QUE ELE ESTEJA gravado
            const jsonStr = JSON.stringify(data).toLowerCase();

            if (jsonStr.includes(meuNome)) {
              souResponsavel = true;
            }

            // Conta se achou o seu nome e o pedido estiver efetivado (ou remova o "data.efetivado === true" se quiser contar mesmo em andamento)
            if (souResponsavel) {
              contagem++;
            }
          }
        });

        setMeusPedidosCount(contagem);
      } catch (error) {
        console.error("Erro ao buscar pedidos da operação principal:", error);
      } finally {
        setLoadingOperacao(false);
      }
    };

    fetchOperacaoPrincipal();
  }, [user, isAdmin]);

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
          
          // Filtra apenas pedidos com NF ou Minuta
          const temNfOuMinuta = (data.documentos || []).some(d => d.tipo === 'Nota Fiscal' || d.tipo === 'Minuta');
          if (!temNfOuMinuta) return;

          // Conta as caixas do pedido
          let totalCaixas = 0;
          (data.documentos || []).forEach(d => {
            totalCaixas += (d.caixas || []).length;
          });

          // Se tiver caixas, adiciona ao ranking
          if (totalCaixas > 0) {
            const nomeLoja = data.cliente || data.loja || data.nomeLoja || 'Loja não informada';
            const numRomaneio = data.romaneio || data.numeroRomaneio || docSnap.id.substring(0, 6);
            
            const romaneioCurto = `Rom. ${numRomaneio}`;
            const nomeCompleto = `${nomeLoja} (${romaneioCurto})`;
            
            const idUnico = docSnap.id; 

            if (!pedidosMap[idUnico]) {
              pedidosMap[idUnico] = { 
                romaneioCurto: romaneioCurto, 
                nomeCompleto: nomeCompleto, 
                caixas: 0, 
                responsaveis: new Set(), 
                totalItens: 0 
              };
            }
            
            pedidosMap[idUnico].caixas += totalCaixas;

            // Varre os documentos do pedido para pegar os Responsáveis e somar os produtos
            (data.documentos || []).forEach(d => {
              if (d.conferente) pedidosMap[idUnico].responsaveis.add(d.conferente);
              if (d.separador) pedidosMap[idUnico].responsaveis.add(d.separador);
              if (d.responsavel) pedidosMap[idUnico].responsaveis.add(d.responsavel);

              // Procura itens que estejam guardados dentro das caixas
              (d.caixas || []).forEach(caixa => {
                const itensCaixa = caixa.produtos || [];
                itensCaixa.forEach(item => {
                  // Pega a "quantidade" (ex: "12"), converte para número e soma.
                  const qtd = parseInt(item.quantidade, 10) || 0;
                  pedidosMap[idUnico].totalItens += qtd;
                });
              });
            });
          }
        });

        // Transforma o objeto em Array e passa as duas versões do nome
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
        console.error("Erro ao buscar maiores pedidos da raiz:", error);
      } finally {
        setLoadingTopOrders(false);
      }
    };

    fetchMaioresPedidos();
  }, [startDate, endDate]);

  useEffect(() => {
    if (!user) return;
    const elementsRef = collection(db, 'usuarios', user.uid, 'elementos');
    const qToday = query(elementsRef, where('titulo', '==', todayTitle));
    const unsubscribe = onSnapshot(qToday, (snapshot) => {
      if (!snapshot.empty) {
        setTodayElement({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setTodayElement(null);
      }
    });
    return () => unsubscribe();
  }, [user, todayTitle]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    setLoading(true);
    const qEstatisticas = query(collection(db, 'estatisticasDiarias'), where(documentId(), '>=', startDate), where(documentId(), '<=', endDate));
    const unsub = onSnapshot(qEstatisticas, (snap) => {
      setEstatisticasPeriodo(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsub();
  }, [startDate, endDate]);


  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  

  const handleDateClick = async (day) => {
    if (!day) return;
    setLoadingDate(true);
    const titleBusca = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    try {
      const q = query(collection(db, 'usuarios', user.uid, 'elementos'), where('titulo', '==', titleBusca));
      const snap = await getDocs(q);
      if (!snap.empty) navigate(`/elemento?id=${snap.docs[0].id}`);
      else alert(`Nenhum pedido encontrado no dia ${titleBusca}.`);
    } catch (error) {
      alert("Erro ao buscar histórico.");
    } finally {
      setLoadingDate(false);
    }
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

  const mediaDiariaDados = useMemo(() => {
    let total = 0, count = 0;
    
    // Soma os pedidos já consolidados na coleção de estatísticas
    estatisticasPeriodo.forEach(dia => {
      total += (dia.totalNfMinuta || dia.totalPedidos || 0);
    });

    // Calcula os dias úteis do período filtrado
    let curDate = new Date(`${startDate}T12:00:00`);
    let limitDate = new Date(`${endDate}T12:00:00`);
    const actualEnd = limitDate > today ? today : limitDate;
    
    while (curDate <= actualEnd) {
      const day = curDate.getDay();
      if (day !== 0 && day !== 6) count++; 
      curDate.setDate(curDate.getDate() + 1);
    }
    
    const diasUteis = count === 0 ? 1 : count;
    
    return { 
      totalPedidos: total, 
      diasUteis, 
      media: Math.round(total / diasUteis) 
    };
  }, [estatisticasPeriodo, startDate, endDate]);

  const rankingDataCompleto = useMemo(() => {
    const mapa = {};
    estatisticasPeriodo.forEach(dia => {
      if (dia.ranking) Object.keys(dia.ranking).forEach(nome => { mapa[nome] = (mapa[nome] || 0) + dia.ranking[nome]; });
    });
    return Object.keys(mapa).map(nome => ({ nome, pontos: mapa[nome] })).sort((a, b) => b.pontos - a.pontos);
  }, [estatisticasPeriodo]);

  const topOrdersDataCompleto = useMemo(() => {
    const pedidos = [];
    estatisticasPeriodo.forEach(dia => {
      if (dia.registrosPedidos) Object.keys(dia.registrosPedidos).forEach(romaneio => {
        pedidos.push({ pedido: romaneio, caixas: dia.registrosPedidos[romaneio] });
      });
    });
    return pedidos.length === 0 ? [] : pedidos.sort((a, b) => b.caixas - a.caixas);
  }, [estatisticasPeriodo]);

  

  const handleAccessToday = async () => {
    if (todayElement) navigate(`/elemento?id=${todayElement.id}`);
    else {
      try {
        const docRef = await addDoc(collection(db, 'usuarios', user.uid, 'elementos'), { titulo: todayTitle, createdAt: serverTimestamp(), contagemDocumentos: 0 });
        navigate(`/elemento?id=${docRef.id}`);
      } catch (e) { console.error(e); }
    }
  };

  // NOVO ESTADO DIRETO PRO GRÁFICO
  const [volumeDataCompleto, setVolumeDataCompleto] = useState([]);

  useEffect(() => {
    const fetchVolumeMensal = async () => {
      const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const ultimosMeses = [];
      const dataAtual = new Date();

      // Monta o esqueleto vazio dos últimos 3 meses (ex: Maio, Junho, Julho)
      for (let i = 2; i >= 0; i--) {
        const d = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - i, 1);
        const idMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        ultimosMeses.push({
          id: idMes,
          chaveBusca: idMes,
          mes: mesesNomes[d.getMonth()],
          ano: d.getFullYear(),
          pedidos: 0, 
          caixas: 0
        });
      }

      try {
        // Dispara as 4 consultas simultaneamente (CUSTO TOTAL: 4 Reads!)
        const promessas = ultimosMeses.map(m => getDoc(doc(db, 'estatisticasMensais', m.id)));
        const snaps = await Promise.all(promessas);

        snaps.forEach((snap, index) => {
          if (snap.exists()) {
            const data = snap.data();
            // Puxa exatamente o campo onde vamos salvar os pedidos válidos (NF/Minuta)
            ultimosMeses[index].pedidos = data.totalNfMinuta || 0;
            ultimosMeses[index].caixas = data.totalCaixas || 0;
          }
        });

        setVolumeDataCompleto(ultimosMeses);
      } catch (error) {
        console.error("Erro ao buscar estatísticas mensais:", error);
      }
    };

    fetchVolumeMensal();
  }, []); // Executa apenas 1x ao carregar a página

  const getDayOfWeek = () => ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][today.getDay()];

  const handleCloseHistory = () => {
    if (isClosingHistory) return;
    setIsClosingHistory(true);
    setTimeout(() => {
      setShowHistoryModal(false);
      setIsClosingHistory(false); 
    }, 400); 
  };

  const dataHojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const estatisticaDeHoje = estatisticasPeriodo.find(dia => dia.id === dataHojeStr);
  const totalGlobalHoje = estatisticaDeHoje ? estatisticaDeHoje.totalPedidos : 0;
  const heroElement = todayElement || { contagemDocumentos: 0 };

  return (
    <div className="dashboard-wrapper">
      <div className="dash-header-container">
        <div className="dash-title-area">
          <LayoutDashboard size={28} className="title-icon" />
          <h2>Central de Operações</h2>
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
           <i className="fa-solid fa-circle-notch fa-spin"></i> Processando inteligência de dados...
        </div>
      ) : (
        <div className="dashboard-free-layout">
          
          <div className="hero-card" style={isAdmin ? { boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)' } : {}}>
            <div className="hero-content">
              <div className="hero-badge" style={isAdmin ? { background: 'rgba(242, 101, 34, 0.9)' } : {}}>
                {isAdmin ? 'OPERAÇÃO GLOBAL - HOJE' : 'SUA OPERAÇÃO - HOJE'}
              </div>
              <h2 className="hero-title">{getDayOfWeek()}</h2>
              <div className="hero-stats">
                <div className="stat-box">
                  {/* Card Principal - Substitua o trecho do número por este: */}
          <h1 style={{ fontSize: '4rem', margin: '0', lineHeight: '1.2' }}>
            {loadingOperacao ? (
              <Loader2 className="fa-spin" size={48} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              meusPedidosCount
            )}
          </h1>
                  <span className="stat-label">{isAdmin ? 'Total de Pedidos Processados' : 'Meus Pedidos Hoje'}</span>
                </div>
              </div>
              <div className="hero-footer">
                <div className="hero-date">{todayTitle}/{today.getFullYear()}</div>
                <button className="btn-access hero-btn" onClick={() => isAdmin ? navigate(`/operacao-adm`) : handleAccessToday()}>
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
            {/* Adicionamos layout="vertical" para as barras deitarem */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeDataCompleto} layout="vertical" margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                {/* Linhas de grade apenas na vertical como no seu exemplo */}
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis type="number" hide />
                <YAxis dataKey="mes" type="category" tick={{ fill: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={60} />
                <RechartsTooltip 
  cursor={false} 
  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
/>
                {/* Barras duplas com as cores do seu modelo */}
                <Bar dataKey="caixas" name="Caixas" fill="#c4709d" barSize={8} radius={[0, 4, 4, 0]} />
                <Bar dataKey="pedidos" name="Pedidos" fill="#0273a3" barSize={8} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

          {/* BLOCK 2: MÉDIA */}
          <div 
            className="free-block media-zone" 
            style={{ position: 'relative', cursor: 'pointer' }}
            onMouseEnter={() => setIsMediaExpanded(true)}
            onMouseLeave={() => setIsMediaExpanded(false)}
          >
            <div className="kpi-header free-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} className="kpi-icon orange" />
                <h4>Média Diária</h4>
              </div>
              <ChevronDown 
                size={18} 
                color="#a0aec0" 
                style={{ transform: isMediaExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} 
              />
            </div>
            
            <div className="kpi-value large-value">{mediaDiariaDados.media}</div>
            <div className="kpi-trend neutral" style={{ marginTop: '5px' }}>Pedidos processados / dia</div>
            
            {/* Popover Flutuante (Renderizado apenas no Hover) */}
            {isMediaExpanded && (
              <div style={{
                  position: 'absolute',
                  bottom: '100%', // Faz o balão nascer no topo do card e expandir para cima
                  left: '0',
                  width: '100%',
                  marginBottom: '10px', // Um pequeno espaço entre o balão e o card
                  zIndex: 100, // Garante que flutue acima dos outros cards
                  background: 'var(--bg-card, #ffffff)',
                  boxShadow: '0 -10px 30px rgba(0,0,0,0.15)', // Sombra projetada para cima
                  borderRadius: '12px',
                  padding: '15px',
                  border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Total de Pedidos:</span>
                    <strong style={{ fontSize: '1.1rem' }}>{mediaDiariaDados.totalPedidos}</strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Dias Úteis:</span>
                    <strong style={{ fontSize: '1.1rem' }}>{mediaDiariaDados.diasUteis} dias</strong>
                  </div>
                  <div style={{ background: 'var(--primary)', color: '#fff', padding: '15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Média Final:</span>
                    <strong style={{ fontSize: '1.2rem' }}>{mediaDiariaDados.media} p/d</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BLOCK 3: RANKING */}
          <div className="free-block ranking-zone expandable-card">
            <div className="kpi-header free-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Award size={20} className="kpi-icon gold" /><h4>Ranking Global</h4></div>
              <ChevronDown size={18} color="#a0aec0" className="expand-icon" />
            </div>
            <div className="ranking-list free-list">
              {rankingDataCompleto.slice(0, 5).length === 0 ? <div style={{color: '#999', fontSize: '13px'}}>Nenhum dado no período.</div> : rankingDataCompleto.slice(0, 5).map((u, i) => (
                <div key={`${u.nome}-${i}`} className={`ranking-row ${i === 0 ? 'first' : 'shadow-sm'}`}>
                  <span className="rank-pos">{i + 1}º</span><span className="rank-name">{u.nome}</span><span className="rank-points">{u.pontos.toFixed(0)} pts</span></div>
              ))}
            </div>

            <div className="card-expansion">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px', fontWeight: 'bold' }}>LISTA COMPLETA DO PERÍODO</div>
              {rankingDataCompleto.map((u, i) => (
                 <div key={`${u.nome}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: i === 0 ? 'var(--primary)' : '#f8fafc', color: i === 0 ? '#fff' : 'var(--text-main)', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    <span style={{ display: 'flex', gap: '10px' }}><span style={{ opacity: 0.7 }}>{i + 1}º</span>{u.nome}</span><span>{u.pontos.toFixed(0)} pts</span>
                 </div>
              ))}
            </div>
          </div>

          {/* BLOCK 4: TOP PEDIDOS */}
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
                    <BarChart data={maioresPedidosBrutos.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      {/* Voltamos o width para 85, pois o nome ficou curtinho novamente */}
                      <YAxis dataKey="romaneioCurto" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4a5568', fontWeight: 600}} width={85} />
                      <Tooltip cursor={{fill: 'rgba(242, 101, 34, 0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="caixas" fill="var(--secondary)" radius={[0, 6, 6, 0]} barSize={24}>
                         {maioresPedidosBrutos.slice(0, 5).map((e, i) => <Cell key={`cell-${i}`} fill={i === 0 ? 'var(--secondary)' : 'rgba(242, 101, 34, 0.6)'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {isTopOrdersExpanded && (
                  <div style={{
                      position: 'absolute', bottom: '100%', left: '0', width: '100%', marginBottom: '10px',
                      zIndex: 100, background: 'var(--bg-card, #ffffff)', boxShadow: '0 -10px 30px rgba(0,0,0,0.15)',
                      borderRadius: '12px', padding: '15px', border: '1px solid var(--border-color)',
                      maxHeight: '350px', overflowY: 'auto'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 'bold' }}>
                      TOP 5 PEDIDOS (CLIQUE PARA DETALHES)
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {maioresPedidosBrutos.slice(0, 5).map((p, i) => (
                         <div key={`${p.romaneioCurto}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem' }}>
                            <span style={{ display: 'flex', gap: '10px' }}>
                              <span style={{ color: '#a0aec0' }}>{i + 1}º</span> {p.romaneioCurto}
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
          {/* ... FINAL DO SEU BLOCK 4 ... */}
          
        </div>
      )} {/* <-- Esse fecha a verificação do if(!loading) */}

      {/* MODAL DE HISTÓRICO (Mantido por ser interativo) */}
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

      

      {/* MODAL DE VOLUME ESTATÍSTICO */}
      <ModalVolumeDetalhado 
        showModal={modalVolumeAberto}
        setShowModal={setModalVolumeAberto}
        mesesResumo={volumeDataCompleto}
      />
{/* MODAL DE MAIORES PEDIDOS (FULLSCREEN TABELA) */}
      {isModalTopOrdersOpen && (
        <div 
          onClick={() => setIsModalTopOrdersOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}
        >
          <div 
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
                onClick={() => setIsModalTopOrdersOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}
              >
                <X size={28}/>
              </button>
            </div>

            <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <tr>
                      <th style={{ padding: '15px 20px', width: '80px', textAlign: 'center' }}>Rank</th>
                      <th style={{ padding: '15px 20px' }}>Cliente & Romaneio</th>
                      <th style={{ padding: '15px 20px', width: '150px', textAlign: 'center' }}>Total Caixas</th>
                      <th style={{ padding: '15px 20px', width: '150px', textAlign: 'center' }}>Total Produtos</th>
                      <th style={{ padding: '15px 20px' }}>Responsáveis</th>
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

    </div>
  );
}