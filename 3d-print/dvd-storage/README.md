# Rangement jeux PS3 / PS4 / PS5 / DVD — compatible Rugged Drawer System 5x6

Version rehaussée du « 5x6 Double Height Drawer » (Rugged Desk Organization, MakerWorld),
dérivée directement des maillages d'origine : les faces d'empilage 5x6 (dessus / dessous)
sont **strictement identiques** → s'empile sur les frames/tiroirs existants.

## Méthode
La paroi en treillis des deux pièces est périodique verticalement (période **14,5 mm**).
Une bande complète du motif a été dupliquée **4x (+58 mm)** au milieu de la zone périodique :
aucune couture, motif continu, interfaces d'empilage et jeu tiroir/frame (1,7 mm) inchangés.

## Cotes
| Pièce  | Origine (mm)          | Version jeux (mm)     |
|--------|-----------------------|-----------------------|
| Frame  | 251,2 x 209,3 x 104,5 | 251,2 x 209,3 x 162,5 |
| Tiroir | 240,9 x 205,8 x 85,5  | 240,9 x 205,8 x 143,5 |

- Hauteur utile assemblée : **142,2 mm** → boîtes DVD/Blu-ray/PS (135,4 mm) debout,
  tranche vers le haut, ~6,8 mm de marge.
- Intérieur tiroir : 227,6 x 199,9 mm → ~**16 boîtes** par tiroir (14 mm/boîte),
  boîtes DVD 190 mm et PS 170 mm OK dans la profondeur.

## Impression (Bambu Lab P1P, plateau 256x256x256)
- **Frame** : debout comme le projet d'origine (axe de 209 mm vertical, dos au plateau).
  Empreinte 251,2 x 162,5 → **ne pas tourner à 45°** (la diagonale ne passe plus) ;
  poser la pièce alignée aux axes du plateau, sans bordure (brim) large.
- **Tiroir** : à plat, fond au plateau (empreinte 240,9 x 205,8, hauteur 143,5).
- Profils/filaments : mêmes réglages que le 3MF d'origine. Pas de supports.

## Variante étagère (sans tiroir) — `Etagere_Jeux-DVD_h220.5mm.stl`
Frame seule rehaussée de **8 périodes (+116 mm)** : 251,2 x 209,3 x **220,5 mm**,
intérieur 203,2 mm. Les boîtes se rangent **comme des livres, tranche face à soi**
(jeux PS 171,5 mm et DVD 190 mm OK). ~17 boîtes par niveau. Empilable (faces 5x6
identiques). ~1 042 cm³ (~1,3 kg PLA) contre ~2 kg pour frame + tiroir (−35 %).
Impression P1P : debout, dos au plateau (empreinte 251,2 x 220,5 — alignée aux axes,
pas de rotation 45°), hauteur 209,3, sans supports.

### Placement sur plateau P1P (étagère 220,5)
La P1P a une zone d'exclusion au coin avant-gauche (~18 x 28 mm). Centrée, la pièce
(251 x 220 sur plateau 256) mord dessus → erreur "zone d'exclusion". Fix : décaler la
pièce de +12 à 15 mm vers l'arrière (Y), garder centré en X. Brim désactivé (ou
intérieur seulement) et skirt à 0 : il ne reste que ~2 mm de marge latérale.
