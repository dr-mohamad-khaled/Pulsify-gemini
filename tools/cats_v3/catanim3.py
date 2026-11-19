"""Pulsify cats — animation engine v3 (rig v3, dual-quaternion skinning).
Natural motion rules used throughout:
  * curves are Catmull-Rom (velocity carries through keys; no stop-start at every key),
  * paws are IK-planted on the ground and only move when the leg lifts; lifted paws curl (wrist / hock flex),
  * secondary motion is simulated after the fact: tail follow-through, ears that lag the head, head stabilisation,
  * every pose is built from body-level controls (torso, spine arch/bend, neck, ears, tail, four paws), not bone by bone.
World: cat faces -Y, Z up, the cat's left = +X. Angles in degrees. Lengths are in 'k' units (cat-size normalised).
"""
import bpy, math
from mathutils import Vector, Quaternion, Matrix, Euler

PI = math.pi
FPS = 30
def clamp(x, a, b): return a if x < a else b if x > b else x
def sm(x): x = clamp(x, 0.0, 1.0); return x * x * (3 - 2 * x)
def lerp(a, b, u): return a + (b - a) * u
def qax(axis, deg): return Quaternion(Vector(axis), math.radians(deg))
LEGS = ('FL', 'FR', 'BL', 'BR')

# ------------------------------------------------------------------ pose parameters
DEFAULT = dict(x=0, y=0, z=0, pitch=0, roll=0, yaw=0, arch=0, bend=0, twist=0, hip=0,
               np=0, ny=0, nr=0, hpt=0, hy=0,
               eF=0, eO=0, eL=0, eR=0,
               tl=0, tc=0, ts=0, tw=0, tph=0, tt=0,
               scL=0, scR=0, cF=0, cB=0)
for _l in LEGS:
    for _c in ('dx', 'dy', 'dz', 'fx', 'ft', 'tw'): DEFAULT[_l + _c] = 0.0

class P(dict):
    def __init__(s, base=None, **kw):
        super().__init__(DEFAULT);
        if base: s.update(base)
        s.update(kw)
    def __add__(s, o): return P({k: s[k] + o.get(k, 0) for k in s})
    def __mul__(s, f): return P({k: v * f for k, v in s.items()})
    def mix(s, o, u): return P({k: s[k] + (o[k] - s[k]) * u for k in s})
    def plus(s, **kw):
        q = P(s)
        for k, v in kw.items(): q[k] = q[k] + v
        return q
    def set(s, **kw):
        q = P(s); q.update(kw); return q

def catmull(keys, t, loop_len=None):
    """keys: [(t, value)] value: float or P. Catmull-Rom through the keys, clamped ends (or wrapped if loop_len)."""
    n = len(keys)
    if n == 1: return keys[0][1]
    if loop_len:
        t = t % loop_len
        ks = [(keys[-1][0] - loop_len, keys[-1][1])] + keys + [(keys[0][0] + loop_len, keys[0][1]), (keys[1][0] + loop_len, keys[1][1])]
        if ks[1][0] > 0: ks = [(keys[-2][0] - loop_len, keys[-2][1])] + ks
    else:
        if t <= keys[0][0]: return keys[0][1]
        if t >= keys[-1][0]: return keys[-1][1]
        ks = [keys[0]] + keys + [keys[-1]]
    for i in range(1, len(ks) - 2):
        t1, t2 = ks[i][0], ks[i + 1][0]
        if t1 <= t <= t2:
            t0, t3 = ks[i - 1][0], ks[i + 2][0]; p0, p1, p2, p3 = ks[i - 1][1], ks[i][1], ks[i + 1][1], ks[i + 2][1]
            h = max(1e-6, t2 - t1); u = (t - t1) / h
            # non-uniform Catmull-Rom tangents (scaled to this segment)
            def tan(pa, pb, ta, tb): return (pb - pa) * (1.0 / max(1e-6, tb - ta)) * h if not isinstance(pa, P) else (pb + pa * -1) * (h / max(1e-6, tb - ta))
            m1 = tan(p0, p2, t0, t2); m2 = tan(p1, p3, t1, t3)
            u2, u3 = u * u, u * u * u
            a, b, c, d = 2 * u3 - 3 * u2 + 1, u3 - 2 * u2 + u, -2 * u3 + 3 * u2, u3 - u2
            if isinstance(p1, P): return p1 * a + m1 * b + p2 * c + m2 * d
            return p1 * a + m1 * b + p2 * c + m2 * d
    return ks[-2][1]

