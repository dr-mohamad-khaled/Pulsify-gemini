"""Reaper v2 (Meshy FBX with all Mixamo motions) -> PET3 for the Pulsify preview / app.
blender -b --python export_reaper2.py -- <fbx> <out_dir>
Same normalisation as the old rig_r.py (rotation/scale applied, paws on z=0) so face.json eye positions still fit.
"""
import bpy, bmesh, sys, os, json, math, struct
import numpy as np
from mathutils import Vector, Matrix

fbx, OUT = sys.argv[sys.argv.index('--') + 1:]
HERE = os.path.dirname(os.path.abspath(__file__))
FACE = json.load(open(os.path.join(HERE, 'face.json'))); MERGE = json.load(open(os.path.join(HERE, 'merge.json')))
SCALE = 0.6; STEP = 2; NCTL = 12; GLOSS = 0.25; EYEMODE = 3
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx, automatic_bone_orientation=False)
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
body = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
rig.animation_data.action = None
for o in bpy.context.scene.objects: o.select_set(o in (rig, body))
bpy.context.view_layer.objects.active = rig
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
bpy.context.view_layer.update()
zmin = min(v.co.z for v in body.data.vertices)
rig.location.z -= zmin
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
bpy.context.view_layer.update()
print('ZMIN', zmin, 'old zshift', FACE['zshift'])
me = body.data
print('BODY matrix identity?', body.matrix_world == Matrix.Identity(4), 'parent', body.parent)

# ---- merge Meshy's per-face split vertices (keeps UV seams: UVs live on loops) ----
bm = bmesh.new(); bm.from_mesh(me)
before = len(bm.verts); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(me); bm.free()
print('MERGE', before, '->', len(me.vertices))
# ---- fold the merged bones' weights into their targets ----
for src, dst in MERGE.items():
    gs = body.vertex_groups.get(src)
    if not gs: continue
    gd = body.vertex_groups.get(dst) or body.vertex_groups.new(name=dst)
    for v in me.vertices:
        for g in v.groups:
            if g.group == gs.index and g.weight > 0: gd.add([v.index], g.weight, 'ADD')
    body.vertex_groups.remove(gs)
# ---- smooth: one Catmull-Clark level (weights + UVs are interpolated by the modifier) ----
sub = body.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1; sub.uv_smooth = 'PRESERVE_CORNERS'
arm_mod = next((m for m in body.modifiers if m.type == 'ARMATURE'), None)
# subsurf must come before the armature modifier when applied in rest pose
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
while body.modifiers[0].name != 'sub': bpy.ops.object.modifier_move_up(modifier='sub')
rig.data.pose_position = 'REST'; bpy.context.view_layer.update()
bpy.ops.object.modifier_apply(modifier='sub')
me = body.data
print('SUBDIV verts', len(me.vertices), 'faces', len(me.polygons))

skin = [b.name for b in rig.data.bones if body.vertex_groups.get(b.name) is not None]
assert len(skin) <= 40, len(skin)
bidx = {n: i for i, n in enumerate(skin)}
print('SKIN', len(skin))

# ---- eye UV layers (front projection, as rig_r.py did) ----
deps = bpy.context.evaluated_depsgraph_get()
eyes = {e['side']: e for e in FACE['eyes']}
bev = body.evaluated_get(deps)
for e in eyes.values():
    ok, loc, nrm, _ = bev.ray_cast(Vector((e['x'], -3, e['z'])), Vector((0, 1, 0)))
    e['P'] = loc; print('EYE', e['side'], ok, tuple(round(x, 3) for x in loc))

# ---- geometry ----
me.calc_loop_triangles()
uv0 = me.uv_layers[0].data
gnames = {g.index: g.name for g in body.vertex_groups}
nrm = np.array([tuple(v.normal) for v in me.vertices], np.float32)
ed = np.array([tuple(e.vertices) for e in me.edges], np.int64)
for _ in range(2):
    acc = nrm.copy(); np.add.at(acc, ed[:, 0], nrm[ed[:, 1]]); np.add.at(acc, ed[:, 1], nrm[ed[:, 0]])
    nrm = acc / np.maximum(1e-6, np.linalg.norm(acc, axis=1, keepdims=True))
