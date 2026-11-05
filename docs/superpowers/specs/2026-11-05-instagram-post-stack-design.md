# Instagram post stack — design

## Intento

Estendere il generatore da sole composizioni Story a template Instagram con formati differenti, mantenendo un'unica galleria visuale. Il nuovo template, **Stack fotografico**, produce un post verticale composto da due fotografie sovrapposte in due riquadri uguali, con cornice e separatore bianchi.

L'immagine `SCRL_0015.JPG` è soltanto un riferimento di proporzioni. Non viene inclusa nel progetto né usata come contenuto predefinito.

## Obiettivi

- Aggiungere un post verticale Instagram nativo in rapporto 3:4, esportato a **1080 × 1440 px**.
- Presentare Story e Post nella stessa galleria di template, indicando chiaramente `Story` o `Post` su ogni scheda.
- Conservare invariati i due template esistenti e i relativi export 1080 × 1920.
- Gestire due fotografie con caricamento, crop, zoom, offset e ricentramento indipendenti.
- Mantenere tutto locale nel browser, senza persistenza, backend o dipendenze runtime.

## Non obiettivi

- Separatore trascinabile o proporzioni diverse dal 50/50.
- Rotazione, sovrapposizione o ombre sulle fotografie.
- Testi, didascalie o watermark nel nuovo template.
- Caroselli multipagina.
- Modifica dello stile dei template esistenti.

## Approcci considerati

### Galleria unica di template — scelto

`Stack fotografico` compare accanto a `Fotogramma` e `Cartolina corsiva`. Ogni scheda mostra soltanto un piccolo badge in basso a destra con un'icona del formato e la didascalia `Story` oppure `Post`.

È l'approccio scelto perché mantiene una sola decisione visiva e tratta il formato come proprietà del template. Evita un passaggio Story/Post che, con un solo template Post, sarebbe ridondante.

### Selettore formato seguito dai template

Prima si sceglierebbe Story o Post e poi il template. È più scalabile con molti template, ma oggi aggiunge una gerarchia e un'interazione senza beneficio sufficiente.

### Editor Post separato

Una pagina dedicata isolerebbe completamente il nuovo flusso, ma duplicherebbe upload, gesture, export, privacy e layout responsive.

## Misure della composizione

Il riferimento originale misura 2160 × 2880 px e usa 15 px di bordo esterno e 20 px di separatore. Per il nuovo template il requisito è deliberatamente uniformato a **8 px ovunque**.

Sul canvas 1080 × 1440:

- sfondo bianco pieno;
- bordo sinistro, destro, superiore e inferiore: 8 px;
- separatore centrale: 8 px;
- larghezza utile di ogni foto: 1064 px;
- altezza utile di ogni foto: 708 px;
- foto superiore: `x=8`, `y=8`, `width=1064`, `height=708`;
- foto inferiore: `x=8`, `y=724`, `width=1064`, `height=708`.

Il separatore occupa quindi l'intervallo verticale tra le due aree fotografiche e rimane sempre esattamente a metà.

## Interfaccia

### Copie generiche

- Il titolo dell'editor diventa **Instagram Template Generator**.
- L'eyebrow diventa **Template studio**.
- Le copie generiche non usano più “Story” quando descrivono l'intera applicazione.
- “Story” resta nelle etichette di formato dei template 9:16 e nei riferimenti realmente specifici a Instagram Story.

### Galleria template

La galleria contiene tre radio visuali accessibili:

1. `Fotogramma` — badge `Story`
2. `Cartolina corsiva` — badge `Story`
3. `Stack fotografico` — badge `Post`

Il badge è discreto, usa una piccola icona rettangolare coerente con il rapporto del formato e vive in basso a destra nella singola scheda. Rapporto e risoluzione completi restano nell'intestazione dell'anteprima principale, non nel badge. La miniatura di Stack fotografico riproduce due pannelli 50/50 con bordo e separatore bianchi. Lo stato selezionato conserva bordo rosso, segno di spunta e focus visibile già usati dagli altri template. Su mobile le schede rimangono scorrevoli orizzontalmente.

### Controlli Post

Quando Stack fotografico è attivo:

