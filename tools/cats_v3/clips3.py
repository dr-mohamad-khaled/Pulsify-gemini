"""Pulsify cats v3 clip library (36 clips, same names the app uses). Each clip: (duration s, loop, fn(t)->P)."""
import math, random
from catanim3 import P, STAND, SIT, LOAF, CROUCH, LIE_SIDE, DANGLE, REAR, PLAYBOW, catmull, sm, clamp, LEGS
PI = math.pi
DANGLE = DANGLE.set(np=58, hpt=8)
def S(t, f, ph=0.0): return math.sin(2 * PI * (t * f + ph))
def keys(lst, loop=None): return lambda t: catmull(lst, t, loop)
def breathe(t, a=1.0): return P(arch=1.6 * a * S(t, .42), z=0.004 * a * S(t, .42, .25))
def tailwave(t, a=8.0, f=.35): return P(tw=a, tph=t * f)

# ------------------------------------------------------------------ gaits (paws planted, curl when lifted)
def gait(t, T, ph, duty, stride, lift, flexF=80, flexB=-55, bob=0.012, roll=3.0, arch=0.0):
    p = P(); u = (t / T) % 1.0
    for l in LEGS:
        f = (u - ph[l]) % 1.0; front = l[0] == 'F'
        if f < duty:                                   # stance: paw slides back under the moving body
            s_ = f / duty; p[l + 'dy'] = stride * (-0.5 + s_); p[l + 'fx'] = (-8 if front else 10) * (1 - s_) + (6 if front else -18) * s_
        else:                                          # swing: lift, curl the wrist / hock, reach forward and flatten before touch-down
            s_ = (f - duty) / (1 - duty); e = sm(s_)
            p[l + 'dy'] = stride * (0.5 - e); p[l + 'dz'] = lift * math.sin(PI * s_) ** 0.85
            curl = math.sin(PI * min(1.0, s_ * 1.25)) ** 1.2
            p[l + 'fx'] = (flexF if front else flexB) * curl + (-10 if front else 8) * sm((s_ - 0.75) / 0.25)
            p[l + 'ft'] = (25 if front else 15) * curl
    # body: dips at each footfall, rolls with the hind legs, shoulder blades pump with the front legs
    p['z'] = -bob * abs(S(t, 2 / T)); p['roll'] = roll * S(t, 1 / T, ph['BL']); p['bend'] = 3 * S(t, 1 / T, .1)
    p['scL'] = 9 * S(t, 1 / T, ph['FL'] + .1); p['scR'] = 9 * S(t, 1 / T, ph['FR'] + .1)
    p['np'] = bob * 120 * abs(S(t, 2 / T, .12)) * 0.4    # head stays level: small counter-nod
    p['arch'] = arch
    return p
WALK_PH = dict(BL=0.0, FL=0.25, BR=0.5, FR=0.75)
TROT_PH = dict(BL=0.0, FR=0.0, BR=0.5, FL=0.5)
GALLOP_PH = dict(BL=0.0, BR=0.08, FL=0.45, FR=0.55)

def walk(t):   return STAND + gait(t, 1.0, WALK_PH, .64, .42, .13) + P(tl=12, tc=-28, tt=10, eF=-4) + tailwave(t, 6, 1.0)
def trot(t):   return STAND + gait(t, .6, TROT_PH, .5, .5, .16, 90, -60, .02, 4) + P(tl=18, tc=-30, tt=12) + tailwave(t, 8, 1.66)
def gallop(t):
    T = .42; u = (t / T) % 1.0; g = gait(t, T, GALLOP_PH, .36, .75, .22, 100, -70, .0, 2)
    flex = math.cos(2 * PI * (u - .2))                  # spine gathers (arch) and stretches each stride
    return STAND + g + P(arch=16 * flex, pitch=-6 * math.sin(2 * PI * u), z=.05 * max(0, math.sin(2 * PI * (u - .6))), np=-6 * flex, tl=4, tc=-10, eF=12) + tailwave(t, 10, 2.4)

