#!/usr/bin/env python3
"""
Genere les 3 planches de montage du support de consoles.

Toutes les coupes 2D sont extraites des maillages reels produits par
generate_support.py : le dessin ne peut donc pas diverger des STL.

  montage-1-empilage.png   mecanisme d'empilage (eclate / emboite / detail)
  montage-2-sequence.png   sequence de montage en 6 etapes, vues 3D
  montage-3-longerons.png  assemblage des deux moities de longeron

Usage : python3 generate_notice.py
"""
import numpy as np, trimesh, sys
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
sys.path.insert(0, ".")
import generate_support as G

POR, RAIL, PIED = G.build_portique(), G.build_longeron(), G.build_pied()
R = trimesh.transformations.rotation_matrix

COL = {"pied":      ("#cfd8e3", "#4a5563"),
       "portique1": ("#98a6b4", "#1b232e"),
       "portique2": ("#e8b984", "#8a5a10"),
       "longeron":  ("#53616f", "#141b22"),
       "longA":     ("#4f7d8c", "#12333c"),
       "longB":     ("#c98b52", "#6b3d10")}
GHOST = ("#eef1f4", "#bcc4cd")
RED, TEAL, OCHRE, INK = "#c0392b", "#0b5563", "#8a5a10", "#1b232e"


def place(m, xyz, rotz=0.0):
    m = m.copy()
    if rotz:
        m.apply_transform(R(rotz, [0, 0, 1]))
    m.apply_translation(xyz)
    return m


def feet():
    return [("pied", place(PIED, [sx * G.POR_X, sy * G.TEN_Y, 0],
                           0.0 if sy > 0 else np.pi))
            for sx in (-1, 1) for sy in (-1, 1)]


def portiques(lvl, dz=0.0, key=None):
    z = G.FOOT_T + lvl * G.MODULE_H + dz
    return [(key or f"portique{lvl + 1}", place(POR, [sx * G.POR_X, 0, z]))
            for sx in (-1, 1)]


def rails(lvl, dz=0.0, keys=("longeron", "longeron")):
    z = G.FOOT_T + lvl * G.MODULE_H + G.RAIL_Z0 + dz
    return [(keys[0 if sx < 0 else 1],
             place(RAIL, [0, sy * G.RAIL_Y, z], np.pi if sx > 0 else 0.0))
            for sy in (-1, 1) for sx in (-1, 1)]


# ------------------------------------------------------------------ coupe 2D
def section(ax, parts, origin, normal, ghost=(), lw=1.2):
    a, b = [i for i in range(3) if normal[i] == 0]
    k = [i for i in range(3) if normal[i] != 0][0]
    for name, m in parts:
        if m.bounds[0][k] > origin[k] or m.bounds[1][k] < origin[k]:
            continue
        sec = m.section(plane_origin=origin, plane_normal=normal)
        if sec is None:
            continue
        loops = [np.asarray(sec.vertices[e.points])[:, [a, b]] for e in sec.entities]
        loops.sort(key=lambda p: -float(np.ptp(p[:, 0]) * np.ptp(p[:, 1])))
        fc, ec = GHOST if name in ghost else COL[name]
        z0 = 1.4 if name in ghost else 2.0
        for i, p in enumerate(loops):
            ax.fill(p[:, 0], p[:, 1], facecolor=fc if i == 0 else "white",
                    edgecolor="none", zorder=z0 if i == 0 else z0 + .3)
        for p in loops:
            ax.plot(p[:, 0], p[:, 1], color=ec, lw=lw, zorder=z0 + .6)


def arrow(ax, p0, p1, c=RED, lw=2.3):
    ax.annotate("", xy=p1, xytext=p0, zorder=9,
                arrowprops=dict(arrowstyle="-|>,head_width=0.3,head_length=0.75",
                                color=c, lw=lw, shrinkA=0, shrinkB=0))


def lead(ax, txt, xy, xytext, c=INK, fs=9.0, ha="center", rad=0.0):
    ax.annotate(txt, xy=xy, xytext=xytext, fontsize=fs, color=c, ha=ha,
                fontweight="bold", va="center", zorder=10,
                arrowprops=dict(arrowstyle="-|>,head_width=0.22,head_length=0.6",
                                color=c, lw=1.3, shrinkB=3,
                                connectionstyle=f"arc3,rad={rad}"))


