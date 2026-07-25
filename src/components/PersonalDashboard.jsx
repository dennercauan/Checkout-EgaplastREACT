// src/components/PersonalDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, collectionGroup, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Folder, Calendar, ChevronRight, LayoutDashboard, Clock, TrendingUp, Package, Award, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import '../css/PersonalDashboard.css';

export default function PersonalDashboard({ user }) {
  const [elements, setElements] = useState([]);
  const [pedidosGlobais, setPedidosGlobais] = useState([]);
  const [ordensGlobais, setOrdensGlobais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Controle de Datas
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  
  const navigate = useNavigate();

  // 1. BUSCA DAS PASTAS PESSOAIS (Para o Card de Hoje e Volume Mensal)
  useEffect(() => {
    if (!user) return;
    const elementsRef = collection(db, 'usuarios', user.uid, 'elementos');
    const q = query(elementsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setElements(data);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. BUSCA GLOBAL DE PEDIDOS E ORDENS (Para Ranking e Maiores Pedidos)
  useEffect(() => {
    if (!startDate || !endDate) return;

    const startTs = Timestamp.fromDate(new Date(`${startDate}T00:00:00`));
    const endTs = Timestamp.fromDate(new Date(`${endDate}T23:59:59`));

    setLoading(true);

    const qPedidos = query(
      collectionGroup(db, 'pedidosMultiDocumento'),
      where('createdAt', '>=', startTs),
      where('createdAt', '<=', endTs)
    );

    const unsubPedidos = onSnapshot(qPedidos, (snap) => {
      const p = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidosGlobais(p);
      setLoading(false);
    }, (error) => {
      console.error("Erro na busca de pedidos:", error);
      setLoading(false);
    });

    const qOrdens = query(
      collectionGroup(db, 'ordens'),
      where('createdAt', '>=', startTs),
      where('createdAt', '<=', endTs)
    );

    const unsubOrdens = onSnapshot(qOrdens, (snap) => {
      const o = snap.docs.map(doc => {
        const path = doc.ref.path.split('/');
        return { id: doc.id, criadorUid: path[1], ...doc.data() };
      });
      setOrdensGlobais(o);
    });

    return () => {
      unsubPedidos();
      unsubOrdens();
    };
  }, [startDate, endDate]);


  // ==========================================
  // INTELIGÊNCIA MATEMÁTICA
  // ==========================================

  // Média Diária Útil (Segunda a Sexta)
  const mediaDiaria = useMemo(() => {
    const totalPedidos = pedidosGlobais.length;
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
    return Math.round(totalPedidos / diasUteis);
  }, [pedidosGlobais, startDate, endDate]);

  // Ranking Híbrido (Fracionamento SKUs + OPs)
  const rankingData = useMemo(() => {
    const mapa = {};

    // SKUs dos Pedidos
    pedidosGlobais.forEach(p => {
      (p.documentos || []).forEach(doc => {
        if (doc.tipo === 'Nota Fiscal' || doc.tipo === 'Minuta') {
          const resps = doc.responsaveis && doc.responsaveis.length > 0 ? doc.responsaveis : (doc.responsavel ? [doc.responsavel] : []);
          const divisoes = resps.length || 1;
          
          let skus = 0;
          (doc.caixas || []).forEach(cx => {
            (cx.produtos || []).forEach(prod => skus += (parseInt(prod.quantidade) || 0));
          });

          resps.forEach(r => {
            const nome = r.split('@')[0].toUpperCase();
            if (!mapa[nome]) mapa[nome] = 0;
            mapa[nome] += (skus / divisoes);
          });
        }
      });
    });

    // Ordens (100 pts cada)
    ordensGlobais.forEach(o => {
      // Como não temos o e-mail na Ordem, precisamos usar o criadorEmail do usuário logado se for ele
      // Para múltiplos usuários, ideal seria gravar o email na Ordem. Simulando pelo criadorUid:
      const nome = o.criadorEmail ? o.criadorEmail.split('@')[0].toUpperCase() : 'CONFERENTE';
      if (!mapa[nome]) mapa[nome] = 0;
      mapa[nome] += 100;
    });

    return Object.keys(mapa)
      .map(nome => ({ nome, pontos: mapa[nome] }))
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 5); // Top 5
  }, [pedidosGlobais, ordensGlobais]);

  // Maiores Pedidos (Por total de itens)
  const topOrdersData = useMemo(() => {
    const list = pedidosGlobais.map(p => {
      let totalItens = 0;
      (p.documentos || []).forEach(d => {
        (d.caixas || []).forEach(c => {
          (c.produtos || []).forEach(prod => totalItens += (parseInt(prod.quantidade) || 0));
        });
      });
      return { pedido: p.romaneio || 'S/N', itens: totalItens };
    });

    return list.sort((a, b) => b.itens - a.itens).slice(0, 5);
  }, [pedidosGlobais]);

  // Gráfico de Volume (Últimos 4 meses) - Usa as pastas pessoais para não sobrecarregar
  const volumeData = useMemo(() => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const historico = {};

    elements.forEach(el => {
      if (!el.createdAt) return;
      const dataStr = new Date(el.createdAt.seconds * 1000);
      const chave = `${meses[dataStr.getMonth()]} ${dataStr.getFullYear().toString().substring(2)}`;
      if (!historico[chave]) historico[chave] = 0;
      historico[chave] += (el.contagemDocumentos || 0);
    });

    const chaves = Object.keys(historico).reverse().slice(0, 4).reverse();
    return chaves.map(c => ({ mes: c.split(' ')[0], pedidos: historico[c] }));
  }, [elements]);

  // ==========================================
  // CARD DE HOJE
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
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="date-input" />
            <span className="date-separator">até</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="date-input" />
          </div>
          <button className="btn-history" onClick={() => setShowHistoryModal(true)}>
            <Clock size={16} /> Ver Datas Passadas
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
              <div className="hero-badge">HOJE</div>
              <h2 className="hero-title">{getDayOfWeek()}</h2>
              <div className="hero-stats">
                <div className="stat-box">
                  <span className="stat-number">{heroElement.contagemDocumentos || 0}</span>
                  <span className="stat-label">Pedidos em Separação</span>
                </div>
              </div>
              <div className="hero-footer">
                <div className="hero-date">{todayTitle}/{today.getFullYear()}</div>
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
                <span className="kpi-trend positive"><TrendingUp size={12} /> Desempenho base</span>
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
            <div className="kpi-trend neutral" style={{ marginTop: '5px' }}>Pedidos processados / dia</div>
          </div>

          <div className="free-block ranking-zone">
            <div className="kpi-header free-header">
              <Award size={20} className="kpi-icon gold" />
              <h4>Ranking do Período (SKUs + O.P.s)</h4>
            </div>
            <div className="ranking-list free-list">
              {rankingData.length === 0 ? (
                <div style={{color: '#999', fontSize: '13px'}}>Nenhum dado no período.</div>
              ) : (
                rankingData.map((user, index) => (
                  <div key={user.nome} className={`ranking-row ${index === 0 ? 'first' : 'shadow-sm'}`}>
                    <span className="rank-pos">{index + 1}º</span>
                    <span className="rank-name">{user.nome}</span>
                    <span className="rank-points">{user.pontos.toFixed(0)} pts</span>
                  </div>
                ))
              )}
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
                  <YAxis dataKey="pedido" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4a5568', fontWeight: 600}} width={100} />
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