#!/usr/bin/env python3
"""
Génère les STL d'un clapet de bonde de lavabo/baignoire réglable.

V2 — cotes recalées sur les photos avec règle : disque Ø57 mm,
hauteur totale ~50 mm (au lieu de Ø72 x 105 mm en V1, bien trop gros).

Pièces :
  - bonde-monobloc.stl : corps + tige filetée + tête fendue, une seule pièce
  - corps-bonde.stl    : corps seul (taraudage interne dans la tige cannelée)
  - tige-filetee.stl   : tige filetée + tête fendue (se visse dans le corps)
  - molette.stl        : écrou moleté de réglage/blocage
  - joint-tpu.stl      : joint annulaire (à imprimer en TPU)

Filetage "rond" (profil cosinus) Ø6 x pas 1,5 mm, pensé pour l'impression FDM
(jeu radial 0,25 mm entre mâle et femelle). Toutes les cotes sont en mm.

Usage : python3 generate_bonde.py   (écrit les STL dans le dossier courant)
"""

import numpy as np
import trimesh

# ----------------------------------------------------------------------------
# Paramètres principaux (mm) — mesurés sur les photos avec règle
# ----------------------------------------------------------------------------
N_THETA = 96                 # résolution angulaire

DISC_R = 28.5                # rayon du disque de base (Ø57)
RIM_H = 5.5                  # hauteur du bord externe
DOME_TOP_Z = 10.8            # sommet du dôme central
STEM_R = 5.5                 # rayon de la tige cannelée (Ø11)
STEM_TOP_Z = 27.3            # sommet de la tige cannelée
FLUTE_AMP = 0.7              # profondeur des cannelures
FLUTE_N = 9                  # nombre de cannelures

THREAD_PITCH = 1.5           # pas du filetage
THREAD_DEPTH = 0.6           # profondeur du filet
ROD_CORE_R = 2.4             # rayon à fond de filet de la tige (crête = 3.0, Ø6)
INT_BASE_R = 2.65            # rayon à fond de filet du taraudage (jeu 0,25)

ROD_HEAD_R = 4.5             # rayon de la tête fendue (Ø9)

NUT_R = 5.0                  # rayon externe de la molette (Ø10)
NUT_H = 8.0                  # hauteur de la molette
KNURL_N = 20                 # stries du moletage
KNURL_AMP = 0.35

GASKET_R_IN = 18.0           # joint : rayon interne
GASKET_R_OUT = 24.5          # joint : rayon externe
GASKET_H = 3.0

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


def base_profile(p):
    """Profil commun : disque, gorge, dôme, jusqu'au pied de la tige cannelée."""
    seg(p, (2.0, 0.0), (DISC_R, 0.0), 8)                       # dessous plat
    seg(p, (DISC_R, 0.0), (DISC_R, RIM_H), 3)                  # paroi externe
    seg(p, (DISC_R, RIM_H), (27.2, 6.7), 2)                    # arrondi du bord
    seg(p, (27.2, 6.7), (24.8, 6.7), 2)                        # dessus du bord
    seg(p, (24.8, 6.7), (24.0, 3.5), 2)                        # gorge (mur)
    seg(p, (24.0, 3.5), (21.0, 3.5), 2)                        # gorge (fond)
    seg(p, (21.0, 3.5), (19.5, 7.0), 3)                        # jupe du dôme
    seg(p, (19.5, 7.0), (9.5, 10.0), 8)                        # pente du dôme
    seg(p, (9.5, 10.0), (7.0, DOME_TOP_Z), 3)
    seg(p, (7.0, DOME_TOP_Z), (6.0, 12.0), 2)                  # raccord tige
    seg(p, (6.0, 12.0), (STEM_R, 13.5), 2)
    flute_len = 25.5 - 13.5
    seg(p, (STEM_R, 13.5), (STEM_R, 25.5), 60,                 # tige cannelée
        kind="flute", amp=FLUTE_AMP, freq=FLUTE_N,
        wfun=thread_ramp(flute_len, 2.5))
    seg(p, (STEM_R, 25.5), (STEM_R, 26.5), 2)