def dimh(ax, y, x0, x1, txt, c="#1f6f8b", dy=5, fs=8.5):
    ax.annotate("", xy=(x1, y), xytext=(x0, y), zorder=9,
                arrowprops=dict(arrowstyle="<|-|>,head_width=0.2,head_length=0.45",
                                color=c, lw=1.0))
    ax.text((x0 + x1) / 2, y + dy, txt, color=c, fontsize=fs, ha="center", zorder=9)


def dimv(ax, x, y0, y1, txt, c="#1f6f8b", dx=-6, fs=8.5, ha="right"):
    ax.annotate("", xy=(x, y1), xytext=(x, y0), zorder=9,
                arrowprops=dict(arrowstyle="<|-|>,head_width=0.2,head_length=0.45",
                                color=c, lw=1.0))
    ax.text(x + dx, (y0 + y1) / 2, txt, color=c, fontsize=fs, ha=ha,
            va="center", zorder=9)


def frame(ax, xlim, ylim, title=None):
    ax.set_xlim(*xlim); ax.set_ylim(*ylim)
    ax.set_aspect("equal"); ax.axis("off")
    if title:
        ax.set_title(title, fontsize=11.5, fontweight="bold", pad=12)



# ==========================================================================
# PLANCHE 1 — mecanisme d'empilage
# ==========================================================================
fig = plt.figure(figsize=(16.5, 9.6))
fig.suptitle("Comment on empile un 2ᵉ niveau  —  coupe verticale dans l'axe du portique droit",
             fontsize=14.5, fontweight="bold", y=0.965)
PX, NX = [G.POR_X, 0, 0], [1, 0, 0]

# -- 1. eclate
ax = fig.add_subplot(1, 3, 1)
section(ax, feet() + portiques(0) + rails(0) + portiques(1, dz=105), PX, NX)
for sy in (-1, 1):
    arrow(ax, (sy * G.TEN_Y, 292), (sy * G.TEN_Y, 201))
ax.text(0, 560, "on descend le portique du niveau 2 :\nses 2 tenons tombent dans les 2 mortaises\ndu dessus de la traverse",
        ha="center", va="center", fontsize=10, color=RED, fontweight="bold")
ax.text(-205, 350, "NIVEAU 2", fontsize=10, color=OCHRE, fontweight="bold",
        rotation=90, va="center")
ax.text(-205, 105, "NIVEAU 1", fontsize=10, color="#42505f", fontweight="bold",
        rotation=90, va="center")
lead(ax, "pieds", (-118, 8), (-185, -30), c="#4a5563", fs=9.5)
frame(ax, (-225, 225), (-55, 600), "1.  Éclaté")

# -- 2. emboite
ax = fig.add_subplot(1, 3, 2)
section(ax, feet() + portiques(0) + rails(0) + portiques(1) + rails(1), PX, NX)
ax.add_patch(plt.Rectangle((72, 158), 66, 60, fill=False, ec=RED,
                           lw=1.9, ls=(0, (4, 3)), zorder=10))
lead(ax, "détail\nplanche 3", (138, 188), (235, 250), c=RED, fs=9.5)
dimv(ax, -196, G.FOOT_T, G.FOOT_T + G.MODULE_H, "178 mm")
dimv(ax, -196, G.FOOT_T + G.MODULE_H, G.FOOT_T + 2 * G.MODULE_H, "178 mm")
ax.text(-268, 105, "pas d'empilage", color="#1f6f8b", fontsize=8.5,
        rotation=90, va="center", ha="center")
dimh(ax, -38, -163, 163, "326 mm  (empreinte au sol)")
lead(ax, "la PS3 pose ici, à 206 mm", (-60, 206), (-190, 292), c=TEAL, fs=9.5)
lead(ax, "étage libre :\n136 mm sous la traverse\npour une 3ᵉ console", (30, 300),
     (215, 385), c=OCHRE, fs=9.5)
frame(ax, (-300, 300), (-60, 600), "2.  Emboîté")

# -- 3. detail
ax = fig.add_subplot(1, 3, 3)
section(ax, feet() + portiques(0) + rails(0) + portiques(1), PX, NX, lw=1.5)
lead(ax, "TENON sous le montant du niveau 2\n24 × 20 × 12 mm — il fait partie\nde la pièce du dessus",
     (99, 188), (142, 268), c=OCHRE, fs=9.5, ha="left")
