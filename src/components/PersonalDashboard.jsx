// src/components/PersonalDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, documentId, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Folder, Calendar as CalendarIcon, ChevronRight, ChevronLeft, LayoutDashboard, Clock, TrendingUp, Package, Award, BarChart2, Maximize2, Users, FileText, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import '../css/PersonalDashboard.css';

export default function PersonalDashboard({ user, isAdmin }) {
  const navigate = useNavigate();

  // Estados Globais (Gráficos e Inteligência)
  const [estatisticasPeriodo, setEstatisticasPeriodo] = useState([]); 
  const [estatisticasVolume, setEstatisticasVolume] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Controle de Modais
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeModal, setActiveModal] = useState(null); 
  
  // Controle de Datas Base
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  
  // Controle do Calendário de Histórico
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [loadingDate, setLoadingDate] = useState(false);

  // ==========================================
  // 1. BUSCA PESSOAL OTIMIZADA (Apenas HOJE)
  // ==========================================
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

  // ==========================================
  // 2. BUSCA GLOBAL (Período)
  // ==========================================
  useEffect(() => {
    if (!startDate || !endDate) return;
    setLoading(true);

    const qEstatisticas = query(
      collection(db, 'estatisticasDiarias'),
      where(documentId(), '>=', startDate),
      where(documentId(), '<=', endDate)
    );

    const unsub = onSnapshot(qEstatisticas, (snap) => {
      const stats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEstatisticasPeriodo(stats);
      setLoading(false);
    }, (error) => {
      console.error("Erro na busca de estatísticas:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [startDate, endDate]);

  // ==========================================
  // 3. BUSCA GLOBAL (Volume 4 Meses)
  // ==========================================
  useEffect(() => {
    const hoje = new Date();
    const quatroMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1);
    const dataStr = quatroMesesAtras.toISOString().split('T')[0];

    const qVol = query(
      collection(db, 'estatisticasDiarias'),
      where(documentId(), '>=', dataStr)
    );

    const unsub = onSnapshot(qVol, (snap) => {
      const stats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEstatisticasVolume(stats);
    });

    return () => unsub();
  }, []);

  // ==========================================
  // LÓGICA DO CALENDÁRIO INTERATIVO
  // ==========================================
  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  const handleDateClick = async (day) => {
    if (!day) return;
    setLoadingDate(true);
    
    const clickedDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    const titleBusca = clickedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    try {
      const elementsRef = collection(db, 'usuarios', user.uid, 'elementos');
      const q = query(elementsRef, where('titulo', '==', titleBusca));
      const snap = await getDocs(q); // LÊ O BANCO APENAS AQUI (Custo: 1 leitura)

      if (!snap.empty) {
        navigate(`/elemento?id=${snap.docs[0].id}`);
      } else {
        alert(`Nenhuma operação de separação encontrada na sua conta para o dia ${titleBusca}.`);
      }
    } catch (error) {
      console.error("Erro ao buscar elemento pela data:", error);
      alert("Houve um erro ao buscar o histórico desta data.");
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
              <div
                key={i}
                className={`calendar-day ${d ? 'active' : 'empty'} ${isToday ? 'is-today' : ''}`}
                onClick={() => handleDateClick(d)}
              >
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


  // ==========================================
  // INTELIGÊNCIA MATEMÁTICA
  // ==========================================
  const mediaDiariaDados = useMemo(() => {
    let totalPedidosPeriodo = 0;
    estatisticasPeriodo.forEach(dia => totalPedidosPeriodo += (dia.totalPedidos || 0));

    let count = 0;
    let curDate = new Date(`${startDate}T12:00:00`);
    const limitDate = new Date(`${endDate}T12:00:00`);
    const actualEnd = limitDate > today ? today : limitDate;

    while (curDate <= actualEnd) {
      const day = curDate.getDay();
      if (day !== 0 && day !== 6) count++; 
      curDate.setDate(curDate.getDate() + 1);
    }
    const diasUteis = count === 0 ? 1 : count;
    
    return {
      totalPedidos: totalPedidosPeriodo,
      diasUteis: diasUteis,
      media: Math.round(totalPedidosPeriodo / diasUteis)
    };
  }, [estatisticasPeriodo, startDate, endDate]);

  const rankingDataCompleto = useMemo(() => {
    const mapa = {};
    estatisticasPeriodo.forEach(dia => {
      if (dia.ranking) {
        Object.keys(dia.ranking).forEach(nome => {
          if (!mapa[nome]) mapa[nome] = 0;
          mapa[nome] += dia.ranking[nome];
        });
      }
    });

    return Object.keys(mapa)
      .map(nome => ({ nome, pontos: mapa[nome] }))
      .sort((a, b) => b.pontos - a.pontos);
  }, [estatisticasPeriodo]);

  const topOrdersDataCompleto = useMemo(() => {
    const todosOsPedidos = [];
    estatisticasPeriodo.forEach(dia => {
      if (dia.registrosPedidos) {
        Object.keys(dia.registrosPedidos).forEach(romaneio => {
          todosOsPedidos.push({
            pedido: romaneio,
            caixas: dia.registrosPedidos[romaneio]
          });
        });
      }
    });

    if (todosOsPedidos.length === 0) return [];
    return todosOsPedidos.sort((a, b) => b.caixas - a.caixas);
  }, [estatisticasPeriodo]);

  const volumeDataCompleto = useMemo(() => {
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const ultimos4Meses = [];
    const hoje = new Date();

    for (let i = 3; i >= 0; i--) {
      const dataAlvo = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      ultimos4Meses.push({
        chaveBusca: `${dataAlvo.getFullYear()}-${String(dataAlvo.getMonth() + 1).padStart(2, '0')}`,
        mes: mesesNomes[dataAlvo.getMonth()],
        ano: dataAlvo.getFullYear(),
        pedidos: 0,
        caixas: 0
      });
    }

    estatisticasVolume.forEach(dia => {
      if (!dia.id) return;
      const prefix = dia.id.substring(0, 7); 
      const mesIndex = ultimos4Meses.findIndex(m => m.chaveBusca === prefix);

      if (mesIndex !== -1) {
        ultimos4Meses[mesIndex].pedidos += (dia.totalPedidos || 0);
        ultimos4Meses[mesIndex].caixas += (dia.volumeCaixas || 0);
      }
    });

    return ultimos4Meses;
  }, [estatisticasVolume]);

  const rankingTop5 = rankingDataCompleto.slice(0, 5);
  const topOrdersTop5 = topOrdersDataCompleto.length > 0 ? topOrdersDataCompleto.slice(0, 5) : [{ pedido: 'Sem dados no período', caixas: 0 }];

  // ==========================================
  // CARD DE HOJE
  // ==========================================
  const heroElement = todayElement || { isPlaceholder: true, titulo: todayTitle, contagemDocumentos: 0, createdAt: null };

  const handleAccessToday = async () => {
    if (todayElement) {
      navigate(`/elemento?id=${todayElement.id}`);
    } else {
      try {
        const docRef = await addDoc(collection(db, 'usuarios', user.uid, 'elementos'), {
          titulo: todayTitle,
          createdAt: serverTimestamp(),
          contagemDocumentos: 0
        });
        navigate(`/elemento?id=${docRef.id}`);
      } catch (error) {
        console.error("Erro ao criar pasta:", error);
      }
    }
  };

  const getDayOfWeek = () => {
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return dias[today.getDay()];
  };

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
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="date-input" />
            <span className="date-separator">até</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="date-input" />
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
          
          <div className="hero-card">
            <div className="hero-content">
              <div className="hero-badge">SUA OPERAÇÃO - HOJE</div>
              <h2 className="hero-title">{getDayOfWeek()}</h2>
              <div className="hero-stats">
                <div className="stat-box">
                  <span className="stat-number">{heroElement.contagemDocumentos || 0}</span>
                  <span className="stat-label">Meus Pedidos Hoje</span>
                </div>
              </div>
              <div className="hero-footer">
                <div className="hero-date">{todayTitle}/{today.getFullYear()}</div>
                <button className="btn-access hero-btn" onClick={handleAccessToday}>
                  Acessar Minha Pasta <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="free-block volume-zone" style={{ cursor: 'pointer', transition: '0.2s' }} onClick={() => setActiveModal('volume')}>
            <div className="kpi-header free-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} className="kpi-icon blue" />
                <div>
                  <h4>Volume Global Mensal</h4>
                  <span className="kpi-trend positive"><TrendingUp size={12} /> Desempenho base</span>
                </div>
              </div>
              <Maximize2 size={16} color="#a0aec0" title="Expandir Detalhes" />
            </div>
            <div style={{ height: '120px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeDataCompleto}>
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a0aec0'}} />
                  <Tooltip cursor={{fill: 'rgba(13, 50, 105, 0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}/>
                  <Bar dataKey="pedidos" radius={[6, 6, 0, 0]}>
                    {volumeDataCompleto.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === volumeDataCompleto.length - 1 ? 'var(--primary)' : '#dbe4f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="free-block media-zone" style={{ cursor: 'pointer', transition: '0.2s' }} onClick={() => setActiveModal('media')}>
            <div className="kpi-header free-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} className="kpi-icon orange" />
                <h4>Média Diária Global</h4>
              </div>
              <Maximize2 size={16} color="#a0aec0" />
            </div>
            <div className="kpi-value large-value">{mediaDiariaDados.media}</div>
            <div className="kpi-trend neutral" style={{ marginTop: '5px' }}>Pedidos processados / dia</div>
          </div>

          <div className="free-block ranking-zone" style={{ cursor: 'pointer', transition: '0.2s' }} onClick={() => setActiveModal('ranking')}>
            <div className="kpi-header free-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} className="kpi-icon gold" />
                <h4>Ranking Global do Período</h4>
              </div>
              <Maximize2 size={16} color="#a0aec0" />
            </div>
            <div className="ranking-list free-list">
              {rankingTop5.length === 0 ? (
                <div style={{color: '#999', fontSize: '13px'}}>Nenhum dado no período.</div>
              ) : (
                rankingTop5.map((user, index) => (
                  <div key={user.nome} className={`ranking-row ${index === 0 ? 'first' : 'shadow-sm'}`}>
                    <span className="rank-pos">{index + 1}º</span>
                    <span className="rank-name">{user.nome}</span>
                    <span className="rank-points">{user.pontos.toFixed(0)} pts</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="free-block bottom-zone" style={{ cursor: 'pointer', transition: '0.2s' }} onClick={() => setActiveModal('topOrders')}>
            <div className="kpi-header free-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={20} className="kpi-icon green" />
                <h4>Maiores Pedidos Globais (Caixas)</h4>
              </div>
              <Maximize2 size={16} color="#a0aec0" />
            </div>
            <div style={{ height: '220px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topOrdersTop5} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="pedido" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4a5568', fontWeight: 600}} width={100} />
                  <Tooltip cursor={{fill: 'rgba(242, 101, 34, 0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="caixas" fill="var(--secondary)" radius={[0, 6, 6, 0]} barSize={24}>
                     {topOrdersTop5.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--secondary)' : 'rgba(242, 101, 34, 0.6)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* MODAL: CALENDÁRIO DE DATAS PASSADAS */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => !loadingDate && setShowHistoryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarIcon size={20} color="var(--primary)" /> Histórico de Separação
              </h3>
              {!loadingDate && <button className="btn-close" onClick={() => setShowHistoryModal(false)}>×</button>}
            </div>
            {renderCalendar()}
          </div>
        </div>
      )}

      {/* MODAIS DE GRÁFICOS (Mantidos iguais) */}
      {activeModal && (
        <div className="modal-overlay-search" onClick={() => setActiveModal(null)}>
          <div className="modal-content-search" style={{ maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            
            <div className="search-modal-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '15px' }}>
              <div style={{ background: 'rgba(13, 50, 105, 0.05)', padding: '12px', borderRadius: '12px' }}>
                {activeModal === 'ranking' && <Users size={28} color="var(--primary)" />}
                {activeModal === 'topOrders' && <FileText size={28} color="var(--primary)" />}
                {activeModal === 'media' && <TrendingUp size={28} color="var(--primary)" />}
                {activeModal === 'volume' && <Package size={28} color="var(--primary)" />}
              </div>
              <div>
                <h2 className="search-title" style={{ fontSize: '1.4rem' }}>
                  {activeModal === 'ranking' && 'Ranking Completo'}
                  {activeModal === 'topOrders' && 'Todos os Romaneios do Período'}
                  {activeModal === 'media' && 'Matemática da Média Diária'}
                  {activeModal === 'volume' && 'Detalhamento Mensal'}
                </h2>
                <div className="search-badge" style={{ marginTop: '5px', marginBottom: 0 }}>Visão Expandida</div>
              </div>
              <button className="btn-close-search" style={{ top: '25px' }} onClick={() => setActiveModal(null)}>×</button>
            </div>

            <div className="search-modal-body" style={{ overflowY: 'auto', padding: '0 30px 30px 30px', margin: 0, gap: '10px' }}>
              
              {activeModal === 'ranking' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {rankingDataCompleto.length === 0 ? <p>Sem dados.</p> : rankingDataCompleto.map((user, index) => (
                    <div key={user.nome} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: index === 0 ? 'var(--primary)' : '#f8fafc', color: index === 0 ? '#fff' : 'var(--text-main)', borderRadius: '10px', fontWeight: 'bold' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>{index + 1}º</span>
                        {user.nome}
                      </span>
                      <span>{user.pontos.toFixed(0)} pontos</span>
                    </div>
                  ))}
                </div>
              )}

              {activeModal === 'topOrders' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {topOrdersDataCompleto.length === 0 ? <p>Sem romaneios faturados.</p> : topOrdersDataCompleto.map((pedido, index) => (
                    <div key={pedido.pedido} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#f8fafc', borderRadius: '10px', fontWeight: 'bold' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ color: '#a0aec0', fontSize: '0.9rem' }}>{index + 1}º</span>
                        Romaneio {pedido.pedido}
                      </span>
                      <span style={{ color: 'var(--secondary)' }}>{pedido.caixas} caixas</span>
                    </div>
                  ))}
                </div>
              )}

              {activeModal === 'media' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Total de Pedidos no Período:</span>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{mediaDiariaDados.totalPedidos}</strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Dias Úteis Calculados (Seg-Sex):</span>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{mediaDiariaDados.diasUteis} dias</strong>
                  </div>
                  <div style={{ background: 'var(--primary)', color: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                    <span style={{ fontWeight: 600 }}>Média Final:</span>
                    <strong style={{ fontSize: '1.5rem' }}>{mediaDiariaDados.media} pedidos/dia</strong>
                  </div>
                </div>
              )}

              {activeModal === 'volume' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '10px' }}>Resumo exato do volume faturado nos últimos 4 meses.</p>
                  {volumeDataCompleto.map((mes, index) => (
                    <div key={mes.chaveBusca} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#f8fafc', borderRadius: '10px', fontWeight: 'bold' }}>
                      <span style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{mes.mes} / {mes.ano}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-main)' }}>{mes.pedidos} pedidos</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}