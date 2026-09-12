# Support modulaire empilable pour consoles — PS5 Pro + PS3

Une étagère qui **enjambe** la PS5 Pro sans jamais la toucher et porte la PS3
au-dessus. **Empilable** : un deuxième module se pose sur le premier pour
ajouter un étage, autant de fois que nécessaire.

Conçu pour une **Bambu Lab P1P** (plateau 256 × 256 mm). Aucune pièce ne
nécessite de support d'impression.

![Assemblage](apercu-assemblage.png)

## Principe

Deux **portiques** en U inversé se dressent aux extrémités gauche et droite de
la PS5. Ils sont orientés dans la *profondeur* de la console (216 mm) et non
dans sa largeur (388 mm) : c'est ce qui permet à chaque portique de s'imprimer
**d'une seule pièce**. Aucun joint ne se trouve dans le chemin de charge
vertical — le poids descend en compression pure jusqu'au bureau.

Deux **longerons** relient les portiques et portent la console du dessus. Ils
sont trop longs pour le plateau, donc coupés en deux ; le recouvrement partage
la *largeur* et non la hauteur, si bien que la section garde son moment
quadratique intact au droit du joint.

## Pièces à imprimer

| Fichier | Quantité | Dimensions | Pose sur le plateau |
|---|---|---|---|
| `portique.stl` | **2 par niveau** | 190 × 240 × 20 mm | à plat |
| `longeron.stl` | **4 par niveau** | 267 × 46 × 18 mm | **en diagonale** (enveloppe 221 mm) |
| `pied.stl` | **4 au total** (base uniquement) | 40 × 90 × 16 mm | à plat |

Les 4 longerons sont la même pièce : deux d'entre eux sont simplement tournés
de 180° au montage, leurs recouvrements s'emboîtent.

Les pieds ne sont à imprimer qu'une fois — les modules supérieurs se plantent
directement dans les mortaises du module du dessous.

![Pièces](apercu-pieces.png)

## Matière et réglages

**PETG obligatoire**, pas de PLA. La pièce vit au-dessus d'une console qui
rejette de l'air chaud, et le PLA ramollit vers 55-60 °C. L'ASA convient aussi.

| Réglage | Valeur |
|---|---|
| Couche | 0,20 mm (buse 0,4) ou 0,28 mm (buse 0,6) |
| Parois | 4 |
| Remplissage | 20 %, gyroïde |
| Supports | **aucun** — toutes les pièces sont prismatiques |
| Adhérence | bâton de colle obligatoire : le PETG soude au PEI texturé sur de grandes empreintes |

**Filament et temps** : environ **520 g et 30-35 h par niveau** en buse 0,4
(≈ 20-24 h en buse 0,6), plus **110 g** pour le jeu de 4 pieds. C'est un gros
chantier — prévois une bobine par niveau.

## Quincaillerie

- **4 × vis M4 × 25 + écrous + rondelles par niveau** — elles serrent les deux
  recouvrements de longeron à mi-portée (2 vis par longeron).
- Facultatif mais recommandé : une sangle ou 4 vis à bois passant par les trous
  Ø 5,5 des pieds, pour ancrer l'ensemble au meuble (voir Sécurité).
- Quelques patins feutre ou silicone autocollants sous les pieds et sur le
  dessus des longerons (antidérapant sous la console).

## Montage

Les trois planches `montage-1`, `montage-2` et `montage-3` détaillent tout
visuellement. Les coupes sont extraites directement des maillages : ce qui est
dessiné est exactement ce qui sortira de l'imprimante.

### Séquence

![Séquence de montage](montage-2-sequence.png)

1. Poser les 4 **pieds** aux quatre coins, mortaise vers le haut, la partie
   longue déportée **vers l'extérieur**.
2. Planter chaque **portique** par ses deux tenons du bas dans les mortaises
   des pieds.
3. Assembler chaque **longeron** : emboîter deux moitiés par leur recouvrement,
   serrer les 2 vis M4 (voir planche 3).
4. Descendre les deux longerons dans les encoches du dessus des traverses. Les
   becs en bout de longeron viennent coiffer les faces extérieures des
   portiques : l'ensemble est alors bloqué dans tous les sens.
5. Poser la PS3 sur les longerons.

### Ajouter un niveau

