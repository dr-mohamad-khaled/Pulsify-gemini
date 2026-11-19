"""Cats v3 -> PET3 (flags bit0 = u32 indices, bit1 = dual-quaternion skinning). blender -b cats_v3.blend --python export_cats3.py -- <out_dir> [cats]"""
import bpy, sys, os, struct, math
import numpy as np
from mathutils import Matrix, Vector
sys.path.insert(0, '/home/claude/cats')
import catanim3 as C, clips3 as L
args = sys.argv[sys.argv.index('--') + 1:]; OUT = args[0]; CATS = args[1].split(',') if len(args) > 1 else ['Snow', 'Cream', 'Grey']
os.makedirs(OUT, exist_ok=True)
NCTL = 12; GLOSS = 0.12
for cat in CATS:
    R = C.CatRig(cat); rig = R.a; mesh = bpy.data.objects['Cat_' + cat]
    rig.data.pose_position = 'REST'; bpy.context.view_layer.update()
    skin = [b.name for b in rig.data.bones if b.use_deform]; bidx = {n: i for i, n in enumerate(skin)}
    assert len(skin) <= 60
    if len(mesh.data.vertices) < 8000:     # low-poly coat (Grey): one smooth subdivision; vertex weights are interpolated
        bpy.context.view_layer.objects.active = mesh; sub = mesh.modifiers.new('sub', 'SUBSURF'); sub.levels = 1
        while mesh.modifiers[0].name != 'sub': bpy.ops.object.modifier_move_up(modifier='sub')
        bpy.ops.object.modifier_apply(modifier='sub')
    me = mesh.data; mw = mesh.matrix_world
    co = np.array([tuple(mw @ v.co) for v in me.vertices], np.float64)
    paws = np.array([tuple(R.paw_rest[l] + rig.location) for l in C.LEGS])
    cx, cy = paws[:, 0].mean(), paws[:, 1].mean(); zmin = co[:, 2].min(); S = 1.0 / (co[:, 2].max() - zmin)
    N = Matrix.Diagonal((S, S, S, 1)) @ Matrix.Translation((-cx, -cy, -zmin)); Ni = N.inverted()
    pos = (co - [cx, cy, zmin]) * S
    nrm = np.array([tuple((mw.to_3x3() @ v.normal).normalized()) for v in me.vertices], np.float32)
    ed = np.array([tuple(e.vertices) for e in me.edges], np.int64)
    for _ in range(2):
        acc = nrm.copy(); np.add.at(acc, ed[:, 0], nrm[ed[:, 1]]); np.add.at(acc, ed[:, 1], nrm[ed[:, 0]])
        nrm = acc / np.maximum(1e-6, np.linalg.norm(acc, axis=1, keepdims=True))
    gname = {g.index: g.name for g in mesh.vertex_groups}; vw = []
    for v in me.vertices:
        ws = sorted([(bidx[gname[g.group]], g.weight) for g in v.groups if gname.get(g.group) in bidx and g.weight > 0.001], key=lambda a: -a[1])[:4]
        s = sum(w for _, w in ws) or 1.0; ws = [(b, w / s) for b, w in ws] + [(0, 0.0)] * (4 - len(ws))
        q = [int(round(w * 255)) for _, w in ws]; q[0] += 255 - sum(q); vw.append(([b for b, _ in ws], q))
    me.calc_loop_triangles(); uv0 = me.uv_layers[0].data
    verts, vmap, idx = [], {}, []
    for tri in me.loop_triangles:
        for li in tri.loops:
            vi = me.loops[li].vertex_index; uv = tuple(uv0[li].uv); key = (vi, round(uv[0], 5), round(uv[1], 5))
            if key not in vmap: vmap[key] = len(verts); verts.append((vi, uv))
            idx.append(vmap[key])
    # clips: evaluate the pose (IK included) per frame -> normalised skin matrices
    rig.data.pose_position = 'POSE'
    inv_bind = [rig.data.bones[n].matrix_local.inverted() for n in skin]; RW = rig.matrix_world
    blob = bytearray(); nclip = 0; STEP = 1
    for name, (dur, loop, fn) in L.CLIPS.items():
        poses = L.secondary(fn, dur, loop)
        fr = len(poses); mats = np.zeros((fr, len(skin), 3, 4), np.float32)
        for i, p in enumerate(poses):
            R.apply(p); bpy.context.view_layer.update()
            for j, n in enumerate(skin):
                m = N @ RW @ rig.pose.bones[n].matrix @ inv_bind[j] @ RW.inverted() @ Ni
                mats[i, j] = np.array(m, np.float32)[:3]
        ctl = np.zeros((fr, NCTL), np.float32); ctl[:, 10] = 1.0
        nb = name.encode(); blob += struct.pack('<B', len(nb)) + nb + struct.pack('<HB', fr, 1 if loop else 0)
        blob += mats.reshape(fr, -1).astype(np.float16).tobytes() + ctl.astype(np.float16).tobytes(); nclip += 1
        print(cat, name, fr, flush=True)
    u32 = len(verts) >= 65536; flags = (1 if u32 else 0) | 2
    with open(os.path.join(OUT, 'cat_%s.pet' % cat.lower()), 'wb') as f:
        f.write(b'PET3' + struct.pack('<IIIIffIII', len(verts), len(idx), len(skin), nclip, 1.0, float(30 // STEP), 0, NCTL, flags))
        f.write(struct.pack('<6f', 0, 0, 0, 0, 0, 0))
        for vi, uv in verts:
            p = pos[vi]; nn = nrm[vi]; bs, ws = vw[vi]
            f.write(struct.pack('<3f', *p)); f.write(struct.pack('<3bB', *[int(max(-127, min(127, round(x * 127)))) for x in nn], int(GLOSS * 255)))
            f.write(struct.pack('<2H', *[int(max(0, min(65535, round((x % 1.0 if x != 1.0 else 1.0) * 65535)))) for x in uv]))
            f.write(struct.pack('<2h', 32358, 32358)); f.write(struct.pack('<4B', *bs)); f.write(struct.pack('<4B', *ws)); f.write(struct.pack('<4B', 0, 0, 0, 0)); f.write(struct.pack('<2h', 32358, 32358))
        f.write(struct.pack(f'<{len(idx)}{"I" if u32 else "H"}', *idx)); f.write(blob)
    print('WROTE', cat, len(verts), len(idx) // 3, 'bones', len(skin), 'clips', nclip, os.path.getsize(os.path.join(OUT, 'cat_%s.pet' % cat.lower())), flush=True)