lead(ax, "LONGERON du niveau 1 dans son encoche.\nIl dépasse de 12 mm au-dessus de la\ntraverse : c'est lui qui porte la console",
     (79, 201), (142, 228), c=TEAL, fs=9.5, ha="left")
lead(ax, "MORTAISE dans le dessus de la traverse\ndu niveau 1 — 24,6 × 12 mm,\nsoit 0,3 mm de jeu par face",
     (114, 184), (142, 148), c=INK, fs=9.5, ha="left")
dimv(ax, 128, 182, 194, "12 mm\nd'emboîtement", dx=3, ha="left", fs=8)
ax.plot([116, 130], [182, 182], color="#1f6f8b", lw=.7, ls=":", zorder=8)
ax.plot([120, 130], [194, 194], color="#1f6f8b", lw=.7, ls=":", zorder=8)
frame(ax, (0, 300), (118, 292), "3.  Détail du joint d'empilage")

plt.tight_layout(rect=[0, 0, 1, 0.93])
plt.savefig("montage-1-empilage.png", dpi=125, bbox_inches="tight", facecolor="white")
plt.close()
print("planche 1 ok")

# ==========================================================================
# PLANCHE 2 — sequence de montage, vues 3D
# ==========================================================================
RGB = {"pied": (0.78, 0.83, 0.89), "portique1": (0.55, 0.60, 0.67),
       "portique2": (0.87, 0.68, 0.42), "longeron": (0.26, 0.33, 0.40),
       "ps5": (0.90, 0.90, 0.92), "ps3": (0.15, 0.15, 0.17)}


def add3d(ax, mesh, rgb, maxf=7000):
    m = mesh.copy()
    if len(m.faces) > maxf:
        m = m.simplify_quadric_decimation(face_count=maxf)
    tm = trimesh.Trimesh(m.vertices, m.faces, process=False)
    sh = np.clip(tm.face_normals @ np.array([0.42, 0.34, 0.84]), 0.10, 1.0)
    tri = Poly3DCollection(m.vertices[m.faces], edgecolor="none")
    tri.set_facecolor(np.clip(np.array(rgb)[None, :] * (0.32 + 0.70 * sh)[:, None], 0, 1))
    ax.add_collection3d(tri)


PS5 = G.box(-194, 194, -108, 108, 0, 105)
ZPS3 = G.FOOT_T + G.RAIL_Z1
PS3 = G.box(-145, 145, -115, 115, ZPS3, ZPS3 + 60)

STEPS = [
    ("1.  Poser les 4 pieds",
     "mortaise vers le haut,\npartie longue vers l'extérieur",
     lambda: feet(), False, False),
    ("2.  Planter les 2 portiques",
     "les tenons du bas entrent\ndans les pieds",
     lambda: feet() + portiques(0), False, False),
    ("3.  Poser les 2 longerons",
     "chacun = 2 moitiés vissées,\ndescendues dans les encoches",
     lambda: feet() + portiques(0) + rails(0), False, False),
    ("4.  Poser la PS3",
     "elle repose sur les longerons,\nà 206 mm du bureau",
     lambda: feet() + portiques(0) + rails(0), False, True),
    ("5.  Planter le portique du niveau 2",
     "ses tenons entrent dans les mortaises\ndu dessus des traverses",
     lambda: feet() + portiques(0) + rails(0) + portiques(1), False, True),
    ("6.  Poser les longerons du niveau 2",
     "l'étage est prêt à recevoir\nune 3ᵉ console",
     lambda: feet() + portiques(0) + rails(0) + portiques(1) + rails(1), False, True),
]

fig = plt.figure(figsize=(16.5, 10.2))
fig.suptitle("Séquence de montage complète", fontsize=15, fontweight="bold", y=0.975)
for i, (title, sub, build, _, with_ps3) in enumerate(STEPS):
    ax = fig.add_subplot(2, 3, i + 1, projection="3d")
    for name, m in build():
        add3d(ax, m, RGB[name])
    add3d(ax, PS5, RGB["ps5"])
    if with_ps3:
        add3d(ax, PS3, RGB["ps3"])
    r = 300
    ax.set_xlim(-r, r); ax.set_ylim(-r, r); ax.set_zlim(-35, 2 * r - 35)
    ax.set_box_aspect([1, 1, 1]); ax.set_axis_off()
    ax.view_init(elev=19, azim=-62)
    ax.set_title(f"{title}\n", fontsize=11.5, fontweight="bold", pad=2)
    ax.text2D(0.5, 0.90, sub, transform=ax.transAxes, ha="center",
              fontsize=9, color="#556070", va="top")
