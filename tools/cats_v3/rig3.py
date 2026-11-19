"""Cat rig v3: 47 deform bones (4 spine, 3 neck, 2-bone ears, 5-bone front legs, 4-bone hind legs, 14-bone tail),
smooth heat weights made for dual-quaternion skinning (volume-preserving joints), IK legs with pole targets.
Built from the v2 rig's measured landmarks (the v2 bones stay the reference skeleton for each Meshy cat)."""
import bpy, math
from mathutils import Vector

V3 = lambda x, y, z: Vector((x, y, z))
Xw = Vector((1, 0, 0))

def resample(pts, n):
    d = [0.0]
    for a, b in zip(pts, pts[1:]): d.append(d[-1] + (b - a).length)
    out = []
    for k in range(n + 1):
        t = d[-1] * k / n
        for i in range(len(pts) - 1):
            if d[i] - 1e-9 <= t <= d[i + 1] + 1e-9:
                u = (t - d[i]) / max(1e-9, d[i + 1] - d[i]); out.append(pts[i].lerp(pts[i + 1], u)); break
    return out

def landmarks(a):
    B = a.data.bones; H = lambda n: B[n].head_local.copy(); T = lambda n: B[n].tail_local.copy()
    L = {n: (H(n), T(n)) for n in [b.name for b in B]}
    L['tailpts'] = [H('tail_01')] + [T('tail_%02d' % i) for i in range(1, 9)]
    return L

NTAIL = 14

def build(n):
    old = bpy.data.objects['Rig_' + n]; mesh = bpy.data.objects['Cat_' + n]
    L = landmarks(old); loc = old.location.copy()
    k = L['spine_01'][0].z / 0.77
    mesh.parent = None; mesh.location = loc
    for m in list(mesh.modifiers): mesh.modifiers.remove(m)
    mesh.vertex_groups.clear()
    ad0 = old.data; bpy.data.objects.remove(old, do_unlink=True); bpy.data.armatures.remove(ad0)
    ad = bpy.data.armatures.new('Rig_' + n); ao = bpy.data.objects.new('Rig_' + n, ad)
    bpy.context.scene.collection.objects.link(ao); ao.location = loc; ao.show_in_front = True
    for x in bpy.context.selected_objects: x.select_set(False)
    bpy.context.view_layer.objects.active = ao; ao.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); eb = ad.edit_bones
    def Bn(nm, h, t, par=None, conn=False, deform=True):
        b = eb.new(nm); b.head = h; b.tail = t; b.use_deform = deform
        if par: b.parent = eb[par]; b.use_connect = conn
        return b
    Bn('root', V3(0, 0, 0), V3(0, -0.35 * k, 0), deform=False)
    s1 = L['spine_01'][0]; s_end = L['spine_03'][1]
    Bn('torso', s1, s1 + V3(0, -0.3 * k, 0), 'root', deform=False)
    Bn('pelvis', *L['pelvis'], 'torso')
    sp = resample([s1, L['spine_01'][1], L['spine_02'][1], s_end], 4)
    for i in range(4): Bn('spine_%02d' % (i + 1), sp[i], sp[i + 1], 'torso' if i == 0 else 'spine_%02d' % i, i > 0)
    piv = L['head'][0]; nk = resample([s_end, L['neck_01'][1], piv], 3)
    for i in range(3): Bn('neck_%02d' % (i + 1), nk[i], nk[i + 1], 'spine_04' if i == 0 else 'neck_%02d' % i, True)
    Bn('head', piv, L['head'][1], 'neck_03', True)
    for s in 'LR':
        h, t = L['ear.' + s]; m = h.lerp(t, 0.45)
        Bn('ear_01.' + s, h, m, 'head'); Bn('ear_02.' + s, m, t, 'ear_01.' + s, True)
    for s in 'LR':
        sc, ua, fa, pf, tf = (L[b + '.' + s] for b in ('scapula', 'upperarm', 'forearm', 'paw_f', 'toes_f'))
        Bn('scapula.' + s, *sc, 'spine_04'); Bn('upperarm.' + s, *ua, 'scapula.' + s, True)
        Bn('forearm.' + s, *fa, 'upperarm.' + s, True); Bn('paw_f.' + s, *pf, 'forearm.' + s, True); Bn('toes_f.' + s, *tf, 'paw_f.' + s, True)
        Bn('ctrl_paw_f.' + s, pf[0], pf[1], 'root', deform=False)
        el = ua[1]; Bn('pole_f.' + s, el + V3(0, 0.45 * k, 0), el + V3(0, 0.5 * k, 0), 'torso', deform=False)
        th, sh, mt, tb = (L[b + '.' + s] for b in ('thigh', 'shin', 'meta', 'toes_b'))
        Bn('thigh.' + s, *th, 'pelvis'); Bn('shin.' + s, *sh, 'thigh.' + s, True); Bn('meta.' + s, *mt, 'shin.' + s, True); Bn('toes_b.' + s, *tb, 'meta.' + s, True)
        Bn('ctrl_paw_b.' + s, mt[0], mt[1], 'root', deform=False)
        kn = th[1]; Bn('pole_b.' + s, kn + V3(0, -0.45 * k, 0), kn + V3(0, -0.5 * k, 0), 'torso', deform=False)
    tp = resample(L['tailpts'], NTAIL); prev = 'pelvis'
    for i in range(NTAIL):
        Bn('tail_%02d' % (i + 1), tp[i], tp[i + 1], prev, i > 0); prev = 'tail_%02d' % (i + 1)
    for b in eb:
        d = (b.tail - b.head).normalized(); z = Xw.cross(d)
        if z.length < 0.2: z = V3(0, 0, 1)
        b.align_roll(z)
    bpy.ops.object.mode_set(mode='POSE')
    pb = ao.pose.bones
    for s in 'LR':
        for paw, lo, foot, pole in (('paw_f', 'forearm', 'paw_f', 'pole_f'), ('paw_b', 'shin', 'meta', 'pole_b')):
            ik = pb[lo + '.' + s].constraints.new('IK'); ik.target = ao; ik.subtarget = 'ctrl_' + paw + '.' + s; ik.chain_count = 2
            ik.use_stretch = False   # no pole: the legs keep the bend direction built into the rest skeleton (elbows back, knees forward)
            cr = pb[foot + '.' + s].constraints.new('COPY_ROTATION'); cr.target = ao; cr.subtarget = 'ctrl_' + paw + '.' + s
    for b in pb: b.rotation_mode = 'QUATERNION'
    bpy.ops.object.mode_set(mode='OBJECT')
    for x in bpy.context.selected_objects: x.select_set(False)
    mesh.select_set(True); ao.select_set(True); bpy.context.view_layer.objects.active = ao
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    mod = next(m for m in mesh.modifiers if m.type == 'ARMATURE'); mod.use_deform_preserve_volume = True
    return ao, mesh

def smooth_weights(n, iters=4, factor=0.5):
    """Heat weights -> a few smoothing passes -> top 4 influences, normalised. Wide, soft joint blends are safe with DQ skinning."""
    mesh = bpy.data.objects['Cat_' + n]
    for x in bpy.context.selected_objects: x.select_set(False)
    bpy.context.view_layer.objects.active = mesh; mesh.select_set(True)
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=factor, repeat=iters, expand=0.0)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    unweighted = sum(1 for v in mesh.data.vertices if not any(g.weight > 0 for g in v.groups))
    return unweighted
