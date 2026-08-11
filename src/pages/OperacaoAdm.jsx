import React, { useState, useEffect } from 'react';
// IMPORTAÇÕES ATUALIZADAS PARA LER UM DOCUMENTO ESPECÍFICO
import { doc, onSnapshot } from 'firebase/firestore'; 
import { db } from "../firebase";

import AdmEstatisticasGerais from '../components/AdmEstatisticasGerais';
import AdmMonitoramentoTempoReal from '../components/AdmMonitoramentoTempoReal';
import AdmControlesManuais from '../components/AdmControlesManuais';

export default function OperacaoAdm() {
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [dadosOperacao, setDadosOperacao] = useState(null); // Agora inicia como null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Aponta direto para o documento do dia escolhido no calendário
    const diaRef = doc(db, 'estatisticasDiarias', dataFiltro);

    const unsubscribe = onSnapshot(diaRef, (docSnap) => {
      if (docSnap.exists()) {
        const dadosDoBanco = docSnap.data().ranking; // Pega aquele rankingMap que salvamos
        console.log("Dados do ADM recebidos:", dadosDoBanco);
        setDadosOperacao(dadosDoBanco);
      } else {
        console.log("Nenhuma operação registrada para este dia.");
        setDadosOperacao({}); // Dia vazio
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar estatísticas diárias:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dataFiltro]);

// ... resto do componente continua igual

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER DA PÁGINA ADM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#0f172a', margin: 0 }}>Painel de Gestão - Checkout</h1>
          <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '0.9rem' }}>Visão global e monitoramento de equipe</p>
        </div>
        
        {/* SELETOR DE DATA GLOBAL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
            Data da Operação:
          </label>
          <input 
            type="date" 
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#334155', outline: 'none', cursor: 'pointer' }}
          />
        </div>
      </div>

      {loading ? (
  <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>Sincronizando dados da operação...</div>
) : (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    
    {/* 1. VISÃO MACRO (Cards de cima) */}
    <AdmEstatisticasGerais dados={dadosOperacao} dataFiltro={dataFiltro} />
    
    {/* 2. FISCALIZAÇÃO (Tabela do meio) */}
    <AdmMonitoramentoTempoReal dados={dadosOperacao} />
    
    {/* 3. AÇÕES MANUAIS (Controles embaixo) */}
    <AdmControlesManuais dados={dadosOperacao} dataFiltro={dataFiltro} />

  </div>
)}
    </div>
  );
}