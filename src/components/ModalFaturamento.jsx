// src/components/ModalFaturamento.jsx
import React, { useState, useMemo } from 'react';
import { 
  X, DollarSign, Calendar, ChevronLeft, ChevronRight, 
  TrendingUp, PackageCheck, Edit3, CheckCircle2, Loader2, Lock, BarChart3 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import ModalComparativoMensal from './ModalComparativoMensal';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ModalFaturamento({
  showModal,
  setShowModal,
  dadosFaturamento,
  isAdmin,
  user
}) {
  const dataAtual = new Date();
  const [anoSelecionado, setAnoSelecionado] = useState(dataAtual.getFullYear());
  const [mesSelecionadoIdx, setMesSelecionadoIdx] = useState(dataAtual.getMonth());
  
  // Controle de fechamento e modais secundários
  const [isClosing, setIsClosing] = useState(false);
  const [diaEmEdicao, setDiaEmEdicao] = useState(null);
  const [formDia, setFormDia] = useState({ pedidos: '', valor: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [showComparativoModal, setShowComparativoModal] = useState(false);

  // Filtra e organiza os dias do mês selecionado
  const { chartDataMes, totalValorMes, totalPedidosMes, diasPreenchidosMap } = useMemo(() => {
    const prefixo = `${anoSelecionado}-${String(mesSelecionadoIdx + 1).padStart(2, '0')}`;
    const totalDiasNoMes = new Date(anoSelecionado, mesSelecionadoIdx + 1, 0).getDate();
    
    let totalValor = 0;
    let totalPedidos = 0;
    const mapaDias = {};

    (dadosFaturamento || []).forEach(item => {
      if (item.id && item.id.startsWith(prefixo)) {
        mapaDias[item.id] = item;
      }
    });

    const listaGrafico = [];
    for (let dia = 1; dia <= totalDiasNoMes; dia++) {
      const dataStr = `${prefixo}-${String(dia).padStart(2, '0')}`;
      const registro = mapaDias[dataStr] || { pedidosFaturados: 0, valorFaturado: 0 };
      
      const v = Number(registro.valorFaturado) || 0;
      const p = Number(registro.pedidosFaturados) || 0;
      
      totalValor += v;
      totalPedidos += p;

      listaGrafico.push({
        dia: String(dia).padStart(2, '0'),
        dataCompleta: dataStr,
        valorFaturado: v,
        pedidosFaturados: p,
        hasData: Boolean(mapaDias[dataStr])
      });
    }

    return {
      chartDataMes: listaGrafico,
      totalValorMes: totalValor,
      totalPedidosMes: totalPedidos,
      diasPreenchidosMap: mapaDias
    };
  }, [dadosFaturamento, anoSelecionado, mesSelecionadoIdx]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
    }, 350);
  };

  if (!showModal && !isClosing) return null;

  const handleAbrirEdicaoDia = (diaNumero) => {
    const dataStr = `${anoSelecionado}-${String(mesSelecionadoIdx + 1).padStart(2, '0')}-${String(diaNumero).padStart(2, '0')}`;
    const existente = diasPreenchidosMap[dataStr];
    
    setDiaEmEdicao(dataStr);
    setFormDia({
      pedidos: existente?.pedidosFaturados !== undefined ? String(existente.pedidosFaturados) : '',
      valor: existente?.valorFaturado !== undefined ? String(existente.valorFaturado) : ''
    });
  };

  const handleSalvarDia = async () => {
    if (!isAdmin) {
      alert("Apenas administradores podem inserir ou editar o faturamento.");
      return;
    }
    if (!diaEmEdicao) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, 'faturamentoDiario', diaEmEdicao);
      const payload = {
        data: diaEmEdicao,
        pedidosFaturados: parseInt(String(formDia.pedidos).replace(/\D/g, '')) || 0,
        valorFaturado: parseFloat(String(formDia.valor).replace(',', '.')) || 0,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || 'admin'
      };

      await setDoc(docRef, payload, { merge: true });
      setDiaEmEdicao(null);
    } catch (error) {
      alert("Erro ao salvar faturamento diário: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatarBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Render do Calendário mensal reativo
  const renderGradeCalendario = () => {
    const totalDiasNoMes = new Date(anoSelecionado, mesSelecionadoIdx + 1, 0).getDate();
    const primeiroDiaSemana = new Date(anoSelecionado, mesSelecionadoIdx, 1).getDay();
    const celulas = [];

    for (let i = 0; i < primeiroDiaSemana; i++) {
      celulas.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    for (let dia = 1; dia <= totalDiasNoMes; dia++) {
      const dataStr = `${anoSelecionado}-${String(mesSelecionadoIdx + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const registro = diasPreenchidosMap[dataStr];
      const isToday = dataAtual.toISOString().split('T')[0] === dataStr;

      celulas.push(
        <div 
          key={dia} 
          className={`calendar-day active ${isToday ? 'is-today' : ''} ${registro ? 'has-faturamento' : ''}`}
          onClick={() => handleAbrirEdicaoDia(dia)}
          style={{
            background: registro ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-main)',
            border: isToday ? '2px solid var(--primary)' : (registro ? '1px solid #10b981' : '1px solid var(--border-color)'),
            cursor: 'pointer',
            minHeight: '75px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '6px 8px',
            borderRadius: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.85rem', color: isToday ? 'var(--primary)' : 'var(--text-main)' }}>{dia}</strong>
            {registro && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />}
          </div>

          {registro ? (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatarBRL(registro.valorFaturado)}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {registro.pedidosFaturados} ped.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.6, fontStyle: 'italic', textAlign: 'center' }}>
              --
            </div>
          )}
        </div>
      );
    }

    return celulas;
  };

  return (
    <div 
      className={`modal-overlay ${isClosing ? 'modal-closing' : ''}`}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}
      onClick={handleClose}
    >
      <div 
        className="modal-container-window"
        style={{
          width: '95vw', maxWidth: '1400px', height: '92vh', 
          background: 'var(--bg-card)', color: 'var(--text-main)',
          borderRadius: '16px', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          border: '1px solid var(--border-color)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{ padding: '18px 25px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '10px', borderRadius: '10px', display: 'flex' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-main)', fontWeight: 'bold' }}>
                Painel Anual de Faturamento & Pedidos
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {isAdmin ? 'Insira e monitore o fluxo de faturamento diário' : 'Visualização do fluxo de faturamento da empresa'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Seletor de Ano */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border-color)' }}>
              <button 
                onClick={() => setAnoSelecionado(prev => prev - 1)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: 'var(--text-muted)', display: 'flex' }}
              >
                <ChevronLeft size={18}/>
              </button>
              <span style={{ padding: '0 12px', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                {anoSelecionado}
              </span>
              <button 
                onClick={() => setAnoSelecionado(prev => prev + 1)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: 'var(--text-muted)', display: 'flex' }}
              >
                <ChevronRight size={18}/>
              </button>
            </div>

            {/* BOTÃO COMPARATIVO */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowComparativoModal(true);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-color)',
                padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem',
                cursor: 'pointer', transition: 'all 0.2s', marginRight: '10px'
              }}
            >
              <BarChart3 size={16} color="#10b981" /> Comparativo Mensal
            </button>

            <button 
              onClick={handleClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
            >
              <X size={26}/>
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE MESES */}
        <div style={{ display: 'flex', gap: '6px', padding: '12px 25px', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
          {MESES.map((mesNome, idx) => (
            <button
              key={idx}
              onClick={() => setMesSelecionadoIdx(idx)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: mesSelecionadoIdx === idx ? 'bold' : '500',
                cursor: 'pointer',
                background: mesSelecionadoIdx === idx ? 'var(--primary)' : 'transparent',
                color: mesSelecionadoIdx === idx ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {mesNome}
            </button>
          ))}
        </div>

        {/* CORPO DO MODAL */}
        <div style={{ flex: 1, padding: '20px 25px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-card)' }}>
          
          {/* CARDS DE RESUMO DO MÊS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
            <div style={{ background: 'var(--bg-main)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Faturamento em {MESES[mesSelecionadoIdx]}</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', color: '#10b981', fontWeight: '900' }}>{formatarBRL(totalValorMes)}</h3>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '10px', borderRadius: '10px' }}><TrendingUp size={22} /></div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Pedidos Faturados no Mês</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', color: 'var(--text-highlight, var(--primary))', fontWeight: '900' }}>{totalPedidosMes} pedidos</h3>
              </div>
              <div style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '10px', borderRadius: '10px' }}><PackageCheck size={22} /></div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Ticket Médio por Pedido</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', color: 'var(--text-main)', fontWeight: '900' }}>
                  {formatarBRL(totalPedidosMes > 0 ? (totalValorMes / totalPedidosMes) : 0)}
                </h3>
              </div>
              <div style={{ background: 'rgba(148, 163, 184, 0.15)', color: 'var(--text-muted)', padding: '10px', borderRadius: '10px' }}><DollarSign size={22} /></div>
            </div>
          </div>

          {/* GRÁFICO DIÁRIO COM ANIMAÇÃO */}
          <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#10b981" /> Curva Diária de Faturamento & Volume
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valores e pedidos consolidados por dia</span>
            </div>

            <div style={{ width: '100%', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataMes} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="corValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="corPedidos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.8rem' }}
                    formatter={(valor, name) => {
                      if (name === 'Faturamento') return [formatarBRL(valor), name];
                      return [`${valor} un`, name];
                    }}
                    labelFormatter={(dia) => `Dia ${dia} de ${MESES[mesSelecionadoIdx]}`}
                  />
                  <Area 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="valorFaturado" 
                    name="Faturamento" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#corValor)"
                    isAnimationActive={true}
                    animationBegin={250}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                  <Area 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="pedidosFaturados" 
                    name="Pedidos Faturados" 
                    stroke="#38bdf8" 
                    strokeWidth={2} 
                    strokeDasharray="4 4" 
                    fillOpacity={1} 
                    fill="url(#corPedidos)"
                    isAnimationActive={true}
                    animationBegin={450}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CALENDÁRIO INTERATIVO */}
          <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="var(--text-highlight, var(--primary))" /> Calendário de Preenchimento ({MESES[mesSelecionadoIdx]} / {anoSelecionado})
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isAdmin ? 'Clique em qualquer dia para inserir ou atualizar os dados.' : 'Clique no dia para visualizar os valores.'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>
              <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {renderGradeCalendario()}
            </div>
          </div>

        </div>

        {/* MODAL INTERNO: EDIÇÃO DO DIA */}
        {diaEmEdicao && (
          <div 
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)', zIndex: 10000,
              display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)'
            }}
            onClick={() => setDiaEmEdicao(null)}
          >
            <div 
              style={{
                background: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '12px', padding: '25px',
                width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-color)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={18} color="var(--primary)" /> Faturamento do Dia: {diaEmEdicao.split('-').reverse().join('/')}
                </h3>
                <button onClick={() => setDiaEmEdicao(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20}/></button>
              </div>

              {!isAdmin && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                  <Lock size={16} /> Apenas administradores possuem permissão de alteração.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '6px' }}>
                    Quantidade de Pedidos Faturados
                  </label>
                  <input 
                    type="number" 
                    placeholder="Ex: 45" 
                    value={formDia.pedidos}
                    onChange={e => setFormDia({ ...formDia, pedidos: e.target.value })}
                    disabled={!isAdmin || isSaving}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '6px' }}>
                    Valor Total Faturado (R$)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 125000.50" 
                    value={formDia.valor}
                    onChange={e => setFormDia({ ...formDia, valor: e.target.value })}
                    disabled={!isAdmin || isSaving}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button 
                    onClick={() => setDiaEmEdicao(null)} 
                    style={{ padding: '8px 16px', background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Fechar
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={handleSalvarDia} 
                      disabled={isSaving}
                      style={{ padding: '8px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {isSaving ? <Loader2 size={16} className="fa-spin"/> : <CheckCircle2 size={16}/>} Salvar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        
      </div>
      {/* Modal comparativo sobreposto */}
        <ModalComparativoMensal 
          showModal={showComparativoModal}
          setShowModal={setShowComparativoModal}
          dadosFaturamento={dadosFaturamento}
        />
    </div>
  );
}