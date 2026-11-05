# Instagram Template Generator

`ig-travel-story` è una micro-app statica per comporre nel browser immagini Instagram e scaricarle in PNG. Offre due template Story da **1080 × 1920 px** e il template Post **Stack fotografico** da **1080 × 1440 px** (3:4). Non richiede framework, dipendenze runtime o build.

## Uso locale

Dalla cartella del repository avvia un server statico:

```sh
python3 -m http.server 8000
```

Poi visita [http://localhost:8000](http://localhost:8000).

1. Scegli un template dalla galleria: **Fotogramma** (Cinema) e **Cartolina corsiva** hanno badge Story; **Stack fotografico** ha badge Post.
2. Carica una fotografia per i template Story oppure le due immagini richieste da Stack fotografico: **Foto superiore** e **Foto inferiore**. Fotogramma usa giorno, giorni totali, titolo e fino a tre osservazioni; Cartolina corsiva usa solo il testo centrale, fino a cinque righe. Stack fotografico contiene soltanto le due foto.
3. Su desktop, trascina la foto con mouse o penna, usa le frecce (Maiusc per passi più ampi) e regola lo zoom con lo slider continuo.
4. Su mobile, un dito continua a far scorrere la pagina; usa due dita per spostare e ingrandire/ridurre la foto, tra 1× e 3×. **Ricentra** ripristina posizione e zoom.
5. Su mobile compatibile, premi **Salva o condividi PNG** e nel foglio nativo scegli **Salva immagine**. Se la condivisione file non è disponibile, premi **Scarica PNG**. La risoluzione segue il template: 1080 × 1920 per Story, 1080 × 1440 per Post.

### Inquadrature di Stack fotografico

Il Post dispone due foto in riquadri uguali da 1064 × 708 px, con bordo bianco esterno e separatore centrale uniformi di **8 px**. Richiede entrambe le foto per attivare l'esportazione e salva il file come `instagram-post-stack.png`.

Clicca o tocca il riquadro da modificare: il contorno rosso dell'anteprima e il testo di aiuto indicano la foto attiva. Anche caricare una foto ne attiva il riquadro. Lo slider, il valore dello zoom, le frecce e **Ricentra** si riferiscono sempre alla foto attiva; ciascuna foto conserva la propria inquadratura indipendente. Il contorno rosso serve soltanto nell'interfaccia e non compare nel PNG.

Il trascinamento desktop continua a modificare il riquadro nel quale è iniziato, anche se il puntatore attraversa il separatore. Su mobile, entrambe le dita devono iniziare nello stesso riquadro: la gesture ne regola posizione e zoom rispetto al centro di quella foto. Due dita in riquadri diversi e gesti iniziati sul bordo o sul separatore vengono ignorati. Un dito seleziona il riquadro senza bloccare lo scorrimento della pagina.

Il cambio di template o riquadro conserva foto e inquadrature finché la pagina resta aperta. Nei template Story il download richiede una fotografia valida; nel template Fotogramma il giorno non può superare i giorni totali. I campi Story nascosti non bloccano l'esportazione Post.

### Colore e limiti dell'esportazione

L'app richiede Display-P3 con precisione float16 come tentativo best effort, secondo il supporto effettivo del browser. Il testo di aiuto riporta la modalità del context quando il browser la espone. Se le opzioni colore estese vengono rifiutate, l'app usa il context standard con fallback sRGB; quando la modalità effettiva non è verificabile, lo dichiara. Anteprima ed esportazione restano disponibili.

L'esportazione PNG composta tramite Canvas **non garantisce la conservazione dei metadati HDR o delle gain map** delle foto originali. Display-P3 indica la gamma colore richiesta o rilevata e non costituisce una garanzia di conservazione HDR.

## Privacy

Foto e testi restano esclusivamente nella memoria del browser: l'app non li invia autonomamente in rete, non li salva e non li ripristina. La foto viene condivisa solo se scegli esplicitamente un destinatario nel foglio nativo. Non usa backend, account, cookie, analytics, `localStorage` o altre forme di persistenza.

## Pubblicazione GitHub Pages

Il codice sorgente è disponibile su [GitHub](https://github.com/alessandroorru/ig-travel-story). La versione pubblicata è disponibile su [GitHub Pages](https://alessandroorru.github.io/ig-travel-story/).

## Test

La suite usa il test runner integrato di Node e non richiede installazione di pacchetti:

```sh
node --test tests/*.test.mjs
```
