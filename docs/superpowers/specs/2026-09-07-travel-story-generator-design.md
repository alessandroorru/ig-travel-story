# Travel Story Generator — design

## Obiettivo

Trasformare il mockup Cinema in una micro-app statica che permette di comporre e scaricare una Story Instagram 1080×1920. Tutto avviene nel browser: nessun dato viene inviato, salvato o ripristinato.

## Esperienza utente

La pagina presenta un pannello di controllo e un'anteprima 9:16. L'utente:

1. sceglie una fotografia dal dispositivo;
2. modifica giorno, totale giorni, titolo e fino a tre osservazioni;
3. trascina la fotografia nell'anteprima con mouse o dito;
4. regola lo zoom con uno slider o usa `Ricentra`;
5. scarica un PNG esatto 1080×1920.

Il pulsante di download resta disabilitato finché non è stata caricata una fotografia valida. Un file non immagine o non decodificabile produce un messaggio leggibile e non modifica l'ultima anteprima valida.

I campi hanno questo contratto:

- giorno: numero intero da 1 a 999, valore iniziale `1`;
- totale giorni: numero intero da 1 a 999, valore iniziale `28`;
- il giorno non può superare il totale; in caso contrario il form mostra un errore e disabilita il download;
- titolo: testo iniziale `Welcome to Kuala Lumpur`, massimo 42 caratteri;
- osservazioni: tre campi opzionali, massimo 90 caratteri ciascuno.

Giorno e totale sono mostrati con almeno due cifre (`01 / 28`) e senza troncare valori a tre cifre.

## Composizione visiva

L'output mantiene il tema Cinema approvato:

- fotografia full-frame con crop `cover`;
- numero del giorno e titolo nella parte alta;
- massimo tre osservazioni grandi nella parte bassa;
- fade scuro superiore per proteggere titolo e giorno;
- fade scuro inferiore, progressivo e senza banda piena, per proteggere le note;
- bianco come colore principale e rosso come segnale grafico.

I testi vuoti non vengono disegnati. Il titolo occupa al massimo tre righe e ogni osservazione al massimo due. Le newline inserite dall'utente forzano una nuova riga; il wrapping avviene sugli spazi e spezza per code point Unicode una parola singola più larga del margine. L'ultima riga disponibile termina con ellissi quando il contenuto eccede il limite.

## Architettura

L'app non usa framework, dipendenze runtime o processo di build:

- `index.html`: form accessibile, canvas e pulsanti;
- `styles.css`: interfaccia responsive, senza replicare la composizione esportata in DOM;
- `story-renderer.mjs`: rendering Canvas e funzioni pure per crop e wrapping del testo;
- `app.mjs`: stato effimero, eventi del form, caricamento immagine, gesture pointer, zoom, ricentratura e download;
- `tests/renderer.test.mjs`: test Node dependency-free per calcoli di crop, drag, zoom e wrapping;
- `tests/app-structure.test.mjs`: contratto statico dei controlli, canvas e assenza di persistenza;
- `README.md`: uso locale, privacy, test e pubblicazione;
- `.nojekyll`: pubblicazione statica diretta da GitHub Pages.

Il canvas ha sempre risoluzione interna 1080×1920 e viene scalato solo tramite CSS. Lo stesso canvas visibile genera il PNG con `toBlob`, evitando differenze tra anteprima ed esportazione.

## Stato e interazioni

Lo stato vive soltanto in memoria e contiene testi, immagine decodificata, zoom e offset in pixel Canvas. Non vengono usati `localStorage`, `sessionStorage`, cookie o richieste di rete.

Il trascinamento usa Pointer Events e pointer capture, quindi condivide lo stesso codice per mouse, penna e touch. Il canvas è focalizzabile e i tasti freccia spostano la foto di 12 px Canvas; con Shift lo spostamento è di 48 px. Lo slider zoom usa intervallo `1`–`3`, step `0.01`, dove `1` indica il minimo crop `cover`; l'anteprima viene ridisegnata a ogni evento `input`, così lo zoom è continuo e non usa livelli predefiniti. `Ricentra` ripristina offset a `0, 0` e zoom a `1`.

Per un'immagine `w × h`, il fattore base è `max(1080 / w, 1920 / h)` e il fattore effettivo è `base × zoom`. I limiti sono `maxX = max(0, (w × fattore - 1080) / 2)` e `maxY = max(0, (h × fattore - 1920) / 2)`; ogni offset viene limitato rispettivamente a `[-maxX, maxX]` e `[-maxY, maxY]`. Le immagini piccole vengono ingrandite con la stessa formula e non espongono aree vuote.

Ogni controllo ha una `<label>` visibile. Il canvas usa `role="img"`, un nome accessibile e istruzioni per drag e tastiera. Errori e conferme di download sono annunciati da una regione `aria-live`. Il focus da tastiera resta visibile.

Tutti gli asset e font sono locali. Una Content Security Policy blocca connessioni di rete e consente immagini soltanto da `self`, `blob:` e `data:`. L'unica scrittura intenzionale è il PNG avviato dall'utente. Se `canvas.toBlob()` restituisce `null`, genera un errore o il download non può partire, la regione di stato comunica `Impossibile creare il PNG. Riprova con un'altra immagine.` e l'app resta utilizzabile.

## Verifica

- TDD con il test runner integrato di Node per logica di crop, limiti e struttura dell'app.
- Verifica headless con Google Chrome e Playwright già disponibili nell'ambiente: caricamento di una fotografia locale, modifica dei campi, trascinamento, zoom, download e controllo dimensioni PNG 1080×1920.
- Screenshot desktop e mobile per controllare responsive, leggibilità e assenza di clipping.

## Pubblicazione

Il progetto diventa un repository Git locale con branch `main`. L'owner viene risolto con `gh api user --jq .login`; quindi il repository pubblico viene creato con `gh repo create <owner>/ig-travel-story --public --source=. --remote=origin --push`. GitHub Pages viene abilitato dalla root di `main` tramite `gh api` e verificato rileggendo lo stato Pages. L'URL atteso è `https://<owner>.github.io/ig-travel-story/` e deve rispondere correttamente prima della consegna.

Le tre fotografie personali presenti nel mockup vengono usate soltanto nei test browser locali e rimosse dal progetto prima del primo commit. Il repository non contiene fotografie personali. Anche i file caricati in uso restano esclusivamente nel browser dell'utente.

## Fuori ambito

- Account e autenticazione
- Persistenza locale o remota
- Backend e API
- Raccolta analytics
- Template aggiuntivi
- Editing fotografico oltre a posizione e zoom
- Pubblicazione automatica su Instagram
