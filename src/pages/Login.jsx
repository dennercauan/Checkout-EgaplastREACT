// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import '../css/Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // NOVOS ESTADOS PARA A SPLASH SCREEN
  const [splashActive, setSplashActive] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  const navigate = useNavigate();

  // Efeito que controla o tempo da tela de abertura
  useEffect(() => {
    // Aos 2 segundos, começa a esmaecer (fade out) a splash screen
    const fadeTimer = setTimeout(() => {
      setSplashFading(true);
    }, 2000);

    // Aos 2.8 segundos, remove a splash da tela e carrega o login
    const removeTimer = setTimeout(() => {
      setSplashActive(false);
    }, 2800); 

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Verifica se há e-mail salvo
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
      
      // Salva ou remove o e-mail do localStorage dependendo do checkbox
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

      // Dispara a notificação de sucesso
      toast.success(`Bem-vindo de volta, ${formattedName}!`, {
        duration: 2000,
        position: 'top-center',
      });

      sessionStorage.setItem('justLoggedIn', 'true');

      // Aguarda o toast aparecer antes de trocar de tela
      setTimeout(() => {
        navigate(targetUrl);
      }, 1500); 

    } catch (error) {
      console.error(error);
      setIsLoading(false);
      
      // Dispara a notificação de erro (Toasts)
      if(error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          toast.error("Senha incorreta. Tente novamente.");
      } else if(error.code === 'auth/user-not-found') {
          toast.error("E-mail não encontrado.");
      } else {
          toast.error("Erro ao acessar a plataforma.");
      }
    }
  };

  // Se a splash screen estiver ativa, renderiza ela e ignora o resto
  if (splashActive) {
    return (
      <div className={`splash-container ${splashFading ? 'splash-fade-out' : ''}`}>
        {/* Reutilizamos a sua logo branca aqui */}
        <img src="/src/img/egaplast.png" alt="Logo Sistema" className="splash-logo-center" />
      </div>
    );
  }

  // O seu return original do login começa aqui
  return (
    <div className="login-wrapper">
      {/* Container de notificações do react-hot-toast */}
      <Toaster />

      {/* Lado Esquerdo - Branding (Oculto no Mobile) */}
      <div className="brand-side">
        <div className="brand-content">
          {/* Trocamos o <h1> pela imagem */}
          <img src="src/img/egaplast.png" alt="Logo Sistema Checkout" className="brand-logo" />
          
          <p>Gestão ágil e inteligente de pedidos.</p>
          <div className="brand-decoration"></div>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="form-side">
        <div className="form-content">
          <div className="logo-container">
            <img src="/src/img/checkout-logo.png" alt="Egaplast Logo" />
          </div>
          
          <div className="login-header">
            <h2>Checkout Egaplast</h2>
            <p>Insira suas credenciais para continuar.</p>
          </div>

          <form onSubmit={handleLogin}>
            
            {/* Input Email - Floating Label */}
            <div className="input-group">
              <Mail className="input-icon" size={20} />
              <input 
                type="email" 
                id="email"
                className="floating-input"
                placeholder=" " /* O espaço vazio é obrigatório para o CSS funcionar */
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="email" className="floating-label">Seu e-mail</label>
            </div>
            
            {/* Input Senha - Floating Label com Olhinho */}
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

            {/* Lembrar e-mail */}
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