plt.tight_layout(rect=[0, 0, 1, 0.955])
plt.savefig("montage-2-sequence.png", dpi=120, bbox_inches="tight", facecolor="white")
plt.close()
print("planche 2 ok")


# ==========================================================================
# PLANCHE 3 --- assemblage des deux moities de longeron
# ==========================================================================
KEYS = ("longA", "longB")
ZCUT = G.FOOT_T + G.RAIL_Z0 + 6.0        # sous les percages : lap continu
ZBOLT = G.FOOT_T + G.RAIL_Z0 + G.RAIL_H / 2
NZ = [0, 0, 1]
YR = G.RAIL_Y                             # 70


def pair(dx=0.0, y=YR):
    """Les deux moities du longeron avant, ecartees de +-dx en X."""
    z = G.FOOT_T + G.RAIL_Z0
    return [("longA", place(RAIL, [-dx, y, z], 0.0)),
            ("longB", place(RAIL, [dx, y, z], np.pi))]


fig = plt.figure(figsize=(16.5, 9.8))
fig.suptitle("Assemblage d'un longeron  —  les 2 moitiés sont la MÊME pièce, "
             "l'une simplement tournée de 180°",
             fontsize=14.5, fontweight="bold", y=0.97)

# ---- A : plan d'ensemble ----
ax = fig.add_subplot(2, 1, 1)
section(ax, portiques(0) + rails(0, keys=KEYS), [0, 0, ZCUT], NZ,
        ghost=("portique1",), lw=1.1)
ax.add_patch(plt.Rectangle((-34, 56), 68, 28, fill=False, ec=RED, lw=1.9,
                           ls=(0, (4, 3)), zorder=10))
lead(ax, "le joint est au MILIEU, entre les deux portiques", (34, 70),
     (188, 120), c=RED, fs=10)
ax.text(-155, 70, "moitié A", ha="center", va="center", fontsize=10,
        color="white", fontweight="bold", zorder=12)
ax.text(160, 70, "moitié B", ha="center", va="center", fontsize=10,
        color="white", fontweight="bold", zorder=12)
ax.text(-G.POR_X, -132, "portique gauche", ha="center", fontsize=9, color="#8b949f")
ax.text(G.POR_X, -132, "portique droit", ha="center", fontsize=9, color="#8b949f")
dimh(ax, -112, -267, 267, "534 mm — longueur totale du longeron assemblé", dy=7)
frame(ax, (-340, 340), (-150, 155), "A.  Vue de dessus de l'ensemble (les portiques en clair)")

# ---- B : recouvrement ecarte ----
ax = fig.add_subplot(2, 3, 4)
section(ax, pair(dx=26.0), [0, 0, ZCUT], NZ, lw=1.7)
arrow(ax, (-10, 98), (-28, 98), c=RED, lw=2.0)
arrow(ax, (10, 98), (28, 98), c=RED, lw=2.0)
ax.text(0, 107, "on rapproche", ha="center", fontsize=9.5, color=RED,
        fontweight="bold")
lead(ax, "la languette de A\nest d'un côté", (-24, 75), (-62, 40),
     c=COL["longA"][1], fs=9)
lead(ax, "celle de B\nest de l'autre", (24, 65), (62, 96),
     c=COL["longB"][1], fs=9)
frame(ax, (-100, 100), (25, 115), "B.  Les 2 moitiés, écartées")

# ---- C : recouvrement emboite + vis ----
ax = fig.add_subplot(2, 3, 5)
section(ax, pair(dx=0.0), [0, 0, ZCUT], NZ, lw=1.7)
for x in (-6, 6):
    ax.add_patch(plt.Circle((x, YR), 2.2, fc="white", ec=RED, lw=1.9, zorder=12))
    ax.plot([x, x], [YR - 13, YR + 13], color=RED, lw=0.8, ls=(0, (4, 3)), zorder=11)
