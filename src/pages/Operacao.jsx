import { useMotorRanking } from '../hooks/useMotorRanking';
// src/pages/Operacao.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  collection, addDoc, serverTimestamp, getDocs, doc,
  query, where, onSnapshot, collectionGroup, Timestamp, deleteField 
} from 'firebase/firestore';
import { updateDoc, setDoc, arrayUnion, deleteDoc, getDoc, increment, writeBatch } from 'firebase/firestore';
import NavbarOperacao from '../components/NavbarOperacao';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase'; 
import { 
  ArrowLeft, Plus, FileText, CheckCircle2, 
  Clock, MoreVertical, Search, Boxes, X, User, Trash2, PackagePlus, Loader2, Edit, Check, Pause, Play, AlertCircle, MapPin, UploadCloud,
  Trophy, Medal, Factory, Package, Copy, Info, AlignLeft, ListTree, ChevronDown, Layers, ArrowUpDown, RefreshCcw, PieChart, ArrowRightLeft, AlertTriangle, Gift, SearchX} from 'lucide-react';
import '../css/Operacao.css';
import ModalCaixasEfetivadas from '../components/ModalCaixasEfetivadas';
import ModalCaixasMaster from '../components/ModalCaixasMaster';
import ModalOrdemProducao from '../components/ModalOrdemProducao';
import ModalPausa from '../components/ModalPausa';
import ModalCodigoBarras from '../components/ModalCodigoBarras';
import ModalCaixaManual from '../components/ModalCaixaManual';
import ModalAlertaPeso from '../components/ModalAlertaPeso';
import ModalCriarEditarPedido from '../components/ModalCriarEditarPedido';
import ModalDetalhesPedido from '../components/ModalDetalhesPedido';
import RankingDiario from '../components/RankingDiario';
import AnimacaoCriacaoPedido from '../components/AnimacaoCriacaoPedido';
import ModalFluxoImportacaoWMS from '../components/ModalFluxoImportacaoWMS';
import ModalSucesso from '../components/ModalSucesso';
import ModalConfirmarExclusao from '../components/ModalConfirmarExclusao';