# ------------------------------------------------------------------ life clips
def idle(t):
    look = keys([(0, 0), (1.2, 0), (1.6, 14), (3.0, 14), (3.4, -6), (4.5, -6), (5.0, 0), (6, 0)], 6)(t)
    return STAND + breathe(t) + P(ny=look, np=-4 + 3 * S(t, .17), tl=10, tc=-24, tt=8, eL=6 * max(0, S(t, .5)) ** 30) + tailwave(t, 7, .3) + P(BLfx=0)
def look_around(t):
    ny = keys([(0, 0), (.5, 45), (1.4, 45), (2.0, -50), (2.9, -50), (3.4, 0), (3.6, 0)])(t)
    np_ = keys([(0, 0), (.5, -12), (1.4, -8), (2.0, -14), (2.9, -10), (3.4, 0)])(t)
    return STAND + breathe(t) + P(ny=ny, np=np_, nr=ny * .15, bend=ny * .15, eO=-ny * .1, tl=10, tc=-24) + tailwave(t, 8, .4)
def head_tilt(t):
    a = keys([(0, 0), (.35, 28), (1.1, 30), (1.4, -20), (2.0, -22), (2.4, 0)])(t)
    return STAND + breathe(t) + P(nr=a, np=-10 * sm(t / .3) * (1 - sm((t - 2.0) / .4)), eF=-6, tl=10, tc=-25) + tailwave(t, 6, .4)
def sit_down(t): return STAND.mix(SIT, sm(t / 1.0)) + P(np=6 * math.sin(PI * clamp(t, 0, 1)))
def sit_idle(t): return SIT + breathe(t) + P(ny=12 * S(t, .12), ts=SIT['ts'] + 6 * S(t, .3), eL=8 * max(0, S(t, .4)) ** 40)
def stand_up(t): return SIT.mix(STAND, sm(t / .9)) + P(pitch=4 * math.sin(PI * clamp(t / .9, 0, 1)))
def lie_down(t):
    mid = STAND.mix(LOAF, .5).plus(pitch=6, np=10)
    return keys([(0, STAND), (.55, mid), (1.2, LOAF)])(t)
def loaf(t): return LOAF + breathe(t, 1.3) + P(np=4 * S(t, .1), eL=10 * max(0, S(t, .33)) ** 40, ts=LOAF['ts'] + 5 * S(t, .2))
SLEEP = LOAF.set(np=34, hpt=10, nr=14, eO=14, eF=6, tc=-70, ts=80)
def sleep(t): return SLEEP + breathe(t, 2.0) + P(eR=10 * max(0, S(t, .21)) ** 60)
def wake_up(t):
    yawn = math.sin(PI * clamp((t - .4) / 1.2, 0, 1))
    return SLEEP.mix(LOAF, sm(t / .5)) + P(np=-25 * yawn, eO=8 * yawn, nr=-6 * yawn)
def get_up(t):
    return keys([(0, LOAF), (.5, STAND.mix(LOAF, .45).plus(pitch=-8)), (1.0, STAND)])(t)
def stretch(t):
    fwd = P(pitch=18, z=-.16, arch=-16, np=-22, FLdy=-.32, FRdy=-.32, FLfx=-25, FRfx=-25, FLft=-20, FRft=-20, tl=25, tc=20, eF=6)
    back = P(pitch=-6, z=-.02, arch=8, np=10, BLdy=.25, BRdy=.25, BLfx=30, BRfx=30, tl=-5, tc=-10)
    return keys([(0, STAND), (.6, STAND + fwd * .6), (1.5, STAND + fwd), (2.0, STAND + fwd * .8), (2.5, STAND + back), (3.2, STAND + back * .8), (3.8, STAND)])(t)
def pounce(t):
    wig = 3.5 * S(t, 4.5) * sm((t - .3) / .3) * (1 - sm((t - 1.4) / .1))
    crouch = CROUCH.plus(eF=-18)
    k = keys([(0, STAND), (.4, crouch), (1.4, crouch), (1.55, CROUCH.plus(z=.08, pitch=-10)),
              (1.75, STAND.set(z=.42, y=-.35, pitch=10, arch=-12, cF=.9, cB=.9, FLdy=-.25, FRdy=-.25, FLfx=-10, FRfx=-10, BLdy=.2, BRdy=.2, tl=10, tc=10)),
              (2.0, STAND.set(z=.05, y=-.6, pitch=12, FLdy=-.55, FRdy=-.55, BLdy=-.35, BRdy=-.35)), (2.25, CROUCH.set(y=-.6, FLdy=-.6, FRdy=-.6, BLdy=-.6, BRdy=-.6)),
              (2.8, STAND)])(t)
    return k + P(roll=wig * 1.5, ts=wig * 4, tw=4 if t < 1.4 else 0, tph=t * 3)
