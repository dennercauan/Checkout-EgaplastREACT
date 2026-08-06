import React, { useState } from 'react';
import { X, ChevronLeft, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

export default function ModalVolumeDetalhado({ showModal, setShowModal, mesesResumo }) {
  const [mesSelecionado, setMesSelecionado] = useState(null);
  const [dadosDiarios, setDadosDiarios] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [barHover, setBarHover] = useState(null);

  const handleClose = () => {
    setShowModal(false);
    setTimeout(() => {
      setMesSelecionado(null);
      setDadosDiarios([]);
    }, 300);
  };

  const carregarDetalhesDoMes = async (mesBase) => {
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
          caixas: 0 // Adicionamos a métrica de caixas para o gráfico duplo
        };
      }

      const qPedidos = query(
        collection(db, 'pedidos'), 
        where('dataOperacao', '>=', `${mesBase.id}-01`),
        where('dataOperacao', '<=', `${mesBase.id}-31`)
      );
      
      const snap = await getDocs(qPedidos);
      
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.efetivado) return; 

        const temNfOuMinuta = (data.documentos || []).some(d => d.tipo === 'Nota Fiscal' || d.tipo === 'Minuta');
        if (temNfOuMinuta && data.dataOperacao) {
          if (mapaDias[data.dataOperacao]) {
            mapaDias[data.dataOperacao].pedidos += 1;
            
            // Soma as caixas deste pedido
            let totalCaixas = 0;
            (data.documentos || []).forEach(d => { totalCaixas += (d.caixas || []).length; });
            mapaDias[data.dataOperacao].caixas += totalCaixas;
          }
        }
      });

      setDadosDiarios(Object.values(mapaDias));
    } catch (error) {
      console.error("Erro ao buscar detalhes diários:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="modal-overlay-search">
      <div className="modal-content-search" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div className="search-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {mesSelecionado ? (
              <button 
                onClick={() => setMesSelecionado(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}
              >
                <ChevronLeft size={20}/> Voltar ao Resumo Anual
              </button>
            ) : (
              <div className="search-badge">Desempenho Executivo</div>
            )}
            <h2 className="search-title">
              {mesSelecionado ? `Oscilação Diária: ${mesSelecionado.mes} / ${mesSelecionado.ano}` : 'Comparativo Mensal'}
            </h2>
          </div>
          <button className="btn-close-search" onClick={handleClose}><X size={28}/></button>
        </div>

        <div className="search-modal-body" style={{ minHeight: '400px', padding: '30px', display: 'flex', flexDirection: 'column' }}>
          
          {/* VISÃO 1: GRÁFICO DE MESES (HORIZONTAL) */}
          {!mesSelecionado && (
            <>
              <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Clique em uma das áreas para detalhar o volume dia a dia daquele mês.</p>
              <div style={{ flex: 1, width: '100%', height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mesesResumo} layout="vertical" margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" opacity={0.5} />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="mes" type="category" tick={{ fill: 'var(--text-main)', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip 
                      cursor={{ fill: 'var(--bg-main)' }}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="caixas" name="Caixas Movimentadas" fill="#c4709d" barSize={20} radius={[0, 4, 4, 0]} />
                    <Bar 
                      dataKey="pedidos" 
                      name="Pedidos Processados"
                      fill="#0273a3" 
                      barSize={20} 
                      radius={[0, 4, 4, 0]}
                      onClick={(data) => carregarDetalhesDoMes(data.payload)}
                      style={{ cursor: 'pointer' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* VISÃO 2: GRÁFICO DIÁRIO (HORIZONTAL) */}
          {mesSelecionado && isLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: 'var(--primary)', gap: '10px' }}>
              <Loader2 size={32} className="fa-spin" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {mesSelecionado && !isLoading && (
            // Aumentamos a altura para 800px para caber os 31 dias confortavelmente na vertical
            <div style={{ width: '100%', height: '800px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosDiarios} layout="vertical" margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" opacity={0.5} />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="dia" type="category" tick={{ fill: 'var(--text-main)', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={60} tickFormatter={(val) => `Dia ${val}`} />
                  <Tooltip 
                    cursor={{ fill: 'var(--bg-main)' }}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                    labelFormatter={(label) => `Data: ${label}/${mesSelecionado.mes}`}
                  />
                  <Legend wrapperStyle={{ paddingBottom: '20px' }} verticalAlign="top" />
                  <Bar dataKey="caixas" name="Caixas Movimentadas" fill="#c4709d" barSize={10} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="pedidos" name="Pedidos Processados" fill="#0273a3" barSize={10} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}