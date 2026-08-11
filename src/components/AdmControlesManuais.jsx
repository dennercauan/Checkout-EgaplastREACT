import React, { useState } from 'react';
import { Shield, PlusCircle, AlertTriangle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; 

export default function AdmControlesManuais({ dados, dataFiltro }) {
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [pontosAjuste, setPontosAjuste] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  
  let listaUsuarios = [];
  if (dados) {
    if (Array.isArray(dados)) {
      listaUsuarios = dados.map(u => u.nome || u.id).filter(Boolean);
    } else {
      listaUsuarios = Object.entries(dados).map(([chave, valor]) => {
        if (!isNaN(chave) && valor && typeof valor === 'object' && valor.nome) return valor.nome;
        return chave;
      }).filter(Boolean);
    }
  }
  listaUsuarios = [...new Set(listaUsuarios)].sort();

  // ==========================================
  // FUNÇÃO ÚNICA: CRIAR EVENTO DE AJUSTE/BÔNUS
  // ==========================================
  const handleAplicarBonus = async () => {
    if (!usuarioSelecionado || !pontosAjuste || !motivoAjuste.trim()) {
      return alert("Selecione o conferente, digite os pontos e escreva o motivo obrigatório!");
    }
    
    try {
      await addDoc(collection(db, 'ajustesDiarios'), {
        dataOperacao: dataFiltro,
        tipo: 'bonus',
        isPerdao: false, // Mantido como false padrão
        usuarioNome: usuarioSelecionado,
        pontos: Number(pontosAjuste),
        motivo: motivoAjuste.trim(),
        createdAt: serverTimestamp()
      });

      alert(`Sucesso! Ajuste de ${pontosAjuste} pontos lançado para ${usuarioSelecionado.toUpperCase()}.`);
      setPontosAjuste(''); 
      setMotivoAjuste('');
      setUsuarioSelecionado(''); 
      
    } catch (error) {
      console.error("Erro ao registrar ajuste:", error);
      alert("Falha de comunicação com o banco de dados.");
    }
  };

  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Shield size={24} color="#3b82f6" />
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem' }}>Painel de Intervenção da Liderança</h3>
          <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Ajustes manuais e bonificações da operação</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
            1. Selecione o Conferente:
          </label>
          <select 
            value={usuarioSelecionado} 
            onChange={(e) => setUsuarioSelecionado(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
          >
            <option value="">-- Escolha um colaborador --</option>
            {listaUsuarios.map((nome, index) => (
              <option key={index} value={nome}>{nome.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 120px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
            2. Pontos (+ / -):
          </label>
          <input 
            type="number" 
            placeholder="Ex: 50"
            value={pontosAjuste}
            onChange={(e) => setPontosAjuste(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
          />
        </div>

        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
            3. Motivo (Obrigatório):
          </label>
          <input 
            type="text" 
            placeholder="Ex: OP pesada, abono ociosidade..."
            value={motivoAjuste}
            onChange={(e) => setMotivoAjuste(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
          />
        </div>

        <div style={{ display: 'flex', flex: '1 1 150px' }}>
          <button 
            onClick={handleAplicarBonus}
            style={{ width: '100%', padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            <PlusCircle size={18} /> Lançar Ajuste
          </button>
        </div>
        
      </div>

      <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem' }}>
        <AlertTriangle size={16} color="#f59e0b" />
        <em>Ações realizadas neste painel criam um registro permanente no histórico diário do colaborador.</em>
      </div>

    </div>
  );
}