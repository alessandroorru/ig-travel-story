# Travel Story themes — design

## Obiettivo

Creare un mockup HTML statico per confrontare tre temi riutilizzabili per una Story Instagram quotidiana. Ogni tema mostra gli stessi quattro contenuti variabili: numero del giorno, titolo, fotografia e 2–3 osservazioni.

## Output

Una sola pagina HTML responsive presenta tre composizioni nel rapporto esatto 9:16, affiancate quando c'è spazio e impilate sugli schermi stretti. Non sono previsti editor, persistenza, esportazione o framework in questa fase.

La fotografia sarà ricavata dall'immagine centrale dello screenshot fornito e salvata nel progetto come asset locale. Il resto dello screenshot non verrà usato come sfondo.

Per rendere il confronto immediato, tutti i temi useranno questi contenuti di esempio:

- Giorno: `01 / 28`
- Titolo: `Welcome to Beijing`
- Osservazioni: tre brevi appunti ripresi dal riferimento fornito

## Temi

### Taccuino

Una pagina editoriale contemporanea: fondo minerale chiaro, fotografia incorniciata, numero del giorno usato come elemento di orientamento, titolo autorevole e osservazioni trattate come appunti. La composizione deve apparire parte di una serie coerente.

### Cinema

La fotografia domina la Story. Titolo e numero del giorno formano una locandina essenziale; le osservazioni vivono in una fascia leggibile separata dalle zone più affollate dell'immagine.

### Archivio

Una scheda geografica da collezione: blu cartografico, griglia funzionale e fotografia presentata come reperto. Nessun dato aggiuntivo obbligatorio oltre ai quattro contenuti condivisi.

## Implementazione

Il mockup userà solo HTML e CSS, senza JavaScript, dipendenze o processo di build. I contenuti saranno duplicati nel markup per mantenere il prototipo immediato da modificare. Ogni Story avrà `aspect-ratio: 9 / 16` e scalerà senza alterare la composizione.

## Verifica

Un test Node basato esclusivamente su moduli standard controllerà la presenza dei tre temi, degli stessi contenuti e del rapporto 9:16. La verifica visiva sarà effettuata renderizzando la pagina a larghezza desktop e mobile.

## Fuori ambito

- Form per modificare i contenuti
- Generazione o download dell'immagine finale
- Salvataggio dei template
- Autenticazione o backend
- Ottimizzazione definitiva per la pubblicazione su Instagram