# ----------------------------------------------------------------------------
# Version monobloc : corps + tige filetée + tête, en une seule pièce
# (pour qui possède déjà la molette et le joint d'origine)
# ----------------------------------------------------------------------------
MONO_THREAD_Z0 = 29.5        # début du filetage au-dessus de la tige cannelée
MONO_THREAD_Z1 = 41.5        # fin du filetage
MONO_TOP_Z = 50.0            # hauteur totale du monobloc


def build_onepiece():
    p = []
    base_profile(p)
    seg(p, (STEM_R, 26.5), (4.6, STEM_TOP_Z), 2)               # épaulement
    seg(p, (4.6, STEM_TOP_Z), (ROD_CORE_R, MONO_THREAD_Z0), 3)  # cône vers tige
    thr_len = MONO_THREAD_Z1 - MONO_THREAD_Z0
    seg(p, (ROD_CORE_R, MONO_THREAD_Z0), (ROD_CORE_R, MONO_THREAD_Z1), 100,
        kind="thread", d=THREAD_DEPTH, pitch=THREAD_PITCH,
        wfun=thread_ramp(thr_len, THREAD_PITCH))
    seg(p, (ROD_CORE_R, MONO_THREAD_Z1), (ROD_CORE_R, 42.5), 2)
    seg(p, (ROD_CORE_R, 42.5), (ROD_HEAD_R, 43.1), 2)          # dessous de tête
    seg(p, (ROD_HEAD_R, 43.1), (ROD_HEAD_R, 48.6), 4)          # flanc de tête
    seg(p, (ROD_HEAD_R, 48.6), (3.8, 49.4), 2)                 # arrondi
    seg(p, (3.8, 49.4), (1.2, MONO_TOP_Z), 2)
    body = solid(p, start_axis=0.0, end_axis=MONO_TOP_Z)

    slot = trimesh.creation.box(extents=[2 * ROD_HEAD_R + 2, 1.4, 3.0],
                                transform=trimesh.transformations
                                .translation_matrix([0, 0, MONO_TOP_Z - 0.55]))
    return trimesh.boolean.difference([body, slot])


# ----------------------------------------------------------------------------
# Corps seul : taraudage borgne dans la tige cannelée
# ----------------------------------------------------------------------------
def build_body():
    p = []
    base_profile(p)
    seg(p, (STEM_R, 26.5), (4.9, STEM_TOP_Z), 2)               # chanfrein haut
    seg(p, (4.9, STEM_TOP_Z), (3.9, STEM_TOP_Z), 2)            # face du haut
    seg(p, (3.9, STEM_TOP_Z), (INT_BASE_R, 26.8), 2)           # entrée taraudage
    thr_len = 26.8 - 15.0
    seg(p, (INT_BASE_R, 26.8), (INT_BASE_R, 15.0), 80,         # taraudage
        kind="thread", d=THREAD_DEPTH, pitch=THREAD_PITCH,
        wfun=thread_ramp(thr_len, THREAD_PITCH))
    seg(p, (INT_BASE_R, 15.0), (1.2, 14.6), 2)                 # fond du trou
    return solid(p, start_axis=0.0, end_axis=14.6)


# ----------------------------------------------------------------------------
# Tige filetée + tête fendue (pour le corps seul)
# ----------------------------------------------------------------------------
ROD_THREAD_LEN = 22.0
ROD_TOP_Z = 31.5