![Mécanisme d'empilage](montage-1-empilage.png)

Le dessus de chaque traverse porte **deux mortaises de 24,6 × 12 mm**, situées
juste au-dessus des montants. Le portique du niveau suivant a **deux tenons de
24 × 20 × 12 mm** sous ses montants : ils tombent dans ces mortaises. La charge
descend donc en ligne droite, tenon dans mortaise, montant après montant,
jusqu'au bureau — il n'y a jamais de flexion dans le chemin de charge.

Il n'y a rien de plus à faire : on plante le portique, on repose deux longerons
dessus, et le nouvel étage est prêt. Le pas est de 178 mm et chaque étage offre
136 mm de hauteur libre sous la traverse suivante.

Le jeu d'emboîtement est de 0,3 mm par face. Si les tenons forcent, un coup de
lime suffit ; s'ils sont trop libres, baisse `FIT` dans le script et réimprime.

### Assembler un longeron

![Assemblage des longerons](montage-3-longerons.png)

Un longeron complet fait 534 mm, donc trop long pour le plateau : il est fait de
**deux moitiés identiques**, l'une simplement tournée de 180°. Leurs languettes
se recouvrent sur 30 mm au milieu de la portée, et **2 vis M4 × 25** traversent
le recouvrement.

Le recouvrement partage la *largeur* de la pièce et non sa *hauteur* : la
hauteur de section reste entière au droit du joint, qui est donc aussi rigide
que le reste du longeron, malgré sa position à mi-portée.

## Cotes de l'ouvrage

| | |
|---|---|
| Empreinte au sol | 508 × 326 mm |
| Pas d'empilage | 178 mm par niveau |
| Plan de pose de la console, niveau 1 | 206 mm |
| Hauteur libre pour la console de chaque étage | 136 mm |
| Air libre au-dessus de la PS5 | 49 mm |
| Jeu latéral de part et d'autre de la PS5 | 30 mm |

La PS5 reste **entièrement dégagée à l'arrière** (là où se trouve sa grande
grille d'échappement) et sur toute sa face avant : rien ne passe devant les
ports, le bouton d'alimentation ni la fente du lecteur. Elle s'extrait en la
faisant glisser vers l'avant, sans rien démonter.

## Sécurité — à lire

**Vérifie tes cotes avant d'imprimer.** Le modèle part de : PS5 Pro à plat
388 × 216 mm d'empreinte et 105 mm de haut avec le lecteur, plus ~5 mm de pieds.
Mesure la tienne au mètre ; si l'écart dépasse quelques millimètres, change les
constantes en tête de `generate_support.py` et relance.

**Basculement.** Une pile de deux niveaux chargée bascule à environ 27° d'angle,
ce qui est le domaine du mobilier stable — mais une console qui tombe atterrit
sur la PS5 Pro. Dès le deuxième niveau, **ancre l'ensemble** : une sangle par
les trous des pieds arrière, ou deux vis dans le meuble. Ça coûte deux minutes.

**Ventilation.** Ne pose jamais l'ensemble dans un meuble fermé et garde 10 cm
entre l'arrière de la PS5 et le mur, comme le demande Sony. Les flancs et
l'arrière de la structure sont volontairement ouverts : l'air chaud monte et
s'échappe librement sur les côtés, il n'est pas renvoyé vers la console du
dessus.

## Adapter le modèle

Toutes les cotes sont des constantes nommées en tête de `generate_support.py`.
Les plus utiles :

| Constante | Rôle |
|---|---|
| `PS5_W`, `PS5_D`, `PS5_H` | encombrement de la console du bas |
| `GAP_SIDE`, `GAP_TOP` | dégagements imposés autour d'elle |
| `LEG_H` | hauteur des montants — c'est elle qui fixe le pas d'empilage |
| `RAIL_Y` | écartement des longerons, à adapter à la profondeur de la console posée |
| `FIT` | jeu d'emboîtement (0,30 mm par face) si les tenons sont trop durs ou trop libres |

```bash
pip install numpy trimesh manifold3d
python3 generate_support.py
```

Le script vérifie automatiquement que chaque pièce est étanche et tient sur le
plateau, et `build_assembly()` permet de remonter l'ouvrage virtuellement pour
contrôler qu'aucune pièce n'en touche une autre.
