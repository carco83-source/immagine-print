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

## Backlog
- P1: immagini diverse sulla stessa pagina; abbondanza (bleed); limite dimensione upload
- P2: preset (biglietti da visita, cartoline), sovrapposizione registro fronte/retro
