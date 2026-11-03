# ImpaginaPrint — PRD
## Problema originale
"ho bisogno di un programma che mi permette di creare un pdf o un'immagine per stampare in formato A4, A3, 32x45cm, A5. Inserendo un'immagine e le dimensioni richieste nel formato richiesto" + fronte/retro con posizioni corrispondenti, crocini solo sul fronte.

## Architettura
- FastAPI `/api/generate` (Pillow + reportlab), senza DB/login
- React single page: controlli + anteprima SVG live (lib/layout.js = stesso algoritmo del backend)

## Implementato (2026-06)
- Formati A4/A3/32x45/A5, verticale/orizzontale, dimensioni in cm, copie (0=max), spaziatura, margini, riempi/adatta/deforma, blocco proporzioni, info DPI
- Fronte/retro: retro speculare (lato lungo) o capovolto (lato corto); crocini solo sul fronte
- Export PDF (2 pagine se fronte/retro), PNG/JPG 150/300/600 dpi (ZIP se fronte/retro)

## Iterazione 2 (2026-06)
- Più immagini per foglio, ognuna con copie e dimensione proprie (in fronte/retro: dimensione condivisa, retro dedicato per immagine)
- Impaginazione a righe con creazione automatica di più fogli, navigazione fogli in anteprima
- Rifila bordi (lato client, annullabile); pulsante "Foglio pieno"; crocini per singola immagine (solo fronte)

## Iterazione 3 (2026-06)
- Preset fototessera (CIE 35×45, Passaporto 35×45 e 35×40, Patente 35×45) per immagine e in fronte/retro, con popover "i" delle regole ICAO
- Formati rapidi: biglietto visita 85×55, cartolina 150×100, A6 148×105, invito 120×170, invito quadro 150×150, invito DL 210×99 (regole fototessera solo informative)

## Iterazione 4 (2026-06)
- Forma rotonda/ovale + contorno (solo fronte), croci di taglio interne, riempi/adatta/deforma per immagine, dimensioni sotto upload
- Biglietto bomboniera 9×2,5: immagine nella metà destra (fronte), testo auto-adattato nella metà destra (retro); font Edwardian/Snell/Alex Brush/Times (con alternative Google gratuite) + upload font utente; colore testo. Composizione lato client (canvas) inviata come PNG
- Formato foglio spostato nella prima scheda sotto il caricamento immagine
- Modelli salvati (IndexedDB nel browser: immagine, testi, stili, font personalizzati), testo fronte (accanto/sopra), grassetto/corsivo/allineamento
- Fix: testo retro sempre editor principale, testo fronte attivabile con interruttore; dimensioni diverse per immagine anche in fronte/retro
- Pulsante "Migliora immagine" (upscale fino a 3x, livelli auto, saturazione, nitidezza; annullabile); testo biglietti composto a 600 dpi e incorporato a 600 dpi nel PDF (hires)
- Editor immagine nel riquadro (ritaglio libero/come formato, luminosità/contrasto/saturazione, migliora, sfondo, rifila, originale) + "Fine" → mini anteprima foglio live nel riquadro; formato predefinito 10×15
- Formato predefinito immagini 9,5×13,5; esempio con 5 foto utente in /esempi/foto_9.5x13.5.pdf
- Editor solo opzionale (pulsante Modifica), foto caricata usata così com'è; pulsante "Salva" lavoro completo + sezione 5 "Lavori salvati" (IndexedDB v2 store works)
- Testi, forme (rettangolo/quadrato, ovale/cerchio) e colore sfondo per fronte e retro (lib/deco.js, DecoPanel), composti lato client a 600 dpi
- Colore linee di taglio (p.cut_color, anche contorni ovali), 4 colori rapidi + selettore
- Ordine scheda: caricamento → foglio → forma → misure → riempi/adatta/deforma → copie+foglio pieno → Formati rapidi (bomboniera + fototessera visibili, altri a scomparsa) → testi bomboniera → testi/forme/sfondo
- Editor visuale DecoStage: elementi spostabili col mouse/dito, angoli = ingrandimento proporzionale, lati = deformazione; slider rimossi; più testi/riquadri/cerchi con chip di selezione
- Rotazione elementi (maniglia + slider, snap 45°), angoli arrotondati riquadri, forma cuore
- Cancellazione elementi: X rossa sul selezionato, tasto Canc/Backspace, X sulle etichette, "Cancella tutto" per lato

## Backlog
- P1: abbondanza (bleed); limite dimensione upload
- P2: preset (biglietti da visita, cartoline), sovrapposizione registro fronte/retro