def groom(t):
    lick = max(0, S(t, 2.2)) if 0.6 < t < 3.0 else 0
    pose = SIT.set(np=40, ny=26, nr=10, FLdz=.28, FLdy=-.05, FLfx=70, cF=0)
    return keys([(0, STAND), (.5, SIT), (.9, pose), (3.0, pose), (3.5, SIT), (4.0, STAND)])(t) + P(np=-6 * lick, FLdz=.02 * lick)
def hiss(t):
    a = sm(t / .25) * (1 - sm((t - 1.6) / .4))
    puff = STAND.set(arch=30, z=.06, pitch=-4, np=-14, eF=40, eO=30, tl=30, tc=40, ts=0, FLdy=-.05, FRdy=-.05, BLdy=.06, BRdy=.06)
    return STAND.mix(puff, a) + P(nr=4 * S(t, 7) * a, tw=6 * a, tph=t * 4)
def swat(t):
    return keys([(0, SIT), (.25, SIT.set(np=-6, eF=-10)), (.4, SIT.set(FRdz=.42, FRdy=-.22, FRfx=40, cF=0, scR=14)),
                 (.55, SIT.set(FRdz=.3, FRdy=-.38, FRfx=-30, scR=20, ny=-6)), (.75, SIT.set(FRdz=.36, FRdy=-.2, FRfx=60)), (1.2, SIT)])(t)
def shake(t):
    a = math.sin(PI * clamp(t / 1.0, 0, 1))
    return STAND + P(twist=a * 18 * S(t, 6.5), nr=a * 30 * S(t, 6.5, .1), ny=a * 10 * S(t, 6.5, .2), ts=a * 25 * S(t, 6.5, .35), eO=a * 25 * abs(S(t, 6.5, .3)), z=.01 * a)
def flinch(t):
    a = math.exp(-t * 5) * sm(t / .05)
    return STAND + P(z=-.08 * a, y=.08 * a, pitch=-6 * a, np=-20 * a, eF=35 * a, eO=20 * a, tl=-15 * a, tc=-25 * a, ts=-20 * a) + breathe(t)
def hop(t):
    h = max(0, math.sin(PI * clamp((t - .25) / .45, 0, 1)))
    pre = sm(t / .25) * (1 - sm((t - .25) / .1)) + sm((t - .7) / .08) * (1 - sm((t - .9) / .2))
    return STAND + P(z=.32 * h - .08 * pre, cF=h, cB=h, FLfx=40 * h, FRfx=40 * h, FLdz=.06 * h, FRdz=.06 * h, BLfx=-40 * h, BRfx=-40 * h, pitch=-4 * h, tl=10 * h, eF=-8 * h)
def biscuits(t):
    p = SIT.set(np=12, eO=8, eF=4) + breathe(t, 1.4)
    l = max(0, S(t, 1.1)); r = max(0, S(t, 1.1, .5))
    return p + P(FLdz=.09 * l, FRdz=.09 * r, FLfx=35 * l - 8, FRfx=35 * r - 8, FLft=-25 * (1 - l), FRft=-25 * (1 - r), roll=2.5 * (l - r), nr=4 * (l - r))
def bat_air(t):
    up = REAR.plus(np=10)
    l = max(0, S(t, 1.6)); r = max(0, S(t, 1.6, .5))
    k = keys([(0, STAND), (.45, up), (2.2, up), (2.6, STAND)])(t)
    a = sm((t - .45) / .2) * (1 - sm((t - 2.0) / .2))
    return k + P(FLdz=.12 * l * a, FRdz=.12 * r * a, FLdy=-.12 * l * a, FRdy=-.12 * r * a, FLfx=-40 * l * a, FRfx=-40 * r * a, ny=8 * (l - r) * a, np=-10 * a)
