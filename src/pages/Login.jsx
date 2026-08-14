// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import '../css/Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [splashActive, setSplashActive] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [userName, setUserName] = useState('');

  const navigate = useNavigate();

  const aplicarTemaGlobal = (tema) => {
    const root = document.documentElement;

    if (tema === 'dark') {
      root.style.setProperty('--bg-main', 'linear-gradient(140deg, #050505 0%, #18181b 45%, #27272a 100%)');
      root.style.setProperty('--bg-card', '#0e0e11');
      root.style.setProperty('--text-main', '#f8fafc');
      root.style.setProperty('--text-muted', '#a1a1aa');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--logo-filter', 'brightness(0) invert(1)'); 
      root.style.setProperty('--checkout-logo-filter', 'invert(1)');
      root.style.setProperty('--checkout-logo-blend', 'screen'); // Faz o fundo preto da imagem sumir
      root.style.setProperty('color-scheme', 'dark');
      root.style.setProperty('--text-highlight', '#ffffff'); 
      root.style.setProperty('--bg-hero', 'linear-gradient(135deg, #27272a 0%, #09090b 100%)'); 
      root.style.setProperty('--bg-hero-badge', 'rgba(255, 255, 255, 0.1)'); 

    } else if (tema === 'dark-blue') {
      root.style.setProperty('--bg-main', 'linear-gradient(140deg, #020617 0%, #0c2340 45%, #1e40af 100%)');
      root.style.setProperty('--bg-card', '#0b1329');
      root.style.setProperty('--text-main', '#f8fafc');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-color', 'rgba(56, 189, 248, 0.2)');
      root.style.setProperty('--logo-filter', 'brightness(0) invert(1)'); 
      root.style.setProperty('--checkout-logo-filter', 'invert(1)');
      root.style.setProperty('--checkout-logo-blend', 'screen'); // Faz o fundo preto da imagem sumir
      root.style.setProperty('color-scheme', 'dark');
      root.style.setProperty('--text-highlight', '#38bdf8'); 
      root.style.setProperty('--bg-hero', 'linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%)'); 
      root.style.setProperty('--bg-hero-badge', 'rgba(255, 255, 255, 0.2)');

    } else {
      root.style.setProperty('--bg-main', 'linear-gradient(140deg, #bfdbfe 0%, #dbeafe 40%, #f1f5f9 100%)');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--text-main', '#0f172a');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-color', '#cbd5e1');
      root.style.setProperty('--logo-filter', 'none'); 
      root.style.setProperty('--checkout-logo-filter', 'none'); 
      root.style.setProperty('--checkout-logo-blend', 'multiply'); // Faz o fundo branco original da imagem sumir
      root.style.setProperty('color-scheme', 'light');
      root.style.setProperty('--text-highlight', 'var(--primary)'); 
      root.style.setProperty('--bg-hero', 'linear-gradient(135deg, #0d3269 0%, #1d4ed8 100%)'); 
      root.style.setProperty('--bg-hero-badge', 'rgba(255, 255, 255, 0.25)');
    }
  };

  useEffect(() => {
    // Carrega o último tema salvo no dispositivo
    const temaSalvo = localStorage.getItem('egaplast_user_theme') || 'light';
    aplicarTemaGlobal(temaSalvo);
  }, []);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setSplashFading(true);
    }, 2000);

    const removeTimer = setTimeout(() => {
      setSplashActive(false);
    }, 2800); 

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    const savedEmail = localStorage.getItem('egaplast_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Busca tema no Firestore para sincronizar com localStorage
      try {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (userDoc.exists() && userDoc.data().theme) {
          const userTheme = userDoc.data().theme;
          localStorage.setItem('egaplast_user_theme', userTheme);
          aplicarTemaGlobal(userTheme);
        }
      } catch (err) {
        console.error("Erro ao sincronizar tema:", err);
      }

      if (rememberMe) {
        localStorage.setItem('egaplast_saved_email', email);
      } else {
        localStorage.removeItem('egaplast_saved_email');
      }

      let targetUrl = "/dashboard"; 
      if (user.email === "alan@egaplast.com") {
          targetUrl = "/dashboard-viewer"; 
      }

      const namePart = user.email.split('@')[0];
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      
      setUserName(formattedName);
      setShowSuccessScreen(true);
      sessionStorage.setItem('justLoggedIn', 'true');

      setTimeout(() => {
        navigate(targetUrl);
      }, 2500); 

    } catch (error) {
      console.error(error);
      setIsLoading(false);
      
      if(error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          toast.error("Senha incorreta. Tente novamente.");
      } else if(error.code === 'auth/user-not-found') {
          toast.error("E-mail não encontrado.");
      } else {
          toast.error("Erro ao acessar a plataforma.");
      }
    }
  };

  if (splashActive) {
    return (
      <div className={`splash-container ${splashFading ? 'splash-fade-out' : ''}`}>
        <img src="/src/img/egaplast.png" alt="Logo Sistema" className="splash-logo-center" />
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <Toaster />

      {showSuccessScreen && (
        <div className="success-splash-container">
          <div className="success-content">
            <div className="success-icon-wrapper">
              <CheckCircle size={52} />
            </div>
            <h2>Bem-vindo(a), {userName}!</h2>
            <p>Preparando o seu dashboard...</p>
            <Loader2 className="spinner success-spinner" size={40} />
          </div>
        </div>
      )}

      <div className="brand-side">
        <div className="brand-content">
          <img src="/src/img/egaplast.png" alt="Logo Sistema Checkout" className="brand-logo" />
          <p>Gestão ágil e inteligente de pedidos.</p>
          <div className="brand-decoration"></div>
        </div>
      </div>

      <div className="form-side">
        <div className="form-content">
          <div className="logo-container">
            <img 
              src="/src/img/checkout-logo.png" 
              alt="Egaplast Logo" 
              className="checkout-logo-theme"
            />
          </div>
          
          <div className="login-header">
            <h2>Checkout Egaplast</h2>
            <p>Insira suas credenciais para continuar.</p>
          </div>

          <form onSubmit={handleLogin}>
            
            <div className="input-group">
              <Mail className="input-icon" size={20} />
              <input 
                type="email" 
                id="email"
                className="floating-input"
                placeholder=" "
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="email" className="floating-label">Seu e-mail</label>
            </div>
            
            <div className="input-group">
              <Lock className="input-icon" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                id="password"
                className="floating-input"
                placeholder=" "
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label htmlFor="password" className="floating-label">Sua senha</label>
              
              <button 
                type="button" 
                className="btn-eye"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkmark"></span>
                Lembrar meu e-mail
              </label>
            </div>

            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="spinner" size={24} /> : "Entrar na Plataforma"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}