- i campi giorno, titolo, osservazioni e testo centrale sono nascosti;
- l'upload singolo usato dai template Story è nascosto;
- compaiono due upload distinti: **Foto superiore** e **Foto inferiore**;
- l'anteprima indica quale riquadro è attivo con un contorno rosso esclusivamente UI, mai incluso nel PNG;
- clic o tocco su un riquadro lo rende attivo;
- lo slider Zoom, il valore numerico, Ricentra e i tasti freccia agiscono sulla foto attiva;
- il testo di aiuto identifica la foto attiva;
- su mobile una gesture a due dita agisce sul riquadro nel quale è iniziata; un dito continua a scorrere la pagina.

Il cambio template e il cambio riquadro non azzerano alcuna foto o inquadratura. Tutto resta soltanto nella memoria della pagina.

Lo slot superiore è attivo inizialmente. Caricare una fotografia rende attivo il relativo slot. Clic, tap o gesture iniziati sul bordo esterno o sul separatore non cambiano slot; una pinch con le due dita in riquadri differenti viene ignorata.

## Stato e rendering

Ogni template dichiara metadati minimi: identificatore, etichetta, tipo di formato, larghezza, altezza e numero di fotografie richieste. Il canvas aggiorna gli attributi `width` e `height`, il rapporto CSS, la descrizione accessibile e l'intestazione dell'anteprima quando cambia template.

I template Story continuano a usare l'immagine e l'inquadratura esistenti. Stack fotografico introduce due slot indipendenti, ciascuno con:

- `image` e `imageUrl`;
- `zoom` tra 1× e 3×;
- `offsetX` e `offsetY`;
- stato e token di caricamento indipendenti, così due decodifiche concorrenti non possono invalidarsi a vicenda.

Il calcolo cover viene generalizzato per ricevere larghezza e altezza del riquadro, conservando le dimensioni Story come default compatibile. Coordinate pointer e touch usano sempre le dimensioni correnti del canvas e non valori 1080 × 1920 hardcoded. Il renderer Post:

1. pulisce il canvas e lo riempie di bianco;
2. calcola e disegna ogni fotografia con clipping al proprio riquadro;
3. lascia il bianco sottostante visibile come bordo e separatore;
4. ripristina sempre clipping e stato canvas.

La cornice di selezione e l'overlay Instagram Story rimangono elementi DOM sopra il canvas. L'overlay Story è nascosto in modalità Post; nessuno dei due entra nell'export.

Cambiare `canvas.width` o `canvas.height` azzera il context: ogni switch di template deve quindi aggiornare le dimensioni prima del redraw e ripristinare esplicitamente tutto lo stato grafico necessario.

## Validazione ed export

- Stack fotografico è esportabile soltanto quando entrambe le fotografie sono valide.
- Un errore o un caricamento incompleto in uno slot non sostituisce l'altro.
- Il filename è `instagram-post-stack.png`.
- Web Share su iOS e fallback download restano invariati.
- Il file Post è sempre 1080 × 1440; i template Story restano 1080 × 1920.

## Accessibilità e responsive

- Le schede restano radio con label completa e descrizione del formato.
- I gruppi nascosti usano `hidden` e non rimangono nel tab order.
- Il riquadro attivo è annunciato anche testualmente, non soltanto tramite colore.
- Il canvas mantiene tastiera e gesture già disponibili.
- La modifica dinamica del rapporto non deve causare overflow orizzontale né impedire lo scroll a un dito su mobile.

## Verifica

Test automatici Node devono coprire:

- terza scheda accessibile e badge Story/Post corretti;
- aggiornamento dinamico canvas 1080×1920 ↔ 1080×1440;
- switch ripetuti che ridimensionano il canvas senza perdere il redraw né contaminare lo stato del context;
- visibilità dei controlli corretti per ogni template;
- persistenza in memoria dei due slot e dei template Story durante gli switch;
- validazione che richiede entrambe le foto Post;
- crop, zoom, offset e ricentramento indipendenti;
- targeting corretto di drag, tastiera e pinch per riquadro;
- geometria esatta: bordo 8 px, separatore 8 px, riquadri 1064 × 708;
- clipping e assenza di contaminazione tra i due riquadri;
- overlay UI esclusi dall'export;
- filename e risoluzione PNG corretti;
- assenza di regressioni nei template Story e nella condivisione iOS.

La verifica manuale include desktop e viewport mobile, caricamento di due foto diverse, switch ripetuti tra tutti i template, gesture indipendenti e controllo visivo del PNG esportato.

## Vincoli

- HTML, CSS e moduli JavaScript esistenti, senza framework o nuove dipendenze runtime.
- Nessun dato persistente e nessuna richiesta di rete dall'app.
- Il riferimento fotografico dell'utente non viene copiato nel repository.
