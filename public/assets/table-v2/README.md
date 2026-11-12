# Table assets

The emerald felt / charcoal leather / neutral paper atlas, navy card back and chip master were produced with ImageGen for this interface. Chips 1, 25 and 100 were edited directly from the same 5 master and remain available in the asset library. The current interface uses only one small 5-master texture for the pot marker and transfer animations; it does not render denomination piles or repeated chip layers.

WebP files are the optimized runtime assets; the original PNG sources are kept in the downloadable workspace source archive. Cards remain native DOM elements, so rank text and action controls stay sharp and accessible.

Suit icons: [Bootstrap Icons](https://github.com/twbs/icons), MIT, see ICON-LICENSE.txt.
Card rank font: [Libre Baskerville](https://fonts.google.com/specimen/Libre+Baskerville), SIL OFL, see FONT-LICENSE.txt. The bundled subset contains only card ranks, numbers and punctuation.

## Approved court dealers

`court-j.webp`, `court-q.webp` and `court-k.webp` contain the user-approved J, revised Q and revised K portraits. Corresponding `court-*-blink.webp` files contain generated closed-eye frames. All are 768×768 WebP with transparency. The component uses localized eye masks over the approved portraits during a blink. Original PNG masters are retained in the source archive.
