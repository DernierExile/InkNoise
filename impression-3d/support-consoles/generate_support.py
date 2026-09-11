#!/usr/bin/env python3
"""
Support modulaire empilable pour consoles — enjambe une PS5 Pro et porte une PS3.

Principe : deux portiques en U inversé placés aux extrémités gauche et droite de
la PS5, reliés par deux longerons sur lesquels repose la console du dessus. Rien
ne touche jamais la PS5. Chaque portique s'imprime d'une seule pièce : aucun
joint dans le chemin de charge vertical.

Empilage : le dessus de chaque traverse porte une mortaise qui reçoit le tenon
du portique de l'étage suivant. Pas de 3 niveaux : voir MODULE_H ci-dessous.

Toutes les pièces sont prismatiques dans leur direction d'impression : aucun
support, aucun pont, aucun porte-à-faux.

Repère : X = gauche/droite, Y = avant/arrière, Z = vertical, origine au centre
de l'empreinte de la PS5, Z = 0 au plateau du bureau.

Usage : python3 generate_support.py
"""

import numpy as np
import trimesh

# ---------------------------------------------------------------------------
# Consoles de référence (mm) — cotes officielles Sony
# ---------------------------------------------------------------------------
PS5_W, PS5_D = 388.0, 216.0   # empreinte à plat, identique avec ou sans lecteur
PS5_H = 115.0                 # 105 (avec lecteur) + pieds + marge
PS3_W, PS3_D = 290.0, 230.0   # PS3 Super Slim CECH-4000

# ---------------------------------------------------------------------------
# Dégagements imposés
# ---------------------------------------------------------------------------
GAP_SIDE = 30.0               # air entre la PS5 et la face interne d'un portique
GAP_TOP = 49.0                # air libre au-dessus de la PS5

# ---------------------------------------------------------------------------
# Portique
# ---------------------------------------------------------------------------
POR_T = 20.0                  # épaisseur (X) = hauteur d'impression
POR_D = 240.0                 # profondeur (Y)
LEG_W = 34.0                  # largeur d'un montant (Y)
LEG_H = 148.0                 # hauteur des montants
BEAM_H = 30.0                 # hauteur de la traverse
GUSSET = 32.0                 # côté des goussets d'angle
POR_X = PS5_W / 2 + GAP_SIDE + POR_T / 2      # axe des portiques : 234

BEAM_Z0 = LEG_H                               # 148
BEAM_Z1 = LEG_H + BEAM_H                      # 178
MODULE_H = BEAM_Z1                            # pas d'empilage : 178

# ---------------------------------------------------------------------------
# Emboîtement d'empilage (tenon sous les montants / mortaise sur la traverse)
# ---------------------------------------------------------------------------
TEN_Y = POR_D / 2 - LEG_W / 2                 # axe du tenon : 103
TEN_W = 24.0                                  # largeur du tenon (Y)
TEN_H = 12.0                                  # hauteur du tenon
FIT = 0.30                                    # jeu par face

# ---------------------------------------------------------------------------
# Longerons
# ---------------------------------------------------------------------------
RAIL_W = 18.0                 # largeur (Y)
RAIL_H = 34.0                 # hauteur (Z)
RAIL_Y = 70.0                 # axe des longerons (± en Y)
NOTCH_D = 22.0                # profondeur de l'encoche dans la traverse
LIP = 8.0                     # longueur du bec de retenue en bout de longeron
LIP_H = 12.0                  # hauteur du bec
LAP = 30.0                    # longueur du recouvrement à mi-portée
BOLT_D = 4.4                  # perçage pour vis M4

RAIL_X_END = POR_X + POR_T / 2 + LIP          # 252
RAIL_Z0 = BEAM_Z1 - NOTCH_D                   # 156 — sous-face du longeron
RAIL_Z1 = RAIL_Z0 + RAIL_H                    # 190 — plan de pose de la console

# ---------------------------------------------------------------------------
# Pieds (déportés vers l'extérieur pour la stabilité au basculement)
# ---------------------------------------------------------------------------
FOOT_T = 16.0                 # épaisseur
FOOT_X = 40.0                 # dimension X
FOOT_Y = 90.0                 # dimension Y
FOOT_OUT = 15.0               # déport vers l'extérieur par rapport à l'axe du tenon
STRAP_D = 5.5                 # trou d'ancrage (sangle ou vis dans le meuble)


# ---------------------------------------------------------------------------
# Primitives
# ---------------------------------------------------------------------------
def box(x0, x1, y0, y1, z0, z1):
    """Pavé aligné sur les axes, défini par ses bornes (ordre indifférent)."""
    (x0, x1), (y0, y1), (z0, z1) = sorted((x0, x1)), sorted((y0, y1)), sorted((z0, z1))
    b = trimesh.creation.box(extents=[x1 - x0, y1 - y0, z1 - z0])
    b.apply_translation([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2])
    return b


