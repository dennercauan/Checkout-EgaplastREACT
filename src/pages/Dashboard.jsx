// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Navbar from '../components/Navbar';
import PersonalDashboard from '../components/PersonalDashboard'; 
import '../css/Dashboard.css';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true); 
  
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'usuarios', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data().isAdmin === true) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
          
          setUser(currentUser);
        } catch (error) {
          console.error("Erro ao verificar permissão: ", error);
        } finally {
          setLoading(false); 
        }
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Limpa a memória para que atualizações futuras (F5) não tenham a transição azul
  useEffect(() => {
    if (!loading && sessionStorage.getItem('justLoggedIn') === 'true') {
      const timer = setTimeout(() => {
         sessionStorage.removeItem('justLoggedIn');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const isFirstLogin = sessionStorage.getItem('justLoggedIn') === 'true';

  if (loading) {
    // CAMUFLAGEM PERFEITA: Se ele veio do login, a "tela em branco" na verdade é Azul Escura (igualzinho o sucesso do login)
    if (isFirstLogin) {
      return <div style={{ height: '100vh', width: '100vw', background: 'linear-gradient(135deg, #0d3269 0%, #061833 100%)' }}></div>;
    }
    // Se ele deu F5 na página solta, fundo cinza normal.
    return <div style={{ height: '100vh', width: '100vw', background: '#f0f2f5' }}></div>;
  }

  if (!user) return null;

  return (
    <>
      {/* 
        A CORTINA QUE DERRETE:
        Ela começa com a mesma cor azul escuro do login e desaparece (fade-out) em 1 segundo.
      */}
      {isFirstLogin && (
         <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'linear-gradient(135deg, #0d3269 0%, #061833 100%)',
            zIndex: 999999,
            animation: 'fadeOutBlue 1s ease-in-out forwards',
            pointerEvents: 'none'
         }}>
            <style>
              {`
                @keyframes fadeOutBlue {
                  0% { opacity: 1; }
                  100% { opacity: 0; visibility: hidden; }
                }
              `}
            </style>
         </div>
      )}

      <div className="dashboard-layout">
        <div className="app-container">
          
          <Navbar user={user} isAdmin={isAdmin} />
          
          <main style={{ padding: '0' }}>
            <PersonalDashboard user={user} isAdmin={isAdmin} />
          </main>

        </div>
      </div>
    </>
  );
}