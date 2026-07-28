// src/components/PersonalDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, documentId, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
// Adicionamos o ChevronDown aqui
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, ChevronDown, LayoutDashboard, Clock, TrendingUp, Package, Award, BarChart2, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import '../css/PersonalDashboard.css';

export default function PersonalDashboard({ user, isAdmin }) {
  const navigate = useNavigate();

  const [estatisticasPeriodo, setEstatisticasPeriodo] = useState([]); 
  const [estatisticasVolume, setEstatisticasVolume] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Modais (Mantivemos apenas o Histórico, pois calendário no hover seria ruim de usar)
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isClosingHistory, setIsClosingHistory] = useState(false);
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [loadingDate, setLoadingDate] = useState(false);

  const [todayElement, setTodayElement] = useState(null);
  const todayTitle = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

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

  useEffect(() => {
    const dataStr = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().split('T')[0];
    const qVol = query(collection(db, 'estatisticasDiarias'), where(documentId(), '>=', dataStr));
    const unsub = onSnapshot(qVol, (snap) => setEstatisticasVolume(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsub();
  }, []);

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
    estatisticasPeriodo.forEach(dia => total += (dia.totalPedidos || 0));
    let curDate = new Date(`${startDate}T12:00:00`), limitDate = new Date(`${endDate}T12:00:00`);
    const actualEnd = limitDate > today ? today : limitDate;
    while (curDate <= actualEnd) {
      const day = curDate.getDay();
      if (day !== 0 && day !== 6) count++; 
      curDate.setDate(curDate.getDate() + 1);
    }
    const diasUteis = count === 0 ? 1 : count;
    return { totalPedidos: total, diasUteis, media: Math.round(total / diasUteis) };
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

  const volumeDataCompleto = useMemo(() => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], result = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      result.push({ chaveBusca: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, mes: meses[d.getMonth()], ano: d.getFullYear(), pedidos: 0, caixas: 0 });
    }
    estatisticasVolume.forEach(dia => {
      if (!dia.id) return;
      const index = result.findIndex(m => m.chaveBusca === dia.id.substring(0, 7));
      if (index !== -1) {
        result[index].pedidos += (dia.totalPedidos || 0);
        result[index].caixas += (dia.volumeCaixas || 0);
      }
    });
    return result;
  }, [estatisticasVolume]);

  const handleAccessToday = async () => {
    if (todayElement) navigate(`/elemento?id=${todayElement.id}`);
    else {
      try {
        const docRef = await addDoc(collection(db, 'usuarios', user.uid, 'elementos'), { titulo: todayTitle, createdAt: serverTimestamp(), contagemDocumentos: 0 });
        navigate(`/elemento?id=${docRef.id}`);
      } catch (e) { console.error(e); }
    }
  };

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
          
          <div className="hero-card" style={isAdmin ? { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.3)' } : {}}>
            <div className="hero-content">
              <div className="hero-badge" style={isAdmin ? { background: 'rgba(242, 101, 34, 0.9)' } : {}}>
                {isAdmin ? 'OPERAÇÃO GLOBAL - HOJE' : 'SUA OPERAÇÃO - HOJE'}
              </div>
              <h2 className="hero-title">{getDayOfWeek()}</h2>
              <div className="hero-stats">
                <div className="stat-box">
                  <span className="stat-number">{isAdmin ? totalGlobalHoje : (heroElement.contagemDocumentos || 0)}</span>
                  <span className="stat-label">{isAdmin ? 'Total de Pedidos Processados' : 'Meus Pedidos Hoje'}</span>
                </div>
              </div>
              <div className="hero-footer">
                <div className="hero-date">{todayTitle}/{today.getFullYear()}</div>
                <button className="btn-access hero-btn" onClick={() => isAdmin ? navigate(`/visao-geral`) : handleAccessToday()}>
                  {isAdmin ? 'Ver Todos os Pedidos' : 'Acessar Minha Pasta'} <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* BLOCK 1: VOLUME */}
          <div className="free-block volume-zone expandable-card">
            <div className="kpi-header free-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={20} className="kpi-icon blue" />
                <div><h4>Volume Mensal</h4></div>
              </div>
              <ChevronDown size={18} color="#a0aec0" className="expand-icon" />
            </div>
            <div style={{ height: '120px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeDataCompleto}>
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a0aec0'}} />
                  <Tooltip cursor={{fill: 'rgba(13, 50, 105, 0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}/>
                  <Bar dataKey="pedidos" radius={[6, 6, 0, 0]}>
                    {volumeDataCompleto.map((entry, i) => <Cell key={i} fill={i === volumeDataCompleto.length - 1 ? 'var(--primary)' : '#dbe4f0'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* O SEGREDO DO HOVER: A expansão escondida */}
            <div className="card-expansion">
              {volumeDataCompleto.map(m => (
                 <div key={m.chaveBusca} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontWeight: 'bold' }}>
                    <span style={{ color: 'var(--primary)' }}>{m.mes} / {m.ano}</span><div>{m.pedidos} pedidos</div>
                 </div>
              ))}
            </div>
          </div>

          {/* BLOCK 2: MÉDIA */}
          <div className="free-block media-zone expandable-card">
            <div className="kpi-header free-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={20} className="kpi-icon orange" /><h4>Média Diária</h4></div>
              <ChevronDown size={18} color="#a0aec0" className="expand-icon" />
            </div>
            <div className="kpi-value large-value">{mediaDiariaDados.media}</div>
            <div className="kpi-trend neutral" style={{ marginTop: '5px' }}>Pedidos processados / dia</div>
            
            <div className="card-expansion">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 600 }}>Total de Pedidos:</span><strong style={{ fontSize: '1.1rem' }}>{mediaDiariaDados.totalPedidos}</strong></div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 600 }}>Dias Úteis:</span><strong style={{ fontSize: '1.1rem' }}>{mediaDiariaDados.diasUteis} dias</strong></div>
                <div style={{ background: 'var(--primary)', color: '#fff', padding: '15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 600 }}>Média Final:</span><strong style={{ fontSize: '1.2rem' }}>{mediaDiariaDados.media} p/d</strong></div>
              </div>
            </div>
          </div>

          {/* BLOCK 3: RANKING */}
          <div className="free-block ranking-zone expandable-card">
            <div className="kpi-header free-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Award size={20} className="kpi-icon gold" /><h4>Ranking Global</h4></div>
              <ChevronDown size={18} color="#a0aec0" className="expand-icon" />
            </div>
            <div className="ranking-list free-list">
              {rankingDataCompleto.slice(0, 5).length === 0 ? <div style={{color: '#999', fontSize: '13px'}}>Nenhum dado no período.</div> : rankingDataCompleto.slice(0, 5).map((u, i) => (
                <div key={u.nome} className={`ranking-row ${i === 0 ? 'first' : 'shadow-sm'}`}><span className="rank-pos">{i + 1}º</span><span className="rank-name">{u.nome}</span><span className="rank-points">{u.pontos.toFixed(0)} pts</span></div>
              ))}
            </div>

            <div className="card-expansion">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px', fontWeight: 'bold' }}>LISTA COMPLETA DO PERÍODO</div>
              {rankingDataCompleto.map((u, i) => (
                 <div key={u.nome} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: i === 0 ? 'var(--primary)' : '#f8fafc', color: i === 0 ? '#fff' : 'var(--text-main)', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    <span style={{ display: 'flex', gap: '10px' }}><span style={{ opacity: 0.7 }}>{i + 1}º</span>{u.nome}</span><span>{u.pontos.toFixed(0)} pts</span>
                 </div>
              ))}
            </div>
          </div>

          {/* BLOCK 4: TOP PEDIDOS */}
          <div className="free-block bottom-zone expandable-card">
            <div className="kpi-header free-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart2 size={20} className="kpi-icon green" /><h4>Maiores Pedidos</h4></div>
              <ChevronDown size={18} color="#a0aec0" className="expand-icon" />
            </div>
            <div style={{ height: '220px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topOrdersDataCompleto.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="pedido" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4a5568', fontWeight: 600}} width={100} />
                  <Tooltip cursor={{fill: 'rgba(242, 101, 34, 0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="caixas" fill="var(--secondary)" radius={[0, 6, 6, 0]} barSize={24}>
                     {topOrdersDataCompleto.slice(0, 5).map((e, i) => <Cell key={i} fill={i === 0 ? 'var(--secondary)' : 'rgba(242, 101, 34, 0.6)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card-expansion">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px', fontWeight: 'bold' }}>TODOS OS PEDIDOS</div>
              {topOrdersDataCompleto.map((p, i) => (
                 <div key={p.pedido} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    <span style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#a0aec0' }}>{i + 1}º</span>Rom. {p.pedido}</span><span style={{ color: 'var(--secondary)' }}>{p.caixas} cx</span>
                 </div>
              ))}
            </div>
          </div>

        </div>
      )}

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

    </div>
  );
}