// src/components/AdmControlesManuais.jsx
import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, AlertTriangle, ChevronDown, Check, User, Search } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; 

export default function AdmControlesManuais({ dados, dataFiltro }) {
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [pontosAjuste, setPontosAjuste] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [buscaColaborador, setBuscaColaborador] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  const searchInputRef = useRef(null);
  
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
  listaUsuarios = [...new Set(listaUsuarios)].sort((a, b) => a.localeCompare(b));

  const usuariosFiltrados = listaUsuarios.filter(nome => 
    nome.toLowerCase().includes(buscaColaborador.toLowerCase().trim())
  );

  // Calcula a posição fixa na tela para escapar dos limites do modal
  const handleToggleDropdown = () => {
    if (!isDropdownOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 260)
      });
    }
    setIsDropdownOpen(prev => !prev);
  };

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(event.target);
      const isOutsideMenu = dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target);
      if (isOutsideTrigger && isOutsideMenu) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } else {
      setBuscaColaborador('');
    }
  }, [isDropdownOpen]);

  const handleAplicarBonus = async () => {
    if (!usuarioSelecionado || !pontosAjuste || !motivoAjuste.trim()) {
      return alert("Selecione o conferente, digite os pontos e escreva o motivo obrigatório!");
    }
    
    try {
      await addDoc(collection(db, 'ajustesDiarios'), {
        dataOperacao: dataFiltro,
        tipo: 'bonus',
        isPerdao: false,
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

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
    outline: 'none',
    background: 'var(--bg-card, #0f172a)',
    color: 'var(--text-main, #f8fafc)',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease'
  };

  return (
    <div style={{ 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    }}>
      
      {/* FORMULÁRIO DE ENTRADA */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '16px', 
        alignItems: 'flex-end', 
        background: 'var(--bg-input, rgba(0, 0, 0, 0.25))', 
        padding: '22px', 
        borderRadius: '12px', 
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
      }}>
        
        {/* TRIGGER DO DROPDOWN */}
        <div style={{ flex: '1 1 240px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }}>
            1. Selecione o Conferente:
          </label>
          
          <div
            ref={triggerRef}
            onClick={handleToggleDropdown}
            style={{
              ...inputStyle,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
              borderColor: isDropdownOpen ? 'var(--primary, #38bdf8)' : 'var(--border-color, rgba(255, 255, 255, 0.15))'
            }}
          >
            <span style={{ 
              color: usuarioSelecionado ? 'var(--text-main, #f8fafc)' : 'var(--text-muted, #94a3b8)', 
              fontWeight: usuarioSelecionado ? 600 : 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              paddingRight: '8px'
            }}>
              {usuarioSelecionado ? usuarioSelecionado.toUpperCase() : '-- Escolha um colaborador --'}
            </span>
            <ChevronDown 
              size={16} 
              style={{ 
                color: 'var(--text-muted, #94a3b8)', 
                transform: isDropdownOpen ? 'rotate(180deg)' : 'none', 
                transition: 'transform 0.2s ease',
                flexShrink: 0
              }} 
            />
          </div>
        </div>

        {/* LISTA FLUTUANTE QUE PULA PARA FORA DO MODAL (POSITION FIXED) */}
        {isDropdownOpen && (
          <div 
            ref={dropdownMenuRef}
            style={{
              position: 'fixed',
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`,
              background: 'var(--bg-card, #1e293b)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.2))',
              borderRadius: '12px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
              zIndex: 9999999,
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '380px'
            }}
          >
            {/* BUSCA RÁPIDA */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 10px',
              background: 'var(--bg-input, rgba(0, 0, 0, 0.35))',
              borderRadius: '8px',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))'
            }}>
              <Search size={14} color="var(--text-muted, #94a3b8)" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Pesquisar conferente..."
                value={buscaColaborador}
                onChange={(e) => setBuscaColaborador(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--text-main, #f8fafc)',
                  fontSize: '0.85rem',
                  width: '100%',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* LISTAGEM AMPLA ROLÁVEL */}
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '2px',
              paddingRight: '2px'
            }}>
              {usuariosFiltrados.length === 0 ? (
                <div style={{ padding: '16px', color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem', textAlign: 'center' }}>
                  Nenhum colaborador encontrado
                </div>
              ) : (
                usuariosFiltrados.map((nome, index) => {
                  const isSelected = usuarioSelecionado === nome;
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        setUsuarioSelecionado(nome);
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? 'var(--text-highlight, #38bdf8)' : 'var(--text-main, #f8fafc)',
                        background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={14} color={isSelected ? 'var(--text-highlight, #38bdf8)' : 'var(--text-muted, #94a3b8)'} />
                        {nome.toUpperCase()}
                      </span>
                      {isSelected && <Check size={16} color="var(--text-highlight, #38bdf8)" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div style={{ flex: '1 1 120px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }}>
            2. Pontos (+ / -):
          </label>
          <input 
            type="number" 
            placeholder="Ex: 50"
            value={pontosAjuste}
            onChange={(e) => setPontosAjuste(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }}>
            3. Motivo (Obrigatório):
          </label>
          <input 
            type="text" 
            value={motivoAjuste}
            onChange={(e) => setMotivoAjuste(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flex: '1 1 150px' }}>
          <button 
            onClick={handleAplicarBonus}
            style={{ 
              width: '100%', 
              padding: '11px', 
              background: 'var(--primary, #3b82f6)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '10px', 
              fontWeight: 700, 
              fontSize: '0.9rem',
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '8px',
              fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <PlusCircle size={18} /> Lançar Ajuste
          </button>
        </div>
        
      </div>

      {/* AVISO INFORMATIVO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted, #94a3b8)', fontSize: '0.82rem' }}>
        <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
        <span>Ações realizadas neste painel criam um registro permanente no histórico diário do colaborador.</span>
      </div>

    </div>
  );
}