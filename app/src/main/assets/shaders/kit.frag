// Pulsify 3D kitty: two-tone toon shading with a soft terminator. GLSL ES 1.00.
precision mediump float;

uniform sampler2D uMask;       // r: tabby stripes, g: cream patches
uniform vec3 uFur, uStripe, uCream, uPoint, uIris, uInk;
uniform vec3 uLight;           // view-space direction to the key light
uniform float uDim;            // low battery / sleepy dimming
uniform float uGlow;           // a warm flush (petting, happy)

varying vec3 vN;
varying vec2 vUv;
varying vec4 vInfo;            // role, siamese point, outline pass, siamese coat

void main() {
    float uPoints = vInfo.w;
    if (vInfo.z > 0.5) { gl_FragColor = vec4(uInk * (1.0 - 0.3 * uDim), 1.0); return; }
    float role = vInfo.x;
    vec3 c;
    bool lit = true;
    if (role < 0.5) {
        vec3 m = texture2D(uMask, vUv).rgb;
        c = mix(uFur, uStripe, smoothstep(0.35, 0.65, m.r));
        c = mix(c, uCream, smoothstep(0.35, 0.65, m.g));
        c = mix(c, uPoint, uPoints * vInfo.y);
    } else if (role < 1.5) c = vec3(1.0, 0.64, 0.69);          // inner ear
    else if (role < 2.5) c = vec3(1.0, 0.54, 0.6);             // blush
    else if (role < 3.5) c = vec3(1.0, 0.5, 0.58);             // nose
    else if (role < 4.5) c = vec3(0.16, 0.1, 0.14);            // eye
    else if (role < 5.5) c = uIris;                            // iris
    else if (role < 6.5) { c = vec3(1.0); lit = false; }       // eye shine
    else if (role < 7.5) { c = mix(uInk, vec3(0.92, 0.84, 0.8), uPoints); lit = false; } // mouth
    else c = uPoint;                                           // siamese mask
    vec3 n = normalize(vN);
    if (lit) {
        float d = dot(n, uLight);
        float k = smoothstep(-0.05, 0.12, d);
        vec3 shade = mix(vec3(0.76, 0.67, 0.84), vec3(1.0), k);
        // a breath of sky from above and a thin warm rim so the shape reads in 3D
        shade += 0.06 * max(n.y, 0.0);
        float rim = pow(1.0 - max(n.z, 0.0), 3.0);
        c = c * shade + rim * 0.08 * vec3(1.0, 0.92, 0.85);
        if (role > 3.5 && role < 5.5) {
            // glossy eyes
            float spec = pow(max(dot(reflect(-uLight, n), vec3(0.0, 0.0, 1.0)), 0.0), 40.0);
            c += spec * 0.6;
        }
    }
    c += uGlow * vec3(0.12, 0.04, 0.06);
    c *= 1.0 - 0.35 * uDim;
    gl_FragColor = vec4(c, 1.0);
}
