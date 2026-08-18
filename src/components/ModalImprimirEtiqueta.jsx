// src/components/ModalImprimirEtiqueta.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Tag } from 'lucide-react';

export default function ModalImprimirEtiqueta({ pedido, isOpen, onClose }) {
  if (!isOpen || !pedido) return null;

  const [uf, setUf] = useState(pedido.uf || pedido.local || 'DF');
  const [loja, setLoja] = useState(pedido.loja || pedido.cliente || 'DESTINO');
  const [romaneio, setRomaneio] = useState(pedido.romaneio || 'S/N');
  const [obsExtra, setObsExtra] = useState(pedido.observacoes || '');
  const [qtdCopias, setQtdCopias] = useState(1);
  const [imprimirVolumes, setImprimirVolumes] = useState(false);
  const [totalVolumes, setTotalVolumes] = useState(1);

  const printIframeRef = useRef(null);

  useEffect(() => {
    setUf(pedido.uf || pedido.local || 'DF');
    setLoja(pedido.loja || pedido.cliente || 'DESTINO');
    setRomaneio(pedido.romaneio || 'S/N');
    setObsExtra(pedido.observacoes || '');
    
    const totalCaixas = pedido.documentos?.reduce((acc, d) => acc + (d.caixas?.length || 0), 0) || 1;
    setTotalVolumes(totalCaixas);
  }, [pedido]);

  const calcularTamanhoFonteLoja = (texto) => {
    const len = String(texto || '').trim().length;
    if (len <= 16) return '21pt';
    if (len <= 24) return '17pt';
    if (len <= 34) return '13.5pt';
    if (len <= 48) return '11pt';
    return '9pt';
  };

  const tamanhoFonteAtual = calcularTamanhoFonteLoja(loja);
  const logoUrl = '/src/img/egaplast.png';

  const handleDispararImpressao = () => {
    const iframe = printIframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentWindow.document;
    doc.open();

    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const iteracoes = imprimirVolumes ? totalVolumes : qtdCopias;
    const fontSizeLoja = calcularTamanhoFonteLoja(loja);

    let etiquetasHTML = '';

    for (let i = 1; i <= iteracoes; i++) {
      const volumeTexto = imprimirVolumes 
        ? `VOL: ${String(i).padStart(2, '0')}/${String(totalVolumes).padStart(2, '0')}` 
        : 'CHECKOUT';

      etiquetasHTML += `
        <div class="etiqueta-pagina">
          <!-- CABEÇALHO COM LOGO MONOCROMÁTICA -->
          <div class="etiqueta-topo">
            <div class="etiqueta-logo-area">
              <img 
                src="${logoUrl}" 
                alt="EGAPLAST" 
                class="logo-img" 
                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" 
              />
              <span class="logo-fallback" style="display:none; font-weight:900; font-size:13pt; letter-spacing: -0.5px;">EGAPLAST</span>
            </div>
            
            <div class="etiqueta-uf-central">${String(uf).toUpperCase()}</div>
            
            <div class="etiqueta-rom-area">
              <span>ROM:</span>
              <strong>${String(romaneio).toUpperCase()}</strong>
            </div>
          </div>

          <!-- CORPO COM NOME DA LOJA -->
          <div class="etiqueta-meio">
            <div class="etiqueta-loja" style="font-size: ${fontSizeLoja};">
              ${String(loja).toUpperCase()}
            </div>
            ${obsExtra ? `<div class="etiqueta-obs">OBS: ${String(obsExtra).toUpperCase()}</div>` : ''}
          </div>

          <!-- RODAPÉ TÉCNICO -->
          <div class="etiqueta-rodape">
            <span>DATA: ${dataAtual}</span>
            <span class="etiqueta-vol-badge">${volumeTexto}</span>
          </div>
        </div>
      `;
    }

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta Egaplast - 90x40</title>
          <style>
            @page {
              size: 90mm 40mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              width: 90mm;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
            }
            .etiqueta-pagina {
              width: 90mm;
              height: 40mm;
              padding: 2.5mm 3.5mm;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
            }
            .etiqueta-topo {
              display: grid;
              grid-template-columns: 1fr auto 1fr;
              align-items: center;
              border-bottom: 2px solid #000;
              padding-bottom: 1.5mm;
              height: 9mm;
            }
            .etiqueta-logo-area {
              display: flex;
              align-items: center;
              justify-content: flex-start;
              height: 100%;
            }
            .logo-img {
              max-height: 8mm;
              max-width: 28mm;
              object-fit: contain;
              filter: grayscale(100%) contrast(250%);
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }
            .etiqueta-uf-central {
              font-size: 20pt;
              font-weight: 900;
              line-height: 1;
              text-align: center;
              letter-spacing: -0.5px;
            }
            .etiqueta-rom-area {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              font-size: 8.5pt;
              line-height: 1.1;
            }
            .etiqueta-rom-area strong {
              font-size: 11pt;
              font-weight: 800;
            }
            .etiqueta-meio {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              text-align: center;
              padding: 1mm 0;
              overflow: hidden;
            }
            .etiqueta-loja {
              font-weight: 900;
              line-height: 1.12;
              text-transform: uppercase;
              word-break: break-word;
              letter-spacing: -0.3px;
            }
            .etiqueta-obs {
              font-size: 8pt;
              font-weight: 700;
              margin-top: 1mm;
              color: #000;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .etiqueta-rodape {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 1.5px solid #000;
              padding-top: 1mm;
              font-size: 8.5pt;
              font-weight: 800;
            }
            .etiqueta-vol-badge {
              font-size: 9pt;
            }
          </style>
        </head>
        <body>
          ${etiquetasHTML}
        </body>
      </html>
    `);

    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 300);
  };

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 10, 20, 0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '740px',
          padding: '26px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '10px', color: '#3b82f6' }}>
              <Tag size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-main, #f8fafc)', fontSize: '1.2rem', fontWeight: 800 }}>Etiqueta Térmica Egaplast (90x40 mm)</h3>
              <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.82rem' }}>Padrão monocromático para Elgin L42 Pro</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* PRÉVIA WYSIWYG */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0, 0, 0, 0.25)', padding: '16px', borderRadius: '14px', border: '1px dashed var(--border-color, rgba(255, 255, 255, 0.15))' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            Prévia Monocromática (90 x 40 mm)
          </span>

          <div 
            style={{
              width: '360px',
              height: '160px',
              background: '#ffffff',
              color: '#000000',
              borderRadius: '6px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
              padding: '10px 14px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            {/* TOPO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '4px', height: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <img 
                  src={logoUrl} 
                  alt="EGAPLAST" 
                  style={{ 
                    maxHeight: '30px', 
                    maxWidth: '105px', 
                    objectFit: 'contain',
                    filter: 'grayscale(100%) contrast(250%)'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                />
                <span style={{ display: 'none', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '-0.5px' }}>EGAPLAST</span>
              </div>

              <div style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.5px', textAlign: 'center', lineHeight: 1 }}>
                {uf.toUpperCase()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.1 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#000' }}>ROMANEIO</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{romaneio}</span>
              </div>
            </div>

            {/* CORPO */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '4px 0' }}>
              <div style={{ fontSize: tamanhoFonteAtual, fontWeight: 900, textTransform: 'uppercase', lineHeight: '1.15', wordBreak: 'break-word' }}>
                {loja}
              </div>
              {obsExtra && (
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#000', marginTop: '2px' }}>
                  {obsExtra}
                </div>
              )}
            </div>

            {/* RODAPÉ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid #000', paddingTop: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
              <span>DATA: {new Date().toLocaleDateString('pt-BR')}</span>
              <span>{imprimirVolumes ? `VOL: 01/${String(totalVolumes).padStart(2, '0')}` : 'CHECKOUT'}</span>
            </div>
          </div>
        </div>

        {/* FORMULÁRIO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>UF Destino</label>
            <input 
              type="text" 
              value={uf} 
              onChange={(e) => setUf(e.target.value.toUpperCase())}
              maxLength={4}
              style={{ padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-input, rgba(255, 255, 255, 0.05))', border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))', color: 'var(--text-main, #fff)', fontWeight: 800, textAlign: 'center', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Loja / Destinatário</label>
            <input 
              type="text" 
              value={loja} 
              onChange={(e) => setLoja(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-input, rgba(255, 255, 255, 0.05))', border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))', color: 'var(--text-main, #fff)', fontWeight: 700, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Romaneio</label>
            <input 
              type="text" 
              value={romaneio} 
              onChange={(e) => setRomaneio(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-input, rgba(255, 255, 255, 0.05))', border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))', color: 'var(--text-main, #fff)', fontWeight: 700, textAlign: 'center', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Observação Adicional</label>
            <input 
              type="text" 
              placeholder="Ex: Carga Frágil, Prioridade..." 
              value={obsExtra} 
              onChange={(e) => setObsExtra(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-input, rgba(255, 255, 255, 0.05))', border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))', color: 'var(--text-main, #fff)', outline: 'none' }}
            />
          </div>
        </div>

        {/* OPÇÕES */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input, rgba(255, 255, 255, 0.03))', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main, #f8fafc)' }}>
            <input 
              type="checkbox" 
              checked={imprimirVolumes} 
              onChange={(e) => setImprimirVolumes(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            Imprimir em lote por volumes (1 a {totalVolumes})
          </label>

          {!imprimirVolumes && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 700 }}>Cópias:</span>
              <input 
                type="number" 
                min={1} 
                max={50} 
                value={qtdCopias} 
                onChange={(e) => setQtdCopias(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: '60px', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card, #0f172a)', border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))', color: 'var(--text-main, #fff)', textAlign: 'center', fontWeight: 800 }}
              />
            </div>
          )}
        </div>

        {/* BOTÕES */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', paddingTop: '16px' }}>
          <button 
            onClick={onClose} 
            style={{ padding: '10px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color, rgba(255, 255, 255, 0.2))', color: 'var(--text-muted, #94a3b8)', fontWeight: 700, cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button 
            onClick={handleDispararImpressao} 
            style={{ padding: '10px 20px', borderRadius: '8px', background: '#3b82f6', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
          >
            <Printer size={16} />
            Imprimir Etiqueta ({imprimirVolumes ? `${totalVolumes} volumes` : `${qtdCopias}x`})
          </button>
        </div>

        <iframe 
          ref={printIframeRef} 
          style={{ display: 'none', position: 'absolute', width: 0, height: 0, border: 0 }} 
          title="ImpressaoEtiquetaEgaplast"
        />
      </div>
    </div>,
    document.body
  );
}