# Clapet de bonde de lavabo/baignoire — impression 3D (Bambu Lab P1P)

Reproduction en 4 pièces du clapet de bonde réglable (disque + dôme, tige
cannelée, tige filetée avec tête fendue, molette de blocage, joint).

## Fichiers

| Fichier | Pièce | Matière conseillée |
|---|---|---|
| `bonde-monobloc.stl` | **Tout-en-un** : corps + tige filetée + tête, une seule pièce (pour qui garde la molette et le joint d'origine) | PETG (résiste à l'eau chaude) |
| `corps-bonde.stl` | Disque Ø72 + dôme + tige cannelée (taraudage interne) | PETG |
| `tige-filetee.stl` | Tige filetée Ø8 + tête fendue | PETG |
| `molette.stl` | Écrou moleté de réglage Ø15 | PETG |
| `joint-tpu.stl` | Joint annulaire | **TPU 95A** |

Le PLA fonctionne pour tester, mais pour un usage réel dans l'eau chaude,
préférer le PETG (ou l'ASA).

## Réglages Bambu Studio

- **Monobloc** : à plat, disque contre le plateau, aucune orientation à changer.
  0,16 mm (ou 0,12 pour un filetage plus propre), 3 parois, 15 % de
  remplissage. Pas de supports nécessaires. Attention : la molette d'origine
  (métal) a un filetage métrique fin qui ne correspondra pas au filetage
  imprimé Ø8 × pas 2 — voir note sous le tableau.
- **Corps** : à plat, disque contre le plateau. 0,16 mm, 3 parois, 15 % de
  remplissage. Pas de supports nécessaires.
- **Tige filetée** : verticale, pointe en bas, avec un **brim** de 5 mm.
  0,12 mm pour un filetage propre.
- **Molette** : à plat, 0,16 mm, sans supports.
- **Joint** : TPU, 0,2 mm, 100 % de remplissage, vitesse ≤ 30 mm/s.

## Assemblage

1. Poser le joint TPU dans la gorge autour du dôme.
2. Visser la molette sur la tige filetée.
3. Visser la tige dans le taraudage au sommet de la tige cannelée du corps :
   plus ou moins profond selon la hauteur voulue, puis bloquer avec la molette.

Le filetage est un Ø8 à pas de 2 mm, profil rond, avec 0,25 mm de jeu radial :
il se visse sans post-traitement sur une imprimante calibrée. S'il est trop
serré/lâche, ajuster `INT_BASE_R` dans le script et regénérer.

## Adapter les cotes

Toutes les cotes (en mm) sont des constantes en tête de
`generate_bonde.py`. Pour regénérer les STL :

```bash
pip install numpy trimesh manifold3d
python3 generate_bonde.py
```

Cotes par défaut (mesurées approximativement sur la photo, à vérifier avec un
pied à coulisse sur l'original) : disque Ø72 mm, dôme Ø50, tige cannelée
Ø14 × hauteur totale 58 mm, tige filetée Ø8 × 57,6 mm, molette Ø15 × 10 mm,
joint Ø61/Ø46 × 4 mm.
