// src/components/ModalComparativoMensal.jsx
import React, { useState, useMemo } from 'react';
import { 
  X, BarChart3, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip as RechartsTooltip, CartesianGrid 
} from 'recharts';

export default function ModalComparativoMensal({ showModal, setShowModal, dadosFaturamento }) {
  const [isClosing, setIsClosing] = useState(false);
  const today = new Date();
  const [anoComparativo, setAnoComparativo] = useState(today.getFullYear());

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
    }, 350);
  };

  const evolucaoMensal = useMemo(() => {
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const prefixoAno = `${anoComparativo}-`;

    const listaMeses = [];
    for (let m = 1; m <= 12; m++) {
      const mesStr = String(m).padStart(2, '0');
      listaMeses.push({
        mesNum: m,
        mesNome: mesesNomes[m - 1],
        chave: `${anoComparativo}-${mesStr}`,
        valorTotal: 0,
        pedidosTotal: 0
      });
    }

    (dadosFaturamento || []).forEach(item => {
      if (item.id && item.id.startsWith(prefixoAno)) {
        const mesInt = parseInt(item.id.substring(5, 7), 10);
        if (mesInt >= 1 && mesInt <= 12) {
          listaMeses[mesInt - 1].valorTotal += Number(item.valorFaturado) || 0;
          listaMeses[mesInt - 1].pedidosTotal += Number(item.pedidosFaturados) || 0;
        }
      }
    });

    return listaMeses.map((mesAtual, index) => {
      if (index === 0) {
        return {
          ...mesAtual,
          variacaoValor: 0,
          variacaoPedidos: 0,
          temComparativo: false
        };
      }

      const mesAnterior = listaMeses[index - 1];
      let varValor = 0;
      let varPedidos = 0;

      if (mesAnterior.valorTotal > 0) {
        varValor = ((mesAtual.valorTotal - mesAnterior.valorTotal) / mesAnterior.valorTotal) * 100;
      }

      if (mesAnterior.pedidosTotal > 0) {
        varPedidos = ((mesAtual.pedidosTotal - mesAnterior.pedidosTotal) / mesAnterior.pedidosTotal) * 100;
      }

      return {
        ...mesAtual,
        variacaoValor: varValor,
        variacaoPedidos: varPedidos,
        temComparativo: mesAnterior.valorTotal > 0 || mesAtual.valorTotal > 0
      };
    });
  }, [dadosFaturamento, anoComparativo]);

  if (!showModal && !isClosing) return null;

  const totalAnualValor = evolucaoMensal.reduce((acc, m) => acc + m.valorTotal, 0);
  const totalAnualPedidos = evolucaoMensal.reduce((acc, m) => acc + m.pedidosTotal, 0);

  return (
    <div 
      className={`modal-overlay ${isClosing ? 'modal-closing' : ''}`}
      style={{
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0,
        bottom: 0,
        width: '100vw', 
        height: '100vh',
        zIndex: 999999, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center'
      }}
      onClick={handleClose}
    >
      <div 
        className="modal-container-window"
        style={{
          width: '95vw', 
          maxWidth: '900px', 
          /* Travamos a altura em 85vh para o flexbox funcionar e forçar o scroll na tabela */
          height: '85vh',
          maxHeight: '800px',
          background: 'var(--bg-card)', 
          color: 'var(--text-main)', 
          borderRadius: '16px',
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          border: '1px solid var(--border-color)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '10px', borderRadius: '10px', display: 'flex' }}>
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 'bold' }}>
                Comparativo Mensal & Evolução
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Análise de oscilação e variação percentual mês a mês
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Ano:</label>
              <select 
                value={anoComparativo} 
                onChange={e => setAnoComparativo(Number(e.target.value))}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
              >
                {[2024, 2025, 2026, 2027].map(ano => (
                  <option key={ano} value={ano} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>{ano}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
            >
              <X size={26}/>
            </button>
          </div>
        </div>

        {/* CORPO DO MODAL */}
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', overflow: 'hidden' }}>
          
          {/* CARDS TOTAIS DO ANO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', flexShrink: 0 }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px 18px', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase' }}>Faturamento Acumulado ({anoComparativo})</span>
              <h3 style={{ fontSize: '1.5rem', margin: '4px 0 0 0', color: '#10b981', fontWeight: '900' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAnualValor)}
              </h3>
            </div>

            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '14px 18px', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Pedidos Faturados no Ano</span>
              <h3 style={{ fontSize: '1.5rem', margin: '4px 0 0 0', color: 'var(--text-main)', fontWeight: '900' }}>
                {totalAnualPedidos} pedidos
              </h3>
            </div>
          </div>

          {/* GRÁFICO COMPARATIVO */}
          <div style={{ background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '12px 16px', flexShrink: 0 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-main)' }}>
              Curva Anual de Faturamento
            </h4>
            <div style={{ width: '100%', height: '140px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolucaoMensal} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                  <XAxis dataKey="mesNome" tick={{ fill: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tick={{ fill: 'var(--text-muted)', fontSize: '0.75rem' }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip 
                    contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.8rem' }}
                    formatter={(v) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v), 'Faturamento']}
                  />
                  <Bar 
                    dataKey="valorTotal" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20}
                    isAnimationActive={true}
                    animationBegin={200}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABELA COM ROLAGEM INDEPENDENTE */}
          <div style={{ flex: 1, background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                <thead style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '8px 16px', borderBottom: '2px solid var(--border-color)' }}>Mês</th>
                    <th style={{ padding: '8px 16px', borderBottom: '2px solid var(--border-color)', textAlign: 'right' }}>Faturamento</th>
                    <th style={{ padding: '8px 16px', borderBottom: '2px solid var(--border-color)', textAlign: 'center' }}>Variação Faturamento</th>
                    <th style={{ padding: '8px 16px', borderBottom: '2px solid var(--border-color)', textAlign: 'center' }}>Pedidos</th>
                    <th style={{ padding: '8px 16px', borderBottom: '2px solid var(--border-color)', textAlign: 'center' }}>Variação Pedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {evolucaoMensal.map((m) => {
                    const isPositivo = m.variacaoValor > 0;
                    const isNegativo = m.variacaoValor < 0;

                    return (
                      <tr key={m.mesNome} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '7px 16px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                          {m.mesNome} / {anoComparativo}
                        </td>
                        <td style={{ padding: '7px 16px', textAlign: 'right', fontWeight: 'bold', color: m.valorTotal > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.valorTotal)}
                        </td>
                        <td style={{ padding: '7px 16px', textAlign: 'center' }}>
                          {!m.temComparativo ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>---</span>
                          ) : isPositivo ? (
                            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <ArrowUpRight size={12} /> +{m.variacaoValor.toFixed(1)}%
                            </span>
                          ) : isNegativo ? (
                            <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <ArrowDownRight size={12} /> {m.variacaoValor.toFixed(1)}%
                            </span>
                          ) : (
                            <span style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                              0.0%
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '7px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-main)' }}>
                          {m.pedidosTotal}
                        </td>
                        <td style={{ padding: '7px 16px', textAlign: 'center' }}>
                          {!m.temComparativo ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>---</span>
                          ) : m.variacaoPedidos > 0 ? (
                            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.75rem' }}>+{m.variacaoPedidos.toFixed(1)}%</span>
                          ) : m.variacaoPedidos < 0 ? (
                            <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.75rem' }}>{m.variacaoPedidos.toFixed(1)}%</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>0%</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}