lead(ax, "2 vis M4 × 25 + écrou,\nen travers du recouvrement", (6, YR + 10),
     (34, 102), c=RED, fs=9.5, ha="center")
dimh(ax, 46, -15, 15, "30 mm de recouvrement", dy=-9, fs=9)
frame(ax, (-100, 100), (25, 115), "C.  Emboîtées et vissées")

# ---- D : coupe en travers ----
ax = fig.add_subplot(2, 3, 6)
section(ax, pair(dx=0.0), [0, 0, 0], [1, 0, 0], lw=1.8)
ax.plot([YR, YR], [168, 210], color=RED, lw=1.1, ls=(0, (5, 4)), zorder=12)
dimh(ax, 167, YR - 9, YR + 9, "18 mm", dy=-7.5, fs=9)
dimv(ax, YR - 14, 172, 206, "34 mm", dx=-2.5, fs=9)
lead(ax, "le joint partage la LARGEUR,\npas la hauteur : la hauteur de\n"
         "section reste entière, donc le\nlongeron ne fléchit pas plus ici\n"
         "qu'ailleurs",
     (YR + 1, 196), (YR + 22, 192), c=RED, fs=9, ha="left")
ax.text(YR - 4.5, 176, "A", ha="center", fontsize=10, color="white",
        fontweight="bold", zorder=13)
ax.text(YR + 4.5, 176, "B", ha="center", fontsize=10, color="white",
        fontweight="bold", zorder=13)
frame(ax, (YR - 26, YR + 104), (156, 214), "D.  Coupe en travers du joint")

plt.tight_layout(rect=[0, 0, 1, 0.935])
plt.savefig("montage-3-longerons.png", dpi=125, bbox_inches="tight", facecolor="white")
print("planche 3 ok")


# ==========================================================================
# PLANCHE 0 --- apercus d'ensemble et des pieces
# ==========================================================================
fig = plt.figure(figsize=(15, 7.5))
for k, (elev, azim, t) in enumerate([(18, -62, "Assemblage 2 niveaux"),
                                     (6, -92, "Vue de face"),
                                     (62, -90, "Vue de dessus")]):
    ax = fig.add_subplot(1, 3, k + 1, projection="3d")
    for name, m in (feet() + portiques(0) + rails(0)
                    + portiques(1) + rails(1)):
        add3d(ax, m, RGB["portique1"] if name.startswith("portique")
              else RGB[name])
    add3d(ax, PS5, RGB["ps5"])
    add3d(ax, PS3, RGB["ps3"])
    r = 300
    ax.set_xlim(-r, r); ax.set_ylim(-r, r); ax.set_zlim(-35, 2 * r - 35)
    ax.set_box_aspect([1, 1, 1]); ax.set_axis_off()
    ax.view_init(elev=elev, azim=azim)
    ax.set_title(t, fontsize=11)
plt.tight_layout()
plt.savefig("apercu-assemblage.png", dpi=115, bbox_inches="tight",
            facecolor="white")
plt.close()

fig = plt.figure(figsize=(15, 5))
for k, (f, t) in enumerate([("portique.stl", "portique  x2 / niveau"),
                            ("longeron.stl", "longeron  x4 / niveau"),
                            ("pied.stl", "pied  x4 (base)")]):
    m = trimesh.load(f)
    ax = fig.add_subplot(1, 3, k + 1, projection="3d")
    add3d(ax, m, RGB["portique1"])
    c = m.bounds.mean(axis=0)
    r = float((m.bounds[1] - m.bounds[0]).max()) / 2
    ax.set_xlim(c[0] - r, c[0] + r); ax.set_ylim(c[1] - r, c[1] + r)
    ax.set_zlim(c[2] - r, c[2] + r)
    ax.set_box_aspect([1, 1, 1]); ax.set_axis_off()
    ax.view_init(elev=32, azim=-58)
    e = m.bounds[1] - m.bounds[0]
    ax.set_title(f"{t}\n{e[0]:.0f} x {e[1]:.0f} x {e[2]:.0f} mm", fontsize=10)
plt.tight_layout()
plt.savefig("apercu-pieces.png", dpi=115, bbox_inches="tight", facecolor="white")
plt.close()
print("planche 0 ok")