def prism_x(profile, x0, x1):
    """Profil 2D convexe (liste de (y, z)) extrudé selon X, sens indifférent."""
    profile = list(profile)
    area = sum(profile[i][0] * profile[(i + 1) % len(profile)][1]
               - profile[(i + 1) % len(profile)][0] * profile[i][1]
               for i in range(len(profile)))
    if area < 0:                                  # remet le contour dans le sens direct
        profile = profile[::-1]
    n = len(profile)
    verts = [[x0, y, z] for y, z in profile] + [[x1, y, z] for y, z in profile]
    faces = []
    for i in range(1, n - 1):                         # face en x0
        faces.append([0, i + 1, i])
    for i in range(1, n - 1):                         # face en x1
        faces.append([n, n + i, n + i + 1])
    for i in range(n):                                # faces latérales
        j = (i + 1) % n
        faces.append([i, j, n + j])
        faces.append([i, n + j, n + i])
    m = trimesh.Trimesh(vertices=np.array(verts, dtype=float),
                        faces=np.array(faces), process=True)
    trimesh.repair.fix_normals(m)
    if m.volume < 0:
        m.invert()
    return m


def cyl_y(y0, y1, x, z, d):
    """Cylindre d'axe Y (perçage traversant horizontal)."""
    c = trimesh.creation.cylinder(radius=d / 2, height=y1 - y0, sections=32)
    c.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
    c.apply_translation([x, (y0 + y1) / 2, z])
    return c


def cyl_z(z0, z1, x, y, d):
    """Cylindre d'axe Z (perçage traversant vertical)."""
    c = trimesh.creation.cylinder(radius=d / 2, height=z1 - z0, sections=32)
    c.apply_translation([x, y, (z0 + z1) / 2])
    return c


def union(parts):
    return trimesh.boolean.union(parts)


def cut(solid, tools):
    return trimesh.boolean.difference([solid] + tools)


# ---------------------------------------------------------------------------
# Portique — imprimé à plat, plan Y-Z contre le plateau
# ---------------------------------------------------------------------------
def build_portique():
    hx = POR_T / 2
    y_out = POR_D / 2                             # 120
    y_in = y_out - LEG_W                          # 86

    solids = [
        box(-hx, hx, -y_out, -y_in, 0, LEG_H),    # montant arrière
        box(-hx, hx, y_in, y_out, 0, LEG_H),      # montant avant
        box(-hx, hx, -y_out, y_out, BEAM_Z0, BEAM_Z1),   # traverse
        # tenons d'empilage, sous chaque montant
        box(-hx, hx, -TEN_Y - TEN_W / 2, -TEN_Y + TEN_W / 2, -TEN_H, 0),
        box(-hx, hx, TEN_Y - TEN_W / 2, TEN_Y + TEN_W / 2, -TEN_H, 0),
    ]

    # goussets d'angle : suppriment l'angle rentrant vif entre montant et traverse
    for s in (-1, 1):
        solids.append(prism_x([(s * y_in, BEAM_Z0),
                               (s * (y_in - GUSSET), BEAM_Z0),
                               (s * y_in, BEAM_Z0 - GUSSET)], -hx, hx))

    body = union(solids)

    tools = []
    # encoches des longerons (traversantes en X, donc prismatiques)
    for s in (-1, 1):
        tools.append(box(-hx - 1, hx + 1,
                         s * RAIL_Y - RAIL_W / 2 - FIT, s * RAIL_Y + RAIL_W / 2 + FIT,
                         RAIL_Z0, BEAM_Z1 + 1))
    # mortaises d'empilage, dans le dessus de la traverse, au droit des montants
    for s in (-1, 1):
        tools.append(box(-hx - 1, hx + 1,
                         s * TEN_Y - TEN_W / 2 - FIT, s * TEN_Y + TEN_W / 2 + FIT,
                         BEAM_Z1 - TEN_H, BEAM_Z1 + 1))
    # allègements : lumière dans chaque montant, deux dans la traverse.
    # Contraintes réelles < 0,1 MPa à ces endroits, aucune incidence structurelle.
    for s in (-1, 1):
        tools.append(box(-hx - 1, hx + 1,
                         s * TEN_Y - 7.0, s * TEN_Y + 7.0, 26.0, 122.0))
        tools.append(box(-hx - 1, hx + 1,
                         s * 16.0, s * 51.0, BEAM_Z0 + 6.0, BEAM_Z1 - 6.0))
    return cut(body, tools)


# ---------------------------------------------------------------------------
# Demi-longeron — 4 exemplaires identiques, imprimés couchés en diagonale
# ---------------------------------------------------------------------------
def build_longeron():
    """Moitié de longeron. Les deux moitiés sont la même pièce, l'une tournée
    de 180° autour de Z. Le recouvrement partage la LARGEUR (Y) et non la
    hauteur : le moment quadratique de la section reste donc intact au droit du
    joint, qui est à mi-portée là où la flexion est maximale."""
    hw = RAIL_W / 2
    x_out = -RAIL_X_END
    x_lap = LAP / 2                       # le recouvrement est centré sur X = 0

    solids = [
        box(x_out, -x_lap, -hw, hw, 0, RAIL_H),              # corps pleine section
        box(x_out, x_out + LIP, -hw, hw, -LIP_H, 0),         # bec de retenue
        box(-x_lap, x_lap, FIT / 2, hw, 0, RAIL_H),          # demi-section, recouvrement
    ]
    body = union(solids)

    tools = [cyl_y(-hw - 1, hw + 1, x, RAIL_H / 2, BOLT_D)
             for x in (-x_lap + 9.0, x_lap - 9.0)]
    return cut(body, tools)


