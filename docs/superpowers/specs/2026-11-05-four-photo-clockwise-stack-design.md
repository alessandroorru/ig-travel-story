# Stack fotografico ×4 — design

## Intento

Aggiungere un quarto template alla galleria per creare un Post Instagram verticale 3:4 composto da quattro fotografie. Il risultato deve mantenere l'estetica minimale del template `Stack fotografico`: fondo bianco, bordo esterno e separatori uniformi da 8 px, senza testo sovrapposto.

## Approcci considerati

1. **Nuovo template separato con logica degli slot condivisa — scelto.** Mantiene immediata la selezione visuale e lascia invariato il template a due foto. La gestione comune di upload, selezione, crop e gesti viene generalizzata solo quanto necessario per supportare 2 e 4 slot.
2. **Un solo template con scelta 2/4 foto — scartato.** Riduce il numero di card ma aggiunge un controllo, rende meno chiara l'anteprima della galleria e aumenta gli stati dell'interfaccia.

## Formato e geometria

- Output: Post Instagram verticale 1080 × 1440 px.
- Bordo esterno: 8 px bianchi su tutti i lati.
- Separatore verticale centrale: 8 px.
- Separatore orizzontale centrale: 8 px.
- Quattro frame uguali da 528 × 708 px:
  - foto 1, alto-sinistra: `x=8, y=8`;
  - foto 2, alto-destra: `x=544, y=8`;
  - foto 3, basso-destra: `x=544, y=724`;
  - foto 4, basso-sinistra: `x=8, y=724`.
- L'ordine di caricamento e delle etichette segue il senso orario partendo dall'alto a sinistra: 1 → 2 → 3 → 4.

## Interazione

- La card della galleria si chiama `Stack fotografico ×4` e mostra il badge `Post`.
- Il template espone quattro upload chiaramente numerati e quattro pulsanti accessibili per scegliere la foto da modificare.
- Ogni foto conserva in modo indipendente immagine, zoom, offset e ricentratura.
- Mouse, tastiera e gesti a due dita modificano soltanto il frame selezionato o quello in cui il gesto è iniziato.
- Lo scroll a un dito resta nativo sull'intera pagina.
- Bordo e separatori non selezionano alcun frame.
- Tutte e quattro le fotografie sono necessarie per abilitare l'export.

## Rendering ed export

- Ogni immagine usa il crop `cover`, resta confinata nel proprio frame e non può invadere gli 8 px bianchi.
- La guida del frame attivo rimane solo nell'anteprima DOM e non entra nel PNG.
- Il file esportato si chiama `instagram-post-stack-4.png`.
- Si conserva la politica colore esistente: richiesta Display-P3/float16 quando supportata, reporting della modalità effettiva e fallback sRGB. Non si promette la conservazione completa di HDR o gain map.

## Compatibilità e non-obiettivi

- I tre template esistenti, inclusi geometria e comportamento del Post a due foto, non devono cambiare.
- Nessuna persistenza, backend o dipendenza aggiuntiva.
- Nessuna scelta dinamica del numero di foto dentro il singolo template.
- Nessun testo o didascalia nel PNG.

## Verifica

- Test automatici per catalogo, markup accessibile, geometria esatta, hit testing, rendering e indipendenza dei quattro crop.
- Test dell'app per upload asincroni, validazione, selezione tramite mouse/tastiera/touch, cambio template ed export 1080 × 1440.
- Controllo browser desktop e mobile, incluso il PNG senza contaminazioni nella croce bianca.