def sneeze(t):
    wind = sm(t / .7) * (1 - sm((t - .82) / .05)); burst = math.exp(-max(0, t - .82) * 9) * (t > .82)
    return STAND + breathe(t) + P(np=-22 * wind + 30 * burst, eF=-10 * wind + 30 * burst, z=.03 * wind - .05 * burst, y=.05 * burst, nr=6 * burst)
def head_bunt(t):
    a = keys([(0, 0), (.4, 1), (.7, .3), (1.0, 1), (1.3, .3), (1.6, 1), (2.1, 0)])(t)
    return STAND + P(y=-.09 * a, np=18 * a, nr=22 * a, eO=12 * a, pitch=4 * a, FLdy=-.03 * a, FRdy=-.03 * a, tl=15, tc=-35, tt=15) + tailwave(t, 6, .8)
def spin_jump(t):
    u = clamp((t - .25) / .6, 0, 1); h = math.sin(PI * u)
    return STAND + P(z=.4 * h - .08 * (1 - sm(t / .25)) * (t < .3), yaw=360 * sm(u), cF=h, cB=h, FLfx=50 * h, FRfx=50 * h, BLfx=-45 * h, BRfx=-45 * h, ts=-40 * h, tl=15 * h, eO=10 * h)
def wave(t):
    w = S(t, 2.2) * sm((t - .5) / .2) * (1 - sm((t - 2.0) / .2))
    p = keys([(0, SIT), (.45, SIT.set(FRdz=.5, FRdy=-.15, FRfx=40, scR=18, cF=0, nr=-8)), (2.1, SIT.set(FRdz=.5, FRdy=-.15, FRfx=40, scR=18, nr=-8)), (2.5, SIT)])(t)
    return p + P(FRdx=-.06 * w, FRfx=25 * w, nr=4 * w) + breathe(t)
def groove(t):
    b = t * 2.0   # 120 bpm, beat = 0.5 s; clip is 4 s, the app phase-locks it to the music
    return STAND + P(z=-.035 * abs(S(b, .5)), roll=5 * S(b, .25), ny=12 * S(b, .25), np=8 * abs(S(b, .5)) - 4, nr=8 * S(b, .25, .1),
                     ts=30 * S(b, .25, .2), tl=15, tc=-20, eO=6 * abs(S(b, .5)), BLdz=.05 * max(0, S(b, .25)), BRdz=.05 * max(0, -S(b, .25)), BLfx=-20 * max(0, S(b, .25)), BRfx=-20 * max(0, -S(b, .25)))
def headbang(t):
    b = t * 2.0
    return SIT + P(np=26 * abs(S(b, .5)) - 10, nr=6 * S(b, .25), eF=-10 * abs(S(b, .5)), z=-.02 * abs(S(b, .5)), FLdz=.04 * max(0, S(b, .25)), FLfx=20 * max(0, S(b, .25)), ts=SIT['ts'] + 20 * S(b, .25))
def chase_tail(t):
    spin = 360 * 2 * sm(clamp((t - .6) / 2.6, 0, 1))
    k = sm(t / .5) * (1 - sm((t - 3.2) / .5))
    return STAND + gait(t, .5, TROT_PH, .5, .2 * k, .1 * k) + P(yaw=spin, bend=-34 * k, ny=-45 * k, np=10 * k, ts=60 * k, tl=-5, eF=-14 * k)
def roll_over(t):
    side = LIE_SIDE.set(cF=.85, cB=.85); belly = side.set(roll=-170, x=-.25, z=-.35, FLdz=.4, FRdz=.4, BLdz=.4, BRdz=.4, FLfx=80, FRfx=80, BLfx=-60, BRfx=-60, np=-20, nr=60)
    return keys([(0, STAND), (.6, LOAF.plus(roll=-15)), (1.2, side), (2.0, belly), (2.8, belly.plus(roll=8)), (3.4, side), (4.1, LOAF), (4.8, STAND)])(t)
