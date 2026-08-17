// src/components/AnimacaoCriacaoPedido.jsx
import React, { useState, useEffect } from 'react';
import { PackageCheck, Radio } from 'lucide-react';
import '../css/AnimacaoCriacaoPedido.css';

export default function AnimacaoCriacaoPedido({ dadosPedido }) {
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (dadosPedido) {
      setSaindo(false);
      // Inicia o fade-out 500ms antes do unmount total
      const timer = setTimeout(() => {
        setSaindo(true);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [dadosPedido]);

  if (!dadosPedido) return null;

  return (
    <div className={`op-activation-overlay ${saindo ? 'fade-out' : 'fade-in'}`}>
      {/* Luz de Fundo e Ondas de Pulso */}
      <div className="activation-backdrop-glow" />
      <div className="activation-shockwave ring-1" />
      <div className="activation-shockwave ring-2" />
      <div className="activation-shockwave ring-3" />

      {/* Núcleo Central do HUD */}
      <div className="activation-hud-core">
        <div className="activation-icon-halo">
          <PackageCheck size={44} className="activation-icon" />
          <span className="activation-badge-live">
            <Radio size={12} className="radar-icon" /> INICIANDO CONFERÊNCIA
          </span>
        </div>

        <div className="activation-text-group">
          <span className="activation-label">GERANDO ROMANEIO OPERACIONAL</span>
          <h1 className="activation-romaneio-title">{dadosPedido.romaneio || 'S/N'}</h1>
          <p className="activation-store-name">{dadosPedido.loja || 'Destino Operacional'}</p>
        </div>

        {/* Barra de Progresso Sincronizada */}
        <div className="activation-energy-meter">
          <div className="energy-fill-track" />
        </div>
      </div>
    </div>
  );
}