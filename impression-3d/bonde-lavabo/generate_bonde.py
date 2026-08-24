#!/usr/bin/env python3
"""
Génère les STL d'un clapet de bonde de lavabo/baignoire réglable (4 pièces) :
  - corps-bonde.stl  : disque + dôme + tige cannelée (taraudage interne en haut)
  - tige-filetee.stl : tige filetée + tête fendue (se visse dans le corps)
  - molette.stl      : écrou moleté de réglage/blocage
  - joint-tpu.stl    : joint annulaire (à imprimer en TPU)

Filetage "rond" (profil cosinus) Ø8 x pas 2 mm, pensé pour l'impression FDM
(jeu radial 0,25 mm entre mâle et femelle). Toutes les cotes sont en mm et
regroupées ci-dessous pour être ajustées facilement.

Usage : python3 generate_bonde.py   (écrit les STL dans le dossier courant)
"""

import numpy as np
import trimesh

# ----------------------------------------------------------------------------
# Paramètres principaux (mm)
# ----------------------------------------------------------------------------
N_THETA = 96                 # résolution angulaire

DISC_R = 36.0                # rayon du disque de base (Ø72)
RIM_H = 7.0                  # hauteur du bord externe
DOME_TOP_Z = 13.5            # sommet du dôme central
STEM_R = 7.0                 # rayon de la tige cannelée (Ø14)
STEM_TOP_Z = 58.0            # hauteur totale du corps
FLUTE_AMP = 0.9              # profondeur des cannelures
FLUTE_N = 10                 # nombre de cannelures

THREAD_PITCH = 2.0           # pas du filetage
THREAD_DEPTH = 0.8           # profondeur du filet
ROD_CORE_R = 3.2             # rayon à fond de filet de la tige (crête = 4.0)
INT_BASE_R = 3.45            # rayon à fond de filet du taraudage (jeu 0,25)

ROD_THREAD_LEN = 46.0        # longueur filetée de la tige
ROD_HEAD_R = 5.5             # rayon de la tête (Ø11)
ROD_TOP_Z = 57.6             # hauteur totale de la tige

NUT_R = 7.5                  # rayon externe de la molette (Ø15)
NUT_H = 10.0                 # hauteur de la molette
KNURL_N = 24                 # stries du moletage
KNURL_AMP = 0.45

GASKET_R_IN = 23.0           # joint : rayon interne
GASKET_R_OUT = 30.5          # joint : rayon externe
GASKET_H = 4.0

TH = np.linspace(0.0, 2.0 * np.pi, N_THETA, endpoint=False)


# ----------------------------------------------------------------------------
# Génération de solides de révolution (avec modulation angulaire / hélicoïdale)
# ----------------------------------------------------------------------------
def ring(sample):
    """Anneau de points 3D pour un échantillon de profil {r, z, kind, ...}."""
    z, r0 = sample["z"], sample["r"]
    kind = sample.get("kind", "plain")
    w = sample.get("w", 1.0)
    if kind == "plain":
        r = np.full(N_THETA, r0)
    elif kind == "flute":
        r = r0 + sample["amp"] * w * np.cos(sample["freq"] * TH)
    elif kind == "thread":
        phase = 2.0 * np.pi * z / sample["pitch"] - TH
        r = r0 + sample["d"] * w * 0.5 * (1.0 + np.cos(phase))
    else:
        raise ValueError(kind)
    return np.column_stack([r * np.cos(TH), r * np.sin(TH), np.full(N_THETA, z)])


def seg(samples, p0, p1, nsub, **kw):
    """Ajoute au profil les points du segment p0→p1 ((r, z) chacun)."""
    wfun = kw.pop("wfun", None)
    for t in np.linspace(0.0, 1.0, nsub + 1):
        if t == 0.0 and samples:
            continue
        s = dict(r=p0[0] + (p1[0] - p0[0]) * t,
                 z=p0[1] + (p1[1] - p0[1]) * t, **kw)
        if wfun is not None:
            s["w"] = wfun(t)
        samples.append(s)


