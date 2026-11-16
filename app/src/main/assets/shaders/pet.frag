// Pulsify 3D pets: the model's own colour texture, soft studio light, flush shader eyes that
// look around and blink, and the robot's glowing screen face. GLSL ES 1.00.
precision mediump float;
uniform sampler2D uTex;
uniform sampler2D uEyes;       // L | R eye crops (rim colour outside the iris)
uniform float uEyeMode;        // 0 none, 1 painted eyes, 2 robot screen
uniform vec4 uEyeL;            // blink, lookX, lookY, brow tilt (+ sad, - angry)
uniform vec4 uEyeR;
uniform vec2 uFace;            // robot: expression id (0..5, fractional = cross-fade), phase
uniform vec2 uMood;            // happy (^^ lower lid), pupil scale
uniform vec3 uFur;             // eyelid colour
uniform vec3 uLash;
uniform vec3 uLightDir;        // towards the key light (GL space)
uniform float uDim;
uniform float uGlow;
uniform vec3 uScreenHalf;      // robot: half width, half height (model units), -

varying vec3 vN;
varying vec3 vP;
varying vec2 vUv;
varying vec2 vEye;
varying vec4 vCol;
varying vec2 vEye2;
varying float vGloss;

float band(float x, float w) { return 1.0 - smoothstep(w * 0.7, w, abs(x)); }

vec4 eyeShade(vec3 base, vec2 uv, vec4 E, float side, out float glossy) {
    glossy = 0.0;
    float d = length(uv);
    float inside = 1.0 - smoothstep(0.955, 1.0, d);
    if (inside <= 0.0) return vec4(base, 0.0);
    float sg = side < 0.5 ? 1.0 : -1.0;
    float ps = max(0.4, uMood.y);
    vec2 t = vec2(0.5 + (uv.x - E.y) / ps / 2.3, 1.0 - (0.5 + (uv.y - E.z) / ps / 2.3));
    t = clamp(t, 0.002, 0.998);
    vec3 eye = texture2D(uEyes, vec2(t.x * 0.5 + side * 0.5, t.y)).rgb;
    float b = E.x;
    float uu = uv.x * uv.x;
    float yup = 1.06 - b * 1.36 + uu * b * 0.30 + E.w * uv.x * 0.55 * sg - abs(E.w) * 0.32;
    float ylo = -1.06 + b * 0.84 + uMood.x * (1.5 - 0.9 * uu);
    float upper = smoothstep(-0.02, 0.02, uv.y - yup);
    float lower = smoothstep(-0.02, 0.02, ylo - uv.y);
    float lid = max(upper, lower);
    float lash = upper * (1.0 - smoothstep(0.07, 0.11, uv.y - yup)) * smoothstep(0.0, 0.12, b + abs(E.w));
    vec3 lidc = mix(uFur, uLash, lash);
    vec3 c = mix(eye, lidc, lid);
    glossy = inside * (1.0 - lid);
    return vec4(mix(base, c, inside), inside);
}

