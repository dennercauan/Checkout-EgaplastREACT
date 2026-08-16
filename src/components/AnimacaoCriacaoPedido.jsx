// src/components/AnimacaoCriacaoPedido.jsx
import React from 'react';
import { PackageCheck, Zap, Radio } from 'lucide-react';
import '../css/AnimacaoCriacaoPedido.css';

export default function AnimacaoCriacaoPedido({ dadosPedido }) {
  if (!dadosPedido) return null;

  return (
    <div className="op-activation-overlay">
      {/* Luz de Fundo e Ondas de Pulso */}
      <div className="activation-backdrop-glow" />
      <div className="activation-shockwave ring-1" />
      <div className="activation-shockwave ring-2" />
      <div className="activation-shockwave ring-3" />

      {/* Núcleo Central do HUD */}
      <div className="activation-hud-core">
        <div className="activation-icon-halo">
          <PackageCheck size={48} className="activation-icon" />
          <span className="activation-badge-live">
            <Radio size={12} className="radar-icon" /> INICIANDO CONFERÊNCIA
          </span>
        </div>

        <div className="activation-text-group">
          <span className="activation-label">ROMANEIO ENGATILHADO</span>
          <h1 className="activation-romaneio-title">{dadosPedido.romaneio || 'S/N'}</h1>
          <p className="activation-store-name">{dadosPedido.loja || 'Destino Operacional'}</p>
        </div>

        {/* Barra de Progresso / Carregamento do Timer */}
        <div className="activation-energy-meter">
          <div className="energy-fill-track" />
        </div>
      </div>
    </div>
  );
}