def solid(samples, start_axis=None, end_axis=None, loop=False):
    """Maille fermée à partir d'un profil révolutionné (grille anneaux x thêta)."""
    rows = [ring(s) for s in samples]
    nrows = len(rows)
    verts = [np.vstack(rows)]
    faces = []

    def idx(i, j):
        return i * N_THETA + (j % N_THETA)

    for i in range(nrows if loop else nrows - 1):
        i2 = (i + 1) % nrows
        for j in range(N_THETA):
            a, b = idx(i, j), idx(i, j + 1)
            c, d = idx(i2, j + 1), idx(i2, j)
            faces.append([a, b, c])
            faces.append([a, c, d])

    base = nrows * N_THETA
    if not loop and start_axis is not None:
        verts.append(np.array([[0.0, 0.0, start_axis]]))
        for j in range(N_THETA):
            faces.append([base, idx(0, j + 1), idx(0, j)])
        base += 1
    if not loop and end_axis is not None:
        verts.append(np.array([[0.0, 0.0, end_axis]]))
        for j in range(N_THETA):
            faces.append([base, idx(nrows - 1, j), idx(nrows - 1, j + 1)])

    mesh = trimesh.Trimesh(vertices=np.vstack(verts),
                           faces=np.array(faces), process=True)
    trimesh.repair.fix_normals(mesh)
    if mesh.volume < 0:
        mesh.invert()
    return mesh


def thread_ramp(length, pitch):
    """Poids 0→1 sur un pas à chaque extrémité (départ/fin de filet propres)."""
    def w(t):
        d = min(t, 1.0 - t) * length
        return float(np.clip(d / pitch, 0.0, 1.0))
    return w


# ----------------------------------------------------------------------------
# Corps : disque + dôme + tige cannelée, taraudage borgne dans la tige
# ----------------------------------------------------------------------------
def build_body():
    p = []
    seg(p, (2.0, 0.0), (DISC_R, 0.0), 8)                       # dessous plat
    seg(p, (DISC_R, 0.0), (DISC_R, RIM_H), 3)                  # paroi externe
    seg(p, (DISC_R, RIM_H), (34.5, 8.5), 2)                    # arrondi du bord
    seg(p, (34.5, 8.5), (31.5, 8.5), 2)                        # dessus du bord
    seg(p, (31.5, 8.5), (30.5, 4.5), 2)                        # gorge (mur)
    seg(p, (30.5, 4.5), (27.0, 4.5), 2)                        # gorge (fond)
    seg(p, (27.0, 4.5), (25.0, 9.0), 3)                        # jupe du dôme
    seg(p, (25.0, 9.0), (12.0, 12.5), 8)                       # pente du dôme
    seg(p, (12.0, 12.5), (9.0, DOME_TOP_Z), 3)
    seg(p, (9.0, DOME_TOP_Z), (STEM_R + 0.5, 15.0), 2)         # raccord tige
    seg(p, (STEM_R + 0.5, 15.0), (STEM_R, 17.0), 2)
    flute_len = 55.0 - 17.0
    seg(p, (STEM_R, 17.0), (STEM_R, 55.0), 90,                 # tige cannelée
        kind="flute", amp=FLUTE_AMP, freq=FLUTE_N,
        wfun=thread_ramp(flute_len, 3.0))
    seg(p, (STEM_R, 55.0), (STEM_R, 57.0), 2)
    seg(p, (STEM_R, 57.0), (6.3, STEM_TOP_Z), 2)               # chanfrein haut
    seg(p, (6.3, STEM_TOP_Z), (4.9, STEM_TOP_Z), 2)            # face du haut
    seg(p, (4.9, STEM_TOP_Z), (INT_BASE_R, 57.4), 2)           # entrée taraudage
    thr_len = 57.2 - 26.0
    seg(p, (INT_BASE_R, 57.2), (INT_BASE_R, 26.0), 140,        # taraudage
        kind="thread", d=THREAD_DEPTH, pitch=THREAD_PITCH,
        wfun=thread_ramp(thr_len, THREAD_PITCH))
    seg(p, (INT_BASE_R, 26.0), (1.5, 25.6), 2)                 # fond du trou
    return solid(p, start_axis=0.0, end_axis=25.6)


