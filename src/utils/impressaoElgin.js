// src/utils/impressaoElgin.js

export async function imprimirEtiquetaCheckout({ romaneio, loja, uf, totalVolumes = 1, volumeAtual = 1 }) {
  try {
    // 1. Solicita ou recupera a porta USB conectada
    let port;
    const ports = await navigator.serial.getPorts();
    if (ports.length > 0) {
      port = ports[0];
    } else {
      port = await navigator.serial.requestPort();
    }

    await port.open({ baudRate: 9600 });

    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();

    // 2. Monta o script EPL2 para 90x40mm (largura 720 dots x altura 320 dots)
    const ufTexto = String(uf || 'DF').toUpperCase();
    const lojaTexto = String(loja || 'DESTINO').toUpperCase().slice(0, 28);
    const romTexto = String(romaneio || 'S/N');
    const volTexto = `VOL: ${volumeAtual}/${totalVolumes}`;
    const dataHora = new Date().toLocaleDateString('pt-BR');

    const comandoEPL = [
      'N',                          // Limpa o buffer de imagem
      'q720',                       // Largura da etiqueta: 90mm (720 dots)
      'Q320,24',                    // Altura da etiqueta: 40mm (320 dots) + 24 dots de gap
      'D10',                        // Densidade de impressão (temperatura)
      'S2',                         // Velocidade de impressão
      `A30,20,0,5,1,1,N,"UF: ${ufTexto}"`,                     // UF em destaque
      `A420,25,0,3,1,1,N,"ROM: ${romTexto}"`,                  // Número do romaneio
      'LO20,75,680,4',                                         // Linha divisória horizontal
      `A30,95,0,4,1,1,N,"${lojaTexto}"`,                       // Nome da loja/destino
      'LO20,225,680,3',                                        // Linha inferior
      `A30,240,0,3,1,1,N,"${volTexto}"`,                       // Volume atual
      `A450,245,0,2,1,1,N,"${dataHora}"`,                      // Data
      'P1',                                                    // Imprime 1 cópia
      '\n'
    ].join('\n');

    // 3. Envia os bytes diretamente para a cabeça térmica da Elgin
    await writer.write(encoder.encode(comandoEPL));
    writer.releaseLock();
    await port.close();

    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao enviar comando para a Elgin:", error);
    return { sucesso: false, erro: error.message };
  }
}