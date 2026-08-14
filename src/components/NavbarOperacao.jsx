// src/components/NavbarOperacao.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  Search, Power, ArrowLeft, Clock, Plus, UserCircle, Settings, 
  Palette, Camera, CheckCircle, SearchX, Loader2 
} from 'lucide-react';

import logoEgaplast from '../img/egaplast.png';

export default function NavbarOperacao({ 
  user, 
  isAdmin, 
  dataOperacaoAtiva, 
  buscaRomaneio, 
  setBuscaRomaneio, 
  handleOpenModal 
}) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ==========================================
  // ESTADOS DO PERFIL E TEMAS
  // ==========================================
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);
  
  const [userProfile, setUserProfile] = useState({ nickname: '', photoURL: '', theme: 'light' });
  const [formProfile, setFormProfile] = useState({ nickname: '', photoURL: '', theme: 'light' });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'usuarios', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profileData = {
          nickname: data.nickname || '',
          photoURL: data.photoURL || '',
          theme: data.theme || 'light'
        };
        setUserProfile(profileData);
        aplicarTemaGlobal(profileData.theme);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const aplicarTemaGlobal = (tema) => {
    const root = document.documentElement;

    if (tema === 'dark') {
      root.style.setProperty('--bg-main', 'linear-gradient(145deg, #050505 0%, #0f0f13 50%, #18181b 100%)');
      root.style.setProperty('--bg-card', '#0e0e11');
      root.style.setProperty('--text-main', '#f8fafc');
      root.style.setProperty('--text-muted', '#a1a1aa');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--logo-filter', 'brightness(0) invert(1)'); 
      root.style.setProperty('--text-highlight', '#ffffff'); 
    } else if (tema === 'dark-blue') {
      root.style.setProperty('--bg-main', 'linear-gradient(145deg, #020617 0%, #061124 50%, #0b1936 100%)');
      root.style.setProperty('--bg-card', '#0a1226');
      root.style.setProperty('--text-main', '#f8fafc');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-color', 'rgba(56, 189, 248, 0.12)');
      root.style.setProperty('--logo-filter', 'brightness(0) invert(1)'); 
      root.style.setProperty('--text-highlight', '#38bdf8'); 
    } else {
      root.style.setProperty('--bg-main', 'linear-gradient(145deg, #e2e8f0 0%, #eef2f6 50%, #f8fafc 100%)');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--text-main', '#0f172a');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-color', '#cbd5e1');
      root.style.setProperty('--logo-filter', 'none'); 
      root.style.setProperty('--text-highlight', 'var(--primary)'); 
    }
  };

  const handleOpenSettings = () => {
    setFormProfile(userProfile);
    setShowSettingsModal(true);
    setIsProfileMenuOpen(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) return alert("A imagem é muito pesada. Escolha uma imagem de até 1MB.");
    
    const reader = new FileReader();
    reader.onloadend = () => setFormProfile(prev => ({ ...prev, photoURL: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), {
        nickname: formProfile.nickname,
        photoURL: formProfile.photoURL,
        theme: formProfile.theme
      });
      setShowSettingsModal(false);
    } catch (error) { alert("Erro ao salvar o perfil."); } 
    finally { setIsSavingProfile(false); }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem('justLoggedIn');
      navigate('/');
    } catch (error) { console.error("Erro ao desconectar: ", error); }
  };

  // Processamento do Nome e Data
  const displayName = userProfile.nickname || (user?.email ? user.email.split('@')[0] : 'Usuário');
  const primeiroNome = displayName.split(' ')[0];
  const [ano, mes, dia] = dataOperacaoAtiva.split('-');
  const dataFormatada = `${dia}/${mes}`;

  return (
    <>
      <nav style={{ 
        borderBottom: '1px solid var(--border-color)', 
        background: 'var(--bg-card)',
        fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        {/* ENVOLTÓRIO CENTRALIZADOR COM LARGURA MÁXIMA IGUAL À OPERAÇÃO */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1600px', /* Mesma largura do op-wrapper */
          margin: '0 auto',
          padding: '15px 20px',
          width: '100%'
        }}>
          
          {/* LADO ESQUERDO: LOGO, VOLTAR E SAUDAÇÃO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              onClick={() => navigate('/dashboard')} 
              style={{ 
                background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', 
                width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' 
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              title="Voltar ao Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
            
            <img 
              src={logoEgaplast} 
              alt="Egaplast Logo" 
              style={{ height: '50px', objectFit: 'contain', filter: 'var(--logo-filter, none)', cursor: 'pointer' }} 
              onClick={() => navigate('/dashboard')} 
            />
            
            <div style={{ width: '1px', height: '30px', background: 'var(--border-color)', margin: '0 10px' }}></div>
            
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', margin: 0, fontWeight: 800, fontFamily: "'Inter', sans-serif" }}>
              Olá, <span style={{ color: 'var(--primary)' }}>{primeiroNome}</span> <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)', fontWeight: 500 }}>({dataFormatada})</span>
            </h2>
          </div>

          {/* LADO DIREITO: CONTROLES DA OPERAÇÃO + PERFIL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            
            {/* Calendário de Data */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
              <Clock size={16} color="var(--text-muted)" />
              <input 
                type="date" 
                value={dataOperacaoAtiva} 
                onChange={(e) => { if (e.target.value) navigate(`${location.pathname}?date=${e.target.value}`); }}
                style={{ border: 'none', outline: 'none', color: 'var(--text-main)', fontWeight: 'bold', background: 'transparent', fontSize: '0.9rem', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            {/* Barra de Busca (Romaneio/Loja) */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Buscar romaneio ou loja..." 
                value={buscaRomaneio}
                onChange={(e) => setBuscaRomaneio(e.target.value)}
                style={{ 
                  padding: '10px 15px 10px 38px', border: '1px solid var(--border-color)', borderRadius: '10px', 
                  fontSize: '0.95rem', width: '250px', background: 'var(--bg-card)', color: 'var(--text-main)', 
                  outline: 'none', transition: 'all 0.3s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', fontFamily: "'Inter', sans-serif"
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            {/* Botão Novo Pedido */}
            <button 
              onClick={handleOpenModal} 
              style={{ 
                padding: '10px 22px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', 
                fontWeight: 700, fontSize: '0.95rem', background: 'var(--primary)', color: '#fff', border: 'none', 
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(13, 50, 105, 0.2)', transition: 'transform 0.2s', fontFamily: "'Inter', sans-serif" 
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Plus size={18} /> Novo Pedido
            </button>

            <div style={{ width: '1px', height: '30px', background: 'var(--border-color)', margin: '0 5px' }}></div>

            {/* Menu Dropdown de Perfil */}
            <div className="user-profile-section" ref={dropdownRef} style={{ position: 'relative' }}>
              <div 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-highlight)', fontSize: '0.95rem', lineHeight: '1.2', fontFamily: "'Inter', sans-serif" }}>{displayName}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: "'Inter', sans-serif" }}>{isAdmin ? 'Administrador' : 'Conferente'}</span>
                </div>

                {userProfile.photoURL ? (
                  <img src={userProfile.photoURL} alt="Perfil" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', fontFamily: "'Inter', sans-serif" }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {isProfileMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', width: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 100, animation: 'fadeIn 0.2s ease-out' }}>
                  <div style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Sessão Ativa</span>
                    <span style={{ display: 'block', fontSize: '0.85rem', color: '#334155', wordBreak: 'break-all', fontFamily: "'Inter', sans-serif" }}>{user?.email}</span>
                  </div>
                  
                  <div style={{ padding: '5px' }}>
                    <button onClick={handleOpenSettings} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px', background: 'transparent', border: 'none', textAlign: 'left', color: '#475569', fontSize: '0.9rem', cursor: 'pointer', borderRadius: '6px', fontFamily: "'Inter', sans-serif" }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = 'var(--primary)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}>
                      <UserCircle size={18} /> Meu Perfil e Tema
                    </button>
                    <button onClick={() => { setIsProfileMenuOpen(false); setShowLogoutConfirm(true); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px', background: 'transparent', border: 'none', textAlign: 'left', color: '#ef4444', fontSize: '0.9rem', cursor: 'pointer', borderRadius: '6px', fontFamily: "'Inter', sans-serif" }} onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <Power size={18} /> Sair da Conta
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* O resto do código dos modais (showSettingsModal e showLogoutConfirm) continua intacto abaixo daqui... */}

      {/* ==========================================
          MODAL DE CONFIGURAÇÃO DE PERFIL
          ========================================== */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '500px', maxWidth: '95%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ background: '#f8fafc', padding: '20px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
                <Settings size={22} color="var(--primary)"/> Configurações da Conta
              </h3>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><SearchX size={24}/></button>
            </div>

            <div style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  {formProfile.photoURL ? (
                    <img src={formProfile.photoURL} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserCircle size={40} />
                    </div>
                  )}
                  <label style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: 'var(--primary)', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Importar imagem">
                    <Camera size={16} />
                    <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                </div>
                {formProfile.photoURL && (
                  <button onClick={() => setFormProfile(prev => ({ ...prev, photoURL: '' }))} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}>Remover Foto</button>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>Como quer ser chamado?</label>
                <input type="text" value={formProfile.nickname} onChange={e => setFormProfile({...formProfile, nickname: e.target.value})} placeholder="Ex: João Silva" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginTop: '5px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '12px' }}><Palette size={14} style={{ display: 'inline', marginRight: '4px' }}/> Tema da Plataforma</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div onClick={() => setFormProfile({...formProfile, theme: 'light'})} style={{ border: `2px solid ${formProfile.theme === 'light' ? 'var(--primary)' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', background: formProfile.theme === 'light' ? '#f0f9ff' : '#fff' }}>
                    <div style={{ width: '100%', height: '40px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '8px' }}></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Claro (Padrão)</span>
                  </div>
                  <div onClick={() => setFormProfile({...formProfile, theme: 'dark-blue'})} style={{ border: `2px solid ${formProfile.theme === 'dark-blue' ? 'var(--primary)' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', background: formProfile.theme === 'dark-blue' ? '#eff6ff' : '#fff' }}>
                    <div style={{ width: '100%', height: '40px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', marginBottom: '8px' }}></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Azul Escuro</span>
                  </div>
                  <div onClick={() => setFormProfile({...formProfile, theme: 'dark'})} style={{ border: `2px solid ${formProfile.theme === 'dark' ? 'var(--primary)' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'center', background: formProfile.theme === 'dark' ? '#f8fafc' : '#fff' }}>
                    <div style={{ width: '100%', height: '40px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', marginBottom: '8px' }}></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Modo Escuro</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 25px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button onClick={() => setShowSettingsModal(false)} disabled={isSavingProfile} style={{ padding: '10px 20px', border: 'none', background: 'transparent', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSaveProfile} disabled={isSavingProfile} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 25px', border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                {isSavingProfile ? <Loader2 size={18} className="fa-spin"/> : <CheckCircle size={18}/>} Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE LOGOUT */}
      {showLogoutConfirm && (
        <div className="modal-overlay-search" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal-content-search" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', maxWidth: '400px' }}>
            <div style={{ padding: '45px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: '#fff5f5', padding: '20px', borderRadius: '50%', marginBottom: '20px', border: '1px solid #ffebeb' }}><Power size={48} color="#dc3545" /></div>
              <h3 style={{ fontSize: '1.6rem', color: '#a0a8b6', margin: '0 0 10px 0', fontWeight: '800' }}>Sair do Sistema?</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '35px' }}>Tem certeza que deseja desconectar sua conta?</p>
              <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                <button style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '10px', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setShowLogoutConfirm(false)}>Cancelar</button>
                <button style={{ flex: 1, padding: '12px', background: '#dc3545', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleLogout}>Sim, Sair</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}