# ----------------------------------------------------------------------------
# Tige filetée + tête fendue
# ----------------------------------------------------------------------------
def build_rod():
    p = []
    seg(p, (1.8, 0.0), (ROD_CORE_R, 1.2), 2)                   # chanfrein pointe
    seg(p, (ROD_CORE_R, 1.2), (ROD_CORE_R, ROD_THREAD_LEN), 180,
        kind="thread", d=THREAD_DEPTH, pitch=THREAD_PITCH,
        wfun=thread_ramp(ROD_THREAD_LEN - 1.2, THREAD_PITCH))
    seg(p, (ROD_CORE_R, ROD_THREAD_LEN), (ROD_CORE_R, 48.0), 2)
    seg(p, (ROD_CORE_R, 48.0), (ROD_HEAD_R, 48.6), 2)          # dessous de tête
    seg(p, (ROD_HEAD_R, 48.6), (ROD_HEAD_R, 56.0), 4)          # flanc de tête
    seg(p, (ROD_HEAD_R, 56.0), (4.8, 57.0), 2)                 # arrondi
    seg(p, (4.8, 57.0), (1.5, ROD_TOP_Z), 2)
    rod = solid(p, start_axis=0.0, end_axis=ROD_TOP_Z)

    slot = trimesh.creation.box(extents=[2 * ROD_HEAD_R + 2, 1.6, 3.0],
                                transform=trimesh.transformations
                                .translation_matrix([0, 0, ROD_TOP_Z - 0.6]))
    return trimesh.boolean.difference([rod, slot])


# ----------------------------------------------------------------------------
# Molette moletée (écrou de réglage)
# ----------------------------------------------------------------------------
def build_nut():
    p = []
    seg(p, (4.5, 0.0), (6.8, 0.0), 2)                          # dessous
    seg(p, (6.8, 0.0), (NUT_R, 0.7), 2)                        # chanfrein
    seg(p, (NUT_R, 0.7), (NUT_R, NUT_H - 0.7), 24,             # moletage
        kind="flute", amp=KNURL_AMP, freq=KNURL_N,
        wfun=thread_ramp(NUT_H - 1.4, 1.5))
    seg(p, (NUT_R, NUT_H - 0.7), (6.8, NUT_H), 2)              # chanfrein
    seg(p, (6.8, NUT_H), (4.5, NUT_H), 2)                      # dessus
    seg(p, (4.5, NUT_H), (INT_BASE_R, NUT_H - 0.4), 2)         # entrée filet
    seg(p, (INT_BASE_R, NUT_H - 0.4), (INT_BASE_R, 0.4), 60,   # taraudage
        kind="thread", d=THREAD_DEPTH, pitch=THREAD_PITCH,
        wfun=thread_ramp(NUT_H - 0.8, THREAD_PITCH))
    seg(p, (INT_BASE_R, 0.4), (4.49, 0.01), 2)                 # retour (boucle)
    return solid(p, loop=True)


# ----------------------------------------------------------------------------
# Joint annulaire (TPU)
# ----------------------------------------------------------------------------
def build_gasket():
    p = []
    seg(p, (GASKET_R_IN + 1, 0.0), (GASKET_R_OUT - 1, 0.0), 4)
    seg(p, (GASKET_R_OUT - 1, 0.0), (GASKET_R_OUT, 1.0), 2)
    seg(p, (GASKET_R_OUT, 1.0), (GASKET_R_OUT, GASKET_H - 1), 2)
    seg(p, (GASKET_R_OUT, GASKET_H - 1), (GASKET_R_OUT - 1, GASKET_H), 2)
    seg(p, (GASKET_R_OUT - 1, GASKET_H), (GASKET_R_IN + 1, GASKET_H), 4)
    seg(p, (GASKET_R_IN + 1, GASKET_H), (GASKET_R_IN, GASKET_H - 1), 2)
    seg(p, (GASKET_R_IN, GASKET_H - 1), (GASKET_R_IN, 1.0), 2)
    seg(p, (GASKET_R_IN, 1.0), (GASKET_R_IN + 0.99, 0.01), 2)
    return solid(p, loop=True)


if __name__ == "__main__":
    parts = {
        "corps-bonde.stl": build_body(),
        "tige-filetee.stl": build_rod(),
        "molette.stl": build_nut(),
        "joint-tpu.stl": build_gasket(),
    }
    for name, mesh in parts.items():
        ok = mesh.is_watertight
        print(f"{name}: watertight={ok}  volume={mesh.volume:.0f} mm3  "
              f"tris={len(mesh.faces)}")
        assert ok, f"{name} n'est pas étanche"
        mesh.export(name)
    print("STL générés.")