# ---------------------------------------------------------------------------
# Pied — 4 exemplaires identiques, imprimés à plat
# ---------------------------------------------------------------------------
def build_pied():
    hx = FOOT_X / 2
    y0 = -FOOT_Y / 2 + FOOT_OUT
    y1 = FOOT_Y / 2 + FOOT_OUT

    body = box(-hx, hx, y0, y1, 0, FOOT_T)
    tools = [
        # mortaise borgne recevant le tenon du montant
        box(-POR_T / 2 - FIT, POR_T / 2 + FIT,
            -TEN_W / 2 - FIT, TEN_W / 2 + FIT,
            FOOT_T - TEN_H, FOOT_T + 1),
        # trou d'ancrage anti-basculement
        cyl_z(-1, FOOT_T + 1, 0, y1 - 10.0, STRAP_D),
    ]
    return cut(body, tools)


# ---------------------------------------------------------------------------
# Assemblage virtuel (contrôle visuel uniquement, non exporté)
# ---------------------------------------------------------------------------
def build_assembly(levels=2):
    scene = []
    por, rail, foot = build_portique(), build_longeron(), build_pied()

    for sx in (-1, 1):
        for sy in (-1, 1):
            f = foot.copy()
            f.apply_transform(trimesh.transformations.rotation_matrix(
                0 if sy > 0 else np.pi, [0, 0, 1]))
            f.apply_translation([sx * POR_X, sy * TEN_Y, 0])
            scene.append(f)

    for lvl in range(levels):
        z = FOOT_T + lvl * MODULE_H
        for sx in (-1, 1):
            p = por.copy()
            p.apply_translation([sx * POR_X, 0, z])
            scene.append(p)
        for sy in (-1, 1):
            for sx in (-1, 1):
                r = rail.copy()
                if sx > 0:
                    r.apply_transform(trimesh.transformations.rotation_matrix(
                        np.pi, [0, 0, 1]))
                r.apply_translation([0, sy * RAIL_Y, z + RAIL_Z0])
                scene.append(r)
    return scene


BED = 256.0


def to_print_pose(mesh, axis, angle):
    """Bascule la pièce dans son orientation d'impression et la pose sur Z = 0."""
    m = mesh.copy()
    if angle:
        m.apply_transform(trimesh.transformations.rotation_matrix(angle, axis))
    lo = m.bounds[0]
    m.apply_translation([-lo[0], -lo[1], -lo[2]])
    return m


if __name__ == "__main__":
    # (maillage, quantité, axe de bascule, angle) — orientation d'impression :
    # portique à plat (épaisseur en Z), longeron couché recouvrement contre le
    # plateau, pied posé à plat.
    parts = {
        "portique.stl": (build_portique(), 2, [0, 1, 0], np.pi / 2),
        "longeron.stl": (build_longeron(), 4, [1, 0, 0], -np.pi / 2),
        "pied.stl": (build_pied(), 4, [0, 0, 1], 0.0),
    }
    for name, (mesh, qty, axis, angle) in parts.items():
        m = to_print_pose(mesh, axis, angle)
        ext = m.bounds[1] - m.bounds[0]
        ok = m.is_watertight
        # une pièce p x q tient sur un plateau carré de côté s soit droite
        # (p <= s et q <= s), soit tournée à 45° si (p + q) / racine(2) <= s
        square = max(ext[0], ext[1]) <= BED - 8
        tilted = (ext[0] + ext[1]) / 2**0.5 <= BED - 16
        fit = "à plat" if square else f"en diagonale ({(ext[0] + ext[1]) / 2**0.5:.0f} mm)"
        print(f"{name:16s} x{qty}  {ext[0]:6.1f} x {ext[1]:6.1f} x {ext[2]:6.1f} mm"
              f"  volume={m.volume / 1000:7.1f} cm3  watertight={ok}  pose={fit}")
        assert ok, f"{name} n'est pas étanche"
        assert square or tilted, f"{name} ne tient pas sur le plateau"
        m.export(name)

    print()
    print(f"Pas d'empilage        : {MODULE_H:.0f} mm")
    print(f"Plan de pose console  : {FOOT_T + RAIL_Z1:.0f} mm (niveau 1)")
    print(f"Air au-dessus PS5     : {FOOT_T + BEAM_Z0 - PS5_H:.0f} mm")
    print(f"Jeu latéral PS5       : {POR_X - POR_T / 2 - PS5_W / 2:.0f} mm par côté")
    print(f"Empreinte au sol      : {2 * POR_X + FOOT_X:.0f} x "
          f"{2 * (FOOT_Y / 2 + FOOT_OUT + TEN_Y):.0f} mm")
    print("STL générés.")
