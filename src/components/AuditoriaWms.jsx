// src/components/AuditoriaWms.jsx
import React from 'react';
import { X, UploadCloud, FileText, PieChart, ArrowRightLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

export default function AuditoriaWms({ 
  auditModalData, 
  setAuditModalData, 
  wmsSessions, 
  handleAuditoriaUpload, 
  confirmarAuditoriaWms, 
  isSaving 
}) {
  
  if (!auditModalData) return null;
  const { dIdx, fileName, caixasReais } = auditModalData;

  // =========================================================
  // TELA 1: AGUARDANDO O UPLOAD DO ARQUIVO
  // =========================================================
  if (!caixasReais) {
    return (
      <div className="animate-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(248, 250, 252, 0.95)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-modal" style={{ position: 'relative', background: '#fff', padding: '40px', borderRadius: '16px', width: '550px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          
          <button onClick={() => setAuditModalData(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '5px' }}>
            <X size={24}/>
          </button>

          <div style={{ background: '#e0f2fe', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#0ea5e9' }}>
            <UploadCloud size={40} />
          </div>
          <h3 style={{ color: '#0f172a', fontSize: '1.6rem', margin: '0 0 10px 0' }}>Importar Caixas Efetivadas</h3>
          <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '30px', lineHeight: '1.5' }}>
            Importe o arquivo CSV contendo os volumes consolidados no WMS. O sistema fará o cruzamento automático com o seu planejamento antes de efetivar o fechamento.
          </p>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button onClick={() => setAuditModalData(null)} style={{ padding: '12px 25px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', flex: 1 }}>Cancelar</button>
            
            <label htmlFor="audit-upload-modal" style={{ padding: '12px 25px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flex: 1, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <FileText size={18}/> Escolher CSV
              <input type="file" accept=".csv" id="audit-upload-modal" style={{ display: 'none' }} onChange={handleAuditoriaUpload}/>
            </label>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // TELA 2: RELATÓRIO DE AUDITORIA GERADO
  // =========================================================
  const session = wmsSessions[dIdx] || { skus: [] };
  
  let planejado = 0;
  let planSummary = {};
  session.skus.forEach(sku => {
    if (sku.qtdPadrao > 0) {
      const cxs = Math.ceil(sku.qtdTotal / sku.qtdPadrao);
      planejado += cxs;
      const key = sku.caixaNome || "INDEFINIDA";
      if (!planSummary[key]) planSummary[key] = { qtd: 0, pesoTotal: 0 };
      planSummary[key].qtd += cxs;
      planSummary[key].pesoTotal += cxs * parseFloat(sku.pesoPadrao || 0);
    }
  });

  const totalReais = caixasReais.length;
  let realSummary = {};
  caixasReais.forEach(cx => {
    const key = cx.num || cx.caixa || "INDEFINIDA";
    if (!realSummary[key]) realSummary[key] = { qtd: 0, pesoTotal: 0 };
    realSummary[key].qtd += 1;
    realSummary[key].pesoTotal += parseFloat(cx.peso || 0);
  });

  const diff = planejado - totalReais;
  const isPerfect = (planejado === totalReais);
  const cor = isPerfect ? '#155724' : '#721c24';
  const bg = isPerfect ? '#d4edda' : '#f8d7da';
  const allTypes = Array.from(new Set([...Object.keys(planSummary), ...Object.keys(realSummary)])).sort();

  return (
    <div className="animate-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(248, 250, 252, 0.95)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-modal" style={{ position: 'relative', background: '#fff', padding: '30px', borderRadius: '12px', width: '850px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }}>
        
        <button onClick={() => setAuditModalData(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '5px' }}>
          <X size={24}/>
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px', flexShrink: 0 }}>
          <h2 style={{ margin: '0 0 5px 0', color: 'var(--primary)', fontSize: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <PieChart size={28} /> Relatório de Auditoria e Fechamento
          </h2>
          <small style={{ color: '#64748b', fontSize: '0.9rem' }}>Arquivo Analisado: <strong>{fileName}</strong></small>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: bg, color: cor, padding: '20px', borderRadius: '10px', border: `1px solid ${isPerfect ? '#c3e6cb' : '#f5c6cb'}`, marginBottom: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <small style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem', opacity: 0.8 }}>Planejado pela Plataforma</small>
              <div style={{ fontSize: '2.2rem', fontWeight: 900 }}>{planejado} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>volumes</span></div>
            </div>
            <div style={{ fontSize: '2rem', opacity: 0.2 }}><ArrowRightLeft size={32}/></div>
            <div style={{ textAlign: 'center' }}>
              <small style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem', opacity: 0.8 }}>Efetivado na Expedição</small>
              <div style={{ fontSize: '2.2rem', fontWeight: 900 }}>{totalReais} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>volumes</span></div>
            </div>
          </div>
          
          {!isPerfect && (
            <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', padding: '12px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <AlertTriangle size={18}/> Discrepância de {Math.abs(diff)} caixa(s) detectada! Verifique o fracionamento na tabela.
            </div>
          )}

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff', marginBottom: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.85rem' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>TIPO EMBALAGEM</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>PLANEJADO</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>REAL (WMS)</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>PESO ESTIMADO</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>PESO REAL</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>CONFERÊNCIA</th>
                </tr>
              </thead>
              <tbody>
                {allTypes.map(type => {
                  const p = planSummary[type] || { qtd: 0, pesoTotal: 0 };
                  const r = realSummary[type] || { qtd: 0, pesoTotal: 0 };
                  const matchQtd = p.qtd === r.qtd;
                  const matchPeso = Math.abs(p.pesoTotal - r.pesoTotal) < 0.05; 
                  
                  return (
                    <tr key={type} style={{ borderBottom: '1px solid #f1f5f9', background: matchQtd && matchPeso ? '#fff' : '#fef2f2' }}>
                      <td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: 'var(--primary)' }}>{type}</td>
                      <td style={{ padding: '12px' }}>{p.qtd}</td>
                      <td style={{ padding: '12px', color: matchQtd ? 'inherit' : '#ef4444', fontWeight: matchQtd ? 'normal' : 'bold' }}>{r.qtd}</td>
                      <td style={{ padding: '12px' }}>{p.pesoTotal.toFixed(1)} kg</td>
                      <td style={{ padding: '12px', color: matchPeso ? 'inherit' : '#ef4444', fontWeight: matchPeso ? 'normal' : 'bold' }}>{r.pesoTotal.toFixed(1)} kg</td>
                      <td style={{ padding: '12px' }}>
                        {matchQtd && matchPeso ? 
                          <span style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><CheckCircle2 size={14}/> OK</span> : 
                          <span style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><X size={14}/> Erro</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
          <button onClick={() => setAuditModalData({dIdx: dIdx})} style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Voltar e Trocar Arquivo</button>
          <button onClick={confirmarAuditoriaWms} disabled={isSaving} style={{ flex: 1, padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>
            {isSaving ? <Loader2 className="fa-spin"/> : <CheckCircle2/>} Confirmar Efetivação
          </button>
        </div>
      </div>
    </div>
  );
}