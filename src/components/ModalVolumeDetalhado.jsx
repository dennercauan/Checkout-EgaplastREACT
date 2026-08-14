// src/components/ModalVolumeDetalhado.jsx
import React, { useState } from 'react';
import { X, ChevronLeft, Loader2, TrendingUp, Calendar as CalendarIcon, BarChart2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ModalVolumeDetalhado({ showModal, setShowModal, mesesResumo }) {
  const [isClosing, setIsClosing] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState(null);
  const [dadosDiarios, setDadosDiarios] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modoVisao, setModoVisao] = useState('chart');

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
      setMesSelecionado(null);
      setDadosDiarios([]);
      setModoVisao('chart'); 
    }, 350); // Sincronizado com os 350ms da animação CSS
  };

  if (!showModal && !isClosing) return null;

  const carregarDetalhesDoMes = async (dadosClique) => {
    const mesBase = dadosClique.payload || dadosClique;
    if (!mesBase || !mesBase.id) return;

    setMesSelecionado(mesBase);
    setIsLoading(true);
    
    try {
      const [ano, mesStr] = mesBase.id.split('-');
      const diasNoMes = new Date(ano, parseInt(mesStr), 0).getDate();
      
      const mapaDias = {};
      for (let i = 1; i <= diasNoMes; i++) {
        const diaFormatado = String(i).padStart(2, '0');
        mapaDias[`${mesBase.id}-${diaFormatado}`] = { 
          dia: diaFormatado, 
          dataCompleta: `${mesBase.id}-${diaFormatado}`, 
          pedidos: 0,
          caixas: 0 
        };
      }

      const qPedidos = query(
        collection(db, 'pedidos'),
        where('efetivado', '==', true),
        where('dataOperacao', '>=', `${mesBase.id}-01`),
        where('dataOperacao', '<=', `${mesBase.id}-${diasNoMes}`)
      );
      
      const snap = await getDocs(qPedidos);
      
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const temNfOuMinuta = (data.documentos || []).some(d => d.tipo === 'Nota Fiscal' || d.tipo === 'Minuta');
        if (!temNfOuMinuta) return;

        const dataDoc = String(data.dataOperacao).substring(0, 10);

        if (mapaDias[dataDoc]) {
          mapaDias[dataDoc].pedidos += 1;
          let totalCaixas = 0;
          (data.documentos || []).forEach(d => { totalCaixas += (d.caixas || []).length; });
          mapaDias[dataDoc].caixas += totalCaixas;
        }
      });

      setDadosDiarios(Object.values(mapaDias));
    } catch (error) {
      console.error("Erro ao buscar detalhes diários:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCalendario = () => {
    if (!mesSelecionado) return null;
    const [ano, mes] = mesSelecionado.id.split('-');
    const primeiroDiaDaSemana = new Date(ano, parseInt(mes) - 1, 1).getDay(); 
    
    const espacosVazios = Array.from({ length: primeiroDiaDaSemana }).map((_, i) => (
      <div key={`empty-${i}`} style={{ background: 'transparent', border: 'none' }} />
    ));

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', background: 'var(--bg-main)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '10px' }}>
          <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', flex: 1 }}>
          {espacosVazios}
          {dadosDiarios.map((d, i) => (
            <div 
              key={i} 
              style={{ 
                minHeight: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)',
                color: d.pedidos > 0 ? 'var(--primary)' : 'var(--text-muted)',
                opacity: d.pedidos === 0 ? 0.6 : 1,
                boxShadow: d.pedidos > 0 ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>{d.dia}</span>
              {d.pedidos > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#0273a3', lineHeight: '1' }}>{d.pedidos}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>pedidos</span>
                </div>
              ) : (
                <span style={{ fontSize: '0.8rem' }}>-</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`modal-overlay ${isClosing ? 'modal-closing' : ''}`}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}
      onClick={handleClose}
    >
      <div 
        className="modal-container-window" 
        style={{ 
          width: '90vw', maxWidth: '1200px', height: '85vh', minHeight: '600px', 
          background: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '16px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          border: '1px solid var(--border-color)'
        }}
        onClick={e => e.stopPropagation()}
      >
        
        {/* HEADER TRAVADO NO TOPO */}
        <div style={{ padding: '20px 30px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', flexShrink: 0 }}>
          <div>
            {mesSelecionado ? (
              <button 
                onClick={() => setMesSelecionado(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}
              >
                <ChevronLeft size={20}/> Voltar ao Resumo Anual
              </button>
            ) : (
              <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(2, 115, 163, 0.15)', color: '#0273a3', marginBottom: '6px' }}>
                Desempenho Executivo
              </div>
            )}
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-main)', fontWeight: 'bold' }}>
              {mesSelecionado ? `Detalhamento Diário: ${mesSelecionado.mes} / ${mesSelecionado.ano}` : 'Comparativo Mensal & Volume'}
            </h2>
          </div>
          <button 
            onClick={handleClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px', display: 'flex' }}
          >
            <X size={26}/>
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'var(--bg-card)' }}>
          
          {/* VISÃO 1: GRÁFICO DE MESES */}
          {!mesSelecionado && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '25px', flexShrink: 0, fontSize: '0.9rem' }}>
                Clique em uma das barras para detalhar o volume e oscilação diária daquele mês.
              </p>
              
              <div style={{ flex: 1, width: '100%', minHeight: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mesesResumo} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" opacity={0.5} />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="mes" type="category" tick={{ fill: 'var(--text-main)', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip cursor={false} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar 
                      dataKey="caixas" 
                      name="Caixas Movimentadas" 
                      fill="#c4709d" 
                      barSize={30} 
                      radius={[0, 4, 4, 0]} 
                      onClick={(data) => carregarDetalhesDoMes(data)} 
                      style={{ cursor: 'pointer' }}
                      isAnimationActive={true}
                      animationBegin={200}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Bar 
                      dataKey="pedidos" 
                      name="Pedidos Processados" 
                      fill="#0273a3" 
                      barSize={30} 
                      radius={[0, 4, 4, 0]} 
                      onClick={(data) => carregarDetalhesDoMes(data)} 
                      style={{ cursor: 'pointer' }}
                      isAnimationActive={true}
                      animationBegin={400}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {mesSelecionado && isLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--primary)', gap: '10px' }}>
              <Loader2 size={32} className="fa-spin" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {/* VISÃO 2: DETALHAMENTO DIÁRIO */}
          {mesSelecionado && !isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              
              <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '5px', borderRadius: '10px', width: 'fit-content', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                <button 
                  onClick={() => setModoVisao('chart')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', background: modoVisao === 'chart' ? 'var(--bg-card)' : 'transparent', color: modoVisao === 'chart' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: modoVisao === 'chart' ? '0 2px 10px rgba(0,0,0,0.05)' : 'none' }}
                >
                  <TrendingUp size={18}/> Oscilação Diária
                </button>
                <button 
                  onClick={() => setModoVisao('calendar')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', background: modoVisao === 'calendar' ? 'var(--bg-card)' : 'transparent', color: modoVisao === 'calendar' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: modoVisao === 'calendar' ? '0 2px 10px rgba(0,0,0,0.05)' : 'none' }}
                >
                  <CalendarIcon size={18}/> Calendário de Volume
                </button>
              </div>

              {/* GRÁFICO PREENCHENDO A TELA */}
              {modoVisao === 'chart' && (
                <div style={{ flex: 1, width: '100%', minHeight: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dadosDiarios} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                      <XAxis dataKey="dia" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '5 5' }}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        labelFormatter={(label) => `Dia ${label}/${mesSelecionado.mes}`}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="caixas" 
                        name="Caixas" 
                        stroke="#c4709d" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#c4709d', strokeWidth: 2 }} 
                        activeDot={{ r: 6 }} 
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pedidos" 
                        name="Pedidos" 
                        stroke="#0273a3" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#0273a3', strokeWidth: 2 }} 
                        activeDot={{ r: 6 }} 
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* CALENDÁRIO PREENCHENDO A TELA */}
              {modoVisao === 'calendar' && renderCalendario()}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}