# ------------------------------------------------------------------ rig access
class CatRig:
    def __init__(s, name):
        s.name = name; s.a = bpy.data.objects['Rig_' + name]; B = s.a.data.bones; s.B = B
        s.k = B['spine_01'].head_local.z / 0.77
        s.rest_q = {b.name: b.matrix_local.to_quaternion() for b in B}
        s.tails = sorted([b.name for b in B if b.name.startswith('tail_')])
        s.spine = ['spine_01', 'spine_02', 'spine_03', 'spine_04']; s.neck = ['neck_01', 'neck_02', 'neck_03']
        s.deform = [b.name for b in B if b.use_deform]
        s.all = [b.name for b in B]
        s.paw_rest = {l: B['ctrl_paw_%s.%s' % ('f' if l[0] == 'F' else 'b', l[1])].head_local.copy() for l in LEGS}
        s.torso_rest = B['torso'].head_local.copy()
        s.scruff = (B['neck_01'].head_local * 0.6 + B['spine_04'].head_local * 0.4)

    def apply(s, p, extra=None):
        """p: P (body-level controls) -> pose bones. extra: {bone: Quaternion in rest-world frame} (secondary motion)."""
        k = s.k; pb = s.a.pose.bones; W = {}
        def rw(b, axis, deg):
            if abs(deg) < 1e-6 or b not in pb: return
            W[b] = qax(axis, deg) @ W.get(b, Quaternion())
        X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
        # torso (root of the body): pitch + = nose down, roll + = left side down, yaw + = turn left
        rw('torso', Z, p['yaw']); rw('torso', Y, -p['roll']); rw('torso', X, p['pitch'])
        # spine: arch + = back rounds up (each forward-pointing bone pitches nose-down), bend + = curve to the left
        for i, b in enumerate(s.spine):
            w = (0.22, 0.26, 0.27, 0.25)[i]
            rw(b, X, p['arch'] * w); rw(b, Z, p['bend'] * w); rw(b, Y, p['twist'] * w)
        rw('pelvis', X, -p['arch'] * 0.35 + p['hip']); rw('pelvis', Z, -p['bend'] * 0.3)
        # neck & head: np + = nose down, ny + = look left, nr + = tilt (left ear down)
        for i, b in enumerate(s.neck):
            w = (0.3, 0.33, 0.37)[i]; rw(b, X, p['np'] * w * 0.7); rw(b, Z, p['ny'] * w * 0.6)
        rw('head', X, p['np'] * 0.3 + p['hpt']); rw('head', Z, p['ny'] * 0.4 + p['hy']); rw('head', Y, -p['nr'])
        # ears: eF + = rotate back, eO + = out to the sides (airplane ears), eL/eR twitch
        for side, sg, tw in (('L', 1, p['eL']), ('R', -1, p['eR'])):
            rw('ear_01.' + side, X, -p['eF'] * 0.6 - tw * 0.6); rw('ear_01.' + side, Y, -sg * p['eO'] * 0.6)
            rw('ear_02.' + side, X, -p['eF'] * 0.4 - tw * 0.4); rw('ear_02.' + side, Y, -sg * p['eO'] * 0.4)
        # tail: tl lift at the base, tc curl spread along, ts side, tt tip curl, tw/tph a travelling S-wave
        n = len(s.tails)
        for i, b in enumerate(s.tails):
            u = i / max(1, n - 1)
            pitch = -p['tl'] * (1.6 if i < 2 else 0.0) / 2 - p['tc'] / n * (0.6 + 0.8 * u) - p['tt'] * (u > 0.7) * 3.0 / n
            side = p['ts'] / n * 1.0 + p['tw'] * math.sin(2 * PI * (p['tph'] - u * 0.8)) * (0.4 + u) / n * 2.0
            rw(b, X, pitch); rw(b, Z, side)
        # scapulae (shoulder blades rise and roll as the front legs reach)
        rw('scapula.L', X, -p['scL']); rw('scapula.R', X, -p['scR'])
        for b in pb: b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0); b.scale = (1, 1, 1)
        if extra:
            for b, q in extra.items(): W[b] = q @ W.get(b, Quaternion())
        for b, q in W.items():
            r = s.rest_q[b]; pb[b].rotation_quaternion = r.inverted() @ q @ r
        # locations: torso + paw controls (world deltas -> bone local)
        def setloc(b, v):
            m = s.B[b].matrix_local.to_3x3(); pb[b].location = m.inverted() @ v
        T = Vector((p['x'], p['y'], p['z'])) * k; setloc('torso', T)
        Qb = W.get('torso', Quaternion()); piv = s.torso_rest
        for l in LEGS:
            c = 'ctrl_paw_%s.%s' % ('f' if l[0] == 'F' else 'b', l[1])
            off = Vector((p[l + 'dx'], p[l + 'dy'], p[l + 'dz'])) * k; rest = s.paw_rest[l]
            carry = clamp(p['cF'] if l[0] == 'F' else p['cB'], 0.0, 1.0)
            planted = rest + off
            carried = piv + T + Qb @ (rest + off - piv)          # paw rides along with the body (lifted / held / lying)
            setloc(c, planted.lerp(carried, carry) - rest)
            q = (Qb.slerp(Quaternion(), 1 - carry)) @ qax(X, p[l + 'fx']) @ qax(Z, p[l + 'tw'])
            r = s.rest_q[c]; pb[c].rotation_quaternion = r.inverted() @ q @ r
            toes = ('toes_f.' if l[0] == 'F' else 'toes_b.') + l[1]
            r = s.rest_q[toes]; pb[toes].rotation_quaternion = r.inverted() @ qax(X, p[l + 'ft']) @ r

