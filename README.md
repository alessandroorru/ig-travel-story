# Travel Story Generator

`ig-travel-story` è una micro-app statica per comporre nel browser una travel story Cinema e scaricarla come PNG Instagram Story da **1080 × 1920 px**. Non richiede framework, dipendenze runtime o build.

## Uso locale

Dalla cartella del repository avvia un server statico:

```sh
python3 -m http.server 8000
```

Poi visita [http://localhost:8000](http://localhost:8000).

1. Scegli una fotografia dal dispositivo.
2. Modifica giorno, giorni totali, titolo e fino a tre osservazioni.
3. Trascina la foto nell'anteprima con mouse o dito. Con la tastiera, usa le frecce; tieni premuto Maiusc per uno spostamento più ampio.
4. Regola lo zoom in modo continuo oppure premi **Ricentra** per ripristinare posizione e zoom.
5. Premi **Scarica PNG** per ottenere la stessa composizione mostrata nell'anteprima, in formato 1080 × 1920.

Il download si attiva soltanto dopo il caricamento di una fotografia valida e quando il giorno non supera i giorni totali.

## Privacy

Foto e testi restano esclusivamente nella memoria del browser: l'app non li invia in rete, non li salva e non li ripristina. Non usa backend, account, cookie, analytics, `localStorage` o altre forme di persistenza. L'unica scrittura avviene quando l'utente avvia il download del PNG.

## Pubblicazione GitHub Pages

Il codice sorgente è disponibile su [GitHub](https://github.com/alessandroorru/ig-travel-story). La versione pubblicata è disponibile su [GitHub Pages](https://alessandroorru.github.io/ig-travel-story/).

## Test

La suite usa il test runner integrato di Node e non richiede installazione di pacchetti:

```sh
node --test tests/*.test.mjs
```
