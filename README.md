# Travel Story Generator

`ig-travel-story` è una micro-app statica per comporre nel browser una travel story e scaricarla come PNG Instagram Story da **1080 × 1920 px**. Non richiede framework, dipendenze runtime o build.

## Uso locale

Dalla cartella del repository avvia un server statico:

```sh
python3 -m http.server 8000
```

Poi visita [http://localhost:8000](http://localhost:8000).

1. Scegli una fotografia dal dispositivo.
2. Scegli tra **Fotogramma** (Cinema) e **Cartolina corsiva**. Il primo usa giorno, giorni totali, titolo e fino a tre osservazioni; il secondo usa solo il testo centrale, fino a cinque righe.
3. Su desktop, trascina la foto con mouse o penna, usa le frecce (Maiusc per passi più ampi) e regola lo zoom con lo slider continuo.
4. Su mobile, un dito continua a far scorrere la pagina; usa due dita per spostare e ingrandire/ridurre la foto, tra 1× e 3×. **Ricentra** ripristina sempre posizione e zoom.
5. Su mobile compatibile, premi **Salva o condividi PNG** e nel foglio nativo scegli **Salva immagine**. Se la condivisione file non è disponibile, premi **Scarica PNG**: ottieni comunque la stessa composizione mostrata nell'anteprima, in formato 1080 × 1920.

Il download si attiva soltanto dopo il caricamento di una fotografia valida. Nel template Fotogramma il giorno non può superare i giorni totali; Cartolina corsiva non dipende da questo valore. I valori dei due template restano disponibili finché la pagina è aperta.

## Privacy

Foto e testi restano esclusivamente nella memoria del browser: l'app non li invia autonomamente in rete, non li salva e non li ripristina. La foto viene condivisa solo se scegli esplicitamente un destinatario nel foglio nativo. Non usa backend, account, cookie, analytics, `localStorage` o altre forme di persistenza.

## Pubblicazione GitHub Pages

Il codice sorgente è disponibile su [GitHub](https://github.com/alessandroorru/ig-travel-story). La versione pubblicata è disponibile su [GitHub Pages](https://alessandroorru.github.io/ig-travel-story/).

## Test

La suite usa il test runner integrato di Node e non richiede installazione di pacchetti:

```sh
node --test tests/*.test.mjs
```