vw = []
for v in me.vertices:
    ws = [(bidx[gnames[g.group]], g.weight) for g in v.groups if gnames.get(g.group) in bidx and g.weight > 0.001]
    ws.sort(key=lambda a: -a[1]); ws = ws[:4]; s = sum(w for _, w in ws) or 1.0
    ws = [(b, w / s) for b, w in ws] + [(0, 0.0)] * (4 - len(ws))
    q = [int(round(w * 255)) for _, w in ws]; q[0] += 255 - sum(q); vw.append(([b for b, _ in ws], q))
def eye_uv(e, c, n):
    if c.y < e['P'].y + 0.10 and n[1] < 0.3: return ((c.x - e['x']) / e['r'], (c.z - e['z']) / e['r'])
    return (7.9, 7.9)
verts, vmap, idx = [], {}, []
for tri in me.loop_triangles:
    for li in tri.loops:
        vi = me.loops[li].vertex_index; c = me.vertices[vi].co; uv = tuple(uv0[li].uv)
        key = (vi, round(uv[0], 5), round(uv[1], 5))
        if key not in vmap:
            eid = (eye_uv(eyes['L'], c, nrm[vi]), eye_uv(eyes['R'], c, nrm[vi]))
            eid = tuple(u if abs(u[0]) < 7.5 and abs(u[1]) < 7.5 else (7.9, 7.9) for u in eid)
            verts.append((tuple(x * SCALE for x in c), tuple(nrm[vi]), int(GLOSS * 255), uv, vw[vi][0], vw[vi][1], eid)); vmap[key] = len(verts) - 1
        idx.append(vmap[key])