def dangle(t):
    sw = S(t, .55)
    return DANGLE + P(roll=4 * sw, ny=10 * S(t, .3), BLdz=.04 * S(t, .55, .3), BRdz=.04 * S(t, .55, .8), ts=10 * sw, eL=10 * max(0, S(t, .4)) ** 30)
JUMP_AIR = STAND.set(z=.05, pitch=-8, cF=1, cB=1, FLdy=-.12, FRdy=-.12, FLfx=30, FRfx=30, BLdy=.12, BRdy=.12, BLfx=-30, BRfx=-30, eO=10, tl=20, tc=10)
def jump_air(t): return JUMP_AIR + P(tw=6, tph=t * 1.2, FLdz=.02 * S(t, 1.5), FRdz=.02 * S(t, 1.5, .5))
def jump_land(t):
    a = math.exp(-t * 6) * sm(t / .04)
    return STAND.mix(JUMP_AIR, max(0, 1 - t / .08)) + P(z=-.12 * a, pitch=6 * a, np=-12 * a, arch=-6 * a, eF=10 * a)
def pet_purr(t):
    lean = sm(t / .5)
    return STAND + breathe(t, 1.5) + P(np=-24 * lean, nr=18 * lean + 4 * S(t, .5), ny=8 * S(t, .25), pitch=-3 * lean, eF=12 * lean, eO=10 * lean, tl=20, tc=-38, tt=18) + tailwave(t, 4, .5)

CLIPS = {
    'Idle': (6.0, True, idle), 'Walk': (1.0, True, walk), 'Trot': (.6, True, trot), 'Gallop': (.42, True, gallop),
    'LookAround': (3.6, False, look_around), 'HeadTilt': (2.4, False, head_tilt), 'Groove': (4.0, True, groove), 'Headbang': (4.0, True, headbang),
    'SitDown': (1.0, False, sit_down), 'SitIdle': (8.0, True, sit_idle), 'StandUp': (.9, False, stand_up),
    'LieDown': (1.2, False, lie_down), 'Loaf': (10.0, True, loaf), 'Sleep': (9.6, True, sleep), 'WakeUp': (1.8, False, wake_up), 'GetUp': (1.0, False, get_up),
    'Stretch': (3.8, False, stretch), 'Pounce': (2.8, False, pounce), 'Groom': (4.0, False, groom), 'Hiss': (2.0, False, hiss), 'Swat': (1.2, False, swat),
    'Shake': (1.0, False, shake), 'Flinch': (1.0, False, flinch), 'Hop': (1.1, False, hop), 'Biscuits': (3.64, True, biscuits), 'BatAir': (2.6, False, bat_air),
    'Sneeze': (1.5, False, sneeze), 'HeadBunt': (2.1, False, head_bunt), 'SpinJump': (1.1, False, spin_jump), 'Wave': (2.5, False, wave),
    'ChaseTail': (3.7, False, chase_tail), 'RollOver': (4.8, False, roll_over), 'Dangle': (3.64, True, dangle),
    'JumpAir': (1.33, True, jump_air), 'JumpLand': (.6, False, jump_land), 'PetPurr': (4.0, True, pet_purr),
}

# secondary motion on the parameter channels: tail and ears overshoot and settle, the head lags a touch
SPRINGS = {'ts': (2.2, .35), 'tl': (2.4, .4), 'tc': (2.0, .4), 'tw': (3.0, .6), 'eF': (5.0, .35), 'eO': (5.0, .35), 'np': (6.0, .75), 'ny': (6.0, .75), 'nr': (5.0, .6)}
def secondary(fn, dur, loop, fps=30):
    n = int(round(dur * fps)) + 1; warm = n * 2 if loop else 0
    state = {}; out = []
    for i in range(-warm, n):
        t = (i % (n - 1)) / fps if loop else max(0, i) / fps
        p = fn(t)
        for c, (f, z) in SPRINGS.items():
            x, v = state.get(c, (p[c], 0.0)); w = 2 * PI * f; dt = 1 / fps
            for _ in range(4):
                a = w * w * (p[c] - x) - 2 * z * w * v; v += a * dt / 4; x += v * dt / 4
            state[c] = (x, v); p[c] = x
        if i >= 0: out.append(p)
    return out
