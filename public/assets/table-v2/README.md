# Table assets

The current `card-back.webp` is a newly generated navy/ivory vintage engraving with paired spades and botanical guilloche framing (512×700). `felt-emerald.webp` is smooth, low-contrast emerald baize and `rail-leather.webp` is warm matte brown leather (both 768×768). The material atlas remains an archived asset; the live table uses the two new textures directly beneath its illumination layers. Original PNG masters for this pass are supplied as `masters/card-back-engraved.png`, `masters/felt-emerald.png` and `masters/rail-leather.png` in the downloadable source archive.

The original atlas and chip master were also produced with ImageGen. Chips 1, 25 and 100 were edited directly from the same 5 master and remain available in the asset library. The current interface uses only one small 5-master texture for the pot marker and transfer animations; it does not render denomination piles or repeated chip layers.

WebP files are the optimized runtime assets; the original PNG sources are kept in the downloadable workspace source archive. Cards remain native DOM elements, so rank text and action controls stay sharp and accessible.

Suit icons: [Bootstrap Icons](https://github.com/twbs/icons), MIT, see ICON-LICENSE.txt.
Card rank font: [Libre Baskerville](https://fonts.google.com/specimen/Libre+Baskerville), SIL OFL, see FONT-LICENSE.txt. The bundled subset contains only card ranks, numbers and punctuation.

## Approved court dealers

`court-j.webp`, `court-q.webp` and `court-k.webp` contain the user-approved J, revised Q and revised K portraits. Corresponding `court-*-blink.webp` files contain generated closed-eye frames. All are 768×768 WebP with transparency. The component uses localized eye masks over the approved portraits during a blink. Original PNG masters are retained in the source archive.

`court-yi.webp` and `court-yi-blink.webp` add Joker · Yi in the same flat anime/comic style. The navy/red two-point jester cap, pale forelock and harlequin costume distinguish Yi from the other three characters. Both runtime images are transparent 768×768 derivatives of generated 1254×1254 masters; the component reveals only the localized eye regions of the blink frame. Source-archive masters are `masters/court-yi.png` and `masters/court-yi-blink.png`.
