// src/components/AdmControlesManuais.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  PlusCircle, AlertTriangle, ChevronDown, Check, User, 
  Search, Clock, ShieldCheck, Calendar
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; 

export default function AdmControlesManuais({ dados, dataFiltro }) {
  const [modoAba, setModoAba] = useState('timeline'); // 'timeline' ou 'pontos'
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [buscaColaborador, setBuscaColaborador] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Campos da Linha do Tempo
  const [horaInicio, setHoraInicio] = useState('16:00');
  const [horaFim, setHoraFim] = useState('17:30');
  const [motivoTimeline, setMotivoTimeline] = useState('Romaneio transferido de dia');
  const [isSalvando, setIsSalvando] = useState(false);

  const triggerRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Mapeia os usuários disponíveis
  const listaUsuariosCompletos = React.useMemo(() => {
    if (!dados) return [];
    const targetDados = dados.ranking || dados;
    if (Array.isArray(targetDados)) {
      return targetDados.map(u => ({
        uid: u.uid || u.id || '',
        nome: u.nome || u.nickname || (u.email ? u.email.split('@')[0] : 'Usuário'),
        email: u.email || ''
      }));
    }
    return Object.entries(targetDados).map(([chave, valor]) => ({
      uid: valor?.uid || chave,
      nome: valor?.nome || valor?.nickname || chave,
      email: valor?.email || ''
    }));
  }, [dados]);

  const usuariosFiltrados = listaUsuariosCompletos.filter(u => 
    u.nome.toLowerCase().includes(buscaColaborador.toLowerCase().trim()) ||
    u.email.toLowerCase().includes(buscaColaborador.toLowerCase().trim())
  );

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

  // Grava o bloco direto na Linha do Tempo (controlePausas)
  const handleGravarTimeline = async () => {
    if (!usuarioSelecionado) return alert("Selecione o conferente!");
    if (!horaInicio || !horaFim) return alert("Informe o horário inicial e final!");

    setIsSalvando(true);
    try {
      const [ano, mes, dia] = dataFiltro.split('-');
      const [hIni, mIni] = horaInicio.split(':');
      const [hFim, mFim] = horaFim.split(':');

      const startMs = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hIni), Number(mIni), 0).getTime();
      const endMs = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hFim), Number(mFim), 0).getTime();

      if (endMs <= startMs) {
        setIsSalvando(false);
        return alert("O horário final deve ser maior que o horário inicial!");
      }

      const refPausas = doc(db, 'controlePausas', dataFiltro);
      const snap = await getDoc(refPausas);
      const dadosAtuais = snap.exists() ? snap.data() : {};

      const uid = usuarioSelecionado.uid || usuarioSelecionado.nome;
      const nomeUser = usuarioSelecionado.nome;
      const emailPrefix = usuarioSelecionado.email ? usuarioSelecionado.email.split('@')[0] : '';

      let userStatus = dadosAtuais[uid] || dadosAtuais[nomeUser] || dadosAtuais[emailPrefix] || { isPaused: false, history: [] };
      if (!Array.isArray(userStatus.history)) userStatus.history = [];

      // Injeta o bloco na timeline do conferente
      userStatus.history.push({
        start: startMs,
        end: endMs,
        motivo: motivoTimeline || "Atividade/Pausa Manual ADM"
      });

      await setDoc(refPausas, {
        [uid]: userStatus,
        [nomeUser]: userStatus,
        ...(emailPrefix ? { [emailPrefix]: userStatus } : {})
      }, { merge: true });

      alert(`Sucesso! Linha do tempo de ${nomeUser.toUpperCase()} ajustada das ${horaInicio} às ${horaFim}. A ociosidade foi preenchida!`);
      setUsuarioSelecionado(null);
    } catch (error) {
      console.error("Erro ao gravar na timeline:", error);
      alert("Erro ao gravar no banco: " + error.message);
    } finally {
      setIsSalvando(false);
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
    boxSizing: 'border-box'
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* SELETOR DE CONFERENTE */}
      <div>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
          Conferente a Ajustar:
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
            borderColor: isDropdownOpen ? 'var(--primary)' : 'var(--border-color)'
          }}
        >
          <span style={{ fontWeight: usuarioSelecionado ? 700 : 400, color: usuarioSelecionado ? 'var(--text-main)' : 'var(--text-muted)' }}>
            {usuarioSelecionado ? usuarioSelecionado.nome.toUpperCase() : '-- Selecione o Colaborador --'}
          </span>
          <ChevronDown size={16} color="var(--text-muted)" />
        </div>
      </div>

      {/* DROPDOWN POPUP */}
      {isDropdownOpen && (
        <div 
          ref={dropdownMenuRef}
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
            zIndex: 9999999,
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '320px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar..."
              value={buscaColaborador}
              onChange={(e) => setBuscaColaborador(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontSize: '0.85rem', width: '100%' }}
            />
          </div>

          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {usuariosFiltrados.map((u, i) => (
              <div
                key={i}
                onClick={() => { setUsuarioSelecionado(u); setIsDropdownOpen(false); }}
                style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'flex', justifyContent: 'space-between' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span>{u.nome.toUpperCase()}</span>
                {usuarioSelecionado?.uid === u.uid && <Check size={14} color="#38bdf8" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE PREENCHIMENTO DA LINHA DO TEMPO */}
      <div style={{ background: 'var(--bg-input)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 800, fontSize: '0.92rem' }}>
          <Clock size={16} /> Preencher Período na Linha do Tempo (Apaga Ociosidade)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Início:</label>
            <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Fim:</label>
            <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Motivo:</label>
          <input type="text" value={motivoTimeline} onChange={e => setMotivoTimeline(e.target.value)} style={inputStyle} />
        </div>

        <button
          onClick={handleGravarTimeline}
          disabled={isSalvando}
          style={{
            padding: '12px',
            background: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}
        >
          <ShieldCheck size={18} /> Gravar Linha do Tempo e Anular Multa
        </button>
      </div>

    </div>
  );
}