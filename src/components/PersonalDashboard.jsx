// src/components/PersonalDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Folder, Calendar, ChevronRight, LayoutDashboard, Clock, TrendingUp, Package, Award, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import '../css/PersonalDashboard.css';

export default function PersonalDashboard({ user }) {
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Datas de controle
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  
  const navigate = useNavigate();

  // 1. BUSCA DOS DIAS DE OPERAÇÃO
  useEffect(() => {
    if (!user) return;
    const elementsRef = collection(db, 'usuarios', user.uid, 'elementos');
    const q = query(elementsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setElements(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ==========================================
  // INTELIGÊNCIA DE DADOS (CÁLCULOS EM TEMPO REAL)
  // ==========================================

  // Filtra as pastas (elementos) de acordo com as datas selecionadas nos inputs
  const elementosNoPeriodo = useMemo(() => {
    return elements.filter(el => {
      if (!el.createdAt) return false;
      const elDate = new Date(el.createdAt.seconds * 1000).toISOString().split('T')[0];
      return elDate >= startDate && elDate <= endDate;
    });
  }, [elements, startDate, endDate]);

  // Função para calcular os dias úteis (Seg-Sex) entre duas datas
  const calcularDiasUteis = (start, end) => {
    let count = 0;
    let curDate = new Date(start);
    const limiteDate = new Date(end);
    
    // Se a data final for no futuro, limitamos até hoje para não jogar a média lá pra baixo
    const actualEnd = limiteDate > today ? today : limiteDate;

    while (curDate <= actualEnd) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++; // Ignora Domingo (0) e Sábado (6)
      curDate.setDate(curDate.getDate() + 1);
    }
    return count === 0 ? 1 : count; // Evita divisão por zero
  };

  // Cálculo da Média Diária
  const mediaDiaria = useMemo(() => {
    const totalPedidos = elementosNoPeriodo.reduce((acc, el) => acc + (el.contagemDocumentos || 0), 0);
    const diasUteis = calcularDiasUteis(startDate, endDate);
    return Math.round(totalPedidos / diasUteis);
  }, [elementosNoPeriodo, startDate, endDate]);

  // Cálculo do Gráfico de Volume Mensal (Últimos 4 meses)
  const volumeData = useMemo(() => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const historico = {};

    elements.forEach(el => {
      if (!el.createdAt) return;
      const dataStr = new Date(el.createdAt.seconds * 1000);
      const chaveMes = `${meses[dataStr.getMonth()]} ${dataStr.getFullYear().toString().substring(2)}`;
      
      if (!historico[chaveMes]) historico[chaveMes] = 0;
      historico[chaveMes] += (el.contagemDocumentos || 0);
    });

    // Pega os 4 últimos meses que tiveram movimento
    return Object.keys(historico)
      .slice(-4)
      .map(chave => ({
        mes: chave.split(' ')[0],
        pedidos: historico[chave]
      }));
  }, [elements]);

  // ==========================================
  // LÓGICA DO CARD DE HOJE
  // ==========================================
  const todayTitle = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const existingTodayElement = elements.find(el => el.titulo === todayTitle);
  const heroElement = existingTodayElement || { isPlaceholder: true, titulo: todayTitle, contagemDocumentos: 0, createdAt: null };

  const handleAccessToday = async () => {
    if (existingTodayElement) {
      navigate(`/elemento?id=${existingTodayElement.id}`);
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

  // Mock provisório até conectarmos os SKUs e OPs reais
  const topOrdersData = [
    { pedido: 'OP-1042', itens: 450 },
    { pedido: 'OP-1055', itens: 380 },
    { pedido: 'OP-1021', itens: 310 }
  ];

  return (
    <div className="dashboard-wrapper">
      
      <div className="dash-header-container">
        <div className="dash-title-area">
          <LayoutDashboard size={28} className="title-icon" />
          <h2>Central de Operações</h2>
        </div>

        <div className="dash-actions-area">
          <div className="dash-period-filter">
            <Calendar size={16} className="filter-icon" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="date-input"
            />
            <span className="date-separator">até</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="date-input"
            />
          </div>

          <button className="btn-history" onClick={() => setShowHistoryModal(true)}>
            <Clock size={16} /> Ver Datas Passadas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Calculando indicadores...</div>
      ) : (
        <div className="dashboard-free-layout">
          
          <div className="hero-card">
            <div className="hero-content">
              <div className="hero-badge">HOJE</div>
              <h2 className="hero-title">{getDayOfWeek()}</h2>
              
              <div className="hero-stats">
                <div className="stat-box">
                  <span className="stat-number">{heroElement.contagemDocumentos || 0}</span>
                  <span className="stat-label">Pedidos em Separação</span>
                </div>
              </div>

              <div className="hero-footer">
                <div className="hero-date">
                  {todayTitle}/{today.getFullYear()}
                </div>
                <button className="btn-access hero-btn" onClick={handleAccessToday}>
                  Acessar Operação <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="free-block volume-zone">
            <div className="kpi-header free-header">
              <Package size={20} className="kpi-icon blue" />
              <div>
                <h4>Volume Mensal</h4>
                <span className="kpi-trend positive"><TrendingUp size={12} /> Atualizado agora</span>
              </div>
            </div>
            <div style={{ height: '120px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a0aec0'}} />
                  <Tooltip cursor={{fill: 'rgba(13, 50, 105, 0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}/>
                  <Bar dataKey="pedidos" radius={[6, 6, 0, 0]}>
                    {volumeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === volumeData.length - 1 ? 'var(--primary)' : '#dbe4f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="free-block media-zone">
            <div className="kpi-header free-header">
              <TrendingUp size={20} className="kpi-icon orange" />
              <h4>Média Diária (Seg-Sex)</h4>
            </div>
            <div className="kpi-value large-value">{mediaDiaria}</div>
            <div className="kpi-trend neutral" style={{ marginTop: '5px' }}>
              Pedidos processados / dia
            </div>
          </div>

          <div className="free-block ranking-zone">
            <div className="kpi-header free-header">
              <Award size={20} className="kpi-icon gold" />
              <h4>Ranking do Período (SKUs + O.P.s)</h4>
            </div>
            <div className="ranking-list free-list">
              <div className="ranking-row first shadow-sm">
                <span className="rank-pos">1º</span>
                <span className="rank-name">Wanderson</span>
                <span className="rank-points">Aguardando dados...</span>
              </div>
            </div>
          </div>

          <div className="free-block bottom-zone">
            <div className="kpi-header free-header">
              <BarChart2 size={20} className="kpi-icon green" />
              <h4>Maiores Pedidos do Período (Por itens separados)</h4>
            </div>
            <div style={{ height: '220px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topOrdersData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="pedido" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4a5568', fontWeight: 600}} width={80} />
                  <Tooltip cursor={{fill: 'rgba(242, 101, 34, 0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="itens" fill="var(--secondary)" radius={[0, 6, 6, 0]} barSize={24}>
                     {topOrdersData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--secondary)' : 'rgba(242, 101, 34, 0.6)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Histórico de Romaneios</h3>
              <button className="btn-close" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>
            <div className="history-grid">
              {elements.filter(el => el.titulo !== todayTitle).map(el => (
                <div key={el.id} className="history-item" onClick={() => navigate(`/elemento?id=${el.id}`)}>
                  <Folder size={16} /> <span>{el.titulo}</span>
                  <div className="history-docs">{el.contagemDocumentos || 0} docs</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}