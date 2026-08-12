import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Clock, ShieldCheck, ClipboardList, Package, MapPin, Users, FileText, Settings, Play, Pause, CheckCircle2, Search, MoreVertical, X, Check, Trash2, Info } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, onSnapshot, deleteDoc, getDoc, updateDoc, collection, query, where, getDocs, collectionGroup, Timestamp, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '../firebase'; 

// Importações dos Componentes
import AdmControlesManuais from '../components/AdmControlesManuais';
import AdmEstatisticasGerais from '../components/AdmEstatisticasGerais';
import RankingDiario from '../components/RankingDiario'; 
import '../css/Operacao.css'; 

export default function OperacaoAdm() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Controle de Data
  const queryParams = new URLSearchParams(location.search);
  const dataUrl = queryParams.get('date'); 
  const today = new Date();
  const dataHojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dataOperacaoAtiva = dataUrl || dataHojeStr;

  // Estados Base
  const [rankingExpandido, setRankingExpandido] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [dadosDeEstatisticasFirebase, setDadosDeEstatisticasFirebase] = useState({});
  const [rankingArrayFirebase, setRankingArrayFirebase] = useState([]);
  
  // Novos Estados para Pedidos e Tabela
  const [showModalIntervencao, setShowModalIntervencao] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [pedidosNovos, setPedidosNovos] = useState([]);
  const [pedidosLegados, setPedidosLegados] = useState([]);
  const [buscaRomaneio, setBuscaRomaneio] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(null);

  // Fecha o menu dropdown ao clicar fora
  useEffect(() => {
    const closeMenu = () => setDropdownOpen(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  // Relógio em tempo real
  useEffect(() => {
    const timerInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // 1. Busca os Usuários
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

  // 2. Conexão com o Ranking Diário
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
                nome,
                uid: nome, 
                pontos: stats.pontos || 0,
                skus: stats.skus || 0,
                op: stats.op || 0,
                pedidos: stats.pedidos || 0,
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

  // 3. Conexão com os Pedidos (Mapeando legado e raiz)
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

    return () => { unsubNovo(); unsubLegado(); };
  }, [dataOperacaoAtiva]);

  // Processamento e Filtros de Pedidos
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

  // Funções Auxiliares e de Formatação
  const formatarCronometro = (pedido) => {
    if (!pedido.createdAt) return "00:00:00";
    const start = pedido.createdAt.toMillis ? pedido.createdAt.toMillis() : pedido.createdAt;
    const totalPaused = pedido.totalPausedTime || 0;
    
    let end;
    if (pedido.efetivado && pedido.completedAt) {
      end = pedido.completedAt.toMillis ? pedido.completedAt.toMillis() : pedido.completedAt;
    } else if (pedido.isPaused && pedido.lastPauseStart) {
      end = pedido.lastPauseStart; 
    } else {
      end = currentTime; 
    }

    const diff = Math.max(0, end - start - totalPaused);
    const hh = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const getNomesResponsaveis = (pedido) => {
    const uids = pedido.uidsVinculados || [pedido.criadorUid];
    if (!uids || uids.length === 0) return 'Não atribuído';
    return uids.map(uid => {
      const user = usuarios.find(u => u.uid === uid);
      return user ? user.email.split('@')[0] : 'Desconhecido';
    }).join(', ');
  };

  // Funções de Intervenção de Pedidos (ADM)
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
    
    try {
      await updateDoc(ref, payload);
    } catch (e) {
      console.error(e);
      alert("Erro ao alterar o status do pedido.");
    }
  };

  const handleDeletePedido = async (pedido) => {
    if (!window.confirm("Atenção (Ação ADM): Tem certeza que deseja excluir este pedido de toda a operação definitivamente?")) return;
    try {
      const ref = obterReferenciaDocumento(pedido);
      await deleteDoc(ref);
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir pedido.");
    }
  };

  const handleDeleteEvent = async (evento) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente este registro de ${evento.delta} pontos?`)) return;
    if (!evento.sourceId || !evento.sourceType) return alert("Erro crítico: O ID deste evento não foi encontrado.");

    const colecaoAlvo = evento.sourceType === 'op' ? 'ordensProducao' : 'ajustesDiarios';

    try {
      const docRef = doc(db, colecaoAlvo, evento.sourceId);
      await deleteDoc(docRef);
      
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
    } catch (error) {
      console.error("Erro ao deletar do Firebase:", error);
      alert("Houve um erro de permissão ou conexão ao tentar excluir no Firebase.");
    }
  };

  return (
    <div className="op-wrapper">
      
      {/* CABEÇALHO */}
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
          {/* BOTÃO DO MODAL DE INTERVENÇÃO */}
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
              onChange={(e) => {
                if (e.target.value) navigate(`${location.pathname}?date=${e.target.value}`);
              }}
              style={{ border: 'none', outline: 'none', color: '#475569', fontWeight: 'bold', background: 'transparent' }}
            />
          </div>
        </div>
      </header>

      {/* CORPO PRINCIPAL */}
      <main className="op-main-content">
        
        {/* ESTATÍSTICAS GERAIS (Topo) */}
        <section style={{ marginBottom: '20px' }}>
             <AdmEstatisticasGerais dados={dadosDeEstatisticasFirebase || {}} />
        </section>

        {/* ATIVIDADES EM ANDAMENTO */}
        <section style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="pulse-dot"></div> Atividades em Andamento
            </h3>
            <span style={{ background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {pedidosEmAndamento.length} Pendentes
            </span>
          </div>

          {pedidosEmAndamento.length === 0 ? (
            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <CheckCircle2 size={40} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: '500' }}>Tudo limpo! Nenhuma separação em andamento.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
              {pedidosEmAndamento.map(pedido => (
                <div key={pedido.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  
                  {/* Status & Romaneio */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div>
                      <strong style={{ fontSize: '1.2rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Package size={18} color="#3b82f6" /> {pedido.romaneio || 'S/N'}
                      </strong>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} /> {pedido.loja || 'Destino Padrão'} ({pedido.uf || 'DF'})
                      </div>
                    </div>
                    
                    {/* Cronômetro */}
                    <div style={{ background: pedido.isPaused ? '#fef2f2' : '#eff6ff', color: pedido.isPaused ? '#ef4444' : '#3b82f6', padding: '6px 10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {pedido.isPaused ? 'Pausado' : 'Decorrido'}
                      </span>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', fontFamily: 'monospace' }}>
                        {formatarCronometro(pedido)}
                      </span>
                    </div>
                  </div>

                  {/* Informações Inferiores */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} color="#94a3b8" /> <strong>Responsáveis:</strong> {getNomesResponsaveis(pedido)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} color="#94a3b8" /> <strong>Documentos:</strong> {pedido.documentos?.length || 0}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>

        {/* NOVA SEÇÃO: TABELA DE HISTÓRICO GLOBAL */}
        <section className="op-history-section" style={{ marginTop: '30px' }}>
          <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="var(--primary)"/> Visão Global de Romaneios
              </h3>
              <span className="history-count" style={{ display: 'block', marginTop: '4px' }}>
                {pedidosProcessados.filter(p => p.efetivado).length} finalizados de toda a equipe
              </span>
            </div>
            <div className="search-bar-op" style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px' }}>
              <Search size={16} color="#64748b" />
              <input 
                type="text" 
                placeholder="Buscar romaneio ou loja..." 
                value={buscaRomaneio}
                onChange={(e) => setBuscaRomaneio(e.target.value)}
                style={{ border: 'none', outline: 'none', marginLeft: '8px', fontSize: '0.9rem' }}
              />
            </div>
          </div>
          
          <div className="op-table-wrapper scrollable-table-wrapper">
            <table className="op-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Romaneio</th>
                  <th style={{ width: '25%' }}>Destino / Responsável</th>
                  <th style={{ width: '25%' }}>Observações</th>
                  <th style={{ width: '25%' }}>Resumo Rápido</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.length === 0 ? (
                  <tr><td colSpan="5" style={{textAlign: 'center', padding: '30px', color: '#94a3b8'}}>{buscaRomaneio ? 'Nenhum romaneio ou loja encontrada.' : 'Nenhum pedido processado hoje.'}</td></tr>
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
                      statusBadge = <div className="time-badge pending"><Clock size={12} style={{marginRight:'3px', display:'inline'}}/> {formatarCronometro(pedido)}</div>;
                    }

                    return (
                      <tr key={pedido.id} className={`clickable-row ${pedido.efetivado ? "efetivado" : ""}`}>
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
                            <button className="action-btn btn-caixas" title="Visualização no painel restrita" onClick={() => alert("Para detalhes profundos e gestão de caixas, acesse este romaneio pela página comum de Operação.")}>
                              <Info size={16}/>
                            </button>
                            <div style={{position: 'relative'}}>
                              <button className="action-btn btn-edit" title="Ações ADM" onClick={() => setDropdownOpen(dropdownOpen === pedido.id ? null : pedido.id)}>
                                <MoreVertical size={16}/>
                              </button>
                              {dropdownOpen === pedido.id && (
                                <div className="table-dropdown-menu" style={{ right: 0, left: 'auto' }}>
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

      {/* ZONA INFERIOR */}
      <section className="op-bottom-zone">
         <RankingDiario 
            rankingCalculado={rankingArrayFirebase}
            rankingExpandido={rankingExpandido}
            setRankingExpandido={setRankingExpandido}
            currentTime={currentTime}           
            dataOperacaoAtiva={dataOperacaoAtiva} 
            isAdminMode={true}
            onDeleteEvent={handleDeleteEvent}
          />

         <div className="op-side-indicators">
            <div className="indicator-card op-card">
              <div className="indicator-icon" style={{background: '#e0e7ff', color: '#4f46e5'}}>
                <ClipboardList size={24}/>
              </div>
              <div className="indicator-content">
                <h4>Auditoria Diária</h4>
                <p>Verifique o log de intervenções</p>
              </div>
              <button className="indicator-btn">Abrir Log Completo</button>
            </div>
         </div>
      </section>

      {/* MODAL DE INTERVENÇÃO MANUAL */}
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
              <AdmControlesManuais 
                dados={rankingArrayFirebase || []} 
                dataFiltro={dataOperacaoAtiva} 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}