// The robot's face, in model units around the screen centre (x right, y up).
float faceMask(vec2 q) {
    float e = uFace.x;
    float w0 = max(0.0, 1.0 - abs(e - 0.0)), w1 = max(0.0, 1.0 - abs(e - 1.0)), w2 = max(0.0, 1.0 - abs(e - 2.0));
    float w3 = max(0.0, 1.0 - abs(e - 3.0)), w4 = max(0.0, 1.0 - abs(e - 4.0)), w5 = max(0.0, 1.0 - abs(e - 5.0));
    float total = 0.0;
    for (int i = 0; i < 2; i++) {
        float sx = i == 0 ? -1.0 : 1.0;
        vec4 E = i == 0 ? uEyeL : uEyeR;
        float a = q.x - (sx * 0.40 * uScreenHalf.x + E.y * uScreenHalf.x * 0.35);
        float c = q.y - (0.012 + E.z * uScreenHalf.y * 0.35);
        float b = E.x;
        float ry = max(0.004, 0.052 * (1.0 - b));
        float ell = 1.0 - smoothstep(0.85, 1.0, (a / 0.040) * (a / 0.040) + (c / ry) * (c / ry));
        float line = band(c, 0.007) * band(a, 0.040) * smoothstep(0.6, 0.9, b);
        float s0 = max(ell, line);
        float s1 = band(length(vec2(a, c + 0.02)) - 0.036, 0.009) * step(-0.008, c);
        float hx = a / 0.045, hy = c / 0.045 + 0.15;
        float hq = hx * hx + hy * hy - 1.0;
        float s2 = 1.0 - smoothstep(-0.02, 0.02, hq * hq * hq - hx * hx * hy * hy * hy);
        float s3 = band(length(vec2(a, c - 0.022)) - 0.034, 0.008) * step(c, 0.012);
        float s4 = 1.0 - smoothstep(0.054, 0.06, length(vec2(a, c)));
        total = max(total, w0 * s0 + w1 * s1 + w2 * s2 + w3 * s3 + w4 * s4);
    }
    float dots = 0.0;
    for (int i = 0; i < 3; i++) {
        float dx = -0.05 + 0.05 * float(i);
        float dd = 1.0 - smoothstep(0.013, 0.016, length(q - vec2(dx, 0.0)));
        float br = 0.25 + 0.75 * max(0.0, cos((uFace.y - float(i) * 0.33) * 6.2832));
        dots = max(dots, dd * br);
    }
    total += w5 * dots;
    float smile = band(length(q + vec2(0.0, 0.045)) - 0.028, 0.006) * step(q.y, -0.058);
    float oo = band(length(q + vec2(0.0, 0.075)) - 0.016, 0.006);
    return min(1.0, total + (w0 + w1 + w2) * smile + w4 * oo);
}

void main() {
    vec3 base = vCol.a > 0.5 ? vCol.rgb : texture2D(uTex, vUv).rgb;
    float gloss = vGloss;
    vec3 emit = vec3(0.0);
    if (uEyeMode > 0.5 && uEyeMode < 1.5) {
        float g = 0.0;
        if (dot(vEye, vEye) < 1.1) { vec4 r = eyeShade(base, vEye, uEyeL, 0.0, g); base = r.rgb; gloss = max(gloss, g * 0.95); }
        if (dot(vEye2, vEye2) < 1.1) { vec4 r = eyeShade(base, vEye2, uEyeR, 1.0, g); base = r.rgb; gloss = max(gloss, g * 0.95); }
    } else if (uEyeMode > 1.5) {
        for (int k = 0; k < 2; k++) {
            vec2 sv = k == 0 ? vEye : vEye2;
            if (abs(sv.x) > 1.2 || abs(sv.y) > 1.2) continue;
            float r4 = pow(pow(abs(sv.x), 4.0) + pow(abs(sv.y), 4.0), 0.25);
            float glass = 1.0 - smoothstep(0.90, 0.95, r4);
            base = mix(base, vec3(0.012, 0.014, 0.03), glass);
            gloss = mix(gloss, 0.8, glass);
            if (k == 0) {
                float f = faceMask(sv * uScreenHalf.xy) * glass * (1.0 - smoothstep(0.80, 0.88, r4));
                emit = vec3(0.62, 0.48, 1.0) * f * 1.6;
            }
        }
    }
    vec3 N = normalize(vN);
    vec3 V = vec3(0.0, 0.1, 1.0);
    vec3 L = normalize(uLightDir);
    float wrap = clamp((dot(N, L) + 0.35) / 1.35, 0.0, 1.0);
    float fill = clamp(dot(N, normalize(vec3(-0.7, 0.2, 0.6))) * 0.5 + 0.5, 0.0, 1.0);
    float sky = N.y * 0.5 + 0.5;
    vec3 light = vec3(1.0, 0.97, 0.92) * wrap * 0.78 + vec3(0.75, 0.82, 1.0) * fill * 0.22 + vec3(0.22, 0.22, 0.26) * sky;
    float rim = pow(1.0 - clamp(dot(N, normalize(V)), 0.0, 1.0), 3.0);
    vec3 H = normalize(L + normalize(V));
    float spec = pow(clamp(dot(N, H), 0.0, 1.0), mix(8.0, 90.0, gloss)) * mix(0.04, 0.9, gloss * gloss);
    vec3 col = base * light + vec3(1.0, 0.93, 0.85) * rim * 0.28 + vec3(spec);
    col += emit + base * uGlow * 0.25;
    col *= 1.0 - uDim;
    gl_FragColor = vec4(col, 1.0);
}