# ------------------------------------------------------------------ key poses (k units; tuned on the Meshy kittens)
STAND = P()
def legs(p, **kw):
    q = P(p)
    for k_, v in kw.items():
        for l in LEGS:
            if k_.startswith(l): q[k_] = v
    return q
SIT = P(z=-0.17, y=0.05, pitch=-38, arch=10, hip=8, np=26, tl=-10, tc=-35, ts=25,
        BLdy=-0.05, BRdy=-0.05, BLdz=0.0, BRdz=0.0, BLfx=-62, BRfx=-62, BLdx=0.02, BRdx=-0.02,
        FLdy=0.02, FRdy=0.02, FLfx=-6, FRfx=-6)
LOAF = P(z=-0.36, y=0.0, pitch=-2, arch=6, np=12, tl=-14, tc=-50, ts=55,
         FLdy=0.17, FRdy=0.17, FLdz=0.05, FRdz=0.05, FLfx=75, FRfx=75, FLft=30, FRft=30,
         BLdy=-0.04, BRdy=-0.04, BLfx=-70, BRfx=-70, BLdx=0.03, BRdx=-0.03)
CROUCH = P(z=-0.2, y=0.06, pitch=-8, arch=-8, np=10, eF=-10, tl=-6, tc=8,
           FLdy=-0.04, FRdy=-0.04, FLfx=8, FRfx=8, BLdy=-0.08, BRdy=-0.08, BLfx=-35, BRfx=-35)
LIE_SIDE = P(z=-0.42, roll=-78, x=-0.12, arch=-10, bend=12, np=-6, nr=40, tl=-6, tc=10, ts=20,
             FLdx=-0.35, FLdz=0.28, FRdx=-0.4, FRdz=0.16, BLdx=-0.32, BLdz=0.3, BRdx=-0.38, BRdz=0.14,
             FLfx=30, FRfx=40, BLfx=-20, BRfx=-30)
# carried by the scruff: the body hangs under the neck, legs tuck in (the scruff reflex), tail curls under
DANGLE = P(pitch=-78, z=0.25, arch=16, np=58, hpt=-8, eO=18, eF=6, tl=-30, tc=-80, cF=1, cB=1,
           FLdy=0.12, FRdy=0.12, FLdz=0.2, FRdz=0.2, FLfx=95, FRfx=95, FLft=40, FRft=40, FLdx=0.02, FRdx=-0.02,
           BLdy=-0.2, BRdy=-0.2, BLdz=0.3, BRdz=0.3, BLfx=-80, BRfx=-80, BLft=30, BRft=30)
REAR = P(pitch=-55, z=0.12, y=0.12, arch=-6, np=40, tl=5, tc=15,
         FLdz=0.45, FRdz=0.45, FLdy=0.06, FRdy=0.06, FLfx=70, FRfx=70, BLfx=-45, BRfx=-45, BLdy=-0.06, BRdy=-0.06)
PLAYBOW = P(pitch=22, z=-0.12, arch=-14, np=-30, tl=18, tc=20,
            FLdy=-0.16, FRdy=-0.16, FLfx=-20, FRfx=-20)