body_h = max(v.co.z for v in me.vertices) * SCALE
print('VERTS', len(verts), 'TRIS', len(idx) // 3, 'H', round(body_h, 3))

# ---- clips: every FBX action, sampled at 30 fps and stored every STEP frames; root motion removed ----
rig.data.pose_position = 'POSE'
NAMES = {'Alert': ('Idle', True), 'Walking': ('Walk', True), 'Running': ('Run', True), 'Cautious_Crouch_Walk_Left_inplace': ('Sneak', True),
         'All_Night_Dance': ('DanceNight', False), 'Cardio_Dance': ('DanceCardio', False), 'Denim_Pop_Dance': ('DancePop', False),
         'Hip_Hop_Dance_2': ('DanceHipHop', False), 'Hip_Hop_Dance_3': ('DanceHipHop2', False), 'mage_soell_cast_5': ('SpellCast', False),
         'Charged_Upward_Slash': ('Slash', False), 'Boxing_Guard_Right_Straight_Kick': ('Kick', False),
         'Climb_Attempt_and_Fall_1': ('Stumble', False), 'Climb_Attempt_and_Fall_5': ('Tumble', False)}
inv_bind = {n: rig.data.bones[n].matrix_local.inverted() for n in skin}
hips = rig.pose.bones['mixamorig:Hips']
sc = bpy.context.scene
blob = bytearray(); nclips = 0; meta = {}
for act in bpy.data.actions:
    key = act.name.split('|')[1] if '|' in act.name else act.name
    if key not in NAMES: print('skip', act.name); continue
    app, loop = NAMES[key]
    rig.animation_data.action = act
    if getattr(rig.animation_data, 'action_slot', None) is None and act.slots: rig.animation_data.action_slot = act.slots[0]
    f0, f1 = (int(round(x)) for x in act.frame_range)
    frames = list(range(f0, f1 + 1, STEP))
    if not loop and frames[-1] != f1: frames.append(f1)
    sc.frame_set(f0); h0 = (rig.matrix_world @ hips.head).copy()
    mats = np.zeros((len(frames), len(skin), 3, 4), np.float32)
    for i, f in enumerate(frames):
        sc.frame_set(f)
        hp = rig.matrix_world @ hips.head; off = Matrix.Translation((-(hp.x - h0.x), -(hp.y - h0.y), 0))
        for j, n in enumerate(skin):
            m = off @ rig.matrix_world @ rig.pose.bones[n].matrix @ inv_bind[n]
            a = np.array(m, np.float32)[:3]; a[:, 3] *= SCALE; mats[i, j] = a
    # controls: blinks every ~3 s, eyes straight, the reaper's 'trying to look mean' brow
    ctl = np.zeros((len(frames), NCTL), np.float32)
    t = np.arange(len(frames)) * STEP / 30.0
    for bt in np.arange(1.3, t[-1] if len(t) else 0, 3.1):
        k = np.clip(1 - np.abs(t - bt) / 0.09, 0, 1); ctl[:, 0] = np.maximum(ctl[:, 0], k); ctl[:, 1] = np.maximum(ctl[:, 1], k)
    ctl[:, 8] = -0.25; ctl[:, 10] = 1.0
    nb = app.encode(); blob += struct.pack('<B', len(nb)) + nb + struct.pack('<HB', len(frames), 1 if loop else 0)
    blob += mats.reshape(len(frames), -1).astype(np.float16).tobytes() + ctl.astype(np.float16).tobytes()
    nclips += 1; meta[app] = len(frames) * STEP / 30.0
    print('CLIP', app, len(frames))
# head chain for runtime look-at: bone indices of each subtree + pivots (model space, scaled)
def subtree(name): return [bidx[b.name] for b in rig.data.bones[name].children_recursive if b.name in bidx] + ([bidx[name]] if name in bidx else [])
look = {'neck': subtree('mixamorig:Neck'), 'head': subtree('mixamorig:Head'),
        'neckPivot': [x * SCALE for x in rig.data.bones['mixamorig:Neck'].head_local], 'headPivot': [x * SCALE for x in rig.data.bones['mixamorig:Head'].head_local],
        'neckBone': bidx.get('mixamorig:Neck'), 'headBone': bidx.get('mixamorig:Head'), 'spine2': bidx.get('mixamorig:Spine2'), 'clips': meta}
json.dump(look, open(os.path.join(OUT, 'reaper2.json'), 'w'))
lid = FACE['lid']; lash = (0.05, 0.03, 0.03); iris = [*eyes['L']['ioff'], *eyes['R']['ioff']]
u32 = len(verts) >= 65536
with open(os.path.join(OUT, 'reaper2.pet'), 'wb') as f:
    f.write(b'PET3' + struct.pack('<IIIIffIII', len(verts), len(idx), len(skin), nclips, body_h, 30.0 / STEP, EYEMODE, NCTL, 1 if u32 else 0))
    f.write(struct.pack('<6f', *lid, *lash)); f.write(struct.pack('<4f', *iris))
    for (p, nn, g, uv, bs, ws, eid) in verts:
        f.write(struct.pack('<3f', *p)); f.write(struct.pack('<3bB', *[int(max(-127, min(127, round(x * 127)))) for x in nn], g))
        f.write(struct.pack('<2H', *[int(max(0, min(65535, round((x % 1.0 if x != 1.0 else 1.0) * 65535)))) for x in uv]))
        f.write(struct.pack('<2h', *[int(max(-32767, min(32767, round(x * 4096)))) for x in eid[0]]))
        f.write(struct.pack('<4B', *bs)); f.write(struct.pack('<4B', *ws)); f.write(struct.pack('<4B', 0, 0, 0, 0))
        f.write(struct.pack('<2h', *[int(max(-32767, min(32767, round(x * 4096)))) for x in eid[1]]))
    f.write(struct.pack(f'<{len(idx)}{"I" if u32 else "H"}', *idx)); f.write(blob)
print('WROTE', os.path.getsize(os.path.join(OUT, 'reaper2.pet')), 'clips', nclips)
