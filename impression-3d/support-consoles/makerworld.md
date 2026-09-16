# Fiche MakerWorld — prête à copier-coller

Tout ce qui suit est rédigé en anglais parce que c'est la langue de MakerWorld :
une fiche en anglais touche dix fois plus de monde. Un paragraphe français est
prévu en fin de description.

---

## Title (limite MakerWorld : 50 caractères)

Recommandé — 44 caractères, la console cherchée en premier :

```
PS5 Pro Stackable Console Shelf – PS3 on Top
```

Variantes, toutes sous 50 caractères :

```
Stackable Console Shelf over PS5 Pro (PS3 ready)   48
PS5 Pro Bridge Stand – Stackable Shelf for PS3     46
Stackable Console Bridge – PS5 Pro + PS3 Shelf     46
PS5 Pro Riser – Stackable Shelf for PS3 & More     46
Console Bridge: Stackable Shelf over PS5 Pro       44
```

## Category

**Household → Office** (c'est un meuble de bureau).
Alternative acceptable : **Hobby & DIY → Electronics**.

## Tags

```
PS5 Pro, PS3, console stand, console shelf, stackable, modular, riser,
desk organizer, gaming setup, PlayStation, no supports, PETG, furniture
```

## License

**CC BY-NC-SA 4.0** — les gens peuvent l'adapter à d'autres consoles (le
modèle est paramétrique, c'est fait pour) et doivent republier sous la même
licence, sans usage commercial.

Si tu ne veux **pas** de remix, prends **Standard Digital File License** (le
défaut MakerWorld : impression personnelle uniquement).

## Printer / material

- Printer : Bambu Lab P1P (et tout plateau ≥ 256 × 256 mm)
- Material : PETG (ASA ok). **Pas de PLA** — préciser pourquoi dans la fiche.
- Nozzle : 0.4 (0.6 recommandé pour gagner du temps)

## BOM / Accessories (champ "Other parts needed" ou équivalent)

```
Per level:
- 4 × M4 × 25 mm screws (socket or button head)
- 4 × M4 nuts
- 8 × M4 washers
Optional (recommended from 2 levels up):
- 2-4 × Ø4 × 30 mm wood screws, or 1 strap, to anchor the feet to the furniture
- self-adhesive felt pads under the feet and on top of the rails
```

---

## Description (Markdown)

```markdown
# Stackable Console Bridge

A shelf that **bridges over a PS5 Pro without ever touching it** and carries a
PS3 (or any console up to 136 mm tall) on top. **Stackable**: drop a second
module onto the first to add a floor — as many times as you like.

Designed for the Bambu Lab P1P (256 × 256 mm bed). **No supports anywhere.**

## How it works

Two inverted-U **gantries** stand at the left and right ends of the PS5. They
are oriented along the console's *depth* (216 mm), not its width (388 mm) —
that's what lets each gantry print **in one piece**, so there is no joint in
the vertical load path: the weight goes straight down in pure compression.

Two **rails** link the gantries and carry the console above. They're too long
for the bed, so each is two identical halves that overlap 30 mm mid-span and
are clamped by 2 × M4 screws. The overlap splits the rail's *width*, not its
*height*, so the section keeps its full stiffness at the joint.

To add a floor: the top of each gantry beam has two mortises; the next gantry
has two tenons under its legs that drop straight in. No screws. Pitch is
178 mm per level, with 136 mm of free height per floor.

## What to print

| Part | Qty | Size | Bed placement |
|---|---|---|---|
| `portique` (gantry) | **2 per level** | 190 × 240 × 20 mm | flat |
| `longeron` (rail half) | **4 per level** | 267 × 46 × 18 mm | **diagonal** |
| `pied` (foot) | **4 total**, base only | 40 × 90 × 16 mm | flat |

The 4 rail halves are the same part — two are just turned 180° at assembly.
Feet are printed once; upper modules plug directly into the module below.

## Print settings

- **PETG (or ASA). Not PLA** — the shelf sits above a console exhausting warm
  air, and PLA softens around 55–60 °C.
- 0.20 mm layers (0.4 nozzle) or 0.28 mm (0.6 nozzle)
- 4 walls, 20 % gyroid infill
- **No supports**
- Glue stick on textured PEI — PETG welds to it on footprints this large
- Brim on the rails (long thin parts)

Roughly **520 g and 30–35 h per level** with a 0.4 nozzle (20–24 h with 0.6),
plus 110 g for the four feet. It's a big print — plan one spool per level.

## Hardware

Per level: **4 × M4 × 25 screws + 4 nuts + 8 washers**. That's the only
hardware — every other joint is a tenon-and-mortise or a notch-and-lip.

## Assembly (5 minutes)

1. Bolt each rail together: lay two halves flat, lip **down**, turn one 180°
   *flat* (don't flip it), slide the tongues together, 2 × M4 through the
   overlap. Hand-tight plus a quarter turn.
2. Place the 4 feet, pocket up, long end **outward**.
3. Plant the two gantries: tenons into the feet pockets.
4. Drop the two rails into the **notches** on top of the beams (the inner
   pair of slots). The end lips hook over the outside of each gantry and
   lock everything.
5. Put your console on the rails.
6. Next floor: new gantry into the **mortises** (outer pair of slots), then
   two more rails. Done.

Full step-by-step with cross-section drawings is in the images.

## Clearances

30 mm of air on each side of the PS5, 49 mm above it. The rear exhaust grille
and the whole front face stay fully open — nothing sits in front of the ports,
the power button or the disc slot. Slide the PS5 out forward without
disassembling anything.

## Please read

- **Measure your console first.** Designed around Sony's official PS5 Pro
  figures: 388 × 216 mm footprint, 105 mm tall with the disc drive, plus
  ~5 mm of feet. If yours differs by more than a few mm, change the
  constants at the top of the generator script and regenerate.
- **Anchor it from the second floor up.** A loaded two-level stack tips at
  ~27°, which is normal furniture territory — but a console that falls lands
  on your PS5 Pro. The feet have Ø5.5 holes for two wood screws or a strap.
- Never in a closed cabinet; keep 10 cm behind the PS5 as Sony asks.

## Customise it

Every dimension is a named constant in a small Python script (numpy + trimesh):
console size, side/top clearance, leg height (= stacking pitch), rail spacing,
fit tolerance. Regenerating all three STLs takes a few seconds, and the script
checks that every part is watertight, fits the bed, and that nothing collides
in the virtual assembly. Source on GitHub: <lien du dépôt>

---

*Version française* — Une étagère qui enjambe la PS5 Pro sans la toucher et
porte une PS3 (ou toute console jusqu'à 136 mm) au-dessus. Empilable par
tenons/mortaises, aucun support d'impression, 4 vis M4 par niveau et rien
d'autre. PETG obligatoire. Mesure ta console avant d'imprimer, et ancre
l'ensemble dès le deuxième étage.
```

---

## Procédure de publication

### Avant tout : une vraie photo

MakerWorld impose depuis 2025 qu'**au moins une image soit une photo réelle de
l'objet imprimé**, qui montre l'objet en entier. Les rendus sont acceptés en
complément, pas seuls. Donc : imprime un niveau complet + les pieds, monte-le,
prends **3-4 photos** (vue d'ensemble avec les deux consoles en place, un gros
plan sur le joint d'empilage, un sur le recouvrement vissé du longeron) — et
c'est ce qui fera aussi vendre le modèle.

### 1. Le profil d'impression (dans Bambu Studio, c'est là que tout se joue)

Sur MakerWorld, un modèle sans **print profile** est quasi invisible : le
bouton « Open in Bambu Studio » ne fonctionne qu'avec, et les points ne sont
attribués qu'aux modèles qui en ont un.

1. Ouvre Bambu Studio → nouveau projet → importe `support-consoles.3mf` (les 3
   pièces en une fois) ou les 3 STL.
2. Répartis sur les plateaux : un portique par plateau (il remplit le lit),
   les longerons **en diagonale** (essaie 2 par plateau ; s'ils se touchent,
   1 par plateau), les 4 pieds ensemble sur un plateau. Mets 2 portiques,
   4 longerons, 4 pieds : c'est exactement un niveau + la base.
3. Filament PETG, 0,20 mm, 4 parois, 20 % gyroïde, supports OFF, brim sur les
   longerons.
4. Tranche tout, vérifie qu'aucun plateau ne dépasse la zone du coupe-filament
   (avant-gauche).
5. **Imprime réellement avec ce profil** — le profil doit être accompagné
   d'une photo de la pièce imprimée avec.
6. Bouton **Upload** (en haut à droite de Bambu Studio) → il crée directement
   le modèle sur MakerWorld avec le profil attaché. Sinon : *Fichier →
   Enregistrer le projet* (.3mf), puis sur le site.

### 2. La fiche sur makerworld.com

`Upload` → glisse le `.3mf` du projet + les 3 `.stl` en secours →
puis, champ par champ, copie les blocs ci-dessus : titre, catégorie, tags,
licence, description, accessoires. Images : tes photos d'abord, puis
`apercu-assemblage.png`, `montage-1-empilage.png`, `montage-2-sequence.png`,
`montage-3-longerons.png`, `montage-4-vissage.png`.

### 3. L'option « Exclusive Model »

Case à cocher sous la description. Plus de points et plus de visibilité, mais
tu t'engages à **ne pas publier le modèle ailleurs** (Printables, Thingiverse,
Cults…). Ne coche que si tu veux vraiment le réserver à MakerWorld.
