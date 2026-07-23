// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import '../css/Dashboard.css';
import PersonalDashboard from '../components/PersonalDashboard'; // Importação do novo layout
import '../css/Dashboard.css';

// Importaremos os componentes visuais que criaremos depois
// import AdminDashboard from '../components/AdminDashboard';
// import PersonalDashboard from '../components/PersonalDashboard';
// import Navbar from '../components/Navbar';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true); // Controla a tela de carregamento inicial
  
  const navigate = useNavigate();

  useEffect(() => {
    // onAuthStateChanged é um "listener". Precisamos salvá-lo para limpar quando o componente for desmontado.
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Usuário está logado. Vamos verificar no Firestore se ele é Admin.
        try {
          // Busca o documento do usuário na coleção "usuarios"
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
          setLoading(false); // Terminou de carregar as permissões
        }
      } else {
        // Se não tem usuário, chuta de volta para o Login
        navigate('/');
      }
    });

    // Função de limpeza para evitar vazamento de memória
    return () => unsubscribe();
  }, [navigate]);

  // 1. Estado de Carregamento
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Loader2 className="spinner" size={48} color="#0d3269" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: '#666', fontWeight: '600' }}>Autenticando credenciais...</p>
      </div>
    );
  }

  // 2. Proteção extra (não renderiza nada se o user for null antes do redirecionamento)
  if (!user) return null;

// 3. Renderização Condicional Inteligente
  return (
    <div className="dashboard-layout">
      <div className="app-container">
        
        {/* A Navbar agora recebe o usuário e a permissão */}
        <Navbar user={user} isAdmin={isAdmin} />
        
        <main style={{ padding: '20px 0' }}>
          {isAdmin ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h2>Visão Global (Admin)</h2>
              <p>Componente AdminDashboard será renderizado aqui.</p>
            </div>
          ) : (
            /* Substituímos o texto antigo pelo componente injetando o usuário */
            <PersonalDashboard user={user} />
          )}
        </main>
      </div>
    </div>
  );
}