export default function Operacao({ isAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const dataUrl = queryParams.get('date'); 
  const today = new Date();
  const dataHojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dataOperacaoAtiva = dataUrl || dataHojeStr;
  const isHoje = dataOperacaoAtiva === dataHojeStr;

  const [titulo, setTitulo] = useState('Carregando...');
  const [ajustesDoDia, setAjustesDoDia] = useState([]);
  const [controlePausas, setControlePausas] = useState({}); // <--- ADICIONE ESTA LINHA
  const [localUser, setLocalUser] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [fluxoImportacao, setFluxoImportacao] = useState(null); // Guarda { etapa, dIdx, fileName, caixasFinais, totalCaixas, totalSkus, pesoTotal, amostraNomes, resumoTexto }
  const [showModal, setShowModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null); 
  
  // ESTADOS DO MODAL UNIFICADO (DETALHES + WMS)
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [activeTab, setActiveTab] = useState('resumo'); // Controle das abas ('resumo' ou 'caixas')
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [docIndexSelecionado, setDocIndexSelecionado] = useState(0);
  const [caixasPrevia, setCaixasPrevia] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pedidoToPause, setPedidoToPause] = useState(null);

  const [showOpModal, setShowOpModal] = useState(false);
  const [opsDoDia, setOpsDoDia] = useState([]);

  const [showMasterModal, setShowMasterModal] = useState(false);
  const [caixasMaster, setCaixasMaster] = useState([]);
  const [buscaRomaneio, setBuscaRomaneio] = useState('');
  const [rankingExpandido, setRankingExpandido] = useState(null);
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState(null);
const [isExcluindoPedido, setIsExcluindoPedido] = useState(false);

// NOVOS ESTADOS: EXPANSÃO, BUSCA E ADIÇÃO MANUAL
  const [docsExpandidos, setDocsExpandidos] = useState({});
  const [buscasDocumentos, setBuscasDocumentos] = useState({});
  const [showAddCaixaModal, setShowAddCaixaModal] = useState(false);
  const [addCaixaForm, setAddCaixaForm] = useState({ docIdx: null, num: '', peso: '', sku: '', quantidade: '' });
  const [wmsSessions, setWmsSessions] = useState({});
  // NOVOS ESTADOS PARA O WMS MASTER
  const [wmsPreResumoAberto, setWmsPreResumoAberto] = useState(null);
  const [showCaixasEfetivadasModal, setShowCaixasEfetivadasModal] = useState(null);
  const [auditModalData, setAuditModalData] = useState(null);
  const [abaAtivaComum, setAbaAtivaComum] = useState({}); // Controla a aba por documento { [dIdx]: 0 ou 1 }
  const [skusExpandidosComum, setSkusExpandidosComum] = useState({}); // Controla as gavetas { [`${dIdx}-${ref}`]: boolean }
  const [modalSucesso, setModalSucesso] = useState(null); // Vai guardar { titulo, mensagem }

  const toggleDocExpandido = (idx) => {
    setDocsExpandidos(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleBuscaDocumento = (idx, valor) => {
    setBuscasDocumentos(prev => ({ ...prev, [idx]: valor }));
  };

  const handleExcluirCaixa = async (docIdx, caixaOriginalIdx) => {
    if (!window.confirm("Deseja realmente excluir esta caixa e todo o seu conteúdo?")) return;
    setIsSaving(true);
    try {
      const ref = obterReferenciaDocumento(pedidoModal);
      const novosDocs = [...pedidoModal.documentos];
      novosDocs[docIdx].caixas.splice(caixaOriginalIdx, 1);
      await updateDoc(ref, { documentos: novosDocs });
    } catch (error) {
      alert("Erro ao excluir a caixa.");
    } finally {
      setIsSaving(false);
    }
  };

  const [pedidoRecemCriado, setPedidoRecemCriado] = useState(null);
  const [isIgnitingTracker, setIsIgnitingTracker] = useState(false);

  const handleAbrirAddCaixa = (docIdx) => {
    setAddCaixaForm({ docIdx, num: '', peso: '' }); // Removemos sku e quantidade
    setShowAddCaixaModal(true);
  };

  const handleSalvarCaixaManual = async () => {
    if (!addCaixaForm.num) {
      return alert("Preencha o Número/Tipo da Caixa.");
    }
    setIsSaving(true);
    try {
      const ref = obterReferenciaDocumento(pedidoModal);
      const novosDocs = [...pedidoModal.documentos];
      if (!novosDocs[addCaixaForm.docIdx].caixas) novosDocs[addCaixaForm.docIdx].caixas = [];
      
      const numCaixaFormatado = addCaixaForm.num.toUpperCase().trim();
      const pesoNumerico = parseFloat(addCaixaForm.peso.replace(',', '.')) || 0;
      
      // REGRA NOVA: Não mescla! Apenas empurra uma nova caixa separada para a lista
      novosDocs[addCaixaForm.docIdx].caixas.push({
        num: numCaixaFormatado,
        peso: pesoNumerico.toFixed(2),
        produtos: [] // Deixa vazio para não obrigar digitação extensa
      });

      await updateDoc(ref, { documentos: novosDocs });
      setShowAddCaixaModal(false);
    } catch (error) {
      alert("Erro ao salvar a caixa manualmente.");
    } finally {
      setIsSaving(false);
    }
  };

  const [currentTime, setCurrentTime] = useState(Date.now());

  const [pedidosNovos, setPedidosNovos] = useState([]);
  const [pedidosLegados, setPedidosLegados] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [romaneio, setRomaneio] = useState('');
  const [loja, setLoja] = useState('');
  const [local, setLocal] = useState('DF');
  const [uf, setUf] = useState('');
  const [isCaixaMaster, setIsCaixaMaster] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [docTipo, setDocTipo] = useState('Nota Fiscal');
  const [docResponsavel, setDocResponsavel] = useState(''); 
  const [docsTemporarios, setDocsTemporarios] = useState([]);
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [skusExpandidos, setSkusExpandidos] = useState({});




  // ==========================================
  // ESTADOS PARA CADASTRO MANUAL DE VARIAÇÃO
  // ==========================================
  const [modalCodigoBarras, setModalCodigoBarras] = useState(null); // Guarda os dados do SKU que será salvo
  const [codigoBarrasInput, setCodigoBarrasInput] = useState('');

  // ATUALIZA OS CAMPOS MANUAIS EM TEMPO REAL
  const handleInputManual = (dIdx, skuRef, campo, valor) => {
    setWmsSessions(prev => {
      const novoEstado = { ...prev };
      const sessao = { ...novoEstado[dIdx] };
      const skus = [...sessao.skus];
      const skuIndex = skus.findIndex(s => s.ref === skuRef);
      if (skuIndex === -1) return prev;

      const sku = { ...skus[skuIndex] };
      if (campo === 'qtdPadrao') sku.qtdPadrao = parseInt(valor) || 0;
      if (campo === 'caixaNome') sku.caixaNome = valor.toUpperCase();
      if (campo === 'pesoPadrao') sku.pesoPadrao = parseFloat(valor.replace(',', '.')) || 0;

      skus[skuIndex] = sku;
      sessao.skus = skus;
      novoEstado[dIdx] = sessao;
      return novoEstado;
    });
  };

  // ABRE O MODAL DE CÓDIGO DE BARRAS
  const abrirModalSalvarManual = (dIdx, sku) => {
    setModalCodigoBarras({ dIdx, sku });
    setCodigoBarrasInput('');
  };

  const sincronizarTudoEmTempoReal = async () => {
    // Pega a foto exata do momento atual da operação
    const rankingAtual = rankingRef.current; 
    if (!rankingAtual || rankingAtual.length === 0) return;

    try {
      const rankingMap = {};
      rankingAtual.forEach(user => {
        // Empacota os dados estruturados de SKUs e OPs
        rankingMap[user.nome] = {
          pontos: user.pontos || 0,
          skus: user.skus || 0,
          op: user.op || 0,
          decrescimo: user.decrescimo || 0
        };
      });

      const refDia = doc(db, 'estatisticasDiarias', dataOperacaoAtiva);
      
      // Envia o pacote inteiro instantaneamente
      await setDoc(refDia, { ranking: rankingMap }, { merge: true });
      
    } catch (error) {
      console.error("Falha ao sincronizar em tempo real:", error);
    }
  };

  // SALVA A NOVA VARIAÇÃO NO BANCO DE DADOS (COM PROTEÇÃO ANTI-DUPLICIDADE E AUTO-UPDATE)
  const salvarVariacaoBanco = async () => {
    if (!codigoBarrasInput.trim()) {
      alert("Por favor, insira o código de barras.");
      return;
    }
    
    const { dIdx, sku } = modalCodigoBarras;
    setIsSaving(true);
    
    try {
      const produtoRef = doc(db, 'caixasMaster', sku.ref);
      
      const novaVariacao = {
        caixa: sku.caixaNome || 'CAIXA',
        quantidade: sku.qtdPadrao,
        peso: sku.pesoPadrao,
        codigoBarras: codigoBarrasInput
      };

      // 1. LÊ O BANCO ANTES DE SALVAR (Para evitar duplicidade)
      const docSnap = await getDoc(produtoRef);
      let novasVariacoes = [];
      let nomeProduto = sku.desc || '';

      if (docSnap.exists()) {
        const dadosAtuais = docSnap.data();
        nomeProduto = dadosAtuais.nome || nomeProduto;
        const variacoesAtuais = dadosAtuais.variacoes || [];

        // Procura se já existe uma variação com a mesma Quantidade e Tipo de Caixa
        const indexExistente = variacoesAtuais.findIndex(v => v.quantidade === novaVariacao.quantidade && v.caixa === novaVariacao.caixa);

        if (indexExistente > -1) {
          variacoesAtuais[indexExistente] = novaVariacao; // Substitui a antiga (atualiza o EAN/Peso)
        } else {
          variacoesAtuais.push(novaVariacao); // Adiciona como nova
        }
        novasVariacoes = variacoesAtuais;
      } else {
        novasVariacoes = [novaVariacao]; // Cria a primeira variação
      }

  

      const dadosParaSalvar = {
        ref: sku.ref,
        nome: nomeProduto,
        variacoes: novasVariacoes
      };

      // 2. SALVA NO FIREBASE
      await setDoc(produtoRef, dadosParaSalvar, { merge: true });

      // 3. ATUALIZA A TELA DE PLANEJAMENTO (Tira o vermelho)
      setWmsSessions(prev => {
        const novo = { ...prev };
        const sIndex = novo[dIdx].skus.findIndex(s => s.ref === sku.ref);
        novo[dIdx].skus[sIndex].isMissing = false;
        novo[dIdx].skus[sIndex].codigoBarras = codigoBarrasInput;
        
        // Dispara o Auto-save do planejamento
        const refFinal = pedidoModal._isLegacy ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) : doc(db, 'pedidos', pedidoModal.id);
        const novosDocs = [...pedidoModal.documentos];
        novosDocs[dIdx] = { ...novosDocs[dIdx], planejamentoWms: novo[dIdx] };
        updateDoc(refFinal, { documentos: novosDocs });
        
        return novo;
      });

      // 4. ATUALIZA O DICIONÁRIO NA MESMA HORA (Sem precisar de F5)
      setCaixasMaster(prev => {
        if (!prev) return prev;
        const index = prev.findIndex(p => p.ref === sku.ref || p.id === sku.ref);
        if (index > -1) {
          const novaLista = [...prev];
          novaLista[index] = { ...novaLista[index], ...dadosParaSalvar };
          return novaLista;
        } else {
          return [dadosParaSalvar, ...prev];
        }
      });

      alert("Variação cadastrada e vinculada com sucesso!");
      setModalCodigoBarras(null);

    } catch (error) {
      alert("Erro ao salvar variação: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadWMSComum = (e, dIdx) => {
    const file = e.target.files[0];
    if (!file) return;

    // Etapa 1: Inicia a leitura com o fake loading
    setFluxoImportacao({
      etapa: 'lendo',
      dIdx,
      fileName: file.name,
      totalCaixas: 0,
      totalSkus: 0,
      pesoTotal: 0,
      amostraNomes: []
    });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const linhas = text.trim().split(/\r\n|\n|\r/);
        if (linhas.length <= 1) throw new Error("Arquivo vazio");

        let separador = linhas[0].includes(';') ? ';' : ',';
        const cabecalho = linhas[0].split(separador).map(c => 
          c.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/"/g, '')
        );
        
        const idxCaixa = cabecalho.findIndex(c => c.includes("TIPO EMBALAGEM") || c.includes("CAIXA") || c.includes("VOLUME"));
        const idxPeso = cabecalho.findIndex(c => c.includes("PESO"));
        const idxIdUnico = cabecalho.findIndex(c => c.includes("ID EMBALAGEM") || c === "ID" || c.includes("RASTREIO") || c.includes("EXPEDICAO"));
        const idxRef = cabecalho.findIndex(c => c === "PRODUTO" || c.includes("CODIGO") || c === "REF" || c === "SKU");
        const idxDesc = cabecalho.findIndex(c => c.includes("DESCRICAO") || c.includes("NOME"));
        const idxQtd = cabecalho.findIndex(c => c.includes("QUANTIDADE") || c.includes("QTDE") || c === "QTD");

        if (idxRef === -1 || idxQtd === -1 || idxCaixa === -1) {
          throw new Error("Colunas obrigatórias não encontradas no CSV.");
        }

        const caixasMap = {};
        let totalUnidadesSkus = 0;
        let pesoBruto = 0;

        for (let i = 1; i < linhas.length; i++) {
          const cols = linhas[i].split(separador).map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length <= idxRef) continue;
          
          const nomeCaixa = cols[idxCaixa] || `CAIXA S/N`;
          const pesoCaixa = idxPeso !== -1 ? parseFloat(String(cols[idxPeso]).replace(',', '.')) || 0 : 0;
          
          let idUnicoStr = `S/N-linha-${i}`;
          if (idxIdUnico !== -1 && cols[idxIdUnico] && cols[idxIdUnico].trim() !== '') {
            idUnicoStr = cols[idxIdUnico].trim();
          }
          
          const ref = cols[idxRef];
          const desc = idxDesc !== -1 ? cols[idxDesc] : "Produto";
          const qtd = parseInt(String(cols[idxQtd]).replace(/\D/g, '')) || 0;

          if (!ref || qtd <= 0) continue;

          totalUnidadesSkus += qtd;

          if (!caixasMap[idUnicoStr]) {
            caixasMap[idUnicoStr] = { num: nomeCaixa, peso: pesoCaixa, idUnico: idUnicoStr, idExpedicao: idUnicoStr, produtos: [] };
            pesoBruto += pesoCaixa;
          } else {
            caixasMap[idUnicoStr].peso = Math.max(caixasMap[idUnicoStr].peso, pesoCaixa);
          }
          
          const prodExistente = caixasMap[idUnicoStr].produtos.find(p => p.referencia === ref);
          if (prodExistente) {
            prodExistente.quantidade += qtd; 
          } else {
            caixasMap[idUnicoStr].produtos.push({ referencia: ref, descricao: desc, quantidade: qtd }); 
          }
        }

        const caixasFinais = Object.values(caixasMap);

        // Gera o texto resumido para cópia
        const resumoContagem = {};
        caixasFinais.forEach(c => {
          const k = `${c.num} (${c.peso.toFixed(2)} kg)`;
          resumoContagem[k] = (resumoContagem[k] || 0) + 1;
        });
        const resumoTextoGerado = Object.entries(resumoContagem).map(([k, v]) => `${k}: ${v} Un`).join('\n');

        // Transita da leitura para a Prévia após 900ms
        setTimeout(() => {
          setFluxoImportacao({
            etapa: 'previa',
            dIdx,
            fileName: file.name,
            caixasFinais,
            totalCaixas: caixasFinais.length,
            totalSkus: totalUnidadesSkus,
            pesoTotal: pesoBruto,
            amostraNomes: caixasFinais.slice(0, 8).map(c => c.num),
            resumoTexto: resumoTextoGerado
          });
        }, 900);

      } catch (error) {
        setFluxoImportacao(null);
        alert("Erro ao ler o CSV: " + error.message);
      } finally {
        if (e.target) e.target.value = null;
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

 // Confirmação unificada de gravação no Firestore
  const handleConfirmarGravacaoWMS = async () => {
    if (!fluxoImportacao) return;
    const { tipo, dIdx, fileName } = fluxoImportacao;

    // A) FLUXO: PLANEJAMENTO MASTER
    if (tipo === 'master_planejamento') {
      const { skusProcessados } = fluxoImportacao;
      setFluxoImportacao(prev => ({ ...prev, etapa: 'gravando' }));
      setIsSaving(true);

      try {
        const novaSessao = { skus: skusProcessados, fileName: fileName };
        setWmsSessions(prev => ({ ...prev, [dIdx]: novaSessao }));

        const refFinal = pedidoModal._isLegacy 
          ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) 
          : doc(db, 'pedidos', pedidoModal.id);
          
        const novosDocumentos = [...pedidoModal.documentos];
        novosDocumentos[dIdx] = { ...novosDocumentos[dIdx], planejamentoWms: novaSessao };
        
        await updateDoc(refFinal, { documentos: novosDocumentos });

        setTimeout(() => {
          setIsSaving(false);
          setFluxoImportacao(prev => ({ ...prev, etapa: 'sucesso' }));
        }, 700);

      } catch (error) {
        setIsSaving(false);
        setFluxoImportacao(null);
        alert("Erro ao salvar planejamento: " + error.message);
      }
      return;
    }

    // B) FLUXO: CAIXAS COMUNS OU AUDITORIA MASTER
    const { caixasFinais } = fluxoImportacao;
    const caixasComZero = caixasFinais.filter(c => parseFloat(c.peso) === 0);
    if (caixasComZero.length > 0) {
      setAlertaPesoZero({
        origem: tipo === 'master_auditoria' ? 'auditoria' : 'comum',
        dIdx,
        fileName,
        caixasProblematicas: caixasComZero,
        caixasNormais: caixasFinais.filter(c => parseFloat(c.peso) > 0),
        caixasOriginais: caixasFinais
      });
      setFluxoImportacao(null);
      return;
    }

    setFluxoImportacao(prev => ({ ...prev, etapa: 'gravando' }));
    setIsSaving(true);

    try {
      const novosDocs = [...pedidoModal.documentos];

      if (tipo === 'master_auditoria') {
        const session = wmsSessions[dIdx] || { skus: [] };
        let planejado = 0;
        session.skus.forEach(sku => {
          if (sku.qtdPadrao > 0) planejado += Math.ceil(sku.qtdTotal / sku.qtdPadrao);
        });

        novosDocs[dIdx] = { 
          ...novosDocs[dIdx], 
          caixas: caixasFinais,
          auditoria: {
            arquivo: fileName,
            planejado: planejado,
            efetivado: caixasFinais.length,
            diferenca: planejado - caixasFinais.length,
            data: new Date().toISOString()
          }
        };
      } else {
        novosDocs[dIdx] = { ...novosDocs[dIdx], caixas: caixasFinais };
      }

      const todosPossuemCaixas = novosDocs.every(doc => doc.caixas && doc.caixas.length > 0);
      const payload = { 
        documentos: novosDocs,
        efetivado: true,
        completedAt: serverTimestamp()
      };

      const refFinal = pedidoModal._isLegacy
        ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id)
        : doc(db, 'pedidos', pedidoModal.id);

      await updateDoc(refFinal, payload);

      if (!pedidoModal.efetivado) {
        const pedidoAtualizado = { ...pedidoModal, documentos: novosDocs };
        await atualizarEstatisticasMensais(pedidoAtualizado, true);
      }

      setForceRender(prev => prev + 1);

      setTimeout(() => {
        setIsSaving(false);
        setFluxoImportacao(prev => ({ ...prev, etapa: 'sucesso' }));
      }, 700);

    } catch (error) {
      setIsSaving(false);
      setFluxoImportacao(null);
      alert("Erro ao gravar caixas: " + error.message);
    }
  };

  // Conclui e redireciona suavemente
  const handleConcluirFluxoWMS = () => {
    const { tipo, dIdx } = fluxoImportacao || {};
    setFluxoImportacao(null);
    
    if (tipo === 'master_planejamento') {
      return; // Permanece na tela da estação master pronta
    }

    if (dIdx !== undefined) {
      setShowCaixasEfetivadasModal(dIdx);
    }
  };

  // ==========================================
  // ESTADOS E FUNÇÕES DO CRUD DE CAIXAS MANUAIS
  // ==========================================
  const [edicaoCaixa, setEdicaoCaixa] = useState(null); // Guarda { dIdx, cIdx (ou -1 pra nova) }
  const [formCaixa, setFormCaixa] = useState({ num: '', peso: '', produtos: [] });
  const [forceRender, setForceRender] = useState(0); // Força a tela a atualizar após edição

  const abrirFormCaixa = (dIdx, cIdx, caixaAtual = null) => {
    setEdicaoCaixa({ dIdx, cIdx });
    if (caixaAtual) {
      setFormCaixa(JSON.parse(JSON.stringify(caixaAtual))); // Clone profundo
    } else {
      // Puxa o último número de caixa para sugerir o próximo
      const totalCaixas = (pedidoModal.documentos[dIdx]?.caixas || []).length;
      setFormCaixa({ num: `CAIXA ${totalCaixas + 1}`, peso: '', produtos: [] });
    }
  };

  const salvarCaixaManual = async () => {
    if (!formCaixa.num) return alert("O nome/número da caixa é obrigatório.");
    setIsSaving(true);
    try {
      const { dIdx, cIdx } = edicaoCaixa;
      const novosDocs = [...pedidoModal.documentos];
      const docAlvo = { ...novosDocs[dIdx] };
      const caixas = [...(docAlvo.caixas || [])];

      const caixaPronta = {
        ...formCaixa,
        num: formCaixa.num.toUpperCase().trim(),
        peso: parseFloat(String(formCaixa.peso).replace(',', '.')) || 0,
        produtos: formCaixa.produtos.map(p => ({ ...p, quantidade: parseInt(p.quantidade) || 0 }))
      };

      if (cIdx === -1) caixas.push(caixaPronta); 
      else caixas[cIdx] = caixaPronta;           

      docAlvo.caixas = caixas;
      novosDocs[dIdx] = docAlvo;

      const refFinal = pedidoModal._isLegacy ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) : doc(db, 'pedidos', pedidoModal.id);
      await updateDoc(refFinal, { documentos: novosDocs });
      
      setEdicaoCaixa(null);
      setForceRender(prev => prev + 1);
      
    } catch (error) {
      console.error("Erro ao salvar caixa manual:", error);
      alert("Erro ao salvar caixa: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const excluirCaixaManual = async (dIdx, cIdx) => {
    if (!window.confirm("Tem certeza que deseja excluir esta caixa permanentemente?")) return;
    try {
      const novosDocs = [...pedidoModal.documentos];
      novosDocs[dIdx].caixas.splice(cIdx, 1);
      
      const refFinal = pedidoModal._isLegacy ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) : doc(db, 'pedidos', pedidoModal.id);
      await updateDoc(refFinal, { documentos: novosDocs });
      
      setForceRender(prev => prev + 1);
    } catch (error) {
      console.error("Erro ao excluir caixa:", error);
      alert("Erro ao excluir: " + error.message);
    }
  };

  const toggleBonificacaoCaixa = async (dIdx, cIdx) => {
    try {
      const novosDocs = [...pedidoModal.documentos];
      const caixa = novosDocs[dIdx].caixas[cIdx];
      // Inverte o status de bonificação da caixa específica
      caixa.isBonificacao = !caixa.isBonificacao;
      
      const refFinal = pedidoModal._isLegacy ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) : doc(db, 'pedidos', pedidoModal.id);
      await updateDoc(refFinal, { documentos: novosDocs });
      
      setForceRender(prev => prev + 1); // Atualiza a tela na mesma hora
    } catch(e) {
      alert("Erro ao alterar o status da caixa.");
    }
  };
  


  useEffect(() => {
    const timerInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timerInterval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setLocalUser(currentUser);
        setDocResponsavel(String(currentUser.email).toLowerCase().trim());
  
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const [ano, mes, dia] = dataOperacaoAtiva.split('-');
    setTitulo(`Operação (${dia}/${mes})`);
    
    const fetchUsuarios = async () => {
      try {
        const snap = await getDocs(collection(db, 'usuarios'));
        const lista = [];
        snap.forEach(doc => {
          if(doc.data().email) lista.push({ uid: doc.id, email: String(doc.data().email).toLowerCase().trim() });
        });
        setUsuarios(lista);
      } catch (error) { console.error("Erro ao buscar usuários:", error); }
    };
    fetchUsuarios();
  }, [dataOperacaoAtiva]);

  useEffect(() => {
    const unsubMaster = onSnapshot(collection(db, 'caixasMaster'), (snap) => {
      const masters = [];
      snap.forEach(doc => { masters.push({ id: doc.id, ...doc.data() }); });
      masters.sort((a, b) => String(a.ref || '').localeCompare(String(b.ref || '')));
      setCaixasMaster(masters);
    });
    return () => unsubMaster();
  }, []);

  useEffect(() => {
    if (!localUser?.uid) return;

    const [ano, mes, dia] = dataOperacaoAtiva.split('-');
    const startOfDay = new Date(ano, mes - 1, dia, 0, 0, 0);
    const endOfDay = new Date(ano, mes - 1, dia, 23, 59, 59);

    // 1. Removemos a trava "where('uidsVinculados', 'array-contains', localUser.uid)"
    // Agora ele baixa TODOS os pedidos do dia para a tela!
    const qNovo = query(collection(db, 'pedidos'), where('dataOperacao', '==', dataOperacaoAtiva));
    const unsubNovo = onSnapshot(qNovo, (snap) => setPedidosNovos(snap.docs.map(doc => ({ id: doc.id, _isLegacy: false, ...doc.data() }))));

    const qLegado = query(collectionGroup(db, 'pedidosMultiDocumento'), where('createdAt', '>=', Timestamp.fromDate(startOfDay)), where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
    const unsubLegado = onSnapshot(qLegado, (snap) => {
      const legados = [];
      snap.forEach(doc => {
        const data = doc.data();
        // 2. Removemos o IF que bloqueava a visão de pedidos legados de outros usuários
        const pathSegments = doc.ref.path.split('/');
        const elemIdOriginal = pathSegments.length > 3 ? pathSegments[3] : null;
        legados.push({ id: doc.id, _isLegacy: true, elementoIdOriginal: elemIdOriginal, ...data });
      });
      setPedidosLegados(legados);
    });

    const qOp = query(collection(db, 'ordensProducao'), where('dataOperacao', '==', dataOperacaoAtiva));
    const unsubOp = onSnapshot(qOp, (snap) => {
      const ops = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      ops.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setOpsDoDia(ops);
    });

    // INJETE ESTE BLOCO AQUI:
    const qAjustes = query(collection(db, 'ajustesDiarios'), where('dataOperacao', '==', dataOperacaoAtiva));
    const unsubAjustes = onSnapshot(qAjustes, (snap) => {
      setAjustesDoDia(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 👇 ADICIONE ESTE BLOCO NOVO AQUI 👇
    const refPausas = doc(db, 'controlePausas', dataOperacaoAtiva);
    const unsubPausas = onSnapshot(refPausas, (snap) => {
      if (snap.exists()) {
        setControlePausas(snap.data());
      } else {
        setControlePausas({});
      }
    });

    // ATUALIZE A LINHA DO RETURN PARA DESLIGAR ESTE TAMBÉM:
    return () => { unsubNovo(); unsubLegado(); unsubOp(); unsubAjustes(); };

    return () => { unsubNovo(); unsubLegado(); unsubOp(); };
  }, [localUser, dataOperacaoAtiva]); // Removido o isAdmin daqui, pois a visão agora é global

  const pedidosProcessados = useMemo(() => {
    return [...pedidosNovos, ...pedidosLegados].sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  }, [pedidosNovos, pedidosLegados]);

  // ==========================================
  // AUTO-ABERTURA DO MODAL VIA URL (BUSCA GLOBAL)
  // ==========================================
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const romaneioParaAbrir = params.get('openRomaneio');

    if (romaneioParaAbrir && pedidosProcessados && pedidosProcessados.length > 0) {
      const termoLimpo = decodeURIComponent(romaneioParaAbrir).trim().toLowerCase();
      
      const pedidoAlvo = pedidosProcessados.find(p => 
        String(p.romaneio || p.numero || '').trim().toLowerCase() === termoLimpo
      );

      if (pedidoAlvo) {
        // Abre o modal com todos os dados carregados
        handleAbrirDetalhes(pedidoAlvo);

        // Limpa o parâmetro openRomaneio da URL mantendo a data ativa
        const dataAtiva = params.get('date') || dataHojeStr;
        window.history.replaceState({}, '', `${location.pathname}?date=${dataAtiva}`);
      }
    }
  }, [location.search, pedidosProcessados]);

  // 1. O "ÓCULOS" DO USUÁRIO: Separa apenas os pedidos que pertencem a ele (ou tudo, se for Admin)
  const pedidosVisiveis = useMemo(() => {
    if (isAdmin) return pedidosProcessados;
    return pedidosProcessados.filter(p => 
       p.criadorUid === localUser?.uid || 
       (p.uidsVinculados && p.uidsVinculados.includes(localUser?.uid))
    );
  }, [pedidosProcessados, isAdmin, localUser]);

  // 2. A Tabela usa os pedidos visíveis e aplica a barra de busca
  const pedidosFiltrados = useMemo(() => {
    if (!buscaRomaneio.trim()) return pedidosVisiveis;
    const termo = buscaRomaneio.toLowerCase();
    return pedidosVisiveis.filter(p => 
      String(p.romaneio || '').toLowerCase().includes(termo) ||
      String(p.loja || '').toLowerCase().includes(termo)
    );
  }, [pedidosVisiveis, buscaRomaneio]);

  // ==========================================
  // CÁLCULO DE KPIS (CONTAGEM INDIVIDUAL DE NF E MINUTA)
  // ==========================================
  const { totalPedidosKPI, totalCaixasHoje } = useMemo(() => {
    let contagemDocsValidos = 0;
    let contagemCaixas = 0;

    (pedidosVisiveis || []).forEach(pedido => {
      (pedido.documentos || []).forEach(doc => {
        // Soma as caixas de qualquer documento
        contagemCaixas += (doc.caixas || []).length;

        // Soma cada NF e Minuta individualmente
        const tipoDoc = String(doc.tipo || '').trim();
        if (tipoDoc === 'Nota Fiscal' || tipoDoc === 'Minuta') {
          contagemDocsValidos++;
        }
      });
    });

    return { 
      totalPedidosKPI: contagemDocsValidos, 
      totalCaixasHoje: contagemCaixas 
    };
  }, [pedidosVisiveis]);

  // 5. O Rastreador ao Vivo procura o pendente dentro dos pedidos VISÍVEIS
  const atividadeAtual = useMemo(() => {
    const pendente = pedidosVisiveis.find(p => !p.efetivado);
    if (!pendente) return null;
    
    let skus = 0;
    (pendente.documentos || []).forEach(d => {
      (d.caixas || []).forEach(cx => { 
        (cx.produtos || []).forEach(prod => { skus += parseInt(prod.quantidade) || 0; }); 
      });
    });
    return { ...pendente, totalSkus: skus };
  }, [pedidosVisiveis]);

  const pedidoModal = useMemo(() => {
    if (!pedidoSelecionado) return null;
    return pedidosProcessados.find(p => p.id === pedidoSelecionado.id) || pedidoSelecionado;
  }, [pedidoSelecionado, pedidosProcessados]);


  useEffect(() => {
    const closeMenu = () => setDropdownOpen(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  const formatarCronometro = (pedido) => {
    if (!pedido.createdAt) return "00:00:00";
    const start = pedido.createdAt.toMillis ? pedido.createdAt.toMillis() : pedido.createdAt;
    const totalPaused = pedido.totalPausedTime || 0;
    let end;
    if (pedido.efetivado && pedido.completedAt) {
      end = pedido.completedAt.toMillis ? pedido.completedAt.toMillis() : pedido.completedAt;
    } else if (pedido.isPaused && pedido.lastPauseStart) {
      end = pedido.lastPauseStart; 
    } else {
      end = currentTime; 
    }
    const diff = Math.max(0, end - start - totalPaused);
    const hh = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const obterReferenciaDocumento = (pedido) => {
    return pedido._isLegacy
      ? doc(db, 'usuarios', pedido.criadorUid, 'elementos', pedido.elementoIdOriginal, 'pedidosMultiDocumento', pedido.id)
      : doc(db, 'pedidos', pedido.id);
  };

  const handleToggleEfetivado = async (pedido) => {
    if (pedido.isPaused) return alert("Retome o pedido antes de finalizá-lo.");
    const novoStatus = !pedido.efetivado;
    const ref = obterReferenciaDocumento(pedido);
    
    const payload = { efetivado: novoStatus };
    
    if (novoStatus) {
      // BLINDAGEM: Só registra o horário novo se for a primeira vez. 
      if (!pedido.primeiraEfetivacao) {
        payload.completedAt = serverTimestamp();
        payload.primeiraEfetivacao = serverTimestamp(); // Cria a trava inquebrável
      } else {
        payload.completedAt = pedido.primeiraEfetivacao; // Restaura o horário original
      }
    } else {
      // Se for um pedido antigo sendo desfeito, salva o horário original antes de apagar
      if (!pedido.primeiraEfetivacao && pedido.completedAt) {
        payload.primeiraEfetivacao = pedido.completedAt;
      }
      payload.completedAt = deleteField(); 
    }
    
    await updateDoc(ref, payload);
    await atualizarEstatisticasMensais(pedido, novoStatus);
  };

  // Abre o modal de confirmação
  const handleDeletePedido = (pedido) => {
    setPedidoParaExcluir(pedido);
    setDropdownOpen(null);
  };

  // Executa a remoção definitiva no Firestore
  const handleConfirmarExclusaoDefinitiva = async () => {
    if (!pedidoParaExcluir) return;
    setIsExcluindoPedido(true);
    try {
      const ref = obterReferenciaDocumento(pedidoParaExcluir);
      await deleteDoc(ref);
      setPedidoParaExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      alert("Houve um erro ao excluir o pedido.");
    } finally {
      setIsExcluindoPedido(false);
    }
  };

 const handleAbrirDetalhes = (pedido) => {
    setPedidoSelecionado(pedido);
    setDocIndexSelecionado(0);
    setCaixasPrevia([]); 
    setActiveTab('resumo');
    setIsEditingObs(false);
    
    setObservacoes(pedido.observacoes || '');
    setDocsTemporarios((pedido.documentos || []).map((doc, index) => ({ 
       ...doc, 
       idTemp: Date.now() + index,
       dbIndex: index, // O PULO DO GATO: Marcador rastreador do banco de dados
       responsaveis: doc.responsaveis || (doc.responsavel ? [doc.responsavel] : [])
    })));
    if (localUser?.email) setDocResponsavel(String(localUser.email).toLowerCase().trim());
    
    setShowDetalhesModal(true);
  };

 const handleRemoveDoc = (idTemp) => {
    setDocsTemporarios(docsTemporarios.filter(doc => doc.idTemp !== idTemp));
  };

  // NOVAS FUNÇÕES: Adicionar e remover múltiplos colaboradores
  const handleAddResponsavelToDoc = (idTemp, email) => {
     if(!email) return;
     setDocsTemporarios(docsTemporarios.map(d => {
        if(d.idTemp === idTemp) {
           const current = d.responsaveis || [];
           if(!current.includes(email)) return {...d, responsaveis: [...current, email]};
        }
        return d;
     }));
  };

  const handleRemoveResponsavelFromDoc = (idTemp, email) => {
     setDocsTemporarios(docsTemporarios.map(d => {
        if(d.idTemp === idTemp) {
           return {...d, responsaveis: (d.responsaveis || []).filter(r => r !== email)};
        }
        return d;
     }));
  };

  const handleSalvarEdicaoTab1 = async () => {
    if (docsTemporarios.length === 0) return alert("O pedido deve ter pelo menos um documento.");
    setIsSaving(true);
    try {
      const documentosLimpos = docsTemporarios.map(({ idTemp, dbIndex, ...rest }) => {
        // Resgata as caixas do banco de dados em tempo real para não sobrescrever a importação do WMS
        const caixasAtualizadas = (dbIndex !== undefined && pedidoModal.documentos[dbIndex]) 
            ? pedidoModal.documentos[dbIndex].caixas 
            : rest.caixas;
        return { ...rest, caixas: caixasAtualizadas || [] };
      });
      
      let emailsEnvolvidos = [String(pedidoModal.criadorEmail || localUser.email).toLowerCase().trim()];
      documentosLimpos.forEach(d => { 
          if(d.responsaveis && d.responsaveis.length > 0) {
              d.responsaveis.forEach(r => emailsEnvolvidos.push(String(r).toLowerCase().trim()));
          } else if (d.responsavel) {
              emailsEnvolvidos.push(String(d.responsavel).toLowerCase().trim());
          }
      });
      const emailsUnicos = [...new Set(emailsEnvolvidos)];
      const uidsVinculados = emailsUnicos.map(email => {
         const found = usuarios.find(u => u.email === email);
         return found ? found.uid : null;
      }).filter(Boolean);

      const ref = obterReferenciaDocumento(pedidoModal);
      await updateDoc(ref, { observacoes, documentos: documentosLimpos, uidsVinculados });
      setIsEditingObs(false);
      alert("Alterações salvas com sucesso!");
    } catch (error) {
      alert("Erro ao salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocSelectionChange = (e) => {
    const idx = parseInt(e.target.value);
    setDocIndexSelecionado(idx);
    setCaixasPrevia([]); 
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        // Divide por linhas e remove linhas vazias
        const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
        
        if (lines.length <= 1) { 
          alert("Arquivo vazio ou formato desconhecido."); 
          setIsUploading(false); 
          return; 
        }

        const headers = lines[0].split(';').map(h => h.trim().toUpperCase().replace(/"/g, ''));
        
        // Mapeamento Inteligente
        const idxCaixa = headers.findIndex(h => h.includes('TIPO EMBALAGEM') || h.includes('CAIXA') || h === 'DESCRIÇÃO TIPO EMBALAGEM EXPEDIÇÃO');
        const idxSKU = headers.findIndex(h => h === 'PRODUTO' || h.includes('SKU') || h.includes('CÓDIGO') || h === 'COD');
        const idxQtd = headers.findIndex(h => h === 'QUANTIDADE' || h.includes('QTD'));
        const idxPeso = headers.findIndex(h => h === 'PESO EMBALAGEM' || h.includes('PESO'));
        // NOVO: Busca o identificador único da caixa física
        const idxIdEmbalagem = headers.findIndex(h => h.includes('ID EMBALAGEM') || h === 'ID EMBALAGEM EXPEDIÇÃO');

        if (idxCaixa === -1 || idxSKU === -1 || idxQtd === -1) {
           alert("Formato inválido. Não localizamos as colunas de PRODUTO, QUANTIDADE ou DESCRIÇÃO TIPO EMBALAGEM.");
           setIsUploading(false); return;
        }

        const mapaCaixas = {};
        
        for (let i = 1; i < lines.length; i++) {
          const colunas = lines[i].split(';');
          if (colunas.length < 3) continue;
          
          let numCaixa = colunas[idxCaixa]?.trim() || '';
          numCaixa = numCaixa.replace(/"/g, '');
          
          let sku = colunas[idxSKU]?.trim() || '';
          sku = sku.replace(/"/g, '');
          
          const qtdStr = colunas[idxQtd]?.trim().replace(/"/g, '');
          const qtd = parseInt(qtdStr) || 0;
          
          let peso = 0;
          if (idxPeso !== -1 && colunas[idxPeso]) {
             const pesoStr = colunas[idxPeso].trim().replace(/"/g, '').replace(',', '.');
             peso = parseFloat(pesoStr) || 0;
          }

          let idEmbalagem = '';
          if (idxIdEmbalagem !== -1 && colunas[idxIdEmbalagem]) {
              idEmbalagem = colunas[idxIdEmbalagem].trim().replace(/"/g, '');
          }

          if (!numCaixa || !sku || qtd === 0) continue;
          
          // O SEGREDO: Agrupa pelo ID da Embalagem para respeitar caixas físicas diferentes.
          // Se o CSV por acaso não tiver ID, ele usa a linha para não fundir caixas indevidamente.
          const chaveCaixaFisica = idEmbalagem || `${numCaixa}-linha-${i}`;
          
          if (!mapaCaixas[chaveCaixaFisica]) { 
            mapaCaixas[chaveCaixaFisica] = { 
              idExpedicao: idEmbalagem, 
              num: numCaixa, 
              peso: peso, 
              produtos: [] 
            }; 
          }
          
          // Mantém o peso correto da embalagem sem somar bizarrices
          mapaCaixas[chaveCaixaFisica].peso = Math.max(mapaCaixas[chaveCaixaFisica].peso, peso);
          
          // Agrupador de SKU dentro da mesma caixa física:
          const prodExistente = mapaCaixas[chaveCaixaFisica].produtos.find(p => p.sku === sku);
          if (prodExistente) {
             prodExistente.quantidade += qtd;
          } else {
             mapaCaixas[chaveCaixaFisica].produtos.push({ sku, quantidade: qtd });
          }
        }

        // Converte para o array final
        const arrayCaixasFormatadas = Object.values(mapaCaixas).map(cx => ({ 
          ...cx, 
          peso: cx.peso.toFixed(2) 
        }));
        
        setCaixasPrevia(arrayCaixasFormatadas);
      } catch (error) { 
        alert("Ocorreu um erro ao ler o arquivo CSV. Verifique a formatação."); 
        console.error(error);
      } finally { 
        setIsUploading(false); 
      }
    };
    
    reader.readAsText(file, 'ISO-8859-1');
    e.target.value = null; 
  };

// ==========================================
  // AUTO-LOAD DO WMS (Evita perda no F5 e limpa cache entre pedidos)
  // ==========================================
  useEffect(() => {
    if (showDetalhesModal && pedidoModal?.isCaixaMaster) {
      // Se abrir um pedido Master, busca apenas os dados dele
      const sessoesSalvas = {};
      (pedidoModal.documentos || []).forEach((doc, dIdx) => {
        if (doc.planejamentoWms) {
          sessoesSalvas[dIdx] = doc.planejamentoWms;
        }
      });
      // SUBSTITUI completamente a memória (sem usar o prev)
      setWmsSessions(sessoesSalvas);
      
    } else if (!showDetalhesModal) {
      // Quando o modal fechar, "formata" a memória para não vazar pro próximo pedido
      setWmsSessions({});
      setAuditModalData(null);
      setShowCaixasEfetivadasModal(null);
      setWmsPreResumoAberto(null);
    }
  }, [showDetalhesModal, pedidoModal]);

const handlePlanejamentoUpload = (e, dIdx) => {
    const file = e.target.files[0];
    if (!file) return;

    setFluxoImportacao({
      tipo: 'master_planejamento',
      etapa: 'lendo',
      dIdx,
      fileName: file.name,
      totalSkusCount: 0,
      totalUnidades: 0,
      volumesEstimados: 0,
      skusPendentes: 0
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const linhas = text.trim().split(/\r\n|\n|\r/);
        if (linhas.length <= 1) throw new Error("Arquivo vazio");

        let separador = linhas[0].includes(';') ? ';' : ',';
        const cabecalho = linhas[0].split(separador).map(c => c.trim().toUpperCase().replace(/"/g, ''));
        
        let idxRef = cabecalho.findIndex(c => c.includes("CÓDIGO PRODUTO") || c === "PRODUTO" || c === "REF");
        let idxQtd = cabecalho.findIndex(c => c.includes("QTDE CONFERIDA") || c.includes("QUANTIDADE"));
        let idxDesc = cabecalho.findIndex(c => c.includes("DESCRIÇÃO") || c.includes("DESCRICAO"));

        if (idxRef === -1 || idxQtd === -1) {
          throw new Error("Colunas 'Código Produto' e 'Qtde Conferida' não encontradas.");
        }

        let skusProcessados = [];
        let totalUnidades = 0;
        let volumesEstimados = 0;
        let skusPendentes = 0;

        for (let i = 1; i < linhas.length; i++) {
          const cols = linhas[i].split(separador).map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length <= idxRef) continue;
          
          const ref = cols[idxRef];
          const qtd = parseInt(cols[idxQtd] || "0");
          if (!ref || qtd <= 0) continue;

          totalUnidades += qtd;

          const masterRef = caixasMaster.find(m => 
            String(m.ref).trim() === String(ref).trim() || 
            String(m.ref).trim().replace(/^0+/, '') === String(ref).trim().replace(/^0+/, '')
          );

          const variacoesValidas = masterRef ? masterRef.variacoes.filter(v => {
            const qtdPadrao = parseInt(String(v.quantidade).replace(/\D/g, '')) || 0;
            return qtdPadrao > 0 && qtd % qtdPadrao === 0;
          }) : [];

          const isMissing = variacoesValidas.length === 0;
          if (isMissing) skusPendentes++;

          const qtdPadrao = !isMissing ? parseInt(String(variacoesValidas[0].quantidade).replace(/\D/g, '')) : 0;
          const pesoPadrao = !isMissing ? parseFloat(String(variacoesValidas[0].peso).replace(',', '.')) || 0 : 0;

          if (qtdPadrao > 0) {
            volumesEstimados += Math.ceil(qtd / qtdPadrao);
          }

          skusProcessados.push({
            ref, 
            desc: idxDesc !== -1 ? cols[idxDesc] : "Produto", 
            qtdTotal: qtd, 
            variacoesDisponiveis: variacoesValidas, 
            selectedVar: 0,
            caixaNome: !isMissing ? variacoesValidas[0].caixa : "", 
            qtdPadrao: qtdPadrao, 
            pesoPadrao: pesoPadrao,
            isMissing: isMissing, 
            isOriginalMissing: isMissing
          });
        }

        setTimeout(() => {
          setFluxoImportacao({
            tipo: 'master_planejamento',
            etapa: 'previa',
            dIdx,
            fileName: file.name,
            skusProcessados,
            totalSkusCount: skusProcessados.length,
            totalUnidades,
            volumesEstimados,
            skusPendentes
          });
        }, 900);

      } catch (error) {
        setFluxoImportacao(null);
        alert("Erro ao ler planejamento: " + error.message);
      } finally {
        if (e.target) e.target.value = null;
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  // ==========================================
  // LÊ O CSV FINAL DE CAIXAS DO WMS (AUDITORIA)
  // ==========================================
  const handleAuditoriaUpload = (e, targetIdx = null) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Prioriza o dIdx passado diretamente pelo input
    const currentIdx = targetIdx !== null ? targetIdx : (auditModalData?.dIdx ?? 0);

    setFluxoImportacao({
      tipo: 'master_auditoria',
      etapa: 'lendo',
      dIdx: currentIdx,
      fileName: file.name,
      totalCaixas: 0,
      totalSkus: 0,
      pesoTotal: 0,
      amostraNomes: []
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const linhas = text.trim().split(/\r\n|\n|\r/);
        if (linhas.length < 2) throw new Error("Arquivo CSV inválido ou vazio.");

        const cabecalho = linhas.shift().split(';').map(c => c.trim().replace(/"/g, ''));
        const map = {};
        let totalSkus = 0;
        let pesoBruto = 0;

        linhas.forEach(l => {
          const cols = l.split(';');
          const status = cols[cabecalho.indexOf("Estado Conferência")]?.trim();
          if (status !== "EFETIVADO") return;

          const idEmbalagem = cols[cabecalho.indexOf("ID Embalagem Expedição")];
          if (!idEmbalagem) return;
          
          const qtd = parseInt(cols[cabecalho.indexOf("Quantidade")]) || 0;
          const peso = parseFloat(cols[cabecalho.indexOf("Peso Embalagem")]?.replace(',', '.')) || 0;
          totalSkus += qtd;

          if (!map[idEmbalagem]) {
            map[idEmbalagem] = [];
            pesoBruto += peso;
          }
          
          map[idEmbalagem].push({
            num: cols[cabecalho.indexOf("Descrição Tipo Embalagem Expedição")],
            peso: peso,
            ref: cols[cabecalho.indexOf("Produto")],
            desc: cols[cabecalho.indexOf("Descrição Produto")],
            qtd: qtd
          });
        });

        const caixasReais = Object.keys(map).map(id => {
          const prods = map[id];
          return {
            num: prods[0].num || 'CX',
            peso: prods[0].peso || 0,
            isBonificacao: false,
            produtos: prods.map(p => ({
              referencia: p.ref,
              descricao: p.desc,
              quantidade: p.qtd
            }))
          };
        });

        const resumoContagem = {};
        caixasReais.forEach(c => {
          const k = `${c.num} (${c.peso.toFixed(2)} kg)`;
          resumoContagem[k] = (resumoContagem[k] || 0) + 1;
        });
        const resumoTextoGerado = Object.entries(resumoContagem).map(([k, v]) => `${k}: ${v} Un`).join('\n');

        setTimeout(() => {
          setFluxoImportacao({
            tipo: 'master_auditoria',
            etapa: 'previa',
            dIdx: currentIdx,
            fileName: file.name,
            caixasFinais: caixasReais,
            totalCaixas: caixasReais.length,
            totalSkus: totalSkus,
            pesoTotal: pesoBruto,
            amostraNomes: caixasReais.slice(0, 8).map(c => c.num),
            resumoTexto: resumoTextoGerado
          });
        }, 900);

      } catch (error) {
        setFluxoImportacao(null);
        alert("Erro ao ler caixas efetivadas: " + error.message);
      } finally {
        if (e.target) e.target.value = null; 
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  // TROCA A VARIAÇÃO DA CAIXA E SALVA AUTOMATICAMENTE
  const handleMudarVariacao = (dIdx, skuRef, indexVariacao) => {
    setWmsSessions(prev => {
      const novoEstado = { ...prev };
      const sessao = { ...novoEstado[dIdx] };
      const skus = [...sessao.skus];
      
      const skuIndex = skus.findIndex(s => s.ref === skuRef);
      if (skuIndex === -1) return prev;

      const sku = { ...skus[skuIndex] };
      const novaVariacao = sku.variacoesDisponiveis[indexVariacao];

      if (novaVariacao) {
        // MÁGICA AQUI: Arranca as letras "CX" e deixa só os números para a matemática não zerar
        const qtdBruta = String(novaVariacao.quantidade || novaVariacao.qtdPadrao || novaVariacao.qtd || '0');
        const qtdLimpa = parseInt(qtdBruta.replace(/\D/g, '')) || 0;

        // Trata o peso removendo "kg" e trocando vírgula por ponto
        const pesoBruto = String(novaVariacao.peso || novaVariacao.pesoPadrao || '0');
        const pesoLimpo = parseFloat(pesoBruto.replace(',', '.').replace(/[^\d.]/g, '')) || 0;

        sku.caixaNome = novaVariacao.caixa || novaVariacao.caixaNome || "CAIXA";
        sku.qtdPadrao = qtdLimpa;
        sku.pesoPadrao = pesoLimpo;
        sku.variacaoSelecionadaIdx = indexVariacao; 
      }

      skus[skuIndex] = sku;
      sessao.skus = skus;
      novoEstado[dIdx] = sessao;

      // -----------------------------------------------------
      // AUTO-SAVE EM BACKGROUND (Salva a escolha no Firebase)
      // -----------------------------------------------------
      const refFinal = pedidoModal._isLegacy 
        ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) 
        : doc(db, 'pedidos', pedidoModal.id);
        
      const novosDocs = [...pedidoModal.documentos];
      novosDocs[dIdx] = { ...novosDocs[dIdx], planejamentoWms: sessao };
      updateDoc(refFinal, { documentos: novosDocs }).catch(e => console.error("Erro Auto-Save Variação", e));

      return novoEstado;
    });
  };
 // SALVA A AUDITORIA FINAL NO BANCO DE DADOS
  const confirmarAuditoriaWms = async () => {
    if (!auditModalData || !auditModalData.caixasReais) return;
    setIsSaving(true);
    
    try {
      const { dIdx, caixasReais, fileName } = auditModalData;
      const session = wmsSessions[dIdx] || { skus: [] };
      
      let pedidoRef;
      if (pedidoModal._isLegacy) {
        pedidoRef = doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id);
      } else {
        pedidoRef = doc(db, 'pedidos', pedidoModal.id);
      }

      // Gera o resumo rápido para o histórico
      let planejado = 0;
      session.skus.forEach(sku => {
        if (sku.qtdPadrao > 0) planejado += Math.ceil(sku.qtdTotal / sku.qtdPadrao);
      });
      const totalReais = caixasReais.length;
      
      const novosDocumentos = [...pedidoModal.documentos];
      novosDocumentos[dIdx] = { 
        ...novosDocumentos[dIdx], 
        caixas: caixasReais,
        auditoria: {
          arquivo: fileName,
          planejado: planejado,
          efetivado: totalReais,
          diferenca: planejado - totalReais,
          data: new Date().toISOString()
        }
      };
      
      await updateDoc(pedidoRef, {
        documentos: novosDocumentos,
        efetivado: true, 
        completedAt: serverTimestamp()
      });
      
      // 👇 GATILHO NOVO AQUI: Evita somar duas vezes caso o pedido já estivesse efetivado antes de auditar
      if (!pedidoModal.efetivado) {
        const pedidoAtualizado = { ...pedidoModal, documentos: novosDocumentos };
        await atualizarEstatisticasMensais(pedidoAtualizado, true);
      }
      
      setAuditModalData(null);
      setShowCaixasEfetivadasModal(dIdx); 
      
      // 👇 SAÍDA SUAVE COM MODAL ANIMADO EM VEZ DE ALERT
      setModalSucesso({
        titulo: "Auditoria Validada!",
        mensagem: "O arquivo do WMS foi processado, cruzado com o planejamento e salvo no histórico com sucesso!"
      });
      
    } catch (error) {
      alert("Erro ao salvar auditoria no banco: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSalvarCaixasFirebase = async () => {
    if (!pedidoModal) return;
    setIsSaving(true);
    try {
      const ref = obterReferenciaDocumento(pedidoModal);
      const novosDocs = [...pedidoModal.documentos];
      novosDocs[docIndexSelecionado] = { ...novosDocs[docIndexSelecionado], caixas: caixasPrevia };
      await updateDoc(ref, { documentos: novosDocs });
      setCaixasPrevia([]); 
      alert("Caixas importadas com sucesso!");
      // O sistema agora permanece silenciosamente na ABA 2
    } catch (error) { 
      alert("Erro ao sincronizar caixas."); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleOpenPauseModal = (pedido) => {
    setPedidoToPause(pedido);
    setShowPauseModal(true); 
    setDropdownOpen(null);
  };


  const handleResumePedido = async (pedido) => {
    const ref = obterReferenciaDocumento(pedido);
    const lastPause = pedido.lastPauseStart || Date.now();
    const timePaused = Date.now() - lastPause;
    const newTotalPaused = (pedido.totalPausedTime || 0) + timePaused;
    await updateDoc(ref, { isPaused: false, motivoPausa: deleteField(), lastPauseStart: deleteField(), totalPausedTime: newTotalPaused });
    setDropdownOpen(null);
  };

  const handleEditPedido = (pedido) => {
    if (pedido._isLegacy) return alert("Pedidos legados não podem ser editados. Recrie no novo formato.");
    setEditingId(pedido.id);
    setRomaneio(pedido.romaneio || ''); setLoja(pedido.loja || ''); setLocal(pedido.local || 'DF');
    setUf(pedido.uf || ''); setIsCaixaMaster(pedido.isCaixaMaster || false); setObservacoes(pedido.observacoes || '');
    const docsRemontados = (pedido.documentos || []).map((doc, index) => ({ 
       ...doc, 
       idTemp: Date.now() + index,
       dbIndex: index // <-- RASTREADOR AQUI TAMBÉM
    }));
    setDocsTemporarios(docsRemontados);
    setShowModal(true); setDropdownOpen(null);
  };

  const handleOpenModal = () => {
    // 👇 ADICIONADO: Reseta TUDO antes de abrir o modal
    resetForm();
    
    // Opcional: já define o responsável inicial com o email do usuário logado (facilita)
    if (localUser?.email) setDocResponsavel(String(localUser.email).toLowerCase().trim());
    
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => { setShowModal(false); setIsClosingModal(false); resetForm(); }, 350); 
  };

  const resetForm = () => {
    setEditingId(null); 
    setRomaneio(''); 
    setLoja(''); 
    setLocal('DF'); 
    setUf('');
    setIsCaixaMaster(false); 
    setObservacoes(''); 
    setDocsTemporarios([]); 
    setDocTipo('Nota Fiscal');
    // Força a limpeza ou pré-preenchimento
    setDocResponsavel(localUser?.email ? String(localUser.email).toLowerCase().trim() : ''); 
  };

  const handleAddDoc = () => {
    if (!docResponsavel) return alert("Selecione um responsável inicial.");
    const novoDoc = { 
      idTemp: Date.now(), 
      tipo: docTipo, 
      responsavel: docResponsavel, // Mantido pro legado
      responsaveis: [docResponsavel], // Novo formato de Array
      caixas: [] 
    };
    setDocsTemporarios([...docsTemporarios, novoDoc]);
  };

  const handleSavePedido = async () => {
    if (!romaneio) return alert("Informe o Nº do Romaneio.");
    if (docsTemporarios.length === 0) return alert("Adicione pelo menos um documento.");
    if (!localUser) return alert("Usuário não logado.");
    setIsSaving(true);
    try {
      const pedidoAlvo = editingId ? pedidosProcessados.find(p => p.id === editingId) : null;
      const documentosLimpos = docsTemporarios.map(({ idTemp, dbIndex, ...rest }) => {
         let caixasAtualizadas = rest.caixas || [];
         if (editingId && pedidoAlvo && dbIndex !== undefined && pedidoAlvo.documentos[dbIndex]) {
            caixasAtualizadas = pedidoAlvo.documentos[dbIndex].caixas;
         }
         return { ...rest, caixas: caixasAtualizadas };
      });
      
      let emailsEnvolvidos = [String(localUser.email).toLowerCase().trim()]; 
      documentosLimpos.forEach(d => { 
        if(d.responsaveis && d.responsaveis.length > 0) {
            d.responsaveis.forEach(r => emailsEnvolvidos.push(String(r).toLowerCase().trim()));
        } else if (d.responsavel) {
            emailsEnvolvidos.push(String(d.responsavel).toLowerCase().trim());
        }
      });
      const emailsUnicos = [...new Set(emailsEnvolvidos)];
      const uidsVinculados = emailsUnicos.map(email => {
         const found = usuarios.find(u => u.email === email);
         return found ? found.uid : null;
      }).filter(Boolean); 

      if (editingId) {
        const ref = doc(db, 'pedidos', editingId);
        await updateDoc(ref, { romaneio, loja, local, uf, observacoes, isCaixaMaster, documentos: documentosLimpos, uidsVinculados });
        handleCloseModal();
      } else {
        const novoPedido = {
          romaneio, loja, local, uf, observacoes, isCaixaMaster, documentos: documentosLimpos,
          criadorUid: localUser.uid, criadorEmail: localUser.email, dataOperacao: dataOperacaoAtiva, 
          uidsVinculados, createdAt: serverTimestamp(), efetivado: false, isPaused: false, totalPausedTime: 0
        };
        
        // Fecha o modal de criação imediatamente
        handleCloseModal();

        // Salva no Firestore
        await addDoc(collection(db, 'pedidos'), novoPedido);

        // Dispara a transição em tela cheia
        setPedidoRecemCriado({ romaneio, loja });
        
        // Acende o brilho no Tracker Card quando o HUD central começa a sumir
        setTimeout(() => {
          setIsIgnitingTracker(true);
        }, 2400);

        // Encerra e desmonta a camada de animação
        setTimeout(() => {
          setPedidoRecemCriado(null);
          setIsIgnitingTracker(false);
        }, 2900);
      }
    } catch (error) { 
      alert("Houve um erro ao salvar o pedido."); 
    } finally { 
      setIsSaving(false); 
    }
  };

const rankingCalculado = useMotorRanking(usuarios, opsDoDia, pedidosProcessados, controlePausas, ajustesDoDia, dataOperacaoAtiva, currentTime);
  

  // ==========================================
  // LÓGICA DE SINCRONIZAÇÃO EM TEMPO REAL COM A PÁGINA ADM
  // ==========================================
  useEffect(() => {
    if (!rankingCalculado || rankingCalculado.length === 0) return;

    const sincronizarComADM = async () => {
      try {
        const refDia = doc(db, 'estatisticasDiarias', dataOperacaoAtiva);
        
        // Empacotamos TODOS os detalhes calculados para a ADM não ficar zerada
        const rankingParaSalvar = {};
        
        rankingCalculado.forEach(user => {
          rankingParaSalvar[user.nome] = {
            pontos: user.pontos || 0,
            skus: user.skus || 0,       
            pontosSku: user.pontosSku || 0,       // <-- FALTAVA ESSA
            op: user.op || 0,           
            pedidos: user.pedidos || 0, 
            bonusPedidos: user.bonusPedidos || 0, // <-- E FALTAVA ESSA
            decrescimo: user.decrescimo || 0,
            pointEvents: user.pointEvents || [],
            chartData: user.chartData || [],
            eventosMesclados: user.eventosMesclados || []
          };
        });

        // Contagem de totais para o painel
        let totalPedidos = 0;
        let totalCaixas = 0;
       pedidosProcessados.forEach(p => {
           if (p.efetivado) {
              const temNfOuMinuta = (p.documentos || []).some(d => d.tipo === 'Nota Fiscal' || d.tipo === 'Minuta');
              if (temNfOuMinuta) totalPedidos++;
              
              (p.documentos || []).forEach(d => {
                  totalCaixas += (d.caixas || []).length;
              });
           }
        });

        // 1. Sanitiza o mapa de ranking garantindo que nada passe como undefined
        const rankingSanitizado = {};
        if (rankingParaSalvar && typeof rankingParaSalvar === 'object') {
          Object.entries(rankingParaSalvar).forEach(([nome, stats]) => {
            if (!stats) return;
            rankingSanitizado[nome] = {
              pontos: Number(stats.pontos) || 0,
              skus: Number(stats.skus) || 0,
              pontosSku: Number(stats.pontosSku) || 0,
              op: Number(stats.op) || 0,
              pedidos: Number(stats.pedidos) || 0,
              bonusPedidos: Number(stats.bonusPedidos) || 0,
              decrescimo: Number(stats.decrescimo) || 0,
              chartData: Array.isArray(stats.chartData) ? stats.chartData : [],
              pointEvents: Array.isArray(stats.pointEvents) ? stats.pointEvents : [],
              eventosMesclados: Array.isArray(stats.eventosMesclados) ? stats.eventosMesclados : []
            };
          });
        }

        // 2. Payload blindado (JSON.parse remove qualquer chave residual com undefined)
        const payloadFinal = JSON.parse(JSON.stringify({
          ranking: rankingSanitizado,
          totalNfMinuta: totalPedidos || 0,
          totalCaixas: totalCaixas || 0,
          ultimaAtualizacao: Date.now()
        }));

        // 3. Gravação com sobrescrita protegida
        await setDoc(refDia, payloadFinal);

      } catch (error) {
        console.error("Falha na transmissão do ranking para a ADM:", error);
      }
    };

    // Dispara a sincronização instantaneamente SEMPRE que o rankingCalculado mudar
    sincronizarComADM();
    
  }, [rankingCalculado, dataOperacaoAtiva, pedidosProcessados]);
  // ==========================================
  // ESTADOS E FUNÇÕES DO ALERTA DE PESO ZERO
  // ==========================================
  const [alertaPesoZero, setAlertaPesoZero] = useState(null);

  // ==========================================
  // MOTOR DE ESTATÍSTICAS (GRÁFICO DO DASHBOARD)
  // ==========================================
  const atualizarEstatisticasMensais = async (pedido, isEfetivando) => {
    try {
      const temNfOuMinuta = (pedido.documentos || []).some(doc => 
        doc.tipo === 'Nota Fiscal' || doc.tipo === 'Minuta'
      );
      
      if (!temNfOuMinuta) return; 

      let totalCaixas = 0;
      (pedido.documentos || []).forEach(doc => {
        totalCaixas += (doc.caixas || []).length;
      });

      const mult = isEfetivando ? 1 : -1;
      const idMes = pedido.dataOperacao ? String(pedido.dataOperacao).substring(0, 7) : dataOperacaoAtiva.substring(0, 7);

      const mesRef = doc(db, 'estatisticasMensais', idMes);
      await setDoc(mesRef, {
        totalNfMinuta: increment(1 * mult),
        totalCaixas: increment(totalCaixas * mult)
      }, { merge: true });
      
    } catch (error) {
      console.error("Aviso: Falha ao gravar estatística mensal.", error);
    }
  };

  const finalizarImportacaoComum = async (dIdx, caixasFinais) => {
    setIsSaving(true);
    try {
      const novosDocs = [...pedidoModal.documentos];
      novosDocs[dIdx] = { ...novosDocs[dIdx], caixas: caixasFinais };
      
      const todosPossuemCaixas = novosDocs.every(doc => doc.caixas && doc.caixas.length > 0);
      const payload = { documentos: novosDocs };
      
      if (todosPossuemCaixas) {
        payload.efetivado = true;
        payload.completedAt = serverTimestamp();
      }

      const refFinal = pedidoModal._isLegacy ? doc(db, 'usuarios', pedidoModal.criadorUid, 'elementos', pedidoModal.elementoIdOriginal, 'pedidosMultiDocumento', pedidoModal.id) : doc(db, 'pedidos', pedidoModal.id);
      
      await updateDoc(refFinal, payload);
      
      // O GATILHO DA ESTATÍSTICA FICA AQUI (Lê a variável recém montada em vez de mutar a antiga)
      if (todosPossuemCaixas && !pedidoModal.efetivado) {
        const pedidoAtualizado = { ...pedidoModal, documentos: novosDocs };
        await atualizarEstatisticasMensais(pedidoAtualizado, true);
      }

      if (todosPossuemCaixas) {
        setModalSucesso({
          titulo: "Romaneio Efetivado!",
          mensagem: "Todos os documentos foram importados e o romaneio foi finalizado automaticamente."
        });
      } else {
        setModalSucesso({
          titulo: "Caixas Importadas!",
          mensagem: "As caixas deste documento foram carregadas com sucesso. Faltam outros documentos para finalizar o romaneio."
        });
      }
      
      setForceRender(prev => prev + 1); 
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("Erro ao salvar caixas: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolvePesoZero = async (acao) => {
    if (!alertaPesoZero) return;
    const { origem, dIdx, caixasNormais, caixasOriginais, fileName } = alertaPesoZero;
    const caixasEscolhidas = acao === 'excluir' ? caixasNormais : caixasOriginais;

    if (acao === 'excluir') {
       if (!window.confirm("Tem certeza? A caixa será excluída permanentemente da listagem.")) return;
    } else {
       if (!window.confirm("Tem certeza? Certifique-se que essa caixa existe fisicamente.")) return;
    }

    if (origem === 'comum') {
       await finalizarImportacaoComum(dIdx, caixasEscolhidas);
    } else if (origem === 'auditoria') {
       setAuditModalData({ dIdx, fileName, caixasReais: caixasEscolhidas });
    }
    
    setAlertaPesoZero(null);
  };

  

  // 👇 O SEU RETURN ORIGINAL FICA LOGO AQUI EMBAIXO
 return (
    <>
      <NavbarOperacao 
        user={localUser} 
        isAdmin={isAdmin} 
        dataOperacaoAtiva={dataOperacaoAtiva} 
        buscaRomaneio={buscaRomaneio} 
        setBuscaRomaneio={setBuscaRomaneio} 
        handleOpenModal={handleOpenModal} 
      />

      {/* WRAPPER COM A ANIMAÇÃO DE ENTRADA */}
      <div className="op-wrapper">
        <main className="op-main-content">
          <section className="op-live-section">
          {atividadeAtual ? (
            <div className={`live-tracker-card ${atividadeAtual.isPaused ? 'paused' : 'active'} ${isIgnitingTracker ? 'igniting' : ''}`}>
              
              {/* TOPO: IDENTIFICAÇÃO E CONTEXTO */}
              <div className="live-tracker-top">
                <div className="live-badge">
                  {atividadeAtual.isPaused ? (
                    <><AlertCircle size={14}/> Pausado</>
                  ) : (
                    <><div className="pulse-dot"></div> Em Separação</>
                  )}
                </div>
                <h2 className="live-romaneio">{atividadeAtual.romaneio || 'S/N'}</h2>
                <p className="live-loja">{atividadeAtual.loja || 'Destino Padrão'}</p>
                
                {/* NOVO BLOCO DE INFORMAÇÕES (DESTINO E DOCS) */}
                <div className="live-extra-info">
                  <div className="live-location">
                    <MapPin size={14} /> 
                    {atividadeAtual.local || 'DF'} {atividadeAtual.uf ? `- ${atividadeAtual.uf}` : ''}
                  </div>
                  
                  <div className="live-docs-badges">
                    {atividadeAtual.documentos && atividadeAtual.documentos.length > 0 ? (
                      Array.from(new Set(atividadeAtual.documentos.map(d => d.tipo || 'S/N'))).map((tipo, idx) => {
                        let corFundo = '#3b82f6'; // Azul Padrão (NF)
                        if (tipo === 'Minuta') corFundo = '#8b5cf6'; // Roxo
                        if (tipo === 'Bonificação') corFundo = '#ec4899'; // Rosa
                        if (tipo === 'Troca') corFundo = '#f59e0b'; // Laranja
                        
                        return (
                          <span key={idx} style={{ background: corFundo }}>
                            {tipo}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ background: '#64748b' }}>Sem Documentos</span>
                    )}
                  </div>
                </div>

                {atividadeAtual.isPaused && (
                  <div className="pause-reason-box">
                    <strong>Motivo:</strong> {atividadeAtual.motivoPausa || 'Pausa Operacional'}
                  </div>
                )}
              </div>

              {/* MEIO: CRONÔMETRO E MÉTRICAS (Centralizado) */}
              <div className="live-tracker-middle">
                <div className="live-timer">
                  <Clock size={32} className="timer-icon" />
                  <div className="timer-display">{formatarCronometro(atividadeAtual)}</div>
                </div>

                <div className="live-stats">
                  <div>
                    <strong>{atividadeAtual.totalSkus || 0}</strong> SKUs Mapeados
                  </div>
                  <div>
                    <strong>{atividadeAtual.documentos?.reduce((acc, d) => acc + (d.caixas?.length || 0), 0) || 0}</strong> Caixas
                  </div>
                </div>
              </div>

              {/* BASE: AÇÕES */}
              <div className="live-actions">
                {atividadeAtual.isPaused ? (
                  <button className="btn-live-resume" onClick={() => handleResumePedido(atividadeAtual)}>
                    <Play size={16}/> Retomar
                  </button>
                ) : (
                  <>
                    <button className="btn-live-pause" onClick={() => handleOpenPauseModal(atividadeAtual)}>
                      <Pause size={16}/> Pausar
                    </button>
                    <button className="btn-live-caixas" onClick={() => handleAbrirDetalhes(atividadeAtual)}>
                      <Boxes size={16}/> WMS
                    </button>
                    <button className="btn-live-finish" onClick={() => handleToggleEfetivado(atividadeAtual)}>
                      <CheckCircle2 size={16}/> Finalizar
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="live-tracker-card empty">
  <CheckCircle2 size={44} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.6 }} />
  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800 }}>
    Tudo Limpo!
  </h3>
  <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>
    Nenhum romaneio em andamento.<br />Inicie um novo pedido para cronometrar.
  </p>
</div>
          )}

          {/* INDICADORES RÁPIDOS */}
          <div className="op-kpi-grid">
            <div className="op-kpi-card">
              <span className="kpi-label">Pedidos Hoje</span>
              <span className="kpi-val">{totalPedidosKPI}</span>
            </div>
            <div className="op-kpi-card">
              <span className="kpi-label">Caixas Fechadas</span>
              <span className="kpi-val" style={{ color: 'var(--secondary, #f26522)' }}>
                {totalCaixasHoje}
              </span>
            </div>
          </div>
        </section>

          {/* ==========================================
              TABELA DE ROMANEIOS REESTILIZADA
              ========================================== */}
          <section className="op-history-section">
            
            {/* TOPO DA TABELA: TÍTULO, CONTAGEM E BUSCA DEDICADA */}
            <div className="history-header">
              <div className="history-title-area">
                <div className="history-icon-badge">
                  <Layers size={20} color="var(--primary)" />
                </div>
                <div>
                  <h3>Romaneios Processados</h3>
                  <span className="history-subtitle">
                    {pedidosProcessados.filter(p => p.efetivado).length} finalizados de {pedidosProcessados.length} no dia
                  </span>
                </div>
              </div>

              {/* BARRA DE PESQUISA INTEGRADA */}
              <div className="table-search-box">
                <Search size={16} className="table-search-icon" />
                <input 
                  type="text"
                  placeholder="Filtrar por romaneio, loja ou UF..."
                  value={buscaRomaneio}
                  onChange={(e) => setBuscaRomaneio(e.target.value)}
                  className="table-search-input"
                />
                {buscaRomaneio && (
                  <button onClick={() => setBuscaRomaneio('')} className="table-search-clear">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            
            {/* CONTAINER DA TABELA */}
            <div className="op-table-wrapper scrollable-table-wrapper">
              <table className="op-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Romaneio & Status</th>
                    <th style={{ width: '27%' }}>Destino / Local</th>
                    <th style={{ width: '22%' }}>Observações</th>
                    <th style={{ width: '23%' }}>Documentos & Carga</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-table-row">
                        <SearchX size={36} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <p>{buscaRomaneio ? `Nenhum romaneio correspondente a "${buscaRomaneio}"` : 'Nenhum pedido processado nesta data.'}</p>
                      </td>
                    </tr>
                  ) : (
                    pedidosFiltrados.map(pedido => {
                      let caixasCount = 0; 
                      let skusCount = 0;
                      const listaDocumentos = []; 

                      (pedido.documentos || []).forEach(d => {
                        listaDocumentos.push(d.tipo || 'S/N');
                        caixasCount += (d.caixas || []).length;
                        (d.caixas || []).forEach(cx => { 
                          (cx.produtos || []).forEach(p => skusCount += parseInt(p.quantidade) || 0); 
                        });
                      });

                      const temPermissao = isAdmin || pedido.criadorUid === localUser?.uid;

                      // Status e Indicador Visual Lateral
                      let statusClass = "status-running";
                      let statusBadge;

                      if (pedido.efetivado) {
                        statusClass = "status-finished";
                        statusBadge = (
                          <div className="time-badge success">
                            <Check size={12} /> Finalizado
                          </div>
                        );
                      } else if (pedido.isPaused) {
                        statusClass = "status-paused";
                        statusBadge = (
                          <div className="time-badge paused" title={pedido.motivoPausa}>
                            <Pause size={12} /> Pausado
                          </div>
                        );
                      } else {
                        statusClass = "status-running";
                        statusBadge = (
                          <div className="time-badge running">
                            <Clock size={12} /> {formatarCronometro(pedido)}
                          </div>
                        );
                      }

                      return (
                        <tr 
  key={pedido.id} 
  className={`clickable-row ${statusClass} ${dropdownOpen === pedido.id ? 'row-dropdown-open' : ''}`}
  onClick={() => handleAbrirDetalhes(pedido)}
  title="Clique para ver Detalhes"
>
                          {/* 1. ROMANEIO E BADGE */}
                          <td>
                            <div className="table-romaneio-cell">
                              <div className="romaneio-title-wrap">
                                <strong className="romaneio-number">{pedido.romaneio || 'S/N'}</strong>
                                {pedido._isLegacy && <span className="legacy-tag">Legado</span>}
                              </div>
                              {statusBadge}
                            </div>
                          </td>
                          
                          {/* 2. DESTINO & UF */}
                          <td>
                            <div className="table-store-name">{pedido.loja || 'Destino não especificado'}</div>
                            <div className="table-location-sub">
                              <MapPin size={13} /> 
                              <span>{pedido.local || 'DF'} {pedido.uf ? `• ${pedido.uf}` : ''}</span>
                            </div>
                          </td>

                          {/* 3. OBSERVAÇÕES */}
                          <td>
                            <div className="table-obs-text">
                              {pedido.observacoes ? pedido.observacoes : <span className="obs-empty">Sem observações...</span>}
                            </div>
                          </td>
                          
                          {/* 4. DOCUMENTOS E VOLUMES */}
                          <td>
                            <div className="table-docs-container">
                              <div className="doc-pills-row">
                                {listaDocumentos.map((tipo, idx) => {
                                  let corFundo = '#3b82f6'; 
                                  if (tipo === 'Minuta') corFundo = '#8b5cf6'; 
                                  if (tipo === 'Bonificação') corFundo = '#ec4899'; 
                                  if (tipo === 'Troca') corFundo = '#f59e0b'; 
                                  
                                  return (
                                    <span key={idx} className="doc-micro-pill" style={{ background: corFundo }}>
                                      {tipo}
                                    </span>
                                  );
                                })}
                              </div>
                              <div className="volume-metrics-row">
                                <span><strong>{caixasCount}</strong> cx</span>
                                <span className="metric-dot">•</span>
                                <span><strong>{skusCount}</strong> SKUs</span>
                              </div>
                            </div>
                          </td>

                          {/* 5. AÇÕES */}
                          <td className="actions-cell">
                            <div onClick={(e) => e.stopPropagation()} className="action-buttons-wrap">
                              <button className="action-btn btn-caixas" title="Painel do Romaneio" onClick={() => handleAbrirDetalhes(pedido)}>
                                <Info size={16}/>
                              </button>
                              
                              <div style={{ position: 'relative' }}>
                                <button className="action-btn btn-edit" title="Opções" onClick={() => setDropdownOpen(dropdownOpen === pedido.id ? null : pedido.id)}>
                                  <MoreVertical size={16}/>
                                </button>
                                
                                {dropdownOpen === pedido.id && (
                                  <div className="table-dropdown-menu">
                                    {!pedido.efetivado && (
                                      <>
                                        {pedido.isPaused ? (
                                          <button className="dropdown-item" style={{ color: '#10b981' }} onClick={() => handleResumePedido(pedido)}>
                                            <Play size={14}/> Retomar
                                          </button>
                                        ) : (
                                          <button className="dropdown-item" style={{ color: '#f59e0b' }} onClick={() => handleOpenPauseModal(pedido)}>
                                            <Pause size={14}/> Pausar Timer
                                          </button>
                                        )}
                                        <div className="dropdown-divider"></div>
                                      </>
                                    )}
                                    <button className="dropdown-item" onClick={() => handleToggleEfetivado(pedido)}>
                                      {pedido.efetivado ? <><X size={14}/> Desfazer Efetivação</> : <><Check size={14}/> Forçar Efetivação</>}
                                    </button>
                                    {temPermissao && (
                                      <>
                                        <button className="dropdown-item" onClick={() => handleEditPedido(pedido)}>
                                          <Edit size={14}/> Editar Dados
                                        </button>
                                        <div className="dropdown-divider"></div>
                                        <button className="dropdown-item text-danger" onClick={() => handleDeletePedido(pedido)}>
                                          <Trash2 size={14}/> Excluir Pedido
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="op-bottom-zone">
              {/* RANKING DIÁRIO DE PRODUTIVIDADE */}
              <RankingDiario 
                rankingCalculado={rankingCalculado}
                rankingExpandido={rankingExpandido}
                setRankingExpandido={setRankingExpandido}
                currentTime={currentTime}           
                dataOperacaoAtiva={dataOperacaoAtiva} 
              />

              <div className="op-side-indicators">
                  <div className="indicator-card op-card">
                    <div className="indicator-icon" style={{background: '#e0e7ff', color: '#4f46e5'}}><Factory size={24}/></div>
                    <div className="indicator-content"><h4>Ordens de Produção</h4><span className="indicator-value">{opsDoDia.length} Registros</span><p>Controle de O.P.s hoje</p></div>
                    <button className="indicator-btn" onClick={() => setShowOpModal(true)}>Gerenciar O.P.s</button>
                  </div>

                  <div className="indicator-card master-card">
                    <div className="indicator-icon" style={{background: '#fce7f3', color: '#db2777'}}><Package size={24}/></div>
                    <div className="indicator-content"><h4>Caixas Master</h4><span className="indicator-value">{caixasMaster.length} Padrões</span><p>Dicionário de embalagens</p></div>
                    <button className="indicator-btn" onClick={() => setShowMasterModal(true)}>Consultar Base</button>
                  </div>
              </div>
          </section>

        </main>
      </div> 
      {/* 🔴 O WRAPPER FECHOU AQUI! OS MODAIS AGORA ESTÃO LIVRES PARA COBRIR A TELA 🔴 */}

      {/* ==========================================
          MODAIS (RENDERIZADOS FORA DO WRAPPER)
          ========================================== */}
      
      {/* MODAL PRINCIPAL: PAINEL DO ROMANEIO (DETALHES + WMS) */}
      <ModalDetalhesPedido 
        showDetalhesModal={showDetalhesModal}
        setShowDetalhesModal={setShowDetalhesModal}
        pedidoModal={pedidoModal}
        isSaving={isSaving}
        isUploading={isUploading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wmsSessions={wmsSessions}
        setWmsSessions={setWmsSessions}
        buscasDocumentos={buscasDocumentos}
        handleBuscaDocumento={handleBuscaDocumento}
        wmsPreResumoAberto={wmsPreResumoAberto}
        setWmsPreResumoAberto={setWmsPreResumoAberto}
        setShowCaixasEfetivadasModal={setShowCaixasEfetivadasModal}
        setAuditModalData={setAuditModalData}
        handlePlanejamentoUpload={handlePlanejamentoUpload}
        handleUploadWMSComum={handleUploadWMSComum}
        handleAuditoriaUpload={handleAuditoriaUpload} /* <-- ADICIONE ESTA LINHA */
        docIndexSelecionado={docIndexSelecionado}
        setDocIndexSelecionado={setDocIndexSelecionado}
        skusExpandidos={skusExpandidos}
        setSkusExpandidos={setSkusExpandidos}
        skusExpandidosComum={skusExpandidosComum}
        setSkusExpandidosComum={setSkusExpandidosComum}
        handleInputManual={handleInputManual}
        abrirModalSalvarManual={abrirModalSalvarManual}
        handleMudarVariacao={handleMudarVariacao}
        isEditingObs={isEditingObs}
        setIsEditingObs={setIsEditingObs}
        observacoes={observacoes}
        setObservacoes={setObservacoes}
        docTipo={docTipo}
        setDocTipo={setDocTipo}
        docResponsavel={docResponsavel}
        setDocResponsavel={setDocResponsavel}
        localUser={localUser}
        usuarios={usuarios}
        handleAddDoc={handleAddDoc}
        docsTemporarios={docsTemporarios}
        handleRemoveDoc={handleRemoveDoc}
        handleAddResponsavelToDoc={handleAddResponsavelToDoc}
        handleRemoveResponsavelFromDoc={handleRemoveResponsavelFromDoc}
        handleSalvarEdicaoTab1={handleSalvarEdicaoTab1}
      />

      {/* MODAL DE RESUMO E EDIÇÃO DE CAIXAS */}
      <ModalCaixasEfetivadas 
        showCaixasEfetivadasModal={showCaixasEfetivadasModal}
        setShowCaixasEfetivadasModal={setShowCaixasEfetivadasModal}
        pedidoModal={pedidoModal}
        edicaoCaixa={edicaoCaixa}
        setEdicaoCaixa={setEdicaoCaixa}
        formCaixa={formCaixa}
        setFormCaixa={setFormCaixa}
        salvarCaixaManual={salvarCaixaManual}
        isSaving={isSaving}
        toggleBonificacaoCaixa={toggleBonificacaoCaixa}
        abrirFormCaixa={abrirFormCaixa}
        excluirCaixaManual={excluirCaixaManual}
      />


      {/* MODAL DE ORDEM DE PRODUÇÃO */}
      <ModalOrdemProducao 
        showOpModal={showOpModal}
        setShowOpModal={setShowOpModal}
        opsDoDia={opsDoDia}
        usuarios={usuarios}
        localUser={localUser}
        dataOperacaoAtiva={dataOperacaoAtiva}
      />

      {/* MODAL DE PAUSA DO CRONÔMETRO */}
      <ModalPausa 
        showPauseModal={showPauseModal}
        setShowPauseModal={setShowPauseModal}
        pedidoToPause={pedidoToPause}
        setPedidoToPause={setPedidoToPause}
      />

      {/* MODAL: DICIONÁRIO DE CAIXAS MASTER */}
      <ModalCaixasMaster 
        showMasterModal={showMasterModal}
        setShowMasterModal={setShowMasterModal}
        caixasMaster={caixasMaster}
        setCaixasMaster={setCaixasMaster}
      />

      {/* MODAL: CÓDIGO DE BARRAS (NOVA VARIAÇÃO) */}
      <ModalCodigoBarras 
        modalCodigoBarras={modalCodigoBarras}
        setModalCodigoBarras={setModalCodigoBarras}
        codigoBarrasInput={codigoBarrasInput}
        setCodigoBarrasInput={setCodigoBarrasInput}
        salvarVariacaoBanco={salvarVariacaoBanco}
        isSaving={isSaving}
      />

      {/* MODAL: CAIXA MANUAL */}
      <ModalCaixaManual 
        showAddCaixaModal={showAddCaixaModal}
        setShowAddCaixaModal={setShowAddCaixaModal}
        addCaixaForm={addCaixaForm}
        setAddCaixaForm={setAddCaixaForm}
        handleSalvarCaixaManual={handleSalvarCaixaManual}
        isSaving={isSaving}
      />

      {/* MODAL: ALERTA DE PESO ZERO */}
      <ModalAlertaPeso 
        alertaPesoZero={alertaPesoZero}
        handleResolvePesoZero={handleResolvePesoZero}
      />

      {/* MODAL: CRIAR / EDITAR PEDIDO */}
      <ModalCriarEditarPedido
        showModal={showModal}
        isClosingModal={isClosingModal}
        handleCloseModal={handleCloseModal}
        isSaving={isSaving}
        editingId={editingId}
        romaneio={romaneio} setRomaneio={setRomaneio}
        loja={loja} setLoja={setLoja}
        local={local} setLocal={setLocal}
        uf={uf} setUf={setUf}
        isCaixaMaster={isCaixaMaster} setIsCaixaMaster={setIsCaixaMaster}
        observacoes={observacoes} setObservacoes={setObservacoes}
        docTipo={docTipo} setDocTipo={setDocTipo}
        docResponsavel={docResponsavel} setDocResponsavel={setDocResponsavel}
        localUser={localUser}
        usuarios={usuarios}
        handleAddDoc={handleAddDoc}
        docsTemporarios={docsTemporarios}
        handleRemoveDoc={handleRemoveDoc}
        handleAddResponsavelToDoc={handleAddResponsavelToDoc}
        handleRemoveResponsavelFromDoc={handleRemoveResponsavelFromDoc}
        handleSavePedido={handleSavePedido}
      />

      {/* ANIMAÇÕES GLOBAIS */}
      <style>
        {`
          @keyframes fadeInOverlay { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(4px); } }
          @keyframes popInModal { from { opacity: 0; transform: scale(0.90) translateY(15px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          .animate-overlay { animation: fadeInOverlay 0.25s ease-out forwards; }
          .animate-modal { animation: popInModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        `}
      </style>

      {/* MODAL: SUCESSO ANIMADO */}
      <ModalSucesso 
        modalSucesso={modalSucesso}
        setModalSucesso={setModalSucesso}
      /> 

      {/* TRANSIÇÃO CINEMATOGRÁFICA DE NOVO PEDIDO */}
      <AnimacaoCriacaoPedido dadosPedido={pedidoRecemCriado} />

      {/* FLUXO UNIFICADO DE IMPORTAÇÃO WMS (LEITURA -> PRÉVIA -> GRAVAÇÃO -> SUCESSO/CÓPIA) */}
      <ModalFluxoImportacaoWMS 
        etapa={fluxoImportacao?.etapa}
        dadosPrevia={fluxoImportacao}
        resumoTexto={fluxoImportacao?.resumoTexto}
        onConfirmarGravacao={handleConfirmarGravacaoWMS}
        onConcluirFluxo={handleConcluirFluxoWMS}
        onCancelar={() => setFluxoImportacao(null)}
      />

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <ModalConfirmarExclusao 
        pedidoParaExcluir={pedidoParaExcluir}
        onConfirmar={handleConfirmarExclusaoDefinitiva}
        onCancelar={() => setPedidoParaExcluir(null)}
        isExcluindo={isExcluindoPedido}
      />
    </>

    
  );
}