// src/components/PersonalDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Folder, FileText, Calendar, Edit2, Trash2, ChevronRight, LayoutGrid, Clock, Loader2 } from 'lucide-react';
import '../css/PersonalDashboard.css';

export default function PersonalDashboard({ user }) {
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [isCreatingToday, setIsCreatingToday] = useState(false);
  
  const navigate = useNavigate();

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
  // LÓGICA INTELIGENTE DO DIA ATUAL
  // ==========================================
  const todayObj = new Date();
  const todayTitle = todayObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); // Ex: "23/07"
  
  // Procura se já existe uma pasta criada hoje com o título "DD/MM"
  const existingTodayElement = elements.find(el => el.titulo === todayTitle);
  
  // Se existir, usa ela. Se não, cria um molde visual (Fantasma)
  const heroElement = existingTodayElement || {
    isPlaceholder: true,
    titulo: todayTitle,
    contagemDocumentos: 0,
    createdAt: null
  };

  // Remove a pasta de hoje da lista geral para não duplicar no mosaico
  const remainingElements = elements.filter(el => el.titulo !== todayTitle);
  
  // Separação dos Mosaicos (Puxando 8 cards para preencher o grid perfeitamente)
  const recentElements = remainingElements.slice(0, 8); 
  const oldElements = remainingElements.slice(8); 

  // Conversão de data para Dia da Semana
  const getDayOfWeek = (timestamp) => {
    // Se for o placeholder (sem timestamp), pega o dia de hoje
    const date = timestamp ? new Date(timestamp.seconds * 1000) : new Date();
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return dias[date.getDay()];
  };

  // ==========================================
  // AÇÃO DO BOTÃO PRINCIPAL (CRIAÇÃO AUTOMÁTICA)
  // ==========================================
  const handleAccessToday = async () => {
    if (existingTodayElement) {
      // A pasta já existe, apenas acessa
      navigate(`/elemento?id=${existingTodayElement.id}`);
    } else {
      // A pasta não existe, cria silenciosamente e depois acessa
      setIsCreatingToday(true);
      try {
        const docRef = await addDoc(collection(db, 'usuarios', user.uid, 'elementos'), {
          titulo: todayTitle,
          createdAt: serverTimestamp(),
          contagemDocumentos: 0
        });
        navigate(`/elemento?id=${docRef.id}`);
      } catch (error) {
        console.error("Erro ao criar pasta do dia:", error);
        setIsCreatingToday(false);
      }
    }
  };

  const renderCardActions = () => (
    <div className="mosaic-actions">
      <button className="action-btn edit" title="Renomear"><Edit2 size={16} /></button>
      <button className="action-btn delete" title="Excluir"><Trash2 size={16} /></button>
    </div>
  );

  return (
    <div className="mosaic-dashboard-container">
      
      <div className="mosaic-header">
        <div className="mosaic-title">
          <LayoutGrid size={24} className="title-icon" />
          <h3>Painel Operacional</h3>
        </div>
      </div>

      {loading ? (
        <div className="mosaic-empty">Montando seu painel...</div>
      ) : (
        <div className="mosaic-grid">
          
          {/* DESTAQUE PRINCIPAL (SEMPRE GARANTIDO QUE EXISTE VISUALMENTE) */}
          <div className="mosaic-card hero-card">
            {/* Só exibe botões de Editar/Excluir se a pasta já for real no banco */}
            {!heroElement.isPlaceholder && renderCardActions()}
            
            <div className="hero-content">
              <div className="hero-badge">HOJE</div>
              
              <h2 className="hero-title">{getDayOfWeek(heroElement.createdAt)}</h2>
              
              <div className="hero-stats">
                <div className="stat-box">
                  <span className="stat-number">{heroElement.contagemDocumentos || 0}</span>
                  <span className="stat-label">Documentos</span>
                </div>
              </div>

              <div className="hero-footer">
                <div className="hero-date">
                  <Calendar size={14} /> 
                  Criado em {heroElement.createdAt ? new Date(heroElement.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : todayTitle}
                </div>
                
                <button 
                  className="btn-access hero-btn" 
                  onClick={handleAccessToday}
                  disabled={isCreatingToday}
                >
                  {isCreatingToday ? (
                    <><Loader2 size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> Criando...</>
                  ) : (
                    <>Acessar Separação <ChevronRight size={18} /></>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* MOSAICOS SECUNDÁRIOS */}
          {recentElements.map(el => (
            <div key={el.id} className="mosaic-card standard-card">
              {renderCardActions()}
              <div className="card-top">
                <Folder size={24} className="card-icon" />
                <h4 className="card-title">{getDayOfWeek(el.createdAt)}</h4>
              </div>
              
              <div className="card-mid">
                <div className="mini-stat">
                  <FileText size={14} /> {el.contagemDocumentos || 0} docs
                </div>
              </div>

              <div className="card-bottom">
                <span className="card-date">{el.createdAt ? new Date(el.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : ''}</span>
                <button 
                  className="btn-access small-btn"
                  onClick={() => navigate(`/elemento?id=${el.id}`)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))}

        </div>
      )}

      {/* HISTÓRICO OCULTO */}
      {oldElements.length > 0 && (
        <div className="history-section">
          <button 
            className="btn-toggle-history"
            onClick={() => setShowHistory(!showHistory)}
          >
            <Clock size={16} />
            {showHistory ? 'Ocultar Histórico Antigo' : `Ver pastas antigas (${oldElements.length})`}
          </button>

          {showHistory && (
            <div className="history-grid">
              {oldElements.map(el => (
                <div key={el.id} className="history-item" onClick={() => navigate(`/elemento?id=${el.id}`)}>
                  <Folder size={16} /> <span>{el.titulo}</span>
                  <div className="history-docs">{el.contagemDocumentos || 0} docs</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}