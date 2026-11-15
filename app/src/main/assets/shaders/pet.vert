// Pulsify 3D pets (Meshy models): GPU skinning, up to 32 bones as 3x4 matrices. GLSL ES 1.00.
attribute vec3 aPos;
attribute vec4 aNrm;           // normal (signed, normalised) + gloss
attribute vec2 aUv;
attribute vec2 aEye;           // eye-local / screen-local coordinates (x4096 -> 1)
attribute vec4 aBone;
attribute vec4 aWeight;
attribute vec4 aCol;           // vertex colour (props), a = 1 for props
attribute vec2 aEye2;          // right eye (robot: back screen), same scale

uniform mat4 uVP;              // view-projection (GL space)
uniform mat4 uModel;           // Blender z-up -> GL y-up, facing turn
uniform vec4 uB[96];           // 32 bones x 3 rows

varying vec3 vN;
varying vec3 vP;
varying vec2 vUv;
varying vec2 vEye;
varying vec4 vCol;
varying vec2 vEye2;
varying float vGloss;

vec3 xf(int b, vec4 p) { return vec3(dot(uB[b * 3], p), dot(uB[b * 3 + 1], p), dot(uB[b * 3 + 2], p)); }
vec3 xn(int b, vec3 n) { return vec3(dot(uB[b * 3].xyz, n), dot(uB[b * 3 + 1].xyz, n), dot(uB[b * 3 + 2].xyz, n)); }

void main() {
    vec4 p = vec4(aPos, 1.0);
    vec3 n = aNrm.xyz;
    vec3 sp = vec3(0.0); vec3 sn = vec3(0.0);
    int b0 = int(aBone.x + 0.5); int b1 = int(aBone.y + 0.5); int b2 = int(aBone.z + 0.5); int b3 = int(aBone.w + 0.5);
    sp += aWeight.x * xf(b0, p); sn += aWeight.x * xn(b0, n);
    if (aWeight.y > 0.0) { sp += aWeight.y * xf(b1, p); sn += aWeight.y * xn(b1, n); }
    if (aWeight.z > 0.0) { sp += aWeight.z * xf(b2, p); sn += aWeight.z * xn(b2, n); }
    if (aWeight.w > 0.0) { sp += aWeight.w * xf(b3, p); sn += aWeight.w * xn(b3, n); }
    vec4 wp = uModel * vec4(sp, 1.0);
    gl_Position = uVP * wp;
    vP = wp.xyz;
    vN = normalize(mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz) * sn);
    vUv = vec2(aUv.x, 1.0 - aUv.y);
    vEye = aEye / 4096.0;
    vEye2 = aEye2 / 4096.0;
    vCol = aCol;
    float g = aNrm.w * 127.0; if (g < -0.5) g += 256.0;
    vGloss = g / 255.0;
}