def build_rod():
    p = []
    seg(p, (1.4, 0.0), (ROD_CORE_R, 1.0), 2)                   # chanfrein pointe
    seg(p, (ROD_CORE_R, 1.0), (ROD_CORE_R, ROD_THREAD_LEN), 120,
        kind="thread", d=THREAD_DEPTH, pitch=THREAD_PITCH,
        wfun=thread_ramp(ROD_THREAD_LEN - 1.0, THREAD_PITCH))
    seg(p, (ROD_CORE_R, ROD_THREAD_LEN), (ROD_CORE_R, 24.0), 2)
    seg(p, (ROD_CORE_R, 24.0), (ROD_HEAD_R, 24.6), 2)          # dessous de tête
    seg(p, (ROD_HEAD_R, 24.6), (ROD_HEAD_R, 30.1), 4)          # flanc de tête
    seg(p, (ROD_HEAD_R, 30.1), (3.8, 30.9), 2)                 # arrondi
    seg(p, (3.8, 30.9), (1.2, ROD_TOP_Z), 2)
    rod = solid(p, start_axis=0.0, end_axis=ROD_TOP_Z)

    slot = trimesh.creation.box(extents=[2 * ROD_HEAD_R + 2, 1.4, 3.0],
                                transform=trimesh.transformations
                                .translation_matrix([0, 0, ROD_TOP_Z - 0.55]))
    return trimesh.boolean.difference([rod, slot])


# ----------------------------------------------------------------------------
# Molette moletée (écrou de réglage)
# ----------------------------------------------------------------------------
def build_nut():
    p = []
    seg(p, (3.6, 0.0), (4.5, 0.0), 2)                          # dessous
    seg(p, (4.5, 0.0), (NUT_R, 0.6), 2)                        # chanfrein
    seg(p, (NUT_R, 0.6), (NUT_R, NUT_H - 0.6), 20,             # moletage
        kind="flute", amp=KNURL_AMP, freq=KNURL_N,
        wfun=thread_ramp(NUT_H - 1.2, 1.2))
    seg(p, (NUT_R, NUT_H - 0.6), (4.5, NUT_H), 2)              # chanfrein
    seg(p, (4.5, NUT_H), (3.6, NUT_H), 2)                      # dessus
    seg(p, (3.6, NUT_H), (INT_BASE_R, NUT_H - 0.35), 2)        # entrée filet
    seg(p, (INT_BASE_R, NUT_H - 0.35), (INT_BASE_R, 0.35), 50,  # taraudage
        kind="thread", d=THREAD_DEPTH, pitch=THREAD_PITCH,
        wfun=thread_ramp(NUT_H - 0.7, THREAD_PITCH))
    seg(p, (INT_BASE_R, 0.35), (3.59, 0.01), 2)                # retour (boucle)
    return solid(p, loop=True)


# ----------------------------------------------------------------------------
# Joint annulaire (TPU)
# ----------------------------------------------------------------------------
def build_gasket():
    p = []
    seg(p, (GASKET_R_IN + 1, 0.0), (GASKET_R_OUT - 1, 0.0), 4)
    seg(p, (GASKET_R_OUT - 1, 0.0), (GASKET_R_OUT, 0.8), 2)
    seg(p, (GASKET_R_OUT, 0.8), (GASKET_R_OUT, GASKET_H - 0.8), 2)
    seg(p, (GASKET_R_OUT, GASKET_H - 0.8), (GASKET_R_OUT - 1, GASKET_H), 2)
    seg(p, (GASKET_R_OUT - 1, GASKET_H), (GASKET_R_IN + 1, GASKET_H), 4)
    seg(p, (GASKET_R_IN + 1, GASKET_H), (GASKET_R_IN, GASKET_H - 0.8), 2)
    seg(p, (GASKET_R_IN, GASKET_H - 0.8), (GASKET_R_IN, 0.8), 2)
    seg(p, (GASKET_R_IN, 0.8), (GASKET_R_IN + 0.99, 0.01), 2)
    return solid(p, loop=True)


if __name__ == "__main__":
    parts = {
        "bonde-monobloc.stl": build_onepiece(),
        "corps-bonde.stl": build_body(),
        "tige-filetee.stl": build_rod(),
        "molette.stl": build_nut(),
        "joint-tpu.stl": build_gasket(),
    }
    for name, mesh in parts.items():
        ok = mesh.is_watertight
        ext = mesh.bounds[1] - mesh.bounds[0]
        print(f"{name}: watertight={ok}  {ext[0]:.1f} x {ext[1]:.1f} x "
              f"{ext[2]:.1f} mm  tris={len(mesh.faces)}")
        assert ok, f"{name} n'est pas étanche"
        mesh.export(name)
    print("STL générés.")
